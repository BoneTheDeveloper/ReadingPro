import { createSlice } from "@reduxjs/toolkit";

export interface SessionUser {
  name?: string | null;
  email: string;
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
  // Seeded via preloadedState from the server session; nothing mutates it yet.
  reducers: {},
  selectors: {
    selectSessionUser: (state) => state.user,
  },
});

export const { selectSessionUser } = sessionSlice.selectors;
