#!/usr/bin/env node

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN;

console.log('🧪 Testing Slack Integration for VAPI-GHL Connector\n');

// Test 1: Health Check with Slack Status
async function testHealthCheck() {
  console.log('1️⃣ Testing health check endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    console.log('✅ Health check response:', {
      status: data.status,
      slackBotToken: data.checks.slackBotToken,
      slackChannelId: data.checks.slackChannelId,
      slackIntegration: data.features.slackIntegration,
    });
    
    if (!data.checks.slackBotToken) {
      console.log('⚠️  SLACK_BOT_TOKEN not configured');
    }
    if (!data.checks.slackChannelId) {
      console.log('⚠️  SLACK_CHANNEL_ID not configured');
    }
    if (!data.features.slackIntegration) {
      console.log('❌ Slack integration is disabled');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

// Test 2: Slack Connection Test
async function testSlackConnection() {
  console.log('\n2️⃣ Testing Slack connection...');
  
  if (!WEBHOOK_TOKEN) {
    console.log('❌ WEBHOOK_TOKEN not configured');
    return false;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/slack/test?token=${WEBHOOK_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (data.connected) {
      console.log('✅ Slack connection successful');
      return true;
    } else {
      console.log('❌ Slack connection failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Slack connection test failed:', error.message);
    return false;
  }
}

// Test 3: Simulate End-of-Call Report with Recording
async function testEndOfCallReportWithRecording() {
  console.log('\n3️⃣ Testing end-of-call-report with recording URL...');
  
  if (!WEBHOOK_TOKEN) {
    console.log('❌ WEBHOOK_TOKEN not configured');
    return false;
  }
  
  // Create a test audio file URL (you can replace this with a real recording URL)
  const testRecordingUrl = 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav';
  
  const testPayload = {
    message: {
      type: 'end-of-call-report',
      timestamp: Date.now(),
      call: {
        id: `test_call_${Date.now()}`,
        recordingUrl: testRecordingUrl,
      },
      endedReason: 'user-hangup',
      duration: 125, // 2 minutes 5 seconds
      cost: 0.0234,
      analysis: {
        summary: 'Test call completed successfully. Customer inquired about product pricing and availability.',
        sentiment: 'positive',
        keywords: ['pricing', 'availability', 'product'],
        actionItems: ['Follow up with pricing information', 'Check product availability'],
      },
    },
  };
  
  try {
    console.log('📤 Sending test end-of-call-report...');
    console.log('🎵 Test recording URL:', testRecordingUrl);
    
    const response = await fetch(`${BASE_URL}/vapi/webhook?token=${WEBHOOK_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });
    
    const data = await response.json();
    
    if (response.ok && data.ok) {
      console.log('✅ End-of-call-report processed successfully');
      console.log('📱 Check your Slack channel for the uploaded recording!');
      console.log('🔗 Channel ID:', process.env.SLACK_CHANNEL_ID);
      return true;
    } else {
      console.log('❌ End-of-call-report failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ End-of-call-report test failed:', error.message);
    return false;
  }
}

// Test 4: Test without recording URL
async function testEndOfCallReportWithoutRecording() {
  console.log('\n4️⃣ Testing end-of-call-report without recording URL...');
  
  if (!WEBHOOK_TOKEN) {
    console.log('❌ WEBHOOK_TOKEN not configured');
    return false;
  }
  
  const testPayload = {
    message: {
      type: 'end-of-call-report',
      timestamp: Date.now(),
      call: {
        id: `test_call_no_recording_${Date.now()}`,
        // No recordingUrl provided
      },
      endedReason: 'completed',
      duration: 89,
      cost: 0.0156,
      analysis: {
        summary: 'Brief call without recording. Customer confirmed appointment.',
        sentiment: 'neutral',
      },
    },
  };
  
  try {
    console.log('📤 Sending test end-of-call-report (no recording)...');
    
    const response = await fetch(`${BASE_URL}/vapi/webhook?token=${WEBHOOK_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });
    
    const data = await response.json();
    
    if (response.ok && data.ok) {
      console.log('✅ End-of-call-report (no recording) processed successfully');
      console.log('ℹ️  No recording should be uploaded to Slack for this test');
      return true;
    } else {
      console.log('❌ End-of-call-report (no recording) failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ End-of-call-report (no recording) test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('Configuration:');
  console.log('- Base URL:', BASE_URL);
  console.log('- Webhook Token:', WEBHOOK_TOKEN ? '✅ Configured' : '❌ Missing');
  console.log('- Slack Bot Token:', process.env.SLACK_BOT_TOKEN ? '✅ Configured' : '❌ Missing');
  console.log('- Slack Channel ID:', process.env.SLACK_CHANNEL_ID || '❌ Missing');
  console.log('');
  
  const results = [];
  
  // Run all tests
  results.push(await testHealthCheck());
  results.push(await testSlackConnection());
  results.push(await testEndOfCallReportWithRecording());
  results.push(await testEndOfCallReportWithoutRecording());
  
  // Summary
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Slack integration is working correctly.');
    console.log('\n📱 Next steps:');
    console.log('1. Configure VAPI to send recordingUrl in end-of-call-report webhooks');
    console.log('2. Recordings will automatically be uploaded to your Slack channel');
    console.log('3. Monitor the logs for any upload issues');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration and try again.');
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the tests
runTests().catch(console.error);
