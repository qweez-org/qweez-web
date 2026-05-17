/**
 * Format an ISO date string to Indonesian locale display.
 * e.g. "16 Mei 2026, 14.30"
 */
export function formatScheduleDate(dateStr?: string): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Quiz status → badge CSS class mapping.
 */
export const statusColors: Record<string, string> = {
  draft: 'badge-gray',
  scheduled: 'badge-yellow',
  open: 'badge-green',
  closed: 'badge-red',
  waiting: 'badge-orange',
  in_progress: 'badge-blue',
  finished: 'badge-purple',
};

/**
 * Quiz status → Indonesian label mapping.
 */
export const statusLabels: Record<string, string> = {
  draft: 'Draf',
  scheduled: 'Terjadwal',
  open: 'Terbuka',
  closed: 'Ditutup',
  waiting: 'Menunggu',
  in_progress: 'Berlangsung',
  finished: 'Selesai',
};
