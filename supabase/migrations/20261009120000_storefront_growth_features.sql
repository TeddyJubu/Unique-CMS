/*
# Storefront growth features: variant stock, reviews, customers, banners

1. Per-variant inventory
- `products.variant_stock` (jsonb, default '{}'): maps "size|color" -> qty.
  Empty string stands in for a missing dimension, e.g. "4Y|" or "|Pink".
- `admin_create_product` / `admin_update_product` accept a `variant_stock`
  key, sanitize it, and keep `products.stock` equal to the variant sum while
  any variant entry exists (legacy total-stock behavior otherwise).
- `place_order` checks the exact variant key when present and decrements both
  the variant entry and the total. It now also decrements the total stock on
  the legacy path (previously stock was checked but never reduced).

2. Product reviews
- `product_reviews`: public can read APPROVED rows and insert new rows
  (which land unapproved). `customer_phone` is revoked from anon SELECT so it
  never leaks to the browser; the owner reads it via `admin_list_reviews`.
- `admin_set_review_status` toggles approved/verified, `admin_delete_review`
  removes a review. All owner RPCs re-verify phone + PIN.

3. Customer profiles (optional login, keyed by phone)
- `customers`: self-asserted profile data (name/address/district). The shop is
  single-tenant and phone-keyed tracking is already public, so anon may
  select/insert/update these non-sensitive rows.

4. Homepage content
- `homepage_banners`: public read, owner-only write via
  `admin_save_banner` / `admin_delete_banner`.
- `shop_settings` gains `announcement_text`, `announcement_text_bn`,
  `announcement_enabled`; `admin_update_settings` accepts them.
*/

-- ---------------------------------------------------------------- variant stock column
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variant_stock jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Keep only sane entries: text keys (<=67 chars), int qty 0..100000, max 500 keys.
CREATE OR REPLACE FUNCTION _clean_variant_stock(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_val int;
  v_out jsonb := '{}'::jsonb;
  v_n int := 0;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'object' THEN
    RETURN '{}'::jsonb;
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p) LOOP
    CONTINUE WHEN v_key = '' OR length(v_key) > 67;
    BEGIN
      v_val := (p->>v_key)::int;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;
    CONTINUE WHEN v_val IS NULL OR v_val < 0 OR v_val > 100000;
    v_out := v_out || jsonb_build_object(v_key, v_val);
    v_n := v_n + 1;
    EXIT WHEN v_n >= 500;
  END LOOP;
  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION _clean_variant_stock(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION admin_create_product(
  p_phone text, p_pin text, p_product jsonb, p_images text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_var jsonb := _clean_variant_stock(COALESCE(p_product->'variant_stock', '{}'::jsonb));
  v_stock int;
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF trim(COALESCE(p_product->>'name', '')) = '' THEN
    RAISE EXCEPTION 'missing_name' USING ERRCODE = '22023';
  END IF;

  IF (SELECT count(*) FROM jsonb_object_keys(v_var)) > 0 THEN
    SELECT COALESCE(SUM(value::int), 0) INTO v_stock FROM jsonb_each_text(v_var);
  ELSE
    v_stock := GREATEST(COALESCE((p_product->>'stock')::int, 0), 0);
  END IF;

  INSERT INTO products (
    category_id, name, name_bn, description, description_bn,
    price, compare_price, sizes, colors, stock, variant_stock, is_featured
  ) VALUES (
    NULLIF(p_product->>'category_id', '')::uuid,
    left(p_product->>'name', 200),
    left(NULLIF(p_product->>'name_bn', ''), 200),
    left(NULLIF(p_product->>'description', ''), 5000),
    left(NULLIF(p_product->>'description_bn', ''), 5000),
    GREATEST(COALESCE((p_product->>'price')::numeric, 0), 0),
    NULLIF(p_product->>'compare_price', '')::numeric,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_product->'sizes')), '{}'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_product->'colors')), '{}'),
    v_stock,
    v_var,
    COALESCE((p_product->>'is_featured')::boolean, false)
  )
  RETURNING id INTO v_id;

  PERFORM _replace_product_images(v_id, p_images);
  RETURN jsonb_build_object('id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION admin_create_product(text, text, jsonb, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_create_product(text, text, jsonb, text[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_update_product(
  p_phone text, p_pin text, p_product_id uuid, p_product jsonb, p_images text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_var jsonb;
  v_stock int;
  v_has_var boolean := (p_product ? 'variant_stock');
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF v_has_var THEN
    v_var := _clean_variant_stock(COALESCE(p_product->'variant_stock', '{}'::jsonb));
    IF (SELECT count(*) FROM jsonb_object_keys(v_var)) > 0 THEN
      SELECT COALESCE(SUM(value::int), 0) INTO v_stock FROM jsonb_each_text(v_var);
    ELSE
      v_stock := NULL;
    END IF;
  END IF;

  UPDATE products SET
    category_id     = NULLIF(p_product->>'category_id', '')::uuid,
    name            = COALESCE(left(NULLIF(p_product->>'name', ''), 200), name),
    name_bn         = left(NULLIF(p_product->>'name_bn', ''), 200),
    description     = left(NULLIF(p_product->>'description', ''), 5000),
    description_bn  = left(NULLIF(p_product->>'description_bn', ''), 5000),
    price           = GREATEST(COALESCE((p_product->>'price')::numeric, price), 0),
    compare_price   = NULLIF(p_product->>'compare_price', '')::numeric,
    sizes           = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_product->'sizes')), sizes),
    colors          = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_product->'colors')), colors),
    stock           = CASE
                        WHEN v_has_var AND v_stock IS NOT NULL THEN v_stock
                        WHEN v_has_var THEN GREATEST(COALESCE((p_product->>'stock')::int, stock), 0)
                        ELSE GREATEST(COALESCE((p_product->>'stock')::int, stock), 0)
                      END,
    variant_stock   = CASE WHEN v_has_var THEN v_var ELSE variant_stock END,
    is_featured     = COALESCE((p_product->>'is_featured')::boolean, is_featured),
    updated_at      = now()
  WHERE id = p_product_id;

  PERFORM _replace_product_images(p_product_id, p_images);
