// FIX BUG-C008: Call timeout mechanism to mark unanswered calls as 'missed'

import cron from 'node-cron';
import { Op } from 'sequelize';

import { Call } from '../models/index.js';
import { getIO } from '../services/websocket.js';
import logger from '../utils/logger.js';

const CALL_TIMEOUT_SECONDS = 60; // 1 minute timeout for ringing calls
const CONNECTED_CALL_TIMEOUT_SECONDS = 3600; // 1 hour timeout for connected calls

// Run every minute to check for expired calls
export const startCallExpiryJob = () => {
  cron.schedule('* * * * *', async () => {
    try {
      // Check for expired 'calling' calls
      const expiredCalls = await Call.findAll({
        where: {
          status: 'calling',
          created_at: {
            [Op.lt]: new Date(Date.now() - CALL_TIMEOUT_SECONDS * 1000),
          },
        },
      });

      // Check for expired 'connected' calls
      const expiredConnectedCalls = await Call.findAll({
        where: {
          status: 'connected',
          startedAt: {
            [Op.lt]: new Date(Date.now() - CONNECTED_CALL_TIMEOUT_SECONDS * 1000),
          },
        },
      });

      const io = getIO();

      // Process expired 'calling' calls
      if (expiredCalls.length > 0) {
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
      }

      // Process expired 'connected' calls
      if (expiredConnectedCalls.length > 0) {
        for (const call of expiredConnectedCalls) {
          call.status = 'ended';
          call.endedAt = new Date();
          call.durationSeconds = Math.floor(
            (call.endedAt.getTime() - call.startedAt.getTime()) / 1000
          );
          await call.save();

          logger.info('Connected call expired to ended status', {
            callId: call.id,
            callerId: call.callerId,
            recipientId: call.recipientId,
            duration: call.durationSeconds,
          });

          // Notify both parties via WebSocket
          if (io) {
            io.to(`user:${call.callerId}`).emit('call.ended', {
              callId: call.id,
              reason: 'timeout',
              timestamp: new Date().toISOString(),
            });

            io.to(`user:${call.recipientId}`).emit('call.ended', {
              callId: call.id,
              reason: 'timeout',
              timestamp: new Date().toISOString(),
            });
          }
        }

        logger.info(`Expired ${expiredConnectedCalls.length} connected calls to 'ended' status`);
      }
    } catch (error) {
      logger.error('Error in call expiry job', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  logger.info('Call expiry job started', {
    callingTimeoutSeconds: CALL_TIMEOUT_SECONDS,
    connectedTimeoutSeconds: CONNECTED_CALL_TIMEOUT_SECONDS,
    schedule: 'Every minute',
  });
};

export default startCallExpiryJob;
