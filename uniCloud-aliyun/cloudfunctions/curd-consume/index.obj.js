// 文档教程: https://uniapp.dcloud.net.cn/uniCloud/schema
{
  "bsonType": "object",
  "required": [
    "user_id",
    "customer_id",
    "product_name",
    "count",
    "consumed_at",
    "create_time",
    "update_time"
  ],
  "permission": {
    "read": false,
    "create": false,
    "update": false,
    "delete": false
  },
  "properties": {
    "_id": {
      "description": "ID，系统自动生成"
    },
    "user_id": {
      "description": "记录所属用户ID（顾问UID）",
      "bsonType": "string"
    },
    "customer_id": {
      "description": "顾客ID（customers._id）",
      "bsonType": "string"
    },
    "buy_id": {
      "description": "关联的购买记录ID（buy._id）",
      "bsonType": "string"
    },
    "product_name": {
      "description": "项目名称 / 套餐名称快照",
      "bsonType": "string"
    },
    "count": {
      "description": "本次消耗次数",
      "bsonType": "int"
    },
    "store_id": {
      "description": "门店ID（shops._id）",
      "bsonType": "string"
    },
    "store_name": {
      "description": "门店名称快照（方便报表显示）",
      "bsonType": "string"
    },
    "store_service": {
      "description": "是否为门店人员提供的服务（true=门店自己登记，false=顾问登记）",
      "bsonType": "bool"
    },
    "unit_price": {
      "description": "本次消耗对应的单次价格（元/次），通常来自 buy.amount / buy.service_times 的快照",
      "bsonType": "double"
    },
    "amount": {
      "description": "本次消耗金额（元）= unit_price * count，用于财务统计",
      "bsonType": "double"
    },
    "consumed_at": {
      "description": "消耗发生时间（时间戳，ms）",
      "bsonType": "long"
    },
    "create_time": {
      "description": "创建时间（时间戳，ms）",
      "bsonType": "long"
    },
    "update_time": {
      "description": "更新时间（时间戳，ms）",
      "bsonType": "long"
    }
  },
  "indexes": [
    {
      "name": "idx_user_store_time",
      "fields": [
        { "field": "user_id", "order": "asc" },
        { "field": "store_id", "order": "asc" },
        { "field": "consumed_at", "order": "desc" }
      ]
    },
    {
      "name":
