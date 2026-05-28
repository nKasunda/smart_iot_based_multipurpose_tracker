# TrackA Developer API

The developer API is for external systems that need to integrate one TrackA tracker.
All endpoints are versioned under `/api/v1`, and the `device_id` always lives in the URL path.

## Authentication

Users generate a provider-issued JWT from the dashboard device list by choosing `API` on a tracker.
Developers must not generate their own tokens.

Use the key as a bearer token:

```text
Authorization: Bearer <developer-api-key>
```

Each key is scoped to one tracker and these scopes:

```text
tracker:telemetry:write
tracker:latest:read
tracker:history:read
tracker:live:read
```

The backend rejects requests when the JWT `device_id` does not match the URL `device_id`.

## Endpoints

```text
POST /api/v1/devices/:device_id/telemetry
GET /api/v1/devices/:device_id/latest
GET /api/v1/devices/:device_id/history?from=<iso-date>&to=<iso-date>&limit=500
```

`from`, `to`, and `limit` are optional. `limit` is capped at 5000.

## Telemetry Format

```json
{
  "device_id": "tracker101",
  "telemetry": [
    {
      "lat": -15.3876,
      "lng": 35.3367,
      "battery": 87,
      "signal": 22,
      "timestamp": "2026-05-28T10:00:00Z"
    }
  ]
}
```

Every telemetry entry must include `lat`, `lng`, `battery`, `signal`, and an ISO-8601 UTC `timestamp`.

## Live Updates

External systems can connect with Socket.IO using the same API key:

```js
const socket = io("https://your-tracka-backend.example", {
  transports: ["websocket"],
  auth: { token: "<developer-api-key>" },
});

socket.on("location:update", (message) => {
  console.log(message);
});
```

Each device is isolated into its own Socket.IO room named by `device_id`. On reconnect, the server replays the latest known location with `replay: true`.

## Errors

```json
{
  "error": "INVALID_TIMESTAMP",
  "message": "telemetry[0] must include a valid ISO-8601 timestamp.",
  "status": 400
}
```

## Rate Limit

Developer HTTP endpoints are limited per device/API key.
