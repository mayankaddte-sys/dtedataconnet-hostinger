require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const apiKeyAuth = require('./backend-lib/apiKeyAuth');
const genericRoutes = require('./routes/generic');
const rpcRoutes = require('./routes/rpc');
const functionRoutes = require('./routes/functions');

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
