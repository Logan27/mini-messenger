import { Call, User, Message, sequelize } from '../models/index.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import { Op } from 'sequelize';
import { getIO } from './websocket.js';
import logger from '../utils/logger.js';

// FIX BUG-C003, C005, C006, C007, C010, C011: Comprehensive fixes
const initiateCall = async ({ callerId, recipientId, callType }) => {
  const transaction = await sequelize.transaction();
  try {
    // FIX BUG-C007: Prevent self-calls
    if (callerId === recipientId) {
      throw new ValidationError('Cannot call yourself');
    }

    // FIX BUG-C011: Validate recipient exists and is active
    const recipient = await User.findByPk(recipientId, { transaction });
    if (!recipient) {
      throw new NotFoundError('Recipient not found');
    }

    if (recipient.approvalStatus !== 'approved') {
      throw new ValidationError('Cannot call user who is not approved');
    }

    // FIX BUG-C006: Check if caller has active calls
    const activeCallerCalls = await Call.count({
      where: {
        [Op.or]: [
          { callerId, status: { [Op.in]: ['calling', 'connected'] } },
          { recipientId: callerId, status: { [Op.in]: ['calling', 'connected'] } },
        ],
      },
      transaction,
    });

    if (activeCallerCalls > 0) {
      throw new ValidationError('You already have an active call. End it before starting a new one.');
    }

    // Check if recipient has active calls
    const activeRecipientCalls = await Call.count({
      where: {
        [Op.or]: [
          { callerId: recipientId, status: { [Op.in]: ['calling', 'connected'] } },
          { recipientId, status: { [Op.in]: ['calling', 'connected'] } },
        ],
      },
      transaction,
    });

    if (activeRecipientCalls > 0) {
      throw new ValidationError('Recipient is already on another call');
    }

    const call = await Call.create({
      callerId,
      recipientId,
      callType,
      status: 'calling',
    }, { transaction });

    await transaction.commit();

    // Fetch call with user details for WebSocket notification
    const callWithDetails = await Call.findByPk(call.id, {
      include: [
        { model: User, as: 'caller', attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'] },
        { model: User, as: 'recipient', attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'] },
      ],
    });

    // FIX BUG-C010: Add audit logging
    logger.info('Call initiated', {
      callId: call.id,
      callerId,
      recipientId,
      callType,
      timestamp: new Date().toISOString(),
    });

    // FIX BUG-C005: Implement WebSocket integration
    const io = getIO();
    if (io) {
      io.to(`user:${recipientId}`).emit('call.incoming', {
        call: callWithDetails,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.warn('WebSocket not available, call notification not sent', {
        callId: call.id,
        recipientId,
      });
    }

    return callWithDetails;
  } catch (error) {
    // Only rollback if transaction hasn't been committed or rolled back
    if (!transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
};

// FIX BUG-C003, C005, C009, C010, C012: Comprehensive fixes
const respondToCall = async ({ callId, recipientId, response }) => {
  const transaction = await sequelize.transaction();
  try {
    // FIX BUG-C012: Lock row to prevent race conditions
    const call = await Call.findByPk(callId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!call || call.recipientId !== recipientId) {
      throw new NotFoundError('Call not found');
    }

    // FIX BUG-C009: Validate current status
    if (call.status !== 'calling') {
      throw new ValidationError(`Cannot respond to call in status: ${call.status}. Call must be in 'calling' status.`);
    }

    let callMessage = null;
    if (response === 'accept') {
      call.status = 'connected';
      call.startedAt = new Date();
    } else {
      call.status = 'rejected';
      call.endedAt = new Date();
      // Create call message for rejected calls
      callMessage = await createCallMessage(call, transaction);
    }

    await call.save({ transaction });
    await transaction.commit();

    // Fetch call with user details for WebSocket notification
    const callWithDetails = await Call.findByPk(callId, {
      include: [
        { model: User, as: 'caller', attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'] },
        { model: User, as: 'recipient', attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'] },
      ],
    });

    // FIX BUG-C010: Add audit logging
    logger.info('Call response', {
      callId,
      recipientId,
      response,
      newStatus: call.status,
      timestamp: new Date().toISOString(),
    });

    // FIX BUG-C005: Implement WebSocket integration
    const io = getIO();
    if (io) {
      // Notify caller with full call details
      io.to(`user:${call.callerId}`).emit('call.response', {
        callId,
        response,
        call: callWithDetails,
        timestamp: new Date().toISOString(),
      });

      // Emit message.new event for rejected calls so they appear in chat immediately
      if (callMessage) {
        const messageWithSender = await Message.findByPk(callMessage.id, {
          include: [
            { model: User, as: 'sender', attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'] },
          ],
        });

        // Emit flat message object (not nested) to match expected format
        const messageData = messageWithSender.toJSON();
        io.to(`user:${call.callerId}`).emit('message.new', messageData);
        io.to(`user:${call.recipientId}`).emit('message.new', messageData);
      }
    } else {
      logger.warn('WebSocket not available, call response notification not sent', {
        callId,
        callerId: call.callerId,
      });
    }

    return callWithDetails;
  } catch (error) {
    // Only rollback if transaction hasn't been committed or rolled back
    if (!transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
};

const getCallDetails = async ({ callId, userId }) => {
  const call = await Call.findByPk(callId, {
    include: [
      { model: User, as: 'caller' },
      { model: User, as: 'recipient' },
    ],
  });

  if (!call) {
    throw new NotFoundError('Call not found');
  }

  if (call.callerId !== userId && call.recipientId !== userId) {
    throw new ForbiddenError('You are not a participant in this call');
  }

  return call;
};

// FIX BUG-C003, C004, C005, C009, C010: Comprehensive fixes
const endCall = async ({ callId, userId }) => {
  const transaction = await sequelize.transaction();
  try {
    const call = await Call.findByPk(callId, { transaction });

    if (!call) {
      throw new NotFoundError('Call not found');
    }

    if (call.callerId !== userId && call.recipientId !== userId) {
      throw new ForbiddenError('You are not a participant in this call');
    }

    // FIX BUG-C009: Validate can only end active calls
    // Allow ending calls in any non-final state (calling, connected, ringing)
    // Skip if already in final state (ended, rejected, missed, failed)
    if (['ended', 'rejected', 'missed', 'failed'].includes(call.status)) {
      // Call already in final state, return as-is without error
      return call;
    }

    if (call.status === 'connected') {
      call.status = 'ended';
      call.endedAt = new Date();
      // FIX BUG-C004: Convert milliseconds to seconds
      call.durationSeconds = Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000);
    } else {
      // Ending a ringing call = cancelled/missed
      call.status = 'missed';
      call.endedAt = new Date();
    }

    await call.save({ transaction });

    // Create call message in chat
    const callMessage = await createCallMessage(call, transaction);

    await transaction.commit();

    // FIX BUG-C010: Add audit logging
    logger.info('Call ended', {
      callId,
      userId,
      duration: call.durationSeconds,
      status: call.status,
      timestamp: new Date().toISOString(),
    });

    // FIX BUG-C005: Implement WebSocket integration
    const io = getIO();
    if (io) {
      const otherParticipantId = call.callerId === userId ? call.recipientId : call.callerId;
      io.to(`user:${otherParticipantId}`).emit('call.ended', {
        callId,
        endedBy: userId,
        call,
        timestamp: new Date().toISOString(),
      });

      // Emit message.new event so call appears in chat immediately with full message data
      const messageWithSender = await Message.findByPk(callMessage.id, {
        include: [
          { model: User, as: 'sender', attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'] },
        ],
      });

      // Emit flat message object (not nested) to match expected format
      const messageData = messageWithSender.toJSON();
      io.to(`user:${call.callerId}`).emit('message.new', messageData);
      io.to(`user:${call.recipientId}`).emit('message.new', messageData);
    } else {
      logger.warn('WebSocket not available, call ended notification not sent', {
        callId,
      });
    }

    return call;
  } catch (error) {
    // Only rollback if transaction hasn't been committed or rolled back
    if (!transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
};

// Helper function to create a message entry for a call
const createCallMessage = async (call, transaction) => {
  // Determine call status for message
  let callStatus = call.status;
  if (call.status === 'ended') {
    callStatus = 'completed';
  }

  // Determine message status - missed/cancelled/rejected calls are unread for recipient
  let messageStatus = 'sent';
  if (['missed', 'rejected'].includes(call.status)) {
    // These calls should appear as unread for the recipient
    messageStatus = 'sent'; // Not 'read', so they count as unread
  } else if (call.status === 'ended') {
    // Completed calls are not considered "unread" - both parties were on the call
    messageStatus = 'delivered';
  }

  // Create message for both participants
  const messageData = {
    senderId: call.callerId,
    recipientId: call.recipientId,
    content: `${call.callType} call`, // Required by validation, actual call info in metadata
    messageType: 'call',
    status: messageStatus,
    metadata: {
      callId: call.id,
      callType: call.callType,
      callStatus: callStatus,
      callDuration: call.durationSeconds || 0,
    },
  };

  try {
    const message = await Message.create(messageData, { transaction });

    logger.info('Call message created', {
      messageId: message.id,
      callId: call.id,
      callStatus,
      messageStatus,
    });

    return message;
  } catch (error) {
    logger.error('Failed to create call message', {
      callId: call.id,
      error: error.message,
      errorName: error.name,
      callStatus,
      messageStatus,
    });
    // Throw error to trigger transaction rollback in parent function
    throw error;
  }
};

export default {
  initiateCall,
  respondToCall,
  getCallDetails,
  endCall,
};
