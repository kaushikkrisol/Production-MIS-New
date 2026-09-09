const { test, expect } = require("@playwright/test");

const required = [
  "E2E_USERNAME",
  "E2E_PASSWORD",
  "E2E_TEST_JOB_NO",
];
const hasCredentials = required.every((name) => String(process.env[name] || "").trim());
const canMutate = process.env.E2E_ALLOW_MUTATIONS === "true";
const hasRateFixture = ["E2E_TEST_CUSTOMER", "E2E_TEST_DESCRIPTION", "E2E_EXPECTED_RATE"].every(
  (name) => String(process.env[name] || "").trim()
);

async function signIn(page) {
  await page.goto("/");
  await page.locator('input[type="text"]').first().fill(process.env.E2E_USERNAME);
  await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/data-tables/);
}

async function openInvoiceBuilder(page) {
  await page.goto("/invoice-preview-builder");
  await expect(page.getByText("Invoice Preview Builder", { exact: false })).toBeVisible();
}

async function selectJob(page, jobNo) {
  const jobSearch = page.locator(".invoice-queue-actions input").first();
  await jobSearch.fill(jobNo);
  const option = page.getByRole("option", { name: new RegExp(jobNo, "i") }).first();
  await expect(option).toBeVisible();
  await option.click();
}

test.describe("Job Entry and Invoice E2E", () => {
  test.skip(!hasCredentials, "Set E2E_USERNAME, E2E_PASSWORD, and E2E_TEST_JOB_NO in .env.e2e.");

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("E2E-JI-01: selecting a description captures the configured rate immediately", async ({ page }) => {
    test.skip(!hasRateFixture, "Set E2E_TEST_CUSTOMER, E2E_TEST_DESCRIPTION, and E2E_EXPECTED_RATE.");
    await page.goto("/jobs");

    const customerInput = page.locator(".job-form-select__input input").first();
    await customerInput.fill(process.env.E2E_TEST_CUSTOMER);
    await page.getByText(process.env.E2E_TEST_CUSTOMER, { exact: true }).last().click();

    const descriptionInput = page.locator('[id^="job-description-"]').first();
    await descriptionInput.fill(process.env.E2E_TEST_DESCRIPTION);
    await page.getByText(process.env.E2E_TEST_DESCRIPTION, { exact: true }).last().click();

    const row = descriptionInput.locator("xpath=ancestor::tr");
    await expect(row.locator('input[type="number"]').last()).toHaveValue(process.env.E2E_EXPECTED_RATE);
  });

  test("E2E-IV-01 and E2E-IV-02: one Job ID selection includes all branch rows without duplicate options", async ({ page }) => {
    const jobNo = process.env.E2E_TEST_JOB_NO;
    await openInvoiceBuilder(page);

    const jobSearch = page.locator(".invoice-queue-actions input").first();
    await jobSearch.fill(jobNo);
    await expect(page.getByRole("option", { name: new RegExp(jobNo, "i") })).toHaveCount(1);
    await selectJob(page, jobNo);

    await expect(page.locator(".job-card-grid")).toContainText(jobNo);
    await expect(page.locator(".invoice-grid-table").first()).toContainText(jobNo);
  });

  test("E2E-IV-03 and E2E-IV-04: PO/project stay blank and charge rows inherit Job ID", async ({ page }) => {
    const jobNo = process.env.E2E_TEST_JOB_NO;
    await openInvoiceBuilder(page);
    await selectJob(page, jobNo);

    await expect(page.getByTestId("invoice-po-number")).toHaveValue("");
    await expect(page.getByTestId("invoice-project-name")).toHaveValue("");

    for (const label of ["Installation", "Adaptation", "Transportation"]) {
      await page.getByRole("button", { name: new RegExp(label, "i") }).click();
      const row = page.locator("tr", { hasText: new RegExp(`${label} Charges`, "i") }).last();
      await expect(row).toContainText(jobNo);
      await expect(row.locator('input[type="checkbox"]')).toBeChecked();
    }
  });

  test("E2E-IV-05 through E2E-IV-07: billing and internal invoice preview use job branch locations", async ({ page }) => {
    await openInvoiceBuilder(page);
    await selectJob(page, process.env.E2E_TEST_JOB_NO);

    await expect(page.getByText(/Billing:/).first()).toBeVisible();
    await expect(page.getByText(/Internal invoice billing:/)).toBeVisible();
  });

  test("E2E-IV-08: a draft update retains its invoice identity", async ({ page }) => {
    test.skip(!canMutate, "Set E2E_ALLOW_MUTATIONS=true only with approved, dedicated test data.");
    await openInvoiceBuilder(page);
    await selectJob(page, process.env.E2E_TEST_JOB_NO);

    await page.getByTestId("invoice-project-name").fill(`E2E draft ${Date.now()}`);
    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect(page.getByText(/Draft saved successfully/i)).toBeVisible();

    const invoiceNo = await page.evaluate(() => {
      const draft = JSON.parse(localStorage.getItem("invoiceDraftData") || "{}");
      return draft.invoiceNo || "";
    });
    expect(invoiceNo).not.toBe("");

    await page.getByTestId("invoice-notes").fill("Updated by Playwright E2E test");
    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("invoiceDraftData") || "{}").invoiceNo || "")
      )
      .toBe(invoiceNo);
  });
});
