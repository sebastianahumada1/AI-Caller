export interface SlackUploadOptions {
    recordingUrl: string;
    callId: string;
    channelId?: string;
    title?: string;
    comment?: string;
}
export interface SlackMessageOptions {
    channelId: string;
    text: string;
    threadTs?: string;
}
export declare class SlackService {
    private botToken;
    private defaultChannelId;
    constructor();
    /**
     * Downloads a recording from URL and uploads it to Slack
     */
    uploadRecording(options: SlackUploadOptions): Promise<any>;
    /**
     * Sends a text message to a Slack channel
     */
    sendMessage(options: SlackMessageOptions): Promise<any>;
    /**
     * Uploads recording and sends additional context message
     */
    uploadRecordingWithContext(recordingUrl: string, callId: string, context?: {
        duration?: number;
        cost?: number;
        summary?: string;
        sentiment?: string;
    }): Promise<void>;
    /**
     * Test the Slack connection
     */
    testConnection(): Promise<boolean>;
}
