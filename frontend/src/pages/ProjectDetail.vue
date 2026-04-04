<template>
  <div class="project-detail">

    <div v-if="loading" class="loading-state">⏳ Lädt…</div>
    <div v-else-if="!project" class="empty-state"><h3>Auftrag nicht gefunden</h3></div>

    <div v-else>

      <!-- ── Hero Header ── -->
      <div class="proj-hero">
        <div class="proj-hero-main">
          <div class="proj-hero-top">
            <a class="hero-back-link" href="#" @click.prevent="goBack">
              <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Dashboard
            </a>
            <span class="badge" :class="`status-${(project.status||'entwurf').toLowerCase()}`">{{ project.status }}</span>
            <span v-if="project.category" class="proj-category">{{ project.category }}</span>
          </div>
          <h1 class="proj-name">{{ heroLive.projectName || project.projectName || project.contractData?.occasion }}</h1>
          <div class="proj-meta">
            <span v-if="customerName">👤 {{ customerName }}</span>
            <span v-if="heroLive.booking || project.booking">
              &nbsp;·&nbsp;📅 {{ formatDate(heroLive.booking || project.booking) }}
              <span v-if="heroLive.bookingTime || project.bookingTime">&nbsp;·&nbsp;🕐 {{ heroLive.bookingTime || project.bookingTime }}</span>
              <span v-if="project.bookingLabel" class="hero-shoot-label">{{ project.bookingLabel }}</span>
            </span>
            <!-- Weitere Shooting-Termine (BQ-6) -->
            <template v-if="project.shootingDates?.length">
              <span v-for="sd in project.shootingDates" :key="sd.id" class="hero-shoot-chip">
                📅 {{ formatDate(sd.date) }}<span v-if="sd.time">&nbsp;{{ sd.time }}</span>
                <span v-if="sd.label" class="hero-shoot-label">{{ sd.label }}</span>
              </span>
            </template>
            <span v-if="heroLive.location || project.location">&nbsp;·&nbsp;📍 {{ heroLive.location || project.location }}</span>
            <template v-if="project.locations?.length">
              <span v-for="loc in project.locations" :key="loc.id" class="hero-loc-badge">
                <span class="hero-loc-cat" v-if="loc.category">{{ loc.category }}</span>
                {{ loc.name }}
              </span>
            </template>
          </div>
        </div>
        <div class="proj-hero-actions">
          <button v-if="project.projectFolderPath" class="btn-folder" @click="openProjectFolder()" title="Projektordner im Explorer öffnen">
            📁 Ordner öffnen
          </button>
        </div>
      </div>

      <!-- ── KPI Zeile ── -->
      <div class="proj-kpis">
        <div class="proj-kpi">
          <div class="proj-kpi-val">{{ formatCurrency(project.budget?.estimatedAmount) }}</div>
          <div class="proj-kpi-lbl">Betrag</div>
        </div>
        <div class="proj-kpi">
          <div class="proj-kpi-val">{{ project.deliveryDate ? formatDate(project.deliveryDate) : '—' }}</div>
          <div class="proj-kpi-lbl">Lieferdatum</div>
        </div>
        <div class="proj-kpi proj-kpi-clickable proj-kpi-docs" @click="docsModal = true" title="Alle Dokumente anzeigen">
          <div class="proj-kpi-icon">📄</div>
          <div class="proj-kpi-val">{{ allProjectDocs.length }}</div>
          <div class="proj-kpi-lbl">Dokumente</div>
        </div>

        <!-- ── Notizen (4. Kachel) ── -->
        <div class="proj-kpi proj-kpi-notes" @click="notesModal = true" title="Projektnotizen">
          <div class="proj-kpi-val pkn-val">
            <span v-if="projectNotes.length" class="pkn-count">{{ projectNotes.length }}</span>
            <span v-else class="pkn-empty-ico">📝</span>
          </div>
          <div class="proj-kpi-lbl">Notizen</div>
          <div v-if="projectNotes.length" class="pkn-preview">
            {{ projectNotes[projectNotes.length-1].text.slice(0,32) }}{{ projectNotes[projectNotes.length-1].text.length > 32 ? '…' : '' }}
          </div>
        </div>

        <!-- ── Kundenfoto (5. Kachel) ── -->
        <div class="proj-kpi proj-kpi-photo">
          <!-- Foto vorhanden: 3-spaltig [löschen | bild | ersetzen] -->
          <template v-if="project.customerPhoto">
            <div class="pkp-side" title="Foto löschen">
              <button class="pkp-side-btn" @click.stop="removeCustomerPhoto" title="Löschen">🗑</button>
            </div>
            <div class="pkp-img-center" @click="photoLightbox = true" title="Vergrößern">
              <img :src="`${API_BASE}${project.customerPhoto.url}`"
                :alt="project.customerPhoto.originalName"
                class="pkp-img" />
            </div>
            <div class="pkp-side pkp-side-right" title="Foto ersetzen">
              <button class="pkp-side-btn" @click.stop="$refs.photoInput.click()" title="Ersetzen">↩</button>
            </div>
          </template>
          <!-- Upload-Bereich -->
          <div v-else class="pkp-upload"
            @click="$refs.photoInput.click()"
            @dragover.prevent
            @drop.prevent="onPhotoDrop">
            <div class="pkp-upload-ico">🖼</div>
            <div class="pkp-upload-txt">Kundenfoto</div>
            <div class="pkp-upload-hint">hochladen</div>
          </div>
          <div v-if="photoUploading" class="pkp-loading">⏳</div>
          <input ref="photoInput" type="file" accept="image/*" style="display:none"
            @change="onPhotoSelect" />
        </div>
      </div>


      <!-- ── Auftragsübersicht — Anfragedetails ── -->
      <div class="proj-auftrag-info" v-if="project.contractData">
        <div class="pai-row">
          <!-- Kundenstatus -->
          <div class="pai-chip" :class="project.contractData.clientIsCompany ? 'pai-chip--b2b' : 'pai-chip--privat'">
            {{ project.contractData.clientIsCompany ? '🏢 B2B' : '👤 Privatkunde' }}
          </div>
          <!-- Preismodell -->
          <div class="pai-chip pai-chip--price">
            <template v-if="project.contractData.pricingModel === 'hourly'">
              ⏱ {{ project.contractData.hourlyRate ? project.contractData.hourlyRate + ' €/h' : 'Stunden' }}
              <span v-if="project.contractData.estimatedHours" class="pai-chip-sub">
                × {{ project.contractData.estimatedHours }} h
              </span>
            </template>
            <template v-else-if="project.contractData.pricingModel === 'flat'">
              📦 Pauschal
              <span v-if="project.contractData.flatRate" class="pai-chip-sub">
                {{ formatCurrency(project.contractData.flatRate) }}
              </span>
            </template>
            <template v-else>✏️ Individuell</template>
          </div>
          <!-- Nutzungsrechte (nur B2B) -->
          <template v-if="project.contractData.clientIsCompany && project.contractData.usageRights?.enabled">
            <div class="pai-chip pai-chip--usage">
              ©️ Nutzungsrechte
              <span v-if="project.contractData.usageRightsSurcharge > 0" class="pai-chip-sub">
                + {{ formatCurrency(project.contractData.usageRightsSurcharge) }}
              </span>
            </div>
          </template>
          <!-- Anzahlung -->
          <div class="pai-chip pai-chip--deposit" v-if="project.contractData.depositAmount">
            💶 Anzahlung {{ formatCurrency(project.contractData.depositAmount) }}
          </div>
          <!-- Leistungen -->
          <template v-if="project.fotografie || project.videografie || project.glueckwunschkarten">
            <div class="pai-chip pai-chip--service" v-if="project.fotografie">📷 Foto</div>
            <div class="pai-chip pai-chip--service" v-if="project.videografie">🎬 Video</div>
            <div class="pai-chip pai-chip--service" v-if="project.gettingReadyEr || project.gettingReadySie || project.gettingReadyBeide">
              💄 Getting Ready
            </div>
            <div class="pai-chip pai-chip--service" v-if="project.glueckwunschkarten">💌 Danksagung</div>
          </template>
          <!-- Gesamtbetrag wenn vorhanden -->
          <div class="pai-chip pai-chip--total" v-if="project.budget?.estimatedAmount">
            {{ formatCurrency(project.budget.estimatedAmount) }} netto
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════
           WORKFLOW PIPELINE
      ══════════════════════════════════════════ -->
      <div class="wf-pipeline">
        <div v-for="(step, i) in workflowSteps" :key="step.id"
          class="wf-step"
          :class="{
            'wf-done':        step.done,
            'wf-active':      pipelineOpen === step.id,
            'wf-current':     step.current && pipelineOpen !== step.id,
            'wf-declined':    step.declined,
            'wf-coming-soon': step.comingSoon,
          }"
          @click="handleStepClick(step.id)">
          <div class="wf-step-inner">
            <div class="wf-icon">
              <svg v-if="step.done" viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span v-else>{{ step.icon }}</span>
            </div>
            <div class="wf-step-body">
              <div class="wf-label">{{ step.label }}</div>
              <div class="wf-hint">{{ step.hint }}</div>
            </div>
          </div>
          <div v-if="i < workflowSteps.length - 1" class="wf-connector" :class="{ done: step.done }">
            <div class="wf-connector-line"></div>
          </div>
        </div>
      </div>

      <!-- ── Pipeline Step Panels ── -->
      <div class="pipe-panels">

        <!-- ════════════════════════════════
             SCHRITT 1: Anfrage
             Basisangaben Auftrag + Termin
        ════════════════════════════════ -->
        <div v-if="pipelineOpen === null" style="display:none"></div>
        <ProjectPipelineAnfrage
          v-else-if="pipelineOpen === 'anfrage'"
          @navigate="pipelineOpen = $event"
          @refresh="refreshDocs()"
          @call="handlePipelineCall" />


        <!-- ════════════════════════════════
             SCHRITT 2: Angebot (optional)
        ════════════════════════════════ -->
        <ProjectPipelineVorgespraech
          v-else-if="pipelineOpen === 'vorgespräch'"
          @navigate="pipelineOpen = $event"
          @refresh="refreshDocs()"
          @call="handlePipelineCall" />
        <ProjectPipelineAngebot
          v-else-if="pipelineOpen === 'angebot'"
          @navigate="pipelineOpen = $event"
          @refresh="refreshDocs()"
          @call="handlePipelineCall" />


        <!-- ════════════════════════════════
             Beratungsgespräch
        ════════════════════════════════ -->
        <ProjectPipelineVertrag
          v-else-if="pipelineOpen === 'vertrag'"
          @navigate="pipelineOpen = $event"
          @refresh="refreshDocs()"
          @call="handlePipelineCall" />


        <!-- ════════════════════════════════
             SCHRITT 5: Anzahlung
        ════════════════════════════════ -->
        <ProjectPipelineAnzahlung
          v-else-if="pipelineOpen === 'anzahlung'"
          @navigate="pipelineOpen = $event"
          @refresh="refreshDocs()"
          @call="handlePipelineCall" />


        <!-- ════════════════════════════════
             SCHRITT 5b: Bearbeitung
        ════════════════════════════════ -->
        <div v-else-if="pipelineOpen === 'auftrag'" class="pipe-panel" key="auftrag">
          <div class="pp-head">
            <span>📸 Bearbeitung</span>
            <button class="pp-close" @click="pipelineOpen = null">✕</button>
          </div>
          <div class="pp-body">

            <!-- Projektordner -->
            <div v-if="project.projectFolderPath" class="pp-folder-section">
              <div class="pp-folder-title">📂 Projektordner</div>
              <div class="pp-folder-grid">
                <button class="pp-folder-btn" @click="openProjectFolder('medien/bilder')" title="Bilder-Ordner öffnen">
                  <span class="pp-folder-icon">🖼️</span>
                  <span class="pp-folder-label">Bilder</span>
                </button>
                <button class="pp-folder-btn" @click="openProjectFolder('medien/videos')" title="Video-Ordner öffnen">
                  <span class="pp-folder-icon">🎬</span>
                  <span class="pp-folder-label">Videos</span>
                </button>
                <button class="pp-folder-btn" @click="openProjectFolder('dokumente')" title="Dokumente-Ordner öffnen">
                  <span class="pp-folder-icon">📄</span>
                  <span class="pp-folder-label">Dokumente</span>
                </button>
                <button class="pp-folder-btn" @click="openProjectFolder('vertraege')" title="Verträge-Ordner öffnen">
                  <span class="pp-folder-icon">📎</span>
                  <span class="pp-folder-label">Verträge</span>
                </button>
                <button class="pp-folder-btn" @click="openProjectFolder('korrespondenz')" title="Korrespondenz-Ordner öffnen">
                  <span class="pp-folder-icon">✉️</span>
                  <span class="pp-folder-label">Korrespondenz</span>
                </button>
                <button class="pp-folder-btn" @click="openProjectFolder()" title="Gesamten Projektordner öffnen">
                  <span class="pp-folder-icon">📁</span>
                  <span class="pp-folder-label">Alles</span>
                </button>
              </div>
            </div>

            <div class="coming-soon-panel" style="margin-top:16px">
              <div class="cs-icon" style="font-size:28px">🚧</div>
              <div class="cs-title" style="font-size:13px">Bearbeitungs-Timeline — in Entwicklung</div>
              <div class="cs-text" style="font-size:12px">
                Bildbearbeitungs-Workflow mit Fortschrittsanzeige · SD-Import ·
                NAS-Archivierung · Lieferungs-Tracking
              </div>
              <button class="btn btn-ghost btn-sm" style="margin-top:8px" @click="pipelineOpen = 'abrechnung'">
                Weiter zur Abrechnung →
              </button>
            </div>
          </div>
        </div><!-- /auftrag panel -->

                <!-- ════════════════════════════════
             SCHRITT 6: Abrechnung
             Schlussrechnung erstellen
        ════════════════════════════════ -->
        <ProjectPipelineAbrechnung
          v-else-if="pipelineOpen === 'abrechnung'"
          @navigate="pipelineOpen = $event"
          @refresh="refreshDocs()"
          @call="handlePipelineCall" />


        <!-- ════════════════════════════════
             SCHRITT 7: Abschluss
        ════════════════════════════════ -->
        <ProjectPipelineAbschluss
          v-else-if="pipelineOpen === 'done'"
          @navigate="pipelineOpen = $event"
          @refresh="refreshDocs()"
          @call="handlePipelineCall" />


      </div><!-- /pipe-panels -->

      <!-- ── Detail Cards ── -->
      <div class="proj-grid">

        <!-- ── EDIT: NewProjectForm (gleiche UI wie bei Neuanlage) ── -->
        <transition name="fade-slide" mode="out-in">
          <div v-if="editing" class="proj-grid-full" key="inline-edit">
            <NewProjectForm
              mode="edit"
              :customer-name="customerName"
              :initial-data="anfrageFormData"
              :settings="settingsData"
              :saving="editSaving"
              @save="saveInlineEdit"
              @cancel="cancelInlineEdit"
              @update:live="onHeroLive"
            />
          </div>
        </transition>

      </div>
    </div>

    <!-- editModal removed: inline edit replaces it -->

    <!-- ── Kundenfoto Lightbox ── -->
    <Teleport to="body">
      <transition name="qsc-fade">
        <div v-if="photoLightbox && project.customerPhoto"
          class="photo-lb-overlay" @click.self="photoLightbox = false">
          <div class="photo-lb-box">
            <button class="photo-lb-close" @click="photoLightbox = false">✕</button>
            <img :src="`${API_BASE}${project.customerPhoto.url}`"
              :alt="project.customerPhoto.originalName"
              class="photo-lb-img" />
            <div class="photo-lb-caption">{{ project.customerPhoto.originalName }}</div>
          </div>
        </div>
      </transition>
    </Teleport>


    <!-- Rechnung Modal -->
    <QuoteInvoiceModal
      v-if="invoiceModal"
      type="invoice"
      :project="project"
      :customer="customer"
      :prefill-items="invoicePrefillItems"
      :initial-is-deposit="depositNextInvoice"
      @close="invoiceModal = false; invoicePrefillItems = null; depositNextInvoice = false"
      @created="onDocCreated"
    />

    <!-- Document Detail Modal -->
    <DocumentDetailModal
      v-if="detailDocId && detailDocObj"
      :doc="detailDocObj"
      :project="project"
      :customer="customer"
      :all-docs="store.documents"
      @close="detailDocId = null"
      @open-doc="openDocDetail"
      @created="refreshDocs"
      @updated="refreshDocs" />

  </div>

  <!-- ══ Angebot-Status Bestätigungs-Popup ══════════════════════════════════ -->
  <Teleport to="body">
    <transition name="qsc-fade">
      <div v-if="quoteStatusConfirm.show" class="qsc-overlay">
        <div class="qsc-dialog" :class="quoteStatusConfirm.variant">

          <!-- Icon -->
          <div class="qsc-icon-wrap">
            <span class="qsc-icon">{{ quoteStatusConfirm.variant === 'success' ? '✅' : '❌' }}</span>
          </div>

          <!-- Text -->
          <div class="qsc-content">
            <div class="qsc-title">{{ quoteStatusConfirm.title }}</div>
            <div class="qsc-sub">{{ quoteStatusConfirm.sub }}</div>
            <div class="qsc-warn">⚠ Diese Aktion kann nicht rückgängig gemacht werden.</div>
          </div>

          <!-- Buttons -->
          <div class="qsc-actions">
            <button class="btn btn-ghost btn-sm" @click="quoteStatusConfirm.show = false">
              Abbrechen
            </button>
            <button class="btn btn-sm" :class="quoteStatusConfirm.variant === 'success' ? 'btn-success' : 'btn-danger'"
              @click="confirmQuoteStatusChange">
              {{ quoteStatusConfirm.confirmLabel }}
            </button>
          </div>

        </div>
      </div>
    </transition>
  </Teleport>


  <!-- ══ Änderungslog Modal ══════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div v-if="showChangelogModal" class="qsc-overlay">
      <div class="qsc-dialog acl-dialog">
        <div class="qsc-dialog-head">
          <span>📋 Änderungslog</span>
          <button class="qsc-form-x" @click="showChangelogModal = false">✕</button>
        </div>

        <div v-if="!auftragChangelogSorted.length" class="acl-empty">
          Noch keine Änderungen protokolliert.
        </div>

        <!-- Gruppierung nach Datum -->
        <div v-else class="acl-body">
          <template v-for="(group, date) in changelogGrouped" :key="date">
            <div class="acl-date-header">{{ date }}</div>
            <div v-for="(entry, idx) in group" :key="idx" class="acl-entry">
              <div class="acl-time">{{ formatTime(entry.ts) }}</div>
              <div class="acl-content">
                <span class="acl-field">{{ entry.label }}</span>
                <div class="acl-change">
                  <span class="acl-from">{{ formatChangelogVal(entry.from) || '—' }}</span>
                  <span class="acl-arrow">→</span>
                  <span class="acl-to">{{ formatChangelogVal(entry.to) || '—' }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="qsc-dialog-foot">
          <button class="btn btn-ghost btn-sm" @click="showChangelogModal = false">Schließen</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ══ Sidebar Auftrag-Bearbeiten Popup ════════════════════════════════════ -->
      <!-- ══ Dokumente Modal ═══════════════════════════════════════════════════ -->
      <Teleport to="body">
        <div v-if="docsModal" class="qsc-overlay" @click.self="docsModal = false">
          <div class="pdm-dialog">
            <div class="pdm-header">
              <span class="pdm-title">📄 Dokumente <span class="badge badge-neutral" style="font-size:10px;margin-left:4px">{{ allProjectDocs.length }}</span></span>
              <div style="display:flex;gap:6px;align-items:center">
                <button v-if="project.projectFolderPath" class="btn btn-xs btn-ghost" @click="openProjectFolder('dokumente')" title="Dokumenten-Ordner öffnen">📁</button>
                <button class="pdm-close" @click="docsModal = false">✕</button>
              </div>
            </div>

            <div class="pdm-body">
              <div v-if="!allProjectDocs.length" class="pdm-empty">
                Noch keine Dokumente vorhanden.
              </div>
              <table v-else class="pdm-table">
                <thead>
                  <tr>
                    <th style="width:150px">Nr.</th>
                    <th>Dokument</th>
                    <th style="width:90px">Typ</th>
                    <th style="width:88px">Datum</th>
                    <th style="width:88px" class="text-right">Betrag</th>
                    <th style="width:100px">Status</th>
                    <th style="width:110px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="doc in allProjectDocs" :key="doc.id"
                    class="pdm-row"
                    :class="{
                      'pdm-row-contract':   doc._isContract,
                      'pdm-row-attachment': doc._isAttachment,
                      'pdm-row-addendum':   doc._isAddendum,
                    }"
                    @click="!doc._isAttachment && openDocOrStd(doc)">

                    <td>
                      <span v-if="doc.documentNumber" class="qv-num">{{ doc.documentNumber }}</span>
                      <span v-else class="text-muted" style="font-size:11px">—</span>
                    </td>
                    <td>
                      <div class="fw-600">
                        <span v-if="doc._isAttachment" style="opacity:.4;margin-right:3px">↳</span>
                        <span v-if="isStdDoc(doc)" style="margin-right:4px">
                          {{ (doc.name||'').toLowerCase().includes('agb') ? '§' :
                             (doc.name||'').toLowerCase().includes('dsgvo') || (doc.name||'').toLowerCase().includes('einwilligung') ? '🔒' : '📋' }}
                        </span>
                        {{ doc.name }}
                        <span v-if="isStdDoc(doc)" style="font-size:10px;color:var(--primary);margin-left:5px;font-weight:400">→ Drucken</span>
                      </div>
                      <div v-if="doc._isContract && doc._generatedVersions?.length" style="display:flex;gap:3px;margin-top:2px;flex-wrap:wrap">
                        <span v-for="v in doc._generatedVersions" :key="v.id"
                          class="pdoc-ver-chip" :title="formatDateTime(v.generatedAt)">{{ v.label }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-neutral" style="font-size:10px">
                        {{ doc._isAttachment ? (doc._attachmentLabel || 'Anhang')
                         : doc.type === 'contract' ? 'Vertrag'
                         : doc.type === 'addendum' ? 'Nachtrag'
                         : isStdDoc(doc) ? (
                             (doc.name||'').toLowerCase().includes('agb') ? 'AGB' :
                             (doc.name||'').toLowerCase().includes('dsgvo') || (doc.name||'').toLowerCase().includes('einwilligung') ? 'DSGVO' :
                             'ADV'
                           )
                         : typeLabel(doc.type) }}
                      </span>
                    </td>
                    <td class="text-muted" style="font-size:11px">{{ doc.issueDate && !isNaN(new Date(doc.issueDate)) ? formatDate(doc.issueDate) : '—' }}</td>
                    <td class="text-right">
                      <span v-if="doc.total != null" class="fw-600" style="font-size:13px">{{ formatCurrency(doc.total) }}</span>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td>
                      <span v-if="doc.status" class="badge"
                        :class="['Unterschrieben','Bezahlt','Angenommen'].includes(doc.status) ? 'badge-success'
                               : ['Versendet','Verschickt'].includes(doc.status) ? 'badge-warning'
                               : ['Storniert','Abgelehnt'].includes(doc.status) ? 'badge-danger'
                               : 'badge-neutral'"
                        style="font-size:10px">{{ doc.status }}</span>
                    </td>
                    <td @click.stop style="white-space:nowrap">
                      <!-- Vertrag -->
                      <template v-if="doc._isContract">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Anzeigen (neuer Tab)"
                          @click="docsModal=false; openContractPrint(false)">🔍</button>
                        <button class="btn btn-ghost btn-sm btn-icon" title="Drucken / Als PDF speichern"
                          @click="docsModal=false; openContractPrint('print')">📥</button>
                      </template>
                      <!-- Anhang mit Datei -->
                      <a v-else-if="doc._isAttachment && doc._downloadUrl"
                        :href="doc._downloadUrl" target="_blank"
                        class="btn btn-ghost btn-sm btn-icon" title="Herunterladen">⬇️</a>
                      <!-- Angebot oder Rechnung -->
                      <template v-else-if="!doc._isAddendum && (doc.type==='invoice'||doc.type==='quote')">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Anzeigen (neuer Tab)"
                          @click="openDocOrStd(doc)">🔍</button>
                        <button class="btn btn-ghost btn-sm btn-icon" title="Drucken / Als PDF speichern"
                          @click="openDocPrint(doc)">📥</button>
                        <button v-if="doc.type==='invoice'" class="btn btn-ghost btn-sm btn-icon"
                          title="E-Rechnung (ZUGFeRD XML)" @click="downloadZugferdFromDoc(doc)">📄</button>
                      </template>
                      <!-- Sonstige Dokumente (AGB, DSGVO, ADV etc.) -->
                      <template v-else-if="!doc._isAddendum">
                        <button class="btn btn-ghost btn-sm btn-icon" title="Anzeigen (neuer Tab)"
                          @click="openDocOrStd(doc)">🔍</button>
                        <button class="btn btn-ghost btn-sm btn-icon" title="Drucken / Als PDF speichern"
                          @click="openDocOrStd(doc)">📥</button>
                      </template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Teleport>

      

            <!-- ══ Projektnotizen Modal ════════════════════════════════════════════ -->
      <Teleport to="body">
        <div v-if="notesModal" class="qsc-overlay" @click.self="notesModal = false">
          <div class="qsc-dialog pnm-dialog">
            <div class="qsc-dialog-head">
              <span>📝 Projektnotizen</span>
              <button class="qsc-form-x" @click="notesModal = false">✕</button>
            </div>

            <div class="pnm-body">
              <!-- Neue Notiz -->
              <div class="pnm-compose" :class="{ 'pnm-compose-open': noteCompose.open }">
                <div v-if="!noteCompose.open">
                  <button class="btn btn-sm btn-primary" @click="openNoteCompose">+ Neue Notiz</button>
                </div>
                <div v-else>
                  <div class="pnm-compose-ts">🕐 {{ formatDateTime(noteCompose.createdAt) }}</div>
                  <textarea class="pnm-ta" v-model="noteCompose.text"
                    placeholder="Notiz eingeben …" rows="4" autofocus></textarea>
                  <div class="pnm-compose-foot">
                    <button class="btn btn-ghost btn-sm"
                      @click="noteCompose.open = false; noteCompose.text = ''">Abbrechen</button>
                    <button class="btn btn-sm btn-primary"
                      :disabled="!noteCompose.text.trim() || noteSaving"
                      @click="saveNewNote">
                      {{ noteSaving ? '⏳' : '💾 Speichern' }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Notizen-Liste -->
              <div class="pnm-list">
                <div v-if="!projectNotes.length && !noteCompose.open" class="pnm-empty">
                  Noch keine Notizen vorhanden.
                </div>
                <div v-for="note in projectNotesSorted" :key="note.id" class="pnm-note"
                  :class="{ 'pnm-note-editing': noteEditing === note.id }">
                  <div class="pnm-meta">
                    <span v-if="note.label" class="pnm-source-tag">{{ note.label }}</span>
                    <span class="pnm-ts">{{ formatDateTime(note.createdAt) }}</span>
                    <span v-if="note.updatedAt && note.updatedAt !== note.createdAt" class="pnm-edited">
                      · bearbeitet {{ formatDateTime(note.updatedAt) }}
                    </span>
                  </div>
                  <div v-if="noteEditing !== note.id" class="pnm-text">{{ note.text }}</div>
                  <textarea v-else class="pnm-ta" v-model="noteEditText" rows="4"></textarea>
                  <div class="pnm-actions">
                    <template v-if="noteEditing !== note.id">
                      <button class="btn btn-ghost btn-sm" @click="startEditNote(note)">✏️</button>
                      <button class="btn btn-ghost btn-sm text-danger" @click="deleteNote(note.id)">🗑️</button>
                    </template>
                    <template v-else>
                      <button class="btn btn-ghost btn-sm" @click="noteEditing = null">Abbrechen</button>
                      <button class="btn btn-sm btn-primary" :disabled="noteSaving"
                        @click="saveEditNote(note.id)">
                        {{ noteSaving ? '⏳' : '💾 Speichern' }}
                      </button>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

  <Teleport to="body">
    <transition name="qsc-fade">

      <div v-if="sidebarEdit.show" class="qsc-overlay">
        <div class="qsc-dialog qsc-dialog-form" style="max-width:460px">

          <div class="qsc-form-header">
            <div class="qsc-form-title">✏️ Auftrag anpassen</div>
            <div class="qsc-form-sub">Änderungen betreffen nur das Angebot — die Anfrage bleibt eingefroren.</div>
            <button class="qsc-form-x" @click="sidebarEdit.show = false">✕</button>
          </div>

          <div class="qsc-form-body">

            <div class="qsc-form-row">
              <label class="qsc-form-lbl">
                Anlass / Bezeichnung
                <span v-if="sidebarEdit.occasionAutoSet" class="acp-auto-tag">⚡ auto</span>
              </label>
              <input class="qsc-form-inp" v-model="sidebarEdit.form.occasion" type="text"
                @input="sidebarEdit.occasionAutoSet = false"
                placeholder="z.B. Hochzeit am 14. Juni 2026" />
            </div>

            <div class="qsc-form-row qsc-form-row-2">
              <div>
                <label class="qsc-form-lbl">Buchungsdatum</label>
                <input class="qsc-form-inp" v-model="sidebarEdit.form.booking" type="date" />
              </div>
              <div>
                <label class="qsc-form-lbl">Uhrzeit</label>
                <input class="qsc-form-inp" v-model="sidebarEdit.form.bookingTime" type="time" />
              </div>
            </div>

            <div class="qsc-form-row">
              <label class="qsc-form-lbl">Bezeichnung Haupt-Termin</label>
              <input class="qsc-form-inp" v-model="sidebarEdit.form.bookingLabel" type="text"
                placeholder="z.B. Zeremonie, Shooting, Termin 1" />
            </div>

            <!-- Weitere Shooting-Termine (BQ-6) -->
            <div class="qsc-form-row">
              <label class="qsc-form-lbl" style="display:flex;align-items:center;justify-content:space-between">
                <span>Weitere Termine</span>
                <button type="button" class="npf-loc-add-btn" style="font-size:10px;padding:1px 7px"
                  @click="sidebarEdit.form.shootingDates.push({id:'sd_'+Date.now(),date:'',time:'',label:''})">
                  + Termin
                </button>
              </label>
              <div v-if="!sidebarEdit.form.shootingDates.length" style="font-size:11px;color:var(--text-muted);font-style:italic;padding:4px 0">
                Keine weiteren Termine
              </div>
              <div v-for="(sd, idx) in sidebarEdit.form.shootingDates" :key="sd.id"
                style="display:flex;gap:5px;align-items:center;margin-bottom:5px">
                <input v-model="sd.date"  type="date" class="qsc-form-inp" style="flex:0 0 130px;font-size:12px" />
                <input v-model="sd.time"  type="time" class="qsc-form-inp" style="flex:0 0 80px;font-size:12px" />
                <input v-model="sd.label" type="text" class="qsc-form-inp" style="flex:1;font-size:12px" placeholder="Bezeichnung" />
                <button type="button" class="npf-loc-del"
                  @click="sidebarEdit.form.shootingDates.splice(idx,1)">✕</button>
              </div>
            </div>

            <div class="qsc-form-row">
              <label class="qsc-form-lbl">Location</label>
              <input class="qsc-form-inp" v-model="sidebarEdit.form.location" type="text"
                placeholder="z.B. Schloss Neuschwanstein" />
            </div>

            <div class="qsc-form-row">
              <label class="qsc-form-lbl">Kategorie</label>
              <select class="qsc-form-inp" v-model="sidebarEdit.form.category">
                <option value="">— keine —</option>
                <option v-for="cat in ['Hochzeit','Portrait','Event','Produktfotografie','Familienshooting','Businessfotografie','Sonstiges']"
                  :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>

            <div class="qsc-form-row">
              <label class="qsc-form-lbl">Preismodell</label>
              <div class="qsc-chip-row">
                <button v-for="m in [{v:'hourly',l:'⏱ Stunden'},{v:'flat',l:'📦 Pauschal'},{v:'custom',l:'✏️ Individuell'}]"
                  :key="m.v" class="qv-pill" style="font-size:11px"
                  :class="{'qv-pill-active qv-pill-versendet': sidebarEdit.form.pricingModel === m.v}"
                  @click="sidebarEdit.form.pricingModel = m.v">{{ m.l }}</button>
              </div>
            </div>

            <template v-if="sidebarEdit.form.pricingModel === 'hourly'">
              <div class="qsc-form-row qsc-form-row-2">
                <div>
                  <label class="qsc-form-lbl">Stundensatz (€)</label>
                  <input class="qsc-form-inp" v-model.number="sidebarEdit.form.hourlyRate" type="number" min="0" step="5" />
                </div>
                <div>
                  <label class="qsc-form-lbl">Geplante Stunden</label>
                  <input class="qsc-form-inp" v-model.number="sidebarEdit.form.estimatedHours" type="number" min="0" step="0.5" />
                </div>
              </div>
            </template>
            <template v-else-if="sidebarEdit.form.pricingModel === 'flat'">
              <div class="qsc-form-row">
                <label class="qsc-form-lbl">Pauschalpreis (€ netto)</label>
                <input class="qsc-form-inp" v-model.number="sidebarEdit.form.flatRate" type="number" min="0" step="50" />
              </div>
            </template>

            <div class="qsc-form-row qsc-form-row-2">
              <div>
                <label class="qsc-form-lbl">Anzahlung (€)</label>
                <input class="qsc-form-inp" v-model.number="sidebarEdit.form.depositAmount" type="number" min="0" step="10" />
              </div>
              <div>
                <label class="qsc-form-lbl">Zahlungsziel (Tage)</label>
                <input class="qsc-form-inp" v-model.number="sidebarEdit.form.paymentDueDays" type="number" min="7" step="7" />
              </div>
            </div>

            <div class="qsc-form-row">
              <label class="qsc-form-lbl">Notizen</label>
              <textarea class="qsc-form-inp" v-model="sidebarEdit.form.notes" rows="3"
                placeholder="Besonderheiten, Wünsche, Hinweise…" />
            </div>

          </div>

          <div class="qsc-actions">
            <button class="btn btn-ghost btn-sm" @click="sidebarEdit.show = false">Abbrechen</button>
            <button class="btn btn-sm btn-primary" :disabled="sidebarEdit.saving" @click="saveSidebarEdit">
              {{ sidebarEdit.saving ? '⏳ Speichern…' : '💾 Übernehmen' }}
            </button>
          </div>

        </div>
      </div>
    </transition>
  </Teleport>


      <!-- ══ Manuell-Position Popup ══════════════════════════════════════════ -->
      <Teleport to="body">
        <div v-if="manualPopup" class="qsc-overlay" @click.self="manualPopup = false">
          <div class="qsc-dialog qsc-dialog-form mpop-dialog">
            <div class="qsc-form-header">
              <div class="qsc-form-title">✏️ Manuelle Position</div>
              <div class="qsc-form-sub">Position wird direkt in die Rechnung übernommen</div>
              <button class="qsc-form-x" @click="manualPopup = false">✕</button>
            </div>
            <div class="qsc-form-body">
              <div class="qsc-form-row">
                <label class="qsc-form-lbl">Bezeichnung *</label>
                <input v-model="manualForm.description" class="qsc-form-inp" type="text"
                  placeholder="z. B. Bildbearbeitung, Reisekostenpauschale…"
                  @keydown.enter="saveManualLine" autofocus />
              </div>
              <div class="qsc-form-row">
                <label class="qsc-form-lbl">Details (optional)</label>
                <input v-model="manualForm.detail" class="qsc-form-inp" type="text"
                  placeholder="Zusatzinfo für die Rechnung" />
              </div>
              <div class="qsc-form-row-2">
                <div class="qsc-form-row">
                  <label class="qsc-form-lbl">Menge</label>
                  <input v-model.number="manualForm.quantity" class="qsc-form-inp" type="number" min="0.01" step="0.01" />
                </div>
                <div class="qsc-form-row">
                  <label class="qsc-form-lbl">Einheit</label>
                  <select v-model="manualForm.unit" class="qsc-form-inp">
                    <option v-for="u in manualUnits" :key="u" :value="u">{{ u }}</option>
                  </select>
                </div>
              </div>
              <div class="qsc-form-row-2">
                <div class="qsc-form-row">
                  <label class="qsc-form-lbl">€ netto (Einzelpreis)</label>
                  <input v-model.number="manualForm.priceNet" class="qsc-form-inp" type="number" step="0.01"
                    placeholder="0.00" />
                </div>
                <div class="qsc-form-row">
                  <label class="qsc-form-lbl">USt. %</label>
                  <select v-model.number="manualForm.taxRate" class="qsc-form-inp">
                    <option :value="0">0 %</option>
                    <option :value="7">7 %</option>
                    <option :value="19">19 %</option>
                  </select>
                </div>
              </div>
              <div class="qsc-form-row">
                <label class="qsc-form-lbl">Rabatt %</label>
                <input v-model.number="manualForm.discount" class="qsc-form-inp" type="number" min="0" max="100" step="1" placeholder="0" />
              </div>
              <div class="mpop-preview" v-if="manualForm.priceNet">
                <span class="mpop-preview-lbl">Zeilenbetrag brutto</span>
                <span class="mpop-preview-val">
                  {{ new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(
                    (manualForm.quantity||0) * (manualForm.priceNet||0) *
                    (1-(manualForm.discount||0)/100) * (1+(manualForm.taxRate||0)/100)
                  ) }}
                </span>
              </div>
            </div>
            <div class="qsc-actions qsc-dialog-form .qsc-actions" style="padding:14px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px">
              <button class="btn btn-ghost btn-sm" @click="manualPopup = false">Abbrechen</button>
              <button class="btn btn-primary btn-sm" @click="saveManualLine"
                :disabled="!manualForm.description.trim()">
                ✓ Position hinzufügen
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ══ Zahlungseingang Popup ════════════════════════════════════════════ -->
      <Teleport to="body">
        <div v-if="paymentPopup" class="qsc-overlay" @click.self="paymentPopup = false">
          <div class="qsc-dialog qsc-dialog-form ppop-dialog">
            <div class="qsc-form-header">
              <div class="qsc-form-title">💶 Zahlungseingang erfassen</div>
              <div class="qsc-form-sub">{{ paymentDocLabel }}</div>
              <button class="qsc-form-x" @click="paymentPopup = false">✕</button>
            </div>
            <div class="qsc-form-body">
              <div class="qsc-form-row">
                <label class="qsc-form-lbl">Zahlungsdatum *</label>
                <input v-model="paymentForm.paidAt" class="qsc-form-inp" type="date"
                  :class="{ 'qsc-inp-error': paymentError && !paymentForm.paidAt }" />
              </div>
              <div class="qsc-form-row">
                <label class="qsc-form-lbl">Zahlungsart *</label>
                <div class="ppop-method-row">
                  <button v-for="m in enabledPaymentMethods"
                    :key="m.id"
                    class="ppop-method-btn"
                    :class="{ active: paymentForm.paymentMethod === m.id }"
                    @click="paymentForm.paymentMethod = m.id">
                    <span class="ppop-method-icon">{{ m.icon }}</span>
                    <span class="ppop-method-lbl">{{ m.id }}</span>
                  </button>
                </div>
              </div>
              <div v-if="paymentError" class="ppop-error">⚠️ {{ paymentError }}</div>
            </div>
            <div style="padding:14px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px">
              <button class="btn btn-ghost btn-sm" @click="paymentPopup = false">Abbrechen</button>
              <button class="btn btn-primary btn-sm" @click="confirmPayment" :disabled="paymentSaving">
                <span v-if="paymentSaving">⏳ Speichere…</span>
                <span v-else>✅ Als bezahlt markieren</span>
              </button>
            </div>
          </div>
        </div>
      </Teleport>

</template>

<script>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useStore }              from '../stores/useStore'
import { downloadPdfFromBackend } from '../services/pdfExport.js'
// ── Pipeline Sub-Komponenten ──────────────────────────────────────────────────
import ProjectPipelineAnfrage     from '../components/project/ProjectPipelineAnfrage.vue'
import ProjectPipelineVorgespraech from '../components/project/ProjectPipelineVorgespraech.vue'
import ProjectPipelineAngebot     from '../components/project/ProjectPipelineAngebot.vue'
import ProjectPipelineVertrag     from '../components/project/ProjectPipelineVertrag.vue'
import ProjectPipelineAnzahlung   from '../components/project/ProjectPipelineAnzahlung.vue'
import ProjectPipelineAbrechnung  from '../components/project/ProjectPipelineAbrechnung.vue'
import ProjectPipelineAbschluss   from '../components/project/ProjectPipelineAbschluss.vue'
import { useProjectDetailStore } from '../stores/useProjectDetailStore'
import { useContractStore }      from '../stores/useContractStore'
import { useInvoiceStore }       from '../stores/useInvoiceStore'
import { useQuoteStore }         from '../stores/useQuoteStore'
import QuoteInvoiceModal from '../components/QuoteInvoiceModal.vue'
import InlineQuoteForm  from '../components/InlineQuoteForm.vue'
import NewProjectForm   from '../components/NewProjectForm.vue'
import DocumentDetailModal from '../components/DocumentDetailModal.vue'
import { useRoute, useRouter } from 'vue-router'
import { generateZugferdXml, downloadZugferdXml } from '../services/zugferd.js'
import apiClient, { API_BASE } from '../services/api'

export default {
  name: 'ProjectDetail',
  components: {
    QuoteInvoiceModal, DocumentDetailModal, NewProjectForm, InlineQuoteForm,
    ProjectPipelineAnfrage, ProjectPipelineVorgespraech, ProjectPipelineAngebot,
    ProjectPipelineVertrag, ProjectPipelineAnzahlung, ProjectPipelineAbrechnung,
    ProjectPipelineAbschluss,
  },
  setup() {
    const store         = useStore()
    const pdStore       = useProjectDetailStore()
    const contractStore = useContractStore()
    const invoiceStore  = useInvoiceStore()
    const quoteStore    = useQuoteStore()

    // ── Template-Aliases → Store-Refs (für ProjectDetail eigenes Template) ──
    const invoiceModal       = computed(() => invoiceStore.invoiceModal ?? false)
    const quoteStatusConfirm = computed(() => quoteStore.quoteStatusConfirm)
    const depositNextInvoice = computed(() => invoiceStore.depositNextInvoice)
    const invoicePrefillItems= computed(() => invoiceStore.invoicePrefillItems)
    const paymentPopup       = computed(() => invoiceStore.paymentPopup)
    const paymentDocLabel    = computed(() => invoiceStore.paymentDocLabel)
    const paymentForm        = computed(() => invoiceStore.paymentForm)
    const paymentSaving      = computed(() => invoiceStore.paymentSaving)
    const paymentError       = computed(() => invoiceStore.paymentError)

    const activeArticles = computed(() => store.articles.filter(a => a.active !== false))
    const route  = useRoute()
    const router = useRouter()

    const loading          = ref(true)
    const projectDocuments = ref([])
    const detailDocId      = ref(null)

    // ── Kundenfoto ────────────────────────────────────────────────────────────
    const photoLightbox  = ref(false)
    const photoUploading = ref(false)
    const photoError     = ref('')

    async function uploadPhoto(file) {
      if (!file || !project.value) return
      photoError.value     = ''
      photoUploading.value = true
      try {
        await store.uploadCustomerPhoto(project.value.id, file)
      } catch(e) {
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

    const project = computed(() =>
      store.projects.find(p => p.id === route.params.id) || null
    )

    const customerName = computed(() => {
      if (!project.value?.customerId) return ''
      const c = store.customers.find(c => c.id === project.value.customerId)
      if (!c) return ''
      return `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.company || ''
    })

    // Back-Navigation: immer zurück zum Dashboard
    function goBack() {
      router.push('/')
    }

    /**
     * Öffnet den Projektordner (oder Unterordner) im Explorer/Finder.
     * @param {string} [subfolder] - z.B. 'dokumente', 'medien/bilder', 'vertraege'
     */
    function openProjectFolder(subfolder) {
      if (!window.pixframe?.openFolder || !project.value?.projectFolderPath) return
      fetch(`${API_BASE}/api/workspace/info`)
        .then(r => r.json())
        .then(json => {
          const wsPath = json.data?.path
          if (!wsPath) return
          let fullPath = wsPath + '/' + project.value.projectFolderPath
          if (subfolder) fullPath += '/' + subfolder
          window.pixframe.openFolder(fullPath.replace(/\//g, '\\'))
        })
        .catch(e => console.warn('Ordner öffnen fehlgeschlagen:', e))
    }

    // Live-Vorschau im Hero-Banner während Anfrage-Formular ausgefüllt wird
    const heroLive = ref({ projectName: '', booking: '', bookingTime: '', location: '' })
    function onHeroLive(data) { Object.assign(heroLive.value, data) }

    // Leistungen-Checks
    const anyService = computed(() =>
      project.value && (
        project.value.fotografie || project.value.videografie ||
        project.value.glueckwunschkarten || project.value.gettingReady ||
        project.value.gettingReadyEr || project.value.gettingReadySie ||
        project.value.gettingReadyBeide
      )
    )
    const hasGettingReady = computed(() =>
      project.value && (
        project.value.gettingReady || project.value.gettingReadyEr ||
        project.value.gettingReadySie || project.value.gettingReadyBeide
      )
    )

    // Helpers
    function formatDate(d) { return d ? new Date(d).toLocaleDateString('de-DE') : '—' }
    function formatCurrency(n) {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0)
    }
    function isExpired(d) { return d && new Date(d) < new Date() }
    function typeLabel(type) {
      return { contract:'Vertrag', addendum:'Nachtrag', attachment:'Anhang', invoice:'Rechnung', quote:'Angebot', mood:'Moodboard', reference:'Referenz', other:'Dokument', dsgvo:'DSGVO', adv:'ADV', agb:'AGB' }[type] || type
    }

    // Gibt für Standarddokumente die passende Druckseite zurück
    function stdDocPrintUrl(doc) {
      const pid = project.value?.id
      const n = (doc.name || '').toLowerCase()
      // Reihenfolge wichtig: ADV vor DSGVO prüfen
      if (n.includes('auftragsverarbeitungs') || n.includes('adv-auftrags')) return '/print/adv-vertrag'
      if (n.includes('adv') && n.includes('vertrag')) return '/print/adv-vertrag'
      if (n.includes('dsgvo') || n.includes('einwilligung'))                  return '/print/dsgvo'
      if (n.includes('adv') && pid) return `/print/adv/${pid}`
      if (n.includes('agb')) return '/print/agb'
      return null
    }
    function isStdDoc(doc) {
      if (doc.type !== 'other') return false
      const n = (doc.name || '').toLowerCase()
      return n.includes('dsgvo') || n.includes('einwilligung') ||
             n.includes('adv') || n.includes('auftragsverarbeitungs') ||
             n.includes('agb')
    }
    // Öffnet Settings-Druckseite für AGB/DSGVO/ADV, sonst normale Dokumentansicht
    function openDocOrStd(doc) {
      // window.open MUSS synchron im User-Interaction-Callstack aufgerufen werden
      // BEVOR das Modal geschlossen wird — sonst blockiert der Browser den Popup
      let url = null
      if (isStdDoc(doc)) {
        url = stdDocPrintUrl(doc)
      } else if (doc.type === 'invoice' || doc.type === 'quote') {
        url = router.resolve({ name: 'DocumentPrint', params: { id: doc.id } }).href
      }
      if (url) {
        window.open(url, '_blank')
        docsModal.value = false
      } else {
        docsModal.value = false
        openPrintView(doc)
      }
    }

    // ── Dokument-Aktionen (unified) ──────────────────────────────────
    // PDF direkt speichern via Electron IPC (kein neues Fenster)
    function openDocPrint(doc, action = null) {
      if (!action) {
        // Vorschau: Fenster oeffnen
        const url = router.resolve({
          name: 'DocumentPrint',
          params: { id: doc.id },
        }).href
        window.open(url, '_blank')
        docsModal.value = false
        return
      }
      // PDF erzeugen + im Viewer oeffnen (oder Fallback: direkt speichern)
      if (window.pixframe?.generateAndOpenPDF) {
        openPdfInViewer('/api/pdf/document/' + doc.id)
      } else {
        const filename = [doc.documentNumber, doc.customerName].filter(Boolean).join('_')
        downloadPdfFromBackend(`/api/pdf/document/${doc.id}`, filename)
          .catch(e => console.error('PDF-Fehler:', e))
      }
      docsModal.value = false
    }

    // Shorthand
    function openDocDownload(doc) {
      openDocPrint(doc, 'download')
    }

    // 📄 E-Rechnung ZUGFeRD direkt aus Store – kein neuer Tab nötig
    async function downloadZugferdFromDoc(doc) {
      try {
        const [docRes, settingsRes] = await Promise.all([
          apiClient.get(`/documents/${doc.id}`),
          apiClient.get('/settings'),
        ])
        const fullDoc  = docRes.data?.data ?? docRes.data
        const settings = settingsRes.data?.data ?? settingsRes.data
        const custRes  = fullDoc.customerId ? await apiClient.get(`/customers/${fullDoc.customerId}`) : null
        const customer = custRes?.data?.data ?? null
        const xml = generateZugferdXml(fullDoc, customer, settings, project.value)
        downloadZugferdXml(xml, fullDoc.documentNumber || doc.documentNumber)
      } catch(e) { console.error('ZUGFeRD Fehler:', e) }
    }

    function downloadDoc(doc) {
      if (doc.filePath) window.open(`${API_BASE}/${doc.filePath}`, '_blank')
    }

    // Unified: Lupe öffnet immer die PDF-/Druckansicht des jeweiligen Dokuments
    function openPrintView(doc) {
      if (doc._isContract) {
        openContractPrint()
      } else if (doc._isAddendum) {
        openAddendumPrint(doc._addendumId)
      } else {
        openDocPrint(doc)
      }
    }

    // Edit Modal
    const editing         = ref(false)
    const editModal       = ref(false)  // kept for backward compat
    const editSaving = ref(false)
    const editError  = ref('')
    const editForm   = ref({})


    // Computed: gesperrt wenn unterschrieben UND mindestens ein Upload vorhanden
    // (computed already imported at top)
    const contractLocked = computed(() =>
      contractStore.contractStatus === 'Unterschrieben'
    )
    const contractStatusClass = computed(() => ({
      'Entwurf':       'badge-neutral',
      'Verschickt':    'badge-info',
      'Unterschrieben':'badge-success',
    }[contractStore.contractStatus] || 'badge-neutral'))

    // Hat der Vertrag bereits gespeicherte Klauseldaten?
    const contractHasData = computed(() => {
      // Only true when user has explicitly saved a contract via saveContractData()
      // (not just because Anfrage pre-filled contractData in the background)
      return !!(project.value?.contractCreated)
    })

    function openContractForm() {
      contractStore.contractFormIsNew = !contractStore.contractHasData
      const p = project.value

      if (!contractStore.contractHasData) {
        // Neuer Vertrag: Leistungen aus Anfrage vorbelegen
        if (p) {
          contractStore.contractForm.fotografie         = p.fotografie         || false
          contractStore.contractForm.videografie        = p.videografie        || false
          contractStore.contractForm.glueckwunschkarten = p.glueckwunschkarten || false
          contractStore.contractForm.gettingReadyEr     = p.gettingReadyEr     || false
          contractStore.contractForm.gettingReadySie    = p.gettingReadySie    || false
          contractStore.contractForm.gettingReadyBeide  = p.gettingReadyBeide  || false
        }
        // defaultActive Klauseln vorauswählen
        const activeClauses = (settingsData.value?.contractClauses?.specialClauses || [])
          .filter(cl => cl.defaultActive)
          .map(cl => cl.id)
        contractStore.contractForm.selectedSpecialClauses = activeClauses
      } else {
        // Vorhandener Vertrag: Leistungen aus contractData, Fallback auf project
        const cd = p?.contractData || {}
        contractStore.contractForm.fotografie         = cd.fotografie         != null ? cd.fotografie         : (p?.fotografie         || false)
        contractStore.contractForm.videografie        = cd.videografie        != null ? cd.videografie        : (p?.videografie        || false)
        contractStore.contractForm.glueckwunschkarten = cd.glueckwunschkarten != null ? cd.glueckwunschkarten : (p?.glueckwunschkarten || false)
        contractStore.contractForm.gettingReadyEr     = cd.gettingReadyEr     != null ? cd.gettingReadyEr     : (p?.gettingReadyEr     || false)
        contractStore.contractForm.gettingReadySie    = cd.gettingReadySie    != null ? cd.gettingReadySie    : (p?.gettingReadySie    || false)
        contractStore.contractForm.gettingReadyBeide  = cd.gettingReadyBeide  != null ? cd.gettingReadyBeide  : (p?.gettingReadyBeide  || false)
      }
      contractStore.contractFormOpen = true
    }

    // ── Erweiterte Dokumentenliste: Docs + Vertrag + Nachträge ──
    const allProjectDocs = computed(() => {
      const docs = [...(projectDocuments.value || [])]
      if (!project.value) return docs

      // ── Hauptvertrag + Generierungs-Versionen ──
      // Nur anzeigen wenn mindestens eine Version generiert wurde
      const cgv = contractStore.contractGeneratedVersions || []
      if (cgv.length > 0 || (contractStore.signedContracts || []).length > 0) {
        const cs = contractStore.contractStatus || 'Entwurf'
        const latestGen = cgv.length ? cgv[cgv.length - 1] : null
        docs.push({
          id: `__contract_${project.value.id}`,
          _isContract: true,
          _contractEditable: !contractLocked.value,  // bearbeitbar bis Unterschrift
          _generatedVersions: cgv,
          _latestGenerated: latestGen?.generatedAt || null,
          name: `Vertrag · ${project.value.contractData?.occasion || project.value.projectName || 'Auftrag'}`,
          type: 'contract',
          status: cs,
          issueDate: latestGen?.generatedAt || project.value.createdAt || null,
          total: null,
          documentNumber: project.value.contractNumber || null,
        })
      }

      // ── Unterzeichnete Verträge als Anhänge (eingerückt unter Vertrag) ──
      for (const sc of contractStore.signedContracts || []) {
        docs.push({
          id: `__signed_${sc.id}`,
          _isAttachment: true,
          _attachmentLabel: 'Unterschriebener Vertrag',
          _downloadUrl: `${API_BASE}/api/projects/${project.value.id}/contracts/${sc.id}/download`,
          name: sc.originalName,
          type: 'attachment',
          status: 'Unterschrieben',
          issueDate: sc.uploadedAt,
          total: null,
          documentNumber: null,
          ext: sc.ext,
        })
      }

      // ── Nachträge als Anhänge (eingerückt unter Vertrag) ──
      for (const [i, add] of (contractStore.contractAddenda || []).entries()) {
        docs.push({
          id: `__addendum_${add.id}`,
          _isAddendum: true,
          _addendumId: add.id,
          name: add.title || `Nachtrag ${i + 1}`,
          type: 'addendum',
          status: add.signedFile ? 'Unterschrieben' : 'Entwurf',
          issueDate: add.date,
          total: null,
          documentNumber: add.addendumNumber || null,
        })
        // Unterzeichneter Nachtrag als weiterer Anhang
        if (add.signedFile) {
          docs.push({
            id: `__signed_add_${add.id}`,
            _isAttachment: true,
            _attachmentLabel: `Unterschr. ${add.title || `Nachtrag ${i + 1}`}`,
            _downloadUrl: `${API_BASE}/api/projects/${project.value.id}/addenda/${add.id}/sign/download`,
            name: add.signedFile.originalName,
            type: 'attachment',
            status: 'Unterschrieben',
            issueDate: add.signedFile.uploadedAt,
            total: null,
            documentNumber: null,
            ext: add.signedFile.ext,
          })
        }
      }

      return docs
    })

    async function saveContractStatus() {
      try {
        await store.updateProject(project.value.id, { contractStatus: contractStore.contractStatus })
      } catch (e) { console.error(e) }
    }

    async function saveAddendum() {
      if (!contractStore.addendumDraft.title.trim() || !contractStore.addendumDraft.content.trim()) return
      contractStore.addendumSaving = true
      try {
        let addendumNumber = null
        try {
          const nr = await apiClient.get('/projects/next-addendum-number')
          addendumNumber = nr.data?.number || null
        } catch {}

        const newAdd = {
          id:            `add_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
          addendumNumber,
          title:         contractStore.addendumDraft.title.trim(),
          date:          contractStore.addendumDraft.date,
          content:       contractStore.addendumDraft.content.trim(),
          addStatus:     'Entwurf',
          createdAt:     new Date().toISOString(),
        }
        const updated = [...contractStore.contractAddenda, newAdd]
        await store.updateProject(project.value.id, { contractAddenda: updated })
        contractStore.contractAddenda = updated
        contractStore.addendumDraft   = { title: '', date: new Date().toISOString().slice(0,10), content: '', addStatus: 'Entwurf' }
        contractStore.addendaFormOpen = false
      } catch (e) { console.error(e) } finally { contractStore.addendumSaving = false }
    }

    async function deleteAddendum(addId) {
      if (!confirm('Nachtrag wirklich löschen?')) return
      const updated = contractStore.contractAddenda.filter(a => a.id !== addId)
      await store.updateProject(project.value.id, { contractAddenda: updated })
      contractStore.contractAddenda = updated
    }

    // ─── Einstellungen (für Auto-Deposit + Template-Info) ────────
    const settingsData      = ref(null)

    async function loadSettings() {
      try {
        const res = await apiClient.get('/settings')
        settingsData.value     = res.data?.data || res.data
        contractStore.contractTemplate = settingsData.value?.contractTemplate || null
      } catch (e) { console.error('Settings laden fehlgeschlagen:', e) }
    }

    // Auto-Deposit: berechnet aus Budget × Anzahlungssatz (nur wenn noch kein Wert gesetzt)
    // Auto-suggest usage surcharge from settings matrix
    function calcAutoSurcharge(scope, duration) {
      const matrix = settingsData.value?.usageSurchargeMatrix
      if (!matrix || !scope || !duration) return 0
      return matrix[scope]?.[duration] ?? 0
    }

    function calcAutoDeposit(base) {
      const rate = settingsData.value?.bookingTerms?.depositRate ?? 20
      if (!rate || !base) return null
      return Math.round(base * rate / 100 * 100) / 100
    }

    // Base amount derived from pricing model – used for auto-deposit calculation
    const contractBase = computed(() => {
      const f = contractStore.contractForm
      if (f.pricingModel === 'hourly' && f.hourlyRate && f.estimatedHours)
        return f.hourlyRate * f.estimatedHours
      if (f.pricingModel === 'flat' && f.flatRate)
        return f.flatRate
      return null
    })

    function fmtFileSize(bytes) {
      if (!bytes) return ''
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
    function fmtDate(iso) {
      if (!iso) return ''
      return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    function openContractPrint(autoAction = false) {
      if (!project.value) return
      if (!autoAction) {
        // Vorschau: Fenster oeffnen
        window.open(`/print/contract/${project.value.id}`, '_blank')
        return
      }
      // PDF erzeugen + im Viewer oeffnen
      if (window.pixframe?.generateAndOpenPDF) {
        openPdfInViewer('/api/pdf/contract/' + project.value.id)
      } else {
        const p = project.value
        const cu = customer.value
        const filename = [p?.contractNumber || 'Vertrag', p?.category, cu?.lastName || cu?.company || ''].filter(Boolean).join('_')
        downloadPdfFromBackend(`/api/pdf/contract/${project.value.id}`, filename)
          .catch(e => console.error('PDF-Fehler:', e))
      }
    }

    // ── Vertrag oeffnen: Status → Verschickt, dann PDF im Viewer oeffnen ──
    async function printContract() {
      if (contractStore.contractStatus === 'Entwurf') {
        contractStore.contractStatus = 'Verschickt'
        await saveContractStatus()
      }
      openContractPrint('download')
    }

    // ── Vertrag oeffnen (Alias) ──
    async function downloadContract() {
      if (contractStore.contractStatus === 'Entwurf') {
        contractStore.contractStatus = 'Verschickt'
        await saveContractStatus()
      }
      openContractPrint('download')
    }

    function openAdvPrint() {
      if (!project.value) return
      if (window.pixframe?.generateAndOpenPDF) {
        openPdfInViewer('/api/pdf/adv/' + project.value.id)
      } else {
        const cu = customer.value
        const filename = 'ADV_' + (cu?.lastName || cu?.company || project.value.id)
        downloadPdfFromBackend(`/api/pdf/adv/${project.value.id}`, filename)
          .catch(e => console.error('PDF-Fehler:', e))
      }
    }

    function openAddendumPrint(addendumId, autoAction = false) {
      if (!project.value) return
      if (!autoAction) {
        window.open(`/print/addendum/${project.value.id}/${addendumId}`, '_blank')
        return
      }
      if (window.pixframe?.generateAndOpenPDF) {
        openPdfInViewer('/api/pdf/addendum/' + project.value.id + '/' + addendumId)
      } else {
        const filename = 'Nachtrag_' + (project.value.contractNumber || project.value.id)
        downloadPdfFromBackend(`/api/pdf/addendum/${project.value.id}/${addendumId}`, filename)
          .catch(e => console.error('PDF-Fehler:', e))
      }
    }

    // ── Nachtrag oeffnen: Status → Verschickt, dann PDF im Viewer ──
    async function printAddendum(add) {
      if ((add.addStatus || 'Entwurf') === 'Entwurf') {
        await setAddendumStatus(add, 'Verschickt')
      }
      openAddendumPrint(add.id, 'download')
    }

    // ── Nachtrag oeffnen (Alias) ──
    async function downloadAddendum(add) {
      if ((add.addStatus || 'Entwurf') === 'Entwurf') {
        await setAddendumStatus(add, 'Verschickt')
      }
      openAddendumPrint(add.id, 'download')
    }

    // ── Nachtragsstatus setzen ────────────────────────────────────────────────
    async function setAddendumStatus(add, newStatus) {
      const idx = contractStore.contractAddenda.findIndex(a => a.id === add.id)
      if (idx === -1) return
      contractStore.contractAddenda[idx] = { ...contractStore.contractAddenda[idx], addStatus: newStatus }
      await store.updateProject(project.value.id, { contractAddenda: contractStore.contractAddenda })
    }

    async function uploadSignedAddendum(e, addendumId) {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const fd = new FormData()
        fd.append('addendum', file)
        const res = await fetch(`${API_BASE}/api/projects/${project.value.id}/addenda/${addendumId}/sign`, {
          method: 'POST', body: fd
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || 'Upload fehlgeschlagen')
        // Update local addendum: set signedFile + auto-status Unterschrieben
        const idx = contractStore.contractAddenda.findIndex(a => a.id === addendumId)
        if (idx !== -1) {
          contractStore.contractAddenda[idx] = {
            ...contractStore.contractAddenda[idx],
            signedFile: j.data,
            addStatus: 'Unterschrieben',
          }
          await store.updateProject(project.value.id, { contractAddenda: contractStore.contractAddenda })
        }
      } catch (err) { console.error('Nachtrag-Upload Fehler:', err) }
      finally { e.target.value = '' }
    }

    async function deleteSignedAddendum(addendumId) {
      if (!confirm('Unterzeichneten Nachtrag wirklich löschen?')) return
      try {
        await fetch(`${API_BASE}/api/projects/${project.value.id}/addenda/${addendumId}/sign`, { method: 'DELETE' })
        const idx = contractStore.contractAddenda.findIndex(a => a.id === addendumId)
        if (idx !== -1) contractStore.contractAddenda[idx] = { ...contractStore.contractAddenda[idx], signedFile: null }
      } catch (err) { console.error(err) }
    }

    async function saveContractData() {
      contractStore.contractSaving = true; contractStore.contractSaved = false
      try {
        // Assign contract number on first save
        let contractNumber = project.value.contractNumber
        if (!contractNumber) {
          const nr = await apiClient.get('/projects/next-contract-number')
          contractNumber = nr.data?.number || null
        }
        await store.updateProject(project.value.id, {
          contractData: { ...contractStore.contractForm },
          contractCreated: true,
          ...(contractNumber && !project.value.contractNumber ? { contractNumber } : {}),
        })
        if (contractNumber) project.value.contractNumber = contractNumber
        // Version-Eintrag anlegen (wie Angebots-Versionen)
        const existingVersions = contractStore.contractGeneratedVersions || []
        const newVersion = {
          id: `cv_${Date.now()}`,
          savedAt: new Date().toISOString(),
          generatedAt: new Date().toISOString(),
          label: 'v' + (existingVersions.length + 1),
        }
        contractStore.contractGeneratedVersions = [...existingVersions, newVersion]
        await store.updateProject(project.value.id, {
          contractGeneratedVersions: contractStore.contractGeneratedVersions,
        })
        contractStore.contractSaved = true
        setTimeout(() => { contractStore.contractSaved = false }, 2500)
        // Bei neuer Version (nicht erste): Status zurück auf Entwurf
        if (existingVersions.length > 0) {
          contractStore.contractStatus = 'Entwurf'
          await store.updateProject(project.value.id, { contractStatus: 'Entwurf' })
        }

        // Beim erstmaligen Erstellen: AGB, DSGVO und ADV automatisch als Dokumente anlegen
        if (existingVersions.length === 0) {
          const today = new Date().toISOString().slice(0, 10)
          const stdDocs = [
            { name: 'AGB',                     icon: '§'  },
            { name: 'DSGVO-Einwilligungserklärung', icon: '🔒' },
            { name: 'ADV-Auftragsverarbeitungsvertrag', icon: '📋' },
          ]
          for (const d of stdDocs) {
            try {
              await store.addDocument({
                projectId:  project.value.id,
                customerId: project.value.customerId,
                type:       'other',
                name:       d.name,
                status:     'Aktiv',
                issueDate:  today,
              })
            } catch (e) {
              console.warn(`Vertragsdokument "${d.name}" konnte nicht angelegt werden:`, e)
            }
          }
          // Dokumentliste neu laden damit die Docs sofort erscheinen
          try {
            const docs = await store.fetchDocumentsByProject(project.value.id)
            projectDocuments.value = docs || []
          } catch (e) { console.warn('Docs reload failed:', e) }
        }

        // Zurück zur Übersicht (wie bei Angebot nach "Angebot erstellen")
        contractStore.contractFormOpen = false

      } catch (e) { console.error(e) } finally { contractStore.contractSaving = false }
    }

    function confirmDepositNo() {
      invoiceStore.depositNoAgreement = true
      store.updateProject(project.value.id, { depositNoAgreement: true })
    }

    function resetDepositNoAgreement() {
      invoiceStore.depositNoAgreement = false
      store.updateProject(project.value.id, { depositNoAgreement: false })
    }

    async function onCorrectionCreated(doc) {
      onDocCreated(doc)
      await refreshDocs()
    }

    async function changeRelatedDocStatus(doc, newStatus) {
      if (!newStatus || newStatus === doc.status) return
      if (newStatus === 'Bezahlt') {
        // Korrekturrechnung bezahlt → öffne Payment-Popup
        openPaymentPopup(doc.id, doc.documentNumber || 'Korrekturrechnung')
        return
      }
      try {
        await store.setDocumentStatus(doc.id, newStatus)
        await refreshDocs()
      } catch (e) { console.error(e) }
    }

    async function cancelInvoice(invoiceId, reason = '') {
      try {
        await store.cancelInvoice(invoiceId, reason)
        await refreshDocs()
      } catch (e) { console.error('Storno fehlgeschlagen:', e) }
    }

    async function createCorrection(invoiceId, data = {}) {
      try {
        await store.correctInvoice(invoiceId, data)
        await refreshDocs()
      } catch (e) { console.error('Korrektur fehlgeschlagen:', e) }
    }

    async function uploadSignedContract(e) {
      const file = e.target.files?.[0]; if (!file) return
      contractStore.signedError = ''; contractStore.signedUploading = true
      try {
        const fd = new FormData(); fd.append('contract', file)
        const res = await fetch(`${API_BASE}/api/projects/${project.value.id}/contracts`, { method: 'POST', body: fd })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || 'Upload fehlgeschlagen')
        contractStore.signedContracts.push(j.data)
        // Automatisch Status auf "Unterschrieben" setzen
        if (contractStore.contractStatus !== 'Unterschrieben') {
          contractStore.contractStatus = 'Unterschrieben'
          await store.updateProject(project.value.id, { contractStatus: 'Unterschrieben' })
        }

      } catch (err) { contractStore.signedError = err.message }
      finally { contractStore.signedUploading = false; e.target.value = '' }
    }

    async function deleteSignedContract(cid) {
      if (!confirm('Vertrag wirklich löschen?')) return
      try {
        await fetch(`${API_BASE}/api/projects/${project.value.id}/contracts/${cid}`, { method: 'DELETE' })
        contractStore.signedContracts = contractStore.signedContracts.filter(c => c.id !== cid)
      } catch (e) { contractStore.signedError = e.message }
    }

    const categories    = ['Hochzeit','Portrait','Event','Produktfotografie','Familienshooting','Businessfotografie','Sonstiges']
    const statusOptions = ['Anfrage','Aktiv','Entwurf','Abgeliefert','Abgeschlossen','Storniert']

    function startInlineEdit() {
      editing.value = true
      setTimeout(() => {
        const el = document.querySelector('.npf')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }

    function cancelInlineEdit() {
      editing.value = false
      editError.value = ''
    }

    async function saveInlineEdit(payload) {
      // payload can be { project, contractData } from NewProjectForm, or bare object from old path
      editSaving.value = true
      try {
        const pData = payload?.project || payload
        await store.updateProject(project.value.id, pData)
        if (payload?.contractData) {
          await store.updateProject(project.value.id, {
            contractData: payload.contractData,
          })
          Object.assign(contractStore.contractForm, payload.contractData)
        }
        editing.value = false
      } catch (e) {
        console.error('Speichern fehlgeschlagen:', e)
      } finally { editSaving.value = false }
    }

    function openEditModal() {
      editForm.value = {
        ...project.value,
        booking:         (project.value.booking      || '').slice(0, 10),
        deliveryDate:    (project.value.deliveryDate  || '').slice(0, 10),
        bookingDuration: project.value.bookingDuration || '',
        budget:          { ...(project.value.budget || { estimatedAmount: 0, currency: 'EUR' }) },
      }
      editError.value = ''
      editModal.value = true
    }

    async function saveEdit() {
      editError.value = ''
      if (!editForm.value.projectName?.trim()) { editError.value = 'Auftragsname ist erforderlich.'; return }
      editSaving.value = true
      try {
        await store.updateProject(project.value.id, editForm.value)
        editModal.value = false
      } catch (e) {
        editError.value = 'Fehler: ' + (e.response?.data?.error || e.message)
      } finally { editSaving.value = false }
    }

    const customer = computed(() =>
      store.customers.find(c => c.id === project.value?.customerId) || null
    )

    function onDocCreated(doc) {
      projectDocuments.value.unshift(doc)
      // Refresh full list to pick up status changes on quote
      store.fetchDocuments()
      // Auto-advance project status based on new document
      autoUpdateProjectStatus()
    }

    /**
     * Advances project.status along the defined workflow — never downgrades, never touches 'Storniert'.
     *
     * Workflow:                Status nach Trigger:
     *   Anzahlungsrechnung bezahlt  → Aktiv
     *   Schlussrechnung erstellt    → Abgeliefert
     *   Schlussrechnung bezahlt     → Abgeschlossen
     */
    async function autoUpdateProjectStatus() {
      const p = project.value
      if (!p || p.status === 'Storniert') return
      const order    = ['Anfrage', 'Aktiv', 'Abgeliefert', 'Abgeschlossen']
      const currIdx  = order.indexOf(p.status)

      const docs       = projectDocuments.value
      const invoices   = docs.filter(d => d.type === 'invoice' && !d.docSubtype && !d.correctionOf)
      const depInv     = invoices.filter(d => d.isDeposit)
      const finalInv   = invoices.filter(d => !d.isDeposit)

      const depositPaid = depInv.some(d => d.status === 'Bezahlt')
      const hasFinal    = finalInv.length > 0
      const finalPaid   = finalInv.some(d => d.status === 'Bezahlt')

      let target = null
      if (finalPaid)    target = 'Abgeschlossen'
      else if (hasFinal)     target = 'Abgeliefert'
      else if (depositPaid)  target = 'Aktiv'

      if (!target) return
      const targetIdx = order.indexOf(target)
      if (targetIdx <= currIdx) return   // never downgrade

      try {
        await store.updateProject(p.id, { status: target })
      } catch(e) { console.error('Status-Update fehlgeschlagen:', e) }
    }

    const detailDocObj = computed(() =>
      detailDocId.value ? store.documents.find(d => d.id === detailDocId.value) || null : null
    )
    async function openDocDetail(doc) {
      // Ensure store.documents is populated BEFORE setting the ID
      // so the computed detailDocObj resolves immediately
      await store.fetchDocuments()
      detailDocId.value = typeof doc === 'string' ? doc : doc.id
    }

    async function refreshDocs() {
      await store.fetchDocuments()
      try {
        const docs = await store.fetchDocumentsByProject(route.params.id)
        if (docs) {
          projectDocuments.value = docs
          // Stores aktuell halten
          pdStore.projectDocuments = docs
          invoiceStore.loadFromDocs(docs)
          quoteStore.loadFromDocs(docs)
        }
      } catch (e) { console.error(e) }
      // Auto-advance status after any document change (e.g. invoice marked as paid)
      autoUpdateProjectStatus()
    }

    // ── Anfrage-Panel: unified form ───────────────────────────────────────────
    const anfrageFormSaving = ref(false)

    const anfrageFormData = computed(() => {
      if (!project.value) return null
      // If locked: show the frozen snapshot so Anfrage data never changes
      const snap = project.value.anfrageSnapshot
      if (snap) {
        return {
          ...project.value,   // keep id, customerId etc.
          ...snap,            // overwrite with snapshot fields
          contractData: snap.contractData || {},
        }
      }
      return {
        ...project.value,
        contractData: { ...contractStore.contractForm },
      }
    })


    // ══════════════════════════════════════════
    // WORKFLOW PIPELINE
    // ══════════════════════════════════════════
    const pipelineOpen = ref(route.query.new === '1' ? 'anfrage' : null)  // auto-set in onMounted

    // heroLive zurücksetzen wenn Anfrage-Formular geschlossen wird
    watch(pipelineOpen, (v) => {
      if (!v || v !== 'anfrage') heroLive.value = { projectName: '', booking: '', bookingTime: '', location: '' }
    })

    // ── Vorgespräch state ────────────────────────────────────────────────
    const consultation = ref({
      date:           '',
      notes:          '',
      clientAccepted: null,   // null=noch offen, true=angenommen, false=abgelehnt
    })
    const consultSaving  = ref(false)
    const requireConsult = computed(() => settingsData.value?.bookingTerms?.requireConsultation === true)

    async function saveConsultation() {
      consultSaving.value = true
      try {
        await store.updateProject(project.value.id, { consultation: consultation.value })
        // Save Vorgespräch notes to projectNotes with timestamp
        const noteText = consultation.value.notes?.trim()
        if (noteText) {
          const existing = projectNotes.value.find(n => n.source === 'vorgespräch')
          const note = {
            id:        existing?.id || `pn_vg_${Date.now()}`,
            text:      noteText,
            source:    'vorgespräch',
            label:     `💬 Vorgespräch${consultation.value.date ? ' · ' + new Date(consultation.value.date).toLocaleDateString('de-DE') : ''}`,
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          const updatedNotes = [
            ...projectNotes.value.filter(n => n.source !== 'vorgespräch'),
            note,
          ]
          projectNotes.value = updatedNotes
          await store.updateProject(project.value.id, { projectNotes: updatedNotes })
        }
        await store.fetchProjects()
      } catch(e) { console.error(e) }
      finally { consultSaving.value = false }
    }

    function openDepositInvoice() {
      const depAmount    = contractStore.contractForm.depositAmount
      const projectLabel = project.value?.projectName || project.value?.contractData?.occasion || ''
      const taxR         = isSmallBusiness.value ? 0 : 19

      const prefillLine = {
        description: 'Anzahlung',
        detail:      projectLabel ? ('Gemäß Vertrag – ' + projectLabel) : 'Gemäß Vertrag',
        quantity:    1,
        unit:        'Pauschal',
        priceNet:    (depAmount && depAmount > 0) ? depAmount : 0,
        taxRate:     taxR,
        discount:    0,
      }
      invoiceStore.invoicePrefillItems = [prefillLine]
      invoiceStore.depositFormOpen = true
    }

    // Billing state for step 5
    // ── Abrechnung: Positionsliste (wie Angebot) ─────────────────────────────
    let abrKeyCounter = 0
    function mkAbrLine(d = {}) {
      const taxR = isSmallBusiness.value ? 0 : (d.taxRate ?? 19)
      return {
        _key:        ++abrKeyCounter,
        description: d.description || '',
        detail:      d.detail      || '',
        quantity:    d.quantity    ?? 1,
        unit:        d.unit        || 'Pauschal',
        priceNet:    d.priceNet    ?? 0,
        taxRate:     taxR,
        discount:    d.discount    ?? 0,
      }
    }

    const abrechnungItems = ref([])
    const abrQuickAddId   = ref('')

    // Anfahrt-Schnelleingabe
    const abrechnungKm = ref({ total: 0, free: 0, rate: 0.30 })

    // isSmallBusiness: true wenn §19 UStG in Einstellungen aktiviert
    const isSmallBusiness = computed(() => !!settingsData.value?.company?.smallBusiness)

    // Enabled payment methods from settings (fallback to defaults if not configured)
    const enabledPaymentMethods = computed(() => {
      const methods = settingsData.value?.bookingTerms?.enabledPaymentMethods
      const ALL = [
        { id: 'Überweisung',      icon: '🏦' },
        { id: 'Bar',              icon: '💵' },
        { id: 'EC-Karte',         icon: '💳' },
        { id: 'Kreditkarte',      icon: '💳' },
        { id: 'PayPal',           icon: '🅿️' },
        { id: 'SEPA-Lastschrift', icon: '📄' },
        { id: 'Vorkasse',         icon: '💰' },
      ]
      if (!methods?.length) return ALL
      return ALL.filter(m => methods.includes(m.id))
    })

    // Hat die Liste bereits eine Anzahlungs-Abzugszeile?
    const abrechnungHasDeposit = computed(() =>
      abrechnungItems.value.some(i => i._isDepositDeduction)
    )

    function abrLineNet(item) {
      return (Number(item.quantity) || 0) * (Number(item.priceNet) || 0) * (1 - (Number(item.discount) || 0) / 100)
    }

    const abrSubtotal = computed(() =>
      abrechnungItems.value.reduce((s, i) => s + abrLineNet(i), 0)
    )

    const abrTaxGroups = computed(() => {
      if (isSmallBusiness.value) return []
      const map = {}
      for (const i of abrechnungItems.value) {
        const net = abrLineNet(i)
        const rate = Number(i.taxRate) || 0
        if (!map[rate]) map[rate] = { rate, base: 0, amount: 0 }
        map[rate].base += net
        map[rate].amount += net * rate / 100
      }
      return Object.values(map).filter(g => g.rate > 0)
    })

    const abrechnungTotal = computed(() =>
      abrSubtotal.value + abrTaxGroups.value.reduce((s, g) => s + g.amount, 0)
    )

    // Auto-Prefill aus Artikelkatalog
    function abrAddFromCatalog() {
      if (!abrQuickAddId.value) return
      const a = store.articles.find(a => a.id === abrQuickAddId.value)
      if (a) abrechnungItems.value.push(mkAbrLine({
        description: a.name, detail: a.description || '',
        quantity: 1, unit: a.unit || 'Pauschal',
        priceNet: a.priceNet, taxRate: a.taxRate,
      }))
      abrQuickAddId.value = ''
    }

    function abrAddEmptyLine() {
      abrechnungItems.value.push(mkAbrLine())
    }

    // Positionen aus Angebot übernehmen
    function prefillFromQuoteDoc() {
      if (!quoteDoc.value?.lineItems?.length) return
      abrechnungItems.value = quoteDoc.value.lineItems.map(i => mkAbrLine({
        ...i,
        taxRate: isSmallBusiness.value ? 0 : (i.taxRate ?? 19),
      }))
    }

    // Baut eine lesbare NR-Beschreibung aus den gespeicherten Vertragsdaten
    function buildNRDescription(cd) {
      if (!cd?.usageRights?.enabled) return 'Werbliche Nutzung gemäß Auftragsvereinbarung'

      const ur = cd.usageRights
      const mode = settingsData.value?.bookingTerms?.usageRightsMode || 'simple'

      // ── Simple Mode ──────────────────────────────────────────────────────
      if (mode === 'simple' && cd.simpleNr) {
        const sn = cd.simpleNr
        const CATEGORY_LABELS = {
          print:  'Print / OOH (Anzeigen, Plakate, Außenwerbung)',
          online: 'Online / Social Media (Website, Social-Kanäle, Newsletter)',
          tv:     'TV / Video (Spots, Streaming, Kino)',
          pr:     'PR / Redaktion (Presse, Jahresberichte)',
        }
        const cats = (sn.categories || []).map(k => CATEGORY_LABELS[k] || k)
        const parts = []
        if (cats.length) parts.push(`Nutzungsarten: ${cats.join(', ')}`)
        if (sn.duration)  parts.push(`Laufzeit: ${sn.duration}`)
        if (sn.scope) {
          const scopeMap = { regional: 'Regional', national: 'National (D/AT/CH)', international: 'International / Global' }
          parts.push(`Geltungsbereich: ${scopeMap[sn.scope] || sn.scope}`)
        }
        return parts.length ? parts.join(' · ') : 'Werbliche Nutzungsrechte gemäß Vereinbarung'
      }

      // ── designaustria Mode ───────────────────────────────────────────────
      const THEMA_MAP     = { 1.0: 'Branding/CD', 0.75: 'Produkt-Werbung', 0.5: 'Unternehmenskommunikation' }
      const BEDEUTUNG_MAP = { 1.0: 'Hauptelement', 0.75: 'Wichtiges Nebenelement', 0.5: 'Untergeordnetes Element' }
      const GEBIET_MAP    = { 0.5: 'Lokal', 0.75: 'Regional', 1.0: 'National', 1.5: 'Europaweit', 2.0: 'Weltweit' }
      const ZEITRAUM_MAP  = { 0.75: 'Einmalige Nutzung', 1.0: '1 Jahr', 1.5: 'Dauernutzung / Buyout' }
      const NUTZUNG_MAP   = { 0: 'Kein Nutzungsrecht', 1.0: 'Zweckgebundenes Werknutzungsrecht', 1.5: 'Werknutzungsrecht ohne Zweckbindung', 3.0: 'Daten-/Bearbeitungsrecht' }
      const AUFTRAG_MAP   = { 0.75: 'Folgeauftrag', 1.0: 'Rahmenvereinbarung', 1.5: 'Einzelauftrag' }

      const factor = ((ur.thema||1) * (ur.bedeutung||1) * (ur.gebiet||1) * (ur.zeitraum||1) * (ur.nutzungsart||1) * (ur.auftragsart||1)).toFixed(3)
      const lines = [
        NUTZUNG_MAP[ur.nutzungsart]   || `Nutzungsart: ${ur.nutzungsart}`,
        GEBIET_MAP[ur.gebiet]         ? `Geltungsgebiet: ${GEBIET_MAP[ur.gebiet]}` : '',
        ZEITRAUM_MAP[ur.zeitraum]     ? `Laufzeit: ${ZEITRAUM_MAP[ur.zeitraum]}` : '',
        THEMA_MAP[ur.thema]           ? `Thema: ${THEMA_MAP[ur.thema]}` : '',
        BEDEUTUNG_MAP[ur.bedeutung]   ? `Bildstatus: ${BEDEUTUNG_MAP[ur.bedeutung]}` : '',
        AUFTRAG_MAP[ur.auftragsart]   ? `Auftragsart: ${AUFTRAG_MAP[ur.auftragsart]}` : '',
        `Kalkulations-Faktor: ${factor} (nach Richtlinien designaustria)`,
      ].filter(Boolean)
      return lines.join(' · ')
    }

    // Positionen aus Vertrag übernehmen
    function prefillFromContract() {
      const f   = contractStore.contractForm
      const cd  = project.value?.contractData || f
      const p2  = project.value
      const occasion = f.occasion || p2?.projectName || ''
      const isB2B    = cd.clientIsCompany || false
      const items    = []

      // ── Stunden-Modell ────────────────────────────────────────────────
      if (f.pricingModel === 'hourly') {

        if (!isB2B) {
          // Privat: getrennte Felder je Leistung
          const rateP = cd.hourlyRatePhotoPrivat || settingsData.value?.bookingTerms?.hourlyRatePhotoPrivat || f.hourlyRate || 0
          const rateV = cd.hourlyRateVideoPrivat || settingsData.value?.bookingTerms?.hourlyRateVideoPrivat || f.hourlyRate || 0
          const imgP  = cd.imagePricePrivat      || settingsData.value?.bookingTerms?.imagePricePrivat || 0

          if (p2?.fotografie) {
            const h = cd.estimatedHoursPhoto || f.estimatedHours || 0
            items.push({ articleId: 'ART-00001', description: occasion || 'Fotografie',
              detail: h ? `${h} h \u00e0 ${rateP} \u20ac/h` : '',
              quantity: h || 1, unit: 'Stunde', priceNet: rateP, taxRate: 0 })
            const imgC = cd.imageCountPrivat || 0
            if (imgC > 0 && imgP > 0) items.push({ articleId: 'ART-00008',
              description: `Bildpaket Digital (${imgC} Bilder)`,
              detail: 'Bearbeitete Digitalfotos in Druckqualit\u00e4t',
              quantity: imgC, unit: 'Bild', priceNet: imgP, taxRate: 0 })
          }
          if (p2?.videografie) {
            const h = cd.estimatedHoursVideo || (p2?.fotografie ? 0 : f.estimatedHours) || 0
            items.push({ articleId: 'ART-00003', description: 'Videografie',
              detail: h ? `${h} h \u00e0 ${rateV} \u20ac/h` : '',
              quantity: h || 1, unit: 'Stunde', priceNet: rateV, taxRate: 0 })
          }

        } else {
          // B2B: Phasen aufgeschl\u00fcsselt
          const ratePhotoMain  = cd.hourlyRatePhotoB2B   || settingsData.value?.bookingTerms?.hourlyRatePhotoB2B  || 0
          const ratePhotoSetup = cd.hourlyRatePhotoSetup  || settingsData.value?.bookingTerms?.hourlyRatePhotoSetup || 0
          const rateVideoMain  = cd.hourlyRateVideoB2B   || settingsData.value?.bookingTerms?.hourlyRateVideoB2B  || 0
          const rateVideoSetup = cd.hourlyRateVideoSetup  || settingsData.value?.bookingTerms?.hourlyRateVideoSetup || 0
          const pPhoto = cd.photoPhases || {}
          const pVideo = cd.videoPhases || {}

          if (p2?.fotografie) {
            const setupH = (pPhoto.vorbereitung||0) + (pPhoto.abstimmung||0)
            const mainH  = (pPhoto.shooting||0)    + (pPhoto.bearbeitung||0)
            if (setupH > 0) items.push({ articleId: 'ART-00010', description: 'Fotografie \u2013 Vorbereitung & Meetings',
              detail: `${setupH} h \u00e0 ${ratePhotoSetup} \u20ac/h (R\u00fcstzeit)`,
              quantity: setupH, unit: 'Stunde', priceNet: ratePhotoSetup, taxRate: 0 })
            if (mainH > 0) items.push({ articleId: 'ART-00002', description: 'Fotografie \u2013 Shooting & Bildbearbeitung',
              detail: `${mainH} h \u00e0 ${ratePhotoMain} \u20ac/h`,
              quantity: mainH, unit: 'Stunde', priceNet: ratePhotoMain, taxRate: 0 })
          }
          if (p2?.videografie) {
            const setupH = (pVideo.vorbereitung||0) + (pVideo.abstimmung||0)
            const mainH  = (pVideo.dreh||0)         + (pVideo.schnitt||0)
            if (setupH > 0) items.push({ articleId: 'ART-00011', description: 'Videografie \u2013 Vorbereitung & Meetings',
              detail: `${setupH} h \u00e0 ${rateVideoSetup} \u20ac/h (R\u00fcstzeit)`,
              quantity: setupH, unit: 'Stunde', priceNet: rateVideoSetup, taxRate: 0 })
            if (mainH > 0) items.push({ articleId: 'ART-00004', description: 'Videografie \u2013 Dreh & Schnitt',
              detail: `${mainH} h \u00e0 ${rateVideoMain} \u20ac/h`,
              quantity: mainH, unit: 'Stunde', priceNet: rateVideoMain, taxRate: 0 })
          }
        }
      }

      // ── Pauschal-Modell ───────────────────────────────────────────────
      if (f.pricingModel === 'flat' && f.flatRate) {
        items.push({ articleId: 'ART-00017', description: occasion || 'Pauschale Arbeitsleistung',
          detail: f.flatRateIncludes || 'Pauschalpreis laut Vertrag',
          quantity: 1, unit: 'Pauschal', priceNet: f.flatRate, taxRate: 0 })
      }

      // ── Bildpaket + Video B2B (nur wenn NICHT im Preis enthalten) ───────
      if (isB2B && !cd.mediaIncluded) {
        const imgCount = cd.imageCountB2B || f.imageCountB2B || 0
        const imgPrice = cd.imagePriceB2B || f.imagePriceB2B || 0
        if (imgCount > 0 && imgPrice > 0) items.push({
          articleId: 'ART-00007', description: `Bildpaket Digital (${imgCount} Bilder)`,
          detail: 'Bearbeitete Digitalfotos in Druckqualit\u00e4t',
          quantity: imgCount, unit: 'Bild', priceNet: imgPrice, taxRate: 0 })
        const vidCount = cd.videoCount10min || f.videoCount10min || 0
        const vidPrice = cd.videoPer10min   || f.videoPer10min   || 0
        if (vidCount > 0 && vidPrice > 0) items.push({
          articleId: 'ART-00009', description: `Videoproduktion (${vidCount} \u00d7 10 min)`,
          detail: 'Fertig produziert inkl. Schnitt, Grading, Ton',
          quantity: vidCount, unit: 'St\u00fcck', priceNet: vidPrice, taxRate: 0 })
      }

      // ── Nutzungsrechte ────────────────────────────────────────────────
      const nrSurcharge = cd.usageRightsSurcharge || f.usageRightsSurcharge || 0
      if (nrSurcharge > 0) {
        items.push({ articleId: 'ART-00012', description: 'Nutzungsrechte / Lizenz',
          detail: buildNRDescription(cd),
          quantity: 1, unit: 'Pauschal', priceNet: nrSurcharge, taxRate: 0 })
      }

      if (items.length) abrechnungItems.value = items.map(i => mkAbrLine(i))
    }

    function addDepositDeductionLine() {
      const paidDeposits = allDepositInvoices.value.filter(d => d.status === 'Bezahlt')
      if (!paidDeposits.length) return
      const totalDeposit = paidDeposits.reduce((s, d) => s + (d.total || 0), 0)
      abrechnungItems.value.push(mkAbrLine({
        description: 'Abzüglich geleisteter Anzahlung',
        detail:      paidDeposits.map(d => d.documentNumber).join(', '),
        quantity:    1,
        unit:        'Pauschal',
        priceNet:    -totalDeposit,
        taxRate:     isSmallBusiness.value ? 0 : 19,
        _isDepositDeduction: true,
      }))
    }

    // Anfahrt als km-Position hinzufügen
    function addKmLine() {
      const chargeable = Math.max(0, (abrechnungKm.value.total || 0) - (abrechnungKm.value.free || 0))
      if (!chargeable || !abrechnungKm.value.rate) return
      abrechnungItems.value.push(mkAbrLine({
        description: 'Anfahrt / Fahrtkosten',
        detail:      `${abrechnungKm.value.total} km gesamt − ${abrechnungKm.value.free} km frei = ${chargeable} km × ${abrechnungKm.value.rate} €/km`,
        quantity:    chargeable,
        unit:        'km',
        priceNet:    abrechnungKm.value.rate,
        taxRate:     isSmallBusiness.value ? 0 : 19,
      }))
      abrechnungKm.value = { total: 0, free: abrechnungKm.value.free, rate: abrechnungKm.value.rate }
    }

    // Legacy billing ref (kept for billingTotal compat if referenced elsewhere)
    const billing = ref({
      hours:         null,
      hourlyRate:    null,
      km:            0,
      kmFree:        0,
      kmRate:        0.30,
      deductDeposit: false,
      extras:        [],
    })

    // Computed helpers
    const shootDone = computed(() => {
      if (!project.value?.booking) return false
      return new Date(project.value.booking) < new Date()
    })

    const quoteDoc = computed(() => {
      // Angebote für diesen Auftrag, ohne Unter-Typen
      const quotes = projectDocuments.value.filter(d => d.type === 'quote' && !d.docSubtype)
      if (!quotes.length) return null
      // Bevorzuge angenommenes Angebot
      const accepted = quotes.find(d => d.status === 'Angenommen')
      if (accepted) return accepted
      // Sonst: aktives Angebot (nicht durch Revision ersetzt)
      return quotes.find(d => !d.supersededBy) || quotes[quotes.length - 1]
    })

    // ALL quote versions for this project (sorted newest first)
    const allProjectQuotes = computed(() =>
      [...projectDocuments.value]
        .filter(d => d.type === 'quote' && !d.docSubtype)
        .sort((a, b) => {
          // Primary: version descending (newest version first)
          const vDiff = (b.version || 1) - (a.version || 1)
          if (vDiff !== 0) return vDiff
          // Tiebreaker: createdAt descending
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        })
    )

    // Anfrage sperren sobald erstes Angebot versendet/abgeschlossen wurde
    const anfrageLocked = computed(() =>
      quoteStore.allProjectQuotes.some(q =>
        ['Versendet','Angenommen','Abgelehnt','Ersetzt'].includes(q.status)
      )
    )

    // reviseQuote modal state

    function openQuoteRevise(doc) {
      quoteStore.quoteReviseDoc  = doc
      quoteStore.quoteReviseMode = true
      quoteStore.quoteFormOpen   = true
      pipelineOpen.value    = 'angebot'
    }

    // 📂 PDF erzeugen → im Projektordner speichern → im System-Viewer öffnen
    async function openPdfInViewer(apiPath) {
      if (window.pixframe?.generateAndOpenPDF) {
        try {
          await window.pixframe.generateAndOpenPDF(apiPath)
        } catch (e) {
          console.error('[PDF] Öffnen fehlgeschlagen:', e)
          // Fallback: im Browser öffnen
          const printPath = apiPath.replace(/^\/api\/pdf\//, '/print/')
          window.open(printPath, '_blank')
        }
      } else {
        // Kein Electron — Fallback: im Browser öffnen
        const printPath = apiPath.replace(/^\/api\/pdf\//, '/print/')
        window.open(printPath, '_blank')
      }
    }

    // ── Angebot öffnen: Status → Versendet, dann PDF im Viewer öffnen ──
    async function printQuote(qv) {
      if (!['Versendet','Angenommen','Abgelehnt','Ersetzt'].includes(qv.status)) {
        try {
          await store.setDocumentStatus(qv.id, 'Versendet')
          await saveAnfrageSnapshot()
          await refreshDocs()
        } catch (e) { console.error('printQuote Status-Fehler:', e) }
      }
      openPdfInViewer('/api/pdf/document/' + qv.id)
    }

    // ── Angebot öffnen (Alias) ──
    async function downloadQuote(qv) {
      if (!['Versendet','Angenommen','Abgelehnt','Ersetzt'].includes(qv.status)) {
        try {
          await store.setDocumentStatus(qv.id, 'Versendet')
          await saveAnfrageSnapshot()
          await refreshDocs()
        } catch (e) { console.error('downloadQuote Status-Fehler:', e) }
      }
      openPdfInViewer('/api/pdf/document/' + qv.id)
    }

    function openQuoteFromProject() {
      quoteStore.quoteReviseDoc     = null
      quoteStore.quoteReviseMode    = false
      quoteStore.quotePrefillItems  = quotePrefillItems.value  // ← Positionen aus Anfrage
      quoteStore.quoteFormOpen      = true
      pipelineOpen.value = 'angebot'
    }

    async function onInlineQuoteCreated(doc) {
      await refreshDocs()
      quoteStore.quoteReviseDoc    = null
      quoteStore.quoteReviseMode   = false
      quoteStore.quotePrefillItems = null
      quoteStore.quoteFormOpen     = false
      await nextTick()
      const qoMain = document.querySelector('.qo-main')
      if (qoMain) qoMain.scrollTop = 0
    }

    // quotePrefillItems: Leistungsumfang aus der Anfrage als Angebotszeilen vorbelegen
    const quotePrefillItems = computed(() => {
      const p = project.value
      if (!p) return null
      const cd = p.contractData || {}
      const isSmall = settingsData.value?.company?.smallBusiness || false
      const taxRate = isSmall ? 0 : 19
      const isB2B   = cd.clientIsCompany || false
      const occasion = cd.occasion || p.projectName || ''
      const items = []

      // ── Stunden-Modell ────────────────────────────────────────────────
      if (cd.pricingModel === 'hourly') {

        if (isB2B) {
          // B2B: Phasen aufschlüsseln wenn Stunden vorhanden
          const pPhoto = cd.photoPhases || {}
          const pVideo = cd.videoPhases || {}
          const ratePhotoMain  = cd.hourlyRatePhotoB2B   || settingsData.value?.bookingTerms?.hourlyRatePhotoB2B  || 0
          const ratePhotoSetup = cd.hourlyRatePhotoSetup || settingsData.value?.bookingTerms?.hourlyRatePhotoSetup || 0
          const rateVideoMain  = cd.hourlyRateVideoB2B   || settingsData.value?.bookingTerms?.hourlyRateVideoB2B  || 0
          const rateVideoSetup = cd.hourlyRateVideoSetup || settingsData.value?.bookingTerms?.hourlyRateVideoSetup || 0

          if (p.fotografie) {
            const setupH = (pPhoto.vorbereitung||0) + (pPhoto.abstimmung||0)
            const mainH  = (pPhoto.shooting||0)    + (pPhoto.bearbeitung||0)
            if (setupH > 0) items.push({
              articleId: 'ART-00010',
              description: 'Fotografie – Vorbereitung & Meetings',
              detail: `${setupH} h à ${ratePhotoSetup} €/h (Rüstzeit)`,
              quantity: setupH, unit: 'Stunde', priceNet: ratePhotoSetup, taxRate,
            })
            if (mainH > 0) items.push({
              articleId: 'ART-00002',
              description: 'Fotografie – Shooting & Bildbearbeitung',
              detail: `${mainH} h à ${ratePhotoMain} €/h`,
              quantity: mainH, unit: 'Stunde', priceNet: ratePhotoMain, taxRate,
            })
          }
          if (p.videografie) {
            const setupH = (pVideo.vorbereitung||0) + (pVideo.abstimmung||0)
            const mainH  = (pVideo.dreh||0)         + (pVideo.schnitt||0)
            if (setupH > 0) items.push({
              articleId: 'ART-00011',
              description: 'Videografie – Vorbereitung & Meetings',
              detail: `${setupH} h à ${rateVideoSetup} €/h (Rüstzeit)`,
              quantity: setupH, unit: 'Stunde', priceNet: rateVideoSetup, taxRate,
            })
            if (mainH > 0) items.push({
              articleId: 'ART-00004',
              description: 'Videografie – Dreh & Schnitt',
              detail: `${mainH} h à ${rateVideoMain} €/h`,
              quantity: mainH, unit: 'Stunde', priceNet: rateVideoMain, taxRate,
            })
          }
        } else {
          // Privat: getrennte Felder je Leistung
          const ratePhotoPriv = cd.hourlyRatePhotoPrivat || settingsData.value?.bookingTerms?.hourlyRatePhotoPrivat || cd.hourlyRate || 0
          const rateVideoPriv = cd.hourlyRateVideoPrivat || settingsData.value?.bookingTerms?.hourlyRateVideoPrivat || cd.hourlyRate || 0
          const imgPricePriv  = cd.imagePricePrivat      || settingsData.value?.bookingTerms?.imagePricePrivat      || 0

          if (p.fotografie) {
            const h = cd.estimatedHoursPhoto || cd.estimatedHours || 0
            if (h > 0 || ratePhotoPriv > 0) items.push({
              articleId: 'ART-00001',
              description: 'Fotografie',
              detail: h ? `${h} h à ${ratePhotoPriv} €/h` : '',
              quantity: h || 1, unit: 'Stunde', priceNet: ratePhotoPriv, taxRate,
            })
            // Bildpaket Privat
            const imgC = cd.imageCountPrivat || 0
            if (imgC > 0 && imgPricePriv > 0) items.push({
              articleId: 'ART-00008',
              description: `Bildpaket Digital (${imgC} Bilder)`,
              detail: 'Bearbeitete Digitalfotos in Druckqualität',
              quantity: imgC, unit: 'Bild', priceNet: imgPricePriv, taxRate,
            })
          }
          if (p.videografie) {
            const h = cd.estimatedHoursVideo || (p.fotografie ? 0 : cd.estimatedHours) || 0
            if (h > 0 || rateVideoPriv > 0) items.push({
              articleId: 'ART-00003',
              description: 'Videografie',
              detail: h ? `${h} h à ${rateVideoPriv} €/h` : '',
              quantity: h || 1, unit: 'Stunde', priceNet: rateVideoPriv, taxRate,
            })
          }
        }
      }

      // ── Pauschal-Modell ───────────────────────────────────────────────
      if (cd.pricingModel === 'flat') {
        if (cd.flatRate) items.push({
          articleId: 'ART-00017',
          description: occasion || 'Pauschale Arbeitsleistung',
          detail: cd.flatRateIncludes || 'Pauschalpreis laut Vereinbarung',
          quantity: 1, unit: 'Pauschal', priceNet: cd.flatRate, taxRate,
        })
      }

      // ── Bildpaket (B2B) — nur wenn NICHT im Preis enthalten ────────────
      const imgCount = cd.imageCountB2B || 0
      const imgPrice = cd.imagePriceB2B || settingsData.value?.bookingTerms?.imagePriceB2B || 0
      if (isB2B && !cd.mediaIncluded && imgCount > 0 && imgPrice > 0) {
        items.push({
          articleId: 'ART-00007',
          description: `Bildpaket Digital (${imgCount} Bilder)`,
          detail: 'Bearbeitete Digitalfotos in Druckqualität',
          quantity: imgCount, unit: 'Bild', priceNet: imgPrice, taxRate,
        })
      }

      // ── Videoproduktion (B2B) — nur wenn NICHT im Preis enthalten ────────
      const vidCount = cd.videoCount10min || 0
      const vidPrice = cd.videoPer10min   || settingsData.value?.bookingTerms?.videoPer10min || 0
      if (isB2B && !cd.mediaIncluded && vidCount > 0 && vidPrice > 0) {
        items.push({
          articleId: 'ART-00009',
          description: `Videoproduktion (${vidCount} × 10 min)`,
          detail: 'Fertig produziert inkl. Schnitt, Grading, Ton',
          quantity: vidCount, unit: 'Stück', priceNet: vidPrice, taxRate,
        })
      }

      // ── Nutzungsrechte (B2B) ─────────────────────────────────────────
      const nrSurcharge = cd.usageRightsSurcharge || 0
      if (isB2B && nrSurcharge > 0) {
        items.push({
          articleId: 'ART-00012',
          description: 'Nutzungsrechte / Lizenz',
          detail: buildNRDescription(cd),
          quantity: 1, unit: 'Pauschal', priceNet: nrSurcharge, taxRate,
        })
      }

      // ── Privat-Extras ─────────────────────────────────────────────────
      if (!isB2B) {
        if (p.glueckwunschkarten) items.push({
          description: 'Danksagungskarten-Design', detail: '',
          quantity: 1, unit: 'Pauschal', priceNet: 0, taxRate,
        })
        if (p.gettingReadyEr || p.gettingReadySie || p.gettingReadyBeide) {
          const who = [
            p.gettingReadySie   && 'Braut',
            p.gettingReadyEr    && 'Bräutigam',
            p.gettingReadyBeide && 'Beide',
          ].filter(Boolean).join(' & ')
          items.push({
            description: 'Getting Ready', detail: who,
            quantity: 1, unit: 'Pauschal', priceNet: 0, taxRate,
          })
        }
      }

      return items.length ? items : null
    })

    // ── Angebot-Status Bestätigung ──────────────────────────────────────────

    async function saveAnfrageSnapshot() {
      if (!project.value || project.value.anfrageSnapshot) return
      const snap = {
        booking:           project.value.booking,
        bookingTime:       project.value.bookingTime,
        location:          project.value.location,
        locations:         project.value.locations || [],
        skipQuote:         project.value.skipQuote ?? true,  // default: kein Angebot
        category:          project.value.category,
        notes:             project.value.notes,
        projectName:       project.value.projectName,
        fotografie:        project.value.fotografie,
        videografie:       project.value.videografie,
        glueckwunschkarten: project.value.glueckwunschkarten,
        gettingReadyEr:    project.value.gettingReadyEr,
        gettingReadySie:   project.value.gettingReadySie,
        gettingReadyBeide: project.value.gettingReadyBeide,
        contractData:      { ...contractStore.contractForm },
        inquiryDate:       project.value.inquiryDate,
        status:            project.value.status,
      }
      await store.updateProject(project.value.id, { anfrageSnapshot: snap })
      project.value.anfrageSnapshot = snap
    }

    function changeQuoteStatus(doc, newStatus) {
      if (!newStatus || newStatus === doc.status) return
      if (!['Angenommen', 'Abgelehnt'].includes(newStatus)) {
        // Entwurf / Versendet: direkt setzen, ggf. Snapshot speichern
        if (newStatus === 'Versendet') saveAnfrageSnapshot()
        store.setDocumentStatus(doc.id, newStatus).then(() => refreshDocs()).catch(console.error)
        return
      }
      // Finale Status: Bestätigungs-Popup
      quoteStore.quoteStatusConfirm = {
        show:         true,
        doc,
        newStatus,
        variant:      newStatus === 'Angenommen' ? 'success' : 'danger',
        title:        newStatus === 'Angenommen'
                        ? `Angebot ${doc.documentNumber} annehmen?`
                        : `Angebot ${doc.documentNumber} ablehnen?`,
        sub:          newStatus === 'Angenommen'
                        ? 'Der Auftrag gilt damit als vom Kunden bestätigt. Du kannst anschließend mit Vertrag und Anzahlung fortfahren.'
                        : 'Das Angebot wird als abgelehnt markiert. Du kannst danach eine neue Version erstellen.',
        confirmLabel: newStatus === 'Angenommen' ? '✅ Ja, annehmen' : '❌ Ja, ablehnen',
      }
    }

    async function confirmQuoteStatusChange() {
      const { doc, newStatus } = quoteStore.quoteStatusConfirm
      quoteStore.quoteStatusConfirm.show = false
      await saveAnfrageSnapshot()
      try {
        await store.setDocumentStatus(doc.id, newStatus)
        await refreshDocs()
      } catch(e) { console.error('Status-Änderung fehlgeschlagen:', e) }
    }

        async function markQuoteAccepted(doc) {
      if (!doc) return
      try {
        await store.setDocumentStatus(doc.id, 'Angenommen')
        await refreshDocs()
      } catch(e) { console.error(e) }
    }

    const invoiceDoc = computed(() =>
      projectDocuments.value.find(d => d.type === 'invoice' && !d.docSubtype) || null
    )

    const invoicePaid = computed(() =>
      invoiceDoc.value?.status === 'Bezahlt'
    )

    // ── Deposit & Final invoice computed ────────────────────────────────
    const allDepositInvoices = computed(() =>
      projectDocuments.value
        .filter(d => d.type === 'invoice' && !d.docSubtype && !d.correctionOf && d.isDeposit)
        .sort((a, b) => new Date(b.createdAt || b.issueDate) - new Date(a.createdAt || a.issueDate))
    )
    const depositInvoice = computed(() => allDepositInvoices.value[0] || null)
    const finalInvoiceDoc = computed(() =>
      projectDocuments.value.find(d => d.type === 'invoice' && !d.docSubtype && !d.correctionOf && !d.isDeposit) || null
    )
    const finalInvoicePaid = computed(() =>
      finalInvoiceDoc.value?.status === 'Bezahlt'
    )

    // billingTotal kept for any legacy template refs — maps to abrechnungTotal
    const billingTotal = computed(() => abrechnungTotal.value)

    // ── Abschluss-Panel: Abgabe + Statistik ──────────────────────────────────
    const handoverDate = ref('')
    const handoverTime = ref('')
    const handoverNote = ref('')

    // Gesamteinnahmen: Summe aller bezahlten Rechnungen
    const doneNetRevenue = computed(() => {
      const paid = projectDocuments.value
        .filter(d => d.type === 'invoice' && !d.docSubtype && !d.correctionOf && d.status === 'Bezahlt')
      return paid.reduce((s, d) => s + (Number(d.total) || 0), 0)
    })

    async function saveHandover(date, time, note) {
      // Accepts params from sub-component or falls back to local refs
      const d = date !== undefined ? date : handoverDate.value
      const t = time !== undefined ? time : handoverTime.value
      const n = note !== undefined ? note : handoverNote.value
      if (!d) return
      // Sync local refs if called from sub-component
      if (date !== undefined) {
        handoverDate.value = d
        handoverTime.value = t
        handoverNote.value = n
      }
      const dt  = d + (t ? 'T' + t : 'T00:00')
      const iso = new Date(dt).toISOString()
      await store.updateProject(project.value.id, {
        handoverAt:   iso,
        handoverNote: n || ''
      })
      await refreshDocs()
    }

    async function clearHandover() {
      await store.updateProject(project.value.id, { handoverAt: null, handoverNote: '' })
      handoverDate.value = ''
      handoverTime.value = ''
      handoverNote.value = ''
      await refreshDocs()
    }

    function handleStepClick(stepId) {
      // Aktiven Tab anklicken tut nichts — Panel bleibt offen
      if (pipelineOpen.value !== stepId) {
        pipelineOpen.value = stepId
      }
    }

    const workflowSteps = computed(() => {
      const p = project.value
      const docs        = projectDocuments.value
      const invoices    = docs.filter(d => d.type === 'invoice' && !d.docSubtype && !d.correctionOf)
      const depInv      = invoices.filter(d => d.isDeposit)
      const finalInv    = invoices.filter(d => !d.isDeposit)

      const hasBooking    = !!p?.booking
      const quoteAccepted = quoteDoc.value?.status === 'Angenommen'
      const hasSigned     = contractStore.contractStatus === 'Unterschrieben'
      // Angebot-Step gilt als "erledigt" wenn angenommen ODER wenn man schon weiter ist (Vertrag unterschrieben)
      const quoteStepDone = p?.skipQuote || quoteAccepted || hasSigned

      const depositPaid   = depInv.some(d => d.status === 'Bezahlt')
      const afterShoot    = shootDone.value
      const hasFinal      = finalInv.length > 0
      const finalPaid     = finalInv.some(d => d.status === 'Bezahlt')

      const consultRequired   = requireConsult.value
      const consultDone       = consultation.value.clientAccepted === true
      const consultDeclined   = consultation.value.clientAccepted === false
      const consultDoneOrSkip = consultDone || !consultRequired

      const steps = []
      steps.push({
        id:      'anfrage',
        icon:    '📥',
        label:   'Anfrage',
        hint:    customerName.value || 'Kundendaten',
        done:    hasBooking && !!p?.category,
        current: !hasBooking || !p?.category,
      })

      // Vorgespräch: nur sichtbar wenn in settings aktiviert ODER manuell für diesen Auftrag gesetzt
      if (consultRequired) {
        steps.push({
          id:      'vorgespräch',
          icon:    consultDeclined ? '❌' : '💬',
          label:   'Vorgespräch',
          hint:    consultDeclined
                    ? 'Abgelehnt'
                    : consultDone
                      ? (consultation.value.date ? new Date(consultation.value.date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}) : 'Angenommen')
                      : consultation.value.date
                        ? 'Termin ' + new Date(consultation.value.date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})
                        : 'ausstehend',
          done:    consultDone,
          current: hasBooking && !!p?.category && !consultDone && !consultDeclined,
          declined: consultDeclined,
        })
      }

      // Angebot nur anzeigen wenn nicht explizit übersprungen
      if (!p?.skipQuote) {
        steps.push({
          id:      'angebot',
          icon:    '📋',
          label:   'Angebot',
          hint:    quoteAccepted
                    ? (quoteDoc.value?.documentNumber || 'Angenommen')
                    : quoteDoc.value
                      ? quoteDoc.value.status
                      : 'optional',
          done:    quoteStepDone,
          current: consultDoneOrSkip && hasBooking && !!p?.category && !quoteStepDone,
        })
      }

      steps.push({
          id:      'vertrag',
          icon:    '📝',
          label:   'Vertrag',
          hint:    hasSigned
                    ? (p?.contractNumber || 'Unterschrieben')
                    : contractStore.contractStatus || 'Entwurf',
          done:    hasSigned,
          current: quoteStepDone && !hasSigned,
        })
      steps.push({
          id:      'anzahlung',
          icon:    '💶',
          label:   'Anzahlung',
          hint:    depositPaid
                    ? 'Bezahlt → Aktiv'
                    : depInv.length > 0
                      ? (depInv[0].documentNumber || 'Offen')
                      : 'ausstehend',
          done:    depositPaid,
          current: hasSigned && !depositPaid,
        })
      steps.push({
          id:      'auftrag',
          icon:    '📸',
          label:   'Bearbeitung',
          comingSoon: true,
          hint:    afterShoot ? 'Erledigt' : hasBooking ? formatDate(p.booking) : '—',
          done:    afterShoot,
          current: depositPaid && !afterShoot,
        })
      steps.push({
          id:      'abrechnung',
          icon:    '🧾',
          label:   'Abrechnung',
          hint:    hasFinal
                    ? (finalInv[0].documentNumber || 'Erstellt')
                    : 'Schlussrechnung',
          done:    hasFinal,
          current: afterShoot && !hasFinal,
        })
      steps.push({
          id:      'done',
          icon:    '✅',
          label:   'Abschluss',
          hint:    finalPaid ? 'Bezahlt' : hasFinal ? 'Zahlung offen' : '—',
          done:    finalPaid,
          current: hasFinal && !finalPaid,
        })
      return steps
    })

        function openBillingInvoice() {
      // ── 1. Leistungspositionen: bevorzuge Angebot, Fallback Vertrag/Anfrage ──
      const baseItems = []

      if (quoteDoc.value?.lineItems?.length) {
        // Aus angenommenem Angebot übernehmen
        quoteDoc.value.lineItems.forEach(i => baseItems.push({
          ...i,
          taxRate: isSmallBusiness.value ? 0 : (i.taxRate ?? 19),
        }))
      } else {
        // Fallback: aus Vertrag/Anfrage aufbauen
        const f  = contractStore.contractForm
        const cd = project.value?.contractData || f
        const p2 = project.value
        const occasion = f.occasion || p2?.projectName || ''
        const isB2B    = cd.clientIsCompany || false
        const taxRate  = isSmallBusiness.value ? 0 : 19

        if (f.pricingModel === 'hourly') {
          if (!isB2B) {
            const rateP = cd.hourlyRatePhotoPrivat || settingsData.value?.bookingTerms?.hourlyRatePhotoPrivat || f.hourlyRate || 0
            const rateV = cd.hourlyRateVideoPrivat || settingsData.value?.bookingTerms?.hourlyRateVideoPrivat || f.hourlyRate || 0
            if (p2?.fotografie) {
              const h = cd.estimatedHoursPhoto || f.estimatedHours || 0
              if (h > 0) baseItems.push({ articleId: 'ART-00001', description: occasion || 'Fotografie',
                detail: `${h} h à ${rateP} €/h`, quantity: h, unit: 'Stunde', priceNet: rateP, taxRate })
            }
            if (p2?.videografie) {
              const h = cd.estimatedHoursVideo || (p2?.fotografie ? 0 : f.estimatedHours) || 0
              if (h > 0) baseItems.push({ articleId: 'ART-00003', description: 'Videografie',
                detail: `${h} h à ${rateV} €/h`, quantity: h, unit: 'Stunde', priceNet: rateV, taxRate })
            }
          } else {
            const ratePhotoMain  = cd.hourlyRatePhotoB2B   || settingsData.value?.bookingTerms?.hourlyRatePhotoB2B  || 0
            const ratePhotoSetup = cd.hourlyRatePhotoSetup  || settingsData.value?.bookingTerms?.hourlyRatePhotoSetup || 0
            const rateVideoMain  = cd.hourlyRateVideoB2B   || settingsData.value?.bookingTerms?.hourlyRateVideoB2B  || 0
            const rateVideoSetup = cd.hourlyRateVideoSetup  || settingsData.value?.bookingTerms?.hourlyRateVideoSetup || 0
            const pPhoto = cd.photoPhases || {}; const pVideo = cd.videoPhases || {}
            if (p2?.fotografie) {
              const sH = (pPhoto.vorbereitung||0)+(pPhoto.abstimmung||0)
              const mH = (pPhoto.shooting||0)+(pPhoto.bearbeitung||0)
              if (sH > 0) baseItems.push({ articleId: 'ART-00010', description: 'Fotografie – Vorbereitung & Meetings',
                detail: `${sH} h à ${ratePhotoSetup} €/h`, quantity: sH, unit: 'Stunde', priceNet: ratePhotoSetup, taxRate })
              if (mH > 0) baseItems.push({ articleId: 'ART-00002', description: 'Fotografie – Shooting & Bildbearbeitung',
                detail: `${mH} h à ${ratePhotoMain} €/h`, quantity: mH, unit: 'Stunde', priceNet: ratePhotoMain, taxRate })
            }
            if (p2?.videografie) {
              const sH = (pVideo.vorbereitung||0)+(pVideo.abstimmung||0)
              const mH = (pVideo.dreh||0)+(pVideo.schnitt||0)
              if (sH > 0) baseItems.push({ articleId: 'ART-00011', description: 'Videografie – Vorbereitung & Meetings',
                detail: `${sH} h à ${rateVideoSetup} €/h`, quantity: sH, unit: 'Stunde', priceNet: rateVideoSetup, taxRate })
              if (mH > 0) baseItems.push({ articleId: 'ART-00004', description: 'Videografie – Dreh & Schnitt',
                detail: `${mH} h à ${rateVideoMain} €/h`, quantity: mH, unit: 'Stunde', priceNet: rateVideoMain, taxRate })
            }
          }
        } else if (f.pricingModel === 'flat' && f.flatRate) {
          baseItems.push({ articleId: 'ART-00017', description: occasion || 'Pauschale Arbeitsleistung',
            detail: f.flatRateIncludes || 'Pauschalpreis laut Vereinbarung',
            quantity: 1, unit: 'Pauschal', priceNet: cd.flatRate || f.flatRate, taxRate })
        }
        if (isB2B && !cd.mediaIncluded) {
          const imgCount = cd.imageCountB2B || 0; const imgPrice = cd.imagePriceB2B || 0
          if (imgCount > 0 && imgPrice > 0) baseItems.push({ articleId: 'ART-00007',
            description: `Bildpaket Digital (${imgCount} Bilder)`,
            detail: 'Bearbeitete Digitalfotos in Druckqualität',
            quantity: imgCount, unit: 'Bild', priceNet: imgPrice, taxRate })
          const vidCount = cd.videoCount10min || 0; const vidPrice = cd.videoPer10min || 0
          if (vidCount > 0 && vidPrice > 0) baseItems.push({ articleId: 'ART-00009',
            description: `Videoproduktion (${vidCount} × 10 min)`,
            detail: 'Fertig produziert inkl. Schnitt, Grading, Ton',
            quantity: vidCount, unit: 'Stück', priceNet: vidPrice, taxRate })
        }
        const nrSurcharge = cd.usageRightsSurcharge || f.usageRightsSurcharge || 0
        if (nrSurcharge > 0) baseItems.push({ articleId: 'ART-00012',
          description: 'Nutzungsrechte / Lizenz', detail: buildNRDescription(cd),
          quantity: 1, unit: 'Pauschal', priceNet: nrSurcharge, taxRate })
      }

      // ── 2. Anzahlungsabzug: alle bezahlten Anzahlungsrechnungen ────────────
      const paidDeposits = allDepositInvoices.value.filter(d => d.status === 'Bezahlt')
      if (paidDeposits.length) {
        const totalDep = paidDeposits.reduce((s, d) => s + (d.total || 0), 0)
        const depNrs   = paidDeposits.map(d => d.documentNumber).filter(Boolean).join(', ')
        const depTaxR  = isSmallBusiness.value ? 0 : (paidDeposits[0]?.lineItems?.[0]?.taxRate ?? 19)
        baseItems.push({
          articleId:   null,
          description: `Abzüglich geleisteter Anzahlung`,
          detail:      depNrs ? `Rechnung(en): ${depNrs}` : '',
          quantity:    1,
          unit:        'Pauschal',
          priceNet:    -Math.abs(totalDep),
          taxRate:     depTaxR,
          discount:    0,
          _isDepositDeduction: true,
        })
      }

      invoiceStore.invoicePrefillItems = baseItems.length ? baseItems : null
      invoiceStore.finalFormOpen = true
    }

    async function onFinalInvoiceCreated(doc) {
      onDocCreated(doc)
      await refreshDocs()
      await nextTick()
      invoiceStore.finalFormOpen      = false
      invoiceStore.invoicePrefillItems = null
      // Scroll-Position im qo-main zurücksetzen
      const qoMain = document.querySelector('.qo-main')
      if (qoMain) qoMain.scrollTop = 0
    }

    async function reviseDepositInvoice(inv) {
      // Neue Version einer Entwurfsrechnung — nur im Entwurfsstatus
      if (inv.status !== 'Entwurf') return
      try {
        await store.reviseDocument(inv.id, {})
        await refreshDocs()
      } catch (e) { console.error('Revision fehlgeschlagen:', e) }
    }

    async function reviseFinalInvoice(inv) {
      if (inv.status !== 'Entwurf') return
      try {
        await store.reviseDocument(inv.id, {})
        await refreshDocs()
      } catch (e) { console.error('Revision fehlgeschlagen:', e) }
    }

    async function onDepositInvoiceCreated(doc) {
      onDocCreated(doc)
      await refreshDocs()
      await nextTick()
      invoiceStore.depositFormOpen     = false
      invoiceStore.invoicePrefillItems = null
      invoiceStore.depositManualItem   = null
      const qoMain = document.querySelector('.qo-main')
      if (qoMain) qoMain.scrollTop = 0
    }

    async function markInvoicePaid() {
      if (!invoiceDoc.value) return
      try {
        await store.setDocumentStatus(invoiceDoc.value.id, 'Bezahlt')
        await refreshDocs()
      } catch (e) { console.error(e) }
    }

    async function markDepositPaid() {
      if (!depositInvoice.value) return
      openPaymentPopup(depositInvoice.value.id, depositInvoice.value.documentNumber || 'Anzahlungsrechnung')
    }

    async function changeDepositStatus(doc, newStatus) {
      if (!newStatus || newStatus === doc.status) return
      if (newStatus === 'Bezahlt') {
        openPaymentPopup(doc.id, doc.documentNumber || 'Anzahlungsrechnung')
        return
      }
      try {
        await store.setDocumentStatus(doc.id, newStatus)
        await refreshDocs()
      } catch (e) { console.error(e) }
    }

    async function changeFinalStatus(doc, newStatus) {
      if (!newStatus || newStatus === doc.status) return
      if (newStatus === 'Bezahlt') {
        openPaymentPopup(doc.id, doc.documentNumber || 'Schlussrechnung')
        return
      }
      try {
        await store.setDocumentStatus(doc.id, newStatus)
        await refreshDocs()
      } catch (e) { console.error(e) }
    }

    async function markFinalPaid() {
      if (!finalInvoiceDoc.value) return
      openPaymentPopup(finalInvoiceDoc.value.id, finalInvoiceDoc.value.documentNumber || 'Schlussrechnung')
    }



    // ── Reaktive Sync: lokale State → pdStore (für Sub-Komponenten) ──────────
    watch(anfrageFormData, val => { pdStore.anfrageFormData = val }, { immediate: true })
    watch(anfrageFormSaving, val => { pdStore.anfrageFormSaving = val })
    watch(anfrageLocked, val => { pdStore.anfrageLocked = val })
    watch(consultation, val => { pdStore.consultation = val }, { deep: true })
    watch(consultSaving, val => { pdStore.consultSaving = val })
    watch(requireConsult, val => { pdStore.requireConsult = val })
    watch(handoverDate, val => { pdStore.handoverDate = val })
    watch(handoverTime, val => { pdStore.handoverTime = val })
    watch(handoverNote, val => { pdStore.handoverNote = val })
    watch(finalInvoicePaid, val => { pdStore.finalInvoicePaid = val })
    watch(doneNetRevenue, val => { pdStore.doneNetRevenue = val })
    watch(projectDocuments, val => { pdStore.projectDocuments = val }, { deep: true })
    // Project ID sync
    watch(project, val => {
      if (val) pdStore.projectId = val.id
    }, { immediate: true })

    onMounted(async () => {
      loading.value = true
      try {
        // Wenn das Projekt bereits im Store ist (z.B. von Dashboard geladen):
        // nur die fehlenden Ressourcen nachladen – kein erneutes fetchProjects().
        // Das verhindert die Race-Condition wo projects.value durch ein neues
        // Array ersetzt wird und project.value kurz null ist.
        const alreadyLoaded = project.value !== null

        if (alreadyLoaded) {
          await Promise.all([
            store.customers.length === 0 ? store.fetchCustomers() : Promise.resolve(),
            store.articles.length  === 0 ? store.fetchArticles()  : Promise.resolve(),
            loadSettings(),
          ])
        } else {
          // Kaltstart / direkter URL-Aufruf – alles laden
          await Promise.all([store.fetchProjects(), store.fetchCustomers(), loadSettings(), store.fetchArticles()])
          if (!project.value) {
            await store.fetchProjectById(route.params.id)
          }
        }

        try {
          const docs = await store.fetchDocumentsByProject(route.params.id)
          projectDocuments.value = docs || []
        } catch (e) { console.error(e) }
      } catch (e) {
        console.error('[ProjectDetail] Fehler beim Laden:', e)
      } finally {
        await nextTick()
        loading.value = false
      }


      // Pre-fill contract form from project data
      if (project.value?.contractData) {
        const cd = project.value.contractData
        const p = project.value
        contractStore.contractForm = {
          pricingModel:          cd.pricingModel          || 'hourly',
          occasion:              cd.occasion              || '',
          hourlyRate:            cd.hourlyRate            != null ? cd.hourlyRate : null,
          estimatedHours:        cd.estimatedHours        != null ? cd.estimatedHours : null,
          flatRate:              cd.flatRate              != null ? cd.flatRate : null,
          flatRateIncludes:      cd.flatRateIncludes      || '',
          customPriceText:       cd.customPriceText       || '',
          depositAmount: cd.depositAmount != null
            ? cd.depositAmount
            : calcAutoDeposit(p.budget?.estimatedAmount),
          paymentDueDays:        cd.paymentDueDays        != null ? cd.paymentDueDays : 14,
          deliveryWeeks:         cd.deliveryWeeks         || '4–8',
          publicationPermission: cd.publicationPermission || 'conditional',
          additionalNotes:       cd.additionalNotes       || '',
          clientIsCompany:       cd.clientIsCompany       || false,
          // Leistungen: aus contractData wenn vorhanden, sonst Vorbelegung aus Anfrage
          fotografie:         cd.fotografie         != null ? cd.fotografie         : (p.fotografie         || false),
          videografie:        cd.videografie        != null ? cd.videografie        : (p.videografie        || false),
          glueckwunschkarten: cd.glueckwunschkarten != null ? cd.glueckwunschkarten : (p.glueckwunschkarten || false),
          gettingReadyEr:     cd.gettingReadyEr     != null ? cd.gettingReadyEr     : (p.gettingReadyEr     || false),
          gettingReadySie:    cd.gettingReadySie    != null ? cd.gettingReadySie    : (p.gettingReadySie    || false),
          gettingReadyBeide:  cd.gettingReadyBeide  != null ? cd.gettingReadyBeide  : (p.gettingReadyBeide  || false),
          // Nutzungsart
          usageType: cd.usageType && cd.usageType !== 'private'
            ? cd.usageType
            : (cd.clientIsCompany ? 'commercial' : 'private'),
          commercialPurpose:     cd.commercialPurpose     || '',
          usageLicenseDuration:  cd.usageLicenseDuration  || 'unbegrenzt',
          usageLicenseScope:     cd.usageLicenseScope     || 'national',
          usageLicenseSurchargePercent: cd.usageLicenseSurchargePercent ?? 0,
          equipmentDamageClause: cd.equipmentDamageClause || false,
          selectedSpecialClauses: cd.selectedSpecialClauses || [],
          customSpecialClauses:  cd.customSpecialClauses  || '',
        }
      } else {
        // Noch kein Vertrag — Leistungen aus Anfrage vorbelegen
        const p = project.value
        if (p) {
          contractStore.contractForm.fotografie         = p.fotografie         || false
          contractStore.contractForm.videografie        = p.videografie        || false
          contractStore.contractForm.glueckwunschkarten = p.glueckwunschkarten || false
          contractStore.contractForm.gettingReadyEr     = p.gettingReadyEr     || false
          contractStore.contractForm.gettingReadySie    = p.gettingReadySie    || false
          contractStore.contractForm.gettingReadyBeide  = p.gettingReadyBeide  || false
        }
        if (p?.budget?.estimatedAmount) {
          contractStore.contractForm.depositAmount = calcAutoDeposit(p.budget.estimatedAmount)
        }
      }
      // Prefill hourlyRate in contractForm from settings if not set
      if (!contractStore.contractForm.hourlyRate && settingsData.value?.bookingTerms?.defaultHourlyRate) {
        contractStore.contractForm.hourlyRate = settingsData.value.bookingTerms.defaultHourlyRate
      }
      // Load Changelog
      auftragChangelog.value = project.value?.auftragChangelog || []
      // Load Projektnotizen
      projectNotes.value = project.value?.projectNotes || []
      // Load Anzahlung-Vereinbarung
      invoiceStore.depositNoAgreement = project.value?.depositNoAgreement || false
      // Load Generierungs-Versionen
      contractStore.contractGeneratedVersions = project.value?.contractGeneratedVersions || []
      // contractCreated flag — only set by saveContractData, never by saveAnfrageForm
      // Load Changelog
      auftragChangelog.value = project.value?.auftragChangelog || []


      // ── Sync neue Stores mit geladenem State ──────────────────
      if (project.value) {
        // ProjectDetailStore
        pdStore.projectId         = project.value.id
        pdStore.projectDocuments  = projectDocuments.value
        pdStore.auftragChangelog  = auftragChangelog.value
        pdStore.projectNotes      = projectNotes.value
        pdStore.settingsData      = settingsData.value
        // Anfrage + Vorgespräch
        pdStore.anfrageFormData   = anfrageFormData.value
        pdStore.anfrageFormSaving = anfrageFormSaving.value
        pdStore.anfrageLocked     = anfrageLocked.value
        pdStore.consultation      = consultation.value
        pdStore.consultSaving     = consultSaving.value
        pdStore.requireConsult    = requireConsult.value
        // Changelog
        pdStore.showChangelogModal = showChangelogModal.value
        // Abschluss
        pdStore.handoverDate      = handoverDate.value
        pdStore.handoverTime      = handoverTime.value
        pdStore.handoverNote      = handoverNote.value
        pdStore.finalInvoicePaid  = finalInvoicePaid.value
        pdStore.doneNetRevenue    = doneNetRevenue.value
        // ContractStore
        contractStore.loadFromProject(project.value, settingsData.value)
        // InvoiceStore
        invoiceStore.loadFromDocs(projectDocuments.value)
        // QuoteStore
        quoteStore.loadFromDocs(projectDocuments.value)

        // Auto-open current pipeline step (unless ?new=1 already set it)
        // Skip 'auftrag' (Bearbeitung — in Entwicklung, kein vollständiges Panel)
        if (!route.query.new) {
          const currentStep = workflowSteps.value.find(s => s.current && s.id !== 'auftrag')
          if (currentStep) pipelineOpen.value = currentStep.id
        }
      }

      // Load signed contracts + contract status + addenda
      // Prefill billing defaults from settings
      if (settingsData.value?.bookingTerms) {
        const bt = settingsData.value.bookingTerms
        if (bt.defaultHourlyRate != null) billing.value.hourlyRate = bt.defaultHourlyRate
        if (bt.defaultKmRate     != null) billing.value.kmRate     = bt.defaultKmRate
        if (bt.defaultKmFree     != null) billing.value.kmFree     = bt.defaultKmFree
        // Prefill Abrechnung km defaults too
        if (bt.defaultKmRate != null) abrechnungKm.value.rate = bt.defaultKmRate
        if (bt.defaultKmFree != null) abrechnungKm.value.free = bt.defaultKmFree
      }
            contractStore.signedContracts  = project.value?.signedContracts  || []
      contractStore.contractStatus   = project.value?.contractStatus   || 'Entwurf'
      contractStore.contractAddenda  = project.value?.contractAddenda  || []
      // Load consultation
      if (project.value?.consultation) {
        consultation.value.date           = project.value.consultation.date           || ''
        consultation.value.notes          = project.value.consultation.notes          || ''
        consultation.value.clientAccepted = project.value.consultation.clientAccepted ?? null
      }
    })

    // ── Sidebar Edit Modal ────────────────────────────────────────────────────
    // ── Auftrags-Änderungsprotokoll ──────────────────────────────────────────
    const auftragChangelog = ref([])

    const auftragChangelogSorted = computed(() =>
      [...auftragChangelog.value].sort((a, b) => new Date(b.ts) - new Date(a.ts))
    )

    const showChangelogModal = ref(false)

    // Changelog nach Datum gruppieren (neueste Gruppe zuerst)
    const changelogGrouped = computed(() => {
      const groups = {}
      for (const entry of auftragChangelogSorted.value) {
        const d = new Date(entry.ts)
        const label = d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
        if (!groups[label]) groups[label] = []
        groups[label].push(entry)
      }
      return groups
    })

    function formatDateTime(iso) {
      if (!iso) return '—'
      return new Date(iso).toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    }

    function formatTime(iso) {
      if (!iso) return ''
      return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    }

    function formatChangelogVal(val) {
      if (!val && val !== 0) return '—'
      // If looks like a date, format it
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(val))) {
        return new Date(val).toLocaleDateString('de-DE')
      }
      return String(val)
    }

        // Kategorie → auto-Anlass (dieselbe Logik wie NewProjectForm)
    const DE_MONTHS_EDIT = ['Januar','Februar','März','April','Mai','Juni',
                             'Juli','August','September','Oktober','November','Dezember']

    function buildAutoOccasion(category, bookingIso) {
      if (!category || !bookingIso) return ''
      const d    = new Date(bookingIso)
      const date = `${d.getDate()}. ${DE_MONTHS_EDIT[d.getMonth()]} ${d.getFullYear()}`
      const map  = {
        'Hochzeit':          `Hochzeit am ${date}`,
        'Portrait':          `Portrait-Shooting am ${date}`,
        'Babybauch':         `Babybauch-Shooting am ${date}`,
        'Newborn':           `Newborn-Shooting am ${date}`,
        'Event':             `Event am ${date}`,
        'Produktfotografie': `Produktfotografie am ${date}`,
        'Familienshooting':  `Familien-Shooting am ${date}`,
        'Businessfotografie':`Business-Fotografie am ${date}`,
        'Sonstiges':         `Fotografie am ${date}`,
      }
      return map[category] || `${category} am ${date}`
    }

    const sidebarEdit = reactive({
      show: false, saving: false,
      occasionAutoSet: true,
      form: {
        occasion: '', booking: '', bookingTime: '', location: '', category: '',
        notes: '', pricingModel: 'flat', hourlyRate: null, estimatedHours: null,
        flatRate: null, depositAmount: null, paymentDueDays: 14,
      }
    })

    // Watch: Kategorie ändert sich → Anlass automatisch aktualisieren
    watch(() => sidebarEdit.form.category, (newCat) => {
      if (sidebarEdit.occasionAutoSet) {
        sidebarEdit.form.occasion = buildAutoOccasion(newCat, sidebarEdit.form.booking)
      }
    })
    watch(() => sidebarEdit.form.booking, (newDate) => {
      if (sidebarEdit.occasionAutoSet) {
        sidebarEdit.form.occasion = buildAutoOccasion(sidebarEdit.form.category, newDate)
      }
    })

    function openSidebarEdit() {
      const p = project.value
      const cd = p.contractData || contractStore.contractForm || {}
      sidebarEdit.occasionAutoSet = true
      sidebarEdit.form = {
        occasion:       cd.occasion || p.projectName || '',
        booking:        (p.booking || '').slice(0, 10),
        bookingTime:    p.bookingTime || '',
        bookingLabel:   p.bookingLabel || '',
        shootingDates:  Array.isArray(p.shootingDates) ? JSON.parse(JSON.stringify(p.shootingDates)) : [],
        location:       p.location || '',
        locations:      Array.isArray(p.locations) ? p.locations : [],
        skipQuote:      p.skipQuote ?? true,  // default: kein Angebot
        category:       p.category || '',
        notes:          p.notes || '',
        pricingModel:   cd.pricingModel || 'flat',
        hourlyRate:     cd.hourlyRate || null,
        estimatedHours: cd.estimatedHours || null,
        flatRate:       cd.flatRate || null,
        depositAmount:  cd.depositAmount || null,
        paymentDueDays: cd.paymentDueDays || 14,
      }
      sidebarEdit.show = true
    }

    // Hilfsfunktion: Ändernungen gegenüber aktuellem Projekt-Stand ermitteln
    function buildChangelogEntries(f, newContractData) {
      const p   = project.value
      const cd  = p.contractData || {}
      const now = new Date().toISOString()
      const entries = []

      function entry(label, oldVal, newVal) {
        if (String(oldVal ?? '') !== String(newVal ?? '') && (oldVal || newVal)) {
          entries.push({ ts: now, label, from: oldVal ?? '', to: newVal ?? '' })
        }
      }

      entry('Anlass',         cd.occasion || p.projectName,    f.occasion)
      entry('Kategorie',      p.category,                       f.category)
      entry('Buchungsdatum',  p.booking?.slice(0,10),           f.booking)
      entry('Uhrzeit',        p.bookingTime,                    f.bookingTime)
      entry('Location',       p.location,                       f.location)
      entry('Locations',      JSON.stringify(p.locations),        JSON.stringify(f.locations))
      entry('Angebot skip',   p.skipQuote,                        f.skipQuote)
      entry('Notizen',        p.notes,                          f.notes)
      entry('Preismodell',    cd.pricingModel,                  f.pricingModel)
      entry('Stundensatz',    cd.hourlyRate,                    f.hourlyRate)
      entry('Est. Stunden',   cd.estimatedHours,                f.estimatedHours)
      entry('Pauschalpreis',  cd.flatRate,                      f.flatRate)
      entry('Anzahlung',      cd.depositAmount,                 f.depositAmount)
      entry('Zahlungsziel',   cd.paymentDueDays,                f.paymentDueDays)
      return entries
    }

    async function saveSidebarEdit() {
      sidebarEdit.saving = true
      try {
        const f = sidebarEdit.form
        const newContractData = {
          ...(project.value.contractData || {}),
          ...contractStore.contractForm,
          occasion:       f.occasion,
          pricingModel:   f.pricingModel,
          hourlyRate:     f.hourlyRate,
          estimatedHours: f.estimatedHours,
          flatRate:       f.flatRate,
          depositAmount:  f.depositAmount,
          paymentDueDays: f.paymentDueDays,
        }

        // Build changelog before saving
        const newEntries = buildChangelogEntries(f, newContractData)
        const existingLog = project.value.auftragChangelog || []
        const updatedChangelog = newEntries.length
          ? [...existingLog, ...newEntries]
          : existingLog

        await store.updateProject(project.value.id, {
          projectName:      f.occasion || project.value.projectName,
          booking:          f.booking,
          bookingTime:      f.bookingTime,
          bookingLabel:     f.bookingLabel || '',
          shootingDates:    f.shootingDates || [],
          location:         f.location,
          locations:        f.locations || [],
          skipQuote:        f.skipQuote ?? true,  // default: kein Angebot
          category:         f.category,
          notes:            f.notes,
          contractData:     newContractData,
          auftragChangelog: updatedChangelog,
        })
        // Sofort reaktiv aktualisieren — kein Reload nötig
        auftragChangelog.value = updatedChangelog
        Object.assign(contractStore.contractForm, newContractData)
        sidebarEdit.show = false
      } catch(e) { console.error('Sidebar save failed:', e) }
      finally { sidebarEdit.saving = false }
    }


    // ── Vertrag: Generierungs-Versionen ─────────────────────────────────────────

        // ── Anzahlung: Vereinbarungsstatus ──────────────────────────────────────────

        // ── Dokumente Modal ────────────────────────────────────────────────────────
    const docsModal = ref(false)

        // ── Projektnotizen ───────────────────────────────────────────────────────
    const projectNotes    = ref([])
    const notesModal      = ref(false)
    const noteSaving      = ref(false)
    const noteEditing     = ref(null)
    const noteEditText    = ref('')
    const noteCompose     = reactive({ open: false, text: '', createdAt: '' })

    const projectNotesSorted = computed(() =>
      [...projectNotes.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
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
      } catch(e) { console.error('Notiz speichern:', e) }
      finally { noteSaving.value = false }
    }

    function startEditNote(note) {
      noteEditing.value = note.id
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
      } catch(e) { console.error('Notiz bearbeiten:', e) }
      finally { noteSaving.value = false }
    }

    async function deleteNote(id) {
      if (!confirm('Notiz löschen?')) return
      projectNotes.value = projectNotes.value.filter(n => n.id !== id)
      await store.updateProject(project.value.id, { projectNotes: projectNotes.value })
    }


    // ══ Manuell-Popup (Positionserfassung) ══════════════════════════════════
    const manualPopup = ref(false)
    const manualTarget = ref(null)   // 'deposit' | 'final' | null
    const manualForm = ref({ description:'', detail:'', quantity:1, unit:'Pauschal', priceNet:0, taxRate:19, discount:0 })
    const manualUnits = ['Pauschal','Stunden','Tage','km','Seiten','Fotos','Stück','Lizenz','Monat']

    function openManualPopup(target) {
      manualTarget.value = target
      manualForm.value   = { description:'', detail:'', quantity:1, unit:'Pauschal', priceNet:0, taxRate:19, discount:0 }
      manualPopup.value  = true
    }

    function saveManualLine() {
      if (!manualForm.value.description.trim()) return
      const item = { ...manualForm.value, _key: Date.now(), articleId: null }
      // Inject into the right form via a ref-based event system
      // We emit through a shared ref that QIM watches
      if (manualTarget.value === 'deposit') {
        invoiceStore.depositManualItem = item
      } else {
        invoiceStore.finalManualItem = item
      }
      manualPopup.value = false
    }


    // ══ Zahlungseingang-Popup ════════════════════════════════════════════════
    const paymentDocId     = ref(null)

    function openPaymentPopup(docId, label) {
      paymentDocId.value    = docId
      invoiceStore.paymentDocLabel = label
      invoiceStore.paymentForm     = {
        paidAt:        new Date().toISOString().slice(0,10),
        paymentMethod: '',
      }
      invoiceStore.paymentError  = ''
      invoiceStore.paymentPopup  = true
    }

    async function confirmPayment() {
      if (!invoiceStore.paymentForm.paidAt)         { invoiceStore.paymentError = 'Bitte Zahlungsdatum angeben.';   return }
      if (!invoiceStore.paymentForm.paymentMethod)  { invoiceStore.paymentError = 'Bitte Zahlungsart auswählen.';   return }
      invoiceStore.paymentSaving = true; invoiceStore.paymentError = ''
      try {
        const paymentData = {
          paidAt:        invoiceStore.paymentForm.paidAt,
          paymentMethod: invoiceStore.paymentForm.paymentMethod,
        }
        await store.setDocumentStatus(paymentDocId.value, 'Bezahlt', paymentData)

        // Wenn eine Korrekturrechnung bezahlt wird → Ursprungsrechnung ebenfalls bezahlt markieren
        const paidDoc = store.documents.find(d => d.id === paymentDocId.value)
        if (paidDoc?.docSubtype === 'correction' && paidDoc?.correctionOf) {
          await store.setDocumentStatus(paidDoc.correctionOf, 'Bezahlt', paymentData)
        }

        await refreshDocs()
        invoiceStore.paymentPopup = false
      } catch (e) {
        invoiceStore.paymentError = e.message || 'Fehler beim Speichern.'
      } finally { invoiceStore.paymentSaving = false }
    }

    // ── Pipeline-Komponenten: Action-Handler ─────────────────────────────────
    async function handlePipelineCall(fnName, args = []) {
      const fns = {
        // Anfrage
        saveAnfrageForm, onHeroLive,
        // Vorgespräch
        saveConsultation, openSidebarEdit,
        // Angebot
        onInlineQuoteCreated, openQuoteFromProject, openQuoteRevise,
        changeQuoteStatus, printQuote, downloadQuote,
        openDocPrint, formatChangelogVal,
        // Vertrag
        saveContractData,
        saveContractStatus,
        saveAddendum,
        setAddendumStatus,
        uploadSignedContract,
        calcAutoSurcharge,
        openContractForm, openContractPrint, printContract, downloadContract,
        openAddendumPrint, printAddendum, downloadAddendum,
        deleteAddendum, uploadSignedAddendum, deleteSignedContract, openAdvPrint,
        // Anzahlung
        openDepositInvoice, reviseDepositInvoice, reviseFinalInvoice, changeDepositStatus, confirmDepositNo, resetDepositNoAgreement, markDepositPaid,
        cancelInvoice, createCorrection, onCorrectionCreated, changeRelatedDocStatus,
        openManualPopup, refreshDocs,
        // Abrechnung
        openBillingInvoice, onFinalInvoiceCreated, onDepositInvoiceCreated, changeFinalStatus,
        // Abschluss
        saveHandover, clearHandover, markFinalPaid,
      }
      const fn = fns[fnName]
      if (fn) await fn(...args)
      else console.warn('[ProjectDetail] Unknown pipeline action:', fnName)
    }


    async function saveAnfrageForm({ project: pData, contractData }) {
      anfrageFormSaving.value = true
      try {
        const updatedPData = {
          ...pData,
          projectName: contractData?.occasion?.trim() || pData.projectName || project.value.projectName,
        }
        await store.updateProject(project.value.id, updatedPData)
        await store.updateProject(project.value.id, { contractData })
        Object.assign(contractStore.contractForm, contractData)
        const savedProject = store.projects.find(pr => pr.id === project.value.id)
        if (savedProject) {
          contractStore.contractForm.fotografie         = savedProject.fotografie         || false
          contractStore.contractForm.videografie        = savedProject.videografie        || false
          contractStore.contractForm.glueckwunschkarten = savedProject.glueckwunschkarten || false
          contractStore.contractForm.gettingReadyEr     = savedProject.gettingReadyEr     || false
          contractStore.contractForm.gettingReadySie    = savedProject.gettingReadySie    || false
          contractStore.contractForm.gettingReadyBeide  = savedProject.gettingReadyBeide  || false
        }
        const rawNotes = pData.notes?.trim()
        if (rawNotes) {
          const note = {
            id:        `pn_${Date.now()}`,
            text:      rawNotes,
            source:    'anfrage',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          const updatedNotes = [...(projectNotes.value || []).filter(n => n.source !== 'anfrage'), note]
          projectNotes.value = updatedNotes
          await store.updateProject(project.value.id, { projectNotes: updatedNotes })
        }
        // Angebot-Tab nur öffnen wenn explizit gewünscht (skipQuote === false)
        if (requireConsult.value) {
          pipelineOpen.value = 'vorgespräch'
        } else if (!project.value?.skipQuote) {
          pipelineOpen.value = 'angebot'
        } else {
          pipelineOpen.value = 'vertrag'
        }
      } catch (e) { console.error(e) } finally { anfrageFormSaving.value = false }
    }

    return {
      project, customer, customerName, goBack, openProjectFolder, loading, heroLive, onHeroLive,
      projectDocuments, anyService, hasGettingReady,
      formatDate, formatCurrency, isExpired, typeLabel, stdDocPrintUrl, isStdDoc, openDocOrStd, openDocPrint, openDocDownload, downloadZugferdFromDoc, downloadDoc, openPrintView,
      detailDocId, detailDocObj, openDocDetail, refreshDocs, autoUpdateProjectStatus, store,
      editModal, editSaving, editError, editForm, editing,
      saveInlineEdit, cancelInlineEdit, onDocCreated, onInlineQuoteCreated, invoiceModal, quotePrefillItems,
      categories, statusOptions, openEditModal, saveEdit,
      handlePipelineCall, contractStatusClass, contractLocked, saveContractStatus,
      allProjectDocs, saveAddendum, deleteAddendum, setAddendumStatus, contractHasData, openContractForm,
      openContractPrint, openAdvPrint, openAddendumPrint, printAddendum, downloadAddendum,
      printContract, downloadContract,
      saveContractData, uploadSignedContract, deleteSignedContract,
      uploadSignedAddendum, deleteSignedAddendum,
      settingsData, calcAutoDeposit, calcAutoSurcharge, contractBase,
      fmtFileSize, fmtDate, pipelineOpen, billing, workflowSteps, handleStepClick, handoverDate, handoverTime, handoverNote, saveHandover, clearHandover, doneNetRevenue, billingTotal, shootDone,
      abrechnungItems, abrechnungKm, abrQuickAddId, isSmallBusiness, activeArticles, enabledPaymentMethods,
      abrLineNet, abrSubtotal, abrTaxGroups, abrechnungTotal, abrechnungHasDeposit,
      abrAddFromCatalog, abrAddEmptyLine, mkAbrLine,
      prefillFromQuoteDoc, prefillFromContract, addDepositDeductionLine, addKmLine,
      anfrageFormData, anfrageFormSaving, saveAnfrageForm, anfrageLocked,
      consultation, consultSaving, requireConsult, saveConsultation,
      quoteDoc, allProjectQuotes, openQuoteRevise, openQuoteFromProject, markQuoteAccepted, changeQuoteStatus,
      printQuote, downloadQuote,
      auftragChangelog, auftragChangelogSorted, changelogGrouped, showChangelogModal, formatChangelogVal, formatTime,

      docsModal,
      projectNotes, projectNotesSorted, notesModal, noteSaving,
      noteEditing, noteEditText, noteCompose,
      openNoteCompose, saveNewNote, startEditNote, saveEditNote, deleteNote,
      formatDateTime,
      sidebarEdit, openSidebarEdit, saveSidebarEdit,
      quoteStatusConfirm, confirmQuoteStatusChange,
      invoiceDoc, invoicePaid, confirmDepositNo,
      depositInvoice, finalInvoiceDoc, finalInvoicePaid, depositNextInvoice,
      allDepositInvoices, invoicePrefillItems, openBillingInvoice, onFinalInvoiceCreated, openDepositInvoice, changeDepositStatus, changeFinalStatus, markInvoicePaid, markDepositPaid, markFinalPaid,
      manualPopup, manualForm, manualUnits, openManualPopup, saveManualLine,
      paymentPopup, paymentDocLabel, paymentForm, paymentSaving, paymentError, openPaymentPopup, confirmPayment,
      // Kundenfoto
      photoLightbox, photoUploading, photoError, onPhotoSelect, onPhotoDrop, removeCustomerPhoto
    }
  }
}
</script>

<style>
/* ── Zugehörige Korrekturen & Stornos unter Rechnung ── */
.qv-related-docs    { margin-top: 10px; padding: 10px 12px; background: var(--bg-alt); border-radius: var(--radius); border: 1px solid var(--border); }
.qv-related-title   { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-muted); margin-bottom: 8px; }
.qv-related-row     { display: flex; align-items: center; padding: 5px 0; border-top: 1px solid var(--border); font-size: 12.5px; flex-wrap: wrap; gap: 4px; }
.qv-related-row:first-of-type { border-top: none; padding-top: 0; }
.badge-danger       { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

/* ── Contract form field labels — aligned with Anfrage form ── */
.contract-form .fg label,
.contract-form label {
  font-size: 12px; font-weight: 600; color: var(--text-2);
  margin-bottom: 5px; display: block;
}

.project-detail { width: 100%; }

/* Back link */
.hero-back-link {
  display: inline-flex; align-items: center; gap: 4px;
  color: rgba(255,255,255,.55); font-size: 12px; text-decoration: none;
  transition: color .14s;
}
.hero-back-link:hover { color: rgba(255,255,255,.9); text-decoration: none; }

/* Hero */
.proj-hero {
  display: flex; justify-content: space-between; align-items: flex-start;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: var(--radius-xl); padding: 22px 24px;
  color: white; margin-bottom: 14px; gap: 16px;
}
.proj-hero-top  { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.proj-name      { font-size: 22px; font-weight: 700; margin: 0 0 8px; line-height: 1.2; }
.proj-category  { font-size: 12px; background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.2); border-radius: 99px; padding: 2px 10px; }
.proj-meta      { font-size: 13px; opacity: .85; display: flex; flex-wrap: wrap; gap: 4px; }
.proj-hero-actions { flex-shrink: 0; }
.btn-folder {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 6px;
  background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2);
  color: white; font-size: 12.5px; font-weight: 600;
  cursor: pointer; transition: all .14s; white-space: nowrap;
}
.btn-folder:hover { background: rgba(255,255,255,.22); }

/* Projektordner-Grid im Bearbeitungs-Panel */
.pp-folder-section {
  background: var(--bg-alt); border: 1.5px solid var(--border);
  border-radius: 10px; padding: 16px;
}
.pp-folder-title {
  font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 12px;
}
.pp-folder-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.pp-folder-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 14px 8px; border-radius: 8px;
  background: var(--surface); border: 1.5px solid var(--border);
  cursor: pointer; transition: all .14s;
}
.pp-folder-btn:hover {
  border-color: var(--primary); background: var(--primary-light);
  transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,.08);
}
.pp-folder-icon { font-size: 22px; }
.pp-folder-label { font-size: 11px; font-weight: 600; color: var(--text-muted); }

/* KPIs */
.proj-kpis { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }

/* ── Auftragsübersicht-Chips (unterhalb KPI-Zeile) ── */
.proj-auftrag-info { margin-bottom: 14px; }
.pai-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.pai-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 600;
  border: 1px solid var(--border); background: var(--surface); color: var(--text-muted);
  white-space: nowrap;
}
.pai-chip-sub { font-weight: 400; font-size: 11px; opacity: .8; }
.pai-chip--privat  { background: #f0fdf4; border-color: #86efac; color: #166534; }
.pai-chip--b2b     { background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; }
.pai-chip--price   { background: var(--primary-light); border-color: rgba(79,70,229,.25); color: var(--primary); }
.pai-chip--usage   { background: #fef9c3; border-color: #fde047; color: #854d0e; }
.pai-chip--deposit { background: #f0fdf4; border-color: #86efac; color: #166534; }
.pai-chip--service { background: var(--bg-alt); border-color: var(--border); color: var(--text-muted); font-size: 11px; }
.pai-chip--total   { background: var(--primary); color: #fff; border-color: var(--primary); font-size: 13px; margin-left: auto; }
.proj-kpi  {
  flex: 1; min-width: 120px; min-height: 90px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 14px 16px;
  box-shadow: var(--shadow-sm); text-align: center;
}
.proj-kpi-val { font-size: 18px; font-weight: 700; color: var(--primary-text); }
.proj-kpi-lbl { font-size: 11px; color: var(--text-muted); margin-top: 3px; }

/* Detail grid */
.proj-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
  align-items: start;
}
.proj-grid-full { grid-column: 1 / -1; }

/* Detail rows inside cards */
.dr {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 12px; padding: 7px 0;
  border-bottom: 1px solid var(--border); font-size: 13px;
}
.dr:last-child { border-bottom: none; }
.dr > span:first-child { color: var(--text-muted); flex-shrink: 0; }
.dr > span:last-child  { font-weight: 500; text-align: right; }

/* Services */
.service-list    { display: flex; flex-direction: column; gap: 6px; }
.svc-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: var(--radius);
  font-size: 13px; color: var(--text-muted);
  background: var(--bg-alt); border: 1px solid var(--border);
  opacity: .45;
}
.svc-item.active { color: var(--text); opacity: 1; border-color: var(--primary); background: var(--primary-light); }
.svc-ico { font-size: 14px; }
.svc-section-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; color: var(--text-muted); }

@media (max-width: 700px) {
  .proj-hero { flex-wrap: wrap; }
  .proj-grid { grid-template-columns: 1fr; }
}

/* ── Vertrag Section – s-card style ── */
.contract-form { display: flex; flex-direction: column; gap: 14px; }

/* s-card reuse (same as Settings / QuoteInvoiceModal) */
.contract-form .s-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg, 12px); overflow: hidden; box-shadow: var(--shadow-sm); }
.contract-form .s-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.contract-form .s-card-title { font-size: 13px; font-weight: 700; color: var(--text); }
.contract-form .s-card-sub { font-size: 11.5px; color: var(--text-muted); }
.contract-form .s-card-body { padding: 16px; }

