<template>
  <header class="app-topbar">

    <!-- Logo -->
    <router-link to="/" class="topbar-logo" @click="closeAll">
      <div class="logo-mark">
        <svg viewBox="0 0 22 22" fill="none" width="16" height="16">
          <rect x="2"  y="2"  width="8" height="8" rx="2" fill="#818CF8"/>
          <rect x="12" y="2"  width="8" height="8" rx="2" fill="#A5B4FC" opacity=".7"/>
          <rect x="2"  y="12" width="8" height="8" rx="2" fill="#A5B4FC" opacity=".5"/>
          <rect x="12" y="12" width="8" height="8" rx="2" fill="#818CF8" opacity=".3"/>
        </svg>
      </div>
      <div class="logo-text">
        <span class="logo-name">PixFrame</span>
        <span class="logo-sub">Studio</span>
      </div>
    </router-link>

    <!-- Persistente Navigation -->
    <nav class="topbar-nav">
      <router-link to="/" class="tnav-link" :class="{ active: $route.path === '/' }" @click="closeAll">
        Übersicht
      </router-link>
      <router-link to="/calendar" class="tnav-link" :class="{ active: $route.path === '/calendar' }" @click="closeAll">
        Kalender
      </router-link>
    </nav>

    <!-- Rechte Seite -->
    <div class="topbar-right">
      <button class="hamburger-btn" :class="{ open: menuOpen }" @click="toggleMenu" aria-label="Weitere Optionen">
        <span class="hb-line"></span>
        <span class="hb-line"></span>
        <span class="hb-line"></span>
      </button>
    </div>

    <!-- Hamburger Dropdown -->
    <transition name="menu-fade">
      <div v-if="menuOpen" class="menu-overlay" @click="closeMenu">
        <div class="dropdown-menu" @click.stop>
          <div class="menu-section-label">Studio</div>
          <button class="menu-item" @click="go('/projects')"><span class="mi-icon">📁</span><span class="mi-label">Aufträge</span><span v-if="laufendCount > 0" class="mi-badge">{{ laufendCount }}</span></button>
          <button class="menu-item" @click="go('/customers')"><span class="mi-icon">👥</span><span class="mi-label">Kunden</span><span v-if="customerCount > 0" class="mi-badge mi-badge--neutral">{{ customerCount }}</span></button>
          <button class="menu-item" @click="go('/suppliers')"><span class="mi-icon">🏭</span><span class="mi-label">Lieferanten</span><span v-if="supplierCount > 0" class="mi-badge mi-badge--neutral">{{ supplierCount }}</span></button>
          <button class="menu-item" @click="go('/articles')"><span class="mi-icon">🏷️</span><span class="mi-label">Leistungen & Artikel</span><span v-if="articleCount > 0" class="mi-badge mi-badge--neutral">{{ articleCount }}</span></button>
          <div class="menu-item menu-item--docs" @click="docsMenuOpen = !docsMenuOpen">
            <span class="mi-icon">📄</span><span class="mi-label">Dokumente</span>
            <span class="mi-chevron" :class="{ open: docsMenuOpen }">▾</span>
          </div>
          <transition name="docs-expand">
            <div v-if="docsMenuOpen" class="docs-submenu">
              <button class="menu-item menu-item--sub" @click="go('/documents')"><span class="mi-icon">📄</span><span class="mi-label">Alle Dokumente</span></button>
              <button class="menu-item menu-item--sub" @click="go('/documents?type=quote')"><span class="mi-icon">📋</span><span class="mi-label">Angebote</span><span v-if="openQuoteCount > 0" class="mi-badge">{{ openQuoteCount }}</span></button>
              <button class="menu-item menu-item--sub" @click="go('/documents?type=invoice')"><span class="mi-icon">🧾</span><span class="mi-label">Rechnungen</span><span v-if="openInvoiceCount > 0" class="mi-badge mi-badge--warn">{{ openInvoiceCount }}</span></button>
              <button class="menu-item menu-item--sub" @click="go('/documents?type=contract')"><span class="mi-icon">📝</span><span class="mi-label">Verträge</span></button>
            </div>
          </transition>
          <div class="menu-divider"></div>
          <button class="menu-item" @click="go('/settings')"><span class="mi-icon">⚙️</span><span class="mi-label">Einstellungen</span></button>
          <button class="menu-item" @click="go('/settings?tab=calendar')"><span class="mi-icon">📅</span><span class="mi-label">Kalender-Einstellungen</span></button>
          <div class="menu-divider"></div>
          <div class="menu-section-label">Buchhaltung</div>
          <router-link to="/fibu" class="menu-item" @click="closeAll"><span class="mi-icon">📊</span><span class="mi-label">FiBu</span></router-link>
        </div>
      </div>
    </transition>


  </header>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useStore }  from '../stores/useStore'

