// 统一出口；后续替换为真实 API
export async function getHomeStats () {
  return {
    store_count: 12,
    customer_count: 1248,
    month_sales: 328000,
    month_consume_count: 856
  }
}

export async function getTodayAppointments () {
  return [
    { id: '1', time: '10:00', name: '张小姐', service: '面部护理', store: '静安店' },
    { id: '2', time: '14:30', name: '李女士', service: 'SPA套餐', store: '浦东店' },
    { id: '3', time: '16:00', name: '王小姐', service: '美容护理', store: '静安店' }
  ]
}
