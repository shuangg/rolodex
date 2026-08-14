import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getDb } from './db';
import { RolodexRepo } from './repo';
import { seedDatabase } from './seed';
import { createApiRouter } from './api';

const distPath = path.resolve(process.cwd(), 'dist');
const defaultPort = fs.existsSync(distPath) && process.env.NODE_ENV === 'production' ? '4420' : '4421';
const PORT = parseInt(process.env.PORT || defaultPort, 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize DB and Repository
const db = getDb();
seedDatabase(db);
const repo = new RolodexRepo(db);

// Mount API router
app.use('/api', createApiRouter(repo));

// Serve static frontend if production dist exists
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`Rolodex API server running on http://${HOST}:${PORT}`);
});
