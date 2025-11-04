const SteamAccount = require('../models/SteamAccount');
const { BoostedGame, BoostedGameUser } = require('../models/BoostedGame');
const { logger } = require('../helpers/logger.helper');
const { appIdsToBytes, bytesToAppIds } = require('../utils/steam.util');
const { tokenToBytes, bytesToToken } = require('../utils/jwt.util');
const { encrypt, decrypt } = require('../utils/crypto.util');

class SteamAccountService {
  static async addIdleHours(username, hours, games = []) {
    if (hours <= 0) return;

    const retries = 3;

    for (let i = 0; i < retries; i++) {
      try {
        logger.info(`[addIdleHours] Updating ${username} with ${hours.toFixed(2)} hours`);

        const steamAccount = await SteamAccount.findOne({ username });
        if (!steamAccount) {
          throw new Error('Steam account not found');
        }

        steamAccount.totalHoursIdled += hours;
        await steamAccount.save();

        for (const appId of games) {
          const name = `App ${appId}`;

          let boostedGame = await BoostedGame.findOne({ appId });
          if (!boostedGame) {
            boostedGame = await BoostedGame.create({
              appId,
              name,
              totalBoosted: hours,
            });
          } else {
            boostedGame.totalBoosted += hours;
            await boostedGame.save();
          }

          await BoostedGameUser.findOneAndUpdate(
            {
              steamAccountId: steamAccount._id,
              boostedGameId: boostedGame._id,
            },
            {},
            { upsert: true }
          );
        }

        return steamAccount;
      } catch (err) {
        logger.error(`[addIdleHours] Error updating ${username}:`, err);
        if (i === retries - 1) throw err;
        await new Promise((res) => setTimeout(res, 1000));
      }
    }
  }

