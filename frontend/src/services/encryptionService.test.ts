
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptionService } from './encryptionService';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('encryptionService Key History', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should generate and store keys', async () => {
    const keys = await encryptionService.generateKeyPair();
    encryptionService.storeKeys(keys.publicKey, keys.secretKey);

    const loadedKeys = encryptionService.loadKeys();
    expect(loadedKeys).toEqual(keys);
  });

  it('should archive old keys when storing new ones', async () => {
    // 1. Generate Key A
    const keysA = await encryptionService.generateKeyPair();
    encryptionService.storeKeys(keysA.publicKey, keysA.secretKey);

    // 2. Generate Key B
    const keysB = await encryptionService.generateKeyPair();
    encryptionService.storeKeys(keysB.publicKey, keysB.secretKey);

    // 3. Check current keys are Key B
    const currentKeys = encryptionService.loadKeys();
    expect(currentKeys).toEqual(keysB);

    // 4. Check history contains Key A
    const history = encryptionService.loadKeyHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(keysA);
  });

  it('should decrypt message encrypted with old key', async () => {
    // 1. Generate Key A (Old Key)
    const keysA = await encryptionService.generateKeyPair();
    encryptionService.storeKeys(keysA.publicKey, keysA.secretKey);

    // 2. Encrypt a message with Key A (simulating sending to self/receiving)
    // Sender (us) uses Key A to encrypt for Recipient (us - Key A)
    const message = 'Secret Message from the Past';
    const { ciphertext, nonce } = await encryptionService.encrypt(message, keysA.publicKey);

    // 3. Generate Key B (New Key) - Key A moves to history
    const keysB = await encryptionService.generateKeyPair();
    encryptionService.storeKeys(keysB.publicKey, keysB.secretKey);

    // 4. Try to decrypt using encryptionService (should find Key A in history)
    // We pass senderPublicKey as keysA.publicKey because we encrypted it using our own Key A.
    // In a real scenario, senderPublicKey would be the other person's key, 
    // but the decryption needs OUR private key. 
    // Wait, the decrypt function signature is decrypt(ciphertext, nonce, senderPublicKey).
    // It uses OUR private key (loaded from storage) to open the box.
    // Box opening needs (ciphertext, nonce, senderPublic, recipientSecret).
    
    // Here we encrypted sending to ourselves:
    // Sender: Key A, Recipient: Key A.
    // So to decrypt: we need Sender Public (Key A Public) and Recipient Secret (Key A Secret).
    
    // The service will try Key B Secret (Current) -> Fail.
    // Then it should try Key A Secret (History) -> Success.
    
    const decrypted = await encryptionService.decrypt(ciphertext, nonce, keysA.publicKey);
    expect(decrypted).toBe(message);
  });
  
  it('should fail if no matching key in history', async () => {
     // 1. Generate Key A
    const keysA = await encryptionService.generateKeyPair();
    encryptionService.storeKeys(keysA.publicKey, keysA.secretKey);
    
    // 2. Encrypt message with Key A
    const message = 'Secret Message';
    const { ciphertext, nonce } = await encryptionService.encrypt(message, keysA.publicKey);
    
    // 3. Clear keys and generate totally new Key B (and clear history for this test to fail)
    localStorage.clear();
    const keysB = await encryptionService.generateKeyPair();
    encryptionService.storeKeys(keysB.publicKey, keysB.secretKey);
    
    // 4. Try to decrypt
    await expect(encryptionService.decrypt(ciphertext, nonce, keysA.publicKey)).rejects.toThrow('Decryption failed');
  });
});
