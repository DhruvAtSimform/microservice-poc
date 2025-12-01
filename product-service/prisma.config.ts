import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'src/infrastructure/prisma/schema.prisma',
  migrations: {
    path: 'src/infrastructure/prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
