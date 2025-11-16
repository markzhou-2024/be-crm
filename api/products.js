const productService = uniCloud.importObject('curd-products')

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

export async function fetchProducts () {
  const res = await productService.getList()
  return unwrap(res) || []
}

export async function fetchProductDetail (product_id) {
  const res = await productService.getDetail({ product_id })
  return unwrap(res)
}

export async function createProduct (payload) {
  const res = await productService.create(payload)
  return unwrap(res)
}

export async function updateProduct (payload) {
  const res = await productService.update(payload)
  return unwrap(res)
}

export async function toggleProductStatus (product_id) {
  const res = await productService.toggleStatus({ product_id })
  return unwrap(res)
}

export async function confirmProductDraft (payload) {
  const res = await productService.confirmDraft(payload)
  return unwrap(res)
}
