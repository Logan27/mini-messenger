/**
 * Offline Message Queue Service
 *
 * Manages queuing of messages when offline and automatic sending when back online.
 * Uses IndexedDB for persistence across sessions.
 */

import { toast } from 'sonner';

interface QueuedMessage {
  id: string;
  type: 'message' | 'file' | 'reaction' | 'status';
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

class OfflineQueueService {
  private DB_NAME = 'messenger-offline-queue';
  private DB_VERSION = 1;
  private STORE_NAME = 'queued-items';
  private db: IDBDatabase | null = null;
  private isProcessing = false;
  private listeners: Array<(count: number) => void> = [];

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Offline queue database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const objectStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  /**
   * Add an item to the queue
   */
  async addToQueue(item: Omit<QueuedMessage, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const queuedItem: QueuedMessage = {
      ...item,
      id: this.generateId(),
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.add(queuedItem);

      request.onsuccess = () => {
        console.log('Item added to offline queue:', queuedItem);
        this.notifyListeners();
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to add item to queue:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all queued items
   */
  async getQueuedItems(): Promise<QueuedMessage[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to get queued items:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get count of queued items
   */
  async getQueueCount(): Promise<number> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to get queue count:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Remove an item from the queue
   */
  async removeFromQueue(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Item removed from queue:', id);
        this.notifyListeners();
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to remove item from queue:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update an item in the queue
   */
  async updateQueueItem(item: QueuedMessage): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to update queue item:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Process the queue - send all pending items
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;
    const items = await this.getQueuedItems();

    if (items.length === 0) {
      this.isProcessing = false;
      return;
    }

    console.log(`Processing ${items.length} queued items...`);
    toast.info(`Sending ${items.length} queued message${items.length > 1 ? 's' : ''}...`);

    // Sort by timestamp (oldest first)
    items.sort((a, b) => a.timestamp - b.timestamp);

    let successCount = 0;
    let failCount = 0;

    for (const item of items) {
      try {
        const success = await this.sendQueuedItem(item);

        if (success) {
          await this.removeFromQueue(item.id);
          successCount++;
        } else {
          // Increment retry count
          item.retries++;

          if (item.retries >= item.maxRetries) {
            // Max retries reached, remove from queue
            await this.removeFromQueue(item.id);
            failCount++;
            console.error('Max retries reached for item:', item.id);
          } else {
            // Update retry count
            await this.updateQueueItem(item);
          }
        }
      } catch (error) {
        console.error('Error processing queue item:', error);
        failCount++;
      }
    }

    this.isProcessing = false;

    // Show summary notification
    if (successCount > 0) {
      toast.success(`Successfully sent ${successCount} message${successCount > 1 ? 's' : ''}`);
    }

    if (failCount > 0) {
      toast.error(`Failed to send ${failCount} message${failCount > 1 ? 's' : ''}`);
    }

    this.notifyListeners();
  }

  /**
   * Send a single queued item
   */
  private async sendQueuedItem(item: QueuedMessage): Promise<boolean> {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${API_BASE_URL}${item.endpoint}`, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(item.data),
      });

      if (response.ok) {
        console.log('Successfully sent queued item:', item.id);
        return true;
      } else {
        console.error('Failed to send queued item:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error sending queued item:', error);
      return false;
    }
  }

  /**
   * Clear all items from the queue
   */
  async clearQueue(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Queue cleared');
        this.notifyListeners();
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear queue:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Subscribe to queue count changes
   */
  subscribe(callback: (count: number) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of queue changes
   */
  private async notifyListeners(): Promise<void> {
    const count = await this.getQueueCount();
    this.listeners.forEach(callback => callback(count));
  }

  /**
   * Generate a unique ID for queue items
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start listening for online events to process queue
   */
  startAutoProcessing(): void {
    window.addEventListener('online', () => {
      console.log('Connection restored, processing queue...');
      this.processQueue();
    });

    // Also try to process on initialization if online
    if (navigator.onLine) {
      setTimeout(() => this.processQueue(), 1000);
    }
  }
}

// Export singleton instance
export const offlineQueueService = new OfflineQueueService();

// Auto-initialize and start processing
offlineQueueService.init().then(() => {
  offlineQueueService.startAutoProcessing();
});

export default offlineQueueService;
