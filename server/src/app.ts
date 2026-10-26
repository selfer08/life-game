import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import type { GameRepository } from './db/repository.js';
import { boardInfo, GameError } from './game/engine.js';
import type { Action } from './game/types.js';
import { GameService } from './gameService.js';

const ACTIONS = new Set(['spin', 'choosePath', 'chooseCareer', 'buyHouse', 'repayLoan']);

type Handler = (req: Request, res: Response) => Promise<unknown>;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

export function createApp(repo: GameRepository, clientDist?: string) {
  const service = new GameService(repo);
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '16kb' }));

  const token = (req: Request) => req.header('x-player-token') ?? undefined;

  app.get('/api/health', (_req, res) => res.json({ ok: true, db: repo.kind }));
  app.get('/api/board', (_req, res) => res.json(boardInfo()));
  app.get('/api/leaderboard', wrap(async (_req, res) => res.json(await service.leaderboard(20))));

  app.post('/api/rooms', wrap(async (req, res) => res.status(201).json(await service.create(req.body?.name))));
  app.get('/api/rooms/:code', wrap(async (req, res) => res.json(await service.get(req.params.code))));
  app.get('/api/rooms/:code/events', wrap((req, res) => service.subscribe(req.params.code, res)));
  app.post('/api/rooms/:code/players', wrap(async (req, res) => res.status(201).json(await service.join(req.params.code, req.body?.name))));
  app.post('/api/rooms/:code/start', wrap(async (req, res) => res.json(await service.start(req.params.code, token(req)))));
  app.post(
    '/api/rooms/:code/actions',
    wrap(async (req, res) => {
      const action = req.body as Action;
      if (!action || !ACTIONS.has(action.type)) throw new GameError('알 수 없는 액션이에요.');
      res.json(await service.act(req.params.code, token(req), action));
    }),
  );

  app.use('/api', (_req, res) => res.status(404).json({ error: '존재하지 않는 API예요.' }));

  // 프로덕션: 빌드된 프론트엔드 정적 파일 제공
  if (clientDist && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof GameError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했어요.' });
  });

  return app;
}
