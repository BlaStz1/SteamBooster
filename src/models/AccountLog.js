const mongoose = require('mongoose');

const accountLogSchema = new mongoose.Schema(
  {
    steamAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SteamAccount',
      required: true,
    },
    type: {
      type: String,
      enum: ['LOGIN', 'LOGOUT', 'ERROR', 'STEAM_GUARD', 'VAC_BAN', 'STATUS_CHANGE', 'GAME_UPDATE', 'INFO'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

accountLogSchema.index({ steamAccountId: 1, createdAt: -1 });

module.exports = mongoose.model('AccountLog', accountLogSchema);
