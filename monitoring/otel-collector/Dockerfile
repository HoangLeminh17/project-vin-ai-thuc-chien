FROM otel/opentelemetry-collector-contrib:0.113.0

COPY config.yml /etc/otelcol-contrib/config.yaml

# Expose OTLP ports
EXPOSE 4317 4318 8889

ENTRYPOINT ["/otelcol-contrib"]
CMD ["--config=/etc/otelcol-contrib/config.yaml"]
