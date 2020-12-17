const {
  isComponent
} = require('./util')

const {
  removeExt
} = require('../share/util')

const {
  getAutoComponents
} = require('../share/pages')

function formatSource (source) {
  if (source.indexOf('@/') === 0) { // 根目录
    source = source.replace('@/', '')
  } else { // node_modules
    if (process.env.UNI_PLATFORM === 'mp-alipay') {
      if (source.indexOf('@') === 0) {
        source = source.replace('@', 'npm-scope-')
      }
    }
    source = 'node-modules/' + source
  }
  return removeExt(source)
}

function getWebpackChunkName (source) {
  return formatSource(source)
}

function generateAutoComponentsCode (autoComponents, dynamic = false) {
  const components = []
  autoComponents.forEach(({
    name,
    source
  }) => {
    // 统一转换为驼峰命名
    name = name.replace(/-(\w)/g, (_, str) => str.toUpperCase())
    if (dynamic) {
      components.push(`'${name}': function(){return import(/* webpackChunkName: "${getWebpackChunkName(source)}" */'${source}')}`)
    } else {
      components.push(`'${name}': require('${source}').default`)
    }
  })
  return `var components = {${components.join(',')}}`
}

function compileTemplate (source, options, compile) {
  const res = compile(source, options)
  const autoComponents = getAutoComponents([...(options.isUnaryTag.autoComponents || [])])
  if (autoComponents.length) {
    // console.log('检测到的自定义组件:' + JSON.stringify(autoComponents))
    res.components = generateAutoComponentsCode(autoComponents, options.dynamicImport)
  } else {
    res.components = 'var components;'
  }
  return res
}

const compilerModule = {
  preTransformNode (el, options) {
    if (isComponent(el.tag) && el.tag !== 'App') { // App.vue
      // 挂在 isUnaryTag 上边,可以保证外部访问到
      (options.isUnaryTag.autoComponents || (options.isUnaryTag.autoComponents = new Set())).add(el.tag)
    }
  }
}
module.exports = {
  compileTemplate,
  module: compilerModule
}
