# Naghma production deployment on aaPanel

This is the production procedure for Naghma on a server that already hosts other Node.js sites. It uses one PM2 process, one private application port, and aaPanel's domain mapping as the public reverse proxy.

The examples use:

```text
Project directory: /www/wwwroot/naghma.flaura.pk/Naghma
Domain:            naghma.flaura.pk
Internal port:     3015
Run user:          www
Node.js:           22 LTS
```

This guide is fixed to the live subdomain `naghma.flaura.pk`. Never run project commands from `/www/wwwroot`; run them from `/www/wwwroot/naghma.flaura.pk/Naghma`, which must contain Naghma's `package.json`, `server.ts`, `src`, and `data`.

## 1. Requirements

In aaPanel:

1. Install Nginx or Apache if one is not already running.
2. Open **Website > Node.js Project > Node version manager**.
3. Install Node.js 22 and set it as the command-line version.
4. Confirm ports 80 and 443 are allowed by both aaPanel's firewall and the hosting provider's firewall/security group.
5. At the DNS provider for `flaura.pk`, create this record:

| Type | Name/Host | Value | Proxy |
| --- | --- | --- | --- |
| `A` | `naghma` | Your aaPanel server's public IPv4 address | DNS-only until SSL works |

Remove an incorrect `AAAA` record for `naghma.flaura.pk` unless this server is also configured for IPv6.

Node.js 24 is not required. Node.js 22 LTS is the recommended deployment version for this project.

## 2. Put the current source on the server

Upload the current project or clone/pull it into:

```text
/www/wwwroot/naghma.flaura.pk/Naghma
```

Local changes must be committed and pushed before `git pull` can retrieve them. If you deploy by upload, ensure changed source files—not only an old `dist` directory—are uploaded.

Verify the directory before installing anything:

```bash
cd /www/wwwroot/naghma.flaura.pk/Naghma

pwd
test -f package.json
test -f server.ts
test -f vite.config.ts
test -d src
npm run
```

`npm run` must list these scripts:

```text
dev
build
start
clean
lint
```

If `lint` or `build` is missing, stop. You are in the wrong project directory or the server has the wrong `package.json`.

## 3. Create the production environment file

Create this file using aaPanel's File Manager:

```text
/www/wwwroot/naghma.flaura.pk/Naghma/.env
```

Contents:

```dotenv
NODE_ENV=production
PORT=3015
APP_URL=https://naghma.flaura.pk
GEMINI_API_KEY=replace_with_your_real_key
```

`GEMINI_API_KEY` is optional. Without it, Naghma uses its local search and curation fallbacks.

Check whether port 3015 is already occupied by another site:

```bash
ss -ltnp | grep ':3015' || true
```

Use another unused port in both `.env` and aaPanel if necessary.

## 4. Install, verify, and build

Run this entire block from aaPanel's terminal:

```bash
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "Open aaPanel's root terminal (or run sudo -i) before continuing."
  exit 1
fi

cd /www/wwwroot/naghma.flaura.pk/Naghma

node -e "const p=require('./package.json'); for (const s of ['lint','build','start']) if (!p.scripts?.[s]) throw new Error('Missing npm script: '+s)"
test -f package-lock.json

npm ci
npm run lint
npm run build

test -f dist/index.html
test -f dist/server.cjs

npm prune --omit=dev

chown -R www:www /www/wwwroot/naghma.flaura.pk/Naghma
chmod 600 /www/wwwroot/naghma.flaura.pk/Naghma/.env
chmod 755 /www/wwwroot/naghma.flaura.pk/Naghma/data
```

`set -e` stops immediately if installation, linting, or building fails. Do not run `npm prune --omit=dev` separately after a failed build.

The completed production build must contain both `dist/index.html` and `dist/server.cjs`.

## 5. Create the aaPanel PM2 project

Stop any earlier Naghma project that runs `npm run dev` so it releases port 3015. Keep the project files and `data/db.json`; after the new production process is verified, the old aaPanel process entry can be removed without deleting its document root.

Open **Website > Node.js Project > Add project > PM2 Project** and enter:

| aaPanel setting | Value |
| --- | --- |
| Project Name | `Naghma` |
| Node Version | Node.js 22 |
| Startup File | `/www/wwwroot/naghma.flaura.pk/Naghma/dist/server.cjs` |
| Run Directory | `/www/wwwroot/naghma.flaura.pk/Naghma` |
| Cluster | `1` |
| Memory Limit | `512M` |
| Package Manager | `npm` |
| Run User | `www` |

The exact run directory is essential. Naghma resolves `dist` and `data/db.json` from its working directory.

Use only one PM2 instance. The application currently uses a JSON file for persistence, so cluster mode or multiple instances can overwrite data.

Start the project. Its log should contain:

```text
Naghma Server is active and listening on http://localhost:3015
```

The production log must not contain `[vite]`, `runOptimizeDeps`, or `.vite/deps_temp`. Those messages mean the development server is running.

## 6. Test the Node process before adding the domain

From the server terminal:

```bash
curl --fail --silent --show-error http://127.0.0.1:3015/api/health
echo
```

Expected response:

```json
{"status":"ok","uptimeSeconds":123}
```

Also test an application endpoint:

```bash
curl --fail --silent --show-error http://127.0.0.1:3015/api/songs | head -c 200
echo
```

Do not continue to domain setup until the local health request returns JSON.

## 7. Map the domain

Open the Naghma project in aaPanel:

1. Open **Domain Manager** and add `naghma.flaura.pk`.
2. Enable **Mapping**. aaPanel will create a website/reverse proxy for the Node project.
3. Confirm the proxy target uses Naghma's port, `3015`.
4. Keep port 3015 private; only ports 80 and 443 need public access.

Test plain HTTP first:

