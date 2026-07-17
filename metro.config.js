// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web worker imports a .wasm module; Metro must treat it as an asset.
config.resolver.assetExts.push('wasm');

module.exports = config;
