# IoT-Tracker Frontend

Next.js (Pages Router) dashboard for the IoT tracker system.

## Configure
- Copy `Frontend/.env.local.example` → `Frontend/.env.local`
- Set `NEXT_PUBLIC_API_BASE` to your backend URL, for example `https://smarttraka.onrender.com`.
- Set `NEXT_PUBLIC_SOCKET_URL` to the same backend URL unless you deploy sockets separately.

## Run
```bash
cd Frontend
npm install
npm run dev
```

Open `http://localhost:3000`.
