# Deploy Naghma on aaPanel

This guide assumes aaPanel already hosts other Node.js sites. Naghma runs as one additional Node project behind aaPanel's Nginx/Apache mapping, using its own internal port.

## Important architecture notes

- Runtime: Node.js 20 or 22 (Node.js 22 is a good default in aaPanel).
- Start command: `npm start`
- Startup file when using aaPanel's PM2 mode: `dist/server.cjs`
- Working directory: the repository root, for example `/www/wwwroot/naghma`
- Default internal port: `3015`; change it if another project already uses it.
- Keep **one process/cluster instance only**. The app stores playlists, favorites, history, and discovered songs in `data/db.json`; multiple Node workers can overwrite one another.
- The current data is shared by all visitors. This is suitable for a personal installation, but public multi-user accounts would require authentication and a real database.

## 1. Prepare the domain and project directory

Point the domain's `A` record (for example, `naghma.example.com`) to the server IP.

In aaPanel's terminal, upload or clone the repository:

```bash
cd /www/wwwroot
git clone YOUR_REPOSITORY_URL naghma
cd /www/wwwroot/naghma
```

If the files were uploaded as `root`, let aaPanel's normal web user own the project:

```bash
chown -R www:www /www/wwwroot/naghma
chown -R www:www /www/wwwroot/naghma.flaura.pk/Naghma
find /www/wwwroot/naghma -type d -exec chmod 755 {} \;
find /www/wwwroot/naghma -type f -exec chmod 644 {} \;
find /www/wwwroot/naghma.flaura.pk/Naghma -type d -exec chmod 755 {} \;
find /www/wwwroot/naghma.flaura.pk/Naghma -type f -exec chmod 644 {} \;
```

## 2. Configure environment variables

Create `/www/wwwroot/naghma/.env` (it is excluded from Git):

```dotenv
NODE_ENV=production
PORT=3015
GEMINI_API_KEY=replace_with_your_real_key
```

`GEMINI_API_KEY` is optional. Without it, catalog search and Guldasta suggestions use the local fallback data. Protect the file after creating it:

```bash
chown www:www /www/wwwroot/naghma/.env
chmod 600 /www/wwwroot/naghma/.env

chown www:www /www/wwwroot/naghma.flaura.pk/Naghma/.env
chmod 600 /www/wwwroot/naghma/.env
```

Do not reuse a port assigned to another Node site. You can check before choosing one:

```bash
ss -ltnp | grep ':3015'
```

No output means the port is normally available.

## 3. Install and build

In **Website > Node.js Project > Node version manager**, install/select Node.js 22 and set it as the command-line version. Then build from the project root:

```bash
cd /www/wwwroot/naghma
npm ci
npm run lint
npm run build
npm prune --omit=dev
```

The build produces the browser assets and `dist/server.cjs`. Do not configure aaPanel to run Vite's development server in production.

## 4. Add the project in aaPanel

Open **Website > Node.js Project > Add project** and use:

| Setting | Value |
| --- | --- |
| Path / run directory | `/www/wwwroot/naghma` |
| Name | `naghma` |
| Run option | `start` / `npm start` |
| Port | `3015` (or your chosen unused port) |
| Run user | `www` |
| Node version | Node.js 22 |
| Domain | `naghma.example.com` |

If you choose **PM2 Project** instead, set startup file to `/www/wwwroot/naghma/dist/server.cjs`, run directory to `/www/wwwroot/naghma`, package manager to npm, run user to `www`, cluster to `1`, and a reasonable memory limit such as `512M`.

Start the project and confirm **Project log** contains:

```text
Naghma Server is active and listening on http://localhost:3015
```

## 5. Map the domain and enable HTTPS

Open the Naghma project in aaPanel:

1. Add the domain under **Domain Manager**.
2. Enable **Mapping** so aaPanel creates a website reverse-proxied to this Node project.
3. Open **SSL**, request a Let's Encrypt certificate, and enable **Force HTTPS** after issuance succeeds.
4. Keep ports `80` and `443` open publicly. The internal Node port does not need to be exposed by the server firewall.

aaPanel's Node-project documentation describes Mapping as the reverse proxy from the bound domain to the Node project. Its SSL page becomes available after Mapping is enabled.

## 6. Verify the deployment

Test the process locally on the server:

```bash
curl --fail http://127.0.0.1:3015/api/health
```

Expected response:

```json
{"status":"ok","uptimeSeconds":123}
```

Then test through the public proxy:

```bash
curl --fail https://naghma.example.com/api/health
```

Also verify playback in a browser. Some YouTube recordings disallow embedded playback; that is a publisher restriction rather than a server failure.

## Updating later

Back up `data/db.json` before deploying because it contains live application state:

```bash
cd /www/wwwroot/naghma
cp data/db.json "data/db.json.backup-$(date +%Y%m%d-%H%M%S)"
git pull --ff-only
npm ci
npm run lint
npm run build
npm prune --omit=dev
```

Restart the project from **Node.js Project > Service status** and check both the project log and `/api/health`.

## Troubleshooting

- **502 Bad Gateway:** confirm the project is running, its configured port matches `.env`, and `curl http://127.0.0.1:PORT/api/health` works.
- **Permission error for `data/db.json`:** ensure the project and `data` directory are writable by the configured run user (`www`).
- **Site opens another app:** verify this domain is bound only to the Naghma mapping and that its DNS points to this server.
- **SSL validation fails:** wait for DNS propagation, make sure port 80 reaches aaPanel, and temporarily avoid redirect/proxy rules that block Let's Encrypt verification.
- **Gemini features use fallback results:** check `GEMINI_API_KEY` in `.env`, restart the project, and inspect the project log.
- **Changes do not appear:** confirm `npm run build` completed and restart the Naghma process; hashed files under `dist/assets` are intentionally cached for a year.

Reference: [official aaPanel Node.js Project documentation](https://www.aapanel.com/docs/Function/Node.html).
