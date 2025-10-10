import FormData from 'form-data';
import { Logger } from './logger.js';
export class SlackService {
    botToken;
    defaultChannelId;
    constructor() {
        this.botToken = process.env.SLACK_BOT_TOKEN;
        this.defaultChannelId = process.env.SLACK_CHANNEL_ID;
        if (!this.botToken) {
            throw new Error('SLACK_BOT_TOKEN environment variable is required');
        }
        if (!this.defaultChannelId) {
            throw new Error('SLACK_CHANNEL_ID environment variable is required');
        }
        Logger.info('[SLACK_SERVICE] Initialized', {
            hasToken: !!this.botToken,
            defaultChannel: this.defaultChannelId,
        });
    }
    /**
     * Downloads a recording from URL and uploads it to Slack
     */
    async uploadRecording(options) {
        const { recordingUrl, callId, channelId = this.defaultChannelId, title = `Grabación de llamada ${callId}`, comment = `📞 Grabación de la llamada ID: ${callId}`, } = options;
        try {
            Logger.info('[SLACK_SERVICE] Starting recording upload', {
                callId,
                recordingUrl,
                channelId,
            });
            // Download the recording
            const response = await fetch(recordingUrl);
            if (!response.ok) {
                throw new Error(`Failed to download recording: ${response.status} ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            Logger.info('[SLACK_SERVICE] Recording downloaded', {
                callId,
                sizeBytes: uint8Array.length,
            });
            // Determine file extension from URL or content type
            const contentType = response.headers.get('content-type') || '';
            let fileExtension = '.mp3'; // default
            if (contentType.includes('wav')) {
                fileExtension = '.wav';
            }
            else if (contentType.includes('m4a')) {
                fileExtension = '.m4a';
            }
            else if (recordingUrl.includes('.wav')) {
                fileExtension = '.wav';
            }
            else if (recordingUrl.includes('.m4a')) {
                fileExtension = '.m4a';
            }
            const fileName = `recording_${callId}${fileExtension}`;
            // Create form data for Slack upload
            const formData = new FormData();
            formData.append('file', Buffer.from(uint8Array), {
                filename: fileName,
                contentType: contentType || 'audio/mpeg',
            });
            formData.append('channels', channelId);
            formData.append('title', title);
            formData.append('initial_comment', comment);
            // Upload to Slack
            const uploadResponse = await fetch('https://slack.com/api/files.upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.botToken}`,
                    ...formData.getHeaders(),
                },
                body: formData,
            });
            const result = await uploadResponse.json();
            if (!result.ok) {
                throw new Error(`Slack upload failed: ${result.error}`);
            }
            Logger.info('[SLACK_SERVICE] Recording uploaded successfully', {
                callId,
                fileId: result.file.id,
                fileName: result.file.name,
                channelId,
                permalink: result.file.permalink,
            });
            return result;
        }
        catch (error) {
            Logger.error('[SLACK_SERVICE] Failed to upload recording', {
                callId,
                recordingUrl,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    /**
     * Sends a text message to a Slack channel
     */
    async sendMessage(options) {
        const { channelId, text, threadTs } = options;
        try {
            Logger.info('[SLACK_SERVICE] Sending message', {
                channelId,
                textLength: text.length,
                isThread: !!threadTs,
            });
            const payload = {
                channel: channelId,
                text: text,
            };
            if (threadTs) {
                payload.thread_ts = threadTs;
            }
            const response = await fetch('https://slack.com/api/chat.postMessage', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.botToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!result.ok) {
                throw new Error(`Slack message failed: ${result.error}`);
            }
            Logger.info('[SLACK_SERVICE] Message sent successfully', {
                channelId,
                messageTs: result.ts,
            });
            return result;
        }
        catch (error) {
            Logger.error('[SLACK_SERVICE] Failed to send message', {
                channelId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    /**
     * Uploads recording and sends additional context message
     */
    async uploadRecordingWithContext(recordingUrl, callId, context) {
        try {
            // Upload the recording file
            const uploadResult = await this.uploadRecording({
                recordingUrl,
                callId,
                title: `Grabación - Llamada ${callId}`,
                comment: `📞 **Grabación de llamada ${callId}**`,
            });
            // Send additional context if provided
            if (context && Object.keys(context).length > 0) {
                let contextMessage = `📊 **Detalles de la llamada ${callId}:**\n`;
                if (context.duration) {
                    const minutes = Math.floor(context.duration / 60);
                    const seconds = Math.floor(context.duration % 60);
                    contextMessage += `⏱️ Duración: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
                }
                if (context.cost) {
                    contextMessage += `💰 Costo: $${context.cost.toFixed(4)}\n`;
                }
                if (context.sentiment) {
                    const sentimentEmoji = context.sentiment.toLowerCase().includes('positive') ? '😊' :
                        context.sentiment.toLowerCase().includes('negative') ? '😞' : '😐';
                    contextMessage += `${sentimentEmoji} Sentimiento: ${context.sentiment}\n`;
                }
                if (context.summary) {
                    contextMessage += `📝 Resumen: ${context.summary}`;
                }
                await this.sendMessage({
                    channelId: this.defaultChannelId,
                    text: contextMessage,
                    threadTs: uploadResult.file.shares?.public?.[this.defaultChannelId]?.[0]?.ts,
                });
            }
        }
        catch (error) {
            Logger.error('[SLACK_SERVICE] Failed to upload recording with context', {
                callId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    /**
     * Test the Slack connection
     */
    async testConnection() {
        try {
            Logger.info('[SLACK_SERVICE] Testing connection');
            const response = await fetch('https://slack.com/api/auth.test', {
                headers: {
                    'Authorization': `Bearer ${this.botToken}`,
                },
            });
            const result = await response.json();
            if (result.ok) {
                Logger.info('[SLACK_SERVICE] Connection test successful', {
                    user: result.user,
                    team: result.team,
                    url: result.url,
                });
                return true;
            }
            else {
                Logger.error('[SLACK_SERVICE] Connection test failed', {
                    error: result.error,
                });
                return false;
            }
        }
        catch (error) {
            Logger.error('[SLACK_SERVICE] Connection test error', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }
}
