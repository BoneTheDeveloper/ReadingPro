import * as React from "react";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Seconds left before another code may be requested. It starts on cooldown,
 * because every screen that uses it opens right after a code was sent.
 */
export function useResendCooldown() {
  const [secondsLeft, setSecondsLeft] = React.useState(RESEND_COOLDOWN_SECONDS);

  React.useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return {
    secondsLeft,
    restart: () => setSecondsLeft(RESEND_COOLDOWN_SECONDS),
    clear: () => setSecondsLeft(0),
  };
}
