// Remote MCP server (Streamable HTTP, stateless, JSON responses). Zero dependencies.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { profile, experience, milestones, projects, skills, knownGapTerms } from "./data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const MESSAGES_FILE = process.env.MESSAGES_FILE || path.join(__dirname, "messages.jsonl");
const WEBHOOK = process.env.MESSAGE_WEBHOOK_URL || ""; // Discord / Slack / ntfy-style webhook
const SERVER_INFO = { name: "hassan-mehmood-portfolio", version: "1.0.0" };
const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

const projectById = Object.fromEntries(projects.map((p) => [p.id, p]));
const clean = (links) => Object.fromEntries(Object.entries(links).filter(([, v]) => v));

// ───────────── tool implementations ─────────────

function getProfile() {
  return {
    ...profile,
    links: clean(profile.links),
    experience,
    milestones,
    note: "Everything here comes from a fixed data file. Nothing is inferred beyond it.",
  };
}

function getProjects({ id, status } = {}) {
  let list = projects;
  if (id) list = list.filter((p) => p.id === id || p.name.toLowerCase().includes(String(id).toLowerCase()));
  if (status) list = list.filter((p) => p.status === status);
  if (!list.length) {
    return { projects: [], note: `No project matches. Available ids: ${projects.map((p) => p.id).join(", ")}` };
  }
  return { count: list.length, projects: list.map((p) => ({ ...p, link: p.link || undefined })) };
}

function expandSkill(s) {
  return {
    skill: s.name,
    category: s.category,
    strength: s.strength,
    evidence: s.evidence.map(([pid, detail]) => ({
      project_id: pid,
      project: projectById[pid]?.name,
      project_status: projectById[pid]?.status,
      detail,
    })),
    ...(s.strength === "listed" ? { caveat: "Listed as a skill but no project evidence is recorded for it yet." } : {}),
  };
}

function getSkills({ skill, category } = {}) {
  let list = skills;
  if (skill) {
    const q = String(skill).toLowerCase();
    list = list.filter((s) => s.name.toLowerCase().includes(q) || s.aliases.some((a) => a === q));
  }
  if (category) list = list.filter((s) => s.category.toLowerCase().includes(String(category).toLowerCase()));
  if (!list.length) {
    return {
      skills: [],
      verdict: skill ? `No recorded evidence of "${skill}". Reported as a gap rather than guessed.` : "No skills match.",
      categories: [...new Set(skills.map((s) => s.category))],
    };
  }
  return {
    count: list.length,
    strength_legend: {
      built: "used in a working or finished project",
      "in-progress": "used in a project still underway",
      coursework: "used only in university coursework",
      listed: "claimed, but no project evidence recorded",
    },
    skills: list.map(expandSkill),
  };
}

const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text, term) =>
  new RegExp(`(?<![A-Za-z0-9+#.])${esc(term)}(?![A-Za-z0-9+#])`, "i").test(text);

