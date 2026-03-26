'use strict';
/**
 * updateController.js
 * HTTP-Adapter für das Update-System.
 *
 * POST /api/update/preview   → Manifest aus ZIP lesen (ohne Anwenden)
 * POST /api/update/apply     → Update vollständig anwenden + Neustart
 */

const path          = require('path');
const fs            = require('fs');
const os            = require('os');
const paths         = require('../config/paths');
const updateService = require('../services/updateService');

const updateController = {

  /**
   * Liest das Manifest aus dem hochgeladenen ZIP und gibt es zurück.
   * Nützlich für "Was bringt dieses Update?" vor dem eigentlichen Anwenden.
   */
  async preview(req, res) {
    let tempPath = null;
    try {
      if (!req.files?.update) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen' });
      }
      const file = req.files.update;
      if (!file.name.endsWith('.zip')) {
        return res.status(400).json({ error: 'Nur ZIP-Dateien werden akzeptiert' });
      }

      tempPath = path.join(os.tmpdir(), `pfupdate_preview_${Date.now()}.zip`);
      await new Promise((resolve, reject) =>
        file.mv(tempPath, err => err ? reject(err) : resolve())
      );

      const manifest = await updateService.readManifest(tempPath);
      res.json({ success: true, data: manifest });

    } catch (err) {
      console.error('[updateController] preview:', err.message);
      res.status(400).json({ error: err.message });
    } finally {
      if (tempPath) try { fs.unlinkSync(tempPath); } catch {}
    }
  },

  /**
   * Wendet das Update an:
   *   1. ZIP speichern
   *   2. Manifest validieren
   *   3. Backup erstellen
   *   4. Dateien kopieren
   *   5. Response senden
   *   6. Backend neu starten (Dateiänderungen → nodemon; exit(0) als Fallback)
   */
  async apply(req, res) {
    let tempPath = null;
    try {
      if (!req.files?.update) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen' });
      }
      const file = req.files.update;
      if (!file.name.endsWith('.zip')) {
        return res.status(400).json({ error: 'Nur ZIP-Dateien werden akzeptiert' });
      }

      // ZIP in temp speichern
      tempPath = path.join(os.tmpdir(), `pfupdate_${Date.now()}.zip`);
      await new Promise((resolve, reject) =>
        file.mv(tempPath, err => err ? reject(err) : resolve())
      );

      // Update anwenden (async, blockiert)
      const result = await updateService.applyUpdate(tempPath);

      // Response senden und dann sauber beenden.
      // res.json() schreibt in den Socket-Buffer, das Callback von res.end()
      // wird erst aufgerufen wenn die Daten wirklich raus sind.
      const payload = JSON.stringify({
        success: true,
        data: {
          version:      result.manifest.version,
          title:        result.manifest.title,
          copied:       result.copied.length,
          npmInstalled: result.npmInstalled,
          restarting:   true,
        },
      });
      res.setHeader('Content-Type', 'application/json');
      res.end(payload, () => {
        setImmediate(() => {
          console.log('[update] Update abgeschlossen — starte Backend neu (exit 0)...');
          process.exit(0);
        });
      });

    } catch (err) {
      console.error('[updateController] apply:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    } finally {
      if (tempPath) try { fs.unlinkSync(tempPath); } catch {}
    }
  },
};

module.exports = updateController;
