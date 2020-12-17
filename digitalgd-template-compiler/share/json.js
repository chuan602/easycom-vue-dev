const fs = require('fs')
const path = require('path')
const stripJsonComments = require('strip-json-comments')

function parseJson (content) {
  if (typeof content === 'string') {
    try {
      content = JSON.parse(stripJsonComments(content))
    } catch (e) {
      throw new Error('digitalgd-template-compiler: ' + e.message)
    }
  }

  content = JSON.stringify(content)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

  return JSON.parse(content)
}

function getJson (jsonFileName) {
  const jsonFilePath = path.resolve(process.cwd(), jsonFileName)
  if (!fs.existsSync(jsonFilePath)) {
    throw new Error(jsonFilePath + ' 不存在')
  }
  try {
    return parseJson(fs.readFileSync(jsonFilePath, 'utf8'))
  } catch (e) {
    console.error(jsonFileName + ' 解析失败')
  }
}

module.exports = {
  getJson,
  parseJson
}
