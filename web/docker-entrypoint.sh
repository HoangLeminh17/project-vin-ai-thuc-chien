#!/bin/sh
set -e

# Named/bind volumes may be owned by root on first start.
# Ensure the runtime user (uid 1001) can write to caches and MinerU outputs.
mkdir -p /app/.next /app/.mineru-output /app/.ai-log
chown -R 1001:1001 /app/.next /app/.mineru-output /app/.ai-log 2>/dev/null || true

exec su-exec 1001:1001 "$@"
