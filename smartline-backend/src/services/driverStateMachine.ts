import redis from '../config/redis';

export enum DriverState {
  OFFLINE = 'OFFLINE',
  ONLINE_AVAILABLE = 'ONLINE_AVAILABLE',
  ONLINE_OFFERED = 'ONLINE_OFFERED',
  ONLINE_BUSY = 'ONLINE_BUSY',
  ONLINE_COOLDOWN = 'ONLINE_COOLDOWN',
}

export interface StateTransition {
  from: DriverState;
  to: DriverState;
  timestamp: string;
  metadata?: any;
}

/**
 * Driver State Machine - Manages driver state transitions
 * Ensures valid state progression through trip lifecycle
 */
export class DriverStateMachineService {
  private readonly STATE_KEY_PREFIX = 'driver:';
  private readonly STATE_KEY_SUFFIX = ':state';
  private readonly STATE_TTL = 86400; // 24 hours

  // Valid state transitions
  private readonly VALID_TRANSITIONS: Map<DriverState, DriverState[]> = new Map([
    [
      DriverState.OFFLINE,
      [DriverState.ONLINE_AVAILABLE],
    ],
    [
      DriverState.ONLINE_AVAILABLE,
      [DriverState.OFFLINE, DriverState.ONLINE_OFFERED, DriverState.ONLINE_BUSY],
    ],
    [
      DriverState.ONLINE_OFFERED,
      [DriverState.ONLINE_AVAILABLE, DriverState.ONLINE_BUSY, DriverState.OFFLINE],
    ],
    [
      DriverState.ONLINE_BUSY,
      [DriverState.ONLINE_COOLDOWN, DriverState.OFFLINE],
    ],
    [
      DriverState.ONLINE_COOLDOWN,
      [DriverState.ONLINE_AVAILABLE, DriverState.OFFLINE],
    ],
  ]);

  /**
   * Get current state of driver
   */
  async getState(driverId: string): Promise<DriverState> {
    try {
      const key = this.getStateKey(driverId);
      const state = await redis.get(key);

      if (!state) {
        return DriverState.OFFLINE;
      }

      return state as DriverState;
    } catch (error) {
      console.error('Error getting driver state:', error);
      return DriverState.OFFLINE;
    }
  }

  /**
   * Transition driver to new state
   */
  async transition(
    driverId: string,
    toState: DriverState,
    metadata?: any
  ): Promise<boolean> {
    try {
      const currentState = await this.getState(driverId);

      // Validate transition
      if (!this.isValidTransition(currentState, toState)) {
        console.warn(
          `Invalid state transition for driver ${driverId}: ${currentState} -> ${toState}`
        );
        return false;
      }

      // Execute transition
      const key = this.getStateKey(driverId);
      await redis.setex(key, this.STATE_TTL, toState);

      // Log transition for audit
      await this.logTransition(driverId, {
        from: currentState,
        to: toState,
        timestamp: new Date().toISOString(),
        metadata,
      });

      console.log(`Driver ${driverId} transitioned: ${currentState} -> ${toState}`);
      return true;
    } catch (error) {
      console.error('Error transitioning driver state:', error);
      return false;
    }
  }

  /**
   * Check if transition is valid
   */
  private isValidTransition(from: DriverState, to: DriverState): boolean {
    // Same state is always valid
    if (from === to) {
      return true;
    }

    const validTransitions = this.VALID_TRANSITIONS.get(from);
    return validTransitions ? validTransitions.includes(to) : false;
  }

  /**
   * Driver goes online
   */
  async goOnline(driverId: string): Promise<boolean> {
    return await this.transition(driverId, DriverState.ONLINE_AVAILABLE);
  }

  /**
   * Driver goes offline
   */
  async goOffline(driverId: string): Promise<boolean> {
    return await this.transition(driverId, DriverState.OFFLINE);
  }

  /**
   * Driver receives trip offer
   */
  async receiveOffer(driverId: string, tripId: string): Promise<boolean> {
    return await this.transition(driverId, DriverState.ONLINE_OFFERED, {
      tripId,
    });
  }

  /**
   * Driver accepts trip (becomes busy)
   */
  async acceptTrip(driverId: string, tripId: string): Promise<boolean> {
    return await this.transition(driverId, DriverState.ONLINE_BUSY, { tripId });
  }

  /**
   * Driver declines offer (back to available)
   */
  async declineOffer(driverId: string): Promise<boolean> {
    return await this.transition(driverId, DriverState.ONLINE_AVAILABLE);
  }

