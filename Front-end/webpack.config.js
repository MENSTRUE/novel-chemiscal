const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = argv && argv.mode === 'production';

  return {
    entry: path.resolve(__dirname, 'reaction.ts'),
    devtool: isProd ? false : 'inline-source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? 'js/[name].[contenthash:8].js' : 'js/bundle.js',
      clean: true,
      assetModuleFilename: 'assets/[hash][ext][query]'
    },
    resolve: {
      extensions: ['.ts', '.js', '.json']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp)$/i,
          type: 'asset/resource'
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'index.html'),
        inject: 'body',
        minify: isProd
          ? {
              collapseWhitespace: true,
              removeComments: true,
              removeRedundantAttributes: true
            }
          : false
      }),
      new CopyPlugin({
        patterns: [
          { from: path.resolve(__dirname, 'landing.page'), to: 'landing.page' },
          { from: path.resolve(__dirname, 'kimia1.png'), to: 'kimia1.png', noErrorOnMissing: true }
        ]
      })
    ],
    devServer: {
      static: {
        directory: path.join(__dirname)
      },
      compress: true,
      port: 3000,
      open: true,
      hot: true
    }
  };
};
