/**
 * Password strength rules (no external deps, no network).
 * Length + blocklist + character-class diversity. Breach-corpus screening
 * (HaveIBeenPwned) is recommended before launch but needs an SMS-free
 * offline decision here: the blocklist covers the most abused passwords.
 */

const BLOCKLIST = new Set(
  [
    "password",
    "password1",
    "password123",
    "passw0rd",
    "12345678",
    "123456789",
    "1234567890",
    "qwerty123",
    "qwertyuiop",
    "abc12345",
    "abcd1234",
    "letmein123",
    "welcome123",
    "admin123",
    "admin@123",
    "droovee123",
    "changeme",
    "iloveyou",
    "11111111",
    "00000000",
    "987654321",
    "123456789",
  ].map((s) => s.toLowerCase()),
);

/** Returns the first problem found, or null when the password is acceptable. */
export function passwordIssues(pw: string, minLength: number, classesRequired: number): string | null {
  if (pw.length < minLength) return `Use at least ${minLength} characters.`;
  if (BLOCKLIST.has(pw.toLowerCase())) return "This password is too common. Choose a harder one to guess.";
  if (/^(.)\1+$/.test(pw)) return "This password is too easy to guess.";
  let classes = 0;
  if (/[a-z]/.test(pw)) classes += 1;
  if (/[A-Z]/.test(pw)) classes += 1;
  if (/\d/.test(pw)) classes += 1;
  if (/[^A-Za-z0-9]/.test(pw)) classes += 1;
  if (classes < classesRequired) return "Mix upper- and lower-case letters, numbers and symbols.";
  return null;
}
