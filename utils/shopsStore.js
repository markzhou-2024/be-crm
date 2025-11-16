// utils/shopsStore.js

const KEY = 'shops_mock';

/** 读取门店列表（本地存储） */
export function loadShops(fallback = []) {
  try {
    const val = uni.getStorageSync(KEY);
    return Array.isArray(val) ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

/** 写入门店列表（本地存储） */
export function saveShops(list) {
  uni.setStorageSync(KEY, list || []);
}

/** 按 id 查找门店 */
export function findShopById(list, id) {
  return (list || []).find(s => s && s._id === id);
}

/** 新增或替换门店 */
export function upsertShop(list, shop) {
  const arr = list || [];
  const idx = arr.findIndex(x => x && x._id === shop._id);
  if (idx >= 0) arr.splice(idx, 1, shop);
  else arr.unshift(shop);
  return arr;
}

/** 一次性迁移：给旧门店补齐 month_revenue 字段（默认 0） */
export function migrateShopsRevenue() {
  const list = loadShops([]);
  let changed = false;
  list.forEach(s => {
    if (typeof s.month_revenue === 'undefined') {
      s.month_revenue = 0;
      changed = true;
    }
  });
  if (changed) saveShops(list);
}

/** 可选：演示门店数据 */
export function demoShops() {
  return [
    // { _id: 'shop_1', store_name: '静安旗舰店', month_revenue: 128500, address: '上海市静安区××路' }
  ];
}

/** 默认导出（便于按需导入） */
export default {
  loadShops,
  saveShops,
  findShopById,
  upsertShop,
  migrateShopsRevenue,
  demoShops
};
