'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('contacts', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    contact_user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    status: {
      type: Sequelize.ENUM('pending', 'accepted', 'blocked'),
      defaultValue: 'pending',
      allowNull: false,
    },
    blocked_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    nickname: {
      type: Sequelize.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100],
      },
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    is_favorite: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    last_contact_at: {
      type: Sequelize.DATE,
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
  await queryInterface.addIndex('contacts', ['user_id'], {
    name: 'idx_contacts_user',
  });

  await queryInterface.addIndex('contacts', ['contact_user_id'], {
    name: 'idx_contacts_contact_user',
  });

  await queryInterface.addIndex('contacts', ['status'], {
    name: 'idx_contacts_status',
  });

  await queryInterface.addIndex('contacts', ['is_favorite'], {
    name: 'idx_contacts_favorite',
  });

  await queryInterface.addIndex('contacts', ['created_at'], {
    name: 'idx_contacts_created_at',
  });

  await queryInterface.addIndex('contacts', ['last_contact_at'], {
    name: 'idx_contacts_last_contact',
  });

  // Composite unique constraint for user-contact pairs
  await queryInterface.addIndex('contacts', ['user_id', 'contact_user_id'], {
    name: 'idx_contacts_unique_user_contact',
    unique: true,
  });

  // Index for finding active contacts (accepted status)
  await queryInterface.addIndex('contacts',
    ['user_id', 'status', 'is_favorite', 'last_contact_at'],
    {
      name: 'idx_contacts_user_accepted',
      where: {
        status: 'accepted',
      },
      order: [['is_favorite', 'DESC'], ['last_contact_at', 'DESC']],
    }
  );

  // Index for finding blocked contacts
  await queryInterface.addIndex('contacts',
    ['user_id', 'status'],
    {
      name: 'idx_contacts_user_blocked',
      where: {
        status: 'blocked',
      },
    }
  );

  // Index for pending contact requests
  await queryInterface.addIndex('contacts',
    ['contact_user_id', 'status', 'created_at'],
    {
      name: 'idx_contacts_pending_requests',
      where: {
        status: 'pending',
      },
      order: [['created_at', 'ASC']],
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('contacts');
}