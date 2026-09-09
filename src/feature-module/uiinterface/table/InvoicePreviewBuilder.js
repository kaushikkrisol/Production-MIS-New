import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Form, Spinner, Table } from "react-bootstrap";
import axios from "axios";
import { CheckSquare, FileText, Plus, Printer, RefreshCw, RotateCcw, Save, Trash2 } from "react-feather";
import config from "../../../config";
import { all_routes } from "../../../Router/all_routes";
import { buildChallanItemPricing } from "./hsnRateLookup";
import { findCustomerRecord, mergeFallbackCustomers } from "./customerFallbacks";
import Select from "react-select";
import companyBranchDirectory, { getCompanyBranchDetails } from "./companyBranches";

const GST_RATE = 18;
const EWAY_BILL_THRESHOLD = 50000;
const TRANSPORT_MODES = ["Road", "Train", "Air", "Ship"];
const INVOICE_STATUS_STORAGE_KEY = "invoiceStatusByNo";
const LEGACY_FINAL_INVOICE_STORAGE_KEY = "finalInvoiceNos";
const INVOICE_JOB_CACHE_KEY = "invoicePreviewBuilderJobCardsCache:v7";
const getInvoiceJobCacheKey = (allowWithoutChallan) =>
  `${INVOICE_JOB_CACHE_KEY}:${allowWithoutChallan ? "without-challan" : "with-challan"}`;
const INVOICE_EWAY_STORAGE_KEY = "invoiceEwayBillByNo";
const INVOICE_JOB_CACHE_TTL_MS = 5 * 60 * 1000;
const INVOICE_JOB_API_TIMEOUT_MS = 12000;
const INVOICE_BACKGROUND_API_TIMEOUT_MS = 15000;
const READ_ONLY_ITEM_FIELDS = new Set(["invoiceAmount", "InvoiceAmount", "taxableValue", "TaxableValue"]);
const DIMENSION_UNIT_OPTIONS = [
  { value: "inch", label: "Inch" },
  { value: "nos", label: "Nos" },
  { value: "mm", label: "MM" },
  { value: "ft", label: "Ft" },
  { value: "cm", label: "CM" },
];
const BILL_FROM_LOCATION_OPTIONS = [
  { value: "", label: "Auto (Billing Location)" },
  ...Object.entries(companyBranchDirectory).map(([key, branch]) => ({
    value: key,
    label: `${branch.companyName} (${branch.companyGst})`,
  })),
];
const GST_STATE_ALIASES = {
  "01": ["jammuandkashmir", "jammu", "kashmir"],
  "02": ["himachalpradesh", "himachal"],
  "03": ["punjab"],
  "04": ["chandigarh"],
  "05": ["uttarakhand", "uttaranchal"],
  "06": ["haryana", "gurgaon", "gurugram"],
  "07": ["delhi", "newdelhi"],
  "08": ["rajasthan"],
  "09": ["uttarpradesh", "up"],
  10: ["bihar"],
  11: ["sikkim"],
  12: ["arunachalpradesh", "arunachal"],
  13: ["nagaland"],
  14: ["manipur"],
  15: ["mizoram"],
  16: ["tripura"],
  17: ["meghalaya"],
  18: ["assam"],
  19: ["westbengal", "bengal", "kolkata"],
  20: ["jharkhand"],
  21: ["odisha", "orissa"],
  22: ["chhattisgarh"],
  23: ["madhyapradesh", "mp"],
  24: ["gujarat"],
  26: ["dadraandnagarhaveli", "damananddiu"],
  27: ["maharashtra", "mumbai", "pune"],
  29: ["karnataka", "bengaluru", "bangalore"],
  30: ["goa"],
  31: ["lakshadweep"],
  32: ["kerala"],
  33: ["tamilnadu", "chennai"],
  34: ["puducherry", "pondicherry"],
  35: ["andamanandnicobar", "andaman"],
  36: ["telangana", "hyderabad", "hydrabad"],
  37: ["andhrapradesh", "andhra"],
  38: ["ladakh"],
};

const readInvoiceJobCardsCache = (allowWithoutChallan) => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(getInvoiceJobCacheKey(allowWithoutChallan)) || "{}");
    if (!Array.isArray(parsed?.cards)) return [];
    if (Date.now() - Number(parsed.timestamp || 0) > INVOICE_JOB_CACHE_TTL_MS) return [];
    return parsed.cards;
  } catch {
    return [];
  }
};

const writeInvoiceJobCardsCache = (cards, allowWithoutChallan) => {
  try {
    sessionStorage.setItem(
      getInvoiceJobCacheKey(allowWithoutChallan),
      JSON.stringify({
        timestamp: Date.now(),
        cards,
      })
    );
  } catch (error) {
    console.warn("Could not cache invoice job cards", error);
  }
};

const rememberInvoiceStatus = (invoiceNo, status) => {
  const normalizedInvoiceNo = String(invoiceNo || "").trim();
  const normalizedStatus = String(status || "").trim();

  if (!normalizedInvoiceNo || !normalizedStatus) return;

  try {
    const parsed = JSON.parse(localStorage.getItem(INVOICE_STATUS_STORAGE_KEY) || "{}");
    const statusByInvoiceNo = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    statusByInvoiceNo[normalizedInvoiceNo] = normalizedStatus;
    localStorage.setItem(INVOICE_STATUS_STORAGE_KEY, JSON.stringify(statusByInvoiceNo));

    if (normalizedStatus.toLowerCase() !== "final") {
      const legacyParsed = JSON.parse(localStorage.getItem(LEGACY_FINAL_INVOICE_STORAGE_KEY) || "[]");
      if (Array.isArray(legacyParsed)) {
        const updated = legacyParsed.filter(
          (value) => String(value || "").trim().toLowerCase() !== normalizedInvoiceNo.toLowerCase()
        );
        localStorage.setItem(LEGACY_FINAL_INVOICE_STORAGE_KEY, JSON.stringify(updated));
      }
    }
  } catch (error) {
    console.warn("Could not remember invoice status locally", error);
  }
};

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatMoney = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const MONTH_INDEX = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const parseFlexibleDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const dateValue = value?.$date || value;
  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  const text = String(dateValue).trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const shortMonthMatch = text.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{4})$/);
  if (shortMonthMatch) {
    const [, day, monthText, year] = shortMonthMatch;
    const monthIndex = MONTH_INDEX[monthText.slice(0, 3).toLowerCase()];
    if (monthIndex !== undefined) {
      const parsed = new Date(Number(year), monthIndex, Number(day));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  const numericMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (numericMatch) {
    const [, day, month, year] = numericMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateForInput = (value, fallback = "") => {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return fallback;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentLocalIsoDate = () => formatDateForInput(new Date(), new Date().toISOString().split("T")[0]);

const normalizeDimensionUnit = (value) => {
  const unit = String(value || "inch").trim().toLowerCase();
  if (["in", "inch", "inches"].includes(unit)) return "inch";
  if (["nos", "no", "number", "numbers", "qty", "quantity"].includes(unit)) return "nos";
  if (["mm", "millimeter", "millimeters"].includes(unit)) return "mm";
  if (["ft", "foot", "feet"].includes(unit)) return "ft";
  if (["cm", "centimeter", "centimeters"].includes(unit)) return "cm";
  return "inch";
};

const dimensionToInches = (value, unit) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 0;

  switch (normalizeDimensionUnit(unit)) {
    case "nos":
      return 0;
    case "mm":
      return number / 25.4;
    case "cm":
      return number / 2.54;
    case "ft":
      return number * 12;
    default:
      return number;
  }
};

const calculateBillingSqFt = (width, height, qty, unit) => {
  const normalizedUnit = normalizeDimensionUnit(unit);
  const normalizedQty = toNumber(qty) || 1;

  if (normalizedUnit === "nos") return 0;

  const widthInInches = dimensionToInches(width, normalizedUnit);
  const heightInInches = dimensionToInches(height, normalizedUnit);

  if (!widthInInches || !heightInInches) return 0;
  return (widthInInches * heightInInches * normalizedQty) / 144;
};


const groupByKey = (items, keyName) => {
  return items.reduce((acc, item) => {
    const key = item[keyName] || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
};

const calculateInvoiceTotals = (items) => {
  const subTotal = items.reduce((sum, item) => sum + calculatePersistedItemAmount(item), 0);
  const gstTotal = (subTotal * GST_RATE) / 100;

  return {
    SubTotal: subTotal,
    GstRate: GST_RATE,
    GstTotal: gstTotal,
    GrandTotal: subTotal + gstTotal,
  };
};

const calculatePersistedItemAmount = (item) => {
  const savedAmount = toNumber(
    item.InvoiceAmount ??
      item.invoiceAmount ??
      item.InvoiceTaxableValue ??
      item.invoiceTaxableValue ??
      item.TaxableValue ??
      item.taxableValue ??
      item.Amount ??
      item.amount
  );

  if (savedAmount) return savedAmount;

  const qty = toNumber(item.InvoiceQty ?? item.invoiceQty ?? item.Qty ?? item.qty) || 1;
  const width = toNumber(
    item.InvoiceBillingWidth ??
      item.invoiceBillingWidth ??
      item.BillingWidth ??
      item.billingWidth ??
      item.InvoiceWidth ??
      item.invoiceWidth ??
      item.Width ??
      item.width
  );
  const height = toNumber(
    item.InvoiceBillingHeight ??
      item.invoiceBillingHeight ??
      item.BillingHeight ??
      item.billingHeight ??
      item.InvoiceHeight ??
      item.invoiceHeight ??
      item.Height ??
      item.height ??
      item.Length ??
      item.length
  );
  const rate = toNumber(item.InvoiceRate ?? item.invoiceRate ?? item.Rate ?? item.rate);
  const totalSqFt = toNumber(item.InvoiceTotalSqFt ?? item.invoiceTotalSqFt ?? item.TotalSqFt ?? item.totalSqFt);
  const unit = normalizeDimensionUnit(
    item.InvoiceUnit ??
      item.invoiceUnit ??
      item.Unit ??
      item.unit ??
      item.UOM ??
      item.uom
  );
  const lineType = String(item.Type ?? item.type ?? item.lineType ?? "").toLowerCase();
  const sqft = totalSqFt || calculateBillingSqFt(width, height, qty, unit);

  if (isChargeLineType(lineType) && !sqft) return qty * rate;
  return sqft * rate;
};

const mapInvoiceAddress = (addresses) =>
  addresses.map((address) => ({
    Label: toText(address.label),
    Title: toText(address.label),
    CustomerName: toText(address.name),
    Address: toText(address.address),
    GstNo: toText(address.gstNo),
  }));


const joinUnique = (values, separator = ", ") =>
  [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))].join(separator);

// Location fields can arrive pre-joined from different API sources. Split them
// before merging so branches such as East are not repeated in the UI.
const joinUniqueLocations = (values, separator = ", ") => {
  const locations = new Map();

  (values || []).forEach((value) => {
    String(value || "")
      .split(/[,;|]+/)
      .map((location) => location.trim())
      .filter(Boolean)
      .forEach((location) => {
        const key = normalizeCompare(location);
        if (!locations.has(key)) locations.set(key, location);
      });
  });

  return [...locations.values()].join(separator);
};

// A job card can aggregate many challans. Its billing location may therefore
// be a comma-separated display value, but an invoice must use one real branch.
const getPrimaryBillingLocation = (...values) => {
  for (const value of values) {
    const location = String(value || "")
      .split(/[,;|]+/)
      .map((entry) => entry.trim())
      .find(Boolean);
    if (location) return location;
  }
  return "";
};

const normalizeAddressKey = (address = {}) =>
  [
    address?.name || address?.CustomerName || "",
    address?.address || address?.Address || "",
    address?.gstNo || address?.GstNo || "",
  ]
    .map((value) => normalizeCompare(value))
    .join("|");

const dedupeInvoiceAddresses = (addresses = []) => {
  const seen = new Set();
  return (Array.isArray(addresses) ? addresses : []).filter((address) => {
    const key = normalizeAddressKey(address);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const areAddressListsEquivalent = (left = [], right = []) => {
  const leftKeys = (Array.isArray(left) ? left : []).map(normalizeAddressKey).filter(Boolean);
  const rightKeys = (Array.isArray(right) ? right : []).map(normalizeAddressKey).filter(Boolean);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key, index) => key === rightKeys[index]);
};

const isWeakAddressText = (value, relatedValues = []) => {
  const text = String(value || "").trim();
  if (!text) return true;

  const segments = splitAddressSegments(text);
  if (segments.length > 1) return false;

  const normalizedText = normalizeCompare(text);
  if (!normalizedText) return true;

  const relatedMatches = relatedValues
    .map((entry) => normalizeCompare(entry))
    .filter(Boolean);

  if (relatedMatches.includes(normalizedText)) return true;
  if (!/\d/.test(text) && normalizedText.length <= 12) return true;
  return false;
};

const pickPreferredAddressValue = (existingAddress = {}, fallbackAddress = {}) => {
  if (existingAddress._manualAddress) {
    return firstNonEmpty(existingAddress.address, existingAddress.Address, fallbackAddress.address, fallbackAddress.Address);
  }

  const existingValue = firstNonEmpty(existingAddress.address, existingAddress.Address);
  const fallbackValue = firstNonEmpty(fallbackAddress.address, fallbackAddress.Address);
  if (!existingValue) return fallbackValue;
  if (!fallbackValue) return existingValue;

  const relatedValues = [
    existingAddress.name,
    existingAddress.label,
    fallbackAddress.name,
    fallbackAddress.label,
  ];

  return isWeakAddressText(existingValue, relatedValues) ? fallbackValue : existingValue;
};

const pickPreferredNameValue = (existingAddress = {}, fallbackAddress = {}) => {
  if (existingAddress._manualName) {
    return firstNonEmpty(existingAddress.name, existingAddress.CustomerName, fallbackAddress.name, fallbackAddress.CustomerName);
  }

  const existingValue = firstNonEmpty(existingAddress.name, existingAddress.CustomerName);
  const fallbackValue = firstNonEmpty(fallbackAddress.name, fallbackAddress.CustomerName);
  if (!existingValue) return fallbackValue;
  if (!fallbackValue) return existingValue;

  const relatedValues = [
    existingAddress.address,
    fallbackAddress.address,
    existingAddress.label,
    fallbackAddress.label,
  ];

  return isWeakAddressText(existingValue, relatedValues) ? fallbackValue : existingValue;
};

const withShipToFallbacks = (shipTo = {}, billTo = {}) => ({
  ...shipTo,
  name: pickPreferredNameValue(shipTo, billTo),
  address: pickPreferredAddressValue(shipTo, billTo),
  gstNo: shipTo._manualGstNo
    ? firstNonEmpty(shipTo.gstNo, billTo.gstNo)
    : firstNonEmpty(shipTo.gstNo, billTo.gstNo),
});

const mergeAddressLists = (current = [], fallback = []) => {
  const currentList = Array.isArray(current) ? current : [];
  const fallbackList = Array.isArray(fallback) ? fallback : [];

  return fallbackList.map((fallbackAddress, index) => {
    const existingAddress = currentList[index];
    if (!existingAddress) return fallbackAddress;

    return {
      ...fallbackAddress,
      ...existingAddress,
      label: firstNonEmpty(existingAddress.label, fallbackAddress.label),
      name: existingAddress._manualName
        ? firstNonEmpty(existingAddress.name, fallbackAddress.name)
        : pickPreferredNameValue(existingAddress, fallbackAddress),
      address: pickPreferredAddressValue(existingAddress, fallbackAddress),
      gstNo: existingAddress._manualGstNo
        ? firstNonEmpty(existingAddress.gstNo, fallbackAddress.gstNo)
        : firstNonEmpty(existingAddress.gstNo, fallbackAddress.gstNo),
    };
  });
};

const buildDefaultShipToAddresses = (billTo = []) =>
  (Array.isArray(billTo) ? billTo : []).map((address, index) => ({
    ...address,
    id: uid("address"),
    label: String(address?.label || `Bill To ${index + 1}`).replace(/^Bill To/i, "Ship To"),
  }));

const mergeLiveAddressLists = (current = [], next = []) => {
  const currentList = Array.isArray(current) ? current : [];
  const nextList = Array.isArray(next) ? next : [];

  return nextList.map((nextAddress, index) => {
    const currentAddress = currentList[index];
    if (!currentAddress) return nextAddress;

    return {
      ...nextAddress,
      ...currentAddress,
      label: firstNonEmpty(currentAddress.label, nextAddress.label),
      name: currentAddress._manualName
        ? firstNonEmpty(currentAddress.name, nextAddress.name)
        : firstNonEmpty(nextAddress.name, currentAddress.name),
      address: currentAddress._manualAddress
        ? firstNonEmpty(currentAddress.address, nextAddress.address)
        : firstNonEmpty(nextAddress.address, currentAddress.address),
      gstNo: currentAddress._manualGstNo
        ? firstNonEmpty(currentAddress.gstNo, nextAddress.gstNo)
        : firstNonEmpty(nextAddress.gstNo, currentAddress.gstNo),
    };
  });
};

const hasManualAddressOverride = (addresses = []) =>
  (Array.isArray(addresses) ? addresses : []).some(
    (address) => address?._manualName || address?._manualAddress || address?._manualGstNo
  );

const resolveDraftAddressField = (draftAddress = {}, currentAddress = {}, sourceSnapshot = {}, field, manualFlag) => {
  if (draftAddress?.[manualFlag]) {
    return firstNonEmpty(draftAddress?.[field], currentAddress?.[field], sourceSnapshot?.[field]);
  }

  const draftValue = firstNonEmpty(draftAddress?.[field]);
  const currentValue = firstNonEmpty(currentAddress?.[field]);
  const snapshotValue = firstNonEmpty(sourceSnapshot?.[field]);

  if (!draftValue) return currentValue || snapshotValue;
  if (!currentValue) return draftValue || snapshotValue;

  if (snapshotValue && normalizeCompare(draftValue) === normalizeCompare(snapshotValue)) {
    return currentValue;
  }

  return currentValue || draftValue;
};

const mergeDraftAddressLists = (draftAddresses = [], currentAddresses = [], sourceSnapshotAddresses = []) => {
  const draftList = Array.isArray(draftAddresses) ? draftAddresses : [];
  const currentList = Array.isArray(currentAddresses) ? currentAddresses : [];
  const snapshotList = Array.isArray(sourceSnapshotAddresses) ? sourceSnapshotAddresses : [];
  const length = Math.max(currentList.length, draftList.length, snapshotList.length);

  return Array.from({ length }, (_, index) => {
    const draftAddress = draftList[index] || {};
    const currentAddress = currentList[index] || {};
    const sourceSnapshot = snapshotList[index] || {};

    return {
      ...currentAddress,
      ...draftAddress,
      label: firstNonEmpty(draftAddress.label, currentAddress.label, sourceSnapshot.label),
      name: resolveDraftAddressField(draftAddress, currentAddress, sourceSnapshot, "name", "_manualName"),
      address: resolveDraftAddressField(draftAddress, currentAddress, sourceSnapshot, "address", "_manualAddress"),
      gstNo: resolveDraftAddressField(draftAddress, currentAddress, sourceSnapshot, "gstNo", "_manualGstNo"),
    };
  }).filter((address) => normalizeAddressKey(address) || firstNonEmpty(address?.label));
};

const getRowValue = (row, ...keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

const isTruthyFlag = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const normalizeLocationName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();

const getEffectiveBillingLocation = (item, fallbackBillingLocation = "") =>
  firstNonEmpty(
    item?.BillingLocation || item?.billingLocation || item?.billinglocation,
    fallbackBillingLocation
  );

const getComparableBranchKey = (value) => {
  const branchDetails = getCompanyBranchDetails(value);
  const companyName = normalizeLocationName(branchDetails?.companyName || "");
  return companyName || normalizeLocationName(value);
};

const isDifferentProductionBillingLocation = (item, fallbackBillingLocation = "") => {
  const productionLocation = getComparableBranchKey(
    item?.ProductionLocation || item?.productionLocation || item?.productionlocation
  );
  const billingLocation = getComparableBranchKey(getEffectiveBillingLocation(item, fallbackBillingLocation));

  return Boolean(productionLocation && billingLocation && productionLocation !== billingLocation);
};

const getRowJobNo = (row) =>
  getRowValue(
    row,
    "comartjobno",
    "comartJobNo",
    "ComartJobNo",
    "COMARTJOBNO",
    "jobNo",
    "jobno",
    "JobNo",
    "jobNumber",
    "JobNumber",
    "jobNoDisplay",
    "JobNoDisplay",
    "Job No",
    "JOB NO",
    "Job No."
  );
const splitAddressSegments = (value) =>
  String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
const sanitizeAddressSegment = (value) =>
  String(value || "")
    .replace(/\bPAN\s*:\s*[A-Z0-9]{10}\b/gi, "")
    .replace(/\bGST\s*(?:No\.?|IN)?\s*:?\s*[0-9A-Z]{15}\b/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ", ")
    .trim()
    .replace(/^[, ]+|[, ]+$/g, "");
const getRowClient = (row) => getRowValue(row, "client", "Client", "customerName", "CustomerName", "subClient", "SubClient");
const getRowStore = (row) => getRowValue(row, "store", "storeName", "StoreName", "salonAddress", "SalonAddress", "city", "City");
const getRowStoreName = (row) =>
  firstNonEmpty(
    getRowValue(row, "store", "storeName", "StoreName", "storeDisplayName", "StoreDisplayName"),
    splitAddressSegments(
      getRowValue(row, "salonAddress", "SalonAddress", "dispatchAddress", "DispatchAddress")
    )[0]
  );
const getShipToAddress = (row) =>
  splitAddressSegments(
    getRowValue(
      row,
      "salonAddress",
      "SalonAddress",
      "dispatchAddress",
      "DispatchAddress",
      "storeAddress",
      "storeAddress",
      "StoreAddress",
      "Storeaddress",
      "address",
      "Address",
      "customerAddress",
      "CustomerAddress"
    )
  )
    .map(sanitizeAddressSegment)
    .filter((line) => line && !/^pan\b/i.test(line) && !/^gst/i.test(line))
    .join("\n");
const getRowAddress = (row) =>
  splitAddressSegments(
    getRowValue(
      row,
      "dispatchAddress",
      "DispatchAddress",
      "customerAddress",
      "CustomerAddress",
      "salonAddress",
      "SalonAddress",
      "storeAddress",
      "StoreAddress"
    )
  )
    .map(sanitizeAddressSegment)
    .filter((line) => line && !/^pan\b/i.test(line) && !/^gst/i.test(line))
    .join("\n");
const getRowDescription = (row) =>
  (isPlaceholderDescription(getPreferredDescription(row))
    ? firstNonEmpty(
        getRowValue(row, "visualCode", "VisualCode"),
        getRowValue(row, "media", "Media", "externalMedia", "ExternalMedia", "internalMedia", "InternalMedia")
      )
    : getPreferredDescription(row)) || "Media";

const getRowMedia = (row) => getRowValue(row, "media", "Media", "externalMedia", "ExternalMedia", "internalMedia", "InternalMedia");
const getRowRegion = (row) => getRowValue(row, "region", "Region", "productionLocation", "ProductionLocation");
const getRowChallanDate = (row) =>
  getRowValue(
    row,
    "challanDate",
    "ChallanDate",
    "deliveryChallanDate",
    "DeliveryChallanDate",
    "implementationChallanDate",
    "ImplementationChallanDate"
  );
const getRowPoNo = (row) => getRowValue(row, "poNo", "PoNo", "PONo", "poNumber", "PoNumber", "PO No", "PO");
const getRowPoDate = (row) => getRowValue(row, "poDate", "PoDate", "PODate", "poDateUtc", "PoDateUtc");

const getChallanMeta = (row) => {
  const deliveryId = getRowValue(row, "deliveryChallanId", "DeliveryChallanId", "challanId", "ChallanId");
  const deliveryNo = getRowValue(row, "deliveryChallanNo", "DeliveryChallanNo", "challanNo", "ChallanNo");
  const implementationId = getRowValue(row, "implementationChallanId", "ImplementationChallanId", "challanId", "ChallanId");
  const implementationNo = getRowValue(row, "implementationChallanNo", "ImplementationChallanNo", "challanNo", "ChallanNo");
  const deliveryCreated = getRowValue(row, "isDeliveryChallanCreated", "IsDeliveryChallanCreated");
  const implementationCreated = getRowValue(row, "isImplementationChallanCreated", "IsImplementationChallanCreated");

  return {
    id: deliveryId || implementationId,
    no: deliveryNo || implementationNo,
    isCreated: Boolean(
      row?._fromGetRecordsByChallan ||
        deliveryId ||
        deliveryNo ||
        implementationId ||
        implementationNo ||
        isTruthyFlag(deliveryCreated) ||
        isTruthyFlag(implementationCreated)
    ),
  };
};

const isDeliveryDone = (row) =>
  Boolean(
    isTruthyFlag(getRowValue(row, "isDeliveryDone", "IsDeliveryDone")) ||
      getRowValue(row, "deliveryTimestampUtc", "DeliveryTimestampUtc", "deliveryTimestamp", "DeliveryTimestamp")
  );

const isImplementationDone = (row) =>
  Boolean(
    isTruthyFlag(getRowValue(row, "isImplementationDone", "IsImplementationDone")) ||
      getRowValue(row, "implementationTimestampUtc", "ImplementationTimestampUtc", "implementationTimestamp", "ImplementationTimestamp")
  );

const getUserContext = () => {
  try {
    const user = JSON.parse(localStorage.getItem("users") || "{}")?.message || {};
    return {
      username: user.username || user.userName || "",
      locationId: user.location_id || user.locationId || "",
      roleName: user.rolE_NAME || user.roleName || user.ROLE_NAME || "",
    };
  } catch (error) {
    console.error("Failed to read logged in user", error);
    return { username: "", locationId: "", roleName: "" };
  }
};

const getResponseRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.items?.$values)) return data.items.$values;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (Array.isArray(data?.data?.items?.$values)) return data.data.items.$values;
  if (Array.isArray(data?.result?.$values)) return data.result.$values;
  if (Array.isArray(data?.message?.$values)) return data.message.$values;
  return [];
};

const dedupeRows = (rows, getKey) => {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter((row, index) => {
    const key = String(
      typeof getKey === "function"
        ? getKey(row, index)
        : row?.id || row?._id || row?.JobNo || row?.jobNo || row?.jobCardNo || row?.JobCardNo || index
    ).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const text = toText(value).trim();
    if (text) return text;
  }
  return "";
};
const isPlaceholderDescription = (value) => {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  if (!normalized) return true;
  if (normalized === "yes" || normalized === "no") return true;

  return /^(yes|no)(\s*[-,\/|]\s*(yes|no))+$/i.test(normalized);
};

const getPreferredDescription = (row = {}) =>

  firstNonEmpty(

    row?.simplifiedProductName,
    row?.SimplifiedProductName,
    row?.productName,
    row?.ProductName,
    row?.product,
    row?.Product,
    row?.description,
    row?.Description,
    row?.details,
    row?.Details,
    row?.nameSubCode,
    row?.NameSubCode,
    row?.media,
    row?.Media,
    row?.externalMedia,
    row?.ExternalMedia,
    row?.internalMedia,
    row?.InternalMedia
  ).trim();

const getInvoiceDescription = (row = {}) => {
  const simplified = firstNonEmpty(row?.simplifiedProductName, row?.SimplifiedProductName);
  if (simplified) return simplified;

  const fallback = firstNonEmpty(
    row?.description,
    row?.Description,
    row?.details,
    row?.Details,
    row?.nameSubCode,
    row?.NameSubCode,
    row?.media,
    row?.Media
  );

  return fallback.replace(/\s*-\s*(yes|no)\s*$/i, "").trim() || fallback;
};

const getCsSourceDescription = (row = {}) =>
  firstNonEmpty(
    row?.simplifiedProductName,
    row?.SimplifiedProductName,
    row?.description,
    row?.Description,
    row?.details,
    row?.Details,
    row?.nameSubCode,
    row?.NameSubCode,
    row?.productName,
    row?.ProductName,
    row?.product,
    row?.Product
  ).trim();

const getCsBillingWidth = (row = {}) =>
  firstNonEmpty(
    row?.billingWidth,
    row?.BillingWidth,
    row?.["Billing Width"],
    row?.width,
    row?.Width,
    ""
  );

const getCsBillingHeight = (row = {}) =>
  firstNonEmpty(
    row?.billingHeight,
    row?.BillingHeight,
    row?.["Billing Height"],
    row?.height,
    row?.Height,
    row?.length,
    row?.Length,
    ""
  );

const normalizeLookupText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

function resolveRateMasterDescription(row = {}, rateRows = []) {
  const matchedRate = resolveRateMasterRow(row, rateRows);

  return firstNonEmpty(
    matchedRate?.simplifiedProductName,
    matchedRate?.SimplifiedProductName,
    matchedRate?.productAsPerRateCard,
    matchedRate?.ProductAsPerRateCard,
    row?.simplifiedProductName,
    row?.SimplifiedProductName,
    row?.productAsPerRateCard,
    row?.ProductAsPerRateCard,
    row?.description,
    row?.Description,
    row?.details,
    row?.Details,
    row?.nameSubCode,
    row?.NameSubCode
  );
}

const getRateMasterRowId = (row = {}) =>
  firstNonEmpty(
    row?.id,
    row?._id,
    row?.productMediaRateMasterId,
    row?.ProductMediaRateMasterId,
    row?.productMediaRateMasterID,
    row?.ProductMediaRateMasterID,
    row?.rateId,
    row?.RateId
  );

const getRateMasterRowDescription = (row = {}) =>
  firstNonEmpty(
    row?.simplifiedProductName,
    row?.SimplifiedProductName,
    row?.productAsPerRateCard,
    row?.ProductAsPerRateCard,
    row?.description,
    row?.Description,
    row?.details,
    row?.Details,
    row?.nameSubCode,
    row?.NameSubCode
  );

const getRateMasterRowMedia = (row = {}) =>
  firstNonEmpty(
    row?.media,
    row?.Media,
    row?.externalMedia,
    row?.ExternalMedia,
    row?.internalMedia,
    row?.InternalMedia
  );

const getRateMasterRowRate = (row = {}) =>
  firstNonEmpty(
    row?.ratePerSqft,
    row?.RatePerSqft,
    row?.ratePerPsfPu,
    row?.RatePerPsfPu,
    row?.rate,
    row?.Rate
  );

const resolveRateMasterRow = (row = {}, rateRows = []) => {
  const rowProductRateId = firstNonEmpty(
    row?.productrateId,
    row?.ProductrateId,
    row?.productRateId,
    row?.ProductRateId,
    row?.productRateMasterId,
    row?.ProductRateMasterId,
    row?.rateMasterId,
    row?.RateMasterId
  );
  const rowPanNo = normalizePanCard(
    firstNonEmpty(
      row?.panNo,
      row?.panCard,
      row?.PanCard,
      row?.PANNo,
      row?.PAN_NO,
      row?.pannumber,
      row?.Pannumber
    )
  );
  const rowCustomerName = normalizeLookupText(
    firstNonEmpty(row?.customerName, row?.CustomerName, row?.client, row?.Client)
  );
  const rowDescription = normalizeLookupText(
    firstNonEmpty(
      getRateMasterRowDescription(row),
      resolveRateMasterDescriptionFallback(row),
      getInvoiceDescription(row),
      getCsSourceDescription(row)
    )
  );
  const rowMedia = normalizeLookupText(
    firstNonEmpty(getRateMasterRowMedia(row), getRowMedia(row))
  );

  let bestMatch = null;
  let bestScore = -1;

  (Array.isArray(rateRows) ? rateRows : []).forEach((rateRow) => {
    const rateId = normalizeLookupText(getRateMasterRowId(rateRow));
    const ratePanNo = normalizePanCard(
      firstNonEmpty(rateRow?.panNo, rateRow?.PanNo, rateRow?.PANNo, rateRow?.PAN_NO, rateRow?.panCard, rateRow?.PAN)
    );
    const rateCustomerName = normalizeLookupText(
      firstNonEmpty(rateRow?.customerName, rateRow?.CustomerName, rateRow?.client, rateRow?.Client)
    );
    const rateDescription = normalizeLookupText(getRateMasterRowDescription(rateRow));
    const rateMedia = normalizeLookupText(getRateMasterRowMedia(rateRow));

    let score = 0;

    if (rowProductRateId && rateId && rateId === normalizeLookupText(rowProductRateId)) score += 100;
    if (rowDescription && rateDescription && rowDescription === rateDescription) score += 40;
    if (rowMedia && rateMedia && rowMedia === rateMedia) score += 30;
    if (rowPanNo && ratePanNo && rowPanNo === ratePanNo) score += 20;
    if (rowCustomerName && rateCustomerName && rowCustomerName === rateCustomerName) score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = rateRow;
    }
  });

  return bestScore > 0 ? bestMatch : null;
};

const resolveRateMasterDescriptionFallback = (row = {}) =>
  firstNonEmpty(
    row?.productAsPerRateCard,
    row?.ProductAsPerRateCard,
    row?.description,
    row?.Description,
    row?.details,
    row?.Details,
    row?.nameSubCode,
    row?.NameSubCode,
    row?.simplifiedProductName,
    row?.SimplifiedProductName
  );

const resolveRateMasterRate = (row = {}, rateRows = []) =>
  firstNonEmpty(getRateMasterRowRate(resolveRateMasterRow(row, rateRows)));



const normalizeStateText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getStateCodeFromGst = (value) => {
  const match = firstNonEmpty(value).match(/^([0-9]{2})[0-9A-Z]{13}$/i);
  return match?.[1] || "";
};

const getStateCodeFromText = (...values) => {
  const text = normalizeStateText(values.filter(Boolean).join(" "));
  if (!text) return "";

  for (const [code, aliases] of Object.entries(GST_STATE_ALIASES)) {
    if (aliases.some((alias) => text.includes(alias))) return code;
  }

  return "";
};

const getStateCode = ({ gstNo, address, placeOfSupply }) =>
  getStateCodeFromGst(gstNo) || getStateCodeFromText(placeOfSupply, address);

const getSavedInvoiceNoFromResponse = (responseData) => {
  const directInvoiceNo = firstNonEmpty(
    responseData?.customerInvoiceNo,
    responseData?.CustomerInvoiceNo,
    responseData?.invoiceNo,
    responseData?.InvoiceNo,
    responseData?.data?.customerInvoiceNo,
    responseData?.data?.CustomerInvoiceNo,
    responseData?.data?.invoiceNo,
    responseData?.data?.InvoiceNo,
    responseData?.customerInvoice?.invoiceNo,
    responseData?.customerInvoice?.InvoiceNo,
    responseData?.CustomerInvoice?.invoiceNo,
    responseData?.CustomerInvoice?.InvoiceNo,
    responseData?.data?.customerInvoice?.invoiceNo,
    responseData?.data?.customerInvoice?.InvoiceNo,
    responseData?.data?.CustomerInvoice?.invoiceNo,
    responseData?.data?.CustomerInvoice?.InvoiceNo,
    typeof responseData === "string" ? responseData : ""
  );

  return directInvoiceNo;
};

const getSavedInvoiceId = (invoice = {}) =>
  firstNonEmpty(
    invoice?.id,
    invoice?._id,
    invoice?.invoiceId,
    invoice?.InvoiceId,
    invoice?.customerInvoice?.id,
    invoice?.customerInvoice?._id,
    invoice?.customerInvoice?.invoiceId,
    invoice?.customerInvoice?.InvoiceId,
    invoice?.CustomerInvoice?.id,
    invoice?.CustomerInvoice?._id,
    invoice?.CustomerInvoice?.invoiceId,
    invoice?.CustomerInvoice?.InvoiceId,
    invoice?.data?.id,
    invoice?.data?._id,
    invoice?.data?.invoiceId,
    invoice?.data?.InvoiceId
  );

const addInvoiceNoToPreviewPayload = (previewPayload, invoiceNo) => ({
  ...previewPayload,
  invoiceNo,
  InvoiceNo: invoiceNo,
  CustomerInvoiceNo: invoiceNo,
  _invoiceNo: invoiceNo,
});

const getInvoiceUpdatedTime = (invoice) => {
  const dateValue =
    invoice?.Lstupdatedt ||
    invoice?.lstupdatedt ||
    invoice?.Entereddat ||
    invoice?.entereddat ||
    invoice?.InvoiceDate ||
    invoice?.invoiceDate;
  const time = parseFlexibleDate(dateValue)?.getTime();
  return Number.isFinite(time) ? time : 0;
};

// The API stores customer invoices as "Tax Invoice", while some older rows
// use "Billing To Customer". Both must be considered when reopening a draft.
const isCustomerInvoiceType = (value) => {
  const invoiceType = normalizeCompare(value);
  return !invoiceType || ["billingtocustomer", "taxinvoice", "customerinvoice", "salesinvoice"].includes(invoiceType);
};

const findSavedCustomerInvoiceNo = async ({ jobCardNo, clientName, grandTotal }) => {
  const response = await axios.post(
    config.SalesInvoice.URL.GetAll,
    {},
    {
      timeout: 10000,
      headers: { "Content-Type": "application/json" },
    }
  );
  const normalizedJobNo = normalizeCompare(jobCardNo);
  const normalizedClient = normalizeCompare(clientName);
  const rows = getResponseRows(response.data);

  const matches = rows.filter((row) => {
    const invoiceType = normalizeCompare(row?.InvoiceType || row?.invoiceType);
    const rowJobNo = normalizeCompare(row?.JobCards || row?.jobCards);
    const rowClient = normalizeCompare(row?.ClientBillAs || row?.clientBillAs);
    const rowGrandTotal = toNumber(row?.GrandTotal || row?.grandTotal);

    return (
      isCustomerInvoiceType(invoiceType) &&
      (!normalizedJobNo || rowJobNo === normalizedJobNo) &&
      (!normalizedClient || rowClient === normalizedClient) &&
      (!grandTotal || Math.abs(rowGrandTotal - grandTotal) < 0.01)
    );
  });

  const matched = matches.sort((left, right) => getInvoiceUpdatedTime(right) - getInvoiceUpdatedTime(left))[0];
  return firstNonEmpty(matched?.InvoiceNo, matched?.invoiceNo, matched?.CustomerInvoiceNo, matched?.customerInvoiceNo);
};

const findLatestDraftInvoiceByJobCards = async (jobCardNos = []) => {
  const normalizedJobNos = [...new Set((Array.isArray(jobCardNos) ? jobCardNos : []).map(normalizeCompare).filter(Boolean))].sort();
  if (!normalizedJobNos.length) return null;

  const response = await axios.post(
    config.SalesInvoice.URL.GetAll,
    {},
    {
      timeout: 10000,
      headers: { "Content-Type": "application/json" },
    }
  );

  const rows = getResponseRows(response.data);
  const matches = rows.filter((row) => {
    const status = normalizeCompare(row?.Status || row?.status || row?.InvoiceStatus || row?.invoiceStatus || (row?.IsFinal || row?.isFinal ? "Final" : "Draft"));
    if (status !== "draft") return false;

    if (!isCustomerInvoiceType(row?.InvoiceType || row?.invoiceType)) return false;

    const rowJobNos = [...new Set(splitJobNoValues(row?.JobCards || row?.jobCards).map(normalizeCompare).filter(Boolean))].sort();
    if (rowJobNos.length !== normalizedJobNos.length) return false;
    return rowJobNos.every((value, index) => value === normalizedJobNos[index]);
  });

  const matched = matches.sort((left, right) => getInvoiceUpdatedTime(right) - getInvoiceUpdatedTime(left))[0];
  if (!matched) return null;

  const invoiceNo = firstNonEmpty(matched?.InvoiceNo, matched?.invoiceNo, matched?.CustomerInvoiceNo, matched?.customerInvoiceNo);
  if (!invoiceNo || !config.SalesInvoice.URL.GetByInvoiceNo) return matched;

  const detailResponse = await axios.get(config.SalesInvoice.URL.GetByInvoiceNo(invoiceNo), {
    timeout: INVOICE_BACKGROUND_API_TIMEOUT_MS,
  });

  return (
    detailResponse?.data?.customerInvoice ||
    detailResponse?.data?.CustomerInvoice ||
    detailResponse?.data?.invoice ||
    detailResponse?.data?.Invoice ||
    detailResponse?.data?.data?.customerInvoice ||
    detailResponse?.data?.data?.CustomerInvoice ||
    detailResponse?.data
  );
};

const createEmptyAddress = (label) => ({
  id: uid("address"),
  label,
  name: "",
  address: "",
  gstNo: "",
});

const createEmptyEwayBill = () => ({
  transporterName: "",
  transportMode: "Road",
  modeOfTransportation: "Road",
  transportDistanceKm: "",
  distanceOfTransportation: "",
  vehicleNo: "",
  transporterGstNo: "",
});

const normalizeEwayBillDetails = (invoiceData = {}) => {
  const ewayBill =
    invoiceData.ewayBill ||
    invoiceData.EwayBill ||
    invoiceData.EWayBill ||
    invoiceData.EwayBillDetails ||
    invoiceData.EWayBillDetails ||
    {};
  const rawTransportMode = firstNonEmpty(ewayBill.transportMode, ewayBill.TransportMode, invoiceData.transportMode, invoiceData.TransportMode, "Road");
  const rawModeOfTransportation = firstNonEmpty(
    ewayBill.modeOfTransportation,
    ewayBill.ModeOfTransportation,
    invoiceData.modeOfTransportation,
    invoiceData.ModeOfTransportation,
    rawTransportMode
  );
  const transportMode = TRANSPORT_MODES.find((mode) => mode.toLowerCase() === rawModeOfTransportation.toLowerCase()) || rawModeOfTransportation || "Road";

  return {
    transporterName: firstNonEmpty(
      ewayBill.transporterName,
      ewayBill.TransporterName,
      invoiceData.transporterName,
      invoiceData.TransporterName,
      invoiceData.transport,
      invoiceData.Transport,
      invoiceData.TransportName
    ),
    transportMode,
    transportDistanceKm: firstNonEmpty(
      ewayBill.transportDistanceKm,
      ewayBill.TransportDistanceKm,
      ewayBill.TransportationDistanceKm,
      ewayBill.distanceOfTransportation,
      ewayBill.DistanceOfTransportation,
      invoiceData.transportDistanceKm,
      invoiceData.TransportDistanceKm,
      invoiceData.TransportationDistanceKm,
      invoiceData.distanceOfTransportation,
      invoiceData.DistanceOfTransportation
    ),
    vehicleNo: firstNonEmpty(ewayBill.vehicleNo, ewayBill.VehicleNo, invoiceData.vehicleNo, invoiceData.VehicleNo),
    transporterGstNo: firstNonEmpty(
      ewayBill.transporterGstNo,
      ewayBill.TransporterGstNo,
      ewayBill.TransporterGSTNo,
      invoiceData.transporterGstNo,
      invoiceData.TransporterGstNo,
      invoiceData.TransporterGSTNo,
      invoiceData.transportId,
      invoiceData.TransportId
    ),
  };
};

const buildEwayBillPayload = (ewayBill = {}) => {
  const transportDetails = {
    transporterName: ewayBill.transporterName || "",
    transportMode: ewayBill.transportMode || "Road",
    modeOfTransportation: ewayBill.transportMode || "Road",
    transportDistanceKm: ewayBill.transportDistanceKm || "",
    distanceOfTransportation: ewayBill.transportDistanceKm || "",
    vehicleNo: ewayBill.vehicleNo || "",
    transporterGstNo: ewayBill.transporterGstNo || "",
  };

  return {
    EwayBillDetails: transportDetails,
    EWayBillDetails: transportDetails,
    ewayBill: transportDetails,

    TransporterName: transportDetails.transporterName,
    transporterName: transportDetails.transporterName,

    TransportMode: transportDetails.transportMode,
    transportMode: transportDetails.transportMode,
    ModeOfTransportation: transportDetails.modeOfTransportation,
    modeOfTransportation: transportDetails.modeOfTransportation,

    TransportationDistanceKm: transportDetails.transportDistanceKm,
    transportDistanceKm: transportDetails.transportDistanceKm,
    DistanceOfTransportation: transportDetails.distanceOfTransportation,
    distanceOfTransportation: transportDetails.distanceOfTransportation,

    VehicleNo: transportDetails.vehicleNo,
    vehicleNo: transportDetails.vehicleNo,

    TransporterGstNo: transportDetails.transporterGstNo,
    transporterGstNo: transportDetails.transporterGstNo,
    TransporterGSTNo: transportDetails.transporterGstNo,

    TransportId: transportDetails.transporterGstNo,
    transportId: transportDetails.transporterGstNo,
  };
};

const rememberEwayBillDetails = (invoiceNo, ewayBill) => {
  const normalizedInvoiceNo = String(invoiceNo || "").trim();
  if (!normalizedInvoiceNo) return;

  try {
    const parsed = JSON.parse(localStorage.getItem(INVOICE_EWAY_STORAGE_KEY) || "{}");
    const ewayByInvoiceNo = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    ewayByInvoiceNo[normalizedInvoiceNo.toLowerCase()] = normalizeEwayBillDetails(ewayBill);
    localStorage.setItem(INVOICE_EWAY_STORAGE_KEY, JSON.stringify(ewayByInvoiceNo));
  } catch (error) {
    console.warn("Could not remember E-way bill details locally", error);
  }
};

const getChargeDescription = (lineType) => {
  const normalized = String(lineType || "").toLowerCase();
  if (normalized === "installation") return "Installation Charges";
  if (normalized === "implementation") return "Implementation Charges";
  if (normalized === "layouting") return "Layouting Charges";
  if (normalized === "transportation" || normalized === "transport") return "Transportation Charges";
  if (normalized === "adaption" || normalized === "adaptation") return "Adaption Charges";
  return "";
};

const isChargeLineType = (lineType) =>
  ["installation", "implementation", "layouting", "transportation", "transport", "adaption", "adaptation", "charge"].includes(
    String(lineType || "").trim().toLowerCase()
  );

const createEmptyItem = (lineType = "media", jobNo = "") => ({
  id: uid("item"),
  selected: false,
  groupByMedia: false,
  jobNo,
  lineType,
  description: getChargeDescription(lineType),
  media: isChargeLineType(lineType) ? "Charges" : "",
  hsnCode: "",
  qty: isChargeLineType(lineType) ? 1 : "",
  unit: "",
  width: "",
  height: "",
  billingWidth: "",
  billingHeight: "",
  rate: "",
  manualAmount: "",
});

const createInitialData = () => ({
  invoiceId: "",
  invoiceNo: "",
  invoiceDate: getCurrentLocalIsoDate(),
  itrNo: "",
  jobCardNo: "",
  selectedJobIds: [],
  allowWithoutChallan: false,
  billFromLocation: "",
  billToLocked: false,
  shipToLocked: false,
  billTo: [createEmptyAddress("Bill To 1")],
  shipTo: [createEmptyAddress("Ship To 1")],
  items: [createEmptyItem("media")],
  groupByMedia: false,
  groupByStore: false,
  groupByCity: false,
  groupByDescription: false,
  ewayBill: createEmptyEwayBill(),
});

const mapPersistedAddressToDraft = (address = {}, index = 0, prefix = "Address") => ({
  id: uid("address"),
  label: firstNonEmpty(address?.label, address?.Label, address?.title, address?.Title, `${prefix} ${index + 1}`),
  name: firstNonEmpty(address?.customerName, address?.CustomerName, address?.name, address?.Name),
  address: firstNonEmpty(address?.address, address?.Address),
  gstNo: firstNonEmpty(address?.gstNo, address?.GstNo, address?.GSTNo),
  _manualName: true,
  _manualAddress: true,
  _manualGstNo: true,
});

const parseSavedInvoiceItems = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.items?.$values)) return value.items.$values;
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.$values)) return parsed.$values;
    if (Array.isArray(parsed?.items)) return parsed.items;
    if (Array.isArray(parsed?.items?.$values)) return parsed.items.$values;
  } catch (error) {
    console.warn("Could not parse saved invoice items", error);
  }

  return [];
};

