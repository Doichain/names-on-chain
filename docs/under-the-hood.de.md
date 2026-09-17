# Unter der Haube

[English](under-the-hood.md)

Für Leserinnen und Leser, die Bitcoin oder Namecoin kennen und die Bytes, die
Regeln und das Vertrauensmodell sehen wollen. Jede Zahl hier ist gegen Doichain
Core v31.1.x, seine ElectrumX-Server oder die Tests der App geprüft.

## Das Namens-Skript

Ein Name steht vor einem gewöhnlichen Output-Skript:

```
OP_NAME_DOI <Name> <Wert> OP_2DROP OP_DROP <Output-Skript des Halters>
```

`OP_NAME_DOI` ist `OP_10` (`0x5a`), Doichains Namensoperation in einem Schritt.
Die Registrierung von `test` mit dem Wert `hello` für einen P2PKH-Halter ergibt:

```
5a 04 74657374 05 68656c6c6f 6d 75 76a914…88ac
```

- Name und Wert werden **mit ihrer Länge in Bytes** gepusht. Ein allgemeiner
  Skript-Compiler machte aus einem Ein-Byte-Wert von `0x01` bis `0x10` die
  Opcodes `OP_1`…`OP_16`, und Doichains Parser liest dann keinen Wert. Ein leerer
  Wert ist `00`.
- Der Halter-Teil ist das echte Output-Skript der Adresse, aus
  `address.toOutputScript`. Übernähme man aus einer P2SH-Adresse nur den Hash,
  entstünde ein P2PKH-Skript für einen Schlüssel, den niemand hat.
- Eine Transaktion mit Namens-Output hat **Version `0x7100`**.

Namecoins übrige Operationen kennt Doichain Core weiterhin: `OP_NAME_NEW`
(`OP_1`), `OP_NAME_FIRSTUPDATE` (`OP_2`), `OP_NAME_UPDATE` (`OP_3`). Der Parser
liest einen Namen nur mit der Zahl von Pushes, die eine Operation erwartet: 1, 3
und 2, und 2 bei `OP_NAME_DOI`.

## Wie ein Server einen Namen findet

ElectrumX indiziert keine Namen. Es indiziert das Skript

```
OP_NAME_UPDATE <Name> <leerer Wert> OP_2DROP OP_DROP OP_RETURN
```

