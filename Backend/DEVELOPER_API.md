# TrackA Developer API

The developer API is for external systems that need to read one TrackA tracker's data.

## Authentication

Users generate a provider-issued API key from the dashboard device list by choosing `API` on a tracker.
The key expires after 30 days.

Use the key as a bearer token:

```text
Authorization: Bearer <developer-api-key>
```

Each key is scoped to one tracker and these read scopes:

```text
latest
history
live
```

## Endpoints

```text
GET /api/v1/devices/:device_id/latest
GET /api/v1/devices/:device_id/history?from=<iso-date>&to=<iso-date>&limit=500
```

`from`, `to`, and `limit` are optional. `limit` is capped at 5000.

## Test With Curl

```bash
curl -H "Authorization: Bearer <developer-api-key>" \
  "https://your-tracka-backend.example/api/v1/devices/<device_id>/latest"
```

```bash
curl -H "Authorization: Bearer <developer-api-key>" \
  "https://your-tracka-backend.example/api/v1/devices/<device_id>/history?limit=100"
```

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

On reconnect, the server replays the latest known location with `replay: true`.

## Errors

```json
{
  "error": "UNAUTHORIZED",
  "message": "Missing developer API key.",
  "status": 401
}
```

## Rate Limit

Developer HTTP endpoints are limited per device/API key.
