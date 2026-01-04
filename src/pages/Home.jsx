import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SettingsContext } from "../context/SettingsContext";
import { baseUrl } from "../lib/constants";

const QUICK_LINKS = [
  { to: "/offerte", title: "Nieuwe offerte", description: "Start direct met een leeg voorstel.", accent: "accent" },
  { to: "/offertes", title: "Offertes beheren", description: "Zoek, bekijk en wijzig bestaande offertes." },
  { to: "/materialen", title: "Materialen & voorraad", description: "Controleer prijzen en drooginstellingen." },
  { to: "/instellingen", title: "Financiële instellingen", description: "Werk marges, btw en tarieven bij." },
];

const RESOURCE_LINKS = [
  { to: "/instellingen/klanten", label: "Klantendatabase", helper: "Beheer contactinfo voor offertes." },
  { to: "/materialen", label: "Materialen", helper: "Beheer voorraad en leverancierskoppeling." },
  { to: "/instellingen/drogers", label: "Drogers & tools", helper: "Houd hardware-inventaris bij." },
];

export default function Home() {
  const { settings, loading: settingsLoading } = useContext(SettingsContext);
  const [overview, setOverview] = useState({ quotes: [], materials: [], clients: [] });
  const [status, setStatus] = useState({ loading: true, errors: [] });
  const apiBase = baseUrl;

  useEffect(() => {
    let active = true;

    async function fetchAll() {
      setStatus({ loading: true, errors: [] });
      const endpoints = [
        { url: `${apiBase}/get-quotes.php`, key: "quotes" },
        { url: `${apiBase}/get-materials.php`, key: "materials" },
        { url: `${apiBase}/get-clients.php`, key: "clients" },
      ];

      const results = await Promise.allSettled(
        endpoints.map(async ({ url }) => {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            throw new Error(errorText || `Fout bij laden van ${url}`);
          }
          return response.json();
        })
      );

      if (!active) return;

      const nextData = { quotes: [], materials: [], clients: [] };
      const errors = [];

      results.forEach((result, index) => {
        const key = endpoints[index].key;
        if (result.status === "fulfilled" && Array.isArray(result.value)) {
          nextData[key] = result.value;
        } else if (result.status === "fulfilled") {
          nextData[key] = [];
        } else {
          errors.push(result.reason?.message || `Kon ${key} niet laden.`);
          nextData[key] = [];
        }
      });

      setOverview(nextData);
      setStatus({ loading: false, errors });
    }

    fetchAll();
    return () => {
      active = false;
    };
  }, [apiBase]);

  const metrics = useMemo(() => {
    const lastQuote = overview.quotes[0];
    const dryingMaterials = overview.materials.filter((item) => item?.moet_drogen).length;

    return [
      {
        label: "Offertes in systeem",
        value: overview.quotes.length,
        helper: lastQuote?.datum ? `Laatste update: ${formatDate(lastQuote.datum)}` : "Nog geen offertes opgeslagen.",
      },
      {
        label: "Beschikbare materialen",
        value: overview.materials.length,
        helper:
          overview.materials.length === 0
            ? "Voeg materialen toe voor nauwkeurige calculaties."
            : `${dryingMaterials} materiaal${dryingMaterials === 1 ? "" : "en"} met droogstap.`,
      },
      {
        label: "Klanten opgeslagen",
        value: overview.clients.length,
        helper:
          overview.clients.length === 0
            ? "Koppel offertes sneller door klanten vooraf toe te voegen."
            : "Klantgegevens klaar voor koppeling.",
      },
      {
        label: "Standaard winstmarge",
        value:
          settings && Number.isFinite(Number(settings.standaardWinstmarge))
            ? `${Number(settings.standaardWinstmarge).toFixed(1)} %`
            : "Niet ingesteld",
        helper: settings ? "Afkomstig uit de instellingen." : "Instellingen laden...",
      },
    ];
  }, [overview, settings]);

  const latestQuotes = useMemo(() => overview.quotes.slice(0, 4), [overview.quotes]);

  return (
    <main className="space-y-8">
      <HeroPanel settingsLoading={settingsLoading} metrics={metrics} status={status} />
      <QuickNavigation />
      <DashboardMetrics />
      <section className="grid gap-6 lg:grid-cols-3">
        <RecentQuoteList quotes={latestQuotes} loading={status.loading} />
        <SystemChecklist settings={settings} overview={overview} className="lg:col-span-2" />
      </section>
      <ResourceGrid />
    </main>
  );
}

