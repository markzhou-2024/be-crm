const service = uniCloud.importObject("curd-buy")

function normalize(res) {
  if (res && typeof res === 'object' && 'errCode' in res && res.errCode !== 0) {
    const err = new Error(res.errMsg || '请求失败')
    err.errCode = res.errCode
    throw err
  }
  if (Array.isArray(res)) return res
  if (res && Array.isArray(res.data)) return res.data
  return res?.data || res
}

export async function createPurchase(payload) {
  const res = await service.createPurchase(payload)
  return normalize(res)
}

export async function listPurchases(customerId) {
  const res = await service.listPurchases(customerId)
  return normalize(res) || []
}
