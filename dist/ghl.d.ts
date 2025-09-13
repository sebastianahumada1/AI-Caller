import { SendSmsArgs, UpsertContactArgs, AddTagArgs, AddNoteArgs, UpdateStageArgs, ToolResult } from './schemas.js';
export declare class GHLConnector {
    private httpClient;
    private readonly defaultWebhookUrl;
    private readonly bookingWebhookUrl;
    private readonly depositWebhookUrl;
    constructor();
    sendSms(id: string, args: SendSmsArgs): Promise<ToolResult>;
    upsertContact(id: string, args: UpsertContactArgs): Promise<ToolResult>;
    addTag(id: string, args: AddTagArgs): Promise<ToolResult>;
    addNote(id: string, args: AddNoteArgs): Promise<ToolResult>;
    updateStage(id: string, args: UpdateStageArgs): Promise<ToolResult>;
    addNoteByContactIdViaAPI(id: string, contactId: string, note: string): Promise<ToolResult>;
}
