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
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    contactUserId: {
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
    blockedAt: {
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
    isFavorite: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    lastContactAt: {
      type: Sequelize.DATE,
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
  await queryInterface.addIndex('contacts', ['userId'], {
    name: 'idx_contacts_user',
  });

  await queryInterface.addIndex('contacts', ['contactUserId'], {
    name: 'idx_contacts_contact_user',
  });

  await queryInterface.addIndex('contacts', ['status'], {
    name: 'idx_contacts_status',
  });

  await queryInterface.addIndex('contacts', ['isFavorite'], {
    name: 'idx_contacts_favorite',
  });

  await queryInterface.addIndex('contacts', ['createdAt'], {
    name: 'idx_contacts_created_at',
  });

  await queryInterface.addIndex('contacts', ['lastContactAt'], {
    name: 'idx_contacts_last_contact',
  });

  // Composite unique constraint for user-contact pairs
  await queryInterface.addIndex('contacts', ['userId', 'contactUserId'], {
    name: 'idx_contacts_unique_user_contact',
    unique: true,
  });

  // Index for finding active contacts (accepted status)
  await queryInterface.addIndex('contacts',
    ['userId', 'status', 'isFavorite', 'lastContactAt'],
    {
      name: 'idx_contacts_user_accepted',
      where: {
        status: 'accepted',
      },
      order: [['isFavorite', 'DESC'], ['lastContactAt', 'DESC']],
    }
  );

  // Index for finding blocked contacts
  await queryInterface.addIndex('contacts',
    ['userId', 'status'],
    {
      name: 'idx_contacts_user_blocked',
      where: {
        status: 'blocked',
      },
    }
  );

  // Index for pending contact requests
  await queryInterface.addIndex('contacts',
    ['contactUserId', 'status', 'createdAt'],
    {
      name: 'idx_contacts_pending_requests',
      where: {
        status: 'pending',
      },
      order: [['createdAt', 'ASC']],
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('contacts');
}