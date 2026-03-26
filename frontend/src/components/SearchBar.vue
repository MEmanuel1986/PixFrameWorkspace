<template>
  <div class="search-bar-wrap" :class="{ focused }">
    <svg class="sb-icon" viewBox="0 0 20 20" fill="none">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.6"/>
      <path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
    <input
      ref="inputRef"
      :value="modelValue"
      :placeholder="placeholder"
      type="text"
      class="sb-input"
      @input="$emit('update:modelValue', $event.target.value)"
      @focus="focused = true"
      @blur="focused = false"
      @keydown.escape="clear"
    />
    <transition name="sb-clear">
      <button v-if="modelValue" class="sb-clear" @click="clear" title="Zurücksetzen">
        <svg viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </transition>
  </div>
</template>

<script>
import { ref } from 'vue'
export default {
  name: 'SearchBar',
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: 'Suchen…' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const focused  = ref(false)
    const inputRef = ref(null)
    function clear() {
      emit('update:modelValue', '')
      inputRef.value?.focus()
    }
    return { focused, inputRef, clear }
  }
}
</script>

<style scoped>
.search-bar-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 160px;
  max-width: 340px;
  height: 36px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 99px;
  transition: border-color .15s, box-shadow .15s;
  gap: 0;
}
.search-bar-wrap.focused {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, .1);
}

.sb-icon {
  flex-shrink: 0;
  width: 15px; height: 15px;
  color: var(--text-muted);
  margin-left: 12px;
  transition: color .15s;
  pointer-events: none;
}
.search-bar-wrap.focused .sb-icon { color: var(--primary); }

.sb-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--text);
  font-family: inherit;
  padding: 0 8px;
  outline: none;
  min-width: 0;
}
.sb-input::placeholder { color: var(--text-muted); }

.sb-clear {
  flex-shrink: 0;
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-alt);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  margin-right: 7px;
  color: var(--text-muted);
  padding: 0;
  transition: background .12s, color .12s;
}
.sb-clear svg { width: 10px; height: 10px; }
.sb-clear:hover { background: var(--danger-bg); color: var(--danger); }

.sb-clear-enter-active { transition: opacity .12s, transform .12s; }
.sb-clear-leave-active { transition: opacity .1s, transform .1s; }
.sb-clear-enter-from, .sb-clear-leave-to { opacity: 0; transform: scale(.6); }
</style>
