FROM prom/prometheus:latest

COPY prometheus.yml /etc/prometheus/prometheus.yml
COPY rules/ /etc/prometheus/rules/

# Expose Prometheus port
EXPOSE 9090

# Use root to allow sed modification
USER root

# Start Prometheus with env var substitution
ENTRYPOINT ["/bin/sh", "-c", "sed 's|\\${SCRAPER_TOKEN}|'\"$SCRAPER_TOKEN\"'|g' /etc/prometheus/prometheus.yml | sed 's|\\${WEB_TARGET}|'\"${WEB_TARGET:-web:3000}\"'|g' | sed 's|\\${UKT_TARGET}|'\"${UKT_TARGET:-ukt-service:8000}\"'|g' > /tmp/prometheus.yml && /bin/prometheus --config.file=/tmp/prometheus.yml --storage.tsdb.path=/prometheus --web.console.libraries=/usr/share/prometheus/console_libraries --web.console.templates=/usr/share/prometheus/consoles --web.enable-lifecycle"]
