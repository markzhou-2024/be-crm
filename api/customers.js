const customersService = uniCloud.importObject('curd-customers')

function handleResponse (res) {
  if (res && typeof res === 'object' && 'errCode' in res && res.errCode !== 0) {
    const err = new Error(res.errMsg || '请求失败')
    err.errCode = res.errCode
    throw err
  }
  if (res && res.data !== undefined) {
    return res.data
  }
  return res
}

export async function fetchCustomers () {
  const res = await customersService.listCustomers()
  return handleResponse(res) || []
}

export async function createCustomer (payload) {
  const res = await customersService.createCustomer(payload)
  return handleResponse(res)
}

export async function updateCustomer (payload) {
  const res = await customersService.updateCustomer(payload)
  return handleResponse(res)
}

export async function deleteCustomer (id) {
  const res = await customersService.deleteCustomer(id)
  return handleResponse(res)
}

export async function getCustomerById (id) {
  const res = await customersService.getCustomerById(id)
  return handleResponse(res)
}
