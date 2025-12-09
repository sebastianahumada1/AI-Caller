// scripts/test-vapi-metadata.js
import { config } from 'dotenv';
config();

// Simular el VapiApiClient
async function testVapiMetadata(callId) {
  const VAPI_API_KEY = process.env.VAPI_API_KEY;
  const VAPI_BASE_URL = process.env.VAPI_API_BASE_URL || 'https://api.vapi.ai';
  
  if (!VAPI_API_KEY) {
    console.error('❌ VAPI_API_KEY no encontrada en .env');
    process.exit(1);
  }
  
  console.log('🔍 Testing VAPI Metadata Extraction\n');
  console.log(`📞 Call ID: ${callId}`);
  console.log(`🔗 API URL: ${VAPI_BASE_URL}/call/${callId}\n`);
  
  try {
    // Hacer la llamada a la API de VAPI
    const response = await fetch(`${VAPI_BASE_URL}/call/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`VAPI API Error: ${response.status} ${response.statusText}`);
    }
    
    const callData = await response.json();
    
    console.log('✅ Call data retrieved successfully\n');
    console.log('='.repeat(80));
    
    // Mostrar estructura completa
    console.log('\n📊 FULL CALL DATA STRUCTURE:');
    console.log(JSON.stringify(callData, null, 2));
    console.log('\n' + '='.repeat(80));
    
    // Analizar metadata
    console.log('\n🔎 METADATA ANALYSIS:');
    console.log('─'.repeat(80));
    
    if (callData.metadata) {
      console.log('\n✓ callData.metadata exists');
      console.log('  Keys:', Object.keys(callData.metadata));
      
      if (callData.metadata.ghl) {
        console.log('\n✓ callData.metadata.ghl exists');
        console.log('  Keys:', Object.keys(callData.metadata.ghl));
        console.log('  Content:', JSON.stringify(callData.metadata.ghl, null, 2));
        
        if (callData.metadata.ghl.contact) {
          console.log('\n✓ callData.metadata.ghl.contact exists');
          console.log('  Name:', callData.metadata.ghl.contact.name);
          console.log('  Email:', callData.metadata.ghl.contact.email);
          console.log('  FirstName:', callData.metadata.ghl.contact.firstName);
          console.log('  LastName:', callData.metadata.ghl.contact.lastName);
        } else {
          console.log('\n✗ callData.metadata.ghl.contact DOES NOT exist');
        }
      } else {
        console.log('\n✗ callData.metadata.ghl DOES NOT exist');
      }
      
      // Check for name/email at metadata level
      if (callData.metadata.name) {
        console.log('\n✓ callData.metadata.name exists:', callData.metadata.name);
      }
      if (callData.metadata.email) {
        console.log('✓ callData.metadata.email exists:', callData.metadata.email);
      }
    } else {
      console.log('\n✗ callData.metadata DOES NOT exist');
    }
    
    // Check for customer object
    console.log('\n🔎 CUSTOMER ANALYSIS:');
    console.log('─'.repeat(80));
    
    if (callData.customer) {
      console.log('\n✓ callData.customer exists');
      console.log('  Keys:', Object.keys(callData.customer));
      console.log('  Content:', JSON.stringify(callData.customer, null, 2));
      
      if (callData.customer.name) {
        console.log('\n✓ callData.customer.name:', callData.customer.name);
      }
      if (callData.customer.email) {
        console.log('✓ callData.customer.email:', callData.customer.email);
      }
    } else {
      console.log('\n✗ callData.customer DOES NOT exist');
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📝 SUMMARY - Where to find lead info:');
    console.log('─'.repeat(80));
    
    const findings = [];
    
    // Check variables (VAPI variables)
    if (callData.variables?.name) {
      findings.push(`✓ Name found at: callData.variables.name = "${callData.variables.name}"`);
    }
    if (callData.variables?.email) {
      findings.push(`✓ Email found at: callData.variables.email = "${callData.variables.email}"`);
    }
    
    // Check variableValues
    if (callData.variableValues?.name) {
      findings.push(`✓ Name found at: callData.variableValues.name = "${callData.variableValues.name}"`);
    }
    if (callData.variableValues?.email) {
      findings.push(`✓ Email found at: callData.variableValues.email = "${callData.variableValues.email}"`);
    }
    
    // Check assistantOverrides
    if (callData.assistantOverrides?.variableValues?.name) {
      findings.push(`✓ Name found at: callData.assistantOverrides.variableValues.name = "${callData.assistantOverrides.variableValues.name}"`);
    }
    if (callData.assistantOverrides?.variableValues?.email) {
      findings.push(`✓ Email found at: callData.assistantOverrides.variableValues.email = "${callData.assistantOverrides.variableValues.email}"`);
    }
    
    // Check metadata
    if (callData.metadata?.ghl?.contact?.name) {
      findings.push('✓ Name found at: callData.metadata.ghl.contact.name');
    }
    if (callData.metadata?.ghl?.contact?.email) {
      findings.push('✓ Email found at: callData.metadata.ghl.contact.email');
    }
    if (callData.metadata?.name) {
      findings.push('✓ Name found at: callData.metadata.name');
    }
    if (callData.metadata?.email) {
      findings.push('✓ Email found at: callData.metadata.email');
    }
    if (callData.customer?.name) {
      findings.push('✓ Name found at: callData.customer.name');
    }
    if (callData.customer?.email) {
      findings.push('✓ Email found at: callData.customer.email');
    }
    
    if (findings.length > 0) {
      findings.forEach(f => console.log(f));
    } else {
      console.log('❌ NO name or email found in any expected location');
      console.log('\n💡 Possible reasons:');
      console.log('   1. GHL webhook is not sending contact info to VAPI');
      console.log('   2. VAPI is not storing the metadata from GHL webhook');
      console.log('   3. The data is in a different structure than expected');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
  }
}

// Get Call ID from command line argument
const callId = process.argv[2];

if (!callId) {
  console.error('❌ Usage: node scripts/test-vapi-metadata.js <CALL_ID>');
  console.error('\nExample: node scripts/test-vapi-metadata.js 019b043c-2a6c-7226-b9e5-4cc736fc4a54');
  process.exit(1);
}

testVapiMetadata(callId);