```bash
curl --head http://naghma.flaura.pk
```

A response from Nginx/Apache confirms that DNS and domain mapping are working.

## 8. Enable HTTPS

After HTTP works:

1. Open the Naghma mapping's **SSL** page.
2. Request a Let's Encrypt certificate for `naghma.flaura.pk`.
3. Install/enable the certificate.
4. Enable **Force HTTPS** only after the certificate is active.

Verify:

```bash
curl --fail --silent --show-error https://naghma.flaura.pk/api/health
echo
```

Then open:

```text
https://naghma.flaura.pk
```

aaPanel documents domain Mapping as the reverse proxy from a bound domain to a Node project, with SSL available after Mapping is enabled: [official aaPanel Node.js Project documentation](https://www.aapanel.com/docs/Function/Node.html).

## Updating Naghma

Do not delete `data/db.json`; it contains playlists, favorites, history, and dynamically discovered songs.

### Update an uploaded project (use this on this server)

The current server directory contains uploaded/modified files, so do not use `git pull`, `git restore`, or `git reset` there. Upload the new source files first, then open aaPanel's **root** terminal and copy this entire block. The first command is `set -e` (including the leading `s`).

```bash
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "Open aaPanel's root terminal (or run sudo -i) before continuing."
  exit 1
fi

cd /www/wwwroot/naghma.flaura.pk/Naghma

test -f package.json
test -f server.ts

cp data/db.json "data/db.json.backup-$(date +%Y%m%d-%H%M%S)"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npm run lint
npm run build
test -f dist/index.html
test -f dist/server.cjs
npm prune --omit=dev

chown -R www:www /www/wwwroot/naghma.flaura.pk/Naghma
chmod 600 /www/wwwroot/naghma.flaura.pk/Naghma/.env
```

### Update a clean Git deployment

Use Git updates only in a clean clone that is not overwritten through File Manager. Commit and push the new source first. If `git status --short` lists source files, stop and use the upload procedure above.

```bash
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "Open aaPanel's root terminal (or run sudo -i) before continuing."
  exit 1
fi

cd /www/wwwroot/naghma.flaura.pk/Naghma
git config --global --add safe.directory /www/wwwroot/naghma.flaura.pk/Naghma
git status --short

# Continue only when the checkout is clean except for known runtime data.
git pull --ff-only
npm ci
npm run lint
npm run build
test -f dist/index.html
test -f dist/server.cjs
npm prune --omit=dev

chown -R www:www /www/wwwroot/naghma.flaura.pk/Naghma
chmod 600 /www/wwwroot/naghma.flaura.pk/Naghma/.env
```

Restart Naghma from **Node.js Project > Service status**, then check:

```bash
curl --fail --silent --show-error http://127.0.0.1:3015/api/health
curl --fail --silent --show-error https://naghma.flaura.pk/api/health
echo
```

If aaPanel's response headers show `x-cache: HIT`, open the domain Mapping/Reverse Proxy settings, disable proxy caching for this application (or clear its cache), then reload Nginx. `index.html` must not be cached; versioned files under `/assets/` are safe to cache.

## Troubleshooting

### `/api/health` returns HTML

The running `dist/server.cjs` is stale or the server source predates the health endpoint.

```bash
cd /www/wwwroot/naghma.flaura.pk/Naghma
grep -n 'api/health' server.ts
```

- No result: upload or pull the current source.
- Route found: run `npm ci`, `npm run build`, `npm prune --omit=dev`, and restart the PM2 project.

### Production shows an older UI after a successful build

Compare the built and public JavaScript filenames:

```bash
grep -o 'index-[^"[:space:]]*\.js' /www/wwwroot/naghma.flaura.pk/Naghma/dist/index.html
curl --silent https://naghma.flaura.pk/ | grep -o 'index-[^"[:space:]]*\.js'
```

They must match. If they differ, restart the correct PM2 project and clear/disable aaPanel reverse-proxy cache. A response header of `x-cache: HIT` confirms that the proxy returned a cached page.

### Vite permission errors under `/www/wwwroot/node_modules/.vite`

The project is running in development mode or its run directory is `/www/wwwroot`.

- Startup file must be the absolute path to `dist/server.cjs`.
- Run directory must be `/www/wwwroot/naghma.flaura.pk/Naghma`.
- `.env` must contain `NODE_ENV=production`.
- Never solve this by changing permissions on all of `/www/wwwroot`; that can break other hosted sites.

### Local health works but the domain returns 502

- Confirm Mapping targets port 3015.
- Confirm the PM2 process is running.
- Check the Node project log and the mapped website's Nginx/Apache error log.
- Confirm `.env` and aaPanel use the same port.

### HTTPS says `connection refused`

Check whether the web server listens on port 443:

```bash
ss -ltnp | grep ':443' || true
```

- No result: install/enable the SSL certificate and reload Nginx/Apache.
- A result exists: check aaPanel's firewall, the provider firewall/security group, DNS `A`/`AAAA` records, and whether the domain is bound to the correct website.

### Permission denied for `data/db.json`

```bash
chown -R www:www /www/wwwroot/naghma.flaura.pk/Naghma/data
chmod 755 /www/wwwroot/naghma.flaura.pk/Naghma/data
chmod 664 /www/wwwroot/naghma.flaura.pk/Naghma/data/db.json
```

### Gemini features use fallback results

Confirm `GEMINI_API_KEY` exists in the project-root `.env`, restart the PM2 process, and inspect the project log. Do not paste the key into logs or support messages.

## Operational notes

- Back up `data/db.json` regularly.
- Use one process only while the JSON datastore remains in use.
- Favorites and playlists are currently shared by all visitors; the application does not yet have user accounts.
- Some YouTube videos prohibit embedded playback. That is a publisher restriction, not an aaPanel failure.
