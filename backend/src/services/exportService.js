import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import { Op } from 'sequelize';

import { User, Message, Call, File, Group, AuditLog, Report } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Export Service
 * Handles CSV and PDF export functionality for admin panel
 */
class ExportService {
  /**
   * Generate CSV from data array
   * @param {Array} data - Array of objects to convert to CSV
   * @param {Array} fields - Field definitions for CSV
   * @returns {string} CSV string
   */
  generateCSV(data, fields) {
    try {
      const parser = new Parser({ fields });
      return parser.parse(data);
    } catch (error) {
      logger.error('CSV generation failed', { error: error.message });
      throw new Error('Failed to generate CSV file');
    }
  }

  /**
   * Generate PDF from data array
   * @param {Array} data - Array of objects to include in PDF
   * @param {Object} options - PDF generation options
   * @returns {Buffer} PDF buffer
   */
  generatePDF(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Add title
        doc.fontSize(20).text(options.title || 'Export Report', 100, 100);
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, 100, 130);
        doc.moveDown(2);

        // Add table headers
        const headers = options.headers || Object.keys(data[0] || {});
        const startY = doc.y;
        const rowHeight = 20;
        const colWidth = (doc.page.width - 200) / headers.length;

        // Draw headers
        doc.fontSize(10).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(header.toString(), 100 + i * colWidth, startY, {
            width: colWidth,
            align: 'left',
          });
        });

        // Draw separator line
        doc
          .moveTo(100, startY + rowHeight)
          .lineTo(doc.page.width - 100, startY + rowHeight)
          .stroke();

        // Add data rows
        doc.font('Helvetica');
        data.forEach((row, rowIndex) => {
          const yPos = startY + (rowIndex + 1) * rowHeight;

          // Check if we need a new page
          if (yPos + rowHeight > doc.page.height - 100) {
            doc.addPage();
            doc.fontSize(10).text('Continued...', 100, 100);
            doc.moveDown(2);
          }

          headers.forEach((header, colIndex) => {
            const value = row[header] !== undefined ? row[header].toString() : '';
            doc.text(value, 100 + colIndex * colWidth, yPos, { width: colWidth, align: 'left' });
          });
        });

        doc.end();
      } catch (error) {
        logger.error('PDF generation failed', { error: error.message });
        reject(new Error('Failed to generate PDF file'));
      }
    });
  }

  /**
   * Export audit logs to CSV
   * @param {Object} filters - Filter criteria
   * @returns {string} CSV string
   */
  async exportAuditLogsCSV(filters = {}) {
    try {
      const { rows: logs } = await AuditLog.findAndCountAll({
        where: this.buildAuditLogWhereClause(filters),
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['username', 'email'],
          },
        ],
        limit: filters.limit || 1000,
        order: [['createdAt', 'DESC']],
      });

      const csvData = logs.map(log => ({
        id: log.id,
        username: log.user?.username || 'System',
        email: log.user?.email || 'N/A',
        action: log.action,
        resourceType: log.resourceType || 'N/A',
        resourceId: log.resourceId || 'N/A',
        severity: log.severity,
        status: log.status,
        ipAddress: log.ipAddress || 'N/A',
        userAgent: log.userAgent ? log.userAgent.substring(0, 100) : 'N/A',
        createdAt: log.createdAt.toISOString(),
        details: JSON.stringify(log.details || {}),
      }));

      const fields = [
        { label: 'ID', value: 'id' },
        { label: 'Username', value: 'username' },
        { label: 'Email', value: 'email' },
        { label: 'Action', value: 'action' },
        { label: 'Resource Type', value: 'resourceType' },
        { label: 'Resource ID', value: 'resourceId' },
        { label: 'Severity', value: 'severity' },
        { label: 'Status', value: 'status' },
        { label: 'IP Address', value: 'ipAddress' },
        { label: 'User Agent', value: 'userAgent' },
        { label: 'Created At', value: 'createdAt' },
        { label: 'Details', value: 'details' },
      ];

      return this.generateCSV(csvData, fields);
    } catch (error) {
      logger.error('Audit logs CSV export failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Export audit logs to PDF
   * @param {Object} filters - Filter criteria
   * @returns {Buffer} PDF buffer
   */
  async exportAuditLogsPDF(filters = {}) {
    try {
      const { rows: logs } = await AuditLog.findAndCountAll({
        where: this.buildAuditLogWhereClause(filters),
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['username', 'email'],
          },
        ],
        limit: filters.limit || 1000,
        order: [['createdAt', 'DESC']],
      });

      const pdfData = logs.map(log => ({
        ID: log.id,
        Username: log.user?.username || 'System',
        Email: log.user?.email || 'N/A',
        Action: log.action,
        'Resource Type': log.resourceType || 'N/A',
        'Resource ID': log.resourceId || 'N/A',
        Severity: log.severity,
        Status: log.status,
        'IP Address': log.ipAddress || 'N/A',
        'User Agent': log.userAgent ? `${log.userAgent.substring(0, 50)}...` : 'N/A',
        'Created At': log.createdAt.toLocaleString(),
      }));

      return this.generatePDF(pdfData, {
        title: 'Audit Logs Export',
        headers: [
          'ID',
          'Username',
          'Email',
          'Action',
          'Resource Type',
          'Resource ID',
          'Severity',
          'Status',
          'IP Address',
          'User Agent',
          'Created At',
        ],
      });
    } catch (error) {
      logger.error('Audit logs PDF export failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Export reports to CSV
   * @param {Object} filters - Filter criteria
   * @returns {string} CSV string
   */
  async exportReportsCSV(filters = {}) {
    try {
      const { rows: reports } = await Report.findAndCountAll({
        where: this.buildReportWhereClause(filters),
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['username', 'email'],
          },
          {
            model: User,
            as: 'reportedUser',
            attributes: ['username', 'email'],
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['username', 'email'],
          },
        ],
        limit: filters.limit || 1000,
        order: [['createdAt', 'DESC']],
      });

      const csvData = reports.map(report => ({
        id: report.id,
        reporterUsername: report.reporter?.username || 'N/A',
        reporterEmail: report.reporter?.email || 'N/A',
        reportedUsername: report.reportedUser?.username || 'N/A',
        reportedEmail: report.reportedUser?.email || 'N/A',
        reportType: report.reportType,
        reason: report.reason,
        description: report.description,
        status: report.status,
        reviewerUsername: report.reviewer?.username || 'N/A',
        reviewerEmail: report.reviewer?.email || 'N/A',
        resolution: report.resolution || 'N/A',
        actionTaken: report.actionTaken || 'N/A',
        createdAt: report.createdAt.toISOString(),
        reviewedAt: report.reviewedAt ? report.reviewedAt.toISOString() : 'N/A',
      }));

      const fields = [
        { label: 'ID', value: 'id' },
        { label: 'Reporter Username', value: 'reporterUsername' },
        { label: 'Reporter Email', value: 'reporterEmail' },
        { label: 'Reported Username', value: 'reportedUsername' },
        { label: 'Reported Email', value: 'reportedEmail' },
        { label: 'Report Type', value: 'reportType' },
        { label: 'Reason', value: 'reason' },
        { label: 'Description', value: 'description' },
        { label: 'Status', value: 'status' },
        { label: 'Reviewer Username', value: 'reviewerUsername' },
        { label: 'Reviewer Email', value: 'reviewerEmail' },
        { label: 'Resolution', value: 'resolution' },
        { label: 'Action Taken', value: 'actionTaken' },
        { label: 'Created At', value: 'createdAt' },
        { label: 'Reviewed At', value: 'reviewedAt' },
      ];

      return this.generateCSV(csvData, fields);
    } catch (error) {
      logger.error('Reports CSV export failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Export reports to PDF
   * @param {Object} filters - Filter criteria
   * @returns {Buffer} PDF buffer
   */
  async exportReportsPDF(filters = {}) {
    try {
      const { rows: reports } = await Report.findAndCountAll({
        where: this.buildReportWhereClause(filters),
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['username', 'email'],
          },
          {
            model: User,
            as: 'reportedUser',
            attributes: ['username', 'email'],
          },
        ],
        limit: filters.limit || 1000,
        order: [['createdAt', 'DESC']],
      });

      const pdfData = reports.map(report => ({
        ID: report.id,
        'Reporter Username': report.reporter?.username || 'N/A',
        'Reported Username': report.reportedUser?.username || 'N/A',
        'Report Type': report.reportType,
        Reason: report.reason,
        Status: report.status,
        'Action Taken': report.actionTaken || 'N/A',
        'Created At': report.createdAt.toLocaleString(),
      }));

      return this.generatePDF(pdfData, {
        title: 'User Reports Export',
        headers: [
          'ID',
          'Reporter Username',
          'Reported Username',
          'Report Type',
          'Reason',
          'Status',
          'Action Taken',
          'Created At',
        ],
      });
    } catch (error) {
      logger.error('Reports PDF export failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Export statistics to CSV
   * @returns {string} CSV string
   */
  async exportStatisticsCSV() {
    try {
      // Get user statistics
      const userStats = await User.findAll({
        attributes: [
          'approvalStatus',
          [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count'],
        ],
        group: ['approvalStatus'],
        raw: true,
      });

      // Get message statistics
      const totalMessages = await Message.count();
      const last24hMessages = await Message.count({
        where: {
          createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      // Get call statistics
      const totalCalls = await Call.count();
      const callsByStatus = await Call.findAll({
        attributes: ['status', [Call.sequelize.fn('COUNT', Call.sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      });

      // Get storage statistics
      const totalStorage = (await File.sum('fileSize')) || 0;
      const storageByType = await File.findAll({
        attributes: [
          'mimeType',
          [File.sequelize.fn('SUM', File.sequelize.col('fileSize')), 'totalSize'],
          [File.sequelize.fn('COUNT', File.sequelize.col('id')), 'count'],
        ],
        group: ['mimeType'],
        raw: true,
      });

      const csvData = [
        // User statistics
        {
          category: 'Users',
          metric: 'Total Users',
          value: userStats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
        },
        ...userStats.map(stat => ({
          category: 'Users',
          metric: `${stat.approvalStatus.charAt(0).toUpperCase() + stat.approvalStatus.slice(1)} Users`,
          value: parseInt(stat.count),
        })),

        // Message statistics
        { category: 'Messages', metric: 'Total Messages', value: totalMessages },
        { category: 'Messages', metric: 'Last 24h Messages', value: last24hMessages },

        // Call statistics
        { category: 'Calls', metric: 'Total Calls', value: totalCalls },
        ...callsByStatus.map(call => ({
          category: 'Calls',
          metric: `${call.status.charAt(0).toUpperCase() + call.status.slice(1)} Calls`,
          value: parseInt(call.count),
        })),

        // Storage statistics
        { category: 'Storage', metric: 'Total Storage (bytes)', value: parseInt(totalStorage) },
        ...storageByType.map(storage => ({
          category: 'Storage',
          metric: `${storage.mimeType} Files`,
          value: parseInt(storage.count),
        })),
      ];

      const fields = [
        { label: 'Category', value: 'category' },
        { label: 'Metric', value: 'metric' },
        { label: 'Value', value: 'value' },
      ];

      return this.generateCSV(csvData, fields);
    } catch (error) {
      logger.error('Statistics CSV export failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Export statistics to PDF
   * @returns {Buffer} PDF buffer
   */
  async exportStatisticsPDF() {
    try {
      // Get the same data as CSV but formatted for PDF
      const csvData = await this.exportStatisticsCSV();
      const lines = csvData.split('\n');
      const headers = lines[0].split(',');
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        return obj;
      });

      return this.generatePDF(data, {
        title: 'System Statistics Export',
        headers: headers,
      });
    } catch (error) {
      logger.error('Statistics PDF export failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Build where clause for audit log queries
   * @param {Object} filters - Filter criteria
   * @returns {Object} Sequelize where clause
   */
  buildAuditLogWhereClause(filters) {
    const whereClause = {};

    if (filters.userId) {
      whereClause.userId = filters.userId;
    }

    // BUG-A012: Escape special characters in LIKE queries to prevent SQL injection
    if (filters.action) {
      const sanitized = filters.action.replace(/[%_\\]/g, '\\$&');
      whereClause.action = { [Op.iLike]: `%${sanitized}%` };
    }

    if (filters.resourceType) {
      whereClause.resourceType = filters.resourceType;
    }
    if (filters.severity) {
      whereClause.severity = filters.severity;
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      whereClause.createdAt = {};
      if (filters.dateFrom) {
        whereClause.createdAt[Op.gte] = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        whereClause.createdAt[Op.lte] = new Date(filters.dateTo);
      }
    }

    return whereClause;
  }

  /**
   * Build where clause for report queries
   * @param {Object} filters - Filter criteria
   * @returns {Object} Sequelize where clause
   */
  buildReportWhereClause(filters) {
    const whereClause = {};
    if (filters.status) {
      whereClause.status = filters.status;
    }
    if (filters.reason) {
      whereClause.reason = filters.reason;
    }
    if (filters.reportType) {
      whereClause.reportType = filters.reportType;
    }
    return whereClause;
  }
}

// Create and export singleton instance
const exportService = new ExportService();
export default exportService;
