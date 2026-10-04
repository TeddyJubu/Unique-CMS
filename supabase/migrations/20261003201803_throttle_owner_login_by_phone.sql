-- F2: the throttle was keyed only on a caller-supplied key (localStorage uuid /
-- chatKey), so an attacker could rotate it and never trip the lockout. Add a
-- second counter derived server-side from the normalised phone number. The
-- per-phone threshold is deliberately higher than the per-key one so a
-- legitimate owner typing a wrong PIN is not locked out by someone else's
-- guessing for long.
CREATE OR REPLACE FUNCTION public.owner_login_throttled(p_key text, p_phone text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key       text := COALESCE(NULLIF(trim(p_key), ''), 'unknown');
  v_phone_key text := 'phone:' || COALESCE(regexp_replace(COALESCE(p_phone, ''), '[^0-9+]', '', 'g'), '');
  v_locked    timestamptz;
  v_plocked   timestamptz;
  v_ok        boolean;
BEGIN
  SELECT locked_until INTO v_locked FROM auth_throttle WHERE throttle_key = v_key;
  SELECT locked_until INTO v_plocked FROM auth_throttle WHERE throttle_key = v_phone_key;

  IF (v_locked IS NOT NULL AND v_locked > now())
     OR (v_plocked IS NOT NULL AND v_plocked > now()) THEN
    RETURN jsonb_build_object('ok', false, 'locked', true);
  END IF;

  v_ok := verify_owner(p_phone, p_pin);

  IF v_ok THEN
    DELETE FROM auth_throttle WHERE throttle_key IN (v_key, v_phone_key);
    RETURN jsonb_build_object('ok', true, 'locked', false);
  END IF;

  -- per-caller-key counter: 8 failures -> 15 minute lock
  INSERT INTO auth_throttle (throttle_key, failed_count, last_attempt)
  VALUES (v_key, 1, now())
  ON CONFLICT (throttle_key) DO UPDATE SET
    failed_count = CASE
      WHEN auth_throttle.locked_until IS NOT NULL AND auth_throttle.locked_until <= now()
      THEN 1 ELSE auth_throttle.failed_count + 1 END,
    last_attempt = now();

  UPDATE auth_throttle
  SET locked_until = now() + interval '15 minutes'
  WHERE throttle_key = v_key AND failed_count >= 8;

  -- server-derived per-phone counter: cannot be rotated by the caller.
  -- counts reset when the window has been idle for 15 minutes.
  INSERT INTO auth_throttle (throttle_key, failed_count, last_attempt)
  VALUES (v_phone_key, 1, now())
  ON CONFLICT (throttle_key) DO UPDATE SET
    failed_count = CASE
      WHEN auth_throttle.last_attempt < now() - interval '15 minutes'
        OR (auth_throttle.locked_until IS NOT NULL AND auth_throttle.locked_until <= now())
      THEN 1 ELSE auth_throttle.failed_count + 1 END,
    last_attempt = now();

  UPDATE auth_throttle
  SET locked_until = now() + interval '15 minutes'
  WHERE throttle_key = v_phone_key AND failed_count >= 25;

  RETURN jsonb_build_object('ok', false, 'locked', false);
END;
$function$;