function fitCheck({ job_description }) {
  const jd = String(job_description || "");
  if (jd.trim().length < 40) {
    return { error: "Provide the full job description text (at least a few sentences) in `job_description`." };
  }

  const matched = [];
  const unproven = [];
  for (const s of skills) {
    const hit = s.aliases.find((a) => has(jd, a));
    if (!hit) continue;
    if (s.strength === "listed") unproven.push({ requirement: hit, ...expandSkill(s) });
    else matched.push({ requirement: hit, ...expandSkill(s) });
  }

  const skillAliases = new Set(skills.flatMap((s) => s.aliases));
  const gaps = knownGapTerms
    .filter((t) => !skillAliases.has(t.toLowerCase()) && has(jd, t))
    .map((t) => ({ requirement: t, note: "No evidence in the portfolio data. Not claimed." }));

  // Experience requirement
  const years = [...jd.matchAll(/(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?years?/gi)].map((m) => Number(m[1]));
  const maxYears = years.length ? Math.max(...years) : 0;
  const senior = /\b(senior|staff|principal|lead|head of|director)\b/i.test(jd.split("\n")[0] + " " + jd.slice(0, 300));
  const experience_check = {
    profile_shows: "Student projects plus one summer 2026 machine-learning internship; no multi-year professional experience.",
    years_requested: maxYears || null,
    result:
      maxYears >= 2 || senior
        ? "GAP: the role appears to expect more professional experience than this profile shows."
        : "No demanding experience requirement detected.",
  };

  const weights = { built: 1, "in-progress": 0.7, coursework: 0.5 };
  const score = matched.reduce((a, m) => a + (weights[m.strength] ?? 0), 0);
  const considered = matched.length + unproven.length + gaps.length;
  const ratio = considered ? score / considered : 0;
  let verdict;
  if (considered < 3) verdict = "insufficient_signal";
  else if (ratio >= 0.65 && experience_check.result.startsWith("No")) verdict = "strong";
  else if (ratio >= 0.35) verdict = "partial";
  else verdict = "weak";

  return {
    verdict,
    coverage: `${matched.length} evidenced match(es), ${unproven.length} claimed-but-unproven, ${gaps.length} gap(s) among ${considered} recognised requirement(s)`,
    matched,
    unproven_skills: unproven,
    gaps,
    experience_check,
    how_to_read_this: [
      "Every match is backed by a named project. Gaps are reported, never papered over.",
      "Only requirements this server recognises are compared. Anything else in the job description was NOT evaluated.",
      "This is an evidence summary, not a hiring decision. For anything uncertain, ask Hassan via send_message.",
    ],
  };
}

const hits = new Map(); // ip -> timestamps
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  if (arr.length >= 5) { hits.set(ip, arr); return true; }
  arr.push(now); hits.set(ip, arr); return false;
}

async function sendMessage({ sender_name, sender_contact, message, user_confirmed }, ip) {
  if (user_confirmed !== true) {
    return {
      error:
        "Not sent. The human user must explicitly ask to send this message. Show them the exact text, " +
        "get a clear yes, then call again with user_confirmed=true.",
    };
  }
  const name = String(sender_name || "").trim().slice(0, 100);
  const body = String(message || "").trim();
  if (!name || body.length < 5) return { error: "sender_name and a message of at least 5 characters are required." };
  if (body.length > 1500) return { error: "Message too long (max 1500 characters)." };
  if (rateLimited(ip)) return { error: "Too many messages from this connection. Try again later." };

  const record = {
    at: new Date().toISOString(),
    sender_name: name,
    sender_contact: String(sender_contact || "").trim().slice(0, 200) || null,
    message: body,
  };
  let stored = false, forwarded = false;
  try { fs.appendFileSync(MESSAGES_FILE, JSON.stringify(record) + "\n"); stored = true; } catch {}
  if (WEBHOOK) {
    try {
      const text = `📬 Portfolio MCP message from ${record.sender_name}${record.sender_contact ? ` (${record.sender_contact})` : ""}:\n${record.message}`;
      const r = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, content: text }),
      });
      forwarded = r.ok;
    } catch {}
  }
  if (!stored && !forwarded) return { error: "The message could not be delivered. Please use the links in get_profile instead." };
  return { status: "delivered", stored, forwarded, note: "Hassan will see it and can reply to the contact you gave." };
}

