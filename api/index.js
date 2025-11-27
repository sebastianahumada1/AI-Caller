// Vercel serverless function entry point
// This file imports the compiled Express app

// Import the compiled server
import app from '../dist/server.js';

// Export for Vercel
export default app;

