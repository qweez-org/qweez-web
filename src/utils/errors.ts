/**
 * Extract a human-readable error message from Axios errors
 * or generic exceptions.
 */
export const toErrorMessage = (e: any): string => {
  return e?.response?.data?.message || e?.message || 'Terjadi kesalahan';
};
