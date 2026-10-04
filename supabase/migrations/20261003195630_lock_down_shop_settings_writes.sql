/*
# Owner-only shop settings writes (F2)

1. Changes
- Drop the always-true public UPDATE policy on shop_settings.
- Revoke INSERT/UPDATE/DELETE from anon/authenticated.
- Add `admin_update_settings(phone, pin, patch)` which verifies the owner and
  whitelists the keys that may be written. A new PIN is hashed, never stored
  in plaintext.
*/

DROP POLICY IF EXISTS "public_update_shop_settings" ON shop_settings;

REVOKE INSERT, UPDATE, DELETE ON shop_settings FROM anon, authenticated;

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
    hero_subtitle_bn       = COALESCE(p_patch->>'hero_subtitle_bn', hero_subtitle_bn)
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
