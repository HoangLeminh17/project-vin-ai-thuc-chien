FROM python:3.11-slim

WORKDIR /app

# Cài đặt build dependencies nếu cần
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

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
