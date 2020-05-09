/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')

const PORT = 8080
const PORT_EXTERNAL = process.env.PORT_EXTERNAL || PORT

const ENV_DEV = 'dev'
const ENV_PROD = 'prod'

const getEnvironment = () => {
  if (process.env.CORP_YST_ENV) {
    return process.env.CORP_YST_ENV
  } else if (process.env.NODE_ENV === 'production') {
    return ENV_PROD
  } else {
    return ENV_DEV
  }
}

const ENV = getEnvironment()

// noinspection JSUnusedGlobalSymbols
module.exports = {
  pages: {
    index: {
      entry: './src/main.js',
    },
  },

  chainWebpack: config => {
    config.resolve.alias.set('assets', path.join(__dirname, '/src/assets'))
    config.resolve.alias.set('components', path.join(__dirname, '/src/components'))
    config.resolve.alias.set('entities', path.join(__dirname, '/src/entities'))
    config.resolve.alias.set('utils', path.join(__dirname, '/src/utils'))
    config.resolve.alias.set('views', path.join(__dirname, '/src/views'))
  },

  configureWebpack: {
    output: ENV === ENV_PROD ? {
      filename: 'js/[name].[contenthash].js',
      chunkFilename: 'js/[name].[contenthash].js',
    } : undefined,
  },

  css: {
    extract: ENV === ENV_PROD ? {
      filename: 'css/[name].[contenthash].css',
      chunkFilename: 'css/[name].[contenthash].css',
    } : undefined,

    sourceMap: true,
  },

  devServer: {
    public: `http://localhost:${PORT_EXTERNAL}/`,
  },

  productionSourceMap: false,
}
