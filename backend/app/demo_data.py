"""
Demo data generator for DEMO_MODE.

Self-contained fake data that does NOT depend on topology.yaml or any external APIs.
All data is deterministic for consistent UI testing.
"""

from datetime import datetime, timedelta
import random

from .models.device import (
    Device, DeviceStatus, DeviceType, DeviceStats,
    Interface, SwitchStats, FirewallStats, ProxmoxStats,
)
from .models.topology import Topology, Cluster, Position
from .models.connection import (
    Connection, ConnectionEndpoint, ConnectionStatus, ConnectionType,
    ExternalLink, ExternalTarget,
)
from .models.vlan import L3Topology, Vlan, VlanMembership, L3TopologyVlanGroup, L3TopologyNode


# Seed random for reproducibility in demo
random.seed(42)


def _random_ip(subnet: str = "10.10") -> str:
    """Generate a fake IP in the 10.10.x.x range."""
    return f"{subnet}.{random.randint(1, 254)}.{random.randint(1, 254)}"


def _random_uptime() -> int:
    """Generate random uptime in seconds (1-90 days)."""
    return random.randint(86400, 86400 * 90)


# =============================================================================
# Demo Device Definitions
# =============================================================================

DEMO_CLUSTERS = [
    {"id": "core", "name": "Core Network", "cluster_type": "network", "icon": "switch", "x": 400, "y": 100},
    {"id": "distribution", "name": "Distribution", "cluster_type": "network", "icon": "switch", "x": 400, "y": 250},
    {"id": "firewalls", "name": "Firewalls", "cluster_type": "firewall", "icon": "shield", "x": 150, "y": 100},
    {"id": "servers", "name": "Servers", "cluster_type": "server", "icon": "server", "x": 650, "y": 250},
    {"id": "hypervisors", "name": "Hypervisors", "cluster_type": "server", "icon": "server", "x": 650, "y": 100},
    {"id": "wireless", "name": "Access Points", "cluster_type": "wireless", "icon": "wifi", "x": 400, "y": 400},
]

DEMO_DEVICES = [
    # Core switches
    {"id": "core-sw-1", "name": "Core Switch 1", "type": DeviceType.SWITCH, "cluster": "core", "ip": "10.10.1.1", "model": "Cisco C9300-48UXM"},
    {"id": "core-sw-2", "name": "Core Switch 2", "type": DeviceType.SWITCH, "cluster": "core", "ip": "10.10.1.2", "model": "Cisco C9300-48UXM"},

    # Distribution switches
    {"id": "dist-sw-1", "name": "Dist Switch 1", "type": DeviceType.SWITCH, "cluster": "distribution", "ip": "10.10.2.1", "model": "Cisco C9200-24P"},
    {"id": "dist-sw-2", "name": "Dist Switch 2", "type": DeviceType.SWITCH, "cluster": "distribution", "ip": "10.10.2.2", "model": "Cisco C9200-24P"},
    {"id": "dist-sw-3", "name": "Dist Switch 3", "type": DeviceType.SWITCH, "cluster": "distribution", "ip": "10.10.2.3", "model": "Cisco C9200-48P"},

    # Firewalls
    {"id": "fw-edge-1", "name": "Edge Firewall 1", "type": DeviceType.FIREWALL, "cluster": "firewalls", "ip": "10.10.0.1", "model": "Palo Alto PA-3410"},
    {"id": "fw-edge-2", "name": "Edge Firewall 2", "type": DeviceType.FIREWALL, "cluster": "firewalls", "ip": "10.10.0.2", "model": "Palo Alto PA-3410"},

    # Servers
    {"id": "srv-web-1", "name": "Web Server 1", "type": DeviceType.SERVER, "cluster": "servers", "ip": "10.10.10.10", "model": "Dell PowerEdge R750"},
    {"id": "srv-db-1", "name": "Database Server", "type": DeviceType.SERVER, "cluster": "servers", "ip": "10.10.10.20", "model": "Dell PowerEdge R750"},
    {"id": "srv-app-1", "name": "App Server 1", "type": DeviceType.SERVER, "cluster": "servers", "ip": "10.10.10.30", "model": "Dell PowerEdge R650"},
    {"id": "srv-backup-1", "name": "Backup Server", "type": DeviceType.SERVER, "cluster": "servers", "ip": "10.10.10.40", "model": "Synology RS3621xs+"},

    # Hypervisors
    {"id": "hv-prod-1", "name": "Proxmox Node 1", "type": DeviceType.SERVER, "cluster": "hypervisors", "ip": "10.10.5.1", "model": "Dell PowerEdge R750xs"},
    {"id": "hv-prod-2", "name": "Proxmox Node 2", "type": DeviceType.SERVER, "cluster": "hypervisors", "ip": "10.10.5.2", "model": "Dell PowerEdge R750xs"},
    {"id": "hv-dev-1", "name": "Proxmox Dev", "type": DeviceType.SERVER, "cluster": "hypervisors", "ip": "10.10.5.10", "model": "Dell PowerEdge R650"},

    # Access Points
    {"id": "ap-lobby", "name": "AP Lobby", "type": DeviceType.ACCESS_POINT, "cluster": "wireless", "ip": "10.10.20.1", "model": "Cisco Meraki MR46"},
    {"id": "ap-floor2", "name": "AP Floor 2", "type": DeviceType.ACCESS_POINT, "cluster": "wireless", "ip": "10.10.20.2", "model": "Cisco Meraki MR46"},
    {"id": "ap-floor3", "name": "AP Floor 3", "type": DeviceType.ACCESS_POINT, "cluster": "wireless", "ip": "10.10.20.3", "model": "Cisco Meraki MR46"},
]

