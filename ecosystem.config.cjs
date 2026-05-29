module.exports = {
  apps: [
    {
      name: "mc-addon-deployer",
      script: "src/index.js",
      cwd: "./server",
      interpreter: "node",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
