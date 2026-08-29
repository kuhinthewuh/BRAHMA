# BRAHMA Review Standards

## Safety

- No production or demo-service deployment may bypass the human approval service.
- Generated code must execute in an isolated sandbox before deployment.
- Approval must be scoped to the exact mission and candidate being deployed.
- Approval actions must be idempotent.
- No hardcoded secrets or API keys.
- All external payloads must be validated.

## Agent Reliability

- Worker failure must never silently discard confirmed evidence.
- Worker lifecycle state transitions must be explicit.
- Replacement workers must restore from structured checkpoints.
- A failed worker cannot directly transition to COMPLETED.
- Mission state must persist independently from disposable worker state.

## Architecture

- TrueForge must remain the actual agent execution runtime.
- Domain logic must not depend on terminal rendering.
- API, orchestration, persistence, and terminal components should remain separated.
- Public APIs must use typed request and response schemas.
- Errors must preserve enough context for debugging without exposing secrets.

## Code Quality

- Strict TypeScript.
- Avoid `any`.
- Important state-machine logic requires tests.
- Approval and deployment paths require tests.
- Failure recovery requires tests.
- Environment configuration must be validated at startup.
