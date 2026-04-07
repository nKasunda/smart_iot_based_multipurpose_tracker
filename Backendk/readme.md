This is the backend for our smart iot based multipurpose tracker
 
 # IoT Tracking System — Backend API

A backend API built with **Node.js** and **Express**, connected to a **PostgreSQL** database as part of a smart IoT-based multipurpose tracking system.

---

## Progress

- ✅ Node.js project initialized with Express
- ✅ PostgreSQL database (`iot_tracking`) created in pgAdmin 4
- ✅ Database schema implemented with 6 tables
- ✅ Express server successfully connected to PostgreSQL
- ✅ JWT authentication implemented (register and login)
- ✅ Role-based middleware (admin and client roles)
- 🔄 Devices routes (in progress)
- 🔄 MQTT broker integration (in progress)
- 🔄 Location routes (in progress)
- 🔄 Socket.io realtime updates (in progress)
- 🔄 Alerts routes (in progress)

---

## Tech Stack

| Layer         | Technology         |
|---------------|--------------------|
| Runtime       | Node.js            |
| Framework     | Express.js         |
| Database      | PostgreSQL 18      |
| DB Client     | node-postgres (pg) |
| Config        | dotenv             |
| Auth          | jsonwebtoken       |
| Encryption    | bcryptjs           |
| Realtime      | Socket.io          |
| IoT Messaging | MQTT (Mosquitto)   |

---

## Database Schema

| Table              | Description                                         |
|--------------------|-----------------------------------------------------|
| `users`            | System users and device owners                      |
| `devices`          | Registered ESP32 + GSM tracker units                |
| `location_logs`    | GPS coordinate stream received from devices         |
| `geofences`        | Circular boundary zones defined by users            |
| `geofence_devices` | Many-to-many relationship between devices and zones |
| `alerts`           | Geofence, offline, and low battery events           |

---

## Project Structure

```
backend/
├── middleware/
│   └── auth.js           ← JWT verification and role checks
├── routes/
│   ├── auth.js           ← register and login
│   ├── users.js          ← user management
│   ├── devices.js        ← tracker management (coming soon)
│   ├── locations.js      ← GPS history (coming soon)
│   ├── geofences.js      ← geofence zones (coming soon)
│   └── alerts.js         ← warnings and alerts (coming soon)
├── mqtt/
│   └── client.js         ← MQTT broker subscriber (coming soon)
├── socket/
│   └── index.js          ← Socket.io live updates (coming soon)
├── db.js                 ← PostgreSQL connection pool
├── index.js              ← Express server entry point
├── .env                  ← environment variables (not committed)
├── .gitignore
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v14 or higher
- PostgreSQL 18
- Mosquitto MQTT broker — [mosquitto.org/download](https://mosquitto.org/download/)

### Installation

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/yourusername/iot-tracking-api.git
   cd iot-tracking-api
   npm install
   ```

2. Create a `.env` file in the project root:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=iot_tracking
   DB_USER=postgres
   DB_PASSWORD=yourpassword
   PORT=3000
   JWT_SECRET=your_secret_key_here
   ```

3. Start the server:
   ```bash
   node index.js
   ```

---

## Authentication

All protected routes require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer <token>
```

Tokens are obtained by logging in via `POST /auth/login`. Two roles exist:

| Role     | Permissions                                      |
|----------|--------------------------------------------------|
| `admin`  | Track devices, assign clients, manage everything |
| `client` | View their assigned tracker location only        |

### Auth endpoints

| Method | Endpoint         | Description         | Access |
|--------|------------------|---------------------|--------|
| POST   | `/auth/register` | Create a new account| Public |
| POST   | `/auth/login`    | Login and get token | Public |

#### Example — Register

```http
POST /auth/register
Content-Type: application/json

{
  "name": "Nelson Kasunda",
  "email": "nelson@example.com",
  "phone": "0881234567",
  "password": "secret123",
  "role": "admin"
}
```

#### Example — Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "nelson@example.com",
  "password": "secret123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4-...",
    "name": "Nelson Kasunda",
    "email": "nelson@example.com",
    "role": "admin"
  }
}
```

---

## Environment Variables

| Variable      | Description                        |
|---------------|------------------------------------|
| `DB_HOST`     | PostgreSQL host (default localhost) |
| `DB_PORT`     | PostgreSQL port (default 5432)      |
| `DB_NAME`     | Database name                       |
| `DB_USER`     | Database user                       |
| `DB_PASSWORD` | Database password                   |
| `PORT`        | Express server port (default 3000)  |
| `JWT_SECRET`  | Secret key used to sign JWT tokens  |

---

## Author

| Name                  | Student ID       |
|-----------------------|------------------|
| Kuthula Zinga         | BSC/COM/NE/05/22 |
