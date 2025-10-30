// FIX BUG-C008: Call timeout mechanism to mark unanswered calls as 'missed'

import cron from 'node-cron';
import { Call } from '../models/index.js';
import { Op } from 'sequelize';
import { getIO } from '../services/websocket.js';
import logger from '../utils/logger.js';

const CALL_TIMEOUT_SECONDS = 60; // 1 minute timeout for ringing calls

// Run every minute to check for expired calls
export const startCallExpiryJob = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const expiredCalls = await Call.findAll({
        where: {
          status: 'calling',
          createdAt: {
            [Op.lt]: new Date(Date.now() - CALL_TIMEOUT_SECONDS * 1000),
          },
        },
      });

      if (expiredCalls.length === 0) {
        return;
      }

      const io = getIO();

      for (const call of expiredCalls) {
        call.status = 'missed';
        call.endedAt = new Date();
        await call.save();

        logger.info('Call expired to missed status', {
          callId: call.id,
          callerId: call.callerId,
          recipientId: call.recipientId,
          duration: CALL_TIMEOUT_SECONDS,
        });

        // Notify both parties via WebSocket
        if (io) {
          io.to(`user:${call.callerId}`).emit('call.missed', {
            callId: call.id,
            reason: 'timeout',
            timestamp: new Date().toISOString(),
          });

          io.to(`user:${call.recipientId}`).emit('call.missed', {
            callId: call.id,
            reason: 'timeout',
            timestamp: new Date().toISOString(),
          });
        }
      }

      logger.info(`Expired ${expiredCalls.length} calls to 'missed' status`);
    } catch (error) {
      logger.error('Error in call expiry job', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  logger.info('Call expiry job started', {
    timeoutSeconds: CALL_TIMEOUT_SECONDS,
    schedule: 'Every minute',
  });
};

export default startCallExpiryJob;
