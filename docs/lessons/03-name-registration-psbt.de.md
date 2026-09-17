# Lektion 3: Eine Registrierung als PSBT, ohne Schlüssel

[English](03-name-registration-psbt.md) · Branch [`lesson03`](https://github.com/Doichain/names-on-chain/tree/lesson03) · [Live-Demo](https://doichain.github.io/names-on-chain/lesson03/) · Zurück: [Lektion 2](02-utxos-name-coins-expiry.de.md) · Weiter: [Lektion 4](04-psbt-over-qr-and-signing.de.md)

Für einen freien Namen und eine Adresse mit Coins baut die App die Transaktion, die den Namen registriert, als unsigniertes PSBT. Ein Kasten rechts zeigt, was sie kostet. Das PSBT selbst erscheint in Lektion 4 auf dem Bildschirm.

## Was Sie lernen

- Was ein PSBT ist: eine Transaktion, der nur noch die Signaturen fehlen.
- Wie die App Coins auswählt und eine Gebühr berechnet, die Knoten annehmen.
- Wie ein Namens-Output Byte für Byte aussieht und was ihn unausgebbar macht.

## Start

```bash
git switch lesson03
pnpm install --frozen-lockfile
pnpm dev
```

## Checkpoint

- Tippen Sie einen freien Namen und geben Sie eine Adresse mit mindestens 0,02 DOI ein.
- Der Kasten **Doichain-Namen für 36.000 Blöcke registrieren** füllt sich: gebundener Betrag, Mining-Gebühr, was Ihre Coins verlässt, Wechselgeld.
- Darunter sagt ein Satz, was Sie zahlen, und eine kleine Zeile nennt Gebührenrate, Größe und wie viele Ihrer Coins verwendet werden.

## So funktioniert es

### 1. Wann die App baut

`pricing.svelte` baut die Transaktion neu, sobald der Name geprüft und frei ist und die Adresse gültig ist und ihre Coins geladen sind. Solange sie baut, bleibt nichts von einem früheren Namen oder einer früheren Adresse stehen.

### 2. Coins, denen man trauen kann

`buildNameRegistrationPsbt` in `src/lib/doichain/buildNameRegistrationPsbt.js` übernimmt keine Beträge aus dem JSON des Servers. `verifiedOutput` in `transactionChecks.js` liest jeden Coin aus der Roh-Transaktion, die ihn erzeugt hat, nachdem es geprüft hat, dass deren Hash die txid ist, die der Input ausgibt. Ein Coin, der schon einen Namen hält, wird abgelehnt: Ihn ohne Namensoperation auszugeben, würde die Transaktion ungültig machen.

### 3. Coins und Gebühr wählen

`selectCoins` in `fees.js` nimmt bestätigte Coins vor unbestätigten und große vor kleinen, bis sie 0,01 DOI plus die Gebühr für genau diese Coins decken. Es verwendet höchstens 20 Coins. Die Gebühr ist die geschätzte Größe in vBytes mal der Gebührenrate. Die Rate beträgt mindestens 100 swartz pro vByte, die Mindest-Relaygebühr von Doichain Core; verlangt ein Server mehr, folgt ihm die App bis höchstens 1.000.

### 4. Die Transaktion

- **Version** `0x7100`, die eine Namenstransaktion kennzeichnet.
- **Inputs:** die gewählten Coins. Jeder trägt seine ganze Vorgänger-Transaktion (`nonWitnessUtxo`), damit die Wallet Beträge selbst prüfen kann; SegWit-Coins tragen zusätzlich `witnessUtxo`.
- **Output 1:** der Name mit leerem Wert und 0,01 DOI an Ihre Adresse (`getNameOPStackScript.js`).
- **Output 2:** das Wechselgeld an Ihre Adresse. Wechselgeld unter 546 swartz wäre Staub und geht stattdessen an die Miner.

`checkNameTransaction` prüft die Version und dass es genau einen Namens-Output gibt, bevor das PSBT die Funktion verlässt. Scheitert etwas, ist das Ergebnis ein Fehler und gar kein PSBT.

## Übung

- Geben Sie das PSBT in der Browser-Konsole aus und dekodieren Sie es mit `Psbt.fromBase64(...)` aus `@doichain/doichainjs-lib`. Finden Sie den einen Output, dessen Skript mit `5a` beginnt.
- Starten Sie `pnpm exec vitest run src/lib/doichain/nameScript.test.js`. Der Test baut auf dem Doichain-Mainnet aufgezeichnete Namens-Outputs Byte für Byte nach.

<details>
<summary><strong>Unter der Haube</strong></summary>

- **Ein Namens-Output, Byte für Byte.** Die Registrierung von `test` mit dem Wert `hello` für eine P2PKH-Adresse ergibt `5a 04 74657374 05 68656c6c6f 6d 75 76a914…88ac`: `OP_NAME_DOI` (`OP_10`), ein Push von 4 Bytes, ein Push von 5 Bytes, `OP_2DROP`, `OP_DROP` und dann das gewöhnliche Output-Skript des Halters.
- **Pushes mit ihrer Länge.** Der Builder schreibt jeden Push als Längenbyte und Daten, direkt aus Bytes. Ein allgemeiner Skript-Compiler macht aus einem Ein-Byte-Wert von `0x01` bis `0x10` die Opcodes `OP_1`…`OP_16`, und der Namens-Parser von Doichain liest das nicht als Wert. Ein leerer Wert wird als `00` geschrieben.
- **Grenzen in Bytes.** Ein Name hat höchstens 255 Bytes. Doichain Core nimmt Werte bis 1.023 Bytes an, doch beim Ausgeben läuft das ganze Skript eines Outputs, und der Interpreter lehnt jeden Push über 520 Bytes ab. Ein längerer Wert würde den Namen samt seiner 0,01 DOI einfrieren; deshalb hört die App bei 520 auf.
- **Nur P2PKH- und P2WPKH-Halter.** Der Builder wandelt die Adresse des Halters in ihr echtes Output-Skript um und nimmt nur die beiden Typen an, für die DoiWallet signieren kann. Ein Builder, der aus einer P2SH-Adresse nur den Hash übernähme, schriebe ein P2PKH-Skript für einen Schlüssel, den niemand hat, und Name und Coin wären für immer gesperrt.
- **Registrierungen lassen sich abfangen.** `OP_NAME_DOI` registriert in einem Schritt. Wer eine ausstehende Registrierung sieht, kann versuchen, denselben Namen zuerst zu registrieren; es gewinnt die Transaktion, die zuerst in einen Block kommt. Außerdem geht jeder geprüfte Name als Hash an einen Server. Was das für Sie bedeutet, erklärt [Wallet und Sicherheit](../wallet-and-safety.de.md).
- **Der Weg in zwei Schritten.** Namecoins `name_new` legt sich zuerst auf einen gesalzenen Hash fest und enthüllt den Namen zwölf Blöcke später mit `name_firstupdate`, sodass niemand den Namen vorher sieht. Doichain Core kennt beide Operationen noch. Ein so entstandener Name lässt sich danach nur mit `OP_NAME_UPDATE` ändern, nie mit `OP_NAME_DOI`, und DoiWallet baut solche Transaktionen nicht.

</details>

## Typische Probleme

- **„Das Guthaben auf … reicht für diesen Doichain-Namen nicht aus.“** Die Coins decken 0,01 DOI plus Gebühr nicht.
- **„Die Coins auf … sind in zu viele kleine Beträge aufgeteilt“** Es wären mehr als 20 Coins nötig. Senden Sie die Coins in DoiWallet an sich selbst, um sie zusammenzulegen.
