import os
import httpx
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

async def send_discord_alert(message: str, title: str = "UKT Service Alert", color: int = 16753920):
    """
    Gửi thông báo tới Discord Webhook.
    """
    if not DISCORD_WEBHOOK_URL:
        logger.warning("[Discord] No webhook URL configured, skipping alert.")
        return

    payload = {
        "content": f"🤖 **UKT Service:** {message}",
        "embeds": [
            {
                "title": title,
                "color": color,
                "timestamp": datetime.utcnow().isoformat()
            }
        ]
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(DISCORD_WEBHOOK_URL, json=payload)
            if response.status_code >= 400:
                logger.error(f"[Discord] Failed to send alert: {response.status_code}")
    except Exception as e:
        logger.error(f"[Discord] Error sending alert: {e}")

async def notify_model_loaded():
    await send_discord_alert("✅ UKT Model has been successfully loaded and is ready.", "Model Loaded", color=3066993)

async def notify_error(error_msg: str):
    await send_discord_alert(f"💥 Error: {error_msg}", "Critical Error", color=15158332)
