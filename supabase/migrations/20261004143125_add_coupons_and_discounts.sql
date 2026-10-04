/*
# Add coupon codes with server-side validation

1. New Tables
- `coupons`
  - `id` (uuid, primary key)
  - `code` (text, unique, not null) — stored uppercase; customers type this at checkout
  - `discount_type` (text, not null) — 'percent' or 'fixed'
  - `discount_value` (numeric, not null) — percent (1-100) or flat Tk amount
  - `min_subtotal` (numeric, nullable) — minimum cart subtotal to qualify
  - `max_uses` (int, nullable) — total redemption limit; null = unlimited
  - `used_count` (int, not null, default 0) — times redeemed
  - `expires_at` (timestamptz, nullable) — null = never expires
  - `is_active` (boolean, not null, default true)
  - `created_at` (timestamptz, default now())

2. Modified Tables
- `orders`: added `coupon_code` (text, nullable) and `discount` (numeric, not null default 0)
  so each order records which coupon was applied and how much was deducted.

3. Security
- RLS enabled on `coupons` with NO policies: the anon browser can never read or
  write coupon rows directly (codes and limits stay server-side secrets).
- New SECURITY DEFINER function `validate_coupon(p_code, p_subtotal)` returns the
  discount amount or raises an error. Grants: anon, authenticated (execute only).
- `place_order(p_customer, p_items, p_coupon)` now accepts an optional coupon code:
  re-validates it server-side, recomputes the discount from the DB, applies it to
  the total, and atomically increments `used_count` (rejecting when max_uses hit).
- Coupon management (create/update/delete) is done via SQL by the owner through
  the assistant tools; no anon write path exists.

4. Notes
- The discount can never exceed the subtotal, so totals stay positive.
- Delivery charge is added after the discount.
*/

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_subtotal numeric,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'coupon_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN coupon_code text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'discount'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION validate_coupon(p_code text, p_subtotal numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c coupons%ROWTYPE;
  v_discount numeric;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RAISE EXCEPTION 'invalid_coupon' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO c FROM coupons WHERE upper(code) = upper(trim(p_code));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_coupon' USING ERRCODE = '22023';
  END IF;
  IF NOT c.is_active THEN
    RAISE EXCEPTION 'coupon_inactive' USING ERRCODE = '22023';
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RAISE EXCEPTION 'coupon_expired' USING ERRCODE = '22023';
  END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN
    RAISE EXCEPTION 'coupon_exhausted' USING ERRCODE = '22023';
  END IF;
  IF c.min_subtotal IS NOT NULL AND p_subtotal < c.min_subtotal THEN
    RAISE EXCEPTION 'coupon_min_subtotal' USING ERRCODE = '22023';
  END IF;

  v_discount := CASE
    WHEN c.discount_type = 'percent' THEN round(p_subtotal * c.discount_value / 100)
    ELSE c.discount_value
  END;

  RETURN least(v_discount, p_subtotal);
END;
$$;

