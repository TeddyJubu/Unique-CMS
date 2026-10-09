import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import { webcrypto } from "node:crypto"
import ts from "typescript"

async function server({ allowed = true, authFailure = false, storageFailure = false } = {}) {
  let handler; let checks = 0; let signatures = 0; let signedPath
  const db = {
    rpc: async (name, params) => {
      assert.equal(name, "owner_login_throttled")
      assert.equal(params.p_phone, "00000000000")
      checks++
      return { data: { ok: allowed }, error: authFailure ? new Error("database unavailable") : null }
    },
    storage: { from: (bucket) => {
      assert.equal(bucket, "shop-photos")
      return {
        createSignedUploadUrl: async (path) => { signatures++; signedPath = path; return { data: { token: "test-one-file-token" }, error: storageFailure ? new Error("storage unavailable") : null } },
        getPublicUrl: (path) => ({ data: { publicUrl: "https://fixture.invalid/" + path } }),
      }
    } },
  }
  const source = (await readFile(new URL("../supabase/functions/owner-photo-upload/index.ts", import.meta.url), "utf8")).replace(/^import .*\n/, "")
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
  vm.runInNewContext(code, { Request, Response, crypto: webcrypto, createClient: () => db, Deno: { env: { get: () => "test-only" }, serve: (fn) => { handler = fn } } })
  return { run: (body, options = {}) => handler(new Request("https://fixture.invalid/upload", { method: "POST", body: JSON.stringify(body), ...options })), counts: () => ({ checks, signatures, signedPath }) }
}
const photo = { phone: "00000000000", pin: "test-only", contentType: "image/jpeg", size: 1024 }

test("no upload token is issued without owner credentials", async () => {
  const api = await server()
  const response = await api.run({ contentType: "image/jpeg", size: 1024 })
  assert.equal(response.status, 401); assert.equal(api.counts().signatures, 0)
})
test("incorrect owner credentials cannot obtain storage access", async () => {
  const api = await server({ allowed: false })
  assert.equal((await api.run(photo)).status, 401)
  assert.equal(api.counts().checks, 1); assert.equal(api.counts().signatures, 0)
})
test("failed authentication service remains closed", async () => {
  const api = await server({ authFailure: true })
  assert.equal((await api.run(photo)).status, 503); assert.equal(api.counts().signatures, 0)
})
test("a verified owner gets a single random photo path, never a requested overwrite", async () => {
  const api = await server()
  const response = await api.run({ ...photo, path: "../existing.jpg", bucket: "private-documents", upsert: true })
  const body = await response.json()
  assert.equal(response.status, 200); assert.equal(body.token, "test-one-file-token")
  assert.match(body.path, /^photos\/[0-9a-f-]{36}\.jpg$/)
  assert.equal(api.counts().checks, 1); assert.equal(api.counts().signatures, 1)
  assert.equal(response.headers.get("cache-control"), "no-store")
})
test("invalid formats and file sizes cannot receive a token", async () => {
  const api = await server()
  for (const body of [{ ...photo, contentType: "image/svg+xml" }, { ...photo, size: 9 * 1024 * 1024 }, { ...photo, size: -1 }, { ...photo, size: "1024" }]) {
    assert.equal((await api.run(body)).status, 400)
  }
  assert.equal(api.counts().signatures, 0)
})
test("failed storage signing returns an error rather than a usable token", async () => {
  const api = await server({ storageFailure: true })
  const response = await api.run(photo)
  assert.equal(response.status, 503); assert.equal((await response.json()).token, undefined)
})
test("oversized requests are rejected even without content-length", async () => {
  const api = await server()
  assert.equal((await api.run({ ...photo, ignored: "x".repeat(5000) })).status, 400)
  assert.equal(api.counts().checks, 0)
})
