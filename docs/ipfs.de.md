# Eine Lektion auf IPFS veröffentlichen

[English](ipfs.md)

IPFS findet Dateien über ihren Inhalt, nicht über den Server, auf dem sie liegen.
`ipfs add` berechnet einen Fingerabdruck Ihres Builds, die CID, und jeder
IPFS-Knoten, der die Dateien hat, kann sie unter dieser CID ausliefern. Eine
Seite bleibt nur erreichbar, solange ein Knoten online ist und eine Kopie
behält. Dieses Behalten heißt Pinnen.

## Auf dem eigenen Rechner ausprobieren

1. Starten Sie einen IPFS-Knoten: Öffnen Sie
   [IPFS Desktop](https://docs.ipfs.tech/install/ipfs-desktop/) oder installieren
   Sie [Kubo](https://docs.ipfs.tech/install/command-line/) und starten Sie
   `ipfs daemon`.
2. Bauen Sie die Lektion und fügen Sie den Build-Ordner hinzu:
   ```bash
   pnpm run build
   ipfs add -r -Q --cid-version=1 public
   ```
   Der zweite Befehl gibt die CID Ihres Builds aus.
3. Öffnen Sie `http://localhost:8080/ipfs/<CID>/`. Ihr Knoten leitet auf
   `http://<CID>.ipfs.localhost:8080/` weiter und liefert die App von dort aus.

Ihr Knoten antwortet nur, solange er läuft. Damit die Seite erreichbar bleibt,
pinnen Sie die CID auf einem Knoten, der online bleibt. Andere öffnen sie mit
ihrem eigenen IPFS-Knoten, IPFS Desktop oder Kubo, der sie über libp2p holt.
Dieses Repository pinnt die Lektionen über Aleph, siehe
[unten](#so-veröffentlicht-dieses-repository-die-lektionen).

## Details

- `-r` fügt den Ordner mit allem darin hinzu; ohne die Option bricht Kubo mit
  `'public' is a directory, use the '-r' flag` ab. `--cid-version=1` liefert die
  kleingeschriebene base32-Form, die Subdomain-Adressen verwenden. `-Q` gibt nur
  die CID des Ordners aus.
- Die App lädt ihre Dateien über relative Pfade (`export const prerender = true`
  in `src/routes/+layout.js`, kein `fallback` in `svelte.config.js`). Derselbe
  Build läuft unter `/ipfs/<CID>/`, auf einer Subdomain und unter
  `/names-on-chain/lesson01/` auf GitHub Pages.
- Eine Subdomain gibt jeder CID einen eigenen Origin. Unter `/ipfs/<CID>/` teilen
  sich alle Seiten einen Origin und dessen `localStorage`; diese App speichert
  dort nur die gewählte Sprache.
- Jeder Build bekommt eine neue CID, auch ohne Codeänderung: SvelteKit schreibt
  die Build-Zeit in `_app/version.json`.
- Die öffentlichen Gateways `ipfs.io` und `dweb.link` holen ab dem 21. September 2026 keine Inhalte mehr für Sie ab; Browser werden schon jetzt
  zum Service-Worker-Gateway `inbrowser.link` weitergeleitet
  ([Ankündigung](https://blog.ipfs.tech/2026-08-beyond-sponsored-gateways/)).
  Ihr Betreiber Shipyard stellt am 30. September 2026 seine öffentlichen
  IPFS-Dienste ein, darunter Delegated Routing und die Bootstrap-Knoten. Kubo,
  IPFS Desktop und das Service-Worker-Gateway verlieren ihre Maintainer
  ([Ankündigung](https://ipshipyard.com/blog/2026-the-end-of-ipfs-at-shipyard/)).
  Links in diesem Repository zeigen deshalb nicht auf öffentliche Gateways.
- Brave hat seine eingebaute IPFS-Unterstützung mit Version 1.69.153
  (August 2024) entfernt; `ipfs://`-Links öffnen dort nichts.

## So veröffentlicht dieses Repository die Lektionen

`.github/workflows/pages.yml` läuft bei jedem Push auf `main`:

1. **Build:** Der Workflow baut lesson01 bis lesson05 aus dem neuesten Stand
   ihrer Branches, ergänzt die Übersichtsseite und veröffentlicht den Ordner auf
   [GitHub Pages](https://doichain.github.io/names-on-chain/).
2. **IPFS:** Der Job `ipfs` pinnt denselben Ordner über
   [Aleph](https://aleph.cloud), mit der Action `aleph-site-publish` aus
   [NiKrause/relay-button](https://github.com/NiKrause/relay-button). Die Action
   packt den Ordner in eine CAR-Datei, lädt sie zusammen mit einer signierten
   Aleph-`STORE`-Nachricht hoch und wartet, bis Aleph die Nachricht verarbeitet
   hat. Danach holt ein Helia-Knoten jeden Block des Ordners über libp2p aus dem
   IPFS-Netz; ein HTTP-Gateway wird dabei nicht gefragt. Die
   Job-Zusammenfassung nennt die CID.
   Der Job läuft nur, wenn das Repository-Secret `ALEPH_PRIVATE_KEY` gesetzt ist:
   der private Schlüssel einer Ethereum-Adresse, deren Aleph-Credits den Speicher
   bezahlen. Der Schlüssel signiert jeden Upload; laden Sie seine Adresse deshalb
   nur mit so vielen Credits auf, wie die Seite braucht.
3. **Eigene Domain:** Der Job `link-domain` richtet eine Domain auf die neue
   Version aus. Er läuft nur, wenn die Repository-Variable `ALEPH_SITE_DOMAIN`
   gesetzt ist.

### Eigene Domain einrichten

Legen Sie zuerst drei DNS-Einträge an, hier für `names.example.org`:

| Typ   | Name                         | Wert                                                |
| ----- | ---------------------------- | --------------------------------------------------- |
| CNAME | `names.example.org`          | `ipfs.public.aleph.sh`                              |
| CNAME | `_dnslink.names.example.org` | `_dnslink.names.example.org.static.public.aleph.sh` |
| TXT   | `_control.names.example.org` | die Adresse von `ALEPH_PRIVATE_KEY` (`0x…`)         |

Aleph liefert die Domain nur aus, wenn `_control` die Adresse nennt, die die
Verknüpfung signiert. Setzen Sie danach `ALEPH_SITE_DOMAIN` und starten Sie den
Workflow erneut (Actions → GitHub Pages → Run workflow). `link-domain` liest den
DNSLink-Eintrag der Domain und schlägt fehl, wenn er nicht innerhalb von etwa
fünf Minuten die neue CID nennt.
