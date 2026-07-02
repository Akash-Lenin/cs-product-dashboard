function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function LoginScreen({ onSignIn, signingIn, error, allowedDomain }) {
  return (
    <main className="cs-app flex min-h-screen items-center justify-center px-4">
      <div className="cs-panel w-full max-w-[400px] px-8 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ background: "var(--app-sidebar)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FAFAF7" strokeWidth="2.4" strokeLinecap="round">
            <path d="M4 20V10" />
            <path d="M10 20V4" />
            <path d="M16 20v-7" />
            <path d="M22 20H2" />
          </svg>
        </div>

        <h1 className="mt-5 text-[22px] font-semibold" style={{ color: "var(--app-text)" }}>CS Dashboard</h1>
        <p className="mt-2 text-[13.5px] leading-6" style={{ color: "var(--app-text-muted)" }}>
          The CS x Product issue tracker. Sign in with your
          {allowedDomain ? ` ${allowedDomain}` : ""} Google account to continue.
        </p>

        <button
          type="button"
          onClick={onSignIn}
          disabled={signingIn}
          className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-[10px] border px-4 py-3 text-[14px] font-semibold transition hover:opacity-90 disabled:opacity-50"
          style={{ borderColor: "var(--app-border)", background: "var(--app-surface)", color: "var(--app-text)" }}
        >
          <GoogleIcon />
          {signingIn ? "Redirecting…" : "Sign in with Google"}
        </button>

        {error ? (
          <p className="mt-5 text-[13px] leading-5 text-[#842A42]">{error}</p>
        ) : null}

        <p className="mt-6 text-[12px]" style={{ color: "var(--app-text-muted)" }}>
          New accounts start read-only. An editor can promote your role.
        </p>
      </div>
    </main>
  );
}
