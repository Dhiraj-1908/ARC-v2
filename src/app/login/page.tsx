"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sun, Moon } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  async function handleEmailAuth() {
    setLoading(true);
    setError("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/dashboard");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
      else setConfirmed(true);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleGitHub() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  const bgImage   = isDarkMode ? "/background/black_glow.jpg" : "/background/blue_glow1.jpg";
  const bg        = isDarkMode ? "bg-gray-900"  : "bg-gray-50";
  const cardBg    = isDarkMode ? "bg-gray-800"  : "bg-white";
  const border    = isDarkMode ? "border-gray-700" : "border-gray-200";
  const textMain  = isDarkMode ? "text-white"   : "text-gray-900";
  const textMuted = isDarkMode ? "text-gray-400" : "text-gray-500";
  const inputBg   = isDarkMode ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400";
  const tabBg     = isDarkMode ? "bg-gray-800"  : "bg-gray-100";
  const tabActive = isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900 shadow-sm";
  const tabInactive = isDarkMode ? "text-gray-400" : "text-gray-500";
  const divider   = isDarkMode ? "bg-gray-700"  : "bg-gray-200";
  const toggleBg  = isDarkMode ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100";

  // Post-signup confirmation screen
  if (confirmed) {
    return (
      <main className={`min-h-screen w-full ${bg} flex items-center justify-center px-6 transition-colors duration-300`}>
        <button
          onClick={() => setIsDarkMode(d => !d)}
          className={`fixed top-4 right-4 p-2.5 rounded-xl border transition-all ${toggleBg}`}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className={`text-2xl font-bold ${textMain} mb-2`}>Check your inbox</h2>
          <p className={`${textMuted} mb-1`}>We sent a confirmation link to</p>
          <p className={`${textMain} font-medium mb-6`}>{email}</p>
          <p className={`${textMuted} text-sm mb-8`}>
            Click the link in the email to activate your account, then come back here to sign in.
          </p>
          <button
            onClick={() => { setConfirmed(false); setMode("signin"); }}
            className={`w-full ${cardBg} ${textMain} rounded-xl py-3 font-medium transition-all border ${border} hover:opacity-80`}
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen w-full ${bg} flex transition-colors duration-300`}>

      {/* Theme toggle — fixed top-right */}
      <button
        onClick={() => setIsDarkMode(d => !d)}
        className={`fixed top-4 right-4 z-50 p-2.5 rounded-xl border transition-all duration-200 ${toggleBg}`}
        aria-label="Toggle theme"
      >
        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Left: image panel */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image src={bgImage} alt="" fill className="object-cover transition-all duration-500" />
        <div className={`absolute inset-0 bg-gradient-to-r from-transparent ${isDarkMode ? "to-gray-900" : "to-gray-50"} transition-colors duration-300`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-64">
            <Image src="/logo/logo2.svg" fill alt="ARC logo" />
          </div>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-red-500">ARC</span>
          </h1>
          <p className={`${textMuted} mb-8`}>AI Research Curator</p>

          {/* Tabs */}
          <div className={`flex mb-6 ${tabBg} rounded-xl p-1 transition-colors duration-300`}>
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "signin" ? tabActive : tabInactive
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "signup" ? tabActive : tabInactive
              }`}
            >
              Sign up
            </button>
          </div>

          {/* OAuth buttons */}
          <div className="space-y-3 mb-4">
            <button
              onClick={handleGoogle}
              className={`w-full flex items-center justify-center gap-3 rounded-xl py-3 font-medium transition-all border ${
                isDarkMode
                  ? "bg-white text-gray-800 border-transparent hover:bg-gray-100"
                  : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={handleGitHub}
              className={`w-full flex items-center justify-center gap-3 rounded-xl py-3 font-medium transition-all border ${
                isDarkMode
                  ? "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  : "bg-gray-900 border-gray-800 text-white hover:bg-gray-800"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className={`flex-1 h-px ${divider}`} />
            <span className={`${textMuted} text-sm`}>or</span>
            <div className={`flex-1 h-px ${divider}`} />
          </div>

          {/* Email + password */}
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full rounded-xl px-4 py-3 border focus:outline-none focus:border-blue-500 transition-colors duration-300 ${inputBg}`}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEmailAuth()}
              className={`w-full rounded-xl px-4 py-3 border focus:outline-none focus:border-blue-500 transition-colors duration-300 ${inputBg}`}
            />
          </div>

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

          <button
            onClick={handleEmailAuth}
            disabled={loading}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-medium transition-all disabled:opacity-60"
          >
            {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </div>
      </div>
    </main>
  );
}
