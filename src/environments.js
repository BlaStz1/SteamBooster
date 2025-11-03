'use strict';

require('dotenv').config();
const assert = require('assert');

let NODE_ENV = process.env.NODE_ENV || 'development';
if (NODE_ENV !== 'production' && NODE_ENV !== 'development') {
  NODE_ENV = 'development';
}     

let CRYPTO_SECRET_KEY = process.env.CRYPTO_SECRET_KEY || '04101143811041161937281495053623';
if (CRYPTO_SECRET_KEY.length < 32) {
  console.warn('CRYPTO_SECRET_KEY is too short, using default key');
}

// do for rest DISCORD_CLIENT_ID
let DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1352719531834998846';
if (DISCORD_CLIENT_ID.length < 10) {
  console.warn('DISCORD_CLIENT_ID is too short, using empty string');
}

let DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
if (DISCORD_BOT_TOKEN.length < 10) {
  console.warn('DISCORD_BOT_TOKEN is too short, using empty string');
}

let DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '1383596058084380775';
if (DISCORD_GUILD_ID.length < 10) {
  console.warn('DISCORD_GUILD_ID is too short, using empty string');
}

let DISCORD_ADMIN_ID = process.env.DISCORD_ADMIN_ID || '372528587053465600';
if (DISCORD_ADMIN_ID.length < 10) {
  console.warn('DISCORD_ADMIN_ID is too short, using empty string');
}


assert(NODE_ENV, 'NODE_ENV is required');
assert(CRYPTO_SECRET_KEY, 'CRYPTO_SECRET_KEY is required');
assert(DISCORD_CLIENT_ID, 'DISCORD_CLIENT_ID is required');
assert(DISCORD_BOT_TOKEN, 'DISCORD_BOT_TOKEN is required');
assert(DISCORD_GUILD_ID, 'DISCORD_GUILD_ID is required');
assert(DISCORD_ADMIN_ID, 'DISCORD_ADMIN_ID is required');

module.exports = {
  NODE_ENV,
  CRYPTO_SECRET_KEY,
  DISCORD_CLIENT_ID,
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  DISCORD_ADMIN_ID,
};
