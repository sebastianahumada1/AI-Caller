import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { GHLConnector } from './ghl.js';
import { Logger } from './utils/logger.js';
import { VapiApiClient } from './utils/vapi-client.js';
import { SlackService } from './utils/slack-service.js';
import {
  VapiWebhookBodySchema,
  VapiWebhookBody,
  VapiToolCall,
  SendSmsArgsSchema,
  UpsertContactArgsSchema,
  AddTagArgsSchema,
  AddNoteArgsSchema,
  UpdateStageArgsSchema,
  ToolResult,
  WebhookResponse,
} from './schemas.js';

export class VapiWebhookHandler {
  private ghlConnector: GHLConnector;
  private vapiApiClient: VapiApiClient;
  private slackService: SlackService | null;
  private sentNotes: Set<string>; // Track sent notes to avoid duplicates
  private callSummaries: Map<string, string>; // Store summaries from end-of-call-report

  constructor() {
    this.ghlConnector = new GHLConnector();
    this.vapiApiClient = new VapiApiClient();
    this.sentNotes = new Set();
    this.callSummaries = new Map();
    
    // Initialize Slack service if credentials are available
    try {
      this.slackService = new SlackService();
      Logger.info('[VAPI_HANDLER] Slack integration enabled');
    } catch (error) {
      this.slackService = null;
      Logger.warn('[VAPI_HANDLER] Slack integration disabled - missing credentials', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Token validation middleware
  validateToken(req: Request, res: Response, next: () => void): void {
    const token = req.query.token as string;
    const expectedToken = process.env.WEBHOOK_TOKEN;

    if (!expectedToken) {
      Logger.error('WEBHOOK_TOKEN environment variable not set');
      res.status(500).json({ ok: false, message: 'Server configuration error' });
      return;
    }

    if (!token || token !== expectedToken) {
      Logger.warn('Invalid webhook token', { 
        provided: token ? 'provided' : 'missing',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      res.status(401).json({ ok: false, message: 'Unauthorized' });
      return;
    }

    next();
  }

  // Main webhook handler
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      Logger.info('Received Vapi webhook', {
        method: req.method,
        url: req.url,
        contentType: req.get('Content-Type'),
        userAgent: req.get('User-Agent'),
      });

      // Validate request body
      const validationResult = VapiWebhookBodySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        Logger.error('Invalid webhook body', { 
          errors: validationResult.error.issues,
          body: req.body 
        });
        res.status(400).json({
          ok: false,
          message: 'Invalid request body',
          errors: validationResult.error.issues,
        });
        return;
      }

      const webhookBody: VapiWebhookBody = validationResult.data;
      
      Logger.debug('Parsed webhook body', { message: webhookBody.message });

      const response: WebhookResponse = await this.processMessage(webhookBody);
      
      Logger.info('Webhook processed successfully', { 
        messageType: webhookBody.message.type,
        ok: response.ok 
      });

      res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error('Error processing webhook', { error: errorMessage });
      
      res.status(500).json({
        ok: false,
        message: 'Internal server error',
      });
    }
  }

  private async processMessage(webhookBody: VapiWebhookBody): Promise<WebhookResponse> {
    const { message } = webhookBody;
    const assistantId = (message as any).call?.assistantId;

    // Log assistant ID if available
    if (assistantId) {
      Logger.info('[WEBHOOK] Processing message for assistant', {
        type: message.type,
        assistantId,
      });
    }

    switch (message.type) {
      case 'tool-calls':
        return await this.handleToolCalls(message.toolCallList, assistantId);
      
      case 'call.ended':
        return this.handleCallEnded(message);
      
      case 'end-of-call-report':
        return this.handleEndOfCallReport(message);
      
      case 'transcript':
        return this.handleTranscript(message);
      
      case 'status-update':
        return this.handleStatusUpdate(message);
      
      case 'metadata':
        return this.handleMetadata(message);
      
      case 'ghl_tool':
        return await this.handleGhlTool(message);
      
      default:
        Logger.warn('Unknown message type', { type: (message as any).type });
        return {
          ok: true,
          message: 'Message type not handled',
        };
    }
  }

  private async handleToolCalls(toolCallList: VapiToolCall[], assistantId?: string): Promise<WebhookResponse> {
    Logger.info('Processing tool calls', { 
      count: toolCallList.length,
      assistantId,
    });
    
    // Set assistant ID in GHL connector if available
    if (assistantId) {
      this.ghlConnector.setAssistantId(assistantId);
    }
    
    const results: ToolResult[] = [];

    // Process tool calls sequentially to avoid overwhelming GHL
    for (const toolCall of toolCallList) {
      const result = await this.dispatchToolCall(toolCall);
      results.push(result);
    }

    const allSuccessful = results.every(result => result.ok);
    
    return {
      ok: allSuccessful,
      results,
      message: allSuccessful 
        ? 'All tool calls processed successfully' 
        : 'Some tool calls failed',
    };
  }

  private async dispatchToolCall(toolCall: VapiToolCall): Promise<ToolResult> {
    const { id, name, arguments: args } = toolCall;
    
    Logger.info('Dispatching tool call', { id, name, args });

    try {
      switch (name) {
        case 'send_sms':
          return await this.handleSendSms(id, args);
        
        case 'upsert_contact':
          return await this.handleUpsertContact(id, args);
        
        case 'add_tag':
          return await this.handleAddTag(id, args);
        
        case 'add_note':
          return await this.handleAddNote(id, args);
        
        case 'update_stage':
          return await this.handleUpdateStage(id, args);
        
        default:
          Logger.warn('Unknown tool name', { id, name });
          return {
            id,
            ok: false,
            error: `Unknown tool: ${name}`,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error('Error dispatching tool call', { id, name, error: errorMessage });
      return {
        id,
        ok: false,
        error: errorMessage,
      };
    }
  }

  private async handleSendSms(id: string, args: any): Promise<ToolResult> {
    try {
      const validatedArgs = SendSmsArgsSchema.parse(args);
      return await this.ghlConnector.sendSms(id, validatedArgs);
    } catch (error) {
      if (error instanceof ZodError) {
        Logger.error('Invalid send_sms arguments', { id, errors: error.issues });
        return {
          id,
          ok: false,
          error: `Invalid arguments: ${error.issues.map(i => i.message).join(', ')}`,
        };
      }
      throw error;
    }
  }

  private async handleUpsertContact(id: string, args: any): Promise<ToolResult> {
    try {
      const validatedArgs = UpsertContactArgsSchema.parse(args);
      return await this.ghlConnector.upsertContact(id, validatedArgs);
    } catch (error) {
      if (error instanceof ZodError) {
        Logger.error('Invalid upsert_contact arguments', { id, errors: error.issues });
        return {
          id,
          ok: false,
          error: `Invalid arguments: ${error.issues.map(i => i.message).join(', ')}`,
        };
      }
      throw error;
    }
  }

  private async handleAddTag(id: string, args: any): Promise<ToolResult> {
    try {
      const validatedArgs = AddTagArgsSchema.parse(args);
      return await this.ghlConnector.addTag(id, validatedArgs);
    } catch (error) {
      if (error instanceof ZodError) {
        Logger.error('Invalid add_tag arguments', { id, errors: error.issues });
        return {
          id,
          ok: false,
          error: `Invalid arguments: ${error.issues.map(i => i.message).join(', ')}`,
        };
      }
      throw error;
    }
  }

  private async handleAddNote(id: string, args: any): Promise<ToolResult> {
    try {
      const validatedArgs = AddNoteArgsSchema.parse(args);
      return await this.ghlConnector.addNote(id, validatedArgs);
    } catch (error) {
      if (error instanceof ZodError) {
        Logger.error('Invalid add_note arguments', { id, errors: error.issues });
        return {
          id,
          ok: false,
          error: `Invalid arguments: ${error.issues.map(i => i.message).join(', ')}`,
        };
      }
      throw error;
    }
  }

  private async handleUpdateStage(id: string, args: any): Promise<ToolResult> {
    try {
      const validatedArgs = UpdateStageArgsSchema.parse(args);
      return await this.ghlConnector.updateStage(id, validatedArgs);
    } catch (error) {
      if (error instanceof ZodError) {
        Logger.error('Invalid update_stage arguments', { id, errors: error.issues });
        return {
          id,
          ok: false,
          error: `Invalid arguments: ${error.issues.map(i => i.message).join(', ')}`,
        };
      }
      throw error;
    }
  }

  private handleCallEnded(message: any): WebhookResponse {
    Logger.info('Call ended', {
      callId: message.call?.id,
      endedReason: message.endedReason,
    });

    return {
      ok: true,
      message: 'Call ended event processed',
    };
  }

  private handleEndOfCallReport(message: any): WebhookResponse {
    const recordingUrl = message.call?.recordingUrl || message.recordingUrl;
    
    Logger.info('End of call report received', {
      callId: message.call?.id,
      timestamp: message.timestamp,
      endedReason: message.endedReason,
      duration: message.duration,
      cost: message.cost,
      analysis: message.analysis ? 'Analysis included' : 'Analysis pending',
      hasRecording: !!recordingUrl,
    });

    // Store the summary from end-of-call-report if available
    if (message.call?.id && message.analysis?.summary) {
      this.callSummaries.set(message.call.id, message.analysis.summary);
      Logger.info('[END_OF_CALL] Summary stored for GHL note', {
        callId: message.call.id,
        summaryLength: message.analysis.summary.length,
      });
    }

    // Upload recording to Slack if available
    if (recordingUrl && message.call?.id && this.slackService) {
      this.uploadRecordingToSlack(
        recordingUrl,
        message.call.id,
        {
          duration: message.duration,
          cost: message.cost,
          summary: message.analysis?.summary,
          sentiment: message.analysis?.sentiment,
        }
      ).catch(error => {
        Logger.error('[SLACK_UPLOAD] Failed to upload recording', {
          callId: message.call.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }

    // Always schedule metadata pull when we receive end-of-call-report
    if (message.call?.id) {
      Logger.info('Scheduling metadata pull for end-of-call-report', {
        callId: message.call.id,
        hasAnalysis: !!message.analysis,
      });
      
      // Schedule polling for both analysis and metadata
      this.scheduleAnalysisPolling(message.call.id);
      
      // Also schedule immediate metadata pull
      this.scheduleMetadataPull(message.call.id);
    }

    // Process the report regardless of analysis status
    this.processEndOfCallReport(message);

    return {
      ok: true,
      message: 'End of call report processed',
    };
  }

  private scheduleAnalysisPolling(callId: string): void {
    // Option 1: Simple timeout-based retry
    const pollAttempts = [30000, 60000, 120000]; // 30s, 1min, 2min
    
    pollAttempts.forEach((delay, index) => {
      setTimeout(async () => {
        Logger.info('Polling for call analysis', { callId, attempt: index + 1 });
        await this.pollForCallAnalysis(callId);
      }, delay);
    });
  }

  private async pollForCallAnalysis(callId: string): Promise<void> {
    try {
      Logger.info('[ANALYSIS_POLL] Polling for call analysis and metadata', { callId });
      
      const callDetails = await this.vapiApiClient.getCall(callId);
      
      if (callDetails.analysis) {
        Logger.info('[ANALYSIS_POLL] Analysis now available', {
          callId,
          hasAnalysis: true,
        });
        
        // Store the summary if available
        if (callDetails.analysis.summary) {
          this.callSummaries.set(callId, callDetails.analysis.summary);
          Logger.info('[ANALYSIS_POLL] Summary stored from polling', {
            callId,
            summaryLength: callDetails.analysis.summary.length,
          });
        }
      }
      
      // Also check for GHL metadata
      if (callDetails.metadata?.ghl) {
        Logger.info('[ANALYSIS_POLL] GHL metadata found during analysis poll', {
          callId,
          ghlKeys: Object.keys(callDetails.metadata.ghl),
        });
        
        // Process the GHL metadata
        await this.processGhlMetadata(callId, callDetails.metadata.ghl);
      }
      
      Logger.info('[ANALYSIS_POLL] Analysis poll completed', {
        callId,
        hasAnalysis: !!callDetails.analysis,
        hasGhlMetadata: !!callDetails.metadata?.ghl,
      });
    } catch (error) {
      Logger.error('[ANALYSIS_POLL] Error polling for analysis', {
        callId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private processEndOfCallReport(message: any): void {
    // Add your business logic here
    // For example: save to database, send notifications, update CRM, etc.
    Logger.info('Processing end of call report', {
      callId: message.call?.id,
      hasAnalysis: !!message.analysis,
    });
  }

  private handleTranscript(message: any): WebhookResponse {
    Logger.info('Transcript received', {
      callId: message.call?.id,
      timestamp: message.timestamp,
      role: message.role,
      isFinal: message.isFinal,
      transcriptLength: message.transcript?.length || 0,
      transcript: message.isFinal ? message.transcript : message.transcript?.substring(0, 100) + '...',
    });

    // Log transcript info but don't save to files - only send summary note to GHL
    if (message.call?.id && message.transcript && message.isFinal) {
      Logger.info('[TRANSCRIPT] Final transcript received, will be included in GHL summary note', {
        callId: message.call.id,
        transcriptLength: message.transcript.length,
      });
    }

    return {
      ok: true,
      message: 'Transcript processed',
    };
  }

  private handleStatusUpdate(message: any): WebhookResponse {
    Logger.info('Status update received', {
      callId: message.call?.id,
      timestamp: message.timestamp,
      status: message.status,
      details: message.details,
      metadata: message.metadata,
    });

    // You can add custom logic here to process status updates
    // For example: update call status in database, send real-time notifications,
    // update UI dashboards, trigger workflows based on status changes, etc.

    return {
      ok: true,
      message: 'Status update processed',
    };
  }

  private handleMetadata(message: any): WebhookResponse {
    Logger.info('Metadata received', {
      callId: message.call?.id,
      timestamp: message.timestamp,
      source: message.source,
      category: message.category,
      metadataKeys: Object.keys(message.metadata || {}),
      metadata: message.metadata,
    });

    // You can add custom logic here to process metadata
    // For example: save metadata to database, trigger analytics,
    // update call context, enrich customer profiles, etc.

    return {
      ok: true,
      message: 'Metadata processed',
    };
  }

  private async handleGhlTool(message: any): Promise<WebhookResponse> {
    Logger.info('GHL Tool request received', {
      callId: message.call?.id,
      timestamp: message.timestamp,
      toolName: message.tool?.name,
      toolAction: message.tool?.action,
      parameters: message.tool?.parameters,
      metadata: message.metadata,
    });

    try {
      // Dispatch to appropriate GHL connector method based on tool name
      const result = await this.dispatchGhlTool(message.tool, message.call?.id);
      
      return {
        ok: true,
        message: 'GHL tool executed successfully',
        results: [result],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error('Error executing GHL tool', {
        toolName: message.tool?.name,
        error: errorMessage,
        callId: message.call?.id,
      });
      
      return {
        ok: false,
        message: 'GHL tool execution failed',
        results: [{
          id: message.call?.id || 'unknown',
          ok: false,
          error: errorMessage,
        }],
      };
    }
  }

  private async dispatchGhlTool(tool: any, callId?: string): Promise<any> {
    const { name, parameters = {}, action } = tool;
    const id = callId || `ghl_tool_${Date.now()}`;
    
    Logger.info('Dispatching GHL tool', { id, name, action, parameters });

    switch (name) {
      case 'send_sms':
        return await this.handleSendSms(id, parameters);
      
      case 'upsert_contact':
        return await this.handleUpsertContact(id, parameters);
      
      case 'add_tag':
        return await this.handleAddTag(id, parameters);
      
      case 'add_note':
        return await this.handleAddNote(id, parameters);
      
      case 'update_stage':
        return await this.handleUpdateStage(id, parameters);
      
      // Add more GHL-specific tools here
      case 'create_opportunity':
        return await this.handleCreateOpportunity(id, parameters);
      
      case 'update_contact':
        return await this.handleUpdateContact(id, parameters);
      
      case 'send_email':
        return await this.handleSendEmail(id, parameters);
      
      default:
        Logger.warn('Unknown GHL tool', { id, name });
        return {
          id,
          ok: false,
          error: `Unknown GHL tool: ${name}`,
        };
    }
  }

  // Placeholder methods for additional GHL tools - implement as needed
  private async handleCreateOpportunity(id: string, args: any): Promise<any> {
    Logger.info('Creating opportunity (placeholder)', { id, args });
    // TODO: Implement opportunity creation logic
    return {
      id,
      ok: true,
      data: { message: 'Opportunity creation not implemented yet' },
    };
  }

  private async handleUpdateContact(id: string, args: any): Promise<any> {
    Logger.info('Updating contact (placeholder)', { id, args });
    // TODO: Implement contact update logic (different from upsert)
    return {
      id,
      ok: true,
      data: { message: 'Contact update not implemented yet' },
    };
  }

  private async handleSendEmail(id: string, args: any): Promise<any> {
    Logger.info('Sending email (placeholder)', { id, args });
    // TODO: Implement email sending logic
    return {
      id,
      ok: true,
      data: { message: 'Email sending not implemented yet' },
    };
  }

  // New methods for call metadata polling - added without breaking existing functionality
  public async pullCallMetadata(callId: string): Promise<any> {
    try {
      Logger.info('[METADATA_PULL] Initiating call metadata pull', { callId });
      
      const result = await this.vapiApiClient.getCallMetadata(callId);
      
      Logger.info('[METADATA_PULL] Call metadata pull completed', {
        callId,
        hasGhlMetadata: !!result.ghlMetadata,
        metadataKeys: result.metadata ? Object.keys(result.metadata) : [],
      });
      
      return result;
    } catch (error) {
      Logger.error('[METADATA_PULL] Call metadata pull failed', {
        callId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async pullAndProcessGhlMetadata(callId: string): Promise<any> {
    try {
      Logger.info('[GHL_METADATA_PULL] Starting GHL metadata processing', { callId });
      
      const metadataResult = await this.pullCallMetadata(callId);
      const ghlMetadata = metadataResult.ghlMetadata;
      
      if (!ghlMetadata) {
        Logger.warn('[GHL_METADATA_PULL] No GHL metadata found', { callId });
        return {
          callId,
          success: false,
          reason: 'No GHL metadata found',
          metadata: metadataResult.metadata,
        };
      }
      
      Logger.info('[GHL_METADATA_PULL] GHL metadata found, processing', {
        callId,
        ghlKeys: Object.keys(ghlMetadata),
        ghlMetadata: ghlMetadata,
        contactId: ghlMetadata.contactId,
        source: ghlMetadata.source,
      });
      
      // Process the GHL metadata - you can add custom logic here
      const processedResult = await this.processGhlMetadata(callId, ghlMetadata);
      
      return {
        callId,
        success: true,
        ghlMetadata,
        processedResult,
        fullMetadata: metadataResult.metadata,
      };
    } catch (error) {
      Logger.error('[GHL_METADATA_PULL] GHL metadata processing failed', {
        callId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async processGhlMetadata(callId: string, ghlMetadata: any): Promise<any> {
    try {
      Logger.info('[GHL_METADATA_PROCESS] Processing GHL metadata', {
        callId,
        metadataKeys: Object.keys(ghlMetadata),
        fullGhlMetadata: ghlMetadata,
        contactId: ghlMetadata.contactId,
        source: ghlMetadata.source,
      });
      
      // Add your custom GHL metadata processing logic here
      // For example: trigger GHL actions based on metadata
      
      const results = [];
      
      // Example: If there's contact info in metadata, upsert it
      if (ghlMetadata.contact) {
        Logger.info('[GHL_METADATA_PROCESS] Found contact data in metadata', {
          callId,
          contactInfo: ghlMetadata.contact,
        });
        
        try {
          const contactResult = await this.ghlConnector.upsertContact(
            `metadata_${callId}_contact`,
            ghlMetadata.contact
          );
          results.push({
            action: 'upsert_contact',
            result: contactResult,
          });
        } catch (error) {
          Logger.error('[GHL_METADATA_PROCESS] Contact upsert failed', {
            callId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      // Example: If there are tags in metadata, add them
      if (ghlMetadata.tags && Array.isArray(ghlMetadata.tags)) {
        Logger.info('[GHL_METADATA_PROCESS] Found tags in metadata', {
          callId,
          tags: ghlMetadata.tags,
        });
        
        for (const tag of ghlMetadata.tags) {
          try {
            const tagResult = await this.ghlConnector.addTag(
              `metadata_${callId}_tag_${tag}`,
              {
                tag,
                phone: ghlMetadata.contact?.phone,
                email: ghlMetadata.contact?.email,
              }
            );
            results.push({
              action: 'add_tag',
              tag,
              result: tagResult,
            });
          } catch (error) {
            Logger.error('[GHL_METADATA_PROCESS] Tag addition failed', {
              callId,
              tag,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
      
      // Log the specific contactId if it exists and trigger final note with summary
      if (ghlMetadata.contactId) {
        Logger.info('[GHL_METADATA_PROCESS] Contact ID found in metadata', {
          callId,
          contactId: ghlMetadata.contactId,
          canProcessWithGHL: true,
        });
        
        // Trigger final summary note (only once per call)
        this.sendFinalSummaryNote(callId, {
          contactId: ghlMetadata.contactId,
          metadata: ghlMetadata,
        });
      }
      
      Logger.info('[GHL_METADATA_PROCESS] GHL metadata processing completed', {
        callId,
        resultsCount: results.length,
        contactId: ghlMetadata.contactId,
      });
      
      return {
        processed: true,
        actions: results,
        originalMetadata: ghlMetadata,
        extractedContactId: ghlMetadata.contactId,
      };
    } catch (error) {
      Logger.error('[GHL_METADATA_PROCESS] Failed to process GHL metadata', {
        callId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async scheduleMetadataPull(callId: string, delays: number[] = [30000, 60000, 120000]): Promise<void> {
    Logger.info('[METADATA_SCHEDULE] Scheduling metadata pulls', {
      callId,
      delays,
      attemptsCount: delays.length,
    });
    
    delays.forEach((delay, index) => {
      setTimeout(async () => {
        try {
          Logger.info('[METADATA_SCHEDULE] Executing scheduled metadata pull', {
            callId,
            attempt: index + 1,
            delay,
          });
          
          await this.pullAndProcessGhlMetadata(callId);
          
          Logger.info('[METADATA_SCHEDULE] Scheduled metadata pull completed', {
            callId,
            attempt: index + 1,
          });
        } catch (error) {
          Logger.error('[METADATA_SCHEDULE] Scheduled metadata pull failed', {
            callId,
            attempt: index + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }, delay);
    });
  }

  // New method to send final summary note (only once per call)
  private sendFinalSummaryNote(callId: string, data: {
    contactId: string;
    metadata?: any;
  }): void {
    // Check if we already sent a note for this call
    if (this.sentNotes.has(callId)) {
      Logger.info('[FINAL_SUMMARY] Note already sent for this call, skipping', { callId });
      return;
    }

    // Mark this call as having a note sent
    this.sentNotes.add(callId);

    // Wait 10 seconds to collect all data, then send summary
    setTimeout(async () => {
      try {
        Logger.info('[FINAL_SUMMARY] Sending final summary note', {
          callId,
          contactId: data.contactId,
        });

        // Try to get additional data
        let finalData = { ...data };
        
        try {
          const metadataResult = await this.pullCallMetadata(callId);
          if (metadataResult.ghlMetadata) {
            finalData.metadata = finalData.metadata || metadataResult.ghlMetadata;
          }
        } catch (error) {
          Logger.warn('[FINAL_SUMMARY] Could not fetch additional metadata', {
            callId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        // Create summary note content with the actual summary from end-of-call-report
        const timestamp = new Date().toISOString();
        const storedSummary = this.callSummaries.get(callId);
        
        const summaryContent = [
          `📞 CALL COMPLETED`,
          `Call ID: ${callId}`,
          `Timestamp: ${timestamp}`,
          ``,
          `📊 SUMMARY:`,
          `• Call processed successfully`,
          storedSummary ? `• ${storedSummary}` : `• There is no summary available from the call analysis`
        ].join('\n');

        // Send the summary note to GHL
        const ghlResult = await this.ghlConnector.addNoteByContactIdViaAPI(
          `summary_${callId}`,
          data.contactId,
          summaryContent
        );

        if (ghlResult.ok) {
          Logger.info('[FINAL_SUMMARY] Summary note sent to GHL successfully', {
            callId,
            contactId: data.contactId,
            noteId: ghlResult.data?.note?.id,
          });
        } else {
          Logger.error('[FINAL_SUMMARY] Failed to send summary note to GHL', {
            callId,
            contactId: data.contactId,
            error: ghlResult.error,
          });
        }

      } catch (error) {
        Logger.error('[FINAL_SUMMARY] Error sending summary note', {
          callId,
          contactId: data.contactId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, 10000); // Wait 10 seconds to collect all data
  }

  /**
   * Uploads a recording to Slack with context information
   */
  private async uploadRecordingToSlack(
    recordingUrl: string,
    callId: string,
    context?: {
      duration?: number;
      cost?: number;
      summary?: string;
      sentiment?: string;
    }
  ): Promise<void> {
    if (!this.slackService) {
      Logger.warn('[SLACK_UPLOAD] Slack service not available', { callId });
      return;
    }

    try {
      Logger.info('[SLACK_UPLOAD] Starting recording upload to Slack', {
        callId,
        recordingUrl,
        hasContext: !!context,
      });

      await this.slackService.uploadRecordingWithContext(
        recordingUrl,
        callId,
        context
      );

      Logger.info('[SLACK_UPLOAD] Recording uploaded successfully to Slack', {
        callId,
      });

    } catch (error) {
      Logger.error('[SLACK_UPLOAD] Failed to upload recording to Slack', {
        callId,
        recordingUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Test Slack connection
   */
  async testSlackConnection(): Promise<boolean> {
    if (!this.slackService) {
      Logger.warn('[SLACK_TEST] Slack service not available');
      return false;
    }

    try {
      return await this.slackService.testConnection();
    } catch (error) {
      Logger.error('[SLACK_TEST] Connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

}