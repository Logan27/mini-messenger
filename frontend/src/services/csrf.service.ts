import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * CSRF Service
 * Manages CSRF token fetching and storage for secure API requests
 */
class CSRFService {
  private csrfToken: string | null = null;
  private tokenFetchPromise: Promise<string> | null = null;

  /**
   * Get the current CSRF token, fetching it if necessary
   */
  async getToken(): Promise<string> {
    // If we already have a token, return it
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // If a fetch is already in progress, wait for it
    if (this.tokenFetchPromise) {
      return this.tokenFetchPromise;
    }

    // Fetch a new token
    this.tokenFetchPromise = this.fetchToken();

    try {
      const token = await this.tokenFetchPromise;
      this.csrfToken = token;
      return token;
    } finally {
      this.tokenFetchPromise = null;
    }
  }

  /**
   * Fetch a new CSRF token from the server
   */
  private async fetchToken(): Promise<string> {
    try {
      const response = await axios.get(`${API_BASE_URL}/csrf-token`, {
        withCredentials: true, // Required to receive the CSRF cookie
      });

      if (response.data?.csrfToken) {
        return response.data.csrfToken;
      }

      throw new Error('Invalid CSRF token response');
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      throw error;
    }
  }

  /**
   * Refresh the CSRF token (fetch a new one)
   */
  async refreshToken(): Promise<string> {
    this.csrfToken = null;
    return this.getToken();
  }

  /**
   * Clear the stored CSRF token
   */
  clearToken(): void {
    this.csrfToken = null;
  }

  /**
   * Check if we have a CSRF token
   */
  hasToken(): boolean {
    return this.csrfToken !== null;
  }
}

// Export a singleton instance
export const csrfService = new CSRFService();

export default csrfService;
