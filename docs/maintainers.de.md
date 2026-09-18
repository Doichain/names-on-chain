# Für Maintainer

[English](maintainers.md)

## Ein Branch pro Lektion

Die Lektionen bauen aufeinander auf, die Branches ebenso:

```
lesson01 → lesson02 → lesson03 → lesson04 → lesson05 → main
```

Jeder Branch enthält alles aus dem Branch davor. `main` ist Lektion 5 plus die Workflows, die alle Lektionen veröffentlichen und die Links prüfen.

## Etwas korrigieren

1. Korrigieren Sie es auf dem frühesten Branch, der das Problem hat, mit einem Test, wenn sich Code ändert.
2. Mergen Sie es nach vorn, einen Branch nach dem anderen:

   ```bash
   git switch lesson02 && git merge lesson01
   git switch lesson03 && git merge lesson02
   git switch lesson04 && git merge lesson03
   git switch lesson05 && git merge lesson04
   git switch main && git merge lesson05
   ```

3. Lassen Sie die Prüfungen auf jedem Branch laufen und pushen Sie dann jeden Branch mit einem eigenen `git push`, `main` zuletzt. Ein einzelner Push mehrerer Branches startet die CI nur für einen davon.

Drei Regeln halten die Vorwärts-Merges billig:

- **Nie squashen**, wenn ein Pull Request in einen Lektions-Branch geht. Der nächste Vorwärts-Merge brächte seine Änderungen ein zweites Mal, als Konflikte. Nehmen Sie einen Merge-Commit oder ein Rebase.
- **rerere einschalten** mit `git config rerere.enabled true`. Git merkt sich dann, wie Sie einen Konflikt gelöst haben, und löst denselben Konflikt im nächsten Branch selbst.
- **`src/lib/components/pricing.svelte` ist in jeder Lektion anders.** Bei einem Konflikt dort behalten Sie die Fassung der Lektion und tragen Ihre Änderung erneut ein.

## Jeder Branch behält sein README

Jeder Branch hat ein README zu seiner eigenen Lektion. `.gitattributes` markiert `README.md` mit `merge=ours`, sodass ein Vorwärts-Merge das README des Ziel-Branches behält. Git braucht diesen Treiber einmal pro Klon:

```bash
git config merge.ours.driver true
```

Ohne ihn merged git READMEs wie jede andere Datei, und die Konflikte tauchen auf.

Die Lektionstexte in `docs/lessons/` und die übrigen Seiten in `docs/` sind auf allen Branches gleich und werden wie Code nach vorn gemergt.

## Texte und Übersetzungen

- Die Texte der App stehen in `src/lib/i18n/en.json` und `de.json`, auf allen Branches gleich. Legen Sie einen Schlüssel auf `lesson01` an und mergen Sie ihn nach vorn, auch wenn erst eine spätere Lektion ihn nutzt. `catalogue.test.js` schlägt fehl, wenn ein Schlüssel in einer Sprache fehlt.
- Jede Seite in `docs/` hat einen deutschen Zwilling mit `.de.md`. Die READMEs gibt es nur auf Englisch.

## Prüfungen

```bash
pnpm run lint               # Prettier und ESLint
pnpm run check              # svelte-check
pnpm exec vitest run        # Unit-Tests
pnpm exec playwright test   # Browser-Tests in Chromium, gegen ein simuliertes ElectrumX
```

Die Browser-Tests machen auch die Bildschirmfotos, die in den Lektionstexten stehen, und schreiben sie nach `docs/img/`. Dabei prüfen sie den Zustand, den das Bild zeigt: Ein Bildschirmfoto, das sich nicht mehr erreichen lässt, lässt den Lauf scheitern, statt still zu veralten. Geschrieben werden sie nur bei einem Lauf mit `SCREENSHOTS=1`, ein normaler Lauf lässt das Repository also sauber. Nach einer sichtbaren Änderung `SCREENSHOTS=1 pnpm exec playwright test screenshots` laufen lassen und committen, was dabei entsteht.

Die CI führt alle vier bei jedem Push auf einen Lektions-Branch oder `main` aus. Die Smoke-Tests bauen die App und starten ihre eigene Vorschau auf Port 4180. Ist Playwrights eigenes Chromium nicht installiert, setzen Sie `CHROMIUM_PATH` auf ein anderes Chromium.

## Veröffentlichen

- **GitHub Pages:** Jeder Push auf `main` baut alle fünf Lektionen aus den Spitzen ihrer Branches (`.github/workflows/pages.yml`) und veröffentlicht sie unter https://doichain.github.io/names-on-chain/.
- **IPFS:** Derselbe Workflow pinnt die Seite über Aleph, sobald das Repository-Secret `ALEPH_PRIVATE_KEY` gesetzt ist. Wie Sie eine Lektion von Ihrem eigenen Knoten veröffentlichen: [IPFS](ipfs.de.md).
- **Links:** `.github/workflows/links.yml` prüft einmal pro Woche die Links im README und in `docs/` jedes Branches.
