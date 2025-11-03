const mongoose = require('mongoose');

const boostedGameSchema = new mongoose.Schema(
  {
    appId: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    totalBoosted: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const boostedGameUserSchema = new mongoose.Schema(
  {
    steamAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SteamAccount',
      required: true,
    },
    boostedGameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BoostedGame',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

boostedGameUserSchema.index({ steamAccountId: 1, boostedGameId: 1 }, { unique: true });

const BoostedGame = mongoose.model('BoostedGame', boostedGameSchema);
const BoostedGameUser = mongoose.model('BoostedGameUser', boostedGameUserSchema);

module.exports = { BoostedGame, BoostedGameUser };
