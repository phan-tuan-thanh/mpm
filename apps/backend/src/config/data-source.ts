import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env từ project root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

/**
 * TypeORM DataSource cho CLI migrations
 *
 * Sử dụng bởi:
 * - npm run migration:run
 * - npm run migration:generate
 * - npm run migration:revert
 */
export default new DataSource({
  type: 'postgres',
  host: process.env['POSTGRES_HOST'] ?? 'localhost',
  port: parseInt(process.env['POSTGRES_PORT'] ?? '5432', 10),
  username: process.env['POSTGRES_USER'] ?? 'mpm',
  password: process.env['POSTGRES_PASSWORD'],
  database: process.env['POSTGRES_DB'] ?? 'mpm',
  migrations: [path.resolve(__dirname, '../../../../migrations/*.ts')],
  entities: [path.resolve(__dirname, '../**/*.entity.ts')],
});
