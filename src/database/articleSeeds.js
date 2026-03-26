'use strict';
/**
 * articleSeeds.js – Die 17 vorinstallierten Standardartikel
 *
 * Diese Artikel werden beim ersten DB-Start automatisch angelegt.
 * Sie sind löschgeschützt (PROTECTED_ARTICLE_IDS) und ihre Preise
 * werden automatisch mit den Einstellungen synchronisiert.
 *
 * Manuelle Artikel (vom User angelegt) sind NICHT betroffen.
 */

// IDs die nicht gelöscht werden dürfen
const PROTECTED_ARTICLE_IDS = new Set([
  'art-photo-privat',
  'art-photo-b2b',
  'art-video-privat',
  'art-video-b2b',
  'art-km-plus',
  'art-km-minus',
  'art-image-b2b',
  'art-image-privat',
  'art-video-10min',
  'art-photo-setup-b2b',
  'art-video-setup-b2b',
  'art-nutzungsrechte',
  'art-photo-privat-day',
  'art-photo-b2b-day',
  'art-video-privat-day',
  'art-video-b2b-day',
  'art-pauschale',
]);

// Mapping: Artikel-ID → Settings-Feld in bookingTerms
// Wird von settingsService._syncArticlePrices() verwendet
const ARTICLE_RATE_MAP = {
  'art-photo-privat':      'hourlyRatePhotoPrivat',
  'art-photo-b2b':         'hourlyRatePhotoB2B',
  'art-photo-setup-b2b':   'hourlyRatePhotoSetup',
  'art-video-privat':      'hourlyRateVideoPrivat',
  'art-video-b2b':         'hourlyRateVideoB2B',
  'art-video-setup-b2b':   'hourlyRateVideoSetup',
  'art-image-privat':      'imagePricePrivat',
  'art-image-b2b':         'imagePriceB2B',
  'art-video-10min':       'videoPer10min',
  'art-km-plus':           'defaultKmRate',
  'art-photo-privat-day':  'dayRatePhotoPrivat',
  'art-photo-b2b-day':     'dayRatePhotoB2B',
  'art-video-privat-day':  'dayRateVideoPrivat',
  'art-video-b2b-day':     'dayRateVideoB2B',
};

