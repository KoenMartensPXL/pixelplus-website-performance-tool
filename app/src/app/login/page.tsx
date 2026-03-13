"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import BrandHeader from "@/app/components/brand/brand-header";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [successLoading, setSuccessLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login mislukt");
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccessLoading(true);

      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 2200);
    } catch {
      setError("Er ging iets mis bij het inloggen");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <BrandHeader href="/login" />

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
              {successLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Image
                    src="/brand/brand-icon-4.svg"
                    alt="Loading"
                    width={64}
                    height={64}
                    className="animate-[spin_2.2s_linear_infinite]"
                    priority
                  />
                  <p className="mt-5 text-sm text-white/55">
                    Klanten ophalen...
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <h1 className="text-xl font-semibold">Admin login</h1>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Gebruikersnaam
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-white/25"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Wachtwoord
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-white/25"
                        required
                      />
                    </div>

                    {error ? (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
                    >
                      {loading ? "Bezig..." : "Inloggen"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
