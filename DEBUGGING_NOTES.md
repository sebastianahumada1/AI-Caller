# Debugging: Notes Not Sent to Premier Wellness

## Issue
Notes are being sent to West Texas but not to Premier Wellness.

## Possible Causes

### 1. Assistant ID Not Being Sent
**Check:** Is VAPI sending the `assistantId` in the webhook?

**How to verify:**
Look for this in the logs:
```
[WEBHOOK] Processing message for assistant { 
  type: 'end-of-call-report', 
  assistantId: '053cd610-596c-4632-a90b-a1e398712178' 
}
```

**If missing:** The webhook from VAPI doesn't include `assistantId`

### 2. Wrong Assistant ID
**Check:** Is the correct Assistant ID being sent?

**Expected IDs:**
- Premier Wellness: `053cd610-596c-4632-a90b-a1e398712178`
- West Texas: `09c07269-4462-4469-96ac-c4eb06146571`

**How to verify:**
```
[END_OF_CALL] Assistant ID set for GHL operations { 
  assistantId: '053cd610-596c-4632-a90b-a1e398712178',
  callId: 'xxx' 
}
```

### 3. API Key Not Working
**Check:** Is the Premier Wellness API key valid?

**How to verify:**
Look for errors like:
```
[GHL] GHL_API_KEY not configured for this client
[GHL] Failed to add note to GHL contact via API
```

### 4. Contact ID Missing
**Check:** Is the `contactId` being extracted correctly?

**How to verify:**
```
[GHL_METADATA_PROCESS] Processing GHL metadata { 
  callId: 'xxx',
  assistantId: '053cd610-596c-4632-a90b-a1e398712178',
  contactId: 'xxx' 
}
```

## Debugging Steps

### Step 1: Check Logs for Assistant ID
```bash
# Search for Premier Wellness assistant ID in logs
grep "053cd610-596c-4632-a90b-a1e398712178" logs/*

# Or check current logs
tail -f logs/* | grep "053cd610"
```

### Step 2: Verify API Key Selection
Look for:
```
[GHL_CONNECTOR] Using client-specific API key { 
  assistantId: '053cd610-596c-4632-a90b-a1e398712178',
  clientName: 'Premier Wellness' 
}
```

### Step 3: Check for Errors
```bash
# Look for errors specific to Premier Wellness
grep "Premier Wellness" logs/* | grep ERROR

# Or check for API key errors
grep "GHL_API_KEY not configured" logs/*
```

### Step 4: Compare Working vs Non-Working Calls

**West Texas (Working):**
```
[WEBHOOK] Processing message for assistant { assistantId: '09c07269...' }
[GHL_CONNECTOR] Using client-specific API key { clientName: 'West Texas' }
[GHL] Note added to GHL contact successfully
```

**Premier Wellness (Not Working):**
```
[WEBHOOK] Processing message for assistant { assistantId: ??? }
[GHL_CONNECTOR] ??? 
[GHL] ???
```

## Quick Test

### Test Premier Wellness Manually

```bash
# Test if the API key works
curl -X POST "http://localhost:3000/vapi/webhook?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "type": "tool-calls",
      "call": {
        "assistantId": "053cd610-596c-4632-a90b-a1e398712178"
      },
      "toolCallList": [{
        "id": "test_premier_1",
        "name": "add_note",
        "arguments": {
          "phone": "+1234567890",
          "note": "Test note for Premier Wellness"
        }
      }]
    }
  }'
```

Check logs for:
```
[GHL_CONNECTOR] Using client-specific API key { clientName: 'Premier Wellness' }
```

## Solutions

### Solution 1: If Assistant ID is Missing
VAPI might not be sending the `assistantId` in the webhook. You need to:
1. Check VAPI configuration
2. Ensure assistant ID is included in webhook payload
3. Or manually map based on other fields (phone number, metadata, etc.)

### Solution 2: If API Key is Invalid
```typescript
// Test the API key directly
const testKey = 'pit-ea7a24ba-ead3-4076-9afa-e0672c56d0f7';
// Make a test API call to GHL
```

### Solution 3: If Contact ID is Missing
The metadata might not include `contactId` for Premier Wellness calls.

Check:
```
[GHL_METADATA_PROCESS] Processing GHL metadata { 
  contactId: ??? 
}
```

### Solution 4: Fallback to Phone-Based Mapping
If assistant ID is not available, you can map by phone number:

```typescript
// In client-config.ts
static getConfigByPhone(phone: string): ClientConfig | null {
  // Map phone prefixes to clients
  if (phone.startsWith('+1234')) return this.getConfigByAssistantId('premier-id');
  if (phone.startsWith('+5678')) return this.getConfigByAssistantId('west-texas-id');
  return null;
}
```

## Monitoring Commands

```bash
# Watch logs in real-time
tail -f logs/* | grep -E "(Premier|West Texas|assistantId)"

# Check last 100 lines for assistant IDs
tail -100 logs/* | grep "assistantId"

# Count successful notes per client
grep "Note added to GHL contact successfully" logs/* | wc -l
```

## Expected Log Flow (Successful)

```
1. [WEBHOOK] Processing message for assistant { assistantId: '053cd610...' }
2. [END_OF_CALL] Assistant ID set for GHL operations { assistantId: '053cd610...' }
3. [GHL_CONNECTOR] Using client-specific API key { clientName: 'Premier Wellness' }
4. [GHL] Processing add_note_by_contact_id_via_api { contactId: 'xxx' }
5. [GHL] Note added to GHL contact successfully via API
```

If any step is missing, that's where the problem is.