/* form fields */
.contract-form .fg { display: flex; flex-direction: column; gap: 5px; }
.contract-form label, .fg-label { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--text-muted); }
.contract-form input, .contract-form select, .contract-form textarea {
  padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface); color: var(--text); font-size: 13px; font-family: inherit;
}
.contract-form input:focus, .contract-form select:focus, .contract-form textarea:focus {
  outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79,70,229,.08);
}

/* grids */
.cf-grid { display: grid; gap: 12px; }
.cf-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.cf-grid-2 { grid-template-columns: 1fr 1fr; }

/* pricing model chips */
.pm-opt:hover { border-color: var(--primary); color: var(--text); }
.pm-opt.active { background: var(--primary-light); border-color: var(--primary); color: var(--primary-text); font-weight: 600; }

/* toggle chip (B2B / Privat) */
.cf-toggle-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border: 1px solid var(--border); border-radius: 99px; cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--text-2); background: var(--surface); transition: all .13s; user-select: none; }
.cf-toggle-chip.active { background: var(--primary-light); border-color: var(--primary); color: var(--primary-text); }
.cf-badge-hint { font-size: 11.5px; color: var(--primary-text); background: var(--primary-light); border-radius: var(--radius); padding: 4px 10px; display: inline-block; margin-top: 8px; }

