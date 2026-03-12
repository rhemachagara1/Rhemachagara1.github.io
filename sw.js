/* StudyOS SW v3 */
const CACHE = 'studyos-v3';
const OFFLINE_URLS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS).catch(()=>{}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept Anthropic API calls — let them go through live
  if (url.hostname === 'api.anthropic.com') return;
  // Never intercept Google Fonts
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) return;
  // Never intercept unpkg CDN
  if (url.hostname === 'unpkg.com') return;

  // For app shell — cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && e.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'StudyOS', body: 'Time to study!' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: '/icon-192.png', badge: '/icon-192.png',
      vibrate: [200, 100, 200], requireInteraction: true,
      actions: [
        { action: 'open', title: '📚 Open StudyOS' },
        { action: 'snooze', title: '⏰ Snooze 30min' }
      ],
      data
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'snooze') {
    const d = e.notification.data;
    setTimeout(() => self.registration.showNotification(d?.title || 'StudyOS Reminder', {
      body: d?.body || 'Your snoozed session is ready!', icon: '/icon-192.png', vibrate:[200,100,200],
    }), 30 * 60 * 1000);
    return;
  }
  e.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});
