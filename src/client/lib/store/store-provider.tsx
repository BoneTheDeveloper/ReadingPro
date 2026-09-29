"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "./store";
import type { SessionUser } from "./session-slice";

interface StoreProviderProps {
  user: SessionUser;
  children: React.ReactNode;
}

/**
 * Seeds the store with the server-resolved session so the first render
 * already has the user — no empty flash waiting for a client dispatch.
 */
export function StoreProvider({ user, children }: StoreProviderProps) {
  const [store] = useState(() => makeStore({ session: { user } }));
  return <Provider store={store}>{children}</Provider>;
}
