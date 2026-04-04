<template>
<div class="pipe-panel pipe-panel-lg" key="vertrag">

          <div class="pipe-transition">

            <!-- ══ FORMULAR-VIEW: Vertrag erstellen / bearbeiten ══════════════ -->
            <div v-if="contractStore.contractFormOpen" key="contract-form">
              <!-- iqf-style header: lila Gradient wie Angebotsformular -->
              <div class="iqf-header">
                <div class="iqf-header-left">
                  <div class="iqf-title">
                    {{ contractFormIsNew ? '📝 Neuer Vertrag' : '✏️ Vertrag bearbeiten' }}
                  </div>
                  <div class="iqf-sub" v-if="project">
                    {{ project.contractData?.occasion || project.projectName }}
                    <span v-if="customerName"> · {{ customerName }}</span>
                  </div>
                </div>
                <div class="iqf-header-right">
                  <div v-if="contractStore.contractForm.flatRate || contractStore.contractForm.hourlyRate" class="iqf-live-total">
                    <span class="iqf-live-label">Honorar</span>
                    <span class="iqf-live-amount">
                      {{ contractStore.contractForm.pricingModel === 'flat'
                          ? formatCurrency(contractStore.contractForm.flatRate)
                          : contractStore.contractForm.pricingModel === 'hourly' && contractStore.contractForm.hourlyRate && contractStore.contractForm.estimatedHours
                            ? formatCurrency(contractStore.contractForm.hourlyRate * contractStore.contractForm.estimatedHours)
                            : (contractStore.contractForm.hourlyRate ? contractStore.contractForm.hourlyRate + ' €/h' : '') }}
                    </span>
                  </div>
                  <span v-if="contractStore.contractLocked" class="iqf-error-tag">🔒 Gesperrt</span>
                </div>
              </div>

              <div class="pp-body qo-body" style="padding:0">
                <div class="qo-layout">
                  <!-- ═══ Linke Spalte: Auftragsübersicht ═══════════════ -->
                  <aside class="qo-sidebar">
                    <div class="qo-sb-title">📁 Auftragsübersicht</div>

                    <div v-if="project" class="qo-sb-section">
                      <div class="qo-sb-label">Auftrag</div>
                      <div class="qo-sb-occasion">{{ project.contractData?.occasion || project.projectName }}</div>
                      <div class="qo-sb-row" v-if="project.booking">
                        <span class="qo-sb-key">📅</span>
                        <span>{{ formatDate(project.booking) }}{{ project.bookingTime ? ' · ' + project.bookingTime : '' }}</span>
                      </div>
                      <div class="qo-sb-row" v-if="project.location">
                        <span class="qo-sb-key">📍</span><span>{{ project.location }}</span>
                      </div>
                      <div class="qo-sb-row" v-if="project.category">
                        <span class="qo-sb-key">🏷</span><span>{{ project.category }}</span>
                      </div>
                    </div>

                    <div v-if="customer" class="qo-sb-section">
                      <div class="qo-sb-label">Kunde</div>
                      <div class="qo-sb-val">{{ [customer.salutation, customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') }}</div>
                      <div v-if="customer.company" class="qo-sb-row"><span class="qo-sb-key">🏢</span><span>{{ customer.company }}</span></div>
                      <div v-if="customer.email" class="qo-sb-row"><span class="qo-sb-key">✉️</span><span style="word-break:break-all">{{ customer.email }}</span></div>
                      <div v-if="customer.phone" class="qo-sb-row"><span class="qo-sb-key">📞</span><span>{{ customer.phone }}</span></div>
                    </div>

                    <div class="qo-sb-section" v-if="project.fotografie||project.videografie||project.glueckwunschkarten||project.gettingReadyEr||project.gettingReadySie||project.gettingReadyBeide">
                      <div class="qo-sb-label">Leistungen</div>
                      <div class="qo-sb-chips">
                        <span v-if="project.fotografie"         class="qo-sb-chip">📷 Foto</span>
                        <span v-if="project.videografie"        class="qo-sb-chip">🎬 Video</span>
                        <span v-if="project.glueckwunschkarten" class="qo-sb-chip">💌 Karten</span>
                        <span v-if="project.gettingReadyEr"     class="qo-sb-chip">💄 GR Er</span>
                        <span v-if="project.gettingReadySie"    class="qo-sb-chip">💄 GR Sie</span>
                        <span v-if="project.gettingReadyBeide"  class="qo-sb-chip">💄 GR Beide</span>
                      </div>
                    </div>

                    <div v-if="project.contractData" class="qo-sb-section">
                      <div class="qo-sb-label">Honorar</div>
                      <template v-if="project.contractData.pricingModel === 'hourly' && project.contractData.hourlyRate">
                        <div class="qo-sb-row">
                          <span class="qo-sb-key">💰</span>
                          <span class="qo-sb-strong">{{ project.contractData.hourlyRate }} €/h<span v-if="project.contractData.estimatedHours"> × {{ project.contractData.estimatedHours }} h</span></span>
                        </div>
                      </template>
                      <template v-else-if="project.contractData.pricingModel === 'flat' && project.contractData.flatRate">
                        <div class="qo-sb-row"><span class="qo-sb-key">💰</span><span class="qo-sb-strong">{{ formatCurrency(project.contractData.flatRate) }} Pauschal</span></div>
                      </template>
                      <template v-else-if="project.contractData.customPriceText">
                        <div class="qo-sb-row"><span class="qo-sb-key">💰</span><span>{{ project.contractData.customPriceText }}</span></div>
                      </template>
                      <div class="qo-sb-row" v-if="project.contractData.depositAmount">
                        <span class="qo-sb-key">💶</span><span>Anzahlung {{ formatCurrency(project.contractData.depositAmount) }}</span>
                      </div>
                      <div class="qo-sb-row" v-if="project.contractData.paymentDueDays">
                        <span class="qo-sb-key">🗓</span><span>Zahlung in {{ project.contractData.paymentDueDays }} Tagen</span>
                      </div>
                      <div class="qo-sb-row" v-if="project.contractData.deliveryWeeks">
                        <span class="qo-sb-key">📦</span><span>Lieferung in {{ project.contractData.deliveryWeeks }} Wo.</span>
                      </div>
                    </div>

                    <!-- Änderungsprotokoll -->
                    <div v-if="pdStore.auftragChangelog.length" class="qo-sb-section">
                      <div class="qo-sb-label" style="display:flex;align-items:center;justify-content:space-between">
                        <span>🕐 Letzte Änderung</span>
                        <span class="qo-sb-count">{{ pdStore.auftragChangelog.length }}</span>
                      </div>
                      <div class="acp-entry acp-entry-compact">
                        <div class="acp-ts">{{ formatDateTime(pdStore.auftragChangelogSorted[0].ts) }}</div>
                        <div class="acp-line">
                          <span class="acp-field">{{ pdStore.auftragChangelogSorted[0].label }}:</span>
                          <span class="acp-from">{{ formatChangelogVal(pdStore.auftragChangelogSorted[0].from) }}</span>
                          <span class="acp-arrow">→</span>
                          <span class="acp-to">{{ formatChangelogVal(pdStore.auftragChangelogSorted[0].to) }}</span>
                        </div>
                      </div>
                      <button class="acp-log-btn" @click="pdStore.showChangelogModal = true">
                        📋 Änderungslog ({{ pdStore.auftragChangelog.length }})
                      </button>
                    </div>

                    <div class="qo-sb-edit-wrap">
                      <button class="qo-sb-edit-btn" @click="openSidebarEdit">✏️ Auftrag anpassen</button>
                    </div>
                  </aside>

                  <!-- ═══ Rechte Spalte: Formular ═══════════════════════════ -->
                  <div class="qo-main">
                <!-- Warnungen -->
                <div v-if="pdStore.requireConsult && pdStore.consultation.clientAccepted !== true" class="pp-hint pp-hint-danger" style="margin-bottom:12px">
                  ⛔ Vorgespräch erforderlich.
                  <button class="link-btn" style="display:block;margin-top:4px;font-weight:700" @click="navigate('vorgespräch')">→ Zum Vorgespräch</button>
                </div>
                <div v-if="contractStore.contractLocked" class="contract-locked-banner" style="margin-bottom:12px">
                  🔒 Dieser Vertrag ist unterschrieben und gesperrt. Änderungen nur über Vertragsnachträge möglich.
                </div>

                <!-- Datenbogen Toggle -->
                <div v-if="contractStore.contractTemplate" style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">
                  <button class="btn btn-sm btn-ghost" @click="contractStore.showDataSheet = !contractStore.showDataSheet">📋 Datenbogen</button>
                  <a :href="`${API_BASE}${contractStore.contractTemplate.url}`" target="_blank" class="btn btn-sm btn-secondary">⬇️ Vorlage</a>
                </div>
                <div v-if="contractStore.contractTemplate && contractStore.showDataSheet" class="datasheet-panel" style="margin-bottom:16px">
                  <div class="datasheet-title">
                    📋 Datenbogen – Werte zum Eintragen in die Vorlage
                    <span class="datasheet-hint">Vorlage: {{ contractStore.contractTemplate.originalName }}</span>
                  </div>
                  <div class="datasheet-grid" v-if="project">
                    <div class="ds-row"><span class="ds-label">Anlass / Projekt</span><span class="ds-val">{{ contractStore.contractForm.occasion || project.projectName }}</span></div>
                    <div class="ds-row"><span class="ds-label">Datum</span><span class="ds-val">{{ fmtDate(project.booking) }}</span></div>
                    <div class="ds-row"><span class="ds-label">Uhrzeit</span><span class="ds-val">{{ project.bookingTime || '—' }}</span></div>
                    <div class="ds-row"><span class="ds-label">Ort</span><span class="ds-val">{{ project.location || '—' }}</span></div>
                    <div class="ds-row" v-if="customer"><span class="ds-label">Kunde</span><span class="ds-val">{{ customer.salutation }} {{ customer.title }} {{ customer.firstName }} {{ customer.lastName }}</span></div>
                    <div class="ds-row" v-if="customer?.company"><span class="ds-label">Firma</span><span class="ds-val">{{ customer.company }}</span></div>
                    <div class="ds-row" v-if="customer"><span class="ds-label">Adresse</span><span class="ds-val">{{ customer.street }} {{ customer.houseNumber }}, {{ customer.zipCode }} {{ customer.city }}</span></div>
                    <div class="ds-row" v-if="customer?.phone"><span class="ds-label">Telefon</span><span class="ds-val">{{ customer.phone }}</span></div>
                    <div class="ds-row" v-if="customer?.email"><span class="ds-label">E-Mail</span><span class="ds-val">{{ customer.email }}</span></div>
                    <div class="ds-row"><span class="ds-label">Anzahlung</span><span class="ds-val">{{ contractStore.contractForm.depositAmount ? contractStore.contractForm.depositAmount + ' €' : '—' }}</span></div>
                    <div class="ds-row"><span class="ds-label">Veröffentlichung</span><span class="ds-val">{{ { allowed: 'Gestattet', conditional: 'Nach Absprache', denied: 'Nicht gestattet' }[contractStore.contractForm.publicationPermission] }}</span></div>
                    <div class="ds-row" v-if="contractStore.contractForm.usageType !== 'private'"><span class="ds-label">Kundenstatus</span><span class="ds-val">B2B / Kommerziell</span></div>
                    <div class="ds-row" v-if="contractStore.contractForm.usageType === 'commercial' && project?.contractData?.usageRightsSurcharge > 0"><span class="ds-label">NR-Zuschlag</span><span class="ds-val">+ {{ formatCurrency(project.contractData.usageRightsSurcharge) }}</span></div>
                    <div class="ds-row" v-if="contractStore.contractForm.equipmentDamageClause"><span class="ds-label">Ausrüstungsschadenklausel</span><span class="ds-val">✅ Aktiviert</span></div>
                    <div class="ds-row" v-if="contractStore.contractForm.selectedSpecialClauses?.length"><span class="ds-label">Sondervereinbarungen</span><span class="ds-val">{{ contractStore.contractForm.selectedSpecialClauses.length }} aktiviert</span></div>
                    <div class="ds-row" v-if="contractStore.contractForm.customSpecialClauses"><span class="ds-label">Individuelle Vereinbarungen</span><span class="ds-val">{{ contractStore.contractForm.customSpecialClauses }}</span></div>
                  </div>
                </div>

                <!-- Vertragsklauseln -->
                <fieldset :disabled="contractStore.contractLocked" class="contract-form" style="border:none;padding:0;min-width:0">

                  <!-- ── Card: Leistungen ── -->
                  <div class="s-card">
                    <div class="s-card-head">
                      <span class="s-card-title">🎯 Leistungsumfang</span>
                      <span class="s-card-sub">Vorbelegt aus der Anfrage — hier anpassbar</span>
                    </div>
                    <div class="s-card-body">
                      <div class="cf-service-chips">
                        <label class="cf-svc-chip" :class="{ active: contractStore.contractForm.fotografie }">
                          <input type="checkbox" v-model="contractStore.contractForm.fotografie" style="display:none" />
                          📷 Fotografie
                        </label>
                        <label class="cf-svc-chip" :class="{ active: contractStore.contractForm.videografie }">
                          <input type="checkbox" v-model="contractStore.contractForm.videografie" style="display:none" />
                          🎬 Videografie
                        </label>
                        <label class="cf-svc-chip" :class="{ active: contractStore.contractForm.glueckwunschkarten }">
                          <input type="checkbox" v-model="contractStore.contractForm.glueckwunschkarten" style="display:none" />
                          💌 Danksagungskarten
                        </label>
                        <label class="cf-svc-chip" :class="{ active: contractStore.contractForm.gettingReadyEr }">
                          <input type="checkbox" v-model="contractStore.contractForm.gettingReadyEr" style="display:none" />
                          💄 Getting Ready Er
                        </label>
                        <label class="cf-svc-chip" :class="{ active: contractStore.contractForm.gettingReadySie }">
                          <input type="checkbox" v-model="contractStore.contractForm.gettingReadySie" style="display:none" />
                          💄 Getting Ready Sie
                        </label>
                        <label class="cf-svc-chip" :class="{ active: contractStore.contractForm.gettingReadyBeide }">
                          <input type="checkbox" v-model="contractStore.contractForm.gettingReadyBeide" style="display:none" />
                          💄 Getting Ready Beide
                        </label>
                      </div>
                    </div>
                  </div>

                  <!-- ── Card: Nutzungsrechte & Veröffentlichung ── -->
                  <div class="s-card">
                    <div class="s-card-head">
                      <span class="s-card-title">📸 Nutzungsrechte & Veröffentlichung</span>
                    </div>
                    <div class="s-card-body">
                      <div class="cf-grid cf-grid-2" style="margin-bottom:14px">
                        <div class="fg">
                          <label>Veröffentlichungsfreigabe (Fotograf darf Bilder nutzen für…)</label>
                          <div class="cf-radio-chips">
                            <label class="cf-chip" :class="{ active: contractStore.contractForm.publicationPermission === 'allowed' }">
                              <input type="radio" v-model="contractStore.contractForm.publicationPermission" value="allowed" style="display:none" />
                              ✅ Vollständig gestattet
                            </label>
                            <label class="cf-chip" :class="{ active: contractStore.contractForm.publicationPermission === 'conditional' }">
                              <input type="radio" v-model="contractStore.contractForm.publicationPermission" value="conditional" style="display:none" />
                              💬 Nach Absprache
                            </label>
                            <label class="cf-chip" :class="{ active: contractStore.contractForm.publicationPermission === 'denied' }">
                              <input type="radio" v-model="contractStore.contractForm.publicationPermission" value="denied" style="display:none" />
                              🚫 Nicht gestattet
                            </label>
                          </div>
                        </div>
                        <div class="fg">
                          <label>Kundenstatus</label>
                          <div class="cf-radio-chips">
                            <label class="cf-chip" :class="{ active: contractStore.contractForm.usageType === 'private' }">
                              <input type="radio" v-model="contractStore.contractForm.usageType" value="private" style="display:none" />
                              🏠 Privatkunde
                            </label>
                            <label class="cf-chip" :class="{ active: contractStore.contractForm.usageType === 'commercial' }">
                              <input type="radio" v-model="contractStore.contractForm.usageType" value="commercial" style="display:none" />
                              🏢 B2B / Kommerziell
                            </label>
                          </div>
                        </div>
                      </div>

                      <!-- ── Werbliche Nutzungsrechte aus der Anfrage ── -->
                      <template v-if="contractStore.contractForm.usageType === 'commercial' && project?.contractData?.usageRights?.enabled">
                        <div class="cf-separator"></div>
                        <p class="cf-section-label">©️ Werbliche Nutzungsrechte — aus Anfrage übernommen</p>

                        <div class="nr-vertrag-info">

                          <!-- Simple Mode -->
                          <template v-if="(settingsData?.bookingTerms?.usageRightsMode || 'simple') === 'simple' && project.contractData.simpleNr">
                            <div class="nr-vi-row" v-if="project.contractData.simpleNr.categories?.length">
                              <span class="nr-vi-label">Nutzungsarten</span>
                              <div class="nr-vi-chips">
                                <span v-for="cat in project.contractData.simpleNr.categories" :key="cat" class="nr-vi-chip">
                                  {{ {print:'🖨 Print / OOH', online:'🌐 Online / Social', tv:'📺 TV / Video', pr:'📰 PR / Redaktion'}[cat] || cat }}
                                </span>
                              </div>
                            </div>
                            <div class="nr-vi-row" v-if="project.contractData.simpleNr.duration">
                              <span class="nr-vi-label">Laufzeit</span>
                              <span class="nr-vi-val">{{ project.contractData.simpleNr.duration }}</span>
                            </div>
                            <div class="nr-vi-row" v-if="project.contractData.simpleNr.scope">
                              <span class="nr-vi-label">Geltungsbereich</span>
                              <span class="nr-vi-val">{{ {regional:'Regional', national:'National (D/AT/CH)', international:'International / Global'}[project.contractData.simpleNr.scope] }}</span>
                            </div>
                            <div class="nr-vi-row nr-vi-row--highlight" v-if="project.contractData.usageRightsSurcharge > 0">
                              <span class="nr-vi-label">NR-Zuschlag</span>
                              <span class="nr-vi-surcharge">+ {{ formatCurrency(project.contractData.usageRightsSurcharge) }}</span>
                            </div>
                          </template>

                          <!-- designaustria Mode -->
                          <template v-else-if="project.contractData.usageRights">
                            <div class="nr-vi-row">
                              <span class="nr-vi-label">Nutzungsart</span>
                              <span class="nr-vi-val">{{ {0:'Kein Nutzungsrecht', 1:'Zweckgebundenes Werknutzungsrecht', 1.5:'Werknutzungsrecht ohne Zweckbindung', 3:'Daten-/Bearbeitungsrecht'}[project.contractData.usageRights.nutzungsart] || project.contractData.usageRights.nutzungsart }}</span>
                            </div>
                            <div class="nr-vi-row">
                              <span class="nr-vi-label">Thema</span>
                              <span class="nr-vi-val">{{ {1:'Branding / CD', 0.75:'Produkt-Werbung', 0.5:'Unternehmenskommunikation'}[project.contractData.usageRights.thema] }}</span>
                            </div>
                            <div class="nr-vi-row">
                              <span class="nr-vi-label">Geltungsgebiet</span>
                              <span class="nr-vi-val">{{ {0.5:'Lokal', 0.75:'Regional', 1:'National', 1.5:'Europaweit', 2:'Weltweit'}[project.contractData.usageRights.gebiet] }}</span>
                            </div>
                            <div class="nr-vi-row">
                              <span class="nr-vi-label">Laufzeit</span>
                              <span class="nr-vi-val">{{ {0.75:'Einmalig', 1:'1 Jahr', 1.5:'Dauernutzung / Buyout'}[project.contractData.usageRights.zeitraum] }}</span>
                            </div>
                            <div class="nr-vi-row">
                              <span class="nr-vi-label">Auftragsart</span>
                              <span class="nr-vi-val">{{ {0.75:'Folgeauftrag', 1:'Rahmenvereinbarung', 1.5:'Einzelauftrag'}[project.contractData.usageRights.auftragsart] }}</span>
                            </div>
                            <div class="nr-vi-row">
                              <span class="nr-vi-label">Kalkulations-Faktor</span>
                              <span class="nr-vi-val">{{ ((project.contractData.usageRights.thema||1) * (project.contractData.usageRights.bedeutung||1) * (project.contractData.usageRights.gebiet||1) * (project.contractData.usageRights.zeitraum||1) * (project.contractData.usageRights.nutzungsart||1) * (project.contractData.usageRights.auftragsart||1)).toFixed(3) }} <span style="font-size:11px;color:var(--text-muted)">(designaustria)</span></span>
                            </div>
                            <div class="nr-vi-row nr-vi-row--highlight" v-if="project.contractData.usageRightsSurcharge > 0">
                              <span class="nr-vi-label">NR-Zuschlag</span>
                              <span class="nr-vi-surcharge">+ {{ formatCurrency(project.contractData.usageRightsSurcharge) }}</span>
                            </div>
                          </template>

                          <div class="nr-vi-note">
                            ℹ Konfiguriert in der Anfrage — hier nur zur Anzeige. Änderungen über „Anfrage bearbeiten".
                          </div>
                        </div>
                      </template>

                      <!-- B2B ohne NR -->
                      <template v-else-if="contractStore.contractForm.usageType === 'commercial' && !project?.contractData?.usageRights?.enabled">
                        <div class="cf-separator"></div>
                        <div style="font-size:12.5px;color:var(--text-muted);padding:8px 0;font-style:italic">
                          Keine werblichen Nutzungsrechte in der Anfrage konfiguriert.
                        </div>
                      </template>

                    </div>
                  </div>

                  <!-- ── Card: Klauseln & Sondervereinbarungen ── -->
                  <div class="s-card">
                    <div class="s-card-head">
                      <span class="s-card-title">📎 Klauseln & Sondervereinbarungen</span>
                    </div>
                    <div class="s-card-body">
                      <div class="fg" style="margin-bottom:14px">
                        <label class="cf-check-label">
                          <label class="cf-toggle-chip" :class="{ active: contractStore.contractForm.equipmentDamageClause }" style="display:inline-flex">
                            <input type="checkbox" v-model="contractStore.contractForm.equipmentDamageClause" style="display:none" />
                            {{ contractStore.contractForm.equipmentDamageClause ? "⚠️ Ausrüstungsschadenklausel aktiv" : "🔧 Ausrüstungsschadenklausel" }}
                          </label>
                          <span class="cf-toggle-hint">Erscheint in §7 Haftung — Klauseltext in Einstellungen → Vertragswesen</span>
                        </label>
                      </div>
                      <div v-if="settingsData?.contractClauses?.specialClauses?.length">
                        <label class="fg-label">Vordefinierte Sondervereinbarungen</label>
                        <div class="cf-clause-chips">
                          <label v-for="cl in settingsData.contractClauses.specialClauses" :key="cl.id"
                            class="cf-chip"
                            :class="{ active: contractStore.contractForm.selectedSpecialClauses.includes(cl.id) }">
                            <input type="checkbox" :value="cl.id" v-model="contractStore.contractForm.selectedSpecialClauses" style="display:none" />
                            {{ contractStore.contractForm.selectedSpecialClauses.includes(cl.id) ? "☑" : "☐" }} {{ cl.title }}
                          </label>
                        </div>
                      </div>
                      <div class="fg" style="margin-top:14px">
                        <label>Individuelle Vereinbarungen (Freitext)</label>
                        <textarea v-model="contractStore.contractForm.customSpecialClauses" rows="2"
                          placeholder="z.B. Parkkosten trägt Auftraggeber · besondere Wünsche…"></textarea>
                      </div>
                    </div>
                  </div>

                  <div class="cf-save-row mt-8" style="display:none"><!-- moved to iqf-footer --></div>
                </fieldset>

                  </div><!-- /qo-main -->
                </div><!-- /qo-layout -->
              </div>

              <!-- iqf-footer: wie Angebotsformular -->
              <div class="iqf-footer">
                <button class="btn btn-secondary" @click="contractStore.contractFormOpen = false">Abbrechen</button>
                <button class="btn btn-primary" :disabled="contractSaving || contractStore.contractLocked" @click="saveContractData">
                  {{ contractSaving ? '⏳ Wird gespeichert…' : '💾 Speichern' }}
                </button>
              </div>
            </div>

            <!-- ══ ÜBERSICHT-VIEW: Status + Versionen ═══════════════════════ -->
            <div v-else key="contract-overview">
              <div class="pp-head">
                <div style="display:flex;align-items:center;gap:10px">
                  <span>📝 Vertrag</span>
                  <span class="badge" :class="contractStore.contractStatusClass">{{ contractStore.contractStatus }}</span>
                  <span v-if="contractStore.contractLocked" class="badge" style="background:#fef2f2;color:#991b1b;border-color:#fca5a5;font-size:10px">🔒 Gesperrt</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <select class="status-select" v-model="contractStore.contractStatus" @change="saveContractStatus">
                    <option value="Entwurf">Entwurf</option>
                    <option value="Verschickt">Verschickt</option>
                  </select>
                </div>
              </div>

              <div class="pp-body qo-body" style="padding:0">
                <div class="qo-layout">
                  <!-- ═══ Linke Spalte: Auftragsübersicht ═══════════════ -->
                  <aside class="qo-sidebar">
                    <div class="qo-sb-title">📁 Auftragsübersicht</div>

                    <div v-if="project" class="qo-sb-section">
                      <div class="qo-sb-label">Auftrag</div>
                      <div class="qo-sb-occasion">{{ project.contractData?.occasion || project.projectName }}</div>
                      <div class="qo-sb-row" v-if="project.booking">
                        <span class="qo-sb-key">📅</span>
                        <span>{{ formatDate(project.booking) }}{{ project.bookingTime ? ' · ' + project.bookingTime : '' }}</span>
                      </div>
                      <div class="qo-sb-row" v-if="project.location">
                        <span class="qo-sb-key">📍</span><span>{{ project.location }}</span>
                      </div>
                      <div class="qo-sb-row" v-if="project.category">
                        <span class="qo-sb-key">🏷</span><span>{{ project.category }}</span>
                      </div>
                    </div>

                    <div v-if="customer" class="qo-sb-section">
                      <div class="qo-sb-label">Kunde</div>
                      <div class="qo-sb-val">{{ [customer.salutation, customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') }}</div>
                      <div v-if="customer.company" class="qo-sb-row"><span class="qo-sb-key">🏢</span><span>{{ customer.company }}</span></div>
                      <div v-if="customer.email" class="qo-sb-row"><span class="qo-sb-key">✉️</span><span style="word-break:break-all">{{ customer.email }}</span></div>
                      <div v-if="customer.phone" class="qo-sb-row"><span class="qo-sb-key">📞</span><span>{{ customer.phone }}</span></div>
                    </div>

                    <div class="qo-sb-section" v-if="project.fotografie||project.videografie||project.glueckwunschkarten||project.gettingReadyEr||project.gettingReadySie||project.gettingReadyBeide">
                      <div class="qo-sb-label">Leistungen</div>
                      <div class="qo-sb-chips">
                        <span v-if="project.fotografie"         class="qo-sb-chip">📷 Foto</span>
                        <span v-if="project.videografie"        class="qo-sb-chip">🎬 Video</span>
                        <span v-if="project.glueckwunschkarten" class="qo-sb-chip">💌 Karten</span>
                        <span v-if="project.gettingReadyEr"     class="qo-sb-chip">💄 GR Er</span>
                        <span v-if="project.gettingReadySie"    class="qo-sb-chip">💄 GR Sie</span>
                        <span v-if="project.gettingReadyBeide"  class="qo-sb-chip">💄 GR Beide</span>
                      </div>
                    </div>

                    <div v-if="project.contractData" class="qo-sb-section">
                      <div class="qo-sb-label">Honorar</div>
                      <template v-if="project.contractData.pricingModel === 'hourly' && project.contractData.hourlyRate">
                        <div class="qo-sb-row">
                          <span class="qo-sb-key">💰</span>
                          <span class="qo-sb-strong">{{ project.contractData.hourlyRate }} €/h<span v-if="project.contractData.estimatedHours"> × {{ project.contractData.estimatedHours }} h</span></span>
                        </div>
                      </template>
                      <template v-else-if="project.contractData.pricingModel === 'flat' && project.contractData.flatRate">
                        <div class="qo-sb-row"><span class="qo-sb-key">💰</span><span class="qo-sb-strong">{{ formatCurrency(project.contractData.flatRate) }} Pauschal</span></div>
                      </template>
                      <template v-else-if="project.contractData.customPriceText">
                        <div class="qo-sb-row"><span class="qo-sb-key">💰</span><span>{{ project.contractData.customPriceText }}</span></div>
                      </template>
                      <div class="qo-sb-row" v-if="project.contractData.depositAmount">
                        <span class="qo-sb-key">💶</span><span>Anzahlung {{ formatCurrency(project.contractData.depositAmount) }}</span>
                      </div>
                      <div class="qo-sb-row" v-if="project.contractData.paymentDueDays">
                        <span class="qo-sb-key">🗓</span><span>Zahlung in {{ project.contractData.paymentDueDays }} Tagen</span>
                      </div>
                      <div class="qo-sb-row" v-if="project.contractData.deliveryWeeks">
                        <span class="qo-sb-key">📦</span><span>Lieferung in {{ project.contractData.deliveryWeeks }} Wo.</span>
                      </div>
                    </div>

                    <!-- Änderungsprotokoll -->
                    <div v-if="pdStore.auftragChangelog.length" class="qo-sb-section">
                      <div class="qo-sb-label" style="display:flex;align-items:center;justify-content:space-between">
                        <span>🕐 Letzte Änderung</span>
                        <span class="qo-sb-count">{{ pdStore.auftragChangelog.length }}</span>
                      </div>
                      <div class="acp-entry acp-entry-compact">
                        <div class="acp-ts">{{ formatDateTime(pdStore.auftragChangelogSorted[0].ts) }}</div>
                        <div class="acp-line">
                          <span class="acp-field">{{ pdStore.auftragChangelogSorted[0].label }}:</span>
                          <span class="acp-from">{{ formatChangelogVal(pdStore.auftragChangelogSorted[0].from) }}</span>
                          <span class="acp-arrow">→</span>
                          <span class="acp-to">{{ formatChangelogVal(pdStore.auftragChangelogSorted[0].to) }}</span>
                        </div>
                      </div>
                      <button class="acp-log-btn" @click="pdStore.showChangelogModal = true">
                        📋 Änderungslog ({{ pdStore.auftragChangelog.length }})
                      </button>
                    </div>

                    <div class="qo-sb-edit-wrap">
                      <button class="qo-sb-edit-btn" @click="openSidebarEdit">✏️ Auftrag anpassen</button>
                    </div>
                  </aside>

                  <!-- ═══ Rechte Spalte: Versionen (wie Angebot) ══════════ -->
                  <div class="qo-main">

                    <!-- Warnungen -->
                    <div v-if="pdStore.requireConsult && pdStore.consultation.clientAccepted !== true" class="pp-hint pp-hint-danger" style="margin-bottom:12px">
                      ⛔ Vorgespräch erforderlich.
                      <button class="link-btn" style="display:block;margin-top:4px;font-weight:700" @click="navigate('vorgespräch')">→ Zum Vorgespräch</button>
                    </div>

                    <!-- Kein Vertrag noch → Info -->
                    <div v-if="!contractStore.contractHasData" class="pp-hint pp-hint-info" style="margin:0 0 14px">
                      Lege die Vertragsdaten fest — gespeicherte Versionen erscheinen hier.
                    </div>

                    <!-- ── Gespeicherte Versionen (exakt wie Angebot: vN-Badge, current/old) ── -->
                    <div v-if="contractStore.contractHasData" class="qv-list" style="margin-bottom:16px">

                      <template v-if="contractStore.contractGeneratedVersions.length">
                        <div v-for="(v, idx) in [...contractStore.contractGeneratedVersions].reverse()" :key="v.id"
                          class="qv-row"
                          :class="{ 'qv-current': idx === 0, 'qv-old': idx > 0 }">

                          <!-- Top: vN-Badge + Nummer + Betrag + Status-Tag + Datum -->
                          <div class="qv-top">
                            <span class="qv-vnum">{{ v.label || ('v' + (contractStore.contractGeneratedVersions.length - idx)) }}</span>
                            <span v-if="project.contractNumber" class="qv-num">{{ project.contractNumber }}</span>
                            <span class="qv-amount">
                              {{ contractStore.contractForm.pricingModel === 'flat' && contractStore.contractForm.flatRate
                                  ? formatCurrency(contractStore.contractForm.flatRate)
                                  : contractStore.contractForm.pricingModel === 'hourly' && contractStore.contractForm.hourlyRate
                                    ? contractStore.contractForm.hourlyRate + ' €/h'
                                    : contractStore.contractForm.customPriceText || '—' }}
                            </span>
                            <span v-if="idx === 0" class="qv-version-tag qv-tag-current">Aktuell</span>
                            <span v-else class="qv-version-tag qv-tag-old">Verworfen</span>
                            <span class="qv-date">{{ formatDateTime(v.savedAt || v.generatedAt) }}</span>
                          </div>

                          <!-- Bottom: Status-Pills (nur aktuelle) + Aktionsbuttons -->
                          <div class="qv-bottom">
                            <!-- Aktuelle Version: Status-Pills oder finaler Badge -->
                            <template v-if="idx === 0">
                              <div class="qv-status-pills" v-if="!contractStore.contractLocked">
                                <button v-for="s in ['Entwurf','Verschickt']" :key="s"
                                  class="qv-pill"
                                  :class="{
                                    'qv-pill-active': contractStore.contractStatus === s,
                                    'qv-pill-entwurf':    s === 'Entwurf',
                                    'qv-pill-versendet':  s === 'Verschickt',
                                    'qv-pill-angenommen': s === 'Unterschrieben',
                                  }"
                                  :disabled="contractStore.contractStatus === s"
                                  @click="contractStore.contractStatus = s; saveContractStatus()">
                                  {{ s === 'Unterschrieben' ? '✓ ' + s : s }}
                                </button>
                              </div>
                              <span v-else class="badge badge-success" style="font-size:10.5px">✓ Unterschrieben</span>
                            </template>
                            <!-- Alte Version: nur Verworfen-Badge -->
                            <span v-else class="badge badge-neutral" style="font-size:10.5px">Verworfen</span>

                            <div class="qv-actions">
                              <!-- Lupe: alle Versionen ansehen (öffnet immer aktuelle Vertragsseite) -->
                              <button class="btn btn-ghost btn-sm btn-icon" title="Ansehen" @click="openContractPrint(false)">🔍</button>

                              <!-- Drucken + Download: nur aktuelle, nicht unterschriebene Version -->
                              <template v-if="idx === 0 && !contractStore.contractLocked">
                                <button class="btn btn-ghost btn-sm qv-action-print"
                                  title="PDF öffnen — Status wird auf ›Verschickt‹ gesetzt"
                                  @click="printContract">
                                  📂 Öffnen</button>
                                <button class="btn btn-ghost btn-sm qv-action-revise"
                                  title="Neue Version erstellen — diese Version wird als ›Verworfen‹ markiert"
                                  @click="contractStore.contractFormIsNew = false; contractStore.contractFormOpen = true">
                                  ↩ Neue Version
                                </button>
                              </template>
                            </div>
                          </div>
                        </div>
                      </template>

                      <!-- Fallback: Daten vorhanden aber noch keine Version gespeichert -->
                      <div v-else class="qv-row qv-current">
                        <div class="qv-top">
                          <span class="qv-vnum">v1</span>
                          <span v-if="project.contractNumber" class="qv-num">{{ project.contractNumber }}</span>
                          <span class="qv-amount">
                            {{ contractStore.contractForm.pricingModel === 'flat' && contractStore.contractForm.flatRate
                                ? formatCurrency(contractStore.contractForm.flatRate)
                                : contractStore.contractForm.pricingModel === 'hourly' && contractStore.contractForm.hourlyRate
                                  ? contractStore.contractForm.hourlyRate + ' €/h'
                                  : contractStore.contractForm.customPriceText || '—' }}
                          </span>
                          <span class="qv-version-tag qv-tag-current">Aktuell</span>
                        </div>
                        <div class="qv-bottom">
                          <div class="qv-status-pills" v-if="!contractStore.contractLocked">
                            <button v-for="s in ['Entwurf','Verschickt']" :key="s"
                              class="qv-pill"
                              :class="{
                                'qv-pill-active': contractStore.contractStatus === s,
                                'qv-pill-entwurf':    s === 'Entwurf',
                                'qv-pill-versendet':  s === 'Verschickt',
                                'qv-pill-angenommen': s === 'Unterschrieben',
                              }"
                              :disabled="contractStore.contractStatus === s"
                              @click="contractStore.contractStatus = s; saveContractStatus()">
                              {{ s === 'Unterschrieben' ? '✓ ' + s : s }}
                            </button>
                          </div>
                          <span v-else class="badge badge-success" style="font-size:10.5px">✓ Unterschrieben</span>
                          <div class="qv-actions">
                            <button class="btn btn-ghost btn-sm btn-icon" title="Ansehen" @click="openContractPrint(false)">🔍</button>
                            <template v-if="!contractStore.contractLocked">
                              <button class="btn btn-ghost btn-sm qv-action-print"
                                title="PDF öffnen — Status wird auf ›Verschickt‹ gesetzt"
                                @click="printContract">
                                📂 Öffnen</button>
                              <button class="btn btn-ghost btn-sm qv-action-revise"
                                @click="contractStore.contractFormIsNew = false; contractStore.contractFormOpen = true">
                                ↩ Neue Version
                              </button>
                            </template>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- ── Unterzeichnete Versionen ── -->
                    <div v-if="contractStore.signedContracts.length || contractStore.contractHasData" class="cv-versions-wrap">
                      <div class="signed-title" style="margin-bottom:8px">📎 Unterschriebene Versionen</div>
                      <div v-if="contractStore.signedContracts.length === 0" class="cv-empty">
                        <span>Noch kein unterzeichneter Vertrag hochgeladen.</span>
                      </div>
                      <div v-for="(sc, idx) in [...contractStore.signedContracts].reverse()" :key="sc.id" class="cv-row"
                        :class="{ 'cv-current': idx === 0, 'cv-old': idx > 0 }">
                        <div class="cv-version-badge" :class="idx === 0 ? 'sv-current' : 'sv-old'">
                          {{ idx === 0 ? 'Aktuell' : 'v' + (contractStore.signedContracts.length - idx) }}
                        </div>
                        <div class="cv-icon" :class="`ext-${sc.ext?.toLowerCase()}`">{{ sc.ext || '?' }}</div>
                        <div class="cv-info">
                          <div class="cv-name">{{ sc.originalName }}</div>
                          <div class="cv-meta">{{ fmtFileSize(sc.size) }} · {{ fmtDate(sc.uploadedAt) }}</div>
                        </div>
                        <div class="cv-actions">
                          <a :href="`${API_BASE}/api/projects/${project.id}/contracts/${sc.id}/download`"
                            target="_blank" class="btn btn-ghost btn-sm">⬇️</a>
                          <button class="btn btn-ghost btn-sm text-danger" @click="deleteSignedContract(sc.id)" title="Löschen">🗑️</button>
                        </div>
                      </div>
                    </div>

                    <!-- ── Nachträge ── -->
                    <div class="addenda-section mt-12" v-if="contractStore.contractLocked || contractStore.contractAddenda.length > 0">
                      <div class="signed-title">
                        Vertragsnachträge
                        <button class="btn btn-ghost btn-sm" @click="contractStore.addendaFormOpen = !contractStore.addendaFormOpen"
                          :disabled="!contractStore.contractLocked">
                          {{ contractStore.addendaFormOpen ? '✕ Abbrechen' : '+ Nachtrag hinzufügen' }}
                        </button>
                      </div>
                      <div v-if="contractStore.addendaFormOpen" class="addendum-form contract-form">
                        <div class="cf-grid cf-grid-2" style="margin-bottom:12px">
                          <div class="fg">
                            <label>Bezeichnung / Titel</label>
                            <input type="text" v-model="contractStore.addendumDraft.title"
                              placeholder="z.B. Erweiterung Leistungsumfang" />
                          </div>
                          <div class="fg">
                            <label>Nachtragsdatum</label>
                            <input type="date" v-model="contractStore.addendumDraft.date" />
                          </div>
                        </div>
                        <div class="fg">
                          <label>Inhalt des Nachtrags</label>
                          <textarea v-model="contractStore.addendumDraft.content" rows="4"
                            placeholder="Beschreibe die Änderung vollständig und präzise…" style="resize:vertical"></textarea>
                        </div>
                        <button class="btn btn-primary btn-sm" @click="saveAddendum" :disabled="contractStore.addendumSaving">
                          {{ contractStore.addendumSaving ? '⏳ Speichern…' : '💾 Nachtrag speichern' }}
                        </button>
                      </div>
                      <div v-if="contractStore.contractAddenda.length === 0" class="addendum-empty">Noch keine Nachträge.</div>

                      <div v-for="(add, addIdx) in contractStore.contractAddenda" :key="add.id" class="qv-row"
                        :class="add.signedFile ? 'qv-done' : 'qv-current'">

                        <!-- Top: vN-Badge + Nummer + Titel + Status-Tag + Datum -->
                        <div class="qv-top">
                          <span class="qv-vnum" style="background:var(--bg-alt);color:var(--text-muted);border:1px solid var(--border)">
                            N{{ addIdx + 1 }}
                          </span>
                          <span v-if="add.addendumNumber" class="qv-num">{{ add.addendumNumber }}</span>
                          <span class="qv-num" style="color:var(--text-2);font-weight:500">{{ add.title || 'Nachtrag ' + (addIdx + 1) }}</span>
                          <span class="qv-version-tag" :class="add.signedFile ? 'qv-tag-signed' : 'qv-tag-current'">
                            {{ add.signedFile ? '✓ Unterschrieben' : (add.addStatus || 'Entwurf') }}
                          </span>
                          <span class="qv-date">{{ formatDateTime(add.createdAt) }}</span>
                        </div>

                        <!-- Bottom: Status-Pills + Aktionsbuttons -->
                        <div class="qv-bottom">
                          <!-- Status-Pills: nur wenn noch nicht unterschrieben -->
                          <div v-if="!add.signedFile" class="qv-status-pills">
                            <button v-for="s in ['Entwurf','Verschickt']" :key="s"
                              class="qv-pill"
                              :class="{
                                'qv-pill-active': (add.addStatus || 'Entwurf') === s,
                                'qv-pill-entwurf':   s === 'Entwurf',
                                'qv-pill-versendet': s === 'Verschickt',
                              }"
                              :disabled="(add.addStatus || 'Entwurf') === s"
                              @click="setAddendumStatus(add, s)">
                              {{ s }}
                            </button>
                          </div>

                          <div class="qv-actions">
                            <!-- Lupe: ansehen -->
                            <button class="btn btn-ghost btn-sm btn-icon"
                              title="Ansehen" @click="openAddendumPrint(add.id, false)">🔍</button>

                            <!-- Drucken + Download: wenn noch kein signedFile -->
                            <template v-if="!add.signedFile">
                              <button class="btn btn-ghost btn-sm qv-action-print"
                                title="PDF öffnen — Status wird auf ›Verschickt‹ gesetzt"
                                @click="printAddendum(add)">
                                📂 Öffnen</button>
                            </template>

                            <!-- Unterschriebene Fassung -->
                            <template v-if="add.signedFile">
                              <!-- Download unterschriebenes PDF -->
                              <a :href="`${API_BASE}/api/projects/${project.id}/addenda/${add.id}/sign/download`"
                                target="_blank" class="btn btn-ghost btn-sm qv-action-download" title="Unterschriebene Fassung herunterladen">
                                ⬇️ Unterschrieben
                              </a>
                              <!-- Ersetzen -->
                              <label class="btn btn-ghost btn-sm" style="cursor:pointer" title="Neue unterschriebene Fassung hochladen">
                                ↩ Ersetzen
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none"
                                  @change="e => uploadSignedAddendum(e, add.id)" />
                              </label>
                            </template>
                            <template v-else>
                              <!-- Unterschriebene Fassung hochladen -->
                              <label class="btn btn-ghost btn-sm qv-action-revise" style="cursor:pointer"
                                title="Unterschriebene Fassung hochladen — markiert Nachtrag als ›Unterschrieben‹">
                                ⬆️ Unterschrift
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none"
                                  @change="e => uploadSignedAddendum(e, add.id)" />
                              </label>
                            </template>

                            <!-- Löschen -->
                            <button class="btn btn-ghost btn-sm text-danger btn-icon"
                              title="Nachtrag löschen" @click="deleteAddendum(add.id)">🗑️</button>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div><!-- /qo-main -->
                </div><!-- /qo-layout -->
              </div>

              <div class="pp-foot" style="flex-wrap:wrap;gap:8px">
                <!-- Noch kein Vertrag: Erstellen -->
                <button v-if="!contractStore.contractHasData" class="btn btn-sm btn-primary" @click="openContractForm">
                  📝 Vertrag erstellen
                </button>
                <!-- Vertrag vorhanden, nicht gesperrt -->
                <template v-if="contractStore.contractHasData && !contractStore.contractLocked">
                  <button class="btn btn-ghost btn-sm" @click="openContractPrint(false)" title="Ansehen ohne Statusänderung">🔍 Ansehen</button>
                  <button v-if="contractStore.contractForm.clientIsCompany" class="btn btn-ghost btn-sm" @click="openAdvPrint">📋 ADV</button>
                  <label class="btn btn-ghost btn-sm" style="cursor:pointer">
                    ⬆️ Unterschriebene Version hochladen
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none" @change="uploadSignedContract" :disabled="signedUploading" />
                  </label>
                </template>
                <!-- Unterschrieben -->
                <template v-if="contractStore.contractLocked">
                  <label class="btn btn-ghost btn-sm" style="cursor:pointer">
                    ⬆️ Neue Unterschrift hochladen
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none" @change="uploadSignedContract" :disabled="signedUploading" />
                  </label>
                  <button class="btn btn-sm btn-primary" @click="navigate('anzahlung')">
                    Weiter: Anzahlung →
                  </button>
                </template>
                <button class="btn btn-sm btn-ghost" @click="navigate('angebot')">
                  ← Zurück: Angebot
                </button>
                <span v-if="signedError" class="pp-hint pp-hint-danger" style="flex:0 0 100%;padding:6px 10px;margin:0">{{ signedError }}</span>
              </div>
            </div>

          </div>
        </div>
</template>

<script>
import { API_BASE } from '../../services/api'
import { computed, ref } from 'vue'
import { useProjectDetailStore } from '../../stores/useProjectDetailStore'
import { useContractStore }      from '../../stores/useContractStore'
import { useInvoiceStore }       from '../../stores/useInvoiceStore'
import { useQuoteStore }         from '../../stores/useQuoteStore'

export default {
  name: 'ProjectPipelineVertrag',
  emits: ['navigate', 'refresh', 'call'],
  setup(props, { emit }) {
    const pdStore       = useProjectDetailStore()
    const contractStore = useContractStore()
    const invoiceStore  = useInvoiceStore()
    const quoteStore    = useQuoteStore()

    // Core data — reaktiv aus Stores
    const project      = computed(() => pdStore.project)
    const customer     = computed(() => pdStore.customer)
    const customerName = computed(() => pdStore.customerName)
    const settingsData = computed(() => pdStore.settingsData)

    // Formatting helpers — inline damit keine Props nötig
    function formatDate(d) {
      return d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
    }
    function formatDateTime(d) {
      return d ? new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
    }
    function fmtDate(d) { return formatDate(d) }
    function formatCurrency(n) {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n ?? 0)
    }
    function fmtFileSize(bytes) {
      if (!bytes) return ''
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'
      return (bytes/(1024*1024)).toFixed(1) + ' MB'
    }

    function navigate(panel) { emit('navigate', panel) }
    function refresh()       { emit('refresh') }


    // ── Action-Funktionen → emit nach ProjectDetail ───────────────────────
    function openContractPrint(...args) { emit('call', 'openContractPrint', args) }
    function printContract(...args) { emit('call', 'printContract', args) }
    function downloadContract(...args) { emit('call', 'downloadContract', args) }
    function openAddendumPrint(...args) { emit('call', 'openAddendumPrint', args) }
    function printAddendum(...args) { emit('call', 'printAddendum', args) }
    function downloadAddendum(...args) { emit('call', 'downloadAddendum', args) }
    function deleteAddendum(...args) { emit('call', 'deleteAddendum', args) }
    function uploadSignedAddendum(...args) { emit('call', 'uploadSignedAddendum', args) }
    function deleteSignedContract(...args) { emit('call', 'deleteSignedContract', args) }
    function openAdvPrint(...args) { emit('call', 'openAdvPrint', args) }
    function openSidebarEdit(...args) { emit('call', 'openSidebarEdit', args) }
    function formatChangelogVal(...args) { emit('call', 'formatChangelogVal', args) }

    function openContractForm(...args) { emit('call', 'openContractForm', args) }

    function saveContractData(...args) { emit('call', 'saveContractData', args) }
    function saveContractStatus(...args) { emit('call', 'saveContractStatus', args) }
    function saveAddendum(...args) { emit('call', 'saveAddendum', args) }
    function setAddendumStatus(...args) { emit('call', 'setAddendumStatus', args) }
    function uploadSignedContract(...args) { emit('call', 'uploadSignedContract', args) }

    function calcAutoSurcharge(...args) { emit('call', 'calcAutoSurcharge', args) }

    return {
      project, customer, customerName, settingsData,
      pdStore, contractStore, invoiceStore, quoteStore,
      formatDate, formatDateTime, fmtDate, formatCurrency, fmtFileSize,
      navigate, refresh,
      saveContractData,
      saveContractStatus,
      saveAddendum,
      setAddendumStatus,
      uploadSignedContract,
      calcAutoSurcharge,
      openContractForm,
      // action functions
      openContractPrint,
      printContract,
      downloadContract,
      openAddendumPrint,
      printAddendum,
      downloadAddendum,
      deleteAddendum,
      uploadSignedAddendum,
      deleteSignedContract,
      openAdvPrint,
      openSidebarEdit,
      formatChangelogVal,
    }
  },
}
</script>

<style scoped>
/* ── NR Vertrag Info-Box ── */
.nr-vertrag-info {
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: 8px; padding: 12px 14px; margin-top: 4px;
  display: flex; flex-direction: column; gap: 7px;
}
.nr-vi-row {
  display: flex; align-items: flex-start; gap: 10px; font-size: 12.5px;
}
.nr-vi-label {
  font-weight: 700; color: var(--text); min-width: 140px; flex-shrink: 0;
}
.nr-vi-val { color: var(--text-muted); flex: 1; }
.nr-vi-chips { display: flex; flex-wrap: wrap; gap: 5px; flex: 1; }
.nr-vi-chip {
  background: var(--primary-light); color: var(--primary);
  border: 1px solid rgba(79,70,229,.2); border-radius: 99px;
  padding: 2px 9px; font-size: 11px; font-weight: 600;
}
.nr-vi-row--highlight { border-top: 1px solid var(--border); padding-top: 7px; margin-top: 2px; }
.nr-vi-surcharge { color: #b45309; font-weight: 700; font-size: 13px; }
.nr-vi-note {
  font-size: 11px; color: var(--text-muted); font-style: italic;
  border-top: 1px dashed var(--border); padding-top: 7px; margin-top: 2px;
}
</style>
