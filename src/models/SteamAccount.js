const mongoose = require('mongoose');

const steamAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    sharedSecret: {
      type: String,
      default: null,
    },
    refreshToken: {
      type: Buffer,
      default: null,
    },
    onlineStatus: {
      type: Boolean,
      default: true,
    },
    games: {
      type: Buffer,
      default: null,
    },
    totalHoursIdled: {
      type: Number,
      default: 0,
    },
    isRunning: {
      type: Boolean,
      default: false,
    },
    gameRotationEnabled: {
      type: Boolean,
      default: false,
    },
    gameRotationInterval: {
      type: Number,
      default: 3600000,
    },
    offlineModeEnabled: {
      type: Boolean,
      default: false,
    },
    autoRestartEnabled: {
      type: Boolean,
      default: false,
    },
    scheduledStartTime: {
      type: String,
      default: null,
    },
    scheduledStopTime: {
      type: String,
      default: null,
    },
    proxyUrl: {
      type: String,
      default: null,
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

steamAccountSchema.index({ userId: 1 });

module.exports = mongoose.model('SteamAccount', steamAccountSchema);
