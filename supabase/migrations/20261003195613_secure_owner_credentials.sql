/*
# Protect owner credentials (F1, F12, F18)

1. Changes
- Enable pgcrypto for bcrypt password hashing.
- Add `owner_pin_hash` to shop_settings, seeded from the existing plaintext PIN.
- Revoke column-level SELECT on `owner_pin`, `owner_pin_hash` and `owner_phone`
  from anon/authenticated so the storefront can no longer read the credential.
- Add `owner_login(phone, pin)` SECURITY DEFINER so the PIN check happens on the
  server instead of in the browser.

2. Security
- Column grants are re-issued explicitly for every public column; the three
  credential columns are omitted.
- `verify_owner` is the shared predicate used by every admin function and is
  NOT granted to the client.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS owner_pin_hash text;

-- Seed the hash from whatever PIN is currently stored.
UPDATE shop_settings
SET owner_pin_hash = extensions.crypt(owner_pin, extensions.gen_salt('bf', 10))
WHERE owner_pin_hash IS NULL;

-- Shared owner predicate. Not exposed to the client.
CREATE OR REPLACE FUNCTION verify_owner(p_phone text, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_phone text;
  v_hash  text;
BEGIN
  IF p_phone IS NULL OR p_pin IS NULL THEN
    RETURN false;
  END IF;

  SELECT owner_phone, owner_pin_hash INTO v_phone, v_hash
  FROM shop_settings
  ORDER BY created_at
  LIMIT 1;

  IF v_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN regexp_replace(p_phone, '[^0-9+]', '', 'g')
       = regexp_replace(v_phone, '[^0-9+]', '', 'g')
     AND extensions.crypt(p_pin, v_hash) = v_hash;
END;
$$;

REVOKE ALL ON FUNCTION verify_owner(text, text) FROM PUBLIC, anon, authenticated;

-- Server-side login for the owner panel.
CREATE OR REPLACE FUNCTION owner_login(p_phone text, p_pin text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT verify_owner(p_phone, p_pin);
$$;

REVOKE ALL ON FUNCTION owner_login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION owner_login(text, text) TO anon, authenticated;

-- Narrow shop_settings reads so the credential columns are unreachable.
REVOKE SELECT ON shop_settings FROM anon, authenticated;
GRANT SELECT (
  id, shop_name, shop_name_bn, whatsapp_number, bkash_number,
  delivery_inside_dhaka, delivery_outside_dhaka,
  hero_title, hero_title_bn, hero_subtitle, hero_subtitle_bn, created_at
) ON shop_settings TO anon, authenticated;
