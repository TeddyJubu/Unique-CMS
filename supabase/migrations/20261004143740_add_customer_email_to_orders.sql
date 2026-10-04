/*
# Store customer email and confirmation email state on orders

1. Modified Tables
- `orders`
  - `customer_email` (text, nullable) — optional email the customer gives at
    checkout; used to send the order confirmation. Nullable so no order is lost
    if a customer skips it.
  - `confirmation_email_sent_at` (timestamptz, nullable) — set when the
    confirmation email has been sent successfully; lets the mailer retry
    exactly the orders that still need one.

2. Modified Functions
- `place_order(p_customer, p_items, p_coupon)` now reads an optional
  `customer_email` field from the customer JSON, validates its length/format
  loosely, and stores it on the order.

3. Security
- No new tables; no RLS changes. The email column is only written through the
  SECURITY DEFINER place_order function, which is already the only write path
  for orders.
- Basic email sanity check: must contain "@" and be at most 254 chars.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_email text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'confirmation_email_sent_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN confirmation_email_sent_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_email_pending
  ON orders (created_at)
  WHERE customer_email IS NOT NULL AND confirmation_email_sent_at IS NULL;

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
  v_email    text := NULLIF(trim(COALESCE(p_customer->>'customer_email', '')), '');
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
  IF v_email IS NOT NULL AND (v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR length(v_email) > 254) THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = '22023';
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
    customer_name, customer_phone, customer_email, customer_address, district,
    area_type, payment_method, bkash_trx_id, subtotal, discount, delivery_charge,
    total, coupon_code, notes
  ) VALUES (
    v_name, v_phone, v_email, v_address, v_district,
    v_area, v_method, v_trx, v_subtotal, v_discount, v_delivery,
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
