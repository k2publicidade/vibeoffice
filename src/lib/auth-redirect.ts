/** Only allow same-origin application paths after authentication. */
export function safeAuthRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/'
  const destination = new URL(value, 'https://vibeoffice.local')
  return destination.origin === 'https://vibeoffice.local'
    ? destination.pathname + destination.search + destination.hash
    : '/'
}
