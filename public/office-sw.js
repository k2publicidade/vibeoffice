self.addEventListener('push', event => {
  const data = event.data?.json() || {}
  event.waitUntil(self.registration.showNotification(data.title || 'VIBEDISTRO', { body: data.body || 'Você tem uma nova notificação', icon: '/logo.png', data: { url: data.url || '/' } }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin)
  if (url.origin === self.location.origin) event.waitUntil(clients.openWindow(url.href))
})
