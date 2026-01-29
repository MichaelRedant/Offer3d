import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TerminalBackButton from "../components/TerminalBackButton";
import { baseUrl } from "../lib/constants";
import { useToast } from "../context/ToastContext";

const STATUS_META = {
  intake: { label: "Intake", tone: "text-gridline/80 border-gridline/50" },
  planning: { label: "Planning", tone: "text-primary border-primary/60" },
  productie: { label: "Productie", tone: "text-accent border-accent/60" },
  postprocessing: { label: "Postprocessing", tone: "text-signal-amber border-signal-amber/60" },
  klaar: { label: "Klaar", tone: "text-signal-green border-signal-green/60" },
  geleverd: { label: "Geleverd", tone: "text-base-soft border-gridline/50" },
};

const PRIORITY_META = {
  hoog: "text-signal-red",
  normaal: "text-gridline/80",
  laag: "text-signal-green",
};

const ALERT_THRESHOLD_DAYS = 2;
const UPCOMING_LIMIT_DAYS = 30;

function statusPill(status) {
  const meta = STATUS_META[status] || STATUS_META.intake;
  return <span className={`terminal-pill text-xs tracking-[0.12em] ${meta.tone}`}>{meta.label}</span>;
}

function deriveAlerts(project) {
  const now = new Date();
  const deadline = project.deadline ? new Date(project.deadline) : null;
  const diffDays = deadline ? (deadline - now) / (1000 * 60 * 60 * 24) : Infinity;
  const overdue = deadline ? now > deadline : false;
  const dueSoon = deadline ? diffDays >= 0 && diffDays <= ALERT_THRESHOLD_DAYS : false;
  const progressOver = Number(project.progress_percent ?? 0) > 100;
  return { overdue, dueSoon, progressOver };
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch(`${baseUrl}/get-projects.php`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || data?.error) {
          throw new Error(data?.error || "Fout bij ophalen projecten.");
        }
        setProjects(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesQuery =
        !q ||
        p.naam.toLowerCase().includes(q) ||
        (p.klant || "").toLowerCase().includes(q) ||
        String(p.quoteId || "").includes(q);
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const alertStats = useMemo(() => {
    return filtered.reduce(
      (acc, p) => {
        const alerts = deriveAlerts(p);
        if (alerts.overdue) acc.overdue += 1;
        else if (alerts.dueSoon) acc.dueSoon += 1;
        if (alerts.progressOver) acc.progressOver += 1;
        acc.total = acc.overdue + acc.dueSoon + acc.progressOver;
        return acc;
      },
      { overdue: 0, dueSoon: 0, progressOver: 0, total: 0 }
    );
  }, [filtered]);

  useEffect(() => {
    if (alertStats.overdue > 0) {
      showToast?.({ type: "warning", message: `${alertStats.overdue} project(en) zijn over deadline.` });
    } else if (alertStats.dueSoon > 0) {
      showToast?.({ type: "info", message: `${alertStats.dueSoon} project(en) naderen de deadline.` });
    }
  }, [alertStats.overdue, alertStats.dueSoon, showToast]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return filtered
      .filter((p) => p.deadline)
      .map((p) => {
        const dl = new Date(p.deadline);
        const diffDays = (dl - now) / (1000 * 60 * 60 * 24);
        return { ...p, diffDays };
      })
      .filter((p) => p.diffDays >= -1 && p.diffDays <= UPCOMING_LIMIT_DAYS)
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 6);
  }, [filtered]);

  const timelineData = useMemo(() => {
    const now = new Date();
    const withDeadline = filtered.filter((p) => p.deadline).map((p) => {
      const dl = new Date(p.deadline);
      return { ...p, days: (dl - now) / (1000 * 60 * 60 * 24) };
    });
    if (withDeadline.length === 0) return [];
    withDeadline.sort((a, b) => a.days - b.days);
    const min = withDeadline[0].days;
    const max = withDeadline[withDeadline.length - 1].days;
    const span = Math.max(1, max - min);
    return withDeadline.slice(0, 12).map((p) => {
      const pos = ((p.days - min) / span) * 100;
      return { ...p, pos };
    });
  }, [filtered]);

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="terminal-section-title">Projecten</p>
            <h1 className="text-3xl font-semibold tracking-dial uppercase text-base-soft">Projectbeheer</h1>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              className="terminal-button is-accent text-xs tracking-[0.14em]"
              onClick={() => navigate("/projecten/nieuw")}
            >
              Nieuw project
            </button>
            <TerminalBackButton label="Terug naar dashboard" to="/" />
          </div>
        </div>
        <p className="text-sm text-gridline/70">
          Houd projecten bij, link offertes en materialen, en zie in een oogopslag status en prioriteit.
        </p>
      </header>

      <section className="terminal-card space-y-5">
        {upcoming.length > 0 && (
          <div className="rounded-card border border-gridline/30 bg-base-highlight/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="terminal-section-title">Planning</p>
                <h3 className="text-xl font-semibold uppercase tracking-dial text-base-soft">Komende deadlines (30d)</h3>
              </div>
              <span className="terminal-note">{upcoming.length} items</span>
            </div>
            <div className="space-y-2">
              {upcoming.map((p) => (
                <div key={p.id} className="flex flex-col gap-1 rounded-card border border-gridline/40 p-3 bg-base-soft/5">
                  <div className="flex items-center justify-between">
                    <Link to={`/projecten/${p.id}`} className="terminal-link font-semibold">
                      {p.naam}
                    </Link>
                    <span className="terminal-pill text-xs border-primary/60 text-primary">
                      {p.deadline ? new Date(p.deadline).toLocaleDateString("nl-BE") : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gridline/70">
                    <span>Status: {p.status}</span>
                    <span>Prioriteit: {p.prioriteit || "n.v.t."}</span>
                    <span>Dag(en): {Math.round(p.diffDays)}</span>
                  </div>
                  <div className="h-2 w-full bg-gridline/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60"
                      style={{ width: `${Math.max(0, Math.min(100, Number(p.progress_percent ?? 0)))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {timelineData.length > 0 && (
          <div className="rounded-card border border-gridline/30 bg-base-highlight/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="terminal-section-title">Tijdlijn</p>
                <h3 className="text-xl font-semibold uppercase tracking-dial text-base-soft">Deadlines overzicht</h3>
              </div>
            </div>
            <div className="relative h-16">
              <div className="absolute inset-y-1/2 left-0 right-0 h-[2px] bg-gridline/30" />
              {timelineData.map((p) => (
                <div
                  key={p.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${p.pos}%`, top: "50%" }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="terminal-pill text-[10px] border-primary/60 text-primary">
                      {p.deadline ? new Date(p.deadline).toLocaleDateString("nl-BE") : "—"}
                    </span>
                    <Link to={`/projecten/${p.id}`} className="terminal-link text-xs text-center max-w-[140px]">
                      {p.naam}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="terminal-label" htmlFor="projectSearch">
              Zoek
            </label>
            <input
              id="projectSearch"
              type="text"
              className="terminal-input"
              placeholder="Zoek op project, klant of offerte #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="terminal-label" htmlFor="statusFilterProjects">
              Status
            </label>
            <select
              id="statusFilterProjects"
              className="terminal-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Alle statussen</option>
              <option value="intake">Intake</option>
              <option value="planning">Planning</option>
              <option value="productie">Productie</option>
              <option value="postprocessing">Postprocessing</option>
              <option value="klaar">Klaar</option>
              <option value="geleverd">Geleverd</option>
            </select>
          </div>
        </div>

        {alertStats.total > 0 && (
          <div className="rounded-card border border-signal-amber/50 bg-signal-amber/5 p-3 text-sm text-base-soft flex flex-wrap gap-3 items-center">
            <span className="terminal-label">Automatische waarschuwingen</span>
            <span className="terminal-pill text-xs border-signal-red/60 text-signal-red">Te laat: {alertStats.overdue}</span>
            <span className="terminal-pill text-xs border-signal-amber/60 text-signal-amber">
              Binnen {ALERT_THRESHOLD_DAYS}d: {alertStats.dueSoon}
            </span>
            <span className="terminal-pill text-xs border-accent/60 text-accent">
              Progress &gt;100%: {alertStats.progressOver}
            </span>
          </div>
        )}

        {loading ? (
          <p className="terminal-note">Projecten laden...</p>
        ) : error ? (
          <p className="text-signal-red text-sm tracking-[0.08em]">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="terminal-note">Geen projecten gevonden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gridline/30 rounded-card overflow-hidden">
              <thead className="bg-parchment/80 text-xs uppercase tracking-[0.12em] text-gridline/70">
                <tr>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Klant</th>
                  <th className="px-4 py-3 text-left">Offerte</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Alerts</th>
                  <th className="px-4 py-3 text-left">Deadline</th>
                  <th className="px-4 py-3 text-left">Prioriteit</th>
                  <th className="px-4 py-3 text-left">Locatie</th>
                  <th className="px-4 py-3 text-left">Tags</th>
                  <th className="px-4 py-3 text-left">ICS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gridline/20 text-sm text-base-soft">
                {filtered.map((project) => {
                  const alerts = deriveAlerts(project);
                  const rowTone = alerts.overdue
                    ? "bg-signal-red/5"
                    : alerts.dueSoon || alerts.progressOver
                    ? "bg-signal-amber/5"
                    : "";
                  return (
                    <tr key={project.id} className={`hover:bg-parchment/60 transition-colors ${rowTone}`}>
                      <td className="px-4 py-3">
                        <Link to={`/projecten/${project.id}`} className="terminal-link font-semibold tracking-[0.05em]">
                          {project.naam}
                        </Link>
                        <div className="text-xs text-gridline/70">#{project.id.toString().padStart(4, "0")}</div>
                      </td>
                      <td className="px-4 py-3 text-gridline/80">{project.klant || "—"}</td>
                      <td className="px-4 py-3">
                        {project.quoteId ? (
                          <Link to={`/offertes/${project.quoteId}`} className="terminal-link">
                            Offerte #{project.quoteId.toString().padStart(4, "0")}
                          </Link>
                        ) : (
                          <span className="text-gridline/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusPill(project.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {alerts.overdue && (
                            <span className="terminal-pill text-xs border-signal-red/60 text-signal-red">Te laat</span>
                          )}
                          {!alerts.overdue && alerts.dueSoon && (
                            <span className="terminal-pill text-xs border-signal-amber/60 text-signal-amber">
                              Binnen {ALERT_THRESHOLD_DAYS}d
                            </span>
                          )}
                          {alerts.progressOver && (
                            <span className="terminal-pill text-xs border-accent/60 text-accent">Progress &gt;100%</span>
                          )}
                          {!alerts.overdue && !alerts.dueSoon && !alerts.progressOver && (
                            <span className="terminal-note">OK</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gridline/80">
                        {project.deadline ? new Date(project.deadline).toLocaleDateString("nl-BE") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${PRIORITY_META[project.prioriteit] || ""}`}>
                          {project.prioriteit || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gridline/80">{project.locatie || "—"}</td>
                      <td className="px-4 py-3 text-gridline/80">
                        {Array.isArray(project.tags) ? (project.tags.length ? project.tags.join(", ") : "—") : project.tags || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {project.deadline ? (
                          <a className="terminal-link" href={`${baseUrl}/project-ics.php?id=${project.id}`}>
                            ICS
                          </a>
                        ) : (
                          <span className="text-gridline/60">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
