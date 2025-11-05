import express from 'express';

import callController from '../controllers/callController.js';
import auth from '../middleware/auth.js';
import * as callValidators from '../middleware/validators/callValidators.js';
import { validate } from '../utils/validation.js';

const router = express.Router();

/**
 * @swagger
 * /api/calls:
 *   post:
 *     summary: Initiate a new call
 *     description: Start a new video or audio call (1-to-1 or group) via P2P WebRTC
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - callType
 *             properties:
 *               recipientId:
 *                 type: string
 *                 format: uuid
 *                 description: Recipient user ID (for 1-to-1 calls)
 *               groupId:
 *                 type: string
 *                 format: uuid
 *                 description: Group ID (for group calls)
 *               callType:
 *                 type: string
 *                 enum: [video, audio]
 *                 description: Type of call
 *     responses:
 *       201:
 *         description: Call initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Call'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// FIX BUG-C002: Added input validation
router.post(
  '/',
  auth.authenticate,
  validate(callValidators.initiateCallSchema),
  callController.initiateCall
);

/**
 * @swagger
 * /api/calls/respond:
 *   post:
 *     summary: Respond to a call
 *     description: Accept or reject an incoming call invitation
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - callId
 *               - response
 *             properties:
 *               callId:
 *                 type: string
 *                 format: uuid
 *                 description: Call unique identifier
 *               response:
 *                 type: string
 *                 enum: [accept, reject]
 *                 description: Call response action
 *     responses:
 *       200:
 *         description: Call response recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Call'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// FIX BUG-C002: Added input validation
router.post(
  '/respond',
  auth.authenticate,
  validate(callValidators.respondToCallSchema),
  callController.respondToCall
);

/**
 * @swagger
 * /api/calls/{callId}:
 *   get:
 *     summary: Get call details
 *     description: Retrieve detailed information about a specific call
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Call unique identifier
 *     responses:
 *       200:
 *         description: Call details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Call'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// FIX BUG-C002: Added input validation
router.get(
  '/:callId',
  auth.authenticate,
  validate(callValidators.callIdParamSchema, 'params'),
  callController.getCallDetails
);

/**
 * @swagger
 * /api/calls/{callId}/end:
 *   post:
 *     summary: End a call
 *     description: Terminate an active or ringing call
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Call unique identifier
 *     responses:
 *       200:
 *         description: Call ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Call'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// FIX BUG-C002: Added input validation
router.post(
  '/:callId/end',
  auth.authenticate,
  validate(callValidators.callIdParamSchema, 'params'),
  callController.endCall
);

export default router;
