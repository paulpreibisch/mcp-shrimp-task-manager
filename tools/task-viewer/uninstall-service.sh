#!/bin/bash

# Script to uninstall Shrimp Task Viewer systemd service

SERVICE_NAME="shrimp-task-viewer.service"

echo "Uninstalling Shrimp Task Viewer systemd service..."

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run this script with sudo:"
    echo "sudo ./uninstall-service.sh"
    exit 1
fi

# Stop the service
echo "Stopping the service..."
systemctl stop $SERVICE_NAME

# Disable the service
echo "Disabling the service..."
systemctl disable $SERVICE_NAME

# Remove the service file
echo "Removing service file..."
rm -f /etc/systemd/system/$SERVICE_NAME

# Reload systemd daemon
echo "Reloading systemd daemon..."
systemctl daemon-reload

echo ""
echo "Service uninstalled successfully!"