/* radio chips */
.cf-radio-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.cf-service-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.cf-svc-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 99px;
  font-size: 12.5px; font-weight: 600;
  border: 1.5px solid var(--border); background: var(--surface); color: var(--text-2);
  cursor: pointer; transition: all .12s; user-select: none;
}
.cf-svc-chip.active { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
.cf-svc-chip:hover:not(.active) { border-color: var(--primary); }
.cf-chip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border: 1px solid var(--border); border-radius: 99px; cursor: pointer; font-size: 12px; font-weight: 500; color: var(--text-2); background: var(--surface); transition: all .12s; user-select: none; }
.cf-chip:hover { border-color: var(--primary); }
.cf-chip.active { background: var(--primary-light); border-color: var(--primary); color: var(--primary-text); font-weight: 600; }

/* clause chips */
.cf-clause-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.cf-toggle-hint { font-size: 11.5px; color: var(--text-muted); margin-left: 6px; }
.cf-check-label { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }

/* separator / section label inside card */
.cf-separator { border: none; border-top: 1px solid var(--border); margin: 14px 0 10px; }
.cf-section-label { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); margin-bottom: 10px; }

/* computed value display */
.cf-computed { padding: 8px 10px; background: var(--bg-alt); border: 1px solid var(--border); border-radius: var(--radius); font-size: 13.5px; font-weight: 700; color: var(--primary-text); }
.cf-computed-empty { color: var(--text-muted); font-weight: 400; font-size: 12px; }

