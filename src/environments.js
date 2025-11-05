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

assert(NODE_ENV, 'NODE_ENV is required');
assert(CRYPTO_SECRET_KEY, 'CRYPTO_SECRET_KEY is required');

module.exports = {
  NODE_ENV,
  CRYPTO_SECRET_KEY,
};
