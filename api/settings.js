const settingsService = uniCloud.importObject('curd-settings')

function unwrap (res) {
  if (res && typeof res === 'object') {
    if (res.errCode && res.errCode !== 0) {
      const err = new Error(res.errMsg || '请求失败')
      err.errCode = res.errCode
      throw err
    }
    if (res.code && res.code !== 0) {
      const err = new Error(res.msg || res.message || '请求失败')
      err.code = res.code
      throw err
    }
    if (res.data !== undefined) return res.data
  }
  return res
}

export async function fetchSettings () {
  const res = await settingsService.getConfig()
  return unwrap(res)
}

export async function updateSettings (payload) {
  const res = await settingsService.updateConfig(payload)
  return unwrap(res)
}
