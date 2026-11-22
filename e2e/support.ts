import { expect, type Page } from "@playwright/test";
import { TEST_PASSWORD, type TestAccount } from "./test-accounts.ts";

export async function signIn(page: Page, account: TestAccount) {
  await page.goto("/login");
  await page.locator("#identifier").fill(account.login);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** Opens /study on the newest passage and waits for its text. */
export async function openStudy(page: Page) {
  await page.goto("/study");
  await expect(page.locator(".reading-content")).toBeVisible();
}

/** Double-clicks the first occurrence of `word` in the passage: the browser selects it and the app sees a mouseup. */
async function selectWord(page: Page, word: string) {
  const point = await page.evaluate((target) => {
    const root = document.querySelector(".reading-content");
    if (!root) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const index = node.nodeValue?.search(new RegExp(`\\b${target}\\b`)) ?? -1;
      if (index < 0) continue;
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + target.length);
      const rect = range.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    return null;
  }, word);
  if (!point) throw new Error(`"${word}" is not in the passage`);
  await page.mouse.dblclick(point.x, point.y);
}

/** Selects `word` in the passage and presses the popup's "Dịch" button. */
export async function translateWord(page: Page, word: string) {
  await selectWord(page, word);
  await page.getByRole("button", { name: `Dịch từ ${word}` }).click();
}

/** Counts the requests the page sends to `path` with `method`. */
export function countRequests(page: Page, method: string, path: string) {
  const counter = { count: 0 };
  page.on("request", (request) => {
    if (request.method() === method && new URL(request.url()).pathname === path) counter.count++;
  });
  return counter;
}

export async function backToStudio(page: Page) {
  await page.getByRole("button", { name: "Quay lại Studio" }).click();
}
