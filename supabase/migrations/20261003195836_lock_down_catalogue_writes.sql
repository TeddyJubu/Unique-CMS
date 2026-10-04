/*
# Owner-only catalogue writes (F8, F9, F10)

1. Changes
- Drop the always-true INSERT/UPDATE/DELETE policies on products,
  product_images and categories. Public SELECT is retained: the storefront
  needs it and the catalogue is intentionally public.
- Revoke write privileges from anon/authenticated.
- Add owner-verified product CRUD functions used by the owner panel.
*/

DROP POLICY IF EXISTS "public_insert_products" ON products;
DROP POLICY IF EXISTS "public_update_products" ON products;
DROP POLICY IF EXISTS "public_delete_products" ON products;

DROP POLICY IF EXISTS "public_insert_product_images" ON product_images;
DROP POLICY IF EXISTS "public_update_product_images" ON product_images;
DROP POLICY IF EXISTS "public_delete_product_images" ON product_images;

DROP POLICY IF EXISTS "public_insert_categories" ON categories;
DROP POLICY IF EXISTS "public_update_categories" ON categories;
DROP POLICY IF EXISTS "public_delete_categories" ON categories;

REVOKE INSERT, UPDATE, DELETE ON products       FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON product_images FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON categories     FROM anon, authenticated;

-- Shared image replacement helper.
CREATE OR REPLACE FUNCTION _replace_product_images(p_product_id uuid, p_images text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_i   int := 0;
BEGIN
  DELETE FROM product_images WHERE product_id = p_product_id;
  IF p_images IS NULL THEN RETURN; END IF;
  FOREACH v_url IN ARRAY p_images LOOP
    v_url := trim(v_url);
    CONTINUE WHEN v_url = '' OR length(v_url) > 2000;
    -- Only allow http(s) URLs or site-relative paths.
    CONTINUE WHEN NOT (v_url ~* '^https?://' OR v_url ~ '^/');
    INSERT INTO product_images (product_id, image_url, sort_order)
    VALUES (p_product_id, v_url, v_i);
    v_i := v_i + 1;
    EXIT WHEN v_i >= 20;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION _replace_product_images(uuid, text[]) FROM PUBLIC, anon, authenticated;

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
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF trim(COALESCE(p_product->>'name', '')) = '' THEN
    RAISE EXCEPTION 'missing_name' USING ERRCODE = '22023';
  END IF;

  INSERT INTO products (
    category_id, name, name_bn, description, description_bn,
    price, compare_price, sizes, colors, stock, is_featured
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
    GREATEST(COALESCE((p_product->>'stock')::int, 0), 0),
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
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
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
    stock           = GREATEST(COALESCE((p_product->>'stock')::int, stock), 0),
    is_featured     = COALESCE((p_product->>'is_featured')::boolean, is_featured),
    updated_at      = now()
  WHERE id = p_product_id;

  PERFORM _replace_product_images(p_product_id, p_images);
END;
$$;

REVOKE ALL ON FUNCTION admin_update_product(text, text, uuid, jsonb, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_product(text, text, uuid, jsonb, text[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_delete_product(p_phone text, p_pin text, p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_owner(p_phone, p_pin) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  DELETE FROM products WHERE id = p_product_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_delete_product(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_product(text, text, uuid) TO anon, authenticated;
