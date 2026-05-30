# MC-Addon-Deployer

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Zonure-ff5e5b?logo=ko-fi&logoColor=white)](https://ko-fi.com/zonure)

> The laziest way to deploy Minecraft Bedrock addons. Drop your `.mcaddon`, enter your panel credentials, and watch it handle everything — pack detection, file uploads, JSON registration, all of it.

Live at **[zonure.xyz](https://zonure.xyz)** — or self-host it yourself.

---

## Features

- 📦 Accepts `.mcaddon` and `.mcpack` files — single or multiple at once
- 🔍 Auto-detects resource packs, behavior packs, or both from `manifest.json`
- 📁 Copies pack files into the correct folder inside your world
- 📝 Registers packs in `world_resource_packs.json` and `world_behavior_packs.json`
- 🔄 Live deploy log streamed to your browser in real time
- ⚡ Smart version checking — installs new, updates outdated, skips already installed
- 🗑 Addon uninstaller — fetch installed addons, select and remove cleanly
- 🎛 Supports both Pelican Panel and Pterodactyl
- 🐍 No panel? Use the [mcaddon-cli](https://github.com/Z0nure/mcaddon-cli) Python script instead

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

> All `VITE_` values are optional — the site has fallbacks built in and will work without them. Only set them if you're forking with your own branding.

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

Add `client_max_body_size` to handle large addon files. The `proxy_buffering off` line is required for the live log stream to work.

```nginx
server {
    server_name yourdomain.com;

    root /path/to/MC-Addon-Deployer/client/dist;
    index index.html;

    client_max_body_size 100M;

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

        # Required for live log streaming (SSE)
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

## How it works

### Deploy

1. Upload one or more `.mcaddon` or `.mcpack` files
2. The server reads both world JSON files to check what's already installed
3. Each pack is categorized — **install**, **update**, or **skip** — based on UUID and version
4. For updates: the old pack folder is deleted first to avoid file conflicts, then new files are uploaded and the version is patched in the JSON
5. For installs: files are uploaded and the pack is registered in the JSON
6. Results are shown per pack with installed / updated / skipped / failed counts

### Uninstall

1. Enter panel credentials and fetch installed addons
2. The tool reads both world JSON files and lists all pack folders, matching them by UUID
3. Resource and behavior packs from the same addon are grouped together by name
4. Select addons to remove — the tool deletes the pack folder(s) and removes the JSON entries

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/addon/deploy` | Deploy addons. Streams progress as SSE. |
| `POST` | `/api/addon/validate` | Validate addon files without deploying. |
| `POST` | `/api/addon/installed` | Fetch installed addons grouped by name. |
| `POST` | `/api/addon/uninstall` | Remove addons. Streams progress as SSE. |
| `GET`  | `/api/health` | Health check. |

### Deploy — multipart/form-data

| Field | Required | Description |
|---|---|---|
| `files[]` | ✔ | One or more `.mcaddon` or `.mcpack` files |
| `panelUrl` | ✔ | e.g. `https://panel.example.com` |
| `apiKey` | ✔ | Client API key (`pacc_` or `ptlc_`) |
| `serverId` | ✔ | 8-character server ID |
| `worldPath` | | World path, default `worlds/default` |
| `restart` | | `"true"` to restart server after deploy |

### Installed & Uninstall — JSON body

| Field | Required | Description |
|---|---|---|
| `panelUrl` | ✔ | Panel URL |
| `apiKey` | ✔ | Client API key |
| `serverId` | ✔ | Server ID |
| `worldPath` | | World path, default `worlds/default` |
| `addons` | ✔ (uninstall only) | Array of addon objects to remove |

---

## Not on a panel?

Check out **[mcaddon-cli](https://github.com/Z0nure/mcaddon-cli)** — a standalone Python script for SSH users that works directly on your server filesystem. No panel needed.

---

## Support

If this saved you time, consider buying me a coffee ☕

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/zonure)

---

Made by [Zonure](https://zonure.xyz) — *The Lazy Lizard*
