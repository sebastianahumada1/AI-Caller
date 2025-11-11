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
        Logger.info('[SLACK_SERVICE] Initialized (Link-based mode)', {
            hasToken: !!this.botToken,
            defaultChannel: this.defaultChannelId,
        });
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
     * Sends recording link with context message (no file upload)
     */
    async uploadRecordingWithContext(recordingUrl, callId, context) {
        try {
            Logger.info('[SLACK_SERVICE] Sending recording link to Slack', {
                callId,
                recordingUrl,
                hasContext: !!context,
            });
            // Build the main message with recording link (in English)
            let message = `🎵 **New Call Recording Available**\n\n`;
            message += `🆔 **Call ID:** ${callId}\n`;
            message += `🔗 **Recording:** ${recordingUrl}\n\n`;
            // Add context information if provided (in English)
            if (context && Object.keys(context).length > 0) {
                message += `📊 **Call Details:**\n`;
                if (context.duration) {
                    const minutes = Math.floor(context.duration / 60);
                    const seconds = Math.floor(context.duration % 60);
                    message += `⏱️ Duration: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
                }
                if (context.cost) {
                    message += `💰 Cost: $${context.cost.toFixed(4)}\n`;
                }
                if (context.sentiment) {
                    const sentimentEmoji = context.sentiment.toLowerCase().includes('positive') ? '😊' :
                        context.sentiment.toLowerCase().includes('negative') ? '😞' : '😐';
                    message += `${sentimentEmoji} Sentiment: ${context.sentiment}\n`;
                }
                if (context.summary) {
                    message += `📝 Summary: ${context.summary}\n`;
                }
            }
            message += `\n💡 Click the link above to listen to the recording`;
            // Send the message
            await this.sendMessage({
                channelId: this.defaultChannelId,
                text: message,
            });
            Logger.info('[SLACK_SERVICE] Recording link sent successfully to Slack', {
                callId,
            });
        }
        catch (error) {
            Logger.error('[SLACK_SERVICE] Failed to send recording link', {
                callId,
                recordingUrl,
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
