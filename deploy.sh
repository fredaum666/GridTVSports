#!/bin/bash
# Azure deployment script to ensure clean node_modules installation

echo "Removing old node_modules if it exists..."
rm -rf node_modules

echo "Installing dependencies..."
npm install

echo "Building production assets..."
npm run build:prod

echo "Deployment complete!"
