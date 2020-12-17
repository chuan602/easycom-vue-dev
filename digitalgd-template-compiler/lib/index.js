const path = require('path')
const parser = require('@babel/parser')

const {
  parseComponent,
  compile,
  compileToFunctions,
  ssrCompile,
  ssrCompileToFunctions
} = require('vue-template-compiler')

const traverseScript = require('./script/traverse')
const generateScript = require('./script/generate')
const traverseTemplate = require('./template/traverse')
const generateTemplate = require('./template/generate')

const compilerModule = require('./module')

const generateCodeFrame = require('./codeframe')

const {
  isComponent,
  isUnaryTag
} = require('./util')

const {
  module: autoComponentsModule,
  compileTemplate
} = require('./auto-components')

module.exports = {
  compile (source, options = {}) {
    options.isUnaryTag = isUnaryTag
    // 将 autoComponents 挂在 isUnaryTag 上边
    options.isUnaryTag.autoComponents = new Set()

    options.modules.push(autoComponentsModule);

    options.preserveWhitespace = false
    if (options.service) {
      options.modules.push(require('./app/service'))
      options.optimize = false // 启用 staticRenderFns
      // domProps => attrs
      options.mustUseProp = () => false
      options.isReservedTag = (tagName) => !isComponent(tagName) // 非组件均为内置
      options.getTagNamespace = () => false

      try {
        return compileTemplate(source, options, compile)
      } catch (e) {
        console.error(source)
        throw e
      }
    } else if (options.view) {
      options.modules.push(require('./app/view'))
      options.optimize = false // 暂不启用 staticRenderFns
      options.isUnaryTag = isUnaryTag
      options.isReservedTag = (tagName) => false // 均为组件
      try {
        return compileTemplate(source, options, compile)
      } catch (e) {
        console.error(source)
        throw e
      }
    }

    if (!options.mp) { // h5,quickapp-native
      return compileTemplate(source, options, compile)
    }

    options.modules.push(compilerModule)

    const res = compileTemplate(source, Object.assign(options, {
      optimize: false
    }), compile)

    const state = {
      ast: {},
      script: '',
      template: '',
      errors: new Set(),
      tips: new Set(),
      options: options.mp
    }
    // console.log(`function render(){${res.render}}`)
    const ast = parser.parse(`function render(){${res.render}}`)
    let template = ''

    try {
      res.render = generateScript(traverseScript(ast, state), state)
      template = generateTemplate(traverseTemplate(ast, state), state)
    } catch (e) {
      console.error(e)
      throw new Error('Compile failed at ' + options.resourcePath.replace(
        path.extname(options.resourcePath),
        '.vue'
      ))
    }

    res.specialMethods = state.options.specialMethods || new Set()
    delete state.options.specialMethods

    res.files = state.files || {}
    delete state.files

    // resolve scoped slots
    res.generic = state.generic || []
    delete state.generic

    // define scoped slots
    res.componentGenerics = state.componentGenerics || {}
    delete state.componentGenerics

    state.errors.forEach(msg => {
      res.errors.push({
        msg
      })
    })

    const resourcePath = options.resourcePath.replace(path.extname(options.resourcePath), '')

    state.tips.forEach(msg => {
      console.log(`提示：${msg}
at ${resourcePath}.vue:1`)
    })

    /**
     * TODO
     * 方案0.最佳方案是在 loader 中直接 emitFile，但目前 vue template-loader 不好介入,自定义的 compiler 结果又无法顺利返回给 loader
     * 方案1.通过 loader 传递 emitFile 来提交生成 wxml,需要一个 template loader 来给自定义 compier 增加 emitFile
     * 方案2.缓存 wxml 内容，由 plugin 生成 assets 来提交生成 wxml
     * ...暂时使用方案1
     */
    if (options.emitFile) {
      // cache
      if (process.env.UNI_USING_CACHE) {
        const oldEmitFile = options.emitFile
        process.UNI_CACHE_TEMPLATES = {}
        options.emitFile = function emitFile (name, content) {
          const absolutePath = path.resolve(process.env.UNI_OUTPUT_DIR, name)
          process.UNI_CACHE_TEMPLATES[absolutePath] = content
          oldEmitFile(name, content)
        }
      }

      if (options.updateSpecialMethods) {
        options.updateSpecialMethods(resourcePath, [...res.specialMethods])
      }
      const filterTemplate = []

      if (filterTemplate.length) {
        template = filterTemplate.join('\n') + '\n' + template
      }

      options.emitFile(options.resourcePath, template)
      if (res.files) {
        Object.keys(res.files).forEach(name => {
          options.emitFile(name, res.files[name])
        })
      }

      if (state.options.usingGlobalComponents) {
        options.updateUsingGlobalComponents(
          resourcePath,
          state.options.usingGlobalComponents
        )
      }

      if (
        res.generic &&
        res.generic.length &&
        options.updateGenericComponents
      ) {
        options.updateGenericComponents(
          resourcePath,
          res.generic
        )
      }
      if (
        res.componentGenerics &&
        Object.keys(res.componentGenerics).length &&
        options.updateComponentGenerics
      ) {
        options.updateComponentGenerics(
          resourcePath,
          res.componentGenerics
        )
      }
    } else {
      res.template = template
    }
    return res
  },
  parseComponent,
  compileToFunctions,
  ssrCompile,
  ssrCompileToFunctions,
  generateCodeFrame
}
