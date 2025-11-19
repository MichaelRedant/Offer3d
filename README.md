# Offr3d – Neo-Retro Offerte Console

Offr3d is de XinuDesign-offerteconsole voor 3D-printopdrachten.  
De UI is geïnspireerd op 1980’s computerterminals: monospace typografie, matte beige & charcoal kleuren, minimalistische grids en subtiele CRT-effecten.

---

## Inhoud

1. [Technische stack](#technische-stack)  
2. [Projectstructuur](#projectstructuur)  
3. [Hosting & domein](#hosting--domein)  
4. [Installatie & scripts](#installatie--scripts)  
5. [Belangrijkste UI-modules](#belangrijkste-ui-modules)  
6. [API-overzicht](#api-overzicht)  
7. [Stylingrichtlijnen](#stylingrichtlijnen)  
8. [Notities voor toekomstige ontwikkeling](#notities-voor-toekomstige-ontwikkeling)

---

## Technische stack

- **Frontend**: React 18, Vite, JavaScript (ESNext)  
- **Styling**: TailwindCSS met custom theme (`tailwind.config.js`)  
- **State & context**: React Context (`SettingsContext`)  
- **Backend (API)**: PHP endpoints in `public/api`, MySQL via PDO  
- **Build tooling**: Vite, PostCSS

---

## Projectstructuur

```
offr3d/
├── public/
│   ├── api/          # PHP endpoints (quotes, settings, materials, …)
│   └── sitemap.xml   # Sitemap voor zoekmachines
├── src/
│   ├── components/   # UI (TerminalBackButton, forms, modals, …)
│   ├── pages/        # Views (Home, NewQuote, Quotes, Settings, …)
│   ├── context/      # Global providers (SettingsContext, ToastContext)
│   ├── lib/          # Businesslogica (calculateItemCost, calculateQuoteCost, …)
│   └── styles/       # Tailwind layers + custom utilities
├── README.md
├── .AGENTS.md
├── package.json
└── vite.config.js
```

---

## Hosting & domein

- Productie-URL: `https://xinudesign.be/offr3d`  
- HTTPS is verplicht en wordt via `.htaccess` geforceerd (inclusief canonical redirect naar `xinudesign.be`).  
- De sitemap staat in `public/sitemap.xml` en wordt automatisch meegebundeld.  
- De front-end draait als een Vite SPA; API-verzoeken gaan naar `public/api/*.php`.

---

## Installatie & scripts

```bash
# Dependencies installeren
npm install

# Development server starten
npm run dev

# Productiebouw maken
npm run build

# Build previewen
npm run preview
```

Standaard draait de app op <http://localhost:5173/>. De PHP API’s gebruiken de paden onder `public/api`.  
Pas indien nodig de databasecredenties aan via `public/api/env.php`.

---

## Belangrijkste UI-modules

### Dashboard (`src/pages/Home.jsx`)
- Hero met CTA’s (nieuwe offerte, overzicht) en live status  
- Metrics die echte data tonen (offertes, materialen, klanten, winstmarge)  
- Quick-navigation grid voor de belangrijkste modules  
- Laatste offertes (op basis van `/api/get-quotes.php`)  
- Systeemchecklist om settings/klanten/materialen te valideren  
- Resource grid met ondersteunende schermen

### Offerteflow
- `NewQuotePage.jsx`: ondersteunt zowel nieuwe als bestaande offertes (`?edit=:id`).  
- `PrintItemList.jsx`, `QuoteForm.jsx`: verzamelt itemgegevens en algemene parameters.  
- `SummarySection.jsx`: toont berekende kosten op basis van `calculateQuoteCost`.

### Overzicht & detail
- `QuotesPage.jsx`: grid van offertes met snelle acties (bekijk/bewerk/verwijder).  
- `QuoteDetailPage.jsx`: detailpagina met metrics, klantinfo en itemlijst.

### Configuratie
- `SettingsPage.jsx`: instellingen voor marges, tarieven en fiscaliteit.  
- `MaterialManager.jsx`: beheer van materialen inclusief stats, filters en fabrikantmodal.  
- `ManufacturerManager.jsx`, `ClientManager.jsx`: gekoppelde entiteiten.  
- `ModelleringssoftwareManager.jsx`, `DryerManager.jsx`: administratie van tools en licenties.

---

## API-overzicht

Alle endpoints bevinden zich in `public/api`. Belangrijkste routes:

| Endpoint | Doel |
|----------|------|
| `get-settings.php` / `update-settings.php` | Ophalen en opslaan van globale instellingen |
| `get-quotes.php` / `get-quote-detail.php` | Lijst & detail van offertes |
| `save-quote.php` / `update-quote.php` / `delete-quote.php` | CRUD-acties op offertes |
| `get-materials.php` / `save-material.php` / `update-material.php` / `delete-material.php` | Materiaalbeheer |
| `get-manufacturers.php`, `add-manufacturer.php`, … | Fabrikantbeheer |
| `get-clients.php`, `save-client.php`, … | Klantbeheer |

De endpoints verwachten JSON-requests en retourneren JSON-responses.  
`SettingsContext` pakt automatisch fallback-waarden op wanneer er nog geen instellingen zijn opgeslagen.

---

## Stylingrichtlijnen

- **Theme**: gebruik tokens uit `tailwind.config.js` (`primary`, `accent`, `parchment`, `ink`, `gridline`, `signal.*`).  
- **Component classes**: herbruik `terminal-*` utilities uit `src/index.css` (bijv. `terminal-card`, `terminal-button`, `terminal-note`).  
- **Typografie**: `IBM Plex Mono` als basis; headings met uppercase + tracking (`tracking-dial`).  
- **Interactie**: subtiele bewegingen (`hover:-translate-y-1`, `shadow-terminal-glow`) en zachte animaties.  
- **Responsiveness**: grid layouts mobile-first; pas breakpoints aan indien een kaart te breed oogt.

---

## Notities voor toekomstige ontwikkeling

- **Monitoring**: overweeg health-endpoints zodat het dashboard API-status kan tonen.  
- **Testing**: geen geautomatiseerde tests aanwezig; React Testing Library is een logische volgende stap.  
- **Accessibility**: let bij nieuwe componenten op ARIA-labels en focus states.  
- **Deployment**: build output (`dist/`) statisch hosten; PHP API vereist server met PHP + MySQL.  
- **Agent workflows**: zie `.AGENTS.md` voor quick reference.
