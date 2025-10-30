import express from 'express';
import Joi from 'joi';

import groupsController from '../controllers/groupsController.js';
import { authenticate } from '../middleware/auth.js';
import { userRateLimit } from '../middleware/rateLimit.js';
import { validate, validateParams, groupValidation } from '../utils/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply rate limiting (10 operations per minute per user as specified)
router.use(userRateLimit);

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               groupType:
 *                 type: string
 *                 enum: [private, public]
 *                 default: private
 *               avatar:
 *                 type: string
 *                 format: uri
 *               initialMembers:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 maxItems: 19
 *     responses:
 *       201:
 *         description: Group created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/', validate(groupValidation.createGroup), groupsController.createGroup);

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Get user's groups with pagination
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: groupType
 *         schema:
 *           type: string
 *           enum: [private, public]
 *     responses:
 *       200:
 *         description: Groups retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', groupsController.getUserGroups);

/**
 * @swagger
 * /api/groups/{id}:
 *   get:
 *     summary: Get detailed group information
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Group retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a group member
 *       404:
 *         description: Group not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', validateParams(groupValidation.groupId), groupsController.getGroup);

/**
 * @swagger
 * /api/groups/{id}:
 *   put:
 *     summary: Update group information
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               groupType:
 *                 type: string
 *                 enum: [private, public]
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Group updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Group not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:id',
  validateParams(groupValidation.groupId),
  validate(groupValidation.updateGroup),
  groupsController.updateGroup
);

/**
 * @swagger
 * /api/groups/{id}:
 *   delete:
 *     summary: Delete a group (creator only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Group deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only creator can delete group
 *       404:
 *         description: Group not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', validateParams(groupValidation.groupId), groupsController.deleteGroup);

/**
 * @swagger
 * /api/groups/{id}/members:
 *   post:
 *     summary: Add member to group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               role:
 *                 type: string
 *                 enum: [admin, moderator, member]
 *                 default: member
 *     responses:
 *       201:
 *         description: Member added successfully
 *       400:
 *         description: Validation error or group full
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Group or user not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:id/members',
  validateParams(groupValidation.groupId),
  validate(groupValidation.addMember),
  groupsController.addMember
);

/**
 * @swagger
 * /api/groups/{id}/members:
 *   get:
 *     summary: Get group members
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Group members retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a member of the group
 *       404:
 *         description: Group not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id/members',
  validateParams(groupValidation.groupId),
  groupsController.getMembers
);

/**
 * @swagger
 * /api/groups/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions or cannot remove creator
 *       404:
 *         description: Group or member not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:id/members/:userId',
  validateParams(Joi.object({
    id: groupValidation.groupId.extract('id'),
    userId: groupValidation.userId.extract('userId')
  })),
  groupsController.removeMember
);

/**
 * @swagger
 * /api/groups/{id}/members/{userId}/role:
 *   put:
 *     summary: Update member role
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, moderator, member]
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *       400:
 *         description: Validation error or cannot demote last admin
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Group or member not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:id/members/:userId/role',
  validateParams(Joi.object({
    id: groupValidation.groupId.extract('id'),
    userId: groupValidation.userId.extract('userId')
  })),
  validate(groupValidation.updateMemberRole),
  groupsController.updateMemberRole
);

/**
 * @swagger
 * /api/groups/{id}/leave:
 *   post:
 *     summary: Leave group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully left the group
 *       400:
 *         description: Not a group member
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Creator cannot leave group
 *       404:
 *         description: Group not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/:id/leave', validateParams(groupValidation.groupId), groupsController.leaveGroup);

export default router;
