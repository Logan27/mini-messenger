# Mobile App Environment Setup Guide

Complete guide for configuring the mobile app environment for development and testing.

---

## Overview

The mobile app needs to connect to your backend server running on port 4000. The configuration changes depending on whether you're testing on:

- **Android Emulator**: Use `10.0.2.2:4000`
- **iOS Simulator**: Use `localhost:4000`
- **Physical Device**: Use your computer's local network IP (e.g., `192.168.1.10:4000`)

---

## Quick Setup

### Step 1: Start the Backend Server

The backend must be running before you can use the mobile app:

```bash
# From project root
cd backend

# Install dependencies (first time only)
npm install

# Run database migrations (first time only)
npm run migrate

# Seed test users (first time only)
node seed-users.js

# Start the backend server
npm start
```

Backend should be running on: **http://localhost:4000**

Verify backend is running:
```bash
curl http://localhost:4000/api/health
# Should return: {"status":"ok"}
```

### Step 2: Configure Mobile App Environment

Choose the appropriate configuration for your testing environment:

#### Option A: Android Emulator

```bash
# Copy the Android emulator configuration
cp mobile/.env.android-emulator mobile/.env

# Or manually edit mobile/.env:
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
EXPO_PUBLIC_WS_URL=ws://10.0.2.2:4000
```

#### Option B: iOS Simulator

```bash
# iOS simulator can use localhost
# Edit mobile/.env:
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_WS_URL=ws://localhost:4000
```

#### Option C: Physical Device (Same WiFi Network)

```bash
# Find your computer's local IP address:

# macOS/Linux:
ifconfig | grep "inet " | grep -v 127.0.0.1
# or
ipconfig getifaddr en0

# Windows:
ipconfig
# Look for "IPv4 Address" under your active network adapter

# Then edit mobile/.env with your IP:
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
EXPO_PUBLIC_WS_URL=ws://192.168.1.10:4000
```

**Important**: Replace `192.168.1.10` with your actual local IP address.

### Step 3: Install Mobile Dependencies

```bash
cd mobile
npm install
```

### Step 4: Start the Mobile App

```bash
# Start Expo development server
npm start

# Then choose:
# - Press 'a' for Android emulator
# - Press 'i' for iOS simulator
# - Scan QR code with Expo Go on physical device
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `EXPO_PUBLIC_API_URL` | Backend HTTP API endpoint | `http://localhost:4000` | `http://10.0.2.2:4000` |
| `EXPO_PUBLIC_WS_URL` | Backend WebSocket endpoint | `ws://localhost:4000` | `ws://10.0.2.2:4000` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_APP_NAME` | App display name | `Messenger` |
| `EXPO_PUBLIC_APP_VERSION` | App version | `1.0.0` |
| `EXPO_PUBLIC_ENABLE_BIOMETRIC` | Enable biometric auth | `true` |
| `EXPO_PUBLIC_ENABLE_NOTIFICATIONS` | Enable push notifications | `true` |
| `EXPO_PUBLIC_ENABLE_CALLS` | Enable voice/video calls | `true` |
| `EXPO_PUBLIC_MAX_FILE_SIZE` | Max file upload size in bytes | `10485760` (10MB) |
| `EXPO_PUBLIC_SUPPORTED_FILE_TYPES` | Allowed file extensions | `jpg,jpeg,png,gif,pdf,doc,docx,txt` |

---

## Platform-Specific Configuration

### Android Emulator Details

**Why `10.0.2.2`?**
- Android emulator uses `10.0.2.2` as a special alias to reach the host machine's `localhost`
- `localhost` or `127.0.0.1` inside the emulator refers to the emulator itself, not your computer
- This is an Android emulator-specific requirement

**Configuration:**
```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
EXPO_PUBLIC_WS_URL=ws://10.0.2.2:4000
```

### iOS Simulator Details

**Why `localhost`?**
- iOS simulator uses the host machine's network stack directly
- `localhost` inside the simulator resolves to your computer's localhost
- No special aliases needed

**Configuration:**
```bash
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_WS_URL=ws://localhost:4000
```

### Physical Device Details

**Requirements:**
- Both your computer and mobile device must be on the same WiFi network
- Your computer's firewall must allow connections on port 4000
- Use your computer's local network IP address (not localhost)

**Configuration:**
```bash
# Example with IP 192.168.1.10
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
EXPO_PUBLIC_WS_URL=ws://192.168.1.10:4000
```

**Firewall Settings:**

On macOS:
```bash
# Allow port 4000 through firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /path/to/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /path/to/node
```

On Windows:
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Add inbound rule for port 4000
4. Allow TCP connections

On Linux:
```bash
# Using ufw
sudo ufw allow 4000/tcp

