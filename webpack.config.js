const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProd = argv?.mode === 'production';

  return {
    entry: path.resolve(__dirname, 'Front-end/reaction.ts'),
    devtool: isProd ? false : 'inline-source-map',

    output: {
      path: path.resolve(__dirname, 'dist'),
      publicPath: '/', // ✅ FIX #1: Aset akan dimuat dari root URL
      filename: isProd ? 'js/[name].[contenthash:8].js' : 'js/bundle.js',
      clean: true,
      assetModuleFilename: 'assets/[hash][ext][query]'
    },

    resolve: {
      extensions: ['.ts', '.js']
    },

    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [
            isProd ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp)$/i,
          type: 'asset/resource'
        }
      ]
    },

    plugins: [
      isProd &&
        new MiniCssExtractPlugin({
          filename: 'css/[name].[contenthash:8].css'
        }),

      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'Front-end/index.html'),
        inject: 'body',
        minify: isProd
          ? {
              collapseWhitespace: true,
              removeComments: true
            }
          : false
      }),

      // ✅ FIX #2: CopyPlugin tunggal yang menyalin SEMUA aset manual
      new CopyPlugin({
        patterns: [
          { from: path.resolve(__dirname, 'Front-end/assets'), to: 'assets' },
          { from: path.resolve(__dirname, 'Front-end/ui'), to: 'ui' }, // Untuk halaman HTML dalam
          { from: path.resolve(__dirname, 'Front-end/css'), to: 'css' }, // Untuk style.css manual
          { from: path.resolve(__dirname, 'Front-end/js'), to: 'js' }, // Untuk file JS manual
          { from: path.resolve(__dirname, 'Front-end/_redirects'), to: '_redirects' } // Untuk SPA 404 Fix
        ]
      })
    ].filter(Boolean),

    devServer: {
      static: {
        directory: path.resolve(__dirname, 'dist')
      },
      compress: true,
      port: 3000,
      open: true,
      hot: true
    }
  };
};