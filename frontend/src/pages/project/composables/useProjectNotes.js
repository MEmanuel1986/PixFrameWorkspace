/**
 * useProjectNotes.js
 * Projektnotizen: CRUD, Modal, Sortierung.
 */
import { ref, reactive, computed } from 'vue'

export function useProjectNotes(project, store) {

  const projectNotes    = ref([])
  const notesModal      = ref(false)
  const noteSaving      = ref(false)
  const noteEditing     = ref(null)
  const noteEditText    = ref('')
  const noteCompose     = reactive({ open: false, text: '', createdAt: '' })

  const projectNotesSorted = computed(() =>
    [...projectNotes.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  )

  function openNoteCompose() {
    noteCompose.createdAt = new Date().toISOString()
    noteCompose.text = ''
    noteCompose.open = true
  }

  async function saveNewNote() {
    if (!noteCompose.text.trim()) return
    noteSaving.value = true
    try {
      const note = {
        id:        `pn_${Date.now()}`,
        text:      noteCompose.text.trim(),
        createdAt: noteCompose.createdAt,
        updatedAt: noteCompose.createdAt,
      }
      projectNotes.value = [note, ...projectNotes.value]
      await store.updateProject(project.value.id, { projectNotes: projectNotes.value })
      noteCompose.open = false
      noteCompose.text = ''
    } catch (e) { console.error('Notiz speichern:', e) }
    finally { noteSaving.value = false }
  }

  function startEditNote(note) {
    noteEditing.value  = note.id
    noteEditText.value = note.text
  }

  async function saveEditNote(id) {
    if (!noteEditText.value.trim()) return
    noteSaving.value = true
    try {
      const idx = projectNotes.value.findIndex(n => n.id === id)
      if (idx !== -1) {
        projectNotes.value[idx] = {
          ...projectNotes.value[idx],
          text:      noteEditText.value.trim(),
          updatedAt: new Date().toISOString(),
        }
        await store.updateProject(project.value.id, { projectNotes: projectNotes.value })
      }
      noteEditing.value = null
    } catch (e) { console.error('Notiz bearbeiten:', e) }
    finally { noteSaving.value = false }
  }

  async function deleteNote(id) {
    if (!confirm('Notiz löschen?')) return
    projectNotes.value = projectNotes.value.filter(n => n.id !== id)
    await store.updateProject(project.value.id, { projectNotes: projectNotes.value })
  }

  return {
    projectNotes, notesModal, noteSaving,
    noteEditing, noteEditText, noteCompose,
    projectNotesSorted,
    openNoteCompose, saveNewNote, startEditNote, saveEditNote, deleteNote,
  }
}
