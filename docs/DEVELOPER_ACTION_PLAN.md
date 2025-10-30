# DEVELOPER ACTION PLAN
## Blocking Bugs - Fix Priority Order

**Generated**: October 25, 2025  
**QA Engineer**: <Senior QA Engineer>  
**Status**: ❌ RELEASE BLOCKED - 6 CRITICAL/HIGH BUGS  
**Estimated Fix Time**: 11-17 hours

---

## PRIORITY 1: SECURITY BLOCKERS (Must Fix Today)

### BUG-M001: SQL Injection in Message Search ⏱️ 2 hours

**File**: `backend/src/routes/messages.js`  
**Lines**: 1267-1268, 1350

**Current Code (VULNERABLE)**:
```javascript
// Line 1267-1268
sequelize.literal(`'${searchQuery.replace(/'/g, "''")}:*'`)

// Line 1350
sequelize.literal(
  `ts_rank(to_tsvector('english', content), to_tsquery('english', '${searchQuery.replace(/'/g, "''")}:*'))`
)
```

**FIX**:
```javascript
// Replace with parameterized query
const { Op } = require('sequelize');

// Option 1: Use Sequelize operators (safest)
whereConditions.push({
  content: {
    [Op.iLike]: `%${searchQuery}%`  // Sequelize escapes automatically
  }
});

// Option 2: If full-text search needed, use Sequelize fn
whereConditions.push(
  sequelize.where(
    sequelize.fn('to_tsvector', 'english', sequelize.col('content')),
    Op.match,
    sequelize.fn('to_tsquery', 'english', searchQuery + ':*')
  )
);

// REMOVE all sequelize.literal() with string interpolation
```

**Test**:
```bash
# Try SQL injection payload
curl -X GET "http://localhost:4000/api/messages/search?q=test';DROP TABLE messages;--" \
  -H "Authorization: Bearer $TOKEN"

# Should return search results, not execute DROP TABLE
```

---

### BUG-M002: Missing Recipient Validation ⏱️ 1 hour

**File**: `backend/src/routes/messages.js`  
**Lines**: 137-147

**Current Code (VULNERABLE)**:
```javascript
const message = await Message.create({
  id: messageId,
  senderId: messageData.senderId,
  recipientId: messageData.recipientId,  // ❌ NOT VALIDATED
  groupId: messageData.groupId,
  content: messageData.content,
  messageType: messageData.type || 'text',
  status: 'sent',
});
```

**FIX**:
```javascript
// Add BEFORE Message.create()

if (recipientId) {
  // 1. Check recipient exists
  const recipient = await User.findByPk(recipientId);
  if (!recipient) {
    return res.status(404).json({
      success: false,
      error: {
        type: 'RECIPIENT_NOT_FOUND',
        message: 'Recipient user not found'
      }
    });
  }

  // 2. Check recipient is active
  if (recipient.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: {
        type: 'RECIPIENT_INACTIVE',
        message: 'Cannot send message to inactive user'
      }
    });
  }

  // 3. Check recipient is approved
  if (recipient.approvalStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      error: {
        type: 'RECIPIENT_NOT_APPROVED',
        message: 'Recipient account is not approved'
      }
    });
  }

  // 4. Optional: Check if blocked (if Contact model has blocking)
  const { Contact } = await import('../models/index.js');
  const blocked = await Contact.findOne({
    where: {
      [Op.or]: [
        { userId: senderId, contactUserId: recipientId, blocked: true },
        { userId: recipientId, contactUserId: senderId, blocked: true }
      ]
    }
  });

  if (blocked) {
    return res.status(403).json({
      success: false,
      error: {
        type: 'USER_BLOCKED',
        message: 'Cannot send message to this user'
      }
    });
  }
}
```

**Test**:
```bash
# Try sending to non-existent user
curl -X POST http://localhost:4000/api/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "00000000-0000-0000-0000-000000000000",
    "content": "Test message"
  }'

# Should return 404 RECIPIENT_NOT_FOUND
```

---

## PRIORITY 2: AUTHORIZATION BLOCKERS (Fix Today)

### BUG-M004: Group Membership Authorization ⏱️ 1 hour

**File**: `backend/src/routes/messages.js`  
**Lines**: 137-147

**FIX**:
```javascript
// Add BEFORE Message.create()

