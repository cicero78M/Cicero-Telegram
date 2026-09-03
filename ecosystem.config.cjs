module.exports = {
  apps: [
    {
      name: "bot_tele",
      script: "app.js",         // ganti kalau entrypoint kamu bukan app.js
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
