# Lektion 5: Atomarer Namenshandel

[English](05-atomic-name-trading.md) · Branch [`lesson05`](https://github.com/Doichain/names-on-chain/tree/lesson05) · [Live-Demo](https://doichain.github.io/names-on-chain/lesson05/) · Zurück: [Lektion 4](04-psbt-over-qr-and-signing.de.md)

Ein Name kann zwischen Menschen den Besitzer wechseln, die einander nicht vertrauen. Eine einzige Transaktion bezahlt den Halter und überträgt den Namen an den Käufer, also geschieht beides oder nichts. Namecoin nennt das [atomic name trading](https://www.namecoin.org/docs/name-owners/atomic-name-trading/). Die App baut einen solchen Kauf als PSBT.

## Was Sie lernen

- Wie eine Transaktion beide Hälften eines Handels enthält.
- Wer was signiert, und in welcher Reihenfolge.
- Was ein Verkäufer prüfen muss, bevor er den letzten Input signiert.

## Start

```bash
git switch lesson05
pnpm install --frozen-lockfile
pnpm dev
```

## Checkpoint

- Tippen Sie einen vergebenen Namen. Weiter unten öffnet sich **Diesen Namen kaufen**.
- Geben Sie im Kaufformular Ihre Adresse und einen Preis in DOI ein, etwa `1.5` oder `1,5`. Diese Adresse bezahlt und erhält den Namen und Ihr Wechselgeld.
- Der Kasten rechts und ein Satz darunter sagen, was wohin geht: der Preis an den Halter, der Name mit 0,01 DOI an Sie, Ihr Wechselgeld.
- Erstellen Sie das PSBT wie in Lektion 4. Suchen Sie vor dem Signieren jeden dieser Outputs in DoiWallet.

## So funktioniert ein Kauf

1. Die App sucht den Output, der den Namen heute hält, und die Adresse seines Halters.
2. Sie baut eine Transaktion:
   - **Inputs:** Ihre Coins und der Output, der den Namen hält.
   - **Outputs:** der Preis an den Halter, dazu alles, was der Namens-Output über die gebundenen 0,01 DOI hinaus hielt; der Name mit seinem aktuellen Wert und 0,01 DOI an Sie; Ihr Wechselgeld.
3. Sie signieren Ihre Inputs in DoiWallet und geben das PSBT an den Halter weiter.
4. Der Halter prüft die Outputs, signiert den Namens-Input und sendet die Transaktion.

Nichts, was bestimmt, wohin Geld fließt, stammt vom ElectrumX-Server: Ihre Adresse ist die, die Sie getippt haben, die Adresse des Halters wird aus dem Namens-Skript gelesen, und jeder Betrag stammt aus Roh-Transaktionen, deren Hashes zu ihren txids passen. Der Builder ist `buildNameTradePsbt` in `src/lib/doichain/buildNameTradePsbt.js`; `parseDoiAmount` in `doiAmount.js` liest den Preis.

Lektion 5 braucht ein Adressfeld zweimal, für den Namen und für die Coins, die
ihn bezahlen. Deshalb wurde daraus `AddressField.svelte`: Label, Eingabe,
Scan-Button und Meldungsbereich in einer Komponente, die Meldungen je Stelle
befüllt.

## Namen an SegWit-Adressen

Auf Regtest signiert DoiWallet 7.0.4 einen Namens-Input an einer P2WPKH-Adresse (`dc1q…`) wie einen Legacy-Input, und Doichain Core lehnt die Transaktion ab. Namen an P2PKH-Adressen lassen sich wie beschrieben kaufen. Bei einem Namen an einer SegWit-Adresse warnt die App, weil sein Halter den Kauf mit DoiWallet noch nicht abschließen könnte.

## Verkaufsangebote sind abgeschaltet

Ein Verkäufer könnte zuerst mit `SIGHASH_SINGLE|ANYONECANPAY` signieren und die halb signierte Transaktion als Angebot herumreichen. DoiWallet signiert nur mit `SIGHASH_ALL`, und ein so signiertes Angebot kann kein Käufer vervollständigen. Deshalb baut die App nur Käufe.

## Übung

- Wählen Sie einen vergebenen Namen und bauen Sie ein Kauf-PSBT dafür. Dekodieren Sie es (Lektion 4) und ordnen Sie jeden Output dem Satz in der App zu.
- Schreiben Sie die Prüfliste auf, die ein Halter vor dem Signieren des Namens-Inputs durchgehen sollte: Welche Outputs müssen existieren, an welche Adressen, mit welchen Beträgen?

<details>
<summary><strong>Unter der Haube</strong></summary>

- **Warum die Reihenfolge sicher ist.** Mit `SIGHASH_ALL` legt sich jede Signatur auf alle Inputs und Outputs fest. Ihre Signaturen nützen nichts ohne die des Halters, und seine Signatur gilt nur für genau die Outputs, die Sie schon signiert haben. Keine Seite kann eine Hälfte nehmen und die andere liegen lassen.
- **Der Wert bleibt.** Der Name wandert mit den Bytes, die er heute hält, auch wenn sie kein gültiges UTF-8 sind. Der Käufer kann den Wert mit dem nächsten Update ändern.
- **Der Überschuss geht zurück.** Hielt der alte Namens-Output mehr als 0,01 DOI, gehört der Rest dem Halter und wird zum Preis addiert.
- **Eigentumsregel.** Seit Block 431.017 ändert nur eine Transaktion einen Namen, die seinen vorigen Output ausgibt. Vor dem Split gab ein Kauf diese Garantie nicht: Jeder konnte einen Namen überschreiben.
- **Was Sie weiter vertrauen.** Ein Server kann eine neuere Operation auf dem Namen verschweigen. Der Halter signiert zuletzt und sieht, ob der Namens-Input wirklich der aktuelle Output des Namens ist; ist er es nicht, scheitert die Transaktion.

</details>

## Typische Probleme

- **„Der Name steckt noch in keinem Block“** Ein Name lässt sich kaufen, sobald seine letzte Transaktion bestätigt ist.
- **„Dieser Name gehört bereits …“** Sie haben einen Namen getippt, den Ihre eigene Adresse hält.
- **„Dieser Name wurde zuletzt mit einer anderen Operation als name_doi geschrieben.“** Lektion 5 handelt nur Namen, die mit `name_doi` geschrieben wurden.
