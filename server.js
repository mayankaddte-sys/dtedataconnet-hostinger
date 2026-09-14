import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import apiKeyAuth from './backend-lib/apiKeyAuth.js';
import genericRoutes from './routes/generic.js';
import rpcRoutes from './routes/rpc.js';
import functionRoutes from './routes/functions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' })); // signatures/uploaded docs arrive as base64 in JSON bodies

// Health check (useful for confirming the deploy actually started)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Everything under /api/* requires the shared API key
app.use('/api', apiKeyAuth);
app.use('/api/rpc', rpcRoutes);
app.use('/api/functions', functionRoutes);
app.use('/api', genericRoutes);

// Serve the built React app (dist/) and support client-side routing
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DTE portal backend listening on port ${PORT}`);
});
