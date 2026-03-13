/* StudyOS SW v4 */
const CACHE = 'studyos-v4';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never intercept API calls, Firebase, fonts, CDN
  if (
    url.hostname === 'api.anthropic.com' ||
    url.hostname.includes('workers.dev') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('fonts.')
  ) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp?.status === 200 && e.request.method === 'GET') {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'StudyOS', body: 'Time to study!' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/icon-192.png', badge: '/icon-192.png',
    vibrate: [200, 100, 200], requireInteraction: true,
    actions: [{ action:'open', title:'📚 Open StudyOS' }, { action:'snooze', title:'⏰ Snooze 30min' }],
    data,
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'snooze') {
    const d = e.notification.data;
    setTimeout(() => self.registration.showNotification(d?.title || 'StudyOS', { body: d?.body || 'Snoozed session ready!', icon:'/icon-192.png' }), 30*60*1000);
    return;
  }
  e.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
    if (list.length) return list[0].focus();
    return clients.openWindow('/');
  }));
});
