import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error } = isLogin 
      ? await signIn(email, password)
      : await signUp(email, password);

    if (error) {
      setError(error.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="sanctuary-container flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-mono font-bold text-xl uppercase tracking-tighter-custom">
              DISRUPTUR
            </h1>
            <span className="font-mono text-xs text-muted-foreground uppercase hidden md:block">
              STORY OS
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center sanctuary-container">
        <div className="w-full max-w-md">
          <div className="text-center mb-12 space-y-4">
            <h2 className="font-mono font-bold text-3xl md:text-4xl uppercase tracking-tighter-custom">
              {isLogin ? "ENTER SANCTUARY" : "CREATE ACCESS"}
            </h2>
            <p className="font-mono text-muted-foreground body-text">
              {isLogin 
                ? "authenticate to access your truth ledger." 
                : "register to begin documenting your stories."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="font-mono text-xs uppercase text-muted-foreground block mb-2">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="clinical-input"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="font-mono text-xs uppercase text-muted-foreground block mb-2">
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="clinical-input"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="warning-block">
                <p className="font-mono text-sm text-accent uppercase">
                  {error}
                </p>
              </div>
            )}

            <Button
              type="submit"
              variant="clinical"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                "AUTHENTICATE"
              ) : (
                "CREATE ACCOUNT"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors body-text"
            >
              {isLogin 
                ? "no account? create access →" 
                : "already registered? authenticate →"}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-muted">
        <div className="sanctuary-container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-mono text-xs text-muted-foreground uppercase">
              THE TRUTH LEDGER
            </div>
            <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
              <span>v0.1.0</span>
              <span>•</span>
              <span>DIGITAL SANCTUARY</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
