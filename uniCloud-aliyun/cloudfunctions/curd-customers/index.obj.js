// 文档教程: https://uniapp.dcloud.net.cn/uniCloud/schema
{
  "bsonType": "object",
  "required": [
    "user_id",
    "name",
    "create_time"
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
      "bsonType": "string",
      "description": "所属顾问/账号UID（谁维护的这个客户）"
    },
    "name": {
      "bsonType": "string",
      "description": "客户姓名"
    },
    "phone": {
      "bsonType": "string",
      "description": "手机号（可用于去重）"
    },
    "gender": {
      "bsonType": "string",
      "enum": [
        "male",
        "female",
        "unknown"
      ],
      "description": "性别：male/female/unknown"
    },
    "birthday": {
      "bsonType": "string",
      "description": "生日（如 1990-01-01），可选"
    },
    "first_consume_at": {
      "bsonType": "long",
      "description": "首次消费时间戳（ms）。用于统计新客/老客"
    },
    "last_consume_at": {
      "bsonType": "long",
      "description": "最近一次消费时间戳（ms）"
    },
    "first_store_id": {
      "bsonType": "string",
      "description": "首次消费的门店ID（按门店统计新客时使用）"
    },
    "last_store_id": {
      "bsonType": "string",
      "description": "最近一次消费的门店ID"
    },
    "total_consume_count": {
      "bsonType": "int",
      "description": "累计消费次数（所有 consume.count 之和）"
    },
    "total_consume_amount": {
      "bsonType": "double",
      "description": "累计消费金额（元）"
    },
    "tags": {
      "bsonType": "array",
      "description": "客户标签，如“老客、敏感肌、办卡用户”等",
      "items": {
        "bsonType": "string"
      }
    },
