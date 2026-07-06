#!/bin/bash
echo "Installing Electron v22 for Windows 8 support..."
npm install electron@22.3.27 --no-save

echo "Building Windows legacy version..."
npx electron-builder --win

echo "Restoring latest Electron version..."
npm install
