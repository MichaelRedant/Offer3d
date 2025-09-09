Offer3D — README.md

Een moderne, lokale offerte-tool voor 3D‑printbedrijven. Gebouwd met React + TypeScript (Vite), Tailwind CSS, Zustand (met localStorage‑persist) en een uitbreidbare pricing‑engine. Geen backend vereist.

Inhoudsopgave

Doel

Kenmerken

Architectuur

Tech Stack

Systeemvereisten

Project opzetten

Scripts

Folderstructuur

Domeinmodel

Pricing‑engine

State & opslag

Stylingrichtlijnen

Kwaliteit & Testing

Conventies

Release & Deploy

Roadmap

FAQ

Licentie

Doel

Offer3D helpt 3D‑printstudio’s en makers om snel, consistent en transparant offertes op te stellen. De app rekent materiaal, machine‑uren, energie, drogers en nabewerking samen, inclusief opslag van presets en automatische btw‑berekening. Alle data blijft lokaal (localStorage).

Kenmerken

⚡️ SPA met Vite: bliksemsnelle DX en bundling.

🧠 Pricing‑engine: één bron van waarheid voor alle kostcomponenten.

💾 Zustand + persist: state bewaard in localStorage (offline‑first).

🎛️ Instelbaar: valuta, btw‑tarief, printers, filamenten, drogers. Elektriciteitsprijs kan automatisch via Elia Open Data opgehaald of handmatig ingegeven worden.

➕ Lijnitems: per item materiaalkost, energie, machine, nabewerking, markup.

🧾 Samenvatting: totaal excl./incl. btw, print‑vriendelijke weergave (Ctrl/Cmd‑P).

🧩 Type‑safe: TypeScript + Zod schemas voor evolutiebestendige modellen.

Architectuur

UI: React componenten, Tailwind utility‑classes.

State: useOfferStore (Zustand) met persist‑middleware → localStorage.

Business logic: utils/pricing.ts berekent line totals en aggregaties.

Types: types.ts definieert Filament, Printer, Dryer, PostProcessStep, LineItem, Offer, Settings.

Presentatie: SummaryCard toont afgeleide waarden, OfferForm beheert invoer.

Tech Stack

React 18+, TypeScript, Vite

Tailwind CSS

Zustand (met persist)

Zod

Vitest + React Testing Library (optioneel, zie Kwaliteit & Testing)

Systeemvereisten

Node.js: 22.12.0

npm: meegeleverd met Node 22

OS: macOS, Linux of Windows

Project opzetten

# 1) Repo clonen (voorbeeld)
git clone <repo-url> offer3d && cd offer3d

# 2) Dependencies installeren
npm install

# 3) Dev server starten
npm run dev

# 4) Productie build
npm run build
npm run preview

Geen .env nodig. Alle data is lokaal en client‑side.

Scripts

Script

Doel

npm run dev

Start Vite dev server met HMR

npm run build

Maakt productiebuild (dist/)

npm run preview

Servet de productiebuild lokaal

npm run typecheck

(Optioneel) TypeScript type‑check

npm run test

(Optioneel) Unit/component tests met Vitest

Folderstructuur

src/
  components/
    OfferForm.tsx        # Invoer van lijnen, settings, klant
    SummaryCard.tsx      # Overzicht & totals + printknop
    Money.tsx            # Valuta‑weergave helper
  store/
    offerStore.ts        # Zustand store + persist
  utils/
    pricing.ts           # Pricing‑engine
    format.ts            # Format helpers (geld, %)
  types.ts               # Zod schemas & TypeScript types
  App.tsx                # Compositie van Form + Summary
  main.tsx               # Entrypoint
  index.css              # Tailwind

Domeinmodel

Kernentiteiten (vereenvoudigd):

Filament: pricePerKg, material, color, optioneel density.

Printer: hourlyRate, powerWatt.

Dryer: powerWatt, optioneel hourlyRate.

PostProcessStep: minutes, ratePerHour, optioneel fixedCost.

LineItem: verbindt filament/printer en hoeveelheden (gramsUsed, printHours, dryerHours, post[], markupPct).

Offer: metadata (titel, klant) + lines[].

Settings: currency, vatPct, electricityPricePerKWh.

Pricing‑engine

Formules per lijn (calcLineTotals):

Materiaal = (pricePerKg / 1000) * gramsUsed

Energie = ((printerWatt/1000)*printHours + (dryerWatt/1000)*dryerHours) * electricityPricePerKWh

Machine = printer.hourlyRate * printHours

Nabewerking = Σ( (minutes/60)*ratePerHour + fixedCost )

BaseCost = Materiaal + Energie + Machine + Nabewerking

Markup = BaseCost * (markupPct/100)

Excl. btw = BaseCost + Markup

BTW = Excl. btw * (vatPct/100)

Incl. btw = Excl. btw + BTW

Aggregaties op offerte‑niveau sommeren per lijn.

State & opslag

Zustand met persist → localStorage key offer3d-store-v1.

Migratie: verhoog version in persist‑config bij schemawijzigingen en schrijf een migrate‑functie.

Seed: seedDefaults() vult demo‑filamenten, printers en droger.

Stylingrichtlijnen

Tailwind utility‑first. Houd componenten klein en semantisch.

Gebruik tabular-nums voor bedragen.

Donkere/lichte modus kan later via CSS :root variabelen toegevoegd worden.

Kwaliteit & Testing

ESLint/Prettier

Voeg naar wens ESLint/Prettier toe:

npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks prettier eslint-config-prettier

Voorbeeld .eslintrc.cjs en .prettierrc kun je later toevoegen.

Vitest + RTL (optioneel)

npm i -D vitest @testing-library/react jsdom @testing-library/user-event

vite.config.ts test‑sectie:

/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
});

src/test/setup.ts:

import "@testing-library/jest-dom";

Voorbeeld testideeën:

pricing.ts → edge‑cases (0 gram, 0 uur, hoge markup, verschillende btw).

SummaryCard → correcte sommen en valutaweergave.

Conventies

Git & Commits

Conventional Commits: feat:, fix:, refactor:, chore:, test:, docs:

Kleine, atomische commits, duidelijke scope.

Codeprincipes

Eén bron van waarheid voor prijzen (utils/pricing.ts).

Componenten: presentational vs. stateful scheiden als ze groeien.

Geen businesslogica in JSX; gebruik utils/selectors.

Release & Deploy

Static build (dist/) werkt op elke statische host.

Vercel/Netlify: framework = Vite, build = npm run build, output = dist.

GitHub Pages: gebruik vite base‑path indien nodig.

Roadmap

Presets (kwaliteit & materiaal) die automatisch printHours, speed, infill beïnvloeden.

Meerdere drogers/post‑process profielen per lijn.

Import/Export (JSON) & merkbare PDF‑export.

i18n (NL/EN/FR) voor UI en offerte.

Klanttypes (B2B/B2C) en bijzondere btw‑regels.

Afschrijvingsmodel en voorraadbeheer (spoelen).

Eenvoudige rol‑gebaseerde toegang als ooit een backend volgt.

FAQ

Bewaren jullie data online? Nee, alles leeft in localStorage op jouw toestel.

Kan ik mijn data meenemen? Voorzien wordt een JSON export/import.

Klopt de energie‑schatting? We gebruiken gemiddelde wattages; pas je printer/drogerwaarden aan voor jouw setup.

Ondersteunen jullie meerdere valuta/btw? Ja, via Settings. Meerdere profielen komen in de roadmap.

Licentie

© 2025. Alle rechten voorbehouden, tenzij anders afgesproken in het project.

