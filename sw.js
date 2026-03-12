/* StudyOS Service Worker */
const CACHE_NAME = 'studyos-v1';
const urlsToCache = ['/', '/index.html', '/static/js/main.chunk.js', '/static/css/main.chunk.css'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request).catch(() =>
      caches.match('/index.html')
    ))
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'StudyOS', body: 'Time to study!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'studyos',
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'open', title: '📚 Open StudyOS' },
        { action: 'snooze', title: '⏰ Snooze 30min' }
      ],
      data: data
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'snooze') {
    // Snooze 30 minutes
    const snoozeData = event.notification.data;
    setTimeout(() => {
      self.registration.showNotification(snoozeData?.title || 'StudyOS Reminder', {
        body: snoozeData?.body || 'Your snoozed study session is ready!',
        icon: '/icon-192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
      });
    }, 30 * 60 * 1000);
    return;
  }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        clientList[0].focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});

// Background sync for scheduled notifications
self.addEventListener('message', event => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATIONS') {
    const sessions = event.data.sessions || [];
    // Store sessions for background checking
    self.studySessions = sessions;
  }
});
