# Encryption & Security Deep Dive Test Cases

## TC-SEC-001: Dual Encryption (Multi-Device Support)

**Context:** The application uses a "Dual Encryption" scheme where every sent message is encrypted twice: once for the recipient and once for the sender (using the sender's own public key). This allows the sender to read their own sent messages on other logged-in devices.

### Test Scenario 1.1: Sender Self-Decryption on Secondary Device
**Priority:** Critical
**Requirement:** FR-MS-012, Multi-Device Support

**Preconditions:**
- User A is logged in on **Device 1** (e.g., Chrome).
- User A is also logged in on **Device 2** (e.g., Firefox or Incognito).
- Both devices have valid keys setup (synced or manually imported).

**Test Steps:**
1. From **Device 1**, send an encrypted message to User B: "Dual encryption test".
2. Verify message is displayed correctly (decrypted) on **Device 1**.
3. Switch to **Device 2**.
4. Open the same conversation with User B.
5. Observe the sent message "Dual encryption test".

**Expected Results:**
- Message is visible and decrypted on **Device 2**.
- System used the `encryptedContentOwner` field (metadata) to decrypt using User A's private key.
- If this fails (message shows "🔒 Encrypted Message"), Dual Encryption is broken or keys are not synced.

---

### Test Scenario 1.2: Verify Dual Encryption Payload
**Priority:** High
**Requirement:** FR-MS-012

**Test Steps:**
1. Open Network tab in DevTools.
2. Send an encrypted message.
3. Inspect the WebSocket frame or API request payload.

**Expected Results:**
- Payload must contain `encryptionMetadata` object.
- `encryptionMetadata` must contain `nonce` (for recipient).
- `encryptionMetadata` must contain `encryptedContentOwner` (ciphertext for self).
- `encryptionMetadata` must contain `nonceOwner` (nonce for self).
- `isEncrypted` must be `true`.

---

## TC-SEC-002: Key Backup & Recovery

**Context:** Private keys are stored in `localStorage`. If cache is cleared or user changes devices, they lose access to old messages unless they backup and restore keys.

### Test Scenario 2.1: Encrypted Key Backup Export
**Priority:** Critical
**Requirement:** FR-SC-004

**Test Steps:**
1. Go to **Settings > Security > Encryption**.
2. Click "Backup Keys".
3. Enter a strong password for the backup.
4. Download the backup file (JSON).
5. Inspect the downloaded file (open in text editor).

**Expected Results:**
- File contains a JSON object.
- Key data is NOT in plain text.
- Data looks like random base64 strings (AES-GCM encrypted).
- No private key material is visible without the password.

---

### Test Scenario 2.2: Restore Keys with Correct Password
**Priority:** Critical
**Requirement:** FR-SC-004

**Test Steps:**
1. **Destructive:** Click "Clear Keys" or clear browser storage to lose access.
2. Verify existing encrypted messages now show "🔒 Encrypted Message" (cannot decrypt).
3. Go to **Settings > Security > Encryption**.
4. Click "Restore Keys".
5. Upload the backup file from Scenario 2.1.
6. Enter the **correct** password.
7. Click Restore.

**Expected Results:**
- Success message: "Keys restored successfully".
- Navigate back to chat.
- Previously unreadable "🔒 Encrypted Message" bubbles are now decrypted and readable.
- New messages can be sent/received.

---

### Test Scenario 2.3: Restore Keys with Incorrect Password
**Priority:** High
**Requirement:** FR-SC-004

**Test Steps:**
1. Click "Restore Keys".
2. Upload valid backup file.
3. Enter an **incorrect** password.
4. Click Restore.

**Expected Results:**
- Error message: "Decryption failed" or "Invalid password".
- Keys are NOT restored.
- Existing messages remain unreadable.

---

## TC-SEC-003: Key Rotation & History

**Context:** When a user generates a new key pair (Rotation), old keys should be kept in history to decrypt *old* messages, while the *new* key is used for new messages.

### Test Scenario 3.1: Key Rotation Flow
**Priority:** High
**Requirement:** FR-SC-004

**Test Steps:**
1. Send "Message A" (encrypted with Key Pair 1).
2. Go to **Settings > Security > Encryption**.
3. Click "Rotate Keys" (Generate New Keys).
4. Send "Message B" (encrypted with Key Pair 2).
5. Reload the page (forces fresh decryption).
6. View conversation.

**Expected Results:**
- **Message A** is readable (decrypted using Key 1 from history).
- **Message B** is readable (decrypted using active Key 2).
- Inspection of `localStorage` (key `encryption_key_history`) should show multiple private keys.

---

### Test Scenario 3.2: Receiving Message During Key Rotation
**Priority:** Medium
**Requirement:** FR-MS-012

**Test Steps:**
1. User A rotates keys.
2. User B (who might have cached User A's *old* public key) sends a message immediately.
3. User A receives the message.

**Expected Results:**
- If User B used the old key, User A should still be able to decrypt it (because old private key is in history).
- If User B fetched the new key, User A decrypts with new key.
- **Fail condition:** User A sees "🔒 Encrypted Message" because they deleted the old key during rotation without saving it to history.

---

## TC-SEC-004: Implementation Details & Edge Cases

### Test Scenario 4.1: Group vs. Direct Encryption Indicators
**Priority:** Medium
**Requirement:** FR-MS-012 vs Server-Side Encryption

**Test Steps:**
1. Open a **Direct Message (1-on-1)**.
2. Open a **Group Chat**.
3. Compare the UI indicators.

**Expected Results:**
- **Direct Message:** specific icon/text indicating "End-to-End Encrypted" (e.g., Gold Padlock).
- **Group Chat:** different icon/text indicating "Server Encrypted" or "Secure" (e.g., Grey Padlock or Shield).
- Clicking the indicator explains the difference (E2E vs Server-Side).

### Test Scenario 4.2: Missing Metadata Handling
**Priority:** Low
**Requirement:** Robustness

**Test Steps:**
1. (Requires API/DevTools manipulation) Intercept an outgoing encrypted message.
2. Remove the `nonce` from `encryptionMetadata`.
3. Send the modified payload.

**Expected Results:**
- Recipient client should **not** crash.
- Recipient should display "🔒 Encrypted Message" or an error placeholder.
- Console should log a warning about missing nonce.

---

## TC-SEC-005: Performance & Limits

### Test Scenario 5.1: Large Message Encryption
**Priority:** Medium
**Requirement:** Performance

**Test Steps:**
1. Generate a text message of 10,000 characters.
2. Send to recipient.
3. Observe send latency.

**Expected Results:**
- No noticeable UI freeze during "Encrypting..." phase.
- Message sends within normal latency limits (<1s).
- Decryption on recipient side is instant (<100ms).

### Test Scenario 5.2: Rapid Fire Encryption
**Priority:** Medium
**Requirement:** Performance

**Test Steps:**
1. Rapidly send 10 encrypted messages (spam enter).

**Expected Results:**
- All 10 messages encrypt and send successfully.
- Nonces are unique for every message (critical for security).
- Messages arrive in order and are readable.
