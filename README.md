# Vapi ↔ GHL Connector

A production-ready Node.js TypeScript server that receives Vapi webhooks and forwards structured events to GoHighLevel (GHL) via Incoming Webhook workflows.

## Features

- 🔒 **Secure webhook validation** with token-based authentication
- 🏗️ **Structured tool dispatching** for Vapi tool calls
- 📡 **GHL Incoming Webhook integration** with template-based routing
- ✅ **Robust input validation** using Zod schemas
- 📝 **Comprehensive logging** with structured output
- 🌐 **CORS support** with configurable origins
- 🔧 **Health check endpoint** for monitoring
- 📊 **Request/response tracking** with timing metrics

## Architecture

```
┌─────────────┐    POST /vapi/webhook    ┌─────────────┐
│    Vapi     │ ────────────────────────► │   Server    │
│  Webhooks   │    ?token=WEBHOOK_TOKEN   │             │
└─────────────┘                          └─────────────┘
                                                │
                                                │ Tool Call
                                                │ Dispatch
                                                ▼
┌─────────────┐    Incoming Webhooks     ┌─────────────┐
│    GHL      │ ◄──────────────────────── │ GHL Connector│
│ Workflows   │                          │             │
└─────────────┘                          └─────────────┘
```

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. ngrok Setup (Recommended for Development)

Install ngrok if you haven't already:
```bash
# Using npm
npm install -g ngrok

# Or download from https://ngrok.com/download
```

### 3. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Webhook Security
WEBHOOK_TOKEN=your_secure_webhook_token_here

# CORS Configuration
CORS_ORIGIN=*

