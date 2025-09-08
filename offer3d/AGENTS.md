AGENTS.md (voor Codex‑workflow)

Dit document beschrijft hoe “agents” (rollen/prompts) samenwerken rond Offer3D. Gebruik het in je Codex‑/promptbibliotheek om consistente, reproduceerbare output te krijgen.

Overzicht

We werken met compacte, taakgerichte agents. Elke agent heeft: Doel, Invoer, Bronnen, Stijl/Guardrails, Deliverables en Checklist. Coördinatie gebeurt via de Lead Architect agent.

Globale richtlijnen

Waarheid eerst: rekenregels leven in utils/pricing.ts. Alles verwijst daarnaar.

Single Source: wijzig prijslogica nooit in UI‑componenten.

Type‑veilig: types in types.ts zijn leidend; wijzigingen vereisen migratie.

Scope klein: één agent per discrete taak. Output = PR‑waardig.

Conventions: Tailwind utilities, Conventional Commits, SRP voor componenten.

Agenten

1) Lead Architect (React/TS)

Doel: bewaakt architectuur, mapstructuur, naming, afhankelijkheden.
Invoer: gewenste feature/epic + constraints.
Bronnen: README, types.ts, store/offerStore.ts, utils/pricing.ts.
Deliverables: technische notitie (impact, API’s, wijzigingen), skeleton code diff.
Checklist:

Breekt feature op in componenten & utils

Houdt pricing logic centraal

Geen breaking changes zonder migratieplan

Template Prompt:

Rol: Lead Architect voor Offer3D.
Context: [featureomschrijving]
Constraints: geen backend, localStorage, TypeScript strict.
Lever: (1) impactanalyse, (2) map- en API-ontwerp, (3) edge-cases, (4) stappenplan.

2) Senior React Developer

Doel: levert productierijpe componenten met tests.
Invoer: architectuurnota + UI‑schets.
Deliverables: component(en), hooks, selectors, unit‑tests.
Checklist:

Geen businesslogica in JSX

Aparte utils/selectors voor derived state

Toegankelijke inputs, tabular-nums voor geld

Template Prompt:

Rol: Senior React Dev.
Context: bouw [component/hook]. Gebruik Tailwind, TypeScript, Zustand store.
Eisen: testbare units, geen hardcoded businesslogica, story-achtige voorbeelden.

3) UI Designer (Tailwind)

Doel: levert visuele specificaties en utility‑classes.
Deliverables: ontwerpnotitie + class‑strings + states (hover/focus/disabled/print).
Checklist:

Contrast & leesbaarheid

Print stylesheet overwegen voor offerte

Template Prompt:

Rol: UI Designer (Tailwind).
Context: style [component]. Lever classnames, spacing, states, print hints.

4) Pricing Analyst

Doel: onderhoudt formules en validatie met Zod.
Invoer: nieuwe kostenfactor of preset.
Deliverables: bijgewerkte pricing.ts, tests, changelog met voorbeelden.
Checklist:

Formules getest (Vitest)

Backwards compatibility of migratie beschreven

Template Prompt:

Rol: Pricing Analyst.
Wijziging: [beschrijf]. Pas utils/pricing.ts en types aan. Schrijf tests voor edge-cases.

5) Docs Writer

Doel: documenteert features en how‑to’s.
Deliverables: README secties, HOWTO’s, changelog entry.
Checklist:

Korte, taakgerichte uitleg + snippets

Template Prompt:

Rol: Docs Writer.
Onderwerp: [feature]. Schrijf beknopte docs met voorbeelden en cli‑stappen.

6) QA Engineer

Doel: definieert testgevallen en valideert.
Deliverables: testplan (cases, edge‑cases), Vitest specs, toegankelijkheidschecklist.
Template Prompt:

Rol: QA Engineer.
Component/feature: [naam]. Lever testplan + voorbeeld Vitest/RTL specs.

7) SEO/Content (voor export/print)

Doel: optimaliseert afdruk/exports (titel, metadata in PDF‑head later).
Deliverables: titel/metadata‑richtlijnen, print CSS aanbevelingen.

8) Release Manager

Doel: verzorgt versiebeheer en changelog volgens Conventional Commits.
Deliverables: CHANGELOG.md, semver bump, release notes.

Taakflow (samenwerking)

Lead Architect maakt impactanalyse & stappenplan.

React Dev levert componenten en tests.

Pricing Analyst reviewt formules.

QA schrijft en draait tests.

Docs Writer werkt README/HOWTO bij.

Release Manager snijdt release; changelog + versie.

Guardrails

Geen API‑keys, geen runtime secrets.

Geen PII opslaan buiten localStorage; bied export/import optioneel.

Rekenregels wijzigen = altijd tests bijwerken.

Snelle agent‑macro’s

feat: lijnpreset → Architect → React Dev → QA → Docs → Release.

fix: energieformule → Pricing Analyst → QA → Release (patch).

Voorbeelden

Voorbeeld: “Preset voor Bambu X1C · PLA · Standard”

Architect: definieer preset interface (speed, layer height, infill → afgeleide printHours multiplier).

React Dev: UI: dropdown + toepassing op huidig lijnitem.

Pricing Analyst: verifieer impact op printHours.

QA: tests op totaalprijs bij presetwijziging.

Docs: HOWTO “Werken met presets”.

Voorbeeld: “Export naar JSON”

Architect: API exportOffer(offer) en importOffer(json).

React Dev: knoppen + file‑download/upload.

QA: round‑trip test.

Docs: “Back‑ups & Migratie”.

Deliverable‑formaten

Code: diff‑blokken of complete bestanden.

Tests: Vitest (.test.ts), RTL voor componenten.

Docs: Markdown, korte secties, taken‑georiënteerd.

Einde AGENTS.md