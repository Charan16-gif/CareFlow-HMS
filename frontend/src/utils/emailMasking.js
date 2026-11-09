/**
 * CareFlow-HMS — Email Masking Utility
 *
 * Masks email addresses for privacy and security across Login, remembered accounts,
 * and user account previews without altering the underlying raw email used for authentication.
 *
 * Rules:
 *   - Preserves the first 2 characters of the local part.
 *   - Masks remaining characters of the local part with asterisks (*).
 *   - Retains the full domain (@example.com).
 *   - Handles short local parts safely:
 *       length 1: a@domain.com  -> *@domain.com
 *       length 2: ab@domain.com -> a*@domain.com
 *
 * Examples:
 *   charan@gmail.com     -> ch****@gmail.com
 *   student123@gmail.com -> st********@gmail.com
 *   hello@yahoo.com      -> he***@yahoo.com
 *   user@outlook.com     -> us**@outlook.com
 */

/**
 * Masks an email string.
 * @param {string} email - The email to mask.
 * @returns {string} The masked email or original input if not a valid email format.
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');

  // If not formatted as an email, return as-is
  if (atIndex <= 0) {
    return trimmed;
  }

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex); // includes '@'

  if (localPart.length <= 1) {
    return `*${domainPart}`;
  }

  if (localPart.length === 2) {
    return `${localPart[0]}*${domainPart}`;
  }

  const visiblePrefix = localPart.slice(0, 2);
  const asterisks = '*'.repeat(localPart.length - 2);

  return `${visiblePrefix}${asterisks}${domainPart}`;
}

/**
 * Quick check if a string looks like an email address.
 * @param {string} str
 * @returns {boolean}
 */
export function isEmailString(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

export default maskEmail;