// ───────────── tool registry ─────────────

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const TOOLS = [
  {
    name: "get_profile",
    description: "Who Hassan Mehmood is: headline, education, current work, internship, principles, links. Start here.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { title: "Get profile", ...READ },
    run: () => getProfile(),
  },
  {
    name: "get_projects",
    description:
      "Hassan's projects with stack, measurable results, what was hard, and honest limitations. Optional filters: id (e.g. 'univoice', 'taxrag', 'churn', 'logs', 'seizure', 'body', 'expense') or status.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Project id or part of its name" },
        status: { type: "string", enum: ["in-progress", "published", "completed", "coursework"] },
      },
      additionalProperties: false,
    },
    annotations: { title: "Get projects", ...READ },
    run: (a) => getProjects(a),
  },
  {
    name: "get_skills",
    description:
      "Skills, each tied to the projects where it was actually used, with a strength level. Pass `skill` to check one (e.g. 'XGBoost'); an unknown skill is reported as not evidenced, never guessed.",
    inputSchema: {
      type: "object",
      properties: {
        skill: { type: "string", description: "Skill name to check, e.g. 'RAG' or 'Docker'" },
        category: { type: "string", description: "e.g. 'Retrieval & LLMs', 'Data & ML', 'Web development', 'Tools & practice'" },
      },
      additionalProperties: false,
    },
    annotations: { title: "Get skills with evidence", ...READ },
    run: (a) => getSkills(a),
  },
  {
    name: "fit_check",
    description:
      "Paste a full job description to get an evidence-based fit check against Hassan's work: matched requirements with the project that proves each, plus explicit gaps. Reports gaps instead of guessing.",
    inputSchema: {
      type: "object",
      properties: { job_description: { type: "string", description: "The full text of the job description" } },
      required: ["job_description"],
      additionalProperties: false,
    },
    annotations: { title: "Evidence-based fit check", ...READ },
    run: (a) => fitCheck(a),
  },
  {
    name: "send_message",
    description:
      "Send Hassan a message. ONLY call this when the human user explicitly asks to contact him. Show them the exact text first and set user_confirmed=true only after they clearly agree. Never send on your own initiative.",
    inputSchema: {
      type: "object",
      properties: {
        sender_name: { type: "string", description: "Name of the person sending" },
        sender_contact: { type: "string", description: "How Hassan can reply (email, LinkedIn, phone)" },
        message: { type: "string", description: "The message text (max 1500 characters)" },
        user_confirmed: { type: "boolean", description: "True only if the human explicitly confirmed sending this exact text" },
      },
      required: ["sender_name", "message", "user_confirmed"],
      additionalProperties: false,
    },
    annotations: { title: "Send Hassan a message", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    run: (a, ip) => sendMessage(a, ip),
  },
];

// ───────────── JSON-RPC handling ─────────────

const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const err = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

async function handle(msg, ip) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return err(msg?.id ?? null, -32600, "Invalid Request");
  const { id, method, params = {} } = msg;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case "initialize": {
      const v = SUPPORTED.includes(params.protocolVersion) ? params.protocolVersion : SUPPORTED[0];
      return ok(id, {
        protocolVersion: v,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "This server is Hassan Mehmood's portfolio. Answer only from tool results. If a tool shows no evidence for something, say it is a gap; never guess. " +
          "Only use send_message when the human user explicitly asks to contact Hassan.",
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS.map(({ run, ...t }) => t) });
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === params.name);
      if (!tool) return err(id, -32602, `Unknown tool: ${params.name}`);
      try {
        const out = await tool.run(params.arguments || {}, ip);
        return ok(id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], isError: Boolean(out && out.error) });
      } catch (e) {
        return ok(id, { content: [{ type: "text", text: `Tool failed: ${e.message}` }], isError: true });
      }
    }
    default:
      if (isNotification || method.startsWith("notifications/")) return null;
      return err(id, -32601, `Method not found: ${method}`);
  }
}

// ───────────── HTTP ─────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Authorization",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(new Error("too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").toString().split(",")[0].trim();
  const send = (code, obj, extra = {}) => {
    res.writeHead(code, { "Content-Type": "application/json", ...CORS, ...extra });
    res.end(obj === undefined ? "" : JSON.stringify(obj));
  };

  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }

  if (url.pathname === "/mcp") {
    if (req.method === "GET") return send(405, { error: "This server does not offer an SSE stream. POST JSON-RPC to /mcp." }, { Allow: "POST, OPTIONS" });
    if (req.method === "DELETE") return send(405, { error: "Stateless server: no sessions to end." });
    if (req.method !== "POST") return send(405, { error: "Method not allowed" });
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return send(400, err(null, -32700, "Parse error")); }
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map((m) => handle(m, ip)))).filter(Boolean);
      return out.length ? send(200, out) : send(202);
    }
    const out = await handle(body, ip);
    return out ? send(200, out) : send(202);
  }

  if (url.pathname === "/health") return send(200, { status: "ok", tools: TOOLS.length });

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    try {
      const html = fs.readFileSync(path.join(__dirname, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      return res.end(html);
    } catch { return send(500, { error: "index.html missing" }); }
  }

  send(404, { error: "Not found" });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`Portfolio MCP server on http://localhost:${PORT}  (endpoint: /mcp)`));
}
export { server, handle };
