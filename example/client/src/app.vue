<template>
  <div class="wrapper">
    <DynamicComponent />
    <fe-spacer :x="2" :y="2" />
    <fe-button type="success" auto size="mini">Action</fe-button>
    <text />
  </div>
</template>

<script>
import { defineComponent, defineAsyncComponent } from 'vue'
import { Spacer, Button } from '@fect-ui/vue'

export default defineComponent({
  components: {
    [Spacer.name]: Spacer,
    [Button.name]: Button,
    DynamicComponent: defineAsyncComponent(() => import('./component.vue'))
  }
})
</script>

<script></script>

<style>
.wrapper > div {
  margin: 0 50px;
}
</style>
