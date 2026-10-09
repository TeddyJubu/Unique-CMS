import { createClient } from "npm:@supabase/supabase-js@2"

// Phone/PIN authentication matches every other owner action. No public storage
// write policy is granted: only a verified owner receives a one-file upload token.
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers })
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405)
  if (Number(req.headers.get("content-length") ?? 0) > 4096) return json({ error: "invalid_request" }, 400)
  try {
    const raw = await req.text()
    if (raw.length > 4096) return json({ error: "invalid_request" }, 400)
    const body = JSON.parse(raw)
    const phone = typeof body.phone === "string" ? body.phone.trim() : ""
    const pin = typeof body.pin === "string" ? body.pin : ""
    if (!phone || phone.length > 32 || !pin || pin.length > 32) return json({ error: "unauthorized" }, 401)
    if (body.contentType !== "image/jpeg" || !Number.isInteger(body.size) || body.size < 1 || body.size > 8 * 1024 * 1024) {
      return json({ error: "invalid_photo" }, 400)
    }
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } })
    const { data: auth, error: authError } = await db.rpc("owner_login_throttled", {
      p_key: `photo:${phone}`, p_phone: phone, p_pin: pin,
    })
    if (authError) return json({ error: "upload_unavailable" }, 503)
    if (!auth?.ok) return json({ error: "unauthorized" }, 401)
    const path = `photos/${crypto.randomUUID()}.jpg`
    const { data, error } = await db.storage.from("shop-photos").createSignedUploadUrl(path)
    if (error || !data) return json({ error: "upload_unavailable" }, 503)
    const { data: publicData } = db.storage.from("shop-photos").getPublicUrl(path)
    return json({ path, token: data.token, publicUrl: publicData.publicUrl })
  } catch {
    return json({ error: "upload_unavailable" }, 400)
  }
})
