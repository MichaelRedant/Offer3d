import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

const PROJECT_STATUSES = ["intake", "planning", "productie", "postprocessing", "klaar", "geleverd"];
const PRIORITIES = ["hoog", "normaal", "laag"];
const TASK_STATUSES = ["open", "busy", "done"];
const DEADLINE_SOON_DAYS = 2;

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projectForm, setProjectForm] = useState({
    naam: "",
    status: "intake",
    prioriteit: "normaal",
    deadline: "",
    locatie: "",
    tags: "",
    notities: "",
    client_id: null,
    quote_id: null,
    progress_percent: 0,
    status_history: null,
    status_note: "",
  });
  const [materialsState, setMaterialsState] = useState([]);
  const [tasksState, setTasksState] = useState([]);
  const [attachmentsState, setAttachmentsState] = useState([]);
  const [materialsCatalog, setMaterialsCatalog] = useState([]);
  const [spoolsCatalog, setSpoolsCatalog] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const warnedRef = useRef(false);
  const initialMaterialsRef = useRef([]);
  const [logUsage, setLogUsage] = useState(false);
  const [activities, setActivities] = useState([]);

  async function fetchDetail() {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/get-project-detail.php?id=${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "Project niet gevonden.");
      setData(json);
      setProjectForm({
        naam: json.project.naam || "",
        status: json.project.status || "intake",
        prioriteit: json.project.prioriteit || "normaal",
        deadline: json.project.deadline || "",
        locatie: json.project.locatie || "",
        tags: json.project.tags || "",
        notities: json.project.notities || "",
        client_id: json.project.client_id || null,
        quote_id: json.project.quote_ref || json.project.quote_id || null,
        progress_percent: Number(json.project.progress_percent ?? 0),
        status_history: json.project.status_history || null,
        status_note: "",
      });
      setMaterialsState(json.materials || []);
      setTasksState(json.tasks || []);
      initialMaterialsRef.current = (json.materials || []).map((m) => ({
        spool_id: m.spool_id || null,
        material_id: m.material_id || null,
        quantity_grams: Number(m.quantity_grams ?? 0),
      }));
      setAttachmentsState(json.attachments || []);
      setActivities(Array.isArray(json.activities) ? json.activities : []);
      setStatusHistory(Array.isArray(json.project.status_history) ? json.project.status_history : []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    warnedRef.current = false;
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    async function fetchRefs() {
      try {
        const [mRes, sRes] = await Promise.all([
          fetch(`${baseUrl}/get-materials.php`, { cache: "no-store" }),
          fetch(`${baseUrl}/get-spools.php`, { cache: "no-store" }),
        ]);
        const mats = await mRes.json();
        const spools = await sRes.json();
        setMaterialsCatalog(Array.isArray(mats) ? mats : []);
        setSpoolsCatalog(Array.isArray(spools) ? spools : []);
      } catch (e) {
        // stilzwijgend falen
      }
    }
    fetchRefs();
  }, []);

  const statusMeta = useMemo(
    () => STATUS_META[projectForm.status || data?.project?.status] || STATUS_META.intake,
    [projectForm.status, data]
  );
  const deadlineOverdue = useMemo(
    () => isOverdue(projectForm.deadline, new Date().toISOString()),
    [projectForm.deadline]
  );
  const deadlineDueSoon = useMemo(
    () => isDueSoon(projectForm.deadline, new Date().toISOString()),
    [projectForm.deadline]
  );
  const progressOverrun = useMemo(
    () => Number(projectForm.progress_percent ?? 0) > 100,
    [projectForm.progress_percent]
  );

  useEffect(() => {
    if (loading || warnedRef.current) return;
    if (!data?.project) return;
    const messages = [];
    if (deadlineOverdue) {
      messages.push("Deadline overschreden");
    } else if (deadlineDueSoon) {
      messages.push("Deadline komt eraan");
    }
    if (progressOverrun) {
      messages.push("Progress boven 100%");
    }
    if (messages.length) {
      showToast({ type: "warning", message: messages.join(" | ") });
      warnedRef.current = true;
    }
  }, [loading, data, deadlineOverdue, deadlineDueSoon, progressOverrun, showToast]);

  const handleSave = async (projectId) => {
    const trimmedName = `${projectForm.naam || ""}`.trim();
    if (!trimmedName) {
      showToast({ type: "error", message: "Projectnaam mag niet leeg zijn." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: Number(projectId),
        naam: trimmedName,
        status: projectForm.status,
        prioriteit: projectForm.prioriteit,
        deadline: projectForm.deadline || null,
        locatie: projectForm.locatie || null,
        tags: projectForm.tags || null,
        notities: projectForm.notities || null,
        client_id: projectForm.client_id || null,
        quote_id: projectForm.quote_id || null,
        progress_percent: Number(projectForm.progress_percent ?? 0),
        status_history: projectForm.status_history,
        status_note: projectForm.status_note,
        materials: materialsState,
        tasks: tasksState,
        attachments: attachmentsState,
      };

      const res = await fetch(`${baseUrl}/update-project.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "Opslaan mislukt.");
      showToast({ type: "success", message: "Project opgeslagen." });
      if (logUsage) {
        await logSpoolUsageDelta(materialsState, initialMaterialsRef.current, showToast);
      }
      // blijf op detail, herlaad data van server
      fetchDetail();
    } catch (e) {
      showToast({ type: "error", message: e.message || "Fout bij opslaan project." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    const confirmed = window.confirm("Weet je zeker dat je dit project definitief wilt verwijderen?");
    if (!confirmed) return;
    setDeleting(true);
    try {
      const res = await fetch(`${baseUrl}/delete-project.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(id) }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || "Verwijderen mislukt.");
      showToast({ type: "success", message: "Project verwijderd." });
      navigate("/projecten");
    } catch (e) {
      showToast({ type: "error", message: e.message || "Kon project niet verwijderen." });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="terminal-card">
          <p className="terminal-note">Project laden...</p>
        </section>
      </main>
    );
  }

  if (error || !data?.project) {
    return (
      <main className="space-y-6">
        <section className="terminal-card text-signal-red">
          <p className="tracking-[0.08em]">{error || "Project niet gevonden."}</p>
          <div className="mt-3">
            <TerminalBackButton to="/projecten" label="Terug naar projecten" />
          </div>
        </section>
      </main>
    );
  }

  const { project, materials = [], tasks = [] } = data;
  const materialsToUse = materialsState;
  const tasksToUse = tasksState;

  return (
    <main className="space-y-8">
      <header className="terminal-card space-y-4 crt-scan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="terminal-section-title">Project #{project.id.toString().padStart(4, "0")}</p>
            <div className="space-y-2 max-w-2xl">
              <label className="terminal-label" htmlFor="projectNameInput">
                Projectnaam
              </label>
              <input
                id="projectNameInput"
                className="terminal-input text-2xl font-semibold tracking-dial uppercase"
                type="text"
                value={projectForm.naam}
                onChange={(e) => setProjectForm((p) => ({ ...p, naam: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <TerminalBackButton label="Terug naar projecten" to="/projecten" />
            <TerminalBackButton label="Terug naar dashboard" to="/" />
            {project.deadline && (
              <a
                href={`${baseUrl}/project-ics.php?id=${project.id}`}
                className="terminal-button is-ghost text-xs"
              >
                Download iCal
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.12em] text-gridline/80">
          <select
            className="terminal-input text-xs"
            value={projectForm.status}
            onChange={(e) => setProjectForm((p) => ({ ...p, status: e.target.value }))}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="terminal-input text-xs"
            value={projectForm.prioriteit}
            onChange={(e) => setProjectForm((p) => ({ ...p, prioriteit: e.target.value }))}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            className="terminal-input text-xs"
            type="date"
            value={projectForm.deadline || ""}
            onChange={(e) => setProjectForm((p) => ({ ...p, deadline: e.target.value }))}
            placeholder="Deadline"
          />
          <input
            className="terminal-input text-xs"
            type="text"
            value={projectForm.locatie || ""}
            onChange={(e) => setProjectForm((p) => ({ ...p, locatie: e.target.value }))}
            placeholder="Locatie"
          />
          <div className="flex items-center gap-2">
            <label className="terminal-label text-xs mb-0">Progress %</label>
            <input
              className="terminal-input text-xs w-24"
              type="number"
              min={0}
              max={100}
              step="1"
              value={projectForm.progress_percent ?? 0}
              onChange={(e) =>
                setProjectForm((p) => ({ ...p, progress_percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))
              }
            />
          </div>
          <input
            className="terminal-input text-xs"
            type="text"
            value={projectForm.status_note || ""}
            onChange={(e) => setProjectForm((p) => ({ ...p, status_note: e.target.value }))}
            placeholder="Opmerking bij statuswijziging"
          />
        </div>
        {(deadlineOverdue || deadlineDueSoon || progressOverrun) && (
          <div className="flex flex-wrap gap-2">
            {deadlineOverdue && (
              <span className="terminal-pill text-xs border-signal-red/70 text-signal-red">
                Deadline overschreden
              </span>
            )}
            {!deadlineOverdue && deadlineDueSoon && (
              <span className="terminal-pill text-xs border-signal-amber/70 text-signal-amber">
                Deadline binnen {DEADLINE_SOON_DAYS} dagen
              </span>
            )}
            {progressOverrun && (
              <span className="terminal-pill text-xs border-signal-amber/70 text-signal-amber">
                Progress boven 100%
              </span>
            )}
          </div>
        )}
      </header>

      <section className="terminal-card space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoBlock label="Klant">
            {project.client_id ? (
              <Link to={`/klanten/${project.client_id}`} className="terminal-link">
                {project.klant_naam || "Klant"} {project.klant_bedrijf ? `(${project.klant_bedrijf})` : ""}
              </Link>
            ) : (
              "—"
            )}
          </InfoBlock>
          <InfoBlock label="Offerte">
            {project.quote_ref ? (
              <Link to={`/offertes/${project.quote_ref}`} className="terminal-link">
                Offerte #{project.quote_ref.toString().padStart(4, "0")}
              </Link>
            ) : (
              "—"
            )}
          </InfoBlock>
          <InfoBlock label="Tags">{projectForm.tags || project.tags || "—"}</InfoBlock>
          <div className="flex items-center gap-2">
            <input
              id="logUsage"
              type="checkbox"
              checked={logUsage}
              onChange={(e) => setLogUsage(e.target.checked)}
            />
            <label htmlFor="logUsage" className="terminal-label mb-0">
              Verbruik automatisch loggen bij opslaan
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <p className="terminal-label">Notities</p>
          <div className="terminal-card bg-base-highlight/10 border border-gridline/40">
            <p className="text-sm text-gridline/80 whitespace-pre-line">{project.notities || "Geen notities."}</p>
          </div>
        </div>
      </section>

      <section className="terminal-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Activiteiten</h2>
          <span className="terminal-note">{activities.length} entries</span>
        </div>
        {activities.length === 0 ? (
          <p className="terminal-note">Nog geen activiteiten gelogd.</p>
        ) : (
          <ul className="space-y-2">
            {activities.map((act, idx) => (
              <li
                key={`${act.created_at}-${idx}`}
                className="rounded-card border border-gridline/50 bg-base-soft/10 p-3 flex items-center justify-between text-sm text-base-soft"
              >
                <div className="space-y-1">
                  <p className="uppercase tracking-[0.12em] text-gridline/70">{act.type}</p>
                  <p className="text-gridline/80">{act.message}</p>
                </div>
                <span className="terminal-note">{act.created_at ? new Date(act.created_at).toLocaleString("nl-BE") : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="terminal-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="terminal-section-title">Materialen</p>
            <h2 className="text-xl font-semibold tracking-dial uppercase">Gebruik / nodig</h2>
          </div>
        </div>
        <MaterialsEditor
          materials={materialsToUse}
          onChange={setMaterialsState}
          materialsCatalog={materialsCatalog}
          spoolsCatalog={spoolsCatalog}
        />
      </section>

      <section className="terminal-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="terminal-section-title">Taken</p>
            <h2 className="text-xl font-semibold tracking-dial uppercase">Checklist</h2>
          </div>
        </div>
        <TasksEditor tasks={tasksToUse} onChange={setTasksState} />
      </section>

      <section className="terminal-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="terminal-section-title">Bijlagen</p>
            <h2 className="text-xl font-semibold tracking-dial uppercase">Links & bestanden</h2>
          </div>
        </div>
        <AttachmentsEditor attachments={attachmentsState} onChange={setAttachmentsState} />
      </section>

      <section className="terminal-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-dial uppercase text-base-soft">Statusgeschiedenis</h2>
          <span className="terminal-note">{statusHistory.length} entries</span>
        </div>
        <StatusTimeline history={statusHistory} />
        {statusHistory.length === 0 ? (
          <p className="terminal-note">Nog geen statuswissels gelogd.</p>
        ) : (
          <ul className="space-y-2">
            {statusHistory
              .slice()
              .reverse()
              .map((entry, idx) => (
                <li
                  key={idx}
                  className="rounded-card border border-gridline/50 bg-base-soft/10 p-3 flex items-center justify-between text-sm text-base-soft"
                >
                  <div className="space-y-1">
                    <p className="uppercase tracking-[0.12em] text-gridline/70">Status: {entry.status}</p>
                    {entry.note && <p className="text-gridline/80">{entry.note}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="terminal-note">{entry.timestamp ? new Date(entry.timestamp).toLocaleString("nl-BE") : "—"}</span>
                    {entry.timestamp && isOverdue(projectForm.deadline, entry.timestamp) && (
                      <span className="terminal-pill text-xs border-signal-amber/70 text-signal-amber">Na deadline</span>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="terminal-card flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-gridline/70 space-y-1">
          <p>Wijzigingen opslaan naar project en synchroniseer materialen/taken.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="terminal-button is-danger text-xs"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Verwijderen..." : "Verwijder project"}
          </button>
          <TerminalBackButton to="/projecten" label="Annuleer" />
          <button
            type="button"
            className="terminal-button is-accent text-xs"
            onClick={() => handleSave(project.id)}
            disabled={saving}
          >
            {saving ? "Opslaan..." : "Project opslaan"}
          </button>
        </div>
      </section>
    </main>
  );
}

function InfoBlock({ label, children }) {
  return (
    <div className="rounded-card border border-gridline/30 bg-base-highlight/10 p-3 space-y-1">
      <p className="terminal-label">{label}</p>
      <p className="text-sm text-base-soft">{children}</p>
    </div>
  );
}

function isOverdue(deadline, timestamp) {
  if (!deadline || !timestamp) return false;
  const dl = new Date(deadline);
  const ts = new Date(timestamp);
  return ts > dl;
}
function isDueSoon(deadline, timestamp, thresholdDays = DEADLINE_SOON_DAYS) {
  if (!deadline || !timestamp) return false;
  const dl = new Date(deadline);
  const ts = new Date(timestamp);
  const diffDays = (dl - ts) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= thresholdDays;
}

function AttachmentsEditor({ attachments, onChange }) {
  const handleUpdate = (index, patch) => {
    onChange((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };
  const handleAdd = () => {
    onChange((prev) => [...prev, { id: `att-${Date.now()}`, title: "", url: "", attachment_type: "link" }]);
  };
  const handleRemove = (index) => {
    onChange((prev) => prev.filter((_, i) => i !== index));
  };

  if (!attachments || attachments.length === 0) {
    return (
      <div className="space-y-3">
        <p className="terminal-note">Nog geen bijlagen toegevoegd.</p>
        <button type="button" className="terminal-button is-ghost text-xs" onClick={handleAdd}>
          Bijlage toevoegen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-parchment/80 text-xs uppercase tracking-[0.12em] text-gridline/70">
            <tr>
              <th className="px-3 py-2 text-left">Titel</th>
              <th className="px-3 py-2 text-left">URL</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gridline/20 text-base-soft">
            {attachments.map((att, index) => (
              <tr key={att.id ?? index}>
                <td className="px-3 py-2">
                  <input
                    className="terminal-input"
                    type="text"
                    value={att.title || ""}
                    onChange={(e) => handleUpdate(index, { title: e.target.value })}
                    placeholder="Bijv. CAD, foto, link"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="terminal-input"
                    type="url"
                    value={att.url || ""}
                    onChange={(e) => handleUpdate(index, { url: e.target.value })}
                    placeholder="https://"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="terminal-input"
                    value={att.attachment_type || "link"}
                    onChange={(e) => handleUpdate(index, { attachment_type: e.target.value })}
                  >
                    <option value="link">Link</option>
                    <option value="bestand">Bestand</option>
                    <option value="foto">Foto</option>
                    <option value="anders">Anders</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button type="button" className="terminal-button is-danger text-xs" onClick={() => handleRemove(index)}>
                    Verwijder
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="terminal-button is-ghost text-xs" onClick={handleAdd}>
        Bijlage toevoegen
      </button>
    </div>
  );
}

function StatusTimeline({ history }) {
  if (!history || history.length === 0) {
    return <p className="terminal-note">Geen statuswijzigingen om te tonen.</p>;
  }
  const sorted = [...history].sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return ta - tb;
  });
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-gridline/60">
        <span>Oudste</span>
        <div className="flex-1 h-[1px] bg-gridline/30" />
        <span>Nieuwste</span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {sorted.map((entry, idx) => (
          <div key={idx} className="flex flex-col items-center min-w-[140px]">
            <div className="w-3 h-3 rounded-full bg-primary mb-2" />
            <div className="text-[11px] uppercase tracking-[0.12em] text-gridline/70">{entry.status || "n.v.t."}</div>
            <div className="text-[11px] text-gridline/60">
              {entry.timestamp ? new Date(entry.timestamp).toLocaleString("nl-BE") : "–"}
            </div>
            {entry.note ? <div className="text-[11px] text-gridline/70 mt-1">{entry.note}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
function MaterialsEditor({ materials, onChange, materialsCatalog = [], spoolsCatalog = [] }) {
  const handleUpdate = (index, patch) => {
    onChange((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };
  const handleAdd = () => {
    onChange((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, material_id: null, spool_id: null, quantity_grams: 0, notes: "" },
    ]);
  };
  const handleRemove = (index) => {
    onChange((prev) => prev.filter((_, i) => i !== index));
  };

  if (!materials || materials.length === 0) {
    return (
      <div className="space-y-3">
        <p className="terminal-note">Nog geen materiaalgebruik geregistreerd.</p>
        <button type="button" className="terminal-button is-ghost text-xs" onClick={handleAdd}>
          Materiaal toevoegen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-parchment/80 text-xs uppercase tracking-[0.12em] text-gridline/70">
            <tr>
              <th className="px-3 py-2 text-left">Materiaal</th>
              <th className="px-3 py-2 text-left">Spool</th>
              <th className="px-3 py-2 text-right">Hoeveelheid (g)</th>
              <th className="px-3 py-2 text-left">Notities</th>
              <th className="px-3 py-2 text-left">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gridline/20 text-base-soft">
            {materials.map((m, index) => (
              <tr key={m.id ?? index}>
                <td className="px-3 py-2">
                  <select
                    className="terminal-input"
                    value={m.material_id || ""}
                    onChange={(e) => handleUpdate(index, { material_id: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">-- Kies materiaal --</option>
                    {materialsCatalog.map((mat) => {
                      const label = `${mat.naam}${mat.kleur ? ` (${mat.kleur})` : ""}`;
                      return (
                        <option key={mat.id} value={mat.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    className="terminal-input"
                    value={m.spool_id || ""}
                    onChange={(e) => handleUpdate(index, { spool_id: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">-- Kies spool --</option>
                    {spoolsCatalog.map((sp) => {
                      const label = `#${sp.id}${sp.materiaal_naam ? ` - ${sp.materiaal_naam}` : ""}${
                        sp.color ? ` (${sp.color})` : ""
                      }${sp.weight_left ? ` - ${Number(sp.weight_left).toFixed(0)}g over` : ""}`;
                      return (
                        <option key={sp.id} value={sp.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    className="terminal-input text-right"
                    type="number"
                    step="0.1"
                    value={m.quantity_grams ?? 0}
                    onChange={(e) => handleUpdate(index, { quantity_grams: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="terminal-input"
                    type="text"
                    value={m.notes || ""}
                    onChange={(e) => handleUpdate(index, { notes: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <button type="button" className="terminal-button is-danger text-xs" onClick={() => handleRemove(index)}>
                    Verwijder
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="terminal-button is-ghost text-xs" onClick={handleAdd}>
        Materiaal toevoegen
      </button>
    </div>
  );
}

function TasksEditor({ tasks, onChange }) {
  const sortTasks = (list) => {
    return [...list].map((t, idx) => ({ ...t, sort_order: idx }));
  };
  const handleUpdate = (index, patch) => {
    onChange((prev) => sortTasks(prev.map((t, i) => (i === index ? { ...t, ...patch } : t))));
  };
  const handleAdd = () => {
    onChange((prev) =>
      sortTasks([
        ...prev,
        { id: `tmp-${Date.now()}`, title: "", status: "open", owner: "", due_date: "", notes: "", subtasks: [] },
      ])
    );
  };
  const handleRemove = (index) => {
    onChange((prev) => prev.filter((_, i) => i !== index));
  };
  const handleSubtaskChange = (taskIndex, updater) => {
    onChange((prev) =>
      sortTasks(
        prev.map((t, i) => {
          if (i !== taskIndex) return t;
          const nextSubs = typeof updater === "function" ? updater(t.subtasks || []) : updater;
          return { ...t, subtasks: nextSubs };
        })
      )
    );
  };
  const handleDrag = (from, to) => {
    if (to < 0 || to >= tasks.length) return;
    const next = [...tasks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(sortTasks(next));
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="space-y-3">
        <p className="terminal-note">Nog geen taken toegevoegd.</p>
        <button type="button" className="terminal-button is-ghost text-xs" onClick={handleAdd}>
          Taak toevoegen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-parchment/80 text-xs uppercase tracking-[0.12em] text-gridline/70">
            <tr>
              <th className="px-3 py-2 text-left">Titel</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Owner</th>
              <th className="px-3 py-2 text-left">Due</th>
              <th className="px-3 py-2 text-left">Notities</th>
              <th className="px-3 py-2 text-left">Subtaken</th>
              <th className="px-3 py-2 text-left">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gridline/20 text-base-soft">
            {tasks.map((t, index) => {
              const taskOverdue = isOverdue(t.due_date, new Date().toISOString());
              const taskDueSoon = !taskOverdue && isDueSoon(t.due_date, new Date().toISOString());
              const subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
              return (
                  <tr
                    key={t.id ?? index}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const from = Number(e.dataTransfer.getData("text/plain"));
                      handleDrag(from, index);
                    }}
                  >
                  <td className="px-3 py-2">
                    <input
                      className="terminal-input"
                      type="text"
                      value={t.title || ""}
                      onChange={(e) => handleUpdate(index, { title: e.target.value })}
                      placeholder="Bijv. Nabewerken, verzenden..."
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {TASK_STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleUpdate(index, { status: s })}
                          className={`terminal-pill text-xs ${
                            (t.status || "open") === s ? "border-primary/70 text-primary" : "text-gridline/70"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="terminal-input"
                      type="text"
                      value={t.owner || ""}
                      onChange={(e) => handleUpdate(index, { owner: e.target.value })}
                      placeholder="Naam/initialen"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        className="terminal-input"
                        type="date"
                        value={t.due_date || ""}
                        onChange={(e) => handleUpdate(index, { due_date: e.target.value })}
                      />
                      {taskOverdue ? (
                        <span className="terminal-pill text-xs border-signal-red/60 text-signal-red">Te laat</span>
                      ) : taskDueSoon ? (
                        <span className="terminal-pill text-xs border-signal-amber/60 text-signal-amber">Binnenkort</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="terminal-input"
                      type="text"
                      value={t.notes || ""}
                      onChange={(e) => handleUpdate(index, { notes: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <SubtasksEditor
                      subtasks={subtasks}
                      onChange={(subs) => handleSubtaskChange(index, subs)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="terminal-button is-ghost text-xs"
                      onClick={() => handleUpdate(index, { status: "done" })}
                    >
                      Markeer klaar
                    </button>
                    <button type="button" className="terminal-button is-danger text-xs" onClick={() => handleRemove(index)}>
                      Verwijder
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className="terminal-button is-ghost text-xs" onClick={handleAdd}>
        Taak toevoegen
      </button>
    </div>
  );
}

function SubtasksEditor({ subtasks, onChange }) {
  const list = Array.isArray(subtasks) ? subtasks : [];
  const add = () => onChange([...(list || []), { id: `sub-${Date.now()}`, title: "", status: "open" }]);
  const update = (index, patch) =>
    onChange(list.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const remove = (index) => onChange(list.filter((_, i) => i !== index));
  const handleDrag = (from, to) => {
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next.map((s, idx) => ({ ...s, sort_order: idx })));
  };

  return (
    <div className="space-y-2">
      {list.length === 0 ? (
        <p className="terminal-note text-xs">Geen subtaken.</p>
      ) : (
        <ul className="space-y-1">
          {list.map((s, idx) => (
            <li
              key={s.id ?? idx}
              className="flex items-center gap-2"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const from = Number(e.dataTransfer.getData("text/plain"));
                handleDrag(from, idx);
              }}
            >
              <span className="text-gridline/50 cursor-move">⋮⋮</span>
              <input
                className="terminal-input text-xs"
                type="text"
                value={s.title || ""}
                onChange={(e) => update(idx, { title: e.target.value })} 
                placeholder="Subtaak"
              />
              <div className="flex gap-1">
                {["open", "done"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => update(idx, { status: st })}
                    className={`terminal-pill text-[11px] ${
                      (s.status || "open") === st ? "border-primary/70 text-primary" : "text-gridline/70"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <button className="terminal-button is-ghost text-[11px]" type="button" onClick={() => remove(idx)}>
                -
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="terminal-button is-ghost text-xs" onClick={add}>
        Subtaak toevoegen
      </button>
    </div>
  );
}

async function logSpoolUsageDelta(current = [], initial = [], showToast) {
  // Map initial by spool_id (fallback material_id) to quantity
  const byKey = new Map();
  initial.forEach((m) => {
    const key = m.spool_id ? `spool-${m.spool_id}` : m.material_id ? `mat-${m.material_id}` : null;
    if (key) byKey.set(key, Number(m.quantity_grams ?? 0));
  });

  for (const mat of current) {
    const key = mat.spool_id ? `spool-${mat.spool_id}` : mat.material_id ? `mat-${mat.material_id}` : null;
    if (!key || !mat.spool_id) continue; // alleen loggen als er een spool gekoppeld is
    const prevQty = byKey.get(key) ?? 0;
    const newQty = Number(mat.quantity_grams ?? 0);
    const delta = newQty - prevQty;
    if (delta > 0.0001) {
      try {
        const resp = await fetch(`${baseUrl}/log-spool-usage.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spool_id: mat.spool_id,
            quantity_grams: delta,
            project_id: mat.project_id ?? null,
            note: "Auto-log projectverbruik",
          }),
        });
        const resJson = await resp.json();
        if (!resp.ok || resJson?.error) throw new Error(resJson?.error || "Verbruik loggen mislukt");
      } catch (e) {
        showToast?.({ type: "warning", message: `Verbruik niet gelogd voor rol #${mat.spool_id}: ${e.message}` });
      }
    }
  }
}
