# LocalBoost – Conversion-Tracking (Stand: 17.11.2026)

## Umfang

Die Website verwendet weiterhin **GitHub Pages**, **Formspree** und **Cloudflare Web Analytics**. Im Frontend werden keine neuen externen Analysedienste geladen.

### Bereits funktionsfähig nach der Veröffentlichung

Bei **erfolgreichen Formularsendungen** (HTTP 2xx der bestehenden Formspree-API) werden zusätzliche Felder mit der Anfrage an **Formspree** gesendet:

| Feld | Beispiel | Bedeutung |
| --- | --- | --- |
| `lb_source` | `google`, `instagram`, `direct` | Herkunftskategorie oder gültiger `utm_source` |
| `lb_medium` | `organic`, `social`, `cpc` | Herkunftsmedium |
| `lb_channel` | `organic`, `paid`, `social`, `direct`, `referral`, `campaign`, `email` | Kanalgruppe |
| `lb_campaign` | `november_2026` oder `none` | gültiger `utm_campaign` |
| `lb_landing_path` | `/website-erstellen/` | erste Seite der aktuellen Browser-Tab-Sitzung (ohne Query-String) |
| `lb_conversion_path` | `/kontakt/` | Seite des erfolgreich übermittelten Formulars |
| `lb_form` | `kontakt`, `anfrage`, `faq`, `googlecheck`, `ueberuns` | Formularzuordnung |

Es werden keine vollständigen Referrer-URLs, Suchbegriffe, Klick-IDs, IP-Adressen, E-Mail-Adressen oder Telefonnummern **zusätzlich** in den Attributionsfeldern gespeichert. Die eigentlichen Formular-Kontaktdaten bleiben unverändert und werden zur Bearbeitung an Formspree gesendet.

Für die Zuordnung innerhalb des Browser-Tabs wird ausschliesslich `sessionStorage` verwendet; kein Cookie und kein dauerhafter Benutzer-Identifier. Bei deaktiviertem Speicher erfolgt die Zuordnung nur für den jeweiligen Aufruf. Die Kampagnenwerte werden auf einfache, maximal 64 Zeichen lange Bezeichner eingeschränkt.

### Vorbereitet, noch nicht zentral ausgewertet

Beim Klick auf WhatsApp, E-Mail oder Telefon sowie bei einer erfolgreichen Formspree-Antwort wird ein browserinternes Ereignis `localboost:conversion` ausgelöst:

- `whatsapp_click`
- `email_click`
- `phone_click`
- `form_success`

Diese DOM-Events sind ohne Empfänger **keine persistenten Conversion-Zähler**. Sie enthalten nur Ereignistyp, Kanal, Kampagnenbezeichnung und Seitenpfad. Die Navigation wird nicht abgefangen oder verzögert.

Cloudflare **Web Analytics unterstützt laut offizieller FAQ keine Custom Events**. Deshalb ist dort aktuell keine Auswertung dieser Klicks möglich.

Cloudflare **Zaraz** unterstützt Custom Events via `zaraz.track`, benötigt jedoch die Einrichtung eines Triggers und einer passenden Analytics-Aktion im Cloudflare-Dashboard. Der Schalter `window.LOCALBOOST_ZARAZ_CONVERSIONS` ist **standardmässig aus**. Vor dessen Aktivierung:

1. Tatsächlichen Cloudflare-Zugriff, Account, Zone und das Analytics-Ziel prüfen.
2. Datenschutz und erforderliche Einwilligungs-/Informationspflichten klären.
3. Zaraz-Tool/Aktion und Trigger konfigurieren, z. B. `Event Name = localboost_form_success` bzw. die anderen Eventtypen.
4. Erst danach den Schalter bewusst aktivieren; keine PII oder Freitexte in den Events versenden.
5. Ereignisse mit Testfällen auf einem Staging-System validieren, bevor sie produktiv gezählt werden.

Ohne diese Konfiguration funktionieren die Formspree-Attributionsfelder trotzdem.

## Testfälle (kein echter Lead erforderlich)

Lokaler Test: `node --test tests/conversion-tracking.test.cjs`

End-to-End in einem **lokalen** Browser, mit `fetch`-Stub für Formspree:

1. `/?utm_source=instagram&utm_medium=social&utm_campaign=november_2026` besuchen, dann `/anfrage/`.
2. Formular simuliert erfolgreich absenden, FormData kontrollieren: `lb_landing_path=/`, `lb_conversion_path=/anfrage/`, `lb_source=instagram`. Kein Request an Formspree senden.
3. Bei HTTP 4xx/5xx oder Netzwerkfehler darf kein `form_success` auftreten.
4. Test mit organischem Google-Referrer: `lb_source=google`, `lb_medium=organic`.
5. WhatsApp-/Mailto-Klick: DOM-Ereignis einmal auslösen, **keine** Unterbrechung der externen Navigation.
6. Responsive Layout, Navbar, Formular-Validierung, Konfetti und PageSpeed unverändert.

## Datenschutz – vor der Produktivfreigabe prüfen (18.11.2026)

- **Formspree-Serverstandort:** Laut [Formspree Security](https://formspree.io/security/) werden die Dienste auf AWS in **den USA** betrieben; Formspree gibt an, als Datenbearbeiter auf Standardvertragsklauseln (SCC) zurückzugreifen.
- **Schweizer Informationspflicht:** Die [EDÖB-Informationspflicht](https://www.edoeb.admin.ch/de/informationspflicht) verlangt Angaben über Empfänger, Empfängerstaat und gegebenenfalls Datenschutzgarantien. In `datenschutz/index.html` sind Formspree, USA, der Anbieterhinweis zu SCC sowie Cloudflare jetzt ausdrücklich erwähnt.
- **Noch zu prüfen:** Ob Formsprees AGB/Datenschutzvertrag und SCCs für den konkreten LocalBoost-Account anwendbar sind und wie etwaige weitere Auslandsbearbeitungen technisch und rechtlich abgesichert sind. Keine pauschale DSG-Konformität behaupten.
- **Test- und Doku-Dateien:** `docs/` und `tests/` liegen in einem öffentlichen GitHub-Repository und können über GitHub und möglicherweise GitHub Pages gelesen werden. Sie enthalten keine geheimen Schlüssel; bei künftigen Änderungen darauf achten.
- **Auswertung:** Lead-Herkunft ist browserseitig und kann durch Adblocker, Referrer-Policy oder falsche UTM-Tags fehlen bzw. von Nutzern manipuliert werden. Sie ist eine Näherung und kein revisionssicherer Herkunftsnachweis.

## Nach der Veröffentlichung

- In Formspree prüfen, ob neue, **echte** Anfragen die Felder `lb_*` enthalten. Es werden keine alten Leads rückwirkend ergänzt.
- Die Anzahl erfolgreicher Leads je `lb_channel` und `lb_conversion_path` kann aus den Formspree-Einträgen ausgewertet werden, soweit der Tarif/Datenzugriff dies erlaubt.
- Eine rein clientseitige Erfolgsmeldung ist noch kein zahlender Kunde; CRM-Abschlussdaten müssen gesondert dazugeführt werden.
- Datenschutztext auf `/datenschutz/` vor dem Merge von der verantwortlichen Person prüfen.

## Quellen
- https://developers.cloudflare.com/web-analytics/faq/
- https://developers.cloudflare.com/zaraz/web-api/track/
- https://help.formspree.io/articles/building-your-form/submit-forms-with-javascript-ajax
