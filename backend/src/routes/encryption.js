import express from 'express';

import encryptionController from '../controllers/encryptionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/encryption/keypair:
 *   post:
 *     summary: Generate E2E encryption key pair
 *     tags: [Encryption]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Key pair generated successfully
 *       409:
 *         description: User already has a key pair
 *       500:
 *         description: Server error
 */
router.post('/keypair', authenticate, encryptionController.generateKeyPair);

/**
 * @swagger
 * /api/encryption/public-key/{userId}:
 *   get:
 *     summary: Get user's public key
 *     tags: [Encryption]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Public key retrieved
 *       404:
 *         description: User not found or no public key
 *       500:
 *         description: Server error
 */
router.get('/public-key/:userId', authenticate, encryptionController.getPublicKey);

/**
 * @swagger
 * /api/encryption/public-keys:
 *   post:
 *     summary: Get public keys for multiple users (batch)
 *     tags: [Encryption]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs (max 50)
 *     responses:
 *       200:
 *         description: Public keys retrieved
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/public-keys', authenticate, encryptionController.getPublicKeys);

/**
 * @swagger
 * /api/encryption/public-key:
 *   put:
 *     summary: Update user's public key
 *     tags: [Encryption]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - publicKey
 *             properties:
 *               publicKey:
 *                 type: string
 *                 description: Base64-encoded public key
 *     responses:
 *       200:
 *         description: Public key updated
 *       400:
 *         description: Invalid public key
 *       500:
 *         description: Server error
 */
router.put('/public-key', authenticate, encryptionController.updatePublicKey);

export default router;
