export function ResetPasswordPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-50">
      <form className="grid w-full max-w-md gap-4 rounded-[32px] border border-white/10 bg-white/6 p-8 shadow-2xl shadow-black/30 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.28em] text-sky-300">Reset access</p>
        <h1 className="text-4xl font-black">Forgot password</h1>
        <label className="grid gap-2 text-sm text-slate-200">
          Registered email
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" type="email" placeholder="you@example.com" />
        </label>
        <button className="rounded-full bg-gradient-to-r from-sky-300 to-indigo-400 px-5 py-3 font-semibold text-slate-950" type="button">
          Send reset link
        </button>
      </form>
    </div>
  );
}
