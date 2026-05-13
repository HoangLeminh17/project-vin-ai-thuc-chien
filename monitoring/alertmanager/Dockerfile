FROM prom/alertmanager:latest

COPY alertmanager.yml /etc/alertmanager/alertmanager.yml

# Use root to allow sed modification
USER root

# Start Alertmanager with env var substitution for the webhook URL
ENTRYPOINT ["/bin/sh", "-c", "BRIDGE_URL=${DISCORD_BRIDGE_URL:-http://discord-bridge.railway.internal:8080/alertmanager} && sed -i 's|\\${DISCORD_BRIDGE_URL}|'\"$BRIDGE_URL\"'|g' /etc/alertmanager/alertmanager.yml && /bin/alertmanager --config.file=/etc/alertmanager/alertmanager.yml --storage.path=/alertmanager"]
