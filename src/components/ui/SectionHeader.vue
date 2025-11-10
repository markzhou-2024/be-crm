<template>
  <view class="hd">
    <text class="title">{{ title }}</text>
    <text v-if="linkText" class="more" @tap="$emit('more')">{{ linkText }} ></text>
  </view>
</template>

<script>
export default {
  name: 'SectionHeader',
  props: {
    title: String,
    linkText: String
  }
}
</script>

<style scoped lang="scss">
.hd { display:flex; justify-content:space-between; align-items:center; padding:6px 2px 10px; }
.title { font-weight:600; color:#111; }
.more { color:#C8A675; font-size:13px; }
</style>
