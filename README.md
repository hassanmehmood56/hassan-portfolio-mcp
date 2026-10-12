# Hassan Mehmood: portfolio as an MCP server

An MCP server that lets an AI assistant query my work directly instead of scraping a PDF.
Zero dependencies (Node 18+). One endpoint: `POST /mcp`. Landing page and live console at `/`.

## Tools
| Tool | What it does |
|---|---|
| `get_profile` | Who I am, education, internship, principles, links |
| `get_projects` | Projects with results, hard lessons and honest limitations (filter by `id`) |
| `get_skills` | Skills tied to the projects where they were used, with a strength level |
| `fit_check` | Paste a job description, get matched requirements with evidence plus explicit gaps |
| `send_message` | Messages me, but only with `user_confirmed=true` (the agent must get an explicit yes), max 5 per hour per connection |

**The rule:** everything comes from `data.js`. Skills with no recorded project evidence are reported as
"claimed but unproven", and anything the job asks for that is not in the data is reported as a gap.

## Run locally
```
node server.js        # http://localhost:3000  (endpoint: /mcp)
node test.js          # 15 checks: protocol, data tools, fit-check honesty, send_message guardrails
```

## Edit your content
Everything lives in `data.js`. Add a project, then add the skills it proves with `evidence: [["project-id", "what you did"]]`.
To make the fit check aware of a technology you do NOT know, add it to `knownGapTerms`.

## Deploy (free options)
Any host that runs Node or Docker works (Render, Railway, Fly.io). On Render: New > Web Service > connect the repo >
Build command: (empty) / Start command: `node server.js`.
Your endpoint is then `https://<your-app>.onrender.com/mcp`. Free tiers sleep when idle, so the first call can be slow.

### Get messages on your phone
`send_message` writes to `messages.jsonl`, which disappears on most free hosts when they restart.
Set `MESSAGE_WEBHOOK_URL` to a Discord or Slack incoming-webhook URL and every confirmed message is forwarded there.

## Connect a client
- Claude Code: `claude mcp add --transport http hassan https://YOUR-DOMAIN/mcp`
- Claude / ChatGPT: add a custom connector with the URL
- Cursor: `{ "mcpServers": { "hassan": { "url": "https://YOUR-DOMAIN/mcp" } } }`

Set `PORTFOLIO_URL` near the top of the script in `index.html` to link back to your main site.
