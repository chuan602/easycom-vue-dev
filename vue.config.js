const compiler = require('./digitalgd-template-compiler')
const WebpackDigitalgdInvalid = require('./digitalgd-easycom-plugin/lib/index');

module.exports = {
  chainWebpack: config => {
    config.module
      .rule('vue')
      .use('vue-loader')
        .tap(options => {
          return Object.assign({}, options, {
            compiler,
          })
        })
    config
      .plugin('webpack-digitalgd-invalid')
      .use(WebpackDigitalgdInvalid)
  }
}