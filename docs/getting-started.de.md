# Erste Schritte

[English](getting-started.md)

Alles, was Sie brauchen, um eine Lektion zu starten, zur nächsten zu wechseln
und zu prüfen, dass der Code noch läuft.

## Was Sie brauchen

- **Node 22.** Die Version steht in `.nvmrc`; mit nvm wählt `nvm use` sie aus.
- **pnpm**, das Node selbst installiert: `corepack enable`. Die Version kommt aus
  `packageManager` in `package.json`, damit alle dieselbe benutzen.
- **Einen Browser** für die App und **DoiWallet** auf dem Telefon für die
  Lektionen, in denen signiert wird ([Google Play](https://play.google.com/store/apps/details?id=org.doichain.doiwallet),
  [App Store](https://apps.apple.com/app/doiwallet/id1579900361)).
- **Etwas DOI** auf einer eigenen Adresse, ab Lektion 3: Eine Registrierung
  bindet 0,01 DOI im Namen und zahlt eine Mining-Gebühr. Lesen Sie vorher
  [Wallet und Sicherheit](wallet-and-safety.de.md).

## Eine Lektion starten

```bash
git clone https://github.com/Doichain/names-on-chain.git
cd names-on-chain
corepack enable && pnpm install --frozen-lockfile
pnpm --filter @names-on-chain/lesson01 dev
```

Ein Clone enthält alle fünf Lektionen. `--frozen-lockfile` installiert genau die
Versionen aus `pnpm-lock.yaml`. Ohne das würde eine frische Installation neuere
wählen, und die Lektion wiche vom Text ab.

## Zur nächsten Lektion wechseln

```bash
pnpm --filter @names-on-chain/lesson02 dev
```

Jede Lektion ist eine eigene App unter `apps/` und enthält das, was diese Lektion
hinzufügt. Was sie von den Lektionen davor erbt, kommt aus `packages/doichain` –
die Importe im Code sind die Nahtstellen zwischen den Lektionen. Was sich ändert,
steht in den [Lektionstexten](README.de.md).

## Bauen und veröffentlichen

```bash
pnpm run build                                    # alle fünf, nach apps/lessonNN/public
pnpm --filter @names-on-chain/lesson01 build      # nur diese eine
pnpm --filter @names-on-chain/lesson01 preview    # liefert diesen Build aus
```

Der Build braucht keinen eigenen Server und läuft unter jedem Pfad, also auch auf
GitHub Pages oder IPFS. Wie das geht, steht in
[Eine Lektion auf IPFS veröffentlichen](ipfs.de.md).

## Ihre Änderungen prüfen

```bash
pnpm run lint                 # Prettier und ESLint
pnpm run check                # svelte-check
pnpm -r test:unit             # Unit-Tests
pnpm run test:integration     # die Apps im Browser, gegen einen simulierten Server
```

Für eine einzelne App stellen Sie `--filter @names-on-chain/lessonNN` vor das
Skript, statt den ganzen Workspace laufen zu lassen.

Die Browser-Tests bringen ihre Antworten mit und brauchen kein Netz. Ist
Playwrights eigenes Chromium nicht installiert, zeigen Sie mit `CHROMIUM_PATH`
auf ein anderes Chromium.

## Typische Probleme

- **`ERR_PNPM_UNSUPPORTED_ENGINE` oder seltsame Build-Fehler.** Eine andere
  Node-Version steht vor Node 22. `node --version` sollte `v22.…` ausgeben.
- **`ERR_PNPM_UNEXPECTED_STORE`.** Ein fremdes pnpm steht vor dem, das corepack
  verwaltet. Nach `corepack enable` sollte `pnpm --version` die Version aus
  `package.json` zeigen.
- **Die Statuszeile zählt Versuche hoch.** Die App spricht mit ihren Servern über
  WebSockets auf Port 50004; manche Netze blockieren das.
- **Die Kamera startet nicht.** Browser erlauben sie nur auf HTTPS-Seiten und auf
  `localhost`. Im Scan-Dialog können Sie die Adresse stattdessen einfügen.
- **Port 5173 ist belegt.** `pnpm --filter @names-on-chain/lesson01 dev --port 5174`
  nimmt einen anderen.
