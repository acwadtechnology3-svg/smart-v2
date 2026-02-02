import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

type SubscriptionHandler = (payload: any) => void;

type SubscribeParams =
  | { channel: 'driver:trip-requests' }
  | { channel: 'driver:offer-updates' }
  | { channel: 'driver:location'; tripId: string; driverId: string }
  | { channel: 'trip:offers'; tripId: string }
  | { channel: 'trip:status'; tripId: string }
  | { channel: 'trip:messages'; tripId: string };

type PendingSub = {
  handler: SubscriptionHandler;
  params: SubscribeParams;
};

class RealtimeClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, SubscriptionHandler>();
  private pending = new Map<string, PendingSub>();
  private connecting: Promise<void> | null = null;

  private getWsUrl() {
    const base = API_URL.replace(/^http/, 'ws').replace(/\/api$/, '');
    return `${base}/ws`;
  }

  private async getToken() {
    const session = await AsyncStorage.getItem('userSession');
    if (!session) return null;
    try {
      const { token } = JSON.parse(session);
      return token as string | undefined;
    } catch {
      return null;
    }
  }

  private async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.connecting) return this.connecting;

    this.connecting = new Promise<void>(async (resolve, reject) => {
      const ws = new WebSocket(this.getWsUrl());
      this.ws = ws;

      ws.onopen = async () => {
        const token = await this.getToken();
        if (token) {
          ws.send(JSON.stringify({ type: 'auth', token }));
        }

        for (const [subscriptionId, sub] of this.pending.entries()) {
          ws.send(JSON.stringify({ type: 'subscribe', subscriptionId, ...sub.params }));
        }

        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'event') {
            const handler = this.handlers.get(message.subscriptionId);
            if (handler) handler(message.payload);
          }
        } catch {
          // Ignore malformed payloads
        }
      };

      ws.onclose = () => {
        this.ws = null;
        this.connecting = null;
      };

      ws.onerror = () => {
        reject(new Error('Realtime connection failed'));
        this.ws = null;
        this.connecting = null;
      };
    });

    return this.connecting;
  }

  private generateId() {
    return `sub_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  }

  async subscribe(params: SubscribeParams, handler: SubscriptionHandler) {
    const subscriptionId = this.generateId();
    this.handlers.set(subscriptionId, handler);
    this.pending.set(subscriptionId, { handler, params });

    await this.connect();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', subscriptionId, ...params }));
    }

    return () => {
      this.handlers.delete(subscriptionId);
      this.pending.delete(subscriptionId);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'unsubscribe', subscriptionId }));
      }
    };
  }
}

export const realtimeClient = new RealtimeClient();
