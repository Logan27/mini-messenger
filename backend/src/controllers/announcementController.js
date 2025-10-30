import Joi from 'joi';
import { Op } from 'sequelize';

import { Announcement, sequelize } from '../models/index.js';
import auditService from '../services/auditService.js';
import logger from '../utils/logger.js';

// Validation schema for announcements
const announcementSchema = Joi.object({
  title: Joi.string().trim().min(3).max(255).required(),
  message: Joi.string().trim().min(10).required(),
  link: Joi.string().trim().uri().optional().allow(null, ''),
  expiresAt: Joi.date().iso().optional().allow(null),
});

class AnnouncementController {
  /**
   * Get all announcements (for admin)
   */
  async getAllAnnouncements(req, res) {
    try {
      const announcements = await Announcement.findAll({
        order: [['createdAt', 'DESC']],
      });
      res.json({
        success: true,
        data: announcements,
      });
    } catch (error) {
      logger.error('Error retrieving all announcements', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to retrieve announcements',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Get active announcements (for users)
   * FIX BUG-AN006, AN011: Now filters expired announcements and adds pagination
   */
  async getActiveAnnouncements(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const now = new Date();

      // FIX BUG-AN006: Filter out expired announcements
      const { rows: announcements, count } = await Announcement.findAndCountAll({
        where: {
          [Op.or]: [
            { expiresAt: null }, // No expiration
            { expiresAt: { [Op.gt]: now } }, // Not yet expired
          ],
        },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      res.json({
        success: true,
        data: announcements,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      logger.error('Error retrieving active announcements', {
        requestId: req.id,
        userId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to retrieve announcements',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      });
    }
  }

  /**
   * Create a new announcement
   * FIX BUG-AN010: Now uses transaction
   */
  async createAnnouncement(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const requestId = req.id;
      const { error, value } = announcementSchema.validate(req.body);

      if (error) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const announcement = await Announcement.create(
        {
          ...value,
          createdBy: req.user.id,
        },
        { transaction }
      );

      await auditService.logAdminAction(
        {
          requestId,
          adminId: req.user.id,
          action: 'announcement_create',
          resource: 'announcement',
          resourceId: announcement.id,
          details: { title: value.title },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium',
          status: 'success',
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('Announcement created successfully', {
        requestId,
        adminId: req.user.id,
        announcementId: announcement.id,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        data: announcement,
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating announcement', {
        requestId: req.id,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update an announcement (Admin only)
   * FIX BUG-AN007: Adding update method with proper database operations
   */
  async updateAnnouncement(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const requestId = req.id;
      const { announcementId } = req.params;

      // Validation schema for updates
      const updateSchema = Joi.object({
        title: Joi.string().trim().min(3).max(255),
        message: Joi.string().trim().min(10),
        link: Joi.string().trim().uri().optional().allow(null, ''),
        expiresAt: Joi.date().iso().optional().allow(null),
      }).min(1); // At least one field must be provided

      const { error, value } = updateSchema.validate(req.body);

      if (error) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const announcement = await Announcement.findByPk(announcementId, { transaction });

      if (!announcement) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Announcement not found',
        });
      }

      await announcement.update(value, { transaction });

      await auditService.logAdminAction(
        {
          requestId,
          adminId: req.user.id,
          action: 'announcement_update',
          resource: 'announcement',
          resourceId: announcement.id,
          details: { updateFields: Object.keys(value), title: announcement.title },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium',
          status: 'success',
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('Announcement updated successfully', {
        requestId,
        adminId: req.user.id,
        announcementId: announcement.id,
        updateFields: Object.keys(value),
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Announcement updated successfully',
        data: announcement,
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating announcement', {
        requestId: req.id,
        announcementId: req.params.announcementId,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Delete an announcement (Admin only)
   * FIX BUG-AN008: Adding delete method with proper database operations
   */
  async deleteAnnouncement(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const requestId = req.id;
      const { announcementId } = req.params;

      const announcement = await Announcement.findByPk(announcementId, { transaction });

      if (!announcement) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Announcement not found',
        });
      }

      const announcementTitle = announcement.title;

      await announcement.destroy({ transaction });

      await auditService.logAdminAction(
        {
          requestId,
          adminId: req.user.id,
          action: 'announcement_delete',
          resource: 'announcement',
          resourceId: announcementId,
          details: { title: announcementTitle },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium',
          status: 'success',
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('Announcement deleted successfully', {
        requestId,
        adminId: req.user.id,
        announcementId,
        title: announcementTitle,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Announcement deleted successfully',
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error deleting announcement', {
        requestId: req.id,
        announcementId: req.params.announcementId,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

const announcementController = new AnnouncementController();
export default announcementController;
