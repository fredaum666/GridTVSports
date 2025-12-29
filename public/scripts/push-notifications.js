// GridTV Sports - Push Notifications Module
// Handles service worker registration and push subscription management

const PushNotifications = {
  swRegistration: null,
  isSupported: false,
  isSubscribed: false,

  // Initialize push notifications
  async init() {
    // Check if push notifications are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] Push notifications not supported in this browser');
      return false;
    }

    this.isSupported = true;

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('[Push] Service worker registered');

      // Check current subscription status
      const subscription = await this.swRegistration.pushManager.getSubscription();
      this.isSubscribed = subscription !== null;

      // Update UI if needed
      this.updateUI();

      return true;
    } catch (error) {
      console.error('[Push] Failed to initialize:', error);
      return false;
    }
  },

  // Get VAPID public key from server
  async getVapidPublicKey() {
    try {
      const response = await fetch('/api/push/vapid-public-key');
      if (!response.ok) {
        throw new Error('Push notifications not configured on server');
      }
      const data = await response.json();
      return data.publicKey;
    } catch (error) {
      console.error('[Push] Failed to get VAPID key:', error);
      return null;
    }
  },

  // Subscribe to push notifications
  async subscribe() {
    if (!this.isSupported || !this.swRegistration) {
      console.log('[Push] Not supported or not initialized');
      return { success: false, error: 'Push notifications not supported' };
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, error: 'Notification permission denied' };
      }

      // Get VAPID public key
      const vapidPublicKey = await this.getVapidPublicKey();
      if (!vapidPublicKey) {
        return { success: false, error: 'Push notifications not configured' };
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push manager
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription on server');
      }

      this.isSubscribed = true;
      this.updateUI();

      console.log('[Push] Successfully subscribed to push notifications');
      return { success: true };
    } catch (error) {
      console.error('[Push] Failed to subscribe:', error);
      return { success: false, error: error.message };
    }
  },

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (!this.swRegistration) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        // Notify server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        // Unsubscribe from push manager
        await subscription.unsubscribe();
      }

      this.isSubscribed = false;
      this.updateUI();

      console.log('[Push] Successfully unsubscribed from push notifications');
      return { success: true };
    } catch (error) {
      console.error('[Push] Failed to unsubscribe:', error);
      return { success: false, error: error.message };
    }
  },

  // Get current subscription status
  async getStatus() {
    try {
      const response = await fetch('/api/push/status');
      if (!response.ok) {
        return { configured: false, subscribed: false };
      }
      return await response.json();
    } catch (error) {
      console.error('[Push] Failed to get status:', error);
      return { configured: false, subscribed: false };
    }
  },

  // Get notification preferences
  async getPreferences() {
    try {
      const response = await fetch('/api/push/preferences');
      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }
      return await response.json();
    } catch (error) {
      console.error('[Push] Failed to get preferences:', error);
      return null;
    }
  },

  // Update notification preferences
  async updatePreferences(preferences) {
    try {
      const response = await fetch('/api/push/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      return { success: true };
    } catch (error) {
      console.error('[Push] Failed to update preferences:', error);
      return { success: false, error: error.message };
    }
  },

  // Send test notification
  async sendTestNotification() {
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send test notification');
      }

      return result;
    } catch (error) {
      console.error('[Push] Failed to send test notification:', error);
      return { success: false, error: error.message };
    }
  },

  // Update UI elements (if any exist on the page)
  updateUI() {
    const subscribeBtn = document.getElementById('push-subscribe-btn');
    const unsubscribeBtn = document.getElementById('push-unsubscribe-btn');
    const statusEl = document.getElementById('push-status');

    if (subscribeBtn) {
      subscribeBtn.style.display = this.isSubscribed ? 'none' : 'inline-block';
    }
    if (unsubscribeBtn) {
      unsubscribeBtn.style.display = this.isSubscribed ? 'inline-block' : 'none';
    }
    if (statusEl) {
      statusEl.textContent = this.isSubscribed ? 'Subscribed' : 'Not subscribed';
      statusEl.className = this.isSubscribed ? 'status-active' : 'status-inactive';
    }
  },

  // Helper: Convert base64 string to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
};

// Note: Don't auto-initialize - let the page decide when to init
// This avoids errors on pages where push isn't needed or user isn't logged in
// Call PushNotifications.init() manually from pages that need it (e.g., favorites.html)

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PushNotifications;
}
