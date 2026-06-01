from time import sleep

from app.services.cache import TtlCache


def test_cache_returns_value_until_expired() -> None:
    cache: TtlCache[str] = TtlCache(ttl_seconds=1)

    cache.set("nodes")

    assert cache.get() == "nodes"


def test_cache_keeps_stale_value_after_expiry() -> None:
    cache: TtlCache[str] = TtlCache(ttl_seconds=0)

    cache.set("nodes")
    sleep(0.001)

    assert cache.get() is None
    assert cache.get_stale() == "nodes"
