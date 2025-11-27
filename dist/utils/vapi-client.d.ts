declare function classifyNetworkError(error: any): {
    type: 'TLS_ERROR' | 'TIMEOUT' | 'DNS_ERROR' | 'CONNECTION_REFUSED' | 'SOCKET_HANGUP' | 'API_ERROR' | 'UNKNOWN';
    description: string;
    suggestion: string;
};
export declare class VapiApiClient {
    private client;
    private apiKey;
    private baseURL;
    private isConfigValid;
    constructor();
    private validateConfig;
    testConnection(): Promise<{
        success: boolean;
        latencyMs?: number;
        error?: string;
        diagnostic?: ReturnType<typeof classifyNetworkError>;
    }>;
    getConfigStatus(): {
        baseURL: string;
        apiKeyConfigured: boolean;
        apiKeyLength: number;
        isConfigValid: boolean;
        environment: string;
        isVercel: boolean;
    };
    getCall(callId: string): Promise<any>;
    getCallMetadata(callId: string): Promise<any>;
}
export {};
