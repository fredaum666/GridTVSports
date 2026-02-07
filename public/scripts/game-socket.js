/**
 * GameSocket - Real-time game updates via Socket.io
 * Manages subscriptions and provides push updates to the UI
 */
class GameSocket {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.subscribedSports = new Set();
    this.handlers = new Map(); // sport -> callback functions
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.fallbackPollingInterval = null;
    this.connectionPromise = null;
  }

  /**
   * Initialize Socket.io connection
   * @returns {Promise} Resolves when connected
   */
  connect() {
    // Return existing promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Already connected
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      this.socket = io({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      this.socket.on('connect', () => {
        console.log('[GameSocket] Connected:', this.socket.id);
        this.connected = true;
        this.reconnectAttempts = 0;
        this.stopFallbackPolling();

        // Re-subscribe to previously subscribed sports
        if (this.subscribedSports.size > 0) {
          this._resubscribe();
        }

        this.connectionPromise = null;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('[GameSocket] Disconnected:', reason);
        this.connected = false;

        // Start fallback polling if disconnected unexpectedly
        if (reason !== 'io client disconnect') {
          this.startFallbackPolling();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('[GameSocket] Connection error:', error.message);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.warn('[GameSocket] Max reconnect attempts, falling back to polling');
          this.startFallbackPolling();
          this.connectionPromise = null;
          reject(new Error('Max reconnect attempts reached'));
        }
      });

      // Handle game updates from server
      this.socket.on('games:update', (payload) => {
        const { sport, cacheKey, data, timestamp } = payload;
        console.log(`[GameSocket] Update received: ${sport}/${cacheKey}`);

        // Call registered handlers for this sport
        const sportHandlers = this.handlers.get(sport) || [];
        sportHandlers.forEach(handler => {
          try {
            handler(data, cacheKey, timestamp);
          } catch (e) {
            console.error('[GameSocket] Handler error:', e);
          }
        });

        // Also call 'all' handlers
        const allHandlers = this.handlers.get('all') || [];
        allHandlers.forEach(handler => {
          try {
            handler(sport, data, cacheKey, timestamp);
          } catch (e) {
            console.error('[GameSocket] Handler error:', e);
          }
        });
      });
    });

    return this.connectionPromise;
  }

  /**
   * Internal re-subscription after reconnect
   */
  _resubscribe() {
    const sports = [...this.subscribedSports];
    if (sports.length === 0) return;

    this.socket.emit('games:subscribe', { sports }, (response) => {
      if (response?.success) {
        console.log('[GameSocket] Re-subscribed to:', sports);

        // Request current data to catch up on missed updates
        this.requestCurrentData(sports).then(data => {
          if (data) {
            Object.entries(data).forEach(([sport, cacheData]) => {
              Object.entries(cacheData).forEach(([cacheKey, scoreboardData]) => {
                // Trigger handlers with current data
                const sportHandlers = this.handlers.get(sport) || [];
                sportHandlers.forEach(handler => {
                  try {
                    handler(scoreboardData, cacheKey, Date.now());
                  } catch (e) {
                    console.error('[GameSocket] Handler error:', e);
                  }
                });

                const allHandlers = this.handlers.get('all') || [];
                allHandlers.forEach(handler => {
                  try {
                    handler(sport, scoreboardData, cacheKey, Date.now());
                  } catch (e) {
                    console.error('[GameSocket] Handler error:', e);
                  }
                });
              });
            });
          }
        });
      }
    });
  }

  /**
   * Subscribe to updates for specific sports
   * @param {string[]} sports - Array of sport names
   * @returns {Promise}
   */
  subscribe(sports) {
    // Always track what we want to subscribe to
    sports.forEach(s => this.subscribedSports.add(s));

    if (!this.socket?.connected) {
      // Will subscribe when connected
      return Promise.resolve({ success: true, queued: true });
    }

    return new Promise((resolve) => {
      this.socket.emit('games:subscribe', { sports }, (response) => {
        if (response?.success) {
          console.log('[GameSocket] Subscribed to:', sports);
        }
        resolve(response);
      });
    });
  }

  /**
   * Unsubscribe from specific sports
   * @param {string[]} sports - Array of sport names
   * @returns {Promise}
   */
  unsubscribe(sports) {
    sports.forEach(s => this.subscribedSports.delete(s));

    if (!this.socket?.connected) {
      return Promise.resolve({ success: true });
    }

    return new Promise((resolve) => {
      this.socket.emit('games:unsubscribe', { sports }, (response) => {
        console.log('[GameSocket] Unsubscribed from:', sports);
        resolve(response);
      });
    });
  }

  /**
   * Register a handler for sport updates
   * @param {string} sport - Sport name or 'all' for all sports
   * @param {Function} handler - Callback function
   *   For specific sport: handler(data, cacheKey, timestamp)
   *   For 'all': handler(sport, data, cacheKey, timestamp)
   */
  onUpdate(sport, handler) {
    if (!this.handlers.has(sport)) {
      this.handlers.set(sport, []);
    }
    this.handlers.get(sport).push(handler);
  }

  /**
   * Remove a handler
   * @param {string} sport - Sport name or 'all'
   * @param {Function} handler - The handler to remove
   */
  offUpdate(sport, handler) {
    const handlers = this.handlers.get(sport);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Request current data immediately (for reconnection scenarios)
   * @param {string[]} sports - Array of sport names
   * @returns {Promise}
   */
  requestCurrentData(sports) {
    if (!this.socket?.connected) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      this.socket.emit('games:request-current', { sports }, (response) => {
        resolve(response?.success ? response.data : null);
      });
    });
  }

  /**
   * Fallback polling when Socket.io fails
   */
  startFallbackPolling() {
    if (this.fallbackPollingInterval) return;

    console.log('[GameSocket] Starting fallback polling (60s interval)');
    this.fallbackPollingInterval = setInterval(() => {
      // Trigger custom event for pages to handle
      const event = new CustomEvent('gamesocket:fallback-poll', {
        detail: { sports: [...this.subscribedSports] }
      });
      window.dispatchEvent(event);
    }, 60000); // 60 second fallback (slower than previous polling)
  }

  /**
   * Stop fallback polling
   */
  stopFallbackPolling() {
    if (this.fallbackPollingInterval) {
      clearInterval(this.fallbackPollingInterval);
      this.fallbackPollingInterval = null;
      console.log('[GameSocket] Stopped fallback polling');
    }
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.stopFallbackPolling();
    this.socket?.disconnect();
    this.connected = false;
    this.subscribedSports.clear();
    this.handlers.clear();
    this.connectionPromise = null;
  }
}

// Global singleton instance
window.gameSocket = new GameSocket();
