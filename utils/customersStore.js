// utils/customersStore.js

const KEY = 'customers_mock';

/** 读取客户列表（本地存储） */
export function loadCustomers(fallback = []) {
  try {
    const val = uni.getStorageSync(KEY);
    return Array.isArray(val) ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

/** 写入客户列表（本地存储） */
export function saveCustomers(list) {
  uni.setStorageSync(KEY, list || []);
}

/** 生成简单唯一ID */
export function genId() {
  return String(Date.now()) + Math.random().toString(16).slice(2, 8);
}

/** 按 id 查找 */
export function findById(list, id) {
  return (list || []).find(i => i && i._id === id);
}

/** 按手机号查找（可选） */
export function findByPhone(list, phone) {
  const p = (phone || '').trim();
  if (!p) return null;
  return (list || []).find(i => (i.phone || '').trim() === p);
}

/** 新增或替换 */
export function upsert(list, item) {
  const arr = list || [];
  const idx = arr.findIndex(x => x && x._id === item._id);
  if (idx >= 0) {
    arr.splice(idx, 1, item);
  } else {
    arr.unshift(item);
  }
  return arr;
}

/** 按 id 删除 */
export function removeById(list, id) {
  const arr = list || [];
  const idx = arr.findIndex(x => x && x._id === id);
  if (idx >= 0) arr.splice(idx, 1);
  return arr;
}

/** 按门店筛选：''=全部；'_unassigned'=未分配；其它=具体 store_id */
export function filterByStoreId(list, storeId) {
  const arr = list || [];
  if (!storeId) return arr;
  if (storeId === '_unassigned') return arr.filter(x => !x.store_id);
  return arr.filter(x => x.store_id === storeId);
}

/** 一次性迁移：给旧客户补上 store_id 字段（默认空字符串） */
export function migrateCustomersStoreId() {
  const arr = loadCustomers([]);
  let changed = false;
  arr.forEach(c => {
    if (c && !('store_id' in c)) { c.store_id = ''; changed = true; }
  });
  if (changed) saveCustomers(arr);
}

/** 可选：提供演示数据 */
export function demoCustomers() {
  return [
    // 示例：请按需补充 store_id（否则会被迁移脚本置空）
    // { _id: genId(), name: '张小姐', phone: '13888888888', is_vip: true, store_id: '', total_spend: 28500, visit_count: 32, city: '上海市静安区', tag: '面部护理' }
  ];
}

/** 方便默认导入（可选） */
export default {
  loadCustomers,
  saveCustomers,
  genId,
  findById,
  findByPhone,
  upsert,
  removeById,
  filterByStoreId,
  migrateCustomersStoreId,
  demoCustomers
};
