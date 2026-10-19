import Constants from 'expo-constants';
import * as Device from 'expo-device';

export type ApiError = {
  error: string;
};

export function getApiBaseUrl() {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (!env) return undefined;

  // If someone left 127.0.0.1 in env, physical phones can't reach the Mac backend.
  // Auto-fix by using the Expo dev server host (e.g. "192.168.1.148:8081") and backend port 3001.
  if (Device.isDevice && /:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(env)) {
    const hostUri: string | undefined =
      // SDK 54: exposed via expoConfig in many setups
      (Constants.expoConfig as any)?.hostUri ??
      // older manifest forms (kept as fallbacks)
      (Constants as any)?.manifest?.hostUri ??
      (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;

    const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : null;
    if (host) return `http://${host}:3001`;
  }

  return env;
}

export async function apiFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error('API link not set.');
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    // If backend responds with HTML (e.g. wrong host/port), surface useful debugging info.
    const snippet = String(text ?? '').slice(0, 140);
    const msg = `Non-JSON response (${res.status}) from ${url}: ${snippet}`;
    throw new Error(msg);
  }
  if (!res.ok) {
    const msg = (data as ApiError | null)?.error ?? 'Request failed';
    throw new Error(msg);
  }
  return data as T;
}