# GHL Incoming Webhook URLs
GHL_INCOMING_WEBHOOK_URL_DEFAULT=https://services.leadconnectorhq.com/hooks/your_default_webhook_id
GHL_INCOMING_WEBHOOK_URL_BOOKING=https://services.leadconnectorhq.com/hooks/your_booking_webhook_id
GHL_INCOMING_WEBHOOK_URL_DEPOSIT=https://services.leadconnectorhq.com/hooks/your_deposit_webhook_id
```

### 4. Start the Development Server

**Option A: Manual setup (two terminals)**

Terminal 1 - Start server:
```bash
npm run dev
```

Terminal 2 - Start ngrok:
```bash
ngrok http 3000
```

**Option B: Automated setup (one command)**

```bash
npm run dev:ngrok
```

This will start both the server and ngrok automatically, and display your webhook URL.

### 5. ngrok Configuration

**For manual setup, you'll see output like:**
```
Session Status                online
Account                       your-account (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

**Your webhook URL will be:** `https://abc123.ngrok.io/vapi/webhook?token=YOUR_TOKEN`

**Advanced ngrok options:**
```bash
# Custom subdomain (requires ngrok account)
ngrok http 3000 --subdomain=your-custom-name

# With authentication token (for persistent URLs)
ngrok config add-authtoken YOUR_NGROK_TOKEN
ngrok http 3000

# Regional endpoint
ngrok http 3000 --region=eu
```

### 6. Configure Vapi

In your Vapi assistant configuration, set the webhook URL to:
```
https://your-ngrok-url.ngrok.io/vapi/webhook?token=YOUR_WEBHOOK_TOKEN
```

### 7. Production Build

```bash
npm run build
npm start
```

## API Endpoints

### POST /vapi/webhook

Main webhook endpoint for receiving Vapi events.

**Query Parameters:**
- `token` (required): Webhook authentication token

**Request Headers:**
```
Content-Type: application/json
```

**Supported Message Types:**

#### 1. Tool Calls

```json
{
  "message": {
    "type": "tool-calls",
    "toolCallList": [
      {
        "id": "call_123",
        "name": "send_sms",
        "arguments": {
          "phone": "+1234567890",
          "firstName": "John",
          "template": "booking",
          "callId": "vapi_call_456",
          "body": "Your booking is confirmed for tomorrow at 2 PM."
        }
      }
    ]
  }
}
```

#### 2. Call Ended

```json
{
  "message": {
    "type": "call.ended",
    "endedReason": "user-hangup",
    "call": {
      "id": "vapi_call_456"
    }
  }
}
```

### GET /health

Health check endpoint returning server status and configuration.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development",
  "checks": {
    "webhookToken": true,
    "defaultWebhook": true,
    "bookingWebhook": true,
    "depositWebhook": false
  }
}
```

## Supported Tools

### 1. send_sms

Sends SMS messages via GHL workflows with template-based routing.

**Arguments:**
```typescript
{
  phone: string;           // Required: Phone number
  firstName?: string;      // Optional: First name
  template?: "booking" | "deposit";  // Optional: Template type
  callId?: string;         // Optional: Call ID
  body: string;            // Required: SMS content
}
```

**Webhook Selection:**
- `template: "booking"` → Uses `GHL_INCOMING_WEBHOOK_URL_BOOKING`
- `template: "deposit"` → Uses `GHL_INCOMING_WEBHOOK_URL_DEPOSIT`
- Default → Uses `GHL_INCOMING_WEBHOOK_URL_DEFAULT`

### 2. upsert_contact

Creates or updates contacts in GHL.

**Arguments:**
```typescript
{
  phone?: string;          // Phone or email required
  email?: string;          // Phone or email required
  firstName?: string;
  lastName?: string;
  name?: string;
}
```

### 3. add_tag

Adds tags to contacts in GHL.

**Arguments:**
```typescript
{
  phone?: string;          // Phone or email required
  email?: string;          // Phone or email required
  tag: string;             // Required: Tag name
}
```

### 4. add_note

Adds notes to contacts in GHL.

**Arguments:**
```typescript
{
  phone?: string;          // Phone or email required
  email?: string;          // Phone or email required
  note: string;            // Required: Note content
}
```

### 5. update_stage

Updates opportunity stages in GHL.

**Arguments:**
```typescript
{
  phone?: string;          // Phone or email required
  email?: string;          // Phone or email required
  pipelineId: string;      // Required: Pipeline ID
  stageId: string;         // Required: Stage ID
  note?: string;           // Optional: Update note
}
```

## GHL Workflow Setup

For each tool, create a GHL Workflow with an "Incoming Webhook" trigger:

### 1. SMS Workflows

**Booking Template Workflow:**
1. Create new Workflow in GHL
2. Add "Incoming Webhook" trigger
3. Copy webhook URL to `GHL_INCOMING_WEBHOOK_URL_BOOKING`
4. Add "Send SMS" action using webhook data:
   - To: `{{phone}}`
   - Message: Use `{{body}}` or customize with `{{firstName}}`

**Deposit Template Workflow:**
1. Similar to booking, but use `GHL_INCOMING_WEBHOOK_URL_DEPOSIT`
2. Customize message template for deposit scenarios

### 2. Contact Management Workflow

**Default Webhook Workflow:**
1. Create workflow with "Incoming Webhook" trigger
2. Add conditional actions based on `{{action}}` field:
   - `upsert_contact`: Create/Update Contact action
   - `add_tag`: Add Tag action
   - `add_note`: Add Note action
   - `update_stage`: Update Opportunity Stage action

**Example Workflow Logic:**
```
IF {{action}} = "upsert_contact"
  → Create/Update Contact: {{phone}}, {{email}}, {{firstName}}, {{lastName}}

IF {{action}} = "add_tag"
  → Find Contact: {{phone}} OR {{email}}
  → Add Tag: {{tag}}

IF {{action}} = "add_note"
  → Find Contact: {{phone}} OR {{email}}
  → Add Note: {{note}}

IF {{action}} = "update_stage"
  → Find Contact: {{phone}} OR {{email}}
  → Update Opportunity: Pipeline {{pipelineId}}, Stage {{stageId}}
```

## Postman Testing

### Collection Setup

1. Create new Postman collection: "Vapi GHL Connector"
2. Add collection variable: `base_url` = `https://your-ngrok-url.ngrok.io` (or `http://localhost:3000` for direct testing)
3. Add collection variable: `webhook_token` = your token from `.env`

