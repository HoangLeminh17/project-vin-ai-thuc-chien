# Alertmanager -> Discord Bridge (Railway)

## Deploy
1. Railway -> New Service -> GitHub Repo
1. Root Directory: `monitoring/bridge`
1. Service name (suggested): `discord-bridge`
1. Variables:
   - `DISCORD_WEBHOOK_URL` (required)
   - `DISCORD_USERNAME` (optional, default: `Alertmanager`)
   - `DISCORD_AVATAR_URL` (optional)

## Endpoints
- `GET /health`
- `POST /alertmanager` (Alertmanager webhook receiver)

## Wire Alertmanager
Point Alertmanager receiver URL to:
`http://discord-bridge.railway.internal:8080/alertmanager`