export default {
  name: 'TopBar',
  setup() {
    const router = useRouter()
    const store  = useStore()

    const menuOpen     = ref(false)
    const docsOpen     = ref(false)
    const docsMenuOpen = ref(false)
    function closeAll()   { menuOpen.value = false; docsOpen.value = false; docsMenuOpen.value = false }
    function closeMenu()  { menuOpen.value = false }
    function toggleMenu() { menuOpen.value = !menuOpen.value; if (menuOpen.value) docsOpen.value = false }
    function go(path)     { closeAll(); router.push(path) }

    const unregister = router.afterEach(() => closeAll())

    function onKeydown(e) {
      if (e.key === 'Escape') { closeAll() }
    }
    onMounted(()       => document.addEventListener('keydown', onKeydown))
    onBeforeUnmount(() => { document.removeEventListener('keydown', onKeydown); unregister() })

    const laufendCount     = computed(() => store.projects.filter(p => ['Anfrage','Aktiv','Abgeliefert'].includes(p.status)).length)
    const customerCount    = computed(() => store.customers.length)
    const articleCount     = computed(() => store.articles.length)
    const openQuoteCount   = computed(() => store.documents.filter(d => d.type === 'quote' && ['Entwurf','Versendet'].includes(d.status)).length)
    const openInvoiceCount = computed(() => store.documents.filter(d => d.type === 'invoice' && ['Offen','Entwurf'].includes(d.status)).length)
    const supplierCount    = computed(() => store.suppliers.length)
    return { menuOpen, docsOpen, docsMenuOpen, toggleMenu, closeMenu, closeAll, go,
      laufendCount, customerCount, supplierCount, articleCount, openQuoteCount, openInvoiceCount }
  }
}
</script>