> **Note:** When using ngrok, replace `http://localhost:3000` with your ngrok URL (e.g., `https://abc123.ngrok.io`) in all test requests.

### Test 1: Health Check

```
GET {{base_url}}/health
```

**Expected Response:** `200 OK` with server status

### Test 2: Tool Calls - Send SMS

```
POST {{base_url}}/vapi/webhook?token={{webhook_token}}
Content-Type: application/json

{
  "message": {
    "type": "tool-calls",
    "toolCallList": [
      {
        "id": "test_sms_001",
        "name": "send_sms",
        "arguments": {
          "phone": "+1234567890",
          "firstName": "John",
          "template": "booking",
          "callId": "vapi_test_call",
          "body": "Hello John, your appointment is confirmed for tomorrow at 2:00 PM. Please reply CONFIRM to acknowledge."
        }
      }
    ]
  }
}
```

**Expected Response:**
```json
{
  "ok": true,
  "results": [
    {
      "id": "test_sms_001",
      "ok": true,
      "data": { /* GHL webhook response */ }
    }
  ],
  "message": "All tool calls processed successfully"
}
```

### Test 3: Tool Calls - Multiple Tools

```
POST {{base_url}}/vapi/webhook?token={{webhook_token}}
Content-Type: application/json

{
  "message": {
    "type": "tool-calls",
    "toolCallList": [
      {
        "id": "test_contact_001",
        "name": "upsert_contact",
        "arguments": {
          "phone": "+1234567890",
          "email": "john.doe@example.com",
          "firstName": "John",
          "lastName": "Doe"
        }
      },
      {
        "id": "test_tag_001",
        "name": "add_tag",
        "arguments": {
          "phone": "+1234567890",
          "tag": "vapi-lead"
        }
      },
      {
        "id": "test_note_001",
        "name": "add_note",
        "arguments": {
          "phone": "+1234567890",
          "note": "Contact created via Vapi call on " + new Date().toISOString()
        }
      }
    ]
  }
}
```

### Test 4: Call Ended Event

```
POST {{base_url}}/vapi/webhook?token={{webhook_token}}
Content-Type: application/json

{
  "message": {
    "type": "call.ended",
    "endedReason": "user-hangup",
    "call": {
      "id": "vapi_test_call_123"
    }
  }
}
```

**Expected Response:**
```json
{
  "ok": true,
  "message": "Call ended event processed"
}
```

### Test 5: Invalid Token

```
POST {{base_url}}/vapi/webhook?token=invalid_token
Content-Type: application/json

{
  "message": {
    "type": "call.ended",
    "call": { "id": "test" }
  }
}
```

**Expected Response:** `401 Unauthorized`

### Test 6: Invalid Payload

```
POST {{base_url}}/vapi/webhook?token={{webhook_token}}
Content-Type: application/json

{
  "invalid": "payload"
}
```

**Expected Response:** `400 Bad Request` with validation errors

## Error Handling

The server provides detailed error responses for debugging:

### Validation Errors
```json
{
  "ok": false,
  "message": "Invalid request body",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "object",
      "received": "undefined",
      "path": ["message"],
      "message": "Required"
    }
  ]
}
```

### Tool Execution Errors
```json
{
  "ok": false,
  "results": [
    {
      "id": "tool_call_123",
      "ok": false,
      "error": "No webhook URL configured for template: booking"
    }
  ],
  "message": "Some tool calls failed"
}
```

## Monitoring

### Logging

All requests and operations are logged with structured data:

```
[2024-01-15T10:30:00.000Z] INFO: HTTP Request {"method":"POST","url":"/vapi/webhook?token=***","statusCode":200,"duration":"45ms"}
[2024-01-15T10:30:00.001Z] INFO: Received Vapi webhook {"method":"POST","url":"/vapi/webhook?token=***","contentType":"application/json"}
[2024-01-15T10:30:00.002Z] INFO: Processing tool calls {"count":1}
[2024-01-15T10:30:00.003Z] INFO: Dispatching tool call {"id":"test_001","name":"send_sms"}
[2024-01-15T10:30:00.050Z] INFO: SMS webhook sent successfully {"id":"test_001"}
```