/* autofill row */
.cf-autofill-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 3px; }
.cf-autofill-label { font-size: 11px; color: var(--text-muted); text-transform: none; font-weight: 500; letter-spacing: 0; }
.cf-autofill-val { font-size: 12px; color: var(--primary-text); }
.cf-autofill-btn { border: 1px solid var(--primary); background: none; color: var(--primary-text); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; cursor: pointer; font-family: inherit; transition: all .12s; }
.cf-autofill-btn:hover { background: var(--primary-light); }

/* inp-unit-wrap (reuse) */
.contract-form .inp-unit-wrap { display: flex; align-items: center; }
.contract-form .inp-unit-wrap input { border-radius: var(--radius) 0 0 var(--radius); flex: 1; }
.contract-form .inp-unit { padding: 8px 10px; background: var(--bg-alt); border: 1px solid var(--border); border-left: none; border-radius: 0 var(--radius) var(--radius) 0; font-size: 12px; color: var(--text-muted); white-space: nowrap; }

/* head actions */
.cf-head-actions { display: flex; gap: 8px; align-items: center; }

.mt-8  { margin-top: 8px; }
.mt-12 { margin-top: 12px; }
.cf-save-row { display: flex; align-items: center; gap: 8px; padding-top: 4px; flex-wrap: wrap; }
.save-ok { font-size: 12.5px; color: var(--success, #16a34a); }

.signed-section { border-top: 1px solid var(--border); padding-top: 14px; }
.addenda-section { border-top: 1px solid var(--border); padding-top: 14px; }

/* Contract status select */
.status-select {
  padding: 4px 10px; border: 1px solid var(--border);
  border-radius: var(--radius); background: var(--surface);
  color: var(--text); font-size: 12.5px; font-family: inherit; cursor: pointer;
}
.status-select:focus { outline: none; border-color: var(--border-focus); }

/* Lock notice */
.contract-accordion-header { transition: background .12s; }
.contract-accordion-header:hover { background: var(--bg-alt); }

.accordion-chevron.expanded { transform: rotate(90deg); color: var(--primary-text); }

.contract-locked-banner {
  background: #fef3c7; border: 1px solid #fde68a;
  color: #92400e; border-radius: var(--radius); padding: 10px 14px;
  font-size: 12.5px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
}

/* Fieldset disabled: visually lock form but keep visible */
fieldset:disabled { opacity: .55; pointer-events: none; }

/* Doc row types */
.doc-row-contract:hover { background: rgba(109,40,217,.06) !important; }
.doc-row-addendum:hover { background: rgba(49,68,163,.06) !important; }
.doc-row-attachment:hover { background: rgba(22,163,74,.04) !important; }

/* Ext badge in table */
.ext-badge.ext-pdf  { background: #fee2e2; color: #991b1b; }
.ext-badge.ext-jpg, .ext-badge.ext-jpeg, .ext-badge.ext-png { background: #d1fae5; color: #065f46; }
.ext-badge.ext-docx, .ext-badge.ext-doc { background: #dbeafe; color: #1e40af; }

/* Addendum form */
.addendum-form {
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 14px; margin: 8px 0;
}
.signed-title { font-size: 12px; font-weight: 700; color: var(--text-2); display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.signed-upload-btn { display: inline-block; }
.signed-status { font-size: 12.5px; padding: 6px 10px; border-radius: 6px; margin-bottom: 8px; }
.signed-status.uploading { background: #eff6ff; color: #1d4ed8; }
.signed-status.error     { background: #fef2f2; color: #dc2626; }
.signed-empty { font-size: 13px; color: var(--text-muted); padding: 8px 0; }
.signed-list { display: flex; flex-direction: column; gap: 8px; }
.signed-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; background: var(--bg-alt);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
}
.signed-icon {
  width: 38px; height: 38px; border-radius: 7px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 800; letter-spacing: .03em; text-transform: uppercase;
  background: #fee2e2; color: #991b1b;
}
.signed-icon.ext-pdf  { background: #fee2e2; color: #991b1b; }
.signed-icon.ext-jpg, .signed-icon.ext-jpeg, .signed-icon.ext-png { background: #d1fae5; color: #065f46; }
.signed-icon.ext-docx, .signed-icon.ext-doc { background: #dbeafe; color: #1e40af; }
.signed-info { flex: 1; min-width: 0; }
.signed-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.signed-meta { font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }
.signed-actions { display: flex; gap: 6px; flex-shrink: 0; }
.text-danger { color: var(--danger, #dc2626) !important; }


/* ── Datenbogen Panel ── */
.datasheet-panel {
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  margin-bottom: 16px;
}
.datasheet-title {
  font-size: 13px; font-weight: 700; color: var(--text);
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 8px;
  margin-bottom: 12px;
}
.datasheet-hint { font-size: 11.5px; color: var(--text-muted); font-weight: 400; }
.datasheet-grid { display: flex; flex-direction: column; gap: 5px; }
.ds-row {
  display: grid; grid-template-columns: 180px 1fr;
  gap: 8px; font-size: 12.5px;
  padding: 4px 0; border-bottom: 1px solid var(--border);
}
.ds-row:last-child { border-bottom: none; }
.ds-label { color: var(--text-muted); font-weight: 600; }
.ds-val { color: var(--text); font-weight: 500; }

/* ── Inline Edit Card ── */
.fade-slide-enter-active, .fade-slide-enter-from { opacity: 0; transform: translateY(8px); }
.ie-header, /* ══ WORKFLOW PIPELINE ══ */
.wf-pipeline {
  display: flex; align-items: flex-start;
  gap: 0; margin-bottom: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl, 14px);
  overflow-x: auto; overflow-y: hidden;
  box-shadow: var(--shadow-sm);
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
  -webkit-overflow-scrolling: touch;
}
.wf-pipeline::-webkit-scrollbar { height: 3px; }
.wf-pipeline::-webkit-scrollbar-track { background: transparent; }
.wf-pipeline::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
.wf-step {
  flex: 1; display: flex; align-items: stretch;
  cursor: pointer; position: relative;
  min-width: 90px; max-width: 180px;
  transition: background .13s;
}
.wf-step:hover .wf-step-inner { background: var(--bg-alt); }
.wf-step.wf-active .wf-step-inner {
  background: var(--primary-light);
  border-bottom: 3px solid var(--primary);
}
.wf-step.wf-done .wf-icon {
  background: #dcfce7; color: #15803d;
}
.wf-step.wf-current .wf-icon {
  background: var(--primary); color: white;
}
.wf-step-inner {
  flex: 1; display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; transition: background .13s;
  border-right: 1px solid var(--border);
}
.wf-step:last-child .wf-step-inner { border-right: none; }
.wf-icon {
  width: 30px; height: 30px; flex-shrink: 0;
  border-radius: 50%;
  background: var(--bg-alt);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
  border: 1.5px solid var(--border);
  transition: all .15s;
}
.wf-step.wf-done .wf-icon { border-color: #86efac; }
.wf-step.wf-current .wf-icon { border-color: var(--primary); }
.wf-step-body { min-width: 0; }
.wf-label { font-size: 12px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wf-hint  { font-size: 10.5px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
.wf-step.wf-done .wf-label { color: #166534; }
.wf-step.wf-coming-soon { opacity: .45; cursor: default; }
.wf-step.wf-coming-soon .wf-label::after { content: " 🚧"; font-size: 9px; }
.wf-step.wf-active .wf-label { color: var(--primary); }
.wf-connector { display: none; } /* absorbed into border-right */

/* ── Pipe Panels ── */
.pipe-slide-enter-active, .pipe-slide-leave-active {
  transition: opacity .2s ease, transform .22s cubic-bezier(.32,.72,0,1);
}
.pipe-slide-enter-from, .pipe-slide-leave-to {
  opacity: 0; transform: translateY(-8px);
}

.pipe-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl, 14px);
  margin-bottom: 18px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(79,70,229,.08);
}
.pipe-panel-lg .pp-body { max-height: none; }

.pp-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 18px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white; font-size: 14px; font-weight: 700;
}
.pp-optional-tag {
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px;
  padding: 1px 6px; border-radius: 10px;
  background: rgba(79,70,229,.12); color: var(--primary-text);
  margin-left: 6px; vertical-align: middle;
}

.pp-close {
  background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25);
  color: white; width: 26px; height: 26px; border-radius: 50%;
  cursor: pointer; font-size: 12px;
  display: flex; align-items: center; justify-content: center;
}
.pp-close:hover { background: rgba(255,255,255,.28); }

.pp-body { padding: 16px 18px; }
.pp-2col {
  display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px;
}
.pp-row {
  display: flex; align-items: baseline; gap: 8px;
  padding: 5px 0; border-bottom: 1px solid var(--border); font-size: 13px;
}
.pp-row:last-child { border-bottom: none; }
.pp-lbl { color: var(--text-muted); flex-shrink: 0; font-size: 11.5px; min-width: 100px; }
.pp-val { color: var(--text); flex: 1; }
.fw7 { font-weight: 700; }
.pp-missing { color: #d97706; font-weight: 500; }

.pp-hint {
  padding: 10px 14px; border-radius: var(--radius); font-size: 13px;
  margin-bottom: 4px;
}
.pp-hint-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
.pp-hint-info    { background: var(--primary-light); color: var(--primary); border: 1px solid rgba(79,70,229,.15); }
.pp-hint-warn    { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }

.pp-foot {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  background: var(--bg-alt);
}
.pp-foot-hint { font-size: 11px; color: var(--text-muted); flex: 1; }

/* ── Billing ── */
.pp-section-title {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .07em; color: var(--text-muted);
  margin-bottom: 12px;
}
.pp-billing-block {
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  margin-bottom: 10px;
}
.pp-billing-head {
  font-size: 12px; font-weight: 700; color: var(--text);
  margin-bottom: 10px;
}
.pp-billing-row {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.pp-num-group {
  display: flex; align-items: center; gap: 4px;
}
.pp-num-input {
  width: 72px; padding: 6px 8px !important;
  font-size: 14px !important; font-weight: 700 !important;
  text-align: right;
}
.pp-num-unit {
  font-size: 11px; color: var(--text-muted); white-space: nowrap;
}
.pp-billing-op {
  font-size: 16px; color: var(--text-muted); font-weight: 700; padding: 0 2px;
}
.pp-billing-eq {
  font-size: 14px; font-weight: 700; color: var(--primary-text);
  margin-left: auto; white-space: nowrap;
  background: var(--primary-light); padding: 4px 10px; border-radius: var(--radius);
}
.pp-autofill-btn {
  margin-top: 8px; font-size: 11.5px; color: var(--primary-text);
  background: none; border: 1px dashed rgba(79,70,229,.4);
  border-radius: var(--radius); padding: 4px 10px; cursor: pointer; width: 100%;
}
.pp-autofill-btn:hover { background: var(--primary-light); }

.pp-toggle-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 99px; font-size: 13px; font-weight: 500;
  border: 1.5px solid var(--border); cursor: pointer;
  background: var(--surface); color: var(--text-2); transition: all .12s;
}
.pp-toggle-chip.active {
  background: #fef3c7; border-color: #fbbf24; color: #92400e;
}

.pp-extra-row {
  display: flex; gap: 8px; margin-bottom: 6px; align-items: center;
}
.pp-extra-desc {
  flex: 1; padding: 6px 8px !important; font-size: 13px !important;
}
.pp-extra-amt {
  width: 90px; padding: 6px 8px !important; font-size: 13px !important; text-align: right;
}
.pp-extra-del {
  background: none; border: none; color: var(--danger, #ef4444);
  cursor: pointer; font-size: 14px; padding: 4px;
}
.pp-add-extra-btn {
  width: 100%; padding: 6px; border: 1px dashed var(--border);
  background: none; border-radius: var(--radius); font-size: 12.5px;
  color: var(--primary-text); cursor: pointer; font-weight: 600; margin-top: 4px;
}
.pp-add-extra-btn:hover { background: var(--primary-light); }

.pp-billing-total {
  background: var(--surface);
  border: 2px solid var(--primary-light);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  margin-top: 14px;
}
.pp-total-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: var(--text-muted); margin-bottom: 8px;
}
.pp-total-row {
  display: flex; justify-content: space-between;
  font-size: 13px; padding: 4px 0;
  border-bottom: 1px solid var(--border);
  color: var(--text-2);
}
.pp-total-row:last-child { border-bottom: none; }
.pp-total-minus { color: #d97706; }
.pp-total-sum {
  display: flex; justify-content: space-between;
  font-size: 16px; font-weight: 800;
  padding: 10px 0 0; margin-top: 6px;
  border-top: 2px solid var(--border);
  color: var(--text);
}

@media (max-width: 900px) {
  .wf-pipeline { flex-direction: column; }
  .wf-step-inner { border-right: none; border-bottom: 1px solid var(--border); }
  .wf-step:last-child .wf-step-inner { border-bottom: none; }
  .pp-2col { grid-template-columns: 1fr; }
}


/* ── Quote versions list ── */
.quote-versions { display: flex; flex-direction: column; gap: 8px; }

/* qv-row: card per version */
.qv-row {
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 10px 12px;
  display: flex; flex-direction: column; gap: 8px;
  transition: border-color .15s, opacity .15s;
  position: relative;
}

/* ── Aktuelle Version: linker Akzentstreifen + leichter Hintergrund ── */
.qv-current {
  border-color: rgba(99,102,241,.35);
  background: rgba(99,102,241,.04);
  border-left: 3px solid rgba(99,102,241,.6);
  padding-left: 14px;
}

/* ── Alte Versionen: ausgeblendet + eingerückt ── */
.qv-old {
  opacity: .52;
  margin-left: 18px;
  background: var(--bg-alt);
  border-color: var(--border);
  border-left: 3px solid rgba(0,0,0,.1);
  padding-left: 14px;
}
.qv-old:hover { opacity: .75; }

/* ── Version-Tag Badges (Aktuell / Verworfen) ── */
.qv-version-tag {
  font-size: 9.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .4px; border-radius: 10px;
  padding: 2px 7px; border: 1px solid transparent; white-space: nowrap;
}
.qv-tag-current {
  background: rgba(99,102,241,.12); color: var(--primary);
  border-color: rgba(99,102,241,.25);
}
.qv-tag-old {
  background: rgba(0,0,0,.05); color: var(--text-muted);
  border-color: rgba(0,0,0,.1);
}
.qv-tag-signed {
  background: #f0fdf4; color: #166534;
  border-color: #bbf7d0;
}
.qv-done {
  border-color: rgba(22,163,74,.25);
  background: rgba(22,163,74,.03);
  border-left: 3px solid rgba(22,163,74,.5);
  padding-left: 14px;
}

/* Top row: number + amount + date */
.qv-top {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.qv-vnum   {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .3px; padding: 2px 6px; border-radius: 5px;
  background: var(--primary); color: white; flex-shrink: 0;
  min-width: 20px; text-align: center;
}
.qv-old .qv-vnum { background: var(--bg-alt); color: var(--text-muted); border: 1px solid var(--border); }
.qv-num    { font-size: 12.5px; font-weight: 700; color: var(--text); }
.qv-date   { font-size: 11px; color: var(--text-muted); margin-left: auto; }
.qv-amount { font-size: 13px; font-weight: 700; color: var(--primary-text); }
.qv-action-print    { color: var(--text-2); }
.qv-action-download { color: var(--text-2); }
.qv-action-revise   { color: var(--text-muted); }
.qv-action-print:hover    { color: var(--primary); background: rgba(99,102,241,.07); }
.qv-action-download:hover { color: #16a34a; background: rgba(22,163,74,.07); }
.qv-action-revise:hover   { color: var(--text); }

/* Bottom row: status pills + action buttons */
.qv-bottom {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.qv-actions { display: flex; gap: 4px; margin-left: auto; }

/* ── Status Pill-Buttons ── */
.qv-status-pills {
  display: flex; gap: 3px; flex-wrap: wrap;
}
.qv-pill {
  padding: 3px 10px; border-radius: 20px; border: 1.5px solid transparent;
  font-size: 10.5px; font-weight: 600; cursor: pointer; line-height: 1.4;
  background: var(--bg-alt); color: var(--text-muted);
  border-color: var(--border); opacity: .55;
  transition: opacity .12s, border-color .12s, background .12s, color .12s, box-shadow .12s;
  white-space: nowrap;
}
.qv-pill:not(:disabled):hover { opacity: .85; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.qv-pill:disabled { cursor: default; }
/* Active = current status */
.qv-pill-active.qv-pill-entwurf    { background: var(--bg-alt); color: var(--text-2); border-color: var(--border); opacity: 1; }
.qv-pill-active.qv-pill-versendet  { background: rgba(59,130,246,.12); color: #2563eb; border-color: rgba(59,130,246,.4); opacity: 1; }
.qv-pill-active.qv-pill-angenommen { background: var(--success-bg); color: var(--success); border-color: var(--success-border); opacity: 1; }
.qv-pill-active.qv-pill-abgelehnt  { background: var(--danger-bg);  color: var(--danger);  border-color: var(--danger-border);  opacity: 1; }
/* Inactive hover tints */
.qv-pill-angenommen:not(:disabled):not(.qv-pill-active):hover { background: rgba(5,150,105,.08); color: var(--success); border-color: var(--success-border); opacity: 1; }
.qv-pill-abgelehnt:not(:disabled):not(.qv-pill-active):hover  { background: rgba(239,68,68,.08);  color: var(--danger);  border-color: var(--danger-border);  opacity: 1; }
.qv-pill-versendet:not(:disabled):not(.qv-pill-active):hover  { background: rgba(59,130,246,.08); color: #2563eb; border-color: rgba(59,130,246,.3); opacity: 1; }

/* ── Quote Overview Layout (Sidebar + List) ── */
.qo-body { padding: 0 !important; }
.qo-layout {
  display: grid;
  grid-template-columns: 1fr 230px;
  min-height: 260px;
}
.qo-sidebar {
  background: var(--bg-alt);
  border-left: 1px solid var(--border);
  padding: 14px 13px;
  display: flex; flex-direction: column; gap: 0;
  overflow-y: auto;
  grid-column: 2; grid-row: 1; /* force same row as qo-main */
}
.qo-main { padding: 14px 18px; overflow-y: auto; grid-column: 1; grid-row: 1; }
.qo-sb-title {
  font-size: 9px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .8px; color: var(--text-muted); margin-bottom: 10px;
}
.qo-sb-section { padding: 8px 0; border-bottom: 1px solid var(--border); }
.qo-sb-section:last-child { border-bottom: none; }
.qo-sb-label {
  font-size: 9px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .7px; color: var(--text-muted); margin-bottom: 4px;
}
.qo-sb-occasion { font-size: 12px; font-weight: 700; color: var(--primary); margin-bottom: 3px; line-height: 1.3; }
.qo-sb-val   { font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.qo-sb-strong { font-size: 12px; font-weight: 700; color: var(--text); }
.qo-sb-row {
  display: flex; align-items: baseline; gap: 5px;
  font-size: 11.5px; color: var(--text-2); margin-bottom: 2px;
}
.qo-sb-key { color: var(--text-muted); font-size: 10px; flex-shrink: 0; }
.qo-sb-chips { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
.qo-sb-chip {
  font-size: 10.5px; padding: 1px 7px; border-radius: 10px;
  background: rgba(99,102,241,.1); color: var(--primary-text);
  border: 1px solid rgba(99,102,241,.15);
}
.qo-sb-notes { font-size: 11.5px; color: var(--text-2); line-height: 1.5; }
@media (max-width: 640px) {
  .qo-layout { grid-template-columns: 1fr; }
  .qo-sidebar { order: 1; border-left: none; border-top: 1px solid var(--border); }
}


/* ── Angebot-Status Bestätigungs-Popup ──────────────────────────────────── */
.qsc-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.qsc-dialog {
  background: var(--surface);
  border-radius: var(--radius-xl);
  box-shadow: 0 24px 60px rgba(0,0,0,.22), 0 4px 16px rgba(0,0,0,.12);
  padding: 28px 28px 24px;
  width: 100%; max-width: 380px;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  text-align: center;
  border-top: 4px solid transparent;
}
.qsc-dialog.success { border-top-color: var(--success); }
.qsc-dialog.danger  { border-top-color: var(--danger); }

.qsc-icon-wrap {
  width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px;
}
.qsc-dialog.success .qsc-icon-wrap { background: var(--success-bg); }
.qsc-dialog.danger  .qsc-icon-wrap { background: var(--danger-bg); }

.qsc-content { display: flex; flex-direction: column; gap: 6px; }
.qsc-title { font-size: 16px; font-weight: 700; color: var(--text); line-height: 1.3; }
.qsc-sub   { font-size: 13px; color: var(--text-2); line-height: 1.55; }
.qsc-warn  { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }

.qsc-actions { display: flex; gap: 10px; width: 100%; }
.qsc-actions .btn { flex: 1; justify-content: center; padding: 9px 14px; font-size: 13px; }

.btn-success { background: var(--success); color: #fff; border-color: var(--success); }
.btn-success:hover:not(:disabled) { filter: brightness(1.08); }
.btn-danger  { background: var(--danger);  color: #fff; border-color: var(--danger); }
.btn-danger:hover:not(:disabled)  { filter: brightness(1.08); }

/* Transition */
.qsc-fade-enter-active, .qsc-fade-leave-active { transition: opacity .18s ease; }
.qsc-fade-enter-from,   .qsc-fade-leave-to     { opacity: 0; }
.qsc-fade-enter-active .qsc-dialog { transition: transform .18s ease; }
.qsc-fade-enter-from   .qsc-dialog { transform: scale(.93) translateY(8px); }


/* ── Sidebar Edit-Button ── */
.qo-sb-edit-wrap {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.qo-sb-edit-btn {
  width: 100%;
  padding: 7px 10px;
  border-radius: var(--radius);
  border: 1.5px dashed var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, color .15s, border-color .15s;
}
.qo-sb-edit-btn:hover {
  background: rgba(99,102,241,.06);
  color: var(--primary-text);
  border-color: rgba(99,102,241,.35);
}

/* ── Sidebar Edit Popup form styles ── */
.qsc-dialog-form {
  text-align: left;
  padding: 0;
  gap: 0;
  border-top: none;
  overflow: hidden;
}
.qsc-form-header {
  padding: 20px 22px 14px;
  border-bottom: 1px solid var(--border);
  position: relative;
}
.qsc-form-title { font-size: 15px; font-weight: 700; color: var(--text); }
.qsc-form-sub   { font-size: 11.5px; color: var(--text-muted); margin-top: 3px; line-height: 1.4; }
.qsc-form-x {
  position: absolute; top: 16px; right: 16px;
  background: none; border: none; font-size: 16px;
  color: var(--text-muted); cursor: pointer; padding: 2px 6px;
  border-radius: var(--radius);
}
.qsc-form-x:hover { background: var(--bg-alt); }
.qsc-form-body {
  padding: 16px 22px;
  display: flex; flex-direction: column; gap: 12px;
  max-height: 60vh; overflow-y: auto;
}
.qsc-form-row { display: flex; flex-direction: column; gap: 4px; }
.qsc-form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.qsc-form-lbl  { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; }
.qsc-form-inp  {
  padding: 7px 10px; border-radius: var(--radius);
  border: 1.5px solid var(--border); background: var(--surface);
  font-size: 13px; color: var(--text); width: 100%; box-sizing: border-box;
  font-family: inherit;
}
.qsc-form-inp:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(99,102,241,.15); }
textarea.qsc-form-inp { resize: vertical; min-height: 70px; }
.qsc-chip-row { display: flex; gap: 5px; flex-wrap: wrap; }
.qsc-dialog-form .qsc-actions {
  padding: 14px 22px;
  border-top: 1px solid var(--border);
  justify-content: flex-end;
}


/* ── Signed contract versioning ────────────────────────────────────────────── */
.signed-version-badge {
  font-size: 9px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .5px; padding: 2px 7px; border-radius: 10px;
  flex-shrink: 0; align-self: center;
}
.sv-current {
  background: rgba(34,197,94,.12); color: #166534;
  border: 1px solid rgba(34,197,94,.25);
}
.sv-old {
  background: var(--surface-2); color: var(--text-muted);
  border: 1px solid var(--border);
}


/* ── Änderungsprotokoll (Sidebar) ─────────────────────────────────────────── */
.qo-sb-count {
  font-size: 9px; font-weight: 700;
  background: var(--primary); color: white;
  padding: 1px 5px; border-radius: 8px;
}
.acp-list { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.acp-entry {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 5px 7px;
}
.acp-ts {
  font-size: 9px; color: var(--text-muted); font-weight: 700;
  margin-bottom: 2px;
}
.acp-line {
  font-size: 10.5px; color: var(--text-2);
  display: flex; flex-wrap: wrap; align-items: center; gap: 3px;
  line-height: 1.4;
}
.acp-field { font-weight: 700; color: var(--text); }
.acp-from  { color: var(--text-muted); text-decoration: line-through; }
.acp-arrow { color: var(--primary); font-weight: 700; }
.acp-to    { color: #166534; font-weight: 600; }
.acp-more  { font-size: 10px; color: var(--text-muted); text-align: center; padding: 4px; }
.acp-auto-tag {
  font-size: 9px; font-weight: 700; color: var(--primary);
  background: rgba(99,102,241,.08);
  border: 1px solid rgba(99,102,241,.2);
  padding: 1px 5px; border-radius: 8px;
  margin-left: 5px;
}


/* ── Änderungslog Button in Sidebar ─────────────────────────────────────── */
.acp-log-btn {
  display: block; width: 100%; margin-top: 7px;
  font-size: 10.5px; font-weight: 700;
  background: var(--surface); border: 1px solid var(--border);
  color: var(--primary); border-radius: 6px;
  padding: 5px 8px; cursor: pointer; text-align: left;
  transition: background .15s;
}
.acp-log-btn:hover { background: rgba(99,102,241,.07); }
.acp-entry-compact { background: transparent; border: none; padding: 3px 0; }

/* ── Änderungslog Modal ──────────────────────────────────────────────────── */
.acl-dialog {
  width: min(580px, 95vw);
  max-height: 80vh;
  display: flex; flex-direction: column;
}
.acl-body {
  overflow-y: auto;
  flex: 1;
  padding: 0 20px 12px;
}
.acl-empty {
  padding: 32px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
.acl-date-header {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .7px; color: var(--text-muted);
  padding: 14px 0 6px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2px;
  position: sticky; top: 0;
  background: var(--surface);
}
.acl-entry {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 7px 0;
  border-bottom: 1px solid var(--bg-alt);
}
.acl-entry:last-child { border-bottom: none; }
.acl-time {
  font-size: 10px; font-weight: 700; color: var(--text-muted);
  min-width: 38px; padding-top: 1px;
}
.acl-content { flex: 1; }
.acl-field {
  font-size: 11px; font-weight: 800; color: var(--text);
  display: block; margin-bottom: 2px;
}
.acl-change {
  display: flex; flex-wrap: wrap; gap: 5px; align-items: center;
  font-size: 12px;
}
.acl-from  { color: var(--text-muted); text-decoration: line-through; }
.acl-arrow { color: var(--primary); font-weight: 900; }
.acl-to    { color: #166534; font-weight: 700; }

/* ── Kundenfoto KPI-Kachel ───────────────────────────────────────────────── */
.proj-kpi-photo {
  padding: 0 !important;
  overflow: hidden;
  min-width: 130px;
  height: 90px;          /* gleiche Höhe wie die anderen Kacheln */
  max-height: 90px;
  flex-shrink: 0;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

/* Linke Seite: Löschen */
.pkp-side {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-alt);
  border-right: 1px solid var(--border);
  gap: 6px;
  opacity: 0;
  transition: opacity .15s;
}
.proj-kpi-photo:hover .pkp-side { opacity: 1; }
.pkp-side-btn {
  background: none; border: none;
  color: var(--text-muted); font-size: 14px;
  cursor: pointer; padding: 4px;
  border-radius: var(--radius-sm);
  line-height: 1; transition: color .12s, background .12s;
}
.pkp-side-btn:hover { color: var(--danger, #dc2626); background: rgba(220,38,38,.08); }

.pkp-side-right {
  border-right: none;
  border-left: 1px solid var(--border);
}
.pkp-side-right .pkp-side-btn:hover { color: var(--primary); background: var(--primary-light); }

/* Mittelteil: Foto passt sich der Kachelhöhe an */
.pkp-img-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--bg-alt);
  min-width: 0;
}
.pkp-img {
  height: 100%;
  width: auto;
  max-width: 100%;
  object-fit: contain;
  display: block;
  transition: opacity .18s;
}
.pkp-img-center:hover .pkp-img { opacity: .88; }

/* Upload-Platzhalter */
.pkp-upload {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 3px;
  background: var(--bg-alt);
  border: 2px dashed var(--border);
  border-radius: inherit;
  cursor: pointer;
  transition: background .14s, border-color .14s;
}
.pkp-upload:hover { background: var(--primary-light); border-color: var(--primary); }
.pkp-upload-ico  { font-size: 22px; opacity: .45; }
.hero-loc-badge {
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(79,70,229,.09); color: var(--primary-text, #4338ca);
  border: 1px solid rgba(79,70,229,.18);
  border-radius: 20px; padding: 1px 9px; font-size: 11px; font-weight: 500;
  margin-left: 6px;
}
.hero-loc-cat {
  font-weight: 700; opacity: .75; font-size: 10px;
  text-transform: uppercase; letter-spacing: .04em;
  border-right: 1px solid rgba(79,70,229,.3); padding-right: 5px; margin-right: 1px;
}
/* Shooting-Termin Chips im Hero (BQ-6) */
.hero-shoot-chip {
  display: inline-flex; align-items: center; gap: 3px;
  background: rgba(16,185,129,.09); color: #065f46;
  border: 1px solid rgba(16,185,129,.25);
  border-radius: 20px; padding: 1px 9px; font-size: 11px; font-weight: 500;
  margin-left: 6px;
}
.hero-shoot-label {
  font-weight: 700; font-size: 10px; opacity: .8;
  text-transform: uppercase; letter-spacing: .04em;
  border-left: 1px solid rgba(16,185,129,.3); padding-left: 5px; margin-left: 3px;
}
.pkp-upload-txt  { font-size: 11.5px; font-weight: 700; color: var(--text-2); }
.pkp-upload-hint { font-size: 10px; color: var(--text-muted); }
.pkp-loading {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.7); font-size: 18px;
}


/* ── Lightbox ──────────────────────────────────────────────────────────── */
.photo-lb-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.88);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.photo-lb-box {
  position: relative;
  max-width: min(92vw, 1100px);
  max-height: 90vh;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.photo-lb-img {
  max-width: 100%; max-height: calc(90vh - 60px);
  object-fit: contain;
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 8px 48px rgba(0,0,0,.6);
}
.photo-lb-caption {
  color: rgba(255,255,255,.55); font-size: 12px;
}
.photo-lb-close {
  position: absolute; top: -14px; right: -14px;
  background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25);
  color: white; width: 32px; height: 32px; border-radius: 50%;
  cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: background .12s;
  z-index: 1;
}
.photo-lb-close:hover { background: rgba(255,255,255,.3); }


/* ── Vertrag Versions-Übersicht (cv = contract version) ───────────────── */
.cv-versions-wrap { display: flex; flex-direction: column; gap: 6px; }
.cv-empty {
  padding: 18px 16px; background: var(--bg-alt); border: 1px dashed var(--border);
  border-radius: var(--radius); font-size: 13px; color: var(--text-muted);
  text-align: center;
}
.cv-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface);
  transition: background .12s;
}
.cv-row:hover { background: var(--bg-alt); }
.cv-current { border-color: var(--primary); background: var(--primary-light); }
.cv-current:hover { background: #e0e7ff; }
.cv-old { opacity: .7; }
.cv-version-badge {
  flex-shrink: 0; font-size: 10px; font-weight: 800; padding: 2px 7px;
  border-radius: 999px; letter-spacing: .4px;
}
.sv-current { background: var(--primary); color: white; }
.sv-old     { background: var(--bg-alt); color: var(--text-muted); border: 1px solid var(--border); }
.cv-icon {
  flex-shrink: 0; width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm); font-size: 10px; font-weight: 800;
  background: #e5e7eb; color: #374151;
}
.cv-icon.ext-pdf { background: #fee2e2; color: #b91c1c; }
.cv-icon.ext-jpg, .cv-icon.ext-jpeg, .cv-icon.ext-png { background: #dbeafe; color: #1d4ed8; }
.cv-info { flex: 1; min-width: 0; }
.cv-name { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cv-meta { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
.cv-actions { display: flex; gap: 4px; flex-shrink: 0; }


/* ── Notizen KPI Kachel ──────────────────────────────────────────────────── */
.proj-kpi-notes {
  cursor: pointer;
  transition: box-shadow .15s, border-color .15s;
  min-width: 88px;
  position: relative;
}
.proj-kpi-notes:hover {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(99,102,241,.12);
}
.pkn-val {
  display: flex; align-items: center; justify-content: center;
  min-height: 28px;
}
.pkn-count {
  font-size: 22px; font-weight: 800; color: var(--primary-text);
  line-height: 1;
}
.pkn-empty-ico { font-size: 20px; opacity: .5; }
.pkn-preview {
  font-size: 9.5px; color: var(--text-muted);
  margin-top: 2px; line-height: 1.3;
  max-width: 100%; overflow: hidden;
  white-space: nowrap; text-overflow: ellipsis;
}

/* ── Projektnotizen Modal ────────────────────────────────────────────────── */
.pnm-dialog {
  width: clamp(480px, 70vw, 900px) !important;
  max-width: none !important;
  max-height: min(70vh, 900px) !important;
  height: auto !important;
  display: flex !important; flex-direction: column !important;
  align-items: stretch !important;
  text-align: left !important;
  padding: 0 !important;
  gap: 0 !important;
}
.pnm-body {
  display: flex; flex-direction: column; gap: 0;
  overflow-y: auto; flex: 1;
  padding: 16px 20px;
  min-height: 120px;
}
.pnm-compose {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.pnm-compose-ts {
  font-size: 11px; color: var(--text-muted); font-weight: 700;
  margin-bottom: 6px;
}
.pnm-ta {
  width: 100%; box-sizing: border-box;
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 9px 11px;
  font-size: 13px; color: var(--text); resize: vertical;
  font-family: inherit; line-height: 1.5;
  transition: border-color .15s;
}
.pnm-ta:focus { outline: none; border-color: var(--primary); }
.pnm-compose-foot {
  display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;
}
.pnm-list { display: flex; flex-direction: column; gap: 10px; }
.pnm-empty {
  text-align: center; color: var(--text-muted);
  font-size: 13px; padding: 32px 0;
}
.pnm-note {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 11px 13px;
  transition: border-color .15s;
}
.pnm-note:hover { border-color: rgba(99,102,241,.3); }
.pnm-note-editing { border-color: var(--primary) !important; }
.pnm-meta {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 6px;
}
.pnm-ts { font-size: 10px; font-weight: 700; color: var(--text-muted); }
.pnm-edited { font-size: 10px; font-style: italic; color: var(--text-muted); }
.pnm-text { font-size: 13px; color: var(--text); line-height: 1.55; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word; }
.pnm-actions {
  display: flex; gap: 6px; justify-content: flex-end;
  margin-top: 8px;
}


/* ── Anzahlungs-Abfrage Popup ───────────────────────────────────────────────── */
.proj-kpi-clickable { cursor: pointer; }
.proj-kpi-clickable:hover {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(99,102,241,.12);
}
.proj-kpi-docs { position: relative; }
.proj-kpi-icon { font-size: 22px; margin-bottom: 4px; }

/* ── Dokumente Modal ─────────────────────────────────────────────────────── */
.pdm-dialog {
  background: var(--surface);
  border-radius: var(--radius-xl);
  box-shadow: 0 24px 60px rgba(0,0,0,.22), 0 4px 16px rgba(0,0,0,.12);
  width: clamp(560px, 70vw, 1100px);
  max-height: 84vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  text-align: left;
}
.pdm-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.pdm-title { font-size: 15px; font-weight: 700; color: var(--text); }
.pdm-close {
  background: none; border: none; font-size: 16px;
  color: var(--text-muted); cursor: pointer; padding: 2px 6px;
  border-radius: var(--radius);
}
.pdm-close:hover { background: var(--bg-alt); }

/* Shared header for form-style dialogs (Changelog, Notizen, etc.) */
.qsc-dialog-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 15px; font-weight: 700; color: var(--text);
  flex-shrink: 0;
}
.pdm-body {
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
}
.pdm-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 40px 20px;
  font-size: 14px;
}
.pdm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
}
.pdm-table th {
  padding: 8px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  background: var(--bg-alt);
  position: sticky;
  top: 0;
  z-index: 1;
}
.pdm-table th.text-right { text-align: right; }
.pdm-row {
  cursor: pointer;
  transition: background .1s;
  border-bottom: 1px solid var(--border);
}
.pdm-row:last-child { border-bottom: none; }
.pdm-row:hover { background: rgba(99,102,241,.04); }
.pdm-row td { padding: 9px 12px; vertical-align: middle; }
.pdm-row td.text-right { text-align: right; }
.pdm-row-contract { background: rgba(109,40,217,.025); }
.pdm-row-contract:hover { background: rgba(109,40,217,.06) !important; }
.pdm-row-attachment { background: rgba(22,163,74,.02); border-left: 3px solid rgba(22,163,74,.2); cursor: default; }
.pdm-row-attachment:hover { background: rgba(22,163,74,.04) !important; }
.pdm-row-addendum { background: rgba(49,68,163,.025); }
.pdm-row-addendum:hover { background: rgba(49,68,163,.06) !important; }


/* ── iqf-header / footer / x (contract form header — mirrors InlineQuoteForm) ── */
.iqf-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 14px 20px 12px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white; flex-shrink: 0;
}
.iqf-header-left  { flex: 1; min-width: 0; }
.iqf-header-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.iqf-title { font-size: 15px; font-weight: 700; }
.iqf-sub   { font-size: 12px; opacity: .72; margin-top: 3px; }
.iqf-live-total  { display: flex; flex-direction: column; align-items: flex-end; }
.iqf-live-label  { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; opacity: .75; }
.iqf-live-amount { font-size: 15px; font-weight: 800; }
.iqf-error-tag   { font-size: 11.5px; color: #fca5a5; background: rgba(239,68,68,.2); border-radius: 6px; padding: 3px 10px; white-space: nowrap; }
.iqf-x {
  background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.25);
  color: white; width: 26px; height: 26px; border-radius: 50%;
  cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background .12s;
}
.iqf-x:hover { background: rgba(255,255,255,.28); }
.iqf-footer {
  display: flex; justify-content: flex-end; gap: 10px; align-items: center;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface); flex-shrink: 0;
}


/* ══ Manuell-Position Popup ════════════════════════════════════════════════ */
.mpop-dialog { max-width: 480px !important; width: min(480px, 96vw); }
.mpop-preview {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: rgba(99,102,241,.06);
  border: 1px solid rgba(99,102,241,.15); border-radius: var(--radius);
  margin-top: 4px;
}
.mpop-preview-lbl { font-size: 11.5px; color: var(--text-muted); }
.mpop-preview-val { font-size: 15px; font-weight: 800; color: var(--primary); }

/* ══ Zahlungseingang Popup ══════════════════════════════════════════════════ */
.ppop-dialog { max-width: 400px !important; width: min(400px, 96vw); }
.ppop-method-row {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
  margin-top: 4px;
}
.ppop-method-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 6px; border: 1.5px solid var(--border);
  border-radius: var(--radius-lg, 10px); background: var(--surface);
  cursor: pointer; transition: all .14s; font-family: inherit;
}
.ppop-method-btn:hover  { border-color: var(--primary); background: rgba(99,102,241,.05); }
.ppop-method-btn.active { border-color: var(--primary); background: rgba(99,102,241,.1); box-shadow: 0 0 0 2px rgba(99,102,241,.18); }
.ppop-method-icon { font-size: 20px; }
.ppop-method-lbl  { font-size: 11px; font-weight: 600; color: var(--text-2); white-space: nowrap; }
.ppop-method-btn.active .ppop-method-lbl { color: var(--primary); }
.ppop-error {
  padding: 8px 11px; background: rgba(239,68,68,.08);
  border: 1px solid rgba(239,68,68,.2); border-radius: var(--radius);
  font-size: 12.5px; color: #b91c1c;
}
.qsc-inp-error { border-color: var(--danger, #ef4444) !important; }


/* ── Zahlungsinfo in Rechnung-Row ── */
.qv-paid-info {
  display: flex; align-items: center; gap: 6px;
  font-size: 11.5px; color: #166534;
  background: #f0fdf4; border-radius: var(--radius);
  padding: 3px 8px; margin-top: 2px;
  border: 1px solid #bbf7d0;
}
.qv-paid-icon { font-size: 11px; }
.qv-paid-method { font-weight: 600; }
</style>

