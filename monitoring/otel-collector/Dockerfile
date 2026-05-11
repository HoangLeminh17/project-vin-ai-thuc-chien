FROM otel/opentelemetry-collector-contrib:latest

COPY config.yml /etc/otelcol-contrib/config.yaml

# Expose OTLP ports
EXPOSE 4317 4318 8889

ENTRYPOINT ["/otelcol-contrib"]
CMD ["--config=/etc/otelcol-contrib/config.yaml"]
