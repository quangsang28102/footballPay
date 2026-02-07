import { format, parseISO, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return dateString;
    return format(date, 'dd/MM/yyyy', { locale: vi });
  } catch (error) {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return dateString;
    return format(date, 'dd/MM/yyyy HH:mm', { locale: vi });
  } catch (error) {
    return dateString;
  }
}
