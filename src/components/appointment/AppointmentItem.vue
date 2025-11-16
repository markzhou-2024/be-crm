<template>
  <view class="row" @tap="$emit('click')">
    <view class="time">{{ time }}</view>
    <view class="info">
      <view class="name">{{ name }}</view>
      <view class="desc">{{ service }} · {{ store }}</view>
    </view>
    <text class="arrow">›</text>
  </view>
</template>

<script>
export default {
  name: 'AppointmentItem',
  props: {
    time: String,
    name: String,
    service: String,
    store: String
  }
}
</script>

<style scoped lang="scss">
.row { display:flex; align-items:center; padding:14px 10px; border-bottom:1px solid #F0F0F0; }
.row:last-child { border-bottom:0; }
.time { width:64px; color:#C79A5A; font-weight:600; }
.info { flex:1; display:flex; flex-direction:column; gap:4px; }
.name { color:#111; font-weight:600; }
.desc { color:#6F6F73; font-size:12px; }
.arrow { color:#C8C8CC; font-size:22px; padding:0 2px; }
</style>
