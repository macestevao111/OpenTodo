import { useState } from "preact/hooks";

type Props = {
  onSuccess: (username: string) => void;
};

export function Login({ onSuccess }: Props) {
  const [username, setUsername] = useState("estevao");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((data as { error?: string }).error || "Login failed");
      onSuccess((data as { user: { username: string } }).user.username);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="login-page">
      <form class="login-card" onSubmit={submit}>
        <div class="login-brand">OpenTodo</div>
        <p class="login-sub">estevao ou thiago</p>
        {error && <div class="login-error">{error}</div>}
        <label class="login-label">
          Utilizador
          <input
            class="login-input"
            autocomplete="username"
            value={username}
            onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
            required
          />
        </label>
        <label class="login-label">
          Senha
          <input
            class="login-input"
            type="password"
            autocomplete="current-password"
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
            required
          />
        </label>
        <button class="login-submit" type="submit" disabled={busy}>
          {busy ? "A entrar…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
