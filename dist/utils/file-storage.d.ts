export declare class FileStorage {
    private baseDir;
    constructor();
    private ensureDirectoryExists;
    private getDateString;
    private getTimestamp;
    saveCompleteCallData(callId: string, data: {
        contactId?: string;
        transcript?: string;
        metadata?: any;
        role?: string;
        isFinal?: boolean;
    }): Promise<void>;
    saveTranscript(callId: string, transcript: string, role?: string, isFinal?: boolean): Promise<void>;
}
