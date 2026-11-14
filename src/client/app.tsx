import { useEffect, useMemo, useState, useCallback } from "preact/hooks";
import { AppContext } from "./context";
import { useAppState } from "./hooks/use-app";
import { Sidebar } from "./components/sidebar";
import { IssueList } from "./components/issue-list";
import { IssueDetail } from "./components/issue-detail";
import { ProjectList } from "./components/project-list";
import { ProjectPage } from "./components/project-page";
import { ErrorBanner } from "./components/error-banner";
import { Login } from "./components/login";
import { api, ApiError } from "./api";

export function App() {
  const isAgent = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("agent") || params.get("mode") === "agent";
  }, []);

  useEffect(() => {
    if (isAgent) {
      document.documentElement.setAttribute("data-agent", "");
    }
  }, [isAgent]);

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<string | null>(null);

  const checkMe = useCallback(async () => {
    try {
      const data = await api<{ user: { username: string } }>("GET", "/api/me");
      setUser(data.user.username);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 503)) {
        setUser(null);
      } else {
        setUser(null);
      }
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkMe();
  }, [checkMe]);

  const handleLogout = useCallback(async () => {
    try {
      await api("POST", "/api/logout");
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  if (!authChecked) {
    return <div class="login-page"><div class="loading-text">Loading...</div></div>;
  }

  if (!user) {
    return (
      <Login
        onSuccess={(username) => {
          setUser(username);
        }}
      />
    );
  }

  return <AuthenticatedApp isAgent={isAgent} user={user} onLogout={handleLogout} />;
}

function AuthenticatedApp({
  isAgent,
  user,
  onLogout,
}: {
  isAgent: boolean;
  user: string;
  onLogout: () => void;
}) {
  const appState = useAppState(isAgent);

  const renderMain = () => {
    if (appState.view === "project" && appState.projectId) {
      return <ProjectPage projectId={appState.projectId} />;
    }
    if (appState.selectedIssue) return <IssueDetail />;
    if (appState.view === "projects") return <ProjectList />;
    return <IssueList />;
  };

  return (
    <AppContext.Provider value={{ ...appState, user, logout: onLogout }}>
      <div class="layout">
        <Sidebar />
        <main class="main-content">
          {appState.loading ? (
            <div class="loading-text">Loading...</div>
          ) : (
            renderMain()
          )}
        </main>
      </div>
      <ErrorBanner />
    </AppContext.Provider>
  );
}
