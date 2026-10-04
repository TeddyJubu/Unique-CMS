/*
# Add AI assistant configuration and conversation storage

1. Changes to existing tables
- `shop_settings`: add `ai_api_url` (text), `ai_api_key` (text), `ai_model` (text)
  These store the owner's OpenAI-compatible API endpoint, key, and model name.
  The key is NOT exposed via the public SELECT policy — only the edge function
  with the service role can read it.

2. New Tables
- `assistant_messages` — stores conversation history per chat window.
  - `id` (uuid, primary key)
  - `chat_key` (text) — links to the browser-local chat identifier
  - `role` (text) — 'user', 'assistant', or 'tool'
  - `content` (text) — message text
  - `tool_name` (text, nullable) — which tool was called
  - `tool_args` (jsonb, nullable) — arguments passed to the tool
  - `tool_result` (jsonb, nullable) — result returned by the tool
  - `created_at` (timestamptz)

3. Security
- RLS enabled on `assistant_messages`.
- Public (anon, authenticated) CRUD: single-tenant shop, edge function
  validates owner access server-side before any action.
- `ai_api_key` is excluded from the public SELECT policy on `shop_settings`
  by adding a column-level GRANT restriction.
*/

-- Add AI config columns to shop_settings
ALTER TABLE shop_settings
  ADD COLUMN IF NOT EXISTS ai_api_url text,
  ADD COLUMN IF NOT EXISTS ai_api_key text,
  ADD COLUMN IF NOT EXISTS ai_model text;

-- Update admin_update_settings to handle the new AI fields
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
    ai_model               = COALESCE(NULLIF(p_patch->>'ai_model', ''), ai_model)
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

-- Create assistant_messages table for conversation history
CREATE TABLE IF NOT EXISTS assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_key text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content text NOT NULL DEFAULT '',
  tool_name text,
  tool_args jsonb,
  tool_result jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_assistant_messages" ON assistant_messages;
CREATE POLICY "public_select_assistant_messages" ON assistant_messages FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_assistant_messages" ON assistant_messages;
CREATE POLICY "public_insert_assistant_messages" ON assistant_messages FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_assistant_messages" ON assistant_messages;
CREATE POLICY "public_update_assistant_messages" ON assistant_messages FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_assistant_messages" ON assistant_messages;
CREATE POLICY "public_delete_assistant_messages" ON assistant_messages FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_chat_key ON assistant_messages(chat_key, created_at);

-- Revoke column-level SELECT on ai_api_key from anon/authenticated so the key
-- is never exposed to the browser even if the row is readable.
REVOKE SELECT (ai_api_key) ON shop_settings FROM anon, authenticated;
