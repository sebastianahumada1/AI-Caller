import { HttpClient } from './utils/http.js';
import { Logger } from './utils/logger.js';
import { ClientConfigManager } from './utils/client-config.js';
export class GHLConnector {
    httpClient;
    defaultWebhookUrl;
    bookingWebhookUrl;
    depositWebhookUrl;
    assistantId = null;
    constructor(assistantId) {
        this.httpClient = new HttpClient();
        this.defaultWebhookUrl = process.env.GHL_INCOMING_WEBHOOK_URL_DEFAULT;
        this.bookingWebhookUrl = process.env.GHL_INCOMING_WEBHOOK_URL_BOOKING;
        this.depositWebhookUrl = process.env.GHL_INCOMING_WEBHOOK_URL_DEPOSIT;
        this.assistantId = assistantId || null;
        if (this.assistantId) {
            const clientName = ClientConfigManager.getClientName(this.assistantId);
            Logger.info('[GHL_CONNECTOR] Initialized for client', {
                assistantId: this.assistantId,
                clientName,
            });
        }
    }
    /**
     * Set the Assistant ID for this connector instance
     */
    setAssistantId(assistantId) {
        this.assistantId = assistantId;
        const clientName = ClientConfigManager.getClientName(assistantId);
        Logger.info('[GHL_CONNECTOR] Assistant ID set', {
            assistantId,
            clientName,
        });
    }
    /**
     * Get the appropriate GHL API Key based on Assistant ID
     */
    getGHLApiKey() {
        if (this.assistantId) {
            const apiKey = ClientConfigManager.getGHLApiKey(this.assistantId);
            if (apiKey) {
                Logger.info('[GHL_CONNECTOR] Using client-specific API key', {
                    assistantId: this.assistantId,
                    clientName: ClientConfigManager.getClientName(this.assistantId),
                });
                return apiKey;
            }
        }
        // Fallback to default API key from environment
        const defaultKey = process.env.GHL_API_KEY;
        if (!defaultKey) {
            Logger.warn('[GHL_CONNECTOR] No API key found for assistant, using default', {
                assistantId: this.assistantId,
            });
        }
        return defaultKey || '';
    }
    async sendSms(id, args) {
        try {
            Logger.info('Processing send_sms tool call', { id, args });
            // Determine the webhook URL based on template
            let webhookUrl;
            if (args.template === 'booking' && this.bookingWebhookUrl) {
                webhookUrl = this.bookingWebhookUrl;
            }
            else if (args.template === 'deposit' && this.depositWebhookUrl) {
                webhookUrl = this.depositWebhookUrl;
            }
            else if (this.defaultWebhookUrl) {
                webhookUrl = this.defaultWebhookUrl;
            }
            if (!webhookUrl) {
                const error = `No webhook URL configured for template: ${args.template || 'default'}`;
                Logger.error(error, { id });
                return {
                    id,
                    ok: false,
                    error,
                };
            }
            // Prepare payload for GHL webhook
            const payload = {
                phone: args.phone,
                firstName: args.firstName,
                template: args.template,
                callId: args.callId,
                body: args.body,
                action: 'send_sms',
                timestamp: new Date().toISOString(),
            };
            const response = await this.httpClient.post(webhookUrl, payload);
            if (response.ok) {
                Logger.info('SMS webhook sent successfully', { id, webhookUrl });
                return {
                    id,
                    ok: true,
                    data: response.data,
                };
            }
            else {
                const error = `GHL webhook failed: ${response.status} ${response.statusText}`;
                Logger.error(error, { id, response: response.data });
                return {
                    id,
                    ok: false,
                    error,
                };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('Error in send_sms', { id, error: errorMessage });
            return {
                id,
                ok: false,
                error: errorMessage,
            };
        }
    }
    async upsertContact(id, args) {
        try {
            Logger.info('Processing upsert_contact tool call', { id, args });
            if (!this.defaultWebhookUrl) {
                const error = 'No default webhook URL configured for upsert_contact';
                Logger.error(error, { id });
                return {
                    id,
                    ok: false,
                    error,
                };
            }
            // Prepare payload for GHL webhook
            const payload = {
                phone: args.phone,
                email: args.email,
                firstName: args.firstName,
                lastName: args.lastName,
                name: args.name,
                action: 'upsert_contact',
                timestamp: new Date().toISOString(),
            };
            const response = await this.httpClient.post(this.defaultWebhookUrl, payload);
            if (response.ok) {
                Logger.info('Contact upsert webhook sent successfully', { id });
                return {
                    id,
                    ok: true,
                    data: response.data,
                };
            }
            else {
                const error = `GHL webhook failed: ${response.status} ${response.statusText}`;
                Logger.error(error, { id, response: response.data });
                return {
                    id,
                    ok: false,
                    error,
                };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('Error in upsert_contact', { id, error: errorMessage });
            return {
                id,
                ok: false,
                error: errorMessage,
            };
        }
    }
    async addTag(id, args) {
        try {
            Logger.info('Processing add_tag tool call', { id, args });
            if (!this.defaultWebhookUrl) {
                const error = 'No default webhook URL configured for add_tag';
                Logger.error(error, { id });
                return {
                    id,
                    ok: false,
                    error,
                };
            }
            // Prepare payload for GHL webhook
            const payload = {
                phone: args.phone,
                email: args.email,
                tag: args.tag,
                action: 'add_tag',
                timestamp: new Date().toISOString(),
            };
            const response = await this.httpClient.post(this.defaultWebhookUrl, payload);
            if (response.ok) {
                Logger.info('Add tag webhook sent successfully', { id });
                return {
                    id,
                    ok: true,
                    data: response.data,
                };
            }
            else {
                const error = `GHL webhook failed: ${response.status} ${response.statusText}`;
                Logger.error(error, { id, response: response.data });
                return {
                    id,
                    ok: false,
                    error,
                };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('Error in add_tag', { id, error: errorMessage });
            return {
                id,
                ok: false,
                error: errorMessage,
            };
        }
    }
    async addNote(id, args) {
        try {
            Logger.info('Processing add_note tool call', { id, args });
            if (!this.defaultWebhookUrl) {
                const error = 'No default webhook URL configured for add_note';
                Logger.error(error, { id });
                return {
                    id,
                    ok: false,
                    error,
                };
            }
            // Prepare payload for GHL webhook
            const payload = {
                phone: args.phone,
                email: args.email,
                note: args.note,
                action: 'add_note',
                timestamp: new Date().toISOString(),
            };
            const response = await this.httpClient.post(this.defaultWebhookUrl, payload);
            if (response.ok) {
                Logger.info('Add note webhook sent successfully', { id });
                return {
                    id,
                    ok: true,
                    data: response.data,
                };
            }
            else {
                const error = `GHL webhook failed: ${response.status} ${response.statusText}`;
                Logger.error(error, { id, response: response.data });
                return {
                    id,
                    ok: false,
                    error,
                };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('Error in add_note', { id, error: errorMessage });
            return {
                id,
                ok: false,
                error: errorMessage,
            };
        }
    }
    async updateStage(id, args) {
        try {
            Logger.info('Processing update_stage tool call', { id, args });
            if (!this.defaultWebhookUrl) {
                const error = 'No default webhook URL configured for update_stage';
                Logger.error(error, { id });
                return {
                    id,
                    ok: false,
                    error,
                };
            }
            // Prepare payload for GHL webhook
            const payload = {
                phone: args.phone,
                email: args.email,
                pipelineId: args.pipelineId,
                stageId: args.stageId,
                note: args.note,
                action: 'update_stage',
                timestamp: new Date().toISOString(),
            };
            const response = await this.httpClient.post(this.defaultWebhookUrl, payload);
            if (response.ok) {
                Logger.info('Update stage webhook sent successfully', { id });
                return {
                    id,
                    ok: true,
                    data: response.data,
                };
            }
            else {
                const error = `GHL webhook failed: ${response.status} ${response.statusText}`;
                Logger.error(error, { id, response: response.data });
                return {
                    id,
                    ok: false,
                    error,
                };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('Error in update_stage', { id, error: errorMessage });
            return {
                id,
                ok: false,
                error: errorMessage,
            };
        }
    }
    // New method to add note using GHL API directly with contactId
    async addNoteByContactIdViaAPI(id, contactId, note) {
        try {
            Logger.info('[GHL] Processing add_note_by_contact_id_via_api', {
                id,
                contactId,
                noteLength: note.length
            });
            const ghlApiKey = this.getGHLApiKey();
            if (!ghlApiKey) {
                const error = 'GHL_API_KEY not configured for this client';
                Logger.error('[GHL] ' + error, {
                    id,
                    contactId,
                    assistantId: this.assistantId,
                });
                return {
                    id,
                    ok: false,
                    error,
                };
            }
            // GHL API endpoint for adding notes to contacts
            const apiUrl = `https://services.leadconnectorhq.com/contacts/${contactId}/notes`;
            const payload = {
                body: note,
                userId: 'system', // or you can use a specific user ID
            };
            const response = await this.httpClient.post(apiUrl, payload, {
                headers: {
                    'Authorization': `Bearer ${ghlApiKey}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28',
                },
            });
            if (response.ok) {
                Logger.info('[GHL] Note added to GHL contact successfully via API', {
                    id,
                    contactId,
                    noteId: response.data?.note?.id
                });
                return {
                    id,
                    ok: true,
                    data: response.data,
                };
            }
            else {
                const error = `GHL API failed: ${response.status} ${response.statusText}`;
                Logger.error('[GHL] ' + error, { id, contactId, responseData: response.data });
                return {
                    id,
                    ok: false,
                    error,
                };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('[GHL] Error in add_note_by_contact_id_via_api', {
                id,
                contactId,
                error: errorMessage
            });
            return {
                id,
                ok: false,
                error: errorMessage,
            };
        }
    }
}
