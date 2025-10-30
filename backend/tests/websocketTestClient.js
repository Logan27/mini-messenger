import { io, Socket } from 'socket.io-client';

/**
 * WebSocket test client for testing real-time messaging features
 */
export class WebSocketTestClient {
  constructor(serverUrl = 'http://localhost:3000', options = {}) {
    this.serverUrl = serverUrl;
    this.options = {
      autoConnect: false,
      forceNew: true,
      ...options,
    };

    this.socket = null;
    this.connected = false;
    this.events = [];
    this.messages = [];
    this.authToken = null;
    this.userId = null;
  }

  /**
   * Connect to WebSocket server with authentication
   */
  async connect(userId, authToken) {
    this.userId = userId;
    this.authToken = authToken;

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          ...this.options,
          auth: {
            token: authToken,
          },
          query: {
            userId: userId,
          },
        });

        this.socket.on('connect', () => {
          this.connected = true;
          console.log(`WebSocket client connected for user ${userId}`);
          resolve(this);
        });

        this.socket.on('connect_error', (error) => {
          console.error(`WebSocket connection error for user ${userId}:`, error);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          this.connected = false;
          console.log(`WebSocket client disconnected for user ${userId}: ${reason}`);
        });

        // Listen for all events for testing
        this.socket.onAny((eventName, ...args) => {
          const event = {
            name: eventName,
            data: args,
            timestamp: new Date(),
          };
          this.events.push(event);

          if (eventName === 'message' || eventName === 'group_message') {
            this.messages.push(event);
          }
        });

        this.socket.connect();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }

  /**
   * Wait for a specific event
   */
  async waitForEvent(eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkEvents = () => {
        const event = this.events.find(e => e.name === eventName);
        if (event) {
          resolve(event);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for event: ${eventName}`));
        } else {
          setTimeout(checkEvents, 100);
        }
      };

      checkEvents();
    });
  }

  /**
   * Wait for a message event
   */
  async waitForMessage(timeout = 5000) {
    return this.waitForEvent('message', timeout);
  }

  /**
   * Wait for a group message event
   */
  async waitForGroupMessage(timeout = 5000) {
    return this.waitForEvent('group_message', timeout);
  }

  /**
   * Send a message via WebSocket
   */
  async sendMessage(recipientId, content, options = {}) {
    if (!this.connected) {
      throw new Error('WebSocket client not connected');
    }

    const messageData = {
      recipientId,
      content,
      messageType: 'text',
      ...options,
    };

    this.socket.emit('send_message', messageData);
  }

  /**
   * Send a group message via WebSocket
   */
  async sendGroupMessage(groupId, content, options = {}) {
    if (!this.connected) {
      throw new Error('WebSocket client not connected');
    }

    const messageData = {
      groupId,
      content,
      messageType: 'text',
      ...options,
    };

    this.socket.emit('send_group_message', messageData);
  }

  /**
   * Join a group
   */
  async joinGroup(groupId) {
    if (!this.connected) {
      throw new Error('WebSocket client not connected');
    }

    this.socket.emit('join_group', { groupId });
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId) {
    if (!this.connected) {
      throw new Error('WebSocket client not connected');
    }

    this.socket.emit('leave_group', { groupId });
  }

  /**
   * Get received events
   */
  getEvents() {
    return this.events;
  }

  /**
   * Get received messages
   */
  getMessages() {
    return this.messages;
  }

  /**
   * Clear events and messages
   */
  clear() {
    this.events = [];
    this.messages = [];
  }

  /**
   * Check if client is connected
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get client info for debugging
   */
  getInfo() {
    return {
      userId: this.userId,
      connected: this.connected,
      eventCount: this.events.length,
      messageCount: this.messages.length,
    };
  }
}

/**
 * WebSocket test manager for handling multiple clients
 */
export class WebSocketTestManager {
  constructor(serverUrl = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
    this.clients = new Map();
  }

  /**
   * Create a new WebSocket client for a user
   */
  async createClient(userId, authToken) {
    const client = new WebSocketTestClient(this.serverUrl);
    await client.connect(userId, authToken);
    this.clients.set(userId, client);
    return client;
  }

  /**
   * Get client for a user
   */
  getClient(userId) {
    return this.clients.get(userId);
  }

  /**
   * Remove and disconnect a client
   */
  removeClient(userId) {
    const client = this.clients.get(userId);
    if (client) {
      client.disconnect();
      this.clients.delete(userId);
    }
  }

  /**
   * Connect multiple users as WebSocket clients
   */
  async connectUsers(users) {
    const clients = [];

    for (const user of users) {
      // Get auth token for user
      const authData = await this.getAuthToken(user);
      const client = await this.createClient(user.id, authData.token);
      clients.push(client);
    }

    return clients;
  }

  /**
   * Get authentication token for a user (mock implementation)
   */
  async getAuthToken(user) {
    // In real implementation, this would authenticate the user and return a token
    // For testing, we'll use a mock token
    return {
      token: `mock-jwt-token-${user.id}`,
      user,
    };
  }

  /**
   * Disconnect all clients
   */
  disconnectAll() {
    for (const client of this.clients.values()) {
      client.disconnect();
    }
    this.clients.clear();
  }

  /**
   * Get all connected clients
   */
  getConnectedClients() {
    return Array.from(this.clients.values()).filter(client => client.isConnected());
  }

  /**
   * Wait for all clients to receive a message
   */
  async waitForAllClientsToReceiveMessage(timeout = 5000) {
    const clients = this.getConnectedClients();
    const promises = clients.map(client => client.waitForMessage(timeout));

    try {
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Not all clients received message within timeout:', error);
      return false;
    }
  }

  /**
   * Get manager info for debugging
   */
  getInfo() {
    const connectedClients = this.getConnectedClients();
    return {
      totalClients: this.clients.size,
      connectedClients: connectedClients.length,
      clientInfos: connectedClients.map(client => client.getInfo()),
    };
  }
}

// Export singleton instance
export const webSocketTestManager = new WebSocketTestManager();