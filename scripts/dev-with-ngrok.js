#!/usr/bin/env node

/**
 * Development script that starts the server and ngrok simultaneously
 * Usage: npm run dev:ngrok
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Starting Vapi-GHL Connector with ngrok...\n');

// Check if ngrok is installed
function checkNgrokInstalled() {
  return new Promise((resolve) => {
    const ngrokCheck = spawn('ngrok', ['--version'], { shell: true });
    
    ngrokCheck.on('close', (code) => {
      resolve(code === 0);
    });
    
    ngrokCheck.on('error', () => {
      resolve(false);
    });
  });
}

// Check if required files exist
function checkRequiredFiles() {
  const requiredFiles = [
    join(projectRoot, 'src', 'server.ts'),
    join(projectRoot, '.env')
  ];
  
  for (const file of requiredFiles) {
    if (!existsSync(file)) {
      console.error(`❌ Required file missing: ${file}`);
      if (file.endsWith('.env')) {
        console.log('💡 Copy env.example to .env: cp env.example .env');
      }
      return false;
    }
  }
  return true;
}

// Main execution
async function main() {
  // Check if ngrok is installed
  const ngrokInstalled = await checkNgrokInstalled();
  if (!ngrokInstalled) {
    console.error('❌ ngrok is not installed or not in PATH');
    console.log('💡 Install ngrok:');
    console.log('   npm install -g ngrok');
    console.log('   or download from https://ngrok.com/download');
    process.exit(1);
  }
  
  // Check required files
  if (!checkRequiredFiles()) {
    process.exit(1);
  }
  
  console.log('✅ Pre-flight checks passed\n');
  
  startServices();
}

function startServices() {
  // Start the development server
  console.log('📡 Starting development server...');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: 'pipe',
    shell: true
  });

  // Start ngrok after a brief delay
  setTimeout(() => {
    console.log('🌐 Starting ngrok tunnel...');
    const ngrok = spawn('ngrok', ['http', '3000'], {
      cwd: projectRoot,
      stdio: 'pipe',
      shell: true
    });

    // Handle ngrok output
    ngrok.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Extract and highlight the public URL
      const urlMatch = output.match(/https:\/\/[\w-]+\.ngrok\.io/);
      if (urlMatch) {
        const publicUrl = urlMatch[0];
        console.log('\n' + '='.repeat(50));
        console.log('🎉 ngrok tunnel is ready!');
        console.log('📡 Public URL:', publicUrl);
        console.log('🔗 Webhook URL:', `${publicUrl}/vapi/webhook?token=YOUR_TOKEN`);
        console.log('❤️  Health Check:', `${publicUrl}/health`);
        console.log('🔍 ngrok Web UI: http://localhost:4040');
        console.log('='.repeat(50) + '\n');
      }
    });

    ngrok.stderr.on('data', (data) => {
      const errorOutput = data.toString().trim();
      if (errorOutput.includes('command not found') || errorOutput.includes('not recognized')) {
        console.error('❌ ngrok command not found');
        console.log('💡 Install ngrok: npm install -g ngrok');
      } else if (errorOutput.includes('authtoken')) {
        console.error('❌ ngrok auth token required for some features');
        console.log('💡 Sign up at https://ngrok.com and run: ngrok config add-authtoken YOUR_TOKEN');
      } else {
        console.error('ngrok error:', errorOutput);
      }
    });

    ngrok.on('close', (code) => {
      if (code !== 0) {
        console.log('❌ ngrok tunnel failed to start');
        console.log('💡 Try running manually: ngrok http 3000');
      }
      console.log('🌐 ngrok tunnel closed');
    });
  }, 2000);

  // Handle server output
  server.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output.includes('Server started')) {
      console.log('✅ Server is running!');
    } else if (output.includes('error') || output.includes('Error')) {
      console.error('server error:', output);
    } else {
      console.log('server:', output);
    }
  });

  server.stderr.on('data', (data) => {
    const errorOutput = data.toString().trim();
    if (errorOutput.includes('EADDRINUSE')) {
      console.error('❌ Port 3000 is already in use');
      console.log('💡 Kill the process or change PORT in .env file');
    } else if (errorOutput.includes('tsx')) {
      console.error('❌ tsx not found');
      console.log('💡 Install dependencies: npm install');
    } else {
      console.error('server error:', errorOutput);
    }
  });

  server.on('close', (code) => {
    console.log('📡 Development server stopped');
    if (code !== 0) {
      console.log(`❌ Server exited with code ${code}`);
    }
    process.exit(code);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    server.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down...');
    server.kill('SIGTERM');
    process.exit(0);
  });
}

// Run the main function
main().catch((error) => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});
