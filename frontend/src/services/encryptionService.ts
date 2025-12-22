import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

// Key for local storage
const PRIVATE_KEY_STORAGE_KEY = 'messenger_private_key';
const PUBLIC_KEY_STORAGE_KEY = 'messenger_public_key';
const KEY_HISTORY_STORAGE_KEY = 'messenger_key_history';

export interface KeyPair {
    publicKey: string;
    secretKey: string;
}

// Helper to sanitize Base64
const sanitizeBase64 = (str: string) => {
    const standard = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = standard.length % 4;
    return pad ? standard + '='.repeat(4 - pad) : standard;
};

export const encryptionService = {
    /**
     * Generate a new key pair for encryption
     */
    generateKeyPair: async (): Promise<KeyPair> => {
        const keyPair = nacl.box.keyPair();
        const publicKey = encodeBase64(keyPair.publicKey);
        const secretKey = encodeBase64(keyPair.secretKey);

        return { publicKey, secretKey };
    },

    /**
     * Store keys securely (using localStorage for web prototype)
     * Archives old keys to history before replacing.
     */
    storeKeys: (publicKey: string, secretKey: string) => {
        const currentKeys = encryptionService.loadKeys();
        
        // If we have current keys and they are different from the new ones, archive them
        if (currentKeys && (currentKeys.publicKey !== publicKey || currentKeys.secretKey !== secretKey)) {
            const historyJson = localStorage.getItem(KEY_HISTORY_STORAGE_KEY);
            let history: KeyPair[] = historyJson ? JSON.parse(historyJson) : [];
            
            // Avoid duplicates in history
            const isDuplicate = history.some(k => k.publicKey === currentKeys.publicKey);
            if (!isDuplicate) {
                history.push(currentKeys);
                localStorage.setItem(KEY_HISTORY_STORAGE_KEY, JSON.stringify(history));
            }
        }

        localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, publicKey);
        localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, secretKey);
    },

    /**
     * Load keys from storage
     */
    loadKeys: (): KeyPair | null => {
        const publicKey = localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
        const secretKey = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);

        if (publicKey && secretKey) {
            return { publicKey, secretKey };
        }
        return null;
    },

    /**
     * Load key history
     */
    loadKeyHistory: (): KeyPair[] => {
        const historyJson = localStorage.getItem(KEY_HISTORY_STORAGE_KEY);
        return historyJson ? JSON.parse(historyJson) : [];
    },

    /**
     * Clear keys from storage
     */
    clearKeys: () => {
        localStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
        localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
        localStorage.removeItem(KEY_HISTORY_STORAGE_KEY);
    },

    /**
     * Get the stored public key
     */
    getPublicKey: (): string | null => {
        return localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
    },

    /**
     * Encrypt a message for a recipient
     */
    encrypt: async (message: string, recipientPublicKeyBase64: string): Promise<{ ciphertext: string; nonce: string }> => {
        const keys = encryptionService.loadKeys();
        if (!keys) throw new Error('No local keys found');

        if (!recipientPublicKeyBase64 || typeof recipientPublicKeyBase64 !== 'string') {
            throw new Error('Invalid recipient public key format');
        }

        // Sanitize key: Convert URL-safe Base64 to standard Base64
        const standardBase64 = recipientPublicKeyBase64
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        // Add padding if needed
        const pad = standardBase64.length % 4;
        const paddedBase64 = pad ? standardBase64 + '='.repeat(4 - pad) : standardBase64;

        let recipientPublicKey: Uint8Array;
        try {
            recipientPublicKey = decodeBase64(paddedBase64);
        } catch (e) {
            console.error('Key decode error:', e, 'Key:', recipientPublicKeyBase64);
            throw new Error('Failed to decode recipient public key');
        }
        const mySecretKey = decodeBase64(keys.secretKey);

        const nonce = nacl.randomBytes(nacl.box.nonceLength);
        const messageUint8 = new TextEncoder().encode(message);

        const encryptedBox = nacl.box(
            new Uint8Array(messageUint8),
            new Uint8Array(nonce),
            new Uint8Array(recipientPublicKey),
            new Uint8Array(mySecretKey)
        );

        return {
            ciphertext: encodeBase64(encryptedBox),
            nonce: encodeBase64(nonce)
        };
    },

    /**
     * Decrypt a message from a sender
     */
    /**
     * Dual Encrypt: Encrypts message for Recipient AND for Self
     * Returns objects for both
     */
    encryptDual: async (message: string, recipientPublicKeyBase64: string): Promise<{
        ciphertext: string;
        nonce: string;
        ciphertextOwner: string;
        nonceOwner: string;
    }> => {
        // 1. Encrypt for Recipient
        const recipientEncryption = await encryptionService.encrypt(message, recipientPublicKeyBase64);

        // 2. Encrypt for Self (using own Public Key)
        // We need to fetch our own public key. 
        // Note: We use our own Secret Key to encrypt for our own Public Key.
        // This effectively means we are the "sender" and "recipient".
        const myKeys = encryptionService.loadKeys();
        if (!myKeys) throw new Error('No local keys found');

        const selfEncryption = await encryptionService.encrypt(message, myKeys.publicKey);

        return {
            ciphertext: recipientEncryption.ciphertext,
            nonce: recipientEncryption.nonce,
            ciphertextOwner: selfEncryption.ciphertext,
            nonceOwner: selfEncryption.nonce
        };
    },

    /**
     * Decrypt a message from a sender
     */
    decrypt: async (ciphertextBase64: string, nonceBase64: string, senderPublicKeyBase64: string): Promise<string> => {
        const keys = encryptionService.loadKeys();
        if (!keys) throw new Error('No local keys found');

        const tryDecryptWithKey = (secretKeyBase64: string) => {
            try {
                const senderPublicKey = decodeBase64(sanitizeBase64(senderPublicKeyBase64));
                const mySecretKey = decodeBase64(sanitizeBase64(secretKeyBase64));
                const nonce = decodeBase64(sanitizeBase64(nonceBase64));
                const ciphertext = decodeBase64(sanitizeBase64(ciphertextBase64));

                const decryptedBox = nacl.box.open(
                    new Uint8Array(ciphertext),
                    new Uint8Array(nonce),
                    new Uint8Array(senderPublicKey),
                    new Uint8Array(mySecretKey)
                );

                return decryptedBox ? new TextDecoder().decode(decryptedBox) : null;
            } catch (e) {
                return null;
            }
        };

        // 1. Try with current key
        let result = tryDecryptWithKey(keys.secretKey);
        if (result) return result;

        // 2. Try with history keys
        const history = encryptionService.loadKeyHistory();
        for (const historyKey of history) {
            result = tryDecryptWithKey(historyKey.secretKey);
            if (result) return result;
        }

        throw new Error('Decryption failed');
    },

    /**
     * Export keys as JSON, encrypted with a password (AES-GCM)
     */
    exportKeys: async (password: string): Promise<string> => {
        const keys = encryptionService.loadKeys();
        if (!keys) throw new Error("No keys to export");

        const dataToEncrypt = JSON.stringify(keys);

        // Derive key from password
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const key = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        // Encrypt data
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            enc.encode(dataToEncrypt)
        );

        // Pack: salt + iv + ciphertext
        const exportedData = {
            salt: encodeBase64(salt),
            iv: encodeBase64(iv),
            data: encodeBase64(new Uint8Array(encrypted))
        };

        return JSON.stringify(exportedData);
    },

    /**
     * Import keys from encrypted JSON, decrypting with password
     */
    importKeys: async (jsonString: string, password: string): Promise<KeyPair> => {
        try {
            const imported = JSON.parse(jsonString);
            if (!imported.salt || !imported.iv || !imported.data) {
                throw new Error("Invalid backup file format");
            }

            const salt = decodeBase64(imported.salt);
            const iv = decodeBase64(imported.iv);
            const data = decodeBase64(imported.data);

            const enc = new TextEncoder();
            const keyMaterial = await window.crypto.subtle.importKey(
                "raw",
                enc.encode(password),
                { name: "PBKDF2" },
                false,
                ["deriveBits", "deriveKey"]
            );

            const key = await window.crypto.subtle.deriveKey(
                {
                    name: "PBKDF2",
                    salt: salt,
                    iterations: 100000,
                    hash: "SHA-256"
                },
                keyMaterial,
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );

            const decryptedFn = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                key,
                data
            );

            const decryptedText = new TextDecoder().decode(decryptedFn);
            const keyPair = JSON.parse(decryptedText);

            if (!keyPair.publicKey || !keyPair.secretKey) {
                throw new Error("Decrypted data is not a valid key pair");
            }

            return keyPair;
        } catch (error) {
            console.error(error);
            throw new Error("Failed to decrypt backup. Wrong password or corrupted file.");
        }
    }
};
