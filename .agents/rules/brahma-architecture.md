# BRAHMA Architecture Rules

Always refer to [@REVIEW.md](../../REVIEW.md) for the canonical project review standard.

- TrueForge must remain the actual agent execution runtime.
- Domain logic must remain independent of terminal rendering.
- API, orchestration, persistence, and terminal components should remain separated.
- Public APIs must use typed request and response schemas.
- Errors must preserve enough context for debugging without exposing secrets.
