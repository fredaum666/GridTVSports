// GridTV Sports Service Worker
// Handles push notifications for game start alerts and live score updates

const CACHE_NAME = 'gridtv-sports-v1';
const OFFLINE_URL = '/offline.html';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching essential assets');
      // Cache essential app assets (icons only - pages are dynamic)
      return cache.addAll([
        '/assets/Icon.png',
        '/assets/icon-192.png'
      ]).catch(err => {
        // Non-critical - just log and continue
        console.log('[SW] Some assets failed to cache (non-critical):', err.message);
      });
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    type: 'game_start',
    title: 'GridTV Sports',
    body: 'A game is starting soon!',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: 'game-alert',
    data: {}
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        type: payload.type || 'game_start',
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        image: payload.image || null,
        tag: payload.tag || `game-${payload.gameId || 'alert'}`,
        data: {
          gameId: payload.gameId,
          league: payload.league,
          url: payload.url || `/${payload.league?.toLowerCase() || ''}.html`,
          homeTeam: payload.homeTeam,
          awayTeam: payload.awayTeam,
          homeScore: payload.homeScore,
          awayScore: payload.awayScore,
          homeLogo: payload.homeLogo,
          awayLogo: payload.awayLogo,
          period: payload.period,
          clock: payload.clock
        }
      };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const isScoreUpdate = data.type === 'score_update';

  event.waitUntil(
    (async () => {
      const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        data: data.data,
        vibrate: isScoreUpdate ? [100, 50, 100] : [200, 100, 200],
        renotify: isScoreUpdate,
        requireInteraction: !isScoreUpdate,
        silent: isScoreUpdate,
        actions: [
          { action: 'watch', title: '📺 Watch Now' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      };

      if (isScoreUpdate && data.data.awayLogo && data.data.homeLogo) {
        // Build a composite scoreboard image with both team logos
        try {
          const imageDataUrl = await buildScoreImage(
            data.data.awayLogo,
            data.data.homeLogo,
            data.data.awayTeam,
            data.data.homeTeam,
            data.data.awayScore,
            data.data.homeScore
          );
          if (imageDataUrl) options.image = imageDataUrl;
        } catch (e) {
          console.warn('[SW] Could not build score image:', e.message);
        }
        // icon stays as the app icon (the composite image shows both team logos)
      } else if (data.image) {
        options.image = data.image;
      }

      await self.registration.showNotification(data.title, options);
    })()
  );
});

/**
 * Draw a 696×148 px scoreboard image on an OffscreenCanvas showing:
 * [away logo] [away abbr] [away score]  vs  [home score] [home abbr] [home logo]
 * Falls back to null if OffscreenCanvas is unavailable.
 */
async function buildScoreImage(awayLogoUrl, homeLogoUrl, awayAbbr, homeAbbr, awayScore, homeScore) {
  if (typeof OffscreenCanvas === 'undefined') return null;

  const W = 696, H = 148;
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background: dark gradient
  const bg = ctx.createLinearGradient(0, 0, W, 0);
  bg.addColorStop(0, '#0d1117');
  bg.addColorStop(1, '#161b22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle center divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2, 20);
  ctx.lineTo(W / 2, H - 20);
  ctx.stroke();

  const logoSize = 80;
  const logoPad = 24;
  const centerX = W / 2;
  const centerY = H / 2;

  // Load both logos in parallel
  const [awayImg, homeImg] = await Promise.all([
    fetchImage(awayLogoUrl),
    fetchImage(homeLogoUrl)
  ]);

  // --- Away side (left) ---
  const awayLogoX = logoPad;
  const awayLogoY = (H - logoSize) / 2;
  if (awayImg) {
    ctx.drawImage(awayImg, awayLogoX, awayLogoY, logoSize, logoSize);
  }

  // Away score (large, left of center)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(awayScore ?? ''), centerX - 16, centerY);

  // Away abbr (small, under logo)
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(awayAbbr || '', awayLogoX + logoSize / 2, awayLogoY + logoSize + 14);

  // --- Home side (right) ---
  const homeLogoX = W - logoPad - logoSize;
  const homeLogoY = (H - logoSize) / 2;
  if (homeImg) {
    ctx.drawImage(homeImg, homeLogoX, homeLogoY, logoSize, logoSize);
  }

  // Home score (large, right of center)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(homeScore ?? ''), centerX + 16, centerY);

  // Home abbr (small, under logo)
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(homeAbbr || '', homeLogoX + logoSize / 2, homeLogoY + logoSize + 14);

  // Center "vs" dash
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('—', centerX, centerY);

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return await blobToDataUrl(blob);
}

function fetchImage(url) {
  return fetch(url)
    .then(r => r.blob())
    .then(blob => createImageBitmap(blob))
    .catch(() => null);
}

async function blobToDataUrl(blob) {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:image/png;base64,' + btoa(binary);
}

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Default action or 'watch' action - open the game page
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open with the app
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navigate existing window to the game page
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // No window open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline notification preferences
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-notification-prefs') {
    event.waitUntil(syncNotificationPreferences());
  }
});

async function syncNotificationPreferences() {
  // Sync any pending notification preference changes when back online
  console.log('[SW] Syncing notification preferences...');
}
