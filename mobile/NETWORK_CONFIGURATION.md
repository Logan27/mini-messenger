# Mobile App Network Configuration Guide

## Overview

The mobile app needs to connect to the backend API server. The URL configuration depends on whether you're using:
- **Android Emulator** - Use `10.0.2.2` (emulator's alias for host machine)
- **iOS Simulator** - Use `localhost` (simulator uses host network)
- **Physical Device** - Use your computer's actual local IP address

## Configuration Files

The mobile app has three `.env` template files:

1. **`.env.example`** - Template with detailed documentation
2. **`.env.android-emulator`** - Pre-configured for Android Emulator
3. **`.env.physical-device`** - Template for physical devices (requires IP configuration)

## Quick Setup

### For Android Emulator

```bash
cp .env.android-emulator .env
```

The configuration will be:
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
EXPO_PUBLIC_WS_URL=ws://10.0.2.2:4000
```

### For iOS Simulator

```bash
cp .env.example .env
```

The default configuration uses `localhost:4000` which works for iOS Simulator.

### For Physical Android/iOS Device

1. Find your computer's local IP address:
   ```bash
   # Linux/Mac
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Windows (in Command Prompt)
   ipconfig
   ```

2. Copy the physical device template:
   ```bash
   cp .env.physical-device .env
   ```

3. Edit `.env` and replace `YOUR_COMPUTER_IP` with your actual IP:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
   EXPO_PUBLIC_WS_URL=ws://192.168.1.10:4000
   ```

4. **Important Requirements:**
   - Your phone and computer must be on the **same WiFi network**
   - Backend server must be running on your computer on port 4000
   - Firewall must allow incoming connections on port 4000

## Rebuilding After Configuration Change

After modifying `.env`, you must restart the Expo development server:

```bash
# Stop the current server (Ctrl+C)
# Clear cache and restart
npx expo start --clear
```

For production builds (EAS):
```bash
eas build --platform android --profile development
```

## Verifying Configuration

1. **Check backend is accessible from your computer:**
   ```bash
   curl http://localhost:4000/health
   ```
   Should return: `{"status":"ok"}`

2. **Check backend is accessible from your phone:**
   - Open browser on your phone
   - Navigate to `http://YOUR_COMPUTER_IP:4000/health`
   - Should see: `{"status":"ok"}`

3. **Test in the app:**
   - Open the mobile app
   - Try to register or login
   - Check for network errors in the console

## Common Network Configurations

### Home WiFi (192.168.x.x)
```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
EXPO_PUBLIC_WS_URL=ws://192.168.1.10:4000
```

### Corporate Network (10.x.x.x)
```env
EXPO_PUBLIC_API_URL=http://10.0.0.5:4000
EXPO_PUBLIC_WS_URL=ws://10.0.0.5:4000
```

### Mobile Hotspot from Computer
```env
EXPO_PUBLIC_API_URL=http://172.20.10.1:4000
EXPO_PUBLIC_WS_URL=ws://172.20.10.1:4000
```

## Troubleshooting

### "Network request failed" Error

**Possible causes:**
1. Backend server is not running
2. Wrong IP address configured in `.env`
3. Phone and computer on different networks
4. Firewall blocking port 4000

**Solutions:**
1. Verify backend is running: `curl http://localhost:4000/health`
2. Double-check your IP address is correct
3. Ensure both devices are on the same WiFi
4. Temporarily disable firewall or add exception for port 4000

### "Connection timeout" Error

**Possible causes:**
1. Backend server is not accessible from the network
2. Firewall is blocking the connection
3. Port 4000 is not exposed

**Solutions:**
1. Test from phone's browser: `http://YOUR_IP:4000/health`
2. Check firewall settings
3. Make sure backend is listening on `0.0.0.0`, not `localhost`

### Changes to .env Not Reflecting

**Solution:**
1. Stop Expo server (Ctrl+C)
2. Clear cache: `npx expo start --clear`
3. For production builds, rebuild the app

## Backend Server Requirements

The mobile app expects the backend to be running on port **4000** (not 3000).

Make sure your backend `.env` file has:
```env
PORT=4000
HOST=0.0.0.0
```

The `HOST=0.0.0.0` is important - it makes the server accessible from other devices on the network, not just localhost.

## Security Note

When using a physical device on a WiFi network:
- Only use this configuration on trusted networks (home/office)
- Do not use on public WiFi without additional security measures
- In production, use HTTPS/WSS with proper SSL certificates

## See Also

- `.env.example` - Full configuration documentation
- `.env.android-emulator` - Android Emulator configuration
- `.env.physical-device` - Physical device template
- Backend README - Backend server setup instructions