DEMO_CONNECTIONS = [
    # Core to firewalls
    {"source": "fw-edge-1", "target": "core-sw-1", "speed": 10000, "type": ConnectionType.UPLINK},
    {"source": "fw-edge-2", "target": "core-sw-2", "speed": 10000, "type": ConnectionType.UPLINK},

    # Core interconnect
    {"source": "core-sw-1", "target": "core-sw-2", "speed": 40000, "type": ConnectionType.STACK},

    # Core to distribution
    {"source": "core-sw-1", "target": "dist-sw-1", "speed": 10000, "type": ConnectionType.TRUNK},
    {"source": "core-sw-1", "target": "dist-sw-2", "speed": 10000, "type": ConnectionType.TRUNK},
    {"source": "core-sw-2", "target": "dist-sw-2", "speed": 10000, "type": ConnectionType.TRUNK},
    {"source": "core-sw-2", "target": "dist-sw-3", "speed": 10000, "type": ConnectionType.TRUNK},

    # Distribution to servers
    {"source": "dist-sw-1", "target": "srv-web-1", "speed": 1000, "type": ConnectionType.ACCESS},
    {"source": "dist-sw-1", "target": "srv-db-1", "speed": 10000, "type": ConnectionType.ACCESS},
    {"source": "dist-sw-2", "target": "srv-app-1", "speed": 1000, "type": ConnectionType.ACCESS},
    {"source": "dist-sw-3", "target": "srv-backup-1", "speed": 10000, "type": ConnectionType.ACCESS},

    # Distribution to hypervisors
    {"source": "dist-sw-1", "target": "hv-prod-1", "speed": 10000, "type": ConnectionType.ACCESS},
    {"source": "dist-sw-2", "target": "hv-prod-2", "speed": 10000, "type": ConnectionType.ACCESS},
    {"source": "dist-sw-3", "target": "hv-dev-1", "speed": 10000, "type": ConnectionType.ACCESS},

    # Distribution to APs
    {"source": "dist-sw-2", "target": "ap-lobby", "speed": 1000, "type": ConnectionType.ACCESS},
    {"source": "dist-sw-2", "target": "ap-floor2", "speed": 1000, "type": ConnectionType.ACCESS},
    {"source": "dist-sw-3", "target": "ap-floor3", "speed": 1000, "type": ConnectionType.ACCESS},
]

