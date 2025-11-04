const express = require('express');
const router = express.Router();
const SteamAccountService = require('../services/steam-account.service');
const AccountLogService = require('../services/account-log.service');
const BotManagerService = require('../services/bot-manager.service');
const SteamAccount = require('../models/SteamAccount');
const { BoostedGame, BoostedGameUser } = require('../models/BoostedGame');
const { logger } = require('../helpers/logger.helper');
const { appIdsToBytes, bytesToAppIds } = require('../utils/steam.util');
const { USER_TIERS } = require('../constants');

router.get('/', async (req, res) => {
  try {
    const accounts = await SteamAccountService.getAll(req.user._id);
    res.status(200).json(accounts);
  } catch (error) {
    logger.error('Get accounts error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const account = await SteamAccountService.getAccount(req.user._id, username);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const boostedGames = await BoostedGameUser.find({
      steamAccountId: account._id,
    }).populate('boostedGameId');

    res.status(200).json({
      ...account,
      boostedGames: boostedGames.map((bg) => ({
        appId: bg.boostedGameId.appId,
        name: bg.boostedGameId.name,
        totalBoosted: bg.boostedGameId.totalBoosted,
      })),
    });
  } catch (error) {
    logger.error('Get account error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, password, sharedSecret, games } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const userTier = req.user.tier || 'free';
    const tierLimits = USER_TIERS[userTier.toUpperCase()];

    const accountCount = await SteamAccountService.getAccountsCount(req.user._id);
    if (accountCount >= tierLimits.maxSteamAccounts) {
      return res.status(400).json({
        error: `You have reached the maximum number of accounts (${tierLimits.maxSteamAccounts}) for your tier`,
      });
    }

    const existingAccount = await SteamAccount.findOne({ username });
    if (existingAccount) {
      return res.status(400).json({ error: 'Steam account already registered' });
    }

    const gameList = games || [];
    if (gameList.length > tierLimits.maxSteamGames) {
      return res.status(400).json({
        error: `You can only idle a maximum of ${tierLimits.maxSteamGames} games for your tier`,
      });
    }

    const account = await SteamAccountService.insert({
      username,
      password,
      sharedSecret: sharedSecret || null,
      refreshToken: '',
      games: gameList,
      userId: req.user._id,
    });

    await AccountLogService.addLog(account._id, 'INFO', `Account created`, { username });

    res.status(201).json({
      message: 'Steam account added successfully',
      account,
    });
  } catch (error) {
    logger.error('Add account error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:username/games', async (req, res) => {
  try {
    const { username } = req.params;
    const { games } = req.body;

    if (!Array.isArray(games)) {
      return res.status(400).json({ error: 'Games must be an array of app IDs' });
    }

    const userTier = req.user.tier || 'free';
    const tierLimits = USER_TIERS[userTier.toUpperCase()];

    if (games.length > tierLimits.maxSteamGames) {
      return res.status(400).json({
        error: `You can only idle a maximum of ${tierLimits.maxSteamGames} games for your tier`,
      });
    }

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await SteamAccountService.setGames(username, games);
    await AccountLogService.addLog(account._id, 'GAME_UPDATE', `Games updated to: ${games.join(', ')}`, { gameCount: games.length });

    res.status(200).json({ message: 'Games updated successfully' });
  } catch (error) {
    logger.error('Update games error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:username/status', async (req, res) => {
  try {
    const { username } = req.params;
    const { onlineStatus } = req.body;

    if (typeof onlineStatus !== 'boolean') {
      return res.status(400).json({ error: 'Online status must be a boolean' });
    }

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await SteamAccountService.setOnlineStatus(username, onlineStatus);

    res.status(200).json({ message: 'Online status updated successfully' });
  } catch (error) {
    logger.error('Update status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await SteamAccountService.remove(username);

    res.status(200).json({ message: 'Steam account removed successfully' });
  } catch (error) {
    logger.error('Remove account error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:username/stats', async (req, res) => {
  try {
    const { username } = req.params;

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const boostedGames = await BoostedGameUser.find({
      steamAccountId: account._id,
    }).populate('boostedGameId');

    res.status(200).json({
      username: account.username,
      totalHoursIdled: account.totalHoursIdled,
      isRunning: account.isRunning,
      onlineStatus: account.onlineStatus,
      createdAt: account.createdAt,
      boostedGames: boostedGames.map((bg) => ({
        appId: bg.boostedGameId.appId,
        name: bg.boostedGameId.name,
        totalBoosted: bg.boostedGameId.totalBoosted,
      })),
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:username/start', async (req, res) => {
  try {
    const { username } = req.params;
    const { offlineMode = false } = req.body;

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.isRunning) {
      return res.status(400).json({ error: 'Account is already running' });
    }

    const validation = await BotManagerService.validateAccount(req.user._id, username);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!offlineMode && !account.password) {
      return res.status(400).json({ error: 'Password is required to start the bot' });
    }

    const result = await BotManagerService.startBot(req.user._id, username);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({ message: result.message, offlineMode });
  } catch (error) {
    logger.error('Start account error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:username/stop', async (req, res) => {
  try {
    const { username } = req.params;

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const result = await BotManagerService.stopBot(req.user._id, username);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({ message: result.message });
  } catch (error) {
    logger.error('Stop account error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:username/logs', async (req, res) => {
  try {
    const { username } = req.params;
    const limit = req.query.limit || 100;

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const logs = await AccountLogService.getLogs(account._id, parseInt(limit));

    res.status(200).json({ logs });
  } catch (error) {
    logger.error('Get logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:username/submit-2fa', async (req, res) => {
  try {
    const { username } = req.params;
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const bot = BotManagerService.getBot(username);
    if (!bot) {
      return res.status(400).json({ error: 'Bot not running' });
    }

    await bot.inputSteamGuardCode(code);
    await AccountLogService.addLog(account._id, 'STEAM_GUARD', `2FA code submitted by user`, { codeLength: code.length });

    res.status(200).json({ message: '2FA code submitted' });
  } catch (error) {
    logger.error('Submit 2FA error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:username/restart', async (req, res) => {
  try {
    const { username } = req.params;

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const result = await BotManagerService.restartBot(req.user._id, username);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({ message: result.message });
  } catch (error) {
    logger.error('Restart account error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:username/status', async (req, res) => {
  try {
    const { username } = req.params;

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const botStatus = BotManagerService.getBotStatus(username);

    res.status(200).json({
      username,
      isRunning: botStatus.running,
      status: botStatus.status,
      error: botStatus.error,
      steamId: botStatus.steamId,
      vacStatus: botStatus.vacStatus,
      hoursIdled: account.totalHoursIdled,
      games: account.games,
    });
  } catch (error) {
    logger.error('Get status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:username/rotate-games', async (req, res) => {
  try {
    const { username } = req.params;
    const { interval = 3600000 } = req.body;

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const bot = BotManagerService.getBot(username);
    if (!bot) {
      return res.status(400).json({ error: 'Bot not running' });
    }

    await AccountLogService.addLog(account._id, 'GAME_UPDATE', `Game rotation enabled (${interval}ms interval)`, { interval });
    await SteamAccountService.setGameRotation(username, true, interval);

    res.status(200).json({ message: 'Game rotation enabled', interval });
  } catch (error) {
    logger.error('Rotate games error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:username/clone-settings/:sourceUsername', async (req, res) => {
  try {
    const { username, sourceUsername } = req.params;

    const sourceAccount = await SteamAccountService.getAccount(req.user._id, sourceUsername);
    if (!sourceAccount) {
      return res.status(404).json({ error: 'Source account not found' });
    }

    const targetAccount = await SteamAccountService.getAccount(req.user._id, username);
    if (!targetAccount) {
      return res.status(404).json({ error: 'Target account not found' });
    }

    await SteamAccountService.setGames(username, sourceAccount.games || []);
    await SteamAccountService.setOnlineStatus(username, sourceAccount.onlineStatus);

    await AccountLogService.addLog(targetAccount._id, 'GAME_UPDATE', `Settings cloned from ${sourceUsername}`, { source: sourceUsername });

    res.status(200).json({ message: 'Settings cloned successfully' });
  } catch (error) {
    logger.error('Clone settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch/start', async (req, res) => {
  try {
    const { usernames = [] } = req.body;

    if (!Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({ error: 'No usernames provided' });
    }

    const results = {};

    for (const username of usernames) {
      const account = await SteamAccountService.getAccount(req.user._id, username);
      if (!account) {
        results[username] = { success: false, error: 'Account not found' };
        continue;
      }

      const result = await BotManagerService.startBot(req.user._id, username);
      results[username] = result.error ? { success: false, error: result.error } : { success: true };
    }

    res.status(200).json({ results });
  } catch (error) {
    logger.error('Batch start error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch/stop', async (req, res) => {
  try {
    const { usernames = [] } = req.body;

    if (!Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({ error: 'No usernames provided' });
    }

    const results = {};

    for (const username of usernames) {
      const account = await SteamAccountService.getAccount(req.user._id, username);
      if (!account) {
        results[username] = { success: false, error: 'Account not found' };
        continue;
      }

      const result = await BotManagerService.stopBot(req.user._id, username);
      results[username] = result.error ? { success: false, error: result.error } : { success: true };
    }

    res.status(200).json({ results });
  } catch (error) {
    logger.error('Batch stop error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/health-check/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const validation = await BotManagerService.validateAccount(req.user._id, username);

    await AccountLogService.addLog(account._id, 'INFO', 'Health check performed', { valid: validation.valid });

    res.status(200).json({
      username,
      healthy: validation.valid,
      error: validation.error || null,
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