function HeroPanel({ settingsLoading, metrics, status }) {
  return (
    <section className="terminal-card space-y-6 bg-parchment/95">
      <header className="space-y-3">
        <p className="terminal-section-title">Welkom</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-dial uppercase text-base-soft">Offr3D Console</h1>
            <p className="text-sm text-gridline/90">
              Monitor offertes, voorraad en instellingen vanaf \u00e9\u00e9n startscherm.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/offerte" className="terminal-button is-accent">
              Nieuwe offerte
            </Link>
            <Link to="/offertes" className="terminal-button is-ghost">
              Naar overzicht
            </Link>
          </div>
        </div>
      </header>

      {status.errors.length > 0 && (
        <div className="rounded-card border border-signal-amber/60 bg-signal-amber/10 p-4 text-sm text-base-soft">
          <p className="font-semibold tracking-[0.08em]">Niet alle gegevens konden worden geladen:</p>
          <ul className="mt-1 list-disc pl-4">
            {status.errors.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-card border border-gridline/40 bg-base-soft/15 p-4 shadow-terminal space-y-1"
          >
            <p className="terminal-label text-base-soft">{metric.label}</p>
            <p className="text-2xl font-semibold tracking-[0.12em] text-base-soft">{metric.value}</p>
            <p className="text-xs text-gridline/90">{metric.helper}</p>
          </article>
        ))}
      </div>

      <p className="text-xs uppercase tracking-[0.16em] text-gridline/80">
        Instellingen {settingsLoading ? "laden..." : "actueel"}
      </p>
    </section>
  );
}