  static async getGlobalIdleHours() {
    const result = await SteamAccount.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$totalHoursIdled' },
        },
      },
    ]);
    return result[0]?.total ?? 0;
  }

  static async getTotalSteamAccounts() {
    return await SteamAccount.countDocuments();
  }

  static async insert({ username, password, sharedSecret, refreshToken, games, userId }) {
    try {
      return await SteamAccount.create({
        userId,
        username,
        password: encrypt(password),
        sharedSecret,
        refreshToken: tokenToBytes(refreshToken),
        games: appIdsToBytes(games),
      });
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to insert new Steam account to database');
    }
  }

  static async remove(steamUsername) {
    try {
      return await SteamAccount.deleteOne({ username: steamUsername });
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to remove Steam account from database');
    }
  }

  static async getAll(userId) {
    try {
      const steamAccounts = await SteamAccount.find({ userId });

      return steamAccounts.map((steamAccount) => ({
        ...steamAccount.toObject(),
        refreshToken: steamAccount.refreshToken ? bytesToToken(steamAccount.refreshToken) : null,
        games: steamAccount.games ? bytesToAppIds(steamAccount.games) : [],
      }));
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to get Steam accounts from database');
    }
  }

  static async getAllRunning() {
    try {
      const steamAccounts = await SteamAccount.find({ isRunning: true });

      return steamAccounts.map((steamAccount) => ({
        ...steamAccount.toObject(),
        refreshToken: steamAccount.refreshToken ? bytesToToken(steamAccount.refreshToken) : null,
        games: steamAccount.games ? bytesToAppIds(steamAccount.games) : [],
      }));
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to get all running Steam accounts from database');
    }
  }

  static async getAccount(userId, steamUsername) {
    try {
      const steamAccount = await SteamAccount.findOne({
        username: steamUsername,
        userId,
      });

      if (!steamAccount) {
        return null;
      }

      return {
        ...steamAccount.toObject(),
        refreshToken: steamAccount.refreshToken ? bytesToToken(steamAccount.refreshToken) : null,
        games: steamAccount.games ? bytesToAppIds(steamAccount.games) : [],
      };
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to get Steam account from database');
    }
  }

  static async setRunningStatus(steamUsername, isRunning) {
    try {
      return await SteamAccount.findOneAndUpdate(
        { username: steamUsername },
        { isRunning },
        { new: true }
      );
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to set running status for Steam account in database');
    }
  }

  static async setGames(steamUsername, games) {
    try {
      const updated = await SteamAccount.findOneAndUpdate(
        { username: steamUsername },
        { games: appIdsToBytes(games) },
        { new: true }
      );

      const steamAccountId = updated._id;

      const existing = await BoostedGameUser.find({
        steamAccountId,
      }).populate('boostedGameId');

      const existingAppIds = new Set(
        existing.map((b) => b.boostedGameId.appId)
      );
      const newAppIds = new Set(games);

      for (const appId of newAppIds) {
        let boostedGame = await BoostedGame.findOne({ appId });

        if (!boostedGame) {
          boostedGame = await BoostedGame.create({
            appId,
            name: `App ${appId}`,
          });
        }

        await BoostedGameUser.findOneAndUpdate(
          {
            steamAccountId,
            boostedGameId: boostedGame._id,
          },
          {},
          { upsert: true }
        );
      }

      for (const record of existing) {
        if (!newAppIds.has(record.boostedGameId.appId)) {
          await BoostedGameUser.deleteOne({
            steamAccountId,
            boostedGameId: record.boostedGameId._id,
          });
        }
      }

      return updated;
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to set games for Steam account in database');
    }
  }

  static async setOnlineStatus(steamUsername, onlineStatus) {
    try {
      return await SteamAccount.findOneAndUpdate(
        { username: steamUsername },
        { onlineStatus },
        { new: true }
      );
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to set online status for Steam account in database');
    }
  }

  static async setSharedSecret(steamUsername, sharedSecret) {
    try {
      return await SteamAccount.findOneAndUpdate(
        { username: steamUsername },
        { sharedSecret },
        { new: true }
      );
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to set shared secret for Steam account in database');
    }
  }

  static async setRefreshToken(steamUsername, refreshToken) {
    try {
      return await SteamAccount.findOneAndUpdate(
        { username: steamUsername },
        { refreshToken: tokenToBytes(refreshToken) },
        { new: true }
      );
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to set refresh token for Steam account in database');
    }
  }

  static async checkAccountLimits(userId, maxAccounts) {
    try {
      const accountCount = await SteamAccount.countDocuments({ userId });
      return accountCount < maxAccounts;
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to check account limits');
    }
  }

  static async checkGameLimits(steamAccountId, maxGames) {
    try {
      const gameCount = await BoostedGameUser.countDocuments({ steamAccountId });
      return gameCount < maxGames;
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to check game limits');
    }
  }

  static async getAccountsCount(userId) {
    try {
      return await SteamAccount.countDocuments({ userId });
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to get accounts count');
    }
  }

  static async getGamesCount(steamAccountId) {
    try {
      return await BoostedGameUser.countDocuments({ steamAccountId });
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to get games count');
    }
  }

  static async setGameRotation(steamUsername, enabled, interval = 3600000) {
    try {
      return await SteamAccount.findOneAndUpdate(
        { username: steamUsername },
        {
          gameRotationEnabled: enabled,
          gameRotationInterval: interval
        },
        { new: true }
      );
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to set game rotation');
    }
  }

  static async setOfflineMode(steamUsername, enabled) {
    try {
      return await SteamAccount.findOneAndUpdate(
        { username: steamUsername },
        { offlineModeEnabled: enabled },
        { new: true }
      );
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to set offline mode');
    }
  }

  static async setAutoRestart(steamUsername, enabled) {
    try {
      return await SteamAccount.findOneAndUpdate(
        { username: steamUsername },
        { autoRestartEnabled: enabled },
        { new: true }
      );
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to set auto restart');
    }
  }

  static async setScheduledTimes(steamUsername, startTime, stopTime) {
    try {
      return await SteamAccount.findOneAndUpdate(
        { username: steamUsername },
        {
          scheduledStartTime: startTime,
          scheduledStopTime: stopTime
        },
        { new: true }
      );
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to set scheduled times');
    }
  }

  static async setProxyUrl(steamUsername, proxyUrl) {
    try {
      return await SteamAccount.findOneAndUpdate(
        { username: steamUsername },
        { proxyUrl },
        { new: true }
      );
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to set proxy URL');
    }
  }

  static async getAccountSettings(steamUsername) {
    try {
      const account = await SteamAccount.findOne({ username: steamUsername });
      if (!account) return null;

      return {
        gameRotationEnabled: account.gameRotationEnabled,
        gameRotationInterval: account.gameRotationInterval,
        offlineModeEnabled: account.offlineModeEnabled,
        autoRestartEnabled: account.autoRestartEnabled,
        scheduledStartTime: account.scheduledStartTime,
        scheduledStopTime: account.scheduledStopTime,
        proxyUrl: account.proxyUrl,
        onlineStatus: account.onlineStatus,
      };
    } catch (error) {
      logger.error(error);
      throw new Error('Failed to get account settings');
    }
  }
}

module.exports = SteamAccountService;
