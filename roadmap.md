# Offr3d roadmap voor een volwaardige offerte-oplossing

- [x] **Huidige Offr3d basis (gereed)**
  - [x] Offertes maken/bewerken met printcalculatie (NewQuotePage, calculateQuoteCost)
  - [x] Offerteoverzicht en detail incl. PDF (QuotesPage, QuoteDetailPage, generate-quote-pdf.php)
  - [x] Facturen gekoppeld aan offertes (NewInvoicePage, create-invoice-from-quote.php, generate-invoice-xml/pdf)
  - [x] Materiaal- en spoolbeheer plus prijsregels (MaterialManager, Spools API, price-rules endpoints)
  - [x] Klantenbeheer en stats (KlantenBeheer, ClientStatsPage, get-clients/get-client-stats)
  - [x] Settings voor marges/tarieven/BTW (SettingsPage, SettingsContext, update-settings.php)

- [x] **Fundament & visie (stap 1)**
  - [x] Scope (PM/Sales)
    - MVP: printoffertes (bestaand), custom regels (diensten/assemblage), bundels, revisies, geldigheid en condities, gekoppelde factuur.
    - Next: optionele keuzes per offerte, betalinks (aanbetaling), e-sign koppeling.
    - Later: AI-tekstvoorstellen, marge/win-rate suggesties.
  - [x] Persona's + journeys (UX/PM)
    - Sales: nieuw > klant kiezen > print + custom regels > condities > preview/PDF > verstuur. Schermen: NewQuotePage, QuoteDetailPage, generate-quote-pdf.php.
    - Prepress/technisch: materiaal/printdata checken, kostprijsvalidatie, revisies. Schermen: MaterialManager, calculateQuoteCost, update-quote.php.
    - Finance: margecontrole, betalingscondities, factuur genereren. Schermen: SettingsPage (tarieven/BTW), create-invoice-from-quote.php, generate-invoice-xml/pdf.
    - Klant: ontvangt PDF, maakt keuze (via mail/telefoon); later e-sign/betalink.
  - [x] KPI-set (PM/Finance)
    - Time-to-quote: start nieuwe offerte tot versturen (log in frontend + get-quote-metrics).
    - Win-rate: geaccepteerd / verstuurd (status in update-quote-status.php).
    - Bruto marge per offerte: verkoopprijs - kostprijs; bron calculateQuoteCost -> tonen in metrics.
    - Revisies per offerte: aantal updates (quote events).
    - Lead time: gewenst vs. gecommitteerde levertermijn (veld in voorwaarden).
  - [x] Artefacten (PM/Design)
    - Productvisie 1-pager: "Offr3d = snelle neo-retro console voor nauwkeurige 3D-print + service-offertes met margecontrole en nette PDF."
    - Journey map: per persona bovenstaande stappen; status-flow draft > review > bevestigd > verstuurd > geaccepteerd/afgewezen.
    - KPI-dashboard skeleton: extra cards op Home voor time-to-quote, win-rate, marge, revisies (bron: get-quote-metrics + status).
  - [x] Governance (PM/Finance)
    - Rollen: Sales kan offertes aanmaken/bewerken tot "review"; Reviewer/Finance bevestigt voor versturen; Admin kan condities/BTW/marges wijzigen.
    - Statusflow: draft (Sales) -> review (Prepress/Finance) -> bevestigd (ok) -> verstuurd (naar klant) -> geaccepteerd/afgewezen (klant). Mapping op update-quote-status.php en QuoteDetailPage acties.
    - Prijswijzigingen loggen via quote events; marges zichtbaar voor interne rollen, niet in klant-PDF.

- [x] **Data & basisconfiguratie**
  - [x] Materiaal- en printercatalogus normaliseren
    - Velden (printer/material): gram, support %, nozzle/bed-temp, printspeed, infill; uitbreiden met afwerking/nabewerking (schuren, primer, coating) als optionele regels.
    - Consistente eenheden (gram, uren, stuks). Spools blijven gewicht-gedreven; services als tijd of stuks.
  - [x] Kostprijscalculatie-model valideren
    - Bron: calculateItemCost/calculateQuoteCost. Kostprijs/verkoopprijs/marge gescheiden; staffels via price-rules.
    - Uurtarieven en opslag in Settings; custom regels krijgen eigen kost- en verkoopveld (geen verborgen marges in PDF).
  - [x] BTW/regio-regels modelleren
    - Default 0% (niet btw-plichtig) in Settings; model ondersteunt toekomstig btw-tarief per regio/klant (velden vat_rate, vat_region, fallback 0%).
    - PDF toont BTW-regel indien >0, anders "0% btw (vrijstelling)"; logica in generate-quote-pdf.php/generate-invoice-xml/pdf klaarzetten.
  - [x] Offerte/regel-schema uitlijnen met workflow
    - Hoofd: klant, geldigheid, levertermijn, betalingscondities, status, totalen (ex/incl btw), marge.
    - Regels: type print of custom; velden: titel, beschrijving, qty, eenheid, kost, verkoop, btw%, tags (service/afwerking).
    - Bijlagen/notes: revisie-notes, interne comments (niet op PDF).
    - Mapping: save-quote/update-quote uitbreiden voor custom regels; update-quote-status.php statusbron; get-quote-detail levert beide regeltypen.

