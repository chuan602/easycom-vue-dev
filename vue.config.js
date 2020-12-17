const compiler = require('./digitalgd-template-compiler')

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
  }
}