// ── Environment Variable Validation ──────────────────────────────────────────
// Ensures all critical environment variables are present before the server
// starts. Prevents silent runtime failures from missing configuration.

const REQUIRED_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
];

const RECOMMENDED_VARS = [
  'SMTP_USER',
  'SMTP_PASS',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'GOOGLE_CLIENT_ID',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error('╔══════════════════════════════════════════════════════════╗');
    console.error('║  FATAL: Missing required environment variables          ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    missing.forEach(v => console.error(`   ✗ ${v}`));
    console.error('\nPlease set these variables in your .env file and restart.');
    process.exit(1);
  }

  // Specific security check for JWT_SECRET
  if (process.env.JWT_SECRET.length < 32) {
    console.error('╔══════════════════════════════════════════════════════════╗');
    console.error('║  FATAL: JWT_SECRET is too short (min 32 characters)     ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    process.exit(1);
  }

  // Warn about missing recommended variables
  const missingRecommended = RECOMMENDED_VARS.filter(v => !process.env[v]);
  if (missingRecommended.length > 0) {
    console.warn('\n⚠️  Missing recommended environment variables:');
    missingRecommended.forEach(v => console.warn(`   ⚠ ${v}`));
    console.warn('   These features may not work correctly.\n');
  }
}

module.exports = validateEnv;
