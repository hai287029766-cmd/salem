module.exports = {
  apps: [{
    name: "salem-server",
    script: "./packages/server/dist/index.js",
    cwd: "/root/salem",
    instances: 1,
    exec_mode: "fork",
    env_production: {
      NODE_ENV: "production",
      PORT: 2567,
      LIVEKIT_API_KEY: "salem_api_key",
      LIVEKIT_API_SECRET: "change_me_on_server",
      LIVEKIT_URL: "ws://127.0.0.1:7880"
    },
    max_memory_restart: "512M",
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "/root/salem/logs/error.log",
    out_file: "/root/salem/logs/out.log"
  }]
};
