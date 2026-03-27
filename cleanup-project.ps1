# 1. Doppelte Dateien im Root
git rm server.js
git rm -r src/

# 2. Legacy Update-System
git rm update-manifest.json
git rm update-manifest.json.template
git rm backend/src/services/updateService.js
git rm backend/src/controllers/updateController.js
git rm backend/src/routes/update.js

# 3. Nicht mehr benoetigte Docs
git rm INTEGRATION_PLAN.md
git rm README.txt
git rm ROADMAP.txt
git rm ROADMAP.md

# 4. Commit + Push
git commit -m "cleanup: Duplikate, Altlasten und Legacy entfernt"
git push