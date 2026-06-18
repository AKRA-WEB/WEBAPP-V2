import { LoginForm } from "@/modules/auth/login-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">AKRA WEBAPP V2</p>
          <h1 id="login-title">Sign In</h1>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
