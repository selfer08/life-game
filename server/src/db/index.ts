import { MemoryRepository } from './memoryRepository.js';
import { PostgresRepository } from './postgresRepository.js';
import type { GameRepository } from './repository.js';

export function createRepository(): GameRepository {
  const url = process.env.DATABASE_URL;
  return url ? new PostgresRepository(url) : new MemoryRepository();
}
