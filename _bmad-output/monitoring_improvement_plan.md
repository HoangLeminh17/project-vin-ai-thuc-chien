# Implementation Plan: Observability Upgrade for A20-App-046 (Railway Edition)

This plan outlines the steps to upgrade the monitoring infrastructure of the Synapsy project (`A20-App-046`) by adopting advanced patterns from the Observability Labs (02 & 03), optimized for **Railway** deployment.

## Current State vs. Target State

| Feature | Current State | Target State | Railway Strategy |
|---------|---------------|--------------|------------------|
| **Metrics** | Prometheus (Basic Scrape) | Prometheus + Rules | Add `/rules` folder + `sed` config |
| **Alerting** | None | Alertmanager → Discord | New Service: `alertmanager` |
| **Logging** | Console logs | Centralized (Loki) | New Service: `loki` |
| **Tracing** | None | Distributed (Jaeger) | New Service: `jaeger` |
| **Collector** | None | OTel Collector | New Service: `otel-collector` |
| **Dashboards**| Manual/Basic | Provisioned-as-code | Shared `/grafana` provisioning |

---

## Phase 1: Infrastructure Setup (COMPLETED)

### 1.1 Alertmanager Setup
- **Files created**: `monitoring/alertmanager/alertmanager.yml`, `monitoring/alertmanager/Dockerfile`.
- **Strategy**: Uses `sed` to inject `${DISCORD_WEBHOOK_URL}` at runtime.

### 1.2 OTel Collector Setup
- **Files created**: `monitoring/otel-collector/config.yml`, `monitoring/otel-collector/Dockerfile`.
- **Strategy**: Configured to export traces to Jaeger and logs to Loki via Railway internal domains.

### 1.3 Prometheus Enrichment
- **Files created**: `monitoring/prometheus/rules/slo-burn-rate.yml`, `monitoring/prometheus/rules/ai-quality.yml`.
- **Config updated**: `prometheus.yml` now links to Alertmanager and loads rules.
- **Dockerfile updated**: Now copies the `rules/` directory.

### 1.4 Grafana Provisioning
- **Files created**: `monitoring/grafana/provisioning/datasources/loki.yml`, `monitoring/grafana/provisioning/datasources/jaeger.yml`.

---

## Phase 2: Service Instrumentation (COMPLETED)

### 2.1 UKT Service (Python)
- **Changes**: Added OTel dependencies to `requirements.txt` and instrumented `app/main.py`.
- **Exporter**: Sends data to `http://otel-collector.railway.internal:4317`.

### 2.2 Web App (Next.js)
- **Changes**: Added OTel dependencies, enabled `instrumentationHook` in `next.config.ts`, and created `instrumentation.ts` / `instrumentation.node.ts`.
- **Exporter**: Sends data to `http://otel-collector.railway.internal:4317`.

---

## Phase 3: Railway Deployment (Next Steps for User)

For each new component, create a **New Service** on Railway and set the **Root Directory**:

1. **Alertmanager**: `monitoring/alertmanager` (Add `DISCORD_WEBHOOK_URL` variable).
2. **OTel Collector**: `monitoring/otel-collector`.
3. **Loki & Jaeger**: Use Railway Templates or deploy official images. Ensure service names are `loki` and `jaeger`.
4. **Prometheus & Grafana**: Redeploy to pick up new configurations.

---

## Phase 4: Validation

### 4.1 Load Testing
- [ ] Create `monitoring/load-test/locustfile.py`.
- [ ] Run load tests to verify metrics and trace generation.

### 4.2 Alert Verification
- [ ] Simulate a service down condition (e.g., stop `ukt-service`).
- [ ] Verify Discord notification from Alertmanager.
