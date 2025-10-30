import encryptionService from './src/services/encryptionService.js';

console.log('Starting encryption performance test...');

const iterations = 100;
const message = 'This is a test message for encryption performance testing.';

// Test key generation
console.log(`\nTesting key generation (${iterations} iterations)...`);
const keyGenStart = performance.now();
for (let i = 0; i < iterations; i++) {
  const keyPair = encryptionService.generateKeyPair();
  const encryptedKey = encryptionService.encryptPrivateKey(keyPair.privateKey, 'testPassword');
  const decryptedKey = encryptionService.decryptPrivateKey(encryptedKey, 'testPassword');
}
const keyGenTime = performance.now() - keyGenStart;
const avgKeyGenTime = keyGenTime / iterations;
console.log(`Average key generation time: ${avgKeyGenTime.toFixed(2)}ms`);

// Test message encryption/decryption
console.log(`\nTesting message encryption/decryption (${iterations} iterations)...`);
const senderKeyPair = encryptionService.generateKeyPair();
const recipientKeyPair = encryptionService.generateKeyPair();

const encryptStart = performance.now();
for (let i = 0; i < iterations; i++) {
  const encryptionResult = encryptionService.encryptMessage(
    message,
    recipientKeyPair.publicKey,
    senderKeyPair.privateKey
  );
}
const encryptTime = performance.now() - encryptStart;
const avgEncryptTime = encryptTime / iterations;
console.log(`Average encryption time: ${avgEncryptTime.toFixed(2)}ms`);

const decryptStart = performance.now();
for (let i = 0; i < iterations; i++) {
  const encryptionResult = encryptionService.encryptMessage(
    message,
    recipientKeyPair.publicKey,
    senderKeyPair.privateKey
  );
  const decryptedMessage = encryptionService.decryptMessage(
    encryptionResult.encryptedMessage,
    encryptionResult.nonce,
    senderKeyPair.publicKey,
    recipientKeyPair.privateKey
  );
}
const decryptTime = performance.now() - decryptStart;
const avgDecryptTime = decryptTime / iterations;
console.log(`Average decryption time: ${avgDecryptTime.toFixed(2)}ms`);

// Test group message encryption/decryption
console.log(`\nTesting group message encryption/decryption (${iterations} iterations)...`);
const groupEncryptStart = performance.now();
for (let i = 0; i < iterations; i++) {
  const encryptionResult = encryptionService.encryptGroupMessage(message);
}
const groupEncryptTime = performance.now() - groupEncryptStart;
const avgGroupEncryptTime = groupEncryptTime / iterations;
console.log(`Average group encryption time: ${avgGroupEncryptTime.toFixed(2)}ms`);

const groupDecryptStart = performance.now();
for (let i = 0; i < iterations; i++) {
  const encryptionResult = encryptionService.encryptGroupMessage(message);
  const decryptedMessage = encryptionService.decryptGroupMessage(
    encryptionResult.encryptedMessage,
    encryptionResult.nonce,
    encryptionResult.authTag
  );
}
const groupDecryptTime = performance.now() - groupDecryptStart;
const avgGroupDecryptTime = groupDecryptTime / iterations;
console.log(`Average group decryption time: ${avgGroupDecryptTime.toFixed(2)}ms`);

console.log(`\n=== Performance Summary ===`);
console.log(`Key generation: ${avgKeyGenTime.toFixed(2)}ms avg`);
console.log(`Message encryption: ${avgEncryptTime.toFixed(2)}ms avg`);
console.log(`Message decryption: ${avgDecryptTime.toFixed(2)}ms avg`);
console.log(`Group encryption: ${avgGroupEncryptTime.toFixed(2)}ms avg`);
console.log(`Group decryption: ${avgGroupDecryptTime.toFixed(2)}ms avg`);

const maxTime = Math.max(avgKeyGenTime, avgEncryptTime, avgDecryptTime, avgGroupEncryptTime, avgGroupDecryptTime);
console.log(`\nMaximum average time: ${maxTime.toFixed(2)}ms`);

if (maxTime < 50) {
  console.log(`✅ PERFORMANCE REQUIREMENT MET: All operations under 50ms`);
} else {
  console.log(`❌ PERFORMANCE REQUIREMENT NOT MET: Max time ${maxTime.toFixed(2)}ms exceeds 50ms threshold`);
}