  /**
   * Trip completed, driver enters cooldown
   */
  async completeTripCooldown(
    driverId: string,
    cooldownSeconds: number = 60
  ): Promise<boolean> {
    const transitioned = await this.transition(
      driverId,
      DriverState.ONLINE_COOLDOWN,
      { cooldownSeconds }
    );

    if (transitioned) {
      // Schedule automatic transition back to available
      setTimeout(async () => {
        const currentState = await this.getState(driverId);
        if (currentState === DriverState.ONLINE_COOLDOWN) {
          await this.transition(driverId, DriverState.ONLINE_AVAILABLE);
        }
      }, cooldownSeconds * 1000);
    }

    return transitioned;
  }

  /**
   * End cooldown early (manual)
   */
  async endCooldown(driverId: string): Promise<boolean> {
    const currentState = await this.getState(driverId);
    if (currentState === DriverState.ONLINE_COOLDOWN) {
      return await this.transition(driverId, DriverState.ONLINE_AVAILABLE);
    }
    return false;
  }

  /**
   * Check if driver can accept trips
   */
  async canAcceptTrips(driverId: string): Promise<boolean> {
    const state = await this.getState(driverId);
    return state === DriverState.ONLINE_AVAILABLE;
  }

  /**
   * Check if driver is on active trip
   */
  async isOnActiveTrip(driverId: string): Promise<boolean> {
    const state = await this.getState(driverId);
    return state === DriverState.ONLINE_BUSY;
  }

  /**
   * Log state transition for audit
   */
  private async logTransition(
    driverId: string,
    transition: StateTransition
  ): Promise<void> {
    try {
      const logKey = `driver:${driverId}:state_history`;
      const logEntry = JSON.stringify(transition);

      // Store in Redis list (keep last 100 transitions)
      await redis.lpush(logKey, logEntry);
      await redis.ltrim(logKey, 0, 99); // Keep only last 100
      await redis.expire(logKey, 86400 * 7); // 7 days retention
    } catch (error) {
      console.error('Error logging state transition:', error);
    }
  }

  /**
   * Get state transition history
   */
  async getStateHistory(
    driverId: string,
    limit: number = 10
  ): Promise<StateTransition[]> {
    try {
      const logKey = `driver:${driverId}:state_history`;
      const entries = await redis.lrange(logKey, 0, limit - 1);

      return entries.map((entry) => JSON.parse(entry));
    } catch (error) {
      console.error('Error getting state history:', error);
      return [];
    }
  }

  /**
   * Get all drivers in a specific state
   */
  async getDriversInState(state: DriverState): Promise<string[]> {
    try {
      const pattern = `${this.STATE_KEY_PREFIX}*${this.STATE_KEY_SUFFIX}`;
      const keys = await redis.keys(pattern);

      const driversInState: string[] = [];

      for (const key of keys) {
        const driverState = await redis.get(key);
        if (driverState === state) {
          const driverId = key
            .replace(this.STATE_KEY_PREFIX, '')
            .replace(this.STATE_KEY_SUFFIX, '');
          driversInState.push(driverId);
        }
      }

      return driversInState;
    } catch (error) {
      console.error('Error getting drivers in state:', error);
      return [];
    }
  }

  /**
   * Get state statistics
   */
  async getStateStatistics(): Promise<Record<DriverState, number>> {
    const stats: Record<DriverState, number> = {
      [DriverState.OFFLINE]: 0,
      [DriverState.ONLINE_AVAILABLE]: 0,
      [DriverState.ONLINE_OFFERED]: 0,
      [DriverState.ONLINE_BUSY]: 0,
      [DriverState.ONLINE_COOLDOWN]: 0,
    };

    try {
      const pattern = `${this.STATE_KEY_PREFIX}*${this.STATE_KEY_SUFFIX}`;
      const keys = await redis.keys(pattern);

      for (const key of keys) {
        const state = await redis.get(key);
        if (state && state in stats) {
          stats[state as DriverState]++;
        }
      }
    } catch (error) {
      console.error('Error getting state statistics:', error);
    }

    return stats;
  }

  /**
   * Force state reset (for recovery/testing)
   */
  async forceState(driverId: string, state: DriverState): Promise<void> {
    const key = this.getStateKey(driverId);
    await redis.setex(key, this.STATE_TTL, state);
    console.warn(`Force set driver ${driverId} to state ${state}`);
  }

  /**
   * Clear driver state
   */
  async clearState(driverId: string): Promise<void> {
    const key = this.getStateKey(driverId);
    await redis.del(key);
  }

  /**
   * Get state key for driver
   */
  private getStateKey(driverId: string): string {
    return `${this.STATE_KEY_PREFIX}${driverId}${this.STATE_KEY_SUFFIX}`;
  }
}

// Export singleton instance
export const driverStateMachine = new DriverStateMachineService();
