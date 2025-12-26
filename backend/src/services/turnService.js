import crypto from 'crypto';

import { config } from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * TURN REST API credential generation
 *
 * Implements the TURN REST API (draft-uberti-behave-turn-rest-00) for
 * generating time-limited credentials for the TURN server.
 *
 * The credentials are:
 * - username: <timestamp>:<userId>
 * - credential: HMAC-SHA1(secret, username)
 *
 * This allows Coturn to validate credentials without database lookups.
 */

/**
 * Generate time-limited TURN credentials for a user
 * @param {string} userId - The user ID requesting credentials
 * @returns {Object} ICE servers configuration with TURN credentials
 */
const generateTurnCredentials = userId => {
  const { stunServers, turn } = config.webrtc;

  // Calculate expiration timestamp (Unix epoch in seconds)
  const ttl = turn.credentialTTL || 3600; // Default 1 hour
  const expiresAt = Math.floor(Date.now() / 1000) + ttl;

  // Generate TURN REST API compatible username
  // Format: <expiry-timestamp>:<user-identifier>
  const username = `${expiresAt}:${userId}`;

  // Generate credential using HMAC-SHA1
  const hmac = crypto.createHmac('sha1', turn.secret);
  hmac.update(username);
  const credential = hmac.digest('base64');

  logger.debug('Generated TURN credentials', {
    userId,
    expiresAt,
    ttl,
    turnServer: turn.serverUrl,
  });

  // Build ICE servers array
  const iceServers = [];

  // Add STUN servers first (for direct P2P connection attempts)
  for (const stunServer of stunServers) {
    iceServers.push({ urls: stunServer });
  }

  // Add TURN server with credentials (for relay fallback)
  if (turn.serverUrl && turn.secret) {
    iceServers.push({
      urls: [turn.serverUrl, turn.serverUrl.replace('turn:', 'turns:').replace(':3478', ':5349')],
      username,
      credential,
    });

    // Also add UDP variant explicitly
    const udpUrl = `${turn.serverUrl}?transport=udp`;
    const tcpUrl = `${turn.serverUrl}?transport=tcp`;
    iceServers.push({
      urls: [udpUrl, tcpUrl],
      username,
      credential,
    });
  }

  return {
    iceServers,
    expiresAt,
    ttl,
  };
};

/**
 * Validate that TURN configuration is properly set up
 * @returns {Object} Validation result
 */
const validateTurnConfig = () => {
  const { turn } = config.webrtc;
  const issues = [];

  if (!turn.serverUrl) {
    issues.push('TURN_SERVER_URL not configured');
  }

  if (!turn.secret || turn.secret === 'messenger_turn_secret_change_in_production') {
    issues.push('TURN_SECRET not changed from default - must be updated for production');
  }

  if (!turn.realm) {
    issues.push('TURN_REALM not configured');
  }

  return {
    valid: issues.length === 0,
    issues,
    config: {
      serverUrl: turn.serverUrl,
      realm: turn.realm,
      ttl: turn.credentialTTL,
      // Never expose the secret
    },
  };
};

export default {
  generateTurnCredentials,
  validateTurnConfig,
};
