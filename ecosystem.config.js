module.exports = {
  apps: [
    {
      name: 'hour-booster-server',
      script: './server.js',
      watch: true,
      ignore_watch: [
        'node_modules',
        '.git',
        'logs/*',
        'data/*',
      ],
      autorestart: true,
      time: true,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
