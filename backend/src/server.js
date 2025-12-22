import cluster from 'cluster';
import os from 'os';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

import { createServer } from './app.js';
import { initializeDatabase, closeDatabase } from './config/database.js';
import { config } from './config/index.js';
import { initializeRedis, closeRedis } from './config/redis.js';
import { initializeLogger } from './utils/logger.js';

const numCPUs = os?.cpus().length || 1;

const startWorker = async () => {
  let server;

  try {
    if (cluster.isPrimary && config.isProduction) {
      console.log(`🚀 Primary process ${process.pid} is running`);
      console.log(`📡 Spawning ${numCPUs} workers...`);

      // Fork workers
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      cluster.on('exit', (worker, code, signal) => {
        console.error(`❌ Worker ${worker.process.pid} died (code: ${code}, signal: ${signal})`);
        console.log('🔄 Starting a new worker...');
        cluster.fork();
      });
    } else {
      // Worker process or development mode
      console.log(`🔧 Starting worker initialization (PID: ${process.pid})...`);

      // Initialize logger
      initializeLogger();

      // Initialize database
      await initializeDatabase();

      // Initialize Redis
      await initializeRedis();

      // Initialize services
      const { initializeServices } = await import('./app.js');
      await initializeServices();

      // Initialize queue schedules (only on one worker or use a lock)
      // For simplicity, we'll let all workers try, but production should use a singleton worker for jobs
      const { scheduleMessageCleanup } = await import('./services/queueService.js');
      await scheduleMessageCleanup();

      // Start the server
      server = createServer();

      if (!config.isProduction || !cluster.isPrimary) {
        console.log(`🚀 Worker ${process.pid} started on http://${config.host}:${config.port}`);
      }

      // Handle server errors
      server.on('error', error => {
        if (error.syscall !== 'listen') throw error;
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

      // Graceful shutdown handling
      const gracefulShutdown = async signal => {
        console.log(`\n🔄 [Worker ${process.pid}] Received ${signal}, shutting down gracefully...`);
        const shutdownTimer = setTimeout(() => {
          console.error('❌ Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 10000);

        try {
          if (server) {
            await new Promise(resolve => server.close(resolve));
            console.log('✅ HTTP server closed');
          }
          await closeDatabase();
          await closeRedis();
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

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
  } catch (error) {
    console.error(`❌ Failed to start worker ${process.pid}:`, error);
    process.exit(1);
  }
};

// Handle uncaught exceptions globally
process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
  if (!cluster.isPrimary) process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (!cluster.isPrimary) process.exit(1);
});

startWorker();

export default startWorker;