const getSavedInvoiceItems = (invoice = {}) => {
  const candidates = [
    invoice?.items,
    invoice?.Items,
    invoice?.invoiceItems,
    invoice?.InvoiceItems,
    invoice?.salesInvoiceItems,
    invoice?.SalesInvoiceItems,
    invoice?.itemDetails,
    invoice?.ItemDetails,
  ];

  for (const candidate of candidates) {
    const rows = parseSavedInvoiceItems(candidate);
    if (rows.length) return rows;
  }

  return [];
};

const getSavedInvoicePayload = (responseData = {}) => {
  const candidates = [
    responseData?.customerInvoice,
    responseData?.CustomerInvoice,
    responseData?.invoice,
    responseData?.Invoice,
    responseData?.salesInvoice,
    responseData?.SalesInvoice,
    responseData?.data?.customerInvoice,
    responseData?.data?.CustomerInvoice,
    responseData?.data?.invoice,
    responseData?.data?.Invoice,
    responseData?.data?.salesInvoice,
    responseData?.data?.SalesInvoice,
    responseData?.data,
    responseData,
  ].filter((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate));

  return candidates.reduce((best, candidate) => {
    if (!best) return candidate;
    return getSavedInvoiceItems(candidate).length > getSavedInvoiceItems(best).length ? candidate : best;
  }, null) || {};
};

const mapSavedInvoiceItemToDraft = (item = {}, index = 0) => {
  const rawLineType = firstNonEmpty(item?.lineType, item?.LineType, item?.type, item?.Type, "media");
  const lineType = String(rawLineType || "media").trim().toLowerCase() || "media";
  const description = firstNonEmpty(
    item?.invoiceDescription,
    item?.InvoiceDescription,
    item?.description,
    item?.Description,
    item?.nameSubCode,
    item?.NameSubCode,
    getChargeDescription(lineType)
  );
  const normalizedType = normalizeCompare(lineType);
  const explicitChargeType = ["layouting", "transportation", "transport", "adaption", "adaptation", "charge"].includes(
    normalizedType
  );
  // Some production rows use Type=implementation. Only treat those as a
  // charge when the saved description/manual flag says that they are one.
  const isCharge =
    item?._manualEntry === true ||
    explicitChargeType ||
    /\bcharges?\b/i.test(String(description || ""));

  return {
    ...item,
    id: uid("item"),
    selected: true,
    groupByMedia: Boolean(item?.groupByMedia),
    jobNo: firstNonEmpty(item?.jobNo, item?.JobNo),
    lineType,
    storeName: firstNonEmpty(item?.storeName, item?.StoreName, item?.salonAddress, item?.SalonAddress),
    city: firstNonEmpty(item?.city, item?.City),
    description,
    media: isCharge
      ? "Charges"
      : firstNonEmpty(
          item?.invoiceMedia,
          item?.InvoiceMedia,
          item?.media,
          item?.Media,
          item?.externalMedia,
          item?.ExternalMedia,
          item?.internalMedia,
          item?.InternalMedia
        ),
    hsnCode: firstNonEmpty(
      item?.invoiceHsn,
      item?.InvoiceHsn,
      item?.hsnCode,
      item?.HsnCode,
      item?.HSNCode,
      item?.hsn,
      item?.Hsn,
      item?.HSN
    ),
    qty: firstNonEmpty(item?.invoiceQty, item?.InvoiceQty, item?.qty, item?.Qty, item?.quantity, item?.Quantity, isCharge ? 1 : ""),
    unit: firstNonEmpty(item?.invoiceUnit, item?.InvoiceUnit, item?.unit, item?.Unit, item?.uom, item?.UOM),
    width: firstNonEmpty(item?.invoiceWidth, item?.InvoiceWidth, item?.width, item?.Width),
    height: firstNonEmpty(item?.invoiceHeight, item?.InvoiceHeight, item?.height, item?.Height, item?.length, item?.Length),
    billingWidth: firstNonEmpty(item?.invoiceBillingWidth, item?.InvoiceBillingWidth, item?.billingWidth, item?.BillingWidth),
    billingHeight: firstNonEmpty(item?.invoiceBillingHeight, item?.InvoiceBillingHeight, item?.billingHeight, item?.BillingHeight),
    rate: firstNonEmpty(item?.invoiceRate, item?.InvoiceRate, item?.rate, item?.Rate),
    manualAmount: firstNonEmpty(
      item?.invoiceAmount,
      item?.InvoiceAmount,
      item?.invoiceTaxableValue,
      item?.InvoiceTaxableValue,
      item?.amount,
      item?.Amount,
      item?.taxableValue,
      item?.TaxableValue,
      ""
    ),
    _manualEntry: isCharge,
    _savedInvoiceRow: true,
    _savedInvoiceRowIndex: index,
    source: item?.source || item,
  };
};

const buildDraftDataFromSavedInvoice = (invoice = {}, fallbackData = {}) => {
  const savedInvoice = getSavedInvoicePayload(invoice);
  const billTo = (Array.isArray(savedInvoice?.billTo) ? savedInvoice.billTo : Array.isArray(savedInvoice?.BillTo) ? savedInvoice.BillTo : [])
    .map((address, index) => mapPersistedAddressToDraft(address, index, "Bill To"));
  const shipTo = (Array.isArray(savedInvoice?.shipTo) ? savedInvoice.shipTo : Array.isArray(savedInvoice?.ShipTo) ? savedInvoice.ShipTo : [])
    .map((address, index) => mapPersistedAddressToDraft(address, index, "Ship To"));
  const persistedItems = getSavedInvoiceItems(savedInvoice);
  const items = persistedItems.length
    ? persistedItems.map(mapSavedInvoiceItemToDraft)
    : fallbackData.items;

  return {
    ...fallbackData,
    invoiceId: firstNonEmpty(savedInvoice?.id, savedInvoice?._id, savedInvoice?.invoiceId, savedInvoice?.InvoiceId, fallbackData.invoiceId),
    invoiceNo: firstNonEmpty(savedInvoice?.invoiceNo, savedInvoice?.InvoiceNo, fallbackData.invoiceNo),
    invoiceDate: formatDateForInput(savedInvoice?.invoiceDate || savedInvoice?.InvoiceDate, fallbackData.invoiceDate || getCurrentLocalIsoDate()),
    jobCardNo: firstNonEmpty(savedInvoice?.jobCards, savedInvoice?.JobCards, fallbackData.jobCardNo),
    billFromLocation: firstNonEmpty(
      savedInvoice?.billFromLocation,
      savedInvoice?.BillFromLocation,
      savedInvoice?.billingLocation,
      savedInvoice?.BillingLocation,
      fallbackData.billFromLocation
    ),
    selectedJobIds: buildDraftSelectedJobIds(
      fallbackData.selectedJobIds,
      [],
      firstNonEmpty(savedInvoice?.jobCards, savedInvoice?.JobCards, fallbackData.jobCardNo)
    ),
    billToLocked: billTo.length ? true : Boolean(fallbackData.billToLocked),
    shipToLocked: shipTo.length ? true : Boolean(fallbackData.shipToLocked),
    billTo: billTo.length ? billTo : fallbackData.billTo,
    shipTo: shipTo.length ? shipTo : fallbackData.shipTo,
    items,
    clientName: firstNonEmpty(savedInvoice?.clientBillAs, savedInvoice?.ClientBillAs, fallbackData.clientName),
    poNumber: firstNonEmpty(savedInvoice?.poNo, savedInvoice?.PoNo, fallbackData.poNumber),
    projectName: firstNonEmpty(savedInvoice?.projectName, savedInvoice?.ProjectName, fallbackData.projectName),
    notes: firstNonEmpty(savedInvoice?.notes, savedInvoice?.Notes, fallbackData.notes),
    status: firstNonEmpty(savedInvoice?.status, savedInvoice?.Status, fallbackData.status, "Draft"),
    sourceBillTo: billTo,
    sourceShipTo: shipTo,
  };
};

const normalizeInvoiceData = (value = {}) => ({
  ...value,
  invoiceDate: formatDateForInput(value?.invoiceDate, getCurrentLocalIsoDate()),
});

const calculateItemAmount = (item) => {
  const manualAmount = String(item.manualAmount ?? "").trim();
  if (manualAmount !== "") return toNumber(manualAmount);

  const savedAmount = toNumber(
    item.invoiceAmount ??
      item.InvoiceAmount ??
      item.invoiceTaxableValue ??
      item.InvoiceTaxableValue ??
      item.taxableValue ??
      item.TaxableValue ??
      item.amount ??
      item.Amount
  );
  if (savedAmount > 0) return savedAmount;

  const qty = toNumber(item.qty);
  const width = toNumber(item.billingWidth || item.BillingWidth || item.width || item.Width);
  const height = toNumber(item.billingHeight || item.BillingHeight || item.height || item.Height);
  const rate = toNumber(item.rate);
  const unit = normalizeDimensionUnit(item.unit || item.Unit || item.uom || item.UOM);
  const sqft = calculateBillingSqFt(width, height, qty, unit);

  if (isChargeLineType(item.lineType) && !sqft) return qty * rate;
  return sqft * rate;
};

const buildAddressFromCustomer = (customer, label) => ({
  id: uid("address"),
  label,
  name: customer?.customeR_NAME || customer?.customerName || "",
  address: [
    customer?.billinG_ADD1,
    customer?.billinG_ADD2,
    `${customer?.billinG_CITY || ""}${customer?.billinG_PINCODE ? ` - ${customer.billinG_PINCODE}` : ""}`,
  ]
    .filter(Boolean)
    .join(", "),
  gstNo: customer?.gsT_NO || "",
});

const normalizePanCard = (value) => String(value || "").trim().toUpperCase();

const getCustomerGstNo = (customer) =>
  firstNonEmpty(
    customer?.gsT_NO,
    customer?.gstNo,
    customer?.GSTNo,
    customer?.GST_NO,
    customer?.gst_number,
    customer?.gstin,
    customer?.GSTIN
  );

const getPanFromGstin = (gstin) => {
  const clean = normalizePanCard(gstin);
  return clean.length >= 12 ? clean.substring(2, 12) : "";
};

const getCustomerPanCard = (customer) =>
  normalizePanCard(
    customer?.panCard ||
      customer?.PanCard ||
      customer?.panNo ||
      customer?.PANNo ||
      customer?.PAN_NO ||
      customer?.pan ||
      customer?.PAN ||
      getPanFromGstin(getCustomerGstNo(customer))
  );

const getRowPanCard = (row) =>
  normalizePanCard(
    getRowValue(row, "panCard", "PanCard", "panNo", "PANNo", "PAN_NO", "pan", "PAN") ||
      getPanFromGstin(getRowValue(row, "gstNo", "GSTNo", "GST No", "customerGstNo", "CustomerGstNo"))
  );

const buildFallbackAddress = (label, rows) => ({
  id: uid("address"),
  label,
  name: joinUnique(rows.map((row) => getRowClient(row))),
  address: joinUnique(rows.map((row) => getRowAddress(row)), "\n"),
  gstNo: joinUnique(rows.map((row) => getRowValue(row, "gstNo", "GSTNo", "GST No", "customerGstNo", "CustomerGstNo"))),
});

const buildShipToAddress = (label, rows) => ({
  id: uid("address"),
  label,
  name: joinUnique(rows.map((row) => getRowStoreName(row) || getRowClient(row))),
  address: joinUnique(rows.map((row) => getShipToAddress(row) || getRowAddress(row)), "\n"),
  gstNo: joinUnique(
    rows.map((row) =>
      getRowValue(
        row,
        "shipToGstNo",
        "ShipToGstNo",
        "storeGstNo",
        "StoreGstNo",
        "customerGstNo",
        "CustomerGstNo",
        "gstNo",
        "GstNo",
        "GSTNo",
        "GST No"
      )
    )
  ),
});

const rowToLineItem = (row, rateRows = []) => {
  const pricing = buildChallanItemPricing(row);
  const qty = toNumber(getRowValue(row, "qty", "Qty", "quantity", "Quantity")) || toNumber(pricing.quantity) || 1;
  const isEstimateRow = normalizeCompare(row?._invoiceSource) === "estimate";
  const rawUnit = getRowValue(row, "unit", "Unit", "uom", "UOM");
  const unit = normalizeDimensionUnit(
    firstNonEmpty(
      rawUnit,
      isEstimateRow && !toNumber(getRowValue(row, "width", "Width")) && !toNumber(getRowValue(row, "height", "Height", "length", "Length"))
        ? "nos"
        : "",
      "inch"
    )
  );
  const width = toNumber(getRowValue(row, "width", "Width"));
  const height = toNumber(getRowValue(row, "height", "Height", "length", "Length"));
  const billingWidth = getCsBillingWidth(row);
  const billingHeight = getCsBillingHeight(row);
  const sourceAmount = getRowValue(
    row,
    "manualAmount",
    "amount",
    "Amount",
    "taxableValue",
    "TaxableValue",
    "invoiceAmount",
    "InvoiceAmount",
    "lineJobValue",
    "LineJobValue"
  );
  const resolvedRate = firstNonEmpty(
    getRowValue(row, "rate", "Rate", "unitPrice", "UnitPrice", "lineJobValue", "LineJobValue"),
    resolveRateMasterRate(row, rateRows),
    pricing.unitPrice
  );
  return {
    id: uid("item"),
    selected: false,
    groupByMedia: false,
    jobNo: getRowJobNo(row),
    lineType: row._estimateChargeType || (row._invoiceSource === "implementation" ? "implementation" : "media"),
    storeName: getRowStore(row),
    city: getRowValue(row, "city", "City"),
    description: firstNonEmpty(
      isEstimateRow
        ? firstNonEmpty(
            row?.description,
            row?.Description,
            row?.details,
            row?.Details,
            row?.nameSubCode,
            row?.NameSubCode
          )
        : "",
      row?.simplifiedProductName,
      row?.SimplifiedProductName,
      row?.productAsPerRateCard,
      row?.ProductAsPerRateCard,
      resolveRateMasterDescription(row, rateRows),
      getCsSourceDescription(row),
      row?.description,
      row?.Description,
      row?.details,
      row?.Details,
      row?.nameSubCode,
      row?.NameSubCode,
      getInvoiceDescription(row)
    ),
    media: getRowMedia(row),
    hsnCode: pricing.hsnCode || getRowValue(row, "hsnCode", "HsnCode", "HSNCode", "hsn", "HSN"),
    panCard: getRowPanCard(row),
    qty,
    unit,
    width,
    height,
    billingWidth,
    billingHeight,
    rate: resolvedRate,
    manualAmount: toNumber(sourceAmount) > 0 ? sourceAmount : "",
    source: row,
  };
};

const getComparableNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const findBestJobMatch = (row, jobRows) => {
  if (!jobRows.length) return null;

  let bestMatch = null;
  let bestScore = -1;

  jobRows.forEach((candidate) => {
    let score = 0;

    if (normalizeCompare(getRowStore(candidate)) && normalizeCompare(getRowStore(candidate)) === normalizeCompare(getRowStore(row))) score += 3;
    if (normalizeCompare(getRowMedia(candidate)) && normalizeCompare(getRowMedia(candidate)) === normalizeCompare(getRowMedia(row))) score += 3;
    if (normalizeCompare(getRowValue(candidate, "visualCode", "VisualCode", "VISUAL CODE")) === normalizeCompare(getRowValue(row, "visualCode", "VisualCode", "VISUAL CODE"))) score += 2;
    if (normalizeCompare(getRowValue(candidate, "city", "City")) && normalizeCompare(getRowValue(candidate, "city", "City")) === normalizeCompare(getRowValue(row, "city", "City"))) score += 1;
    if (normalizeCompare(getRowValue(candidate, "hsnCode", "HsnCode", "HSNCode", "hsn", "HSN")) === normalizeCompare(getRowValue(row, "hsnCode", "HsnCode", "HSNCode", "hsn", "HSN"))) score += 1;

    const candidateQty = getComparableNumber(getRowValue(candidate, "qty", "Qty", "quantity", "Quantity"));
    const rowQty = getComparableNumber(getRowValue(row, "qty", "Qty", "quantity", "Quantity"));
    if (candidateQty !== null && rowQty !== null && candidateQty === rowQty) score += 1;

    const candidateWidth = getComparableNumber(getRowValue(candidate, "width", "Width"));
    const rowWidth = getComparableNumber(getRowValue(row, "width", "Width"));
    if (candidateWidth !== null && rowWidth !== null && candidateWidth === rowWidth) score += 1;

    const candidateHeight = getComparableNumber(getRowValue(candidate, "height", "Height", "length", "Length"));
    const rowHeight = getComparableNumber(getRowValue(row, "height", "Height", "length", "Length"));
    if (candidateHeight !== null && rowHeight !== null && candidateHeight === rowHeight) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  });

  return bestMatch || jobRows[0];
};

