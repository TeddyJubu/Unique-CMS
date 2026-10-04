/*
# Server-computed order placement (F7, F13, F14)

1. Changes
- `place_order(customer, items)` recomputes every money value server-side:
  line prices come from `products.price`, the delivery charge from
  `shop_settings`, and the totals are summed in SQL. Client-supplied
  subtotal/delivery/total/price values are ignored entirely.
- Quantities are validated (1..50) and stock is checked at write time.
- Order and items are written in one function call, so items can no longer be
  attached to somebody else's order.
- CHECK constraint enforces a positive quantity at the schema level.

2. Security
- Runs as definer because anon has no privileges on orders/order_items.
- Customer free-text fields are length-bounded.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_positive'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION place_order(p_customer jsonb, p_items jsonb)
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
  v_delivery numeric;
  v_order    orders%ROWTYPE;
  v_count    int := 0;
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

  -- Delivery charge is read from settings, never from the client.
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

    -- Authoritative price and stock from the catalogue.
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

  INSERT INTO orders (
    customer_name, customer_phone, customer_address, district, area_type,
    payment_method, bkash_trx_id, subtotal, delivery_charge, total, notes
  ) VALUES (
    v_name, v_phone, v_address, v_district, v_area,
    v_method, v_trx, v_subtotal, v_delivery, v_subtotal + v_delivery, v_notes
  )
  RETURNING * INTO v_order;

  INSERT INTO order_items (order_id, product_id, product_name, size, color, quantity, price)
  SELECT v_order.id, product_id, product_name, size, color, quantity, price FROM _po_items;

  DELETE FROM _po_items;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'subtotal', v_order.subtotal,
    'delivery_charge', v_order.delivery_charge,
    'total', v_order.total,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'created_at', v_order.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION place_order(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION place_order(jsonb, jsonb) TO anon, authenticated;