### Health Monitoring

Use the `/health` endpoint for uptime monitoring. The endpoint returns:
- Server status
- Configuration validation
- Environment information
- Uptime metrics

## Production Deployment

### Environment Variables

Ensure all production environment variables are set:

```bash
export NODE_ENV=production
export PORT=3000
export WEBHOOK_TOKEN="your-secure-production-token"
export CORS_ORIGIN="https://your-vapi-domain.com"
export GHL_INCOMING_WEBHOOK_URL_DEFAULT="https://services.leadconnectorhq.com/hooks/your_webhook_id"
# ... other webhook URLs
```

### Security Considerations

1. **Use HTTPS in production** - Deploy behind a reverse proxy with SSL
2. **Secure webhook tokens** - Use long, random tokens (32+ characters)
3. **Restrict CORS origins** - Set specific domains instead of `*`
4. **Rate limiting** - Consider adding rate limiting middleware
5. **Request size limits** - Current limit is 10MB, adjust as needed

### Process Management

Use a process manager like PM2 for production deployment:

```bash
npm install -g pm2
pm2 start dist/server.js --name vapi-ghl-connector
pm2 startup
pm2 save
```

## ngrok Development Workflow

### Quick Start with ngrok

1. **Terminal 1 - Start the server:**
   ```bash
   npm run dev
   ```

2. **Terminal 2 - Start ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Copy the ngrok URL** from the output (e.g., `https://abc123.ngrok.io`)

4. **Update Vapi webhook URL** to: `https://abc123.ngrok.io/vapi/webhook?token=YOUR_TOKEN`

5. **Test the connection** by visiting: `https://abc123.ngrok.io/health`

### ngrok Web Interface

ngrok provides a web interface at `http://localhost:4040` where you can:
- View all incoming requests in real-time
- Inspect request/response details
- Replay requests for debugging
- Monitor webhook traffic from Vapi

### ngrok Tips

- **Persistent URLs**: Sign up for ngrok account to get consistent URLs
- **Custom subdomains**: Use `--subdomain` flag for branded URLs
- **Request inspection**: Use the web interface to debug webhook payloads
- **HTTPS by default**: ngrok URLs are always HTTPS, perfect for webhook security

## Troubleshooting

### ngrok Issues

1. **ngrok tunnel not accessible**
   - Check if ngrok process is running
   - Verify the forwarding URL is correct
   - Ensure local server is running on the specified port

2. **Webhook timeouts**
   - Check ngrok web interface for request details
   - Verify server logs for processing times
   - Consider ngrok's free tier limits

3. **SSL/HTTPS errors**
   - ngrok provides HTTPS by default
   - Update CORS settings if needed
   - Check certificate validation in client

### Common Issues

1. **401 Unauthorized**
   - Check `WEBHOOK_TOKEN` environment variable
   - Verify token in query parameter matches

2. **Webhook not reaching GHL**
   - Verify webhook URLs in environment variables
   - Check GHL workflow trigger configuration
   - Review server logs for HTTP errors

3. **Tool validation errors**
   - Check tool argument schemas in code
   - Ensure required fields are provided
   - Review Zod validation error messages

### Debug Mode

Set `NODE_ENV=development` to enable debug logging:

```bash
NODE_ENV=development npm run dev
```

## File Structure

```
vapi-ghl-connector/
├── src/
│   ├── server.ts              # Express server setup
│   ├── vapi.ts                # Vapi webhook handler
│   ├── ghl.ts                 # GHL connector
│   ├── schemas.ts             # Zod validation schemas
│   └── utils/
│       ├── logger.ts          # Logging utilities
│       └── http.ts            # HTTP client
├── dist/                      # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── env.example
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
