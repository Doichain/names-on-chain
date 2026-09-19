# Für Maintainer

[English](maintainers.md)

## Ein Workspace, fünf Apps

```
apps/lesson01 … apps/lesson05   eine SvelteKit-App pro Lektion
packages/doichain               was mehr als eine Lektion benutzt
docs/                           die Lektionstexte, englisch und deutsch
```

Eine Lektions-App enthält das, was diese Lektion lehrt, und sonst nichts: ihre
Routen, den Doichain-Code, den der Text durchgeht, ihre eigenen Tests. Zwei Regeln
halten das so.

**Was keine Lektion lehrt, liegt in `packages/doichain`** – die
ElectrumX-Verbindung, der Store, die Namens-Helfer, die kleinen Komponenten, die
Übersetzungen, die aufgezeichneten Serverantworten und der Simulator, mit dem die
Tests sprechen. Jede App importiert es.

**Was eine Lektion lehrt, bleibt in ihrer App, und spätere Lektionen importieren es
von dort.** Jede App ist ein Workspace-Paket, Lektion 4 schreibt also

```js
import { feeRateFor } from '@names-on-chain/lesson03/doichain/fees.js';
```

statt eine Kopie mitzuschleppen. Der Import ist der Satz „das haben Sie in
Lektion 3 geschrieben“, in einer Zeile, der man folgen kann.

Eine eigene Fassung einer Datei behält eine Lektion nur, wenn sie sie **ändert** –
und dann ist die Änderung der Lehrinhalt: Lektion 5 hat ein eigenes
`getNameOpUTXOsOfTxHash.js`, weil ein Handel den Wert in Swartz braucht, und mit ihm
alles, was Outputs liest. Fragen Sie sich also, bevor Sie eine Datei in eine spätere
Lektion kopieren, ob Sie sie ändern. Wenn nicht, importieren Sie sie; sonst laufen
die zugehörigen Tests ohnehin doppelt.

Zweierlei ist zu beachten, wenn eine Datei geteilt wird:

- Eine geteilte Datei darf kein `$lib` benutzen. Dieser Alias löst gegen den auf,
  der die Datei importiert – dieselbe Quelle hieße dann pro Lektion etwas anderes.
  In einer geteilten Datei schreiben Sie `./name.js` oder nennen die Lektion, aus
  der es kommt.
- Mit einer geteilten Datei reisen ihre Abhängigkeiten. Zwei Lektionen haben nur
  dann dieselbe Datei, wenn auch alles gleich ist, was sie erreicht.

## Etwas korrigieren

Korrigieren Sie es einmal – in der App, die das Problem hat, oder im Paket, mit
einem Test, wenn sich Code ändert. Es gibt keine Vorwärts-Merges mehr: eine
Datei, eine Korrektur, ein CI-Lauf.

Die fünf Lektions-Branches sind eingefroren, ebenso `step1`, die erste Fassung des
Workshops. Jeder Head trägt ein Tag – `lesson01-branch-final` … `lesson05-branch-final`
und `step1-branch-final` –, und ein Repository-Ruleset weist jeden Push, Force-Push
und jedes Löschen darauf zurück. Gelöscht sind sie nicht: Links der Form
`…/tree/lesson03` funktionieren weiter, und `git log` behält die Historie. Wer sehen
will, wie eine Lektion vor dem Workspace aussah, checkt das Tag aus.

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