END;
$$;

REVOKE ALL ON FUNCTION admin_update_product(text, text, uuid, jsonb, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_product(text, text, uuid, jsonb, text[]) TO anon, authenticated;

-- ---------------------------------------------------------------- place_order with variant decrement
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
  v_varstock jsonb;
  v_size     text;
  v_color    text;
  v_key      text;
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

    v_size  := NULLIF(left(COALESCE(v_item->>'size', ''), 32), '');
    v_color := NULLIF(left(COALESCE(v_item->>'color', ''), 32), '');
    v_key   := COALESCE(v_size, '') || '|' || COALESCE(v_color, '');

    SELECT price, name, stock, COALESCE(variant_stock, '{}'::jsonb)
    INTO v_price, v_pname, v_stock, v_varstock
    FROM products WHERE id = v_pid AND is_active = true
    FOR UPDATE;

    IF v_pname IS NULL THEN
      RAISE EXCEPTION 'unknown_product' USING ERRCODE = '22023';
    END IF;

    IF (v_varstock ? v_key) THEN
      UPDATE products SET
        stock = stock - v_qty,
        variant_stock = jsonb_set(
          variant_stock, ARRAY[v_key],
          to_jsonb(COALESCE((variant_stock->>v_key)::int, 0) - v_qty)
        ),
        updated_at = now()
      WHERE id = v_pid
        AND stock >= v_qty
        AND COALESCE((variant_stock->>v_key)::int, 0) >= v_qty;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = '22023';
      END IF;
    ELSE
      IF v_stock IS NOT NULL AND v_qty > v_stock THEN
        RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = '22023';
      END IF;
      UPDATE products SET stock = stock - v_qty, updated_at = now()
      WHERE id = v_pid;
    END IF;

    v_subtotal := v_subtotal + (v_price * v_qty);
    v_count := v_count + 1;

    INSERT INTO _po_items VALUES (v_pid, v_pname, v_size, v_color, v_qty, v_price);
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

-- ---------------------------------------------------------------- product reviews
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text NOT NULL,
  photos text[] NOT NULL DEFAULT '{}',
  is_approved boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_approved_reviews" ON product_reviews;
CREATE POLICY "public_read_approved_reviews" ON product_reviews FOR SELECT
TO anon, authenticated USING (is_approved = true);

DROP POLICY IF EXISTS "public_insert_reviews" ON product_reviews;
CREATE POLICY "public_insert_reviews" ON product_reviews FOR INSERT
TO anon, authenticated WITH CHECK (
  rating BETWEEN 1 AND 5
  AND char_length(customer_name) BETWEEN 1 AND 60
  AND char_length(body) BETWEEN 1 AND 2000
  AND COALESCE(array_length(photos, 1), 0) <= 5
);

REVOKE ALL ON product_reviews FROM anon, authenticated;
GRANT SELECT, INSERT ON product_reviews TO anon, authenticated;
-- Phones stay server-side: the browser selects explicit columns only.
REVOKE SELECT (customer_phone) ON product_reviews FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id, created_at DESC);

