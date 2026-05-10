FROM prom/prometheus:latest

COPY prometheus.yml /etc/prometheus/prometheus.yml

# Expose Prometheus port
EXPOSE 9090

# Use root to allow sed modification
USER root

# Start Prometheus with env var substitution
ENTRYPOINT ["/bin/sh", "-c", "sed -i 's|\\${SCRAPER_TOKEN}|'\"$SCRAPER_TOKEN\"'|g' /etc/prometheus/prometheus.yml && sed -i 's|\\${WEB_TARGET}|'\"${WEB_TARGET:-web.railway.internal:3000}\"'|g' /etc/prometheus/prometheus.yml && sed -i 's|\\${UKT_TARGET}|'\"${UKT_TARGET:-ukt-service.railway.internal:8000}\"'|g' /etc/prometheus/prometheus.yml && /bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/prometheus --web.console.libraries=/usr/share/prometheus/console_libraries --web.console.templates=/usr/share/prometheus/consoles --web.enable-lifecycle"]
