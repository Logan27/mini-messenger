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
    sender_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    recipient_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    group_id: {
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
    encrypted_content: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    message_type: {
      type: Sequelize.ENUM('text', 'image', 'file', 'system', 'call', 'location'),
      defaultValue: 'text',
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('sent', 'delivered', 'read', 'failed'),
      defaultValue: 'sent',
      allowNull: false,
    },
    edited_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    deleted_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    reply_to_id: {
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
    file_name: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    file_size: {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100 * 1024 * 1024, // 100MB max
      },
    },
    mime_type: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // Create optimized indexes for performance
  await queryInterface.addIndex('messages', ['recipient_id', 'created_at'], {
    name: 'idx_messages_recipient_created_desc',
    order: [['created_at', 'DESC']],
  });

  await queryInterface.addIndex('messages', ['sender_id', 'created_at'], {
    name: 'idx_messages_sender_created_desc',
    order: [['created_at', 'DESC']],
  });

  await queryInterface.addIndex('messages', ['group_id', 'created_at'], {
    name: 'idx_messages_group_created_desc',
    order: [['created_at', 'DESC']],
  });

  await queryInterface.addIndex('messages', ['status'], {
    name: 'idx_messages_status',
  });

  await queryInterface.addIndex('messages', ['message_type'], {
    name: 'idx_messages_type',
  });

  await queryInterface.addIndex('messages', ['reply_to_id'], {
    name: 'idx_messages_reply_to',
  });

  // Composite index for conversation queries (sender-recipient pairs)
  await queryInterface.addIndex('messages', ['sender_id', 'recipient_id', 'created_at'], {
    name: 'idx_messages_conversation_desc',
    order: [['created_at', 'DESC']],
  });

  // Full-text search index for message content
  await queryInterface.addIndex('messages', ['content'], {
    name: 'idx_messages_content_gin',
    using: 'gin',
    operator: 'gin_trgm_ops',
  });

  // Partial index for unread messages (status != 'read')
  await queryInterface.addIndex('messages',
    ['recipient_id', 'status', 'created_at'],
    {
      name: 'idx_messages_unread',
      where: {
        status: {
          [Sequelize.Op.ne]: 'read'
        }
      },
      order: [['created_at', 'DESC']],
    }
  );

  // Index for deleted messages cleanup
  await queryInterface.addIndex('messages', ['deleted_at'], {
    name: 'idx_messages_deleted_cleanup',
    where: {
      deleted_at: {
        [Sequelize.Op.ne]: null
      }
    },
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('messages');
}