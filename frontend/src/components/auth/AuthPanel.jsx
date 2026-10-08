import React, { useState } from "react";
import { UserRound, Radio } from "lucide-react";
import { authenticate } from "../../services/api";

export default function AuthPanel({ onAuthenticate }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await authenticate(mode, { name, email, password });
      if (!data.success) throw new Error(data.error || "Could not sign in.");
      onAuthenticate(data);
    } catch (requestError) {
      setError(requestError.message || "Cannot reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-400"><Radio /></div>
          <div><h1 className="text-xl font-bold">Rider account</h1><p className="text-xs text-slate-400">Sign in to create or join a live group ride.</p></div>
        </div>
        <div className="grid grid-cols-2 rounded-lg bg-slate-950 p-1 text-sm">
          {["login", "register"].map((item) => <button key={item} type="button" onClick={() => { setMode(item); setError(""); }} className={`rounded-md py-2 capitalize ${mode === item ? "bg-slate-800 text-white" : "text-slate-400"}`}>{item}</button>)}
        </div>
        {mode === "register" && <label className="block text-xs text-slate-400">Rider name<input required minLength={2} maxLength={60} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white" /></label>}
        <label className="block text-xs text-slate-400">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white" /></label>
        <label className="block text-xs text-slate-400">Password<input required minLength={mode === "register" ? 8 : undefined} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white" /></label>
        {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
        <p className="text-center text-[11px] text-slate-500"><UserRound className="inline h-3 w-3 mr-1"/>Your ride code is shared only with the riders you invite.</p>
      </form>
    </main>
  );
}
