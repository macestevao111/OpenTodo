import { useCallback, useEffect, useState } from "preact/hooks";
import { ArrowLeft, Plus } from "lucide-preact";
import { api } from "../api";
import { useApp } from "../context";
import { CreateIssue } from "./create-issue";
import { ImageAttach } from "./image-attach";
import { LabelPill } from "./label-pill";
import { PriorityIcon, priorityLabel } from "./priority-icon";
import type { Activity, Issue, IssueStatus, Priority, Project, ProjectStatus } from "../types";

const ISSUE_STATUSES: IssueStatus[] = ["backlog", "todo", "in_progress", "done", "cancelled"];
const PRIORITIES: Priority[] = ["none", "urgent", "high", "medium", "low"];
const PROJECT_STATUSES: ProjectStatus[] = ["backlog", "planned", "started", "in_progress", "completed", "cancelled"];

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    created: "created",
    status_changed: "status",
    priority_changed: "priority",
    label_added: "label+",
    label_removed: "label−",
    commented: "comment",
    synthesis: "síntese",
    note: "nota",
    reply: "reply",
  };
  return map[kind] || kind;
}

function ActivityCard({ a }: { a: Activity }) {
  return (
    <div class="project-activity-row">
      <span class="project-activity-kind">{kindLabel(a.kind)}</span>
      <span class="project-activity-summary">{a.summary}</span>
      {a.image_data ? (
        <a class="activity-image-link" href={a.image_data} target="_blank" rel="noreferrer">
          <img class="activity-image" src={a.image_data} alt="" />
        </a>
      ) : null}
      <span class="project-activity-meta muted">
        {a.actor || "—"} · {a.created_at}
      </span>
    </div>
  );
}

type Props = { projectId: number };

