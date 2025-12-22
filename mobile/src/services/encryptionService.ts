import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

// Polyfill for global Buffer if needed, though usually better to use it explicitly
if (typeof global.Buffer === 'undefined') {
    (global as any).Buffer = Buffer;
}

const PUBLIC_KEY_STORAGE_KEY = 'e2e_public_key';
const SECRET_KEY_STORAGE_KEY = 'e2e_secret_key';
const KEY_HISTORY_STORAGE_KEY = 'e2e_key_history';

export interface KeyPair {
    publicKey: string;
    secretKey: string;
}

export const encryptionService = {
    /**
     * Generate a new key pair for the user
     */
    generateKeyPair: async (): Promise<KeyPair> => {
        const keyPair = nacl.box.keyPair();
        const publicKey = util.encodeBase64(keyPair.publicKey);
        const secretKey = util.encodeBase64(keyPair.secretKey);

        await encryptionService.storeKeys({ publicKey, secretKey });
        return { publicKey, secretKey };
    },

    /**
     * Store keys securely
     */
    storeKeys: async (keys: KeyPair): Promise<void> => {
        const currentKeys = await encryptionService.loadKeys();

        // If we have current keys and they are different from the new ones, archive them
        if (currentKeys && (currentKeys.publicKey !== keys.publicKey || currentKeys.secretKey !== keys.secretKey)) {
            const historyJson = await SecureStore.getItemAsync(KEY_HISTORY_STORAGE_KEY);
            let history: KeyPair[] = historyJson ? JSON.parse(historyJson) : [];

            // Avoid duplicates in history
            const isDuplicate = history.some(k => k.publicKey === currentKeys.publicKey);
            if (!isDuplicate) {
                history.push(currentKeys);
                await SecureStore.setItemAsync(KEY_HISTORY_STORAGE_KEY, JSON.stringify(history));
            }
        }

        await SecureStore.setItemAsync(PUBLIC_KEY_STORAGE_KEY, keys.publicKey);
        await SecureStore.setItemAsync(SECRET_KEY_STORAGE_KEY, keys.secretKey);
    },

    /**
     * Load keys from secure storage
     */
    loadKeys: async (): Promise<KeyPair | null> => {
        const publicKey = await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY);
        const secretKey = await SecureStore.getItemAsync(SECRET_KEY_STORAGE_KEY);

        if (publicKey && secretKey) {
            return { publicKey, secretKey };
        }
        return null;
    },

    /**
     * Load key history
     */
    loadKeyHistory: async (): Promise<KeyPair[]> => {
        const historyJson = await SecureStore.getItemAsync(KEY_HISTORY_STORAGE_KEY);
        return historyJson ? JSON.parse(historyJson) : [];
    },

    /**
     * Clear keys (on logout)
     */
    clearKeys: async (): Promise<void> => {
        await SecureStore.deleteItemAsync(PUBLIC_KEY_STORAGE_KEY);
        await SecureStore.deleteItemAsync(SECRET_KEY_STORAGE_KEY);
        await SecureStore.deleteItemAsync(KEY_HISTORY_STORAGE_KEY);
    },

    /**
     * Encrypt a message
     * @param message Plain text message
     * @param recipientPublicKeyBase64 Recipient's public key
     */
    encrypt: async (message: string, recipientPublicKeyBase64: string): Promise<{ ciphertext: string; nonce: string }> => {
        const keys = await encryptionService.loadKeys();
        if (!keys) {
            throw new Error('No local keys found. Cannot encrypt.');
        }

        const recipientPublicKey = util.decodeBase64(recipientPublicKeyBase64);
        const mySecretKey = util.decodeBase64(keys.secretKey);

        const nonce = nacl.randomBytes(nacl.box.nonceLength);
        const messageUint8 = util.decodeUTF8(message);

        const encryptedBox = nacl.box(messageUint8, nonce, recipientPublicKey, mySecretKey);

        return {
            ciphertext: util.encodeBase64(encryptedBox),
            nonce: util.encodeBase64(nonce),
        };
    },

    /**
     * Decrypt a message
     * @param ciphertextBase64 Encrypted message
     * @param nonceBase64 Nonce used for encryption
     * @param senderPublicKeyBase64 Sender's public key
     */
    decrypt: async (ciphertextBase64: string, nonceBase64: string, senderPublicKeyBase64: string): Promise<string> => {
        const keys = await encryptionService.loadKeys();
        if (!keys) {
            throw new Error('No local keys found. Cannot decrypt.');
        }

        const tryDecryptWithKey = (secretKeyBase64: string) => {
            try {
                const senderPublicKey = util.decodeBase64(senderPublicKeyBase64);
                const mySecretKey = util.decodeBase64(secretKeyBase64);
                const ciphertext = util.decodeBase64(ciphertextBase64);
                const nonce = util.decodeBase64(nonceBase64);

                const decryptedMessage = nacl.box.open(
                    new Uint8Array(ciphertext), 
                    new Uint8Array(nonce), 
                    new Uint8Array(senderPublicKey), 
                    new Uint8Array(mySecretKey)
                );
                return decryptedMessage ? util.encodeUTF8(decryptedMessage) : null;
            } catch (e) {
                console.warn('Single key decryption attempt failed:', e);
                return null;
            }
        };

        // 1. Try with current key
        let result = tryDecryptWithKey(keys.secretKey);
        if (result) return result;

        // 2. Try with history keys
        const history = await encryptionService.loadKeyHistory();
        for (const historyKey of history) {
            result = tryDecryptWithKey(historyKey.secretKey);
            if (result) return result;
        }

        throw new Error('Decryption failed. Message may have been tampered with or wrong keys used.');
    },

    /**
     * Get public key from storage
     */
    getPublicKey: async (): Promise<string | null> => {
        return await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY);
    }
};
