const SteamBot = require('../steam-bot/steam-bot');
const SteamAccountService = require('./steam-account.service');
const AccountLogService = require('./account-log.service');
const { logger } = require('../helpers/logger.helper');
const { decrypt } = require('../utils/crypto.util');

class BotManagerService {
  static bots = new Map();
  static io = null;
  static userSessions = new Map();

  static setIO(ioInstance) {
    this.io = ioInstance;
  }

  static registerUserSession(userId, socketId) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, []);
    }
    this.userSessions.get(userId).push(socketId);
  }

  static unregisterUserSession(userId, socketId) {
    if (this.userSessions.has(userId)) {
      const sockets = this.userSessions.get(userId);
      const index = sockets.indexOf(socketId);
      if (index > -1) sockets.splice(index, 1);
      if (sockets.length === 0) this.userSessions.delete(userId);
    }
  }

  static emitTo2FAModal(userId, username) {
    if (!this.io) return;

    const socketIds = this.userSessions.get(userId);
    if (!socketIds) return;

    socketIds.forEach(socketId => {
      this.io.to(socketId).emit('show-2fa-modal', { username });
    });
  }

  static async startBot(userId, username) {
    try {
      if (this.bots.has(username)) {
        return { error: 'Bot already running' };
      }

      const account = await SteamAccountService.getAccount(userId, username);
      if (!account) {
        return { error: 'Account not found' };
      }

      if (!account.password) {
        return { error: 'Password not set for this account' };
      }

      const bot = new SteamBot({
        username: account.username,
        password: account.password,
        sharedSecret: account.sharedSecret || '',
        refreshToken: account.refreshToken || '',
        onlineStatus: account.onlineStatus,
        games: account.games || [],
      });

      this.bots.set(username, bot);
      
      await AccountLogService.addLog(account._id, 'STATUS_CHANGE', 'Bot starting...', { status: 'starting' });
      bot.start();

      return { message: 'Bot started successfully' };
    } catch (error) {
      logger.error(`Error starting bot for ${username}:`, error);
      return { error: error.message };
    }
  }

  static async stopBot(userId, username) {
    try {
      const bot = this.bots.get(username);
      if (!bot) {
        return { error: 'Bot not running' };
      }

      const account = await SteamAccountService.getAccount(userId, username);
      if (account) {
        await AccountLogService.addLog(account._id, 'STATUS_CHANGE', 'Bot stopping...', { status: 'stopping' });
      }

      await bot.stop();
      this.bots.delete(username);

      return { message: 'Bot stopped successfully' };
    } catch (error) {
      logger.error(`Error stopping bot for ${username}:`, error);
      this.bots.delete(username);
      return { error: error.message };
    }
  }

  static async restartBot(userId, username) {
    try {
      const account = await SteamAccountService.getAccount(userId, username);
      if (account) {
        await AccountLogService.addLog(account._id, 'STATUS_CHANGE', 'Bot restarting...', { status: 'restarting' });
      }

      const bot = this.bots.get(username);
      if (bot) {
        bot.restart();
        return { message: 'Bot restarting' };
      } else {
        return await this.startBot(userId, username);
      }
    } catch (error) {
      logger.error(`Error restarting bot for ${username}:`, error);
      return { error: error.message };
    }
  }

  static getBot(username) {
    return this.bots.get(username);
  }

  static async validateAccount(userId, username) {
    try {
      const account = await SteamAccountService.getAccount(userId, username);
      if (!account) {
        return { valid: false, error: 'Account not found' };
      }

      if (!account.username || !account.password) {
        return { valid: false, error: 'Username or password missing' };
      }

      if (account.sharedSecret && account.sharedSecret.length < 10) {
        return { valid: false, error: 'Invalid shared secret format' };
      }

      return { valid: true };
    } catch (error) {
      logger.error(`Error validating account ${username}:`, error);
      return { valid: false, error: error.message };
    }
  }

  static getBotStatus(username) {
    const bot = this.bots.get(username);
    if (!bot) {
      return { running: false, status: 'offline' };
    }

    return {
      running: bot.isRunning(),
      status: bot.getStatus(),
      error: bot.getError(),
      steamId: bot.getSteamId64?.() || null,
      vacStatus: bot.getVacStatus?.() || null,
    };
  }

  static getAllRunningBots() {
    return Array.from(this.bots.entries()).map(([username, bot]) => ({
      username,
      status: bot.getStatus(),
      isRunning: bot.isRunning(),
      error: bot.getError(),
    }));
  }
}

module.exports = BotManagerService;
