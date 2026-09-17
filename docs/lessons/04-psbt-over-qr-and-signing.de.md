# Lektion 4: Das PSBT per QR, signiert in der Wallet

[English](04-psbt-over-qr-and-signing.md) · Branch [`lesson04`](https://github.com/Doichain/names-on-chain/tree/lesson04) · [Live-Demo](https://doichain.github.io/names-on-chain/lesson04/) · Zurück: [Lektion 3](03-name-registration-psbt.de.md) · Weiter: [Lektion 5](05-atomic-name-trading.de.md)

Das Registrierungs-PSBT aus Lektion 3 verlässt den Browser: als animierter QR-Code, den DoiWallet scannt, als Text zum Kopieren oder als `.psbt`-Datei. DoiWallet signiert und sendet es. Die App signiert nie und sendet nie.

## Was Sie lernen

- Wie ein PSBT, das für einen QR-Code zu lang ist, als Folge von QR-Codes reist (BC-UR).
- Was Sie in der Wallet prüfen, bevor Sie signieren.
- Warum die App die Transaktion übergibt, statt sie zu senden.

## Start

```bash
git switch lesson04
pnpm install --frozen-lockfile
pnpm dev
```

## Checkpoint

- Mit einem freien Namen und einer Adresse mit Coins erscheint der Button **PSBT erstellen**. Er zeichnet einen animierten QR-Code auf weißem Grund.
- **Anhalten**, **Vorheriges Bild**, **Nächstes Bild**, **PSBT kopieren**, **.psbt herunterladen** und, wo der Browser Dateien teilen kann, **Teilen** steuern ihn. Eine Zeile sagt, welches Bild gerade zu sehen ist.
- Darunter sagen drei Schritte, was in DoiWallet zu tun ist, und ein Textfeld enthält das PSBT in Base64.
- Scannen Sie den Code mit DoiWallet, prüfen Sie die Outputs, signieren und senden Sie. Sobald ein Block die Transaktion bestätigt hat, zeigt Lektion 1 den Namen mit Ihrer Adresse.

## So funktioniert es

### 1. Vom PSBT zu QR-Codes

`renderBCUR` in `src/lib/doichain/renderQR.js` verpackt die Bytes des PSBT als Uniform Resource vom Typ `crypto-psbt` (`@keystonehq/bc-ur-registry`) und schneidet sie in Fragmente von 120 Bytes. Jedes Fragment wird ein QR-Code (`@vkontakte/vk-qr`). Eine Registrierung aus einem Coin passt in wenige Bilder; jeder weitere Coin bringt seine ganze Vorgänger-Transaktion mit.

### 2. Die Animation

`pricing.svelte` zeigt alle 300 Millisekunden ein Bild. Tippen Sie einen anderen Namen oder eine andere Adresse, hält die Animation an und der alte Code verschwindet. So können Sie nie ein PSBT scannen, das nicht mehr zum Bildschirm passt.

### 3. Andere Wege hinaus

- **PSBT kopieren** legt den Base64-Text in die Zwischenablage.
- **.psbt herunterladen** speichert die Binärdatei, die Wallets importieren.
- **Teilen** übergibt dieselbe Datei an das Teilen-Menü des Systems, etwa um sie aufs Telefon zu schicken.

### 4. Signieren in DoiWallet

DoiWallet zeigt jeden Input und Output des PSBT. Prüfen Sie den Namens-Output mit 0,01 DOI an Ihre Adresse und das Wechselgeld an Ihre Adresse, dann signieren und senden Sie. DoiWallet schickt die Transaktion an seine eigenen Electrum-Server.

## Übung

- Setzen Sie `maxFragmentLength` in `renderQR.js` auf 50 und vergleichen Sie die Zahl der Bilder für dieselbe Transaktion. Welche Größe scannt Ihr Telefon noch zuverlässig vom Laptop-Bildschirm?
- Kopieren Sie das PSBT und dekodieren Sie es mit Doichain Core: `doichain-cli decodepsbt "<der Base64-Text>"`. Finden Sie die Namensoperation in den Outputs.

<details>
<summary><strong>Unter der Haube</strong></summary>

- **Fountain-Codes.** Nach den reinen Fragmenten kann ein BC-UR-Encoder gemischte senden, jedes das XOR mehrerer Fragmente, damit ein Scanner auch dann fertig wird, wenn er ein Bild verpasst hat. Diese App zeichnet nur die reinen Fragmente und zeigt sie in einer Schleife: Ein Scanner kann bei jedem Bild einsteigen und braucht jedes einmal.
- **Bytewords.** Die Fragmente sind reiner Text. Jedes Byte wird zu zwei Buchstaben, dem ersten und letzten eines Worts aus einer Liste von 256 Wörtern, und jedes Fragment endet mit einer Prüfsumme: `ur:crypto-psbt/1-5/lpad…`.
- **Warum kein BBQr.** BBQr ist ein anderes QR-Format für PSBTs. DoiWallet liest nur BC-UR, also zeichnet die App nur BC-UR.
- **Warum die App nie sendet.** Ein PSBT ohne Signaturen lässt sich kopieren, zeigen und teilen, ohne Ihre Coins zu gefährden; es verrät nur Ihre Adressen. Allein die Wallet mit dem Schlüssel entscheidet, ob daraus eine Transaktion wird, und sie zeigt auf ihrem eigenen Bildschirm, was passieren wird.
- **Namens-Inputs an SegWit-Adressen.** DoiWallet 7.0.4 signiert eine Registrierung aus jedem Ihrer Coins. Einen Namen, den eine `dc1q…`-Adresse hält, kann es noch nicht ausgeben; darauf stößt Lektion 5.

</details>

## Typische Probleme

- **DoiWallet reagiert nicht auf den Code.** Vergrößern Sie den QR-Code, halten Sie die Animation an und gehen Sie die Bilder von Hand durch, oder kopieren Sie das PSBT.
- **„Kopieren ging nicht“** Manche Browser sperren die Zwischenablage; markieren Sie stattdessen den Text im Feld darunter.
