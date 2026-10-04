-- F1: public.owner_login is a thin, un-throttled wrapper around verify_owner and
-- was executable by anon/authenticated, allowing unlimited owner PIN guessing.
-- The application only uses owner_login_throttled, so revoking EXECUTE closes the
-- bypass without affecting any feature.
REVOKE EXECUTE ON FUNCTION public.owner_login(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owner_login(text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.owner_login(text, text) FROM PUBLIC;
