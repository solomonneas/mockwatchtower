#!/usr/bin/env bash

# Watchtower LXC Container Creator
# Run this on your Proxmox host
# Usage: bash create-lxc.sh [CTID] [STORAGE]

set -e

CTID=${1:-200}
STORAGE=${2:-local-lvm}
HOSTNAME="watchtower"
MEMORY=2048
CORES=2
DISK=8

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════╗"
echo "║    Watchtower LXC Container Creator       ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}Settings:${NC}"
echo "  Container ID: $CTID"
echo "  Hostname:     $HOSTNAME"
echo "  Memory:       ${MEMORY}MB"
echo "  Cores:        $CORES"
echo "  Disk:         ${DISK}GB"
echo "  Storage:      $STORAGE"
echo ""

# Check if container exists
if pct status $CTID &>/dev/null; then
    echo -e "${YELLOW}Container $CTID already exists.${NC}"
    read -p "Delete and recreate? (y/N): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        pct stop $CTID 2>/dev/null || true
        pct destroy $CTID
    else
        echo "Aborted."
        exit 1
    fi
fi

# Find template
TEMPLATE=$(pveam list local 2>/dev/null | grep -E "ubuntu-2[24]|debian-12" | head -1 | awk '{print $1}')

if [[ -z "$TEMPLATE" ]]; then
    echo -e "${YELLOW}No suitable template found. Downloading Ubuntu 24.04...${NC}"
    pveam update
    pveam download local ubuntu-24.04-standard_24.04-2_amd64.tar.zst
    TEMPLATE="local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst"
fi

echo -e "${GREEN}Using template: $TEMPLATE${NC}"

# Create container
echo -e "\n${GREEN}Creating LXC container...${NC}"
pct create $CTID $TEMPLATE \
    --hostname $HOSTNAME \
    --memory $MEMORY \
    --cores $CORES \
    --rootfs $STORAGE:$DISK \
    --net0 name=eth0,bridge=vmbr0,ip=dhcp \
    --unprivileged 1 \
    --features nesting=1 \
    --onboot 1

# Start container
echo -e "${GREEN}Starting container...${NC}"
pct start $CTID

# Wait for network
echo -e "${GREEN}Waiting for network...${NC}"
sleep 10

# Get IP
IP=$(pct exec $CTID -- hostname -I 2>/dev/null | awk '{print $1}')
echo -e "${GREEN}Container IP: $IP${NC}"

# Run installer
echo -e "\n${GREEN}Running Watchtower installer...${NC}"
pct exec $CTID -- bash -c "curl -fsSL https://raw.githubusercontent.com/solomonneas/watchtower/main/install/install.sh | bash"

echo -e "\n${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              Setup Complete!              ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "Watchtower is running at: ${GREEN}http://$IP${NC}"
echo ""
echo -e "${YELLOW}Container management:${NC}"
echo "  pct enter $CTID              # Enter container shell"
echo "  pct stop $CTID               # Stop container"
echo "  pct start $CTID              # Start container"
echo ""