if (groupId) {
  // 1. Check group exists
  const group = await Group.findByPk(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: {
        type: 'GROUP_NOT_FOUND',
        message: 'Group not found'
      }
    });
  }

  // 2. Check sender is member
  const membership = await GroupMember.findOne({
    where: {
      groupId,
      userId: senderId,
      isActive: true
    }
  });

  if (!membership) {
    return res.status(403).json({
      success: false,
      error: {
        type: 'NOT_GROUP_MEMBER',
        message: 'You are not a member of this group'
      }
    });
  }
}
```

**Test**:
```bash
# Try sending to group you're not a member of
curl -X POST http://localhost:4000/api/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "<OTHER_USER_GROUP_ID>",
    "content": "Unauthorized message"
  }'

# Should return 403 NOT_GROUP_MEMBER
```

---

## PRIORITY 3: DATA INTEGRITY (Fix Today)

### BUG-M005: Missing Transaction Wrapper ⏱️ 2 hours

**File**: `backend/src/routes/messages.js`  
**Lines**: 137-183

**FIX**:
```javascript
// Wrap entire send message operation in transaction

const transaction = await sequelize.transaction();
try {
  // Perform recipient/group validation (code from above)
  // ...

  // Create message
  const message = await Message.create({
    id: messageId,
    senderId,
    recipientId,
    groupId,
    content,
    messageType,
    status: 'sent',
    replyToId,
    metadata: metadata || {},
  }, { transaction });

  // Get message with sender info
  const messageWithSender = await Message.findByPk(messageId, {
    include: [{
      model: User,
      as: 'sender',
      attributes: ['id', 'username', 'firstName', 'lastName'],
    }],
    transaction
  });

  // Commit transaction
  await transaction.commit();

  // Send response AFTER commit
  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: messageWithSender,
  });

  // WebSocket broadcast (outside transaction)
  const { getIO } = await import('../services/websocket.js');
  const io = getIO();
  if (io) {
    if (recipientId) {
      io.to(`user:${recipientId}`).emit('message_new', messageWithSender);
    } else if (groupId) {
      io.to(`group:${groupId}`).emit('message_new', messageWithSender);
    }
  }
} catch (error) {
  await transaction.rollback();
  logger.error('Error sending message:', {
    senderId,
    recipientId,
    groupId,
    error: error.message
  });
  
  res.status(500).json({
    success: false,
    message: 'Failed to send message',
    error: error.message
  });
}
```

**Test**:
```bash
# Simulate database error during message send
# If transaction works, message should NOT be created
```

---

### BUG-M003: Message Edit Race Condition ⏱️ 3 hours

**File**: `backend/src/models/Message.js`  
**Lines**: 330-356, 376-384

**FIX**:
```javascript
// In Message model

