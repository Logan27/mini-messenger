import callService from '../services/callService.js';

// FIX BUG-C001: Standardized API response format to match application standard

const initiateCall = async (req, res, next) => {
  try {
    const { recipientId, callType } = req.body;
    const call = await callService.initiateCall({
      callerId: req.user.id,
      recipientId,
      callType,
    });
    res.status(201).json({
      success: true,
      data: call,
      message: 'Call initiated successfully',
    });
  } catch (error) {
    next(error);
  }
};

const respondToCall = async (req, res, next) => {
  try {
    const { callId, response } = req.body;
    const call = await callService.respondToCall({
      callId,
      recipientId: req.user.id,
      response,
    });
    res.json({
      success: true,
      data: call,
      message: `Call ${response === 'accept' ? 'accepted' : 'rejected'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

const getCallDetails = async (req, res, next) => {
  try {
    const { callId } = req.params;
    const call = await callService.getCallDetails({
      callId,
      userId: req.user.id,
    });
    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    next(error);
  }
};

const endCall = async (req, res, next) => {
  try {
    const { callId } = req.params;
    const call = await callService.endCall({
      callId,
      userId: req.user.id,
    });
    res.json({
      success: true,
      data: call,
      message: 'Call ended successfully',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  initiateCall,
  respondToCall,
  getCallDetails,
  endCall,
};
