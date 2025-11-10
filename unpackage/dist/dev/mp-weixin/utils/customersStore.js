"use strict";
require("../common/vendor.js");
function filterByStoreId(list, storeId) {
  const arr = list || [];
  if (!storeId)
    return arr;
  if (storeId === "_unassigned")
    return arr.filter((x) => !x.store_id);
  return arr.filter((x) => x.store_id === storeId);
}
exports.filterByStoreId = filterByStoreId;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/customersStore.js.map
