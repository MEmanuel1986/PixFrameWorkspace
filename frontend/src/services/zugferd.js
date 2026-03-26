/**
 * ZUGFeRD 2.3 / Factur-X MINIMUM Profile Generator
 * EU-Richtlinie 2014/55/EU · EN 16931 · CIUS DE
 *
 * MINIMUM Profile enthält die für maschinelle Verarbeitung nötigsten Daten.
 * Für Kleinunternehmer (§ 19 UStG) gilt: Steuerbefreiung mit BT-9 = tax code "E"
 *
 * Verwendung:
 *   import { generateZugferdXml, downloadZugferdXml } from './zugferd.js'
 *   const xml = generateZugferdXml(doc, customer, settings, project)
 *   downloadZugferdXml(xml, doc.documentNumber)
 */

/**
 * Format a number as decimal string for XML (no currency symbol, . as decimal sep)
 */
function num(v) {
  return (Number(v) || 0).toFixed(2)
}

/**
 * Format date as YYYYMMDD for ZUGFeRD
 */
function dt(d) {
  if (!d) return new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return new Date(d).toISOString().slice(0, 10).replace(/-/g, '')
}

/**
 * Escape XML special characters
 */
function esc(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generate ZUGFeRD 2.3 MINIMUM XML
 * @param {Object} doc       - Document record (invoice)
 * @param {Object} customer  - Customer record
 * @param {Object} settings  - Settings (company, etc.)
 * @param {Object} project   - Project record (optional, for service date)
 * @returns {string}         - XML string
 */
export function generateZugferdXml(doc, customer, settings, project = null) {
  const co  = settings.company || {}
  const inv = doc || {}
  const cus = customer || {}

  const isSmallBiz  = !!co.smallBusiness
  const invoiceDate = dt(inv.issueDate)
  const serviceDate = dt(inv.serviceDate || (project?.booking) || inv.issueDate)
  const dueDate     = dt(inv.dueDate || inv.issueDate)

  // Tax: Kleinunternehmer → category E (exempt), others → S (standard)
  const taxCategory = isSmallBiz ? 'E' : 'S'
  const taxRate     = isSmallBiz ? '0' : '19'
  const taxExemptReason = isSmallBiz
    ? 'Steuerbefreiung nach § 19 Abs. 1 UStG (Kleinunternehmerregelung)'
    : ''

  // Billing address — use billingAddress if present, else customer data
  const ba = inv.billingAddress || {}
  const buyerName    = esc(ba.name     || `${cus.firstName || ''} ${cus.lastName || ''}`.trim() || cus.company || 'Auftraggeber')
  const buyerStreet  = esc(ba.street   || `${cus.street || ''} ${cus.houseNumber || ''}`.trim())
  const buyerZip     = esc(ba.zipCode  || cus.zipCode || '')
  const buyerCity    = esc(ba.city     || cus.city    || '')
  const buyerCountry = esc(ba.country  || 'DE')

  // Line items
  const lineItems = Array.isArray(inv.lineItems) && inv.lineItems.length > 0
    ? inv.lineItems
    : [{ name: inv.name || 'Fotografiedienstleistung', quantity: 1, unitPrice: inv.total || 0, unit: 'Pauschal', vatRate: isSmallBiz ? 0 : 19 }]

  const lineItemsXml = lineItems.map((item, i) => {
    const qty   = Number(item.quantity ?? 1)
    const price = Number(item.unitPrice ?? item.price ?? item.priceNet ?? 0)
    const total = Number(item.total ?? (qty * price))
    const vat   = isSmallBiz ? 0 : Number(item.vatRate ?? 19)
    const unit  = item.unit || 'C62' // C62 = "one" in UN/CEFACT
    const unitCode = unitToUNCode(unit)

    return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${i + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${esc(item.name || item.description || 'Dienstleistung')}</ram:Name>
        ${item.detail || item.notes ? `<ram:Description>${esc(item.detail || item.notes)}</ram:Description>` : ''}
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${num(price)}</ram:ChargeAmount>
          <ram:BasisQuantity unitCode="${unitCode}">1</ram:BasisQuantity>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${unitCode}">${num(qty)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${taxCategory}</ram:CategoryCode>
          <ram:RateApplicablePercent>${vat}</ram:RateApplicablePercent>
          ${taxExemptReason ? `<ram:ExemptionReason>${esc(taxExemptReason)}</ram:ExemptionReason>` : ''}
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${num(total)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`
  }).join('')

  const subtotal  = Number(inv.subtotal || inv.total || 0)
  const totalGross = Number(inv.total || 0)
  const taxAmount  = isSmallBiz ? 0 : (totalGross - subtotal)
  const netAmount  = isSmallBiz ? totalGross : subtotal

  // Payment reference / IBAN
  const payRef = inv.documentNumber ? `${inv.documentNumber} ${inv.name || ''}`.trim() : 'Rechnung'

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ZUGFeRD 2.3 / Factur-X MINIMUM profile -->
<!-- Generated by PixFrameWorkspace · ${new Date().toISOString()} -->
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <!-- BG-2: Process control -->
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <!-- BG-1: Invoice header -->
  <rsm:ExchangedDocument>
    <ram:ID>${esc(inv.documentNumber || 'RE-DRAFT')}</ram:ID>
    <!-- BT-3: Type code 380 = Invoice, 386 = Prepayment invoice -->
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${invoiceDate}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>

    <!-- Line items -->
    ${lineItemsXml}

    <!-- BG-4: Seller / Auftragnehmer -->
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(co.name || 'Fotostudio')}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${esc(co.zipCode || '')}</ram:PostcodeCode>
          <ram:LineOne>${esc(co.street || '')}</ram:LineOne>
          <ram:CityName>${esc(co.city || '')}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          ${co.vatId && !isSmallBiz ? `<ram:ID schemeID="VA">${esc(co.vatId)}</ram:ID>` : ''}
          ${co.taxNumber ? `<ram:ID schemeID="FC">${esc(co.taxNumber)}</ram:ID>` : ''}
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>

      <!-- BG-7: Buyer / Auftraggeber -->
      <ram:BuyerTradeParty>
        <ram:Name>${buyerName}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${buyerZip}</ram:PostcodeCode>
          <ram:LineOne>${buyerStreet}</ram:LineOne>
          <ram:CityName>${buyerCity}</ram:CityName>
          <ram:CountryID>${buyerCountry}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>

      <!-- BT-13: Purchase order reference (optional) -->
      ${inv.documentNumber ? `<ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>${esc(inv.documentNumber)}</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>` : ''}
    </ram:ApplicableHeaderTradeAgreement>

    <!-- BG-13: Delivery / Leistungsdatum -->
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${serviceDate}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>

    <!-- BG-19: Settlement -->
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${esc(payRef)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>

      <!-- Payment means: IBAN transfer (code 58) -->
      ${co.iban ? `
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${esc(co.iban.replace(/\s/g, ''))}</ram:IBANID>
          ${co.bankName ? `<ram:AccountName>${esc(co.bankName)}</ram:AccountName>` : ''}
        </ram:PayeePartyCreditorFinancialAccount>
        ${co.bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${esc(co.bic)}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>` : ''}

      <!-- BG-23: Tax breakdown -->
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${num(taxAmount)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        ${taxExemptReason ? `<ram:ExemptionReason>${esc(taxExemptReason)}</ram:ExemptionReason>` : ''}
        <ram:BasisAmount>${num(netAmount)}</ram:BasisAmount>
        <ram:CategoryCode>${taxCategory}</ram:CategoryCode>
        <ram:RateApplicablePercent>${taxRate}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>

      <!-- BG-14: Payment terms / Due date -->
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${dueDate}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>

      <!-- BG-22: Monetary totals -->
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${num(netAmount)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${num(netAmount)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${num(taxAmount)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${num(totalGross)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${num(totalGross)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>

  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`.trim()
}

/**
 * Convert display unit to UN/CEFACT unit code
 */
function unitToUNCode(unit) {
  if (!unit) return 'C62'
  const u = unit.toLowerCase()
  if (u === 'h' || u === 'h' || u.includes('stunde')) return 'HUR'
  if (u === 'tag' || u === 'tage') return 'DAY'
  if (u === 'km') return 'KMT'
  if (u === 'stk' || u === 'stück' || u === 'st.' || u === 'stk.') return 'C62'
  if (u === 'pauschal' || u === 'pauschale' || u === 'ls') return 'LS'
  return 'C62'
}

/**
 * Trigger XML download in browser
 */
export function downloadZugferdXml(xml, documentNumber) {
  const filename = `${documentNumber || 'Rechnung'}_ZUGFeRD.xml`
    .replace(/[^a-z0-9äöüÄÖÜß_.\-]/gi, '_')
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
