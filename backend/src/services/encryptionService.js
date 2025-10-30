import crypto from 'crypto';

import sodium from 'sodium-native';

import { logger } from '../config/index.js';

/**
 * Encryption service for E2E and server-side encryption
 * Uses libsodium for high-performance cryptographic operations
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'x25519-xsalsa20-poly1305'; // crypto_box algorithm
    this.keyLength = sodium.crypto_box_PUBLICKEYBYTES;
    this.secretKeyLength = sodium.crypto_box_SECRETKEYBYTES;
    this.nonceLength = sodium.crypto_box_NONCEBYTES;
    this.macLength = sodium.crypto_box_MACBYTES;

    // Server-side encryption for group messages
    this.serverKey = null;
    this.initializeServerKey();
  }

  /**
   * Initialize server key for group message encryption
   */
  initializeServerKey() {
    // In production, this should come from environment variables or secure key management
    const keyString = process.env.SERVER_ENCRYPTION_KEY;
    if (keyString) {
      this.serverKey = Buffer.from(keyString, 'hex');
    } else {
      // Generate a new key for development - in production use proper key management
      this.serverKey = Buffer.alloc(32);
      sodium.randombytes_buf(this.serverKey);
      logger.warn('Using generated server key - set SERVER_ENCRYPTION_KEY in production');
    }
  }

  /**
   * Generate X25519 key pair for E2E encryption
   * @returns {Object} { publicKey: Buffer, privateKey: Buffer }
   */
  generateKeyPair() {
    try {
      const publicKey = Buffer.alloc(this.keyLength);
      const privateKey = Buffer.alloc(this.secretKeyLength);

      sodium.crypto_box_keypair(publicKey, privateKey);

      return { publicKey, privateKey };
    } catch (error) {
      logger.error('Failed to generate key pair:', error);
      throw new Error('Key pair generation failed');
    }
  }

  /**
   * Encrypt private key with user's password for storage
   * @param {Buffer} privateKey - The private key to encrypt
   * @param {string} password - User's password
   * @returns {Buffer} Encrypted private key
   */
  encryptPrivateKey(privateKey, password) {
    try {
      const passwordHash = crypto.createHash('sha256').update(password).digest();
      const iv = Buffer.alloc(16);
      sodium.randombytes_buf(iv);

      const cipher = crypto.createCipheriv('aes-256-gcm', passwordHash.slice(0, 32), iv);

      const encrypted = Buffer.concat([cipher.update(privateKey), cipher.final()]);

      const authTag = cipher.getAuthTag();
      const result = Buffer.concat([iv, authTag, encrypted]);

      return result;
    } catch (error) {
      logger.error('Failed to encrypt private key:', error);
      throw new Error('Private key encryption failed');
    }
  }

  /**
   * Decrypt private key with user's password
   * @param {Buffer} encryptedPrivateKey - The encrypted private key
   * @param {string} password - User's password
   * @returns {Buffer} Decrypted private key
   */
  decryptPrivateKey(encryptedPrivateKey, password) {
    try {
      const passwordHash = crypto.createHash('sha256').update(password).digest();

      const iv = encryptedPrivateKey.slice(0, 16);
      const authTag = encryptedPrivateKey.slice(16, 32);
      const encrypted = encryptedPrivateKey.slice(32);

      const decipher = crypto.createDecipheriv('aes-256-gcm', passwordHash.slice(0, 32), iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt private key:', error);
      throw new Error('Private key decryption failed - invalid password');
    }
  }

  /**
   * Encrypt message using crypto_box (X25519-XSalsa20-Poly1305)
   * @param {string|Buffer} message - Message to encrypt
   * @param {Buffer} recipientPublicKey - Recipient's public key
   * @param {Buffer} senderPrivateKey - Sender's private key
   * @returns {Object} { encryptedMessage: Buffer, nonce: Buffer }
   */
  encryptMessage(message, recipientPublicKey, senderPrivateKey) {
    try {
      const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message, 'utf8');
      const nonce = Buffer.alloc(this.nonceLength);
      sodium.randombytes_buf(nonce);

      const ciphertext = Buffer.alloc(messageBuffer.length + this.macLength);

      sodium.crypto_box_easy(
        ciphertext,
        messageBuffer,
        nonce,
        recipientPublicKey,
        senderPrivateKey
      );

      return {
        encryptedMessage: ciphertext,
        nonce: nonce,
        algorithm: this.algorithm,
      };
    } catch (error) {
      logger.error('Failed to encrypt message:', error);
      throw new Error('Message encryption failed');
    }
  }

  /**
   * Decrypt message using crypto_box
   * @param {Buffer} encryptedMessage - Encrypted message with MAC
   * @param {Buffer} nonce - Nonce used for encryption
   * @param {Buffer} senderPublicKey - Sender's public key
   * @param {Buffer} recipientPrivateKey - Recipient's private key
   * @returns {Buffer} Decrypted message
   */
  decryptMessage(encryptedMessage, nonce, senderPublicKey, recipientPrivateKey) {
    try {
      const decrypted = Buffer.alloc(encryptedMessage.length - this.macLength);

      const result = sodium.crypto_box_open_easy(
        decrypted,
        encryptedMessage,
        nonce,
        senderPublicKey,
        recipientPrivateKey
      );

      if (result !== 0) {
        throw new Error('Decryption failed - invalid keys or corrupted message');
      }

      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt message:', error);
      throw new Error('Message decryption failed');
    }
  }

  /**
   * Encrypt message for group chat using AES-256-GCM (server-side)
   * @param {string|Buffer} message - Message to encrypt
   * @returns {Object} { encryptedMessage: Buffer, nonce: Buffer, authTag: Buffer }
   */
  encryptGroupMessage(message) {
    try {
      const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message, 'utf8');
      const nonce = Buffer.alloc(12); // GCM standard nonce length
      sodium.randombytes_buf(nonce);

      const cipher = crypto.createCipheriv('aes-256-gcm', this.serverKey, nonce);

      const encrypted = Buffer.concat([cipher.update(messageBuffer), cipher.final()]);

      const authTag = cipher.getAuthTag();

      return {
        encryptedMessage: encrypted,
        nonce: nonce,
        authTag: authTag,
        algorithm: 'aes-256-gcm',
      };
    } catch (error) {
      logger.error('Failed to encrypt group message:', error);
      throw new Error('Group message encryption failed');
    }
  }

  /**
   * Decrypt group message using AES-256-GCM
   * @param {Buffer} encryptedMessage - Encrypted message
   * @param {Buffer} nonce - Nonce used for encryption
   * @param {Buffer} authTag - Authentication tag
   * @returns {Buffer} Decrypted message
   */
  decryptGroupMessage(encryptedMessage, nonce, authTag) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.serverKey, nonce);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encryptedMessage), decipher.final()]);

      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt group message:', error);
      throw new Error('Group message decryption failed');
    }
  }

  /**
   * Generate shared secret using Diffie-Hellman key exchange
   * @param {Buffer} privateKey - Our private key
   * @param {Buffer} peerPublicKey - Peer's public key
   * @returns {Buffer} Shared secret
   */
  generateSharedSecret(privateKey, peerPublicKey) {
    try {
      const sharedSecret = Buffer.alloc(sodium.crypto_scalarmult_BYTES);

      sodium.crypto_scalarmult(sharedSecret, privateKey, peerPublicKey);

      return sharedSecret;
    } catch (error) {
      logger.error('Failed to generate shared secret:', error);
      throw new Error('Shared secret generation failed');
    }
  }

  /**
   * Derive encryption key from shared secret
   * @param {Buffer} sharedSecret - Shared secret from DH exchange
   * @param {Buffer} salt - Salt for key derivation (optional)
   * @returns {Buffer} Derived key
   */
  deriveKey(sharedSecret, salt = null) {
    try {
      const saltBuffer = salt || Buffer.alloc(32);
      if (!salt) {
        sodium.randombytes_buf(saltBuffer);
      }

      // Use HKDF-like construction for key derivation
      const key = crypto.createHmac('sha256', saltBuffer).update(sharedSecret).digest();

      return { key, salt: saltBuffer };
    } catch (error) {
      logger.error('Failed to derive key:', error);
      throw new Error('Key derivation failed');
    }
  }

  /**
   * Rotate user's encryption keys
   * @param {string} userId - User ID
   * @param {string} password - User's password
   * @param {Object} currentKeys - Current key pair
   * @returns {Object} New key pair
   */
  rotateKeys(userId, password, currentKeys) {
    try {
      // Generate new key pair
      const newKeyPair = this.generateKeyPair();

      // TODO: Implement key rotation logic with existing conversations
      // This would involve notifying all active conversations of key change
      // and providing a migration path for old encrypted messages

      logger.info(`Key rotation completed for user ${userId}`);

      return {
        publicKey: newKeyPair.publicKey,
        privateKey: newKeyPair.privateKey,
        version: (currentKeys.keyVersion || 1) + 1,
        rotatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to rotate keys:', error);
      throw new Error('Key rotation failed');
    }
  }

  /**
   * Validate public key format
   * @param {Buffer|string} publicKey - Public key to validate
   * @returns {boolean} True if valid
   */
  validatePublicKey(publicKey) {
    try {
      const keyBuffer = Buffer.isBuffer(publicKey) ? publicKey : Buffer.from(publicKey, 'base64');
      return keyBuffer.length === this.keyLength;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert key buffers to base64 for storage/transmission
   * @param {Buffer} keyBuffer - Key buffer
   * @returns {string} Base64 encoded key
   */
  keyToBase64(keyBuffer) {
    return keyBuffer.toString('base64');
  }

  /**
   * Convert base64 key to buffer
   * @param {string} base64Key - Base64 encoded key
   * @returns {Buffer} Key buffer
   */
  keyFromBase64(base64Key) {
    return Buffer.from(base64Key, 'base64');
  }
}

export default new EncryptionService();
