---
name: linkedin-safe-posting
description: Create and review local LinkedIn drafts without transmitting them.
---

# Local LinkedIn Draft Workflow

Use `draft_post`, `draft_comment`, `draft_reaction`, `draft_event`, and `draft_image_post` to save pending local drafts; use `list_pending` to review them. Supply only fields accepted by each tool. Reaction values are limited to the supported enum. Image-post drafts contain text metadata only; do not supply filesystem paths or expect image reads/uploads.

These tools do not connect to LinkedIn or cause external effects. There are no live post/comment/reaction/event, upload, delete, profile, OAuth, or token capabilities. Never request or store credentials. Draft approval is local only and does not grant permission for publishing or other network action. Do not claim a draft was posted. The CLI publish operation is fail-closed.
