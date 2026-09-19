# Für Maintainer

[English](maintainers.md)

## Ein Workspace, fünf Apps

```
apps/lesson01 … apps/lesson05   eine SvelteKit-App pro Lektion
packages/doichain               was mehr als eine Lektion benutzt
docs/                           die Lektionstexte, englisch und deutsch
```

Eine Lektions-App enthält das, was diese Lektion lehrt, und sonst nichts: ihre
Routen, den Doichain-Code, den der Text durchgeht, ihre eigenen Tests. Alles, was
eine spätere Lektion nur noch *benutzt* – die ElectrumX-Verbindung, die Stores,
die Namens-Helfer, die kleinen Komponenten, die Übersetzungen, die
aufgezeichneten Serverantworten und der Simulator, mit dem die Tests sprechen –
liegt in `@names-on-chain/doichain` und wird von dort importiert.

Das ist die Regel für die Aufteilung:

> Was eine Lektion lehrt, bleibt in der App dieser Lektion. Worauf die nächste
> Lektion aufbaut, wandert ins Paket.

Das Paket ist kein Versteck. Es ist der Satz „das haben Sie in der Lektion davor
geschrieben“ als Code, damit der Lektionstext auf den Import zeigen kann.

## Etwas korrigieren

Korrigieren Sie es einmal – in der App, die das Problem hat, oder im Paket, mit
einem Test, wenn sich Code ändert. Es gibt keine Vorwärts-Merges mehr: eine
Datei, eine Korrektur, ein CI-Lauf.

Die fünf Lektions-Branches sind eingefroren. Sie bleiben für alte Links und für
`git log` erreichbar und bekommen ein Tag `lessonNN-branch-final` (siehe Issue
#14); geändert wird dort nichts mehr.

## Texte und Übersetzungen

- Die Texte der Apps liegen in `packages/doichain/src/i18n/en.json` und
  `de.json` – ein Katalog für alle fünf Apps. `catalogue.test.js` schlägt fehl,
  wenn ein Schlüssel in einer Sprache fehlt.
- Jede Seite in `docs/` hat einen deutschen Zwilling mit `.de.md`. Die README
  gibt es nur auf Englisch.

## Prüfungen

```bash
pnpm run lint                 # Prettier und ESLint, ganzer Workspace
pnpm run check                # svelte-check, jede App
pnpm -r test:unit             # Unit-Tests: das Paket einmal, dann jede App
pnpm run test:integration     # Browser-Tests gegen einen simulierten ElectrumX
```

Eine einzelne App, während Sie daran arbeiten:

```bash
pnpm --filter @names-on-chain/lesson03 dev
pnpm --filter @names-on-chain/lesson03 test:integration
```

Jede App baut und previewt auf einem eigenen Port – 4181 für lesson01 bis 4185
für lesson05 –, damit die fünf Browser-Suiten nie die Anfragen der jeweils
anderen beantworten. Wenn Playwrights eigenes Chromium nicht installiert ist,
holt `pnpm --filter @names-on-chain/lesson01 exec playwright install chromium`
es, oder Sie zeigen mit
`CHROMIUM_PATH` auf ein anderes Chromium.

Die Browser-Tests nehmen auch die Screenshots auf, die in den Lektionstexten
stehen, und schreiben sie nach `docs/img/`. Sie laufen dabei den Zustand im Bild
wirklich an, deshalb bricht ein Screenshot, der nicht mehr erreichbar ist, den
Lauf, statt still zu veralten. Nur ein Lauf mit `SCREENSHOTS=1` schreibt sie, ein
normaler Lauf lässt das Repository also sauber. Nach einer sichtbaren Änderung:

```bash
SCREENSHOTS=1 pnpm --filter @names-on-chain/lesson03 test:integration screenshots
```

Die CI führt Lint, Check, Unit-Tests, Build und die Browser-Tests einmal für den
ganzen Workspace aus, bei jedem Push und jedem Pull Request.

## Veröffentlichen

- **GitHub Pages:** Jeder Push auf `main` baut alle fünf Apps und veröffentlicht
  `apps/lessonNN/public` unter
  https://doichain.github.io/names-on-chain/lessonNN/
  (`.github/workflows/pages.yml`). Die Pfade sind dieselben wie vor dem
  Workspace.
- **IPFS:** Derselbe Workflow pinnt die Seite über Aleph, sobald das
  Repository-Secret `ALEPH_PRIVATE_KEY` gesetzt ist. Wie Sie eine Lektion vom
  eigenen Knoten aus veröffentlichen: [IPFS](ipfs.de.md).
- **Links:** `.github/workflows/links.yml` prüft einmal pro Woche die Links in
  der README und in `docs/`.
