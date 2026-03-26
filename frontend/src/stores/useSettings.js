import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '../services/api'

export const useSettings = defineStore('settings', () => {
  const settings = ref({
    numberSchemas: {
      customer: { prefix: 'K', separator: '-', digits: 5, example: 'K-00001' },
      quote:    { prefix: 'A', useYear: true, useMonth: true, separator: '-', innerSeparator: '/', digits: 5, example: 'A-2026-02/00035' },
      invoice:  { prefix: 'RE', useYear: true, useMonth: true, separator: '-', innerSeparator: '/', digits: 5, example: 'RE-2026-02/00001' }
    },
    company: { name:'', street:'', zipCode:'', city:'', phone:'', email:'', vatId:'', bankName:'', iban:'', bic:'' }
  })

  const loading = ref(false)

  async function fetchSettings() {
    loading.value = true
    try {
      const res = await apiClient.get('/settings')
      settings.value = res.data.data
    } catch(e) {
      console.error('Settings fetch error:', e)
    } finally {
      loading.value = false
    }
  }

  async function saveSettings(data) {
    try {
      const res = await apiClient.put('/settings', data)
      settings.value = res.data.data
    } catch(e) {
      console.error('Settings save error:', e)
      throw e
    }
  }

  // Theme (localStorage only, no backend needed)
  const theme = ref(localStorage.getItem('pfx-theme') || 'light')

  function setTheme(t) {
    theme.value = t
    localStorage.setItem('pfx-theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  function initTheme() {
    const saved = localStorage.getItem('pfx-theme') || 'light'
    setTheme(saved)
  }

  return { settings, loading, fetchSettings, saveSettings, reload: fetchSettings, theme, setTheme, initTheme }
})
