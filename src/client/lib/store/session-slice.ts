import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface SessionUser {
  name?: string | null;
  email: string;
  /** The login name as the user typed it; null for Google-only accounts. */
  username?: string | null;
  image?: string | null;
  tier?: string | null;
}

interface SessionState {
  user: SessionUser | null;
}

const initialState: SessionState = { user: null };

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  // Seeded via preloadedState from the server session.
  reducers: {
    /** The profile form saved new values; mirrors them so the app shows them at once. */
    sessionUserUpdated(state, action: PayloadAction<Partial<SessionUser>>) {
      if (state.user) Object.assign(state.user, action.payload);
    },
  },
  selectors: {
    selectSessionUser: (state) => state.user,
  },
});

export const { selectSessionUser } = sessionSlice.selectors;
export const { sessionUserUpdated } = sessionSlice.actions;
