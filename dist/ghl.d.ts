import { SendSmsArgs, UpsertContactArgs, AddTagArgs, AddNoteArgs, UpdateStageArgs, ToolResult } from './schemas.js';
export declare class GHLConnector {
    private httpClient;
    private readonly defaultWebhookUrl;
    private readonly bookingWebhookUrl;
    private readonly depositWebhookUrl;
    private assistantId;
    constructor(assistantId?: string);
    /**
     * Set the Assistant ID for this connector instance
     */
    setAssistantId(assistantId: string): void;
    /**
     * Get the appropriate GHL API Key based on Assistant ID
     */
    private getGHLApiKey;
    sendSms(id: string, args: SendSmsArgs): Promise<ToolResult>;
    upsertContact(id: string, args: UpsertContactArgs): Promise<ToolResult>;
    addTag(id: string, args: AddTagArgs): Promise<ToolResult>;
    addNote(id: string, args: AddNoteArgs): Promise<ToolResult>;
    updateStage(id: string, args: UpdateStageArgs): Promise<ToolResult>;
    addNoteByContactIdViaAPI(id: string, contactId: string, note: string): Promise<ToolResult>;
}
