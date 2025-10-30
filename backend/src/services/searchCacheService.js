import { getRedisClient } from '../config/redis.js';

/**
 * Search cache service for user search results
 * Provides Redis-based caching to improve search performance
 */
class SearchCacheService {
  constructor() {
    try {
      this.redis = getRedisClient();
    } catch (error) {
      // Redis not initialized yet, will be set later
      this.redis = null;
    }
    this.CACHE_TTL = 300; // 5 minutes cache TTL
    this.MAX_RESULTS = 1000; // Maximum results to cache
  }

  /**
   * Generate cache key for search query
   * @param {string} searchTerm - The search term
   * @param {string} userId - User ID to exclude blocked users
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {string} Cache key
   */
  generateCacheKey(searchTerm, userId, page, limit) {
    const sanitizedTerm = searchTerm.toLowerCase().trim();
    return `search:${sanitizedTerm}:${userId}:${page}:${limit}`;
  }

  /**
   * Generate cache key for blocked users list
   * @param {string} userId - User ID
   * @returns {string} Cache key
   */
  generateBlockedUsersCacheKey(userId) {
    return `blocked_users:${userId}`;
  }

  /**
   * Get cached search results
   * @param {string} searchTerm - Search term
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Promise<Object|null>} Cached results or null
   */
  async getCachedResults(searchTerm, userId, page, limit) {
    try {
      const cacheKey = this.generateCacheKey(searchTerm, userId, page, limit);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      console.error('Error getting cached search results:', error);
      return null;
    }
  }

  /**
   * Cache search results
   * @param {string} searchTerm - Search term
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @param {Object} results - Search results with metadata
   */
  async setCachedResults(searchTerm, userId, page, limit, results) {
    try {
      const cacheKey = this.generateCacheKey(searchTerm, userId, page, limit);

      // Only cache if we have reasonable results
      if (results.data.users.length > 0 && results.data.users.length <= this.MAX_RESULTS) {
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(results));
      }
    } catch (error) {
      console.error('Error caching search results:', error);
    }
  }

  /**
   * Get cached blocked users list
   * @param {string} userId - User ID
   * @returns {Promise<Set|null>} Cached blocked user IDs or null
   */
  async getCachedBlockedUsers(userId) {
    try {
      const cacheKey = this.generateBlockedUsersCacheKey(userId);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return new Set(JSON.parse(cached));
      }

      return null;
    } catch (error) {
      console.error('Error getting cached blocked users:', error);
      return null;
    }
  }

  /**
   * Cache blocked users list
   * @param {string} userId - User ID
   * @param {Set} blockedUserIds - Set of blocked user IDs
   */
  async setCachedBlockedUsers(userId, blockedUserIds) {
    try {
      const cacheKey = this.generateBlockedUsersCacheKey(userId);

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(Array.from(blockedUserIds)));
    } catch (error) {
      console.error('Error caching blocked users:', error);
    }
  }

  /**
   * Invalidate search cache for a user
   * Used when user blocks/unblocks someone or changes relationships
   * @param {string} userId - User ID
   */
  async invalidateUserSearchCache(userId) {
    try {
      // Get all search cache keys for this user
      const pattern = `search:*:${userId}:*:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(keys);
      }

      // Also invalidate blocked users cache
      const blockedKey = this.generateBlockedUsersCacheKey(userId);
      await this.redis.del(blockedKey);
    } catch (error) {
      console.error('Error invalidating search cache:', error);
    }
  }

  /**
   * Clear all search cache (admin function)
   */
  async clearAllSearchCache() {
    try {
      const pattern = 'search:*';
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(keys);
      }

      const blockedPattern = 'blocked_users:*';
      const blockedKeys = await this.redis.keys(blockedPattern);

      if (blockedKeys.length > 0) {
        await this.redis.del(blockedKeys);
      }
    } catch (error) {
      console.error('Error clearing search cache:', error);
    }
  }
}

// Export singleton instance
export default new SearchCacheService();
