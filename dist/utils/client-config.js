import { Logger } from './logger.js';
/**
 * Client Configuration Manager
 * Maps VAPI Assistant IDs to their respective GHL API keys and configurations
 */
export class ClientConfigManager {
    static configs = new Map();
    /**
     * Initialize client configurations
     */
    static initialize() {
        // Premier Wellness Configuration
        const premierConfig = {
            name: 'Premier Wellness',
            assistantId: '053cd610-596c-4632-a90b-a1e398712178',
            ghlApiKey: 'pit-ea7a24ba-ead3-4076-9afa-e0672c56d0f7',
        };
        if (process.env.SLACK_CHANNEL_ID_PREMIER_WELLNESS) {
            premierConfig.slackChannelId = process.env.SLACK_CHANNEL_ID_PREMIER_WELLNESS;
        }
        this.configs.set('053cd610-596c-4632-a90b-a1e398712178', premierConfig);
        // West Texas Configuration
        const westTexasConfig = {
            name: 'West Texas',
            assistantId: '09c07269-4462-4469-96ac-c4eb06146571',
            ghlApiKey: 'pit-71098f8f-4b2d-46fb-a5a6-c55cca460ecb',
        };
        if (process.env.SLACK_CHANNEL_ID_WEST_TEXAS) {
            westTexasConfig.slackChannelId = process.env.SLACK_CHANNEL_ID_WEST_TEXAS;
        }
        this.configs.set('09c07269-4462-4469-96ac-c4eb06146571', westTexasConfig);
        // Third Client Configuration
        const thirdClientConfig = {
            name: 'Third Client',
            assistantId: '39ba1969-84bf-4991-ab9e-9b234178f5c2',
            ghlApiKey: process.env.GHL_API_KEY_THIRD || 'pit-38da7913-a22e-46b4-873e-f4bb24de234b',
        };
        if (process.env.SLACK_CHANNEL_ID_THIRD_CLIENT) {
            thirdClientConfig.slackChannelId = process.env.SLACK_CHANNEL_ID_THIRD_CLIENT;
        }
        this.configs.set('39ba1969-84bf-4991-ab9e-9b234178f5c2', thirdClientConfig);
        // Data Driven Practices Configuration
        const dataDrivenConfig = {
            name: 'Data Driven Practices',
            assistantId: '30abcadf-9a7c-4db7-8e5f-3d82977f1f5d',
            ghlApiKey: process.env.GHL_API_KEY_FOURTH || 'pit-bd654d7f-815a-4ae1-b593-62a0bc1ca497',
        };
        if (process.env.SLACK_CHANNEL_ID_DATA_DRIVEN_PRACTICES) {
            dataDrivenConfig.slackChannelId = process.env.SLACK_CHANNEL_ID_DATA_DRIVEN_PRACTICES;
        }
        this.configs.set('30abcadf-9a7c-4db7-8e5f-3d82977f1f5d', dataDrivenConfig);
        Logger.info('[CLIENT_CONFIG] Initialized client configurations', {
            clientCount: this.configs.size,
            clients: Array.from(this.configs.values()).map(c => c.name),
        });
    }
    /**
     * Get client configuration by Assistant ID
     */
    static getConfigByAssistantId(assistantId) {
        const config = this.configs.get(assistantId);
        if (!config) {
            Logger.warn('[CLIENT_CONFIG] No configuration found for Assistant ID', {
                assistantId,
                availableAssistants: Array.from(this.configs.keys()),
            });
            return null;
        }
        Logger.info('[CLIENT_CONFIG] Configuration retrieved', {
            assistantId,
            clientName: config.name,
        });
        return config;
    }
    /**
     * Get GHL API Key by Assistant ID
     */
    static getGHLApiKey(assistantId) {
        const config = this.getConfigByAssistantId(assistantId);
        return config?.ghlApiKey || null;
    }
    /**
     * Get client name by Assistant ID
     */
    static getClientName(assistantId) {
        const config = this.getConfigByAssistantId(assistantId);
        return config?.name || 'Unknown Client';
    }
    /**
     * Get Slack Channel ID by Assistant ID
     */
    static getSlackChannelId(assistantId) {
        const config = this.getConfigByAssistantId(assistantId);
        return config?.slackChannelId;
    }
    /**
     * Get all configured clients
     */
    static getAllClients() {
        return Array.from(this.configs.values());
    }
    /**
     * Check if Assistant ID is configured
     */
    static isConfigured(assistantId) {
        return this.configs.has(assistantId);
    }
}
// Initialize configurations on module load
ClientConfigManager.initialize();
