import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

type RequestOptions = RequestInit & { auth?: boolean };

async function getToken() {
  const session = await AsyncStorage.getItem('userSession');
  if (!session) return null;
  try {
    const { token } = JSON.parse(session);
    return token as string | undefined;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth !== false;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as Record<string, string>;

  if (auth) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || 'Request failed';
    const errorMsgString = typeof message === 'object' ? JSON.stringify(message) : String(message);
    throw new Error(errorMsgString);
  }

  return data as T;
}
