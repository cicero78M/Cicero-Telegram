/**
 * Phone number utility functions
 */

export const minPhoneDigitLength = 10;

/**
 * Normalize a WhatsApp/phone number by removing non-digit characters
 * @param {string} phoneNumber - The phone number to normalize
 * @returns {string} - Normalized phone number with only digits
 */
export function normalizeWhatsappNumber(phoneNumber) {
  if (!phoneNumber) return '';
  return String(phoneNumber).replace(/\D/g, '');
}

/**
 * Format a phone number to WhatsApp ID format (number@c.us)
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - Formatted WhatsApp ID
 */
export function formatToWhatsAppId(phoneNumber) {
  const normalized = normalizeWhatsappNumber(phoneNumber);
  return normalized ? `${normalized}@c.us` : '';
}
