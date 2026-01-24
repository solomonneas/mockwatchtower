"""VM API routes for Proxmox VMs and containers."""

from fastapi import APIRouter
from pydantic import BaseModel

from ..cache import redis_cache
from ..polling.scheduler import CACHE_PROXMOX_VMS

router = APIRouter()


class ProxmoxVMResponse(BaseModel):
    """VM/container data for API response"""
    vmid: int
    name: str
    node: str
    instance: str
    type: str  # "qemu" or "lxc"
    status: str
    cpu: float
    memory: float
    cpus: int | None = None
    maxmem: int | None = None
    uptime: int | None = None
    netin: int | None = None
    netout: int | None = None


class VMSummary(BaseModel):
    """Summary statistics for VMs"""
    total_running: int
    total_qemu: int
    total_lxc: int
    total_cpus: int
    total_memory_gb: float


class VMListResponse(BaseModel):
    """Response for VM list endpoint"""
    vms: list[ProxmoxVMResponse]
    summary: VMSummary


@router.get("/vms", response_model=VMListResponse)
async def list_vms():
    """
    List all running VMs and containers from Proxmox.

    Returns VMs sorted by name with summary statistics.
    """
    cached = await redis_cache.get_json(CACHE_PROXMOX_VMS) or []

    vms = [ProxmoxVMResponse(**vm) for vm in cached]
    vms.sort(key=lambda v: v.name.lower())

    # Calculate summary stats
    total_cpus = sum(vm.cpus or 0 for vm in vms)
    total_memory_bytes = sum(vm.maxmem or 0 for vm in vms)
    total_memory_gb = round(total_memory_bytes / (1024 ** 3), 1)

    summary = VMSummary(
        total_running=len(vms),
        total_qemu=sum(1 for vm in vms if vm.type == "qemu"),
        total_lxc=sum(1 for vm in vms if vm.type == "lxc"),
        total_cpus=total_cpus,
        total_memory_gb=total_memory_gb,
    )

    return VMListResponse(vms=vms, summary=summary)


@router.get("/vms/summary", response_model=VMSummary)
async def get_vm_summary():
    """Get summary statistics for running VMs."""
    cached = await redis_cache.get_json(CACHE_PROXMOX_VMS) or []

    vms = [ProxmoxVMResponse(**vm) for vm in cached]

    total_cpus = sum(vm.cpus or 0 for vm in vms)
    total_memory_bytes = sum(vm.maxmem or 0 for vm in vms)
    total_memory_gb = round(total_memory_bytes / (1024 ** 3), 1)

    return VMSummary(
        total_running=len(vms),
        total_qemu=sum(1 for vm in vms if vm.type == "qemu"),
        total_lxc=sum(1 for vm in vms if vm.type == "lxc"),
        total_cpus=total_cpus,
        total_memory_gb=total_memory_gb,
    )