const normalizeCompare = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const enrichRowsWithJobDetails = (rows, allJobRows) => {
  const jobsByNo = new Map();

  allJobRows.forEach((row) => {
    const jobNo = getRowJobNo(row);
    if (!jobNo) return;
    if (!jobsByNo.has(jobNo)) jobsByNo.set(jobNo, []);
    jobsByNo.get(jobNo).push(row);
  });

  return rows.map((row) => {
    const jobNo = getRowJobNo(row);
    const matchingJobRows = jobsByNo.get(jobNo) || [];
    const bestMatch = findBestJobMatch(row, matchingJobRows);

    if (!bestMatch) {
      return {
        ...row,
        _jobEntryRows: matchingJobRows,
      };
    }

    return {
      ...bestMatch,
      ...row,
      // Keep challan eligibility/identity, but fill blank line details from Job Entry.
      media: firstNonEmpty(row?.media, row?.Media, bestMatch?.media, bestMatch?.Media),
      Media: firstNonEmpty(row?.Media, row?.media, bestMatch?.Media, bestMatch?.media),
      billingWidth: firstNonEmpty(getCsBillingWidth(row), getCsBillingWidth(bestMatch)),
      BillingWidth: firstNonEmpty(getCsBillingWidth(row), getCsBillingWidth(bestMatch)),
      billingHeight: firstNonEmpty(getCsBillingHeight(row), getCsBillingHeight(bestMatch)),
      BillingHeight: firstNonEmpty(getCsBillingHeight(row), getCsBillingHeight(bestMatch)),
      _jobEntryRow: bestMatch,
      _jobEntryRows: matchingJobRows,
    };
  });
};

const normalizeChallanDashboardRows = (challans) =>
  getResponseRows(challans).flatMap((challan, challanIndex) => {
    const challanItems = getResponseRows(challan?.items || challan?.Items);
    const fallbackItem = {
      rowId: challan?.id || challan?.Id || `challan-${challanIndex}`,
      jobNo: challan?.jobNo || challan?.JobNo,
      details: challan?.remarks || challan?.Remarks || "Challan",
      hsnCode: challan?.hsnCode || challan?.HsnCode,
      width: challan?.width || challan?.Width,
      height: challan?.height || challan?.Height,
      quantity: challan?.quantity || challan?.Quantity || 1,
      unitPrice: challan?.unitPrice || challan?.UnitPrice || challan?.jobValue || challan?.JobValue || 0,
    };
    const items = challanItems.length ? challanItems : [fallbackItem];
    const challanType = String(challan?.challanType || challan?.ChallanType || "delivery").trim();
    const source = challanType.toLowerCase().includes("implementation") ? "implementation" : "delivery";

    return items.map((item, itemIndex) => ({
      ...challan,
      ...item,
      id: item?.rowId || item?.RowId || item?.id || item?.Id || `${challan?.id || challan?.Id || "challan"}-${itemIndex}`,
      _invoiceSource: source,
      _fromChallanDashboard: true,
      challanType,
      challanId: challan?.id || challan?.Id || challan?.challanId || challan?.ChallanId,
      ChallanId: challan?.id || challan?.Id || challan?.challanId || challan?.ChallanId,
      challanNo: challan?.challanNo || challan?.ChallanNo,
      ChallanNo: challan?.challanNo || challan?.ChallanNo,
      challanDate: challan?.challanDate || challan?.ChallanDate,
      ChallanDate: challan?.challanDate || challan?.ChallanDate,
      customerName: challan?.customerName || challan?.CustomerName,
      CustomerName: challan?.customerName || challan?.CustomerName,
      customerAddress: challan?.customerAddress || challan?.CustomerAddress,
      CustomerAddress: challan?.customerAddress || challan?.CustomerAddress,
      customerGstNo: challan?.customerGstNo || challan?.CustomerGstNo,
      CustomerGstNo: challan?.customerGstNo || challan?.CustomerGstNo,
      jobNo: item?.jobNo || item?.JobNo || challan?.jobNo || challan?.JobNo,
      JobNo: item?.jobNo || item?.JobNo || challan?.jobNo || challan?.JobNo,
      projectName: challan?.projectName || challan?.ProjectName,
      ProjectName: challan?.projectName || challan?.ProjectName,
      poNo: challan?.poNo || challan?.PoNo,
      PoNo: challan?.poNo || challan?.PoNo,
      poDate: challan?.poDate || challan?.PoDate,
      PoDate: challan?.poDate || challan?.PoDate,
      storeName: challan?.storeName || challan?.StoreName,
      StoreName: challan?.storeName || challan?.StoreName,
      storeAddress: challan?.storeAddress || challan?.StoreAddress,
      StoreAddress: challan?.storeAddress || challan?.StoreAddress,
      productionLocation: challan?.productionLocation || challan?.ProductionLocation,
      ProductionLocation: challan?.productionLocation || challan?.ProductionLocation,
      dispatchAddress: challan?.dispatchAddress || challan?.DispatchAddress,
      DispatchAddress: challan?.dispatchAddress || challan?.DispatchAddress,
      details: item?.details || item?.Details || item?.nameSubCode || item?.NameSubCode,
      Details: item?.details || item?.Details || item?.nameSubCode || item?.NameSubCode,
      hsnCode: item?.hsnCode || item?.HsnCode,
      HsnCode: item?.hsnCode || item?.HsnCode,
      width: item?.width || item?.Width,
      Width: item?.width || item?.Width,
      height: item?.height || item?.Height,
      Height: item?.height || item?.Height,
      quantity: item?.quantity || item?.Quantity,
      Quantity: item?.quantity || item?.Quantity,
      unitPrice: item?.unitPrice || item?.UnitPrice || item?.lineJobValue || item?.LineJobValue || 0,
      UnitPrice: item?.unitPrice || item?.UnitPrice || item?.lineJobValue || item?.LineJobValue || 0,
    }));
  });


const resolveUrlCandidates = (...values) =>
  values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value || "").trim())
    .filter(Boolean);

const getEstimateUrlCandidates = () =>
  resolveUrlCandidates(
    config.JobSummary?.URL?.GetEstimate,
    String(config.JobSummary?.URL?.SaveEstimate || "").replace(/SaveEstimate$/i, "GetEstimate"),
    config.Estimate?.URL?.GetEstimate,
    config.Estimate?.URL?.GetAllEstimate,
    config.Estimate?.URL?.GetAllEstimates,
    config.Estimate?.URL?.GetAll,
    config.Estimate?.URL?.Getestimate,
    config.Estimate?.URL?.GetallEstimate,
    config.Estimate?.URL?.Getall,
    config.Estimate?.URL?.GetAllEstimateData,
    config.Estimate?.URL?.GetEstimateList,
    config.Estimate?.URL?.List
  );

const fetchEstimateRows = async () => {
  const urls = getEstimateUrlCandidates();
  if (!urls.length) {
    console.warn("Estimate API URL missing. Add config.JobSummary.URL.GetEstimate.");
    return [];
  }

  let lastError = null;
  for (const url of urls) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      return getResponseRows(response.data);
    } catch (getError) {
      lastError = getError;
      try {
        const response = await axios.post(url, {}, { timeout: 10000, headers: { "Content-Type": "application/json" } });
        return getResponseRows(response.data);
      } catch (postError) {
        lastError = postError;
        console.warn("Estimate API failed:", postError?.response?.status || getError?.response?.status, url);
      }
    }
  }

  if (lastError) console.warn("All Estimate API attempts failed", lastError);
  return [];
};

