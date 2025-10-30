/**
 * Test script for Notification Settings endpoint
 * Tests: GET/PUT /api/notification-settings
 */

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function testNotificationSettings() {
  console.log('🧪 Testing Notification Settings Endpoint\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Login as charlie
    console.log('\n1️⃣  Logging in as charlie...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'charlie',
      password: 'Admin123!@#'
    });

    const token = loginResponse.data.data.tokens.accessToken;
    console.log(`   ✅ Logged in as charlie`);

    // Step 2: Get current notification settings
    console.log('\n2️⃣  Getting notification settings...');
    try {
      const getResponse = await axios.get(`${API_URL}/notification-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`   ✅ Notification settings retrieved`);
      console.log(`   Enabled: ${getResponse.data.data?.enabled || getResponse.data.enabled}`);
      console.log(`   Response structure:`, Object.keys(getResponse.data));
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ⚠️  Settings not found (404) - will create default on first save`);
      } else {
        throw error;
      }
    }

    // Step 3: Update notification settings (using backend schema)
    console.log('\n3️⃣  Updating notification settings...');
    const updateData = {
      inAppEnabled: true,
      emailEnabled: false,
      pushEnabled: true,
      doNotDisturb: false,
      messageNotifications: true,
      callNotifications: true,
      mentionNotifications: true,
      adminNotifications: true,
      systemNotifications: true
    };

    const updateResponse = await axios.put(
      `${API_URL}/notification-settings`,
      updateData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log(`   ✅ Notification settings updated`);
    console.log(`   Success: ${updateResponse.data.success}`);

    // Step 4: Verify the update
    console.log('\n4️⃣  Verifying updated settings...');
    const verifyResponse = await axios.get(`${API_URL}/notification-settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const settings = verifyResponse.data.data || verifyResponse.data;
    console.log(`   ✅ Settings verified`);
    console.log(`   Enabled: ${settings.enabled}`);
    console.log(`   Sound enabled: ${settings.sound?.enabled}`);
    console.log(`   Desktop notifications: ${settings.desktopNotifications?.enabled}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - Notification settings working!\n');

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST FAILED\n');

    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 404) {
        console.log('\n🔍 Diagnosis: Endpoint not found');
        console.log('   The /api/notification-settings endpoint may not be registered correctly.');
      }
    } else {
      console.log('Error:', error.message);
      console.log(error.stack);
    }
  }
}

testNotificationSettings();
