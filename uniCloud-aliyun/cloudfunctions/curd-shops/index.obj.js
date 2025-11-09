// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129
const uniID = require('uni-id-common')

module.exports = {
	/**
	 * 通用预处理器：创建 uni-id 实例并校验 token，解析 uid
	 */
	async _before () {
		// 1) 获取客户端信息并创建 uni-id 实例
		const clientInfo = this.getClientInfo()
		this.uniID = uniID.createInstance({
			clientInfo
		})

		// 2) 统一从多来源获取 token（clientInfo、HTTP Header、HTTP Body）
		const httpInfo = typeof this.getHttpInfo === 'function' ? this.getHttpInfo() : null
		let token = ''
		if (clientInfo && clientInfo.uniIdToken) {
			token = clientInfo.uniIdToken
		}
		if (!token && httpInfo && httpInfo.headers) {
			// 常见约定头：x-uni-id-token / uni-id-token
			token = httpInfo.headers['x-uni-id-token'] || httpInfo.headers['uni-id-token'] || ''
		}
		if (!token && httpInfo && httpInfo.body) {
			try {
				const parsed = JSON.parse(httpInfo.body)
				token = parsed.uniIdToken || ''
			} catch (e) {
				// ignore body parse error
			}
		}

		// 3) 校验并解密 token，提取 uid
		this.authInfo = null
		this.uid = null
		if (token) {
			const payload = await this.uniID.checkToken(token)
			// 兼容不同返回字段：errCode 或 code 表示失败
			if (!payload || payload.errCode || payload.code) {
				// token 校验失败时，不抛错，交由具体方法按需处理
				this.authInfo = payload
				return
			}
			this.authInfo = payload
			this.uid = payload.uid
			// 可选：如果返回了新 token，可在此返回给前端（示例保留字段）
			if (payload.token) {
				this.response = this.response || {}
				this.response.newToken = {
					token: payload.token,
					tokenExpired: payload.tokenExpired
				}
			}
		}
	},
	/**
	 * method1方法描述
	 * @param {string} param1 参数1描述
	 * @returns {object} 返回值描述
	 */
	/* 
	method1(param1) {
		// 参数校验，如无参数则不需要
		if (!param1) {
			return {
				errCode: 'PARAM_IS_NULL',
				errMsg: '参数不能为空'
			}
		}
		// 业务逻辑
		
		// 返回结果
		return {
			param1 //请根据实际需要返回值
		}
	}
	*/
}
