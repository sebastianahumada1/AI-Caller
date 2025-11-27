// Vercel serverless function entry point
// @vercel/node compiles TypeScript automatically

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// CORS and body parsing
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '10mb' }));

// Check configurations
const getConfigs = () => ({
  webhookToken: !!process.env.WEBHOOK_TOKEN,
  vapiApiKey: !!process.env.VAPI_API_KEY,
  ghlApiKey: !!process.env.GHL_API_KEY,
  ghlApiKeySecondary: !!process.env.GHL_API_KEY_SECONDARY,
  ghlApiKeyThird: !!process.env.GHL_API_KEY_THIRD,
  ghlApiKeyFourth: !!process.env.GHL_API_KEY_FOURTH,
  slackBotToken: !!process.env.SLACK_BOT_TOKEN,
  slackChannelId: !!process.env.SLACK_CHANNEL_ID,
});

// Dashboard HTML
const getDashboardHTML = () => {
  const uptime = process.uptime();
  const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;
  const configs = getConfigs();
  const configuredCount = Object.values(configs).filter(Boolean).length;
  const totalConfigs = Object.keys(configs).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vapi-GHL Connector | Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0a0a0f;
      --bg-card: #1a1a24;
      --border: #2a2a3a;
      --text-primary: #f0f0f5;
      --text-secondary: #8888a0;
      --accent-green: #00d97e;
      --accent-blue: #00b4d8;
      --accent-purple: #7c3aed;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Space Grotesk', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      background-image: radial-gradient(ellipse at top, rgba(124,58,237,0.1) 0%, transparent 50%);
    }
    .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
    header { text-align: center; margin-bottom: 40px; }
    .logo {
      font-size: 2.2rem; font-weight: 700;
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .subtitle { color: var(--text-secondary); margin-top: 8px; }
    .status-banner {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 16px; border-radius: 12px; margin-bottom: 30px;
      background: rgba(0,217,126,0.1); border: 1px solid var(--accent-green); color: var(--accent-green);
    }
    .pulse {
      width: 10px; height: 10px; border-radius: 50%; background: currentColor;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 12px; padding: 20px;
    }
    .card-title { font-size: 1rem; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .config-item {
      display: flex; justify-content: space-between; padding: 8px 0;
      border-bottom: 1px solid var(--border); font-size: 0.85rem;
      font-family: 'JetBrains Mono', monospace;
    }
    .config-item:last-child { border-bottom: none; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
    .status-dot.ok { background: var(--accent-green); }
    .status-dot.error { background: #ff4757; }
    .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .stat-item { background: rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; text-align: center; }
    .stat-value { font-size: 1.4rem; font-weight: 700; color: var(--accent-blue); }
    .stat-label { font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; }
    .footer { text-align: center; margin-top: 40px; color: var(--text-secondary); font-size: 0.85rem; }
    a.btn {
      display: inline-block; padding: 10px 20px; margin: 5px;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 8px; color: var(--text-primary); text-decoration: none;
      font-size: 0.9rem; transition: all 0.2s;
    }
    a.btn:hover { background: var(--accent-purple); border-color: var(--accent-purple); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1 class="logo">⚡ Vapi-GHL Connector</h1>
      <p class="subtitle">AI Voice Assistant Middleware</p>
    </header>
    <div class="status-banner">
      <div class="pulse"></div>
      <span>System Online</span>
    </div>
    <div class="grid">
      <div class="card">
        <h2 class="card-title">🖥️ Server Status</h2>
        <div class="stat-grid">
          <div class="stat-item"><div class="stat-value">${uptimeFormatted}</div><div class="stat-label">Uptime</div></div>
          <div class="stat-item"><div class="stat-value">${configuredCount}/${totalConfigs}</div><div class="stat-label">Configs</div></div>
          <div class="stat-item"><div class="stat-value">${process.version}</div><div class="stat-label">Node</div></div>
          <div class="stat-item"><div class="stat-value">Vercel</div><div class="stat-label">Platform</div></div>
        </div>
      </div>
      <div class="card">
        <h2 class="card-title">🔑 API Keys</h2>
        <div class="config-item"><span>VAPI_API_KEY</span><span><span class="status-dot ${configs.vapiApiKey ? 'ok' : 'error'}"></span>${configs.vapiApiKey ? '✓' : '✗'}</span></div>
        <div class="config-item"><span>GHL_API_KEY</span><span><span class="status-dot ${configs.ghlApiKey ? 'ok' : 'error'}"></span>${configs.ghlApiKey ? '✓' : '✗'}</span></div>
        <div class="config-item"><span>GHL_SECONDARY</span><span><span class="status-dot ${configs.ghlApiKeySecondary ? 'ok' : 'error'}"></span>${configs.ghlApiKeySecondary ? '✓' : '✗'}</span></div>
        <div class="config-item"><span>GHL_THIRD</span><span><span class="status-dot ${configs.ghlApiKeyThird ? 'ok' : 'error'}"></span>${configs.ghlApiKeyThird ? '✓' : '✗'}</span></div>
        <div class="config-item"><span>GHL_FOURTH</span><span><span class="status-dot ${configs.ghlApiKeyFourth ? 'ok' : 'error'}"></span>${configs.ghlApiKeyFourth ? '✓' : '✗'}</span></div>
      </div>
      <div class="card">
        <h2 class="card-title">🔗 Integrations</h2>
        <div class="config-item"><span>WEBHOOK_TOKEN</span><span><span class="status-dot ${configs.webhookToken ? 'ok' : 'error'}"></span>${configs.webhookToken ? '✓' : '✗'}</span></div>
        <div class="config-item"><span>SLACK_BOT</span><span><span class="status-dot ${configs.slackBotToken ? 'ok' : 'error'}"></span>${configs.slackBotToken ? '✓' : '✗'}</span></div>
        <div class="config-item"><span>SLACK_CHANNEL</span><span><span class="status-dot ${configs.slackChannelId ? 'ok' : 'error'}"></span>${configs.slackChannelId ? '✓' : '✗'}</span></div>
      </div>
      <div class="card">
        <h2 class="card-title">🧪 Quick Tests</h2>
        <a href="/health" class="btn">Health Check</a>
        <a href="/debug/env" class="btn">Environment</a>
        <a href="/debug/network" class="btn">Network Test</a>
      </div>
    </div>
    <footer class="footer">
      <p>Vapi-GHL Connector v1.0.0 | ${new Date().toISOString()}</p>
    </footer>
  </div>
</body>
</html>`;
};

// Routes
app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getDashboardHTML());
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), configs: getConfigs() });
});

app.get('/debug/env', (_req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    configs: getConfigs(),
    node: process.version,
    platform: 'vercel'
  });
});

app.get('/debug/network', async (_req, res) => {
  const tests: Record<string, any> = {};
  for (const [name, url] of [['Google', 'https://google.com'], ['Vapi', 'https://api.vapi.ai'], ['GHL', 'https://services.leadconnectorhq.com']]) {
    const start = Date.now();
    try {
      await fetch(url, { method: 'HEAD' });
      tests[name] = { ok: true, ms: Date.now() - start };
    } catch (e: any) {
      tests[name] = { ok: false, error: e.message };
    }
  }
  res.json({ tests });
});

// Vapi webhook placeholder (POST only)
app.post('/vapi/webhook', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== process.env.WEBHOOK_TOKEN) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  // For now, just acknowledge - full logic is in src/server.ts for local dev
  res.json({ ok: true, message: 'Webhook received (Vercel simplified mode)' });
});

app.use('*', (req, res) => {
  res.status(404).json({ ok: false, message: 'Route not found', path: req.originalUrl });
});

export default app;
