import { defineConfig } from '@prisma/internals';

export default defineConfig({
  schema: './schema.prisma',
  datasource: {
    db: {
      provider: 'sqlite', // Change to 'mysql' if using MySQL
      url: 'file:dev.sqlite', // For MySQL: 'mysql://USER:PASSWORD@HOST:PORT/DATABASE'
    },
  },
});
