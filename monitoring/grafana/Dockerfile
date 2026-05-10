FROM grafana/grafana:latest

# Switch to root to fix permission issues on Railway
USER root

# Fix permissions for grafana directories
RUN mkdir -p /var/lib/grafana /var/log/grafana /var/lib/grafana/plugins && \
    chmod -R 777 /var/lib/grafana /var/log/grafana /etc/grafana

# Copy provisioning configs (datasource + dashboard tự động load)
COPY provisioning/ /etc/grafana/provisioning/

# Switch back to grafana user
USER grafana

EXPOSE 3000
