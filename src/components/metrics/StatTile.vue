<template>
  <app-card :padding="'16px'">
    <view class="tile">
      <text class="icon" :style="{ color: iconColor }">{{ icon }}</text>
      <view class="val">{{ value }}</view>
      <view class="label">{{ label }}</view>
    </view>
  </app-card>
</template>

<script>
import AppCard from '@/src/components/ui/AppCard.vue'

export default {
  name: 'StatTile',
  components: { AppCard },
  props: {
    icon: String,
    iconColor: { type: String, default: '#111' },
    value: [String, Number],
    label: String
  }
}
</script>

<style scoped lang="scss">
.tile { display:flex; flex-direction:column; gap:4px; }
.icon { font-size:20px; opacity:.9; }
.val { font-size:22px; font-weight:700; color:#111; line-height:28px; }
.label { font-size:12px; color:#6F6F73; }
</style>
