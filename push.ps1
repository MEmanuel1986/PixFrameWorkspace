# Alle Änderungen hinzufügen
git add .

# Nachricht abfragen
$message = Read-Host "👉 Was hast du geändert? (Commit Message)"

# Wenn Nachricht leer ist, abbrechen
if ([string]::IsNullOrWhiteSpace($message)) {
    Write-Host "❌ Fehler: Ohne Nachricht kein Commit!" -ForegroundColor Red
    exit
}

# Commit und Push
git commit -m "$message"
git push

Write-Host "✅ Erledigt! Dein Code ist jetzt online." -ForegroundColor Green