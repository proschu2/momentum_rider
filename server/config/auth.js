/**
 * Authentication Configuration
 * JWT and security settings
 */

module.exports = {
  // JWT Secret key - should be set via environment variable
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',

  // JWT token expiration
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // Bcrypt password hashing rounds
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
};
