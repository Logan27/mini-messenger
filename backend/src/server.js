import { resolve } from 'path';
import { fileURLToPath } from 'url';

import { createServer } from './app.js';
import { initializeDatabase, closeDatabase } from './config/database.js';
import { config } from './config/index.js';
import { initializeRedis, closeRedis } from './config/redis.js';
import { initializeLogger } from './utils/logger.js';

const startServer = async () => {
  let server; // Declare server in outer scope for graceful shutdown

  try {
    console.log('🔧 Starting server initialization...');

    // Initialize logger
    console.log('📝 Initializing logger...');
    initializeLogger();
    console.log('✅ Logger initialized');

    // Initialize database
    console.log('💾 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized');

    // Initialize Redis
    console.log('🔴 Initializing Redis...');
    await initializeRedis();
    console.log('✅ Redis initialized');

    // Initialize services
    console.log('📦 Loading app.js...');
    const { initializeServices } = await import('./app.js');
    console.log('📦 App.js loaded, initializing services...');
    await initializeServices();
    console.log('✅ Services initialized');

    // Initialize queue schedules
    console.log('📋 Initializing background job queues...');
    const { scheduleMessageCleanup } = await import('./services/queueService.js');
    await scheduleMessageCleanup();
    console.log('✅ Background job queues scheduled');

    // Start the server
    console.log('🚀 Creating server...');
    server = createServer();

    console.log('🚀 =====================================');
    console.log(`🚀 Messenger Backend Server`);
    console.log('🚀 =====================================');
    console.log(`📍 Environment: ${config.env}`);
    console.log(`🌐 Server: http://${config.host}:${config.port}`);
    console.log(`📚 API Docs: http://localhost:${config.port}${config.swagger.path}`);
    console.log(`🏥 Health: http://localhost:${config.port}/health`);
    console.log(`⏱️  Started at: ${new Date().toISOString()}`);
    console.log('🚀 =====================================');

    if (config.isDevelopment) {
      console.log('\n🔧 Development Mode Features:');
      console.log('  • Hot reload enabled');
      console.log('  • Detailed error messages');
      console.log('  • Request logging enabled');
      console.log('  • CORS configured for local development');
      console.log('🚀 =====================================');
    }

    // Handle server errors
    server.on('error', error => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof config.port === 'string' ? `Pipe ${config.port}` : `Port ${config.port}`;

      switch (error.code) {
        case 'EACCES':
          console.error(`❌ ${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`❌ ${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }

  // Graceful shutdown handling
  const gracefulShutdown = async signal => {
    console.log(`\n🔄 Received ${signal}, shutting down gracefully...`);

    const shutdownTimer = setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);

    try {
      // Close HTTP server
      server.close(() => {
        console.log('✅ HTTP server closed');
      });

      // Close database connections
      const { closeDatabase } = await import('./config/database.js');
      await closeDatabase();

      // Close Redis connections
      const { closeRedis } = await import('./config/redis.js');
      await closeRedis();

      // Close queue connections
      const { closeQueues } = await import('./services/queueService.js');
      await closeQueues();

      clearTimeout(shutdownTimer);
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimer);
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });

  return server;
};

// Start the server
const currentFile = fileURLToPath(import.meta.url);
const entryFile = resolve(process.argv[1]);

if (currentFile === entryFile) {
  startServer();
}

export default startServer;
