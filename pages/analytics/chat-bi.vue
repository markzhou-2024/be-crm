<template>
  <view class="chat-container">
    <view class="header">
      <view>
        <text class="title">AI 经营助手 🤖</text>
        <text class="subtitle">问我关于销量、客流的问题</text>
      </view>
      <button class="refresh-btn" size="mini" @tap="resetChat">新对话</button>
    </view>

    <scroll-view class="message-list" scroll-y :scroll-top="scrollTop">
      <view
        v-for="(msg, index) in messages"
        :key="index"
        :class="['message-item', msg.role]"
      >
        <view class="avatar">
          <uni-icons v-if="msg.role === 'ai'" type="robot" size="24" color="#fff"></uni-icons>
          <uni-icons v-else type="person" size="24" color="#fff"></uni-icons>
        </view>
        <view class="bubble">
          <text selectable>{{ msg.content }}</text>
          <view v-if="msg.data && msg.data.length" class="data-chip">
            数据行数：{{ msg.data.length }}
          </view>
        </view>
      </view>

      <view v-if="loading" class="message-item ai">
        <view class="avatar"><uni-icons type="more-filled" size="24"></uni-icons></view>
        <view class="bubble loading">正在分析数据...</view>
      </view>
    </scroll-view>

    <view class="input-area">
      <input
        class="input-box"
        v-model="inputText"
        placeholder="例如：上个月销售额怎么样？"
        confirm-type="send"
        @confirm="sendMessage"
      />
      <button class="send-btn" @tap="sendMessage" :disabled="loading">
        <uni-icons type="paperplane" size="20" color="#fff"></uni-icons>
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      inputText: '',
      messages: [
        {
          role: 'ai',
          content:
            '老板好！我是您的经营分析师。您可以问我：“上个月有多少新客户？” 或 “最近谁消费最高？”'
        }
      ],
      loading: false,
      scrollTop: 0
    }
  },
  methods: {
    async sendMessage() {
      if (!this.inputText.trim() || this.loading) return

      const userMsg = this.inputText
      this.messages.push({ role: 'user', content: userMsg })
      this.inputText = ''
      this.scrollToBottom()
      this.loading = true

      try {
        const aiAnalyst = uniCloud.importObject('ai-analyst')
        const res = await aiAnalyst.ask({ question: userMsg })
        if (res?.code && res.code !== 0) {
          throw new Error(res.msg || 'AI 分析失败')
        }
        const answer = res?.answer || res?.data?.answer || '抱歉，暂时没有得到回答'
        const dataReference = res?.dataReference || res?.data?.dataReference || []
        this.messages.push({ role: 'ai', content: answer, data: dataReference })
      } catch (e) {
        console.error(e)
        this.messages.push({ role: 'ai', content: '抱歉，网络开小差了，请重试。' })
      } finally {
        this.loading = false
        this.scrollToBottom()
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        this.scrollTop = this.messages.length * 1000
      })
    },
    resetChat() {
      this.messages = [
        {
          role: 'ai',
          content:
            '老板好！我是您的经营分析师。您可以问我：“上个月有多少新客户？” 或 “最近谁消费最高？”'
        }
      ]
      this.scrollToBottom()
    }
  }
}
</script>

<style lang="scss" scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

.header {
  padding: 40rpx 30rpx 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    display: block;
  }
  .subtitle {
    font-size: 24rpx;
    color: #999;
    margin-top: 5rpx;
    display: block;
  }
  .refresh-btn {
    height: 60rpx;
    line-height: 60rpx;
    border-radius: 30rpx;
    padding: 0 24rpx;
    background: linear-gradient(135deg, #4cd964, #2dbd74);
    color: #fff;
    border: none;
  }
}

.message-list {
  flex: 1;
  padding: 30rpx;
  box-sizing: border-box;
}

.message-item {
  display: flex;
  margin-bottom: 30rpx;

  &.user {
    flex-direction: row-reverse;

    .bubble {
      background-color: #007aff;
      color: #fff;
      border-radius: 20rpx 20rpx 0 20rpx;
    }

    .avatar {
      background-color: #007aff;
      margin-left: 20rpx;
    }
  }

  &.ai {
    flex-direction: row;

    .bubble {
      background-color: #fff;
      color: #333;
      border-radius: 20rpx 20rpx 20rpx 0;
      box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
    }

    .avatar {
      background-color: #4cd964;
      margin-right: 20rpx;
    }
  }
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bubble {
  max-width: 65%;
  padding: 20rpx 30rpx;
  font-size: 28rpx;
  line-height: 1.5;
  position: relative;
}

.data-chip {
  margin-top: 12rpx;
  background: #eef2ff;
  color: #4f46e5;
  padding: 8rpx 12rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.loading {
  color: #666;
}

.input-area {
  background: #fff;
  padding: 20rpx 30rpx;
  display: flex;
  align-items: center;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  gap: 20rpx;

  .input-box {
    flex: 1;
    height: 80rpx;
    background: #f0f2f5;
    border-radius: 40rpx;
    padding: 0 30rpx;
  }

  .send-btn {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    background: #007aff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;

    &[disabled] {
      opacity: 0.6;
    }
  }
}
</style>
