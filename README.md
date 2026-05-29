# MC-Addon-Deployer

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Zonure-ff5e5b?logo=ko-fi&logoColor=white)](https://ko-fi.com/zonure)

> The laziest way to deploy Minecraft Bedrock addons. Drop your `.mcaddon`, enter your panel credentials, and watch it handle everything — pack detection, file uploads, JSON registration, all of it.

Live at **[zonure.xyz](https://zonure.xyz)** — or self-host it yourself.

---

## Features

- 📦 Accepts `.mcaddon` and `.mcpack` files
- 🔍 Auto-detects resource packs, behavior packs, or both from `manifest.json`
- 📁 Copies pack files into the correct folder inside your world
- 📝 Registers packs in `world_resource_packs.json` and `world_behavior_packs.json`
- 🔄 Live deploy log streamed to your browser
- ✅ Skips packs already registered — safe to run multiple times
- 🎛 Supports both Pelican Panel and Pterodactyl

## Supported Panels

| Panel | API Key Prefix |
|---|---|
| Pelican Panel | `pacc_` |
| Pterodactyl | `ptlc_` |

---

## Using the Hosted Version

Just go to **[zonure.xyz](https://zonure.xyz)** — no setup needed.

Your API key is never stored. See the [Privacy section](https://zonure.xyz#privacy) for full details.

---

## Self-Hosting

### Requirements

- Node.js 18 or higher
- npm 8 or higher
- nginx (recommended) or direct port access

### 1. Clone the repo

```bash
git clone https://github.com/Z0nure/MC-Addon-Deployer.git
cd MC-Addon-Deployer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Both `server` and `client` have their own `.env` files.

**Server:**
```bash
cp server/.env.example server/.env
nano server/.env
```

```env
PORT=3001
CLIENT_URL=https://yourdomain.com
```

**Client (branding):**
```bash
cp client/.env.example client/.env
nano client/.env
```

```env
VITE_SITE_NAME=mc-addon-deployer
VITE_AUTHOR=YourName
VITE_AUTHOR_URL=https://yoursite.com
VITE_GITHUB_URL=https://github.com/yourname/MC-Addon-Deployer
VITE_PYTHON_REPO_URL=https://github.com/yourname/mcaddon-cli
VITE_KOFI_URL=https://ko-fi.com/yourname
```

> All `VITE_` values are optional — the site has fallbacks built in and will still work without them. Only set them if you're forking and want your own branding.

### 4. Build the frontend

```bash
npm run build --workspace=client
```

### 5. Start the server

**One-time:**
```bash
npm run start --workspace=server
```

**With PM2 (recommended):**
```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## Nginx Config

```nginx
server {
    server_name yourdomain.com;

    root /path/to/MC-Addon-Deployer/client/dist;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

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
}
```

---

## Updating

**After client changes:**
```bash
npm run build --workspace=client
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

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/addon/deploy` | Deploy an addon. Streams progress as SSE. |
| `POST` | `/api/addon/validate` | Validate an addon without deploying. |
| `GET` | `/api/health` | Health check. |

### Deploy Fields (multipart/form-data)

| Field | Required | Description |
|---|---|---|
| `file` | ✔ | `.mcaddon` or `.mcpack` file |
| `panelUrl` | ✔ | e.g. `https://panel.example.com` |
| `apiKey` | ✔ | Client API key (`pacc_` or `ptlc_`) |
| `serverId` | ✔ | 8-character server ID |
| `worldPath` | | World path, default `worlds/default` |
| `restart` | | `"true"` to restart server after deploy |

---

## Prefer the terminal?

Check out **[mcaddon-cli](https://github.com/Z0nure/mcaddon-cli)** — a standalone Python script for SSH users. No panel needed.

---

## Support

If this saved you time, consider buying me a coffee ☕

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/zonure)

---

Made by [Zonure](https://zonure.xyz) — *The Lazy Lizard*
