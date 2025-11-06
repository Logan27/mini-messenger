const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for web-specific modules and fix import.meta issues
config.resolver.alias = {
  'react-native$': 'react-native-web',
};

// Handle module resolution for react-native-webrtc and other native modules
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Fix for import.meta issues by ensuring proper module type
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

// Add support for source maps and debugging
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx', 'json'];

module.exports = config;