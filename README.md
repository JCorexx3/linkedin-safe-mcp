# LinkedIn Safe MCP

Local MCP provides draft-only personal-profile post storage; it has no publishing tool. Drafts are stored locally at `~/.linkedin-safe-mcp/drafts.json`.

## Run

Node.js 20+: `npm install`, then `npm start`. CLI draft operations: `npm run cli -- draft "Post text"`, `npm run cli -- list`, and `npm run cli -- status <id>`. `publish <id>` is intentionally disabled and will fail closed.

The code does not connect a LinkedIn account, and no real token or live LinkedIn request has been used. `LINKEDIN_ACCESS_TOKEN`, if set, is a runtime environment variable—not a vault or secure credential store. Do not provide a real token; credential use has not been approved or tested.

## Identity and publishing safety

There is no valid publish path. LinkedIn's Sign In with LinkedIn (OIDC) metadata declares pairwise subject identifiers, so `userinfo.sub` may be app-specific and cannot be assumed to equal a numeric `urn:li:person:ID`. No verified LinkedIn-authorized mapping to the exact author URN is implemented. Consequently, this project does not send a Posts API POST, does not claim the token belongs to a configured person URN, and does not publish even after human confirmation. Do not restore publishing without a documented, verified identity binding and explicit review.

LinkedIn Posts API access/scope eligibility (including `w_member_social` where applicable), app approval, and API version compatibility remain unverified prerequisites. The official OIDC documentation describes pairwise subjects: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2

Draft state uses a cross-process fail-closed lock and atomic file replacement. A process crash may leave a stale lock; remove it only after confirming no process is using the store. A `sending` claim is non-retryable by design.

## Verify

Run `npm test` and `npm run build`. Tests use fake/local data only. Build syntax-checks every file in `src/`.
