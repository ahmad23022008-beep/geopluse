import { useState, type FormEvent } from 'react';
import { AlertCircle, Lock, LogIn, Mail, Radio } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface LoginPageProps {
  onLoginSuccess: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      onLoginSuccess();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mencoba masuk. Silakan coba lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fbf8ff] px-4 py-8 sm:px-6">
      <section className="w-full max-w-md mx-auto rounded-2xl border border-structural-border bg-surface-container-lowest p-6 shadow-card">
        <header className="mb-8 text-center">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#161a33] text-tertiary-fixed">
              <Radio aria-hidden="true" size={26} />
            </span>
            <span className="text-2xl font-bold tracking-tight text-on-surface">
              Geo<span className="text-primary">Pulse</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Selamat datang</h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Masuk untuk melanjutkan ke presensi karyawan.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-on-surface"
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <Mail
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                size={18}
              />
              <input
                autoComplete="email"
                className="w-full rounded-xl border border-structural-border bg-surface-container-low py-3 pl-11 pr-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                id="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@email.com"
                required
                type="email"
                value={email}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-on-surface"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                size={18}
              />
              <input
                autoComplete="current-password"
                className="w-full rounded-xl border border-structural-border bg-surface-container-low py-3 pl-11 pr-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                id="password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password"
                required
                type="password"
                value={password}
              />
            </div>
          </div>

          {errorMessage && (
            <div
              aria-live="polite"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#161a33] py-3 font-bold text-tertiary-fixed transition-colors hover:bg-[#1f2444] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            <LogIn aria-hidden="true" size={18} />
            {isLoading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </section>
    </main>
  );
}