- [ ] **Offerte-aanmaak (custom + print)**
  - [ ] Guided workflow (UX/FE): nieuw > klant kiezen > print-items of custom regel toevoegen > condities (geldigheid, levertermijn, betalingscondities) > samenvatting/PDF-preview.
  - [ ] Lijn-editor voor custom regels (FE/BE): titel, beschrijving, qty, eenheid (uur/stuk), kost, verkoop, marge%, btw%; zichtbaar in UI, kost + marge alleen intern.
  - [ ] Bundels en optionele keuzes (FE/BE): groep regels markeren als optioneel/selecteerbaar; totalen herberekenen; status in get-quote-detail en generate-quote-pdf.php.
  - [ ] Revisies en notes (FE/BE): revisie-notes per versie; interne comments niet zichtbaar in PDF; opslag via update-quote.php.
  - [ ] Condities defaults (Settings): standaard condities en 0% btw worden automatisch gevuld, maar overschrijfbaar per offerte.

- [ ] **Prijsengine & calculatie**
  - [ ] Kost/verkoop/marge strikt scheiden (FE/BE): calculateQuoteCost levert zowel kost als verkoop; marge% zichtbaar intern.
  - [ ] Staffels en kortingen: price-rules uitbreiden voor staffels op qty of totaal; kortingen per regel of offerte.
  - [ ] Scenario's: vaste prijs, target marge (bereken verkoop op basis van gewenste marge), kosten+opslag (markup configurabel in Settings).
  - [ ] Multi-valuta en afronding: valuta-veld op offerte, afrondingsregels (2 decimalen, optionele afronding op 0.05); conversies optioneel via settings.
  - [ ] Validatie: minimumprijs drempel, verplichte velden, logboek van prijsbeslissingen (quote events).

- [ ] **Sjablonen & opmaak**
  - [ ] Template systeem (Design/FE): keuze uit thema's met logo/kleuren/fonts passend bij Offr3d-stijl.
  - [ ] Blokken: intro, samenvatting, specificaties, planning, condities, ondertekening; toggles per blok.
  - [ ] Versiebeheer per sjabloon: naam, versie, changelog; preview modal.
  - [ ] Export: PDF/HTML consistent; download- en e-mailoptie; 0% btw tekst tonen bij vrijstelling, anders tariefregels.

- [ ] **Samenwerking & governance**
  - [ ] Rollen/rechten afdwingen (FE/BE): Sales vs Reviewer/Finance vs Admin; acties conditioneel in UI.
  - [ ] Goedkeuringsflow: draft > review > bevestigd > verstuurd > geaccepteerd/afgewezen; endpoints reuse update-quote-status.php; UI knoppen per rol.
  - [ ] Commentaar/mentioning: interne notities per offerte; optioneel mentions (namenlijst); opslag in quote events/log.
  - [ ] Audit trail: tijdstempels voor status- en prijswijzigingen; exporteerbaar log.

- [ ] **Integraties**
  - [ ] CRM/ERP hook: webhooks of export (CSV/JSON) voor klant/deal sync; veld voor extern deal-id.
  - [ ] E-sign: pluggable provider; plaats van ondertekening in PDF + status terugmelden.
  - [ ] Betaallinks: optionele aanbetaling; link in e-mail/PDF; status in QuoteDetailPage.
  - [ ] Notificaties: e-mail en webhooks bij statuswijziging/verloopdatum; optioneel kalender (.ics) voor deadline.

- [ ] **UX & productisering**
  - [ ] Progress-indicator op NewQuotePage; defaults invullen vanuit Settings (0% btw, condities, levertermijn).
  - [ ] In-app hulp en checklisten: info-tooltips bij marges/btw; checklist op Home voor setup-stappen.
  - [ ] Concepten/dupliceer: offerte als concept opslaan en dupliceren; versie-increment.
  - [ ] Zoek/filter in QuotesPage: status, owner, klant, tags (print/custom/bundel), marge-range.

- [ ] **Beveiliging & compliance**
  - [ ] Toegang per rol; marges/ kostprijzen verbergen voor rollen zonder rechten.
  - [ ] Logging/monitoring: alerts bij negatieve marge of lage prijs vs. minimum.
  - [ ] Privacy: klant-PII minimaliseren in exports; bewaartermijnen definiëren.
  - [ ] HTTPS afdwingen (bestaand via .htaccess); CORS en API-key blijven actief.

- [ ] **Kwaliteit & testen**
  - [ ] Unit/integration tests: prijsengine (print + custom + staffels), template rendering (0% btw en >0%).
  - [ ] E2E flow: offerte aanmaken (print+custom) > review > versturen > status accepteren > factuur genereren.
  - [ ] PDF/HTML regressie: visual diff op key templates.
  - [ ] Performance: test offertes met 100+ regels; geheugen- en laadtijd meten.

- [ ] **Lancering & iteratie**
  - [ ] Beta met geselecteerde klanten; feedback verwerken op flow/PDF.
  - [ ] Metrics monitoren: time-to-quote, win-rate, marge, revisies; dashboards op Home.
  - [ ] Roadmap bijwerken o.b.v. gebruik (NPS, win-rate, time-to-quote).

- [ ] **Stretch**
  - [ ] Dynamische prijs-suggesties (historische win-rate/marge).
  - [ ] AI-tekstvoorstellen voor intro/condities; upsell-opties; consistentiecheck op marges/regels.