Message.prototype.edit = async function (newContent, editedByUserId) {
  const transaction = await sequelize.transaction();
  try {
    // Lock row for update (prevents concurrent modifications)
    const message = await Message.findByPk(this.id, {
      lock: transaction.LOCK.UPDATE,  // SELECT FOR UPDATE
      transaction
    });

    // Re-check after acquiring lock
    if (message.editedAt !== null) {
      await transaction.rollback();
      throw new Error('Message has already been edited');
    }

    if (message.senderId !== editedByUserId) {
      await transaction.rollback();
      throw new Error('Only the sender can edit their message');
    }

    const now = new Date();
    if (now - message.createdAt >= 5 * 60 * 1000) {
      await transaction.rollback();
      throw new Error('Message can only be edited within 5 minutes of sending');
    }

    if (message.deletedAt) {
      await transaction.rollback();
      throw new Error('Cannot edit deleted message');
    }

    // Create edit history
    await MessageEditHistory.create({
      messageId: this.id,
      previousContent: message.content,
      newContent: newContent,
      editedBy: editedByUserId,
      editedAt: now,
    }, { transaction });

    // Update message
    message.content = newContent;
    message.editedAt = now;
    await message.save({ transaction });

    await transaction.commit();
    
    return message;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

**Test**:
```bash
# Send two concurrent edit requests
# Only first should succeed, second should fail with "already edited"
```

---

## PRIORITY 4: SESSION SECURITY (Fix Today)

### BUG-U002: Session Invalidation on Account Deletion ⏱️ 2 hours

**File**: `backend/src/controllers/userController.js`  
**Lines**: 66-95

**FIX**:
```javascript
async deleteAccount(req, res) {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ 
        success: false,
        message: 'Password is required for account deletion' 
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid password' 
      });
    }

    // START TRANSACTION
    const transaction = await sequelize.transaction();
    try {
      // 1. Get all user sessions
      const sessions = await Session.findAll({ 
        where: { userId }, 
        transaction 
      });

      // 2. Remove sessions from Redis
      const redis = getRedisClient();
      for (const session of sessions) {
        await redis.del(`session:${session.token}`);
      }

      // 3. Expire sessions in database
      await Session.update(
        { expiresAt: new Date() },
        { where: { userId }, transaction }
      );

      // 4. Soft delete user
      await user.destroy({ transaction });

      // 5. Log audit event
      logger.info('Account deleted', {
        userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      await transaction.commit();

      res.status(200).json({ 
        success: true,
        message: 'Account deleted successfully. All sessions have been terminated.' 
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Error deleting account:', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
}
```

**Import Required**:
```javascript
import { getRedisClient } from '../config/redis.js';
```

**Test**:
```bash
# 1. Login and get token
TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@test.com","password":"Test123!@#"}' \
  | jq -r '.data.accessToken')

# 2. Verify token works
curl -X GET http://localhost:4000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
# Should return user profile

# 3. Delete account
curl -X DELETE http://localhost:4000/api/users/account \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password":"Test123!@#"}'

# 4. Try using old token
curl -X GET http://localhost:4000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
# Should return 401 UNAUTHORIZED (token invalidated)
```

---

## TESTING CHECKLIST

After fixing all 6 bugs, run comprehensive tests:

### Automated Testing
```bash
cd backend
npm test -- tests/unit/
npm test -- tests/integration/
```

### Manual Testing

**SQL Injection (BUG-M001)**:
```bash
# Should NOT execute SQL injection
curl -X GET "http://localhost:4000/api/messages/search?q=test';DROP TABLE messages;--" \
  -H "Authorization: Bearer $TOKEN"
```

**Recipient Validation (BUG-M002)**:
```bash
# Should return 404
curl -X POST http://localhost:4000/api/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "00000000-0000-0000-0000-000000000000",
    "content": "Test"
  }'
```

**Group Authorization (BUG-M004)**:
```bash
# Should return 403
curl -X POST http://localhost:4000/api/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "<GROUP_ID_YOU_ARE_NOT_MEMBER>",
    "content": "Test"
  }'
```

**Transaction Integrity (BUG-M005)**:
- Kill database connection mid-request
- Verify no partial message records created

**Edit Race Condition (BUG-M003)**:
- Send two concurrent PATCH requests to edit same message
- Verify only first succeeds

**Session Invalidation (BUG-U002)**:
- Login, save token
- Delete account
- Try using old token (should get 401)

---

## DEPLOYMENT AFTER FIXES

### Pre-Deployment Checklist
- [ ] All 6 blocking bugs fixed
- [ ] All automated tests passing (138/138)
- [ ] Manual security tests passing (6/6)
- [ ] Code review completed
- [ ] Git branch merged to main
- [ ] Docker containers rebuilt
- [ ] Database migrations applied
- [ ] Redis cache cleared
- [ ] Environment variables verified

### Post-Deployment Verification
- [ ] Health check endpoint responding
- [ ] Login flow working
- [ ] Message sending working
- [ ] No SQL injection possible
- [ ] Account deletion invalidates sessions
- [ ] Monitoring alerts configured
- [ ] Log aggregation working

---

## ESTIMATED TIMELINE

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Fix BUG-M001 (SQL Injection) | 2 hours | 2 hours |
| Fix BUG-M002 (Validation) | 1 hour | 3 hours |
| Fix BUG-M004 (Authorization) | 1 hour | 4 hours |
| Fix BUG-M005 (Transactions) | 2 hours | 6 hours |
| Fix BUG-M003 (Race Condition) | 3 hours | 9 hours |
| Fix BUG-U002 (Sessions) | 2 hours | 11 hours |
| **Coding Complete** | - | **11 hours** |
| Testing (Manual + Automated) | 4 hours | 15 hours |
| Code Review | 1 hour | 16 hours |
| Deployment | 1 hour | 17 hours |
| **TOTAL** | - | **17 hours** |

**Work Days**: 2-3 days (with testing and review)  
**Calendar Days**: 3-5 days (including waiting for reviews)

---

## NEXT STEPS

1. **Today**: Start fixing Priority 1 bugs (BUG-M001, M002)
2. **Tomorrow**: Fix Priority 2-4 bugs (BUG-M003, M004, M005, U002)
3. **Day 3**: Testing, code review, deployment preparation
4. **Day 4**: Deploy to staging, final verification
5. **Day 5**: Production deployment (if all tests pass)

---

## SUPPORT

**Questions?** Contact: <Senior QA Engineer>  
**Bug Reports**: `docs/bugs.md` and `docs/bugs_users_module.md`  
**Test Cases**: Run `npm test` in `backend/` directory  
**Documentation**: `docs/QA_FINAL_SUMMARY.md`

---

**Document Version**: v1.0  
**Last Updated**: October 25, 2025  
**Status**: ⚠️ IN PROGRESS - 0/6 bugs fixed
