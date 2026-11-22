import { expect, test } from "@playwright/test";
import { TEST_ACCOUNTS, seedTestAccounts } from "./test-accounts.ts";
import { backToStudio, countRequests, openStudy, signIn, translateWord } from "./support.ts";

// Every test starts from freshly seeded accounts with no lookups or saved words.
test.beforeEach(async () => {
  await seedTestAccounts();
});

test.describe("Free user", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_ACCOUNTS.free);
    await openStudy(page);
  });

  test("Dịch opens the Studio view with the dictionary, without the AI", async ({ page }) => {
    const translate = countRequests(page, "POST", "/api/translate");
    await page.getByRole("button", { name: "Collapse studio panel" }).click();

    await translateWord(page, "looks");

    const view = page.getByRole("navigation", { name: "Đường dẫn" });
    await expect(view.getByText("Tra từ")).toBeVisible();
    await expect(page.getByText("Dạng gốc: look")).toBeVisible();
    // The particle after the selection picks the phrasal verb.
    await expect(page.getByText("Theo câu")).toBeVisible();
    await expect(page.getByText("to look after").first()).toBeVisible();
    await expect(page.getByText(/có trong gói Pro/)).toBeVisible();
    expect(translate.count).toBe(0);
  });

  test("shows the word's own entry first and its base form second", async ({ page }) => {
    await translateWord(page, "running");

    await expect(page.getByRole("heading", { name: "running", exact: true })).toBeVisible();
    await expect(page.getByText("Dạng gốc: run", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "run", exact: true })).toBeVisible();
  });

  test("saves a picked meaning under the headword it belongs to", async ({ page }) => {
    await translateWord(page, "running");

    await page.getByRole("button", { name: "chạy", exact: true }).first().click();
    await expect(page.getByLabel("Nghĩa sẽ lưu")).toHaveValue("chạy");
    await expect(page.getByText(/^Lưu “run” vào từ vựng$/)).toBeVisible();
    await page.getByRole("button", { name: "Lưu vào từ vựng" }).click();
    await expect(page.getByRole("button", { name: "Đã lưu" })).toBeVisible();

    await page.goto("/vocabulary");
    await expect(page.getByText("run", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("chạy", { exact: true }).first()).toBeVisible();
  });

  test("an unknown word shows the not-found state and records nothing", async ({ page }) => {
    await page.getByRole("button", { name: "Mở tra từ" }).click();
    await page.getByLabel("Từ cần tra").fill("qzxv");
    await page.getByRole("button", { name: "Tra", exact: true }).click();

    await expect(page.getByText(/Không có trong từ điển/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Cambridge/ })).toBeVisible();
    await backToStudio(page);
    await expect(page.getByText(/Từ đã tra/)).toHaveCount(0);
  });

  test("a lookup is listed, survives a reload, reopens, and can be deleted", async ({ page }) => {
    await translateWord(page, "looks");
    await expect(page.getByText("to look after").first()).toBeVisible();
    await backToStudio(page);

    const rows = page.getByRole("region", { name: "Từ đã tra" });
    await expect(rows.getByText("Từ đã tra (1)")).toBeVisible();
    await page.reload();
    await expect(rows.getByText("look", { exact: true })).toBeVisible();

    await rows.getByText("look", { exact: true }).click();
    await expect(page.getByText("to look after").first()).toBeVisible();
    await backToStudio(page);

    await rows.getByRole("button", { name: "Xóa khỏi danh sách", exact: true }).click();
    await page.getByRole("menuitem", { name: "Xóa khỏi danh sách" }).click();
    await expect(page.getByText(/Từ đã tra/)).toHaveCount(0);
  });

  test("switching passages closes an open lookup view", async ({ page }) => {
    await translateWord(page, "looks");
    const breadcrumb = page.getByRole("navigation", { name: "Đường dẫn" });
    await expect(breadcrumb).toBeVisible();

    await page.getByText("Second passage").click();

    await expect(page.locator(".reading-content")).toContainText("The weather was calm");
    await expect(breadcrumb).toHaveCount(0);
  });
});

test.describe("Pro user", () => {
  test("gets the in-place popup with the AI meaning; Xem chi tiết reuses the lookup", async ({ page }) => {
    // The AI call is mocked: this checks the flow, not the model.
    await page.route("**/api/translate", (route) =>
      route.fulfill({ json: { translation: "chăm sóc", lemma: "look after", partOfSpeech: "VERB" } }),
    );
    const lookups = countRequests(page, "POST", "/api/word-lookup");
    await signIn(page, TEST_ACCOUNTS.pro);
    await openStudy(page);

    await translateWord(page, "looks");

    const popup = page.getByRole("dialog");
    await expect(popup.getByText("Theo ngữ cảnh (AI)")).toBeVisible();
    await expect(popup.getByText("chăm sóc", { exact: true })).toBeVisible();
    await expect(popup.getByText(/Theo câu · to look after/i)).toBeVisible();
    await expect(popup.getByText("trông nom, chăm sóc")).toBeVisible();

    await popup.getByRole("button", { name: "Lưu nghĩa theo ngữ cảnh" }).click();
    await expect(popup.getByRole("button", { name: "Đã lưu từ vựng" })).toBeVisible();

    await popup.getByRole("button", { name: "Xem chi tiết" }).click();
    await expect(page.getByRole("navigation", { name: "Đường dẫn" }).getByText("Tra từ")).toBeVisible();
    await expect(page.getByText("Theo ngữ cảnh (AI)")).toBeVisible();
    expect(lookups.count).toBe(1);
  });
});
