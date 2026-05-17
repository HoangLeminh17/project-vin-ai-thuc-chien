import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError


DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "").strip()
DISCORD_USERNAME = os.getenv("DISCORD_USERNAME", "Alertmanager")
DISCORD_AVATAR_URL = os.getenv("DISCORD_AVATAR_URL", "").strip() or None
DEFAULT_MAX_ALERTS = 10
DEFAULT_DISCORD_TIMEOUT_SECONDS = 5.0
MAX_ALERTS = 100
MAX_TIMEOUT_SECONDS = 30.0


def _parse_int_env(name: str, default: int, min_value: int, max_value: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return max(min_value, min(max_value, value))


def _parse_float_env(name: str, default: float, min_value: float, max_value: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = float(raw)
    except ValueError:
        return default
    return max(min_value, min(max_value, value))


CONFIG_MAX_ALERTS = _parse_int_env("MAX_ALERTS", DEFAULT_MAX_ALERTS, 1, MAX_ALERTS)
CONFIG_DISCORD_TIMEOUT_SECONDS = _parse_float_env(
    "DISCORD_TIMEOUT_SECONDS",
    DEFAULT_DISCORD_TIMEOUT_SECONDS,
    0.5,
    MAX_TIMEOUT_SECONDS,
)


class AlertPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    labels: Dict[str, Any] = Field(default_factory=dict)
    annotations: Dict[str, Any] = Field(default_factory=dict)


class AlertmanagerPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    status: str = Field(default="unknown", max_length=64)
    alerts: List[AlertPayload] = Field(default_factory=list, max_length=1000)
    commonLabels: Dict[str, Any] = Field(default_factory=dict)
    commonAnnotations: Dict[str, Any] = Field(default_factory=dict)
    externalURL: str = Field(default="", max_length=2048)


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


def _summarize_alert(alert: AlertPayload) -> str:
    labels = alert.labels or {}
    annotations = alert.annotations or {}

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


def _build_payload(am: AlertmanagerPayload) -> Dict[str, Any]:
    status = (am.status or "").lower() or "unknown"
    alerts = am.alerts or []
    common_labels = am.commonLabels or {}
    common_annotations = am.commonAnnotations or {}
    external_url = am.externalURL or ""

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
    lines = [_summarize_alert(a) for a in alerts[:CONFIG_MAX_ALERTS]]
    if len(alerts) > CONFIG_MAX_ALERTS:
        lines.append(f"…and {len(alerts) - CONFIG_MAX_ALERTS} more")
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

    try:
        body = await request.json()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON body") from None

    try:
        am = AlertmanagerPayload.model_validate(body)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.errors()) from None

    payload = _build_payload(am)

    async with httpx.AsyncClient(timeout=CONFIG_DISCORD_TIMEOUT_SECONDS) as client:
        resp = await client.post(DISCORD_WEBHOOK_URL, json=payload)

        # Discord's webhook validation sometimes rejects embeds with a vague
        # {"embeds":["0"]} error. If that happens, fall back to a plain-text
        # message so alert delivery still works.
        if resp.status_code == 400 and payload.get("embeds"):
            fallback = {
                "username": payload.get("username") or DISCORD_USERNAME,
                "content": payload.get("content") or "Alertmanager notification",
            }
            resp = await client.post(DISCORD_WEBHOOK_URL, json=fallback)

    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Discord webhook error: {resp.status_code}: {resp.text}")
    # Optionally log the response for debugging:
    # print(f"Discord response: {resp.status_code}: {resp.text}")

    return {"status": "sent"}
