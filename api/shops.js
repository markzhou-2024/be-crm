const shopsService = uniCloud.importObject('curd-shops')

function normalizeResponse(res) {
  if (res && typeof res === 'object' && 'errCode' in res && res.errCode !== 0) {
    const err = new Error(res.errMsg || '请求失败')
    err.errCode = res.errCode
    throw err
  }
  if (Array.isArray(res)) return res
  if (res && Array.isArray(res.data)) return res.data
  return []
}

export async function fetchShops() {
  const res = await shopsService.listMyShops()
  return normalizeResponse(res)
}
