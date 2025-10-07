# Offr3D – Neo-Retro Offerte Console

Offr3D is een webapplicatie waarmee je offertes voor 3D‑printopdrachten kunt samenstellen, beheren en analyseren.  
De UI is geïnspireerd op 1980s computerterminals: Monospace typografie, matte beige & charcoal kleuren, minimalistische grids en subtiele CRT‑effecten.

---

## Inhoud

1. [Technische stack](#technische-stack)  
2. [Projectstructuur](#projectstructuur)  
3. [Installatie & scripts](#installatie--scripts)  
4. [Belangrijkste UI‑modules](#belangrijkste-ui-modules)  
5. [API-overzicht](#api-overzicht)  
6. [Stylingrichtlijnen](#stylingrichtlijnen)  
7. [Notities voor toekomstige ontwikkeling](#notities-voor-toekomstige-ontwikkeling)

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
│   └── api/          # PHP endpoints (get/save quotes, settings, materials, …)
├── src/
│   ├── components/   # Reusable UI (TerminalBackButton, forms, modals)
│   ├── pages/        # Views (Home, NewQuote, QuotesPage, Settings, …)
│   ├── context/      # Global context providers (SettingsContext)
│   ├── lib/          # Businesslogica (calculateItemCost, calculateQuoteCost, …)
│   ├── styles/       # Extra CSS indien nodig
│   └── index.css     # Tailwind layers + custom utility styles
├── README.md         # Dit document
├── .agents           # Snelle referentie voor toekomstige agents
├── package.json
└── vite.config.js
```

---

## Installatie & scripts

```bash
# 1. Dependencies installeren
npm install

# 2. Development server starten
npm run dev

# 3. Productiebouw maken
npm run build

# 4. Build previewen
npm run preview
```

Standaard draait de app op <http://localhost:5173/>. De PHP API’s gebruiken de paden onder `public/api`.  
Pas indien nodig de databasecredenties aan via `public/api/env.php`.

---

## Belangrijkste UI-modules

### Dashboard (`src/pages/Home.jsx`)
- Hero met call-to-actions en contextuele tekst  
- Quick actions: directe links naar kernflows  
- Animated status panel (`AnimatedDisplay`)  
- Metrics & stats (offertes, doorlooptijd, materials)  
- Recent quotes, taakbord en resource dock  
- Diagnostische log met retro-statusfeed

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
- `ManufacturerManager.jsx`, `ClientManager.jsx`: beheer van gekoppelde entiteiten.

---

## API-overzicht

Alle endpoints bevinden zich in `public/api`. Belangrijkste routes:

| Endpoint | Doel |
|----------|------|
| `get-settings.php` / `update-settings.php` | Ophalen en opslaan van globale instellingen |
| `get-quotes.php` / `get-quote-detail.php` | Lijsten & detailoffertes |
| `save-quote.php` / `update-quote.php` / `delete-quote.php` | CRUD-acties op offertes |
| `get-materials.php` / `save-material.php` / `update-material.php` / `delete-material.php` | Materiaalbeheer |
| `get-manufacturers.php`, `add-manufacturer.php`, enz. | Fabrikantbeheer |
| `get-clients.php`, `save-client.php`, enz. | Klantbeheer |

De endpoints verwachten JSON-requests en retourneren JSON-responses.  
De `SettingsContext` pakt automatisch fallback-waarden op wanneer er nog geen instellingen zijn opgeslagen.

---

## Stylingrichtlijnen

- **Theme**: kleuren en schaduwen uitbreiden via `tailwind.config.js` → gebruik `primary`, `accent`, `background`, `parchment`, `ink`, `gridline`, `signal.*`.  
- **Component classes**: herbruik de `terminal-*` utility classes uit `src/index.css` (bijv. `terminal-card`, `terminal-button`, `terminal-note`).  
- **Typografie**: `IBM Plex Mono` als basis; gebruik uppercase + tracking voor headings (`tracking-dial`).  
- **Interactie**: subtiele bewegingen (`hover:-translate-y-1`, `shadow-terminal-glow`) en geen zware animaties.  
- **Responsiveness**: grid layouts tweaken met Tailwind breakpoints; grote panels (dashboard) zijn mobile-first opgezet.

---

## Notities voor toekomstige ontwikkeling

- **Data integratie**: vervang placeholder/statistische data (recent quotes, taakbord) door echte API-calls zodra beschikbaar.  
- **Error handling**: toevoegen van toasts of modals i.p.v. `alert()` in offerte- en settingsflows.  
- **Testing**: voorlopig geen geautomatiseerde tests; overweeg React Testing Library voor kritische flows.  
- **Accessibility**: SVG’s hebben reeds `title/desc`; let bij nieuwe components op ARIA-labels en focus states.  
- **Deployment**: build output (`dist/`) statisch hosten; PHP API vereist server met PHP + MySQL.  
- **Agent workflows**: zie `.agents` voor snelle commandoreferences en high-level acties.

Veel succes met het verder uitbouwen van Offr3D!  
Heb je aanvullende vragen of wil je nieuwe modules introduceren, gebruik dan de structurele richtlijnen hierboven als kapstok.