DEMO_EXTERNAL_LINKS = [
    {"id": "wan-primary", "source": "fw-edge-1", "port": "eth1/1", "label": "ISP-Primary", "type": "cloud", "provider": "Comcast Business", "speed": 500},
    {"id": "wan-backup", "source": "fw-edge-2", "port": "eth1/1", "label": "ISP-Backup", "type": "cloud", "provider": "AT&T Business", "speed": 100},
    {"id": "wan-remote", "source": "core-sw-1", "port": "Te1/1/1", "label": "Remote Office", "type": "campus", "provider": "MPLS", "speed": 100},
]

DEMO_VMS = [
    {"vmid": 100, "name": "web-prod", "node": "pve1", "type": "qemu", "cpus": 4, "maxmem": 8 * 1024**3},
    {"vmid": 101, "name": "web-staging", "node": "pve1", "type": "qemu", "cpus": 2, "maxmem": 4 * 1024**3},
    {"vmid": 200, "name": "db-mysql", "node": "pve1", "type": "qemu", "cpus": 8, "maxmem": 32 * 1024**3},
    {"vmid": 201, "name": "db-postgres", "node": "pve2", "type": "qemu", "cpus": 8, "maxmem": 32 * 1024**3},
    {"vmid": 300, "name": "app-api", "node": "pve2", "type": "qemu", "cpus": 4, "maxmem": 8 * 1024**3},
    {"vmid": 301, "name": "app-worker", "node": "pve2", "type": "qemu", "cpus": 4, "maxmem": 8 * 1024**3},
    {"vmid": 400, "name": "monitoring", "node": "pve1", "type": "lxc", "cpus": 2, "maxmem": 4 * 1024**3},
    {"vmid": 401, "name": "logging", "node": "pve2", "type": "lxc", "cpus": 2, "maxmem": 4 * 1024**3},
    {"vmid": 500, "name": "dev-vm-1", "node": "pve-dev", "type": "qemu", "cpus": 4, "maxmem": 16 * 1024**3},
    {"vmid": 501, "name": "dev-vm-2", "node": "pve-dev", "type": "qemu", "cpus": 4, "maxmem": 16 * 1024**3},
    {"vmid": 502, "name": "test-vm-1", "node": "pve-dev", "type": "qemu", "cpus": 2, "maxmem": 8 * 1024**3},
]

DEMO_VLANS = [
    {"vlan_id": 10, "vlan_name": "Management", "devices": ["core-sw-1", "core-sw-2", "fw-edge-1", "fw-edge-2"]},
    {"vlan_id": 20, "vlan_name": "Servers", "devices": ["core-sw-1", "core-sw-2", "dist-sw-1", "srv-web-1", "srv-db-1", "srv-app-1"]},
    {"vlan_id": 30, "vlan_name": "Users", "devices": ["dist-sw-1", "dist-sw-2", "dist-sw-3", "ap-lobby", "ap-floor2", "ap-floor3"]},
    {"vlan_id": 40, "vlan_name": "Guest", "devices": ["dist-sw-2", "ap-lobby", "ap-floor2"]},
]


# =============================================================================
# Demo Data Generator Functions
# =============================================================================

