<template>
  <view class="chat-page">
    <view class="chat-header">
      <view>
        <text class="title">AI 经营助手</text>
        <text class="subtitle">问我关于销量、客流、门店趋势</text>
      </view>
      <view class="tag">Beta</view>
    </view>

    <scroll-view
      class="message-list"
      scroll-y
      :scroll-with-animation="true"
      :scroll-top="scrollTop"
    >
      <view
        v-for="(msg, index) in messages"
        :key="index"
        :class="['message-item', msg.role]"
      >
        <view class="avatar">
          <uni-icons
            v-if="msg.role === 'ai'"
            type="robot"
            size="24"
            color="#fff"
          ></uni-icons>
          <uni-icons
            v-else
            type="person"
            size="24"
            color="#fff"
          ></uni-icons>
        </view>
        <view class="bubble">
          <text selectable>{{ msg.content }}</text>
        </view>
      </view>

      <view v-if="loading" class="message-item ai">
        <view class="avatar">
          <uni-icons type="more-filled" size="24" color="#fff"></uni-icons>
        </view>
        <view class="bubble loading">正在分析数据...</view>
      </view>
    </scroll-view>

    <view class="input-bar">
      <input
        class="input"
        v-model="inputText"
        placeholder="例如：上个月销售额怎么样？"
        confirm-type="send"
        @confirm="sendMessage"
      />
      <button class="send" :disabled="loading" @tap="sendMessage">
        <uni-icons type="paperplane" size="20" color="#fff"></uni-icons>
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data () {
    return {
      inputText: '',
      messages: [
        {
          role: 'ai',
          content: '老板好！我是您的经营分析师，可以帮您查看销售、客流、客户变化等数据。试着问我：上个月销售额是多少？'
        }
      ],
      loading: false,
      scrollTop: 0
    }
  },
  methods: {
    async sendMessage () {
      if (!this.inputText.trim() || this.loading) return
      const userMsg = this.inputText
      this.messages.push({ role: 'user', content: userMsg })
      this.inputText = ''
      this.scrollToBottom()
      this.loading = true

      try {
        const aiAnalyst = uniCloud.importObject('ai-analyst')
        const res = await aiAnalyst.ask(userMsg)
        let reply = res?.answer || res?.msg || '抱歉，暂时没有得到答案，请稍后再试。'
        if (res && res.code === 401) {
          reply = '请先登录后再使用经营分析师哦～'
        }
        this.messages.push({ role: 'ai', content: reply })
      } catch (e) {
        this.messages.push({ role: 'ai', content: '抱歉，网络开小差了，请重试。' })
        console.error(e)
      } finally {
        this.loading = false
        this.scrollToBottom()
      }
    },
    scrollToBottom () {
      this.$nextTick(() => {
        this.scrollTop = this.messages.length * 1000
      })
    }
  }
}
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(180deg, #f5f7fa 0%, #ffffff 30%);
}

.chat-header {
  padding: 28rpx 32rpx 16rpx;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #eef2f7;
}

.title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #111827;
}

.subtitle {
  margin-top: 4rpx;
  display: block;
  color: #6b7280;
  font-size: 24rpx;
}

.tag {
  padding: 6rpx 14rpx;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  color: #fff;
  border-radius: 24rpx;
  font-size: 22rpx;
}

.message-list {
  flex: 1;
  padding: 28rpx 24rpx;
  box-sizing: border-box;
}

.message-item {
  display: flex;
  margin-bottom: 26rpx;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-item .avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-item.user .avatar {
  background: #6366f1;
  margin-left: 18rpx;
}

.message-item.ai .avatar {
  background: #22c55e;
  margin-right: 18rpx;
}

.bubble {
  max-width: 70%;
  padding: 18rpx 26rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  line-height: 1.6;
  background: #ffffff;
  box-shadow: 0 8rpx 22rpx rgba(0, 0, 0, 0.05);
  color: #111827;
}

.message-item.user .bubble {
  background: #4f46e5;
  color: #fff;
  border-radius: 22rpx 22rpx 0 22rpx;
  box-shadow: none;
}

.message-item.ai .bubble {
  border-radius: 22rpx 22rpx 22rpx 0;
}

.bubble.loading {
  color: #6b7280;
  background: #f3f4f6;
  box-shadow: none;
}

.input-bar {
  padding: 18rpx 24rpx;
  display: flex;
  align-items: center;
  background: #ffffff;
  border-top: 1rpx solid #eef2f7;
  padding-bottom: calc(18rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
}

.input {
  flex: 1;
  height: 80rpx;
  background: #f3f4f6;
  border-radius: 40rpx;
  padding: 0 28rpx;
  font-size: 28rpx;
  margin-right: 16rpx;
}

.send {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  box-shadow: 0 8rpx 18rpx rgba(99, 102, 241, 0.25);
}

.send[disabled] {
  opacity: 0.6;
}
</style>