<style scoped>
.topbar-logo { display:flex;align-items:center;gap:9px;text-decoration:none;flex-shrink:0; }
.topbar-logo:hover { text-decoration:none; }
.logo-mark { width:28px;height:28px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:7px;display:flex;align-items:center;justify-content:center; }
.logo-text { display:flex;flex-direction:column;line-height:1; }
.logo-name { font-size:13.5px;font-weight:700;color:#fff;letter-spacing:-.2px; }
.logo-sub  { font-size:9px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:1.2px;margin-top:1px; }
.topbar-nav { display:flex;align-items:center;gap:1px;margin-left:18px;flex:1; }
.tnav-link { display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:6px;font-size:12.5px;font-weight:500;color:rgba(255,255,255,.5);text-decoration:none;transition:all .14s;white-space:nowrap; }
.tnav-link:hover { background:rgba(255,255,255,.07);color:rgba(255,255,255,.85);text-decoration:none; }
.tnav-link.active { background:rgba(99,102,241,.28);color:#A5B4FC;font-weight:600; }
.tnav-chevron { font-size:9px;opacity:.5;margin-left:1px; }
.tnav-badge { font-size:10px;font-weight:700;background:rgba(99,102,241,.5);color:#C7D2FE;padding:1px 5px;border-radius:99px;min-width:16px;text-align:center; }
.tnav-badge--neutral { background:rgba(255,255,255,.12);color:rgba(255,255,255,.55); }
.tnav-group { position:relative; }
.tnav-subnav { position:absolute;top:calc(100% + 6px);left:0;background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:5px 0;min-width:190px;z-index:300; }
.tsub-item { display:flex;align-items:center;gap:8px;padding:8px 14px;font-size:13px;color:var(--text-2);font-weight:500;text-decoration:none;transition:background .1s;white-space:nowrap; }
.tsub-item:hover { background:var(--bg-alt);color:var(--text);text-decoration:none; }
.tsub-badge { margin-left:auto;font-size:10px;font-weight:700;background:var(--primary-light);color:var(--primary-text);padding:1px 6px;border-radius:99px; }
.tsub-badge--warn { background:#FFF7ED;color:#C2410C; }
.subnav-fade-enter-active { transition:opacity .12s,transform .12s; }
.subnav-fade-leave-active { transition:opacity .08s,transform .08s; }
.subnav-fade-enter-from,.subnav-fade-leave-to { opacity:0;transform:translateY(-4px); }
.topbar-right { display:flex;align-items:center;gap:8px;flex-shrink:0; }
.hamburger-btn { width:33px;height:33px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);cursor:pointer;padding:6px;border-radius:7px;transition:all .14s; }
.hamburger-btn:hover { background:rgba(255,255,255,.1); }
.hamburger-btn.open { background:rgba(255,255,255,.14); }
.hb-line { width:15px;height:1.5px;background:rgba(255,255,255,.7);border-radius:2px;display:block;transition:all .2s; }
.hamburger-btn.open .hb-line:nth-child(1) { transform:translateY(5.5px) rotate(45deg); }
.hamburger-btn.open .hb-line:nth-child(2) { opacity:0;transform:scaleX(0); }
.hamburger-btn.open .hb-line:nth-child(3) { transform:translateY(-5.5px) rotate(-45deg); }
.menu-overlay { position:fixed;inset:52px 0 0 0;z-index:500;cursor:default; }
.dropdown-menu { position:absolute;top:8px;right:16px;width:240px;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:0 20px 48px rgba(0,0,0,.14),0 4px 12px rgba(0,0,0,.07);padding:6px 0;overflow:hidden;z-index:501; }
.menu-section-label { font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:var(--text-muted);padding:8px 16px 3px; }
.menu-divider { height:1px;background:var(--border);margin:5px 0; }
.menu-item { display:flex;align-items:center;gap:9px;width:100%;padding:8px 16px;border:none;background:none;color:var(--text-2);font-size:13px;font-family:inherit;cursor:pointer;text-align:left;transition:background .1s,color .1s; }
.menu-item:hover:not(:disabled) { background:var(--bg-alt);color:var(--text); }
.mi-icon { font-size:14px;width:18px;text-align:center;flex-shrink:0; }
.mi-label { flex:1; }
.mi-badge { font-size:10px;font-weight:700;background:var(--primary-light);color:var(--primary-text);padding:1px 7px;border-radius:10px; }
.menu-fade-enter-active { transition:opacity .15s,transform .15s; }
.menu-fade-leave-active { transition:opacity .1s,transform .1s; }
.menu-fade-enter-from { opacity:0;transform:translateY(-6px); }
.menu-fade-leave-to { opacity:0;transform:translateY(-3px); }
.menu-item--docs { cursor:pointer; }
.mi-chevron { font-size:9px;opacity:.5;margin-left:auto;transition:transform .2s; }
.mi-chevron.open { transform:rotate(180deg); }
.docs-submenu { background:var(--bg-alt);border-radius:0; }
.menu-item--sub { padding-left:28px; font-size:12.5px; }
.mi-badge--neutral { background:rgba(255,255,255,.12);color:rgba(255,255,255,.55); }
.mi-badge--warn { background:#FFF7ED;color:#C2410C; }
.docs-expand-enter-active { transition:max-height .2s ease,opacity .15s; max-height:200px; }
.docs-expand-leave-active { transition:max-height .15s ease,opacity .1s; }
.docs-expand-enter-from,.docs-expand-leave-to { max-height:0;opacity:0;overflow:hidden; }
.menu-item--sub-divider { height:1px;background:var(--border);margin:3px 0; }
</style>
