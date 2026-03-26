<template>
  <div :class="isPrintRoute ? 'app-print' : 'app-layout'">
    <TopBar v-if="!isPrintRoute" />
    <div v-if="!isPrintRoute" class="app-main">
      <div class="app-content">
        <router-view :key="$route.path" />
      </div>
    </div>
    <router-view v-if="isPrintRoute" />
    <BetaNotice v-if="!isPrintRoute" />
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TopBar    from './components/TopBar.vue'
import BetaNotice from './components/BetaNotice.vue'

export default {
  name: 'App',
  components: { TopBar, BetaNotice },
  setup() {
    const route = useRoute()
    const isPrintRoute = computed(() =>
      ['DocumentPrint','ContractPrint','AddendumPrint','AdvPrint','AgbPrint','BlankContractPrint','EarPrint','DsgvoPrint','AdvVertragPrint'].includes(route.name)
    )
    return { isPrintRoute }
  }
}
</script>
