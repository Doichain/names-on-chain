# Die Ideen dahinter

[English](concepts.md)

Für Leserinnen und Leser aus der Web-Welt, die hier zum ersten Mal einer
Blockchain begegnen. Für diese Seite brauchen Sie keinen Code.

## Eine Kette von Blöcken ist ein öffentliches Kassenbuch

Doichain ist ein öffentliches Kassenbuch über Coins. Jeder darf es lesen, und
jeder kann es prüfen. Etwa alle zehn Minuten kommt eine neue Seite dazu, ein
Block. Liegt eine Seite tief genug im Stapel, kann sie niemand mehr unbemerkt
ändern.

## Coins sind wie Geldscheine

Es gibt keinen Kontostand. Ihrer Adresse gehören einzelne Geldstücke, jedes davon
ein Output einer früheren Transaktion, ein UTXO. So ein Stück geben Sie ganz aus
und bekommen Wechselgeld zurück, genau wie beim Bezahlen eines Buchs für 12 Euro
mit einem Zwanziger.

Deshalb hat eine Transaktion **Inputs** (die Stücke, die Sie ausgeben) und
**Outputs** (wer was bekommt, und das Wechselgeld zurück an Sie). Was dazwischen
übrig bleibt, ist die Gebühr für die Miner.

## Ein Name steckt in einem Output

Doichain ergänzt dieses Bild um Namen. Ein Name sitzt in einem Output, vor dem
üblichen „zahle an diese Adresse“-Teil:

```
OP_NAME_DOI <Name> <Wert> OP_2DROP OP_DROP <Skript der Adresse>
```

Wer diesen Output ausgeben kann, dem gehört der Name. Den Namen zu übertragen
heißt, diesen Output auszugeben und den Namen in einen neuen zu schreiben.

Daraus folgt zweierlei:

- **Die 0,01 DOI im Namens-Output sind ein Pfand, keine Gebühr.** Sie bleiben
  Ihre und wandern mit dem Namen. Sie bekommen sie zurück, wenn Sie den
  Namens-Output wieder ausgeben.
- **Ein Name gilt nicht ewig.** 36.000 Blöcke, etwa 250 Tage, nach seiner letzten
  Operation ist er wieder frei. Jede Registrierung und jedes Update stellt die
  Uhr zurück.

## Ein PSBT ist ein vorausgefülltes Formular

Die App sieht nie einen privaten Schlüssel. Sie füllt ein Überweisungsformular
aus: welche Geldstücke ausgegeben werden, wer was bekommt, wohin der Name geht.
Dieses Formular ist ein PSBT, eine teilweise signierte Transaktion.

Solange nichts unterschrieben ist, passiert nichts. Sie können das Formular
kopieren, zeigen oder wegwerfen. Erst Ihre Wallet mit dem Schlüssel kann es
unterschreiben, und erst dann lässt es sich senden. Deshalb kann die App eine
statische Webseite sein, und deshalb lohnt kein Angriff auf sie: Dort liegt kein
Schlüssel.

## Die Server sehen Ihre Adressen

Die App hat kein Backend. Sie fragt öffentliche ElectrumX-Server, immer einen
davon, nach Namen, Adressen und Transaktionen. Diese Server erfahren, für welche
Adressen und Namen Sie sich interessieren, zusammen mit Ihrer IP-Adresse, und sie
könnten etwas weglassen. Was sie nicht können: die App dazu bringen, woanders
hinzuzahlen. Jeder Betrag stammt aus der Roh-Transaktion, aus der er kommt, und
jede Adresse im Formular haben Sie selbst eingetippt.

## Glossar

| Wort | Was es bedeutet |
| --- | --- |
| UTXO | Ein nicht ausgegebenes Geldstück, der Output einer früheren Transaktion |
| Input, Output | Was eine Transaktion ausgibt und wohin es geht |
| PSBT | Eine Transaktion, der nur noch die Signaturen fehlen |
| swartz | Der Cent von DOI: 1 DOI = 100.000.000 swartz |
| NameOp | Eine Namensoperation in einem Output, hier `name_doi` |
| Namenswert | Text, der zum Namen gehört, höchstens 520 Bytes |
| ElectrumX | Ein Suchdienst über die Kette, den die App fragt |
| Script-Hash | Der Fingerabdruck, unter dem ein Server eine Adresse oder einen Namen findet |
| Mempool | Transaktionen, die auf einen Block warten |
| Blockhöhe | Wie viele Blöcke vorher kamen; die App zählt den Ablauf in Blöcken |
| Gebührenrate | Preis pro Byte einer Transaktion, in swartz pro vByte |
| Staub | Wechselgeld, das für einen eigenen Output zu klein ist; es geht an die Miner |
| Bestätigung | Ihre Transaktion steht in einem Block |

## Wie es weitergeht

- [Wallet und Sicherheit](wallet-and-safety.de.md): echtes Geld, die gültige
  Kette, was Sie vor dem Signieren prüfen.
- [Unter der Haube](under-the-hood.de.md): dieselben Dinge in Bytes und Regeln.
- [Die Lektionen](README.de.md), vom Nachschlagen eines Namens bis zum Handel.
