---
name: linkedin-safe-posting
description: Draft LinkedIn posts locally; publishing is disabled.
---

# LinkedIn Safe Posting

Use this local `linkedin-safe-mcp` only for drafting. MCP tools are draft-only. Do not invoke or enable publishing: the CLI publish command is deliberately fail-closed.

No LinkedIn account is connected or tested. A runtime environment token is not a vault; do not request or provide a real token until separately approved. OIDC `userinfo.sub` is pairwise/app-specific and is not proven equivalent to numeric `urn:li:person:ID`; do not claim account identity binding or infer a target account. Publishing stays disabled until an authoritative documented binding to the exact author URN is available and independently reviewed.

LinkedIn app approval, API version compatibility, and publishing scopes (including `w_member_social` as applicable) are unverified prerequisites. No live publishing or other account action is authorized. Never scrape, message, connect, comment, or react.
