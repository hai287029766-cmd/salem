#!/bin/bash
set -e

echo "=== Salem 1692 Deploy ==="

cd /root/salem
git pull origin main

echo "Installing dependencies..."
cd packages/shared
cd ../server && npm ci --production=false
cd ../client && npm ci --production=false

echo "Building server..."
cd ../server && npx tsc

echo "Building client..."
cd ../client && npm run build

echo "Copying client build to server static..."
cd ../..
rm -rf packages/server/static
cp -r packages/client/dist packages/server/static

echo "Restarting server..."
pm2 restart salem-server || pm2 start ecosystem.config.js --env production
pm2 save

echo "=== Deploy complete ==="
echo "Access: http://115.190.232.225:18790"
