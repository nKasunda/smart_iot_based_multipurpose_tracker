# TrackA Developer API

The developer API is for external systems that need to read tracker data from TrackA.
It is not used by tracker devices to send GPS data into TrackA.

## Authentication

Users generate a read-only API key from the dashboard device list by choosing `API` on a tracker.

Use the key as a bearer token:

```text
Authorization: Bearer <developer-api-key>
```

Each key is scoped to one tracker and these read scopes:

```text
tracker:latest:read
tracker:history:read
tracker:live:read
```

## Endpoints

```text
GET /api/tracker/developer/latest
GET /api/tracker/developer/history?from=<iso-date>&to=<iso-date>&limit=500
```

`from`, `to`, and `limit` are optional. `limit` is capped at 5000.

## Live Updates

External systems can connect with Socket.IO using the same API key:

```js
const socket = io("https://your-tracka-backend.example", {
  transports: ["websocket"],
  auth: { token: "<developer-api-key>" },
});

socket.on("location:update", ({ location }) => {
  console.log(location);
});
```

## Rate Limit

Developer HTTP endpoints are limited to 120 requests per minute per client IP.
