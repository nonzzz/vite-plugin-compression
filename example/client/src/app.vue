<template>
  <div class="wrapper">
    <fe-spacer :x="2" :y="2" />
    <div>
      <fe-button type="success" auto size="mini">Action</fe-button>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { Spacer, Button } from '@fect-ui/vue'

export default defineComponent({
  components: {
    [Spacer.name]: Spacer,
    [Button.name]: Button
  }
})
</script>

<script></script>

<style>
.wrapper > div {
  margin: 0 50px;
}
</style>
