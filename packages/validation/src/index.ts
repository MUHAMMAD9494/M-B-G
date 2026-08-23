/**
 * @nexora/validation — shared validation helpers.
 * Keep this package lean; domain DTOs live close to their modules in the API.
 */

export const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

/** Simple email shape guard used for client-side pre-validation only. */
export function isEmailShape(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Strong-enough password policy for the platform. */
export function isStrongPassword(value: string): boolean {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
}

export function isPhoneShape(value: string): boolean {
  return PHONE_REGEX.test(value);
}