def get_demo_topology() -> Topology:
    """Generate complete demo topology with devices, connections, and stats."""

    # Build clusters
    clusters = []
    for c in DEMO_CLUSTERS:
        clusters.append(Cluster(
            id=c["id"],
            name=c["name"],
            cluster_type=c["cluster_type"],
            icon=c["icon"],
            position=Position(x=c["x"], y=c["y"]),
            device_ids=[d["id"] for d in DEMO_DEVICES if d["cluster"] == c["id"]],
            status="active",
        ))

    # Build devices
    devices: dict[str, Device] = {}
    for d in DEMO_DEVICES:
        # Generate fake stats
        cpu = random.uniform(5, 85)
        memory = random.uniform(20, 75)

        # Most devices up, occasionally one is degraded
        status = DeviceStatus.UP
        if d["id"] == "srv-db-1":
            status = DeviceStatus.DEGRADED  # Example degraded device
            cpu = 92.5  # High CPU to justify degraded status

        device = Device(
            id=d["id"],
            display_name=d["name"],
            model=d.get("model"),
            device_type=d["type"],
            ip=d["ip"],
            location="Demo Datacenter",
            status=status,
            cluster_id=d["cluster"],
            stats=DeviceStats(
                cpu=round(cpu, 1),
                memory=round(memory, 1),
                uptime=_random_uptime(),
            ),
            interfaces=_generate_demo_interfaces(d["type"]),
            last_seen=datetime.utcnow() - timedelta(seconds=random.randint(10, 300)),
        )

        # Add type-specific stats
        if d["type"] == DeviceType.SWITCH:
            device.switch_stats = SwitchStats(
                ports_up=random.randint(12, 24),
                ports_down=random.randint(0, 4),
            )
        elif d["type"] == DeviceType.FIREWALL:
            device.firewall_stats = FirewallStats(
                sessions_active=random.randint(5000, 50000),
                throughput_in=random.randint(100_000_000, 500_000_000),
                throughput_out=random.randint(50_000_000, 200_000_000),
                threats_blocked_24h=random.randint(10, 500),
            )
        elif d["id"].startswith("hv-"):
            device.proxmox_stats = ProxmoxStats(
                vms_running=random.randint(3, 8),
                vms_stopped=random.randint(0, 2),
                containers_running=random.randint(2, 5),
                containers_stopped=random.randint(0, 1),
            )

        devices[d["id"]] = device

    # Build connections
    connections = []
    for i, conn in enumerate(DEMO_CONNECTIONS):
        utilization = random.uniform(5, 45)
        speed = conn["speed"]
        in_bps = int((utilization / 100) * speed * 1_000_000)
        out_bps = int((utilization / 100) * speed * 1_000_000 * random.uniform(0.5, 1.5))

        connections.append(Connection(
            id=f"demo-conn-{i}",
            source=ConnectionEndpoint(device=conn["source"], port=f"Gi1/0/{i+1}"),
            target=ConnectionEndpoint(device=conn["target"], port=f"Gi1/0/{i+1}"),
            connection_type=conn["type"],
            speed=speed,
            status=ConnectionStatus.UP,
            utilization=round(utilization, 1),
            in_bps=in_bps,
            out_bps=out_bps,
        ))

    # Build external links
    external_links = []
    for ext in DEMO_EXTERNAL_LINKS:
        external_links.append(ExternalLink(
            id=ext["id"],
            source=ConnectionEndpoint(device=ext["source"], port=ext["port"]),
            target=ExternalTarget(
                label=ext["label"],
                type=ext["type"],
                icon="cloud" if ext["type"] == "cloud" else "building",
            ),
            provider=ext.get("provider"),
            speed=ext["speed"],
            status=ConnectionStatus.UP,
            utilization=random.uniform(10, 40),
        ))

    # Calculate summary stats
    devices_up = sum(1 for d in devices.values() if d.status == DeviceStatus.UP)
    devices_down = sum(1 for d in devices.values() if d.status == DeviceStatus.DOWN)

    return Topology(
        clusters=clusters,
        devices=devices,
        connections=connections,
        external_links=external_links,
        total_devices=len(devices),
        devices_up=devices_up,
        devices_down=devices_down,
        active_alerts=1 if any(d.status == DeviceStatus.DEGRADED for d in devices.values()) else 0,
    )


