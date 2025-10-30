'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('messages', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    senderId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    recipientId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    groupId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'groups',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 10000],
      },
    },
    encryptedContent: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    messageType: {
      type: Sequelize.ENUM('text', 'image', 'file', 'system', 'call', 'location'),
      defaultValue: 'text',
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('sent', 'delivered', 'read', 'failed'),
      defaultValue: 'sent',
      allowNull: false,
    },
    editedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    replyToId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    fileName: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    fileSize: {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100 * 1024 * 1024, // 100MB max
      },
    },
    mimeType: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // Create optimized indexes for performance
  await queryInterface.addIndex('messages', ['recipientId', 'createdAt'], {
    name: 'idx_messages_recipient_created_desc',
    order: [['createdAt', 'DESC']],
  });

  await queryInterface.addIndex('messages', ['senderId', 'createdAt'], {
    name: 'idx_messages_sender_created_desc',
    order: [['createdAt', 'DESC']],
  });

  await queryInterface.addIndex('messages', ['groupId', 'createdAt'], {
    name: 'idx_messages_group_created_desc',
    order: [['createdAt', 'DESC']],
  });

  await queryInterface.addIndex('messages', ['status'], {
    name: 'idx_messages_status',
  });

  await queryInterface.addIndex('messages', ['messageType'], {
    name: 'idx_messages_type',
  });

  await queryInterface.addIndex('messages', ['replyToId'], {
    name: 'idx_messages_reply_to',
  });

  // Composite index for conversation queries (sender-recipient pairs)
  await queryInterface.addIndex('messages', ['senderId', 'recipientId', 'createdAt'], {
    name: 'idx_messages_conversation_desc',
    order: [['createdAt', 'DESC']],
  });

  // Full-text search index for message content
  await queryInterface.addIndex('messages', ['content'], {
    name: 'idx_messages_content_gin',
    using: 'gin',
    operator: 'gin_trgm_ops',
  });

  // Partial index for unread messages (status != 'read')
  await queryInterface.addIndex('messages',
    ['recipientId', 'status', 'createdAt'],
    {
      name: 'idx_messages_unread',
      where: {
        status: {
          [Sequelize.Op.ne]: 'read'
        }
      },
      order: [['createdAt', 'DESC']],
    }
  );

  // Index for deleted messages cleanup
  await queryInterface.addIndex('messages', ['deletedAt'], {
    name: 'idx_messages_deleted_cleanup',
    where: {
      deletedAt: {
        [Sequelize.Op.ne]: null
      }
    },
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('messages');
}