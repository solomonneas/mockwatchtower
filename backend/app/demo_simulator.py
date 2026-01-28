"""
Demo WebSocket simulator for DEMO_MODE.

Periodically broadcasts fake updates to simulate a live network environment.
"""

import asyncio
import random
from datetime import datetime

from .websocket import ws_manager
from .demo_data import get_demo_speedtest, DEMO_DEVICES


async def demo_simulator():
    """
    Background task that simulates network activity by broadcasting fake updates.

    Runs indefinitely, broadcasting:
    - Device status changes every 30-90 seconds
    - Speedtest results every 5 minutes
    - Occasional fake alerts
    """
    speedtest_counter = 0

    while True:
        # Wait a random interval (30-90 seconds)
        await asyncio.sleep(random.randint(30, 90))

        speedtest_counter += 1

        # Occasionally broadcast a fake device status change (10% chance)
        if random.random() < 0.10:
            await _broadcast_status_change()

        # Broadcast speedtest every ~5 minutes (about 4-6 intervals)
        if speedtest_counter >= 5:
            speedtest_counter = 0
            await _broadcast_speedtest()


async def _broadcast_status_change():
    """Broadcast a fake device status change."""
    # Pick a random device (excluding core infrastructure)
    non_critical = [d for d in DEMO_DEVICES if not d["id"].startswith(("core-", "fw-"))]
    device = random.choice(non_critical)

    # Toggle between degraded and up (never down in demo for realism)
    old_status = "up"
    new_status = random.choice(["up", "degraded"])

    if old_status == new_status:
        return  # Skip if no change

    await ws_manager.broadcast({
        "type": "device_status_change",
        "changes": [{
            "device_id": device["id"],
            "hostname": device["name"],
            "old_status": old_status,
            "new_status": new_status,
        }],
    })


async def _broadcast_speedtest():
    """Broadcast a fake speedtest result."""
    result = get_demo_speedtest()

    await ws_manager.broadcast({
        "type": "speedtest_result",
        "timestamp": datetime.utcnow().isoformat(),
        "result": result,
    })


async def initialize_demo_cache():
    """
    Initialize Redis cache with demo data on startup.

    This pre-populates the cache so endpoints that read from cache
    have data available immediately.
    """
    from .cache import redis_cache
    from .polling.scheduler import (
        CACHE_DEVICES, CACHE_PROXMOX, CACHE_PROXMOX_VMS, CACHE_ALERTS,
    )
    from .polling.speedtest import CACHE_SPEEDTEST
    from .demo_data import (
        get_demo_topology, get_demo_vms,
        get_demo_alerts, get_demo_speedtest, get_demo_proxmox_nodes,
    )

    # Cache device data (from topology)
    topology = get_demo_topology()
    devices_data = [
        {
            "device_id": d.id,
            "hostname": d.display_name,
            "ip": d.ip,
            "status": d.status.value,
            "uptime": d.stats.uptime,
            "location": d.location,
        }
        for d in topology.devices.values()
    ]
    await redis_cache.set(CACHE_DEVICES, devices_data)

    # Cache Proxmox data
    await redis_cache.set(CACHE_PROXMOX, get_demo_proxmox_nodes())
    await redis_cache.set(CACHE_PROXMOX_VMS, get_demo_vms())

    # Cache alerts
    await redis_cache.set(CACHE_ALERTS, get_demo_alerts())

    # Cache speedtest
    await redis_cache.set(CACHE_SPEEDTEST, get_demo_speedtest())

    print("[DEMO] Initialized cache with demo data")
