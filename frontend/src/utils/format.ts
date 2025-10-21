import { format, parseISO } from 'date-fns';

export function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
  }).format(num);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-NZ').format(value);
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'dd MMM yyyy');
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'dd MMM yyyy HH:mm');
  } catch {
    return dateString;
  }
}
