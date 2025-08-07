#!/bin/bash

# Script to install Shrimp Task Viewer as a systemd service

SERVICE_FILE="shrimp-task-viewer.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_FILE"
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing Shrimp Task Viewer as a systemd service..."

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run this script with sudo:"
    echo "sudo ./install-service.sh"
    exit 1
fi

# Copy service file to systemd directory
echo "Copying service file to $SERVICE_PATH..."
cp "$CURRENT_DIR/$SERVICE_FILE" "$SERVICE_PATH"

# Reload systemd daemon
echo "Reloading systemd daemon..."
systemctl daemon-reload

# Enable the service to start on boot
echo "Enabling service to start on boot..."
systemctl enable shrimp-task-viewer.service

# Start the service
echo "Starting the service..."
systemctl start shrimp-task-viewer.service

# Check service status
echo ""
echo "Service status:"
systemctl status shrimp-task-viewer.service --no-pager

echo ""
echo "Installation complete!"
echo ""
echo "Useful commands:"
echo "  - Check status: systemctl status shrimp-task-viewer"
echo "  - Start service: systemctl start shrimp-task-viewer"
echo "  - Stop service: systemctl stop shrimp-task-viewer"
echo "  - Restart service: systemctl restart shrimp-task-viewer"
echo "  - View logs: journalctl -u shrimp-task-viewer -f"
echo "  - Disable auto-start: systemctl disable shrimp-task-viewer"