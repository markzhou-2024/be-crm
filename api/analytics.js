const analyticsService = uniCloud.importObject('analytics', { customUI: true })

function unwrap (res) {
  if (!res) return res
  if (typeof res === 'object') {
    if (res.errCode !== undefined && res.errCode !== 0) {
      const err = new Error(res.errMsg || '请求失败')
      err.errCode = res.errCode
      throw err
    }
    if (res.code !== undefined && res.code !== 0) {
      const err = new Error(res.message || '请求失败')
      err.code = res.code
      throw err
    }
    if (res.data !== undefined) return res.data
  }
  return res
}

export async function fetchNextWeekBookings (params = {}) {
  const res = await analyticsService.next7DaysBookings(params)
  return unwrap(res) || []
}

export async function fetchMonthCalendarSummary (params = {}) {
  const res = await analyticsService.monthCalendarSummary(params)
  return unwrap(res)
}

export async function fetchStoreMonthlyKPI (params = {}) {
  const res = await analyticsService.storeMonthlyKPI(params)
  return unwrap(res) || { arrive_customer_distinct: 0, service_count: 0, consume_amount: 0 }
}

export async function fetchCustomerStoreVisitCount (params = {}) {
  const res = await analyticsService.customerStoreVisitCount(params)
  return unwrap(res) || { visit_count: 0 }
}

export async function fetchCustomerSegmentation (params = {}) {
  const res = await analyticsService.customerSegmentationMonthly(params)
  return unwrap(res)
}
