# TrackA Developer API Guide

This guide explains how a developer can read tracker data from TrackA and integrate it into another system.

The Developer API is read-only. It can be used to get:

- The latest location of one tracker
- Historical movement for one tracker
- Live location updates through Socket.IO

It does not let developers register trackers, claim trackers, manage users, or send tracker telemetry into TrackA.

## 1. What Does It Do?

The API gives an external system controlled access to one tracker device.

Typical uses:

- Show a tracker on another platform's map
- Display current battery and signal values
- Build a route or movement history view
- Listen for real-time `location:update` events

Each API key is scoped to one tracker only.

## 2. Where Do I Get The API Details?

In TrackA:

1. Sign in.
2. Open `Devices`.
3. Find the tracker.
4. Click `API`.
5. Copy the API key and endpoint URLs shown in the panel.

The API panel gives you:

- `device_id`
- `auth.apiKey`
- `endpoints.latest.url`
- `endpoints.history.url`
- Socket.IO connection details

## 3. How Do I Authenticate?

Send the copied API key as a Bearer token.

```text
Authorization: Bearer <developer-api-key>
```

Important rules:

- API keys are issued by TrackA only.
- Developers must not generate their own tokens.
- API keys expire after 30 days.
- An API key only works for the `device_id` shown in the API panel.

## 4. What Endpoints Exist?

Replace:

- `<base-url>` with the TrackA backend URL
- `<device_id>` with the tracker device ID
- `<developer-api-key>` with the copied API key

### Latest Location

```text
GET <base-url>/api/v1/devices/<device_id>/latest
```

Returns the most recent known location and status for the tracker.

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

`limit` is optional and capped at `5000`.

### Live Updates

Socket.IO server:

```text
<base-url>
```

Event:

```text
location:update
```

## 5. What Do I Send?

For REST endpoints, send:

- Method: `GET`
- Header: `Authorization: Bearer <developer-api-key>`
- Body: none

Example:

```bash
curl -H "Authorization: Bearer <developer-api-key>" \
  "<base-url>/api/v1/devices/<device_id>/latest"
```

Do not send POST bodies to the Developer API. It is GET-only.

## 6. What Do I Get Back?

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

If the tracker has not reported a location yet, location fields may be `null`.

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

### Live Update Message

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

When a socket reconnects, TrackA may replay the latest known location:

```json
{
  "replay": true
}
```

## 7. What Can Go Wrong?

Errors use this standard format:

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
| `403` | `FORBIDDEN` | API key is not allowed to access this API. |
| `403` | `DEVICE_SCOPE_MISMATCH` | API key belongs to a different tracker. |
| `403` | `INSUFFICIENT_SCOPE` | API key does not include the required read scope. |
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

## 8. How Do I Test It?

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

### Test Missing API Key

```bash
curl "<base-url>/api/v1/devices/<device_id>/latest"
```

Expected result:

```json
{
  "error": "UNAUTHORIZED",
  "message": "Missing developer API key.",
  "status": 401
}
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

## 9. Quick Checklist

Before testing, confirm:

- The tracker is assigned to a user.
- The dashboard API panel generated an API key.
- The API key is less than 30 days old.
- The URL `device_id` matches the tracker shown in the API panel.
- The request includes `Authorization: Bearer <developer-api-key>`.
- You are using `GET`, not `POST`.
