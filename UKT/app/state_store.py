"""
State Store — lưu knowledge state per student.
- Production: Redis
- Development / không có Redis: in-memory dict
"""

import os
import json
import logging

logger = logging.getLogger(__name__)


class StateStore:
    def __init__(self):
        self._redis = None
        self._mem: dict = {}
        redis_url = os.getenv("REDIS_URL", "")

        if redis_url:
            # Tự động sửa nếu thiếu prefix (phổ biến khi config nhầm)
            if not any(redis_url.startswith(s) for s in ["redis://", "rediss://", "unix://"]):
                logger.info("REDIS_URL thiếu prefix, tự động thêm redis://")
                redis_url = f"redis://{redis_url}"
                
            try:
                import redis
                self._redis = redis.from_url(redis_url, decode_responses=True)
                self._redis.ping()
                logger.info(f"Kết nối Redis thành công tại {redis_url.split('@')[-1]}")
            except Exception as e:
                logger.warning(f"Không kết nối được Redis ({e}) → dùng in-memory store")
                self._redis = None
        else:
            logger.info("REDIS_URL chưa set → dùng in-memory store")

    def get(self, student_id: str) -> dict | None:
        key = f"ukt:state:{student_id}"
        if self._redis:
            raw = self._redis.get(key)
            return json.loads(raw) if raw else None
        return self._mem.get(key)

    def set(self, student_id: str, state: dict, ttl_seconds: int = 86400):
        """Lưu state, mặc định TTL 24h."""
        key = f"ukt:state:{student_id}"
        if self._redis:
            self._redis.setex(key, ttl_seconds, json.dumps(state))
        else:
            self._mem[key] = state

    def delete(self, student_id: str):
        key = f"ukt:state:{student_id}"
        if self._redis:
            self._redis.delete(key)
        else:
            self._mem.pop(key, None)
