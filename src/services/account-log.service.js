const AccountLog = require('../models/AccountLog');
const { logger } = require('../helpers/logger.helper');

class AccountLogService {
  static async addLog(steamAccountId, type, message, details = null) {
    try {
      const log = await AccountLog.create({
        steamAccountId,
        type,
        message,
        details,
      });
      return log;
    } catch (error) {
      logger.error('Add log error:', error);
      throw error;
    }
  }

  static async getLogs(steamAccountId, limit = 100) {
    try {
      const logs = await AccountLog.find({ steamAccountId })
        .sort({ createdAt: -1 })
        .limit(limit);
      return logs;
    } catch (error) {
      logger.error('Get logs error:', error);
      throw error;
    }
  }

  static async clearLogs(steamAccountId) {
    try {
      await AccountLog.deleteMany({ steamAccountId });
    } catch (error) {
      logger.error('Clear logs error:', error);
      throw error;
    }
  }
}

module.exports = AccountLogService;
