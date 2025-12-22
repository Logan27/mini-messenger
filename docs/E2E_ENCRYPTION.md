# End-to-End Encryption (E2EE) Documentation

## Overview
The Messenger application implements End-to-End Encryption (E2EE) for **Direct Messages (1-on-1 chats)**. This ensures that message content remains confidential and can only be read by the sender and the intended recipient. The backend server stores only encrypted blobs and metadata, without access to the decryption keys or plaintext content.

**Current Limit**: Encryption is currently supported only for Direct Messages, not Group Chats.

## Architecture

### 1. Key Management
*   **Generation**: RSA (or Curve25519 - see Implementation Details) key pairs are generated on the client-side (Frontend) upon account creation or via "Encryption Settings".
*   **Privates Keys**: Stored in `localStorage` (Web) or Secure Storage (Mobile/Native). Never leave the device.
*   **Public Keys**: Uploaded to the backend server and associated with the user's profile.
*   **Retrieval**: When initiating a chat, the sender fetches the recipient's public key from the backend.

### 2. Message Sending Flow
When a user sends an encrypted message:
1.  **Check**: System verifies if it's a Direct Message and if the Recipient has a valid Public Key.
2.  **Encryption (Hybrid Scheme - `encryptDual`)**:
    *   A random symmetrical **Session Key (AES/XSalsa20)** is generated.
    *   The message plaintext is encrypted using this Session Key.
    *   **Dual Key Wrapping**:
        1.  The Session Key is encrypted with the **Recipient's Public Key**.
        2.  The Session Key is *also* encrypted with the **Sender's Public Key** (allowing the sender to read their own sent messages on other authenticated devices).
3.  **Payload Construction**:
    *   `content`: Set to `"🔒 Encrypted Message"` (Placeholder for non-capable clients/notifications).
    *   `encryptedContent`: The actual encrypted ciphertext of the message.
    *   `encryptionMetadata`: Contains the encrypted Session Keys (for both parties), the Nonce/IV, and algorithm details.
    *   `isEncrypted`: Flag set to `true`.
4.  **Transport**: The payload is sent to the backend via WebSocket/REST.

### 3. Backend Handling
The backend is agnostic to the encryption. It:
1.  Receives the message payload.
2.  Maps `camelCase` frontend fields to `snake_case` database columns (`is_encrypted`, `encrypted_content`, `encryption_metadata`).
3.  Stores the message.
4.  Broadcasts the payload to recipients via WebSocket (snake_case properties are preserved).

### 4. Message Receiving/Decryption Flow
When the frontend receives a message:
1.  **Normalization**: The `useMessages` hook normalizes backend data, ensuring `isEncrypted` is `true`.
2.  **Detection**: The `MessageBubble` component detects `isEncrypted: true`.
3.  **Decryption**:
    *   It extracts the encrypted Session Key from `encryptionMetadata`.
    *   It decrypts the Session Key using the User's locally stored **Private Key**.
    *   It decrypts the `encryptedContent` using the Session Key.
4.  **Display**: The decrypted plaintext is rendered in the UI. If decryption fails (e.g., missing keys), an error state or the placeholder text is shown.

## Data Structure

### Frontend Message Object
```typescript
interface Message {
  id: string;
  isEncrypted: boolean;
  encryptedContent?: string;
  encryptionMetadata?: {
    nonce: string;
    algorithm: string;
    // Encrypted session keys
  };
  metadata?: {
      encryptedContentOwner?: string; // Encrypted for Sender
      nonceOwner?: string;
  }
}
```

### Database Schema (Messages Table)
| Column | Type | Description |
| :--- | :--- | :--- |
| `is_encrypted` | `BOOLEAN` | Flag indicating E2EE. |
| `encrypted_content` | `TEXT` | Ciphertext of the message body. |
| `encryption_metadata`| `JSONB` | Stores keys and IVs. |
| `content` | `TEXT` | Placeholder text (usually "🔒 Encrypted Message"). |

## Troubleshooting & Debugging

### Common Issues
*   **"Message has 'Encrypted Message' text but isEncrypted is FALSE"**:
    *   **Cause**: Data transformation issue. The `isEncrypted` flag was lost during the path from Backend -> Hook -> Component.
    *   **Fix**: Ensure `Index.tsx` (or parent components) explicitly passes `isEncrypted`, `encryptedContent`, etc., when mapping message lists.
*   **Decryption Error**:
    *   **Cause**: The private key on the current device does not match the public key used by the sender. Common after clearing browser storage or logging in on a new device without key syncing.

## Future Improvements
*   **Group Encryption**: Implement Sender Keys or Pairwise encryption for group members.
*   **Key Rotation**: Mechanism to rotate keys is supported. The system retains a history of old private keys to ensure previously encrypted messages remain decryptable.
*   **Device Sync**: Securely syncing private keys between user's devices.