export function ProjectPage({ projectId }: Props) {
  const {
    setView,
    setError,
    updateIssue,
    addComment,
    updateProject,
  } = useApp();

  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const n = parseInt(new URLSearchParams(window.location.search).get("issue") || "", 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  });
  const [selected, setSelected] = useState<Issue | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDoc, setEditingDoc] = useState(false);
  const [docDraft, setDocDraft] = useState("");
  const [editingSynthesis, setEditingSynthesis] = useState(false);
  const [synthesisDraft, setSynthesisDraft] = useState("");
  const [synthLog, setSynthLog] = useState<Activity[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [comment, setComment] = useState("");
  const [commentImage, setCommentImage] = useState("");
  const [projectNote, setProjectNote] = useState("");
  const [projectNoteImage, setProjectNoteImage] = useState("");
  const [projectFeed, setProjectFeed] = useState<Activity[]>([]);

  const loadProject = useCallback(async () => {
    const [data, acts] = await Promise.all([
      api<{ project: Project }>("GET", `/api/projects/${projectId}`),
      api<{ activities: Activity[] }>("GET", `/api/projects/${projectId}/activities`),
    ]);
    setProject(data.project);
    setDocDraft(data.project.description || "");
    setSynthesisDraft(data.project.synthesis || "");
    const all = acts.activities || [];
    setSynthLog(all.filter((a) => a.kind === "synthesis"));
    setProjectFeed(all.filter((a) => a.kind !== "synthesis"));
  }, [projectId]);

  const loadIssues = useCallback(async () => {
    const data = await api<{ issues: Issue[] }>(
      "GET",
      `/api/issues?project_id=${projectId}&limit=100`,
    );
    setIssues(data.issues);
  }, [projectId]);

  const loadSelected = useCallback(async (id: number) => {
    const [iss, act] = await Promise.all([
      api<{ issue: Issue }>("GET", `/api/issues/${id}`),
      api<{ activities: Activity[] }>("GET", `/api/issues/${id}/activities`),
    ]);
    setSelected(iss.issue);
    setActivities(act.activities);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadProject(), loadIssues()]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadProject, loadIssues, setError]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setActivities([]);
      return;
    }
    loadSelected(selectedId).catch((e) => setError((e as Error).message));
  }, [selectedId, loadSelected, setError]);

  const goBack = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "projects");
    url.searchParams.delete("id");
    url.searchParams.delete("issue");
    window.history.pushState(null, "", url.pathname + url.search);
    setView("projects");
  };

  const selectIssue = (id: number) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "project");
    url.searchParams.set("id", String(projectId));
    url.searchParams.set("issue", String(id));
    window.history.pushState(null, "", url.pathname + url.search);
  };

  const saveDoc = async () => {
    try {
      await updateProject(projectId, { description: docDraft });
      await loadProject();
      setEditingDoc(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveSynthesis = async () => {
    try {
      await api("PUT", `/api/projects/${projectId}`, {
        synthesis: synthesisDraft,
        log_synthesis: true,
      });
      await loadProject();
      setEditingSynthesis(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const patchProjectField = async (field: string, value: string) => {
    try {
      await updateProject(projectId, { [field]: value });
      await loadProject();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const patchIssueField = async (field: string, value: string) => {
    if (!selected) return;
    try {
      await updateIssue(selected.id, { [field]: value } as Partial<Issue>);
      await Promise.all([loadIssues(), loadSelected(selected.id)]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submitComment = async () => {
    if (!selected || (!comment.trim() && !commentImage)) return;
    try {
      await addComment(selected.id, comment.trim() || "[imagem]", commentImage || undefined);
      setComment("");
      setCommentImage("");
      await Promise.all([loadSelected(selected.id), loadProject()]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submitProjectNote = async () => {
    if (!projectNote.trim() && !projectNoteImage) return;
    try {
      await api("POST", `/api/projects/${projectId}/activities`, {
        summary: projectNote.trim() || "[imagem]",
        image_data: projectNoteImage || undefined,
        kind: "note",
      });
      setProjectNote("");
      setProjectNoteImage("");
      await loadProject();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading || !project) {
    return <div class="loading-text">Loading project...</div>;
  }

  return (
    <div class="project-page">
      <div class="project-page-header">
        <button type="button" class="btn btn-sm project-back" onClick={goBack} aria-label="Back to projects">
          <ArrowLeft size={14} /> Projetos
        </button>
        <div class="project-page-title">
          <span class="project-icon">{project.icon}</span>
          <h1>{project.name}</h1>
        </div>
        <div class="project-page-meta">
          <span class="muted">lead: {project.lead || "—"}</span>
          <span class="muted">·</span>
          <span class="muted">{project.issue_count ?? issues.length} issues</span>
          <select
            class="inline-select"
            value={project.status}
            onChange={(e) => patchProjectField("status", (e.target as HTMLSelectElement).value)}
            aria-label="Project status"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            class="inline-select"
            value={project.priority}
            onChange={(e) => patchProjectField("priority", (e.target as HTMLSelectElement).value)}
            aria-label="Project priority"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{priorityLabel(p)}</option>
            ))}
          </select>
        </div>
      </div>

      <div class="project-page-body">
        <aside class="project-doc-panel">
          <div class="project-doc-split">
            <div class="project-doc-half">
              <div class="project-panel-head">
                <span class="project-panel-title">Documentação</span>
                {!editingDoc ? (
                  <button type="button" class="btn btn-sm" onClick={() => setEditingDoc(true)}>Editar</button>
                ) : (
                  <div class="project-doc-actions">
                    <button type="button" class="btn btn-sm" onClick={() => { setEditingDoc(false); setDocDraft(project.description || ""); }}>Cancelar</button>
                    <button type="button" class="btn btn-sm btn-primary" onClick={saveDoc}>Guardar</button>
                  </div>
                )}
              </div>
              {editingDoc ? (
                <textarea
                  class="project-doc-editor"
                  value={docDraft}
                  onInput={(e) => setDocDraft((e.target as HTMLTextAreaElement).value)}
                  aria-label="Project documentation"
                />
              ) : (
                <div class="project-doc-view">
                  {project.description?.trim()
                    ? project.description
                    : "Sem documentação. Editar para adicionar objetivo, links e notas."}
                </div>
              )}
            </div>

            <div class="project-doc-half project-synthesis-half">
              <div class="project-panel-head">
                <span class="project-panel-title project-synthesis-brand">
                  <span class="synthesis-mark" aria-hidden="true">◇</span> Síntese
                </span>
                {!editingSynthesis ? (
                  <button type="button" class="btn btn-sm" onClick={() => setEditingSynthesis(true)}>Editar</button>
                ) : (
                  <div class="project-doc-actions">
                    <button type="button" class="btn btn-sm" onClick={() => { setEditingSynthesis(false); setSynthesisDraft(project.synthesis || ""); }}>Cancelar</button>
                    <button type="button" class="btn btn-sm btn-primary" onClick={saveSynthesis}>Guardar</button>
                  </div>
                )}
              </div>
              {editingSynthesis ? (
                <textarea
                  class="project-doc-editor"
                  value={synthesisDraft}
                  onInput={(e) => setSynthesisDraft((e.target as HTMLTextAreaElement).value)}
                  aria-label="Síntese do projeto"
                />
              ) : (
                <div class="project-doc-view project-synthesis-view">
                  {project.synthesis?.trim()
                    ? project.synthesis
                    : "Ainda sem Síntese. A skill opentodo-board atualiza este painel após mudanças no board; humanos podem editar."}
                </div>
              )}
              <div class="project-synthesis-log">
                <div class="project-panel-title">Log ◇</div>
                {synthLog.length === 0 && <div class="muted synthesis-log-empty">Sem entradas ainda</div>}
                {synthLog.slice(0, 8).map((a) => (
                  <div key={a.id} class="synthesis-log-row">
                    <span class="synthesis-log-meta muted">{a.actor || "—"} · {a.created_at}</span>
                    <span class="synthesis-log-summary">{a.summary}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section class="project-issues-panel">
          <div class="project-panel-head">
            <span class="project-panel-title">Issues</span>
            <span class="toolbar-count">{issues.length}</span>
            <button type="button" class="btn btn-sm btn-primary" onClick={() => setShowCreate(true)} aria-label="New issue">
              <Plus size={14} /> New
            </button>
          </div>

          {showCreate && (
            <CreateIssue
              defaultProjectId={projectId}
              onClose={async () => {
                setShowCreate(false);
                await loadIssues();
                await loadProject();
              }}
            />
          )}

          <div class="project-issue-list">
            {issues.length === 0 && <div class="empty-text">Nenhuma issue neste projeto</div>}
            {issues.map((iss) => (
              <button
                type="button"
                key={iss.id}
                class={`project-issue-row ${selectedId === iss.id ? "active" : ""}`}
                onClick={() => selectIssue(iss.id)}
              >
                <span class="project-issue-id">{iss.identifier}</span>
                <span class="project-issue-title">{iss.title}</span>
                <span class="project-issue-badges">
                  <PriorityIcon priority={iss.priority} />
                  <span class="muted">{iss.status}</span>
                  {iss.labels?.map((l) => <LabelPill key={l.id} label={l} />)}
                </span>
              </button>
            ))}
          </div>

          <div class="project-issue-detail">
            {!selected ? (
              <div class="project-activities">
                <div class="project-panel-title">Activity do projeto</div>
                <div class="project-activity-list">
                  {projectFeed.length === 0 && <div class="muted">Sem activity ainda — publica uma nota ou reply com texto/imagem</div>}
                  {projectFeed.map((a) => <ActivityCard key={a.id} a={a} />)}
                </div>
                <div class="project-comment-box project-compose">
                  <input
                    type="text"
                    value={projectNote}
                    onInput={(e) => setProjectNote((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitProjectNote(); }}
                    placeholder="Nota / reply no projeto…"
                    aria-label="Project note"
                  />
                  <ImageAttach value={projectNoteImage} onChange={setProjectNoteImage} />
                  <button type="button" class="btn btn-sm btn-primary" onClick={submitProjectNote}>
                    Post
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div class="project-issue-detail-head">
                  <h2>{selected.identifier} · {selected.title}</h2>
                  <div class="project-issue-detail-controls">
                    <select
                      class="inline-select"
                      value={selected.status}
                      onChange={(e) => patchIssueField("status", (e.target as HTMLSelectElement).value)}
                      aria-label="Issue status"
                    >
                      {ISSUE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                      class="inline-select"
                      value={selected.priority}
                      onChange={(e) => patchIssueField("priority", (e.target as HTMLSelectElement).value)}
                      aria-label="Issue priority"
                    >
                      {PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel(p)}</option>)}
                    </select>
                  </div>
                </div>
                <div class="project-issue-desc">
                  {selected.description?.trim() || <span class="muted">Sem descrição</span>}
                </div>
                <div class="project-activities">
                  <div class="project-panel-title">Activities · reply</div>
                  <div class="project-activity-list">
                    {activities.length === 0 && <div class="muted">Sem activities ainda</div>}
                    {activities.map((a) => <ActivityCard key={a.id} a={a} />)}
                  </div>
                  <div class="project-comment-box project-compose">
                    <input
                      type="text"
                      value={comment}
                      onInput={(e) => setComment((e.target as HTMLInputElement).value)}
                      onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
                      placeholder="Reply…"
                      aria-label="Add comment"
                    />
                    <ImageAttach value={commentImage} onChange={setCommentImage} />
                    <button type="button" class="btn btn-sm btn-primary" onClick={submitComment}>
                      Reply
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
