FROM prom/alertmanager:latest

COPY alertmanager.yml /etc/alertmanager/alertmanager.yml

# Use root to allow sed modification
USER root

# Start Alertmanager with env var substitution for the bridge URL.
# Optional debug: set PRINT_EFFECTIVE_CONFIG=true to print final YAML.
ENTRYPOINT ["/bin/sh", "-c", "set -eu; BRIDGE_URL=${DISCORD_BRIDGE_URL:-http://discord-bridge.railway.internal:8080/alertmanager}; case \"$BRIDGE_URL\" in http://*|https://*) ;; *) BRIDGE_URL=\"http://$BRIDGE_URL\" ;; esac; sed -i \"s|\\${DISCORD_BRIDGE_URL}|$BRIDGE_URL|g\" /etc/alertmanager/alertmanager.yml; if [ \"${PRINT_EFFECTIVE_CONFIG:-false}\" = \"true\" ]; then echo '===== /etc/alertmanager/alertmanager.yml (effective) ====='; cat /etc/alertmanager/alertmanager.yml; echo '========================================================='; fi; /bin/alertmanager --config.file=/etc/alertmanager/alertmanager.yml --storage.path=/alertmanager"]
