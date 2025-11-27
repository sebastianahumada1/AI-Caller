// Vercel serverless function entry point
// Re-export the Express app from the compiled server

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Check configurations
const getConfigs = () => ({
  webhookToken: !!process.env.WEBHOOK_TOKEN,
  vapiApiKey: !!process.env.VAPI_API_KEY,
  vapiApiBaseUrl: !!process.env.VAPI_API_BASE_URL,
  ghlApiKey: !!process.env.GHL_API_KEY,
  ghlApiKeySecondary: !!process.env.GHL_API_KEY_SECONDARY,
  ghlApiKeyThird: !!process.env.GHL_API_KEY_THIRD,
  ghlApiKeyFourth: !!process.env.GHL_API_KEY_FOURTH,
  ghlWebhookDefault: !!process.env.GHL_INCOMING_WEBHOOK_URL_DEFAULT,
  ghlWebhookBooking: !!process.env.GHL_INCOMING_WEBHOOK_URL_BOOKING,
  ghlWebhookDeposit: !!process.env.GHL_INCOMING_WEBHOOK_URL_DEPOSIT,
  slackBotToken: !!process.env.SLACK_BOT_TOKEN,
  slackChannelId: !!process.env.SLACK_CHANNEL_ID,
});

// Dashboard - Main status page
app.get('/', async (_req, res) => {
  const uptime = process.uptime();
  const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;
  const configs = getConfigs();
  const configuredCount = Object.values(configs).filter(Boolean).length;
  const totalConfigs = Object.keys(configs).length;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vapi-GHL Connector | Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0a0a0f;
      --bg-secondary: #12121a;
      --bg-card: #1a1a24;
      --border: #2a2a3a;
      --text-primary: #f0f0f5;
      --text-secondary: #8888a0;
      --accent-green: #00d97e;
      --accent-red: #ff4757;
      --accent-yellow: #ffc107;
      --accent-blue: #00b4d8;
      --accent-purple: #7c3aed;
      --glow-green: rgba(0, 217, 126, 0.15);
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Space Grotesk', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      background-image: 
        radial-gradient(ellipse at top, rgba(124, 58, 237, 0.1) 0%, transparent 50%),
        radial-gradient(ellipse at bottom right, rgba(0, 180, 216, 0.08) 0%, transparent 50%);
    }
    
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    
    header { text-align: center; margin-bottom: 50px; }
    
    .logo {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }
    
    .subtitle { color: var(--text-secondary); font-size: 1.1rem; }
    
    .status-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px 24px;
      border-radius: 12px;
      margin-bottom: 40px;
      font-weight: 500;
      background: var(--glow-green);
      border: 1px solid var(--accent-green);
      color: var(--accent-green);
    }
    
    .pulse {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.1); }
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }
    
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    
    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    
    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }
    
    .card-icon.purple { background: rgba(124, 58, 237, 0.2); }
    .card-icon.blue { background: rgba(0, 180, 216, 0.2); }
    .card-icon.green { background: rgba(0, 217, 126, 0.2); }
    .card-icon.yellow { background: rgba(255, 193, 7, 0.2); }
    
    .card-title { font-size: 1.1rem; font-weight: 600; }
    
    .config-list { list-style: none; }
    
    .config-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
    }
    
    .config-item:last-child { border-bottom: none; }
    .config-name { color: var(--text-secondary); }
    .config-status { display: flex; align-items: center; gap: 6px; }
    
    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .status-dot.ok { background: var(--accent-green); }
    .status-dot.error { background: var(--accent-red); }
    .status-dot.warning { background: var(--accent-yellow); }
    
    .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    
    .stat-item {
      background: var(--bg-secondary);
      border-radius: 10px;
      padding: 16px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--accent-blue);
      font-family: 'JetBrains Mono', monospace;
    }
    
    .stat-label { font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; }
    
    .endpoints-list { list-style: none; }
    
    .endpoint-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
      margin-bottom: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
    }
    
    .endpoint-method {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
    }
    
    .endpoint-method.get { background: var(--accent-green); color: #000; }
    .endpoint-method.post { background: var(--accent-blue); color: #000; }
    
    .test-buttons { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
    
    .test-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      font-size: 0.9rem;
    }
    
    .test-btn.primary {
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
      color: white;
    }
    
    .test-btn.secondary {
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }
    
    .test-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3); }
    
    .footer {
      text-align: center;
      padding-top: 40px;
      border-top: 1px solid var(--border);
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
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
      <span>System Online — All services operational</span>
    </div>
    
    <div class="grid">
      <div class="card">
        <div class="card-header">
          <div class="card-icon purple">🖥️</div>
          <h2 class="card-title">Server Status</h2>
        </div>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-value">${uptimeFormatted}</div>
            <div class="stat-label">Uptime</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${process.version}</div>
            <div class="stat-label">Node Version</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${configuredCount}/${totalConfigs}</div>
            <div class="stat-label">Configs Set</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${process.env.NODE_ENV || 'production'}</div>
            <div class="stat-label">Environment</div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div class="card-icon blue">🔑</div>
          <h2 class="card-title">API Keys Status</h2>
        </div>
        <ul class="config-list">
          <li class="config-item">
            <span class="config-name">VAPI_API_KEY</span>
            <span class="config-status">
              <span class="status-dot ${configs.vapiApiKey ? 'ok' : 'error'}"></span>
              ${configs.vapiApiKey ? 'Configured' : 'Missing'}
            </span>
          </li>
          <li class="config-item">
            <span class="config-name">GHL_API_KEY (Primary)</span>
            <span class="config-status">
              <span class="status-dot ${configs.ghlApiKey ? 'ok' : 'error'}"></span>
              ${configs.ghlApiKey ? 'Configured' : 'Missing'}
            </span>
          </li>
          <li class="config-item">
            <span class="config-name">GHL_API_KEY_SECONDARY</span>
            <span class="config-status">
              <span class="status-dot ${configs.ghlApiKeySecondary ? 'ok' : 'warning'}"></span>
              ${configs.ghlApiKeySecondary ? 'Configured' : 'Not set'}
            </span>
          </li>
          <li class="config-item">
            <span class="config-name">GHL_API_KEY_THIRD</span>
            <span class="config-status">
              <span class="status-dot ${configs.ghlApiKeyThird ? 'ok' : 'warning'}"></span>
              ${configs.ghlApiKeyThird ? 'Configured' : 'Not set'}
            </span>
          </li>
          <li class="config-item">
            <span class="config-name">GHL_API_KEY_FOURTH</span>
            <span class="config-status">
              <span class="status-dot ${configs.ghlApiKeyFourth ? 'ok' : 'warning'}"></span>
              ${configs.ghlApiKeyFourth ? 'Configured' : 'Not set'}
            </span>
          </li>
        </ul>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div class="card-icon green">🔗</div>
          <h2 class="card-title">Webhooks & Integrations</h2>
        </div>
        <ul class="config-list">
          <li class="config-item">
            <span class="config-name">WEBHOOK_TOKEN</span>
            <span class="config-status">
              <span class="status-dot ${configs.webhookToken ? 'ok' : 'error'}"></span>
              ${configs.webhookToken ? 'Secured' : 'Missing'}
            </span>
          </li>
          <li class="config-item">
            <span class="config-name">GHL Default Webhook</span>
            <span class="config-status">
              <span class="status-dot ${configs.ghlWebhookDefault ? 'ok' : 'warning'}"></span>
              ${configs.ghlWebhookDefault ? 'Configured' : 'Not set'}
            </span>
          </li>
          <li class="config-item">
            <span class="config-name">Slack Bot Token</span>
            <span class="config-status">
              <span class="status-dot ${configs.slackBotToken ? 'ok' : 'warning'}"></span>
              ${configs.slackBotToken ? 'Connected' : 'Not set'}
            </span>
          </li>
          <li class="config-item">
            <span class="config-name">Slack Channel</span>
            <span class="config-status">
              <span class="status-dot ${configs.slackChannelId ? 'ok' : 'warning'}"></span>
              ${configs.slackChannelId ? 'Configured' : 'Not set'}
            </span>
          </li>
        </ul>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div class="card-icon yellow">📡</div>
          <h2 class="card-title">Available Endpoints</h2>
        </div>
        <ul class="endpoints-list">
          <li class="endpoint-item">
            <span class="endpoint-method get">GET</span>
            <span class="endpoint-path">/health</span>
          </li>
          <li class="endpoint-item">
            <span class="endpoint-method post">POST</span>
            <span class="endpoint-path">/vapi/webhook</span>
          </li>
          <li class="endpoint-item">
            <span class="endpoint-method get">GET</span>
            <span class="endpoint-path">/debug/env</span>
          </li>
          <li class="endpoint-item">
            <span class="endpoint-method get">GET</span>
            <span class="endpoint-path">/debug/network</span>
          </li>
        </ul>
      </div>
    </div>
    
    <div class="card" style="margin-bottom: 40px;">
      <div class="card-header">
        <div class="card-icon purple">🧪</div>
        <h2 class="card-title">Quick Tests</h2>
      </div>
      <p style="color: var(--text-secondary); margin-bottom: 16px;">
        Run these tests to verify your integrations are working correctly.
      </p>
      <div class="test-buttons">
        <a href="/health" class="test-btn primary" target="_blank">Health Check</a>
        <a href="/debug/env" class="test-btn secondary" target="_blank">View Environment</a>
        <a href="/debug/network" class="test-btn secondary" target="_blank">Test Network</a>
      </div>
    </div>
    
    <footer class="footer">
      <p>Vapi-GHL Connector v1.0.0 | Running on Vercel</p>
      <p style="margin-top: 8px;">Last updated: ${new Date().toISOString()}</p>
    </footer>
  </div>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    configs: getConfigs(),
  });
});

