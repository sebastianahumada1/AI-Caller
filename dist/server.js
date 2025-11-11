import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { VapiWebhookHandler } from './vapi.js';
import { Logger, logRequest } from './utils/logger.js';
// Load environment variables
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
const vapiHandler = new VapiWebhookHandler();
// Middleware for request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logRequest(req.method, req.url, res.statusCode, duration);
    });
    next();
});
// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
};
app.use(cors(corsOptions));
// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Health check endpoint
app.get('/health', (_req, res) => {
    const healthInfo = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: {
            webhookToken: !!process.env.WEBHOOK_TOKEN,
            defaultWebhook: !!process.env.GHL_INCOMING_WEBHOOK_URL_DEFAULT,
            bookingWebhook: !!process.env.GHL_INCOMING_WEBHOOK_URL_BOOKING,
            depositWebhook: !!process.env.GHL_INCOMING_WEBHOOK_URL_DEPOSIT,
            vapiApiKey: !!process.env.VAPI_API_KEY,
            vapiApiBaseUrl: !!process.env.VAPI_API_BASE_URL,
            ghlApiKey: !!process.env.GHL_API_KEY,
            slackBotToken: !!process.env.SLACK_BOT_TOKEN,
            slackChannelId: !!process.env.SLACK_CHANNEL_ID,
        },
        features: {
            metadataPull: true,
            ghlToolSupport: true,
            scheduledPolling: true,
            slackIntegration: !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID),
        },
    };
    res.status(200).json(healthInfo);
});
// Debug endpoint for environment variables
app.get('/debug/env', (_req, res) => {
    const envInfo = {
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            WEBHOOK_TOKEN: process.env.WEBHOOK_TOKEN ? 'Set' : 'Not set',
            GHL_API_KEY: process.env.GHL_API_KEY ? 'Set' : 'Not set',
            VAPI_API_KEY: process.env.VAPI_API_KEY ? 'Set' : 'Not set',
            GHL_INCOMING_WEBHOOK_URL_DEFAULT: process.env.GHL_INCOMING_WEBHOOK_URL_DEFAULT ? 'Set' : 'Not set',
        },
        ghlApiKeyValue: process.env.GHL_API_KEY ? process.env.GHL_API_KEY.substring(0, 10) + '...' : 'Not set',
    };
    res.status(200).json(envInfo);
});
// Vapi webhook endpoint with token validation
app.post('/vapi/webhook', (req, res, next) => vapiHandler.validateToken(req, res, next), (req, res) => vapiHandler.handleWebhook(req, res));
// Manual metadata pull endpoint (optional)
app.post('/vapi/pull-metadata', (req, res, next) => vapiHandler.validateToken(req, res, next), async (req, res) => {
    try {
        const { callId } = req.body;
        if (!callId) {
            return res.status(400).json({
                ok: false,
                message: 'callId is required',
            });
        }
        Logger.info('[MANUAL_METADATA_PULL] Manual metadata pull requested', { callId });
        const result = await vapiHandler.pullAndProcessGhlMetadata(callId);
        Logger.info('[MANUAL_METADATA_PULL] Manual metadata pull completed', {
            callId,
            success: result.success,
        });
        return res.status(200).json({
            ok: true,
            message: 'Metadata pull completed',
            data: result,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Logger.error('[MANUAL_METADATA_PULL] Manual metadata pull failed', {
            error: errorMessage,
            body: req.body,
        });
        return res.status(500).json({
            ok: false,
            message: 'Failed to pull metadata',
            error: errorMessage,
        });
    }
});
// Slack connection test endpoint
app.post('/slack/test', (req, res, next) => vapiHandler.validateToken(req, res, next), async (_req, res) => {
    try {
        Logger.info('[SLACK_TEST] Slack connection test requested');
        const isConnected = await vapiHandler.testSlackConnection();
        if (isConnected) {
            Logger.info('[SLACK_TEST] Slack connection test successful');
            return res.status(200).json({
                ok: true,
                message: 'Slack connection successful',
                connected: true,
            });
        }
        else {
            Logger.warn('[SLACK_TEST] Slack connection test failed');
            return res.status(200).json({
                ok: false,
                message: 'Slack connection failed',
                connected: false,
            });
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Logger.error('[SLACK_TEST] Slack connection test error', {
            error: errorMessage,
        });
        return res.status(500).json({
            ok: false,
            message: 'Slack connection test failed',
            error: errorMessage,
            connected: false,
        });
    }
});
// Catch-all route for undefined endpoints
app.use('*', (req, res) => {
    Logger.warn('Route not found', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
    });
    res.status(404).json({
        ok: false,
        message: 'Route not found',
        path: req.originalUrl,
    });
});
// Global error handler
app.use((err, req, res, _next) => {
    Logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
    });
    res.status(500).json({
        ok: false,
        message: 'Internal server error',
    });
});
// Graceful shutdown handling
function gracefulShutdown(signal) {
    Logger.info(`Received ${signal}, shutting down gracefully`);
    process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Start server
app.listen(port, () => {
    Logger.info('Server started', {
        port,
        environment: process.env.NODE_ENV || 'development',
        corsOrigin: process.env.CORS_ORIGIN || '*',
        webhookConfigured: !!process.env.WEBHOOK_TOKEN,
    });
});
export default app;
