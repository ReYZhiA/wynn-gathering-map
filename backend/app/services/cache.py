from dataclasses import dataclass
from time import monotonic
from typing import Generic, TypeVar

T = TypeVar("T")


@dataclass
class CacheEntry(Generic[T]):
    value: T
    expires_at: float


class TtlCache(Generic[T]):
    def __init__(self, ttl_seconds: int) -> None:
        self.ttl_seconds = ttl_seconds
        self._entry: CacheEntry[T] | None = None

    def get(self) -> T | None:
        if self._entry is None:
            return None
        if self._entry.expires_at <= monotonic():
            return None
        return self._entry.value

    def get_stale(self) -> T | None:
        if self._entry is None:
            return None
        return self._entry.value

    def set(self, value: T) -> None:
        self._entry = CacheEntry(value=value, expires_at=monotonic() + self.ttl_seconds)

    def clear(self) -> None:
        self._entry = None


class KeyedTtlCache(Generic[T]):
    def __init__(self, ttl_seconds: int) -> None:
        self.ttl_seconds = ttl_seconds
        self._entries: dict[str, CacheEntry[T]] = {}

    def get(self, key: str) -> T | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        if entry.expires_at <= monotonic():
            self._entries.pop(key, None)
            return None
        return entry.value

    def set(self, key: str, value: T) -> None:
        self._entries[key] = CacheEntry(value=value, expires_at=monotonic() + self.ttl_seconds)

    def clear(self) -> None:
        self._entries.clear()
