# Firebase Push Notifications - Local Testing Setup

## Step 1: Get Firebase Configuration

### Frontend Configuration (Web App)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one)
3. Click the gear icon > Project Settings
4. Scroll down to "Your apps" section
5. Click "Add app" > Web icon
6. Register your app (name: "Messenger Web")
7. Copy the configuration values

### Backend Configuration (Service Account)

**Option A: Service Account JSON File** (Recommended for local testing)

1. In Firebase Console > Project Settings
2. Go to "Service Accounts" tab
3. Click "Generate new private key"
4. Save the JSON file as `backend/firebase-service-account.json`

**Option B: Environment Variables** (Production)

Get these from the downloaded service account JSON:
- `project_id`
- `client_email`
- `private_key`

### VAPID Key (Web Push Certificates)

1. In Firebase Console > Project Settings
2. Go to "Cloud Messaging" tab
3. Under "Web Push certificates"
4. Click "Generate key pair"
5. Copy the Key pair value

## Step 2: Configure Backend

Add to `backend/.env`:

```bash
# =====================================
# FIREBASE PUSH NOTIFICATIONS
# =====================================

# Option A: Service Account File (easier for local testing)
FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json

# Option B: Environment Variables (better for production)
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

## Step 3: Configure Frontend

Add to `frontend/.env`:

```bash
# Firebase Web Configuration
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_VAPID_KEY=BIxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 4: Create Service Worker

The service worker is required for receiving notifications in the background.

**Already created:** `frontend/public/firebase-messaging-sw.js`

If missing, create it with the Firebase config.

## Step 5: Test Locally

1. **Start Backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Enable Notifications:**
   - Login to the app
   - Go to Settings > Security
   - Find "Push Notifications" card
   - Click "Enable Push Notifications"
   - Allow browser permission when prompted

4. **Test:**
   - Send a message from another user
   - You should receive a push notification
   - Check browser console for any errors

## Troubleshooting

### Backend Not Initializing Firebase

Check backend logs for:
```
Firebase Admin SDK initialized with service account file
```

If you see warnings:
- Verify `firebase-service-account.json` exists in `backend/` directory
- OR verify environment variables are set correctly

### Frontend Firebase Errors

Check browser console for:
```
Firebase initialized successfully
```

Common issues:
- **"Firebase configuration not complete"**: Missing env variables
- **"messaging/permission-blocked"**: Browser notifications blocked
- **"messaging/token-subscribe-failed"**: Invalid VAPID key

### No Notifications Received

1. Check notification permission: Settings > Site Settings > Notifications
2. Verify service worker is registered: DevTools > Application > Service Workers
3. Check backend logs for FCM send errors
4. Verify device token is registered: Check database `device_tokens` table

## Quick Test Script

Create `backend/test-push-notification.js`:

```javascript
import fcmService from './src/services/fcmService.js';

const testToken = 'YOUR_DEVICE_TOKEN_HERE'; // Get from browser console

fcmService.sendPushNotification(
  testToken,
  'Test Notification',
  'This is a test message from backend'
).then(result => {
  console.log('Test result:', result);
});
```

Run:
```bash
node backend/test-push-notification.js
```

## Database Migration

Push notifications require the `device_tokens` table. Run migration:

```bash
cd backend
npm run migrate
```

## Security Notes

- **Never commit** `firebase-service-account.json` to git
- Add to `.gitignore`:
  ```
  firebase-service-account.json
  *-firebase-adminsdk-*.json
  ```
- In production, use environment variables, not service account file
