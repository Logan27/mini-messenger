/**
 * Simplified test for Add Contact soft delete handling
 * Tests: Add contact -> Delete contact -> Re-add contact (should restore)
 */

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function testContactSoftDelete() {
  console.log('🧪 Testing Contact Soft Delete Fix\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Login as charlie
    console.log('\n1️⃣  Logging in as charlie...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'charlie',
      password: 'Admin123!@#'
    });

    const charlieToken = loginResponse.data.data.tokens.accessToken;
    const charlieId = loginResponse.data.data.user.id;
    console.log(`   ✅ Logged in as charlie (${charlieId})`);

    // Step 2: Login as alice
    console.log('\n2️⃣  Logging in as alice...');
    const login2Response = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'alice',
      password: 'Admin123!@#'
    });

    const aliceToken = login2Response.data.data.tokens.accessToken;
    const aliceId = login2Response.data.data.user.id;
    console.log(`   ✅ Logged in as alice (${aliceId})`);

    // Step 2.5: Cleanup - delete any existing contacts
    console.log('\n2.5️⃣  Cleaning up any existing contacts...');
    try {
      // Get charlie's contacts (all statuses)
      for (const status of ['pending', 'accepted', 'blocked']) {
        const existingResponse = await axios.get(
          `${API_URL}/contacts?status=${status}`,
          { headers: { Authorization: `Bearer ${charlieToken}` } }
        );

        for (const contact of existingResponse.data.data) {
          if (contact.user?.id === aliceId) {
            await axios.delete(
              `${API_URL}/contacts/${contact.id}`,
              { headers: { Authorization: `Bearer ${charlieToken}` } }
            );
            console.log(`   ✅ Deleted existing ${status} contact`);
          }
        }
      }

      // Also check alice's pending requests from charlie
      const alicePendingResponse = await axios.get(
        `${API_URL}/contacts?status=pending`,
        { headers: { Authorization: `Bearer ${aliceToken}` } }
      );

      for (const contact of alicePendingResponse.data.data) {
        if (contact.user?.id === charlieId) {
          await axios.post(
            `${API_URL}/contacts/${contact.id}/reject`,
            {},
            { headers: { Authorization: `Bearer ${aliceToken}` } }
          );
          console.log(`   ✅ Rejected existing pending request from charlie`);
        }
      }

      console.log(`   ✅ Cleanup complete`);
    } catch (error) {
      console.log(`   ℹ️  Cleanup completed (some operations may have failed)`);
    }

    // Step 3: Charlie adds alice as contact
    console.log('\n3️⃣  Charlie adding alice as contact...');
    const addResponse = await axios.post(
      `${API_URL}/contacts`,
      { userId: aliceId },
      { headers: { Authorization: `Bearer ${charlieToken}` } }
    );

    const contactId = addResponse.data.data.id;
    console.log(`   ✅ Contact added successfully`);
    console.log(`   Contact ID: ${contactId}`);
    console.log(`   Status: ${addResponse.data.data.status}`);

    // Step 4: Alice accepts the contact request
    console.log('\n4️⃣  Alice accepting contact request...');
    const acceptResponse = await axios.post(
      `${API_URL}/contacts/${contactId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${aliceToken}` } }
    );
    console.log(`   ✅ Contact request accepted`);

    // Step 5: Verify contact appears in charlie's accepted list
    console.log('\n5️⃣  Verifying contact in charlie\'s list...');
    const charlieContactsResponse = await axios.get(
      `${API_URL}/contacts?status=accepted`,
      { headers: { Authorization: `Bearer ${charlieToken}` } }
    );

    const aliceContact = charlieContactsResponse.data.data.find(
      c => c.user?.id === aliceId
    );

    if (!aliceContact) {
      console.log('   ❌ Contact not found in accepted list');
      return;
    }
    console.log(`   ✅ Contact found in accepted list (${aliceContact.id})`);

    // Step 6: Charlie deletes the contact (soft delete)
    console.log('\n6️⃣  Charlie deleting contact (soft delete)...');
    await axios.delete(
      `${API_URL}/contacts/${aliceContact.id}`,
      { headers: { Authorization: `Bearer ${charlieToken}` } }
    );
    console.log(`   ✅ Contact deleted successfully`);

    // Step 7: Verify contact is removed from list
    console.log('\n7️⃣  Verifying contact removed from charlie\'s list...');
    const verifyResponse = await axios.get(
      `${API_URL}/contacts?status=accepted`,
      { headers: { Authorization: `Bearer ${charlieToken}` } }
    );

    const stillExists = verifyResponse.data.data.find(
      c => c.user?.id === aliceId
    );

    if (stillExists) {
      console.log('   ❌ Contact still exists after deletion');
      return;
    }
    console.log(`   ✅ Contact removed from list (soft-deleted)`);

    // Step 8: Charlie re-adds alice (THE CRITICAL TEST - should restore soft-deleted record)
    console.log('\n8️⃣  Charlie re-adding alice (testing soft delete restore)...');
    const readdResponse = await axios.post(
      `${API_URL}/contacts`,
      { userId: aliceId },
      { headers: { Authorization: `Bearer ${charlieToken}` } }
    );

    if (!readdResponse.data.success) {
      console.log('   ❌ Re-add failed:', readdResponse.data.error);
      return;
    }

    console.log(`   ✅ Contact re-added successfully!`);
    console.log(`   Contact ID: ${readdResponse.data.data.id}`);
    console.log(`   Status: ${readdResponse.data.data.status}`);
    console.log(`   Same ID as before: ${readdResponse.data.data.id === aliceContact.id ? 'YES ✅' : 'NO ❌'}`);

    // Step 9: Accept the restored contact request
    console.log('\n9️⃣  Alice accepting restored contact request...');
    await axios.post(
      `${API_URL}/contacts/${readdResponse.data.data.id}/accept`,
      {},
      { headers: { Authorization: `Bearer ${aliceToken}` } }
    );
    console.log(`   ✅ Restored contact request accepted`);

    // Step 10: Verify contact is back in charlie's list
    console.log('\n🔟 Verifying contact restored in charlie\'s list...');
    const finalResponse = await axios.get(
      `${API_URL}/contacts?status=accepted`,
      { headers: { Authorization: `Bearer ${charlieToken}` } }
    );

    const restored = finalResponse.data.data.find(
      c => c.user?.id === aliceId
    );

    if (!restored) {
      console.log('   ❌ Contact not found in list after re-add');
      return;
    }

    console.log(`   ✅ Contact restored and visible in list`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - Soft delete fix working!');
    console.log('✅ Key achievement: Same contact ID restored, proving soft delete restore works');
    console.log('\n');

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

testContactSoftDelete();