// Die Standardartikel (Preise sind Defaults – werden beim Seed mit
// bookingTerms-Werten überschrieben falls vorhanden)
const STANDARD_ARTICLES = [
  {
    id: 'art-photo-privat', number: 'ART-00001',
    name: 'Fotografie – Stundensatz (Privat)',
    description: 'Stundensatz für Fotoaufnahmen, Bildbearbeitung und Ablieferung im Privatkundenbereich. Umfasst Shooting, Retusche und Online-Galerie.',
    unit: 'Stunde', priceNet: 250, taxRate: 0, category: 'Fotografie',
  },
  {
    id: 'art-photo-b2b', number: 'ART-00002',
    name: 'Fotografie – Stundensatz (B2B)',
    description: 'Stundensatz für gewerbliche Fotografie inkl. Vorbereitung/Konzeption, Abstimmung/Meetings, Shooting und Bildbearbeitung.',
    unit: 'Stunde', priceNet: 200, taxRate: 0, category: 'Fotografie',
  },
  {
    id: 'art-video-privat', number: 'ART-00003',
    name: 'Videografie – Stundensatz (Privat)',
    description: 'Stundensatz für Videoaufnahmen, Schnitt und Nachbearbeitung im Privatkundenbereich.',
    unit: 'Stunde', priceNet: 250, taxRate: 0, category: 'Videografie',
  },
  {
    id: 'art-video-b2b', number: 'ART-00004',
    name: 'Videografie – Stundensatz (B2B)',
    description: 'Stundensatz für gewerbliche Videoproduktion inkl. Vorbereitung/Konzeption, Abstimmung/Meetings, Dreh und Schnitt/Nachbearbeitung.',
    unit: 'Stunde', priceNet: 200, taxRate: 0, category: 'Videografie',
  },
  {
    id: 'art-km-plus', number: 'ART-00005',
    name: 'Kilometerpauschale',
    description: 'Fahrtkostenerstattung je gefahrenen Kilometer (einfache Strecke ab Wohnort des Auftragnehmers).',
    unit: 'km', priceNet: 0.5, taxRate: 0, category: 'Reisekosten',
  },
  {
    id: 'art-km-minus', number: 'ART-00006',
    name: 'Kilometerpauschale (Gutschrift)',
    description: 'Gutschrift Kilometerpauschale – wird zur Korrektur oder Rabattierung von Fahrtkosten verwendet.',
    unit: 'km', priceNet: -0.5, taxRate: 0, category: 'Reisekosten',
  },
  {
    id: 'art-image-b2b', number: 'ART-00007',
    name: 'Einzelbild – Digital (B2B)',
    description: 'Lizenz für ein bearbeitetes Einzelbild zur gewerblichen Nutzung (digital, hochauflösend). Nutzungsrechte gemäß separater Vereinbarung.',
    unit: 'Bild', priceNet: 60, taxRate: 0, category: 'Bildrechte',
  },
  {
    id: 'art-image-privat', number: 'ART-00008',
    name: 'Einzelbild – Digital (Privat)',
    description: 'Lizenz für ein bearbeitetes Einzelbild zur privaten Nutzung (digital, hochauflösend).',
    unit: 'Bild', priceNet: 40, taxRate: 0, category: 'Bildrechte',
  },
  {
    id: 'art-video-10min', number: 'ART-00009',
    name: 'Videoproduktion – 10 Minuten',
    description: 'Fertig produziertes Video (bis 10 Minuten) inkl. Schnitt, Farbkorrektur, Tonbearbeitung und Musikuntermalung. Lieferung als MP4 (1080p / 4K auf Anfrage).',
    unit: 'Stück', priceNet: 1200, taxRate: 0, category: 'Videografie',
  },
  {
    id: 'art-photo-setup-b2b', number: 'ART-00010',
    name: 'Fotografie – Rüstzeit B2B',
    description: 'Stundensatz für Rüst- und Vorbereitungszeiten im B2B-Bereich: Briefing, Konzeption, Abstimmungsmeetings, Nachbearbeitung und Projektkoordination.',
    unit: 'Stunde', priceNet: 100, taxRate: 0, category: 'Fotografie',
  },
  {
    id: 'art-video-setup-b2b', number: 'ART-00011',
    name: 'Videografie – Rüstzeit B2B',
    description: 'Stundensatz für Rüst- und Vorbereitungszeiten im B2B-Bereich: Konzeption, Storyboard, Abnahmerunden, Projektkoordination und Nachbearbeitung.',
    unit: 'Stunde', priceNet: 100, taxRate: 0, category: 'Videografie',
  },
  {
    id: 'art-nutzungsrechte', number: 'ART-00012',
    name: 'Nutzungsrechte / Lizenz',
    description: 'Lizenzgebühr für die werbliche Nutzung der gelieferten Bild- und/oder Videomaterialien. Berechnungsgrundlage, Nutzungsart, Laufzeit und Geltungsbereich gemäß gesonderter Vereinbarung im Auftragsformular.',
    unit: 'Pauschal', priceNet: 0, taxRate: 0, category: 'Nutzungsrechte', autoFromNR: true,
  },
  {
    id: 'art-photo-privat-day', number: 'ART-00013',
    name: 'Fotografie – Tagessatz (Privat)',
    description: 'Tagessatz für Fotoaufnahmen im Privatkundenbereich (8 Stunden). Umfasst Shooting, Retusche und Online-Galerie.',
    unit: 'Tag', priceNet: 2000, taxRate: 0, category: 'Fotografie',
  },
  {
    id: 'art-photo-b2b-day', number: 'ART-00014',
    name: 'Fotografie – Tagessatz (B2B)',
    description: 'Tagessatz für gewerbliche Fotografie (8 Stunden). Inkl. Konzeption, Shooting, Bildbearbeitung und Ablieferung.',
    unit: 'Tag', priceNet: 1600, taxRate: 0, category: 'Fotografie',
  },
  {
    id: 'art-video-privat-day', number: 'ART-00015',
    name: 'Videografie – Tagessatz (Privat)',
    description: 'Tagessatz für Videoaufnahmen im Privatkundenbereich (8 Stunden). Umfasst Dreh, Schnitt und Farbkorrektur.',
    unit: 'Tag', priceNet: 2000, taxRate: 0, category: 'Videografie',
  },
  {
    id: 'art-video-b2b-day', number: 'ART-00016',
    name: 'Videografie – Tagessatz (B2B)',
    description: 'Tagessatz für gewerbliche Videoproduktion (8 Stunden). Inkl. Konzeption, Dreh, Schnitt, Farbkorrektur und Audiomix.',
    unit: 'Tag', priceNet: 1600, taxRate: 0, category: 'Videografie',
  },
  {
    id: 'art-pauschale', number: 'ART-00017',
    name: 'Pauschale Arbeitsleistung',
    description: 'Pauschalpreis für fotografische/videografische Dienstleistung laut Vereinbarung. Preis und Leistungsbeschreibung werden aus der Anfrage übernommen.',
    unit: 'Pauschal', priceNet: 0, taxRate: 0, category: 'Allgemein',
  },
];

module.exports = { STANDARD_ARTICLES, PROTECTED_ARTICLE_IDS, ARTICLE_RATE_MAP };
