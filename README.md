# mc-addon-deployer — Web Tool

The web interface for deploying Minecraft Bedrock addons to Pelican or Pterodactyl panel servers. Live at **[zonure.xyz](https://zonure.xyz)** — or self-host it on your own machine.

---

## Stack

- **Frontend** — React + Vite
- **Backend** — Node.js + Express
- **File handling** — Multer + JSZip
- **Panel communication** — Pelican / Pterodactyl Client API

---

## Using the hosted version

Just go to **[zonure.xyz](https://zonure.xyz)** — no setup needed.

Your API key is never stored. See the [Privacy section](https://zonure.xyz#privacy) for full details.

---

## Self-hosting

### Requirements

- Node.js 18 or higher
- npm 8 or higher
- A reverse proxy (nginx recommended) or direct port access

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/mc-addon-deployer.git
cd mc-addon-deployer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp server/.env.example server/.env
nano server/.env
```

```env
PORT=3001
CLIENT_URL=https://yourdomain.com
```

### 4. Build the frontend

```bash
npm run build --workspace=client
```

### 5. Start the server

```bash
# One-time
npm run start --workspace=server

# With PM2 (recommended — keeps it running after reboot)
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## Nginx config (recommended)

```nginx
server {
    server_name yourdomain.com;

    root /path/to/mc-addon-deployer/client/dist;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API — proxy to Express
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;

        # Required for live deploy log streaming
        proxy_buffering off;
        proxy_read_timeout 300s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Add your SSL config here (certbot manages this automatically)
}
```

---

## Updating

**After client changes:**
```bash
npm run build --workspace=client
# nginx picks up the new build automatically
```

**After server changes:**
```bash
pm2 restart mc-addon-deployer
```

**After any change:**
```bash
npm run build --workspace=client && pm2 restart mc-addon-deployer
```

---

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/addon/deploy` | Deploy an addon. Streams progress as SSE. |
| `POST` | `/api/addon/validate` | Validate an addon without deploying. |
| `GET` | `/api/health` | Health check. |

### Deploy request (multipart/form-data)

| Field | Required | Description |
|---|---|---|
| `file` | ✔ | `.mcaddon` or `.mcpack` file |
| `panelUrl` | ✔ | e.g. `https://panel.example.com` |
| `apiKey` | ✔ | Client API key (`pacc_` or `ptlc_`) |
| `serverId` | ✔ | 8-character server ID |
| `worldPath` | | World path, default `worlds/default` |
| `restart` | | `"true"` to restart server after deploy |

---

Part of the [mc-addon-deployer](https://github.com/yourusername/mc-addon-deployer) project by [Zonure](https://zonure.xyz)
