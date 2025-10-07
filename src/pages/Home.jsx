import { Link } from "react-router-dom";

const heroButtons = [
  { to: "/offerte", label: "Nieuwe offerte", variant: "accent" },
  { to: "/offertes", label: "Bekijk offertes", variant: "ghost" },
];

const quickActions = [
  {
    to: "/offerte",
    label: "Snelle prijsbepaling",
    description: "Start met basisparameters en genereer binnen seconden een concept.",
  },
  {
    to: "/materialen",
    label: "Voorraad aanpassen",
    description: "Werk beschikbare rollen bij en controleer drooginstellingen.",
  },
  {
    to: "/instellingen",
    label: "Tariefstructuur finetunen",
    description: "Pas uurtarieven, marges en leveropties aan.",
  },
];

const highlightStats = [
  { label: "Open concepten", value: "03", description: "Nog niet verzonden naar klanten" },
  { label: "Gem. doorlooptijd", value: "2.4 d", description: "Van prijsaanvraag tot offerte" },
  { label: "Winstmarge (gem.)", value: "27%", description: "Laatste 30 dagen" },
  { label: "Materialen op voorraad", value: "18", description: "Beschikbare varianten" },
];

const shortcuts = [
  {
    to: "/offerte",
    title: "Nieuwe Offerte",
    description: "Stel een nieuwe offerte op voor een klant.",
    code: "CMD-01",
  },
  {
    to: "/offertes",
    title: "Offertes Beheren",
    description: "Bekijk, bewerk of dupliceer offertes.",
    code: "CMD-02",
  },
  {
    to: "/instellingen",
    title: "Instellingen",
    description: "Pas standaardparameters en tarieven aan.",
    code: "SYS-SET",
  },
  {
    to: "/materialen",
    title: "Filament & Materialen",
    description: "Beheer voorraad, prijzen en eigenschappen.",
    code: "SYS-MAT",
  },
];

const recentQuotes = [
  {
    id: 1423,
    client: "Studio Orbital",
    amount: "862.40 EUR",
    status: "concept",
    date: "14 jun 2025",
  },
  {
    id: 1419,
    client: "Nova Robotics",
    amount: "1,245.10 EUR",
    status: "verzonden",
    date: "13 jun 2025",
  },
  {
    id: 1414,
    client: "PrintLab West",
    amount: "640.75 EUR",
    status: "goedgekeurd",
    date: "12 jun 2025",
  },
];

const taskBoardEntries = [
  {
    title: "Materiaal bijbestellen",
    description: "PLA Matte (wit) voorraad ≤ 1 rol",
    link: "/materialen",
    tone: "amber",
  },
  {
    title: "Follow-up klant",
    description: "Bel Nova Robotics over offerte #1419",
    link: "/offertes/1419",
    tone: "info",
  },
  {
    title: "Ontwerptijd registreren",
    description: "Werk modelleringstijd bij voor Studio Orbital",
    link: "/offerte?edit=1423",
    tone: "green",
  },
];

const resourceLinks = [
  {
    title: "Materiaalbibliotheek",
    description: "Sla nieuwe variant op, pas marges en droogeisen aan.",
    to: "/materialen",
    icon: "🧱",
  },
  {
    title: "Fabrikantenbeheer",
    description: "Hou leveranciersinformatie bij en koppel materialen.",
    to: "/instellingen/fabrikanten",
    icon: "🏭",
  },
  {
    title: "Klantendatabase",
    description: "Werk klantgegevens bij voor een vlotte offerteflow.",
    to: "/instellingen/klanten",
    icon: "👥",
  },
];

const diagnosticCommands = [
  { code: "LOG-204", label: "Laatste update", value: "Instellingen opgeslagen (2m geleden)" },
  { code: "PRT-118", label: "Actieve offertes", value: "3 concepten wachten op bevestiging" },
  { code: "SYS-008", label: "Materialenstatus", value: "2 rollen onder minimumvoorraad" },
];

export default function Home() {
  return (
    <div className="space-y-12">
      <Hero />
      <QuickActions />
      <AnimatedDisplay />
      <StatsPanel />
      <div className="grid gap-6 xl:grid-cols-[3fr,2fr]">
        <RecentQuotes />
        <TaskBoard />
      </div>
      <ShortcutGrid />
      <ResourceDock />
      <DiagnosticLog />
    </div>
  );
}

