/** 서버 시작 시 자동으로 실행되는 스키마. (server/db/schema.sql 과 동일하게 유지) */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS games (
  code        VARCHAR(8)  PRIMARY KEY,
  phase       VARCHAR(16) NOT NULL,
  state       JSONB       NOT NULL,
  version     INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_phase ON games (phase);

CREATE TABLE IF NOT EXISTS game_results (
  id           SERIAL      PRIMARY KEY,
  game_code    VARCHAR(8)  NOT NULL REFERENCES games (code) ON DELETE CASCADE,
  player_name  VARCHAR(40) NOT NULL,
  career       VARCHAR(40),
  final_score  BIGINT      NOT NULL,
  rank         INTEGER     NOT NULL,
  finished_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_results_score ON game_results (final_score DESC);
`;
