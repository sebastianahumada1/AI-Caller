// Vercel serverless entry point
// Import the compiled Express app from dist
import app from '../dist/server.js';

// Export as default for Vercel serverless functions
export default app;