function Hero() {
  return (
    <section className="terminal-card space-y-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-70">
        <svg className="w-full h-full" viewBox="0 0 600 180" preserveAspectRatio="none">
          <rect width="600" height="180" fill="url(#heroGradient)" />
          <defs>
            <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(120,180,178,0.12)" />
              <stop offset="100%" stopColor="rgba(19,18,16,0.9)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="relative space-y-6">
        <header className="space-y-3 text-center md:text-left">
          <p className="terminal-section-title tracking-[0.3em]">Offr3D Command Console</p>
          <h1 className="text-5xl font-semibold tracking-[0.25em] text-primary drop-shadow">
            OFFR3D
          </h1>
          <p className="text-ink-muted text-sm uppercase tracking-[0.12em]">
            Plan. Bereken. Lever sneller offertes voor jouw 3D-printservice.
          </p>
        </header>
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
          {heroButtons.map((button) => (
            <Link
              key={button.label}
              to={button.to}
              className={`terminal-button text-xs tracking-[0.12em] ${
                button.variant === "ghost" ? "is-ghost" : "is-accent"
              }`}
            >
              {button.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <section className="terminal-card space-y-4">
      <header className="space-y-1">
        <p className="terminal-section-title">Snelle acties</p>
        <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
          Wat wil je nu doen?
        </h2>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="group rounded-card border border-gridline/50 bg-base-soft/70 p-4 shadow-terminal transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-terminal-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="terminal-pill text-xs tracking-[0.12em] group-hover:border-primary/70 group-hover:text-primary transition-colors duration-200">
                {action.label}
              </span>
              <span
                aria-hidden="true"
                className="text-primary transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </div>
            <p className="mt-3 text-xs tracking-[0.08em] text-gridline/70 leading-relaxed">
              {action.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AnimatedDisplay() {
  return (
    <div className="retro-display">
      <div className="retro-display__header">
        <span>STATUS</span>
        <span className="retro-display__cursor" aria-hidden="true" />
      </div>
      <svg
        className="retro-display__svg"
        viewBox="0 0 600 180"
        role="img"
        aria-labelledby="retro-wave-title retro-wave-desc"
        preserveAspectRatio="none"
      >
        <title id="retro-wave-title">Retro statusvisualisatie</title>
        <desc id="retro-wave-desc">
          Animatie van een golvende signaalcurve en raster, geïnspireerd op retro computerconsoles.
        </desc>
        <defs>
          <linearGradient id="retroGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(248,196,106,0.35)" />
            <stop offset="100%" stopColor="rgba(19,18,16,0.75)" />
          </linearGradient>
        </defs>
        <rect width="600" height="180" fill="url(#retroGradient)" />

        <g className="retro-display__grid">
          <line x1="0" y1="20" x2="600" y2="20" />
          <line x1="0" y1="70" x2="600" y2="70" />
          <line x1="0" y1="120" x2="600" y2="120" />
          <line x1="0" y1="170" x2="600" y2="170" />

          <line x1="60" y1="0" x2="60" y2="180" />
          <line x1="180" y1="0" x2="180" y2="180" />
          <line x1="300" y1="0" x2="300" y2="180" />
          <line x1="420" y1="0" x2="420" y2="180" />
          <line x1="540" y1="0" x2="540" y2="180" />
        </g>

        <path
          className="retro-display__wave"
          d="M0 110 Q 30 95 60 100 T 120 115 T 180 105 T 240 120 T 300 95 T 360 110 T 420 90 T 480 115 T 540 105 T 600 110"
        />

        <path
          className="retro-display__wave retro-display__wave--secondary"
          d="M0 130 Q 50 150 100 135 T 200 125 T 300 140 T 400 120 T 500 135 T 600 125"
        />
      </svg>
    </div>
  );
}

function StatsPanel() {
  return (
    <section className="terminal-card space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
          Operationale meter
        </h2>
        <p className="text-xs text-gridline/70">
          Samenvatting van de meest recente activiteiten binnen Offr3D.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-4">
        {highlightStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-card border border-gridline/60 bg-parchment-light/80 p-4 shadow-terminal-inset space-y-1"
          >
            <p className="terminal-label">{stat.label}</p>
            <p className="text-2xl font-semibold tracking-[0.2em] text-base-soft">{stat.value}</p>
            <p className="text-xs text-gridline/70 tracking-[0.08em]">{stat.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShortcutGrid() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {shortcuts.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="group terminal-card crt-scan text-base-soft transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-terminal-glow"
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-gridline/70">
            <span>{item.code}</span>
            <span>{">"} ready</span>
          </div>

          <h3 className="mt-5 text-2xl font-semibold tracking-dial text-base-soft transition-colors duration-200 group-hover:text-background">
            {item.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-gridline/70">{item.description}</p>
        </Link>
      ))}
    </section>
  );
}

function RecentQuotes() {
  return (
    <section className="terminal-card space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <p className="terminal-section-title">Recent verstuurd</p>
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
            Offerte-activiteit
          </h2>
        </div>
        <Link to="/offertes" className="terminal-button is-ghost text-xs tracking-[0.12em]">
          Alles bekijken
        </Link>
      </header>

      <ul className="space-y-3">
        {recentQuotes.map((quote) => (
          <li
            key={quote.id}
            className="rounded-card border border-gridline/50 bg-parchment/80 p-4 shadow-terminal-inset space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="terminal-label tracking-[0.18em] text-primary">
                  #{quote.id.toString().padStart(4, "0")}
                </p>
                <h3 className="text-lg font-semibold tracking-[0.12em] text-base-soft">
                  {quote.client}
                </h3>
              </div>
              <span className={`status-pill status-pill--${quote.status}`}>
                {quote.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs tracking-[0.08em] text-gridline/80">
              <span>{quote.date}</span>
              <strong className="text-primary">{quote.amount}</strong>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/offertes/${quote.id}`}
                className="terminal-button is-ghost text-xs tracking-[0.12em]"
              >
                Open detail
              </Link>
              <Link
                to={`/offerte?edit=${quote.id}`}
                className="terminal-button is-ghost text-xs tracking-[0.12em]"
              >
                Bewerk
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TaskBoard() {
  return (
    <section className="terminal-card space-y-3">
      <header className="space-y-1">
        <p className="terminal-section-title">Workload</p>
        <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
          Te ondernemen acties
        </h2>
      </header>

      <ul className="space-y-3">
        {taskBoardEntries.map((task, index) => (
          <li key={index}>
            <Link
              to={task.link}
              className="group flex flex-col gap-1 rounded-card border border-gridline/50 bg-base-soft/70 px-4 py-3 shadow-terminal transition-transform duration-200 hover:-translate-y-1 hover:shadow-terminal-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold tracking-[0.12em] text-base-soft">
                  {task.title}
                </p>
                <span className={`task-chip task-chip--${task.tone}`}>
                  {task.tone === "amber"
                    ? "Attention"
                    : task.tone === "green"
                    ? "Actief"
                    : "Reminder"}
                </span>
              </div>
              <p className="text-xs tracking-[0.08em] text-gridline/70 group-hover:text-primary transition-colors duration-200">
                {task.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResourceDock() {
  return (
    <section className="terminal-card space-y-4">
      <header className="space-y-1">
        <p className="terminal-section-title">Resources</p>
        <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
          Systeemmodules
        </h2>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {resourceLinks.map((resource) => (
          <Link
            key={resource.to}
            to={resource.to}
            className="group flex flex-col gap-2 rounded-card border border-gridline/50 bg-parchment-light/80 p-4 shadow-terminal transition-transform duration-200 hover:-translate-y-1 hover:shadow-terminal-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl" aria-hidden="true">
                {resource.icon}
              </span>
              <span className="terminal-pill text-xs tracking-[0.12em] group-hover:border-primary/70 group-hover:text-primary transition-colors duration-200">
                Open
              </span>
            </div>
            <h3 className="text-lg font-semibold tracking-[0.12em] text-base-soft">
              {resource.title}
            </h3>
            <p className="text-xs tracking-[0.08em] text-gridline/70 leading-relaxed">
              {resource.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DiagnosticLog() {
  return (
    <section className="terminal-card space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <p className="terminal-section-title">Activity log</p>
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">
            Laatste console-instructies
          </h2>
        </div>
        <span className="terminal-pill text-xs tracking-[0.12em]">Live</span>
      </header>

      <ul className="space-y-2 text-xs tracking-[0.08em] text-gridline/70">
        {diagnosticCommands.map((entry) => (
          <li
            key={entry.code}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-card border border-gridline/50 bg-base-soft/70 px-3 py-2"
          >
            <span className="text-primary tracking-[0.16em]">{entry.code}</span>
            <div className="sm:text-right">
              <p className="font-semibold text-base-soft">{entry.label}</p>
              <p>{entry.value}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
