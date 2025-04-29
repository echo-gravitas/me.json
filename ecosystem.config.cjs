module.exports = {
  apps: [
    {
      name: 'me.json Server',
      script: './index.js',
      env_development: {
        NODE_ENV: 'development',
        watch: ['index.js', 'logger.js', 'me.json'],
      },
      env_production: {
        NODE_ENV: 'production',
        watch: false,
      },
    },
  ],
};
