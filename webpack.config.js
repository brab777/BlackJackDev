const crypto = require('crypto');
crypto.createHash = (algorithm) => crypto.createHash(algorithm === 'md4' ? 'sha256' : algorithm);

module.exports = function override(config, env) {
  return config;
};