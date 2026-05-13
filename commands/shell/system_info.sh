#!/bin/bash
echo "=== System Information ==="
echo "Hostname: $(hostname)"
echo "User: $(whoami)"
echo "OS: $(uname -a)"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
echo "Disk Usage:"
df -h | head -5