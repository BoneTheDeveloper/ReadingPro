import { combineSlices, configureStore } from "@reduxjs/toolkit";
import { sessionSlice } from "./session-slice";

const rootReducer = combineSlices(sessionSlice);

type RootState = ReturnType<typeof rootReducer>;

/**
 * One store per request/mount — a module-level store would leak one user's
 * session into another's render on the server.
 */
export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

export type AppState = ReturnType<ReturnType<typeof makeStore>["getState"]>;
