import dayjs from 'dayjs';

export function formatMoney(value, currency = 'CZK') {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(value);
}

export function formatDate(value) {
  if (!value) return '—';
  return dayjs(value).format('DD.MM.YYYY');
}

export function formatDateTime(value) {
  if (!value) return '—';
  return dayjs(value).format('DD.MM.YYYY HH:mm');
}

export const ORDER_STATUS_LABELS = {
  NEW: 'Nová',
  CONFIRMED: 'Potvrzená',
  IN_PROGRESS: 'V realizaci',
  COMPLETED: 'Dokončená',
  CANCELLED: 'Zrušená',
};

export const MEETING_STATUS_LABELS = {
  PLANNED: 'Plánovaná',
  IN_PROGRESS: 'Probíhá',
  COMPLETED: 'Dokončená',
  CANCELLED: 'Zrušená',
};

export const CAMPAIGN_STATUS_LABELS = {
  DRAFT: 'Koncept',
  SCHEDULED: 'Naplánovaná',
  SENDING: 'Odesílá se',
  SENT: 'Odeslaná',
  CANCELLED: 'Zrušená',
};

export const INVOICE_PAYMENT_LABELS = {
  CASH: 'Hotově',
  TRANSFER: 'Převodem',
};

export const NUMBER_SEQUENCE_TYPE_LABELS = {
  ORDER: 'Objednávky',
  INVOICE: 'Faktury',
};

export const STATUS_COLORS = {
  NEW: 'info',
  CONFIRMED: 'primary',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default',
  PLANNED: 'info',
  DRAFT: 'default',
  SCHEDULED: 'info',
  SENDING: 'warning',
  SENT: 'success',
};
