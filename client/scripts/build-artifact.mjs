// 서버 없이 동작하는 "한 화면 모드"를 HTML 파일 하나(Artifact용)로 묶는다.
// 출력: dist-artifact/life-game.html  (<html>/<body> 태그 없이 내용만 — Artifact 게시 규격)
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = await build({
  entryPoints: [path.join(root, 'src/local/main.tsx')],
  bundle: true,
  write: false,
  outdir: path.join(root, 'dist-artifact'),
  format: 'iife',
  target: 'es2020',
  minify: true,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { 'node:crypto': path.join(root, 'src/local/cryptoShim.ts') },
  logLevel: 'warning',
});

const js = result.outputFiles.find((f) => f.path.endsWith('.js')).text.replaceAll('</script', '<\\/script');
const css = result.outputFiles.find((f) => f.path.endsWith('.css')).text;

const html = `<title>인생게임</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`;

mkdirSync(path.join(root, 'dist-artifact'), { recursive: true });
const out = path.join(root, 'dist-artifact/life-game.html');
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
