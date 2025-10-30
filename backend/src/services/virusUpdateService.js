import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

import cron from 'node-cron';

import { config } from '../config/index.js';
import logger from '../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Virus Definition Update Service
 * Handles daily virus definition updates for ClamAV
 */
class VirusUpdateService {
  constructor() {
    this.isRunning = false;
    this.lastUpdate = null;
    this.updateInProgress = false;
    this.clamavDbPath = process.env.CLAMAV_DB_PATH || '/var/lib/clamav';
    this.clamavConfigPath = process.env.CLAMAV_CONFIG_PATH || '/etc/clamav';
  }

  /**
   * Initialize the virus update service
   */
  async initialize() {
    // Skip virus update service on Windows (ClamAV not available)
    if (process.platform === 'win32') {
      logger.warn('⚠️  Virus update service skipped on Windows (ClamAV not available)');
      return;
    }

    try {
      // Check if freshclam is available
      await this.checkFreshclamAvailability();

      // Schedule daily updates at 3 AM
      this.scheduleDailyUpdates();

      // Perform initial update check
      await this.checkForUpdates();

      logger.info('Virus update service initialized successfully');
    } catch (error) {
      logger.warn('Virus update service not available:', error.message);
      // Don't throw - allow app to continue without virus updates
    }
  }

  /**
   * Check if freshclam is available
   */
  async checkFreshclamAvailability() {
    try {
      await execAsync('which freshclam');
      logger.info('freshclam is available for virus definition updates');
    } catch (error) {
      logger.warn('freshclam not found, virus definition updates will not be available');
      throw new Error('freshclam is required for virus definition updates');
    }
  }

  /**
   * Schedule daily virus definition updates
   */
  scheduleDailyUpdates() {
    // Run daily at 3:00 AM
    cron.schedule(
      '0 3 * * *',
      async () => {
        logger.info('Starting scheduled virus definition update');
        await this.performUpdate();
      },
      {
        scheduled: false,
        timezone: process.env.TZ || 'UTC',
      }
    );

    logger.info('Daily virus definition update scheduled for 3:00 AM');
  }

  /**
   * Check if updates are needed
   */
  async checkForUpdates() {
    try {
      const dbPath = path.join(this.clamavDbPath, 'daily.cvd');
      const stats = await fs.stat(dbPath).catch(() => null);

      if (!stats) {
        logger.info('No virus database found, update needed');
        return true;
      }

      // Check if database is older than 24 hours
      const age = Date.now() - stats.mtime.getTime();
      const hoursOld = age / (1000 * 60 * 60);

      if (hoursOld > 24) {
        logger.info(`Virus database is ${hoursOld.toFixed(1)} hours old, update recommended`);
        return true;
      }

      logger.info(`Virus database is ${hoursOld.toFixed(1)} hours old, update not needed`);
      return false;
    } catch (error) {
      logger.error('Error checking virus database age:', error);
      return true; // Assume update needed if we can't check
    }
  }

  /**
   * Perform virus definition update
   */
  async performUpdate() {
    if (this.updateInProgress) {
      logger.info('Virus definition update already in progress, skipping');
      return;
    }

    this.updateInProgress = true;

    try {
      logger.info('Starting virus definition update...');

      // Update virus definitions using freshclam
      const { stdout, stderr } = await execAsync(
        `freshclam --config-file=${this.clamavConfigPath}/freshclam.conf --datadir=${this.clamavDbPath} --log=/dev/stdout`
      );

      if (stderr && !stderr.includes('WARNING')) {
        logger.warn('freshclam stderr output:', stderr);
      }

      logger.info('Virus definition update completed successfully');
      logger.debug('freshclam output:', stdout);

      this.lastUpdate = new Date();

      // Log successful update
      await this.logUpdate('success', {
        timestamp: this.lastUpdate.toISOString(),
        output: stdout,
      });

      // Notify admins of successful update
      await this.notifyAdminsOfUpdate('success', stdout);
    } catch (error) {
      logger.error('Virus definition update failed:', error);

      // Log failed update
      await this.logUpdate('failed', {
        timestamp: new Date().toISOString(),
        error: error.message,
      });

      // Notify admins of failed update
      await this.notifyAdminsOfUpdate('failed', error.message);

      throw error;
    } finally {
      this.updateInProgress = false;
    }
  }

  /**
   * Log update results
   */
  async logUpdate(status, details) {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      await fs.mkdir(logDir, { recursive: true });

      const logPath = path.join(logDir, 'virus-updates.log');
      const logEntry = {
        timestamp: new Date().toISOString(),
        status,
        details,
      };

      const logData = `${JSON.stringify(logEntry)}\n`;

      // Append to log file
      await fs.appendFile(logPath, logData);

      logger.info(`Virus update ${status} logged`, { status, timestamp: logEntry.timestamp });
    } catch (error) {
      logger.error('Error logging virus update:', error);
    }
  }

  /**
   * Notify admins of update results
   */
  async notifyAdminsOfUpdate(status, details) {
    try {
      // Get admin users
      const { User } = await import('../models/index.js');
      const adminUsers = await User.findAdmins();

      if (adminUsers.length === 0) {
        logger.warn('No admin users found for virus update notification');
        return;
      }

      // Create notification message
      const timestamp = new Date().toISOString();
      let message = '';

      if (status === 'success') {
        message = `Virus definitions updated successfully at ${timestamp}.`;
      } else {
        message = `Virus definition update failed at ${timestamp}. Error: ${details}`;
      }

      // Log notifications for all admins (you can extend this to use email service)
      for (const admin of adminUsers) {
        logger.info('VIRUS UPDATE NOTIFICATION', {
          adminId: admin.id,
          adminEmail: admin.email,
          status,
          message,
          timestamp,
        });

        // Here you could integrate with email service to send actual notifications
        // await emailService.sendVirusUpdateNotification(admin.email, { status, message, details });
      }
    } catch (error) {
      logger.error('Error sending admin virus update notification:', error);
    }
  }

  /**
   * Get update status and history
   */
  async getUpdateStatus() {
    try {
      const logPath = path.join(process.cwd(), 'logs', 'virus-updates.log');

      let updateHistory = [];
      try {
        const logData = await fs.readFile(logPath, 'utf8');
        updateHistory = logData
          .trim()
          .split('\n')
          .map(line => {
            try {
              return JSON.parse(line);
            } catch (error) {
              return null;
            }
          })
          .filter(entry => entry !== null)
          .slice(-10); // Last 10 updates
      } catch (error) {
        // Log file doesn't exist yet
      }

      const needsUpdate = await this.checkForUpdates();

      return {
        lastUpdate: this.lastUpdate,
        updateInProgress: this.updateInProgress,
        needsUpdate,
        updateHistory,
        dbPath: this.clamavDbPath,
      };
    } catch (error) {
      logger.error('Error getting update status:', error);
      throw error;
    }
  }

  /**
   * Force immediate update (admin function)
   */
  async forceUpdate() {
    logger.info('Admin requested immediate virus definition update');
    return await this.performUpdate();
  }
}

// Create and export singleton instance
const virusUpdateService = new VirusUpdateService();
export default virusUpdateService;
