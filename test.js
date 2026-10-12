import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.MESSAGES_FILE = path.join(os.tmpdir(), "hassan-mcp-test-messages.jsonl");
const { server } = await import("./server.js"); // import after setting env so tests never touch real messages

await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
let n = 0;
const rpc = async (method, params, id = ++n) => {
  const r = await fetch(base + "/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) });
  return { status: r.status, body: r.status === 202 ? null : await r.json() };
};
const call = async (name, args = {}) => {
  const { body } = await rpc("tools/call", { name, arguments: args });
  return { isError: body.result.isError, data: JSON.parse(body.result.content[0].text) };
};
let passed = 0;
const t = async (name, fn) => { await fn(); passed++; console.log("  ✓", name); };

console.log("MCP protocol");
await t("initialize negotiates version + advertises tools", async () => {
  const { body } = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } });
  assert.equal(body.result.protocolVersion, "2025-06-18");
  assert.ok(body.result.capabilities.tools);
});
await t("notification gets 202 and no body", async () => {
  const r = await fetch(base + "/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) });
  assert.equal(r.status, 202);
});
await t("tools/list returns 5 tools with schemas", async () => {
  const { body } = await rpc("tools/list");
  assert.deepEqual(body.result.tools.map((x) => x.name).sort(), ["fit_check", "get_profile", "get_projects", "get_skills", "send_message"]);
  assert.ok(body.result.tools.every((x) => x.inputSchema && x.description));
});
await t("unknown method -> -32601, unknown tool -> -32602, bad JSON -> 400", async () => {
  assert.equal((await rpc("nope")).body.error.code, -32601);
  assert.equal((await rpc("tools/call", { name: "nope" })).body.error.code, -32602);
  const r = await fetch(base + "/mcp", { method: "POST", body: "{bad" });
  assert.equal(r.status, 400);
});

console.log("Data tools");
await t("get_profile hides empty links and lists the internship", async () => {
  const { data } = await call("get_profile");
  assert.equal(data.name, "Hassan Mehmood");
  assert.ok(Object.values(data.links).every(Boolean));
  assert.ok(data.experience.some((e) => /SOFIT/.test(e.org)));
});
await t("get_projects filters by id and reports limits", async () => {
  const { data } = await call("get_projects", { id: "taxrag" });
  assert.equal(data.count, 1);
  assert.ok(data.projects[0].limitations.length > 0);
});
await t("get_skills ties a skill to its projects", async () => {
  const { data } = await call("get_skills", { skill: "XGBoost" });
  assert.equal(data.skills[0].evidence[0].project_id, "churn");
});
await t("get_skills reports an unknown skill as not evidenced", async () => {
  const { data } = await call("get_skills", { skill: "Kubernetes" });
  assert.equal(data.skills.length, 0);
  assert.match(data.verdict, /No recorded evidence/);
});

console.log("fit_check honesty");
const JD_GOOD = "We need an ML engineer experienced in Python, RAG pipelines, Ollama or local LLMs, ChromaDB, XGBoost and pandas. pytest experience is a plus.";
const JD_BAD = "Senior Backend Engineer. 7+ years of experience. Java, Kubernetes, AWS, Kafka, Terraform, Spring Boot and Go required. Docker daily.";
await t("strong match cites projects as evidence", async () => {
  const { data } = await call("fit_check", { job_description: JD_GOOD });
  assert.equal(data.verdict, "strong");
  assert.ok(data.matched.some((m) => m.skill === "RAG" && m.evidence.some((e) => e.project_id === "taxrag")));
  assert.equal(data.gaps.length, 0);
});
await t("mismatched role reports gaps and experience gap, never a match for them", async () => {
  const { data } = await call("fit_check", { job_description: JD_BAD });
  assert.equal(data.verdict, "weak");
  for (const g of ["Java", "Kubernetes", "AWS", "Kafka", "Terraform", "Spring Boot", "Docker"]) {
    assert.ok(data.gaps.some((x) => x.requirement === g), `expected gap: ${g}`);
  }
  assert.match(data.experience_check.result, /^GAP/);
  assert.equal(data.matched.length, 0);
});
await t("'Go' only matches as a word; 'Django' does not trigger 'Go'", async () => {
  const { data } = await call("fit_check", { job_description: "We use Django and good tooling every day, nothing else about languages here at all." });
  assert.ok(!data.gaps.some((g) => g.requirement === "Go"));
});
await t("claimed-but-unproven skills are not counted as matches", async () => {
  const { data } = await call("fit_check", { job_description: "Looking for someone with Matplotlib and data visualization plus Python experience for reporting." });
  assert.ok(data.unproven_skills.some((s) => s.skill === "Matplotlib"));
  assert.ok(!data.matched.some((s) => s.skill === "Matplotlib"));
});
await t("too-short input returns an error, not a guess", async () => {
  const { isError, data } = await call("fit_check", { job_description: "python" });
  assert.ok(isError && data.error);
});

console.log("send_message guardrails");
await t("refuses without explicit user confirmation", async () => {
  const { isError, data } = await call("send_message", { sender_name: "A", message: "Hello Hassan, great work", user_confirmed: false });
  assert.ok(isError);
  assert.match(data.error, /Not sent/);
});
await t("delivers when confirmed, then rate-limits after 5", async () => {
  const first = await call("send_message", { sender_name: "Recruiter", sender_contact: "r@example.com", message: "Hello Hassan, we'd like to talk.", user_confirmed: true });
  assert.equal(first.data.status, "delivered");
  for (let i = 0; i < 4; i++) await call("send_message", { sender_name: "R", message: "another message here", user_confirmed: true });
  const sixth = await call("send_message", { sender_name: "R", message: "sixth message here", user_confirmed: true });
  assert.match(sixth.data.error, /Too many/);
});

console.log(`\n${passed} checks passed`);
server.close();
