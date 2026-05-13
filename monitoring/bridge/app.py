import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException, Request


DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "").strip()
DISCORD_USERNAME = os.getenv("DISCORD_USERNAME", "Alertmanager")
DISCORD_AVATAR_URL = os.getenv("DISCORD_AVATAR_URL", "").strip() or None


app = FastAPI(title="Alertmanager Discord Bridge", version="1.0.0")


def _utc_now_iso() -> str:
    # Discord prefers RFC3339/ISO8601 timestamps without microseconds.
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _severity_color(sev: str) -> int:
    sev = (sev or "").lower()
    if sev in ("critical", "page", "p1"):
        return 0xE02F44  # red
    if sev in ("warning", "warn", "p2"):
        return 0xF2CC0C  # yellow
    if sev in ("info", "p3"):
        return 0x3274D9  # blue
    return 0x808080


def _summarize_alert(alert: Dict[str, Any]) -> str:
    labels = alert.get("labels") or {}
    annotations = alert.get("annotations") or {}

    name = labels.get("alertname", "(no alertname)")
    sev = labels.get("severity", "")
    service = labels.get("service", labels.get("job", ""))
    instance = labels.get("instance", "")
    summary = annotations.get("summary", "")
    desc = annotations.get("description", "")

    head_parts = [name]
    if sev:
        head_parts.append(f"sev={sev}")
    if service:
        head_parts.append(f"service={service}")
    if instance:
        head_parts.append(f"instance={instance}")

    head = " | ".join(head_parts)
    body = summary or desc
    if body:
        return f"**{head}**\n{body}"
    return f"**{head}**"


def _build_payload(am: Dict[str, Any]) -> Dict[str, Any]:
    status = (am.get("status") or "").lower() or "unknown"
    alerts: List[Dict[str, Any]] = am.get("alerts") or []
    common_labels = am.get("commonLabels") or {}
    common_annotations = am.get("commonAnnotations") or {}
    external_url = am.get("externalURL") or ""

    sev = common_labels.get("severity", "")
    title = common_annotations.get("title") or common_annotations.get("summary")
    if not title:
        title = "Alertmanager notification"

    color = _severity_color(sev)
    embed: Dict[str, Any] = {
        "title": f"{status.upper()}: {title}",
        "color": color,
        "timestamp": _utc_now_iso(),
        "fields": [],
    }
    if external_url:
        embed["url"] = external_url

    # Include up to N alerts to avoid Discord limits.
    max_alerts = int(os.getenv("MAX_ALERTS", "10"))
    lines = [_summarize_alert(a) for a in alerts[:max_alerts]]
    if len(alerts) > max_alerts:
        lines.append(f"…and {len(alerts) - max_alerts} more")
    embed["description"] = "\n\n".join(lines) if lines else "(no alerts)"

    # Compact context fields
    def add_field(name: str, value: Optional[str]) -> None:
        if not value:
            return
        embed["fields"].append({"name": name, "value": str(value)[:1024], "inline": True})

    add_field("severity", sev)
    add_field("service", common_labels.get("service") or common_labels.get("job"))
    add_field("env", common_labels.get("environment") or common_labels.get("env"))

    # Provide both `content` and `embeds` to maximize compatibility with
    # different Discord webhook settings and validation.
    payload: Dict[str, Any] = {
        "username": DISCORD_USERNAME,
        "content": f"{status.upper()}: {title}",
        "embeds": [embed],
    }
    if DISCORD_AVATAR_URL:
        payload["avatar_url"] = DISCORD_AVATAR_URL
    return payload


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "discord_configured": bool(DISCORD_WEBHOOK_URL),
    }


@app.post("/alertmanager")
async def alertmanager(request: Request) -> Dict[str, Any]:
    if not DISCORD_WEBHOOK_URL:
        raise HTTPException(status_code=500, detail="DISCORD_WEBHOOK_URL is not set")

    am = await request.json()
    payload = _build_payload(am)

    timeout_s = float(os.getenv("DISCORD_TIMEOUT_SECONDS", "5"))
    async with httpx.AsyncClient(timeout=timeout_s) as client:
        resp = await client.post(DISCORD_WEBHOOK_URL, json=payload)

    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Discord webhook error: {resp.status_code}: {resp.text}")
    # Optionally log the response for debugging:
    # print(f"Discord response: {resp.status_code}: {resp.text}")

    return {"status": "sent"}
