const path = require('path')

module.exports = (env, argv) => ({
  entry: [
    'whatwg-fetch',
    './src/index.js'
  ],
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    historyApiFallback: true
  },
  devtool: argv.mode !== 'production' ? 'eval-cheap-module-source-map' : false,
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      }
    ]
  }
})
