"""Tests for in-memory cache."""

import sys
import time

sys.path.insert(0, ".")

from app.cache import cache_get, cache_set, cache_key, cache_clear, cache_stats, cached


def test_basic_set_get():
    cache_set("test:basic", {"data": "hello"}, ttl=10)
    assert cache_get("test:basic") == {"data": "hello"}


def test_cache_miss():
    assert cache_get("nonexistent_key_xyz") is None


def test_ttl_expiry():
    cache_set("test:expire", "temp", ttl=1)
    assert cache_get("test:expire") == "temp"
    time.sleep(1.1)
    assert cache_get("test:expire") is None


def test_key_determinism():
    k1 = cache_key("prefix", "arg1")
    k2 = cache_key("prefix", "arg1")
    k3 = cache_key("prefix", "arg2")
    assert k1 == k2
    assert k1 != k3


def test_decorator():
    call_count = 0

    @cached("test_dec", ttl=60)
    def add(x, y):
        nonlocal call_count
        call_count += 1
        return x + y

    assert add(3, 4) == 7
    assert add(3, 4) == 7
    assert call_count == 1


def test_clear():
    cache_set("test:clear1", "a")
    cache_set("test:clear2", "b")
    count = cache_clear()
    assert count >= 2
    assert cache_stats()["total_entries"] == 0
