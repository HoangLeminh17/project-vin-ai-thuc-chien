FROM prom/alertmanager:latest

COPY alertmanager.yml /etc/alertmanager/alertmanager.yml

# Use root to allow sed modification
USER root

# Start Alertmanager with env var substitution for the webhook URL
ENTRYPOINT ["/bin/sh", "-c", "sed -i 's|\\${DISCORD_WEBHOOK_URL}|'\"$DISCORD_WEBHOOK_URL\"'|g' /etc/alertmanager/alertmanager.yml && /bin/alertmanager --config.file=/etc/alertmanager/alertmanager.yml --storage.path=/alertmanager"]
