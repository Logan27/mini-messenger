import os from 'os';

import Joi from 'joi';
import { Op } from 'sequelize';
import { validate as isValidUUID } from 'uuid';

import { redisClient } from '../config/redis.js';
import {
  User,
  Message,
  Call,
  File,
  Group,
  Session,
  AuditLog,
  Report,
  SystemSetting,
  sequelize,
} from '../models/index.js';
import auditService from '../services/auditService.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// Validation schemas
const pendingUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().min(1).max(100),
  sortBy: Joi.string().valid('createdAt', 'username', 'email').default('createdAt'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
});

const approvalSchema = Joi.object({
  adminNotes: Joi.string().trim().max(500),
});

const rejectionSchema = Joi.object({
  reason: Joi.string().trim().min(10).max(500).required(),
  adminNotes: Joi.string().trim().max(500),
});

/**
 * Admin Controller
 * Handles admin-specific operations like user approval workflow
 */
class AdminController {
  /**
   * Get pending users for admin approval
   */
  async getPendingUsers(req, res) {
    try {
      const requestId = req.id;

      // Validate query parameters
      const { error: validationError, value: queryParams } = pendingUsersQuerySchema.validate(
        req.query
      );

      if (validationError) {
        logger.warn('Pending users query validation failed', {
          requestId,
          error: validationError.details[0].message,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: validationError.details[0].message,
        });
      }

      const { page, limit, search, sortBy, sortOrder } = queryParams;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {
        approvalStatus: 'pending',
      };

      if (search) {
        whereClause[Op.or] = [
          { username: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      // Get pending users with pagination
      const { rows: users, count: totalUsers } = await User.findAndCountAll({
        where: whereClause,
        attributes: {
          exclude: [
            'passwordHash',
            'emailVerificationToken',
            'passwordResetToken',
            'passwordResetExpires',
          ],
        },
        limit,
        offset,
        order: [[sortBy, sortOrder]],
      });

      const totalPages = Math.ceil(totalUsers / limit);

      logger.info('Pending users retrieved successfully', {
        requestId,
        adminId: req.user.id,
        totalUsers,
        page,
        limit,
        search,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            currentPage: page,
            totalPages,
            totalUsers,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      logger.error('Error retrieving pending users', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Approve a user
   */
  async approveUser(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const requestId = req.id;
      const { userId } = req.params;

      // Validate UUID format (BUG-A008)
      if (!isValidUUID(userId)) {
        await transaction.rollback();
        logger.warn('Invalid userId format in approveUser', {
          requestId,
          userId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid user ID format',
          },
        });
      }

      // Validate request body
      const { error: validationError, value: approvalData } = approvalSchema.validate(req.body);

      if (validationError) {
        await transaction.rollback();
        logger.warn('User approval validation failed', {
          requestId,
          userId,
          error: validationError.details[0].message,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: validationError.details[0].message,
        });
      }

      const user = await User.findByPk(userId, { transaction });

      if (!user) {
        await transaction.rollback();
        logger.warn('User not found for approval', {
          requestId,
          userId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      if (user.approvalStatus !== 'pending') {
        await transaction.rollback();
        logger.warn('User approval attempted on non-pending user', {
          requestId,
          userId,
          currentStatus: user.approvalStatus,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: 'User is not in pending status',
        });
      }

      // Update user status (BUG-A001: Now in transaction)
      await user.update(
        {
          approvalStatus: 'approved',
          approvedBy: req.user.id,
          approvedAt: new Date(),
        },
        { transaction }
      );

      // Log admin action (BUG-A001: Now in transaction)
      await auditService.logAdminAction(
        {
          requestId,
          adminId: req.user.id,
          action: 'user_approve',
          resource: 'user',
          resourceId: user.id,
          details: {
            previousStatus: 'pending',
            newStatus: 'approved',
            adminNotes: approvalData.adminNotes,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium',
          status: 'success',
        },
        { transaction }
      );

      await transaction.commit();

      // Send approval email (outside transaction - non-critical operation)
      try {
        await emailService.sendUserApprovalEmail(user, approvalData.adminNotes);
      } catch (emailError) {
        logger.error('Failed to send approval email', {
          requestId,
          userId,
          error: emailError.message,
        });
        // Don't fail the approval if email fails
      }

      logger.info('User approved successfully', {
        requestId,
        userId,
        approvedBy: req.user.id,
        adminNotes: approvalData.adminNotes,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'User approved successfully',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          approvalStatus: user.approvalStatus,
          approvedAt: user.approvedAt,
          approvedBy: user.approvedBy,
        },
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error approving user', {
        requestId: req.id,
        userId: req.params.userId,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Approve all pending users (batch operation)
   */
  async approveAllPendingUsers(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const requestId = req.id;

      // Get all pending users
      const pendingUsers = await User.findAll({
        where: { approvalStatus: 'pending' },
        transaction,
      });

      if (pendingUsers.length === 0) {
        await transaction.rollback();
        return res.json({
          success: true,
          data: {
            approvedCount: 0,
            message: 'No pending users to approve',
          },
        });
      }

      const userIds = pendingUsers.map(u => u.id);

      // Batch update all pending users to approved
      await User.update(
        {
          approvalStatus: 'approved',
          approvedBy: req.user.id,
          approvedAt: new Date(),
        },
        {
          where: { id: userIds },
          transaction,
        }
      );

      // Log admin action
      await auditService.logAdminAction(
        {
          requestId,
          adminId: req.user.id,
          action: 'users_approve_all',
          resource: 'user',
          resourceId: null,
          details: {
            approvedCount: pendingUsers.length,
            userIds,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'high',
          status: 'success',
        },
        { transaction }
      );

      await transaction.commit();

      // Send approval emails asynchronously (outside transaction)
      pendingUsers.forEach(async user => {
        try {
          await emailService.sendUserApprovalEmail(user);
        } catch (emailError) {
          logger.error('Failed to send approval email', {
            requestId,
            userId: user.id,
            error: emailError.message,
          });
        }
      });

      logger.info('All pending users approved successfully', {
        requestId,
        adminId: req.user.id,
        approvedCount: pendingUsers.length,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          approvedCount: pendingUsers.length,
          message: `Successfully approved ${pendingUsers.length} user(s)`,
        },
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error approving all pending users', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to approve all users',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Reject a user
   */
  async rejectUser(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const requestId = req.id;
      const { userId } = req.params;

      // Validate UUID format (BUG-A008)
      if (!isValidUUID(userId)) {
        await transaction.rollback();
        logger.warn('Invalid userId format in rejectUser', {
          requestId,
          userId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid user ID format',
          },
        });
      }

      // Validate request body
      const { error: validationError, value: rejectionData } = rejectionSchema.validate(req.body);

      if (validationError) {
        await transaction.rollback();
        logger.warn('User rejection validation failed', {
          requestId,
          userId,
          error: validationError.details[0].message,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: validationError.details[0].message,
        });
      }

      const user = await User.findByPk(userId, { transaction });

      if (!user) {
        await transaction.rollback();
        logger.warn('User not found for rejection', {
          requestId,
          userId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      if (user.approvalStatus !== 'pending') {
        await transaction.rollback();
        logger.warn('User rejection attempted on non-pending user', {
          requestId,
          userId,
          currentStatus: user.approvalStatus,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: 'User is not in pending status',
        });
      }

      // Update user status (BUG-A002: Now in transaction)
      await user.update(
        {
          approvalStatus: 'rejected',
          approvedBy: req.user.id,
          approvedAt: new Date(),
          rejectionReason: rejectionData.reason,
        },
        { transaction }
      );

      // Log admin action (BUG-A002: Now in transaction)
      await auditService.logAdminAction(
        {
          requestId,
          adminId: req.user.id,
          action: 'user_reject',
          resource: 'user',
          resourceId: user.id,
          details: {
            previousStatus: 'pending',
            newStatus: 'rejected',
            reason: rejectionData.reason,
            adminNotes: rejectionData.adminNotes,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium',
          status: 'success',
        },
        { transaction }
      );

      await transaction.commit();

      // Send rejection email (outside transaction - non-critical operation)
      try {
        await emailService.sendUserRejectionEmail(
          user,
          rejectionData.reason,
          rejectionData.adminNotes
        );
      } catch (emailError) {
        logger.error('Failed to send rejection email', {
          requestId,
          userId,
          error: emailError.message,
        });
        // Don't fail the rejection if email fails
      }

      logger.info('User rejected successfully', {
        requestId,
        userId,
        rejectedBy: req.user.id,
        reason: rejectionData.reason,
        adminNotes: rejectionData.adminNotes,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'User rejected successfully',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          approvalStatus: user.approvalStatus,
          rejectionReason: user.rejectionReason,
          approvedAt: user.approvedAt,
          approvedBy: user.approvedBy,
        },
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error rejecting user', {
        requestId: req.id,
        userId: req.params.userId,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Get a single user by ID (for admin user details)
   */
  async getUserById(req, res) {
    try {
      const requestId = req.id;
      const { userId } = req.params;

      // Validate UUID format
      if (!isValidUUID(userId)) {
        logger.warn('Invalid userId format in getUserById', {
          requestId,
          userId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid user ID format',
          },
        });
      }

      const user = await User.findByPk(userId, {
        attributes: {
          exclude: [
            'passwordHash',
            'emailVerificationToken',
            'passwordResetToken',
            'passwordResetExpires',
          ],
        },
      });

      if (!user) {
        logger.warn('User not found', {
          requestId,
          userId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Get additional statistics
      const messageCount = await Message.count({
        where: { senderId: userId },
      });

      const callCount = await Call.count({
        where: {
          [Op.or]: [{ callerId: userId }, { recipientId: userId }],
        },
      });

      const storageUsed =
        (await File.sum('fileSize', {
          where: { uploaderId: userId },
        })) || 0;

      logger.info('User details retrieved successfully', {
        requestId,
        userId,
        adminId: req.user.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          ...user.toJSON(),
          messageCount,
          callCount,
          storageUsed,
        },
      });
    } catch (error) {
      logger.error('Error retrieving user details', {
        requestId: req.id,
        userId: req.params.userId,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user details',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Get system statistics (Task 21.1)
   */
  async getStatistics(req, res) {
    try {
      const requestId = req.id;

      // Total users by status
      const userStats = await User.findAll({
        attributes: [
          'approvalStatus',
          [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count'],
        ],
        group: ['approvalStatus'],
        raw: true,
      });

      const totalUsers = userStats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
      const pendingUsers = userStats.find(s => s.approvalStatus === 'pending')?.count || 0;
      const approvedUsers = userStats.find(s => s.approvalStatus === 'approved')?.count || 0;

      // Active users (approved and not deleted)
      const activeUsers = await User.count({
        where: { approvalStatus: 'approved', status: { [Op.ne]: 'deleted' } },
      });

      // Online users (from Redis or recent last_seen)
      // BUG-A010: Use SCAN instead of KEYS to avoid blocking Redis
      let onlineUsers = 0;
      try {
        if (redisClient && redisClient.isOpen) {
          let cursor = '0';
          let keys = [];

          do {
            const reply = await redisClient.scan(cursor, {
              MATCH: 'user:online:*',
              COUNT: 100,
            });
            cursor = reply.cursor;
            keys = keys.concat(reply.keys);
          } while (cursor !== '0');

          onlineUsers = keys.length;
        }
      } catch (redisError) {
        logger.warn('Could not get online users from Redis', { error: redisError.message });
      }

      // Storage usage
      const totalStorage = (await File.sum('fileSize')) || 0;
      const storageByType = await File.findAll({
        attributes: [
          'mimeType',
          [File.sequelize.fn('SUM', File.sequelize.col('file_size')), 'totalSize'],
          [File.sequelize.fn('COUNT', File.sequelize.col('id')), 'count'],
        ],
        group: ['mime_type'],
        raw: true,
      });

      const storageByUser = await File.findAll({
        attributes: [
          'uploaderId',
          [File.sequelize.fn('SUM', File.sequelize.col('file_size')), 'totalSize'],
        ],
        group: ['uploader_id'],
        order: [[File.sequelize.fn('SUM', File.sequelize.col('file_size')), 'DESC']],
        limit: 10,
        raw: true,
      });

      // Message statistics
      const totalMessages = await Message.count();
      const last24hMessages = await Message.count({
        where: {
          [Op.and]: [
            sequelize.where(
              sequelize.col('created_at'),
              Op.gte,
              new Date(Date.now() - 24 * 60 * 60 * 1000)
            ),
          ],
        },
      });
      const last7dMessages = await Message.count({
        where: {
          [Op.and]: [
            sequelize.where(
              sequelize.col('created_at'),
              Op.gte,
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ),
          ],
        },
      });

      // Call statistics
      const totalCalls = await Call.count();
      const activeCalls = await Call.count({ where: { status: 'connected' } });
      const callsByStatus = await Call.findAll({
        attributes: ['status', [Call.sequelize.fn('COUNT', Call.sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });

      // Group statistics
      const totalGroups = await Group.count();
      const activeGroups = await Group.count({
        where: { deletedAt: null },
      });

      // Activity trends (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dailyMessages = await Message.findAll({
        attributes: [
          [Message.sequelize.fn('DATE', Message.sequelize.col('created_at')), 'date'],
          [Message.sequelize.fn('COUNT', Message.sequelize.col('id')), 'count'],
        ],
        where: {
          [Op.and]: [sequelize.where(sequelize.col('created_at'), Op.gte, thirtyDaysAgo)],
        },
        group: [sequelize.literal('DATE("Message"."created_at")')],
        order: [[sequelize.literal('DATE("Message"."created_at")'), 'ASC']],
        raw: true,
      });

      logger.info('System statistics retrieved successfully', {
        requestId,
        adminId: req.user.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            pending: parseInt(pendingUsers),
            approved: parseInt(approvedUsers),
            active: activeUsers,
            online: onlineUsers,
            byStatus: userStats.map(s => ({
              status: s.approvalStatus,
              count: parseInt(s.count),
            })),
          },
          storage: {
            total: parseInt(totalStorage),
            byType: storageByType.map(s => ({
              mimeType: s.mimeType,
              totalSize: parseInt(s.totalSize),
              count: parseInt(s.count),
            })),
            topUsers: storageByUser.map(s => ({
              userId: s.uploaderId,
              totalSize: parseInt(s.totalSize),
            })),
          },
          messages: {
            total: totalMessages,
            last24h: last24hMessages,
            last7d: last7dMessages,
          },
          calls: {
            total: totalCalls,
            active: activeCalls,
            byStatus: callsByStatus.map(c => ({
              status: c.status,
              count: parseInt(c.count),
            })),
          },
          groups: {
            total: totalGroups,
            active: activeGroups,
          },
          activity: {
            dailyMessages: dailyMessages.map(d => ({
              date: d.date,
              count: parseInt(d.count),
            })),
          },
        },
      });
    } catch (error) {
      logger.error('Error retrieving system statistics', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to retrieve system statistics',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Get all users (for admin dashboard)
   */
  async getAllUsers(req, res) {
    try {
      const requestId = req.id;

      // Validate query parameters (reuse pending users schema but make status optional)
      const querySchema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        search: Joi.string().trim().min(1).max(100),
        status: Joi.string().valid('pending', 'approved', 'rejected'),
        sortBy: Joi.string().valid('createdAt', 'username', 'email').default('createdAt'),
        sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
      });

      const { error: validationError, value: queryParams } = querySchema.validate(req.query);

      if (validationError) {
        logger.warn('All users query validation failed', {
          requestId,
          error: validationError.details[0].message,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: validationError.details[0].message,
        });
      }

      const { page, limit, search, status, sortBy, sortOrder } = queryParams;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {};

      if (status) {
        whereClause.approvalStatus = status;
      }

      if (search) {
        whereClause[Op.or] = [
          { username: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      // Get users with pagination
      const { rows: users, count: totalUsers } = await User.findAndCountAll({
        where: whereClause,
        attributes: {
          exclude: [
            'passwordHash',
            'emailVerificationToken',
            'passwordResetToken',
            'passwordResetExpires',
          ],
        },
        limit,
        offset,
        order: [[sortBy, sortOrder]],
      });

      const totalPages = Math.ceil(totalUsers / limit);

      logger.info('All users retrieved successfully', {
        requestId,
        adminId: req.user.id,
        totalUsers,
        page,
        limit,
        search,
        status,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            currentPage: page,
            totalPages,
            totalUsers,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      logger.error('Error retrieving all users', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Deactivate a user (Task 21.2)
   */
  async deactivateUser(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const requestId = req.id;
      const { userId } = req.params;

      // Validate UUID format (BUG-A008)
      if (!isValidUUID(userId)) {
        await transaction.rollback();
        logger.warn('Invalid userId format in deactivateUser', {
          requestId,
          userId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid user ID format',
          },
        });
      }

      // Validation schema
      const deactivateSchema = Joi.object({
        reason: Joi.string().trim().min(10).max(500).required(),
        adminNotes: Joi.string().trim().max(500),
      });

      const { error: validationError, value: deactivateData } = deactivateSchema.validate(req.body);

      if (validationError) {
        await transaction.rollback();
        logger.warn('User deactivation validation failed', {
          requestId,
          userId,
          error: validationError.details[0].message,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: validationError.details[0].message,
        });
      }

      const user = await User.findByPk(userId, { transaction });

      if (!user) {
        await transaction.rollback();
        logger.warn('User not found for deactivation', {
          requestId,
          userId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      if (user.status === 'inactive') {
        await transaction.rollback();
        logger.warn('User already inactive', {
          requestId,
          userId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: 'User is already inactive',
        });
      }

      // BUG-A006: Prevent self-deactivation
      if (userId === req.user.id) {
        await transaction.rollback();
        logger.warn('Admin attempted self-deactivation', {
          requestId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(403).json({
          success: false,
          error: {
            type: 'SELF_DEACTIVATION_DENIED',
            message: 'You cannot deactivate your own account. Contact another administrator.',
          },
        });
      }

      // BUG-A006: Check if last admin
      if (user.role === 'admin') {
        const adminCount = await User.count({
          where: { role: 'admin', status: 'active' },
          transaction,
        });

        if (adminCount <= 1) {
          await transaction.rollback();
          logger.warn('Attempt to deactivate last admin', {
            requestId,
            adminId: req.user.id,
            targetUserId: userId,
          });
          return res.status(403).json({
            success: false,
            error: {
              type: 'LAST_ADMIN_PROTECTION',
              message:
                'Cannot deactivate the last active administrator. System must have at least one admin.',
            },
          });
        }

        // Log high-severity audit event for admin deactivation
        logger.warn('Admin deactivating another admin', {
          requestId,
          adminId: req.user.id,
          targetAdminId: userId,
          reason: deactivateData.reason,
          ip: req.ip,
          severity: 'HIGH',
        });
      }

      const previousStatus = user.status;

      // BUG-A003: Update user status in transaction
      await user.update(
        {
          status: 'inactive',
          deactivatedBy: req.user.id,
          deactivatedAt: new Date(),
          deactivationReason: deactivateData.reason,
        },
        { transaction }
      );

      // BUG-A003: Terminate all user sessions in transaction
      await Session.destroy({
        where: { userId: userId },
        transaction,
      });

      // BUG-A003: Log admin action in transaction
      await auditService.logAdminAction(
        {
          requestId,
          adminId: req.user.id,
          action: 'user_deactivate',
          resource: 'user',
          resourceId: user.id,
          details: {
            previousStatus,
            newStatus: 'inactive',
            reason: deactivateData.reason,
            adminNotes: deactivateData.adminNotes,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'high',
          status: 'success',
        },
        { transaction }
      );

      await transaction.commit();

      // BUG-A003: Remove user from Redis AFTER commit (external I/O, non-blocking)
      try {
        if (redisClient && redisClient.isOpen) {
          await redisClient.del(`user:online:${userId}`);
          // Clean up session keys
          const sessionKeys = await redisClient.keys(`session:${userId}:*`);
          if (sessionKeys.length > 0) {
            await redisClient.del(...sessionKeys);
          }
        }
      } catch (redisError) {
        logger.warn('Could not remove user from Redis', { error: redisError.message });
        // Non-fatal: sessions in DB are deleted, Redis will expire
      }

      // Send deactivation email (outside transaction - non-critical operation)
      try {
        await emailService.sendUserDeactivationEmail(
          user,
          deactivateData.reason,
          deactivateData.adminNotes
        );
      } catch (emailError) {
        logger.error('Failed to send deactivation email', {
          requestId,
          userId,
          error: emailError.message,
        });
      }

      logger.info('User deactivated successfully', {
        requestId,
        userId,
        deactivatedBy: req.user.id,
        reason: deactivateData.reason,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'User deactivated successfully',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          status: user.status,
          deactivatedAt: user.deactivatedAt,
          deactivatedBy: user.deactivatedBy,
          deactivationReason: user.deactivationReason,
        },
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error deactivating user', {
        requestId: req.id,
        userId: req.params.userId,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Reactivate a user (Task 21.2)
   */
  async reactivateUser(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const requestId = req.id;
      const { userId } = req.params;

      // Validate UUID format (BUG-A008)
      if (!isValidUUID(userId)) {
        await transaction.rollback();
        logger.warn('Invalid userId format in reactivateUser', {
          requestId,
          userId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid user ID format',
          },
        });
      }

      // Validation schema
      const reactivateSchema = Joi.object({
        adminNotes: Joi.string().trim().max(500),
      });

      const { error: validationError, value: reactivateData } = reactivateSchema.validate(req.body);

      if (validationError) {
        await transaction.rollback();
        logger.warn('User reactivation validation failed', {
          requestId,
          userId,
          error: validationError.details[0].message,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: validationError.details[0].message,
        });
      }

      const user = await User.findByPk(userId, { transaction });

      if (!user) {
        await transaction.rollback();
        logger.warn('User not found for reactivation', {
          requestId,
          userId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      if (user.status !== 'inactive') {
        await transaction.rollback();
        logger.warn('User is not inactive', {
          requestId,
          userId,
          currentStatus: user.status,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: 'User is not inactive',
        });
      }

      const previousStatus = user.status;

      // BUG-A005: Update user status in transaction
      await user.update(
        {
          status: 'active',
          reactivatedBy: req.user.id,
          reactivatedAt: new Date(),
          deactivationReason: null,
        },
        { transaction }
      );

      // BUG-A005: Log admin action in transaction
      await auditService.logAdminAction(
        {
          requestId,
          adminId: req.user.id,
          action: 'user_reactivate',
          resource: 'user',
          resourceId: user.id,
          details: {
            previousStatus,
            newStatus: 'active',
            adminNotes: reactivateData.adminNotes,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium',
          status: 'success',
        },
        { transaction }
      );

      await transaction.commit();

      // Send reactivation email (outside transaction - non-critical operation)
      try {
        await emailService.sendUserReactivationEmail(user, reactivateData.adminNotes);
      } catch (emailError) {
        logger.error('Failed to send reactivation email', {
          requestId,
          userId,
          error: emailError.message,
        });
      }

      logger.info('User reactivated successfully', {
        requestId,
        userId,
        reactivatedBy: req.user.id,
        adminNotes: reactivateData.adminNotes,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'User reactivated successfully',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          status: user.status,
          reactivatedAt: user.reactivatedAt,
          reactivatedBy: user.reactivatedBy,
        },
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error reactivating user', {
        requestId: req.id,
        userId: req.params.userId,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Get audit logs with filtering (Task 22.1)
   */
  async getAuditLogs(req, res) {
    try {
      const requestId = req.id;

      // Validation schema
      const querySchema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(50),
        userId: Joi.number().integer().min(1),
        action: Joi.string().trim().max(100),
        resourceType: Joi.string().trim().max(50),
        severity: Joi.string().valid('low', 'medium', 'high', 'critical'),
        status: Joi.string().valid('success', 'failure', 'pending'),
        dateFrom: Joi.date().iso(),
        dateTo: Joi.date().iso(),
        search: Joi.string().trim().max(255),
      });

      const { error: validationError, value: queryParams } = querySchema.validate(req.query);

      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError.details[0].message,
        });
      }

      const {
        page,
        limit,
        userId,
        action,
        resourceType,
        severity,
        status,
        dateFrom,
        dateTo,
        search,
      } = queryParams;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {};

      if (userId) {
        whereClause.userId = userId;
      }
      if (action) {
        whereClause.action = { [Op.iLike]: `%${action}%` };
      }
      if (resourceType) {
        whereClause.resourceType = resourceType;
      }
      if (severity) {
        whereClause.severity = severity;
      }
      if (status) {
        whereClause.status = status;
      }

      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) {
          whereClause.createdAt[Op.gte] = new Date(dateFrom);
        }
        if (dateTo) {
          whereClause.createdAt[Op.lte] = new Date(dateTo);
        }
      }

      if (search) {
        whereClause[Op.or] = [
          { action: { [Op.iLike]: `%${search}%` } },
          { resourceType: { [Op.iLike]: `%${search}%` } },
        ];
      }

      // Get audit logs with pagination
      const { rows: logs, count: totalLogs } = await AuditLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'role'],
          },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      const totalPages = Math.ceil(totalLogs / limit);

      logger.info('Audit logs retrieved successfully', {
        requestId,
        adminId: req.user.id,
        totalLogs,
        filters: { userId, action, resourceType, severity, status },
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            currentPage: page,
            totalPages,
            totalLogs,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      logger.error('Error retrieving audit logs', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Get reports with filtering (Task 22.2)
   */
  async getReports(req, res) {
    try {
      const requestId = req.id;

      // Validation schema
      const querySchema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        status: Joi.string().valid('pending', 'investigating', 'resolved', 'dismissed'),
        reason: Joi.string().valid(
          'harassment',
          'spam',
          'inappropriate_content',
          'hate_speech',
          'violence',
          'impersonation',
          'malware',
          'other'
        ),
        reportType: Joi.string().valid('user', 'message', 'file', 'other'),
      });

      const { error: validationError, value: queryParams } = querySchema.validate(req.query);

      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError.details[0].message,
        });
      }

      const { page, limit, status, reason, reportType } = queryParams;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {};
      if (status) {
        whereClause.status = status;
      }
      if (reason) {
        whereClause.reason = reason;
      }
      if (reportType) {
        whereClause.reportType = reportType;
      }

      // Get reports with pagination
      const { rows: reports, count: totalReports } = await Report.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'username', 'email'],
          },
          {
            model: User,
            as: 'reportedUser',
            attributes: ['id', 'username', 'email'],
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'username', 'email'],
          },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      const totalPages = Math.ceil(totalReports / limit);

      logger.info('Reports retrieved successfully', {
        requestId,
        adminId: req.user.id,
        totalReports,
        filters: { status, reason, reportType },
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          reports,
          pagination: {
            currentPage: page,
            totalPages,
            totalReports,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      logger.error('Error retrieving reports', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Resolve a report (Task 22.2)
   */
  async resolveReport(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const requestId = req.id;
      const { reportId } = req.params;

      // Validate UUID format (BUG-A009)
      if (!isValidUUID(reportId)) {
        await transaction.rollback();
        logger.warn('Invalid reportId format in resolveReport', {
          requestId,
          reportId,
          adminId: req.user.id,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid report ID format',
          },
        });
      }

      // Validation schema
      const resolveSchema = Joi.object({
        resolution: Joi.string().trim().min(10).max(1000).required(),
        actionTaken: Joi.string()
          .valid(
            'no_action',
            'warning_issued',
            'content_removed',
            'user_suspended',
            'user_banned',
            'other'
          )
          .required(),
        status: Joi.string().valid('resolved', 'dismissed').default('resolved'),
      });

      const { error: validationError, value: resolveData } = resolveSchema.validate(req.body);

      if (validationError) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: validationError.details[0].message,
        });
      }

      const report = await Report.findByPk(reportId, {
        include: [
          { model: User, as: 'reporter' },
          { model: User, as: 'reportedUser' },
        ],
        transaction,
      });

      if (!report) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Report not found',
        });
      }

      if (report.status === 'resolved' || report.status === 'dismissed') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Report has already been resolved or dismissed',
        });
      }

      // BUG-A004: Update report in transaction
      await report.update(
        {
          status: resolveData.status,
          resolution: resolveData.resolution,
          actionTaken: resolveData.actionTaken,
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
        },
        { transaction }
      );

      // BUG-A004: Log admin action in transaction
      await auditService.logAdminAction(
        {
          requestId,
          adminId: req.user.id,
          action: 'report_resolve',
          resource: 'report',
          resourceId: report.id,
          details: {
            reportType: report.reportType,
            reason: report.reason,
            actionTaken: resolveData.actionTaken,
            resolution: resolveData.resolution,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'high',
          status: 'success',
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('Report resolved successfully', {
        requestId,
        reportId,
        resolvedBy: req.user.id,
        actionTaken: resolveData.actionTaken,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Report resolved successfully',
        data: {
          id: report.id,
          status: report.status,
          resolution: report.resolution,
          actionTaken: report.actionTaken,
          reviewedBy: report.reviewedBy,
          reviewedAt: report.reviewedAt,
        },
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error resolving report', {
        requestId: req.id,
        reportId: req.params.reportId,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Export audit logs to CSV
   */
  async exportAuditLogsCSV(req, res) {
    try {
      const requestId = req.id;
      const filters = req.query;

      // BUG-A007: Enforce hard export limit
      const MAX_EXPORT_LIMIT = 500;
      const requestedLimit = parseInt(filters.limit) || 500;

      if (requestedLimit > MAX_EXPORT_LIMIT) {
        logger.warn('Export limit exceeded', {
          requestId,
          adminId: req.user.id,
          requestedLimit,
          maxLimit: MAX_EXPORT_LIMIT,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            type: 'EXPORT_LIMIT_EXCEEDED',
            message: `Export limit cannot exceed ${MAX_EXPORT_LIMIT} records. Use date filters to narrow results.`,
            maxLimit: MAX_EXPORT_LIMIT,
          },
        });
      }

      filters.limit = Math.min(requestedLimit, MAX_EXPORT_LIMIT);

      // BUG-A011: Add error handling for dynamic import
      let exportService;
      try {
        exportService = await import('./exportService.js');
      } catch (importError) {
        logger.error('Failed to load export service', {
          requestId,
          error: importError.message,
        });
        return res.status(500).json({
          success: false,
          error: 'Export service unavailable',
        });
      }

      const csvData = await exportService.default.exportAuditLogsCSV(filters);

      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
      );

      logger.info('Audit logs CSV export completed', {
        requestId,
        adminId: req.user.id,
        filters,
        recordCount: csvData.split('\n').length - 1,
        ip: req.ip,
      });

      res.send(csvData);
    } catch (error) {
      logger.error('Error exporting audit logs to CSV', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Export audit logs to PDF
   */
  async exportAuditLogsPDF(req, res) {
    try {
      const requestId = req.id;
      const filters = req.query;

      // BUG-A007: Enforce hard export limit
      const MAX_EXPORT_LIMIT = 500;
      const requestedLimit = parseInt(filters.limit) || 500;

      if (requestedLimit > MAX_EXPORT_LIMIT) {
        logger.warn('Export limit exceeded', {
          requestId,
          adminId: req.user.id,
          requestedLimit,
          maxLimit: MAX_EXPORT_LIMIT,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            type: 'EXPORT_LIMIT_EXCEEDED',
            message: `Export limit cannot exceed ${MAX_EXPORT_LIMIT} records. Use date filters to narrow results.`,
            maxLimit: MAX_EXPORT_LIMIT,
          },
        });
      }

      filters.limit = Math.min(requestedLimit, MAX_EXPORT_LIMIT);

      // BUG-A011: Add error handling for dynamic import
      let exportService;
      try {
        exportService = await import('./exportService.js');
      } catch (importError) {
        logger.error('Failed to load export service', {
          requestId,
          error: importError.message,
        });
        return res.status(500).json({
          success: false,
          error: 'Export service unavailable',
        });
      }

      const pdfBuffer = await exportService.default.exportAuditLogsPDF(filters);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.pdf"`
      );

      logger.info('Audit logs PDF export completed', {
        requestId,
        adminId: req.user.id,
        filters,
        ip: req.ip,
      });

      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error exporting audit logs to PDF', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Export reports to CSV
   */
  async exportReportsCSV(req, res) {
    try {
      const requestId = req.id;
      const filters = req.query;

      const exportService = await import('./exportService.js');
      const csvData = await exportService.default.exportReportsCSV(filters);

      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="reports-${new Date().toISOString().split('T')[0]}.csv"`
      );

      logger.info('Reports CSV export completed', {
        requestId,
        adminId: req.user.id,
        filters,
        ip: req.ip,
      });

      res.send(csvData);
    } catch (error) {
      logger.error('Error exporting reports to CSV', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Export reports to PDF
   */
  async exportReportsPDF(req, res) {
    try {
      const requestId = req.id;
      const filters = req.query;

      const exportService = await import('./exportService.js');
      const pdfBuffer = await exportService.default.exportReportsPDF(filters);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="reports-${new Date().toISOString().split('T')[0]}.pdf"`
      );

      logger.info('Reports PDF export completed', {
        requestId,
        adminId: req.user.id,
        filters,
        ip: req.ip,
      });

      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error exporting reports to PDF', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Export statistics to CSV
   */
  async exportStatisticsCSV(req, res) {
    try {
      const requestId = req.id;

      const exportService = await import('./exportService.js');
      const csvData = await exportService.default.exportStatisticsCSV();

      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="statistics-${new Date().toISOString().split('T')[0]}.csv"`
      );

      logger.info('Statistics CSV export completed', {
        requestId,
        adminId: req.user.id,
        ip: req.ip,
      });

      res.send(csvData);
    } catch (error) {
      logger.error('Error exporting statistics to CSV', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Export statistics to PDF
   */
  async exportStatisticsPDF(req, res) {
    try {
      const requestId = req.id;

      const exportService = await import('./exportService.js');
      const pdfBuffer = await exportService.default.exportStatisticsPDF();

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="statistics-${new Date().toISOString().split('T')[0]}.pdf"`
      );

      logger.info('Statistics PDF export completed', {
        requestId,
        adminId: req.user.id,
        ip: req.ip,
      });

      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error exporting statistics to PDF', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Get monitoring dashboard data (Task 23.3)
   */
  async getMonitoringData(req, res) {
    try {
      const requestId = req.id;

      // CPU, RAM, and disk usage would typically be collected using a library like `os-utils` or `systeminformation`
      // For now, we'll simulate this data.
      const monitoringData = {
        cpuUsage: Math.random() * 100,
        ramUsage: process.memoryUsage().rss,
        totalRam: os.totalmem(),
        diskUsage: 'N/A', // Requires a library to calculate
        dbConnectionPool: sequelize.connectionManager.pool.size,
        activeWebsocketConnections: 'N/A', // This would be tracked in the websocket service
        messageDeliveryLatency: 'N/A', // This would require tracking message timestamps
        errorRates: 'N/A', // This would be tracked in an error monitoring service
      };

      logger.info('Monitoring data retrieved successfully', {
        requestId,
        adminId: req.user.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: monitoringData,
      });
    } catch (error) {
      logger.error('Error retrieving monitoring data', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Get system settings (Task 23.1)
   * FIX BUG-SS001: Now reads from database instead of returning hardcoded values
   */
  async getSystemSettings(req, res) {
    try {
      const requestId = req.id;

      // Default settings (used when no DB records exist)
      const defaultSettings = {
        messageRetention: 30,
        maxFileSize: 25,
        maxGroupSize: 20,
        registrationApprovalMode: 'manual',
        maintenanceMode: false,
        featureFlags: {
          fileSharing: true,
          videoCalling: true,
          groupChats: true,
          endToEndEncryption: true,
        },
        rateLimiting: {
          loginAttempts: 5,
          apiRequestsPerMinute: 100,
          messagesPerMinute: 30,
        },
        notifications: {
          emailEnabled: true,
          pushEnabled: true,
          inAppEnabled: true,
        },
      };

      // Fetch all settings from database
      const dbSettings = await SystemSetting.findAll({
        attributes: ['key', 'value'],
      });

      // Convert DB records to settings object
      const settings = { ...defaultSettings };
      dbSettings.forEach(setting => {
        try {
          const keys = setting.key.split('.');
          let target = settings;

          // Navigate nested structure (e.g., "featureFlags.fileSharing")
          for (let i = 0; i < keys.length - 1; i++) {
            if (!target[keys[i]]) {
              target[keys[i]] = {};
            }
            target = target[keys[i]];
          }

          // Parse value (handles JSON, booleans, numbers)
          let parsedValue = setting.value;
          try {
            parsedValue = JSON.parse(setting.value);
          } catch {
            // If not JSON, use string value
          }

          target[keys[keys.length - 1]] = parsedValue;
        } catch (parseError) {
          logger.warn('Failed to parse setting', {
            key: setting.key,
            error: parseError.message,
          });
        }
      });

      logger.info('System settings retrieved successfully', {
        requestId,
        adminId: req.user.id,
        settingsCount: dbSettings.length,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error('Error retrieving system settings', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Update system settings (Task 23.1)
   * FIX BUG-SS001, SS003, SS004: Now saves to database with transactions and bulkCreate
   */
  async updateSystemSettings(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const requestId = req.id;

      // Validation schema
      const settingsSchema = Joi.object({
        messageRetention: Joi.number().integer().min(7).max(365),
        maxFileSize: Joi.number().integer().min(1).max(100),
        maxGroupSize: Joi.number().integer().min(2).max(50),
        registrationApprovalMode: Joi.string().valid('manual', 'auto'),
        maintenanceMode: Joi.boolean(),
        featureFlags: Joi.object({
          fileSharing: Joi.boolean(),
          videoCalling: Joi.boolean(),
          groupChats: Joi.boolean(),
          endToEndEncryption: Joi.boolean(),
        }).unknown(true), // Allow additional feature flags
        rateLimiting: Joi.object({
          enabled: Joi.boolean(),
          loginAttempts: Joi.number().integer().min(3).max(10),
          apiRequestsPerMinute: Joi.number().integer().min(10).max(1000),
          messagesPerMinute: Joi.number().integer().min(10).max(100),
        }).unknown(true), // Allow additional rate limiting settings
        notifications: Joi.object({
          emailEnabled: Joi.boolean(),
          pushEnabled: Joi.boolean(),
          inAppEnabled: Joi.boolean(),
        }).unknown(true), // Allow additional notification settings
      }).unknown(true); // Allow additional top-level settings

      const { error: validationError, value: settingsData } = settingsSchema.validate(req.body);

      if (validationError) {
        await transaction.rollback();
        logger.warn('System settings validation failed', {
          requestId,
          error: validationError.details[0].message,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: validationError.details[0].message,
        });
      }

      // Flatten nested settings to key-value pairs
      const flattenSettings = (obj, prefix = '') => {
        const result = [];
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result.push(...flattenSettings(value, fullKey));
          } else {
            result.push({
              key: fullKey,
              value: JSON.stringify(value),
            });
          }
        }
        return result;
      };

      const settingsArray = flattenSettings(settingsData);

      // FIX BUG-SS004: Use bulkCreate instead of loop
      await SystemSetting.bulkCreate(settingsArray, {
        updateOnDuplicate: ['value', 'updatedAt'],
        transaction,
      });

      // Log admin action (within transaction)
      await auditService.logAdminAction(
        {
          requestId,
          adminId: req.user.id,
          action: 'settings_update',
          resource: 'system_settings',
          resourceId: null,
          details: {
            updatedKeys: settingsArray.map(s => s.key),
            newSettings: settingsData,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'high',
          status: 'success',
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('System settings updated successfully', {
        requestId,
        adminId: req.user.id,
        settingsCount: settingsArray.length,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'System settings updated successfully',
        data: settingsData,
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating system settings', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Operation failed',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }
}

// Create and export singleton instance
const adminController = new AdminController();
export default adminController;
