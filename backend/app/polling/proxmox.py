"""
Proxmox API Client

Polls node stats, VMs, and containers from Proxmox VE.
API docs: https://pve.proxmox.com/pve-docs/api-viewer/
"""

from __future__ import annotations

import httpx
from typing import Any
from pydantic import BaseModel

from app.config import get_settings


class ProxmoxNode(BaseModel):
    """Node data from Proxmox API"""
    node: str  # Node name (e.g., "pve1")
    status: str  # online, offline
    cpu: float | None = None  # CPU usage 0-1
    maxcpu: int | None = None  # CPU cores
    mem: int | None = None  # Memory used (bytes)
    maxmem: int | None = None  # Total memory (bytes)
    uptime: int | None = None  # Seconds

    @property
    def cpu_percent(self) -> float:
        """CPU usage as percentage"""
        return round((self.cpu or 0) * 100, 2)

    @property
    def memory_percent(self) -> float:
        """Memory usage as percentage"""
        if not self.maxmem or self.maxmem == 0:
            return 0.0
        return round((self.mem or 0) / self.maxmem * 100, 2)


class ProxmoxVM(BaseModel):
    """VM or container data from Proxmox API"""
    vmid: int
    name: str
    node: str  # Which node it runs on
    type: str  # "qemu" or "lxc"
    status: str  # running, stopped, paused
    cpu: float | None = None  # CPU usage 0-1
    cpus: int | None = None  # Allocated vCPUs
    mem: int | None = None  # Memory used (bytes)
    maxmem: int | None = None  # Allocated memory (bytes)
    uptime: int | None = None
    netin: int | None = None  # Network in (bytes)
    netout: int | None = None  # Network out (bytes)

    @property
    def cpu_percent(self) -> float:
        """CPU usage as percentage of allocated vCPUs"""
        return round((self.cpu or 0) * 100, 2)

    @property
    def memory_percent(self) -> float:
        """Memory usage as percentage"""
        if not self.maxmem or self.maxmem == 0:
            return 0.0
        return round((self.mem or 0) / self.maxmem * 100, 2)


class ProxmoxClient:
    """
    Async client for Proxmox VE API

    Uses API token authentication (preferred over user/password).

    Usage:
        async with ProxmoxClient() as client:
            nodes = await client.get_nodes()
            vms = await client.get_vms()
    """

    def __init__(
        self,
        base_url: str | None = None,
        token_id: str | None = None,
        token_secret: str | None = None,
        verify_ssl: bool | None = None,
    ):
        settings = get_settings()
        self.base_url = (base_url or settings.proxmox_url).rstrip('/')
        self.token_id = token_id or settings.proxmox_token_id
        self.token_secret = token_secret or settings.proxmox_token_secret
        self.verify_ssl = verify_ssl if verify_ssl is not None else settings.proxmox_verify_ssl
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> "ProxmoxClient":
        # Proxmox API token format: PVEAPIToken=user@realm!tokenid=secret
        auth_header = f"PVEAPIToken={self.token_id}={self.token_secret}"

        self._client = httpx.AsyncClient(
            base_url=f"{self.base_url}/api2/json",
            headers={"Authorization": auth_header},
            timeout=30.0,
            verify=self.verify_ssl,
        )
        return self

    async def __aexit__(self, *args) -> None:
        if self._client:
            await self._client.aclose()

    async def _get(self, endpoint: str, params: dict | None = None) -> dict[str, Any]:
        """Make GET request to Proxmox API"""
        if not self._client:
            raise RuntimeError("Client not initialized. Use 'async with' context manager.")

        response = await self._client.get(endpoint, params=params)
        response.raise_for_status()
        return response.json()

    # ─────────────────────────────────────────────────────────────
    # Node endpoints
    # ─────────────────────────────────────────────────────────────

    async def get_nodes(self) -> list[ProxmoxNode]:
        """Get all cluster nodes with stats"""
        data = await self._get("/nodes")
        return [ProxmoxNode(**n) for n in data.get("data", [])]

    async def get_node(self, node: str) -> ProxmoxNode | None:
        """Get single node status"""
        try:
            data = await self._get(f"/nodes/{node}/status")
            node_data = data.get("data", {})
            node_data["node"] = node
            node_data["status"] = "online"
            return ProxmoxNode(**node_data)
        except httpx.HTTPStatusError:
            return None

    # ─────────────────────────────────────────────────────────────
    # VM/Container endpoints
    # ─────────────────────────────────────────────────────────────

    async def get_vms(self, running_only: bool = False) -> list[ProxmoxVM]:
        """
        Get all VMs and containers across all nodes.

        Args:
            running_only: If True, only return running VMs/containers
        """
        nodes = await self.get_nodes()
        all_vms: list[ProxmoxVM] = []

        for node in nodes:
            if node.status != "online":
                continue

            # Get QEMU VMs
            try:
                qemu_data = await self._get(f"/nodes/{node.node}/qemu")
                for vm in qemu_data.get("data", []):
                    vm["node"] = node.node
                    vm["type"] = "qemu"
                    all_vms.append(ProxmoxVM(**vm))
            except httpx.HTTPStatusError:
                pass

            # Get LXC containers
            try:
                lxc_data = await self._get(f"/nodes/{node.node}/lxc")
                for ct in lxc_data.get("data", []):
                    ct["node"] = node.node
                    ct["type"] = "lxc"
                    all_vms.append(ProxmoxVM(**ct))
            except httpx.HTTPStatusError:
                pass

        if running_only:
            all_vms = [vm for vm in all_vms if vm.status == "running"]

        return all_vms

    async def get_node_vms(self, node: str, running_only: bool = False) -> list[ProxmoxVM]:
        """Get VMs and containers for a specific node"""
        vms: list[ProxmoxVM] = []

        # QEMU VMs
        try:
            qemu_data = await self._get(f"/nodes/{node}/qemu")
            for vm in qemu_data.get("data", []):
                vm["node"] = node
                vm["type"] = "qemu"
                vms.append(ProxmoxVM(**vm))
        except httpx.HTTPStatusError:
            pass

        # LXC containers
        try:
            lxc_data = await self._get(f"/nodes/{node}/lxc")
            for ct in lxc_data.get("data", []):
                ct["node"] = node
                ct["type"] = "lxc"
                vms.append(ProxmoxVM(**ct))
        except httpx.HTTPStatusError:
            pass

        if running_only:
            vms = [vm for vm in vms if vm.status == "running"]

        return vms

    # ─────────────────────────────────────────────────────────────
    # Health check
    # ─────────────────────────────────────────────────────────────

    async def health_check(self) -> bool:
        """Test API connectivity"""
        try:
            await self._get("/version")
            return True
        except Exception:
            return False


# ─────────────────────────────────────────────────────────────────
# Convenience functions for one-off calls
# ─────────────────────────────────────────────────────────────────

async def fetch_all_nodes() -> list[ProxmoxNode]:
    """Fetch all nodes from Proxmox"""
    async with ProxmoxClient() as client:
        return await client.get_nodes()


async def fetch_all_vms(running_only: bool = False) -> list[ProxmoxVM]:
    """Fetch all VMs and containers from Proxmox"""
    async with ProxmoxClient() as client:
        return await client.get_vms(running_only=running_only)
