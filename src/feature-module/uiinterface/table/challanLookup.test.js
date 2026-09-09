import { findCustomerRecord, mergeFallbackCustomers } from "./customerFallbacks";
import { buildChallanItemPricing } from "./hsnRateLookup";

const row = {
  client: "Loreal india private limited r&i (mum)",
  media: "Sav+5mm sb", lamination: "Glossy", mounting: "5 mm sun board",
  totalSqFt: "7.31", rate: null, amount: null, hsnCode: null,
};

test("uploaded Loreal item resolves customer details and customer-specific pricing", () => {
  const customer = findCustomerRecord(mergeFallbackCustomers([]), row);
  expect(customer.customeR_ID).toBe(762);
  expect(customer.gsT_NO).toBeTruthy();
  expect(customer.contacT_PERSON).toBeTruthy();
  expect(buildChallanItemPricing(row, customer)).toMatchObject({
    unitPrice: 94, totalSqFt: 7.31, lineJobValue: 687.14, hsnCode: "39199010",
  });
});

test("saved pricing and HSN override master defaults", () => {
  expect(buildChallanItemPricing({ ...row, rate: 100, amount: 731, hsnCode: "saved-hsn" }))
    .toMatchObject({ unitPrice: 100, lineJobValue: 731, hsnCode: "saved-hsn" });
});

test("exact customer and explicit IDs take priority over an alias", () => {
  const customers = mergeFallbackCustomers([{ customeR_ID: 900, customeR_NAME: row.client }]);
  expect(findCustomerRecord(customers, row).customeR_ID).toBe(900);
  expect(findCustomerRecord(customers, { ...row, customerId: 762 }).customeR_ID).toBe(762);
  expect(findCustomerRecord(customers, { ...row, customerId: 999 })).toBeNull();
});

test("unrelated customers and ambiguous aliases do not resolve", () => {
  const customers = mergeFallbackCustomers([]);
  expect(findCustomerRecord(customers, { client: "Loreal India Delhi" })).toBeNull();
  expect(findCustomerRecord([...customers, { customeR_ID: 99, customeR_NAME: "Loreal India" }], row)).toBeNull();
  expect(buildChallanItemPricing({ ...row, client: "Unrelated customer" }).unitPrice).toBe(0);
});

test("L card resolves its own product rather than the header rate", () => {
  expect(buildChallanItemPricing({ ...row, media: "Sav+sb l card" }).unitPrice).toBe(118);
});
