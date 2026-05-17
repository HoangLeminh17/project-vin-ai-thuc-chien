import json
import logging
import os
import sys
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "time": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "service": os.getenv("SERVICE_NAME", "ukt-service"),
            "logger": record.name,
            "msg": record.getMessage(),
        }

        # Attach any structured fields passed via logger.<level>(..., extra={...}).
        for k, v in record.__dict__.items():
            if k.startswith("_"):
                continue
            if k in ("name", "msg", "args", "levelname", "levelno", "pathname", "filename", "module", "exc_info",
                     "exc_text", "stack_info", "lineno", "funcName", "created", "msecs", "relativeCreated",
                     "thread", "threadName", "processName", "process"):
                continue
            if k not in payload:
                payload[k] = v

        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=True)


def configure_logging() -> None:
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_format = os.getenv("LOG_FORMAT", "json").lower()

    root = logging.getLogger()
    root.setLevel(getattr(logging, log_level, logging.INFO))

    # Replace default handlers so we don't double-log.
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    if log_format == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    root.addHandler(handler)
