# 🌿 foodies

Unsere kleine Küchen-Seite: Rezepte, Kalender, Reste, Einkaufsliste & Inspiration.

## Starten
Kein Build nötig – einfach einen lokalen Server im Ordner starten:

```bash
python3 -m http.server 8000
```

und `http://localhost:8000` öffnen.

## Stand
- **🍝 Rezepte** – Liste, Detailansicht mit Portionsrechner, Vorlage zum Anlegen/Bearbeiten (Titel & Bild, Zutaten, Zubereitung, Tipps)
- 🗓️ Kalender, 🥡 Reste, 🛒 Einkaufsliste, ✨ Inspiration – folgen

## Speicher
- **Ohne Einstellungen:** Rezepte (inkl. Bilder) liegen nur lokal im Browser (IndexedDB).
- **Gemeinsame Sammlung:** In `js/config.js` die Supabase-Projekt-URL und den `anon public`-Schlüssel
  eintragen. Dann gibt es eine Anmeldung, und alle Geräte teilen dieselben Rezepte (live).
  Die Datenbank wird einmalig mit `supabase/setup.sql` eingerichtet (SQL Editor → Run).
  Danach – jeweils einmal und in dieser Reihenfolge – `supabase/households.sql`, `supabase/profiles.sql`, `supabase/multi.sql` und `supabase/admin.sql` (Haushalte löschen für den Verwalter).

## Hosting
Cloudflare Pages: Projekt aus GitHub verbinden, Framework „None“,
Build-Befehl `npm run build`, Ausgabeverzeichnis `dist`. Cache-Einstellungen stehen in `_headers`.
