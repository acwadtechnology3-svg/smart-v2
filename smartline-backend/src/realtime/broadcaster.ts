import { WebSocket } from 'ws';

interface ConnectedDriver {
  ws: WebSocket;
  userId: string;
  subscriptionIds: Set<string>;
}

// Store connected drivers
const connectedDrivers = new Map<string, ConnectedDriver>();

export function registerDriver(userId: string, ws: WebSocket, subscriptionId: string) {
  const existing = connectedDrivers.get(userId);
  if (existing) {
    existing.subscriptionIds.add(subscriptionId);
  } else {
    connectedDrivers.set(userId, {
      ws,
      userId,
      subscriptionIds: new Set([subscriptionId]),
    });
  }
  console.log(`[Broadcaster] Driver ${userId} registered. Total: ${connectedDrivers.size}`);
}

export function unregisterDriver(userId: string, subscriptionId: string) {
  const driver = connectedDrivers.get(userId);
  if (driver) {
    driver.subscriptionIds.delete(subscriptionId);
    if (driver.subscriptionIds.size === 0) {
      connectedDrivers.delete(userId);
      console.log(`[Broadcaster] Driver ${userId} unregistered. Total: ${connectedDrivers.size}`);
    }
  }
}

export function broadcastToDrivers(event: string, payload: any) {
  console.log(`[Broadcaster] Broadcasting ${event} to ${connectedDrivers.size} drivers`);

  let sentCount = 0;
  for (const driver of connectedDrivers.values()) {
    if (driver.ws.readyState === WebSocket.OPEN) {
      for (const subscriptionId of driver.subscriptionIds) {
        driver.ws.send(JSON.stringify({
          type: 'event',
          subscriptionId,
          payload: { new: payload, event },
        }));
        sentCount++;
      }
    }
  }

  console.log(`[Broadcaster] Sent to ${sentCount} subscriptions`);
}

export function getConnectedDriversCount() {
  return connectedDrivers.size;
}
