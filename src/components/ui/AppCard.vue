<template>
  <view class="app-card" :style="cardStyle"><slot /></view>
</template>

<script>
export default {
  name: 'AppCard',
  props: {
    padding: { type: String, default: '16px' },
    radius: { type: String, default: 'var(--r-xl, 22px)' },
    shadow: { type: Boolean, default: true }
  },
  computed: {
    cardStyle () {
      const shadowStyle = this.shadow ? 'box-shadow:0 6px 18px rgba(0,0,0,.06);' : ''
      return `background:#fff;border-radius:${this.radius};padding:${this.padding};${shadowStyle}`
    }
  }
}
</script>

<style scoped>
.app-card { background:#fff; }
</style>
