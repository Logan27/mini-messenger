import crypto from 'crypto';

import sodium from 'libsodium-wrappers';

/**
 * E2E Encryption Utility using libsodium (NaCl)
 * Provides key pair generation, Diffie-Hellman key exchange, and message encryption
 */

class EncryptionService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize libsodium (must be called before using any methods)
   */
  async init() {
    if (!this.initialized) {
      await sodium.ready;
      this.initialized = true;
    }
  }

  /**
   * Generate a new keypair for E2E encryption
   * @returns {Object} { publicKey: base64, privateKey: base64 }
   */
  async generateKeyPair() {
    await this.init();
    const keyPair = sodium.crypto_box_keypair();

    return {
      publicKey: sodium.to_base64(keyPair.publicKey),
      privateKey: sodium.to_base64(keyPair.privateKey),
    };
  }

  /**
   * Perform Diffie-Hellman key exchange to derive shared secret
   * @param {string} myPrivateKeyBase64 - Sender's private key (base64)
   * @param {string} theirPublicKeyBase64 - Recipient's public key (base64)
   * @returns {Uint8Array} Shared secret
   */
  async deriveSharedSecret(myPrivateKeyBase64, theirPublicKeyBase64) {
    await this.init();

    const myPrivateKey = sodium.from_base64(myPrivateKeyBase64);
    const theirPublicKey = sodium.from_base64(theirPublicKeyBase64);

    // Compute shared secret using scalarmult (X25519)
    const sharedSecret = sodium.crypto_scalarmult(myPrivateKey, theirPublicKey);

    return sharedSecret;
  }

  /**
   * Encrypt a message using crypto_box (authenticated encryption)
   * @param {string} message - Plaintext message
   * @param {string} myPrivateKeyBase64 - Sender's private key
   * @param {string} theirPublicKeyBase64 - Recipient's public key
   * @returns {string} Base64-encoded encrypted message with nonce
   */
  async encryptMessage(message, myPrivateKeyBase64, theirPublicKeyBase64) {
    await this.init();

    const myPrivateKey = sodium.from_base64(myPrivateKeyBase64);
    const theirPublicKey = sodium.from_base64(theirPublicKeyBase64);
    const messageBytes = sodium.from_string(message);

    // Generate random nonce (24 bytes for crypto_box)
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

    // Encrypt using crypto_box (Curve25519, XSalsa20, Poly1305)
    const ciphertext = sodium.crypto_box_easy(messageBytes, nonce, theirPublicKey, myPrivateKey);

    // Combine nonce + ciphertext for storage
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce);
    combined.set(ciphertext, nonce.length);

    return sodium.to_base64(combined);
  }

  /**
   * Decrypt a message using crypto_box
   * @param {string} encryptedBase64 - Base64-encoded encrypted message with nonce
   * @param {string} myPrivateKeyBase64 - Recipient's private key
   * @param {string} theirPublicKeyBase64 - Sender's public key
   * @returns {string} Decrypted plaintext message
   */
  async decryptMessage(encryptedBase64, myPrivateKeyBase64, theirPublicKeyBase64) {
    await this.init();

    const myPrivateKey = sodium.from_base64(myPrivateKeyBase64);
    const theirPublicKey = sodium.from_base64(theirPublicKeyBase64);
    const combined = sodium.from_base64(encryptedBase64);

    // Extract nonce and ciphertext
    const nonce = combined.slice(0, sodium.crypto_box_NONCEBYTES);
    const ciphertext = combined.slice(sodium.crypto_box_NONCEBYTES);

    // Decrypt
    const decryptedBytes = sodium.crypto_box_open_easy(
      ciphertext,
      nonce,
      theirPublicKey,
      myPrivateKey
    );

    if (!decryptedBytes) {
      throw new Error('Decryption failed: invalid key or corrupted data');
    }

    return sodium.to_string(decryptedBytes);
  }

  /**
   * Encrypt data using AES-256-GCM (for server-side group message encryption)
   * @param {string} plaintext - Data to encrypt
   * @param {string} encryptionKeyBase64 - Base64-encoded 256-bit encryption key
   * @returns {Object} { ciphertext: base64, iv: base64, authTag: base64 }
   */
  encryptAES256(plaintext, encryptionKeyBase64) {
    const key = Buffer.from(encryptionKeyBase64, 'base64');
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {string} ciphertextBase64 - Base64-encoded ciphertext
   * @param {string} ivBase64 - Base64-encoded IV
   * @param {string} authTagBase64 - Base64-encoded authentication tag
   * @param {string} encryptionKeyBase64 - Base64-encoded 256-bit encryption key
   * @returns {string} Decrypted plaintext
   */
  decryptAES256(ciphertextBase64, ivBase64, authTagBase64, encryptionKeyBase64) {
    const key = Buffer.from(encryptionKeyBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertextBase64, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  /**
   * Generate a random AES-256 encryption key
   * @returns {string} Base64-encoded 256-bit key
   */
  generateAES256Key() {
    return crypto.randomBytes(32).toString('base64'); // 256 bits
  }

  /**
   * Verify message authenticity using HMAC-SHA256
   * @param {string} message - Message to verify
   * @param {string} signature - HMAC signature (base64)
   * @param {string} secretKey - Secret key (base64)
   * @returns {boolean} True if signature is valid
   */
  verifyHMAC(message, signature, secretKey) {
    const hmac = crypto.createHmac('sha256', Buffer.from(secretKey, 'base64'));
    hmac.update(message);
    const expectedSignature = hmac.digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
export default encryptionService;
