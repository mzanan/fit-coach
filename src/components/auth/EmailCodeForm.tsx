import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { useLogin } from "@/components/auth/useLogin";

export function EmailCodeForm({ login }: { login: ReturnType<typeof useLogin> }) {
  const {
    mode,
    email,
    setEmail,
    code,
    setCode,
    pending,
    sendError,
    verifyError,
    resendIn,
    sendCode,
    resendCode,
    verify,
    useDifferentEmail,
  } = login;

  if (mode === "code") {
    return (
      <div className="pt-tight">
        <p className="eyebrow truncate">Code sent to {email}</p>
        <form onSubmit={verify} className="mt-2">
          <Label htmlFor="otp">6-digit code</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            enterKeyHint="go"
            maxLength={6}
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            className="num text-center text-metric tracking-(--tracking-code)"
          />
          {verifyError ? (
            <p role="alert" className="mt-tight text-meta text-destructive">
              {verifyError}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="solid"
            size="md"
            className="mt-tight w-full"
            disabled={pending}
          >
            {pending ? "Verifying..." : "Verify and sign in"}
          </Button>
          <div className="mt-tight flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="flex-1 text-meta"
              disabled={resendIn > 0 || pending}
              onClick={resendCode}
            >
              {resendIn > 0 ? `New code in ${resendIn}s` : "Send a new code"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="flex-1 text-meta"
              onClick={useDifferentEmail}
            >
              Use a different email
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="pt-tight">
      <form onSubmit={sendCode}>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          enterKeyHint="send"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
        <p className="mt-2 text-meta text-muted-foreground">
          We email a 6-digit code. It expires in 10 minutes.
        </p>
        {sendError ? (
          <p role="alert" className="mt-tight text-meta text-destructive">
            {sendError}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="outline"
          size="md"
          className="mt-tight w-full"
          disabled={pending}
        >
          {pending ? "Sending..." : "Send code"}
        </Button>
      </form>
    </div>
  );
}
