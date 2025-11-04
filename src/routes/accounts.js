const express = require('express');
const router = express.Router();
const SteamAccountService = require('../services/steam-account.service');
const AccountLogService = require('../services/account-log.service');
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

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.isRunning) {
      return res.status(400).json({ error: 'Account is already running' });
    }

    await AccountLogService.addLog(account._id, 'STATUS_CHANGE', 'Account started by user', { status: 'starting' });

    res.status(200).json({ message: 'Account start initiated' });
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

    if (!account.isRunning) {
      return res.status(400).json({ error: 'Account is already stopped' });
    }

    await AccountLogService.addLog(account._id, 'STATUS_CHANGE', 'Account stopped by user', { status: 'stopping' });

    res.status(200).json({ message: 'Account stop initiated' });
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

    await AccountLogService.addLog(account._id, 'STEAM_GUARD', `2FA code submitted by user`, { codeLength: code.length });

    res.status(200).json({ message: '2FA code submitted' });
  } catch (error) {
    logger.error('Submit 2FA error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
