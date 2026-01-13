const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      sportsBarMode: './public/sportsBarMode.js',
      gridConfig: './public/grid-config/index.jsx'
    },
    output: {
      filename: '[name].min.js',
      path: path.resolve(__dirname, 'public/dist'),
      clean: true,
    },
    mode: isProduction ? 'production' : 'development',
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          include: [
            path.resolve(__dirname, 'public/grid-config')
          ],
          use: {
            loader: 'babel-loader',
            options: {
              sourceType: 'unambiguous',
              presets: [
                ['@babel/preset-env', {
                  targets: { browsers: ['> 1%', 'last 2 versions'] }
                }],
                ['@babel/preset-react', { runtime: 'automatic' }]
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx']
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
              drop_debugger: true,
              dead_code: false,
              unused: false,
              passes: 2,
            },
            mangle: {
              toplevel: false,
              reserved: ['initSportsBarMode', 'SportsBarMode', 'sportsBarMode']
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
    },
    devtool: isProduction ? false : 'source-map',
    performance: {
      hints: false,
    },
  };
};
