import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createRepository } from './db/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 4000);

const repo = createRepository();
await repo.init();

const app = createApp(repo, path.resolve(here, '../../client/dist'));
const server = app.listen(PORT, () => {
  console.log(`🎲 인생게임 서버 http://localhost:${PORT} (DB: ${repo.kind})`);
  if (repo.kind === 'memory') console.log('   DATABASE_URL 이 없어 메모리 저장소를 사용합니다. 재시작하면 데이터가 사라져요.');
});

const shutdown = () => {
  server.close(() => repo.close().then(() => process.exit(0)));
  server.closeAllConnections(); // 열려 있는 SSE 연결까지 정리
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
