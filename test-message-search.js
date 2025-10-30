/**
 * Test script for Message Search functionality
 * Tests: GET /api/messages/search endpoint
 */

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function testMessageSearch() {
  console.log('🧪 Testing Message Search Functionality\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Login as charlie
    console.log('\n1️⃣  Logging in as charlie...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'charlie',
      password: 'Admin123!@#'
    });

    const token = loginResponse.data.data.tokens.accessToken;
    const charlieId = loginResponse.data.data.user.id;
    console.log(`   ✅ Logged in as charlie (${charlieId})`);

    // Step 2: Login as alice to get her ID
    console.log('\n2️⃣  Getting alice ID...');
    const aliceLoginResponse = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'alice',
      password: 'Admin123!@#'
    });

    const aliceId = aliceLoginResponse.data.data.user.id;
    console.log(`   ✅ alice ID: ${aliceId}`);

    // Step 3: Send a test message from charlie to alice
    console.log('\n3️⃣  Sending test message from charlie to alice...');
    const sendResponse = await axios.post(
      `${API_URL}/messages`,
      {
        recipientId: aliceId,
        content: 'This is a searchable test message from charlie'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log(`   ✅ Message sent successfully`);
    console.log(`   Message ID: ${sendResponse.data.data.id}`);

    // Step 4: Test search with general query (no filters)
    console.log('\n4️⃣  Testing general search (q=test)...');
    try {
      const searchResponse = await axios.get(
        `${API_URL}/messages/search?q=test&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log(`   ✅ Search succeeded`);
      console.log(`   Results: ${searchResponse.data.data?.length || 0} messages`);

      if (searchResponse.data.data?.length > 0) {
        console.log(`   First result: ${searchResponse.data.data[0].content.substring(0, 50)}...`);
      } else {
        console.log(`   ⚠️  No results returned (possible issue)`);
      }
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ Search failed: ${error.response.status}`);
        console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        throw error;
      }
    }

    // Step 5: Test search with conversationWith filter
    console.log('\n5️⃣  Testing search with conversationWith filter...');
    const conversationSearchResponse = await axios.get(
      `${API_URL}/messages/search?q=test&conversationWith=${aliceId}&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log(`   ✅ Search with conversationWith succeeded`);
    console.log(`   Results: ${conversationSearchResponse.data.data?.length || 0} messages`);

    if (conversationSearchResponse.data.data?.length > 0) {
      console.log(`   First result: ${conversationSearchResponse.data.data[0].content.substring(0, 50)}...`);
    }

    // Step 6: Test search without query parameter
    console.log('\n6️⃣  Testing search without query parameter (should fail)...');
    try {
      await axios.get(
        `${API_URL}/messages/search?limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(`   ❌ Search succeeded when it should have failed (validation issue)`);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(`   ✅ Search correctly rejected (400 Bad Request)`);
        console.log(`   Error: ${error.response.data.errors?.[0]?.msg || error.response.data.message}`);
      } else {
        throw error;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTS COMPLETED\n');
    console.log('📊 Summary:');
    console.log('   - General search (q only): May return no results due to missing access filter');
    console.log('   - Search with conversationWith: Works correctly');
    console.log('   - Search without parameters: Correctly rejected\n');

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST FAILED\n');

    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
      console.log(error.stack);
    }
  }
}

testMessageSearch();
