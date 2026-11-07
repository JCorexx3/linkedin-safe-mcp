# LinkedIn Safe MCP

Local MCP for creating pending post, comment, reaction, event, and image-post metadata drafts. It does not connect to LinkedIn, publish, upload/read images, or perform account actions. The MCP server refuses to start without an explicit `LINKEDIN_SAFE_DRAFTS_FILE` path. Configure a different local file per agent: this avoids accidental sharing, but is **not** an access-control boundary against agents that can read each other's files. The CLI defaults to `~/.linkedin-safe-mcp/drafts.json` and does not share that file with the MCP unless explicitly configured.

## Run

Node.js 20+: `npm ci`, then set `LINKEDIN_SAFE_DRAFTS_FILE` to an absolute, per-agent `drafts.json` path and run `npm start`. MCP tools: `draft_post`, `draft_comment`, `draft_reaction`, `draft_event`, `draft_image_post`, and `list_pending`. The image-post tool stores caption/alt-text/label metadata only; it accepts no path and reads no file. CLI draft operations: `npm run cli -- draft "Post text"`, `npm run cli -- list`, and `npm run cli -- status <id>`. `publish <id>` remains intentionally disabled and fails closed.

## Install in an MCP-capable agent

Install dependencies locally with Node.js 20+ (`npm ci`). Configure the agent's MCP client to launch `node` with the absolute path to this repository's `src/server.js` as its argument (stdio transport). Set a **different absolute drafts file for each agent**, outside the public source repository; do not put API keys or tokens there. Example generic JSON (replace both paths):

```json
{
  "mcpServers": {
    "linkedin-safe-mcp": {
      "command": "node",
      "args": ["C:/path/to/LinkedIn Safe MCP/src/server.js"],
      "env": {"LINKEDIN_SAFE_DRAFTS_FILE": "C:/path/to/agent-private/drafts.json"}
    }
  }
}
```

This JSON is illustrative, **not** a verified install recipe for every MCP client. Use the client's supported MCP setup flow rather than hand-editing protected config, and verify the six listed tools appear after registration. Register the skill instructions separately if the agent supports skills: `skills/linkedin-safe-posting/SKILL.md`. Give each agent a distinct file and filesystem permission boundary where possible; the server does not prove agents are isolated. This only installs local draft tools; it does not add live LinkedIn functionality.

## Safety boundary

All create tools only save local pending drafts. No LinkedIn network requests, OAuth, tokens, live comments/reactions/events, image uploads, delete operations, or publishing are supported. The original project also exposed profile/email, auth/session, rate-limit, post-history, and event reads; **none of those account functions are in this repository**. Do not provide credentials. Approval to create a draft is not approval to transmit or act on it. Human review and a separately authorized live integration would be required for any external action; this repository intentionally does not implement one. In particular, LinkedIn's OIDC `userinfo.sub` can be pairwise and is not independently verified as the post author `urn:li:person:ID`; app access, permissions, and API version compatibility also remain unverified.

This source repository is public. Never commit a real draft, credential, or private client data to it; drafts stay in local per-agent files.

Draft payload fields are allowlisted and validated; the image-draft tool rejects file-path fields and never reads a media file. `LINKEDIN_SAFE_DRAFTS_FILE` is a separate, trusted local configuration path—pointing it at an unrelated `drafts.json` is a configuration error. The store rejects unrecognized formats rather than overwriting them, and migrates earlier valid draft arrays on the next write. Store writes use a cross-process lock and atomic replacement. A process crash may leave a stale lock; remove it only after confirming no process uses the store.

## Verify

Run `npm test` and `npm run build`. Tests use fake/local data only.
