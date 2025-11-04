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

    const existingAccount = await SteamAccount.findOne({ username });
    if (existingAccount) {
      return res.status(400).json({ error: 'Steam account already registered' });
    }

    const account = await SteamAccountService.insert({
      username,
      password,
      sharedSecret: sharedSecret || null,
      refreshToken: '',
      games: games || [],
      userId: req.user._id,
    });

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

    const account = await SteamAccountService.getAccount(req.user._id, username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await SteamAccountService.setGames(username, games);

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

module.exports = router;
