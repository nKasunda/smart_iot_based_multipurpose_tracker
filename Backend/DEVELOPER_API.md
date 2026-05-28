# TrackA Developer API Guide

This guide explains how a developer can read tracker data from TrackA and integrate it into another system.

The Developer API is read-only. It supports:

- Latest tracker location
- Historical tracker movement
- Live location updates through Socket.IO

It does not allow developers to create users, register trackers, claim trackers, or send device telemetry into TrackA.

## 1. What Does It Do?

The API gives another platform access to one tracker device assigned in TrackA.

A developer can use it to:

- Show the tracker on another map.
- Display battery and signal status.
- Build movement history or route views.
- Receive real-time location updates.

Each API key is scoped to one tracker only.

## 2. How Do I Authenticate?

Generate the API key from the TrackA dashboard:

1. Sign in to TrackA.
2. Open `Devices`.
3. Find the tracker.
4. Click `API`.
5. Copy the API key and endpoint URLs.

Send the key as a Bearer token:

```text
Authorization: Bearer <developer-api-key>
```

Important:

- API keys are issued by TrackA.
- Developers must not create their own tokens.
- The key expires after 30 days.
- The key works only for the tracker shown in the API panel.

## 3. What Endpoints Exist?

Replace:

- `<base-url>` with your TrackA backend URL.
- `<device_id>` with the tracker device ID.
- `<developer-api-key>` with the copied API key.

### Latest Location

```text
GET <base-url>/api/v1/devices/<device_id>/latest
```

### Location History

```text
GET <base-url>/api/v1/devices/<device_id>/history
```

Optional query parameters:

```text
from=<iso-date>
to=<iso-date>
limit=<number>
```

Example:

```text
GET <base-url>/api/v1/devices/<device_id>/history?from=2026-05-28T00:00:00.000Z&to=2026-05-28T23:59:59.999Z&limit=100
```

`limit` is capped at `5000`.

### Live Updates

Socket.IO URL:

```text
<base-url>
```

Event name:

```text
location:update
```

## 4. What Do I Send?

For REST requests, send:

- A `GET` request.
- The endpoint URL.
- The `Authorization` header.

Example header:

```text
Authorization: Bearer <developer-api-key>
```

Do not send a request body. The Developer API endpoints are GET-only.

## 5. What Do I Get Back?

### Latest Location Response

```json
{
  "v": 1,
  "device_id": "tracker101",
  "imei": "123456789012345",
  "name": "Truck 1",
  "lat": -15.3876,
  "lng": 35.3367,
  "battery": 87,
  "signal": 22,
  "speed": 0,
  "timestamp": "2026-05-28T10:00:00.000Z",
  "lastSeen": "2026-05-28T10:00:00.000Z"
}
```

### History Response

```json
{
  "v": 1,
  "device_id": "tracker101",
  "imei": "123456789012345",
  "count": 1,
  "telemetry": [
    {
      "device_id": "tracker101",
      "imei": "123456789012345",
      "name": "Truck 1",
      "lat": -15.3876,
      "lng": 35.3367,
      "battery": 87,
      "signal": 22,
      "speed": 0,
      "timestamp": "2026-05-28T10:00:00.000Z"
    }
  ]
}
```

### Live Update Response

```json
{
  "event": "location:update",
  "v": 1,
  "device_id": "tracker101",
  "imei": "123456789012345",
  "name": "Truck 1",
  "lat": -15.3876,
  "lng": 35.3367,
  "battery": 87,
  "signal": 22,
  "speed": 0,
  "timestamp": "2026-05-28T10:00:00.000Z"
}
```

If the socket reconnects, TrackA may replay the latest known location with:

```json
{
  "replay": true
}
```

## 6. What Can Go Wrong?

Errors use this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "status": 400
}
```

Common errors:

| Status | Error | Meaning |
| --- | --- | --- |
| `401` | `UNAUTHORIZED` | API key is missing, invalid, or expired. |
| `403` | `FORBIDDEN` | API key cannot access this tracker. |
| `403` | `DEVICE_SCOPE_MISMATCH` | API key belongs to a different tracker. |
| `404` | `NOT_FOUND` | Tracker was not found. |
| `429` | `RATE_LIMITED` | Too many requests were made too quickly. |
| `500` | `SERVER_ERROR` | Server could not complete the request. |

Example:

```json
{
  "error": "UNAUTHORIZED",
  "message": "Missing developer API key.",
  "status": 401
}
```

## 7. How Do I Test It?

### Test Latest Location With Curl

```bash
curl -H "Authorization: Bearer <developer-api-key>" \
  "<base-url>/api/v1/devices/<device_id>/latest"
```

### Test History With Curl

```bash
curl -H "Authorization: Bearer <developer-api-key>" \
  "<base-url>/api/v1/devices/<device_id>/history?limit=100"
```

### Test History With Date Filters

```bash
curl -H "Authorization: Bearer <developer-api-key>" \
  "<base-url>/api/v1/devices/<device_id>/history?from=2026-05-28T00:00:00.000Z&to=2026-05-28T23:59:59.999Z&limit=100"
```

### Test With Postman

1. Create a new request.
2. Set method to `GET`.
3. Paste the latest or history endpoint URL.
4. Open the `Authorization` tab.
5. Select `Bearer Token`.
6. Paste the API key.
7. Click `Send`.

### Test With JavaScript Fetch

```js
const response = await fetch("<base-url>/api/v1/devices/<device_id>/latest", {
  headers: {
    Authorization: "Bearer <developer-api-key>",
  },
});

const data = await response.json();
console.log(data);
```

### Test Live Updates With Node.js

Install Socket.IO client:

```bash
npm install socket.io-client
```

Create `test-socket.js`:

```js
const { io } = require("socket.io-client");

const socket = io("<base-url>", {
  transports: ["websocket"],
  auth: {
    token: "<developer-api-key>",
  },
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

socket.on("location:update", (message) => {
  console.log("Location update:", message);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});
```

Run:

```bash
node test-socket.js
```

## 8. Quick Checklist

Before testing, confirm:

- The tracker is assigned to a user.
- The API panel generated an API key.
- The key is less than 30 days old.
- The URL `device_id` matches the API panel tracker.
- The request includes `Authorization: Bearer <developer-api-key>`.
