/*
# Owner-only order access (F3, F4, F5, F6, F7, F16)

1. Changes
- Drop every always-true policy on orders and order_items.
- Revoke all table privileges from anon/authenticated; orders are now reached
  only through SECURITY DEFINER functions.
- `track_orders_by_phone` returns a REDACTED projection for the public tracking
  page: no customer address, no customer name, no bKash transaction id.
- `admin_list_orders` / `admin_set_order_status` / `admin_set_payment_status`
  require the owner phone + PIN and whitelist the status values.
*/

DROP POLICY IF EXISTS "public_read_orders"   ON orders;
DROP POLICY IF EXISTS "public_insert_orders" ON orders;
DROP POLICY IF EXISTS "public_update_orders" ON orders;
DROP POLICY IF EXISTS "public_delete_orders" ON orders;

DROP POLICY IF EXISTS "public_read_order_items"   ON order_items;
DROP POLICY IF EXISTS "public_insert_order_items" ON order_items;
DROP POLICY IF EXISTS "public_update_order_items" ON order_items;
DROP POLICY IF EXISTS "public_delete_order_items" ON order_items;

REVOKE ALL ON orders      FROM anon, authenticated;
REVOKE ALL ON order_items FROM anon, authenticated;

-- Public order tracking: redacted, keyed on the phone used to order.
CREATE OR REPLACE FUNCTION track_orders_by_phone(p_phone text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(o ORDER BY o->>'created_at' DESC), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', ord.id,
      'order_number', ord.order_number,
      'status', ord.status,
      'payment_status', ord.payment_status,
      'payment_method', ord.payment_method,
      'area_type', ord.area_type,
      'subtotal', ord.subtotal,
      'delivery_charge', ord.delivery_charge,
      'total', ord.total,
      'created_at', ord.created_at,
      'order_items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', oi.id,
          'product_name', oi.product_name,
          'size', oi.size,
          'color', oi.color,
          'quantity', oi.quantity,
          'price', oi.price
        ) ORDER BY oi.created_at)
        FROM order_items oi WHERE oi.order_id = ord.id
      ), '[]'::jsonb)
    ) AS o
    FROM orders ord
    WHERE regexp_replace(ord.customer_phone, '[^0-9]', '', 'g')
        = regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g')
      AND length(regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g')) >= 6
    LIMIT 50
  ) s;
$$;

REVOKE ALL ON FUNCTION track_orders_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION track_orders_by_phone(text) TO anon, authenticated;

-- Owner dashboard: full order detail, PIN required.
CREATE OR REPLACE FUNCTION admin_list_orders(p_phone text, p_pin text, p_limit int DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(o ORDER BY o->>'created_at' DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT to_jsonb(ord) || jsonb_build_object(
      'order_items', COALESCE((
        SELECT jsonb_agg(to_jsonb(oi) ORDER BY oi.created_at)
        FROM order_items oi WHERE oi.order_id = ord.id
      ), '[]'::jsonb)
    ) AS o
    FROM orders ord
    ORDER BY ord.created_at DESC
    LIMIT COALESCE(p_limit, 500)
  ) s;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION admin_list_orders(text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_list_orders(text, text, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_set_order_status(p_phone text, p_pin text, p_order_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('pending','confirmed','shipped','delivered','cancelled') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;
  UPDATE orders SET status = p_status, updated_at = now() WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_set_order_status(text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_order_status(text, text, uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_set_payment_status(p_phone text, p_pin text, p_order_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('pending','paid','failed') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;
  UPDATE orders SET payment_status = p_status, updated_at = now() WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_set_payment_status(text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_payment_status(text, text, uuid, text) TO anon, authenticated;
