/**
 * server.js — runtime de produção para deploy self-hosted (Hetzner/Docker).
 *
 * Substitui a camada da Vercel: serve o build estático do Vite (dist/) e monta
 * cada função de api/*.js como rota, mantendo a assinatura Vercel
 * `export default (req, res)` — Express expõe req.query/req.body/req.headers e
 * res.status().json()/setHeader()/end(), compatíveis com os handlers atuais.
 *
 * Variáveis de ambiente são injetadas pelo Docker (env_file: .env). Para rodar
 * local: `node --env-file=.env server.js`.
 */
import express from 'express';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');
const API_DIR = path.join(__dirname, 'api');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Monta cada api/*.js como rota /api/<nome>, preservando a assinatura Vercel.
const apiFiles = readdirSync(API_DIR).filter((f) => f.endsWith('.js'));
for (const file of apiFiles) {
  const route = '/api/' + file.replace(/\.js$/, '');
  const mod = await import(pathToFileURL(path.join(API_DIR, file)).href);
  const handler = mod.default;
  if (typeof handler === 'function') {
    app.all(route, async (req, res) => {
      try {
        await handler(req, res);
      } catch (err) {
        console.error(`[api ${route}]`, err?.message);
        if (!res.headersSent) res.status(500).json({ success: false, message: 'Erro interno.' });
      }
    });
    console.log('[api] rota montada:', route);
  }
}

// Erro de JSON malformado → 400 limpo (sem stack).
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'JSON inválido.' });
  }
  return next(err);
});

// Estáticos do build + fallback SPA (replica os rewrites do vercel.json).
app.use(express.static(DIST));
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Rota de API não encontrada.' });
  }
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`e-politica.ia em produção na porta ${PORT}`);
});
