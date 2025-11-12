const bookingService = uniCloud.importObject('curd-booking', { customUI: true })

function unwrap (res) {
  if (!res) return res
  if (typeof res === 'object') {
    if (res.errCode !== undefined && res.errCode !== 0) {
      const err = new Error(res.errMsg || '请求失败')
      err.errCode = res.errCode
      throw err
    }
    if (res.code !== undefined && res.code !== 0) {
      const err = new Error(res.message || res.msg || '请求失败')
      err.code = res.code
      throw err
    }
  }
  if (res && res.data !== undefined) {
    return res.data
  }
  return res
}

function toArray (res) {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res?.list)) return res.list
  if (Array.isArray(res?.result?.data)) return res.result.data
  return []
}

export async function createBooking (payload) {
  const res = await bookingService.add(payload)
  return unwrap(res)
}

export async function listBookingsByCustomer (params = {}) {
  const res = await bookingService.listByCustomer(params)
  return toArray(unwrap(res))
}

export async function updateBookingStatus ({ booking_id, status }) {
  const res = await bookingService.updateStatus({ booking_id, status })
  return unwrap(res)
}

export async function listTodayBookings (filters = {}) {
  if (typeof bookingService.listToday !== 'function') {
    return []
  }
  const res = await bookingService.listToday(filters)
  return toArray(unwrap(res))
}
