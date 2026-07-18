const CAMBODIA_TIME_ZONE = 'Asia/Phnom_Penh';
const CAMBODIA_TIME_OFFSET = '+07:00';

const fileStampFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAMBODIA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

const displayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAMBODIA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZoneName: 'short'
});

function getParts(date) {
  return Object.fromEntries(fileStampFormatter.formatToParts(date).map((part) => [part.type, part.value]));
}

function formatCambodiaTimestampForFile(date = new Date()) {
  const parts = getParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}-${parts.minute}-${parts.second}+07-00`;
}

function formatCambodiaDateTime(date = new Date()) {
  return displayFormatter.format(date);
}

function formatCambodiaSqlDateTime(date = new Date()) {
  const parts = getParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function formatCambodiaIsoDateTime(date = new Date()) {
  const parts = getParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${CAMBODIA_TIME_OFFSET}`;
}

module.exports = {
  CAMBODIA_TIME_ZONE,
  CAMBODIA_TIME_OFFSET,
  formatCambodiaDateTime,
  formatCambodiaIsoDateTime,
  formatCambodiaSqlDateTime,
  formatCambodiaTimestampForFile
};
