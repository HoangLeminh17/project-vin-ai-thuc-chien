FROM python:3.11-slim

WORKDIR /app

# requirements.txt uses prebuilt wheels (no native compilation expected),
# so we avoid installing build-essential to keep the image smaller.

COPY requirements.txt .
RUN python -m pip install --no-cache-dir --upgrade pip
RUN pip install --retries 5 --default-timeout=1000 --no-cache-dir -r requirements.txt

COPY app/       ./app/
COPY model/     ./model/

# Đảm bảo PYTHONPATH bao gồm root để nhận diện app/ và model/
ENV PYTHONPATH=/app

# Allow Railway to handle port mapping dynamically via $PORT

# Railway handles its own health checks via the healthcheckPath in railway.toml.
# Using a hardcoded port in a Docker HEALTHCHECK causes 'unhealthy' status
# because Railway injects a dynamic $PORT.
COPY run.py ./run.py
CMD ["python", "run.py"]
