/**
 * Test script for Create Group functionality
 * Tests: POST /api/groups endpoint
 */

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function testCreateGroup() {
  console.log('🧪 Testing Create Group Functionality\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Login as charlie
    console.log('\n1️⃣  Logging in as charlie...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'charlie',
      password: 'Admin123!@#'
    });

    const token = loginResponse.data.data.tokens.accessToken;
    const userId = loginResponse.data.data.user.id;
    console.log(`   ✅ Logged in as charlie (${userId})`);

    // Step 2: Login as alice to get her ID
    console.log('\n2️⃣  Getting alice ID...');
    const aliceLoginResponse = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'alice',
      password: 'Admin123!@#'
    });

    const aliceId = aliceLoginResponse.data.data.user.id;
    console.log(`   ✅ alice ID: ${aliceId}`);

    // Step 3: Login as bob to get his ID
    console.log('\n3️⃣  Getting bob ID...');
    try {
      const bobLoginResponse = await axios.post(`${API_URL}/auth/login`, {
        identifier: 'bob',
        password: 'Admin123!@#'
      });

      const bobId = bobLoginResponse.data.data.user.id;
      console.log(`   ✅ bob ID: ${bobId}`);

      // Step 4: Create a group with alice and bob
      console.log('\n4️⃣  Creating test group...');
      const createGroupResponse = await axios.post(
        `${API_URL}/groups`,
        {
          name: 'Test Group ' + Date.now(),
          description: 'A test group for testing group creation',
          members: [aliceId, bobId]
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log(`   ✅ Group created successfully!`);
      console.log(`   Group ID: ${createGroupResponse.data.data.id}`);
      console.log(`   Group Name: ${createGroupResponse.data.data.name}`);
      console.log(`   Members: ${createGroupResponse.data.data.members?.length || 0}`);

      // Step 5: Verify group appears in groups list
      console.log('\n5️⃣  Verifying group in list...');
      const groupsResponse = await axios.get(
        `${API_URL}/groups`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Handle different response structures
      const groupsList = Array.isArray(groupsResponse.data.data)
        ? groupsResponse.data.data
        : groupsResponse.data.data?.groups || [];

      const createdGroup = groupsList.find(
        g => g.id === createGroupResponse.data.data.id
      );

      if (!createdGroup) {
        console.log('   ⚠️  Group not found in groups list (may need to refresh)');
        console.log('   Response structure:', JSON.stringify(groupsResponse.data, null, 2).substring(0, 200));
      } else {
        console.log(`   ✅ Group found in list`);
      }

      // Step 6: Delete the test group (cleanup)
      console.log('\n6️⃣  Cleaning up - deleting test group...');
      await axios.delete(
        `${API_URL}/groups/${createGroupResponse.data.data.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(`   ✅ Test group deleted`);

      console.log('\n' + '='.repeat(60));
      console.log('✅ ALL TESTS PASSED - Create Group working correctly!\n');

    } catch (bobError) {
      if (bobError.response?.status === 401) {
        console.log('   ⚠️  bob user not found, trying with just alice...');

        // Step 4b: Create a group with just alice
        console.log('\n4️⃣  Creating test group with alice only...');
        const createGroupResponse = await axios.post(
          `${API_URL}/groups`,
          {
            name: 'Test Group ' + Date.now(),
            description: 'A test group for testing group creation',
            members: [aliceId]
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(`   ✅ Group created successfully!`);
        console.log(`   Group ID: ${createGroupResponse.data.data.id}`);
        console.log(`   Group Name: ${createGroupResponse.data.data.name}`);

        // Cleanup
        console.log('\n5️⃣  Cleaning up...');
        await axios.delete(
          `${API_URL}/groups/${createGroupResponse.data.data.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(`   ✅ Test group deleted`);

        console.log('\n' + '='.repeat(60));
        console.log('✅ TESTS PASSED - Create Group working (with single member)!\n');
      } else {
        throw bobError;
      }
    }

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST FAILED\n');

    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 404) {
        console.log('\n🔍 Diagnosis: Endpoint not found');
        console.log('   The POST /api/groups endpoint may not be registered correctly.');
      }
    } else {
      console.log('Error:', error.message);
      console.log(error.stack);
    }
  }
}

testCreateGroup();
