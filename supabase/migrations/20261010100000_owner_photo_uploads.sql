-- Shop photos are public storefront assets. Upload, overwrite and delete remain
-- closed to browser roles; owner-photo-upload signs a single random path only
-- after checking the existing, throttled owner login.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('shop-photos', 'shop-photos', true, 8388608, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;
