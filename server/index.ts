import express from 'express'
import { openDatabase } from './db'
import { seedIfEmpty } from './seed'
import { buildApi } from './routes/api'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.ROLODEX_DATA_DIR ?? path.join(__dirname, '..', 'data')
const PORT = Number(process.env.ROLODEX_PORT ?? 8787)

const repo = openDatabase(DATA_DIR)
if (process.env.ROLODEX_NO_SEED !== '1') seedIfEmpty(repo)

const app = express()
app.use('/api', buildApi(repo))

// In production (vite build), serve the built frontend
const distDir = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Rolodex API listening on http://localhost:${PORT} (data: ${DATA_DIR})`)
})
