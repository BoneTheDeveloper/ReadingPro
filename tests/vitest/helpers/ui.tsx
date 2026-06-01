import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";

export function renderWithUser(ui: ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(ui),
  };
}
