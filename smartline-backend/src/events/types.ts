/**
 * Domain Event Types for SmartLine
 * Following event sourcing pattern
 */

// Base event interface
export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// ===== Trip Events =====

export interface TripRequestedEvent extends DomainEvent {
  eventType: 'TRIP_REQUESTED';
  aggregateType: 'Trip';
  data: {
    tripId: string;
    customerId: string;
    pickupLat: number;
    pickupLng: number;
    destLat: number;
    destLng: number;
    pickupAddress: string;
    destAddress: string;
    vehicleType: string;
    paymentMethod: string;
    estimatedPrice: number;
  };
}

export interface TripMatchedEvent extends DomainEvent {
  eventType: 'TRIP_MATCHED';
  aggregateType: 'Trip';
  data: {
    tripId: string;
    customerId: string;
    driverId: string;
    matchedAt: string;
    estimatedArrival: number; // seconds
    driverLocation: {
      lat: number;
      lng: number;
    };
  };
}

export interface TripDriverArrivedEvent extends DomainEvent {
  eventType: 'TRIP_DRIVER_ARRIVED';
  aggregateType: 'Trip';
  data: {
    tripId: string;
    driverId: string;
    arrivedAt: string;
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface TripStartedEvent extends DomainEvent {
  eventType: 'TRIP_STARTED';
  aggregateType: 'Trip';
  data: {
    tripId: string;
    driverId: string;
    customerId: string;
    startedAt: string;
    startLocation: {
      lat: number;
      lng: number;
    };
  };
}

export interface TripCompletedEvent extends DomainEvent {
  eventType: 'TRIP_COMPLETED';
  aggregateType: 'Trip';
  data: {
    tripId: string;
    driverId: string;
    customerId: string;
    completedAt: string;
    finalPrice: number;
    distance: number;
    duration: number; // seconds
    paymentMethod: string;
  };
}

export interface TripCancelledEvent extends DomainEvent {
  eventType: 'TRIP_CANCELLED';
  aggregateType: 'Trip';
  data: {
    tripId: string;
    cancelledBy: 'customer' | 'driver' | 'system';
    reason?: string;
    cancelledAt: string;
    cancellationFee?: number;
  };
}

// ===== Driver Events =====

export interface DriverOnlineEvent extends DomainEvent {
  eventType: 'DRIVER_ONLINE';
  aggregateType: 'Driver';
  data: {
    driverId: string;
    location: {
      lat: number;
      lng: number;
    };
    vehicleType: string;
    timestamp: string;
  };
}

export interface DriverOfflineEvent extends DomainEvent {
  eventType: 'DRIVER_OFFLINE';
  aggregateType: 'Driver';
  data: {
    driverId: string;
    timestamp: string;
    reason?: string;
  };
}

export interface DriverLocationUpdatedEvent extends DomainEvent {
  eventType: 'DRIVER_LOCATION_UPDATED';
  aggregateType: 'Driver';
  data: {
    driverId: string;
    location: {
      lat: number;
      lng: number;
    };
    heading?: number;
    speed?: number;
    timestamp: string;
  };
}

// ===== Payment Events =====

export interface PaymentInitiatedEvent extends DomainEvent {
  eventType: 'PAYMENT_INITIATED';
  aggregateType: 'Payment';
  data: {
    paymentId: string;
    userId: string;
    amount: number;
    method: 'card' | 'wallet' | 'cash';
    orderId: string;
  };
}

export interface PaymentCompletedEvent extends DomainEvent {
  eventType: 'PAYMENT_COMPLETED';
  aggregateType: 'Payment';
  data: {
    paymentId: string;
    userId: string;
    amount: number;
    transactionId: string;
    completedAt: string;
  };
}

export interface PaymentFailedEvent extends DomainEvent {
  eventType: 'PAYMENT_FAILED';
  aggregateType: 'Payment';
  data: {
    paymentId: string;
    userId: string;
    amount: number;
    error: string;
    failedAt: string;
  };
}

// ===== Wallet Events =====

export interface WalletCreditedEvent extends DomainEvent {
  eventType: 'WALLET_CREDITED';
  aggregateType: 'Wallet';
  data: {
    walletId: string;
    userId: string;
    amount: number;
    source: 'deposit' | 'trip_earnings' | 'refund';
    transactionId: string;
    newBalance: number;
  };
}

export interface WalletDebitedEvent extends DomainEvent {
  eventType: 'WALLET_DEBITED';
  aggregateType: 'Wallet';
  data: {
    walletId: string;
    userId: string;
    amount: number;
    reason: 'trip_payment' | 'withdrawal' | 'platform_fee';
    transactionId: string;
    newBalance: number;
  };
}

// ===== Notification Events =====

export interface NotificationEvent extends DomainEvent {
  eventType: 'NOTIFICATION';
  aggregateType: 'Notification';
  data: {
    recipientId: string;
    type: 'push' | 'sms' | 'email';
    title?: string;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    data?: Record<string, any>;
  };
}

// ===== Union Type for All Events =====

export type SmartLineEvent =
  | TripRequestedEvent
  | TripMatchedEvent
  | TripDriverArrivedEvent
  | TripStartedEvent
  | TripCompletedEvent
  | TripCancelledEvent
  | DriverOnlineEvent
  | DriverOfflineEvent
  | DriverLocationUpdatedEvent
  | PaymentInitiatedEvent
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | WalletCreditedEvent
  | WalletDebitedEvent
  | NotificationEvent;

// Event type registry for type checking
export const EVENT_TYPES = {
  // Trip events
  TRIP_REQUESTED: 'TRIP_REQUESTED',
  TRIP_MATCHED: 'TRIP_MATCHED',
  TRIP_DRIVER_ARRIVED: 'TRIP_DRIVER_ARRIVED',
  TRIP_STARTED: 'TRIP_STARTED',
  TRIP_COMPLETED: 'TRIP_COMPLETED',
  TRIP_CANCELLED: 'TRIP_CANCELLED',

  // Driver events
  DRIVER_ONLINE: 'DRIVER_ONLINE',
  DRIVER_OFFLINE: 'DRIVER_OFFLINE',
  DRIVER_LOCATION_UPDATED: 'DRIVER_LOCATION_UPDATED',

  // Payment events
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',

  // Wallet events
  WALLET_CREDITED: 'WALLET_CREDITED',
  WALLET_DEBITED: 'WALLET_DEBITED',

  // Notification events
  NOTIFICATION: 'NOTIFICATION',
} as const;