CREATE OR REPLACE FUNCTION admin_list_reviews(
  p_phone text, p_pin text, p_pending_only boolean DEFAULT false
)
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
  SELECT COALESCE(jsonb_agg(r ORDER BY r->>'created_at' DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT to_jsonb(rev) || jsonb_build_object('product_name', p.name) AS r
    FROM product_reviews rev
    LEFT JOIN products p ON p.id = rev.product_id
    WHERE (NOT p_pending_only) OR (rev.is_approved = false)
    LIMIT 500
  ) s;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION admin_list_reviews(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_list_reviews(text, text, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_set_review_status(
  p_phone text, p_pin text, p_review_id uuid, p_approved boolean, p_verified boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  UPDATE product_reviews
  SET is_approved = p_approved, is_verified = p_verified
  WHERE id = p_review_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_set_review_status(text, text, uuid, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_review_status(text, text, uuid, boolean, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_delete_review(p_phone text, p_pin text, p_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  DELETE FROM product_reviews WHERE id = p_review_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_delete_review(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_review(text, text, uuid) TO anon, authenticated;

-- ---------------------------------------------------------------- customer profiles
CREATE TABLE IF NOT EXISTS customers (
  phone text PRIMARY KEY,
  name text NOT NULL,
  address text,
  district text,
  area_type text NOT NULL DEFAULT 'inside_dhaka'
    CHECK (area_type IN ('inside_dhaka', 'outside_dhaka')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_customers" ON customers;
CREATE POLICY "public_read_customers" ON customers FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_upsert_customers" ON customers;
CREATE POLICY "public_upsert_customers" ON customers FOR INSERT
TO anon, authenticated WITH CHECK (
  char_length(phone) BETWEEN 6 AND 32 AND char_length(name) BETWEEN 1 AND 120
);

DROP POLICY IF EXISTS "public_update_customers" ON customers;
CREATE POLICY "public_update_customers" ON customers FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (
  char_length(name) BETWEEN 1 AND 120
);

REVOKE ALL ON customers FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON customers TO anon, authenticated;

-- ---------------------------------------------------------------- homepage banners
CREATE TABLE IF NOT EXISTS homepage_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  title_bn text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  subtitle_bn text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  link_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_banners" ON homepage_banners;
CREATE POLICY "public_read_banners" ON homepage_banners FOR SELECT
TO anon, authenticated USING (true);

REVOKE ALL ON homepage_banners FROM anon, authenticated;
GRANT SELECT ON homepage_banners TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_banners_sort ON homepage_banners(sort_order);

CREATE OR REPLACE FUNCTION admin_save_banner(p_phone text, p_pin text, p_banner jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_image text := left(COALESCE(p_banner->>'image_url', ''), 2000);
  v_link text := NULLIF(left(COALESCE(p_banner->>'link_url', ''), 2000), '');
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF v_image <> '' AND NOT (v_image ~* '^https?://' OR v_image ~ '^/') THEN
    RAISE EXCEPTION 'invalid_image_url' USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_id := NULLIF(p_banner->>'id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_id := NULL;
  END;

  IF v_id IS NULL THEN
    INSERT INTO homepage_banners (
      title, title_bn, subtitle, subtitle_bn, image_url, link_url, sort_order, is_active
    ) VALUES (
      left(COALESCE(p_banner->>'title', ''), 200),
      left(COALESCE(p_banner->>'title_bn', ''), 200),
      left(COALESCE(p_banner->>'subtitle', ''), 500),
      left(COALESCE(p_banner->>'subtitle_bn', ''), 500),
      v_image, v_link,
      COALESCE((p_banner->>'sort_order')::int, 0),
      COALESCE((p_banner->>'is_active')::boolean, true)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE homepage_banners SET
      title      = left(COALESCE(p_banner->>'title', title), 200),
      title_bn   = left(COALESCE(p_banner->>'title_bn', title_bn), 200),
      subtitle   = left(COALESCE(p_banner->>'subtitle', subtitle), 500),
      subtitle_bn = left(COALESCE(p_banner->>'subtitle_bn', subtitle_bn), 500),
      image_url  = v_image,
      link_url   = v_link,
      sort_order = COALESCE((p_banner->>'sort_order')::int, sort_order),
      is_active  = COALESCE((p_banner->>'is_active')::boolean, is_active)
    WHERE id = v_id;
  END IF;

  RETURN jsonb_build_object('id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION admin_save_banner(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_save_banner(text, text, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_delete_banner(p_phone text, p_pin text, p_banner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  DELETE FROM homepage_banners WHERE id = p_banner_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_delete_banner(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_banner(text, text, uuid) TO anon, authenticated;

-- ---------------------------------------------------------------- announcement bar settings
ALTER TABLE shop_settings
  ADD COLUMN IF NOT EXISTS announcement_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS announcement_text_bn text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS announcement_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION admin_update_settings(
  p_phone text,
  p_pin text,
  p_patch jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid;
  v_new_pin text;
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_id FROM shop_settings ORDER BY created_at LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  UPDATE shop_settings SET
    shop_name              = COALESCE(p_patch->>'shop_name', shop_name),
    shop_name_bn           = COALESCE(p_patch->>'shop_name_bn', shop_name_bn),
    whatsapp_number        = COALESCE(p_patch->>'whatsapp_number', whatsapp_number),
    bkash_number           = COALESCE(p_patch->>'bkash_number', bkash_number),
    delivery_inside_dhaka  = COALESCE((p_patch->>'delivery_inside_dhaka')::numeric, delivery_inside_dhaka),
    delivery_outside_dhaka = COALESCE((p_patch->>'delivery_outside_dhaka')::numeric, delivery_outside_dhaka),
    owner_phone            = COALESCE(p_patch->>'owner_phone', owner_phone),
    hero_title             = COALESCE(p_patch->>'hero_title', hero_title),
    hero_title_bn          = COALESCE(p_patch->>'hero_title_bn', hero_title_bn),
    hero_subtitle          = COALESCE(p_patch->>'hero_subtitle', hero_subtitle),
    hero_subtitle_bn       = COALESCE(p_patch->>'hero_subtitle_bn', hero_subtitle_bn),
    ai_api_url             = COALESCE(NULLIF(p_patch->>'ai_api_url', ''), ai_api_url),
    ai_api_key             = COALESCE(NULLIF(p_patch->>'ai_api_key', ''), ai_api_key),
    ai_model               = COALESCE(NULLIF(p_patch->>'ai_model', ''), ai_model),
    announcement_text      = COALESCE(p_patch->>'announcement_text', announcement_text),
    announcement_text_bn   = COALESCE(p_patch->>'announcement_text_bn', announcement_text_bn),
    announcement_enabled   = COALESCE((p_patch->>'announcement_enabled')::boolean, announcement_enabled)
  WHERE id = v_id;

  v_new_pin := NULLIF(trim(COALESCE(p_patch->>'owner_pin', '')), '');
  IF v_new_pin IS NOT NULL THEN
    IF length(v_new_pin) < 4 THEN
      RAISE EXCEPTION 'pin_too_short' USING ERRCODE = '22023';
    END IF;
    UPDATE shop_settings
    SET owner_pin_hash = extensions.crypt(v_new_pin, extensions.gen_salt('bf', 10)),
        owner_pin      = '***'
    WHERE id = v_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION admin_update_settings(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_settings(text, text, jsonb) TO anon, authenticated;
