'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? translateError(err.message) : 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  };

  const translateError = (error: string): string => {
    const errorMessages: { [key: string]: string } = {
      'Invalid login credentials': 'Ongeldige inloggegevens',
      'Email not confirmed': 'E-mailadres niet bevestigd',
      'Invalid email or password': 'Ongeldig e-mailadres of wachtwoord',
      'Failed to login': 'Inloggen mislukt',
      'Too many requests': 'Te veel pogingen, probeer het later opnieuw',
      'Email rate limit exceeded': 'Te veel pogingen, probeer het later opnieuw',
      'Password rate limit exceeded': 'Te veel pogingen, probeer het later opnieuw',
      'User not found': 'Gebruiker niet gevonden',
    };

    return errorMessages[error] || 'Er is een fout opgetreden bij het inloggen';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1115] p-6">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welkom Terug</h1>
          <p className="text-gray-400">Log in op je account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg backdrop-blur-sm p-4 mb-6">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              E-mailadres
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input w-full px-4 py-3 rounded-lg"
              placeholder="Voer je e-mailadres in"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full px-4 py-3 rounded-lg"
              placeholder="Voer je wachtwoord in"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="glass-button w-full py-3 px-4 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Inloggen...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  );
} 