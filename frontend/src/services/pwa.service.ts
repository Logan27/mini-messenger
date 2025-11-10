/**
 * PWA Service
 *
 * Handles service worker registration and PWA installation prompts
 */

import { useRegisterSW } from 'virtual:pwa-register/react';

export interface PWAInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class PWAService {
  private deferredPrompt: PWAInstallPromptEvent | null = null;
  private installListeners: Array<(canInstall: boolean) => void> = [];

  constructor() {
    this.initInstallPrompt();
  }

  /**
   * Initialize the install prompt listener
   */
  private initInstallPrompt(): void {
    if (typeof window === 'undefined') return;

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      // Store the event so it can be triggered later
      this.deferredPrompt = e as PWAInstallPromptEvent;

      // Notify listeners that app can be installed
      this.notifyInstallListeners(true);

      console.log('PWA: Install prompt available');
    });

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA: App installed successfully');
      this.deferredPrompt = null;
      this.notifyInstallListeners(false);
    });
  }

  /**
   * Check if app can be installed
   */
  canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  /**
   * Check if app is already installed
   */
  isInstalled(): boolean {
    // Check if running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // Check for iOS standalone mode
    if ((window.navigator as any).standalone === true) {
      return true;
    }

    return false;
  }

  /**
   * Show the install prompt
   */
  async showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) {
      return 'unavailable';
    }

    try {
      // Show the install prompt
      await this.deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await this.deferredPrompt.userChoice;

      console.log(`PWA: User response - ${outcome}`);

      // Clear the prompt
      this.deferredPrompt = null;
      this.notifyInstallListeners(false);

      return outcome;
    } catch (error) {
      console.error('PWA: Error showing install prompt:', error);
      return 'unavailable';
    }
  }

  /**
   * Subscribe to install availability changes
   */
  subscribeToInstallPrompt(callback: (canInstall: boolean) => void): () => void {
    this.installListeners.push(callback);

    // Immediately call with current state
    callback(this.canInstall());

    // Return unsubscribe function
    return () => {
      this.installListeners = this.installListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of install availability changes
   */
  private notifyInstallListeners(canInstall: boolean): void {
    this.installListeners.forEach(callback => callback(canInstall));
  }

  /**
   * Get PWA display mode
   */
  getDisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      return 'fullscreen';
    }
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return 'standalone';
    }
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return 'minimal-ui';
    }
    return 'browser';
  }
}

// Export singleton instance
export const pwaService = new PWAService();

// Export hook for service worker registration
export const usePWARegistration = () => {
  return useRegisterSW({
    onRegistered(registration) {
      console.log('PWA: Service Worker registered:', registration);
    },
    onRegisterError(error) {
      console.error('PWA: Service Worker registration error:', error);
    },
    onOfflineReady() {
      console.log('PWA: App ready to work offline');
    },
    onNeedRefresh() {
      console.log('PWA: New content available, please refresh');
    },
  });
};

export default pwaService;
