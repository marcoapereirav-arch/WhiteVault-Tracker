// WhiteVault™ — Push Notifications client helper
import { supabase } from './supabase';

// VAPID public key — safe to expose in client (public by design).
// Pairs with the private key stored in Supabase Edge Function secrets.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BIW7BRBDEcppDc-V87pWc34wxL2Ev4mKsMFhuD64H2wgwDhTnpf0nKCVhnuSgQvLC_08qnuj3TO10aNw5Dfvp3s';

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export const isPushSupported = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

export const getPermissionState = (): PushPermissionState => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission as PushPermissionState;
};

/**
 * Registra el service worker atándolo a la versión de la app.
 *
 * La versión viaja en la URL (/sw.js?v=2026.07.20). Al cambiar la URL, el
 * navegador lo trata como un worker distinto y lo instala; dentro, el SW lee esa
 * versión para nombrar sus cachés, así que las de la versión anterior se borran
 * en el activate. Sin esto las cachés eran eternas y la app se quedaba clavada
 * en una versión antigua para siempre.
 */
export const registerServiceWorker = async (version?: string): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const url = version ? `/sw.js?v=${encodeURIComponent(version)}` : '/sw.js';
    const reg = await navigator.serviceWorker.register(url, { scope: '/' });

    // Limpieza de una vez: cualquier OTRO registro (el antiguo sin versión, o de
    // una versión previa) se da de baja. Si no, el viejo sigue controlando la
    // página y sirviendo su caché eterna aunque el nuevo esté instalado.
    // Nunca se toca el registro que acabamos de crear.
    if (version) {
      const todos = await navigator.serviceWorker.getRegistrations();
      for (const r of todos) {
        if (r === reg) continue;
        await r.unregister().catch(() => {});
      }
    }

    // Si hay una versión nueva esperando, se activa sin esperar a que el usuario
    // cierre todas las pestañas.
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      if (!nuevo) return;
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
          nuevo.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    await navigator.serviceWorker.ready;
    reg.update().catch(() => {});
    return reg;
  } catch (err) {
    console.warn('[push] SW registration failed', err);
    return null;
  }
};

/**
 * Borra TODAS las cachés que no sean de la versión actual, incluidas las que
 * dejó el service worker antiguo (wv-shell-wv-v1.0.0 y compañía), que nunca se
 * purgaban solas.
 */
export const purgarCachesViejas = async (version: string): Promise<number> => {
  if (!('caches' in window)) return 0;
  try {
    const keys = await caches.keys();
    const validas = [`wv-shell-${version}`, `wv-runtime-${version}`];
    const aBorrar = keys.filter((k) => !validas.includes(k));
    await Promise.all(aBorrar.map((k) => caches.delete(k)));
    return aBorrar.length;
  } catch {
    return 0;
  }
};

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
};

export const getCurrentSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
};

export const subscribeToPush = async (userId: string): Promise<{ ok: boolean; reason?: string }> => {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'no_vapid_key' };

  try {
    const reg = (await navigator.serviceWorker.getRegistration()) || (await registerServiceWorker());
    if (!reg) return { ok: false, reason: 'no_sw' };

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: permission };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = sub.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        user_agent: navigator.userAgent,
        platform: detectPlatform(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('[push] save subscription error', error);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.error('[push] subscribe failed', err);
    return { ok: false, reason: err?.message || 'unknown' };
  }
};

export const unsubscribeFromPush = async (userId: string): Promise<boolean> => {
  try {
    const sub = await getCurrentSubscription();
    if (!sub) return true;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint);
    return true;
  } catch (err) {
    console.error('[push] unsubscribe failed', err);
    return false;
  }
};

const detectPlatform = (): string => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Mac/.test(ua)) return 'macos';
  if (/Windows/.test(ua)) return 'windows';
  if (/Linux/.test(ua)) return 'linux';
  return 'web';
};

export const isStandalone = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

export const isIOS = (): boolean => /iPhone|iPad|iPod/.test(navigator.userAgent);

export const showLocalTest = async (title = 'WhiteVault', body = 'Notificaciones activadas') => {
  if (Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  reg.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    vibrate: [60, 40, 60],
    tag: 'wv-test',
  } as NotificationOptions);
};