REVOKE ALL ON FUNCTION validate_coupon(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION validate_coupon(text, numeric) TO anon, authenticated;

CREATE OR REPLACE FUNCTION place_order(p_customer jsonb, p_items jsonb, p_coupon text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name     text := trim(COALESCE(p_customer->>'customer_name', ''));
  v_phone    text := trim(COALESCE(p_customer->>'customer_phone', ''));
  v_address  text := trim(COALESCE(p_customer->>'customer_address', ''));
  v_district text := trim(COALESCE(p_customer->>'district', ''));
  v_area     text := COALESCE(p_customer->>'area_type', 'inside_dhaka');
  v_method   text := COALESCE(p_customer->>'payment_method', 'cod');
  v_trx      text := NULLIF(trim(COALESCE(p_customer->>'bkash_trx_id', '')), '');
  v_notes    text := NULLIF(trim(COALESCE(p_customer->>'notes', '')), '');
  v_item     jsonb;
  v_pid      uuid;
  v_qty      int;
  v_price    numeric;
  v_pname    text;
  v_stock    int;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_delivery numeric;
  v_order    orders%ROWTYPE;
  v_count    int := 0;
  v_coupon_row coupons%ROWTYPE;
BEGIN
  IF v_name = '' OR v_phone = '' OR v_address = '' OR v_district = '' THEN
    RAISE EXCEPTION 'missing_customer_details' USING ERRCODE = '22023';
  END IF;
  IF length(v_name) > 120 OR length(v_phone) > 32 OR length(v_address) > 500
     OR length(v_district) > 120 OR length(COALESCE(v_notes, '')) > 1000 THEN
    RAISE EXCEPTION 'field_too_long' USING ERRCODE = '22023';
  END IF;
  IF v_area NOT IN ('inside_dhaka', 'outside_dhaka') THEN
    RAISE EXCEPTION 'invalid_area' USING ERRCODE = '22023';
  END IF;
  IF v_method NOT IN ('cod', 'bkash') THEN
    RAISE EXCEPTION 'invalid_payment_method' USING ERRCODE = '22023';
  END IF;
  IF v_method = 'bkash' AND v_trx IS NULL THEN
    RAISE EXCEPTION 'missing_trx_id' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_cart' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'too_many_items' USING ERRCODE = '22023';
  END IF;

  SELECT CASE WHEN v_area = 'inside_dhaka' THEN delivery_inside_dhaka
              ELSE delivery_outside_dhaka END
  INTO v_delivery
  FROM shop_settings ORDER BY created_at LIMIT 1;
  v_delivery := COALESCE(v_delivery, 60);

  CREATE TEMP TABLE IF NOT EXISTS _po_items (
    product_id uuid, product_name text, size text, color text,
    quantity int, price numeric
  ) ON COMMIT DROP;
  DELETE FROM _po_items;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((v_item->>'quantity')::int, 0);
    IF v_qty < 1 OR v_qty > 50 THEN
      RAISE EXCEPTION 'invalid_quantity' USING ERRCODE = '22023';
    END IF;

    BEGIN
      v_pid := NULLIF(v_item->>'product_id', '')::uuid;
    EXCEPTION WHEN others THEN
      v_pid := NULL;
    END;

    IF v_pid IS NULL THEN
      RAISE EXCEPTION 'unknown_product' USING ERRCODE = '22023';
    END IF;

    SELECT price, name, stock INTO v_price, v_pname, v_stock
    FROM products WHERE id = v_pid AND is_active = true;

    IF v_pname IS NULL THEN
      RAISE EXCEPTION 'unknown_product' USING ERRCODE = '22023';
    END IF;
    IF v_stock IS NOT NULL AND v_qty > v_stock THEN
      RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = '22023';
    END IF;

    v_subtotal := v_subtotal + (v_price * v_qty);
    v_count := v_count + 1;

    INSERT INTO _po_items VALUES (
      v_pid, v_pname,
      NULLIF(left(COALESCE(v_item->>'size', ''), 32), ''),
      NULLIF(left(COALESCE(v_item->>'color', ''), 32), ''),
      v_qty, v_price
    );
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'empty_cart' USING ERRCODE = '22023';
  END IF;

  IF p_coupon IS NOT NULL AND trim(p_coupon) <> '' THEN
    SELECT * INTO v_coupon_row FROM coupons WHERE upper(code) = upper(trim(p_coupon));
    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_coupon' USING ERRCODE = '22023';
    END IF;
    IF NOT v_coupon_row.is_active
       OR (v_coupon_row.expires_at IS NOT NULL AND v_coupon_row.expires_at < now())
       OR (v_coupon_row.max_uses IS NOT NULL AND v_coupon_row.used_count >= v_coupon_row.max_uses) THEN
      RAISE EXCEPTION 'coupon_unavailable' USING ERRCODE = '22023';
    END IF;
    IF v_coupon_row.min_subtotal IS NOT NULL AND v_subtotal < v_coupon_row.min_subtotal THEN
      RAISE EXCEPTION 'coupon_min_subtotal' USING ERRCODE = '22023';
    END IF;

    v_discount := CASE
      WHEN v_coupon_row.discount_type = 'percent'
        THEN round(v_subtotal * v_coupon_row.discount_value / 100)
      ELSE v_coupon_row.discount_value
    END;
    v_discount := least(v_discount, v_subtotal);

    UPDATE coupons
    SET used_count = used_count + 1
    WHERE id = v_coupon_row.id AND (max_uses IS NULL OR used_count < max_uses);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'coupon_exhausted' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO orders (
    customer_name, customer_phone, customer_address, district, area_type,
    payment_method, bkash_trx_id, subtotal, discount, delivery_charge, total,
    coupon_code, notes
  ) VALUES (
    v_name, v_phone, v_address, v_district, v_area,
    v_method, v_trx, v_subtotal, v_discount, v_delivery,
    v_subtotal - v_discount + v_delivery,
    CASE WHEN v_discount > 0 THEN v_coupon_row.code ELSE NULL END,
    v_notes
  )
  RETURNING * INTO v_order;

  INSERT INTO order_items (order_id, product_id, product_name, size, color, quantity, price)
  SELECT v_order.id, product_id, product_name, size, color, quantity, price FROM _po_items;

  DELETE FROM _po_items;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'subtotal', v_order.subtotal,
    'discount', v_order.discount,
    'delivery_charge', v_order.delivery_charge,
    'total', v_order.total,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'created_at', v_order.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION place_order(jsonb, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION place_order(jsonb, jsonb, text) TO anon, authenticated;
