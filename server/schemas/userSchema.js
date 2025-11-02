/**
 * User Authentication Schema
 * Defines validation rules for user registration, login, and profile updates
 */

const Joi = require('joi');

/**
 * Email validation with strict format
 */
const emailSchema = Joi.string()
  .email({
    tlds: {
      allow: false, // Reject common TLDs for email validation
    },
  })
  .min(5)
  .max(254)
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'string.min': 'Email must be at least 5 characters',
    'string.max': 'Email cannot exceed 254 characters',
    'any.required': 'Email is required',
  });

/**
 * Password validation
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password cannot exceed 128 characters',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required',
  });

/**
 * Username validation
 */
const usernameSchema = Joi.string().alphanum().min(3).max(30).required().messages({
  'string.alphanum': 'Username must only contain alphanumeric characters',
  'string.min': 'Username must be at least 3 characters',
  'string.max': 'Username cannot exceed 30 characters',
  'any.required': 'Username is required',
});

/**
 * Registration schema
 */
const registrationSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
}).messages({
  'object.unknown': 'Unknown field in registration data',
});

/**
 * Login schema
 */
const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
}).messages({
  'object.unknown': 'Unknown field in login data',
});

/**
 * Change password schema
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: passwordSchema,
}).messages({
  'object.unknown': 'Unknown field in password change data',
});

/**
 * Update profile schema
 */
const updateProfileSchema = Joi.object({
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
    'object.unknown': 'Unknown field in profile update data',
  });

/**
 * Password reset request schema
 */
const passwordResetRequestSchema = Joi.object({
  email: emailSchema,
}).messages({
  'object.unknown': 'Unknown field in password reset request',
});

/**
 * Password reset confirmation schema
 */
const passwordResetConfirmSchema = Joi.object({
  token: Joi.string()
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .min(20)
    .max(500)
    .required()
    .messages({
      'string.pattern.base': 'Invalid reset token format',
      'string.min': 'Reset token is too short',
      'string.max': 'Reset token is too long',
      'any.required': 'Reset token is required',
    }),
  newPassword: passwordSchema,
}).messages({
  'object.unknown': 'Unknown field in password reset confirmation',
});

module.exports = {
  emailSchema,
  passwordSchema,
  usernameSchema,
  registrationSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
};
