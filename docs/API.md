# BRAHMA API

## Endpoints

### `GET /health`
Returns system health.
```json
{ "status": "ok", "service": "brahma-api" }
```

### `POST /api/missions`
Starts a new autonomous mission.
**Body:**
```json
{ "objective": "Fix checkout latency" }
```
**Response:**
```json
{ "id": "uuid", "status": "STARTED" }
```

### `GET /api/missions`
Returns all historical missions.

### `GET /api/missions/:id/stream`
SSE stream emitting `BrahmaEvent`s.

### `POST /api/missions/:id/approve`
Approves a mission in `AWAITING_APPROVAL` state.

### `POST /api/missions/:id/inject-failure`
Triggers the CHAOS injection demo.
