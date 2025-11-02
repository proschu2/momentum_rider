/**
 * User Model
 * Defines the user schema with id, email, passwordHash, and createdAt
 */

const { v4: uuidv4 } = require('uuid');

/**
 * User class representing a user in the system
 */
class User {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.email = data.email || '';
    this.passwordHash = data.passwordHash || '';
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  /**
   * Create a new user with sanitized data (no passwordHash in response)
   * @param {Object} data - User data
   * @returns {User} New user instance
   */
  static create(data) {
    return new User(data);
  }

  /**
   * Validate user data
   * @returns {Object} Validation result with isValid and errors
   */
  validate() {
    const errors = [];

    // Email validation
    if (!this.email) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('Invalid email format');
    }

    // Password validation (for registration)
    if (!this.passwordHash) {
      errors.push('Password hash is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert user to JSON (sanitized - no passwordHash)
   * @returns {Object} Sanitized user object
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      createdAt: this.createdAt,
    };
  }

  /**
   * Convert user to JSON with passwordHash (for internal use)
   * @returns {Object} User object with passwordHash
   */
  toJSONWithPassword() {
    return {
      id: this.id,
      email: this.email,
      passwordHash: this.passwordHash,
      createdAt: this.createdAt,
    };
  }
}

module.exports = User;
