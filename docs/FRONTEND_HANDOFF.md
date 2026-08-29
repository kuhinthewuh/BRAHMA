# BRAHMA Frontend Handoff

Welcome to the BRAHMA frontend integration! 

## Running the Backend
1. Clone the repository and run `npm install`.
2. Ensure you have copied `.env.example` to `.env` and added `OPENAI_API_KEY` and `DAYTONA_API_KEY`.
3. Start the entire backend stack with:
   `npm run dev`

## Base URL
The backend API runs on `http://localhost:8787`.

## Core Features Needed in Frontend
1. **List Missions**: Fetch from `GET /api/missions`
2. **View Live Mission**: Connect via Server-Sent Events to `GET /api/missions/:id/stream`
3. **Approve/Reject**: Render an approval UI when mission status is `AWAITING_APPROVAL`. Call `POST /api/missions/:id/approve` or `reject`.

## API Endpoints Overview
See `docs/API.md` for full request/response schemas.

### Mission Stream (SSE)
`GET /api/missions/:id/stream`
Emits JSON events. Every event conforms to the `BrahmaEvent` interface (see `packages/shared/src/index.ts`).

### Chaos Demo
`POST /api/missions/:id/inject-failure`
Use this to inject a deterministic failure into the active worker to demonstrate fault tolerance.

### Approval
`POST /api/missions/:id/approve`
When approved, the orchestrator immediately triggers the deployment step in the background.

## Types
You can import types directly from `@brahma/shared` if you use npm workspaces, or copy `packages/shared/src/index.ts` into your frontend project.
