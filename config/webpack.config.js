const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const postcssConfig = require('./postcss.config');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const babelConfig = require('../babel.config');
const webpack = require('webpack');

const makeConfig = () => {
  const isDev = process.env.NODE_ENV === 'development';

  const plugins = [new webpack.EnvironmentPlugin({ NODE_ENV: 'production' })];

  if (isDev) {
    plugins.push(
      new HtmlWebpackPlugin({
        template: 'public/index.html',
      }),
      // new HtmlWebpackTagsPlugin({
      //   tags: ['demo.js', 'main.css', 'app.css'],
      //   append: true,
      // }),
    );
  }

  if (!isDev) {
    plugins.push(
      new MiniCssExtractPlugin({
        filename: '../css/[name].css',
        chunkFilename: '[id].css',
      }),
    );
  }

  const entries = {
    index: ['./src/index'],
    main: ['./src/scss/main.scss'],
    app: ['./src/scss/app.scss'],
    leaflet: ['./src/scss/leaflet.scss'],
    autocomplete: ['./src/scss/autocomplete.scss'],
  };

  if (isDev) {
    entries.demo = ['./src/demo', './src/scss/demo.scss'];
  }

  const config = {
    entry: entries,
    output: {
      path: path.resolve(__dirname, '../dist/umd'),
      filename: '[name].js',
      libraryTarget: process.env.WEBPACK_LIBRARY_TARGET || 'umd',
      globalObject: 'this',
    },
    devServer: {
      static: './public/',
    },
    module: {
      rules: [
        {
          test: /^(?!.*\.{test,min}\.(js|ts)x?$).*\.(js|ts)x?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true,
                ...babelConfig,
              },
            },
          ],
        },
        {
          test: /\.(scss|sass|css)$/,
          use: [
            !isDev
              ? {
                  loader: MiniCssExtractPlugin.loader,
                }
              : 'style-loader',
            'css-loader',
            { loader: 'postcss-loader', options: postcssConfig },
            'sass-loader',
          ].filter(Boolean),
        },
        {
          test: /.(woff(2)?|eot|ttf)(\?[a-z0-9=\.]+)?$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '../fonts/[name].[ext]',
              },
            },
          ],
        },
        {
          test: /\.(jpe?g|png|gif|svg)$/i,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '../img-loader/[name].[ext]',
              },
            },
          ],
        },
      ],
    },
    plugins,
    resolve: {
      mainFields: ['es2015', 'module', 'jsnext:main', 'main'],
      extensions: ['.wasm', '.mjs', '.js', '.json', '.jsx', '.ts', '.tsx'],
      symlinks: false,
      cacheWithContext: false,
    },
    externals: {
      $: '$',
      jquery: 'jQuery',
    },
  };

  if (isDev) {
    config.performance = {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    };
  }

  return config;
};

module.exports = makeConfig();
