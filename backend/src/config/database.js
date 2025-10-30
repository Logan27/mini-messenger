import { Sequelize } from 'sequelize';

import { config } from './index.js';

// Get PostgreSQL configuration for Sequelize
const getDatabaseConfig = url => {
  return {
    dialect: 'postgres',
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    username: config.database.username,
    password: config.database.password,
    ssl: config.database.ssl,
    logging: config.env === 'development' ? console.log : false,
    pool: {
      max: config.database.pool.max,
      min: config.database.pool.min,
      acquire: config.database.pool.acquireTimeout,
      idle: config.database.pool.idleTimeout,
    },
    dialectOptions: {
      connectTimeout: 60000, // 60 seconds connection timeout
    },
    define: {
      timestamps: true,
      underscored: false, // Use camelCase consistently
      paranoid: true,
    },
    retry: {
      max: 3,
      backoffBase: 100,
      backoffExponent: 1.5,
    },
  };
};

// Create Sequelize instance with proper configuration
let sequelize;

try {
  const dbConfig = getDatabaseConfig(config.database.url);
  console.log('🔍 Database config:', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    username: dbConfig.username,
    dialect: dbConfig.dialect,
  });
  sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);
  console.log(`✅ Sequelize instance created for ${config.env} environment`);
} catch (error) {
  console.error('❌ Error creating Sequelize instance:', error);
  console.error('Database URL:', config.database.url);
  console.error('Environment:', config.env);
  throw error;
}

export const initializeDatabase = async () => {
  try {
    console.log('🔄 Testing database connection...');
    // Test database connection with proper method
    await sequelize.query('SELECT 1', { timeout: 10000 });
    console.log('✅ Database connection established successfully.');

    if (config.env === 'development') {
      // Temporarily disabled sync - models have naming inconsistencies
      console.log('⚠️  Database sync disabled (models have naming inconsistencies)');
      // await sequelize.sync({ alter: true });
      // console.log('✅ Database synchronized successfully.');
    }

    return sequelize;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      original: error.original?.message,
    });
    throw error;
  }
};

export const closeDatabase = async () => {
  try {
    await sequelize.close();
    console.log('🔒 Database connection closed.');
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
};

// Ensure sequelize instance is created before export
if (!sequelize) {
  throw new Error('Sequelize instance not created. Check database configuration.');
}

// Export the sequelize instance
const db = sequelize;
export { sequelize };
export default db;
