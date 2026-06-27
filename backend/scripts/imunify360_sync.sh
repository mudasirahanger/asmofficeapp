#!/bin/bash
# imunify360_sync.sh
# Run this via root cron every 5 minutes:
# */5 * * * * /path/to/backend/scripts/imunify360_sync.sh

# Path to the IP file saved by Laravel
IP_FILE="/path/to/your/laravel/storage/app/local/imunify360_office_ip.txt"
# Path to store the currently whitelisted IP (so we don't spam Imunify360)
CURRENT_IP_FILE="/var/log/current_office_ip.txt"

if [ ! -f "$IP_FILE" ]; then
    echo "No IP file found from Laravel."
    exit 0
fi

NEW_IP=$(cat "$IP_FILE" | tr -d '[:space:]')
CURRENT_IP=""

if [ -f "$CURRENT_IP_FILE" ]; then
    CURRENT_IP=$(cat "$CURRENT_IP_FILE" | tr -d '[:space:]')
fi

# Only run if the IP has changed and is a valid IP format
if [ "$NEW_IP" != "$CURRENT_IP" ] && [[ $NEW_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Updating Office IP from $CURRENT_IP to $NEW_IP"
    
    # Remove old IP from whitelist if it exists
    if [ ! -z "$CURRENT_IP" ]; then
        imunify360-agent whitelist ip delete "$CURRENT_IP"
    fi
    
    # Add new IP to whitelist
    imunify360-agent whitelist ip add "$NEW_IP" --comment "Dynamic Office IP Sync"
    
    # Save the new IP state
    echo "$NEW_IP" > "$CURRENT_IP_FILE"
    echo "Successfully whitelisted $NEW_IP"
else
    echo "IP has not changed or is invalid."
fi