def _generate_demo_interfaces(device_type: DeviceType) -> list[Interface]:
    """Generate fake interfaces based on device type."""
    interfaces = []

    if device_type == DeviceType.SWITCH:
        for i in range(1, 25):
            status = DeviceStatus.UP if random.random() > 0.15 else DeviceStatus.DOWN
            interfaces.append(Interface(
                name=f"Gi1/0/{i}",
                status=status,
                admin_status="up",
                alias=f"User Port {i}" if i <= 20 else f"Uplink {i-20}",
                speed=1000,
                in_bps=random.randint(0, 500_000_000) if status == DeviceStatus.UP else 0,
                out_bps=random.randint(0, 500_000_000) if status == DeviceStatus.UP else 0,
                utilization=random.uniform(0, 50) if status == DeviceStatus.UP else 0,
            ))
    elif device_type == DeviceType.FIREWALL:
        for i, name in enumerate(["eth1/1", "eth1/2", "eth1/3", "eth1/4"], 1):
            interfaces.append(Interface(
                name=name,
                status=DeviceStatus.UP,
                admin_status="up",
                alias=["WAN", "LAN", "DMZ", "Management"][i-1],
                speed=10000,
                in_bps=random.randint(100_000_000, 1_000_000_000),
                out_bps=random.randint(50_000_000, 500_000_000),
                utilization=random.uniform(10, 60),
            ))
    elif device_type == DeviceType.SERVER:
        for i in range(1, 3):
            interfaces.append(Interface(
                name=f"eth{i-1}",
                status=DeviceStatus.UP,
                admin_status="up",
                alias=f"Network {i}",
                speed=10000 if i == 1 else 1000,
                in_bps=random.randint(10_000_000, 500_000_000),
                out_bps=random.randint(10_000_000, 500_000_000),
                utilization=random.uniform(5, 40),
            ))
    else:
        # Access points, etc.
        interfaces.append(Interface(
            name="eth0",
            status=DeviceStatus.UP,
            admin_status="up",
            alias="PoE Uplink",
            speed=1000,
            in_bps=random.randint(10_000_000, 200_000_000),
            out_bps=random.randint(10_000_000, 200_000_000),
            utilization=random.uniform(10, 35),
        ))

    return interfaces


def get_demo_l3_topology() -> L3Topology:
    """Generate L3 topology with VLAN groupings."""

    # Build VLAN list
    vlans = [
        Vlan(vlan_id=v["vlan_id"], vlan_name=v["vlan_name"], device_count=len(v["devices"]))
        for v in DEMO_VLANS
    ]

    # Build memberships
    memberships = []
    for v in DEMO_VLANS:
        for device_id in v["devices"]:
            memberships.append(VlanMembership(
                device_id=device_id,
                vlan_id=v["vlan_id"],
                vlan_name=v["vlan_name"],
                is_untagged=True,
            ))

    # Build VLAN groups with device nodes
    topology = get_demo_topology()
    vlan_groups = []

    # Track devices in multiple VLANs (gateways)
    device_vlan_count: dict[str, int] = {}
    for v in DEMO_VLANS:
        for device_id in v["devices"]:
            device_vlan_count[device_id] = device_vlan_count.get(device_id, 0) + 1

    gateway_devices = [d for d, count in device_vlan_count.items() if count > 1]

    for v in DEMO_VLANS:
        devices_in_vlan = []
        for device_id in v["devices"]:
            device = topology.devices.get(device_id)
            if device:
                devices_in_vlan.append(L3TopologyNode(
                    device_id=device_id,
                    display_name=device.display_name,
                    status=device.status.value,
                    is_gateway=device_id in gateway_devices,
                    vlan_ids=[vl["vlan_id"] for vl in DEMO_VLANS if device_id in vl["devices"]],
                ))

        vlan_groups.append(L3TopologyVlanGroup(
            vlan_id=v["vlan_id"],
            vlan_name=v["vlan_name"],
            devices=devices_in_vlan,
            gateway_devices=[d for d in v["devices"] if d in gateway_devices],
        ))

    return L3Topology(
        vlans=vlans,
        memberships=memberships,
        vlan_groups=vlan_groups,
        gateway_devices=gateway_devices,
    )


def get_demo_alerts() -> list[dict]:
    """Generate fake alerts for demo mode."""
    return [
        {
            "id": "demo-alert-1",
            "device_id": "srv-db-1",
            "severity": "warning",
            "message": "High CPU utilization on Database Server",
            "details": "CPU usage at 92.5% for the past 15 minutes",
            "status": "active",
            "timestamp": (datetime.utcnow() - timedelta(minutes=15)).isoformat(),
        },
        {
            "id": "demo-alert-2",
            "device_id": "srv-backup-1",
            "severity": "info",
            "message": "Backup completed successfully",
            "details": "Nightly backup finished at 03:00 UTC",
            "status": "active",
            "timestamp": (datetime.utcnow() - timedelta(hours=6)).isoformat(),
        },
    ]


