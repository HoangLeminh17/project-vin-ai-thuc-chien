"""
State Store — lưu knowledge state per student.
- Production: Redis
- Development / không có Redis: in-memory dict
"""

import os
import json
import logging
import threading
from typing import Callable, TypeVar

logger = logging.getLogger(__name__)
DEFAULT_STATE_TTL_SECONDS = 90 * 86400
T = TypeVar("T")


class StateStore:
    def __init__(self):
        self._redis = None
        self._redis_watch_error: type[Exception] | None = None
        self.persistence_backend = "memory"
        self.degraded = False
        self.degradation_reason: str | None = None
        self._mem: dict = {}
        self._mem_lock = threading.RLock()
        self._student_locks: dict[str, threading.RLock] = {}
        redis_url = os.getenv("REDIS_URL", "")

        if redis_url:
            # Tự động sửa nếu thiếu prefix (phổ biến khi config nhầm)
            if not any(redis_url.startswith(s) for s in ["redis://", "rediss://", "unix://"]):
                logger.info("REDIS_URL thiếu prefix, tự động thêm redis://")
                redis_url = f"redis://{redis_url}"
                
            try:
                import redis
                self._redis = redis.from_url(redis_url, decode_responses=True)
                self._redis_watch_error = redis.WatchError
                self._redis.ping()
                self.persistence_backend = "redis"
                logger.info(f"Kết nối Redis thành công tại {redis_url.split('@')[-1]}")
            except Exception as e:
                logger.warning(f"Không kết nối được Redis ({e}) → dùng in-memory store")
                self._redis = None
                self.persistence_backend = "memory"
                self.degraded = True
                self.degradation_reason = "redis_unavailable"
        else:
            logger.info("REDIS_URL chưa set → dùng in-memory store")

    def _key(self, student_id: str) -> str:
        return f"ukt:state:{student_id}"

    def _lock_for(self, key: str) -> threading.RLock:
        with self._mem_lock:
            lock = self._student_locks.get(key)
            if lock is None:
                lock = threading.RLock()
                self._student_locks[key] = lock
            return lock

    def get(self, student_id: str) -> dict | None:
        key = self._key(student_id)
        if self._redis:
            raw = self._redis.get(key)
            return json.loads(raw) if raw else None
        with self._mem_lock:
            return self._mem.get(key)

    def get_many(self, student_ids: list[str]) -> dict[str, dict]:
        """Fetch multiple states efficiently (uses Redis pipeline when available)."""
        if not student_ids:
            return {}

        keys = [self._key(student_id) for student_id in student_ids]

        if self._redis:
            pipe = self._redis.pipeline(transaction=False)
            for k in keys:
                pipe.get(k)
            raws = pipe.execute()
            out: dict[str, dict] = {}
            for student_id, raw in zip(student_ids, raws):
                if raw:
                    try:
                        out[student_id] = json.loads(raw)
                    except Exception:
                        # Corrupt payload shouldn't crash the whole batch.
                        continue
            return out

        with self._mem_lock:
            return {student_id: self._mem.get(self._key(student_id)) for student_id in student_ids if self._mem.get(self._key(student_id)) is not None}

    def _jsonable_state(self, state: dict) -> dict:
        normalized = {}
        for kc_id, value in state.items():
            if hasattr(value, "model_dump"):
                normalized[kc_id] = value.model_dump()
            elif hasattr(value, "dict"):
                normalized[kc_id] = value.dict()
            elif isinstance(value, dict):
                normalized[kc_id] = value
            else:
                normalized[kc_id] = dict(value)
        return normalized

    def set(self, student_id: str, state: dict, ttl_seconds: int = DEFAULT_STATE_TTL_SECONDS):
        """Lưu state, mặc định TTL 90 ngày."""
        key = self._key(student_id)
        normalized = self._jsonable_state(state)
        if self._redis:
            self._redis.setex(key, ttl_seconds, json.dumps(normalized))
        else:
            with self._lock_for(key):
                self._mem[key] = normalized

    def update(
        self,
        student_id: str,
        updater: Callable[[dict | None], tuple[dict, T]],
        ttl_seconds: int = DEFAULT_STATE_TTL_SECONDS,
    ) -> T:
        """Atomically read, transform, and persist one student's state."""
        key = self._key(student_id)

        if self._redis:
            while True:
                with self._redis.pipeline() as pipe:
                    try:
                        pipe.watch(key)
                        raw = pipe.get(key)
                        current = json.loads(raw) if raw else None
                        new_state, result = updater(current)
                        normalized = self._jsonable_state(new_state)

                        pipe.multi()
                        pipe.setex(key, ttl_seconds, json.dumps(normalized))
                        pipe.execute()
                        return result
                    except Exception as e:
                        if self._redis_watch_error and isinstance(e, self._redis_watch_error):
                            logger.info("Retrying concurrent UKT state update", extra={"student_id": student_id})
                            continue
                        raise

        with self._lock_for(key):
            current = self._mem.get(key)
            new_state, result = updater(current)
            self._mem[key] = self._jsonable_state(new_state)
            return result

    def delete(self, student_id: str):
        key = self._key(student_id)
        if self._redis:
            self._redis.delete(key)
        else:
            with self._lock_for(key):
                self._mem.pop(key, None)