# Using iptables
sudo iptables -A INPUT -p tcp --dport 4000 -j ACCEPT
```

---

## Testing Environment Configuration

### Test Users

The backend includes seeded test users (created by `seed-users.js`):

| Username | Email | Password | Role |
|----------|-------|----------|------|
| admin | admin@messenger.app | Admin123!@# | Admin |
| alice | alice@test.com | Admin123!@# | User |
| bob | bob@test.com | Admin123!@# | User |
| charlie | charlie@test.com | Admin123!@# | User |
| diana | diana@test.com | Admin123!@# | User |
| eve | eve@test.com | Admin123!@# | User |

All test users are pre-configured as mutual friends and can message each other immediately.

### Verify Connection

After configuring your environment and starting the app:

1. **Test Backend Connection**:
   - Open the app login screen
   - Try logging in with test user (e.g., alice / Admin123!@#)
   - If login succeeds, backend connection is working

2. **Test WebSocket Connection**:
   - Log in to the app
   - Navigate to a chat
   - Send a message
   - If the message appears immediately with status indicators, WebSocket is working

3. **Common Issues**:
   - **"Network Error"**: Backend not running or wrong API URL
   - **Login works but messages don't send**: WebSocket URL incorrect
   - **Connection timeout**: Firewall blocking port 4000
   - **Cannot reach server**: Wrong IP address or devices on different networks

---

## Environment File Templates

### Template: `.env.example`

Complete template with all available options (located at `mobile/.env.example`)

### Template: `.env.android-emulator`

Pre-configured for Android emulator testing:

```bash
# Android Emulator Configuration
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
EXPO_PUBLIC_WS_URL=ws://10.0.2.2:4000
EXPO_PUBLIC_APP_NAME=Messenger
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENABLE_BIOMETRIC=true
EXPO_PUBLIC_ENABLE_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_CALLS=true
EXPO_PUBLIC_MAX_FILE_SIZE=10485760
EXPO_PUBLIC_SUPPORTED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt
```

### Quick Switch Between Environments

Create these helper scripts in `mobile/` directory:

**`use-android-env.sh`:**
```bash
#!/bin/bash
cp .env.android-emulator .env
echo "✅ Switched to Android Emulator environment (10.0.2.2:4000)"
```

**`use-local-env.sh`:**
```bash
#!/bin/bash
# Update YOUR_IP with your actual IP address
YOUR_IP="192.168.1.10"
cat > .env <<EOF
EXPO_PUBLIC_API_URL=http://$YOUR_IP:4000
EXPO_PUBLIC_WS_URL=ws://$YOUR_IP:4000
EXPO_PUBLIC_APP_NAME=Messenger
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENABLE_BIOMETRIC=true
EXPO_PUBLIC_ENABLE_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_CALLS=true
EXPO_PUBLIC_MAX_FILE_SIZE=10485760
EXPO_PUBLIC_SUPPORTED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt
EOF
echo "✅ Switched to Local Network environment ($YOUR_IP:4000)"
```

Make executable:
```bash
chmod +x use-android-env.sh use-local-env.sh
```

---

## Troubleshooting

### Backend Not Starting

**Problem**: Backend fails to start or crashes
**Solutions**:
1. Check PostgreSQL is running: `psql -U postgres -c "SELECT 1"`
2. Check Redis is running: `redis-cli ping` (should return "PONG")
3. Verify database exists: `psql -U postgres -l | grep messenger`
4. Run migrations: `cd backend && npm run migrate`
5. Check backend logs for specific errors

### Cannot Connect from Mobile App

**Problem**: Mobile app shows "Network Error" or "Cannot connect to server"
**Solutions**:

1. **Verify backend is running**:
   ```bash
   curl http://localhost:4000/api/health
   ```

2. **Check environment configuration**:
   ```bash
   cat mobile/.env
   # Verify API URL is correct for your platform
   ```

3. **Test from terminal**:
   ```bash
   # Replace with your configured API URL
   curl http://10.0.2.2:4000/api/health  # Android emulator
   # or
   curl http://192.168.1.10:4000/api/health  # Physical device
   ```

4. **Restart Expo dev server**:
   - Stop the current Expo server (Ctrl+C)
   - Clear cache: `npm start -- --clear`
   - Restart app on device

### WebSocket Connection Fails

**Problem**: Login works but real-time features don't work
**Solutions**:

1. **Check WS URL**: Verify `EXPO_PUBLIC_WS_URL` uses `ws://` protocol (not `http://`)
2. **Check backend WebSocket server**: Look for WebSocket initialization logs in backend
3. **Test WebSocket connection** using a WebSocket client
4. **Firewall**: Ensure port 4000 allows WebSocket connections

### Physical Device Cannot Reach Server

**Problem**: Physical device cannot connect even with correct IP
**Solutions**:

1. **Verify network**: Ensure device and computer on same WiFi network
2. **Test connectivity**: Ping your computer from another device
3. **Check firewall**: Temporarily disable firewall to test
4. **Use IP not hostname**: Always use IP address (e.g., `192.168.1.10`), not `localhost`
5. **Check router**: Some routers have client isolation enabled, preventing device-to-device communication

### Changes Not Reflecting

**Problem**: Changed `.env` but app still uses old values
**Solutions**:

1. **Stop and restart Expo**: `.env` changes require server restart
2. **Clear cache**: `npm start -- --clear`
3. **Rebuild**: For production builds, rebuild the app after env changes

---

## Next Steps

After environment setup:

1. **Run the app**: See [mobile-testing-guide.md](./mobile-testing-guide.md)
2. **Test features**: Follow test checklist in testing guide
3. **Fix TypeScript errors**: See [typescript-issues.md](./typescript-issues.md)
4. **Build for production**: See [android-build-guide.md](./android-build-guide.md)

---

## Summary

**Key Points**:
- ✅ Backend must be running on port 4000
- ✅ Android Emulator requires `10.0.2.2` IP address
- ✅ iOS Simulator can use `localhost`
- ✅ Physical devices need your computer's local network IP
- ✅ Both HTTP (API) and WebSocket (WS) URLs must be configured
- ✅ Changes to `.env` require Expo server restart

**Quick Reference**:
```bash
# Android Emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
EXPO_PUBLIC_WS_URL=ws://10.0.2.2:4000

# iOS Simulator
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_WS_URL=ws://localhost:4000

# Physical Device (replace with your IP)
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
EXPO_PUBLIC_WS_URL=ws://192.168.1.10:4000
```

---

**Last Updated**: 2025-11-05