// Debug endpoint for environment variables
app.get('/debug/env', (_req, res) => {
  res.status(200).json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      WEBHOOK_TOKEN: process.env.WEBHOOK_TOKEN ? 'Set' : 'Not set',
      GHL_API_KEY: process.env.GHL_API_KEY ? 'Set' : 'Not set',
      VAPI_API_KEY: process.env.VAPI_API_KEY ? 'Set' : 'Not set',
      VAPI_API_BASE_URL: process.env.VAPI_API_BASE_URL || 'Not set',
    },
    serverInfo: {
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
    },
  });
});

// Debug endpoint to test network connectivity
app.get('/debug/network', async (_req, res) => {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tests: {},
  };
  
  const testEndpoints = [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'Vapi API', url: 'https://api.vapi.ai' },
    { name: 'GHL API', url: 'https://services.leadconnectorhq.com' },
  ];
  
  for (const endpoint of testEndpoints) {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(endpoint.url, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      results.tests[endpoint.name] = { success: true, status: response.status, latencyMs: Date.now() - startTime };
    } catch (error: any) {
      results.tests[endpoint.name] = { success: false, error: error.message, latencyMs: Date.now() - startTime };
    }
  }
  
  res.status(200).json(results);
});

// Catch-all for 404
app.use('*', (req, res) => {
  res.status(404).json({ ok: false, message: 'Route not found', path: req.originalUrl });
});

export default app;

