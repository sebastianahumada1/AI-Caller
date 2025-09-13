export declare class VapiApiClient {
    private client;
    private apiKey;
    private baseURL;
    constructor();
    getCall(callId: string): Promise<any>;
    getCallMetadata(callId: string): Promise<any>;
}
