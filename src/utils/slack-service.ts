import { Logger } from './logger.js';

export interface SlackMessageOptions {
  channelId: string;
  text: string;
  threadTs?: string;
}

export class SlackService {
  private botToken: string;
  private defaultChannelId: string;

  constructor() {
    this.botToken = process.env.SLACK_BOT_TOKEN!;
    this.defaultChannelId = process.env.SLACK_CHANNEL_ID!;

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
  async sendMessage(options: SlackMessageOptions): Promise<any> {
    const { channelId, text, threadTs } = options;

    try {
      Logger.info('[SLACK_SERVICE] Sending message', {
        channelId,
        textLength: text.length,
        isThread: !!threadTs,
      });

      const payload: any = {
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

    } catch (error) {
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
  async uploadRecordingWithContext(
    recordingUrl: string,
    callId: string,
    assistantId?: string,
    ghlMetadata?: any,
    fullCallData?: any,
    context?: {
      duration?: number;
      cost?: number;
      summary?: string;
      sentiment?: string;
    }
  ): Promise<void> {
    try {
      Logger.info('[SLACK_SERVICE] Sending recording link to Slack', {
        callId,
        recordingUrl,
        hasContext: !!context,
        hasAssistantId: !!assistantId,
        hasGhlMetadata: !!ghlMetadata,
        hasFullCallData: !!fullCallData,
      });

      // Import ClientConfigManager to get client name
      const { ClientConfigManager } = await import('./client-config.js');
      
      // Get client name from assistant ID
      const clientName = assistantId ? ClientConfigManager.getClientName(assistantId) : 'Unknown Client';
      
      // Extract lead name from multiple possible sources (priority order)
      // 1. ghlMetadata.contact.name (from GHL metadata)
      // 2. fullCallData.metadata.name (from VAPI metadata directly)
      // 3. ghlMetadata.contact.firstName + lastName (fallback)
      let leadName = 'N/A';
      if (ghlMetadata?.contact?.name) {
        leadName = ghlMetadata.contact.name;
      } else if (fullCallData?.metadata?.name) {
        leadName = fullCallData.metadata.name;
      } else if (ghlMetadata?.contact?.firstName) {
        leadName = `${ghlMetadata.contact.firstName}${ghlMetadata.contact.lastName ? ' ' + ghlMetadata.contact.lastName : ''}`;
      }
      
      // Extract email from multiple sources
      const leadEmail = ghlMetadata?.contact?.email 
        || fullCallData?.metadata?.email 
        || 'N/A';
      
      // Format date: YYYY-MM-DD HH:MM:SS
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      
      // Build the message with exact format requested
      let message = `<!channel> New Call Recording & Report Just Dropped\n\n`;
      message += `**The name of the GHL account associated with the call:** ${clientName}\n\n`;
      message += `**Lead Name:** ${leadName}\n`;
      message += `**Email:** ${leadEmail}\n`;
      message += `**Date:** ${formattedDate}\n\n`;
      message += `**Call ID:** ${callId}\n\n`;
      message += `**Call Details:**\n`;
      
      if (context?.cost) {
        message += `**Cost:** $${context.cost.toFixed(4)}\n`;
      }
      
      if (context?.duration) {
        const durationMinutes = Math.floor(context.duration / 60);
        const durationSeconds = Math.floor(context.duration % 60);
        message += `**Duration:** ${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}\n`;
      }
      
      if (context?.summary) {
        message += `**Summary:** ${context.summary}\n`;
      }
      
      message += `\n**Call recording:** ${recordingUrl}`;

      // Send the message
      await this.sendMessage({
        channelId: this.defaultChannelId,
        text: message,
      });

      Logger.info('[SLACK_SERVICE] Recording link sent successfully to Slack', {
        callId,
        leadName,
        leadEmail,
      });

    } catch (error) {
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
  async testConnection(): Promise<boolean> {
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
      } else {
        Logger.error('[SLACK_SERVICE] Connection test failed', {
          error: result.error,
        });
        return false;
      }

    } catch (error) {
      Logger.error('[SLACK_SERVICE] Connection test error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}