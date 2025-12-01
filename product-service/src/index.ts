import 'dotenv/config';
import { createExpressApp } from '@presentation/http/ExpressApp.js';
import { initializeMessaging, shutdownMessaging } from '@infrastructure/instances.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

/**
 * Application Entry Point
 * Initialize and start the HTTP server
 */
async function bootstrap() {
  console.log('Product Service initialized with Clean Architecture');
  console.log('Domain Layer: Entities, Value Objects, Interfaces');
  console.log('Application Layer: Use Cases, Commands, Sagas');
  console.log('Presentation Layer: Controllers');
  console.log('Infrastructure Layer: Repositories, Event Publishers');

  // Initialize RabbitMQ messaging
  await initializeMessaging();

  // Create and start Express server
  const app = createExpressApp();

  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🛍️  Products API: http://localhost:${PORT}/api/products`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📢 SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('🔒 HTTP server closed');
      void shutdownMessaging().then(() => process.exit(0));
    });
  });

  process.on('SIGINT', () => {
    console.log('📢 SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('🔒 HTTP server closed');
      void shutdownMessaging().then(() => process.exit(0));
    });
  });
}

void bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
