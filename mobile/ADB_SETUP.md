# ADB Setup for Physical Android Device Development

This guide shows you how to connect your physical Android device to the backend server using ADB reverse port forwarding.

## Prerequisites

- Android device connected via USB
- ADB (Android Debug Bridge) installed on your computer
- USB debugging enabled on your Android device

## Why Use ADB Reverse Port Forwarding?

**Advantages:**
- ✅ No need to configure IP addresses
- ✅ Works on any network (WiFi, mobile data, or no network)
- ✅ More reliable and faster than WiFi
- ✅ Simpler configuration
- ✅ No firewall issues

**Compared to WiFi method:**
- WiFi: Requires same network, IP configuration, firewall rules
- ADB: Just plug in USB and run one command

## Setup Steps

### 1. Enable USB Debugging on Your Android Device

1. Go to **Settings** > **About phone**
2. Tap **Build number** 7 times to enable Developer options
3. Go to **Settings** > **Developer options**
4. Enable **USB debugging**

### 2. Connect Your Device

1. Connect your Android device to your computer via USB
2. On your phone, accept the "Allow USB debugging" prompt
3. Verify connection:
   ```bash
   adb devices
   ```
   You should see your device listed:
   ```
   List of devices attached
   XXXXXXXXXXXXXX    device
   ```

### 3. Set Up Port Forwarding

Forward port 4000 from your computer to your device:

```bash
adb reverse tcp:4000 tcp:4000
```

This command makes your computer's `localhost:4000` accessible from the Android device as `localhost:4000`.

**Optional:** Forward additional ports if needed:
```bash
# Forward WebSocket port (if different)
adb reverse tcp:4000 tcp:4000

# Forward PostgreSQL (if needed for debugging)
adb reverse tcp:5432 tcp:5432

# Forward Redis (if needed for debugging)
adb reverse tcp:6379 tcp:6379
```

### 4. Configure Mobile App

The mobile app should already be configured to use localhost:

**File:** `/home/user/mini-messenger/mobile/.env`
```env
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_WS_URL=ws://localhost:4000
```

### 5. Start Backend Server

On your computer:

```bash
cd /home/user/mini-messenger/backend

# Start PostgreSQL
sudo systemctl start postgresql
# or
sudo service postgresql start

# Start Redis
redis-server --daemonize yes --port 6379 --requirepass messenger_redis_password

# Start backend
npm run dev
```

### 6. Start Mobile App

```bash
cd /home/user/mini-messenger/mobile

# Clear cache and restart
npx expo start --clear
```

### 7. Test the Connection

On your Android device:

1. Open the mobile app
2. Try to register or login
3. Check the backend logs on your computer for incoming requests

**Or test from your device's browser:**
- Open Chrome on your device
- Navigate to: `http://localhost:4000/health`
- You should see: `{"status":"ok"}`

## Troubleshooting

### "Network Error" or "Connection Refused"

**Check ADB connection:**
```bash
adb devices
```

**Re-run port forwarding:**
```bash
adb reverse tcp:4000 tcp:4000
```

**Verify backend is running:**
```bash
curl http://localhost:4000/health
```

### Device Not Listed in `adb devices`

1. Check USB cable (try a different one)
2. Enable "File Transfer" or "PTP" mode on your device
3. Revoke and re-accept USB debugging authorization
4. Restart ADB server:
   ```bash
   adb kill-server
   adb start-server
   ```

### "Device Unauthorized"

On your phone, you should see a prompt asking to allow USB debugging. Check your device and accept it.

If you don't see the prompt:
```bash
adb kill-server
adb start-server
```

Then unplug and replug your device.

### Changes to .env Not Reflecting

```bash
# Stop Expo
# Clear cache
npx expo start --clear
```

### Backend Not Accessible

**Check backend is running:**
```bash
lsof -i :4000
# or
netstat -tlnp | grep 4000
```

**Check backend logs:**
```bash
cd /home/user/mini-messenger/backend
npm run dev
# Watch for any errors
```

## Important Notes

1. **Port forwarding persists only while device is connected**
   - You need to run `adb reverse tcp:4000 tcp:4000` each time you reconnect your device

2. **Multiple devices:**
   If you have multiple devices connected, specify which one:
   ```bash
   adb -s DEVICE_ID reverse tcp:4000 tcp:4000
   ```

3. **Remove port forwarding:**
   ```bash
   adb reverse --remove tcp:4000
   # Or remove all:
   adb reverse --remove-all
   ```

4. **Backend must listen on 0.0.0.0, not 127.0.0.1**
   In `backend/.env`:
   ```env
   HOST=0.0.0.0
   PORT=4000
   ```

## Quick Reference Commands

```bash
# Check device connection
adb devices

# Forward port
adb reverse tcp:4000 tcp:4000

# Check forwarded ports
adb reverse --list

# Remove port forwarding
adb reverse --remove tcp:4000

# Restart ADB
adb kill-server
adb start-server

# Check backend status
curl http://localhost:4000/health

# Start backend
cd backend && npm run dev
```

## Alternative: WiFi Method

If you prefer to use WiFi instead of USB, see [NETWORK_CONFIGURATION.md](./NETWORK_CONFIGURATION.md) for instructions on configuring IP addresses.

## See Also

- [NETWORK_CONFIGURATION.md](./NETWORK_CONFIGURATION.md) - Network setup for all scenarios
- [Backend README](../backend/README.md) - Backend server documentation