function QuickNavigation() {
  return (
    <section className="terminal-card space-y-4 bg-parchment/95">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="terminal-section-title">Navigatie</p>
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Belangrijkste acties</h2>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`group rounded-card border border-gridline/50 bg-parchment/95 p-4 shadow-terminal transition duration-200 hover:-translate-y-1 hover:shadow-terminal-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${link.accent ? "border-primary/70" : ""}`}
          >
            <p className="text-xs tracking-[0.16em] text-primary">{link.title}</p>
            <p className="text-lg font-semibold tracking-[0.08em] text-base-soft">{link.description}</p>
            <span className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-base-soft group-hover:text-primary">
              Open module
              <span aria-hidden="true">⇢</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecentQuoteList({ quotes, loading }) {
  return (
    <section className="terminal-card space-y-3 bg-parchment/95">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="terminal-section-title">Offertes</p>
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Laatste activiteit</h2>
        </div>
        <Link to="/offertes" className="terminal-pill text-xs tracking-[0.12em]">
          Gehele lijst
        </Link>
      </header>

      {loading ? (
        <p className="terminal-note">Gegevens laden…</p>
      ) : quotes.length === 0 ? (
        <div className="rounded-card border border-dashed border-gridline/60 bg-base-highlight/20 p-4 text-sm text-ink/85">
          Nog geen offertes beschikbaar. Start met een{" "}
          <Link to="/offerte" className="text-primary underline-offset-2 hover:underline">
            nieuwe offerte
          </Link>
          .
        </div>
      ) : (
        <ul className="space-y-3 text-sm">
          {quotes.map((quote) => (
            <li
              key={quote.id}
              className="rounded-card border border-gridline/50 bg-base-soft/20 p-4 shadow-terminal flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-gridline/80">{formatDate(quote.datum)}</p>
                  <p className="text-base font-semibold tracking-[0.08em] text-ink">
                    {quote.klant_naam || "Onbekende klant"}
                  </p>
                  {quote.bedrijf && (
                    <p className="text-xs text-gridline/80 uppercase tracking-[0.12em]">{quote.bedrijf}</p>
                  )}
                </div>
                <p className="text-lg font-semibold text-ink">{formatCurrency(quote.totaal_bruto || quote.totaal_netto)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/offertes/${quote.id}`} className="terminal-button is-ghost text-xs tracking-[0.12em]">
                  Details
                </Link>
                <Link to={`/offerte?edit=${quote.id}`} className="terminal-button is-ghost text-xs tracking-[0.12em]">
                  Bewerken
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SystemChecklist({ settings, overview, className = "" }) {
  const checklist = useMemo(
    () => [
      {
        label: "Instellingen gecontroleerd",
        description: "Standaard winstmarge en elektriciteitsprijs ingesteld.",
        done: Boolean(settings && Number(settings.standaardWinstmarge) > 0 && Number(settings.elektriciteitsprijs) > 0),
        to: "/instellingen",
      },
      {
        label: "Klantenbestand aanwezig",
        description: "Voorraad aan klanten om offertes te koppelen.",
        done: overview.clients.length > 0,
        to: "/instellingen/klanten",
      },
      {
        label: "Materialen toegevoegd",
        description: "Beschikbare filamenten en droogvereisten ingevuld.",
        done: overview.materials.length > 0,
        to: "/materialen",
      },
      {
        label: "Recente offertes",
        description: "Minimaal \u00e9\u00e9n offerte aangemaakt.",
        done: overview.quotes.length > 0,
        to: "/offerte",
      },
    ],
    [settings, overview]
  );
  const doneCount = checklist.filter((item) => item.done).length;
  const allDone = checklist.length > 0 && doneCount === checklist.length;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (allDone) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [allDone]);

  return (
    <section className={`terminal-card space-y-4 bg-parchment/95 ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="terminal-section-title">Systeemstatus</p>
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Controlelijst</h2>
        </div>
        <span className="terminal-pill text-xs tracking-[0.12em]">
          {doneCount}/{checklist.length} afgerond
        </span>
      </header>

      {allDone && (
        <div className="flex items-center justify-between gap-3 rounded-card border border-signal-green/40 bg-signal-green/10 p-3">
          <p className="text-sm font-medium tracking-[0.08em] text-base-soft">Alle controles zijn voltooid.</p>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="terminal-button is-ghost text-xs tracking-[0.12em]"
          >
            {collapsed ? "Toon lijst" : "Verberg lijst"}
          </button>
        </div>
      )}

      {allDone && collapsed ? (
        <ChecklistCelebration />
      ) : (
        <ul className="space-y-3">
          {checklist.map((item) => (
            <li
              key={item.label}
              className="flex flex-col gap-2 rounded-card border border-gridline/50 bg-base-soft/15 p-4 shadow-terminal"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-semibold tracking-[0.1em] text-ink">{item.label}</p>
                <span
                  className={`terminal-pill text-xs tracking-[0.12em] ${
                    item.done ? "border-signal-green/70 text-signal-green" : "border-signal-amber/70 text-signal-amber"
                  }`}
                >
                  {item.done ? "OK" : "Actie nodig"}
                </span>
              </div>
              <p className="text-sm text-gridline/80">{item.description}</p>
              {!item.done && (
                <Link to={item.to} className="terminal-button is-ghost text-xs tracking-[0.12em] self-start">
                  Ga naar module
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ResourceGrid() {
  return (
    <section className="terminal-card space-y-4">
      <header>
        <p className="terminal-section-title">Modules</p>
        <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Ondersteunende schermen</h2>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {RESOURCE_LINKS.map((resource) => (
          <ResourceLink key={resource.label} resource={resource} />
        ))}
      </div>
    </section>
  );
}

function DashboardMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`${baseUrl}/get-quote-metrics.php`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setMetrics(data);
      })
      .catch(() => {
        if (!active) return;
        setMetrics(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      label: "Hitrate",
      value: metrics ? `${Number(metrics.hitrate ?? 0).toFixed(1)}%` : "—",
      helper: "Geaccepteerde offertes / totaal",
    },
    {
      label: "Gem. doorlooptijd",
      value: metrics ? `${Number(metrics.avg_lead_time_days ?? 0).toFixed(1)} dagen` : "—",
      helper: "Van creatie tot geaccepteerd",
    },
    {
      label: "In review",
      value: metrics?.status_counts?.review?.count ?? 0,
      helper: "Aantal offertes in review",
    },
    {
      label: "Totale omzet (geaccepteerd)",
      value: metrics ? `${Number(metrics.accepted_revenue ?? 0).toFixed(2)} EUR` : "—",
      helper: "Som totaal_bruto van geaccepteerd",
    },
  ];

  return (
    <section className="terminal-card space-y-4 bg-parchment/95">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="terminal-section-title">Analyse</p>
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Kerncijfers</h2>
        </div>
        <span className="terminal-note">{loading ? "Laden..." : "Live status"}</span>
      </header>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-card border border-gridline/60 bg-parchment/85 p-4 shadow-terminal-inset space-y-1"
          >
            <p className="terminal-label">{card.label}</p>
            <p className="text-xl font-semibold tracking-[0.14em] text-base-soft">{card.value}</p>
            <p className="text-xs text-gridline/70">{card.helper}</p>
          </div>
        ))}
      </div>
      {metrics?.omzet_per_klant?.length > 0 && (
        <div className="space-y-2">
          <p className="terminal-label">Top 5 klanten op omzet</p>
          <ul className="grid gap-2 md:grid-cols-2">
            {metrics.omzet_per_klant.map((row, idx) => (
              <li
                key={`${row.klant}-${idx}`}
                className="rounded-card border border-gridline/50 bg-base-soft/15 p-3 flex items-center justify-between"
              >
                <span className="text-sm text-base-soft">{row.klant || "Onbekende klant"}</span>
                <span className="text-sm font-semibold text-primary">
                  {Number(row.omzet ?? 0).toFixed(2)} EUR
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ChecklistCelebration() {
  const pathRef = useRef(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    let frame;
    function animateDash(timestamp) {
      const progress = (timestamp / 1500) % 1;
      path.style.strokeDasharray = total;
      path.style.strokeDashoffset = total * (1 - progress);
      frame = requestAnimationFrame(animateDash);
    }
    frame = requestAnimationFrame(animateDash);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="rounded-card border border-signal-green/40 bg-base-soft/10 p-6 text-center space-y-3 shadow-terminal">
      <div className="flex justify-center">
        <svg width="140" height="120" viewBox="0 0 140 120" role="img" aria-label="Checklist voltooid animatie">
          <defs>
            <linearGradient id="celebrationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <circle cx="70" cy="60" r="48" fill="none" stroke="#0f172a" strokeWidth="2" opacity="0.2" />
          <path
            ref={pathRef}
            d="M50 60 L65 75 L95 45"
            fill="none"
            stroke="url(#celebrationGradient)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <g stroke="#fde68a" strokeWidth="2">
            <line x1="20" y1="15" x2="25" y2="30" />
            <line x1="120" y1="20" x2="110" y2="32" />
            <line x1="18" y1="100" x2="28" y2="95" />
            <line x1="114" y1="98" x2="122" y2="110" />
          </g>
        </svg>
      </div>
      <p className="text-lg font-semibold tracking-[0.12em] text-signal-green">Controlelijst afgerond</p>
      <p className="text-sm text-gridline/80">
        Alles staat klaar. Je kunt altijd terugklikken om de checklist opnieuw te bekijken.
      </p>
    </div>
  );
}

function ResourceLink({ resource }) {
  const content = (
    <div className="flex h-full flex-col gap-2">
      <p className="text-sm font-semibold tracking-[0.12em] text-base-soft">{resource.label}</p>
      <p className="text-xs text-gridline/70">{resource.helper}</p>
      <span className="mt-auto text-xs uppercase tracking-[0.12em] text-primary">Open</span>
    </div>
  );

  if (resource.disabled) {
    return (
      <div className="rounded-card border border-dashed border-gridline/60 bg-base-highlight/10 p-4 text-gridline/60">
        {content}
        <p className="mt-2 text-xs text-gridline/60">Beschikbaar in een volgende update.</p>
      </div>
    );
  }

  return (
    <Link
      to={resource.to}
      className="group rounded-card border border-gridline/60 bg-parchment/80 p-4 shadow-terminal transition duration-200 hover:-translate-y-1 hover:shadow-terminal-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
    >
      {content}
    </Link>
  );
}

function formatDate(value) {
  if (!value) return "Onbekende datum";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "n.v.t.";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(numeric);
}
