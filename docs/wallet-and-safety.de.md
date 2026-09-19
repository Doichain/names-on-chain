# Wallet und Sicherheit

[English](wallet-and-safety.md)

Die Lektionen arbeiten mit echtem Geld auf dem Doichain-Mainnet. Lesen Sie das
hier, bevor Sie einen Namen registrieren oder handeln.

## Mainnet und die gültige Kette

- Die App spricht mit ElectrumX-Servern im Doichain-Mainnet. Eine Registrierung
  bindet 0,01 DOI im Namens-Output und zahlt eine Transaktionsgebühr; ein Kauf
  überweist den Preis an den Verkäufer.
- Doichain hat sich am 11. September 2026 geteilt. Gültig ist die Kette von
  Doichain Core v31: Ihre Regeln griffen mit Block 431.017, und bei Block 431.018
  trennte sie sich von der Kette, die die alten Knoten weiterminen – dort hat sie
  `71d50ff1…4b67`, die alte `bab49c13…2d34`. Die Server der App folgen ihr, und
  die App fragt jeden von ihnen nach diesem Block, bevor sie etwas glaubt.
- Transaktionen und Namen schlagen Sie auf
  [doi-explorer.le-space.de](https://doi-explorer.le-space.de) nach. Der alte
  Explorer unter explorer.doichain.org zeigt noch die andere Kette, mit anderen
  Blöcken, Namen und Bestätigungen.

## Wer die Schlüssel hält

- Die App sieht nie einen privaten Schlüssel. Sie baut ein unsigniertes PSBT
  (eine teilweise signierte Transaktion) und zeigt es als QR-Code.
- DoiWallet signiert und sendet die Transaktion. Suchen Sie vor dem Signieren
  jeden Output in DoiWallet: den Namen mit Wert und Halter, die Beträge an andere
  und Ihr Wechselgeld.
- DoiWallet signiert nur mit `SIGHASH_ALL`. Deshalb baut die App Käufe, bei denen
  der Käufer zuerst und der Halter des Namens zuletzt signiert, aber keine
  Verkaufsangebote.
- DoiWallet 7.0.4 signiert einen Namens-Input an einer P2WPKH-Adresse (`dc1q…`)
  nicht korrekt, und Doichain Core lehnt die Transaktion ab. Lektion 5 warnt bei
  solchen Namen. Der Fix steckt in doichainjs-lib 6.2.0 und erreicht DoiWallet
  mit dessen nächstem Update.

## Was die Server können und was nicht

- Die App liest Beträge und Skripte aus den rohen Vorgänger-Transaktionen und
  prüft, dass deren Hashes zu den ausgegebenen txids passen. Ein Server kann sie
  nicht dazu bringen, mehr zu zahlen, als sie anzeigt.
- Ein Server kann aber Transaktionen weglassen. Ein Name, den er nicht meldet,
  sieht frei aus. Prüfen Sie Namen, auf die es Ihnen ankommt, im Explorer.
- Jede Adresse, die Sie eingeben, und jeder Name, den Sie prüfen, erreicht einen
  ElectrumX-Server.

## Einen Namen registrieren

- **Vorwegnahme:** `name_doi` registriert einen Namen in einem Schritt. Wer Ihre
  Registrierung im Mempool sieht, kann denselben Namen selbst anmelden, und die
  zuerst geminte Transaktion gewinnt. Namecoins zwei Schritte `name_new` und
  `name_firstupdate` verbergen den Namen bis zur Festlegung, aber ein so
  registrierter Name lässt sich später nicht mehr mit `name_doi` übertragen.
- **Ablauf:** Ein Name läuft 36.000 Blöcke, etwa 250 Tage, nach seiner letzten
  Operation ab. Danach kann ihn jeder neu registrieren.
- **Länge:** Ein Name belegt on-chain höchstens 255 Bytes, und die App verlangt
  mindestens 4 Zeichen. `ü` belegt zwei Bytes.
- **Doppelgänger:** Gleich aussehende Namen können aus verschiedenen Bytes
  bestehen. Die App registriert Namen in Unicode-NFC und warnt bei Namen jenseits
  von ASCII und bei Namen, die Alphabete mischen.
- **Halter-Adresse:** In dieser App können nur Legacy-Adressen (`M…`, `N…`) und
  P2WPKH-Adressen (`dc1q…`) einen Namen halten. Ein Name an einer P2SH-Adresse
  (`6…`) oder Taproot-Adresse ließe sich nie wieder ausgeben, deshalb lehnt die
  App solche Adressen ab.

## Einen Namen handeln

- Ein Kauf ist eine einzige Transaktion: Entweder bekommt der Verkäufer den Preis
  und der Käufer den Namen, oder es passiert nichts.
- Doichain setzt strenges Namens-Eigentum ab Block 431.017 durch. Vor diesem
  Block konnte eine Registrierung einen Namen überschreiben, den jemand anderes
  hielt.

## Üben

Die App ist vorerst fest auf das Mainnet eingestellt. Ein Regtest-Modus zum Üben
mit Doichain Core v31.1.5 und wertlosen Coins ist geplant. Bis dahin: kleine
Beträge verwenden.

## Datenschutz

- Die App hat keinen eigenen Server. Die ElectrumX-Server, mit denen sie sich
  verbindet, sehen die Adressen und Namen, die Sie eingeben.
- Ältere Commits dieses Repositorys enthalten ein Test-PSBT mit echten
  Mainnet-Adressen und einen gezippten Build (`public.zip`, 1,3 MB). Sie bleiben
  im Verlauf; die Lektionen brauchen sie nicht.
