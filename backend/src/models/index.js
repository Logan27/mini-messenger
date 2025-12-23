import { sequelize } from '../config/database.js';

import Announcement from './Announcement.js';
import AuditLog from './AuditLog.js';
import Call from './Call.js';
import Contact from './Contact.js';
import Device from './Device.js';
import DeviceToken from './DeviceToken.js';
import File from './File.js';
import Group from './Group.js';
import GroupMember from './GroupMember.js';
import GroupMessageStatus from './GroupMessageStatus.js';
import Message, { MessageEditHistory } from './Message.js';
import Notification from './Notification.js';
import NotificationSettings from './NotificationSettings.js';
import PasswordHistory from './PasswordHistory.js';
import Report from './Report.js';
import Session from './Session.js';
import SystemSettings from './SystemSettings.js';
// Alias for backward compatibility
const SystemSetting = SystemSettings;
import User from './User.js';

// Define model associations

// User associations
User.hasMany(Session, {
  foreignKey: 'userId',
  as: 'sessions',
  onDelete: 'CASCADE',
});

User.hasMany(Device, {
  foreignKey: 'userId',
  as: 'devices',
  onDelete: 'CASCADE',
});

Device.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'CASCADE',
});

User.hasMany(DeviceToken, {
  foreignKey: 'userId',
  as: 'deviceTokens',
  onDelete: 'CASCADE',
});

DeviceToken.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'CASCADE',
});

User.hasMany(Message, {
  foreignKey: 'senderId',
  as: 'sentMessages',
  onDelete: 'CASCADE',
});

User.hasMany(Message, {
  foreignKey: 'recipientId',
  as: 'receivedMessages',
  onDelete: 'SET NULL',
});

User.hasMany(Call, {
  foreignKey: 'callerId',
  as: 'sentCalls',
  onDelete: 'CASCADE',
});

User.hasMany(Call, {
  foreignKey: 'recipientId',
  as: 'receivedCalls',
  onDelete: 'CASCADE',
});

User.hasMany(Group, {
  foreignKey: 'creatorId',
  as: 'createdGroups',
  onDelete: 'CASCADE',
});

User.hasMany(GroupMember, {
  foreignKey: 'userId',
  as: 'groupMemberships',
  onDelete: 'CASCADE',
});

User.hasMany(Contact, {
  foreignKey: 'userId',
  as: 'contacts',
  onDelete: 'CASCADE',
});

User.hasMany(Contact, {
  foreignKey: 'contactUserId',
  as: 'contactRequests',
  onDelete: 'CASCADE',
});

// Session associations
Session.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Message associations
Message.belongsTo(User, {
  foreignKey: 'senderId',
  as: 'sender',
});

Message.belongsTo(User, {
  foreignKey: 'recipientId',
  as: 'recipient',
});

Message.belongsTo(Group, {
  foreignKey: 'groupId',
  as: 'group',
});

Message.belongsTo(Message, {
  foreignKey: 'replyToId',
  as: 'replyTo',
});

// MessageEditHistory associations
MessageEditHistory.belongsTo(Message, {
  foreignKey: 'messageId',
  as: 'message',
});

MessageEditHistory.belongsTo(User, {
  foreignKey: 'editedBy',
  as: 'editor',
});

// Group associations
Group.belongsTo(User, {
  foreignKey: 'creatorId',
  as: 'creator',
});

Group.hasMany(Message, {
  foreignKey: 'groupId',
  as: 'messages',
  onDelete: 'CASCADE',
});

Group.hasMany(GroupMember, {
  foreignKey: 'groupId',
  as: 'members',
  onDelete: 'CASCADE',
});

// GroupMember associations
GroupMember.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

GroupMember.belongsTo(User, {
  foreignKey: 'invitedBy',
  as: 'inviter',
});

GroupMember.belongsTo(Group, {
  foreignKey: 'groupId',
  as: 'group',
});

// GroupMessageStatus associations
GroupMessageStatus.belongsTo(Message, {
  foreignKey: 'messageId',
  as: 'message',
});

GroupMessageStatus.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Message.hasMany(GroupMessageStatus, {
  foreignKey: 'messageId',
  as: 'groupMessageStatuses',
  onDelete: 'CASCADE',
});

// Contact associations
Contact.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Contact.belongsTo(User, {
  foreignKey: 'contactUserId',
  as: 'contact',
});

// File associations
File.belongsTo(User, {
  foreignKey: 'uploaderId',
  as: 'uploader',
});

File.belongsTo(Message, {
  foreignKey: 'messageId',
  as: 'message',
});

// AuditLog associations
AuditLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(AuditLog, {
  foreignKey: 'userId',
  as: 'auditLogs',
});

// Report associations
Report.belongsTo(User, {
  foreignKey: 'reporterId',
  as: 'reporter',
});

Report.belongsTo(User, {
  foreignKey: 'reportedUserId',
  as: 'reportedUser',
});

Report.belongsTo(Message, {
  foreignKey: 'reportedMessageId',
  as: 'reportedMessage',
});

Report.belongsTo(File, {
  foreignKey: 'reportedFileId',
  as: 'reportedFile',
});

Report.belongsTo(User, {
  foreignKey: 'reviewedBy',
  as: 'reviewer',
});

User.hasMany(Report, {
  foreignKey: 'reporterId',
  as: 'submittedReports',
});

User.hasMany(Report, {
  foreignKey: 'reportedUserId',
  as: 'reportsAgainstMe',
});

User.hasMany(Report, {
  foreignKey: 'reviewedBy',
  as: 'reviewedReports',
});

// Notification associations
User.hasMany(Notification, {
  foreignKey: 'userId',
  as: 'notifications',
  onDelete: 'CASCADE',
});

Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Notification.belongsTo(User, {
  foreignKey: 'senderId',
  as: 'sender',
});

// NotificationSettings associations
NotificationSettings.belongsTo(User, {
  foreignKey: 'userId',
  as: 'notificationUser',
  onDelete: 'CASCADE',
});

// Export models and sequelize instance
export {
  sequelize,
  User,
  Session,
  Message,
  MessageEditHistory,
  Group,
  GroupMember,
  GroupMessageStatus,
  Contact,
  File,
  Call,
  Device,
  DeviceToken,
  AuditLog,
  Notification,
  NotificationSettings,
  PasswordHistory,
  Report,
  SystemSettings,
  SystemSetting, // Alias for backward compatibility
  Announcement,
};

export default {
  sequelize,
  User,
  Session,
  Message,
  MessageEditHistory,
  Group,
  GroupMember,
  GroupMessageStatus,
  Contact,
  File,
  Call,
  Device,
  DeviceToken,
  AuditLog,
  Notification,
  NotificationSettings,
  PasswordHistory,
  Report,
  SystemSettings,
  SystemSetting, // Alias for backward compatibility
  Announcement,
};
