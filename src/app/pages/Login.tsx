import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(username, password);
      toast.success("Welcome back");
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from || "/", { replace: true });
    } catch {
      toast.error("The username or password is incorrect");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-white text-[#191919] lg:grid lg:h-[100dvh] lg:grid-cols-2 lg:overflow-hidden">
      <section className="hidden min-h-[100dvh] flex-col border-r border-[#e5e5e3] bg-[#f7f7f5] p-10 lg:!flex lg:min-h-0 lg:overflow-y-auto xl:p-14">
        <Brand />
        <MonochromeBlocks />
      </section>

      <section className="flex min-h-[100dvh] flex-col px-5 py-6 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-12 lg:py-10 xl:px-20">
        <div className="lg:hidden">
          <Brand />
        </div>

        <div className="mx-auto flex w-full max-w-[380px] flex-1 items-center py-10 sm:py-14">
          <div className="w-full">
            <div className="mb-9">
              <div className="mb-7 flex size-12 items-center justify-center rounded-md border border-[#dededb] bg-[#f7f7f5]">
                <img src="/icon.ico" alt="" className="size-7 grayscale contrast-150" />
              </div>
              <h2 className="text-[2rem] font-semibold leading-tight text-[#191919] sm:text-4xl">
                Log in to Job Monitor
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-medium text-[#37352f]">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  className="h-12 w-full rounded-md border border-[#d3d3d0] bg-white px-3.5 text-base text-[#191919] shadow-[0_1px_2px_rgba(15,15,15,0.04)] outline-none transition placeholder:text-[#a4a4a0] hover:border-[#b9b9b5] focus:border-[#191919] focus:ring-2 focus:ring-[#191919]/10 sm:text-sm"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#37352f]">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="h-12 w-full rounded-md border border-[#d3d3d0] bg-white px-12 pl-3.5 text-base text-[#191919] shadow-[0_1px_2px_rgba(15,15,15,0.04)] outline-none transition placeholder:text-[#a4a4a0] hover:border-[#b9b9b5] focus:border-[#191919] focus:ring-2 focus:ring-[#191919]/10 sm:text-sm"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-[#787774] transition hover:bg-[#f1f1ef] hover:text-[#191919] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191919]/15"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="mt-2 h-12 w-full bg-[#191919] text-sm text-white shadow-none hover:bg-black focus-visible:ring-[#191919]/20"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3" aria-label="Job Monitor">
      <span className="flex size-9 items-center justify-center rounded-md border border-[#dededb] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.05)]">
        <img src="/icon.ico" alt="" className="size-5 grayscale contrast-150" />
      </span>
      <span className="text-[15px] font-semibold text-[#191919]">Job Monitor</span>
    </div>
  );
}

function MonochromeBlocks() {
  const cells = [
    "bg-[#191919]",
    "bg-white",
    "bg-[#eeeeec]",
    "bg-white",
    "bg-white",
    "bg-[#e2e2df]",
    "bg-[#191919]",
    "bg-white",
    "bg-[#eeeeec]",
    "bg-white",
    "bg-white",
    "bg-[#191919]",
    "bg-white",
    "bg-[#191919]",
    "bg-[#eeeeec]",
    "bg-white",
  ];

  return (
    <div className="my-auto flex items-center justify-center py-12" aria-hidden="true">
      <div className="grid aspect-square w-full max-w-[420px] grid-cols-4 border-l border-t border-[#d8d8d5]">
        {cells.map((className, index) => (
          <div
            key={index}
            className={`flex items-center justify-center border-b border-r border-[#d8d8d5] ${className}`}
          >
            {index === 6 ? (
              <img src="/icon.ico" alt="" className="size-10 brightness-0 invert" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
