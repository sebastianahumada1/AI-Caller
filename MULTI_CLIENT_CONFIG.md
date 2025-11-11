# Multi-Client Configuration

This document explains how the system automatically selects the correct GHL API key based on the VAPI Assistant ID.

## Overview

The system now supports multiple clients, each with their own:
- VAPI Assistant ID
- GHL API Key
- Optional Slack Channel (for client-specific notifications)

## Configured Clients

### 1. Premier Wellness
- **Assistant ID**: `053cd610-596c-4632-a90b-a1e398712178`
- **GHL API Key**: `pit-ea7a24ba-ead3-4076-9afa-e0672c56d0f7`
- **Slack Channel**: Configurable via `SLACK_CHANNEL_ID_PREMIER_WELLNESS`

### 2. West Texas
- **Assistant ID**: `09c07269-4462-4469-96ac-c4eb06146571`
- **GHL API Key**: `pit-71098f8f-4b2d-46fb-a5a6-c55cca460ecb`
- **Slack Channel**: Configurable via `SLACK_CHANNEL_ID_WEST_TEXAS`

## How It Works

### 1. Automatic Detection
When a webhook arrives from VAPI, the system:
1. Extracts the `assistantId` from the webhook payload
2. Looks up the corresponding client configuration
3. Uses the client-specific GHL API key for all operations

### 2. Configuration File
All client configurations are managed in `src/utils/client-config.ts`:

```typescript
// Premier Wellness Configuration
this.configs.set('053cd610-596c-4632-a90b-a1e398712178', {
  name: 'Premier Wellness',
  assistantId: '053cd610-596c-4632-a90b-a1e398712178',
  ghlApiKey: 'pit-ea7a24ba-ead3-4076-9afa-e0672c56d0f7',
});

// West Texas Configuration
this.configs.set('09c07269-4462-4469-96ac-c4eb06146571', {
  name: 'West Texas',
  assistantId: '09c07269-4462-4469-96ac-c4eb06146571',
  ghlApiKey: 'pit-71098f8f-4b2d-46fb-a5a6-c55cca460ecb',
});
```

### 3. Logging
The system logs which client is being processed:

```
[WEBHOOK] Processing message for assistant { 
  type: 'tool-calls', 
  assistantId: '053cd610-596c-4632-a90b-a1e398712178' 
}
[GHL_CONNECTOR] Using client-specific API key { 
  assistantId: '053cd610-596c-4632-a90b-a1e398712178',
  clientName: 'Premier Wellness' 
}
```

## Adding New Clients

To add a new client, edit `src/utils/client-config.ts`:

```typescript
static initialize(): void {
  // ... existing clients ...

  // New Client Configuration
  const newClientConfig: ClientConfig = {
    name: 'New Client Name',
    assistantId: 'new-assistant-id-here',
    ghlApiKey: 'pit-new-api-key-here',
  };
  if (process.env.SLACK_CHANNEL_ID_NEW_CLIENT) {
    newClientConfig.slackChannelId = process.env.SLACK_CHANNEL_ID_NEW_CLIENT;
  }
  this.configs.set('new-assistant-id-here', newClientConfig);
}
```

Then rebuild the project:
```bash
npm run build
npm start
```

## Environment Variables

### Required
- `GHL_API_KEY` - Default/fallback API key (used if no assistant ID match)

### Optional (Client-Specific Slack Channels)
- `SLACK_CHANNEL_ID_PREMIER_WELLNESS` - Slack channel for Premier Wellness
- `SLACK_CHANNEL_ID_WEST_TEXAS` - Slack channel for West Texas

Add these to your `.env` file:

```bash
# Optional: Client-specific Slack channels
SLACK_CHANNEL_ID_PREMIER_WELLNESS=C09J96WA942
SLACK_CHANNEL_ID_WEST_TEXAS=C09J96WA942
```

## Fallback Behavior

If the system receives a webhook with an unknown `assistantId`:
1. A warning is logged
2. The default `GHL_API_KEY` from environment variables is used
3. Operations continue normally

## Benefits

✅ **No Manual Switching**: API keys are selected automatically
✅ **Scalable**: Easy to add new clients
✅ **Traceable**: All operations are logged with client names
✅ **Flexible**: Each client can have their own Slack channel
✅ **Safe**: Falls back to default configuration if needed

## Testing

To test with a specific client:

1. Make a call using the VAPI assistant for that client
2. Check the logs for:
   ```
   [WEBHOOK] Processing message for assistant
   [GHL_CONNECTOR] Using client-specific API key
   ```
3. Verify the correct GHL API key is being used

## Architecture

```
VAPI Webhook
    ↓
Extract assistantId
    ↓
ClientConfigManager.getConfigByAssistantId()
    ↓
GHLConnector.setAssistantId()
    ↓
GHLConnector.getGHLApiKey() ← Returns client-specific key
    ↓
GHL API Calls with correct key
```

## Security Notes

- API keys are hardcoded in `client-config.ts` for simplicity
- For production, consider using environment variables per client
- Keep `client-config.ts` out of public repositories if it contains sensitive keys
- Consider using a secrets manager for production deployments

