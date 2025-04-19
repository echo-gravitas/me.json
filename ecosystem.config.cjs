module.exports = {
  apps: [
    {
      name: "me.json Server",
      script: "./index.js",
      watch: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
