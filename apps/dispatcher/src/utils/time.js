export const CAMBODIA_TIME_ZONE = 'Asia/Phnom_Penh';

export function parseCambodiaDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const dateText = String(value).trim();
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(dateText);
  const normalized = dateText.includes(' ') ? dateText.replace(' ', 'T') : dateText;
  return new Date(hasTimeZone ? normalized : `${normalized}+07:00`);
}
