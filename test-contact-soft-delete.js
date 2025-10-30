/**
 * Test script for Add Contact soft delete handling
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

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data.tokens.accessToken;
    const userId = loginResponse.data.data.user.id;
    console.log(`   ✅ Logged in as charlie (${userId})`);

    // Step 2: Login as alice to get their ID
    console.log('\n2️⃣  Getting alice ID...');
    const login2Response = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'alice',
      password: 'Admin123!@#'
    });

    if (!login2Response.data.success) {
      throw new Error('Login as alice failed');
    }

    const contactUserId = login2Response.data.data.user.id;
    console.log(`   ✅ alice ID: ${contactUserId}`);

    // Step 2.5: Clean up - delete any existing contact first
    console.log('\n2.5️⃣  Cleaning up any existing contacts...');
    try {
      const existingContacts = await axios.get(
        `${API_URL}/contacts?status=accepted`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aliceContact = existingContacts.data.data.find(
        c => c.user?.id === contactUserId
      );

      if (aliceContact) {
        await axios.delete(
          `${API_URL}/contacts/${aliceContact.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(`   ✅ Deleted existing contact`);
      } else {
        console.log(`   ℹ️  No existing contact to clean up`);
      }
    } catch (error) {
      console.log(`   ℹ️  No existing contact or cleanup failed (continuing...)`);
    }

    // Step 3: Add contact (alice)
    console.log('\n3️⃣  Adding alice as contact...');
    try {
      const addResponse = await axios.post(
        `${API_URL}/contacts`,
        { userId: contactUserId },  // API expects 'userId', not 'contactUserId'
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(`   ✅ Contact added successfully`);
      console.log(`   Contact ID: ${addResponse.data.data.id}`);
      console.log(`   Status: ${addResponse.data.data.status}`);
    } catch (error) {
      if (error.response?.data?.message?.includes('already') || error.response?.data?.error?.includes('already')) {
        console.log(`   ⚠️  Contact already exists: ${error.response?.data?.message || error.response?.data?.error}`);
        console.log(`   Full error:`, JSON.stringify(error.response?.data, null, 2));
      } else {
        throw error;
      }
    }

    // Step 4: Get the contact ID from the add response
    // Since we just added it, we already have the contact object
    console.log('\n4️⃣  Getting contact from add response...');

    // The contact we just added/restored
    let contact = null;

    // Try to get the contact ID from step 3's response
    // If step 3 succeeded, we should have the contact
    // If step 3 caught the "already exists" error, we need to query for it
    try {
      // For testing purposes, make another add request to get the contact details
      const testAddResponse = await axios.post(
        `${API_URL}/contacts`,
        { userId: contactUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      contact = testAddResponse.data.data;
    } catch (error) {
      // If it throws "already pending", that's fine - we know it exists
      if (error.response?.data?.error?.includes('already pending')) {
        console.log('   ✅ Contact request is pending (as expected)');

        // We need to find it manually - it should be in the database
        // For now, let's use the contact ID we got from step 3 (06ccd858-d301-465f-a510-89e4c50008aa)
        // Actually, let's accept the pending request as alice to make it accepted
        // First, login as alice
        console.log('\n4.5️⃣  Logging in as alice to accept the request...');
        const aliceToken = login2Response.data.data.tokens.accessToken;

        // Get alice's pending incoming requests
        const alicePendingResponse = await axios.get(
          `${API_URL}/contacts?status=pending`,
          { headers: { Authorization: `Bearer ${aliceToken}` } }
        );

        const pendingRequest = alicePendingResponse.data.data.find(
          c => c.user?.id === userId  // Request from charlie
        );

        if (pendingRequest) {
          console.log(`   ✅ Found pending request from charlie: ${pendingRequest.id}`);

          // Accept the request
          await axios.post(
            `${API_URL}/contacts/${pendingRequest.id}/accept`,
            {},
            { headers: { Authorization: `Bearer ${aliceToken}` } }
          );
          console.log(`   ✅ Alice accepted charlie's contact request`);

          // Now charlie should be able to see alice in accepted contacts
          contact = { id: pendingRequest.id, status: 'accepted' };
        } else {
          throw new Error('Could not find pending request from charlie');
        }
      } else {
        throw error;
      }
    }

    if (!contact) {
      console.log('   ❌ Contact not found');
      return;
    }

    console.log(`   ✅ Contact ready for testing: ${contact.id} (status: ${contact.status})`);

    // Step 5: Delete contact
    console.log('\n5️⃣  Deleting contact (soft delete)...');
    const deleteResponse = await axios.delete(
      `${API_URL}/contacts/${contact.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`   ✅ Contact deleted successfully`);

    // Step 6: Verify contact is soft-deleted (not in list)
    console.log('\n6️⃣  Verifying contact is removed from list...');
    const verifyResponse = await axios.get(
      `${API_URL}/contacts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const stillExists = verifyResponse.data.data.find(
      c => c.contactUserId === contactUserId || c.contactUser?.id === contactUserId
    );

    if (stillExists) {
      console.log('   ❌ Contact still exists after deletion');
      return;
    }
    console.log(`   ✅ Contact no longer in list (soft-deleted)`);

    // Step 7: Re-add the same contact (THE CRITICAL TEST)
    console.log('\n7️⃣  Re-adding the same contact (testing soft delete restore)...');
    const readdResponse = await axios.post(
      `${API_URL}/contacts`,
      { userId: contactUserId },  // API expects 'userId', not 'contactUserId'
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!readdResponse.data.success) {
      console.log('   ❌ Re-add failed:', readdResponse.data.error);
      return;
    }

    console.log(`   ✅ Contact re-added successfully!`);
    console.log(`   Contact ID: ${readdResponse.data.data.id}`);
    console.log(`   Status: ${readdResponse.data.data.status}`);
    console.log(`   UserId: ${readdResponse.data.data.userId}`);
    console.log(`   ContactUserId: ${readdResponse.data.data.contactUserId}`);

    // Step 8: Verify contact is back in list
    console.log('\n8️⃣  Verifying contact is back in list...');
    const finalResponse = await axios.get(
      `${API_URL}/contacts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const restored = finalResponse.data.data.find(
      c => c.contactUserId === contactUserId || c.contactUser?.id === contactUserId
    );

    if (!restored) {
      console.log('   ❌ Contact not found in list after re-add');
      return;
    }

    console.log(`   ✅ Contact restored and visible in list`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - Soft delete fix working!\n');

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
