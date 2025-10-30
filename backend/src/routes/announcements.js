import express from 'express';

import announcementController from '../controllers/announcementController.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../middleware/requestLogger.js';

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: Get active announcements
 *     description: Retrieve all active (non-expired) announcements. Requires authentication.
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of announcements per page
 *     responses:
 *       200:
 *         description: Active announcements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       message:
 *                         type: string
 *                       link:
 *                         type: string
 *                         nullable: true
 *                       createdBy:
 *                         type: string
 *                         format: uuid
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized - No token provided
 */
router.get('/', async (req, res) => {
  try {
    await announcementController.getActiveAnnouncements(req, res);
  } catch (error) {
    logger.error('Get active announcements error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

export default router;
