import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  mode: "login" | "signup";
}

export default function AuthPage({ mode }: Props) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password, name);
      toast.success(mode === "login" ? "Neural link established" : "Operator registered");
      navigate(redirect, { replace: true });
    } catch {
      toast.error("Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-8">
      <div className="cyber-panel corner-cuts p-8 space-y-6">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            ACCESS // {mode === "login" ? "AUTHENTICATE" : "REGISTER_OPERATOR"}
          </div>
          <h1 className="font-display text-3xl neon-text-cyan glitch">
            {mode === "login" ? "LOGIN" : "SIGN_UP"}
          </h1>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-neon-cyan">Operator_Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-neon-cyan">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-neon-magenta">Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} />
          </div>
          <Button type="submit" variant="cyber" className="w-full" disabled={busy}>
            {busy ? "Connecting..." : mode === "login" ? "Initiate_Link" : "Register"}
          </Button>
        </form>

        <div className="text-xs text-center text-muted-foreground">
          {mode === "login" ? (
            <>No account? <Link to={`/signup?redirect=${encodeURIComponent(redirect)}`} className="text-neon-magenta hover:underline">Sign_Up</Link></>
          ) : (
            <>Already registered? <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-neon-cyan hover:underline">Login</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
