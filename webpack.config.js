const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './public/sportsBarMode.js',
    output: {
      filename: 'sportsBarMode.min.js',
      path: path.resolve(__dirname, 'public/dist'),
      clean: true, // Clean the output directory before emit
    },
    mode: isProduction ? 'production' : 'development',
    optimization: {
      minimize: isProduction, // Only minimize in production
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true, // Remove console.logs in production
              drop_debugger: true, // Remove debugger statements
              dead_code: false, // Don't remove dead code too aggressively
              unused: false, // Don't remove unused code
              passes: 2, // Run compression twice for better results
            },
            mangle: {
              // Mangle variable names to make them unreadable
              toplevel: false, // Don't mangle top-level names to avoid breaking code
              // Keep these public API names intact
              reserved: ['initSportsBarMode', 'SportsBarMode', 'sportsBarMode']
            },
            format: {
              comments: false, // Remove all comments
            },
          },
          extractComments: false, // Don't extract comments to separate file
        }),
      ],
    },
    // Source maps only in development
    devtool: isProduction ? false : 'source-map',
    performance: {
      hints: false, // Disable performance hints
    },
  };
};
