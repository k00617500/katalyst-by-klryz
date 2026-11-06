const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the actual route and validation schema without sending test mail.
function loadRoute(result, env = { RESEND_API_KEY: "test-key", CONTACT_EMAIL: "owner@example.com" }) {
  let sent;
  const load = (file, resolve) => {
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, require: resolve, process: { env }, console: { error() {} } }, { filename: file });
    return module.exports;
  };
  const validation = load(path.resolve("src/lib/validations/contact.ts"), require);
  const route = load(path.resolve("src/app/api/contact/route.ts"), (name) => {
    if (name === "@/lib/validations/contact") return validation;
    if (name === "resend") return { Resend: class { emails = { send: async (payload) => { sent = payload; if (result instanceof Error) throw result; return result; } }; } };
    return require(name);
  });
  return { post: route.POST, sent: () => sent };
}
const form = { name: "Test Client", email: "client@example.com", subject: "Website inquiry", message: "A sufficiently detailed project inquiry.", timeline: "Within six weeks" };
const request = (body = form) => new Request("http://localhost/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("accepts mail only with a provider message ID and includes the timeline", async () => {
  const route = loadRoute({ data: { id: "mail-123" }, error: null });
  const response = await route.post(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, messageId: "mail-123" });
  assert.match(route.sent().text, /Ideal Timeline: Within six weeks/);
  assert.equal(route.sent().replyTo, form.email);
  assert.equal(route.sent().to, "owner@example.com");
});
test("does not report success when Resend returns an error without throwing", async () => {
  const response = await loadRoute({ data: null, error: { name: "validation_error", message: "Sender not verified" } }).post(request());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).success, undefined);
});
test("does not report success for an empty provider response", async () => {
  assert.equal((await loadRoute({ data: null, error: null }).post(request())).status, 502);
});
test("reports network failures and missing configuration", async () => {
  assert.equal((await loadRoute(new Error("Network unavailable")).post(request())).status, 500);
  assert.equal((await loadRoute({}, {}).post(request())).status, 503);
});
test("rejects invalid input and malformed JSON before sending", async () => {
  const route = loadRoute({ data: { id: "unexpected" }, error: null });
  assert.equal((await route.post(request({ ...form, email: "invalid" }))).status, 400);
  assert.equal((await route.post(new Request("http://localhost/api/contact", { method: "POST", body: "{" }))).status, 400);
  assert.equal(route.sent(), undefined);
});
