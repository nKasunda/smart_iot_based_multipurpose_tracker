# IoT Tracking Backend API

A backend REST API built with **Node.js** and **Express**, connected to a **PostgreSQL** database for a smart IoT multipurpose tracking system. Supports secure authentication, device management, GPS tracking, and alerts.

---

## Features

- 🔐 User registration & login (JWT authentication)
- 👥 Role-based access control (`admin`, `user`)
- 📡 Device management (CRUD + online/offline status)
- 📍 Location tracking (save, latest, full history)
- 🔔 Alerts *(planned: offline, low battery, abnormal behavior)*

> **Note:** Geofences, MQTT, and WebSocket features have been removed to focus on core tracking functionality.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL 18 |
| DB Client | node-postgres (`pg`) |
| Config | dotenv |
| Auth | jsonwebtoken |
| Encryption | bcryptjs |

---

## Project Structure

```
backend/
├── middleware/
│   └── auth.js           # JWT verification & role checks
├── routes/
│   ├── auth.js           # Register & login
│   ├── users.js          # User management (admin only)
│   ├── devices.js        # Device management
│   ├── location.js       # GPS tracking & history
│   └── alerts.js         # Planned
├── db.js                 # PostgreSQL connection pool
├── index.js              # Express server entry point
├── .env                  # Environment variables (not committed)
├── .gitignore
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v14+
- PostgreSQL 18

### Installation

```bash
git clone https://github.com/yourusername/iot-tracking-api.git
cd iot-tracking-api
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iot_tracking
DB_USER=postgres
DB_PASSWORD=yourpassword
PORT=3000
JWT_SECRET=your_secret_key_here
```

| Variable | Description |
|---|---|
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_NAME` | Database name |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `PORT` | Express server port |
| `JWT_SECRET` | Secret key used to sign JWT tokens |

### Start the Server

```bash
node index.js
```

Server runs at `http://localhost:3000`.

---

## Authentication

All protected routes require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Roles

| Role | Permissions |
|---|---|
| `admin` | Manage users, devices, and tracking data |
| `user` | Access only assigned device locations |

---

## API Reference

### Auth

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/auth/register` | Register a new user | Public |
| `POST` | `/auth/login` | Login & receive JWT | Public |

### Users

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/users` | Get all users | Admin |

### Devices

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/devices` | Register a new device | Admin |
| `GET` | `/devices` | Get all devices (admins see all, users see own) | Authenticated |
| `GET` | `/devices/:id` | Get a specific device | Authenticated |
| `DELETE` | `/devices/:id` | Delete a device | Admin |
| `GET` | `/devices/status/:device_id` | Check online/offline status | Authenticated |

> A device is considered **online** if `last_seen_at` is within the last **120 seconds**.

### Locations

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/location` | Save a device GPS location | Authenticated |
| `GET` | `/location/latest/:device_id` | Get the latest location | Authenticated |
| `GET` | `/location/:device_id` | Get full location history | Authenticated |

### Alerts *(Planned)*

- Device offline
- Low battery
- Abnormal behavior

---

## Project Focus

This backend emphasizes core tracking capabilities:

- ✅ Secure authentication & authorization
- ✅ Device management (CRUD + online/offline)
- ✅ Reliable GPS tracking & history storage
- ✅ Basic alert system for critical events

---

## Author

| Name | Student ID |
|---|---|
| Kuthula Zinga | BSC/COM/NE/05/22 |