unter dessen SHA-256-Hash in umgekehrter Byte-Reihenfolge. Für `doichain` lautet
es `53 08 646f69636861696e 00 6d 75 6a`. `nameops.nameIndexScriptHash` aus
[doichainjs-lib](https://github.com/Doichain/doichainjs-lib) baut es; die App
normalisiert den Namen vorher auf Unicode NFC.

## Grenzen

| | |
| --- | --- |
| Name | höchstens 255 Bytes (`MAX_NAME_LENGTH`) |
| Wert | höchstens 520 Bytes |
| Im Namens-Output gebunden | 0,01 DOI (`NAME_LOCKED_AMOUNT`) |
| Ablauf | 36.000 Blöcke nach der letzten Operation, 30 auf Regtest |

Der Konsens von Doichain Core nimmt Werte bis 1.023 Bytes an, doch beim Ausgeben
läuft das ganze Skript eines Outputs, und der Interpreter lehnt jeden Push über
520 Bytes ab (`MAX_SCRIPT_ELEMENT_SIZE`). Ein längerer Wert friert den Namen samt
gebundenem Coin für immer ein; Cores eigene RPCs hören bei 520 auf
(`MAX_VALUE_LENGTH_UI`), und die App tut es auch.

## Die Regeln seit dem Split

Doichain hat sich am 11. September 2026 bei Block 431.017 geteilt. Ab diesem
Block wendet Doichain Core v31.1.x strenge Eigentumsregeln auf `name_doi` an:

- Ein **freier oder abgelaufener** Name wird ohne Namens-Input registriert; eine
  Registrierung, die einen ausgibt, ist ungültig.
- Einen **vorhandenen, nicht abgelaufenen** Namen ändert nur eine Transaktion,
  die seinen vorigen Namens-Output ausgibt, und dieser Input muss selbst ein
  `name_doi`-Output mit demselben Namen sein. Ein Name, der zweistufig entstand
  (`name_new` → `name_firstupdate`, zwölf Blöcke später), bleibt deshalb in der
  `name_update`-Familie.
- Eine Transaktion mit Namens-Input braucht einen Namens-Output, und eine
  Transaktion ohne Namensoperation darf keinen ausgeben.

Vor dem Split durfte nach den alten Regeln jeder einen registrierten Namen
überschreiben; „vertrauensfreier Handel“ gilt deshalb erst ab Block 431.017.

## Was die App baut

- **Inputs** tragen die ganze Vorgänger-Transaktion (`nonWitnessUtxo`), damit die
  Wallet die Beträge selbst prüfen kann; SegWit-Inputs tragen zusätzlich
  `witnessUtxo`. Jeder Betrag und jedes Skript stammt aus dieser
  Roh-Transaktion, nachdem geprüft wurde, dass ihr Hash die ausgegebene txid ist.
- **Die Coin-Auswahl** nimmt bestätigte vor unbestätigten Coins, große vor
  kleinen, höchstens 20 Stück.
- **Die Gebühr** ist die geschätzte Größe in vBytes mal der Gebührenrate:
  mindestens 100 swartz pro vByte, die `minrelaytxfee` von Doichain Core v31.1.x.
  Die öffentlichen Server melden 0,001 bis 1 swartz pro vByte als Relaygebühr,
  deshalb folgt die App einem Server nur nach oben, bis höchstens 1.000.
- **Wechselgeld unter 546 swartz** ist Staub und geht an die Miner statt in einen
  Output.
- Bevor ein PSBT den Builder verlässt, wird es auf Version `0x7100` und genau
  einen Namens-Output geprüft.

## Signaturen

- Käufer und Verkäufer signieren mit `SIGHASH_ALL`, jede Signatur legt sich also
  auf alle Inputs und Outputs fest. Der Käufer signiert zuerst, der Halter des
  Namens zuletzt; keine Hälfte nützt ohne die andere.
- Ein offenes Verkaufsangebot bräuchte `SIGHASH_SINGLE|ANYONECANPAY`. DoiWallet
  signiert nur mit `SIGHASH_ALL`, deshalb baut die App nur Käufe.
- Ein Namens-Input an einer **P2PKH**-Adresse wird mit dem Legacy-Sighash über
  das ganze Output-Skript samt Namens-Präfix signiert. Ein Namens-Input an einer
  **P2WPKH**-Adresse braucht BIP143 mit dem P2PKH-Template des Witness-Programms
  als scriptCode. DoiWallet 7.0.4 signiert den zweiten Fall wie den ersten, und
  Doichain Core lehnt die Transaktion ab; der Fix steckt in
  [doichainjs-lib 6.2.0](https://github.com/Doichain/doichainjs-lib) und erreicht
  DoiWallet mit dessen nächstem Update.

## Was Sie weiter vertrauen

- **Der Kette eines Servers.** ElectrumX schickt keine Beweise. Die App fragt
  jeden Server nach Block 431.017 und vergleicht dessen Hash mit dem der gültigen
  Kette; ein Server, der durchfällt, zählt als Fehlversuch. Über neuere Blöcke
  sagt das nichts, und ein Server kann weiterhin eine Transaktion weglassen. Die
  Statuszeile verlinkt den neuesten Block im Explorer, damit Sie selbst
  vergleichen können.
- **Beträgen und Adressen.** Beide kommen nicht aus dem JSON des Servers: Beträge
  stammen aus Roh-Transaktionen, die gegen ihre txids geprüft sind, die Adresse
  des Halters aus dem Namens-Skript, und Ihre eigenen Adressen haben Sie
  eingetippt.
- **Ihrem Namen, während Sie ihn nachschlagen.** Jede Prüfung schickt den Hash
  des Index-Skripts an einen Server; deshalb fragt die App erst, wenn Sie auf
  Prüfen drücken.

## Unterschiede zu Namecoin

| | Namecoin | Doichain |
| --- | --- | --- |
| Registrierung | `name_new` + `name_firstupdate`, 12 Blöcke Abstand | `name_doi` in einem Schritt |
| Ablauf | 36.000 Blöcke | 36.000 Blöcke, 30 auf Regtest |
| Merged Mining | AuxPoW-Chain-ID 1 | AuxPoW-Chain-ID 2 |
| Schwierigkeit | Retarget alle 2016 Blöcke | DigiShield v3 pro Block seit 431.017 |
| SegWit, Taproot | SegWit ab 475.000, kein Taproot | SegWit ab 216.500, kein Taproot |
| Namenskonventionen | `d/` für .bit, `id/` für Identitäten | `e/<64 hex>` für Double-Opt-in-Nachweise |
