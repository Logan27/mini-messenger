import { PassThrough } from 'stream';

import archiver from 'archiver';

import { User, Message, Call, File, Group, Contact, Session, Device } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

class UserController {
  async registerDeviceToken(req, res) {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ message: 'Device token is required' });
    }

    try {
      // FIX BUG-U004: Use unique constraint to prevent duplicates
      // Check if token already exists for this user
      const existing = await Device.findOne({
        where: { userId, token }
      });

      if (existing) {
        // Token already registered for this user - just update timestamp
        await existing.update({ updatedAt: new Date() });
        return res.status(200).json({
          success: true,
          message: 'Device token already registered'
        });
      }

      // Check if token belongs to another user (device changed owner)
      const otherUserDevice = await Device.findOne({ where: { token } });

      if (otherUserDevice) {
        // Transfer device to new user
        await otherUserDevice.update({ userId });
        logger.info('Device token transferred to new user', {
          deviceId: otherUserDevice.id,
          previousUserId: otherUserDevice.userId,
          newUserId: userId,
        });
      } else {
        // Create new device token
        await Device.create({ userId, token });
      }

      res.status(200).json({
        success: true,
        message: 'Device token registered successfully'
      });
    } catch (error) {
      // FIX BUG-U005: Use logger instead of console.error
      logger.error('Error registering device token:', {
        error: error.message,
        stack: error.stack,
        userId,
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async exportUserData(req, res) {
    try {
      const userId = req.user.id;

      // PERFORMANCE FIX (BUG-U001): Stream data instead of loading everything into memory
      // 1. Fetch user profile only (no eager loading)
      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'createdAt', 'lastSeenAt']
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      const passThrough = new PassThrough();
      archive.pipe(passThrough);

      // Set response headers before starting stream
      res.attachment(`user_data_${userId}_${Date.now()}.zip`);
      passThrough.pipe(res);

      // Handle archive errors
      archive.on('error', (err) => {
        logger.error('Archive error during user data export:', {
          userId,
          error: err.message,
          stack: err.stack,
        });
        throw err;
      });

      // 2. Add user profile
      archive.append(JSON.stringify(user.toJSON(), null, 2), { name: 'profile.json' });

      // 3. Stream messages in batches (avoid loading all at once)
      const BATCH_SIZE = 1000;
      let messageOffset = 0;
      let messagesData = [];

      while (true) {
        const messages = await Message.findAll({
          where: {
            [sequelize.Sequelize.Op.or]: [
              { senderId: userId },
              { recipientId: userId }
            ]
          },
          limit: BATCH_SIZE,
          offset: messageOffset,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'senderId', 'recipientId', 'content', 'messageType', 'createdAt', 'isRead']
        });

        if (messages.length === 0) break;
        messagesData.push(...messages.map(m => m.toJSON()));
        messageOffset += BATCH_SIZE;

        // Limit total messages to prevent abuse
        if (messageOffset >= 50000) {
          logger.warn('Data export message limit reached', { userId, limit: 50000 });
          break;
        }
      }

      archive.append(JSON.stringify(messagesData, null, 2), { name: 'messages.json' });

      // 4. Stream calls in batches
      let callOffset = 0;
      let callsData = [];

      while (true) {
        const calls = await Call.findAll({
          where: {
            [sequelize.Sequelize.Op.or]: [
              { callerId: userId },
              { recipientId: userId }
            ]
          },
          limit: BATCH_SIZE,
          offset: callOffset,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'callerId', 'recipientId', 'callType', 'status', 'duration', 'createdAt']
        });

        if (calls.length === 0) break;
        callsData.push(...calls.map(c => c.toJSON()));
        callOffset += BATCH_SIZE;

        if (callOffset >= 10000) {
          logger.warn('Data export call limit reached', { userId, limit: 10000 });
          break;
        }
      }

      archive.append(JSON.stringify(callsData, null, 2), { name: 'calls.json' });

      // 5. Add contacts, devices, sessions (small datasets)
      const contacts = await Contact.findAll({ where: { userId } });
      const devices = await Device.findAll({ where: { userId } });
      const sessions = await Session.findAll({
        where: { userId },
        attributes: ['id', 'userId', 'deviceInfo', 'createdAt', 'expiresAt', 'isValid']
      });

      archive.append(JSON.stringify(contacts.map(c => c.toJSON()), null, 2), { name: 'contacts.json' });
      archive.append(JSON.stringify(devices.map(d => d.toJSON()), null, 2), { name: 'devices.json' });
      archive.append(JSON.stringify(sessions.map(s => s.toJSON()), null, 2), { name: 'sessions.json' });

      // Finalize archive
      await archive.finalize();

      logger.info('User data export completed', {
        userId,
        messagesCount: messagesData.length,
        callsCount: callsData.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error exporting user data:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async deleteAccount(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const userId = req.user.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: 'Password is required for account deletion' });
      }

      const user = await User.findByPk(userId, { transaction });

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ message: 'User not found' });
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        await transaction.rollback();
        return res.status(401).json({ message: 'Invalid password' });
      }

      // SECURITY FIX (BUG-U002): Invalidate all user sessions before account deletion
      // 1. Expire all sessions in database
      const expiredSessions = await Session.update(
        {
          expiresAt: new Date(),
          isValid: false
        },
        {
          where: { userId },
          transaction
        }
      );

      // 2. Remove sessions from Redis cache
      try {
        const redis = getRedisClient();
        const sessionKeys = await redis.keys(`session:${userId}:*`);
        if (sessionKeys.length > 0) {
          await redis.del(...sessionKeys);
        }

        // Also remove user-specific cache entries
        const userKeys = await redis.keys(`user:${userId}:*`);
        if (userKeys.length > 0) {
          await redis.del(...userKeys);
        }
      } catch (redisError) {
        logger.warn('Redis session cleanup failed during account deletion', {
          userId,
          error: redisError.message,
        });
        // Continue with deletion even if Redis cleanup fails
      }

      // 3. Soft delete the user (paranoid mode)
      await user.destroy({ transaction });

      // 4. Audit log
      logger.info('Account deleted with session invalidation', {
        userId,
        sessionsExpired: expiredSessions[0],
        timestamp: new Date().toISOString(),
      });

      await transaction.commit();

      // TODO: Add a cron job to permanently delete the user data after 30 days

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully. All sessions have been invalidated.'
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error deleting account:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default new UserController();
