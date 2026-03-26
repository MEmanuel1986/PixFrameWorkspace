import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient, { API_BASE } from '../services/api'

export const useStore = defineStore('main', () => {
  const customers  = ref([])
  const suppliers  = ref([])
  const projects   = ref([])
  const documents  = ref([])
  const articles   = ref([])
  const error      = ref(null)

  // ── Loading-Zähler: jeder laufende Fetch erhöht/verringert den Zähler.
  // loading ist true solange irgendein Fetch läuft — verhindert Race-Condition
  // beim gemeinsamen loading-Flag der alle Fetches auf false setzte sobald
  // der schnellste Fetch fertig war.
  const _loadingCount = ref(0)
  const loading = computed(() => _loadingCount.value > 0)
  function _startLoad()  { _loadingCount.value++ }
  function _endLoad()    { _loadingCount.value = Math.max(0, _loadingCount.value - 1) }

  // ━━━ Customers ━━━
  const fetchCustomers = async () => {
    _startLoad()
    error.value = null
    try {
      const response = await apiClient.get('/customers')
      const custData = response.data?.data
      if (Array.isArray(custData)) customers.value = custData
    } catch (err) {
      error.value = err.message
      console.error('Fehler beim Laden der Kunden:', err)
    } finally {
      _endLoad()
    }
  }

  const addCustomer = async (customerData) => {
    try {
      const response = await apiClient.post('/customers', customerData)
      customers.value.push(response.data.data)
      return response.data.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const updateCustomer = async (id, customerData) => {
    try {
      const response = await apiClient.put(`/customers/${id}`, customerData)
      const index = customers.value.findIndex(c => c.id === id)
      if (index !== -1) {
        customers.value[index] = response.data.data
      }
      return response.data.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const deleteCustomer = async (id) => {
    try {
      await apiClient.delete(`/customers/${id}`)
      customers.value = customers.value.filter(c => c.id !== id)
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  // ━━━ Suppliers ━━━
  const fetchSuppliers = async () => {
    try {
      const r = await apiClient.get('/suppliers')
      suppliers.value = r.data.data || []
    } catch(e) { console.error('[Store] fetchSuppliers:', e.message) }
  }
  const addSupplier = async (data) => {
    const r = await apiClient.post('/suppliers', data)
    await fetchSuppliers()
    return r.data.data
  }
  const updateSupplier = async (id, data) => {
    const r = await apiClient.put(`/suppliers/${id}`, data)
    await fetchSuppliers()
    return r.data.data
  }
  const deleteSupplier = async (id) => {
    await apiClient.delete(`/suppliers/${id}`)
    await fetchSuppliers()
  }



  // ━━━ Projects ━━━
  const fetchProjects = async () => {
    _startLoad()
    error.value = null
    try {
      const response = await apiClient.get('/projects')
      // Guard: Nur überschreiben wenn die Antwort ein Array ist.
      // Ohne diesen Check kann projects.value = undefined werden, was
      // store.projects.find(...) einen TypeError auslöst und
      // "Auftrag nicht gefunden" anzeigt, obwohl der Auftrag existiert.
      const data = response.data?.data
      if (Array.isArray(data)) {
        projects.value = data
      } else {
        console.warn('[Store] fetchProjects: Unerwartetes API-Format', response.data)
      }
    } catch (err) {
      error.value = err.message
      console.error('Fehler beim Laden der Aufträge:', err)
    } finally {
      _endLoad()
    }
  }

  /**
   * Lädt EINEN Auftrag direkt vom Backend und fügt ihn ggf. dem Store hinzu.
   * Fallback in ProjectDetail wenn project nach fetchProjects noch null ist.
   */
  const fetchProjectById = async (id) => {
    try {
      const response = await apiClient.get(`/projects/${id}`)
      const p = response.data?.data
      if (!p) return null
      const idx = Array.isArray(projects.value)
        ? projects.value.findIndex(x => x.id === p.id)
        : -1
      if (idx !== -1) {
        projects.value[idx] = p
      } else {
        projects.value = Array.isArray(projects.value)
          ? [...projects.value, p]
          : [p]
      }
      return p
    } catch (err) {
      console.error(`[Store] fetchProjectById(${id}):`, err.message)
      return null
    }
  }

  const fetchProjectsByCustomer = async (customerId) => {
    _startLoad()
    error.value = null
    try {
      const response = await apiClient.get(`/projects/customer/${customerId}`)
      return response.data.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      _endLoad()
    }
  }

  const addProject = async (projectData) => {
    try {
      const response = await apiClient.post('/projects', projectData)
      projects.value.push(response.data.data)
      return response.data.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const updateProject = async (id, projectData) => {
    try {
      const response = await apiClient.put(`/projects/${id}`, projectData)
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) {
        projects.value[index] = response.data.data
      }
      return response.data.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const deleteProject = async (id) => {
    try {
      await apiClient.delete(`/projects/${id}`)
      projects.value = projects.value.filter(p => p.id !== id)
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // ━━━ Documents ━━━
  const fetchDocuments = async () => {
    _startLoad()
    error.value = null
    try {
      const response = await apiClient.get('/documents')
      const docData = response.data?.data
      if (Array.isArray(docData)) documents.value = docData
    } catch (err) {
      error.value = err.message
      console.error('Fehler beim Laden der Dokumente:', err)
    } finally {
      _endLoad()
    }
  }

  const fetchDocumentsByCustomer = async (customerId) => {
    try {
      const response = await apiClient.get(`/documents/customer/${customerId}`)
      return response.data.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const fetchDocumentsByProject = async (projectId) => {
    try {
      const response = await apiClient.get(`/documents/project/${projectId}`)
      return response.data.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }


  const generateDocument = async (data) => {
    try {
      const response = await apiClient.post('/documents/generate', data)
      // Fetch full list so all pages see the new document immediately
      await fetchDocuments()
      return response.data.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }


  const editDocument = async (id, data) => {
    try {
      const r = await apiClient.put(`/documents/${id}/edit`, data)
      const idx = documents.value.findIndex(d => d.id === id)
      if (idx !== -1) documents.value[idx] = r.data.data
      return r.data.data
    } catch (err) { error.value = err.message; throw err }
  }

  const reviseDocument = async (id, data) => {
    try {
      const r = await apiClient.post(`/documents/${id}/revise`, data)
      await fetchDocuments()
      return r.data.data
    } catch (err) { error.value = err.message; throw err }
  }

  const invoiceFromQuote = async (quoteId, overrides = {}) => {
    try {
      const r = await apiClient.post(`/documents/${quoteId}/invoice`, overrides)
      await fetchDocuments()
      return r.data.data
    } catch (err) { error.value = err.message; throw err }
  }

  const correctInvoice = async (invoiceId, data = {}) => {
    try {
      const r = await apiClient.post(`/documents/${invoiceId}/correct`, data)
      await fetchDocuments()
      return r.data.data
    } catch (err) { error.value = err.message; throw err }
  }

  const cancelInvoice = async (invoiceId, reason = '') => {
    try {
      const r = await apiClient.post(`/documents/${invoiceId}/cancel`, { reason })
      await fetchDocuments()
      return r.data.data
    } catch (err) { error.value = err.message; throw err }
  }

  const setDocumentStatus = async (id, status, extra = {}) => {
    try {
      const r = await apiClient.patch(`/documents/${id}/status`, { status, ...extra })
      const idx = documents.value.findIndex(d => d.id === id)
      if (idx !== -1) documents.value[idx] = r.data.data
      return r.data.data
    } catch (err) { error.value = err.message; throw err }
  }

  const addDocument = async (documentData, file = null) => {
    try {
      const formData = new FormData()
      Object.keys(documentData).forEach(key => {
        formData.append(key, documentData[key])
      })
      if (file) {
        formData.append('document', file)
      }

      const response = await apiClient.post('/documents', formData)
      documents.value.push(response.data.data)
      return response.data.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const deleteDocument = async (id) => {
    try {
      await apiClient.delete(`/documents/${id}`)
      documents.value = documents.value.filter(d => d.id !== id)
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // BUGFIX: updateDocument fehlte komplett — der Backend PUT-Endpunkt
  // /api/documents/:id existierte, hatte aber keine Store-Funktion.
  const updateDocument = async (id, documentData) => {
    try {
      const response = await apiClient.put(`/documents/${id}`, documentData)
      const index = documents.value.findIndex(d => d.id === id)
      if (index !== -1) {
        documents.value[index] = response.data.data
      }
      return response.data.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // ━━━ Articles ━━━
  const fetchArticles = async () => {
    _startLoad()
    error.value = null
    try {
      const response = await apiClient.get('/articles')
      const artData = response.data?.data
      if (Array.isArray(artData)) articles.value = artData
    } catch (err) {
      error.value = err.message
      console.error('Fehler beim Laden der Artikel:', err)
    } finally {
      _endLoad()
    }
  }

  const addArticle = async (data) => {
    try {
      const response = await apiClient.post('/articles', data)
      articles.value.push(response.data.data)
      return response.data.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const updateArticle = async (id, data) => {
    try {
      const response = await apiClient.put(`/articles/${id}`, data)
      const index = articles.value.findIndex(a => a.id === id)
      if (index !== -1) articles.value[index] = response.data.data
      return response.data.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const deleteArticle = async (id) => {
    try {
      await apiClient.delete(`/articles/${id}`)
      articles.value = articles.value.filter(a => a.id !== id)
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  return {
    // State
    customers,
    suppliers,
    projects,
    documents,
    articles,
    loading,
    error,
    
    // Customer Methods
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,

    // Supplier Methods
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    
    // Project Methods
    fetchProjects,
    fetchProjectById,
    fetchProjectsByCustomer,
    addProject,
    updateProject,
    deleteProject,
    
    // Document Methods
    fetchDocuments,
    generateDocument,
    editDocument,
    reviseDocument,
    invoiceFromQuote,
    correctInvoice,
    cancelInvoice,
    setDocumentStatus,
    fetchDocumentsByCustomer,
    fetchDocumentsByProject,
    addDocument,
    updateDocument,
    deleteDocument,

    // Article Methods
    fetchArticles,
    addArticle,
    updateArticle,
    deleteArticle,

    // Customer Photo
    uploadCustomerPhoto: async (projectId, file) => {
      const formData = new FormData()
      formData.append('photo', file)
      const r = await apiClient.post(`/projects/${projectId}/customer-photo`, formData)
      // Patch the project in store so UI updates immediately
      const idx = projects.value.findIndex(p => p.id === projectId)
      if (idx !== -1) projects.value[idx] = { ...projects.value[idx], customerPhoto: r.data.data }
      return r.data.data
    },
    deleteCustomerPhoto: async (projectId) => {
      await apiClient.delete(`/projects/${projectId}/customer-photo`)
      const idx = projects.value.findIndex(p => p.id === projectId)
      if (idx !== -1) projects.value[idx] = { ...projects.value[idx], customerPhoto: null }
    },
  }
})
