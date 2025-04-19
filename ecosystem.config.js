module.exports = {
  apps: [
    {
      name: "me.json",
      script: "./index.js",
      watch: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
