/*
# Assistant session lockdown and PIN throttling (F11, F15)

1. Changes
- Drop all four always-true policies on agent_sessions and revoke every
  privilege from anon/authenticated. The assistant edge function uses the
  service role key, which bypasses RLS, so it keeps working.
- Add `auth_throttle` to record failed owner PIN attempts per caller, with no
  client privileges at all.
- Add `owner_login_throttled(key, phone, pin)` which locks a caller out for 15
  minutes after 8 consecutive failures.

2. Security
- Both tables are deny-by-default: RLS on with no policies and no grants.
*/

DROP POLICY IF EXISTS "public_select_agent_sessions" ON agent_sessions;
DROP POLICY IF EXISTS "public_insert_agent_sessions" ON agent_sessions;
DROP POLICY IF EXISTS "public_update_agent_sessions" ON agent_sessions;
DROP POLICY IF EXISTS "public_delete_agent_sessions" ON agent_sessions;

REVOKE ALL ON agent_sessions FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS auth_throttle (
  throttle_key   text PRIMARY KEY,
  failed_count   int NOT NULL DEFAULT 0,
  locked_until   timestamptz,
  last_attempt   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE auth_throttle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON auth_throttle FROM anon, authenticated;

CREATE OR REPLACE FUNCTION owner_login_throttled(p_key text, p_phone text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key    text := COALESCE(NULLIF(trim(p_key), ''), 'unknown');
  v_locked timestamptz;
  v_count  int;
  v_ok     boolean;
BEGIN
  SELECT locked_until, failed_count INTO v_locked, v_count
  FROM auth_throttle WHERE throttle_key = v_key;

  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RETURN jsonb_build_object('ok', false, 'locked', true);
  END IF;

  v_ok := verify_owner(p_phone, p_pin);

  IF v_ok THEN
    DELETE FROM auth_throttle WHERE throttle_key = v_key;
    RETURN jsonb_build_object('ok', true, 'locked', false);
  END IF;

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

  RETURN jsonb_build_object('ok', false, 'locked', false);
END;
$$;

REVOKE ALL ON FUNCTION owner_login_throttled(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION owner_login_throttled(text, text, text) TO anon, authenticated;
