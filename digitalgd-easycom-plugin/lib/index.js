const {
  initAutoImportScanComponents
} = require('../../digitalgd-template-compiler/share/pages')

class DigitalgEasycommPlugin {
  apply (compiler) {
    compiler.hooks.invalid.tap('webpack-digitalgd-invalid', (fileName) => {
      if (fileName && typeof fileName === 'string') {
        if (fileName.indexOf('.vue') !== -1) {
          initAutoImportScanComponents()
          // if (process.UNI_AUTO_SCAN_COMPONENTS) {
          // }
        }
      }
    })
  }
}

module.exports = DigitalgEasycommPlugin
