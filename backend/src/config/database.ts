import { PrismaClient } from '@prisma/client';
import { PrismaPostgres } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPostgres(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;
