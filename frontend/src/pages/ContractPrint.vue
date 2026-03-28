<template>
  <div v-if="loading" class="state-screen"><div class="state-icon">⏳</div><div>Vertrag wird geladen…</div></div>
  <div v-else-if="error" class="state-screen state-error"><div class="state-icon">⚠️</div><div>{{ error }}</div></div>
  <template v-else>

    <!-- ── ENTWURF-Wasserzeichen: position:fixed → jede Druckseite ── -->
    <div v-if="isDraft" class="draft-wm" aria-hidden="true">ENTWURF</div>

    <!-- ── Logo-Header: position:fixed → ab Seite 2 oben rechts ── -->
    <header class="page-header-logo no-screen">
      <img v-if="settings.company?.logoUrl"
        :src="logoDataUrl || `${API_BASE}${settings.company?.logoUrl}`"
        crossorigin="anonymous" alt="Logo" />
      <div v-else class="page-header-logo-text">{{ settings.company.name }}</div>
    </header>

    <!-- ── Toolbar ── -->
    <div class="toolbar no-print">
      <div class="toolbar-left">
        <button class="btn-back" @click="goBack">← Zurück</button>
        <span class="toolbar-title">Vertrag</span>
      </div>
      <div class="toolbar-right">
        <button class="btn-print" @click="downloadContractPDF" :disabled="pdfLoading">
          {{ pdfLoading ? '⏳ PDF wird erstellt…' : '💾 PDF speichern' }}
        </button>
      </div>
    </div>

    <!-- ── Fixer Seitenfuß: position:fixed → jede Druckseite ── -->
    <footer class="print-page-footer no-screen">
      <div class="ppf-main-row">
        <span class="ppf-machine">Fotografie- und Dienstleistungsvertrag · maschinell erstellt · ohne Unterschrift nicht gültig</span>
        <span class="ppf-pagenum">Seite <span class="pp-cur"></span> von <span class="pp-tot"></span></span>
      </div>
      <div class="ppf-cols">
        <div class="ppf-col">
          <span class="ppf-bold">{{ settings.company.name }}</span><br />
          <span v-if="settings.company.owner">Inh. {{ settings.company.owner }}<br /></span>
          {{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}
          <span v-if="settings.company.website"><br />{{ settings.company.website }}</span>
          <span v-if="settings.company.email"><br />{{ settings.company.email }}</span>
        </div>
        <div class="ppf-col">
          <span v-if="settings.company.bankName" class="ppf-bold">{{ settings.company.bankName }}</span><br />
          <span v-if="settings.company.iban">IBAN {{ settings.company.iban }}</span><br />
          <span v-if="settings.company.bic">BIC {{ settings.company.bic }}</span>
        </div>
        <div class="ppf-col">
          <span v-if="settings.company.taxNumber">Steuernummer: {{ settings.company.taxNumber }}<br /></span>
          <span v-if="settings.company.vatId && !settings.company.smallBusiness">USt-IdNr.: {{ settings.company.vatId }}<br /></span>
          <span v-if="settings.company.smallBusiness"><em>Kleinunternehmer § 19 Abs. 1 UStG</em></span>
        </div>
      </div>
    </footer>

    <!-- ── Seiten-Wrapper ── -->
    <div class="page-wrap">
      <div class="a4">

        <!-- ─── Dokumentkopf: Logo + Adresse + Meta (wie Rechnung/Angebot) ─── -->
        <div class="top-bar">
          <div class="logo-area">
            <img v-if="settings.company?.logoUrl"
              :src="logoDataUrl || `${API_BASE}${settings.company?.logoUrl}`"
              crossorigin="anonymous" class="company-logo" alt="Logo" />
            <div v-else class="logo-fallback">
              <div class="logo-name">{{ settings.company.name }}</div>
            </div>
          </div>
        </div>

        <!-- DIN 5008 Anschriftenfeld + Metaspalte -->
        <div class="addr-meta-row">
          <div class="addr-block">
            <div class="addr-sender-micro">
              {{ settings.company.name }} · {{ settings.company.street }} · {{ settings.company.zipCode }} {{ settings.company.city }}
            </div>
            <div class="addr-recipient" v-if="customer">
              <div class="addr-salutation" v-if="customer.salutation">{{ customer.salutation }}</div>
              <div class="addr-name">{{ [customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') }}</div>
              <div v-if="customer.company">{{ customer.company }}</div>
              <div>{{ customer.street }} {{ customer.houseNumber }}</div>
              <div>{{ customer.zipCode }} {{ customer.city }}</div>
              <div v-if="customer.country && customer.country !== 'Deutschland'">{{ customer.country }}</div>
            </div>
          </div>
          <div class="meta-block">
            <table class="meta-table">
              <tbody>
                <tr>
                  <td class="meta-label">Vertragsdatum</td>
                  <td class="meta-value fw-700">{{ fmtDate(new Date().toISOString()) }}</td>
                </tr>
                <tr>
                  <td class="meta-label">Gültig bis</td>
                  <td class="meta-value">{{ validUntil }}</td>
                </tr>
                <tr v-if="project.contractNumber">
                  <td class="meta-label">Vertrags-Nr.</td>
                  <td class="meta-value fw-700">{{ project.contractNumber }}</td>
                </tr>
                <tr v-if="customer && customer.customerNumber">
                  <td class="meta-label">Kunden-Nr.</td>
                  <td class="meta-value">{{ customer.customerNumber }}</td>
                </tr>
                <tr v-if="customer && customer.phone">
                  <td class="meta-label">Tel.</td>
                  <td class="meta-value">{{ customer.phone }}</td>
                </tr>
                <tr v-if="customer && customer.email">
                  <td class="meta-label">E-Mail</td>
                  <td class="meta-value">{{ customer.email }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Dokumenttitel -->
        <div class="doc-title-block">
          <h1 class="doc-title">Fotografie- und Dienstleistungsvertrag<span v-if="project.contractNumber"> · {{ project.contractNumber }}</span></h1>
          <div class="doc-event-line">{{ cd.occasion || project.projectName }}<span v-if="project.booking"> · {{ fmtDate(project.booking) }}</span></div>
        </div>

        <!-- §1 -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ 1</div><h2 class="sh">Vertragsparteien</h2></div>
          <p class="p">Dieser Vertrag wird geschlossen zwischen:</p>
          <div class="parties-grid mt-3">
            <div class="party-block">
              <div class="party-role">Auftragnehmer / Fotograf</div>
              <div class="party-name">{{ settings.company.name }}</div>
              <div class="party-line" v-if="settings.company.owner">Inh. {{ settings.company.owner }}</div>
              <div class="party-line">{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div>
              <div class="party-line" v-if="settings.company.phone">Tel.: {{ settings.company.phone }}</div>
              <div class="party-line" v-if="settings.company.email">{{ settings.company.email }}</div>
              <div class="party-tax" v-if="settings.company.taxNumber">StNr.: {{ settings.company.taxNumber }}</div>
              <div class="party-tax" v-if="settings.company.vatId">USt-IdNr.: {{ settings.company.vatId }}</div>
            </div>
            <div class="party-und">und</div>
            <div class="party-block">
              <div class="party-role">Auftraggeber{{ cd.clientIsCompany ? ' (Unternehmen)' : '' }}</div>
              <div class="party-name" v-if="customer">{{ [customer.salutation, customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') }}</div>
              <div class="party-company" v-if="customer?.company">{{ customer.company }}</div>
              <div class="party-line" v-if="customer">{{ customer.street }} {{ customer.houseNumber }}</div>
              <div class="party-line" v-if="customer">{{ customer.zipCode }} {{ customer.city }}</div>
              <div class="party-line" v-if="customer?.phone">Tel.: {{ customer.phone }}</div>
              <div class="party-line" v-if="customer?.email">{{ customer.email }}</div>
              <div class="party-tax" v-if="customer?.vatId">USt-IdNr.: {{ customer.vatId }}</div>
            </div>
          </div>
          <p class="p mt-3">Im Folgenden werden Auftragnehmer und Auftraggeber gemeinsam als „Parteien" bezeichnet.</p>
        </div>
        <!-- §2 -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ 2</div><h2 class="sh">Leistungsgegenstand und Termin</h2></div>
          <p class="p">Der Auftragnehmer erbringt fotografische und/oder videografische Dienstleistungen gemäß folgender Vereinbarung:</p>
          <table class="dt mt-3">
            <tbody>
              <tr><td class="dl">Anlass / Projekt</td><td class="dv">{{ cd.occasion || project.projectName }}</td></tr>
              <tr><td class="dl">Datum</td><td class="dv">{{ fmtDate(project.booking) }}</td></tr>
              <tr><td class="dl">Beginn</td><td class="dv">{{ project.bookingTime || '—' }} Uhr</td></tr>
              <tr v-if="project.bookingDuration"><td class="dl">Geplante Dauer</td><td class="dv">{{ project.bookingDuration }}</td></tr>
              <tr><td class="dl">Veranstaltungsort</td><td class="dv">{{ project.location || '—' }}</td></tr>
              <tr v-if="cd.usageType && cd.usageType !== 'private'"><td class="dl">Nutzungsart</td><td class="dv">{{ { commercial:'Kommerzielle Nutzung (B2B)', advertising:'Werbung / Marketing' }[cd.usageType] }}</td></tr>
              <tr v-if="cd.commercialPurpose"><td class="dl">Verwendungszweck</td><td class="dv">{{ cd.commercialPurpose }}</td></tr>
            </tbody>
          </table>
          <p class="p mt-3">Die beauftragten Leistungen umfassen:</p>
          <div class="svc-list mt-2">
            <div class="svc-row"><span class="cb">{{ svcFoto ? '☑' : '☐' }}</span> Fotografie</div>
            <div class="svc-row"><span class="cb">{{ svcVideo ? '☑' : '☐' }}</span> Videografie</div>
            <div class="svc-row" v-if="svcGrEr || svcGrSie || svcGrBeide">
              <span class="cb">☑</span> Getting Ready
              <span class="svc-det">({{ [svcGrSie && 'Braut', svcGrEr && 'Bräutigam', svcGrBeide && 'beide'].filter(Boolean).join(' & ') }})</span>
            </div>
            <div class="svc-row" v-if="svcKarten"><span class="cb">☑</span> Danksagungskarten-Design</div>
          </div>
        </div>
        <!-- §3 -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ 3</div><h2 class="sh">Vergütung</h2></div>
          <template v-if="!cd.pricingModel || cd.pricingModel === 'hourly'">
            <p class="p">Die Vergütung erfolgt <strong>stundenweise</strong> zum vereinbarten Stundensatz von <strong>{{ cd.hourlyRate ? fmtEur(cd.hourlyRate) : '__________ €' }} (in Worten: {{ numWords(cd.hourlyRate) }})</strong><span v-if="!settings.company.smallBusiness"> zzgl. der gesetzlichen Mehrwertsteuer</span><span v-else> gem. § 19 UStG ohne Umsatzsteuerausweis</span>.</p>
            <p class="p mt-3" v-if="cd.estimatedHours">Der Einsatz ist auf voraussichtlich <strong>{{ cd.estimatedHours }} Stunden</strong> (geschätzter Gesamtbetrag: <strong>{{ fmtEur(cd.hourlyRate * cd.estimatedHours) }}</strong>) angelegt. Die tatsächlich erbrachten Stunden werden nach Abschluss abgerechnet.</p>
          </template>
          <template v-else-if="cd.pricingModel === 'flat'">
            <p class="p">Die Vergütung erfolgt als <strong>Pauschalpreis</strong> von <strong>{{ cd.flatRate ? fmtEur(cd.flatRate) : '__________ €' }} (in Worten: {{ numWords(cd.flatRate) }})</strong><span v-if="!settings.company.smallBusiness"> zzgl. der gesetzlichen Mehrwertsteuer</span><span v-else> gem. § 19 UStG ohne Umsatzsteuerausweis</span>.</p>
            <p class="p mt-3" v-if="cd.flatRateIncludes"><strong>Im Pauschalpreis enthalten:</strong> {{ cd.flatRateIncludes }}</p>
          </template>
          <template v-else>
            <p class="p">Die Vergütung wurde individuell vereinbart:</p>
            <div class="infobox mt-3">{{ cd.customPriceText || '—' }}</div>
          </template>
          <div v-if="cd.usageType !== 'private' && cd.usageLicenseSurchargePercent > 0" class="infobox infobox-blue mt-3">
            <strong>Nutzungsrechtszuschlag:</strong> Für die Einräumung kommerzieller Nutzungsrechte wird ein Zuschlag von <strong>{{ cd.usageLicenseSurchargePercent }} %</strong> auf das Grundhonorar berechnet.
          </div>
          <p class="p mt-3">Zahlungsziel: <strong>{{ cd.paymentDueDays || 14 }} Tage</strong> ab Rechnungsdatum. Bei Zahlungsverzug werden Verzugszinsen gem. § 288 BGB berechnet.</p>
        </div>
        <!-- §4 -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ 4</div><h2 class="sh">Anzahlung und Stornierungsbedingungen</h2></div>
          <p class="p">Zur verbindlichen Reservierung des Termins wird eine Anzahlung in Höhe von <strong>{{ cd.depositAmount ? fmtEur(cd.depositAmount) + ' (in Worten: ' + numWords(cd.depositAmount) + ')' : '__________ €' }}</strong> fällig, zahlbar innerhalb von 14 Tagen. Sie wird auf den Gesamtbetrag angerechnet. Der Termin gilt erst nach vollständigem Eingang der Anzahlung als verbindlich reserviert.</p>
          <div v-if="cancellationFees.length > 0" class="mt-4">
            <p class="p"><strong>Stornierungsgebühren bei Absage durch den Auftraggeber:</strong></p>
            <table class="storno-table mt-2">
              <thead><tr><th>Zeitraum vor dem Termin</th><th class="fee-col">Stornogebühr</th></tr></thead>
              <tbody><tr v-for="t in cancellationFees" :key="t.daysBeforeEvent"><td>{{ t.label }}</td><td class="fee-col">{{ t.feePercent }} %</td></tr></tbody>
            </table>
            <p class="p mt-3">Bei Stornierung durch den Auftragnehmer aus wichtigem Grund wird die Anzahlung vollständig zurückerstattet.</p>
          </div>
          <p v-else class="p mt-3">Stornierungsbedingungen gemäß den Allgemeinen Geschäftsbedingungen des Auftragnehmers.</p>
        </div>
        <!-- §5 -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ 5</div><h2 class="sh">Urheberrecht und Nutzungsrechte</h2></div>
          <p class="p">Sämtliche erstellten Fotografien und Videoaufnahmen sind urheberrechtlich geschützte Werke des Auftragnehmers (§§ 2, 7, 12 ff. UrhG). Das Urheberrecht verbleibt ausschließlich beim Auftragnehmer.</p>
          <!-- Privatnutzung: aus Einstellungen → cp_5 "Privatnutzung" -->
          <template v-if="!cd.usageType || cd.usageType === 'private'">
            <p class="p mt-3" style="white-space:pre-wrap">{{ getClauseText('cp_5','Privatnutzung','Der Auftragnehmer räumt dem Auftraggeber ein einfaches, nicht übertragbares Nutzungsrecht für den privaten Gebrauch ein. RAW-Dateien werden nicht herausgegeben.') }}</p>
          </template>
          <!-- Kommerzielle Nutzung: aus Einstellungen → cp_5 "Kommerziell" -->
          <template v-else>
            <p class="p mt-3" style="white-space:pre-wrap">{{ getClauseText('cp_5','Kommerziell','Der Auftragnehmer räumt dem Auftraggeber ein einfaches, nicht übertragbares Nutzungsrecht für die vereinbarte kommerzielle Nutzung ein.') }}</p>
            <table class="dt mt-3">
              <tbody>
                <tr v-if="cd.commercialPurpose"><td class="dl">Verwendungszweck</td><td class="dv">{{ cd.commercialPurpose }}</td></tr>
                <tr><td class="dl">Nutzungsdauer</td><td class="dv">{{ cd.usageLicenseDuration || 'unbegrenzt' }}</td></tr>
                <tr><td class="dl">Räumlicher Umfang</td><td class="dv">{{ { regional:'Regional (Deutschland)', national:'National (D/AT/CH)', eu:'Europäisch (EU)', international:'International (weltweit)' }[cd.usageLicenseScope] || cd.usageLicenseScope }}</td></tr>
              </tbody>
            </table>
          </template>
          <!-- Bildbearbeitung: aus Einstellungen → cp_5 "Bildbearbeitung" -->
          <p class="p mt-3" style="white-space:pre-wrap">{{ getClauseText('cp_5','Bildbearbeitung','Jegliche unerlaubte Bearbeitung berechtigt zur Geltendmachung von Schadensersatz i.H.v. min. 100 % des Honorars je Verstoß.') }}</p>
          <p class="p mt-3"><strong>Veröffentlichungsrecht des Auftragnehmers (Portfolio / Marketing):</strong></p>
          <div class="cb-list mt-2">
            <div class="cb-row"><span class="cb">{{ cd.publicationPermission === 'allowed' ? '☑' : '☐' }}</span><span>Der Auftragnehmer darf die erstellten Bilder für eigene Werbezwecke nutzen (Portfolio, Website, Social Media, Wettbewerbe, Druckerzeugnisse).</span></div>
            <div class="cb-row"><span class="cb">{{ cd.publicationPermission === 'conditional' ? '☑' : '☐' }}</span><span>Nutzung für Werbezwecke nur nach vorheriger schriftlicher Absprache im Einzelfall.</span></div>
            <div class="cb-row"><span class="cb">{{ cd.publicationPermission === 'denied' ? '☑' : '☐' }}</span><span>Nutzung für eigene Werbezwecke des Auftragnehmers ausdrücklich nicht gestattet.</span></div>
          </div>
        </div>
        <!-- §6 -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ 6</div><h2 class="sh">Lieferung, Abnahme und Archivierung</h2></div>
          <!-- Lieferzeit (dynamisch) -->
          <p class="p">Lieferzeit: <strong>{{ cd.deliveryWeeks || '4–8' }} Wochen</strong> nach dem Veranstaltungstermin als JPG-Dateien (min. 300 dpi).</p>
          <!-- Klauseltexte aus Einstellungen → cp_6 -->
          <template v-for="(txt, idx) in getParaTexts('cp_6')" :key="idx">
            <p v-if="txt" class="p mt-2" style="white-space:pre-wrap">{{ txt.replace(/{archivDauer}/g, settings.contractClauses?.archiveDuration || 3) }}</p>
          </template>
        </div>
        <!-- §7 -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ 7</div><h2 class="sh">Haftungsbeschränkung</h2></div>
          <!-- Klauseltexte aus Einstellungen → cp_7 -->
          <template v-for="(txt, idx) in getParaTexts('cp_7')" :key="idx">
            <p v-if="txt" class="p mt-2" style="white-space:pre-wrap">{{ txt }}</p>
          </template>
          <!-- Ausrüstungsklausel: nur wenn aktiviert -->
          <template v-if="cd.equipmentDamageClause">
            <p class="p mt-3"><strong>Ausrüstungsschutz:</strong></p>
            <div class="infobox infobox-red mt-2">{{ settings.contractClauses?.equipmentDamageText || getClauseText('cp_7','Ausrüstung','Verursacht der Auftraggeber schuldhaft einen Schaden an der Ausrüstung des Auftragnehmers, ist er zum Schadensersatz verpflichtet.') }}</div>
          </template>
        </div>
        <!-- §8 -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ 8</div><h2 class="sh">Mitwirkungspflichten des Auftraggebers</h2></div>
          <!-- Klauseltext aus Einstellungen → cp_8 -->
          <template v-for="(txt, idx) in getParaTexts('cp_8')" :key="idx">
            <p v-if="txt" class="p mt-2" style="white-space:pre-wrap">{{ txt }}</p>
          </template>
          <p v-if="getParaTexts('cp_8').length === 0" class="p">Der Auftraggeber stellt die für die Leistungserbringung nötigen Voraussetzungen sicher (Zugänge, rechtzeitige Information). Versäumnisse gehen nicht zu Lasten des Auftragnehmers.</p>
        </div>
        <!-- §9 Sonder -->
        <div class="section" v-if="activeSpecialClauses.length > 0 || cd.customSpecialClauses">
          <div class="sh-row"><div class="sh-pill">§ 9</div><h2 class="sh">Sondervereinbarungen</h2></div>
          <div v-for="cl in activeSpecialClauses" :key="cl.id" class="p mt-3"><strong>{{ cl.title }}:</strong> {{ cl.text }}</div>
          <div v-if="cd.customSpecialClauses" class="infobox mt-3"><strong>Individuelle Vereinbarungen:</strong><br />{{ cd.customSpecialClauses }}</div>
        </div>
        <!-- §9/10 DSGVO -->
        <div class="section">
          <div class="sh-row"><div class="sh-pill">§ {{ activeSpecialClauses.length > 0 || cd.customSpecialClauses ? 10 : 9 }}</div><h2 class="sh">Datenschutz und sonstige Bestimmungen</h2></div>
          <p class="p">Die Verarbeitung personenbezogener Daten erfolgt nach Maßgabe der DSGVO zur Vertragsabwicklung. Die gesonderte Datenschutzerklärung sowie ggf. der Auftragsverarbeitungsvertrag (AVV gem. Art. 28 DSGVO) sind Vertragsbestandteil und werden separat übergeben. Mündliche Nebenabreden bestehen nicht. Änderungen bedürfen der Schriftform. Salvatorische Klausel: Unwirksame Einzelregelungen berühren die Gültigkeit des übrigen Vertrages nicht. Gerichtsstand: {{ settings.company.city }}. Es gilt deutsches Recht.</p>
        </div>
        <!-- Unterschriften -->
        <div class="sig-note mt-5">Mit ihrer Unterschrift bestätigen beide Parteien, diesen Vertrag vollständig gelesen, verstanden und akzeptiert zu haben. Der Auftraggeber bestätigt, den Vertrag sowie die gesondert übergebene Datenschutzerklärung zur Kenntnis genommen zu haben.</div>
        <div class="sig-note">Vertragsangebot gültig bis: <strong>{{ validUntil }}</strong></div>
        <div class="sig-grid mt-5">
          <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Ort, Datum und Unterschrift Auftragnehmer</div><div class="sig-pre">{{ settings.company.city }}, {{ fmtDate(new Date().toISOString()) }}</div></div>
          <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Ort, Datum und Unterschrift Auftraggeber</div></div>
        </div>
        <!-- Screen-only footer -->
        <footer class="screen-footer">
          <hr class="sf-rule" />
          <div class="sf-cols">
            <div><strong>{{ settings.company.name }}</strong><br />{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}<span v-if="settings.company.website"><br />{{ settings.company.website }}</span><span v-if="settings.company.email"><br />{{ settings.company.email }}</span></div>
            <div v-if="settings.company.iban"><strong>{{ settings.company.bankName || 'Bank' }}</strong><br />IBAN {{ settings.company.iban }}<span v-if="settings.company.bic"><br />BIC {{ settings.company.bic }}</span></div>
            <div><span v-if="settings.company.taxNumber">Steuernummer: {{ settings.company.taxNumber }}<br /></span><span v-if="settings.company.smallBusiness"><em>Kleinunternehmer § 19 UStG</em></span></div>
          </div>
        </footer>
      </div>

      <!-- NACHTRÄGE -->
      <template v-if="addenda.length > 0">
        <div v-for="(add, idx) in addenda" :key="add.id" class="a4 page-break">
          <div class="top-bar">
            <img v-if="settings.company?.logoUrl" :src="logoDataUrl || `${API_BASE}${settings.company?.logoUrl}`" crossorigin="anonymous" class="logo logo-sm" alt="" />
            <div v-else class="logo-text">{{ settings.company.name }}</div>
          </div>
          <div class="addr-meta">
            <div class="addr-block">
              <div class="sender-micro">{{ settings.company.name }} · {{ settings.company.street }} · {{ settings.company.zipCode }} {{ settings.company.city }}</div>
              <div class="recipient" v-if="customer">
                <div class="recip-name">{{ [customer.salutation, customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') }}</div>
                <div v-if="customer.company">{{ customer.company }}</div>
                <div>{{ customer.street }} {{ customer.houseNumber }}</div>
                <div>{{ customer.zipCode }} {{ customer.city }}</div>
              </div>
            </div>
            <div class="meta-block">
              <table class="meta-table">
                <tbody>
                  <tr v-if="project.contractNumber"><td class="ml">Vertrag-Nr.</td><td class="mv fw7">{{ project.contractNumber }}</td></tr>
                  <tr v-if="add.addendumNumber"><td class="ml">Nachtrag-Nr.</td><td class="mv fw7">{{ add.addendumNumber }}</td></tr>
                  <tr><td class="ml">Nachtrag vom</td><td class="mv">{{ fmtDate(add.date) }}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="doc-title-block">
            <h1 class="doc-title">Nachtrag {{ idx + 1 }} zum Fotografie- und Dienstleistungsvertrag</h1>
            <div class="doc-sub">Auftrag: {{ cd.occasion || project.projectName }} · Ursprungsvertrag: {{ fmtDate(project.contractData?.signingDate || project.createdAt) }}</div>
          </div>
          <div class="section">
            <div class="sh-row"><div class="sh-pill">I</div><h2 class="sh">Präambel</h2></div>
            <p class="p">Dieser Nachtrag ist rechtlich bindender Bestandteil des oben genannten Vertrages zwischen <strong>{{ settings.company.name }}</strong> (Auftragnehmer) und <strong>{{ customer ? [customer.salutation, customer.title, customer.firstName, customer.lastName].filter(Boolean).join(' ') : '—' }}</strong><span v-if="customer?.company"> / {{ customer.company }}</span> (Auftraggeber) und ergänzt diesen. Alle übrigen Vertragsbestandteile bleiben unverändert in Kraft. Im Falle von Widersprüchen geht dieser Nachtrag dem ursprünglichen Vertrag vor.</p>
          </div>
          <div class="section">
            <div class="sh-row"><div class="sh-pill">II</div><h2 class="sh">{{ add.title || `Nachtrag ${idx + 1}` }}</h2></div>
            <div class="infobox mt-3" style="white-space:pre-wrap;line-height:1.7">{{ add.content }}</div>
          </div>
          <p class="p mt-4" style="font-size:7.5pt;color:#777;font-style:italic">Beide Parteien erklären sich mit den Änderungen in diesem Nachtrag einverstanden. Dieser Nachtrag wird durch beiderseitige Unterschrift rechtswirksam.</p>
          <div class="sig-grid mt-5">
            <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Ort, Datum und Unterschrift Auftragnehmer</div><div class="sig-pre">{{ settings.company.city }}, _______________</div></div>
            <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Ort, Datum und Unterschrift Auftraggeber</div></div>
          </div>
          <footer class="screen-footer">
            <hr class="sf-rule" />
            <div class="sf-cols">
              <div><strong>{{ settings.company.name }}</strong><br />{{ settings.company.street }}, {{ settings.company.zipCode }} {{ settings.company.city }}</div>
              <div><span v-if="settings.company.email">{{ settings.company.email }}</span></div>
              <div><span v-if="settings.company.taxNumber">StNr.: {{ settings.company.taxNumber }}</span></div>
            </div>
          </footer>
        </div>
      </template>

    </div><!-- /pw -->
  </template>
</template>

<script>
import apiClient, { API_BASE } from '../services/api'
import { ref, computed, onMounted } from 'vue'
import { downloadPdfFromBackend, printWithFilename, fetchLogoAsDataUrl } from '../services/pdfExport.js'
import { useRoute, useRouter } from 'vue-router'
const API = `${API_BASE}/api`
const WORDS = {20:'zwanzig',25:'fünfundzwanzig',30:'dreißig',40:'vierzig',50:'fünfzig',75:'fünfundsiebzig',80:'achtzig',100:'einhundert',120:'einhundertzwanzig',150:'einhundertfünfzig',200:'zweihundert',250:'zweihundertfünfzig',300:'dreihundert',400:'vierhundert',500:'fünfhundert',600:'sechshundert',700:'siebenhundert',800:'achthundert',900:'neunhundert',1000:'eintausend',1500:'eintausendfünfhundert',2000:'zweitausend',2500:'zweitausendfünfhundert',3000:'dreitausend',4000:'viertausend',5000:'fünftausend'}
export default {
  name: 'ContractPrint',
  setup() {
    const route=useRoute(),router=useRouter()
    function goBack(){window.history.length>1?router.back():window.close()}
    const pdfLoading = ref(false)
    async function downloadContractPDF(){
      const p = project.value
      const cu = customer.value
      const num  = p?.contractNumber || 'Vertrag'
      const name = cu ? (cu.lastName || cu.firstName || cu.company || '') : ''
      const filename = [num, p?.category, name].filter(Boolean).join('_')
      pdfLoading.value = true
      try {
        await downloadPdfFromBackend(`/api/pdf/contract/${route.params.projectId}`, filename)
      } catch(e) {
        console.error('PDF-Fehler:', e)
      } finally {
        pdfLoading.value = false
      }
    }
    function printContract(){
      const p = project.value
      const cu = customer.value
      printWithFilename([p?.contractNumber||'Vertrag', cu?.lastName||cu?.firstName].filter(Boolean).join('_'))
    }
    const logoDataUrl = ref(null)  // base64-eingebettetes Logo
        const loading=ref(true),error=ref(null),project=ref(null),customer=ref(null)
    const settings=ref({company:{},contractClauses:{},bookingTerms:{cancellationFees:[]},contractParagraphsList:[]})
    const cd=computed(()=>project.value?.contractData||{})
    const isDraft=computed(()=>!project.value?.contractStatus||project.value.contractStatus==='Entwurf')
    const cancellationFees=computed(()=>settings.value?.bookingTerms?.cancellationFees||[])
    const addenda=computed(()=>project.value?.contractAddenda||[])
    const activeSpecialClauses=computed(()=>{const all=settings.value?.contractClauses?.specialClauses||[];const sel=cd.value?.selectedSpecialClauses||[];return all.filter(c=>sel.includes(c.id))})
    // Hilfsfunktion: Klauseltext aus contractParagraphsList nach Paragraph-ID und Klausel-Label suchen
    function getClauseText(paraId, labelKey, fallback='') {
      const para = (settings.value?.contractParagraphsList||[]).find(p=>p.id===paraId)
      if(!para) return fallback
      const item = (para.items||[]).find(i=>typeof i==='object' && i.label && i.label.toLowerCase().includes(labelKey.toLowerCase()))
      return item?.text || fallback
    }
    function getParaTexts(paraId) {
      const para = (settings.value?.contractParagraphsList||[]).find(p=>p.id===paraId)
      if(!para) return []
      return (para.items||[]).map(i=>typeof i==='object'?i.text:i).filter(Boolean)
    }
    function getParaTitle(paraId) {
      const para = (settings.value?.contractParagraphsList||[]).find(p=>p.id===paraId)
      return para?.title?.replace(/^§\s*\d+\s*/,'').trim() || ''
    }
    const validUntil=computed(()=>{const d=new Date();d.setDate(d.getDate()+14);return fmtDate(d.toISOString())})
    function fmtDate(d){if(!d)return'—';if(/^\d{2}\.\d{2}\.\d{4}$/.test(String(d))){const[day,month,year]=String(d).split('.');return new Date(`${year}-${month}-${day}`).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}const p=new Date(d);if(isNaN(p))return String(d);return p.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}
    function fmtEur(n){if(n==null)return'—';return Number(n).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
    function numWords(n){if(!n)return'';return WORDS[n]||Number(n).toLocaleString('de-DE')}
    async function fetchAll(){
      try{
        const[pr,sr]=await Promise.all([fetch(`${API}/projects/${route.params.projectId}`),fetch(`${API}/settings`)])
        if(!pr.ok)throw new Error('Projekt nicht gefunden')
        project.value=(await pr.json()).data??{}
        settings.value=(await sr.json()).data??{}
        // Logo als base64 einbetten → im Druckdialog sofort verfügbar (kein Netzwerkaufruf)
        logoDataUrl.value = await fetchLogoAsDataUrl(
          settings.value?.company?.logoUrl
            ? `${API_BASE}${settings.value.company.logoUrl}`
            : null
        )
        if(project.value.customerId){const cr=await fetch(`${API}/customers/${project.value.customerId}`);if(cr.ok)customer.value=(await cr.json()).data??null}
      }catch(e){error.value='Fehler: '+e.message}finally{loading.value=false}
    }
    onMounted(async () => {
      await fetchAll()
      // Auto-trigger print or download based on ?action= query param
      const action = route.query.action
      if (action === 'print' || action === 'download') {
        setTimeout(() => downloadContractPDF(), 400)
      } else if (action === 'download') {
        setTimeout(() => downloadContractPDF(), 400)
      }
    })
    // Leistungen: contractData hat Vorrang, Fallback auf project.*
    const svcFoto    = computed(() => cd.value.fotografie         != null ? cd.value.fotografie         : project.value?.fotografie         || false)
    const svcVideo   = computed(() => cd.value.videografie        != null ? cd.value.videografie        : project.value?.videografie        || false)
    const svcKarten  = computed(() => cd.value.glueckwunschkarten != null ? cd.value.glueckwunschkarten : project.value?.glueckwunschkarten || false)
    const svcGrEr    = computed(() => cd.value.gettingReadyEr     != null ? cd.value.gettingReadyEr     : project.value?.gettingReadyEr     || false)
    const svcGrSie   = computed(() => cd.value.gettingReadySie    != null ? cd.value.gettingReadySie    : project.value?.gettingReadySie    || false)
    const svcGrBeide = computed(() => cd.value.gettingReadyBeide  != null ? cd.value.gettingReadyBeide  : project.value?.gettingReadyBeide  || false)

    return{logoDataUrl,loading,error,project,customer,settings,cd,isDraft,cancellationFees,addenda,validUntil,activeSpecialClauses,fmtDate,fmtEur,numWords,window,goBack,downloadContractPDF,printContract,pdfLoading,getClauseText,getParaTexts,getParaTitle,svcFoto,svcVideo,svcKarten,svcGrEr,svcGrSie,svcGrBeide}
  }
}
</script>

<style>
/* ── Reset + Base ── */
@page { size: A4 portrait; margin: 22mm 18mm 28mm 18mm; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  font-size: 9pt; color: #1a1a1a;
  background: #d8d8d8;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@media print { body { background: white; } }

/* ── State screens ── */
.state-screen { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; gap:12px; font-size:15px; color:#555; }
.state-error { color:#c0392b; }
.state-icon { font-size:32px; }

/* ── Print/screen visibility ── */
.no-screen { display:none; }
@media print  { .no-print  { display:none !important; } .no-screen { display:block !important; } }
@media screen { .no-screen { display:none !important; } }

/* ── Toolbar ── */
.toolbar { position:fixed; top:0; left:0; right:0; z-index:500; background:#111827; color:white; display:flex; justify-content:space-between; align-items:center; padding:11px 24px; gap:16px; box-shadow:0 2px 16px rgba(0,0,0,.4); }
.toolbar-left { display:flex; align-items:center; gap:14px; min-width:0; }
.toolbar-right { display:flex; align-items:center; gap:8px; }
.toolbar-title { font-size:13px; color:rgba(255,255,255,.8); font-weight:500; }
.btn-back { background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); color:white; padding:6px 13px; border-radius:6px; cursor:pointer; font-size:12px; }
.btn-back:hover { background:rgba(255,255,255,.2); }
.btn-print { background:#2563eb; border:none; color:white; padding:8px 18px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; }
.btn-print:hover { background:#1d4ed8; }
.btn-print:disabled { opacity:.6; cursor:wait; }

/*
 * ── Logo-Header ab Seite 2 (Puppeteer-gesteuert) ──────────────────────────────
 * @page { margin: 22mm ... } reserviert 22mm oben für das Puppeteer-Logo-Template.
 * @page :first { margin-top: 0 } hebt diesen Rand auf Seite 1 auf —
 * dort erscheint das Logo als Teil des Seiteninhalts (.top-bar).
 * Ab Seite 2 greift der 22mm-Rand wieder und das Puppeteer-Template wird sichtbar.
 * Fußzeile: 28mm unten auf JEDER Seite → Footer-Template immer sichtbar.
 */
@page :first {
  margin-top: 0;
}

/* ── Fixer Seitenfuß: erscheint auf jeder Druckseite ── */
.print-page-footer { position:fixed; bottom:0; left:0; right:0; background:white; padding:0 18mm 5mm 18mm; z-index:100; }
.ppf-rule { border:none; border-top:0.5pt solid #ccc; margin-bottom:2.5mm; }
.ppf-main-row { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:2mm; }
.ppf-machine  { font-size:6.5pt; color:#666; }
.ppf-pagenum  { font-size:6.5pt; color:#888; white-space:nowrap; }
.pp-cur::before { content: counter(page); }
.pp-tot::before { content: counter(pages); }
.ppf-cols { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5mm; }
.ppf-col  { font-size:6.5pt; color:#666; line-height:1.6; }
.ppf-bold { font-weight:700; color:#333; }

/* ── Seiten-Wrapper ── */
.page-wrap { padding:16px 0 40px; display:flex; flex-direction:column; align-items:center; gap:24px; }
@media print { .page-wrap { padding:0; background:white; display:block; } }

/* ── A4 Blatt ── */
.a4 {
  width: 210mm;
  min-height: 297mm;
  background: white;
  padding: 8mm 0 0 0;
  display: flex;
  flex-direction: column;
}
@media screen {
  .a4 {
    padding: 16mm 18mm 14mm;
    box-shadow: 0 4px 32px rgba(0,0,0,.18);
    margin: 0 auto;
  }
}
@media print  { .a4 { width: auto; min-height:0; padding: 0; } }
.page-break { break-before: page; }

/* ── Dokumentkopf (identisch zu Rechnung/Angebot) ── */
.top-bar { display:flex; justify-content:flex-end; align-items:flex-start; margin-bottom:9mm; }
.logo-area { flex-shrink:0; max-width:62mm; text-align:right; }
.company-logo { max-width:60mm; max-height:28mm; object-fit:contain; display:block; margin-left:auto; }
.logo-fallback { text-align:right; }
.logo-name { font-size:14pt; font-weight:700; color:#111; }

/* ── Anschriftenfeld + Meta (DIN 5008, identisch zu Rechnung) ── */
.addr-meta-row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:9mm; gap:10mm; }
.addr-block { min-width:78mm; max-width:88mm; }
.addr-sender-micro { font-size:7pt; color:#888; border-bottom:0.4pt solid #bbb; padding-bottom:2px; margin-bottom:3.5mm; line-height:1.4; }
.addr-recipient { line-height:1.7; font-size:10pt; }
.addr-salutation { color:#444; font-size:9.5pt; }
.addr-name { font-weight:700; font-size:10.5pt; }
.meta-block { flex-shrink:0; }
.meta-table { border-collapse:collapse; }
.meta-label { font-size:7.5pt; color:#777; padding:1.5px 10px 1.5px 0; white-space:nowrap; vertical-align:top; }
.meta-value { font-size:8pt; color:#111; text-align:right; padding:1.5px 0; white-space:nowrap; }
.fw-700 { font-weight:700; }

/* ── Dokumenttitel (identisch zu Rechnung) ── */
.doc-title-block {
  margin-bottom: 6mm;
  padding-bottom: 4mm;
  border-bottom: 0.5pt solid #ccc;
  break-after: avoid;
}
.doc-title { font-size: 13pt; font-weight: 700; color: #111; line-height: 1.35; }
.doc-event-line { font-size: 8.5pt; color: #666; margin-top: 2px; }

/* ── Sektionen (Paragraphen) ── */
.section { margin-bottom: 5mm; break-inside: avoid; }
.sh-row {
  display: flex; align-items: baseline; gap: 3mm;
  margin-bottom: 2.5mm; break-after: avoid;
  border-bottom: 0.5pt solid #e0e0e0;
  padding-bottom: 1.5mm;
}
.sh-pill {
  font-size: 7pt; font-weight: 800; color: #4f46e5;
  background: rgba(79,70,229,.08);
  border: 0.8pt solid rgba(79,70,229,.22);
  padding: 1.5px 7px; border-radius: 4px;
  white-space: nowrap; flex-shrink: 0; letter-spacing: .02em;
}
.sh { font-size: 9.5pt; font-weight: 700; color: #111; flex: 1; }

/* ── Absatztext ── */
.p { font-size: 8.5pt; line-height: 1.65; color: #1a1a1a; orphans: 3; widows: 3; }
.p + .p { margin-top: 1.5mm; }
.mt-2 { margin-top:1.5mm; } .mt-3 { margin-top:2mm; }
.mt-4 { margin-top:3mm; }   .mt-6 { margin-top:5mm; }
.hint-text { font-size:7.5pt; color:#777; font-style:italic; line-height:1.5; }

/* ── Listen ── */
.ul-list { margin-left: 4mm; padding: 0; list-style: none; }
.ul-list li { font-size: 8.5pt; line-height: 1.65; padding-left: 4mm; position: relative; margin-bottom: 1mm; }
.ul-list li::before { content: "•"; position: absolute; left: 0; color: #888; font-size: 8pt; }

/* ── Checkboxen ── */
.cb { font-size: 11pt; min-width: 5mm; line-height: 1; flex-shrink: 0; }
.cb-list { display: flex; flex-direction: column; gap: 2.5mm; }
.cb-row  { display: flex; gap: 3mm; align-items: flex-start; font-size: 8.5pt; line-height: 1.6; }

/* ── Infoboxen ── */
.infobox { background:#f8f8f8; border:0.5pt solid #e0e0e0; border-left:2.5pt solid #4f46e5; border-radius:2px; padding:3mm 4mm; font-size:8.5pt; line-height:1.65; break-inside:avoid; }
.infobox-blue { background:#f0f6ff; border-left-color:#2563eb; }
.infobox-warn { background:#fffbeb; border-left-color:#d97706; }

/* ── Detail-Tabelle ── */
.dt td { padding:1.5px 0; font-size:8.5pt; vertical-align:top; }
.dl { color:#777; min-width:46mm; width:46mm; }
.dv { font-weight:600; color:#111; padding-left:4mm; }

/* ── Parteien ── */
.parties-grid { display:grid; grid-template-columns:1fr auto 1fr; gap:5mm; margin-top:3mm; break-inside:avoid; }
.party-block  { padding:3mm; background:#f9f9f9; border:0.5pt solid #e8e8e8; border-radius:2px; line-height:1.65; font-size:8.5pt; }
.party-role   { font-size:7pt; color:#999; margin-bottom:1.5mm; text-transform:uppercase; letter-spacing:.04em; }
.party-name   { font-size:10pt; font-weight:700; color:#111; margin-bottom:.5mm; }
.party-company{ font-size:8.5pt; font-weight:600; color:#333; }
.party-line   { font-size:8.5pt; color:#444; }
.party-tax    { font-size:7.5pt; color:#aaa; }
.party-und    { align-self:center; font-style:italic; color:#bbb; font-size:9pt; padding:0 2mm; }

/* ── Stornotabelle ── */
.storno-table { width:100%; border-collapse:collapse; font-size:8pt; break-inside:avoid; }
.storno-table th { padding:2mm 3mm; background:#f4f4f4; border:0.5pt solid #e0e0e0; font-weight:700; text-align:left; }
.storno-table td { padding:1.5mm 3mm; border:0.5pt solid #e0e0e0; }
.storno-table tbody tr:nth-child(even) { background:#fafafa; }
.fee-col { text-align:right; font-weight:700; width:26mm; }

/* ── Service-Zeilen ── */
.svc-list { display:flex; flex-direction:column; gap:1.5mm; margin-top:1.5mm; }
.svc-row  { display:flex; gap:2.5mm; align-items:baseline; font-size:8.5pt; }
.svc-det  { font-size:7.5pt; color:#888; margin-left:2mm; }

/* ── TOM Grid ── */
.tom-grid { display:grid; grid-template-columns:1fr 1fr; gap:2.5mm; break-inside:avoid; margin-top:2mm; }
.tom-item { background:#f9f9f9; border:0.5pt solid #e0e0e0; border-radius:2px; padding:2mm 3mm; break-inside:avoid; }
.tom-cat  { font-size:7.5pt; font-weight:700; color:#333; margin-bottom:1mm; }
.tom-text { font-size:7.5pt; color:#555; line-height:1.55; }

/* ── Unterschriften ── */
.sig-section { break-inside:avoid; margin-top:8mm; }
.sig-note    { font-size:7.5pt; color:#666; line-height:1.55; margin-bottom:5mm; }
.sig-grid    { display:grid; grid-template-columns:1fr 1fr; gap:14mm; }
.sig-block   { display:flex; flex-direction:column; }
.sig-line    { border-bottom:0.8pt solid #333; height:14mm; margin-bottom:2mm; }
.sig-label   { font-size:7pt; color:#888; }
.sig-pre     { font-size:7pt; color:#bbb; margin-top:1mm; }

/* ── Schluss-Trennlinie ── */
.closing-rule { border:none; border-top:0.5pt solid #ccc; margin:4mm 0 3mm; }

/* ── Screen-Footer (inline, nur Bildschirm) ── */
.screen-footer { margin-top:auto; padding-top:5mm; }
.sf-rule  { border:none; border-top:0.5pt solid #ccc; margin-bottom:3mm; }
.sf-cols  { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5mm; }
.sf-cols > div, .footer-col { font-size:6.5pt; color:#666; line-height:1.65; }
.fc-bold  { font-weight:700; color:#333; }
.footer-rule { border:none; border-top:0.5pt solid #ccc; margin-bottom:3mm; }
@media print { .screen-footer { display:none; } }

/* ── ENTWURF Wasserzeichen ── */
.draft-wm { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-45deg); font-size:88pt; font-weight:900; color:rgba(0,0,0,.04); letter-spacing:14px; pointer-events:none; white-space:nowrap; user-select:none; z-index:0; }
@media screen { .draft-wm { display:none; } }

/* ── Spezial-Boxen ── */
.custom-price-box { background:#f8f8f8; border:0.5pt solid #e0e0e0; border-left:2.5pt solid #4f46e5; border-radius:2px; padding:3mm 4mm; font-size:8.5pt; white-space:pre-wrap; line-height:1.6; break-inside:avoid; }
.commercial-box   { background:#eff6ff; border:0.5pt solid #bfdbfe; border-left:2.5pt solid #2563eb; border-radius:2px; padding:2.5mm 3.5mm; font-size:8pt; line-height:1.55; break-inside:avoid; }
.equipment-box    { background:#fef2f2; border:0.5pt solid #fca5a5; border-left:2.5pt solid #dc2626; border-radius:2px; padding:2.5mm 3.5mm; font-size:8pt; line-height:1.6; white-space:pre-wrap; break-inside:avoid; }
.add-notes        { background:#fffbeb; border:0.5pt solid #e5c96a; border-left:2.5pt solid #d97706; border-radius:2px; padding:2.5mm 3.5mm; font-size:8pt; white-space:pre-wrap; break-inside:avoid; }
.addendum-box     { background:#f8faff; border:0.5pt solid #dbeafe; border-left:2.5pt solid #2563eb; border-radius:2px; padding:3mm 4mm; font-size:8.5pt; line-height:1.7; white-space:pre-wrap; break-inside:avoid; }
.datasheet        { background:#fafafa; border:0.5pt solid #e0e0e0; padding:3mm; margin-bottom:3mm; break-inside:avoid; }

/* ── Status-Badges ── */
.tbadge{font-size:11px;padding:3px 9px;border-radius:99px;font-weight:600}
.tbadge.private{background:rgba(107,114,128,.15);color:#6b7280;border:1px solid rgba(107,114,128,.2)}
.tbadge.commercial{background:rgba(37,99,235,.1);color:#1d4ed8;border:1px solid rgba(37,99,235,.2)}
.tbadge.ads{background:rgba(234,179,8,.1);color:#92400e;border:1px solid rgba(234,179,8,.2)}
.tbadge.status-draft{background:rgba(107,114,128,.1);color:#6b7280}
.tbadge.status-sent{background:rgba(234,179,8,.12);color:#92400e}
.tbadge.status-signed{background:rgba(5,150,105,.12);color:#065f46}

/* ── Logo-Header ab Seite 2 ── */
.page-header-logo { position:fixed; top:0; right:0; padding:5mm 18mm 2mm; z-index:200; background:white; }
.page-header-logo img { max-height:14mm; max-width:50mm; object-fit:contain; display:block; margin-left:auto; }
.page-header-logo-text { font-size:10pt; font-weight:700; color:#111; }
@media print { .page-wrap { position:relative; z-index:250; } }
</style>
