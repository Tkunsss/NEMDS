export const CAMBODIA_TIME_ZONE = 'Asia/Phnom_Penh';

const formatter = new Intl.DateTimeFormat(undefined, {
  timeZone: CAMBODIA_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZoneName: 'short'
});

export function parseCambodiaDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const dateText = String(value).trim();
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(dateText);
  const normalized = dateText.includes(' ') ? dateText.replace(' ', 'T') : dateText;
  return new Date(hasTimeZone ? normalized : `${normalized}+07:00`);
}

export function formatCambodiaDateTime(value) {
  const date = parseCambodiaDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return formatter.format(date);
}