const parseJsonValue = (value) => {
  if (!value || typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const getEstimateFullJson = (estimate) => {
  const rawJson = getRowValue(
    estimate,
    "fullEstimateJson",
    "FullEstimateJson",
    "fullEstimateJSON",
    "FullEstimateJSON",
    "estimateJson",
    "EstimateJson"
  );
  const parsed = parseJsonValue(rawJson);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
};

const getEstimateJobNo = (estimate) => {
  const directJobNo = getRowValue(
    estimate,
    "comartjobno",
    "comartJobNo",
    "ComartJobNo",
    "COMARTJOBNO",
    "JobNo",
    "jobNo",
    "JobNumber",
    "jobNumber",
    "JobCardNo",
    "jobCardNo",
    "JobCards",
    "jobCards"
  );
  if (directJobNo) return directJobNo;

  const fullJson = getEstimateFullJson(estimate);
  return getRowValue(fullJson?.header || fullJson?.Header, "JobNo", "jobNo", "JobNumber", "jobNumber");
};

const getEstimateHeaderDate = (estimate = {}) => {
  const fullJson = getEstimateFullJson(estimate);
  return firstNonEmpty(
    getRowValue(estimate, "date", "Date", "jobDate", "JobDate", "jobdate", "Job Date"),
    getRowValue(fullJson?.header || fullJson?.Header, "date", "Date", "jobDate", "JobDate", "jobdate", "Job Date")
  );
};

const getEstimateDisplayDescription = (estimate = {}) =>
  firstNonEmpty(
    getRowValue(
      estimate,
      "description",
      "Description",
      "simplifiedProductName",
      "SimplifiedProductName",
      "productAsPerRateCard",
      "ProductAsPerRateCard",
      "details",
      "Details",
      "nameSubCode",
      "NameSubCode"
    ),
    getInvoiceDescription(estimate)
  );

const isOperatorChargeEstimate = (estimate = {}) => {
  const fullJson = getEstimateFullJson(estimate);
  const lineText = getEstimateLineRows(estimate)
    .map((line) =>
      [
        getEstimateDisplayDescription(line),
        getRowValue(line, "description", "Description", "details", "Details", "nameSubCode", "NameSubCode"),
        getRowValue(line, "chargeKey", "ChargeKey", "type", "Type", "lineType", "LineType"),
      ]
        .map((value) => normalizeCompare(value))
        .join(" ")
    )
    .join(" ");

  const headerText = [
    getRowValue(fullJson?.header || fullJson?.Header, "projectName", "ProjectName"),
    getRowValue(fullJson?.header || fullJson?.Header, "description", "Description"),
    getRowValue(estimate, "projectName", "ProjectName", "description", "Description", "details", "Details"),
    getEstimateDisplayDescription(estimate),
  ]
    .map((value) => normalizeCompare(value))
    .join(" ");

  const combinedText = `${headerText} ${lineText}`.trim();
  return combinedText.includes("operator charge") || combinedText.includes("operator charges");
};

const getEstimateChargeAmount = (estimate, keys) => {
  for (const key of keys) {
    const value = estimate?.[key];
    const amount = toNumber(String(value ?? "").replace(/,/g, ""));
    if (amount > 0) return amount;
  }
  return 0;
};

const getEstimateChargeKey = (jobNo, type, description, amount, sourceLine = {}) => {
  const locationKey = firstNonEmpty(
    getRowValue(sourceLine, "storeName", "StoreName", "store", "salonName"),
    getRowValue(sourceLine, "city", "City", "region")
  );

  return [
    normalizeCompare(jobNo),
    normalizeCompare(type),
    normalizeCompare(description || getChargeDescription(type)),
    normalizeCompare(locationKey),
    toNumber(amount),
  ].join("|");
};

const createEstimateChargeRow = (estimate, type, description, amount, sourceLine = {}) => {
  const jobNo = getEstimateJobNo(estimate);
  const fullJson = getEstimateFullJson(estimate);
  const header = fullJson?.header || fullJson?.Header || {};
  const sourceKey = firstNonEmpty(
    sourceLine.estimateLineKey,
    sourceLine.EstimateLineKey,
    sourceLine.id,
    sourceLine.Id,
    sourceLine.chargeKey,
    sourceLine.ChargeKey,
    description
  );
  return {
    ...estimate,
    ...sourceLine,
    id: `${estimate?.id || estimate?._id || estimate?.estimateNo || estimate?.EstimateNo || jobNo || "estimate"}-${type}-${sourceKey}`,
    _invoiceSource: "estimate",
    _fromEstimateCharge: true,
    _estimateChargeType: type,
    _estimateChargeKey: getEstimateChargeKey(jobNo, type, description, amount, sourceLine),
    JobNo: jobNo,
    jobNo,
    EstimateNo: estimate?.EstimateNo || estimate?.estimateNo || "",
    estimateNo: estimate?.estimateNo || estimate?.EstimateNo || "",
    Details: description,
    details: description,
    NameSubCode: description,
    nameSubCode: description,
    Media: "Charges",
    media: "Charges",
    HsnCode: sourceLine?.HsnCode || sourceLine?.hsnCode || sourceLine?.hsn || estimate?.HsnCode || estimate?.hsnCode || estimate?.HSNCode || estimate?.hsn || "",
    hsnCode: sourceLine?.HsnCode || sourceLine?.hsnCode || sourceLine?.hsn || estimate?.HsnCode || estimate?.hsnCode || estimate?.HSNCode || estimate?.hsn || "",
    StoreName: sourceLine?.StoreName || sourceLine?.storeName || sourceLine?.store || sourceLine?.salonName || estimate?.StoreName || estimate?.storeName || "",
    storeName: sourceLine?.StoreName || sourceLine?.storeName || sourceLine?.store || sourceLine?.salonName || estimate?.StoreName || estimate?.storeName || "",
    SalonAddress:
      sourceLine?.SalonAddress ||
      sourceLine?.salonAddress ||
      sourceLine?.StoreAddress ||
      sourceLine?.storeAddress ||
      sourceLine?.Storeaddress ||
      sourceLine?.DispatchAddress ||
      sourceLine?.dispatchAddress ||
      estimate?.SalonAddress ||
      estimate?.salonAddress ||
      estimate?.StoreAddress ||
      estimate?.storeAddress ||
      header?.salonAddress ||
      header?.SalonAddress ||
      "",
    salonAddress:
      sourceLine?.salonAddress ||
      sourceLine?.SalonAddress ||
      sourceLine?.storeAddress ||
      sourceLine?.StoreAddress ||
      sourceLine?.Storeaddress ||
      sourceLine?.dispatchAddress ||
      sourceLine?.DispatchAddress ||
      estimate?.salonAddress ||
      estimate?.SalonAddress ||
      estimate?.storeAddress ||
      estimate?.StoreAddress ||
      header?.salonAddress ||
      header?.SalonAddress ||
      "",
    StoreAddress:
      sourceLine?.StoreAddress ||
      sourceLine?.storeAddress ||
      sourceLine?.Storeaddress ||
      sourceLine?.SalonAddress ||
      sourceLine?.salonAddress ||
      estimate?.StoreAddress ||
      estimate?.storeAddress ||
      estimate?.SalonAddress ||
      estimate?.salonAddress ||
      "",
    storeAddress:
      sourceLine?.storeAddress ||
      sourceLine?.StoreAddress ||
      sourceLine?.Storeaddress ||
      sourceLine?.salonAddress ||
      sourceLine?.SalonAddress ||
      estimate?.storeAddress ||
      estimate?.StoreAddress ||
      estimate?.salonAddress ||
      estimate?.SalonAddress ||
      "",
    DispatchAddress:
      sourceLine?.DispatchAddress ||
      sourceLine?.dispatchAddress ||
      sourceLine?.StoreAddress ||
      sourceLine?.storeAddress ||
      sourceLine?.SalonAddress ||
      sourceLine?.salonAddress ||
      estimate?.DispatchAddress ||
      estimate?.dispatchAddress ||
      "",
    dispatchAddress:
      sourceLine?.dispatchAddress ||
      sourceLine?.DispatchAddress ||
      sourceLine?.storeAddress ||
      sourceLine?.StoreAddress ||
      sourceLine?.salonAddress ||
      sourceLine?.SalonAddress ||
      estimate?.dispatchAddress ||
      estimate?.DispatchAddress ||
      "",
    City: sourceLine?.City || sourceLine?.city || sourceLine?.region || estimate?.City || estimate?.city || "",
    city: sourceLine?.City || sourceLine?.city || sourceLine?.region || estimate?.City || estimate?.city || "",
    GstNo:
      sourceLine?.GstNo ||
      sourceLine?.gstNo ||
      sourceLine?.GSTNo ||
      sourceLine?.customerGstNo ||
      sourceLine?.CustomerGstNo ||
      estimate?.GstNo ||
      estimate?.gstNo ||
      estimate?.GSTNo ||
      estimate?.customerGstNo ||
      estimate?.CustomerGstNo ||
      header?.customerGstNo ||
      header?.CustomerGstNo ||
      "",
    gstNo:
      sourceLine?.gstNo ||
      sourceLine?.GstNo ||
      sourceLine?.GSTNo ||
      sourceLine?.customerGstNo ||
      sourceLine?.CustomerGstNo ||
      estimate?.gstNo ||
      estimate?.GstNo ||
      estimate?.GSTNo ||
      estimate?.customerGstNo ||
      estimate?.CustomerGstNo ||
      header?.customerGstNo ||
      header?.CustomerGstNo ||
      "",
    customerGstNo:
      sourceLine?.customerGstNo ||
      sourceLine?.CustomerGstNo ||
      sourceLine?.gstNo ||
      sourceLine?.GstNo ||
      sourceLine?.GSTNo ||
      estimate?.customerGstNo ||
      estimate?.CustomerGstNo ||
      estimate?.gstNo ||
      estimate?.GstNo ||
      estimate?.GSTNo ||
      header?.customerGstNo ||
      header?.CustomerGstNo ||
      "",
    BillingLocation: sourceLine?.BillingLocation || sourceLine?.billingLocation || estimate?.BillingLocation || estimate?.billingLocation || "",
    billingLocation: sourceLine?.BillingLocation || sourceLine?.billingLocation || estimate?.BillingLocation || estimate?.billingLocation || "",
    ProductionLocation: sourceLine?.ProductionLocation || sourceLine?.productionLocation || estimate?.ProductionLocation || estimate?.productionLocation || "",
    productionLocation: sourceLine?.ProductionLocation || sourceLine?.productionLocation || estimate?.ProductionLocation || estimate?.productionLocation || "",
    Quantity: 1,
    quantity: 1,
    Qty: 1,
    qty: 1,
    Width: "",
    width: "",
    Height: "",
    height: "",
    UnitPrice: amount,
    unitPrice: amount,
    Rate: amount,
    rate: amount,
    Amount: amount,
    amount,
    TaxableValue: amount,
    taxableValue: amount,
    InvoiceAmount: amount,
    invoiceAmount: amount,
    manualAmount: amount,
    Client: estimate?.Client || estimate?.client || estimate?.CustomerName || estimate?.customerName || estimate?.header?.clientName || "",
    client: estimate?.Client || estimate?.client || estimate?.CustomerName || estimate?.customerName || estimate?.header?.clientName || "",
    ProjectName: estimate?.ProjectName || estimate?.projectName || "",
    projectName: estimate?.ProjectName || estimate?.projectName || "",
  };
};

const getEstimateChargeTypeFromLine = (line = {}) => {
  const chargeKey = normalizeCompare(getRowValue(line, "chargeKey", "ChargeKey", "type", "Type", "lineType", "LineType"));
  const description = normalizeCompare(getRowValue(line, "description", "Description", "details", "Details", "nameSubCode", "NameSubCode"));
  const media = normalizeCompare(getRowValue(line, "media", "Media", "externalMedia", "ExternalMedia", "internalMedia", "InternalMedia"));
  const isChargeRow = isTruthyFlag(getRowValue(line, "isChargeRow", "IsChargeRow")) || chargeKey.includes("charges");
  const text = `${chargeKey} ${description}`;
  const isNonMedia = media.includes("non media") || media.includes("non-media") || media.includes("nonmedia");
  const isLikelyNonMediaLine = isChargeRow || isChargeLineType(chargeKey) || !media || isNonMedia || media.includes("charge");
  const mentionsCharge = isLikelyNonMediaLine || description.includes("charge") || description.includes("charges");

  if (mentionsCharge && (text.includes("adaption") || text.includes("adaptation"))) return "adaption";
  if (mentionsCharge && text.includes("implementation")) return "implementation";
  if (mentionsCharge && text.includes("installation")) return "installation";
  if (mentionsCharge && text.includes("layout")) return "layouting";
  if (mentionsCharge && (text.includes("transport") || text.includes("transporting") || text.includes("transportation"))) {
    return "transportation";
  }

  return "";
};

const getEstimateLineRows = (estimate) => {
  const fullJson = getEstimateFullJson(estimate);
  const preferredSources = [
    fullJson?.rows,
    fullJson?.Rows,
    fullJson?.lines,
    fullJson?.Lines,
    fullJson?.lineItems,
    fullJson?.LineItems,
  ];
  const fallbackSources = [
    estimate?.lines,
    estimate?.Lines,
    estimate?.lineItems,
    estimate?.LineItems,
  ];

  const preferredRows = preferredSources.flatMap((source) =>
    getResponseRows(parseJsonValue(source) || source)
  );
  if (preferredRows.length) return preferredRows;

  return fallbackSources.flatMap((source) =>
    getResponseRows(parseJsonValue(source) || source)
  );
};

const getEstimateSourceRows = (estimate) => {
  const fullJson = getEstimateFullJson(estimate);
  const preferredSources = [fullJson?.sourceRows, fullJson?.SourceRows];
  const fallbackSources = [estimate?.sourceRows, estimate?.SourceRows];

  const preferredRows = preferredSources.flatMap((source) =>
    getResponseRows(parseJsonValue(source) || source)
  );
  if (preferredRows.length) return preferredRows;

  return fallbackSources.flatMap((source) =>
    getResponseRows(parseJsonValue(source) || source)
  );
};

const getEstimateLineRowKey = (row = {}, index = -1) =>
  firstNonEmpty(
    row?.estimateLineKey,
    row?.EstimateLineKey,
    row?.lineKey,
    row?.LineKey,
    row?.id,
    row?.Id,
    index >= 0 ? `index-${index}` : ""
  );

const getMergedEstimateLineRows = (estimate) => {
  const lineRows = getEstimateLineRows(estimate);
  const sourceRows = getEstimateSourceRows(estimate);
  if (!sourceRows.length) return lineRows;

  const sourceRowMap = new Map();
  sourceRows.forEach((row, index) => {
    sourceRowMap.set(getEstimateLineRowKey(row, index), row);
  });

  return lineRows.map((line, index) => {
    const matchedSourceRow =
      sourceRowMap.get(getEstimateLineRowKey(line, index)) ||
      sourceRows[index] ||
      {};

    return {
      ...matchedSourceRow,
      ...line,
      store: firstNonEmpty(
        matchedSourceRow?.store,
        matchedSourceRow?.Store,
        line?.store,
        line?.Store,
        line?.storeName,
        line?.StoreName,
        line?.salonName,
        line?.SalonName,
        ""
      ),
      Store: firstNonEmpty(
        matchedSourceRow?.Store,
        matchedSourceRow?.store,
        line?.Store,
        line?.store,
        line?.StoreName,
        line?.storeName,
        line?.SalonName,
        line?.salonName,
        ""
      ),
      city: firstNonEmpty(
        matchedSourceRow?.city,
        matchedSourceRow?.City,
        line?.city,
        line?.City,
        matchedSourceRow?.region,
        matchedSourceRow?.Region,
        line?.region,
        line?.Region,
        ""
      ),
      City: firstNonEmpty(
        matchedSourceRow?.City,
        matchedSourceRow?.city,
        line?.City,
        line?.city,
        matchedSourceRow?.Region,
        matchedSourceRow?.region,
        line?.Region,
        line?.region,
        ""
      ),
      salonAddress: firstNonEmpty(
        matchedSourceRow?.salonAddress,
        matchedSourceRow?.SalonAddress,
        matchedSourceRow?.storeAddress,
        matchedSourceRow?.StoreAddress,
        matchedSourceRow?.Storeaddress,
        matchedSourceRow?.dispatchAddress,
        matchedSourceRow?.DispatchAddress,
        line?.salonAddress,
        line?.SalonAddress,
        line?.storeAddress,
        line?.StoreAddress,
        line?.Storeaddress,
        line?.dispatchAddress,
        line?.DispatchAddress,
        ""
      ),
      SalonAddress: firstNonEmpty(
        matchedSourceRow?.SalonAddress,
        matchedSourceRow?.salonAddress,
        matchedSourceRow?.StoreAddress,
        matchedSourceRow?.storeAddress,
        matchedSourceRow?.Storeaddress,
        matchedSourceRow?.DispatchAddress,
        matchedSourceRow?.dispatchAddress,
        line?.SalonAddress,
        line?.salonAddress,
        line?.StoreAddress,
        line?.storeAddress,
        line?.Storeaddress,
        line?.DispatchAddress,
        line?.dispatchAddress,
        ""
      ),
      storeAddress: firstNonEmpty(
        matchedSourceRow?.storeAddress,
        matchedSourceRow?.StoreAddress,
        matchedSourceRow?.Storeaddress,
        matchedSourceRow?.salonAddress,
        matchedSourceRow?.SalonAddress,
        line?.storeAddress,
        line?.StoreAddress,
        line?.Storeaddress,
        line?.salonAddress,
        line?.SalonAddress,
        ""
      ),
      StoreAddress: firstNonEmpty(
        matchedSourceRow?.StoreAddress,
        matchedSourceRow?.storeAddress,
        matchedSourceRow?.Storeaddress,
        matchedSourceRow?.SalonAddress,
        matchedSourceRow?.salonAddress,
        line?.StoreAddress,
        line?.storeAddress,
        line?.Storeaddress,
        line?.SalonAddress,
        line?.salonAddress,
        ""
      ),
      dispatchAddress: firstNonEmpty(
        matchedSourceRow?.dispatchAddress,
        matchedSourceRow?.DispatchAddress,
        matchedSourceRow?.storeAddress,
        matchedSourceRow?.StoreAddress,
        matchedSourceRow?.salonAddress,
        matchedSourceRow?.SalonAddress,
        line?.dispatchAddress,
        line?.DispatchAddress,
        line?.storeAddress,
        line?.StoreAddress,
        line?.salonAddress,
        line?.SalonAddress,
        ""
      ),
      DispatchAddress: firstNonEmpty(
        matchedSourceRow?.DispatchAddress,
        matchedSourceRow?.dispatchAddress,
        matchedSourceRow?.StoreAddress,
        matchedSourceRow?.storeAddress,
        matchedSourceRow?.SalonAddress,
        matchedSourceRow?.salonAddress,
        line?.DispatchAddress,
        line?.dispatchAddress,
        line?.StoreAddress,
        line?.storeAddress,
        line?.SalonAddress,
        line?.salonAddress,
        ""
      ),
      gstNo: firstNonEmpty(
        matchedSourceRow?.gstNo,
        matchedSourceRow?.GstNo,
        matchedSourceRow?.GSTNo,
        matchedSourceRow?.customerGstNo,
        matchedSourceRow?.CustomerGstNo,
        matchedSourceRow?.storeGstNo,
        matchedSourceRow?.StoreGstNo,
        line?.gstNo,
        line?.GstNo,
        line?.GSTNo,
        line?.customerGstNo,
        line?.CustomerGstNo,
        line?.storeGstNo,
        line?.StoreGstNo,
        ""
      ),
      GstNo: firstNonEmpty(
        matchedSourceRow?.GstNo,
        matchedSourceRow?.gstNo,
        matchedSourceRow?.GSTNo,
        matchedSourceRow?.CustomerGstNo,
        matchedSourceRow?.customerGstNo,
        matchedSourceRow?.StoreGstNo,
        matchedSourceRow?.storeGstNo,
        line?.GstNo,
        line?.gstNo,
        line?.GSTNo,
        line?.CustomerGstNo,
        line?.customerGstNo,
        line?.StoreGstNo,
        line?.storeGstNo,
        ""
      ),
      customerGstNo: firstNonEmpty(
        matchedSourceRow?.customerGstNo,
        matchedSourceRow?.CustomerGstNo,
        matchedSourceRow?.gstNo,
        matchedSourceRow?.GstNo,
        matchedSourceRow?.GSTNo,
        line?.customerGstNo,
        line?.CustomerGstNo,
        line?.gstNo,
        line?.GstNo,
        line?.GSTNo,
        ""
      ),
      CustomerGstNo: firstNonEmpty(
        matchedSourceRow?.CustomerGstNo,
        matchedSourceRow?.customerGstNo,
        matchedSourceRow?.GstNo,
        matchedSourceRow?.gstNo,
        matchedSourceRow?.GSTNo,
        line?.CustomerGstNo,
        line?.customerGstNo,
        line?.GstNo,
        line?.gstNo,
        line?.GSTNo,
        ""
      ),
      media: firstNonEmpty(
        matchedSourceRow?.media,
        matchedSourceRow?.Media,
        matchedSourceRow?.externalMedia,
        matchedSourceRow?.ExternalMedia,
        matchedSourceRow?.internalMedia,
        matchedSourceRow?.InternalMedia,
        line?.media,
        line?.Media,
        line?.externalMedia,
        line?.ExternalMedia,
        line?.internalMedia,
        line?.InternalMedia,
        ""
      ),
      Media: firstNonEmpty(
        matchedSourceRow?.Media,
        matchedSourceRow?.media,
        matchedSourceRow?.ExternalMedia,
        matchedSourceRow?.externalMedia,
        matchedSourceRow?.InternalMedia,
        matchedSourceRow?.internalMedia,
        line?.Media,
        line?.media,
        line?.ExternalMedia,
        line?.externalMedia,
        line?.InternalMedia,
        line?.internalMedia,
        ""
      ),
      unit: firstNonEmpty(line?.unit, line?.Unit, matchedSourceRow?.unit, matchedSourceRow?.Unit, ""),
      Unit: firstNonEmpty(line?.Unit, line?.unit, matchedSourceRow?.Unit, matchedSourceRow?.unit, ""),
      description: firstNonEmpty(
        matchedSourceRow?.description,
        matchedSourceRow?.Description,
        line?.description,
        line?.Description,
        ""
      ),
      Description: firstNonEmpty(
        matchedSourceRow?.Description,
        matchedSourceRow?.description,
        line?.Description,
        line?.description,
        ""
      ),
      simplifiedProductName: firstNonEmpty(
        matchedSourceRow?.simplifiedProductName,
        matchedSourceRow?.SimplifiedProductName,
        line?.simplifiedProductName,
        line?.SimplifiedProductName,
        matchedSourceRow?.description,
        line?.description,
        ""
      ),
      SimplifiedProductName: firstNonEmpty(
        matchedSourceRow?.SimplifiedProductName,
        matchedSourceRow?.simplifiedProductName,
        line?.SimplifiedProductName,
        line?.simplifiedProductName,
        matchedSourceRow?.Description,
        line?.Description,
        ""
      ),
      productAsPerRateCard: firstNonEmpty(
        matchedSourceRow?.productAsPerRateCard,
        matchedSourceRow?.ProductAsPerRateCard,
        line?.productAsPerRateCard,
        line?.ProductAsPerRateCard,
        matchedSourceRow?.description,
        line?.description,
        ""
      ),
      ProductAsPerRateCard: firstNonEmpty(
        matchedSourceRow?.ProductAsPerRateCard,
        matchedSourceRow?.productAsPerRateCard,
        line?.ProductAsPerRateCard,
        line?.productAsPerRateCard,
        matchedSourceRow?.Description,
        line?.Description,
        ""
      ),
      productrateId: firstNonEmpty(
        matchedSourceRow?.productrateId,
        matchedSourceRow?.ProductrateId,
        line?.productrateId,
        line?.ProductrateId,
        matchedSourceRow?.productRateId,
        matchedSourceRow?.ProductRateId,
        line?.productRateId,
        line?.ProductRateId,
        ""
      ),
      ProductrateId: firstNonEmpty(
        matchedSourceRow?.ProductrateId,
        matchedSourceRow?.productrateId,
        line?.ProductrateId,
        line?.productrateId,
        matchedSourceRow?.ProductRateId,
        matchedSourceRow?.productRateId,
        line?.ProductRateId,
        line?.productRateId,
        ""
      ),
      billingLocation: firstNonEmpty(
        matchedSourceRow?.billingLocation,
        matchedSourceRow?.BillingLocation,
        matchedSourceRow?.billLoc,
        matchedSourceRow?.BillLoc,
        line?.billingLocation,
        line?.BillingLocation,
        line?.billLoc,
        line?.BillLoc,
        line?.region,
        line?.Region,
        ""
      ),
      BillingLocation: firstNonEmpty(
        matchedSourceRow?.BillingLocation,
        matchedSourceRow?.billingLocation,
        matchedSourceRow?.BillLoc,
        matchedSourceRow?.billLoc,
        line?.BillingLocation,
        line?.billingLocation,
        line?.BillLoc,
        line?.billLoc,
        line?.Region,
        line?.region,
        ""
      ),
      productionLocation: firstNonEmpty(
        matchedSourceRow?.productionLocation,
        matchedSourceRow?.ProductionLocation,
        matchedSourceRow?.prodLoc,
        matchedSourceRow?.ProdLoc,
        line?.productionLocation,
        line?.ProductionLocation,
        line?.prodLoc,
        line?.ProdLoc,
        ""
      ),
      ProductionLocation: firstNonEmpty(
        matchedSourceRow?.ProductionLocation,
        matchedSourceRow?.productionLocation,
        matchedSourceRow?.ProdLoc,
        matchedSourceRow?.prodLoc,
        line?.ProductionLocation,
        line?.productionLocation,
        line?.ProdLoc,
        line?.prodLoc,
        ""
      ),
      qty: firstNonEmpty(line?.qty, line?.Qty, matchedSourceRow?.qty, matchedSourceRow?.Qty, "1"),
      Qty: firstNonEmpty(line?.Qty, line?.qty, matchedSourceRow?.Qty, matchedSourceRow?.qty, "1"),
      billableSqft: firstNonEmpty(
        line?.billableSqft,
        line?.BillableSqFt,
        line?.totalSqFt,
        line?.TotalSqFt,
        matchedSourceRow?.billableSqft,
        matchedSourceRow?.BillableSqFt,
        matchedSourceRow?.totalSqFt,
        matchedSourceRow?.TotalSqFt,
        ""
      ),
      BillableSqFt: firstNonEmpty(
        line?.BillableSqFt,
        line?.billableSqft,
        line?.TotalSqFt,
        line?.totalSqFt,
        matchedSourceRow?.BillableSqFt,
        matchedSourceRow?.billableSqft,
        matchedSourceRow?.TotalSqFt,
        matchedSourceRow?.totalSqFt,
        ""
      ),
      rate: firstNonEmpty(
        line?.rate,
        line?.Rate,
        matchedSourceRow?.rate,
        matchedSourceRow?.Rate,
        matchedSourceRow?.ratePerSqft,
        matchedSourceRow?.RatePerSqft,
        ""
      ),
      Rate: firstNonEmpty(
        line?.Rate,
        line?.rate,
        matchedSourceRow?.Rate,
        matchedSourceRow?.rate,
        matchedSourceRow?.RatePerSqft,
        matchedSourceRow?.ratePerSqft,
        ""
      ),
      amount: firstNonEmpty(
        line?.amount,
        line?.Amount,
        line?.lineTotal,
        line?.LineTotal,
        matchedSourceRow?.amount,
        matchedSourceRow?.Amount,
        matchedSourceRow?.lineTotal,
        matchedSourceRow?.LineTotal,
        ""
      ),
      Amount: firstNonEmpty(
        line?.Amount,
        line?.amount,
        line?.LineTotal,
        line?.lineTotal,
        matchedSourceRow?.Amount,
        matchedSourceRow?.amount,
        matchedSourceRow?.LineTotal,
        matchedSourceRow?.lineTotal,
        ""
      ),
      billingWidth: firstNonEmpty(
        line?.billingWidth,
        line?.BillingWidth,
        matchedSourceRow?.billingWidth,
        matchedSourceRow?.BillingWidth,
        ""
      ),
      BillingWidth: firstNonEmpty(
        line?.BillingWidth,
        line?.billingWidth,
        matchedSourceRow?.BillingWidth,
        matchedSourceRow?.billingWidth,
        ""
      ),
      billingHeight: firstNonEmpty(
        line?.billingHeight,
        line?.BillingHeight,
        matchedSourceRow?.billingHeight,
        matchedSourceRow?.BillingHeight,
        ""
      ),
      BillingHeight: firstNonEmpty(
        line?.BillingHeight,
        line?.billingHeight,
        matchedSourceRow?.BillingHeight,
        matchedSourceRow?.billingHeight,
        ""
      ),
    };
  });
};

const getEstimateUpdatedTime = (estimate = {}) => {
  const fullJson = getEstimateFullJson(estimate);
  const value = firstNonEmpty(
    estimate?.savedAtUtc,
    estimate?.SavedAtUtc,
    estimate?.createdAtUtc,
    estimate?.CreatedAtUtc,
    estimate?.lstupdatedt,
    estimate?.Lstupdatedt,
    fullJson?.savedAtUtc,
    fullJson?.SavedAtUtc
  );
  const time = parseFlexibleDate(value)?.getTime();
  return Number.isFinite(time) ? time : 0;
};

const getNormalizedEstimateInvoiceDate = (estimate = {}) =>
  formatDateForInput(getEstimateHeaderDate(estimate), "");

const getEstimateLineChargeAmount = (line = {}) => {
  const amount = getEstimateChargeAmount(line, [
    "amount",
    "Amount",
    "lineTotal",
    "LineTotal",
    "taxableValue",
    "TaxableValue",
    "value",
    "Value",
  ]);

  if (amount > 0) return amount;

  const qty = toNumber(getRowValue(line, "qty", "Qty", "quantity", "Quantity")) || 1;
  const rate = toNumber(getRowValue(line, "rate", "Rate", "unitPrice", "UnitPrice"));
  return qty * rate;
};

const getEstimateChargeDescription = (type, line = {}) =>
  firstNonEmpty(getRowValue(line, "description", "Description", "details", "Details", "nameSubCode", "NameSubCode"), getChargeDescription(type));

const buildEstimateChargeRows = (estimate) => {
  const rows = [];
  getMergedEstimateLineRows(estimate).forEach((line) => {
    const type = getEstimateChargeTypeFromLine(line);
    if (!type) return;
    const amount = getEstimateLineChargeAmount(line);
    if (amount <= 0) return;
    rows.push(createEstimateChargeRow(estimate, type, getEstimateChargeDescription(type, line), amount, line));
  });

  if (rows.length) return rows;

  const installationAmount = getEstimateChargeAmount(estimate, [
    "InstallationCharges",
    "installationCharges",
    "InstallationCharge",
    "installationCharge",
    "InstallationAmount",
    "installationAmount",
    "InstallationChargeAmount",
    "installationChargeAmount",
    "Installation charges",
    "installation charges",
  ]);
  const implementationAmount = getEstimateChargeAmount(estimate, [
    "ImplementationCharges",
    "implementationCharges",
    "ImplementationCharge",
    "implementationCharge",
    "ImplementationAmount",
    "implementationAmount",
    "ImplementationChargeAmount",
    "implementationChargeAmount",
    "Implementation charges",
    "implementation charges",
  ]);
  const layoutingAmount = getEstimateChargeAmount(estimate, [
    "LayoutingCharges",
    "layoutingCharges",
    "LayoutingCharge",
    "layoutingCharge",
    "LayoutCharges",
    "layoutCharges",
    "LayoutingAmount",
    "layoutingAmount",
    "LayoutingChargeAmount",
    "layoutingChargeAmount",
    "Layouting charges",
    "layouting charges",
    "Layout charges",
    "layout charges",
  ]);
  const transportationAmount = getEstimateChargeAmount(estimate, [
    "TransportationCharges",
    "transportationCharges",
    "TransportationCharge",
    "transportationCharge",
    "TransportCharges",
    "transportCharges",
    "TransportationAmount",
    "transportationAmount",
    "TransportationChargeAmount",
    "transportationChargeAmount",
    "TransportAmount",
    "transportAmount",
    "TransportingCharges",
    "transportingCharges",
    "Transportation charges",
    "transportation charges",
    "Transport charges",
    "transport charges",
  ]);
  const adaptionAmount = getEstimateChargeAmount(estimate, [
    "AdaptionCharges",
    "adaptionCharges",
    "AdaptionCharge",
    "adaptionCharge",
    "AdaptionAmount",
    "adaptionAmount",
    "AdaptionChargeAmount",
    "adaptionChargeAmount",
    "AdaptationCharges",
    "adaptationCharges",
    "AdaptationCharge",
    "adaptationCharge",
    "AdaptationAmount",
    "adaptationAmount",
    "AdaptationChargeAmount",
    "adaptationChargeAmount",
    "Adaption charges",
    "adaption charges",
    "Adaptation charges",
    "adaptation charges",
  ]);

  if (installationAmount > 0) rows.push(createEstimateChargeRow(estimate, "installation", "Installation Charges", installationAmount));
  if (implementationAmount > 0) rows.push(createEstimateChargeRow(estimate, "implementation", "Implementation Charges", implementationAmount));
  if (layoutingAmount > 0) rows.push(createEstimateChargeRow(estimate, "layouting", "Layouting Charges", layoutingAmount));
  if (transportationAmount > 0) rows.push(createEstimateChargeRow(estimate, "transportation", "Transportation Charges", transportationAmount));
  if (adaptionAmount > 0) rows.push(createEstimateChargeRow(estimate, "adaption", "Adaption Charges", adaptionAmount));

  return rows;
};

const buildOperatorChargeEstimateCards = (estimateRows, customers, existingCards = [], rateRows = []) => {
  const existingJobNos = new Set(
    (Array.isArray(existingCards) ? existingCards : [])
      .map((card) => normalizeCompare(card?.jobCardNo || card?.jobNo))
      .filter(Boolean)
  );
  const grouped = new Map();

  (Array.isArray(estimateRows) ? estimateRows : []).forEach((estimate) => {
    if (!isOperatorChargeEstimate(estimate)) return;
    const jobNo = normalizeCompare(getEstimateJobNo(estimate));
    if (!jobNo || existingJobNos.has(jobNo)) return;
    if (!grouped.has(jobNo)) grouped.set(jobNo, []);
    grouped.get(jobNo).push(estimate);
  });

  return Array.from(grouped.entries()).map(([jobNo, estimates], index) => {
    const latestEstimate =
      [...estimates].sort((left, right) => getEstimateUpdatedTime(right) - getEstimateUpdatedTime(left))[0] || {};
    const estimateDate = getNormalizedEstimateInvoiceDate(latestEstimate);
    const matchedCustomer = findCustomerRecord(customers, latestEstimate);
    const customerPanCard = getCustomerPanCard(matchedCustomer);
    const rowPanCard = estimates.map(getRowPanCard).find(Boolean);
    const panCard = customerPanCard || rowPanCard || "";
    const customerAddress = matchedCustomer
      ? buildAddressFromCustomer(matchedCustomer, `Bill To ${index + 1} (${jobNo})`)
      : buildFallbackAddress(`Bill To ${index + 1} (${jobNo})`, estimates);
    const estimateNo = firstNonEmpty(
      latestEstimate?.EstimateNo,
      latestEstimate?.estimateNo,
      latestEstimate?.JobNo,
      latestEstimate?.jobNo
    );
    const shipToRows = estimates.flatMap((estimate) => {
      const mergedRows = getMergedEstimateLineRows(estimate);
      return mergedRows.length ? mergedRows : [estimate];
    });
    const items = getMergedEstimateLineRows(latestEstimate).map((line) =>
      rowToLineItem(
        {
          ...latestEstimate,
          ...line,
          _invoiceSource: "estimate",
          EstimateNo: estimateNo,
          estimateNo,
          jobNo: getEstimateJobNo(latestEstimate) || jobNo,
          JobNo: getEstimateJobNo(latestEstimate) || jobNo,
        },
        rateRows
      )
    );

    return {
      id: `estimate-operator-${jobNo}`,
      source: "estimate",
      jobCardNo: getEstimateJobNo(latestEstimate) || jobNo,
      estimateDate,
      challanNo: "",
      challanDate: "",
      poNo: joinUnique(estimates.map((estimate) => getRowValue(estimate, "poNo", "PoNo", "lpono", "LpoNo"))),
      poDate: joinUnique(estimates.map((estimate) => getRowValue(estimate, "poDate", "PoDate", "lpodate", "LpoDate"))),
      billingLocation:
        joinUnique(
          estimates.map((estimate) =>
            firstNonEmpty(
              getRowValue(estimate, "billingLocation", "BillingLocation", "billLoc", "BillLoc"),
              getRowValue(estimate, "region", "Region")
            )
          )
        ) || "",
      productionLocation:
        joinUnique(
          estimates.map((estimate) =>
            firstNonEmpty(
              getRowValue(estimate, "productionLocation", "ProductionLocation", "prodLoc", "ProdLoc"),
              getRowValue(estimate, "region", "Region")
            )
          )
        ) || "",
      BillingLocation:
        joinUnique(
          estimates.map((estimate) =>
            firstNonEmpty(
              getRowValue(estimate, "billingLocation", "BillingLocation", "billLoc", "BillLoc"),
              getRowValue(estimate, "region", "Region")
            )
          )
        ) || "",
      ProductionLocation:
        joinUnique(
          estimates.map((estimate) =>
            firstNonEmpty(
              getRowValue(estimate, "productionLocation", "ProductionLocation", "prodLoc", "ProdLoc"),
              getRowValue(estimate, "region", "Region")
            )
          )
        ) || "",
      hasChallan: false,
      isDone: false,
      clientName: joinUnique(estimates.map((estimate) => getRowClient(estimate))) || "Client",
      storeName: joinUnique(shipToRows.map((row) => getRowStore(row))) || joinUnique(estimates.map((estimate) => getRowStore(estimate))) || "-",
      region: joinUnique(estimates.map((estimate) => getRowRegion(estimate))) || "",
      panCard,
      billTo: customerAddress,
      shipTo: withShipToFallbacks(
        buildShipToAddress(`Ship To ${index + 1} (${jobNo})`, shipToRows),
        customerAddress
      ),
      items,
      estimateChargeCount: items.length,
      estimateNo,
      EstimateNo: estimateNo,
    };
  });
};

const isEstimateOnlyInvoiceCard = (card) =>
  normalizeCompare(card?.source) === "estimate" || Number(card?.estimateChargeCount || 0) > 0;

const isSelectableInvoiceCard = (card, allowWithoutChallan) =>
  Boolean(card) && (allowWithoutChallan || card.hasChallan || isEstimateOnlyInvoiceCard(card));

const mergeEstimateChargesIntoCards = (cards, estimateRows) => {
  const chargesByJobNo = new Map();
  estimateRows.forEach((estimate) => {
    const jobNo = normalizeCompare(getEstimateJobNo(estimate));
    if (!jobNo) return;
    const chargeRows = buildEstimateChargeRows(estimate);
    if (!chargeRows.length) return;
    if (!chargesByJobNo.has(jobNo)) chargesByJobNo.set(jobNo, []);
    chargesByJobNo.get(jobNo).push(...chargeRows);
  });

  if (!chargesByJobNo.size) return cards;

  return cards.map((card) => {
    const chargeRows = chargesByJobNo.get(normalizeCompare(card.jobCardNo)) || [];
    if (!chargeRows.length) return card;

    const existingChargeKeys = new Set(
      card.items
        .filter((item) => item._fromEstimateCharge || item.source?._fromEstimateCharge)
        .map((item) => item.source?._estimateChargeKey || item._estimateChargeKey || `${normalizeCompare(item.jobNo)}|${normalizeCompare(item.lineType)}|${normalizeCompare(item.description)}|${normalizeCompare(item.storeName)}|${toNumber(item.manualAmount || item.rate)}`)
    );

    const chargeItems = chargeRows
      .map(rowToLineItem)
      .filter((item) => {
        const key = item.source?._estimateChargeKey || item._estimateChargeKey || `${normalizeCompare(item.jobNo)}|${normalizeCompare(item.lineType)}|${normalizeCompare(item.description)}|${normalizeCompare(item.storeName)}|${toNumber(item.manualAmount || item.rate)}`;
        if (existingChargeKeys.has(key)) return false;
        existingChargeKeys.add(key);
        return true;
      });

    return {
      ...card,
      source: card.source === "estimate" ? card.source : card.source,
      items: [...card.items, ...chargeItems],
      estimateChargeCount: (card.estimateChargeCount || 0) + chargeItems.length,
    };
  });
};

const getEstimateRowsForJobNo = (estimateRows, jobNo) => {
  const normalizedJobNo = normalizeCompare(jobNo);
  if (!normalizedJobNo) return [];

  return (Array.isArray(estimateRows) ? estimateRows : []).filter((estimate) => normalizeCompare(getEstimateJobNo(estimate)) === normalizedJobNo);
};

const enrichJobCardFromEstimateRows = (card, estimateRows) => {
  const matchingEstimates = getEstimateRowsForJobNo(estimateRows, card?.jobCardNo || card?.jobNo);
  if (!matchingEstimates.length) return card;

  const estimateLines = matchingEstimates.flatMap((estimate) => getMergedEstimateLineRows(estimate));
  if (!estimateLines.length) return card;

  const estimateNos = joinUnique(
    matchingEstimates.map((estimate) => firstNonEmpty(estimate?.EstimateNo, estimate?.estimateNo, estimate?.JobNo, estimate?.jobNo))
  );
  const latestEstimate =
    [...matchingEstimates].sort((left, right) => getEstimateUpdatedTime(right) - getEstimateUpdatedTime(left))[0] || {};
  const estimateDate = getNormalizedEstimateInvoiceDate(latestEstimate);

  const enrichedItems = card.items.map((item) => {
    const matchedEstimateLine = findBestJobMatch(item.source || item, estimateLines);
    if (!matchedEstimateLine) return item;

    const productionLocation = firstNonEmpty(
      getRowValue(matchedEstimateLine, "productionLocation", "ProductionLocation"),
      getRowValue(matchedEstimateLine, "region", "Region")
    );
    const billingLocation = firstNonEmpty(
      getRowValue(matchedEstimateLine, "billingLocation", "BillingLocation"),
      getRowValue(matchedEstimateLine, "billLoc", "BillLoc")
    );

    return {
      ...item,
      ...matchedEstimateLine,
      productionLocation: productionLocation || item.productionLocation || item.ProductionLocation || "",
      ProductionLocation: productionLocation || item.ProductionLocation || item.productionLocation || "",
      billingLocation: billingLocation || item.billingLocation || item.BillingLocation || "",
      BillingLocation: billingLocation || item.BillingLocation || item.billingLocation || "",
      source: {
        ...item.source,
        ...matchedEstimateLine,
        productionLocation: productionLocation || item.productionLocation || "",
        ProductionLocation: productionLocation || item.ProductionLocation || "",
        billingLocation: billingLocation || item.billingLocation || "",
        BillingLocation: billingLocation || item.BillingLocation || "",
      },
    };
  });

  const jobProductionLocations = joinUnique([
    card.productionLocation,
    ...estimateLines.map((line) => firstNonEmpty(getRowValue(line, "productionLocation", "ProductionLocation"), getRowValue(line, "region", "Region"))),
  ]);
  const jobBillingLocations = joinUnique([
    card.billingLocation,
    ...estimateLines.map((line) => firstNonEmpty(getRowValue(line, "billingLocation", "BillingLocation"), getRowValue(line, "billLoc", "BillLoc"))),
  ]);
  const estimateSelectableCount = matchingEstimates.some(isOperatorChargeEstimate) || !card?.hasChallan
    ? estimateLines.length
    : 0;

  return {
    ...card,
    estimateDate: estimateDate || card.estimateDate || "",
    items: enrichedItems,
    productionLocation: jobProductionLocations,
    ProductionLocation: jobProductionLocations,
    billingLocation: jobBillingLocations,
    BillingLocation: jobBillingLocations,
    estimateChargeCount: Math.max(Number(card?.estimateChargeCount || 0), estimateSelectableCount),
    estimateNo: firstNonEmpty(card.estimateNo, estimateNos),
    EstimateNo: joinUnique([card.EstimateNo, estimateNos]),
  };
};

const getJobCardItemFingerprint = (item = {}) => {
  const source = item?.source || item;
  const lineId = firstNonEmpty(
    source?.CsId,
    source?.csId,
    source?.CSId,
    source?.ItemId,
    source?.itemId,
    source?.LineId,
    source?.lineId,
    source?.JobItemId,
    source?.jobItemId,
    item?.source ? source?.id : "",
    item?.source ? source?._id : ""
  );

  // The same CS line is returned by several APIs. Its backend line ID is the
  // only safe de-duplication key because separate, identical lines are valid.
  if (lineId) return `line|${normalizeCompare(lineId)}`;

  return [
    normalizeCompare(source.jobNo || source.JobNo),
    normalizeCompare(source.description || source.Description || source.details || source.Details || source.nameSubCode || source.NameSubCode),
    normalizeCompare(source.media || source.Media),
    normalizeCompare(source.hsnCode || source.HsnCode || source.hsn || source.HSN),
    toNumber(source.qty || source.Qty || source.quantity || source.Quantity),
    toNumber(source.width || source.Width),
    toNumber(source.height || source.Height),
    normalizeCompare(source.productionLocation || source.ProductionLocation),
    normalizeCompare(source.billingLocation || source.BillingLocation),
  ].join("|");
};

const mergeInvoiceItemsWithLiveItems = (currentItems = [], refreshedItems = []) => {
  const consumedRefreshedIndexes = new Set();
  const takeRefreshedItem = (item) => {
    const fingerprint = getJobCardItemFingerprint(item.source || item);
    let matchedIndex = refreshedItems.findIndex(
      (candidate, index) =>
        !consumedRefreshedIndexes.has(index) &&
        getJobCardItemFingerprint(candidate.source || candidate) === fingerprint
    );

    // Saved invoices may contain an invoice-row ID instead of the CS-row ID.
    // Match repeated descriptions in their original order as a safe fallback.
    if (matchedIndex < 0 && !item?._manualEntry) {
      const jobNo = normalizeCompare(item.jobNo || item.JobNo || getRowJobNo(item.source || {}));
      const description = normalizeCompare(
        item.description || item.Description || getCsSourceDescription(item.source || {})
      );
      matchedIndex = refreshedItems.findIndex((candidate, index) => {
        if (consumedRefreshedIndexes.has(index) || candidate?._manualEntry) return false;
        const candidateJobNo = normalizeCompare(
          candidate.jobNo || candidate.JobNo || getRowJobNo(candidate.source || {})
        );
        const candidateDescription = normalizeCompare(
          candidate.description || candidate.Description || getCsSourceDescription(candidate.source || {})
        );
        return candidateJobNo === jobNo && candidateDescription === description;
      });
    }

    if (matchedIndex < 0) return null;
    consumedRefreshedIndexes.add(matchedIndex);
    return refreshedItems[matchedIndex];
  };

  return currentItems.map((item) => {
    const refreshed = takeRefreshedItem(item);
    if (!refreshed) return item;

    const liveSource = refreshed.source || refreshed;
    return {
      ...refreshed,
      ...item,
      media: firstNonEmpty(refreshed.media, getRowMedia(liveSource), item.media, ""),
      billingWidth: firstNonEmpty(refreshed.billingWidth, getCsBillingWidth(liveSource), item.billingWidth, ""),
      billingHeight: firstNonEmpty(refreshed.billingHeight, getCsBillingHeight(liveSource), item.billingHeight, ""),
      source: {
        ...(item.source || {}),
        ...(refreshed.source || {}),
      },
      selected: item.selected,
    };
  });
};

const enrichJobCardFromCsRows = (card, csRows) => {
  const normalizedJobNo = normalizeCompare(card?.jobCardNo || card?.jobNo);
  if (!normalizedJobNo) return card;

  const matchingRows = (Array.isArray(csRows) ? csRows : []).filter((row) => normalizeCompare(getRowJobNo(row)) === normalizedJobNo);
  if (!matchingRows.length) return card;

  const enrichedItems = (Array.isArray(card.items) ? card.items : []).map((item) => {
    if (normalizeCompare(item?.source?._invoiceSource || item?._invoiceSource) === "estimate") {
      return item;
    }

    const matchedCsRow = findBestJobMatch(item.source || item, matchingRows);
    if (!matchedCsRow) return item;

    const csDescription = getCsSourceDescription(matchedCsRow);
    const csMedia = getRowMedia(matchedCsRow);
    const csRate = firstNonEmpty(
      getRowValue(matchedCsRow, "rate", "Rate", "unitPrice", "UnitPrice", "lineJobValue", "LineJobValue"),
      item.rate
    );
    const csBillingWidth = firstNonEmpty(getCsBillingWidth(matchedCsRow), item.billingWidth, item.width, "");
    const csBillingHeight = firstNonEmpty(getCsBillingHeight(matchedCsRow), item.billingHeight, item.height, "");

    return {
      ...item,
      description: csDescription || item.description,
      media: csMedia || item.media || "",
      unit: normalizeDimensionUnit(firstNonEmpty(getRowValue(matchedCsRow, "unit", "Unit", "uom", "UOM"), item.unit, "")),
      hsnCode:
        firstNonEmpty(
          getRowValue(matchedCsRow, "hsnCode", "HsnCode", "HSNCode", "hsn", "HSN"),
          item.hsnCode
        ) || "",
      qty: firstNonEmpty(getRowValue(matchedCsRow, "qty", "Qty", "quantity", "Quantity"), item.qty),
      width: firstNonEmpty(getRowValue(matchedCsRow, "width", "Width"), item.width),
      height: firstNonEmpty(getRowValue(matchedCsRow, "height", "Height", "length", "Length"), item.height),
      billingWidth: csBillingWidth,
      billingHeight: csBillingHeight,
      rate: csRate,
      source: {
        ...item.source,
        ...matchedCsRow,
      },
    };
  });

  const jobProductionLocations = joinUnique([
    card.productionLocation,
    ...matchingRows.map((row) =>
      firstNonEmpty(getRowValue(row, "productionLocation", "ProductionLocation"), getRowValue(row, "region", "Region"))
    ),
  ]);
  const jobBillingLocations = joinUnique([
    card.billingLocation,
    ...matchingRows.map((row) =>
      firstNonEmpty(getRowValue(row, "billingLocation", "BillingLocation"), getRowValue(row, "billLoc", "BillLoc"))
    ),
  ]);
  const refreshedShipTo = buildShipToAddress(
    card?.shipTo?.label || `Ship To 1 (${card?.jobCardNo || card?.jobNo || "Job"})`,
    matchingRows
  );

  return {
    ...card,
    items: enrichedItems,
    sourceRows: matchingRows,
    csRows: matchingRows,
    csIds: joinUnique(matchingRows.map((row) => toText(getRowValue(row, "csId", "CsId", "id", "_id")))),
    productionLocation: jobProductionLocations,
    ProductionLocation: jobProductionLocations,
    billingLocation: jobBillingLocations,
    BillingLocation: jobBillingLocations,
    shipTo: {
      ...withShipToFallbacks(refreshedShipTo || {}, card?.billTo || {}),
      ...(card?.shipTo || {}),
      label: firstNonEmpty(card?.shipTo?.label, refreshedShipTo?.label),
      name: card?.shipTo?._manualName
        ? firstNonEmpty(card?.shipTo?.name, refreshedShipTo?.name, card?.billTo?.name)
        : firstNonEmpty(refreshedShipTo?.name, card?.shipTo?.name, card?.billTo?.name),
      address: card?.shipTo?._manualAddress
        ? firstNonEmpty(card?.shipTo?.address, refreshedShipTo?.address, card?.billTo?.address)
        : firstNonEmpty(refreshedShipTo?.address, card?.shipTo?.address, card?.billTo?.address),
      gstNo: card?.shipTo?._manualGstNo
        ? firstNonEmpty(card?.shipTo?.gstNo, refreshedShipTo?.gstNo, card?.billTo?.gstNo)
        : firstNonEmpty(refreshedShipTo?.gstNo, card?.shipTo?.gstNo, card?.billTo?.gstNo),
    },
  };
};

const stripInvoiceHelperFields = (row) => {
  if (!row || typeof row !== "object") return {};

  const cleaned = {};
  Object.entries(row).forEach(([key, value]) => {
    if (key.startsWith("_")) return;
    cleaned[key] = value;
  });

  return cleaned;
};

const toText = (value) => (value === undefined || value === null ? "" : String(value));

const buildJobCards = (rows, customers, rateRows = []) => {
  const grouped = new Map();

  rows.forEach((row, index) => {
    const jobCardNo = getRowJobNo(row) || `Job ${index + 1}`;
    // A Job ID can include multiple branches, stores, challans, and sources.
    // Group them together so one Job ID selection captures every branch row.
    const key = String(jobCardNo).trim();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });

  return Array.from(grouped.entries()).map(([key, jobRows], index) => {
    const jobCardNo = key;
    const source = joinUnique(jobRows.map((row) => row._invoiceSource || "job"));
    const matchedCustomer = findCustomerRecord(customers, jobRows[0]);
    const customerPanCard = getCustomerPanCard(matchedCustomer);
    const rowPanCard = jobRows.map(getRowPanCard).find(Boolean);
    const panCard = customerPanCard || rowPanCard || "";
    const customerAddress = matchedCustomer
      ? buildAddressFromCustomer(matchedCustomer, `Bill To ${index + 1} (${jobCardNo})`)
      : buildFallbackAddress(`Bill To ${index + 1} (${jobCardNo})`, jobRows);
    const challanNo = joinUnique(jobRows.map((row) => getChallanMeta(row).no));
    const challanDate = joinUnique(jobRows.map((row) => getRowChallanDate(row)));
    const poNo = joinUnique(jobRows.map((row) => getRowPoNo(row)));
    const poDate = joinUnique(jobRows.map((row) => getRowPoDate(row)));
    const billingLocation =
      joinUniqueLocations(
        jobRows.map((row) =>
          firstNonEmpty(
            getRowValue(row, "billingLocation", "BillingLocation", "billLoc", "BillLoc", "Billing Location"),
            getRowValue(row, "billingLocationName", "BillingLocationName", "Billing  Location"),
            getRowValue(row, "region", "Region")
          )
        )
      ) || "";
    const productionLocation =
      joinUniqueLocations(
        jobRows.map((row) =>
          firstNonEmpty(
            getRowValue(row, "productionLocation", "ProductionLocation", "prodLoc", "ProdLoc", "Production Location"),
            getRowValue(row, "region", "Region")
          )
        )
      ) || "";

    return {
      id: key,
      source,
      jobCardNo,
      challanNo,
      challanDate,
      poNo,
      poDate,
      billingLocation,
      productionLocation,
      BillingLocation: billingLocation,
      ProductionLocation: productionLocation,
      hasChallan: jobRows.some((row) => getChallanMeta(row).isCreated),
      isDone: source === "delivery" ? jobRows.some(isDeliveryDone) : jobRows.some(isImplementationDone),
      clientName: joinUnique(jobRows.map((row) => getRowClient(row))) || "Client",
      storeName: joinUnique(jobRows.map((row) => getRowStore(row))) || "-",
      region: joinUnique(jobRows.map((row) => getRowRegion(row))) || "",
      panCard,
      billTo: customerAddress,
      shipTo: withShipToFallbacks(
        buildShipToAddress(`Ship To ${index + 1} (${jobCardNo})`, jobRows),
        customerAddress
      ),
      items: mergeJobCardItems([], jobRows.map((row) => rowToLineItem(row, rateRows))),
    };
  });
};

const mergeJobCardItems = (existingItems = [], incomingItems = []) => {
  const merged = new Map();

  [...existingItems, ...incomingItems].forEach((item) => {
    const key = getJobCardItemFingerprint(item);
    if (!merged.has(key)) {
      merged.set(key, item);
      return;
    }

    const current = merged.get(key);
    merged.set(key, {
      ...current,
      ...item,
      source: {
        ...(current?.source || {}),
        ...(item?.source || {}),
      },
    });
  });

  return Array.from(merged.values());
};

const mergeJobCardRecords = (existingCard, incomingCard) => {
  if (!existingCard) return incomingCard;
  if (!incomingCard) return existingCard;

  const mergedBillTo =
    incomingCard.billTo && typeof incomingCard.billTo === "object" && !Array.isArray(incomingCard.billTo)
      ? mergeLiveAddressLists([existingCard.billTo || {}], [incomingCard.billTo || {}])[0]
      : existingCard.billTo;
  const mergedShipTo =
    incomingCard.shipTo && typeof incomingCard.shipTo === "object" && !Array.isArray(incomingCard.shipTo)
      ? mergeLiveAddressLists([existingCard.shipTo || {}], [incomingCard.shipTo || {}])[0]
      : existingCard.shipTo;

  return {
    ...existingCard,
    ...incomingCard,
    source: firstNonEmpty(incomingCard.source, existingCard.source),
    jobCardNo: firstNonEmpty(incomingCard.jobCardNo, existingCard.jobCardNo),
    challanNo: joinUnique([existingCard.challanNo, incomingCard.challanNo]),
    challanDate: joinUnique([existingCard.challanDate, incomingCard.challanDate]),
    poNo: joinUnique([existingCard.poNo, incomingCard.poNo]),
    poDate: joinUnique([existingCard.poDate, incomingCard.poDate]),
    billingLocation: joinUniqueLocations([existingCard.billingLocation, incomingCard.billingLocation]),
    productionLocation: joinUniqueLocations([existingCard.productionLocation, incomingCard.productionLocation]),
    BillingLocation: joinUniqueLocations([existingCard.BillingLocation, incomingCard.BillingLocation]),
    ProductionLocation: joinUniqueLocations([existingCard.ProductionLocation, incomingCard.ProductionLocation]),
    clientName: firstNonEmpty(incomingCard.clientName, existingCard.clientName),
    storeName: firstNonEmpty(incomingCard.storeName, existingCard.storeName),
    region: joinUnique([existingCard.region, incomingCard.region]),
    panCard: firstNonEmpty(incomingCard.panCard, existingCard.panCard),
    billTo: mergedBillTo,
    shipTo: mergedShipTo,
    csIds: joinUnique([existingCard.csIds, incomingCard.csIds]),
    csRows: mergeJobCardItems(existingCard.csRows || [], incomingCard.csRows || []),
    sourceRows: mergeJobCardItems(existingCard.sourceRows || [], incomingCard.sourceRows || []),
    items: mergeJobCardItems(existingCard.items || [], incomingCard.items || []),
    hasChallan: Boolean(existingCard.hasChallan || incomingCard.hasChallan),
    isDone: Boolean(existingCard.isDone || incomingCard.isDone),
  };
};

const normalizeJobCardLocations = (card = {}) => {
  const billingLocation = joinUniqueLocations([
    card.billingLocation,
    card.BillingLocation,
  ]);
  const productionLocation = joinUniqueLocations([
    card.productionLocation,
    card.ProductionLocation,
  ]);

  return {
    ...card,
    billingLocation,
    BillingLocation: billingLocation,
    productionLocation,
    ProductionLocation: productionLocation,
  };
};

const splitJobNoValues = (value) =>
  String(value || "")
    .split(/[,;\n|]+/g)
    .map((part) => part.trim())
    .filter(Boolean);

const getInvoicedJobNoSet = (invoices) => {
  const invoicedJobNos = new Set();

  getResponseRows(invoices).forEach((invoice) => {
    const invoiceType = normalizeCompare(invoice?.InvoiceType || invoice?.invoiceType);
    if (invoiceType && invoiceType !== "billingtocustomer") return;

    const jobSources = [
      invoice?.JobCards,
      invoice?.jobCards,
      invoice?.selectedJobNo,
      invoice?.selectedJobNos,
      invoice?._jobCards,
      invoice?.items?.map?.((item) => item?.JobNo || item?.jobNo).filter(Boolean).join(", "),
    ];

    jobSources.flatMap(splitJobNoValues).forEach((jobNo) => {
      if (jobNo) invoicedJobNos.add(normalizeCompare(jobNo));
    });
  });

  return invoicedJobNos;
};

const filterCardsNotInvoiced = (cards, invoicedJobNos) =>
  cards.filter((card) => !invoicedJobNos.has(normalizeCompare(card.jobCardNo)));

const groupInvoiceItems = (items, groupByMedia, groupByStore, groupByCity, groupByDescription) => {
  if (!groupByMedia && !groupByStore && !groupByCity && !groupByDescription) return items;

  const grouped = new Map();

  items.forEach((item) => {
    const keyParts = [];

    if (groupByDescription) {
      keyParts.push(String(item.description || "").toLowerCase());
      if (groupByStore) keyParts.push(String(item.storeName || "").toLowerCase());
      if (groupByCity) keyParts.push(String(item.city || "").toLowerCase());
    } else {
      keyParts.push(item.lineType);
      keyParts.push(groupByMedia && !item.groupByMedia ? item.id : "");
      keyParts.push(groupByStore ? String(item.storeName || "").toLowerCase() : "");
      keyParts.push(groupByCity ? String(item.city || "").toLowerCase() : "");
      keyParts.push(groupByMedia && item.groupByMedia ? String(item.media || item.description || "").toLowerCase() : "");
      keyParts.push(item.hsnCode);
      keyParts.push(toNumber(item.width));
      keyParts.push(toNumber(item.height));
      keyParts.push(toNumber(item.rate));
    }

    const key = keyParts.join("|");

    if (!grouped.has(key)) {
        grouped.set(key, {
        ...item,
        id: key,
        selected: false,
        qty: 0,
        jobNo: "",
        manualAmount: "",
        description: [
          groupByStore ? item.storeName || "Store" : "",
          groupByCity ? item.city || "City" : "",
          item.description || item.media || "Product",
        ].filter(Boolean).join(" - "),
        });
    }

    const current = grouped.get(key);
    current.qty = toNumber(current.qty) + toNumber(item.qty);
    current.jobNo = joinUnique([current.jobNo, item.jobNo]);
    current.manualAmount = toText(toNumber(current.manualAmount) + calculateItemAmount(item));

    if (groupByDescription) {
      current.hsnCode = current.hsnCode || item.hsnCode || "";
      current.media = "";
      current.description = current.description || item.description || "";
      current.rate = current.rate || item.rate || item.Rate || item.invoiceRate || item.InvoiceRate || "";
    }
  });

  return Array.from(grouped.values());
};

const InvoicePreviewBuilder = () => {
  const initialLoadStartedRef = useRef(false);
  const lastDraftHydrationKeyRef = useRef("");
  const [data, setData] = useState(createInitialData);
  const [jobCards, setJobCards] = useState([]);
  const [allJobCards, setAllJobCards] = useState([]);
  const [rateRows, setRateRows] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [queueJobFilterNos, setQueueJobFilterNos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const loadRateRows = async () => {
      try {
        const response = await axios.get(config.ProductMediaRateMaster.URL.GetAll, {
          timeout: INVOICE_BACKGROUND_API_TIMEOUT_MS,
        });
        if (!active) return;
        setRateRows(getResponseRows(response.data));
      } catch (error) {
        if (!active) return;
        console.warn("Failed to load product media rate master rows", error);
        setRateRows([]);
      }
    };

    loadRateRows();

    return () => {
      active = false;
    };
  }, []);

  const getJobSelectLabel = useCallback((job) => {
    return job?.clientName ? `${job.jobCardNo} (${job.clientName})` : job?.jobCardNo || "";
  }, []);

  const loadInvoiceJobs = useCallback(async () => {
    const { username, locationId, roleName } = getUserContext();
    const allowWithoutChallan = Boolean(data.allowWithoutChallan);
    let latestCards = readInvoiceJobCardsCache(allowWithoutChallan);

    const publishCards = (nextCards, { cache = true } = {}) => {
      const cardsByJobNo = new Map();

      (Array.isArray(nextCards) ? nextCards : []).forEach((card) => {
        const jobNo = String(card?.jobCardNo || card?.jobNo || card?.id || "").trim();
        const key = normalizeCompare(jobNo);
        const mergedCard = mergeJobCardRecords(cardsByJobNo.get(key), card);
        cardsByJobNo.set(key, mergedCard);
      });

      // A job can have multiple challans and locations, but it is invoiced as
      // one Job ID selection. Keep all its rows/challans inside one card.
      const normalizedCards = Array.from(cardsByJobNo.values()).map(
        normalizeJobCardLocations
      );

      latestCards = normalizedCards;
      setAllJobCards(normalizedCards);
      setJobCards(normalizedCards);
      if (cache) writeInvoiceJobCardsCache(normalizedCards, allowWithoutChallan);
      setData((prev) => {
        const unresolvedDraftSelectedIds = prev.selectedJobIds.filter((id) => getDraftSelectedJobNo(id));
        const selectedIds = prev.selectedJobIds.filter((id) => normalizedCards.some((card) => card.id === id));
        if (!selectedIds.length) {
          if (unresolvedDraftSelectedIds.length) {
            return prev;
          }
          return { ...prev, selectedJobIds: [] };
        }

        const selectedJobs = normalizedCards.filter((card) => selectedIds.includes(card.id));
        const { jobs: compatibleJobs, panCard } = filterJobsByPanCard(selectedJobs);
        if (compatibleJobs.length !== selectedJobs.length) {
          setMessage(
            panCard
              ? `Only jobs with PAN ${panCard} can be invoiced together. Mixed PAN selections were cleared.`
              : "Only jobs with the same PAN can be invoiced together. Mixed PAN selections were cleared."
          );
        }

        if (!compatibleJobs.length) return { ...prev, selectedJobIds: [] };
        return buildDataForJobs(prev, compatibleJobs, rateRows);
      });
    };

    setIsLoading(true);
    setIsFallbackLoading(false);
    setMessage("");

    if (latestCards.length) {
      publishCards(latestCards, { cache: false });
      setIsLoading(false);
    }

    let challanRows = [];

    try {
      const challanDashboardResponse = await axios.get(config.Delivery.URL.GetAllChallansDashboard, {
        timeout: INVOICE_JOB_API_TIMEOUT_MS,
      });
      challanRows = normalizeChallanDashboardRows(challanDashboardResponse.data);
      const quickCards = buildJobCards(challanRows, [], rateRows);
      if (quickCards.length || !latestCards.length) {
        publishCards(quickCards);
      }
    } catch (error) {
      console.warn("Challan dashboard API failed:", error?.response?.status, error?.config?.url);
      if (!latestCards.length) {
        setMessage("Could not load challan-created jobs. Loading delivery/implementation fallback...");
      }
    } finally {
      setIsLoading(false);
    }

    setIsFallbackLoading(true);

    try {
      const customerPromise = locationId
        ? axios.post(
            config.JobSummary.URL.Getallcustomer,
            { locationid: locationId },
            { timeout: INVOICE_BACKGROUND_API_TIMEOUT_MS, headers: { "Content-Type": "application/json" } }
          )
        : Promise.resolve({ data: [] });

      const payload = { locationId, username };
      const allJobsPayload = {
        locationId,
        username,
        ...((roleName === "Admindelete" || roleName === "Branch Manager") && { rolename: roleName }),
      };
      const deliveryPromise =
        locationId && username
          ? axios.post(config.Delivery.URL.GetAllDeliveryAccToLocation, payload, { timeout: INVOICE_BACKGROUND_API_TIMEOUT_MS })
          : axios.post(config.Delivery.URL.Getalldelivery, undefined, { timeout: INVOICE_BACKGROUND_API_TIMEOUT_MS });
      const implementationPromise =
        locationId && username
          ? axios.post(config.Implementation.URL.GetAllImplementationAccToLocation, payload, { timeout: INVOICE_BACKGROUND_API_TIMEOUT_MS })
          : axios.post(config.Implementation.URL.GetallImplementation, undefined, { timeout: INVOICE_BACKGROUND_API_TIMEOUT_MS });
      const invoicePromise =
        config.SalesInvoice?.URL?.GetAll
          ? axios.post(
              config.SalesInvoice.URL.GetAll,
              {},
              { timeout: INVOICE_BACKGROUND_API_TIMEOUT_MS, headers: { "Content-Type": "application/json" } }
            )
          : Promise.resolve({ data: [] });
      const estimatePromise = fetchEstimateRows();
      const allJobsAccToLocationPromise =
        locationId && username
          ? axios.post(config.JobSummary.URL.GetAllJobsAccToLocation, allJobsPayload, { timeout: INVOICE_BACKGROUND_API_TIMEOUT_MS })
          : Promise.resolve({ data: [] });
      const allJobsFromSqlPromise =
        username || roleName
          ? axios.post(
              config.JobSummary.URL.GetAllJobsFromSql,
              {
                username,
                ...((roleName === "Admindelete" || roleName === "Branch Manager") && { rolename: roleName }),
              },
              { timeout: INVOICE_BACKGROUND_API_TIMEOUT_MS, headers: { "Content-Type": "application/json" } }
            )
          : Promise.resolve({ data: [] });

      // CS records for which either a Delivery Challan or an
      // Implementation Challan has already been created.
      const challanCreatedCsPromise = axios.get(
        config.JobSummary.URL.GetRecordsByChallan,
        { timeout: INVOICE_BACKGROUND_API_TIMEOUT_MS }
      );

      const [
  customerResult,
  deliveryResult,
  implementationResult,
  invoiceResult,
  estimateResult,
  allJobsAccToLocationResult,
  allJobsFromSqlResult,
  challanCreatedCsResult,
] = await Promise.allSettled([
  customerPromise,
  deliveryPromise,
  implementationPromise,
  invoicePromise,
  estimatePromise,
  allJobsAccToLocationPromise,
  allJobsFromSqlPromise,
  challanCreatedCsPromise,
]);

const customerResponse =
  customerResult.status === "fulfilled" ? customerResult.value : { data: [] };

const deliveryResponse =
  deliveryResult.status === "fulfilled" ? deliveryResult.value : { data: [] };

const implementationResponse =
  implementationResult.status === "fulfilled"
    ? implementationResult.value
    : { data: [] };

const invoiceResponse =
  invoiceResult.status === "fulfilled" ? invoiceResult.value : { data: [] };

const estimateRows = estimateResult.status === "fulfilled" ? estimateResult.value : [];

const allJobsAccToLocationResponse =
  allJobsAccToLocationResult.status === "fulfilled" ? allJobsAccToLocationResult.value : { data: [] };

const allJobsFromSqlResponse =
  allJobsFromSqlResult.status === "fulfilled" ? allJobsFromSqlResult.value : { data: [] };

const challanCreatedCsResponse =
  challanCreatedCsResult.status === "fulfilled"
    ? challanCreatedCsResult.value
    : { data: [] };

if (challanCreatedCsResult.status === "rejected") {
  console.warn(
    "Challan-created CS records API failed:",
    challanCreatedCsResult.reason?.response?.status,
    challanCreatedCsResult.reason?.config?.url
  );
}

if (implementationResult.status === "rejected") {
  console.warn(
    "Implementation API failed:",
    implementationResult.reason?.response?.status,
    implementationResult.reason?.config?.url
  );
}

      const customers = mergeFallbackCustomers(Array.isArray(customerResponse.data) ? customerResponse.data : []);
      const csRows = dedupeRows(
        [
          ...getResponseRows(challanCreatedCsResponse.data),
          ...getResponseRows(allJobsAccToLocationResponse.data),
        ],
        (row, index) =>
          row?._id ||
          row?.id ||
          [
            getRowJobNo(row),
            getChallanMeta(row).id,
            getChallanMeta(row).no,
            getRowStore(row),
            index,
          ]
            .map((value) => String(value || "").trim())
            .join("|")
      );
      const jobRows = dedupeRows(
        [
        ...csRows,
        ...getResponseRows(allJobsFromSqlResponse.data),
        ],
        (row, index) =>
          [
            getRowJobNo(row),
            getChallanMeta(row).no,
            getRowStore(row),
            getRowClient(row),
            getRowRegion(row),
            row?.id || row?._id || index,
          ]
            .map((value) => String(value || "").trim())
            .join("|")
      );
      const deliveryRows = getResponseRows(deliveryResponse.data).map((row) => ({
        ...row,
        _invoiceSource: "delivery",
      }));
      const implementationRows = getResponseRows(implementationResponse.data).map((row) => ({
        ...row,
        _invoiceSource: "implementation",
      }));

      const challanCreatedCsRows = getResponseRows(challanCreatedCsResponse.data).map((row) => ({
        ...row,
        _fromGetRecordsByChallan: true,
        _invoiceSource: getRowValue(row, "DeliveryChallanId", "deliveryChallanId", "DeliveryChallanNo", "deliveryChallanNo")
          ? "delivery"
          : "implementation",
      }));

      const fallbackRows = enrichRowsWithJobDetails(
        [...deliveryRows, ...implementationRows],
        jobRows
      ).filter(
        (row) => isDeliveryDone(row) || isImplementationDone(row) || getChallanMeta(row).isCreated
      );
      const cardMap = new Map();
      const addCardsForMissingJobs = (rows) => {
        buildJobCards(rows, customers, rateRows).forEach((card) => {
          if (!cardMap.has(card.id)) cardMap.set(card.id, card);
        });
      };

      const enrichedGetRecordsRows = enrichRowsWithJobDetails(challanCreatedCsRows, jobRows);
      addCardsForMissingJobs(enrichedGetRecordsRows);

      const enrichedChallanRows = enrichRowsWithJobDetails(challanRows, jobRows);
      addCardsForMissingJobs(enrichedChallanRows);
      addCardsForMissingJobs(fallbackRows);
      // Job Summary contains every location and must not add unchallaned rows
      // to a normal invoice. It is used only when the user explicitly allows
      // invoicing without a challan.
      if (data.allowWithoutChallan) {
        buildJobCards(enrichRowsWithJobDetails(jobRows, jobRows), customers, rateRows).forEach((card) => {
          cardMap.set(card.id, mergeJobCardRecords(cardMap.get(card.id), card));
        });
      }
      const csEnrichedCards = Array.from(cardMap.values()).map((card) => enrichJobCardFromEstimateRows(enrichJobCardFromCsRows(card, csRows), estimateRows));
      // Display every record returned by the challan-created CS API.
      // Do not remove cards only because the Job No is present on an older invoice.
      const mergedCards = data.allowWithoutChallan
        ? csEnrichedCards
        : csEnrichedCards.filter((card) => card.hasChallan);
      const nextCards = data.allowWithoutChallan
        ? mergeEstimateChargesIntoCards(mergedCards, estimateRows)
        : mergeEstimateChargesIntoCards(mergedCards.filter((card) => card.hasChallan), estimateRows);
      const operatorChargeCards = buildOperatorChargeEstimateCards(estimateRows, customers, nextCards, rateRows);
      const combinedCards = [...nextCards, ...operatorChargeCards];

      if (combinedCards.length) {
        publishCards(combinedCards);
      } else if (!latestCards.length) {
        setJobCards([]);
        setAllJobCards([]);
        setMessage(
          data.allowWithoutChallan
            ? "No Job Entry rows without challan found for invoice."
            : "No Job Entry rows with challan found for invoice."
        );
      }
    } catch (error) {
      console.error("Failed to load invoice jobs", error);
      if (!latestCards.length) {
        setMessage(error?.response?.data?.message || error?.message || "Could not load invoice jobs from Delivery and Implementation.");
      }
    } finally {
      setIsLoading(false);
      setIsFallbackLoading(false);
    }
  }, [data.allowWithoutChallan, rateRows]);

  useEffect(() => {
    if (initialLoadStartedRef.current) return;

    initialLoadStartedRef.current = true;
    loadInvoiceJobs();
  }, [loadInvoiceJobs]);

  const lastAllowWithoutChallanRef = useRef(null);

  useEffect(() => {
    if (lastAllowWithoutChallanRef.current === null) {
      lastAllowWithoutChallanRef.current = data.allowWithoutChallan;
      return;
    }

    if (lastAllowWithoutChallanRef.current !== data.allowWithoutChallan) {
      lastAllowWithoutChallanRef.current = data.allowWithoutChallan;
      loadInvoiceJobs();
    }
  }, [data.allowWithoutChallan, loadInvoiceJobs]);

  useEffect(() => {
    const hasSavedDraft = Boolean(localStorage.getItem("invoiceDraftData"));
    if (hasSavedDraft) return;

    const raw = localStorage.getItem("invoicePreviewBuilderData");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed?.selectedRows)
        ? parsed.selectedRows.map((row) => ({ ...row, _invoiceSource: parsed.sourceModule || row._invoiceSource || "job" }))
        : [];
      const customers = Array.isArray(parsed?.customers) ? mergeFallbackCustomers(parsed.customers) : [];
      const cards = buildJobCards(rows, customers, rateRows);

      if (cards.length) {
        setJobCards((prev) => {
          const existing = new Map(prev.map((card) => [card.id, card]));
          cards.forEach((card) => existing.set(card.id, card));
          return Array.from(existing.values());
        });
        setData((prev) => buildDataForJobs(prev, cards, rateRows));
      }
    } catch (error) {
      console.error("Failed to load selected invoice rows", error);
    }
  }, []);

  useEffect(() => {
    const rawDraft = localStorage.getItem("invoiceDraftData");
    if (!rawDraft) return;

    let active = true;

    try {
      const draft = JSON.parse(rawDraft);
      if (draft && typeof draft === "object" && getSavedInvoiceItems(draft).length) {
        const draftSelectedJobIds = buildDraftSelectedJobIds(draft.selectedJobIds, jobCards, draft.jobCardNo);
        const applyDraftData = (draftData) => {
          const savedItems = getSavedInvoiceItems(draftData);

          setData((prev) => ({
          ...prev,
          ...normalizeInvoiceData(draftData),
          selectedJobIds: draftSelectedJobIds,
          billToLocked:
            Boolean(draftData.billToLocked) || (Array.isArray(draftData.billTo) && draftData.billTo.some((address) => address?._manualName || address?._manualAddress || address?._manualGstNo)),
          shipToLocked:
            Boolean(draftData.shipToLocked) || (Array.isArray(draftData.shipTo) && draftData.shipTo.some((address) => address?._manualName || address?._manualAddress || address?._manualGstNo)),
          billTo:
            Array.isArray(draftData.billTo) && draftData.billTo.length
              ? mergeDraftAddressLists(draftData.billTo, prev.billTo, draftData.sourceBillTo)
              : prev.billTo,
          shipTo:
            Array.isArray(draftData.shipTo) && draftData.shipTo.length
              ? mergeDraftAddressLists(draftData.shipTo, prev.shipTo, draftData.sourceShipTo)
              : prev.shipTo,
          // Recreate every persisted line (including transport, layouting,
          // adaption, installation and implementation charges) as a selected
          // grid row. Saved invoice lines are authoritative when editing.
          items: savedItems.length ? savedItems.map(mapSavedInvoiceItemToDraft) : prev.items,
          ewayBill: normalizeEwayBillDetails(draftData),
          }));
        };

        applyDraftData(draft);
        setMessage("Invoice draft loaded. Review and use Final Invoice when ready.");

        const invoiceNo = firstNonEmpty(draft.invoiceNo, draft.InvoiceNo, draft.customerInvoiceNo, draft.CustomerInvoiceNo);
        if (invoiceNo && config.SalesInvoice.URL.GetByInvoiceNo) {
          axios
            .get(config.SalesInvoice.URL.GetByInvoiceNo(invoiceNo), {
              timeout: INVOICE_BACKGROUND_API_TIMEOUT_MS,
            })
            .then((response) => {
              if (!active) return;
              const savedInvoice = getSavedInvoicePayload(response?.data);

              const refreshedDraft = buildDraftDataFromSavedInvoice(savedInvoice, draft);
              localStorage.setItem("invoiceDraftData", JSON.stringify(refreshedDraft));
              applyDraftData(refreshedDraft);
              setMessage("Invoice draft loaded. All saved invoice and charge rows are shown in the grid.");
            })
            .catch((error) => {
              console.warn("Failed to reload saved invoice draft by invoice number", error);
            });
        }
      }
    } catch (error) {
      console.error("Failed to load invoice draft", error);
    }

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!Array.isArray(data.selectedJobIds) || !data.selectedJobIds.some((id) => getDraftSelectedJobNo(id))) {
      return;
    }

    if (!Array.isArray(jobCards) || !jobCards.length) return;

    const draftJobNos = [...new Set(data.selectedJobIds.map(getDraftSelectedJobNo).map(normalizeCompare))].filter(Boolean);
    if (!draftJobNos.length) return;

    const matchedIds = jobCards
      .filter((job) => draftJobNos.includes(normalizeCompare(job?.jobCardNo || job?.jobNo)))
      .map((job) => job.id)
      .filter(Boolean);

    if (!matchedIds.length) return;

    setData((prev) => {
      const currentIds = Array.isArray(prev.selectedJobIds) ? prev.selectedJobIds : [];
      const alreadyResolved =
        currentIds.length === matchedIds.length &&
        matchedIds.every((id) => currentIds.includes(id));

      if (alreadyResolved) return prev;

      return {
        ...prev,
        selectedJobIds: matchedIds,
      };
    });
  }, [data.selectedJobIds, jobCards]);

  // Show each Job No only once. One job number can contain multiple
  // delivery/implementation challan cards, so retain all corresponding IDs.
  const selectableJobCards = useMemo(() => {
    const cardMap = new Map();
    [...(Array.isArray(jobCards) ? jobCards : []), ...(Array.isArray(allJobCards) ? allJobCards : [])].forEach((card) => {
      if (!card?.id) return;
      cardMap.set(card.id, card);
    });
    return Array.from(cardMap.values());
  }, [allJobCards, jobCards]);

  const jobSelectOptions = useMemo(() => {
    return selectableJobCards
      .filter(
        (job) =>
          String(job.jobCardNo || "").trim() &&
          isSelectableInvoiceCard(job, data.allowWithoutChallan)
      )
      .map((job) => ({
        value: String(job.id || job.jobCardNo || ""),
        cardIds: [job.id],
        label: getJobSelectLabel(job),
        jobCardNo: String(job.jobCardNo || "").trim(),
        clientName: job.clientName,
      }))
      .sort((a, b) =>
        a.jobCardNo.localeCompare(b.jobCardNo, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
  }, [data.allowWithoutChallan, getJobSelectLabel, selectableJobCards]);

  const selectedJobOptions = useMemo(() => {
    const selectedIds = new Set(data.selectedJobIds);
    return jobSelectOptions.filter((option) =>
      option.cardIds.some((id) => selectedIds.has(id))
    );
  }, [data.selectedJobIds, jobSelectOptions]);

  const visibleJobCards = useMemo(() => {
    const list = Array.isArray(jobCards) ? jobCards : [];

    if (queueJobFilterNos.length) {
      const selectedCardIds = new Set(queueJobFilterNos);
      return list.filter((card) => selectedCardIds.has(card.id));
    }

    if (data.selectedJobIds.length) {
      const selectedIds = new Set(data.selectedJobIds);
      return list.filter((card) => selectedIds.has(card.id));
    }

    // No Job No selected: show every fetched invoice-ready CS card.
    return data.allowWithoutChallan ? list : list.filter((card) => card.hasChallan);
  }, [data.allowWithoutChallan, data.selectedJobIds, jobCards, queueJobFilterNos]);

  const selectedItems = useMemo(() => data.items.filter((item) => item.selected), [data.items]);
  const invoiceItems = useMemo(
    () => groupInvoiceItems(selectedItems, data.groupByMedia, data.groupByStore, data.groupByCity, data.groupByDescription),
    [data.groupByCity, data.groupByDescription, data.groupByMedia, data.groupByStore, selectedItems]
  );
  const grandTotal = useMemo(() => invoiceItems.reduce((sum, item) => sum + calculateItemAmount(item), 0), [invoiceItems]);
  const grandTotalWithTax = useMemo(() => grandTotal + (grandTotal * GST_RATE) / 100, [grandTotal]);
  const selectedJobCards = useMemo(
    () => jobCards.filter((job) => data.selectedJobIds.includes(job.id)),
    [data.selectedJobIds, jobCards]
  );
  const selectedPanCard = useMemo(() => getSelectionPanCard(selectedJobCards), [selectedJobCards]);
  const invoiceRegion = useMemo(() => selectedJobCards.map((job) => job.region).find(Boolean) || "", [selectedJobCards]);
  const selectedBillingLocation = useMemo(
    () => selectedJobCards.map((job) => job.billingLocation || job.BillingLocation).find(Boolean) || "",
    [selectedJobCards]
  );
  const invoiceBillingLocation = useMemo(
    () => getPrimaryBillingLocation(selectedBillingLocation, invoiceRegion),
    [selectedBillingLocation, invoiceRegion]
  );
  const effectiveBillFromLocation = getPrimaryBillingLocation(data.billFromLocation, invoiceBillingLocation);
  const internalBillSourceItems = useMemo(
    () => {
      const billingLocation = effectiveBillFromLocation || invoiceBillingLocation;
      const jobSourceItems = selectedJobCards.flatMap((job) =>
        (Array.isArray(job.items) ? job.items : []).map((item) => ({
          ...item,
          _internalJobNo: job.jobCardNo || job.jobNo || item.jobNo || item.JobNo || "-",
          _internalProductionLocation:
            item.productionLocation || item.ProductionLocation || job.productionLocation || job.ProductionLocation || "",
          _internalBillingLocation:
            billingLocation || item.billingLocation || item.BillingLocation || job.billingLocation || job.BillingLocation || "",
        }))
      );

      return jobSourceItems.length ? jobSourceItems : selectedItems;
    },
    [effectiveBillFromLocation, invoiceBillingLocation, selectedItems, selectedJobCards]
  );
  const hasInternalBill = useMemo(
    () =>
      internalBillSourceItems.some((item) => {
        const productionLocation = firstNonEmpty(
          item._internalProductionLocation,
          item.productionLocation,
          item.ProductionLocation
        );
        const billingLocation = firstNonEmpty(
          item._internalBillingLocation,
          item.billingLocation,
          item.BillingLocation
        );

        return (
          productionLocation &&
          billingLocation &&
          normalizeCompare(productionLocation) !== normalizeCompare(billingLocation)
        );
      }),
    [effectiveBillFromLocation, internalBillSourceItems]
  );
  const invoiceCompanyDetails = useMemo(
    () => getCompanyBranchDetails(effectiveBillFromLocation),
    [effectiveBillFromLocation]
  );
  const billFromLabel = useMemo(
    () =>
      [invoiceCompanyDetails.companyName, invoiceCompanyDetails.companyAddress, invoiceCompanyDetails.companyGst]
        .filter(Boolean)
        .join(" | "),
    [invoiceCompanyDetails]
  );
  const internalBillNotice = useMemo(() => {
    if (!hasInternalBill) return "";
    return "";
  }, [hasInternalBill]);
  const internalBillPreviewGroups = useMemo(() => {
    const groups = new Map();
    internalBillSourceItems.forEach((item) => {
      const productionLocation = toText(
        item._internalProductionLocation ||
          item.productionLocation ||
          item.ProductionLocation ||
          item.region ||
          item.Region
      );
      const billingLocation = toText(
        item._internalBillingLocation ||
          item.billingLocation ||
          item.BillingLocation ||
          effectiveBillFromLocation ||
          data.billFromLocation
      );

      if (!productionLocation || !billingLocation) return;
      if (normalizeCompare(productionLocation) === normalizeCompare(billingLocation)) return;

      const key = `${normalizeCompare(productionLocation)}|${normalizeCompare(billingLocation)}`;
      if (!groups.has(key)) {
        groups.set(key, {
          productionLocation,
          billingLocation,
          jobNos: [],
          itemCount: 0,
          totalQty: 0,
          amount: 0,
          items: [],
          itemMap: new Map(),
        });
      }

      const current = groups.get(key);
      current.jobNos = [...new Set([...current.jobNos, item._internalJobNo || item.jobNo || item.JobNo].filter(Boolean))];
      current.itemCount += 1;
      current.totalQty += toNumber(item.qty);
      const itemAmount = calculateItemAmount(item);
      current.amount += itemAmount;
      const description = item.description || item.media || "Product";
      const media = item.media || "-";
      const itemKey = `${normalizeCompare(description)}|${normalizeCompare(media)}`;
      const existingLine = current.itemMap.get(itemKey);
      const nextLine = {
        jobNo: item._internalJobNo || item.jobNo || item.JobNo || "-",
        description,
        media,
        qty: toNumber(item.qty),
        size: `${toNumber(item.width) || "-"} X ${toNumber(item.height) || "-"}`,
        amount: itemAmount,
      };

      if (!existingLine) {
        current.itemMap.set(itemKey, nextLine);
      } else {
        existingLine.qty += nextLine.qty;
        existingLine.amount += nextLine.amount;
        existingLine.jobNo = [...new Set([...String(existingLine.jobNo || "").split(",").map((value) => value.trim()).filter(Boolean), nextLine.jobNo].filter(Boolean))];
        existingLine.size = existingLine.size === nextLine.size ? existingLine.size : joinUnique([existingLine.size, nextLine.size], " / ");
      }
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      items: Array.from(group.itemMap.values()),
    }));
  }, [data.billFromLocation, effectiveBillFromLocation, internalBillSourceItems]);
  const showInternalBillPreview = hasInternalBill || internalBillPreviewGroups.length > 0;
  const internalBillToLabel = useMemo(
    () => internalBillPreviewGroups.map((group) => group.billingLocation).find(Boolean) || invoiceBillingLocation || effectiveBillFromLocation || "",
    [effectiveBillFromLocation, internalBillPreviewGroups, invoiceBillingLocation]
  );
  const customerAddressForState = data.shipTo[0] || data.billTo[0] || {};
  const companyStateCode = getStateCode({
    gstNo: invoiceCompanyDetails.companyGst,
    address: invoiceCompanyDetails.companyAddress,
  });
  const customerStateCode = getStateCode({
    gstNo: firstNonEmpty(customerAddressForState.gstNo, data.billTo[0]?.gstNo),
    address: firstNonEmpty(customerAddressForState.address, data.billTo[0]?.address),
  });
  const isInterStateInvoice = Boolean(companyStateCode && customerStateCode && companyStateCode !== customerStateCode);
  const isSameStateInvoice = Boolean(companyStateCode && customerStateCode && companyStateCode === customerStateCode);
  const isEwayBillRequired = isInterStateInvoice || grandTotalWithTax > EWAY_BILL_THRESHOLD;
  const ewayRequirementText = isInterStateInvoice
    ? "Required for IGST / different state"
    : grandTotalWithTax > EWAY_BILL_THRESHOLD
      ? "Required because invoice total is above Rs. 50,000"
      : isSameStateInvoice
        ? "Optional for same-state CGST / SGST up to Rs. 50,000"
        : "Optional unless state differs or total crosses Rs. 50,000";
  const ewayBillDetails = normalizeEwayBillDetails(data);
  const groupedPreviewItems = useMemo(
    () =>
      groupInvoiceItems(
        selectedItems,
        data.groupByMedia,
        data.groupByStore,
        data.groupByCity,
        data.groupByDescription
      ),
    [data.groupByCity, data.groupByDescription, data.groupByMedia, data.groupByStore, selectedItems]
  );

  useEffect(() => {
    if (!data.selectedJobIds.length) return;

    const selectedJobs = jobCards.filter((job) => data.selectedJobIds.includes(job.id));
    if (!selectedJobs.length) return;

    const refreshedItems = buildSelectedJobItems(selectedJobs, rateRows);

    setData((prev) => {
      const currentItems = Array.isArray(prev.items) ? prev.items : [];
      if (!currentItems.length) return { ...prev, items: refreshedItems };
      return { ...prev, items: mergeInvoiceItemsWithLiveItems(currentItems, refreshedItems) };
    });
  }, [data.selectedJobIds, jobCards, rateRows]);

  useEffect(() => {
    if (!Array.isArray(data.selectedJobIds) || !data.selectedJobIds.length) return;

    const selectedJobs = jobCards.filter((job) => data.selectedJobIds.includes(job.id));
    if (!selectedJobs.length) return;

    const generatedBillTo = dedupeInvoiceAddresses(
      selectedJobs.map((job, index) => ({
        ...(job.billTo || {}),
        id: uid("address"),
        label: `Bill To ${index + 1} (${job.jobCardNo})`,
      }))
    );

    if (generatedBillTo.length) {
      setData((prev) => {
        if (prev.billToLocked) return prev;
        const currentBillTo = Array.isArray(prev.billTo) ? prev.billTo : [];
        if (hasManualAddressOverride(currentBillTo)) return prev;
        const mergedBillTo = mergeLiveAddressLists(currentBillTo, generatedBillTo);
        const changed = mergedBillTo.some((address, index) => {
          const current = currentBillTo[index] || {};
          return (
            address.label !== current.label ||
            address.name !== current.name ||
            address.address !== current.address ||
            address.gstNo !== current.gstNo
          );
        });

        if (!changed) return prev;
        return { ...prev, billTo: mergedBillTo };
      });
    }

    const generatedShipTo = buildDefaultShipToAddresses(generatedBillTo);

    if (!generatedShipTo.length) return;

    setData((prev) => {
      if (prev.shipToLocked) return prev;
      const currentShipTo = Array.isArray(prev.shipTo) ? prev.shipTo : [];
      if (hasManualAddressOverride(currentShipTo)) return prev;
      const mergedShipTo = mergeLiveAddressLists(currentShipTo, generatedShipTo);
      const changed = mergedShipTo.some((address, index) => {
        const current = currentShipTo[index] || {};
        return (
          address.label !== current.label ||
          address.name !== current.name ||
          address.address !== current.address ||
          address.gstNo !== current.gstNo
        );
      });

      if (!changed) return prev;
      return { ...prev, shipTo: mergedShipTo };
    });
  }, [data.selectedJobIds, jobCards]);

  const handleJobsSelected = useCallback(
    (selectedIds) => {
      const jobs = selectableJobCards.filter((job) => selectedIds.includes(job.id));
      const invoiceableJobs = jobs.filter((job) => isSelectableInvoiceCard(job, data.allowWithoutChallan));

      if (!jobs.length) {
        setData((prev) => ({
          ...prev,
          selectedJobIds: [],
          billToLocked: false,
          shipToLocked: false,
          billTo: [createEmptyAddress("Bill To 1")],
          shipTo: [createEmptyAddress("Ship To 1")],
          items: [createEmptyItem("media")],
          jobCardNo: "",
        }));
        return;
      }

      if (!data.allowWithoutChallan && invoiceableJobs.length !== jobs.length) {
        setMessage("Challan is mandatory when allow without challan is off. Only challan jobs and estimate operator-charge jobs can be selected.");
        return;
      }

      const { jobs: compatibleJobs, panCard } = filterJobsByPanCard(invoiceableJobs);
      if (compatibleJobs.length !== invoiceableJobs.length) {
        setMessage(
          panCard
            ? `Only jobs with PAN ${panCard} can be invoiced together. Please keep the selection within one PAN.`
            : "Only jobs with the same PAN can be invoiced together. Please keep the selection within one PAN."
        );
        return;
      }

      setData((prev) => buildDataForJobs(prev, compatibleJobs, rateRows));
    },
    [data.allowWithoutChallan, selectableJobCards]
  );

  useEffect(() => {
    setQueueJobFilterNos(data.selectedJobIds);
  }, [data.selectedJobIds]);

  useEffect(() => {
    const selectedJobs = jobCards.filter((job) => data.selectedJobIds.includes(job.id));
    const selectedJobNos = [...new Set(selectedJobs.map((job) => String(job?.jobCardNo || job?.jobNo || "").trim()).filter(Boolean))].sort();
    const selectionKey = selectedJobNos.join("|");

    if (!selectionKey) {
      lastDraftHydrationKeyRef.current = "";
      return;
    }

    if (lastDraftHydrationKeyRef.current === selectionKey) return;

    let active = true;
    const liveSelectedItems = buildSelectedJobItems(selectedJobs, rateRows);

    findLatestDraftInvoiceByJobCards(selectedJobNos)
      .then((savedInvoice) => {
        if (!active || !savedInvoice) return;

        const savedDraftData = buildDraftDataFromSavedInvoice(savedInvoice, {
          ...createInitialData(),
          selectedJobIds: data.selectedJobIds,
          jobCardNo: selectedJobNos.join(", "),
          items: data.items,
          allowWithoutChallan: data.allowWithoutChallan,
          billFromLocation: data.billFromLocation,
          groupByMedia: data.groupByMedia,
          groupByStore: data.groupByStore,
          groupByCity: data.groupByCity,
          groupByDescription: data.groupByDescription,
          ewayBill: normalizeEwayBillDetails(savedInvoice),
        });

        lastDraftHydrationKeyRef.current = selectionKey;
        localStorage.setItem("invoiceDraftData", JSON.stringify(savedDraftData));
        setData((prev) => ({
          ...prev,
          invoiceId: savedDraftData.invoiceId || prev.invoiceId,
          invoiceNo: savedDraftData.invoiceNo || prev.invoiceNo,
          invoiceDate: savedDraftData.invoiceDate || prev.invoiceDate,
          jobCardNo: savedDraftData.jobCardNo || prev.jobCardNo,
          billFromLocation: savedDraftData.billFromLocation || prev.billFromLocation,
          billToLocked: true,
          shipToLocked: true,
          billTo: Array.isArray(savedDraftData.billTo) && savedDraftData.billTo.length ? savedDraftData.billTo : prev.billTo,
          shipTo: Array.isArray(savedDraftData.shipTo) && savedDraftData.shipTo.length ? savedDraftData.shipTo : prev.shipTo,
          clientName: savedDraftData.clientName || prev.clientName,
          poNumber: savedDraftData.poNumber || prev.poNumber,
          projectName: savedDraftData.projectName || prev.projectName,
          notes: savedDraftData.notes || prev.notes,
          ewayBill: savedDraftData.ewayBill || prev.ewayBill,
          items:
            Array.isArray(savedDraftData.items) && savedDraftData.items.length
              ? mergeInvoiceItemsWithLiveItems(savedDraftData.items, liveSelectedItems)
              : prev.items,
        }));
      })
      .catch((error) => {
        if (!active) return;
        console.warn("Failed to hydrate saved draft by selected job number", error);
      });

    return () => {
      active = false;
    };
  }, [
    data.allowWithoutChallan,
    data.billFromLocation,
    data.groupByCity,
    data.groupByDescription,
    data.groupByMedia,
    data.groupByStore,
    data.items,
    data.selectedJobIds,
    jobCards,
  ]);

  useEffect(() => {
    if (data.allowWithoutChallan) return;

    setData((prev) => {
      const selectedJobs = jobCards.filter((job) => prev.selectedJobIds.includes(job.id));
      const invoiceableJobs = selectedJobs.filter((job) => isSelectableInvoiceCard(job, false));

      if (!selectedJobs.length || invoiceableJobs.length === selectedJobs.length) {
        return prev;
      }

      if (!invoiceableJobs.length) {
        return {
          ...prev,
          selectedJobIds: [],
          billToLocked: false,
          shipToLocked: false,
          billTo: [createEmptyAddress("Bill To 1")],
          shipTo: [createEmptyAddress("Ship To 1")],
          items: [createEmptyItem("media")],
          jobCardNo: "",
        };
      }

      return buildDataForJobs(prev, invoiceableJobs, rateRows);
    });
  }, [data.allowWithoutChallan, jobCards]);

  const updateMeta = (field, value) =>
    setData((prev) => ({
      ...prev,
      [field]:
        field === "invoiceDate"
          ? formatDateForInput(value, prev.invoiceDate || getCurrentLocalIsoDate())
          : value,
    }));

  const updateEwayBill = (field, value) => {
    setData((prev) => {
      const nextEwayBill = {
        ...createEmptyEwayBill(),
        ...normalizeEwayBillDetails(prev),
        [field]: value,
      };

      if (field === "transportMode") {
        nextEwayBill.modeOfTransportation = value;
      }

      if (field === "transportDistanceKm") {
        nextEwayBill.distanceOfTransportation = value;
      }

      return {
        ...prev,
        ewayBill: nextEwayBill,
        ...buildEwayBillPayload(nextEwayBill),
      };
    });
  };

  const updateAddress = (type, id, field, value) => {
    const manualFieldMap = {
      name: "_manualName",
      address: "_manualAddress",
      gstNo: "_manualGstNo",
    };

    setData((prev) => ({
      ...prev,
      [`${type}Locked`]: true,
      [type]: prev[type].map((address) =>
        address.id === id
          ? {
              ...address,
              [field]: value,
              ...(manualFieldMap[field] ? { [manualFieldMap[field]]: true } : {}),
            }
          : address
      ),
    }));
  };

  const addAddress = (type) => {
    const labelPrefix = type === "billTo" ? "Bill To" : "Ship To";
    setData((prev) => ({
      ...prev,
      [type]: [...prev[type], createEmptyAddress(`${labelPrefix} ${prev[type].length + 1}`)],
    }));
  };

  const removeAddress = (type, id) => {
    const fallbackLabel = type === "billTo" ? "Bill To 1" : "Ship To 1";
    setData((prev) => {
      const next = prev[type].filter((address) => address.id !== id);
      return { ...prev, [type]: next.length ? next : [createEmptyAddress(fallbackLabel)] };
    });
  };

  const updateItem = (id, field, value) => {
    if (READ_ONLY_ITEM_FIELDS.has(field)) return;

    setData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id) return item;

        return { ...item, [field]: value };
      }),
    }));
  };

  const addItem = (lineType = "media") => {
    setData((prev) => {
      const item = createEmptyItem(lineType, prev.jobCardNo || "");
      return {
        ...prev,
        items: [...prev.items, { ...item, selected: true }],
      };
    });
  };

  const removeSelectedItems = () => {
    setData((prev) => {
      const next = prev.items.filter((item) => !item.selected);
      return { ...prev, items: next.length ? next : [createEmptyItem("media")] };
    });
  };

  const toggleAllItems = (checked) => {
    setData((prev) => ({ ...prev, items: prev.items.map((item) => ({ ...item, selected: checked })) }));
  };

  const handleCreateGroupBill = () => {
    const count = selectedItems.length;
    const total = selectedItems.reduce((sum, item) => sum + calculateItemAmount(item), 0);

    if (!count) {
      setMessage("Please select item(s) for group bill.");
      return;
    }

    setData((prev) => ({
      ...prev,
      groupByDescription: true,
      items: prev.items.map((item) => (item.selected ? { ...item, groupByMedia: true } : item)),
    }));
    setMessage(`Group bill preview created with ${count} selected item(s): ${formatMoney(total)}`);
  };

  const copyPoDescriptionToItems = () => {
    if (!selectedItems.length) {
      setMessage("Please select invoice row(s) before copying description.");
      return;
    }

    const description = String(data.poDescription || data.poNumber || selectedItems[0]?.description || "").trim();
    if (!description) {
      setMessage("Please enter PO description or add description in the first selected row before copying.");
      return;
    }

    setData((prev) => {
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.selected ? { ...item, description } : item
        ),
      };
    });
    setMessage(`Description copied to ${selectedItems.length} selected invoice row(s).`);
  };

  const buildPrintRows = () =>
    invoiceItems.map((item, index) => {
      const taxableValue = calculateItemAmount(item);
      const gstAmount = (taxableValue * GST_RATE) / 100;
      const sourceRow = item.source || {};
      const challanNo = firstNonEmpty(
        getChallanMeta(sourceRow).no,
        sourceRow.ChallanNo,
        sourceRow.challanNo,
        sourceRow.DeliveryChallanNo,
        sourceRow.deliveryChallanNo,
        sourceRow.ImplementationChallanNo,
        sourceRow.implementationChallanNo
      );
      const challanDate = firstNonEmpty(
        getRowChallanDate(sourceRow),
        sourceRow.DeliveryChallanDate,
        sourceRow.deliveryChallanDate,
        sourceRow.ImplementationChallanDate,
        sourceRow.implementationChallanDate
      );
      const poNo = firstNonEmpty(data.poNumber, getRowPoNo(sourceRow));
      return {
        key: item.id || `invoice-row-${index}`,
        sno: index + 1,
        description: item.description || item.media || "Product",
        jobNo: item.jobNo,
        qty: toNumber(item.qty),
        unit: item.unit || item.source?.unit || item.source?.Unit || item.source?.uom || item.source?.UOM || "",
        width: toNumber(item.width),
        height: toNumber(item.height),
        productionWidth: toNumber(item.width),
        productionHeight: toNumber(item.height),
        billingWidth: toNumber(item.billingWidth || item.width),
        billingHeight: toNumber(item.billingHeight || item.height),
        rate: toNumber(item.rate),
        hsnCode: item.hsnCode || "",
        taxableValue,
        gstRate: GST_RATE,
        gstAmount,
        lineTotal: taxableValue + gstAmount,
        lineType: item.lineType || "media",
        isEstimateCharge: Boolean(item.source?._fromEstimateCharge),
        invoiceNo: data.invoiceNo || "",
        invoiceDate: data.invoiceDate || "",
        challanNo,
        ChallanNo: challanNo,
        challanDate,
        ChallanDate: challanDate,
        poNo,
        PoNo: poNo,
      };
    });

  useEffect(() => {
    if (!data.selectedJobIds.length) return;

    const invoiceRows = buildPrintRows();
    const previewPayload = buildInvoicePreviewPayload(data, jobCards, invoiceRows);
    const ewayBill = normalizeEwayBillDetails(data);
    localStorage.setItem(
      "invoicePrintPreviewData",
      JSON.stringify(
        addInvoiceNoToPreviewPayload(
          { ...previewPayload, ...buildEwayBillPayload(ewayBill), ewayBill, invoiceRows },
          data.invoiceNo || previewPayload.invoiceNo
        )
      )
    );
  }, [data, jobCards]);

  const validateEwayBillRequirement = (actionText) => {
    if (!isEwayBillRequired) return true;

    const ewayBill = normalizeEwayBillDetails(data);
    const missingFields = [
      ["Transporter name", ewayBill.transporterName],
      ["Mode of transportation", ewayBill.transportMode],
      ["Distance", ewayBill.transportDistanceKm],
      ["Vehicle no.", ewayBill.vehicleNo],
      ["Transporter GST No.", ewayBill.transporterGstNo],
    ]
      .filter(([, value]) => !firstNonEmpty(value))
      .map(([label]) => label);

    if (!missingFields.length) return true;

    setMessage(`E-way Bill is compulsory for this invoice. Please fill ${missingFields.join(", ")} before ${actionText}.`);
    return false;
  };

 const handleSave = async (status = "Draft") => {
  const invoiceRows = buildPrintRows();

  if (!data.selectedJobIds.length && !String(data.jobCardNo || "").trim()) {
    setMessage("Please select at least one job before saving the invoice.");
    return;
  }

  if (!selectedItems.length) {
    setMessage("Please select invoice row(s) before saving.");
    return;
  }

  if (!invoiceRows.length) {
    setMessage("Please select at least one invoice row before saving.");
    return;
  }

  const invoiceGrandTotal = invoiceRows.reduce((sum, row) => sum + toNumber(row.lineTotal), 0);
  if (status !== "Draft" && invoiceGrandTotal <= 0) {
    setMessage("Grand total is 0. Please enter Qty, Width, Height and Rate before saving a final invoice.");
    return;
  }
  if (status !== "Draft" && !validateEwayBillRequirement("saving a final invoice")) {
    return;
  }

  const userContext = getUserContext();
  const previewPayload = buildInvoicePreviewPayload(data, jobCards, invoiceRows);
  const ewayBill = normalizeEwayBillDetails(data);
  const ewayBillPayload = buildEwayBillPayload(ewayBill);
  const isExistingInvoice = Boolean(firstNonEmpty(data.invoiceId, data.invoiceNo));

  const completeItems = invoiceItems.map((item) => {
    const fullSourceRow = stripInvoiceHelperFields(item.source || {});

    const sourceQty = fullSourceRow.Qty ?? fullSourceRow.qty ?? fullSourceRow.Quantity ?? fullSourceRow.quantity ?? "";
    const sourceUnit = normalizeDimensionUnit(
      firstNonEmpty(fullSourceRow.Unit, fullSourceRow.unit, fullSourceRow.UOM, fullSourceRow.uom)
    );
    const sourceWidth = fullSourceRow.Width ?? fullSourceRow.width ?? "";
    const sourceHeight = fullSourceRow.Height ?? fullSourceRow.height ?? fullSourceRow.Length ?? fullSourceRow.length ?? "";
    const sourceBillingWidth = getCsBillingWidth(fullSourceRow);
    const sourceBillingHeight = getCsBillingHeight(fullSourceRow);
    const sourceRate = fullSourceRow.Rate ?? fullSourceRow.rate ?? fullSourceRow.unitPrice ?? fullSourceRow.UnitPrice ?? "";
    const sourceDescription = firstNonEmpty(
      item.description,
      item.Description,
      item.simplifiedProductName,
      item.SimplifiedProductName,
      getCsSourceDescription(fullSourceRow),
      fullSourceRow.Description,
      fullSourceRow.description,
      fullSourceRow.NameSubCode,
      fullSourceRow.nameSubCode,
      ""
    );

    const sourceHsn = fullSourceRow.Hsn ?? fullSourceRow.HsnCode ?? fullSourceRow.HSNCode ?? fullSourceRow.hsnCode ?? fullSourceRow.hsn ?? "";
    const sourceMedia = fullSourceRow.Media ?? fullSourceRow.media ?? "";

    const invoiceQty = toNumber(item.qty || sourceQty);
    const invoiceWidth = toNumber(item.width || sourceWidth);
    const invoiceHeight = toNumber(item.height || sourceHeight);
    const invoiceBillingWidth = toNumber(item.billingWidth || sourceBillingWidth || invoiceWidth);
    const invoiceBillingHeight = toNumber(item.billingHeight || sourceBillingHeight || invoiceHeight);
    const invoiceRate = toNumber(item.rate || sourceRate);
    const invoiceAmount = calculateItemAmount(item);
    const invoiceGstAmount = (invoiceAmount * GST_RATE) / 100;
    const invoiceLineTotal = invoiceAmount + invoiceGstAmount;
    const itemBillingLocation = getPrimaryBillingLocation(
      effectiveBillFromLocation,
      fullSourceRow.BillingLocation,
      fullSourceRow.billingLocation,
      item.BillingLocation,
      item.billingLocation,
      invoiceBillingLocation
    );
    const itemProductionLocation = firstNonEmpty(
      fullSourceRow.ProductionLocation,
      fullSourceRow.productionLocation,
      item.ProductionLocation,
      item.productionLocation
    );

    const totalSqFt =
      fullSourceRow.TotalSqFt ??
      fullSourceRow["Total Sq.ft"] ??
      (toNumber(sourceWidth) && toNumber(sourceHeight)
        ? (toNumber(sourceWidth) * toNumber(sourceHeight) * (toNumber(sourceQty) || 1)) / 144
        : 0);
    const invoiceTotalSqFt = calculateBillingSqFt(
      invoiceBillingWidth,
      invoiceBillingHeight,
      invoiceQty || 1,
      item.unit || sourceUnit
    );

    return {
      CsId: toText(fullSourceRow.CsId || fullSourceRow.csId || fullSourceRow.id || fullSourceRow._id),
      JobNo: toText(item.jobNo || fullSourceRow.JobNo || fullSourceRow.jobNo),
      Client: toText(fullSourceRow.Client || fullSourceRow.client),
      SubClient: toText(fullSourceRow.SubClient || fullSourceRow.subClient),
      AccountManager: toText(fullSourceRow.AccountManager || fullSourceRow.accountManager),

      Region: toText(fullSourceRow.Region || fullSourceRow.region || previewPayload.region),
      ProductionLocation: toText(itemProductionLocation),
      BillingLocation: toText(itemBillingLocation),
      productionLocation: toText(itemProductionLocation),
      billingLocation: toText(itemBillingLocation),

      City: toText(fullSourceRow.City || fullSourceRow.city),
      Date: toText(fullSourceRow.Date || fullSourceRow.date || data.invoiceDate),
      VisualCode: toText(fullSourceRow.VisualCode || fullSourceRow.visualCode),

      NameSubCode: toText(
        item.description ||
          item.Description ||
        fullSourceRow.NameSubCode ||
          fullSourceRow.nameSubCode ||
          sourceDescription ||
          item.description
      ),

      ProjectName: toText(fullSourceRow.ProjectName || fullSourceRow.projectname || data.projectName),
      Type: toText(item.lineType || fullSourceRow.Type || fullSourceRow.type || "media"),
      LineType: toText(item.lineType || fullSourceRow.Type || fullSourceRow.type || "media"),
      IsEstimateCharge: item.source?._fromEstimateCharge ? "1" : "0",
      EstimateNo: toText(fullSourceRow.EstimateNo || fullSourceRow.estimateNo),
      ProductCode: toText(fullSourceRow.ProductCode || fullSourceRow.productCode),

Description: toText(item.description || item.Description || sourceDescription),
Hsn: toText(item.hsnCode || sourceHsn),
Media: toText(item.media || sourceMedia),
Qty: toText(invoiceQty || sourceQty),
Unit: toText(item.unit || sourceUnit),
Width: toText(invoiceWidth || sourceWidth),
Height: toText(invoiceHeight || sourceHeight),
BillingWidth: toText(invoiceBillingWidth || sourceBillingWidth),
BillingHeight: toText(invoiceBillingHeight || sourceBillingHeight),
Rate: toText(invoiceRate || sourceRate),
description: toText(item.description || item.Description || sourceDescription),
hsn: toText(item.hsnCode || sourceHsn),
media: toText(item.media || sourceMedia),
qty: toText(invoiceQty || sourceQty),
unit: toText(item.unit || sourceUnit),
width: toText(invoiceWidth || sourceWidth),
height: toText(invoiceHeight || sourceHeight),
billingWidth: toText(invoiceBillingWidth || sourceBillingWidth),
billingHeight: toText(invoiceBillingHeight || sourceBillingHeight),
rate: toText(invoiceRate || sourceRate),
      InternalMedia: toText(fullSourceRow.InternalMedia || fullSourceRow.internalMedia),
      ExternalMedia: toText(fullSourceRow.ExternalMedia || fullSourceRow.externalMedia),

      TotalSqFt: toText(totalSqFt),
      BillingSqFt: toText(fullSourceRow.BillingSqFt || fullSourceRow.billingSqFt),
      TotalCalcSqFt: toText(fullSourceRow.TotalCalcSqFt || fullSourceRow.totalCalcSqFt),

      Amount: toText(invoiceAmount),
      amount: toText(invoiceAmount),
      TaxableValue: toText(invoiceAmount),
      taxableValue: toText(invoiceAmount),
      GstRate: toText(GST_RATE),
      gstRate: toText(GST_RATE),
      GstAmount: toText(invoiceGstAmount),
      gstAmount: toText(invoiceGstAmount),
      LineTotal: toText(invoiceLineTotal),
      lineTotal: toText(invoiceLineTotal),

      InvoiceDescription: toText(item.description || item.Description || sourceDescription),
      invoiceDescription: toText(item.description || item.Description || sourceDescription),
      InvoiceMedia: toText(item.media || sourceMedia),
      invoiceMedia: toText(item.media || sourceMedia),
      InvoiceHsn: toText(item.hsnCode || sourceHsn),
      invoiceHsn: toText(item.hsnCode || sourceHsn),
      InvoiceQty: toText(invoiceQty),
      invoiceQty: toText(invoiceQty),
      InvoiceUnit: toText(item.unit || sourceUnit),
      invoiceUnit: toText(item.unit || sourceUnit),
      InvoiceWidth: toText(invoiceWidth),
      invoiceWidth: toText(invoiceWidth),
      InvoiceHeight: toText(invoiceHeight),
      invoiceHeight: toText(invoiceHeight),
      InvoiceBillingWidth: toText(invoiceBillingWidth),
      invoiceBillingWidth: toText(invoiceBillingWidth),
      InvoiceBillingHeight: toText(invoiceBillingHeight),
      invoiceBillingHeight: toText(invoiceBillingHeight),
      InvoiceRate: toText(invoiceRate),
      invoiceRate: toText(invoiceRate),
      InvoiceTotalSqFt: toText(invoiceTotalSqFt),
      invoiceTotalSqFt: toText(invoiceTotalSqFt),
      InvoiceAmount: toText(invoiceAmount),
      invoiceAmount: toText(invoiceAmount),
      InvoiceTaxableValue: toText(invoiceAmount),
      invoiceTaxableValue: toText(invoiceAmount),

      Lamination: toText(fullSourceRow.Lamination || fullSourceRow.lamination),
      Mounting: toText(fullSourceRow.Mounting || fullSourceRow.mounting),
      Installation: toText(fullSourceRow.Installation || fullSourceRow.installation),
      Implementation: toText(fullSourceRow.Implementation || fullSourceRow.implementation),

      Deadline: toText(fullSourceRow.Deadline || fullSourceRow.deadline),
      PrinterDeadline: toText(fullSourceRow.PrinterDeadline || fullSourceRow.printerDeadline),
      DesignerDeadline: toText(fullSourceRow.DesignerDeadline || fullSourceRow.designerDeadline),
      ArtworkerDeadline: toText(fullSourceRow.ArtworkerDeadline || fullSourceRow.artworkerDeadline),

      DesignerName: toText(fullSourceRow.DesignerName || fullSourceRow.designerName),
      DesignerId: toText(fullSourceRow.DesignerId || fullSourceRow.designerId),
      PrinterPrintingName: toText(fullSourceRow.PrinterPrintingName || fullSourceRow.printerPrintingName),
      MachineName: toText(fullSourceRow.MachineName || fullSourceRow.machineName),

      IsOnHold: toText(fullSourceRow.IsOnHold || fullSourceRow.isOnHold || "0"),
      IsPrinitngdone: toText(fullSourceRow.IsPrinitngdone || fullSourceRow.isPrinitngdone || "0"),
      IsPackingDone: toText(fullSourceRow.IsPackingDone || fullSourceRow.isPackingDone || "0"),
      IsDeliveryDone: toText(fullSourceRow.IsDeliveryDone || fullSourceRow.isDeliveryDone || "0"),
      IsImplementationDone: toText(fullSourceRow.IsImplementationDone || fullSourceRow.isImplementationDone || "0"),

      DeliveryTimestamp: toText(fullSourceRow.DeliveryTimestamp || fullSourceRow.deliveryTimestamp),
      ImplementationTimestamp: toText(fullSourceRow.ImplementationTimestamp || fullSourceRow.implementationTimestamp),

      ChallanNo: toText(
        fullSourceRow.ChallanNo ||
          fullSourceRow.challanNo ||
          fullSourceRow.DeliveryChallanNo ||
          fullSourceRow.deliveryChallanNo ||
          fullSourceRow.ImplementationChallanNo ||
          fullSourceRow.implementationChallanNo
      ),
      challanNo: toText(
        fullSourceRow.ChallanNo ||
          fullSourceRow.challanNo ||
          fullSourceRow.DeliveryChallanNo ||
          fullSourceRow.deliveryChallanNo ||
          fullSourceRow.ImplementationChallanNo ||
          fullSourceRow.implementationChallanNo
      ),
      ChallanDate: toText(
        fullSourceRow.ChallanDate ||
          fullSourceRow.challanDate ||
          fullSourceRow.DeliveryChallanDate ||
          fullSourceRow.deliveryChallanDate ||
          fullSourceRow.ImplementationChallanDate ||
          fullSourceRow.implementationChallanDate
      ),
      challanDate: toText(
        fullSourceRow.ChallanDate ||
          fullSourceRow.challanDate ||
          fullSourceRow.DeliveryChallanDate ||
          fullSourceRow.deliveryChallanDate ||
          fullSourceRow.ImplementationChallanDate ||
          fullSourceRow.implementationChallanDate
      ),
      DeliveryChallanNo: toText(fullSourceRow.DeliveryChallanNo || fullSourceRow.deliveryChallanNo || fullSourceRow.ChallanNo || fullSourceRow.challanNo),
      ImplementationChallanNo: toText(
        fullSourceRow.ImplementationChallanNo || fullSourceRow.implementationChallanNo || fullSourceRow.ChallanNo || fullSourceRow.challanNo
      ),
      PoNo: toText(data.poNumber || fullSourceRow.PoNo || fullSourceRow.poNo || fullSourceRow.PONo || fullSourceRow.poNumber),
      poNo: toText(data.poNumber || fullSourceRow.PoNo || fullSourceRow.poNo || fullSourceRow.PONo || fullSourceRow.poNumber),
      PoDate: toText(fullSourceRow.PoDate || fullSourceRow.poDate || fullSourceRow.PODate),
      poDate: toText(fullSourceRow.PoDate || fullSourceRow.poDate || fullSourceRow.PODate),
      InvoiceNo: toText(data.invoiceNo),
      invoiceNo: toText(data.invoiceNo),
      InvoiceDate: toText(data.invoiceDate),
      invoiceDate: toText(data.invoiceDate),

      SalonAddress: toText(fullSourceRow.SalonAddress || fullSourceRow.salonAddress),
      DispatchAddress: toText(fullSourceRow.DispatchAddress || fullSourceRow.dispatchAddress),

      Remarks: toText(fullSourceRow.Remarks || fullSourceRow.remarks),
      OnHoldReason: toText(fullSourceRow.OnHoldReason || fullSourceRow.onHoldReason),
      OnHoldRemark: toText(fullSourceRow.OnHoldRemark || fullSourceRow.onHoldRemark),
      ReprintReason: toText(fullSourceRow.ReprintReason || fullSourceRow.reprintReason),

      CampaignId: toText(fullSourceRow.CampaignId || fullSourceRow.campaignid),
      ItemId: toText(fullSourceRow.ItemId || fullSourceRow.itemid || item.id),

      Enteredby: toText(fullSourceRow.Enteredby || fullSourceRow.enteredby || userContext.username),
      Entereddat: fullSourceRow.Entereddat || fullSourceRow.entereddat || null,
    };
  });

  const productionGroups = completeItems
    .filter(isDifferentProductionBillingLocation)
    .reduce((groups, item) => {
      const productionLocation = item.ProductionLocation || "Unknown";
      const billingLocation = item.BillingLocation || effectiveBillFromLocation || "Unknown";
      const key = `${productionLocation}\u0000${billingLocation}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});

  const productionInvoices = Object.entries(productionGroups).map(([groupKey, items]) => {
    const [productionLocation, billingLocation] = groupKey.split("\u0000");
    const totals = calculateInvoiceTotals(items);
    const productionBillFromDetails = getCompanyBranchDetails(productionLocation);
    const internalBillToDetails = getCompanyBranchDetails(
      billingLocation || effectiveBillFromLocation || productionLocation
    );

    return {
      InvoiceNo: "",
      InvoiceType: "Internal Bill",
      InvoiceSubType: "ProductionToBilling",
      ParentInvoiceNo: data.invoiceNo || "",

      InvoiceDate: data.invoiceDate || "",
      JobCards: joinUnique(items.map((x) => x.JobNo)),
      ClientBillAs:
        internalBillToDetails.companyName ||
        invoiceCompanyDetails.companyName ||
        data.clientName ||
        previewPayload.billAsName,
      PoNo: previewPayload.poNumber || "",
      ItrNo: data.itrNo || "",
      ITRNo: data.itrNo || "",
      itrNo: data.itrNo || "",
      ChallanNo: joinUnique(items.map((x) => x.ChallanNo || x.challanNo)),
      ChallanDate: joinUnique(items.map((x) => x.ChallanDate || x.challanDate)),
      ProjectName: data.projectName || "",
      Region: joinUnique(items.map((x) => x.Region)),

      ProductionLocation: productionLocation,
      BillingLocation: billingLocation || "",

      BillFromLocation: productionLocation,
      BillFromCompanyName: productionBillFromDetails.companyName,
      BillFromCompanyAddress: productionBillFromDetails.companyAddress,
      BillFromCompanyGst: productionBillFromDetails.companyGst,
      BillToLocation: billingLocation || effectiveBillFromLocation || "",
      BillToCompanyName:
        internalBillToDetails.companyName ||
        invoiceCompanyDetails.companyName ||
        data.clientName ||
        previewPayload.billAsName,
      BillToCompanyAddress:
        internalBillToDetails.companyAddress ||
        invoiceCompanyDetails.companyAddress,
      BillToCompanyGst:
        internalBillToDetails.companyGst ||
        invoiceCompanyDetails.companyGst,
      InternalBillRequired: true,
      internalBillRequired: true,
      IsInternalBill: true,
      isInternalBill: true,

      BillTo: mapInvoiceAddress(dedupeInvoiceAddresses(data.billTo)),
      ShipTo: mapInvoiceAddress(dedupeInvoiceAddresses(data.shipTo)),

      Items: items,
      ...totals,

      Notes: data.notes || "",
      ...ewayBillPayload,
      Status: status,
      status,
      InvoiceStatus: status,
      invoiceStatus: status,
      IsFinal: status === "Final",
      isFinal: status === "Final",
      Enteredby: userContext.username || "",
      Entereddat: new Date().toISOString(),
      Lstupateby: userContext.username || "",
      Lstupdatedt: new Date().toISOString(),
      Del_index: "1",
    };
  });

  const customerTotals = calculateInvoiceTotals(completeItems);

  const customerInvoice = {
    InvoiceNo: data.invoiceNo || "",
    InvoiceType: "Tax Invoice",
    ParentInvoiceNo: "",

    InvoiceDate: data.invoiceDate || "",
    JobCards: data.jobCardNo || "",
    ClientBillAs: data.clientName || previewPayload.billAsName,
    PoNo: previewPayload.poNumber || "",
    ItrNo: data.itrNo || "",
    ITRNo: data.itrNo || "",
    itrNo: data.itrNo || "",
    ChallanNo: previewPayload.challanNo || "",
    ChallanDate: previewPayload.challanDate || "",
    ProjectName: data.projectName || "",
    Region: previewPayload.region || "",

    ProductionLocation: joinUnique(completeItems.map((x) => x.ProductionLocation)),
    BillingLocation: effectiveBillFromLocation || completeItems[0]?.BillingLocation || "",

    BillFromLocation: effectiveBillFromLocation || completeItems[0]?.BillingLocation || "",
    BillFromCompanyName: invoiceCompanyDetails.companyName,
    BillFromCompanyAddress: invoiceCompanyDetails.companyAddress,
    BillFromCompanyGst: invoiceCompanyDetails.companyGst,
    BillToCompanyName: invoiceCompanyDetails.companyName,
    BillToCompanyAddress: invoiceCompanyDetails.companyAddress,
    BillToCompanyGst: invoiceCompanyDetails.companyGst,
    BillToLocation: "Customer",
    InternalBillRequired: hasInternalBill,
    internalBillRequired: hasInternalBill,
    HasInternalBill: hasInternalBill,
    hasInternalBill,
    IsInternalBill: false,
    isInternalBill: false,

    BillTo: mapInvoiceAddress(dedupeInvoiceAddresses(data.billTo)),
    ShipTo: mapInvoiceAddress(dedupeInvoiceAddresses(data.shipTo)),

    Items: completeItems,
    ...customerTotals,

    Notes: data.notes || "",
    ...ewayBillPayload,
    Status: status,
    status,
    InvoiceStatus: status,
    invoiceStatus: status,
    IsFinal: status === "Final",
    isFinal: status === "Final",
    Enteredby: userContext.username || "",
    Entereddat: new Date().toISOString(),
    Lstupateby: userContext.username || "",
    Lstupdatedt: new Date().toISOString(),
    Del_index: "1",
  };

  const savePayload = {
    InvoiceNo: data.invoiceNo || "",
    invoiceNo: data.invoiceNo || "",
    Status: status,
    status,
    InvoiceStatus: status,
    invoiceStatus: status,
    IsFinal: status === "Final",
    isFinal: status === "Final",
    BillingLocation: effectiveBillFromLocation || completeItems[0]?.BillingLocation || "",
    ItrNo: data.itrNo || "",
    ITRNo: data.itrNo || "",
    itrNo: data.itrNo || "",
    BillFromLocation: effectiveBillFromLocation || completeItems[0]?.BillingLocation || "",
    BillFromCompanyName: invoiceCompanyDetails.companyName,
    BillFromCompanyAddress: invoiceCompanyDetails.companyAddress,
    BillFromCompanyGst: invoiceCompanyDetails.companyGst,
    BillToCompanyName: invoiceCompanyDetails.companyName,
    BillToCompanyAddress: invoiceCompanyDetails.companyAddress,
    BillToCompanyGst: invoiceCompanyDetails.companyGst,
    InternalBillRequired: hasInternalBill,
    internalBillRequired: hasInternalBill,
    HasInternalBill: hasInternalBill,
    hasInternalBill,
    ...ewayBillPayload,
    CustomerInvoice: customerInvoice,
    ProductionInvoices: productionInvoices,
  };

  // SaveMultiLocationInvoice is create-only. Any existing invoice, including a
  // draft being finalized, must go through Save to avoid duplicate inserts.
  const updatePayload = {
    ...customerInvoice,
    ...(data.invoiceId
      ? {
          Id: data.invoiceId,
          id: data.invoiceId,
        }
      : {}),
    InvoiceNo: data.invoiceNo,
    invoiceNo: data.invoiceNo,
  };

  try {
    setIsSaving(true);

    let existingInvoiceId = data.invoiceId || "";
    if (isExistingInvoice && !existingInvoiceId && data.invoiceNo && config.SalesInvoice.URL.GetByInvoiceNo) {
      const existingResponse = await axios.get(config.SalesInvoice.URL.GetByInvoiceNo(data.invoiceNo), {
        timeout: 10000,
      });
      existingInvoiceId = getSavedInvoiceId(existingResponse?.data);
    }

    const requestUpdatePayload = existingInvoiceId
      ? { ...updatePayload, Id: existingInvoiceId, id: existingInvoiceId }
      : updatePayload;

    const response = await axios.post(
      isExistingInvoice ? config.SalesInvoice.URL.Save : config.SalesInvoice.URL.SaveMultiLocationInvoice,
      isExistingInvoice ? requestUpdatePayload : savePayload,
      {
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      }
    );

    let savedInvoiceNo = getSavedInvoiceNoFromResponse(response?.data);

    if (!savedInvoiceNo) {
      try {
        savedInvoiceNo = await findSavedCustomerInvoiceNo({
          jobCardNo: data.jobCardNo,
          clientName: data.clientName || previewPayload.billAsName,
          grandTotal: invoiceGrandTotal,
        });
      } catch (lookupError) {
        console.warn("Could not look up saved invoice number after save", lookupError);
      }
    }

    const resolvedInvoiceNo = savedInvoiceNo || data.invoiceNo || previewPayload.invoiceNo;
    const resolvedInvoiceId = getSavedInvoiceId(response?.data) || existingInvoiceId || data.invoiceId || "";

    if (resolvedInvoiceNo || resolvedInvoiceId) {
      setData((prev) => ({
        ...prev,
        invoiceNo: resolvedInvoiceNo || prev.invoiceNo,
        invoiceId: resolvedInvoiceId || prev.invoiceId,
      }));
    }
    rememberEwayBillDetails(resolvedInvoiceNo, ewayBill);

    const nextPreviewPayload = addInvoiceNoToPreviewPayload(
      {
        ...previewPayload,
        ...ewayBillPayload,
        ewayBill,
        invoiceRows: invoiceRows.map((row) => ({
          ...row,
          invoiceNo: resolvedInvoiceNo || row.invoiceNo || "",
          InvoiceNo: resolvedInvoiceNo || row.InvoiceNo || "",
          invoiceDate: previewPayload.invoiceDate || row.invoiceDate || "",
          InvoiceDate: previewPayload.InvoiceDate || row.InvoiceDate || "",
        })),
      },
      resolvedInvoiceNo
    );
    const invoiceNoForStatus = resolvedInvoiceNo;

    rememberInvoiceStatus(invoiceNoForStatus, status);

    if (status === "Draft") {
      const savedDraftData = response?.data?.customerInvoice
        ? buildDraftDataFromSavedInvoice(response.data.customerInvoice, {
            ...data,
            selectedJobIds: buildDraftSelectedJobIds(data.selectedJobIds, jobCards, data.jobCardNo),
            items: data.items,
            allowWithoutChallan: data.allowWithoutChallan,
            billFromLocation: data.billFromLocation,
            groupByMedia: data.groupByMedia,
            groupByStore: data.groupByStore,
            groupByCity: data.groupByCity,
            groupByDescription: data.groupByDescription,
            ewayBill,
            TransporterName: ewayBill.transporterName,
            ModeOfTransportation: ewayBill.transportMode,
            DistanceOfTransportation: ewayBill.transportDistanceKm,
            VehicleNo: ewayBill.vehicleNo,
            TransporterGstNo: ewayBill.transporterGstNo,
            TransporterGSTNo: ewayBill.transporterGstNo,
          })
        : {
            ...data,
            selectedJobIds: buildDraftSelectedJobIds(data.selectedJobIds, jobCards, data.jobCardNo),
            sourceBillTo: data.selectedJobIds.length ? dedupeInvoiceAddresses(data.billTo) : [],
            sourceShipTo: data.selectedJobIds.length ? dedupeInvoiceAddresses(data.shipTo) : [],
            ...ewayBillPayload,
            ewayBill,
            invoiceNo: resolvedInvoiceNo,
            status,
            savedAt: new Date().toISOString(),
          };

      localStorage.setItem(
        "invoiceDraftData",
        JSON.stringify(savedDraftData)
      );

      if (response?.data?.customerInvoice) {
        setData((prev) => ({
          ...prev,
          invoiceId: savedDraftData.invoiceId || resolvedInvoiceId || prev.invoiceId,
          invoiceNo: savedDraftData.invoiceNo || prev.invoiceNo,
          invoiceDate: savedDraftData.invoiceDate || prev.invoiceDate,
          jobCardNo: savedDraftData.jobCardNo || prev.jobCardNo,
          billToLocked: true,
          shipToLocked: true,
          billTo: Array.isArray(savedDraftData.billTo) && savedDraftData.billTo.length ? savedDraftData.billTo : prev.billTo,
          shipTo: Array.isArray(savedDraftData.shipTo) && savedDraftData.shipTo.length ? savedDraftData.shipTo : prev.shipTo,
          clientName: savedDraftData.clientName || prev.clientName,
          poNumber: savedDraftData.poNumber || prev.poNumber,
          projectName: savedDraftData.projectName || prev.projectName,
          notes: savedDraftData.notes || prev.notes,
          ewayBill: savedDraftData.ewayBill || prev.ewayBill,
          items: Array.isArray(savedDraftData.items) && savedDraftData.items.length ? savedDraftData.items : prev.items,
          TransporterName: savedDraftData.TransporterName || prev.TransporterName,
          ModeOfTransportation: savedDraftData.ModeOfTransportation || prev.ModeOfTransportation,
          DistanceOfTransportation: savedDraftData.DistanceOfTransportation || prev.DistanceOfTransportation,
          VehicleNo: savedDraftData.VehicleNo || prev.VehicleNo,
          TransporterGstNo: savedDraftData.TransporterGstNo || prev.TransporterGstNo,
          TransporterGSTNo: savedDraftData.TransporterGSTNo || prev.TransporterGSTNo,
        }));
      }
    } else {
      localStorage.removeItem("invoiceDraftData");
    }
    localStorage.setItem("invoicePrintPreviewData", JSON.stringify(nextPreviewPayload));

    const productionNos = response?.data?.productionInvoiceNos || [];

    setMessage(
      status === "Draft"
        ? `Draft saved successfully. Production invoices: ${productionNos.length ? productionNos.join(", ") : "-"}`
        : `${status} customer invoice ${resolvedInvoiceNo || ""} saved successfully. Production invoices: ${
            productionNos.length ? productionNos.join(", ") : "-"
          }`
    );
  } catch (error) {
    console.error("Failed to save multi-location invoice", error);
    setMessage(
      error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        "Failed to save invoice."
    );
  } finally {
    setIsSaving(false);
  }
};

  const handleReset = () => {
    setData(createInitialData());
    setQueueJobFilterNos([]);
    localStorage.removeItem("invoiceDraftData");
    localStorage.removeItem("invoicePreviewBuilderData");
    localStorage.removeItem("invoicePrintPreviewData");
    setMessage("Invoice reset.");
  };

  const handlePrint = async () => {
    const invoiceRows = buildPrintRows();
    if (!selectedItems.length || !invoiceRows.length) {
      setMessage("Please select invoice row(s) before printing.");
      return;
    }
    const invoiceGrandTotal = invoiceRows.reduce((sum, row) => sum + toNumber(row.lineTotal), 0);
    if (invoiceGrandTotal <= 0) {
      setMessage("Grand total is 0. Please enter Qty, Width, Height and Rate before printing.");
      return;
    }
    if (!validateEwayBillRequirement("printing")) {
      return;
    }
    const previewPayload = buildInvoicePreviewPayload(data, jobCards, invoiceRows);
    const ewayBill = normalizeEwayBillDetails(data);
    const ewayBillPayload = buildEwayBillPayload(ewayBill);
    let resolvedInvoiceNo = firstNonEmpty(data.invoiceNo, previewPayload.invoiceNo);

    if (!resolvedInvoiceNo) {
      try {
        setIsPrinting(true);
        resolvedInvoiceNo = await findSavedCustomerInvoiceNo({
          jobCardNo: data.jobCardNo,
          clientName: data.clientName || previewPayload.billAsName,
          grandTotal: invoiceGrandTotal,
        });
        if (resolvedInvoiceNo) {
          setData((prev) => ({
            ...prev,
            invoiceNo: resolvedInvoiceNo,
          }));
        }
      } catch (lookupError) {
        console.warn("Could not look up saved invoice number before printing", lookupError);
      } finally {
        setIsPrinting(false);
      }
    }

    const printPayload = addInvoiceNoToPreviewPayload(
      {
        ...previewPayload,
        ...ewayBillPayload,
        ewayBill,
        invoiceRows: invoiceRows.map((row) => ({
          ...row,
          invoiceNo: resolvedInvoiceNo || row.invoiceNo || "",
          InvoiceNo: resolvedInvoiceNo || row.InvoiceNo || "",
          invoiceDate: previewPayload.invoiceDate || row.invoiceDate || "",
          InvoiceDate: previewPayload.InvoiceDate || row.InvoiceDate || "",
        })),
      },
      resolvedInvoiceNo
    );

    rememberEwayBillDetails(resolvedInvoiceNo, ewayBill);
    localStorage.setItem("invoicePrintPreviewData", JSON.stringify(printPayload));

    if (!resolvedInvoiceNo) {
      setMessage("Print preview opened, but invoice number was not found. Please save the invoice or print from All Invoices.");
    }

    window.open(
      resolvedInvoiceNo
        ? `${all_routes.invoiceprintpreview}/${encodeURIComponent(resolvedInvoiceNo)}`
        : all_routes.invoiceprintpreview,
      "_blank"
    );
  };

  return (
    <div className="page-wrapper invoice-page-wrapper">
      <div className="content container-fluid invoice-screen">
        <style>{`
          /* Keep the page inside the available space beside the sidebar. */
          .invoice-page-wrapper {
            width: auto !important;
            min-width: 0 !important;
            overflow-x: hidden;
          }
          .invoice-page-wrapper,
          .invoice-page-wrapper * {
            box-sizing: border-box;
          }
          .invoice-screen {
            background: #f6f8fb;
            min-height: 100vh;
            padding: 16px 20px 32px;
            width: 100%;
            max-width: 100%;
            min-width: 0;
            overflow-x: hidden;
          }
          .invoice-topbar {
            position: sticky;
            top: 20px;
            z-index: 20;
            display: grid;
            grid-template-columns: minmax(280px, 1fr) auto;
            align-items: center;
            gap: 16px;
            padding: 20px 20px;
            margin: 0 0 18px;
            background: #fff;
            border: 1px solid #dce4ef;
            border-radius: 10px;
            box-shadow: 0 8px 22px rgba(20, 32, 48, 0.06);
          }
          .invoice-queue-section {
            position: relative;
            top: auto;
            z-index: auto;
          }
          .invoice-queue-section .invoice-section-header {
            padding: 14px 20px;
            margin: 0 -20px 14px;
            background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
            border-bottom: 1px solid #e3eaf5;
            border-radius: 0;
          }
          .invoice-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }
          .invoice-brand-icon {
            width: 36px;
            height: 36px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            background: #2f56d9;
            color: #fff;
          }
          .invoice-title {
            margin: 0;
            color: #182235;
            font-size: 18px;
            font-weight: 800;
            line-height: 1.2;
          }
          .invoice-subtitle {
            color: #667085;
            font-size: 12px;
            line-height: 1.35;
          }
          .invoice-actions,
          .invoice-tabs {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .invoice-actions {
            justify-content: flex-end;
          }
          .invoice-total-pill {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 38px;
            padding: 8px 12px;
            border: 1px solid #cfd8e6;
            border-radius: 8px;
            background: #f8fbff;
            white-space: nowrap;
          }
          .invoice-total-pill span {
            color: #667085;
            font-size: 12px;
          }
          .invoice-total-pill strong {
            color: #177245;
            font-size: 16px;
          }
          .invoice-icon-btn,
          .invoice-primary-btn,
          .invoice-tab-btn {
            min-height: 38px;
            border: 1px solid #cfd8e6;
            border-radius: 8px;
            background: #fff;
            color: #1f2937;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 8px 11px;
            font-weight: 700;
          }
          .invoice-icon-btn {
            width: 38px;
            padding: 0;
          }
          .invoice-primary-btn,
          .invoice-tab-btn.active {
            background: #2f56d9;
            color: #fff;
            border-color: #2f56d9;
          }
          .invoice-tab-btn {
            min-width: 128px;
            justify-content: space-between;
          }
          .invoice-tab-btn span {
            min-width: 24px;
            padding: 1px 7px;
            border-radius: 999px;
            background: #eef2f7;
            color: #344054;
            font-size: 12px;
            text-align: center;
          }
          .invoice-tab-btn.active span {
            background: rgba(255,255,255,0.2);
            color: #fff;
          }
          .invoice-section {
            background: #fff;
            border: 1px solid #dce4ef;
            border-radius: 8px;
            box-shadow: 0 10px 24px rgba(22, 34, 51, 0.05);
            padding: 18px;
            margin-bottom: 16px;
            width: 100%;
            max-width: 100%;
            min-width: 0;
            overflow: hidden;
          }
          .invoice-section-header {
            display: grid;
            grid-template-columns: minmax(260px, 1fr) minmax(360px, 424px);
            align-items: start;
            gap: 16px;
            margin-bottom: 14px;
          }
          .invoice-section-header.single {
            grid-template-columns: 1fr;
          }
          .invoice-section-heading {
            min-width: 0;
            padding-top: 2px;
          }
          .invoice-section h5 {
            margin: 0;
            color: #1f2937;
            font-weight: 800;
          }
          .job-card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(290px, 304px));
            gap: 12px;
            align-items: stretch;
            justify-content: start;
          }
          .job-picker-card {
            border: 1px solid #d7dfeb;
            border-radius: 8px;
            padding: 12px;
            background: #fbfcff;
            min-height: 116px;
            margin: 0;
            cursor: pointer;
            transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
          }
          .job-picker-card.active {
            border-color: #2f56d9;
            background: #f3f6ff;
            box-shadow: 0 0 0 2px rgba(47, 86, 217, 0.08);
          }
          .job-card-title-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: start;
            gap: 10px;
          }
          .job-card-title-row strong,
          .job-card-text {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .job-source-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 2px 8px;
            background: #eef4fb;
            color: #344054;
            font-size: 11px;
            font-weight: 700;
            text-transform: capitalize;
          }
          .invoice-meta-grid,
          .address-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px 12px;
          }
          .eway-detail-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px 12px;
            align-items: end;
          }
          .eway-mode-options {
            min-height: 40px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }
          .eway-status-pill {
            display: inline-flex;
            align-items: center;
            min-height: 28px;
            padding: 4px 10px;
            border-radius: 999px;
            border: 1px solid #cfd8e6;
            color: #344054;
            background: #f8fbff;
            font-size: 12px;
            font-weight: 800;
          }
          .eway-status-pill.required {
            border-color: #f59e0b;
            background: #fff7ed;
            color: #92400e;
          }
          .invoice-meta-grid .form-label,
          .eway-detail-grid .form-label,
          .address-card .form-label,
          .invoice-section .form-label {
            color: #475467;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 5px;
          }
          .address-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: start;
            gap: 16px;
            width: 100%;
            max-width: 100%;
            min-width: 0;
          }
          .address-grid > div,
          .address-card,
          .address-card-row,
          .address-card .form-control {
            width: 100%;
            max-width: 100%;
            min-width: 0;
          }
          .address-column-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            min-height: 34px;
            margin-bottom: 10px;
          }
          .address-card {
            border: 1px solid #d7dfeb;
            border-radius: 8px;
            padding: 12px;
            background: #fbfcff;
          }
          .address-card-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 40px;
            gap: 8px;
            margin-bottom: 8px;
          }
          .address-card .form-control {
            min-height: 40px;
          }
          .address-card textarea.form-control {
            min-height: 66px;
            resize: vertical;
          }
          .invoice-queue-actions,
          .invoice-grid-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            flex-wrap: wrap;
          }
          .invoice-queue-actions {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: start;
            width: 100%;
            min-width: 0;
          }
          .invoice-queue-actions .form-control {
            width: 100%;
            height: 36px;
          }
          .invoice-grid-actions .form-check {
            min-height: 32px;
            display: flex;
            align-items: center;
            margin: 0 4px 0 0;
          }
          .invoice-grid-table {
            min-width: 1360px;
            margin-bottom: 0;
            table-layout: fixed;
          }
          .invoice-grid-table th:nth-child(1),
          .invoice-grid-table td:nth-child(1) {
            width: 52px;
            text-align: center;
          }
          .invoice-grid-table th:nth-child(2),
          .invoice-grid-table td:nth-child(2) {
            width: 130px;
          }
          .invoice-grid-table th:nth-child(3),
          .invoice-grid-table td:nth-child(3) {
            width: 260px;
          }
          .invoice-grid-table th:nth-child(4),
          .invoice-grid-table td:nth-child(4) {
            width: 150px;
          }
          .invoice-grid-table th:nth-child(5),
          .invoice-grid-table td:nth-child(5) {
            width: 130px;
          }
          .invoice-grid-table th:nth-child(6),
          .invoice-grid-table td:nth-child(6) {
            width: 110px;
          }
          .invoice-grid-table th:nth-child(7),
          .invoice-grid-table td:nth-child(7) {
            width: 110px;
          }
          .invoice-grid-table th:nth-child(8),
          .invoice-grid-table td:nth-child(8) {
            width: 110px;
          }
          .invoice-grid-table th:nth-child(9),
          .invoice-grid-table td:nth-child(9) {
            width: 110px;
          }
          .invoice-grid-table th:nth-child(10),
          .invoice-grid-table td:nth-child(10) {
            width: 96px;
          }
          .invoice-grid-table th:nth-child(11),
          .invoice-grid-table td:nth-child(11) {
            width: 96px;
          }
          .invoice-grid-table th {
            background: #eaf2ff;
            border: 1px solid #d5deea;
            color: #1f3f76;
            font-size: 12px;
            padding: 9px 10px;
            white-space: normal;
            word-break: break-word;
            vertical-align: middle;
          }
          .invoice-grid-table td {
            border: 1px solid #d5deea;
            padding: 6px;
            vertical-align: middle;
          }
          .invoice-grid-table .form-control,
          .invoice-grid-table .form-select {
            width: 100%;
            min-width: 0;
            height: 34px;
            padding: 5px 8px;
            font-size: 13px;
          }
          .invoice-grid-table .description-input {
            min-width: 0;
          }
          .invoice-grid-table .invoice-amount-control {
            background: #f5f7fb;
            border-color: #d5deea;
            color: #1f2937;
            font-weight: 700;
            cursor: default;
          }
          .invoice-grid-table th:nth-child(10),
          .invoice-grid-table th:nth-child(11) {
            text-align: center;
          }
          .invoice-grid-table .form-check {
            display: flex;
            justify-content: center;
            margin: 0;
          }
          .invoice-section .btn-primary {
            background: #2f56d9;
            border-color: #2f56d9;
            color: #fff;
          }
          .invoice-section .btn-outline-primary,
          .invoice-section .btn-outline-secondary,
          .invoice-grid-actions .btn-outline-danger {
            background: #fff;
            border-color: #2f56d9;
            color: #173f8a;
          }
          .invoice-section .btn-outline-primary:hover,
          .invoice-section .btn-outline-secondary:hover,
          .invoice-grid-actions .btn-outline-danger:hover {
            background: #eaf2ff;
            border-color: #2f56d9;
            color: #173f8a;
          }
          .invoice-notes-row {
            display: grid;
            grid-template-columns: minmax(280px, 1fr) auto;
            align-items: end;
            gap: 16px;
            margin-top: 16px;
          }
          .invoice-billfrom-card {
            background: #f8fbff;
            border: 1px solid #d5deea;
            border-radius: 8px;
            padding: 10px 12px;
            margin: 12px 0 14px;
            font-size: 13px;
            color: #1f2937;
          }
          .invoice-billfrom-card strong {
            display: block;
            margin-bottom: 4px;
            color: #173f8a;
          }
          @media (max-width: 991px) {
            .invoice-topbar {
              grid-template-columns: 1fr;
              align-items: flex-start;
            }
            .invoice-section-header {
              grid-template-columns: 1fr;
              align-items: flex-start;
            }
            .invoice-actions,
            .invoice-queue-actions,
            .invoice-grid-actions {
              justify-content: flex-start;
            }
            .invoice-queue-actions {
              grid-template-columns: minmax(0, 1fr) auto;
              width: 100%;
            }
            .invoice-queue-actions .form-control {
              width: 100%;
            }
            .invoice-meta-grid,
            .eway-detail-grid,
            .address-grid {
              grid-template-columns: 1fr;
            }
            .invoice-notes-row {
              grid-template-columns: 1fr;
              align-items: stretch;
            }
          }
          @media (max-width: 575px) {
            .invoice-screen {
              padding: 12px;
            }
            .invoice-topbar {
              margin: -12px -12px 14px;
              padding: 12px;
            }
            .invoice-actions,
            .invoice-tabs,
            .invoice-queue-actions,
            .invoice-grid-actions {
              width: 100%;
            }
            .invoice-queue-actions {
              grid-template-columns: 1fr;
            }
            .invoice-total-pill,
            .invoice-primary-btn,
            .invoice-tab-btn,
            .invoice-queue-actions .form-control {
              width: 100%;
            }
            .invoice-icon-btn {
              flex: 1 1 38px;
            }
          }
        `}</style>

        <header className="invoice-topbar">
          <div className="invoice-brand">
            <div className="invoice-brand-icon">
              <FileText size={17} />
            </div>
            <div>
              <h1 className="invoice-title">Sales Invoice</h1>
              <div className="invoice-subtitle">Delivery/implementation challans are merged with estimate charges by Job No</div>
            </div>
          </div>

          <div className="invoice-actions">
            <div className="invoice-total-pill">
              <span>Total</span>
              <strong>{formatMoney(grandTotal)}</strong>
            </div>
            <button className="invoice-icon-btn" type="button" onClick={loadInvoiceJobs} title="Refresh jobs">
              <RefreshCw size={16} />
            </button>
            <button className="invoice-icon-btn" type="button" onClick={handleReset} title="Reset invoice">
              <RotateCcw size={16} />
            </button>
            <button className="invoice-icon-btn" type="button" onClick={handlePrint} disabled={isSaving || isPrinting} title="Print invoice">
              <Printer size={16} />
            </button>
            <button className="invoice-primary-btn" type="button" onClick={() => handleSave("Draft")} disabled={isSaving} title="Save invoice draft">
              <Save size={16} />
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
            <button className="invoice-primary-btn" type="button" onClick={() => handleSave("Final")} disabled={isSaving}>
              <Save size={16} />
              {isSaving ? "Saving..." : "Final Invoice"}
            </button>
          </div>
        </header>

        {message && (
          <Alert variant={message.includes("Could not") || message.includes("Please") || message.includes("No delivery") ? "warning" : "success"} onClose={() => setMessage("")} dismissible>
            {message}
          </Alert>
        )}

        <section className="invoice-section invoice-queue-section">
          <div className="invoice-section-header">
            <div className="invoice-section-heading">
              <h5>Invoice Job Queue</h5>
              <div className="text-muted small">
                {isLoading
                  ? "Loading challan jobs..."
                  : isFallbackLoading
                  ? `${jobCards.length} invoice-ready job card(s). Refreshing delivery/implementation data...`
                  : splitJobNoValues(data.jobCardNo).length || data.selectedJobIds.length
                    ? `${visibleJobCards.length} shown from ${jobCards.length} invoice-ready job card(s)`
                    : `${jobCards.length} invoice-ready job card(s). Select Job No to show cards.`}
              </div>
              {selectedPanCard ? (
                <div className="text-muted small mt-1">
                  PAN locked to <strong>{selectedPanCard}</strong>. Only matching jobs can be selected for invoicing.
                </div>
              ) : null}
              <div className="mt-2">
                <Form.Check
                  type="switch"
                  id="allow-without-challan"
                  label="Allow invoice without challan for operator charges"
                  checked={Boolean(data.allowWithoutChallan)}
                  onChange={(event) => updateMeta("allowWithoutChallan", event.target.checked)}
                />
                <div className="text-muted small mt-1">
                  Turn this on to include job cards without a challan in the invoice preview.
                </div>
              </div>
            </div>
      <div className="invoice-queue-actions">
  <Select
    isMulti
    isClearable
    isLoading={isLoading || isFallbackLoading}
    options={jobSelectOptions.filter((option) =>
      String(option.label || "")
        .toLowerCase()
        .includes(searchText.toLowerCase())
    )}
    value={selectedJobOptions}
    placeholder="Search / select job number"
    onInputChange={(value) => {
      setSearchText(value);
      return value;
    }}
    onChange={(selected) => {
      const selectedCardIds = Array.isArray(selected)
        ? [...new Set(selected.flatMap((option) => option.cardIds || []))].filter(
            (id) => allJobCards.some((card) => card.id === id)
          )
        : [];

      setQueueJobFilterNos(selectedCardIds);
      handleJobsSelected(selectedCardIds);
    }}
    menuPortalTarget={document.body}
    styles={{
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      control: (base) => ({
        ...base,
        minHeight: 38,
        borderColor: "#d5dbe5",
        fontSize: 14,
      }),
    }}
  />

  <Button
    size="sm"
    variant="outline-secondary"
    onClick={() => {
      setSearchText("");
      setQueueJobFilterNos([]);
    }}
  >
    Clear
  </Button>
</div>
          </div>

          {isLoading ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" />
              Loading challan-created jobs...
            </div>
          ) : isFallbackLoading && !visibleJobCards.length ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" />
              Loading delivery/implementation fallback jobs...
            </div>
          ) : visibleJobCards.length ? (
            <>
              {isFallbackLoading ? (
                <div className="d-flex align-items-center gap-2 text-muted small mb-2">
                  <Spinner animation="border" size="sm" />
                  Updating delivery/implementation data...
                </div>
              ) : null}
              <div className="job-card-grid">
                {visibleJobCards.map((job) => {
                  const checked = data.selectedJobIds.includes(job.id);
                  const isPanSelectable = !selectedPanCard || getJobCardPanCard(job) === selectedPanCard;
                  return (
                    <label key={job.id} className={`job-picker-card ${checked ? "active" : ""}`}>
                      <div className="d-flex align-items-start gap-2">
                        <Form.Check
                          checked={checked}
                          disabled={(!checked && !isPanSelectable) || (!data.allowWithoutChallan && !job.hasChallan)}
                          onChange={(event) => {
                            if ((!checked && !isPanSelectable) || (!data.allowWithoutChallan && !job.hasChallan)) return;
                            const nextIds = event.target.checked
                              ? [...data.selectedJobIds, job.id]
                              : data.selectedJobIds.filter((id) => id !== job.id);
                            handleJobsSelected(nextIds);
                          }}
                        />
                        <div className="w-100">
                          <div className="job-card-title-row">
                            <strong>{job.jobCardNo}</strong>
                            <span className="job-source-badge">{job.source}</span>
                          </div>
                          <div className="text-muted small job-card-text">{job.clientName}</div>
                          <div className="small job-card-text">{job.storeName}</div>
                          <div className="text-muted small job-card-text">
                            Billing: {job.billingLocation || "-"} | Production: {job.productionLocation || "-"}
                          </div>
                          <div className="text-muted small">{job.items.length} item(s)</div>
                          {job.challanNo ? <div className="small fw-semibold job-card-text">Challan: {job.challanNo}</div> : null}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <Alert variant="info" className="mb-0">
              {splitJobNoValues(data.jobCardNo).length
                ? "No jobs found for this Job No. Use Refresh after creating delivery/implementation challans."
                : "Select a Job No from the dropdown to show invoice card(s)."}
            </Alert>
          )}
        </section>

        <section className="invoice-section">
          <div className="invoice-section-header single">
            <div className="invoice-section-heading">
              <h5>Invoice Details</h5>
            </div>
          </div>
          <div className="invoice-billfrom-card">
            <strong>Bill From</strong>
            <Form.Select
              className="mt-2"
              value={data.billFromLocation || ""}
              onChange={(event) => updateMeta("billFromLocation", event.target.value)}
            >
              {BILL_FROM_LOCATION_OPTIONS.map((option) => (
                <option key={option.value || "auto"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
            <div className="mt-2">{billFromLabel || "-"}</div>
            <div className="text-muted small mt-1">
              Internal invoice billing: {invoiceCompanyDetails.companyName || "-"}
            </div>
          </div>
          {internalBillNotice ? (
            <Alert variant="warning" className="mt-3 mb-0">
              {internalBillNotice}
            </Alert>
          ) : null}
          {showInternalBillPreview ? (
            <div className="internal-bill-preview mt-3">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <div>
                  <strong>Customer + Internal Invoice Preview</strong>
                  <div className="text-muted small">
                    Customer bill stays on {invoiceCompanyDetails.companyName || "the selected billing branch"}, and these internal invoice(s) will be generated automatically.
                  </div>
                  <div className="text-muted small">
                    Bill To: {internalBillToLabel || "-"}
                  </div>
                </div>
                <div className="invoice-total-pill">
                  <span>Internal Total</span>
                  <strong>{formatMoney(internalBillPreviewGroups.reduce((sum, group) => sum + group.amount, 0))}</strong>
                </div>
              </div>
              <Table responsive size="sm" className="invoice-grid-table mb-0">
                <thead>
                  <tr>
                    <th>Production Location</th>
                    <th>Produced Qty</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {internalBillPreviewGroups.map((group) => (
                    <React.Fragment key={`${group.productionLocation}|${group.billingLocation}`}>
                      <tr>
                        <td>{group.productionLocation || "-"}</td>
                        <td>{group.totalQty}</td>
                        <td>{formatMoney(group.amount)}</td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : null}
          <div className="invoice-meta-grid">
            <Form.Group>
              <Form.Label>Invoice Date</Form.Label>
              <Form.Control type="date" value={data.invoiceDate} onChange={(event) => updateMeta("invoiceDate", event.target.value)} />
            </Form.Group>
            <Form.Group>
              <Form.Label>ITR</Form.Label>
              <Form.Control value={data.itrNo || ""} onChange={(event) => updateMeta("itrNo", event.target.value)} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Job Card(s)</Form.Label>
              <Form.Control value={data.jobCardNo} onChange={(event) => updateMeta("jobCardNo", event.target.value)} placeholder="Select jobs above" />
            </Form.Group>
            <Form.Group>
              <Form.Label>Client / Bill As</Form.Label>
              <Form.Control value={data.clientName || ""} onChange={(event) => updateMeta("clientName", event.target.value)} />
            </Form.Group>
            <Form.Group>
              <Form.Label>PO No.</Form.Label>
              <Form.Control
                data-testid="invoice-po-number"
                value={data.poNumber || ""}
                onChange={(event) => updateMeta("poNumber", event.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>PO Description</Form.Label>
              <Form.Control
                value={data.poDescription || ""}
                onChange={(event) => updateMeta("poDescription", event.target.value)}
                placeholder="Copy to line description as per PO"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Project Name</Form.Label>
              <Form.Control
                data-testid="invoice-project-name"
                value={data.projectName || ""}
                onChange={(event) => updateMeta("projectName", event.target.value)}
              />
            </Form.Group>
          </div>
        </section>

        <section className="invoice-section">
          <div className="invoice-section-header">
            <div className="invoice-section-heading">
              <h5>Eway Bill Details</h5>
              <div className="text-muted small">
                Invoice total with tax: {formatMoney(grandTotalWithTax)}
              </div>
            </div>
            <div className="invoice-actions">
              <span className={`eway-status-pill ${isEwayBillRequired ? "required" : ""}`}>
                {ewayRequirementText}
              </span>
            </div>
          </div>
          <div className="eway-detail-grid">
            <Form.Group>
              <Form.Label>Transporter name</Form.Label>
              <Form.Control
                value={ewayBillDetails.transporterName}
                onChange={(event) => updateEwayBill("transporterName", event.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Mode of transportation</Form.Label>
              <div className="eway-mode-options">
                {TRANSPORT_MODES.map((mode) => (
                  <Form.Check
                    inline
                    key={mode}
                    type="radio"
                    id={`eway-mode-${mode}`}
                    label={mode}
                    checked={ewayBillDetails.transportMode === mode}
                    onChange={() => updateEwayBill("transportMode", mode)}
                  />
                ))}
              </div>
            </Form.Group>
            <Form.Group>
              <Form.Label>Distance of transportation (in km)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={ewayBillDetails.transportDistanceKm}
                onChange={(event) => updateEwayBill("transportDistanceKm", event.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Vehicle no</Form.Label>
              <Form.Control
                value={ewayBillDetails.vehicleNo}
                onChange={(event) => updateEwayBill("vehicleNo", event.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Transporter GstNo</Form.Label>
              <Form.Control
                value={ewayBillDetails.transporterGstNo}
                onChange={(event) => updateEwayBill("transporterGstNo", event.target.value)}
              />
            </Form.Group>
          </div>
        </section>

        <section className="invoice-section">
          <div className="invoice-section-header single">
            <div className="invoice-section-heading">
              <h5>Addresses</h5>
            </div>
          </div>
          <div className="address-grid">
            <div>
              <div className="address-column-title">
                <strong>Bill To</strong>
                <Button size="sm" variant="outline-primary" onClick={() => addAddress("billTo")}>
                  <Plus size={14} /> Add
                </Button>
              </div>
              {data.billTo.map((address) => (
                <div className="address-card mb-2" key={address.id}>
                  <div className="address-card-row">
                    <Form.Control value={address.label} onChange={(event) => updateAddress("billTo", address.id, "label", event.target.value)} />
                    <Button size="sm" variant="outline-danger" onClick={() => removeAddress("billTo", address.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <Form.Control className="mb-2" value={address.name} onChange={(event) => updateAddress("billTo", address.id, "name", event.target.value)} placeholder="Name" />
                  <Form.Control className="mb-2" as="textarea" rows={2} value={address.address} onChange={(event) => updateAddress("billTo", address.id, "address", event.target.value)} placeholder="Address" />
                  <Form.Control value={address.gstNo} onChange={(event) => updateAddress("billTo", address.id, "gstNo", event.target.value)} placeholder="GST No." />
                </div>
              ))}
            </div>

            <div>
              <div className="address-column-title">
                <strong>Ship To</strong>
                <Button size="sm" variant="outline-primary" onClick={() => addAddress("shipTo")}>
                  <Plus size={14} /> Add
                </Button>
              </div>
              {data.shipTo.map((address) => (
                <div className="address-card mb-2" key={address.id}>
                  <div className="address-card-row">
                    <Form.Control value={address.label} onChange={(event) => updateAddress("shipTo", address.id, "label", event.target.value)} />
                    <Button size="sm" variant="outline-danger" onClick={() => removeAddress("shipTo", address.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <Form.Control className="mb-2" value={address.name} onChange={(event) => updateAddress("shipTo", address.id, "name", event.target.value)} placeholder="Name" />
                  <Form.Control className="mb-2" as="textarea" rows={2} value={address.address} onChange={(event) => updateAddress("shipTo", address.id, "address", event.target.value)} placeholder="Address" />
                  <Form.Control value={address.gstNo} onChange={(event) => updateAddress("shipTo", address.id, "gstNo", event.target.value)} placeholder="GST No." />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="invoice-section">
          <div className="invoice-section-header">
            <div className="invoice-section-heading">
              <h5>Invoice Grid</h5>
              <div className="text-muted small">{data.items.length} row(s), {selectedItems.length} selected</div>
            </div>
            <div className="invoice-grid-actions">
              <Form.Check
                type="switch"
                label="Group by media"
                checked={data.groupByMedia}
                onChange={(event) => updateMeta("groupByMedia", event.target.checked)}
              />

              <Form.Check
                type="checkbox"
                label="Group by store"
                checked={data.groupByStore}
                onChange={(e) => updateMeta("groupByStore", e.target.checked)}
              />
              <Form.Check
                type="checkbox"
                label="Group by city"
                checked={data.groupByCity}
                onChange={(e) => updateMeta("groupByCity", e.target.checked)}
              />
              <Form.Check
                type="checkbox"
                label="Group by description"
                checked={data.groupByDescription}
                onChange={(e) => updateMeta("groupByDescription", e.target.checked)}
              />
              <Button size="sm" variant="outline-primary" onClick={handleCreateGroupBill}>
                <CheckSquare size={14} /> Create Group Bill
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={copyPoDescriptionToItems}>
                Copy PO Description
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={() => addItem("installation")}>
                Installation
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={() => addItem("implementation")}>
                Implementation
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={() => addItem("layouting")}>
                Layouting
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={() => addItem("transportation")}>
                Transport
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={() => addItem("adaption")}>
                Adaption
              </Button>
              <Button size="sm" variant="primary" onClick={() => addItem("media")}>
                <Plus size={14} /> Add Row
              </Button>
              <Button size="sm" variant="outline-danger" onClick={removeSelectedItems}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>

          <Table responsive className="invoice-grid-table">
            <thead>
              <tr>
                <th style={{ width: 52 }}>
                  <Form.Check
                    checked={data.items.length > 0 && data.items.every((item) => item.selected)}
                    onChange={(event) => toggleAllItems(event.target.checked)}
                    aria-label="Select all invoice rows"
                  />
                </th>
                <th>Job No</th>
                <th>Description</th>
                <th>Media</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Production Width</th>
                <th>Production Height</th>
                <th>Billing Width</th>
                <th>Billing Height</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Form.Check checked={item.selected} onChange={(event) => updateItem(item.id, "selected", event.target.checked)} />
                  </td>
                  <td>
                    <Form.Control value={item.jobNo} onChange={(event) => updateItem(item.id, "jobNo", event.target.value)} />
                  </td>
                  <td>
                    <Form.Control className="description-input" value={item.description} onChange={(event) => updateItem(item.id, "description", event.target.value)} />
                  </td>
                  <td>
                    <Form.Control value={item.media} onChange={(event) => updateItem(item.id, "media", event.target.value)} />
                  </td>
                  <td>
                    <Form.Control value={item.hsnCode} onChange={(event) => updateItem(item.id, "hsnCode", event.target.value)} />
                  </td>
                  <td>
                    <Form.Control type="number" min="0" value={item.qty} onChange={(event) => updateItem(item.id, "qty", event.target.value)} />
                  </td>
                  <td>
                    <Form.Select
                      value={normalizeDimensionUnit(item.unit ?? "inch")}
                      onChange={(event) => updateItem(item.id, "unit", normalizeDimensionUnit(event.target.value))}
                    >
                      {DIMENSION_UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Form.Select>
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.width}
                      readOnly
                      className="job-readonly-input"
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.height}
                      readOnly
                      className="job-readonly-input"
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.billingWidth ?? ""}
                      onChange={(event) => updateItem(item.id, "billingWidth", event.target.value)}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.billingHeight ?? ""}
                      onChange={(event) => updateItem(item.id, "billingHeight", event.target.value)}
                    />
                  </td>
                  <td>
                    <Form.Control type="number" min="0" step="0.01" value={item.rate} onChange={(event) => updateItem(item.id, "rate", event.target.value)} />
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      className="invoice-amount-control"
                      value={String(item.manualAmount ?? "").trim() !== "" ? item.manualAmount : calculateItemAmount(item).toFixed(2)}
                      onChange={(event) => updateItem(item.id, "manualAmount", event.target.value)}
                      aria-label="Amount"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {(data.groupByMedia || data.groupByStore || data.groupByCity || data.groupByDescription) && (
            <div className="mt-3">
              <h6>{selectedItems.length ? "Grouped Preview (selected rows)" : "Grouped Preview"}</h6>
              <Table responsive size="sm" className="invoice-grid-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Media</th>
                    <th>Job No</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedPreviewItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.description || "-"}</td>
                      <td>{item.media || "-"}</td>
                      <td>{item.jobNo || "-"}</td>
                      <td>{item.qty}</td>
                      <td>{formatMoney(item.rate)}</td>
                      <td>{formatMoney(calculateItemAmount(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          <div className="invoice-notes-row">
            <Form.Group>
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                data-testid="invoice-notes"
                rows={2}
                value={data.notes || ""}
                onChange={(event) => updateMeta("notes", event.target.value)}
              />
            </Form.Group>
            <div className="invoice-total-pill">
              <span>Grand Total</span>
              <strong>{formatMoney(grandTotal)}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};


  const buildSelectedJobItems = (jobs, rateRows = []) => {
  const seenEstimateCharges = new Set();
  return jobs.flatMap((job) =>
    job.items
      .filter((item) => {
        const isEstimateCharge = item.source?._fromEstimateCharge || item._fromEstimateCharge;
        if (!isEstimateCharge) return true;
        const key =
          item.source?._estimateChargeKey ||
          item._estimateChargeKey ||
          `${normalizeCompare(item.jobNo)}|${normalizeCompare(item.lineType)}|${normalizeCompare(item.description)}|${normalizeCompare(item.storeName)}|${toNumber(item.manualAmount || item.rate)}`;
        if (seenEstimateCharges.has(key)) return false;
        seenEstimateCharges.add(key);
        return true;
      })
      .map((item) => {
        const isEstimateItem = normalizeCompare(item.source?._invoiceSource || item._invoiceSource || "") === "estimate";
        const simplifiedDescription = firstNonEmpty(
          isEstimateItem ? firstNonEmpty(item.description, item.Description, item.source?.description, item.source?.Description) : "",
          item.source?.simplifiedProductName,
          item.source?.SimplifiedProductName,
          item.simplifiedProductName,
          item.SimplifiedProductName,
          item.source?.productAsPerRateCard,
          item.source?.ProductAsPerRateCard,
          resolveRateMasterDescription(item.source || item, rateRows),
          getCsSourceDescription(item.source || item),
          item.description,
          item.Description,
          getInvoiceDescription(item.source || item)
        );

        return {
          ...item,
          description: simplifiedDescription,
          media: firstNonEmpty(
            item.media,
            item.source?.media,
            item.source?.Media,
            getRowMedia(item.source || item),
            ""
          ),
          billingWidth: firstNonEmpty(
            item.billingWidth,
            item.source?.billingWidth,
            item.source?.BillingWidth,
            item.source?.["Billing Width"],
            item.width,
            ""
          ),
          billingHeight: firstNonEmpty(
            item.billingHeight,
            item.source?.billingHeight,
            item.source?.BillingHeight,
            item.source?.["Billing Height"],
            item.height,
            ""
          ),
          rate: firstNonEmpty(
            item.rate,
            item.source?.rate,
            item.source?.Rate,
            item.source?.unitPrice,
            item.source?.UnitPrice,
            resolveRateMasterRate(item.source || item, rateRows),
            item.source?.lineJobValue,
            item.source?.LineJobValue,
            ""
          ),
          id: uid("item"),
          selected: true,
        };
      })
  );
};

const getJobCardPanCard = (job) =>
  normalizePanCard(
    job?.panCard ||
      (Array.isArray(job?.items) ? job.items.map((item) => item?.panCard).find(Boolean) : "") ||
      getPanFromGstin(job?.billTo?.gstNo || job?.shipTo?.gstNo)
  );

const getSelectionPanCard = (jobs) =>
  normalizePanCard((Array.isArray(jobs) ? jobs : []).map((job) => getJobCardPanCard(job)).find(Boolean) || "");

const filterJobsByPanCard = (jobs) => {
  const jobList = Array.isArray(jobs) ? jobs : [];
  const panCard = getSelectionPanCard(jobList);
  const compatibleJobs = panCard
    ? jobList.filter((job) => getJobCardPanCard(job) === panCard)
    : jobList.filter((job) => !getJobCardPanCard(job));

  return { jobs: compatibleJobs, panCard };
};

const getDraftSelectedJobNo = (selectedId) => {
  const value = String(selectedId || "").trim();
  return value.startsWith("loaded-draft|") ? value.split("|").slice(1).join("|").trim() : "";
};

const buildDraftSelectedJobIds = (selectedJobIds = [], jobCards = [], jobCardNo = "") => {
  const matchedDraftIds = (Array.isArray(selectedJobIds) ? selectedJobIds : [])
    .map((selectedId) => {
      const draftJobNo = getDraftSelectedJobNo(selectedId);
      if (draftJobNo) return `loaded-draft|${draftJobNo}`;

      const matchedJob = (Array.isArray(jobCards) ? jobCards : []).find((job) => String(job?.id || "") === String(selectedId || ""));
      const matchedJobNo = String(matchedJob?.jobCardNo || matchedJob?.jobNo || "").trim();
      return matchedJobNo ? `loaded-draft|${matchedJobNo}` : "";
    })
    .filter(Boolean);

  if (matchedDraftIds.length) {
    return [...new Set(matchedDraftIds)];
  }

  return [...new Set(splitJobNoValues(jobCardNo).map((value) => `loaded-draft|${value}`))];
};

const hasSameJobSelection = (previousIds = [], nextJobs = []) => {
  const nextJobNos = [...new Set((Array.isArray(nextJobs) ? nextJobs : []).map((job) => normalizeCompare(job?.jobCardNo || job?.jobNo)))]
    .filter(Boolean)
    .sort();
  const prev = [...new Set((Array.isArray(previousIds) ? previousIds : []).map(String))].sort();
  const next = [...new Set((Array.isArray(nextJobs) ? nextJobs : []).map((job) => String(job?.id || "")))]
    .filter(Boolean)
    .sort();

  if (prev.length === next.length && prev.every((value, index) => value === next[index])) {
    return true;
  }

  const prevDraftJobNos = [...new Set(prev.map(getDraftSelectedJobNo).map(normalizeCompare))].filter(Boolean).sort();
  if (!prevDraftJobNos.length) return false;
  if (prevDraftJobNos.length !== nextJobNos.length) return false;
  return prevDraftJobNos.every((value, index) => value === nextJobNos[index]);
};

const buildDataForJobs = (prev, jobs, rateRows = []) => {
  const estimateInvoiceDate = formatDateForInput(
    (Array.isArray(jobs) ? jobs : []).map((job) => job?.estimateDate).find(Boolean),
    ""
  );
  const generatedBillTo = dedupeInvoiceAddresses(jobs.map((job, index) => ({
    ...job.billTo,
    id: uid("address"),
    label: `Bill To ${index + 1} (${job.jobCardNo})`,
  })));
  const generatedShipTo = buildDefaultShipToAddresses(generatedBillTo);
  const preserveExistingAddresses = hasSameJobSelection(prev.selectedJobIds, jobs);
  const keepLockedBillTo = preserveExistingAddresses && prev.billToLocked;
  const keepManualBillTo = preserveExistingAddresses && hasManualAddressOverride(prev.billTo);
  const preserveExistingShipTo =
    preserveExistingAddresses &&
    Array.isArray(prev.shipTo) &&
    prev.shipTo.length &&
    !areAddressListsEquivalent(prev.shipTo, prev.billTo);
  const keepLockedShipTo = preserveExistingShipTo && prev.shipToLocked;
  const keepManualShipTo = preserveExistingShipTo && hasManualAddressOverride(prev.shipTo);

  return {
    ...prev,
    // Do not carry a draft identity to a different Job ID selection.
    invoiceId: preserveExistingAddresses ? prev.invoiceId || "" : "",
    invoiceNo: preserveExistingAddresses ? prev.invoiceNo || "" : "",
    selectedJobIds: jobs.map((job) => job.id),
    billTo:
      keepLockedBillTo
        ? prev.billTo
        :
      keepManualBillTo
        ? prev.billTo
        :
      preserveExistingAddresses && Array.isArray(prev.billTo) && prev.billTo.length
        ? mergeLiveAddressLists(prev.billTo, generatedBillTo)
        : generatedBillTo,
    shipTo:
      keepLockedShipTo
        ? prev.shipTo
        :
      keepManualShipTo
        ? prev.shipTo
        :
      preserveExistingShipTo && Array.isArray(prev.shipTo) && prev.shipTo.length
        ? mergeLiveAddressLists(prev.shipTo, generatedShipTo)
        : generatedShipTo,
    items: buildSelectedJobItems(jobs, rateRows),
    jobCardNo: joinUnique(jobs.map((job) => job.jobCardNo)),
    clientName: joinUnique(jobs.map((job) => job.clientName)),
    // PO and project values are entered on the invoice, not copied from jobs.
    poNumber: preserveExistingAddresses ? prev.poNumber || "" : "",
    projectName: preserveExistingAddresses ? prev.projectName || "" : "",
    invoiceDate: estimateInvoiceDate || prev.invoiceDate || getCurrentLocalIsoDate(),
  };
};

const buildInvoicePreviewPayload = (data, jobCards, invoiceRows) => {
  const invoiceSubtotal = invoiceRows.reduce((sum, row) => sum + row.taxableValue, 0);
  const invoiceGstTotal = invoiceRows.reduce((sum, row) => sum + row.gstAmount, 0);
  const selectedJobs = jobCards.filter((job) => data.selectedJobIds.includes(job.id));
  const region = joinUnique(
    selectedJobs.map((job) => firstNonEmpty(job.billingLocation, job.BillingLocation))
  );
  const billFromLocation = getPrimaryBillingLocation(
    data.billFromLocation,
    selectedJobs.map((job) => firstNonEmpty(job.billingLocation, job.BillingLocation)).find(Boolean),
    region
  );
  const branchDetails = getCompanyBranchDetails(billFromLocation);
  const challanNo = joinUnique(selectedJobs.map((job) => job.challanNo));
  const challanDate = joinUnique(selectedJobs.map((job) => job.challanDate));
  const poNumber = data.poNumber || joinUnique(selectedJobs.map((job) => job.poNo));
  const jobCardsList = joinUnique(selectedJobs.map((job) => job.jobCardNo));
  const ewayBill = normalizeEwayBillDetails(data);
  const ewayBillPayload = buildEwayBillPayload(ewayBill);

  return {
    companyDetails: branchDetails,
    billFromCompanyName: branchDetails.companyName,
    billFromCompanyAddress: branchDetails.companyAddress,
    billFromCompanyGst: branchDetails.companyGst,
    BillFromCompanyName: branchDetails.companyName,
    BillFromCompanyAddress: branchDetails.companyAddress,
    BillFromCompanyGst: branchDetails.companyGst,
    billAsName: data.clientName || data.billTo[0]?.name || "Sales Invoice",
    invoiceNo: data.invoiceNo,
    InvoiceNo: data.invoiceNo,
    CustomerInvoiceNo: data.invoiceNo,
    _invoiceNo: data.invoiceNo,
    invoiceDate: formatDateForInput(data.invoiceDate, getCurrentLocalIsoDate()),
    InvoiceDate: formatDateForInput(data.invoiceDate, getCurrentLocalIsoDate()),
    _invoiceDate: formatDateForInput(data.invoiceDate, getCurrentLocalIsoDate()),
    itrNo: data.itrNo || "",
    ItrNo: data.itrNo || "",
    ITRNo: data.itrNo || "",
    ITR: data.itrNo || "",
    poNumber,
    PoNo: poNumber,
    projectName: data.projectName || "",
    ProjectName: data.projectName || "",
    _project: data.projectName || "",
    region,
    billingLocation: billFromLocation,
    BillingLocation: billFromLocation,
    billFromLocation,
    BillFromLocation: billFromLocation,
    selectedJobNo: data.jobCardNo || jobCardsList,
    JobCards: data.jobCardNo || jobCardsList,
    jobCards: data.jobCardNo || jobCardsList,
    _jobCards: data.jobCardNo || jobCardsList,
    ClientBillAs: data.clientName || data.billTo[0]?.name || "Sales Invoice",
    _client: data.clientName || data.billTo[0]?.name || "Sales Invoice",
    challanNo,
    ChallanNo: challanNo,
    challanDate,
    ChallanDate: challanDate,
    gstRate: GST_RATE,
    invoiceRows,
    invoiceSubtotal,
    invoiceGstTotal,
    invoiceGrandTotal: invoiceSubtotal + invoiceGstTotal,
    ...ewayBillPayload,
    billToList: data.billTo.map((address) => ({
      id: address.id,
      label: address.label,
      name: address.name,
      customerName: address.name,
      address: address.address,
      gstNo: address.gstNo,
      phone: address.phone || "",
    })),
    shipToList: data.shipTo.map((address) => ({
      id: address.id,
      label: address.label,
      name: address.name,
      customerName: address.name,
      address: address.address,
      gstNo: address.gstNo,
      phone: address.phone || "",
    })),
    bankDetails: {
      bankName: branchDetails.bankDetails?.bankName || branchDetails.bankName || "",
      branch: branchDetails.bankDetails?.branch || branchDetails.bankBranch || "",
      accountNo: branchDetails.bankDetails?.accountNo || branchDetails.accountNo || "",
      ifsc: branchDetails.bankDetails?.ifsc || branchDetails.ifsc || "",
      upiId: branchDetails.bankDetails?.upiId || branchDetails.upiId || "",
    },
    notes: data.notes || "",
  };
};

export default InvoicePreviewBuilder; 
