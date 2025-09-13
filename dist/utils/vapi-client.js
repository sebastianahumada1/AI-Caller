import axios from 'axios';
import { Logger } from './logger.js';
export class VapiApiClient {
    client;
    apiKey;
    baseURL;
    constructor() {
        this.apiKey = process.env.VAPI_API_KEY || '';
        this.baseURL = process.env.VAPI_API_BASE_URL || 'https://api.vapi.ai';
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        // Add request interceptor for logging
        this.client.interceptors.request.use((config) => {
            Logger.info('[VAPI_CLIENT] API request initiated', {
                method: config.method?.toUpperCase(),
                url: config.url,
                baseURL: config.baseURL,
            });
            return config;
        });
        // Add response interceptor for logging
        this.client.interceptors.response.use((response) => {
            Logger.info('[VAPI_CLIENT] API request successful', {
                status: response.status,
                url: response.config.url,
            });
            return response;
        }, (error) => {
            Logger.error('[VAPI_CLIENT] API request failed', {
                status: error.response?.status,
                url: error.config?.url,
                message: error.message,
            });
            return Promise.reject(error);
        });
    }
    async getCall(callId) {
        try {
            Logger.info('[VAPI_CLIENT] Fetching call data', { callId });
            const response = await this.client.get(`/call/${callId}`);
            Logger.info('[VAPI_CLIENT] Call data retrieved successfully', {
                callId,
                hasMetadata: !!response.data?.metadata,
                hasGhlMetadata: !!response.data?.metadata?.ghl,
            });
            return response.data;
        }
        catch (error) {
            Logger.error('[VAPI_CLIENT] Failed to get call data', {
                callId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to get call: ${error}`);
        }
    }
    async getCallMetadata(callId) {
        try {
            Logger.info('[VAPI_CLIENT] Fetching call metadata specifically', { callId });
            const callData = await this.getCall(callId);
            const metadata = callData?.metadata || {};
            const ghlMetadata = metadata?.ghl || null;
            Logger.info('[VAPI_CLIENT] Call metadata extracted', {
                callId,
                hasMetadata: Object.keys(metadata).length > 0,
                hasGhlMetadata: !!ghlMetadata,
                ghlKeys: ghlMetadata ? Object.keys(ghlMetadata) : [],
            });
            return {
                metadata,
                ghlMetadata,
                fullCall: callData,
            };
        }
        catch (error) {
            Logger.error('[VAPI_CLIENT] Failed to get call metadata', {
                callId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
}
