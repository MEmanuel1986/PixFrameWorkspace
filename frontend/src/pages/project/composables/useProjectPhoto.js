/**
 * useProjectPhoto.js
 * Kundenfoto: Upload, Löschen, Lightbox.
 */
import { ref } from 'vue'

export function useProjectPhoto(project, store) {

  const photoLightbox  = ref(false)
  const photoUploading = ref(false)
  const photoError     = ref('')

  async function uploadPhoto(file) {
    if (!file || !project.value) return
    photoError.value     = ''
    photoUploading.value = true
    try {
      await store.uploadCustomerPhoto(project.value.id, file)
    } catch (e) {
      photoError.value = e.response?.data?.error || e.message
    } finally {
      photoUploading.value = false
    }
  }

  function onPhotoSelect(e) { uploadPhoto(e.target.files[0]) }
  function onPhotoDrop(e)   { uploadPhoto(e.dataTransfer.files[0]) }

  async function removeCustomerPhoto() {
    if (!project.value) return
    await store.deleteCustomerPhoto(project.value.id)
  }

  return {
    photoLightbox, photoUploading, photoError,
    onPhotoSelect, onPhotoDrop, removeCustomerPhoto,
  }
}
