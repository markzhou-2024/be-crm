const uniID = require('uni-id-common')
const db = uniCloud.database()
const buyCollection = db.collection('buy')
const customersCollection = db.collection('customers')
const settingsCollection = db.collection('settings')
const productsCollection = db.collection('products')
const dbCmd = db.command

function assertAuthed (ctx) {
  if (!ctx.uid) {
    throw {
      errCode: 'AUTH_REQUIRED',
      errMsg: '请登录后再试'
    }
  }
}

async function autoSupplementProduct (ctx, payload = {}) {
	const productId = (payload.product_id || '').trim()
	const productName = (payload.product_name || '').trim()
	if (productId || !productName) {
		return payload
	}
	const { data } = await settingsCollection.where({ user_id: ctx.uid }).limit(1).get()
	const auto = data && data.length ? data[0].auto_supplement_product !== false : true
	if (!auto) {
		return payload
	}
	const existRes = await productsCollection.where({
		user_id: ctx.uid,
		product_name: productName
	}).limit(1).get()
	let finalProductId = null
	if (existRes.data && existRes.data.length) {
		finalProductId = existRes.data[0]._id
	} else {
		const now = Date.now()
		const addRes = await productsCollection.add({
			user_id: ctx.uid,
			product_name: productName,
			status: 'on_sale',
			is_draft: true,
			source: 'from_order',
			create_time: now,
			update_time: now
		})
		finalProductId = addRes.id || addRes.insertId || (Array.isArray(addRes.insertedIds) ? addRes.insertedIds[0] : null)
	}
	if (finalProductId) {
		payload.product_id = finalProductId
	}
	return payload
}

async function createBuyRecord (ctx, purchase = {}) {
	const packageName = (purchase.package_name || '').trim()
	const customerId = (purchase.customer_id || '').trim()
	const storeName = (purchase.store_name || '').trim()
	const storeIdInput = (purchase.store_id || '').trim()
	if (!packageName || !customerId) {
		return { errCode: 'INVALID_PARAM', errMsg: '套餐名称与客户ID必填' }
	}
	const times = Number(purchase.service_times)
	if (!Number.isInteger(times) || times <= 0) {
		return { errCode: 'INVALID_PARAM', errMsg: '服务次数须为正整数' }
	}
	const amount = Number(purchase.amount)
	if (isNaN(amount) || amount < 0) {
		return { errCode: 'INVALID_PARAM', errMsg: '金额不合理' }
	}
	const date = purchase.purchase_date || new Date().toISOString().slice(0, 10)
	const now = Date.now()
	let storeId = storeIdInput
	let finalStoreName = storeName
	const { data: customerDocs } = await customersCollection.where({
		_id: customerId,
		user_id: ctx.uid
	}).field({
		store_id: true,
		store_name: true
	}).limit(1).get()
	const customerInfo = customerDocs && customerDocs[0]
	if (customerInfo) {
		if (!storeId) storeId = (customerInfo.store_id || '').trim()
		if (!finalStoreName) finalStoreName = customerInfo.store_name || ''
	}
	const payload = {
		user_id: ctx.uid,
		customer_id: customerId,
		product_id: (purchase.product_id || '').trim(),
		product_name: (purchase.product_name || '').trim(),
		package_name: packageName,
		service_times: times,
		amount,
		purchase_date: date,
		remark: purchase.remark || '',
		store_id: storeId,
		store_name: finalStoreName,
		is_first_purchase: !!purchase.is_first_purchase,
		create_time: now,
		update_time: now
	}
	const res = await buyCollection.add(payload)
	const insertedId = res.id || res.insertId || (Array.isArray(res.insertedIds) ? res.insertedIds[0] : null)

	// 若标记新客首次购买，则回写 customers.first_purchase_at（仅在未设置或更晚时）
	try {
		if (payload.is_first_purchase) {
			const ts = Date.parse(`${date}T00:00:00`)
			if (!Number.isNaN(ts)) {
				await customersCollection.where({
					_id: customerId,
					user_id: ctx.uid,
					$or: [
						{ first_purchase_at: dbCmd.exists(false) },
						{ first_purchase_at: null },
						{ first_purchase_at: dbCmd.gt(ts) }
					]
				}).update({ first_purchase_at: ts, update_time: Date.now() })
			}
		}
	} catch (e) {
		console.error('update customers.first_purchase_at failed', e)
	}
	return {
		errCode: 0,
		data: {
			_id: insertedId || payload._id,
			...payload
		}
	}
}

module.exports = {
  async _before () {
    const clientInfo = this.getClientInfo()
    this.uniID = uniID.createInstance({ clientInfo })

    const httpInfo = typeof this.getHttpInfo === 'function' ? this.getHttpInfo() : null
    let token = ''
    if (clientInfo && clientInfo.uniIdToken) {
      token = clientInfo.uniIdToken
    }
    if (!token && httpInfo && httpInfo.headers) {
      token = httpInfo.headers['x-uni-id-token'] || httpInfo.headers['uni-id-token'] || ''
    }
    if (!token && httpInfo && httpInfo.body) {
      try {
        const parsed = JSON.parse(httpInfo.body)
        token = parsed.uniIdToken || ''
      } catch (e) {}
    }

    this.uid = null
    if (token) {
      const payload = await this.uniID.checkToken(token)
      if (payload && !payload.errCode && !payload.code) {
        this.uid = payload.uid
        if (payload.token) {
          this.response = this.response || {}
          this.response.newToken = {
            token: payload.token,
            tokenExpired: payload.tokenExpired
          }
        }
      }
    }
  },
  async createOrder (payload = {}) {
    assertAuthed(this)
    await autoSupplementProduct(this, payload)
    return createBuyRecord(this, payload)
  },
  async createPurchase (purchase = {}) {
    return this.createOrder(purchase)
  },  async listPurchases (customerId) {
    assertAuthed(this)
    const where = {
      user_id: this.uid
    }
    if (customerId) {
      where.customer_id = customerId
    }
    const { data } = await buyCollection.where(where).orderBy('purchase_date', 'desc').get()
    return data || []
  }
}
