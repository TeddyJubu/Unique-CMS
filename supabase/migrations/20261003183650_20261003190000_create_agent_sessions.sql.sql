/*
# Create agent_sessions table for the CMS AI assistant

1. New Tables
- `agent_sessions` — maps an owner chat window to a durable eve agent session.
  - `id` (uuid, primary key)
  - `chat_key` (text, unique) — anonymous browser-local chat identifier
  - `eve_session_id` (text) — the eve workflow session ID (wrun_...)
  - `created_at`, `updated_at` (timestamps)

2. Security
- RLS enabled.
- Public (anon, authenticated) can read and write: this is a single-tenant
  shop with no user accounts; the edge function validates owner access
  server-side using the shop PIN before revealing or creating sessions.
*/

CREATE TABLE IF NOT EXISTS agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_key text UNIQUE NOT NULL,
  eve_session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_agent_sessions" ON agent_sessions;
CREATE POLICY "public_select_agent_sessions" ON agent_sessions FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_agent_sessions" ON agent_sessions;
CREATE POLICY "public_insert_agent_sessions" ON agent_sessions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_agent_sessions" ON agent_sessions;
CREATE POLICY "public_update_agent_sessions" ON agent_sessions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_agent_sessions" ON agent_sessions;
CREATE POLICY "public_delete_agent_sessions" ON agent_sessions FOR DELETE
TO anon, authenticated USING (true);
