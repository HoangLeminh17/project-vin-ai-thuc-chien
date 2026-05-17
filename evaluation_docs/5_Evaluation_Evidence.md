# Evaluation Evidence

## Nhóm thư mục
- `system`: dashboard system performance + CSV export
- `ai`: dashboard AI observability + CSV export
- `product`: dashboard product & trust + CSV export

Nguồn:
- Grafana: `evaluation_docs/system/system_performance.png`
- Grafana: `evaluation_docs/ai/ai_observability.png`
- Grafana: `evaluation_docs/product/product_trust.png`
- Time range: `Last 24h`

## System
- API Request Rate
  - Query: `sum by (route, method) (rate(synapsy_api_requests_total[5m]))`
  - Kết quả: ...
- API Latency p95
  - Query: `histogram_quantile(0.95, sum by (le, route, method) (rate(synapsy_api_request_duration_ms_bucket[5m])))`
  - Kết quả: ...

## AI
- AI Token Usage
  - Query: `sum by (provider) (rate(synapsy_metrics_value_sum{metric_name="total_tokens"}[5m]))`
  - Kết quả: ...
- AI Error Rates
  - Query: `sum by (event_name, provider) (rate(synapsy_events_total{status="error"}[5m]))`
  - Kết quả: ...

## Product
- Citation Click Rate
  - Query: `sum(increase(synapsy_events_total{event_name="citation_click"}[24h]))`
  - Kết quả: ...
- Hallucination Reports
  - Query: `sum(increase(synapsy_events_total{event_name="hallucination_report"}[24h]))`
  - Kết quả: ...
- Course Completions
  - Query: `sum(increase(synapsy_events_total{event_name="course_complete"}[24h]))`
  - Kết quả: ...

## Evidence
- Screenshot 1: `evaluation_docs/system/system_performance.png`
- Screenshot 2: `evaluation_docs/ai/ai_observability.png`
- Screenshot 3: `evaluation_docs/product/product_trust.png`
- CSV export: nằm trong 3 thư mục `system`, `ai`, `product`
