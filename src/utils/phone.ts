export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  if (!trimmed) return '';
  const hasLeadingPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return trimmed;
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}
