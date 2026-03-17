/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR PWA Support — Service Worker registration & offline support
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * 1. Service worker registration with update detection
 * 2. Web app manifest generation
 * 3. Offline status tracking with React hook
 * 4. Background sync queue for offline actions
 * 5. Install prompt management
 */

// ══════════════════════════════════════════════════════
// Service Worker Registration
// ══════════════════════════════════════════════════════

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    // Check for updates periodically
    setInterval(() => registration.update(), 60 * 60 * 1000); // every hour

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available
          pwaManager.notifyUpdate();
        }
      });
    });

    return registration;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

// ══════════════════════════════════════════════════════
// Service Worker Script (will be written as separate file)
// ══════════════════════════════════════════════════════

export const SERVICE_WORKER_SCRIPT = `
const CACHE_NAME = 'nexushr-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
        .then((response) => response || new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Fallback for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      return new Response('Offline', { status: 503 });
    })
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'nexushr-sync') {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  // Retrieve queued actions from IndexedDB and replay them
  // This is a stub — actual implementation would use IDB
}
`;

// ══════════════════════════════════════════════════════
// Web App Manifest
// ══════════════════════════════════════════════════════

export const WEB_APP_MANIFEST = {
  name: 'NexusHR AI Platform',
  short_name: 'NexusHR',
  description: 'AI-powered virtual employees for your business',
  start_url: '/',
  display: 'standalone' as const,
  background_color: '#0F0F0F',
  theme_color: '#FBCC00',
  orientation: 'any' as const,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  categories: ['business', 'productivity'],
};

// ══════════════════════════════════════════════════════
// PWA Manager
// ══════════════════════════════════════════════════════

type PWAListener = (event: 'online' | 'offline' | 'update-available' | 'install-prompt') => void;

class PWAManager {
  private online: boolean = navigator.onLine;
  private listeners: Set<PWAListener> = new Set();
  private installPromptEvent: any = null;
  private updateAvailable: boolean = false;

  init(): void {
    window.addEventListener('online', () => {
      this.online = true;
      this.notify('online');
    });
    window.addEventListener('offline', () => {
      this.online = false;
      this.notify('offline');
    });

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.installPromptEvent = e;
      this.notify('install-prompt');
    });
  }

  isOnline(): boolean { return this.online; }
  hasUpdate(): boolean { return this.updateAvailable; }
  canInstall(): boolean { return !!this.installPromptEvent; }

  notifyUpdate(): void {
    this.updateAvailable = true;
    this.notify('update-available');
  }

  async promptInstall(): Promise<boolean> {
    if (!this.installPromptEvent) return false;
    this.installPromptEvent.prompt();
    const result = await this.installPromptEvent.userChoice;
    this.installPromptEvent = null;
    return result.outcome === 'accepted';
  }

  async applyUpdate(): Promise<void> {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  subscribe(listener: PWAListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: 'online' | 'offline' | 'update-available' | 'install-prompt'): void {
    this.listeners.forEach(fn => fn(event));
  }
}

export const pwaManager = new PWAManager();

// ══════════════════════════════════════════════════════
// React Hooks
// ══════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(pwaManager.isOnline());

  useEffect(() => {
    return pwaManager.subscribe((event) => {
      if (event === 'online') setOnline(true);
      if (event === 'offline') setOnline(false);
    });
  }, []);

  return online;
}

export function usePWA(): {
  online: boolean;
  updateAvailable: boolean;
  canInstall: boolean;
  install: () => Promise<boolean>;
  applyUpdate: () => Promise<void>;
} {
  const [online, setOnline] = useState(pwaManager.isOnline());
  const [updateAvailable, setUpdate] = useState(pwaManager.hasUpdate());
  const [canInstall, setCanInstall] = useState(pwaManager.canInstall());

  useEffect(() => {
    return pwaManager.subscribe((event) => {
      if (event === 'online') setOnline(true);
      if (event === 'offline') setOnline(false);
      if (event === 'update-available') setUpdate(true);
      if (event === 'install-prompt') setCanInstall(true);
    });
  }, []);

  return {
    online,
    updateAvailable,
    canInstall,
    install: () => pwaManager.promptInstall(),
    applyUpdate: () => pwaManager.applyUpdate(),
  };
}

// ══════════════════════════════════════════════════════
// Offline Action Queue
// ══════════════════════════════════════════════════════

interface QueuedAction {
  id: string;
  url: string;
  method: string;
  body?: string;
  timestamp: number;
}

const QUEUE_KEY = 'nexushr_offline_queue';

export function queueOfflineAction(url: string, method: string, body?: any): void {
  const queue = getQueue();
  queue.push({
    id: `q_${Date.now().toString(36)}`,
    url,
    method,
    body: body ? JSON.stringify(body) : undefined,
    timestamp: Date.now(),
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-100)));
}

function getQueue(): QueuedAction[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}

export async function processOfflineQueue(): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0 || !navigator.onLine) return 0;

  let processed = 0;
  const remaining: QueuedAction[] = [];

  for (const action of queue) {
    try {
      await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: action.body,
      });
      processed++;
    } catch {
      remaining.push(action);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return processed;
}