def get_demo_vms() -> list[dict]:
    """Generate fake VM list for demo mode."""
    vms = []
    for vm in DEMO_VMS:
        cpu_usage = random.uniform(5, 60)
        mem_usage = random.uniform(30, 80)

        vms.append({
            "vmid": vm["vmid"],
            "name": vm["name"],
            "node": vm["node"],
            "instance": "primary",
            "type": vm["type"],
            "status": "running",
            "cpu": round(cpu_usage / 100, 4),
            "memory": round(mem_usage / 100, 4),
            "cpus": vm["cpus"],
            "maxmem": vm["maxmem"],
            "uptime": _random_uptime(),
            "netin": random.randint(1_000_000, 100_000_000),
            "netout": random.randint(1_000_000, 100_000_000),
        })

    return vms


def get_demo_speedtest() -> dict:
    """Generate fake speedtest result for demo mode."""
    download = random.uniform(450, 500)
    upload = random.uniform(450, 500)
    ping = random.uniform(8, 15)

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "download_mbps": round(download, 2),
        "upload_mbps": round(upload, 2),
        "ping_ms": round(ping, 2),
        "jitter_ms": round(random.uniform(1, 3), 2),
        "packet_loss": 0.0,
        "server_name": "Demo ISP Server",
        "server_location": "New York, NY",
        "server_id": 12345,
        "isp": "Demo ISP",
        "result_url": "https://www.speedtest.net/result/demo",
        "indicator": "normal",
    }


def get_demo_port_groups() -> list[dict]:
    """Generate fake port group traffic data for demo mode."""
    return [
        {
            "name": "Digital Media",
            "description": "Digital signage and media players",
            "port_count": 15,
            "active_port_count": 12,
            "in_bps": 125_000_000,
            "out_bps": 25_000_000,
            "in_mbps": 125.0,
            "out_mbps": 25.0,
            "total_mbps": 150.0,
            "status": "ok",
            "thresholds": {"warning_mbps": 500, "critical_mbps": 800},
        },
        {
            "name": "IP Cameras",
            "description": "Security camera network",
            "port_count": 24,
            "active_port_count": 22,
            "in_bps": 350_000_000,
            "out_bps": 5_000_000,
            "in_mbps": 350.0,
            "out_mbps": 5.0,
            "total_mbps": 355.0,
            "status": "ok",
            "thresholds": {"warning_mbps": 500, "critical_mbps": 800},
        },
    ]


def get_demo_proxmox_nodes() -> dict:
    """Generate fake Proxmox node data for demo mode."""
    return {
        "primary:pve1": {
            "node": "pve1",
            "instance": "primary",
            "status": "online",
            "cpu": 0.35,
            "memory": 0.62,
            "maxcpu": 32,
            "maxmem": 128 * 1024**3,
            "uptime": _random_uptime(),
        },
        "primary:pve2": {
            "node": "pve2",
            "instance": "primary",
            "status": "online",
            "cpu": 0.42,
            "memory": 0.58,
            "maxcpu": 32,
            "maxmem": 128 * 1024**3,
            "uptime": _random_uptime(),
        },
        "primary:pve-dev": {
            "node": "pve-dev",
            "instance": "primary",
            "status": "online",
            "cpu": 0.15,
            "memory": 0.45,
            "maxcpu": 16,
            "maxmem": 64 * 1024**3,
            "uptime": _random_uptime(),
        },
    }


def get_demo_storage() -> list[dict]:
    """Generate fake Proxmox storage data for demo mode."""
    return [
        {
            "storage": "local-lvm",
            "type": "lvmthin",
            "used": 500 * 1024**3,
            "total": 1000 * 1024**3,
            "used_percent": 50.0,
        },
        {
            "storage": "ceph-pool",
            "type": "rbd",
            "used": 2 * 1024**4,
            "total": 10 * 1024**4,
            "used_percent": 20.0,
        },
    ]
