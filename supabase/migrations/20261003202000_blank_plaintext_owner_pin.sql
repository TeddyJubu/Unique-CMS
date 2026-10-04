-- F11: the clear-text owner PIN was still stored alongside its bcrypt hash.
-- Authentication reads only owner_pin_hash (verify_owner), and
-- admin_update_settings already writes '***' when the PIN changes, so blanking
-- the stored value removes the readable copy without affecting login.
ALTER TABLE shop_settings ALTER COLUMN owner_pin SET DEFAULT '***';
UPDATE shop_settings SET owner_pin = '***' WHERE owner_pin <> '***';
