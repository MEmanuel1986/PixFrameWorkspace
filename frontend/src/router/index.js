import { createRouter, createWebHistory } from 'vue-router'
// Dashboard: eager (erste Seite, wird sofort gebraucht)
import Dashboard from '../pages/Dashboard.vue'

// Alle anderen Seiten: lazy loaded
// → Vite splittet sie in separate Chunks → schnellerer Start
// → Fehler in einer Seite bricht NICHT mehr den gesamten App-Start
const Projects           = () => import('../pages/Projects.vue')
const ProjectDetail      = () => import('../pages/ProjectDetail.vue')
const NewAnfragePage     = () => import('../pages/NewAnfragePage.vue')
const Customers          = () => import('../pages/Customers.vue')
const CustomerDetail     = () => import('../pages/CustomerDetail.vue')
const Documents          = () => import('../pages/Documents.vue')
const Articles           = () => import('../pages/Articles.vue')
const Settings           = () => import('../pages/settings/SettingsPage.vue')
const Calendar           = () => import('../pages/Calendar.vue')
const DocumentPrint      = () => import('../pages/DocumentPrint.vue')
const ContractPrint      = () => import('../pages/ContractPrint.vue')
const AdvPrint           = () => import('../pages/AdvPrint.vue')
const AddendumPrint      = () => import('../pages/AddendumPrint.vue')
const AgbPrint           = () => import('../pages/AgbPrint.vue')
const FiBu               = () => import('../pages/FiBu.vue')
const EarPrint           = () => import('../pages/EarPrint.vue')
const DsgvoPrint         = () => import('../pages/DsgvoPrint.vue')
const AdvVertragPrint    = () => import('../pages/AdvVertragPrint.vue')
const BlankContractPrint = () => import('../pages/BlankContractPrint.vue')

const routes = [
  { path: '/',              name: 'Dashboard',      component: Dashboard },
  { path: '/projects',      name: 'Projects',       component: Projects },
  { path: '/projects/new',  name: 'NewAnfrage',     component: NewAnfragePage },
  { path: '/projects/:id',  name: 'ProjectDetail',  component: ProjectDetail },
  { path: '/customers',     name: 'Customers',      component: Customers },
  { path: '/suppliers', component: () => import('../pages/Suppliers.vue') },
  { path: '/customers/:id', name: 'CustomerDetail', component: CustomerDetail },
  { path: '/documents',     name: 'Documents',      component: Documents },
  { path: '/articles',      name: 'Articles',       component: Articles },
  { path: '/calendar',      name: 'Calendar',       component: Calendar },
  { path: '/settings',      name: 'Settings',       component: Settings },
  { path: '/fibu',           name: 'FiBu',           component: FiBu },
  // Print routes (kein Layout)
  { path: '/print/document/:id',                    name: 'DocumentPrint',      component: DocumentPrint },
  { path: '/print/contract/:projectId',             name: 'ContractPrint',      component: ContractPrint },
  { path: '/print/adv/:projectId',                  name: 'AdvPrint',           component: AdvPrint },
  { path: '/print/addendum/:projectId/:addendumId', name: 'AddendumPrint',      component: AddendumPrint },
  { path: '/print/agb',                             name: 'AgbPrint',           component: AgbPrint },
  { path: '/print/ear/:year',                       name: 'EarPrint',           component: EarPrint },
  { path: '/print/dsgvo',                           name: 'DsgvoPrint',         component: DsgvoPrint },
  { path: '/print/adv-vertrag',                     name: 'AdvVertragPrint',    component: AdvVertragPrint },
  { path: '/print/blank-contract',                  name: 'BlankContractPrint', component: BlankContractPrint },
  // 404 → Dashboard
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export default createRouter({ history: createWebHistory(), routes })
