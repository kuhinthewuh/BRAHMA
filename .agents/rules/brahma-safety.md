# BRAHMA Safety Rules

Always refer to [@REVIEW.md](../../REVIEW.md) for the canonical project review standard.

- No production or demo-service deployment may bypass the human approval service.
- Generated code must execute in an isolated sandbox before deployment.
- Approval must be scoped to the exact mission and candidate being deployed.
- Approval actions must be idempotent.
- No hardcoded secrets or API keys.
- All external payloads must be validated.
- Worker failure must never silently discard confirmed evidence.
- Mission state must persist independently from disposable worker state.
