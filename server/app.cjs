// CJS entry point for Phusion Passenger / Plesk
// Passenger uses require() which cannot load ESM directly.
// This wrapper uses dynamic import() to load the ESM server.
import('./index.js').catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
