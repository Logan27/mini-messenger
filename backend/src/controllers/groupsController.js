import { Op } from 'sequelize';

import { sequelize } from '../config/database.js';
import { Group, GroupMember, User } from '../models/index.js';
import { getIO, WS_EVENTS } from '../services/websocket.js';
import logger from '../utils/logger.js';

/**
 * Groups Controller
 * Handles group creation, management, and member operations
 */
class GroupsController {
  /**
   * Create a new group
   * POST /api/groups
   */
  async createGroup(req, res) {
    try {
      const { name, description, groupType = 'private', avatar, initialMembers } = req.body;
      const userId = req.user.id;

      // FIX BUG-G003: Validate and deduplicate initial members
      logger.info('Create Group Debug - Phase 1:', { userId, initialMembers });

      let validatedMembers = [];
      if (initialMembers && initialMembers.length > 0) {
        // Remove duplicates and filter out creator (ensure string comparison)
        const uniqueMembers = [...new Set(initialMembers.map(id => String(id)))].filter(id => id !== String(userId));
        logger.info('Create Group Debug - Phase 2 (Unique):', { uniqueMembers });

        // Check member limit (19 initial + 1 creator = 20 max)
        if (uniqueMembers.length > 19) {
          return res.status(400).json({
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: `Maximum 19 initial members allowed (20 total including creator). Provided: ${uniqueMembers.length}`,
            },
          });
        }

        // Validate all members exist and are approved BEFORE transaction
        if (uniqueMembers.length > 0) {
          const users = await User.findAll({
            where: {
              id: uniqueMembers,
              approvalStatus: 'approved',
            },
            attributes: ['id'],
          });

          if (users.length !== uniqueMembers.length) {
            const foundIds = users.map(u => String(u.id));
            const invalidIds = uniqueMembers.filter(id => !foundIds.includes(id));
            logger.warn('Create Group Debug - Validation Failed:', { foundIds, invalidIds });
            return res.status(400).json({
              success: false,
              error: {
                type: 'VALIDATION_ERROR',
                message: `Invalid or unapproved user IDs: ${invalidIds.join(', ')}`,
              },
            });
          }

          validatedMembers = uniqueMembers;
          logger.info('Create Group Debug - Phase 3 (Validated):', { validatedMembers });
        }
      }

      // Start transaction only for actual data creation
      const transaction = await sequelize.transaction();
      try {
        // Create the group
        const group = await Group.create(
          {
            name,
            description,
            groupType,
            avatar,
            creatorId: userId,
          },
          { transaction }
        );
        logger.info('Create Group Debug - Phase 4 (Group Created):', { groupId: group.id });

        // Add creator as admin
        let creatorMember = await GroupMember.findOne({
          where: { groupId: group.id, userId: userId },
          transaction,
          paranoid: false
        });

        if (!creatorMember) {
          logger.info('Create Group Debug - Phase 5 (Creating Creator Membership)');
          await GroupMember.create({
            groupId: group.id,
            userId: userId,
            role: 'admin',
            invitedBy: userId,
            joinedAt: new Date(),
            isActive: true,
          }, { transaction, hooks: false });
        } else if (!creatorMember.isActive) {
          logger.info('Create Group Debug - Phase 5 (Reactivating Creator Membership)');
          await creatorMember.update({ isActive: true, role: 'admin' }, { transaction, hooks: false });
        }

        // Add validated initial members
        for (const memberId of validatedMembers) {
          logger.info(`Create Group Debug - Processing member: ${memberId}`);
          let member = await GroupMember.findOne({
            where: { groupId: group.id, userId: memberId },
            transaction,
            paranoid: false
          });

          if (!member) {
            logger.info(`Create Group Debug - Creating membership for: ${memberId}`);
            await GroupMember.create({
              groupId: group.id,
              userId: memberId,
              role: 'user',
              invitedBy: userId,
              joinedAt: new Date(),
              isActive: true,
            }, { transaction, hooks: false });
          } else if (!member.isActive) {
            logger.info(`Create Group Debug - Reactivating membership for: ${memberId}`);
            await member.update({ isActive: true, role: 'user' }, { transaction, hooks: false });
          }
        }

        // Commit transaction before fetching group data
        await transaction.commit();

        // Fetch complete group data with members (AFTER commit)
        const groupWithMembers = await Group.findByPk(group.id, {
          include: [
            {
              model: GroupMember,
              as: 'members',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'status'],
                },
              ],
              where: { isActive: true },
              required: false,
            },
          ],
        });

        // Audit logging for group create
        logger.info('Group created successfully', {
          userId,
          groupId: group.id,
          name,
          groupType,
          initialMembersCount: validatedMembers.length,
        });

        // WebSocket notifications (after success)
        const io = getIO();
        if (io) {
          io.to(`user:${userId}`).emit(WS_EVENTS.GROUP_JOIN, {
            group: groupWithMembers,
            type: 'created',
            timestamp: new Date().toISOString(),
          });

          for (const memberId of validatedMembers) {
            io.to(`user:${memberId}`).emit(WS_EVENTS.GROUP_JOIN, {
              group: groupWithMembers,
              type: 'added',
              timestamp: new Date().toISOString(),
            });
          }
        }

        return res.status(201).json({
          success: true,
          data: groupWithMembers,
          message: 'Group created successfully',
        });
      } catch (error) {
        if (transaction) await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('Error creating group:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        groupData: { name: req.body.name, groupType: req.body.groupType },
      });

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to create group',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Get user's groups with pagination
   * GET /api/groups
   */
  async getUserGroups(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, search, groupType } = req.query;

      const offset = (page - 1) * limit;

      const whereCondition = { isActive: true };

      // Add search filter if provided
      if (search) {
        whereCondition[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
        ];
      }

      // Add group type filter if provided
      if (groupType) {
        whereCondition.groupType = groupType;
      }

      const { rows: groups, count: total } = await GroupMember.findAndCountAll({
        where: {
          userId,
          isActive: true,
        },
        include: [
          {
            model: Group,
            as: 'group',
            where: whereCondition,
            required: true,
          },
        ],
        order: [[{ model: Group, as: 'group' }, 'lastMessageAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          groups: groups.map(gm => gm.group),
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: total,
            itemsPerPage: parseInt(limit),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      // FIX BUG-G001: Use logger instead of console.error
      logger.error('Error fetching user groups:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch groups',
        },
      });
    }
  }

  /**
   * Get detailed group information
   * GET /api/groups/:id
   */
  async getGroup(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if user is a member of the group
      const membership = await GroupMember.findOne({
        where: { groupId: id, userId, isActive: true },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'You are not a member of this group',
          },
        });
      }

      const group = await Group.findByPk(id, {
        include: [
          {
            model: GroupMember,
            as: 'members',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'status'],
              },
            ],
            where: { isActive: true },
            required: false,
          },
        ],
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Group not found',
          },
        });
      }

      // Update user's last seen timestamp
      await membership.updateLastSeen();

      res.json({
        success: true,
        data: group,
      });
    } catch (error) {
      // FIX BUG-G001: Use logger instead of console.error
      logger.error('Error fetching group:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        groupId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch group',
        },
      });
    }
  }

  /**
   * Update group information
   * PUT /api/groups/:id
   */
  async updateGroup(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { name, description, groupType, avatar } = req.body;

      const group = await Group.findByPk(id, { transaction });

      if (!group) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Group not found',
          },
        });
      }

      // Check if user is the creator or an admin
      const membership = await GroupMember.findOne({
        where: { groupId: id, userId, isActive: true },
        transaction,
      });

      if (!membership || !membership.canEditGroup()) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to edit this group',
          },
        });
      }

      // Update group
      const updates = {};
      if (name !== undefined) {
        updates.name = name;
      }
      if (description !== undefined) {
        updates.description = description;
      }
      if (groupType !== undefined) {
        updates.groupType = groupType;
      }
      if (avatar !== undefined) {
        updates.avatar = avatar;
      }

      await group.update(updates, { transaction });

      // Audit logging for group update
      logger.info('Group updated', {
        userId,
        groupId: group.id,
        updates,
      });

      // Fetch updated group data in same transaction
      const updatedGroup = await Group.findByPk(id, {
        include: [
          {
            model: GroupMember,
            as: 'members',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'status'],
              },
            ],
            where: { isActive: true },
            required: false,
          },
        ],
        transaction,
      });

      await transaction.commit();

      // FIX BUG-G006: Add null check for WebSocket (after commit)
      const io = getIO();
      if (io) {
        io.to(`group:${id}`).emit(WS_EVENTS.GROUP_UPDATED, {
          group: updatedGroup,
          updatedBy: userId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.warn('WebSocket not available, skipping real-time notification', {
          event: 'GROUP_UPDATED',
          groupId: id,
          userId,
        });
      }

      res.json({
        success: true,
        data: updatedGroup,
        message: 'Group updated successfully',
      });
    } catch (error) {
      await transaction.rollback();
      // FIX BUG-G001: Use logger instead of console.error
      logger.error('Error updating group:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        groupId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to update group',
        },
      });
    }
  }

  /**
   * Delete a group
   * DELETE /api/groups/:id
   */
  async deleteGroup(req, res) {
    // FIX BUG-GRP-001: Add transaction for data integrity
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const group = await Group.findByPk(id, { transaction });

      if (!group) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Group not found',
          },
        });
      }

      // Only creator can delete the group
      if (group.creatorId !== userId) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'Only the group creator can delete the group',
          },
        });
      }

      // Soft delete the group
      await group.update({ isActive: false }, { transaction });

      // Deactivate all group members
      await GroupMember.update(
        { isActive: false },
        {
          where: { groupId: id },
          transaction,
        }
      );

      // Commit transaction before WebSocket emit
      await transaction.commit();

      // Log audit event
      logger.info('Group deleted', {
        userId,
        groupId: group.id,
        name: group.name,
      });

      // FIX BUG-G006: Add null check for WebSocket
      const io = getIO();
      if (io) {
        io.to(`group:${id}`).emit(WS_EVENTS.GROUP_DELETED, {
          groupId: id,
          deletedBy: userId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.warn('WebSocket not available, skipping real-time notification', {
          event: 'GROUP_DELETED',
          groupId: id,
          userId,
        });
      }

      res.json({
        success: true,
        message: 'Group deleted successfully',
      });
    } catch (error) {
      await transaction.rollback();
      // FIX BUG-G001: Use logger instead of console.error
      logger.error('Error deleting group:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        groupId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to delete group',
        },
      });
    }
  }

  /**
   * Add member to group
   * POST /api/groups/:id/members
   * FIX BUG-G009: Added transaction with row-level lock to prevent race conditions
   * FIX BUG-G010: Added UUID validation and user existence check
   */
  async addMember(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id: groupId } = req.params;
      const { userId: memberId, role = 'user' } = req.body;
      const userId = req.user.id;

      // FIX BUG-G010: Validate UUID format
      const { validate: isValidUUID } = await import('uuid');
      if (!isValidUUID(memberId)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid user ID format',
          },
        });
      }

      // FIX BUG-G009: Lock group row to prevent concurrent member additions
      const group = await Group.findByPk(groupId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!group) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Group not found',
          },
        });
      }

      // Check if user has permission to add members
      const membership = await GroupMember.findOne({
        where: { groupId, userId, isActive: true },
        transaction,
      });

      if (!membership || !membership.canInviteMembers()) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to add members to this group',
          },
        });
      }

      // FIX BUG-G010: Verify user exists and is approved
      const userToAdd = await User.findByPk(memberId, { transaction });
      if (!userToAdd || userToAdd.approvalStatus !== 'approved') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'User not found or not approved',
          },
        });
      }

      // Prevent adding creator again
      if (memberId === group.creatorId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Group creator is already a member',
          },
        });
      }

      // Check if already a member
      const existingMembership = await GroupMember.findOne({
        where: { groupId, userId: memberId, isActive: true },
        transaction,
      });

      if (existingMembership) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'User is already a member of this group',
          },
        });
      }

      // FIX BUG-G009: Atomic count check + insert within transaction
      const currentMemberCount = await GroupMember.count({
        where: { groupId, isActive: true },
        transaction,
      });

      if (currentMemberCount >= 20) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: `Group has reached maximum member limit (20). Current: ${currentMemberCount}`,
          },
        });
      }

      // Add member to group within transaction
      await GroupMember.create(
        {
          groupId,
          userId: memberId,
          role,
          invitedBy: userId,
          joinedAt: new Date(),
          isActive: true,
        },
        { transaction }
      );

      // Fetch updated group data within transaction
      const updatedGroup = await Group.findByPk(groupId, {
        include: [
          {
            model: GroupMember,
            as: 'members',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'status'],
              },
            ],
            where: { isActive: true },
            required: false,
          },
        ],
        transaction,
      });

      await transaction.commit();

      // Audit logging for member add
      logger.info('Group member added', {
        userId,
        groupId,
        addedMemberId: memberId,
        role,
      });

      // FIX BUG-G006: Add null check for WebSocket (after commit)
      const io = getIO();
      if (io) {
        io.to(`group:${groupId}`).emit(WS_EVENTS.GROUP_MEMBER_JOINED, {
          group: updatedGroup,
          memberId,
          addedBy: userId,
          role,
          timestamp: new Date().toISOString(),
        });

        // Notify the new member
        io.to(`user:${memberId}`).emit(WS_EVENTS.GROUP_JOIN, {
          group: updatedGroup,
          type: 'added',
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.warn('WebSocket not available, skipping real-time notifications', {
          event: 'GROUP_MEMBER_JOINED',
          groupId,
          memberId,
        });
      }

      res.status(201).json({
        success: true,
        data: updatedGroup,
        message: 'Member added successfully',
      });
    } catch (error) {
      await transaction.rollback();
      // FIX BUG-G001: Use logger instead of console.error
      logger.error('Error adding member:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        groupId: req.params.id,
        memberId: req.body.userId,
      });

      if (error.message.includes('already a member')) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }

      if (error.message.includes('maximum member limit')) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to add member',
        },
      });
    }
  }

  /**
   * Get group members
   * GET /api/groups/:id/members
   */
  async getMembers(req, res) {
    try {
      const { id: groupId } = req.params;
      const userId = req.user.id;

      const group = await Group.findByPk(groupId, {
        include: [
          {
            model: GroupMember,
            as: 'members',
            where: { isActive: true },
            required: false,
            include: [
              {
                model: User,
                as: 'user',
                attributes: [
                  'id',
                  'username',
                  'firstName',
                  'lastName',
                  'avatar',
                  'status',
                  'lastLoginAt',
                ],
              },
            ],
          },
        ],
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Group not found',
          },
        });
      }

      // Check if user is a member of the group
      const membership = await GroupMember.findOne({
        where: { groupId, userId, isActive: true },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'You are not a member of this group',
          },
        });
      }

      res.json({
        success: true,
        data: {
          groupId: group.id,
          members: group.members || [],
        },
      });
    } catch (error) {
      // FIX BUG-G001: Use logger instead of console.error
      logger.error('Error fetching group members:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        groupId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch group members',
        },
      });
    }
  }

  /**
   * Remove member from group
   * DELETE /api/groups/:id/members/:userId
   * FIX BUG-G012: Added UUID validation
   */
  async removeMember(req, res) {
    try {
      const { id: groupId, userId: memberId } = req.params;
      const userId = req.user.id;

      // FIX BUG-G012: Validate UUID format
      const { validate: isValidUUID } = await import('uuid');
      if (!isValidUUID(memberId)) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid user ID format',
          },
        });
      }

      const group = await Group.findByPk(groupId);

      if (!group) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Group not found',
          },
        });
      }

      // Check if user has permission to remove members
      const membership = await GroupMember.findOne({
        where: { groupId, userId, isActive: true },
      });

      if (!membership || !membership.canRemoveMembers()) {
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to remove members from this group',
          },
        });
      }

      // Prevent removing creator
      if (memberId === group.creatorId) {
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'Group creator cannot be removed',
          },
        });
      }

      // Remove member from group
      await group.removeMember(memberId);

      // Log audit event - removed audit service
      logger.info('Group member removed', {
        userId,
        groupId,
        removedMemberId: memberId,
      });

      // FIX BUG-G006: Add null check for WebSocket
      const io = getIO();
      if (io) {
        io.to(`group:${groupId}`).emit(WS_EVENTS.GROUP_MEMBER_LEFT, {
          groupId,
          memberId,
          removedBy: userId,
          timestamp: new Date().toISOString(),
        });

        // Notify the removed member
        io.to(`user:${memberId}`).emit(WS_EVENTS.GROUP_LEAVE, {
          groupId,
          type: 'removed',
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.warn('WebSocket not available, skipping real-time notifications', {
          event: 'GROUP_MEMBER_LEFT',
          groupId,
          memberId,
        });
      }

      res.json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error) {
      // FIX BUG-G001: Use logger instead of console.error
      logger.error('Error removing member:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        groupId: req.params.id,
        memberId: req.params.userId,
      });

      if (error.message.includes('not a member')) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to remove member',
        },
      });
    }
  }

  /**
   * Update member role
   * PUT /api/groups/:id/members/:userId/role
   */
  async updateMemberRole(req, res) {
    // FIX BUG-G005: Wrap in transaction with pessimistic lock
    const transaction = await sequelize.transaction();
    try {
      const { id: groupId, userId: memberId } = req.params;
      const { role } = req.body;
      const userId = req.user.id;

      const group = await Group.findByPk(groupId, { transaction });

      if (!group) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Group not found',
          },
        });
      }

      // FIX BUG-G011: Prevent changing creator's role
      if (memberId === group.creatorId) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'Cannot change group creator role. Creator is always an admin.',
          },
        });
      }

      // Check if user has admin permissions
      const membership = await GroupMember.findOne({
        where: { groupId, userId, isActive: true },
        transaction,
      });

      if (!membership || !membership.isAdmin()) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to update member roles',
          },
        });
      }

      // Get the member to update with pessimistic lock (SELECT FOR UPDATE)
      const memberToUpdate = await GroupMember.findOne({
        where: { groupId, userId: memberId, isActive: true },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!memberToUpdate) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Member not found in group',
          },
        });
      }

      // FIX BUG-G011: Check if already has that role
      if (memberToUpdate.role === role) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: `User already has role: ${role}`,
          },
        });
      }

      // Prevent demoting the last admin (within transaction)
      if (memberToUpdate.role === 'admin' && role !== 'admin') {
        const adminCount = await GroupMember.count({
          where: { groupId, role: 'admin', isActive: true },
          transaction,
        });

        if (adminCount <= 1) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Cannot demote last admin. Group must have at least one admin.',
            },
          });
        }
      }

      // Update member role
      await memberToUpdate.update({ role }, { transaction });

      // Log audit event
      logger.info('Group member role updated', {
        userId,
        groupId,
        memberId,
        newRole: role,
      });

      // Commit transaction
      await transaction.commit();

      // Fetch updated group data (after commit)
      const updatedGroup = await Group.findByPk(groupId, {
        include: [
          {
            model: GroupMember,
            as: 'members',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'status'],
              },
            ],
            where: { isActive: true },
            required: false,
          },
        ],
      });

      // FIX BUG-G006: Add null check for WebSocket
      const io = getIO();
      if (io) {
        io.to(`group:${groupId}`).emit(WS_EVENTS.GROUP_MEMBER_ROLE_UPDATED, {
          group: updatedGroup,
          memberId,
          newRole: role,
          updatedBy: userId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.warn('WebSocket not available, skipping real-time notification', {
          event: 'GROUP_MEMBER_ROLE_UPDATED',
          groupId,
          memberId,
        });
      }

      res.json({
        success: true,
        data: updatedGroup,
        message: 'Member role updated successfully',
      });
    } catch (error) {
      await transaction.rollback();

      // FIX BUG-G001: Use logger instead of console.error
      logger.error('Error updating member role:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        groupId: req.params.id,
        memberId: req.params.userId,
      });
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to update member role',
        },
      });
    }
  }

  /**
   * Leave group
   * POST /api/groups/:id/leave
   * FIX BUG-G013: Added transaction for atomic membership update and admin reassignment
   */
  async leaveGroup(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id: groupId } = req.params;
      const userId = req.user.id;

      const group = await Group.findByPk(groupId, { transaction });

      if (!group) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Group not found',
          },
        });
      }

      // FIX BUG-G013: Prevent creator from leaving
      if (group.creatorId === userId) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'Group creator cannot leave. Delete the group or transfer ownership first.',
          },
        });
      }

      // Get user's membership
      const membership = await GroupMember.findOne({
        where: { groupId, userId, isActive: true },
        transaction,
      });

      if (!membership) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'You are not a member of this group',
          },
        });
      }

      // FIX BUG-G013: Atomic admin reassignment if last admin is leaving
      if (membership.role === 'admin') {
        const adminCount = await GroupMember.count({
          where: { groupId, role: 'admin', isActive: true },
          transaction,
        });

        // If last admin, promote oldest member
        if (adminCount === 1) {
          const oldestMember = await GroupMember.findOne({
            where: {
              groupId,
              userId: { [Op.ne]: userId },
              isActive: true,
            },
            order: [['joinedAt', 'ASC']],
            transaction,
          });

          if (oldestMember) {
            await oldestMember.update({ role: 'admin' }, { transaction });
            logger.info('Auto-promoted member to admin after last admin left', {
              groupId,
              newAdminId: oldestMember.userId,
              previousAdminId: userId,
            });
          }
        }
      }

      // Mark as left within transaction
      await membership.update(
        {
          leftAt: new Date(),
          isActive: false,
        },
        { transaction }
      );

      await transaction.commit();

      // Log audit event - removed audit service
      logger.info('Group member left', {
        userId,
        groupId,
      });

      // FIX BUG-G006: Add null check for WebSocket (after commit)
      const io = getIO();
      if (io) {
        io.to(`group:${groupId}`).emit(WS_EVENTS.GROUP_MEMBER_LEFT, {
          groupId,
          memberId: userId,
          type: 'left',
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.warn('WebSocket not available, skipping real-time notification', {
          event: 'GROUP_MEMBER_LEFT',
          groupId,
          userId,
        });
      }

      res.json({
        success: true,
        message: 'Successfully left the group',
      });
    } catch (error) {
      await transaction.rollback();
      // FIX BUG-G001: Use logger instead of console.error
      logger.error('Error leaving group:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        groupId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to leave group',
        },
      });
    }
  }

  /**
   * Mute group notifications
   * POST /api/groups/:id/mute
   */
  async muteGroup(req, res) {
    try {
      const userId = req.user.id;
      const groupId = req.params.id;

      // Check if user is a member
      const membership = await GroupMember.findOne({
        where: {
          groupId,
          userId,
          isActive: true,
        },
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Group not found or you are not a member',
          },
        });
      }

      await membership.mute();

      logger.info('Group muted', { userId, groupId });

      res.json({
        success: true,
        message: 'Group muted successfully',
        data: {
          groupId: membership.groupId,
          isMuted: membership.isMuted,
        },
      });
    } catch (error) {
      logger.error('Error muting group:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        groupId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to mute group',
        },
      });
    }
  }

  /**
   * Unmute group notifications
   * DELETE /api/groups/:id/mute
   */
  async unmuteGroup(req, res) {
    try {
      const userId = req.user.id;
      const groupId = req.params.id;

      // Check if user is a member
      const membership = await GroupMember.findOne({
        where: {
          groupId,
          userId,
          isActive: true,
        },
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Group not found or you are not a member',
          },
        });
      }

      await membership.unmute();

      logger.info('Group unmuted', { userId, groupId });

      res.json({
        success: true,
        message: 'Group unmuted successfully',
        data: {
          groupId: membership.groupId,
          isMuted: membership.isMuted,
        },
      });
    } catch (error) {
      logger.error('Error unmuting group:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        groupId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to unmute group',
        },
      });
    }
  }
}

export default new GroupsController();
