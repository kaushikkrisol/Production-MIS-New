
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Select from "react-select";
import DatePicker from "react-datepicker";
import { createPortal } from "react-dom";
import { toast, ToastContainer } from "react-toastify";
import { getCompanyBranchDetails } from "./companyBranches";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "react-datepicker/dist/react-datepicker.css";
import "react-toastify/dist/ReactToastify.css";
import CreatableSelect from "react-select/creatable";
import {
  Calendar,
  CheckSquare,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FilePlus,
  FolderPlus,
  Mail,
  Paperclip,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Send,
  Trash2,
  X,
} from "react-feather";
import config from "../../../config";
import erpMasterData from "../../../core/json/erpMasterData.json";
import hsnRateData from "../../../core/json/hsnRateData.json";
import indiaCities from "../../../core/json/indiaCities.json";
import { mergeFallbackCustomers } from "./customerFallbacks";
import "./JobEntry.css";

const RATE_STORAGE_KEY = "productMediaRateMasterRows";
const ELEMENT_GROUP_STORAGE_KEY = "elementGroupMasterRows";
const JOB_DRAFT_KEY = "jobEntryDrafts";
const TEMP_DRAFT_ID = "new-job-draft";

const getMasterGroup = (key) =>
  Array.isArray(erpMasterData?.groups?.[key]) ? erpMasterData.groups[key] : [];

const getMasterValues = (key) =>
  getMasterGroup(key)
    .map((item) => String(item?.value || item?.label || "").trim())
    .filter(Boolean);

const uniqueOptionValues = (values = []) => {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const getMasterOptionValues = (key, fallback = []) => {
  const masterValues = getMasterValues(key);
  return uniqueOptionValues(masterValues.length ? masterValues : fallback);
};

const yesNoOptions = ["Yes", "No"];
const locationOptions = getMasterOptionValues("productionLocations", ["North", "South", "East", "West"]);
const billingLocationOptions = getMasterOptionValues("billingLocations", locationOptions);
const businessTypeOptions = getMasterOptionValues("segments", ["Print", "Retail", "Onsite"]);
const poTypeOptions = [
  "PO Received",
  "PO not Received",
  "Direct Billing",
  "Open PO",
  "Estimate Approval Pending",
];
const laminationDefaults = getMasterOptionValues("lamination", ["Matt Lamination"]);
const mountingDefaults = getMasterOptionValues("mounting", ["3 MM Sun Board", "5 MM Sun Board"]);
const implementationDefaults = getMasterOptionValues("implementation", yesNoOptions);
const printReadyDefaults = getMasterOptionValues("printReadyFiles", yesNoOptions);
const printerMasterDefaults = getMasterOptionValues("machineNames");
const elementGroupDefaults = [
  "ENDCAP",
  "SENSOMATIC PRINTS",
  "SENSOMATIC BOXES",
  "MAT ALU",
  "MAKE OVER STATION",
  "Animation Trend Standee",
  "Props",
  "BASKET SIGNAGES",
  "VINYL PRINT",
  "OUTDOOR VISUAL",
  "TRANSPORTATION",
];

const productColumns = [
  "VISUAL CODE",
  "QTY",
  "Width",
  "Height",
  "Billing Width",
  "Billing Height",
  "Total Sq.f",
  "Installation charges",
  "Transportation charges",
  "Layouting charges",
  "LAMINATION",
  "TYPE OF LAMINATION",
  "MOUNTING",
  "TYPE OF MOUNTING",
  "IMPLEMENTATION",
  "JOB DEADLINE",
  "PRINTER DEADLINE",
];

const ESTIMATE_GST_RATE = 0.18;

const firstValue = (...values) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
};

const getEstimateBranchRegion = (header = {}, lineItems = []) =>
  firstValue(
    header.billingLocation,
    header.billLoc,
    header.productionLocation,
    header.prodLoc,
    lineItems?.[0]?.billingLocation,
    lineItems?.[0]?.productionLocation,
    lineItems?.[0]?.region
  );

const getEstimateCompanyDetails = (header = {}, lineItems = []) => {
  const region = getEstimateBranchRegion(header, lineItems);
  const branchDetails = getCompanyBranchDetails(region);

  return {
    companyName: firstValue(branchDetails.companyName, "Commercial Reprographers"),
    companyAddress: firstValue(branchDetails.companyAddress),
    companyPhone: firstValue(branchDetails.companyPhone),
    companyGst: firstValue(branchDetails.companyGst),
  };
};
const ESTIMATE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createLine = (index) => ({
  id: `${Date.now()}-${index}`,
  store: "",
  panCard: "",
  city: "",
  description: "",
  prodLoc: "",
  billLoc: "",
  salonAddress: "",
  brandingLocation: "",
  sequenceNo: "",
  printingMachine: "",
  printReadyFile: "",
  remarks: "",
  media: "",
  hsn: "",
  internalMedia: "",
  externalMedia: "",
  elementGroup: "",
  articleCode: "",
  visualCode: "",
  qty: "",
  width: "",
  height: "",
  billingWidth: "",
  billingHeight: "",
  sqft: "",
  rate: "",
  amount: "",
  installationCharges: "",
  transportationCharges: "",
  layoutingCharges: "",
  laminationFlag: "",
  lamination: "",
  mountingFlag: "",
  mounting: "",
  implementation: "",
  jobDeadline: "",
  printerDeadline: "",
});

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const getCustomerId = (customer) =>
  String(
      customer?.customeR_ID ??
      customer?.customerId ??
      customer?.CustomerId ??
      customer?.customerid ??
      customer?.CUSTOMER_ID ??
      customer?.id ??
      customer?._id ??
      ""
  ).trim();

const getCustomerName = (customer) =>
  customer?.customeR_NAME ||
  customer?.customerName ||
  customer?.CustomerName ||
  customer?.client ||
  customer?.CUSTOMER_NAME ||
  customer?.customername ||
  customer?.name ||
  customer?.Name ||
  "";

const getCustomerGstNo = (customer) =>
  String(
    customer?.gsT_NO ??
      customer?.gstNo ??
      customer?.GSTNo ??
      customer?.GST_NO ??
      customer?.gst_number ??
      customer?.gstin ??
      customer?.GSTIN ??
      ""
  ).trim();

const getPanFromGstin = (gstin) => {
  const clean = String(gstin || "").trim().toUpperCase();
  return clean.length >= 12 ? clean.substring(2, 12) : "";
};

const normalizePanCard = (value) => String(value || "").trim().toUpperCase();

const getCustomerPanCard = (customer) =>
  normalizePanCard(
    customer?.panCard ??
      customer?.PanCard ??
      customer?.panNo ??
      customer?.PANNo ??
      customer?.PAN_NO ??
      customer?.pan ??
      customer?.PAN ??
      getPanFromGstin(getCustomerGstNo(customer))
  );

const findCustomerForElementGroup = (customers, customerId, customerName) => {
  const selectedCustomerId = String(customerId || "").trim();
  const selectedCustomerName = normalizeText(customerName);

  return (Array.isArray(customers) ? customers : []).find((customer) => {
    const currentCustomerId = getCustomerId(customer);
    const currentCustomerName = normalizeText(getCustomerName(customer));

    return (
      (selectedCustomerId &&
        currentCustomerId &&
        selectedCustomerId === currentCustomerId) ||
      (selectedCustomerName &&
        currentCustomerName &&
        selectedCustomerName === currentCustomerName)
    );
  });
};

const getCustomerPanForElementGroup = (customers, customerId, customerName) => {
  const customer = findCustomerForElementGroup(customers, customerId, customerName);
  return customer ? getCustomerPanCard(customer) : "";
};

const hydrateElementGroupPanCards = (rows, customers) =>
  (Array.isArray(rows) ? rows : []).map((row) => {
    const panCard =
      normalizePanCard(row?.panCard) ||
      getCustomerPanForElementGroup(customers, row?.customerId, row?.customerName);

    return panCard && panCard !== row?.panCard ? { ...row, panCard } : row;
  });

const masterCustomerRows = getMasterValues("clientList").map((name) => ({
  customeR_ID: name,
  customeR_NAME: name,
  source: "erpMaster",
}));

const mergeMasterCustomers = (customers) => {
  const merged = [];
  const seenIds = new Set();
  const seenNames = new Set();

  [...mergeFallbackCustomers(customers), ...masterCustomerRows].forEach((customer) => {
    const customerId = getCustomerId(customer);
    const customerName = normalizeText(getCustomerName(customer));
    const idKey = customerId ? customerId.toLowerCase() : "";

    if ((idKey && seenIds.has(idKey)) || (customerName && seenNames.has(customerName))) {
      return;
    }

    if (idKey) seenIds.add(idKey);
    if (customerName) seenNames.add(customerName);
    merged.push(customer);
  });

  return merged;
};

const roundAmount = (value) => Math.round((Number(value) || 0) * 100) / 100;

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const maskDimensionValue = (value) => {
  const text = String(value || "").replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = text.split(".");
  const decimal = decimalParts.join("").slice(0, 2);
  return decimalParts.length ? `${whole}.${decimal}` : whole;
};

const buildLineSequence = (line = {}) =>
  [line.city, line.brandingLocation, line.store]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" / ");

const calculateSqft = (row) => {
  const qty = Number(row.qty || 1);
  const width = Number(getLineBillingWidth(row) || row.width || 0);
  const height = Number(getLineBillingHeight(row) || row.height || 0);

  if (qty > 0 && width > 0 && height > 0) {
    return roundAmount((qty * width * height) / 144);
  }

  return 0;
};

const getLineBillingWidth = (line = {}) =>
  String(
    line.billingWidth ||
      line.BillingWidth ||
      line["Billing Width"] ||
      line.width ||
      line.Width ||
      ""
  );

const getLineBillingHeight = (line = {}) =>
  String(
    line.billingHeight ||
      line.BillingHeight ||
      line["Billing Height"] ||
      line.height ||
      line.Height ||
      ""
  );

const withBillingDimensions = (line = {}) => ({
  ...line,
  billingWidth: getLineBillingWidth(line),
  billingHeight: getLineBillingHeight(line),
});

const withoutMediaSelection = (line = {}) => ({
  ...line,
  media: "",
  internalMedia: "",
  externalMedia: "",
  hsn: "",
  rate: "",
  amount: "",
});

const hasLineField = (line, field) =>
  Object.prototype.hasOwnProperty.call(line || {}, field);

const shouldSyncBillingDimension = (billingValue, sourceValue) => {
  const billingText = String(billingValue || "").trim();
  const sourceText = String(sourceValue || "").trim();
  return !billingText || billingText === sourceText;
};

const applyDimensionPatch = (line, patch) => {
  const nextLine = { ...line, ...patch };

  if (hasLineField(patch, "width") && !hasLineField(patch, "billingWidth")) {
    if (shouldSyncBillingDimension(line.billingWidth, line.width)) {
      nextLine.billingWidth = patch.width;
    }
  }

  if (hasLineField(patch, "height") && !hasLineField(patch, "billingHeight")) {
    if (shouldSyncBillingDimension(line.billingHeight, line.height)) {
      nextLine.billingHeight = patch.height;
    }
  }

  return nextLine;
};

const recalculateLine = (row) => {
  const normalizedRow = withBillingDimensions(row);
  const sqft = calculateSqft(normalizedRow);
  const rate = Number(row.rate || 0);
  const amount = roundAmount(sqft * rate);

  return {
    ...normalizedRow,
    sqft: sqft ? String(sqft) : "",
    rate: row.rate || "",
    amount: amount ? String(amount) : "0",
  };
};

const getSavedRateRows = () => {
  try {
    const savedRows = localStorage.getItem(RATE_STORAGE_KEY);
    return savedRows ? JSON.parse(savedRows) : [];
  } catch (error) {
    console.error("Failed to read product media rates", error);
    return [];
  }
};

const parseSavedGroupElements = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return [];
  }
};

const normalizeElementGroupItem = (item = {}) => ({
  id: String(item?.id || item?.elementId || item?.ElementId || item?.id || ""),

  articleCode: String(
    item?.articleCode ||
      item?.ArticleCode ||
      item?.articlecode ||
      item?.ARTICLECODE ||
      ""
  ).trim(),

  description: String(
    item?.description ||
    item?.Description ||
    ""
  ).trim(),

  visualCode: String(
    item?.articleCode ||
      item?.ArticleCode ||
      item?.articlecode ||
      item?.ARTICLECODE ||
      ""
  ).trim(),
  qty: String(item?.qty ?? item?.Qty ?? item?.quantity ?? ""),
  width: String(item?.width ?? item?.Width ?? ""),
  height: String(item?.height ?? item?.Height ?? ""),
  billingWidth: String(
    item?.billingWidth ??
      item?.BillingWidth ??
      item?.["Billing Width"] ??
      item?.width ??
      item?.Width ??
      ""
  ),
  billingHeight: String(
    item?.billingHeight ??
      item?.BillingHeight ??
      item?.["Billing Height"] ??
      item?.height ??
      item?.Height ??
      ""
  ),
  rate: String(item?.rate ?? item?.Rate ?? ""),
  laminationFlag: String(
    item?.laminationFlag ||
      item?.LaminationFlag ||
      item?.isLamination ||
      item?.IsLamination ||
      (item?.lamination || item?.Lamination ? "Yes" : "")
  ).trim(),
  lamination: String(item?.lamination || item?.Lamination || "").trim(),
  mountingFlag: String(
    item?.mountingFlag ||
      item?.MountingFlag ||
      item?.isMounting ||
      item?.IsMounting ||
      (item?.mounting || item?.Mounting ? "Yes" : "")
  ).trim(),
  mounting: String(item?.mounting || item?.Mounting || "").trim(),
  implementation: String(item?.implementation || item?.Implementation || "").trim(),
});

const normalizeElementGroupRow = (row, index = 0) => ({
  id: String(row?.id || row?.ID || row?._id || `element-${index}`),
  elementGroupCode:
    String(row?.elementGroupCode || row?.ElementGroupCode || row?.groupCode || "")
      .trim(),
  elementGroupName:
    String(
      row?.elementGroupName || row?.ElementGroupName || row?.groupName || row?.elementGroup || ""
    ).trim(),
  customerId: String(row?.customerId || row?.CustomerId || row?.CUSTOMER_ID || "").trim(),
  customerName: String(row?.customerName || row?.CustomerName || row?.client || row?.CLIENT || "").trim(),
  panCard: normalizePanCard(
    row?.panCard ||
      row?.PanCard ||
      row?.panNo ||
      row?.PANNo ||
      row?.PAN_NO ||
      row?.pan ||
      row?.PAN ||
      getPanFromGstin(row?.gstNo || row?.GSTNo || row?.GST_NO || row?.gstin || row?.GSTIN)
  ),
  description: String(row?.description || row?.Description || "").trim(),
  isActive: String(row?.isActive ?? row?.IsActive ?? "1"),
  elements: parseSavedGroupElements(row?.elements || row?.Elements || row?.elementRows || row?.elementDetails || [])
    .map(normalizeElementGroupItem),
});

const getSavedElementGroups = () => {
  try {
    const savedGroups = localStorage.getItem(ELEMENT_GROUP_STORAGE_KEY);
    return savedGroups ? JSON.parse(savedGroups) : [];
  } catch (error) {
    console.error("Failed to read element group master", error);
    return [];
  }
};

const buildDefaultRateRows = () =>
  (Array.isArray(hsnRateData) ? hsnRateData : []).map((item, index) => ({
    id: `default-${index}`,
    customerId: "",
    customerName: "",
    media: item.media || "",
    internalMedia: item.media || "",
    externalMedia: item.media || "",
    hsn: item.hsnCode || "",
    hsnCode: item.hsnCode || "",
    rate: item.ratePerSqft ?? "",
  }));

const buildMasterMediaRows = () =>
  getMasterGroup("media").map((item, index) => ({
    id: `erp-master-media-${index}`,
    customerId: "",
    customerName: "",
    media: item.value || "",
    internalMedia: item.value || "",
    externalMedia: item.value || "",
    hsn: item.hsnSac || "",
    hsnCode: item.hsnSac || "",
    productGroup: item.productGroup || "",
    rate: "",
  }));

const getRateMedia = (row) =>
  row.externalMedia ||
  row.ExternalMedia ||
  row.internalMedia ||
  row.InternalMedia ||
  row.media ||
  row.Media ||
  row.productCode ||
  row.ProductCode ||
  "";

const normalizeRateRow = (row, index) => ({
  id: row.id || `rate-${index}`,
  customerId: String(
    row.customerId || row.customerID || row.CustomerId || row.CUSTOMER_ID || ""
  ).trim(),
  customerName: String(
    row.customerName || row.CustomerName || row.client || row.CLIENT || ""
  ).trim(),
  media: getRateMedia(row),
  internalMedia:
    row.internalMedia || row.InternalMedia || row.media || row.Media || "",
  externalMedia:
    row.externalMedia || row.ExternalMedia || row.media || row.Media || "",
  description: String(
    row?.description ??
    row?.Description ??
    row?.DESCRIPTION ??
    ""
  ).trim(),
  hsn: String(
    row.hsn ||
      row.HSN ||
      row.hsnCode ||
      row.HsnCode ||
      row.HSNCode ||
      row.hsnSac ||
      row["HSN / SAC"] ||
      row["HSN Code"] ||
      ""
  ).trim(),
  hsnCode: String(
    row.hsnCode ||
      row.HsnCode ||
      row.HSNCode ||
      row.hsn ||
      row.HSN ||
      row.hsnSac ||
      row["HSN / SAC"] ||
      row["HSN Code"] ||
      ""
  ).trim(),
  rate: row.ratePerSqft ?? row.RatePerSqft ?? row.rate ?? row.Rate ?? "",
});

const mergeRateRows = (...rowSets) => {
  const seen = new Set();

  return rowSets.flat().filter((row) => {
    const media = normalizeText(getRateMedia(row));
    if (!media) return false;

    const customerKey = [
      row.customerId || row.customerID || row.CustomerId || "",
      normalizeText(row.customerName || row.CustomerName || row.client || ""),
      media,
    ].join("|");

    if (seen.has(customerKey)) return false;
    seen.add(customerKey);
    return true;
  });
};

const getRateRowsFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const getCustomerRowsFromResponse = getRateRowsFromResponse;
const validatePrinterDeadline = (selectedDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const printerDeadline = new Date(selectedDate);
    printerDeadline.setHours(0, 0, 0, 0);

    if (printerDeadline < today) {
        toast.warning("Printer deadline cannot be back dated");
        return false;
    }

    return true;
};
const getElementGroupRowsFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const fetchElementGroups = async ({ showFallbackMessage = true } = {}) => {
  try {
    const response = await axios.get(config.ElementGroupMaster.URL.GetAll, {
      timeout: 10000,
    });

    const apiRows = getElementGroupRowsFromResponse(response.data).map(
      normalizeElementGroupRow
    );

    if (apiRows.length) {
      return apiRows;
    }

    throw new Error("No element groups returned from API");
  } catch (error) {
    console.error("Error fetching element groups", error);
    const savedGroups = getSavedElementGroups().map(normalizeElementGroupRow);
    if (showFallbackMessage) {
      toast.warn("Could not load element groups from API, using local saved groups.");
    }
    return savedGroups;
  }
};

const getCustomerRates = (rows, customerId, customerName) => {
  const normalizedCustomerName = normalizeText(customerName);

  return rows.filter((row) => {
    if (!customerId && !normalizedCustomerName) return false;
    return (
      (row.customerId && row.customerId === customerId) ||
      (row.customerName && normalizeText(row.customerName) === normalizedCustomerName)
    );
  });
};

const findPricingFromRows = (media, customerRows, allRows) => {
  const normalizedMedia = normalizeText(media);

  if (!normalizedMedia) return null;

  const isMatch = (row) =>
    [row.media, row.externalMedia, row.internalMedia].some(
      (value) => normalizeText(value) === normalizedMedia
    );

  return customerRows.find(isMatch) || allRows.find(isMatch) || null;
};

const getGeneralRateRows = (rows) =>
  rows.filter((row) => !row.customerId && !row.customerName);

const formatDate = (date) => {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(/ /g, "-");
};


const normalizeDateInputValue = (value) => {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";

  const month = String(match[1]).padStart(2, "0");
  const day = String(match[2]).padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
};

const splitClipboardRow = (row = "") => {
  const cells = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    const nextChar = row[index + 1];

    if (char === '"' && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "\t" && !inQuotes) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim());
  return cells;
};

const parseClipboardGrid = (text = "") => {
  const rows = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  if (rows[rows.length - 1] === "") rows.pop();

  return rows
    .map(splitClipboardRow)
    .filter((row) => row.some((cell) => String(cell || "").trim()));
};

const padDatePart = (value) => String(value).padStart(2, "0");

const isValidDateParts = (year, month, day) => {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
  );
};

const buildDateTimeLocalValue = (year, month, day, hour = "00", minute = "00", meridiem = "") => {
  let parsedHour = Number(hour || 0);
  const parsedMinute = Number(minute || 0);
  const marker = String(meridiem || "").trim().toLowerCase();

  if (marker === "pm" && parsedHour < 12) parsedHour += 12;
  if (marker === "am" && parsedHour === 12) parsedHour = 0;

  if (
    !isValidDateParts(Number(year), Number(month), Number(day)) ||
    parsedHour < 0 ||
    parsedHour > 23 ||
    parsedMinute < 0 ||
    parsedMinute > 59
  ) {
    return "";
  }

  return `${year}-${padDatePart(month)}-${padDatePart(day)}T${padDatePart(parsedHour)}:${padDatePart(parsedMinute)}`;
};

const normalizeDateTimePasteValue = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  const isoMatch = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?)?$/i
  );

  if (isoMatch) {
    return buildDateTimeLocalValue(
      isoMatch[1],
      isoMatch[2],
      isoMatch[3],
      isoMatch[4] || "00",
      isoMatch[5] || "00",
      isoMatch[6] || ""
    );
  }

  const slashMatch = text.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?)?$/i
  );

  if (!slashMatch) return "";

  const first = Number(slashMatch[1]);
  const second = Number(slashMatch[2]);
  const year = slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];
  const day = first > 12 || second <= 12 ? first : second;
  const month = first > 12 || second <= 12 ? second : first;

  return buildDateTimeLocalValue(
    year,
    month,
    day,
    slashMatch[4] || "00",
    slashMatch[5] || "00",
    slashMatch[6] || ""
  );
};

const getDatePickerValue = (value) => {
  const normalized = normalizeDateInputValue(value);
  if (!normalized) return null;

  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getLoggedInUser = () => {
  try {
    return JSON.parse(localStorage.getItem("users") || "{}").message || {};
  } catch (error) {
    console.error("Failed to read logged in user", error);
    return {};
  }
};

const getJobNo = (job) =>
  String(
    job?.comartjobno ??
      job?.comartJobNo ??
      job?.ComartJobNo ??
      job?.COMARTJOBNO ??
      job?.jobNo ??
      job?.jobno ??
      job?.JobNo ??
      job?.jobNumber ??
      job?.JobNumber ??
      job?.["Job No"] ??
      ""
  ).trim();

const getJobClient = (job) =>
  job?.client ?? job?.CLIENT ?? job?.customername ?? job?.customerName ?? "";

const getJobSubClient = (job) =>
  job?.subClient ?? job?.subclient ?? job?.["Sub Client"] ?? "";

const getJobCustomerId = (job) =>
  String(job?.customerid ?? job?.customerId ?? job?.customeR_ID ?? "").trim();

const getJobRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const getStoreRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const getPrinterRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const printerNameKeys = new Set([
  "printerName",
  "PrinterName",
  "printerPrintingName",
  "PrinterPrintingName",
  "printingMachine",
  "PrintingMachine",
  "machineName",
  "MachineName",
  "name",
  "Name",
]);

const extractPrinterNames = (row) => {
  if (!row) return [];
  if (typeof row === "string") return [row];
  if (typeof row !== "object") return [];

  const names = [];
  const visit = (value, key = "") => {
    if (!value) return;
    if (typeof value === "string" || typeof value === "number") {
      if (printerNameKeys.has(key)) names.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
      return;
    }
    if (typeof value !== "object") return;

    Object.entries(value).forEach(([childKey, childValue]) => {
      if (printerNameKeys.has(childKey)) {
        if (Array.isArray(childValue)) childValue.forEach((item) => visit(item, childKey));
        else if (childValue && typeof childValue === "object") visit(childValue, childKey);
        else names.push(childValue);
        return;
      }
      visit(childValue, childKey);
    });
  };

  visit(row);
  return names;
};

const normalizeStoreRow = (store, index = 0) => ({
  id: String(store?.id || store?._id || store?.storeId || store?.StoreId || `store-${index}`),
  storeName: String(store?.storeName || store?.StoreName || store?.name || store?.Name || "").trim(),
  address: String(store?.address || store?.Address || store?.storeAddress || store?.StoreAddress || "").trim(),
  location: String(store?.location || store?.Location || "").trim(),
  city: String(store?.city || store?.City || "").trim(),
  panCard: normalizePanCard(
    store?.panCard ||
      store?.PanCard ||
      store?.panNo ||
      store?.PANNo ||
      store?.PAN_NO ||
      store?.pan ||
      store?.PAN ||
      getPanFromGstin(store?.gstNo || store?.GSTNo || store?.GST_NO || store?.gstin || store?.GSTIN)
  ),
});

const formatStoreShipTo = (store) =>
  [
    store?.storeName,
    store?.address,
    [store?.location, store?.city].filter(Boolean).join(", "),
    store?.panCard ? `PAN: ${store.panCard}` : "",
  ]
    .filter(Boolean)
    .join("\n");

const extractPanFromText = (value) => {
  const match = String(value || "").match(/\bPAN\s*:\s*([A-Z0-9]{10})\b/i);
  return normalizePanCard(match?.[1] || "");
};

const buildJobOption = (job) => {
  const jobNo = getJobNo(job);
  if (!jobNo) return null;

  const clientName = getJobClient(job);
  return {
    value: jobNo,
    label: clientName ? `${jobNo} (${clientName})` : jobNo,
    clientName,
    subClient: getJobSubClient(job),
    customerId: getJobCustomerId(job),
  };
};

const isLineBlank = (line) =>
  [
    line.store,
    line.city,
    line.prodLoc,
    line.billLoc,
    line.salonAddress,
    line.brandingLocation,
    line.printingMachine,
    line.printReadyFile,
    line.remarks,
    line.media,
    line.internalMedia,
    line.externalMedia,
    line.elementGroup,
    line.visualCode,
    line.qty,
    line.width,
    line.height,
    line.billingWidth,
    line.billingHeight,
    line.sqft,
    line.rate,
    line.amount,
    line.installationCharges,
    line.transportationCharges,
    line.layoutingCharges,
    line.laminationFlag,
    line.lamination,
    line.mountingFlag,
    line.mounting,
    line.implementation,
    line.jobDeadline,
    line.printerDeadline,
  ].every((value) => !String(value || "").trim());

const sanitizeEstimateFilePart = (source, fallback = "draft") => {
  const cleanName = String(source || fallback)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return cleanName || fallback;
};

const buildEstimateAttachmentName = (header = {}, locationLabel = "") => {
  const source = header.jobNo || header.projectName || header.clientName || "draft";
  const cleanName = sanitizeEstimateFilePart(source);
  const cleanLocation = locationLabel
    ? sanitizeEstimateFilePart(locationLabel, "")
    : "";

  return `Estimate_${cleanName}${cleanLocation ? `_${cleanLocation}` : ""}.pdf`;
};

const getEstimateProjectTitle = (header = {}) =>
  header.projectName || header.jobNo || header.clientName || "Estimate";

const getEstimateLineItems = (header = {}, lines = []) =>
  lines
    .filter((line) => !isLineBlank(line))
    .map((line, index) => {
      const width = toNumber(getLineBillingWidth(line) || line.width);
      const height = toNumber(getLineBillingHeight(line) || line.height);
      const qty = toNumber(line.qty) || 1;
      const sqftPerUnit = width > 0 && height > 0 ? roundAmount((width * height) / 144) : 0;
      const printableSqft = toNumber(line.sqft) || roundAmount(sqftPerUnit * qty);
      const rate = toNumber(line.rate);
      const amount = toNumber(line.amount) || roundAmount(printableSqft * rate);

      return {
        slideNo: index + 1,
        estimateLineKey: line.id || `estimate-line-${index}`,
        region: line.billLoc || line.prodLoc || line.city || "",
        salonName: line.store || line.brandingLocation || line.description || "",
        description: line.description || "",
        recceDone: "",
        recceCharge: "",
        width,
        height,
        sqftPerUnit,
        qty,
        widthFeet: width ? roundAmount(width / 12) : "",
        heightFeet: height ? roundAmount(height / 12) : "",
        printableSqft,
        rate,
        media: line.media || line.externalMedia || line.internalMedia || line.elementGroup || "",
        amount,
        installationCharges: toNumber(line.installationCharges),
        transportationCharges: toNumber(line.transportationCharges),
        layoutingCharges: toNumber(line.layoutingCharges),
        lineTotal: roundAmount(
          amount +
            toNumber(line.installationCharges) +
            toNumber(line.transportationCharges) +
            toNumber(line.layoutingCharges)
        ),
        hsn: line.hsn || "",
        articleCode: line.articleCode || line.visualCode || "",
        visualCode: line.visualCode || line.articleCode || "",
        billingLocation: line.billLoc || "",
        productionLocation: line.prodLoc || "",
      };
    });

const ESTIMATE_MAIL_CHARGE_TYPES = [
  { key: "installationCharges", label: "Installation Charges" },
  { key: "transportationCharges", label: "Transportation Charges" },
  { key: "layoutingCharges", label: "Layouting Charges" },
];

const buildEstimateMailChargeRows = (lineItems = []) =>
  lineItems.flatMap((item, index) => {
    const parentKey = item.estimateLineKey || `estimate-line-${index}`;

    return ESTIMATE_MAIL_CHARGE_TYPES.map((chargeType) => ({
      estimateLineKey: `${parentKey}-${chargeType.key}`,
      parentEstimateLineKey: parentKey,
      chargeKey: chargeType.key,
      description: chargeType.label,
      region: item.region || "",
      salonName: item.salonName || "",
      billingLocation: item.billingLocation || item.region || "",
      productionLocation: item.productionLocation || "",
      amount: String(item[chargeType.key] || ""),
    }));
  });

const applyEstimateMailChargesToLineItems = (lineItems = [], chargeRows = []) => {
  const baseRows = lineItems.map((item, index) => ({
    ...item,
    estimateLineKey: item.estimateLineKey || `estimate-line-${index}`,
    installationCharges: 0,
    transportationCharges: 0,
    layoutingCharges: 0,
    lineTotal: toNumber(item.amount),
    isChargeRow: false,
  }));

  const chargeRowsByParent = new Map();

  chargeRows.forEach((row) => {
    const amount = toNumber(row.amount);
    if (!amount) return;

    const parentKey = String(row.parentEstimateLineKey || "");
    if (!chargeRowsByParent.has(parentKey)) chargeRowsByParent.set(parentKey, []);
    chargeRowsByParent.get(parentKey).push(row);
  });

  return baseRows.flatMap((item) => {
    const rows = [item];
    const childChargeRows = chargeRowsByParent.get(String(item.estimateLineKey)) || [];

    childChargeRows.forEach((row) => {
      const amount = toNumber(row.amount);
      rows.push({
        ...item,
        estimateLineKey: row.estimateLineKey,
        chargeKey: row.chargeKey,
        slideNo: "",
        salonName: row.salonName || item.salonName,
        region: row.region || item.region,
        billingLocation: row.billingLocation || item.billingLocation || item.region,
        productionLocation: row.productionLocation || item.productionLocation,
        width: "",
        height: "",
        sqftPerUnit: "",
        qty: 1,
        widthFeet: "",
        heightFeet: "",
        printableSqft: 0,
        rate: amount,
        media: "",
        description: row.description || "",
        amount,
        installationCharges: 0,
        transportationCharges: 0,
        layoutingCharges: 0,
        lineTotal: amount,
        isChargeRow: true,
      });
    });

    return rows;
  });
};

const getEstimateBillingLocationLabel = (item = {}) =>
  firstValue(
    item.billingLocation,
    item.BillingLocation,
    item["Billing Location"],
    item.productionLocation,
    item.ProductionLocation,
    item["Production Location"],
    item.region,
    "Unassigned"
  );

const groupEstimateLineItemsByBillingLocation = (lineItems = []) => {
  const groupMap = new Map();
  const groups = [];

  lineItems.forEach((item) => {
    const label = getEstimateBillingLocationLabel(item);
    const key = normalizeText(label) || "unassigned";

    if (!groupMap.has(key)) {
      const group = { key, label, items: [] };
      groupMap.set(key, group);
      groups.push(group);
    }

    groupMap.get(key).items.push(item);
  });

  return groups.map((group) => ({
    ...group,
    items: group.items.map((item, index) => ({
      ...item,
      slideNo: index + 1,
      region: item.billingLocation || item.region || group.label,
    })),
  }));
};

const buildEstimateHeaderForLocation = (header = {}, locationLabel = "") => ({
  ...header,
  billingLocation: locationLabel,
  billLoc: locationLabel,
});

const getEstimateAttachmentGroups = (header = {}, lineItems = []) => {
  const groups = groupEstimateLineItemsByBillingLocation(lineItems);
  const shouldSplit = groups.length > 1;

  return groups.map((group) => ({
    ...group,
    fileName: buildEstimateAttachmentName(header, shouldSplit ? group.label : ""),
  }));
};

const getEstimateTotals = (lineItems) => {
  const printableSqftTotal = roundAmount(
    lineItems.reduce((summary, item) => summary + toNumber(item.printableSqft), 0)
  );
  const productionTotal = roundAmount(
    lineItems.reduce((summary, item) => summary + toNumber(item.amount), 0)
  );
  const installationCharges = roundAmount(
    lineItems.reduce((summary, item) => summary + toNumber(item.installationCharges), 0)
  );
  const transportationCharges = roundAmount(
    lineItems.reduce((summary, item) => summary + toNumber(item.transportationCharges), 0)
  );
  const layoutingCharges = roundAmount(
    lineItems.reduce((summary, item) => summary + toNumber(item.layoutingCharges), 0)
  );
  const amountTotal = roundAmount(productionTotal + installationCharges + transportationCharges + layoutingCharges);
  const gstAmount = roundAmount(amountTotal * ESTIMATE_GST_RATE);
  const grandTotal = roundAmount(amountTotal + gstAmount);

  return {
    printableSqftTotal,
    productionTotal,
    installationCharges,
    transportationCharges,
    layoutingCharges,
    amountTotal,
    gstAmount,
    grandTotal,
  };
};

const formatPdfNumber = (value) =>
  toNumber(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const formatPdfCurrency = (value) =>
  toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const ESTIMATE_PDF_LOGO_IMAGE = "data:image/png;base64,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";

const addEstimatePdfHeader = (doc, header = {}, lineItems = []) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const projectTitle = getEstimateProjectTitle(header);
  const companyDetails = getEstimateCompanyDetails(header, lineItems);
  const margin = 32;
  const dateText = `Date - ${header.date || formatDate(new Date())}`;

  // Compact logo at top left
  doc.addImage(ESTIMATE_PDF_LOGO_IMAGE, "PNG", margin, 20, 165, 41);

  // Center title with clear spacing from logo and address
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Estimate", pageWidth / 2, 78, { align: "center" });

  // Date at top right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(dateText, pageWidth - margin, 103, { align: "right" });

  // Company address / GST / phone with dynamic line spacing to avoid overlap
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  const addressLines = doc.splitTextToSize(
    companyDetails.companyAddress || "-",
    pageWidth - margin * 2 - 190
  );

  let y = 103;
  doc.text(addressLines, margin, y);
  y += addressLines.length * 9 + 3;

  doc.text(`GSTIN: ${companyDetails.companyGst || "-"}`, margin, y);
  y += 11;

  if (companyDetails.companyPhone) {
    doc.text(`Tel: ${companyDetails.companyPhone}`, margin, y);
    y += 11;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Client Name : ${header.clientName || header.client || "-"}`, margin, y + 4);
  doc.text(`Project - ${projectTitle}`, margin, y + 19, { maxWidth: pageWidth - margin * 2 });

  return y + 36;
};
const ESTIMATE_PDF_TERMS_IMAGE = "data:image/png;base64,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2qJXjnb3UQGj9J6LZyvyBJP7fnTXNrjnowf2fPw3iqIAoCgIZRbPmV5YMt1IHTSZIGpw5wtX7XoRHJnfoij4B53ON/Piq9M2vzHpsAUAVyhSnbckl885o0NrYYVBWHP++aJN67tffuqmV548aisEnXXXu1fNEGR5+sc+eXbpR0enMOUc/vSZ+YhMsLyytrdj78Y92/68KO/PR00sMeUtf7r52fnfUWK8VJZ53nlZYLyvtnMAgniFpuIVSwshAACzoCa/oH/hZ69trH94efHDR0sSZfMv+NBzfxXAPM0H1214/ON7L5/qEMKoYbasuPAU3SCxiIPCka6vnnhi89Mv3iy/+L3xq6KnmRKBBLzimrMK6h3Du7dte++qre9d9Y1XiIo0Zdfv23ptKvyDBBBUYK72GV7Sqvq2tvxjdcZjAAAAMXmqzKyZK6648+6bZ37fVwoCgMnlsjhSykvaX76s9DUk84rrbr783hurNcfMIDEYsEjEBmTk8D9X1/8beXjexavv/McD1112/863g23vfdj23od/OdJ3hlBR4QVl89bONh73IgQetY9/cv1FH5EXHflFgDCmT8tmylIKTMa0UtWmLkvvPxdnP/7NTDMEnzAMRFKkf/ffz9799ymvBhSMMGdcXJWuzRaNdUy5Pek/8PRVB56mjnRaIJRRtro0O71Y2tJ9wkuz1Ij+yssWXze2N9LngSGFWl6zbLXwVPWAzeWy2DLSNWR/+cL815Csa266bfpSM3W6lkKWKilacm3RCw+0fP7MzZ8/fYwWMF///j2XLrpmmvinNEUstkCqSoFBz+RHN97y8Tf+Q327uwVlwCIRB5DhpueuaHkReaxy+aq/vvP3i8574vD6li1PP/31U09ddTRH1WfddPVdjyyYfgbjdVJlCofTFW7avu+RbfCj3zwUkpv/Y2dEU5Hh3a+/uPeNF66catcQJG2OtnTBNRmSsCYTZYx5a196vfalN247mje95rTpcThMHpeBBRw77y6ajqCzb3/1issvuywfOlqQIqFIpQxSlp1/qkgF3yyCoBhHVktRweH2TR98/OJTfzzi+ginqFJSlGM6VRWmKNJW+8YbB9588/apbjWCCObXpM5cOlMEI+ddVvjUy021X79Yu/kF6puygVVL7jrnytufX6M5E9sweRIGi4dNto0/dw7yIpp928f3LITkp/NTmGEu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";


const ESTIMATE_PDF_STAMP_IMAGE = "data:image/png;base64,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";
const ESTIMATE_PDF_HEADERS = [
  "Slide No.",
  "Region",
  "Salon Name",
  "Article Code",
  "Media",
  "Width Inch",
  "Height Inch",
  "Sq.Ft",
  "Qty",
  "Width Ft",
  "Height Ft",
  "Printable Sqft",
  "Rate",
  "HSN Code",
  "Description",
  "Amount",
];

const getEstimateChargeColumnValue = (item = {}, chargeKey = "") => {
  if (item.isChargeRow && item.chargeKey === chargeKey) {
    return item.amount;
  }

  return item[chargeKey] || "";
};

const drawEstimateTermsAndFooter = (doc, header = {}, lineItems = [], startY = 0) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 32;
  const companyDetails = getEstimateCompanyDetails(header, lineItems);

  let y = startY;
  const requiredHeight = 175;

  if (y + requiredHeight > pageHeight - 24) {
    doc.addPage();
    // Do not print the estimate header again on the Terms & Conditions page.
    // This keeps the terms/footer section from showing duplicate logo, address,
    // GST, date, client and project details above it.
    y = 48;
  }

  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y - 8, pageWidth - margin * 2, requiredHeight, "F");

  const terms = [
    ["1", "Payment Terms: 30 days from Invoice"],
    ["2", "Order Once placed cannot be cancelled or advance amount refunded"],
    ["3", "The Company reserves the right to supply the material in part as per the availability of the stock."],
    ["4", "18% Interest Per Annum will be charged for payment received beyond the agreed period or 7 days whichever is earlier."],
    ["5", "Road Permit and state charge if applicable customer will provide the same"],
    ["6", "For any installation or any major break down the client have to arrange the Train/air ticket for our engineer with both lodging and fooding services during the warranty period."],
  ];

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Terms & Condition :", margin, y);

  let termY = y + 16;
  terms.forEach(([number, text]) => {
    const lines = doc.splitTextToSize(text, 430);
    doc.text(number, margin + 4, termY);
    doc.text(lines, margin + 30, termY);
    termY += Math.max(14, lines.length * 11);
  });

  doc.addImage(ESTIMATE_PDF_STAMP_IMAGE, "PNG", pageWidth - margin - 180, y + 26, 118, 108);

  const footerY = Math.max(termY + 20, y + 142);
  doc.setTextColor(255, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text((companyDetails.companyName || "Commercial Reprographers").toUpperCase(), pageWidth / 2, footerY, {
    align: "center",
  });

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  const footerAddress = companyDetails.companyAddress || "-";
  const footerAddressLines = doc.splitTextToSize(footerAddress, pageWidth - margin * 2);
  doc.text(footerAddressLines, pageWidth / 2, footerY + 15, { align: "center" });

  const gstY = footerY + 15 + footerAddressLines.length * 11;
  doc.text(`GSTIN: ${companyDetails.companyGst || "-"}`, pageWidth / 2, gstY, { align: "center" });

  if (companyDetails.companyPhone) {
    doc.text(`Tel: ${companyDetails.companyPhone}`, pageWidth / 2, gstY + 13, { align: "center" });
  }

  doc.setTextColor(0, 0, 0);
};

const buildEstimatePdfDocument = (header = {}, lineItems = []) => {
  const projectTitle = getEstimateProjectTitle(header);
  const totals = getEstimateTotals(lineItems);
  const doc = new jsPDF("landscape", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 32;

  const headerEndY = addEstimatePdfHeader(doc, header, lineItems);
  const projectY = Math.max(headerEndY + 4, 170);
  const tableStartY = projectY + 13;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(projectTitle, margin, projectY, { maxWidth: pageWidth - margin * 2 });

  doc.autoTable({
    startY: tableStartY,
    head: [ESTIMATE_PDF_HEADERS],
    body: lineItems.map((item) => [
      item.slideNo,
      item.region || "-",
      item.salonName || "-",
      item.articleCode || item.visualCode || "-",
      item.isChargeRow ? "" : item.media || "-",
      formatPdfNumber(item.width),
      formatPdfNumber(item.height),
      formatPdfNumber(item.sqftPerUnit),
      formatPdfNumber(item.qty),
      formatPdfNumber(item.widthFeet),
      formatPdfNumber(item.heightFeet),
      formatPdfNumber(item.printableSqft),
      formatPdfCurrency(item.rate),
      item.hsn || "-",
      item.description || "-",
      formatPdfCurrency(item.amount),
    ]),
    theme: "grid",
    margin: { left: margin, right: margin, top: 84, bottom: 44 },
    tableWidth: pageWidth - margin * 2,
    styles: {
      fontSize: 5.6,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "middle",
      lineWidth: 0.35,
    },
    headStyles: {
      fillColor: [47, 94, 217],
      textColor: 255,
      fontSize: 5.6,
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [247, 249, 252],
    },
    columnStyles: {
      0: { cellWidth: 25, halign: "center" },
      1: { cellWidth: 35 },
      2: { cellWidth: 70 },
      3: { cellWidth: 50 },
      4: { cellWidth: 60 },
      5: { cellWidth: 30, halign: "right" },
      6: { cellWidth: 30, halign: "right" },
      7: { cellWidth: 30, halign: "right" },
      8: { cellWidth: 25, halign: "right" },
      9: { cellWidth: 30, halign: "right" },
      10: { cellWidth: 30, halign: "right" },
      11: { cellWidth: 45, halign: "right" },
      12: { cellWidth: 35, halign: "right" },
      13: { cellWidth: 45 },
      14: { cellWidth: 60 },
      15: { cellWidth: 45, halign: "right" },
      16: { cellWidth: 40, halign: "right" },
      17: { cellWidth: 45, halign: "right" },
      18: { cellWidth: 40, halign: "right" },
    },
    didDrawPage: () => {
      const currentPage = doc.internal.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 20, { align: "right" });
    },
  });

  let summaryY = (doc.lastAutoTable?.finalY || 150) + 16;
  if (summaryY > pageHeight - 150) {
    doc.addPage();
    const newHeaderEndY = addEstimatePdfHeader(doc, header, lineItems);
    summaryY = Math.max(newHeaderEndY + 18, 180);
  }

  const summaryTableWidth = 260;
  doc.autoTable({
    startY: summaryY,
    body: [
      ["Total Square Feet", formatPdfNumber(totals.printableSqftTotal)],
      ["Amount", formatPdfCurrency(totals.amountTotal)],
      ["18% GST", formatPdfCurrency(totals.gstAmount)],
      ["Total Amount", formatPdfCurrency(totals.grandTotal)],
    ],
    theme: "grid",
    tableWidth: summaryTableWidth,
    margin: { left: pageWidth - margin - summaryTableWidth },
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === 3) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [238, 243, 255];
      }
    },
  });

  const footerY = (doc.lastAutoTable?.finalY || summaryY) + 24;
  drawEstimateTermsAndFooter(doc, header, lineItems, footerY);

  return doc;
};

const createEstimatePdfBlob = (header, lineItems) =>
  buildEstimatePdfDocument(header, lineItems).output("blob");

const getEstimateRecipients = (value) =>
  String(value || "")
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter(Boolean);

const uniqueValues = (values) => [
  ...new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
];

const toOption = (value, label = value) => ({ value, label });

const buildValueOptions = (defaults, extraValues = []) =>
  uniqueValues([...defaults, ...extraValues]).map((value) => toOption(value));

const getSelectedOption = (options, value) =>
  options.find((option) => option.value === value) || null;

const pasteableLineColumns = [
  { key: "visualCode", label: "VISUAL CODE", aliases: ["visual code", "visualcode"] },
  { key: "qty", label: "QTY", aliases: ["qty", "quantity"] },
  { key: "width", label: "Width", aliases: ["width", "w"] },
  { key: "height", label: "Height", aliases: ["height", "h"] },
  { key: "billingWidth", label: "Billing Width", aliases: ["billing width", "billingwidth", "bw"] },
  { key: "billingHeight", label: "Billing Height", aliases: ["billing height", "billingheight", "bh"] },
  { key: "installationCharges", label: "Installation charges", aliases: ["installation charges", "installation", "installationcharges"] },
  { key: "transportationCharges", label: "Transportation charges", aliases: ["transportation charges", "transportation", "transportationcharges"] },
  { key: "layoutingCharges", label: "Layouting charges", aliases: ["layouting charges", "layouting", "layout charges", "layoutingcharges"] },
  { key: "jobDeadline", label: "JOB DEADLINE", aliases: ["job deadline", "deadline"] },
  { key: "printerDeadline", label: "PRINTER DEADLINE", aliases: ["printer deadline"] },
  { key: "remarks", label: "REMARKS/INSTRUCTIONS", aliases: ["remarks", "instructions"] },
];

const deadlineLineFields = new Set(["jobDeadline", "printerDeadline"]);

const isBackDatedDeadlineValue = (value) => {
  if (!value) return false;

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date < today;
};

const getPasteColumnByHeader = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  return (
    pasteableLineColumns.find((column) =>
      [column.key, column.label, ...column.aliases]
        .map(normalizeText)
        .includes(normalized)
    ) || null
  );
};

const getClipboardPasteData = (grid) => {
  if (grid.length < 2) return { rows: grid, headerColumns: null };

  const headerColumns = grid[0].map(getPasteColumnByHeader);
  const filledHeaderCells = grid[0].filter((cell) => String(cell || "").trim()).length;
  const headerMatches = headerColumns.filter(Boolean).length;

  if (!filledHeaderCells || headerMatches < Math.min(2, filledHeaderCells)) {
    return { rows: grid, headerColumns: null };
  }

  return { rows: grid.slice(1), headerColumns };
};

const normalizeNumericPasteValue = (value) =>
  String(value || "")
    .trim()
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

const normalizePastedLineValue = (field, value) => {
  if (["width", "height", "billingWidth", "billingHeight"].includes(field)) {
    return maskDimensionValue(value);
  }
  if (["qty", "installationCharges", "transportationCharges", "layoutingCharges"].includes(field)) {
    return normalizeNumericPasteValue(value);
  }
  if (deadlineLineFields.has(field)) {
    return normalizeDateTimePasteValue(value);
  }

  return String(value || "").trim();
};

const clipboardCell = (value) => {
  const text = String(value ?? "");
  return /["\t\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const buildLineClipboardText = (rows, columns = pasteableLineColumns) => [
  columns.map((column) => clipboardCell(column.label)).join("\t"),
  ...rows.map((row) =>
    columns.map((column) => clipboardCell(row[column.key])).join("\t")
  ),
].join("\n");

const applyPastedLinePatch = (line, patch) => {
  const nextLine = applyDimensionPatch(line, patch);
  const shouldRecalculate = ["qty", "width", "height", "billingWidth", "billingHeight", "rate"].some((field) =>
    Object.prototype.hasOwnProperty.call(patch, field)
  );

  return shouldRecalculate ? recalculateLine(nextLine) : nextLine;
};

const selectPortalTarget = () =>
  typeof document !== "undefined" ? document.body : null;

const compactSelectStyles = {
  container: (base) => ({
    ...base,
    width: "100%",
    minWidth: 0,
  }),
  control: (base, state) => ({
    ...base,
    width: "100%",
    minWidth: 0,
    minHeight: 30,
    height: 30,
    border: 0,
    borderRadius: 0,
    boxShadow: state.isFocused ? "0 0 0 2px rgba(47, 94, 217, 0.15)" : "none",
    backgroundColor: "#ffffff",
    fontSize: 14,
  }),
  valueContainer: (base) => ({ ...base, height: 30, padding: "0 7px" }),
  singleValue: (base) => ({
    ...base,
    maxWidth: "calc(100% - 8px)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
  placeholder: (base) => ({
    ...base,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 5px" }),
  clearIndicator: (base) => ({ ...base, padding: "0 5px" }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
};

const formSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 32,
    borderColor: state.isFocused ? "#2f5ed9" : "#d5dbe5",
    borderRadius: 5,
    boxShadow: state.isFocused ? "0 0 0 2px rgba(47, 94, 217, 0.15)" : "none",
    backgroundColor: "#f8fafc",
    fontSize: 14,
  }),
  valueContainer: (base) => ({ ...base, padding: "0 10px" }),
  indicatorsContainer: (base) => ({ ...base, minHeight: 32 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const JobEntry = () => {
  const [header, setHeader] = useState({
    jobNo: "",
    date: formatDate(new Date()),
    client: "",
    panCard: "",
    clientName: "",
    userName: "",
    subClient: "",
    businessType: "",
    contactPerson: "",
    poNo: "",
    poDate: "",
    poType: "",
    customerEmail: "",
    projectName: "",
  });

  const [lines, setLines] = useState([createLine(0)]);
  const [selectedLineIds, setSelectedLineIds] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [rateRows, setRateRows] = useState([]);
  const [elementGroupRows, setElementGroupRows] = useState([]);
  const [printerOptions, setPrinterOptions] = useState([]);
  const [storeMasterRows, setStoreMasterRows] = useState([]);
  const [jobOptions, setJobOptions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [copiedLines, setCopiedLines] = useState([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSyncDisabled, setDraftSyncDisabled] = useState(false);
  const [isDraftPanelOpen, setIsDraftPanelOpen] = useState(false);
  const [draftList, setDraftList] = useState([]);
  const [activeJobEntryTab, setActiveJobEntryTab] = useState("existing");
  const [activePasteCell, setActivePasteCell] = useState({ lineId: "", field: "visualCode" });
  const [isEstimateMailOpen, setIsEstimateMailOpen] = useState(false);
  const [isSendingEstimateMail, setIsSendingEstimateMail] = useState(false);
  const [estimateMail, setEstimateMail] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const [estimateMailChargeRows, setEstimateMailChargeRows] = useState([]);

  const getDraftId = () => header.jobNo || TEMP_DRAFT_ID;

  const getAllDrafts = () => {
    try {
      return JSON.parse(localStorage.getItem(JOB_DRAFT_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const getSortedDrafts = () =>
    Object.values(getAllDrafts()).sort(
      (a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0)
    );

  const refreshDraftList = () => setDraftList(getSortedDrafts());

  const saveCurrentDraft = (showToast = false) => {
    const hasHeaderData =
      header.jobNo ||
      header.client ||
      header.clientName ||
      header.subClient ||
      header.businessType ||
      header.contactPerson ||
      header.poNo ||
      header.poDate ||
      header.poType ||
      header.customerEmail ||
      header.projectName;
    const hasLineData = lines.some((line) => !isLineBlank(line));

    if (!hasHeaderData && !hasLineData) return;

    const draftId = getDraftId();
    const allDrafts = getAllDrafts();

    allDrafts[draftId] = {
      draftId,
      jobNo: header.jobNo,
      clientName: header.clientName,
      header,
      lines,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(JOB_DRAFT_KEY, JSON.stringify(allDrafts));
    refreshDraftList();

    if (showToast) toast.success("Draft saved");
  };

  const loadDraft = (draft) => {
    if (draft?.header) setHeader(draft.header);
    if (draft?.lines?.length) {
      setLines(draft.lines.map((line) => withoutMediaSelection(withBillingDimensions(line))));
    }
    setDraftRestored(true);
    setDraftSyncDisabled(false);
    setIsDraftPanelOpen(false);
    toast.success("Draft loaded");
  };

  const showDrafts = () => {
    refreshDraftList();
    setIsDraftPanelOpen(true);
  };

  const deleteDraft = (draft) => {
    const draftId = draft?.draftId || draft?.jobNo || TEMP_DRAFT_ID;
    const confirmDelete = window.confirm(`Delete draft ${draft?.jobNo || "New Job Draft"}?`);
    if (!confirmDelete) return;

    const allDrafts = getAllDrafts();
    delete allDrafts[draftId];
    localStorage.setItem(JOB_DRAFT_KEY, JSON.stringify(allDrafts));

    if (draftId === getDraftId()) setDraftSyncDisabled(true);

    refreshDraftList();
    toast.success("Draft deleted");
  };

  const clearCurrentDraft = () => {
    const allDrafts = getAllDrafts();
    delete allDrafts[getDraftId()];
    localStorage.setItem(JOB_DRAFT_KEY, JSON.stringify(allDrafts));
  };

  const clearJobEntry = () => {
    const confirmClear = window.confirm(
      "Clear current job entry from the screen only? Saved draft will remain in local storage."
    );
    if (!confirmClear) return;

    setHeader((prev) => ({
      ...prev,
      jobNo: "",
      client: "",
      panCard: "",
      clientName: "",
      subClient: "",
      date: formatDate(new Date()),
      businessType: "",
      contactPerson: "",
      poNo: "",
      poDate: "",
      poType: "",
      customerEmail: "",
      projectName: "",
    }));

    setLines([]);
    setSelectedLineIds([]);
    setCopiedLines([]);
    setSaveStatus("Cleared from display only. Saved draft is still available in local storage.");
    setDraftRestored(false);
    setDraftSyncDisabled(true);

    toast.success("Job entry cleared from screen only");
  };

  useEffect(() => {
    if (draftSyncDisabled) return;

    const hasHeaderData = header.jobNo || header.client || header.clientName || header.subClient;
    const hasLineData = lines.some((line) => !isLineBlank(line));

    if (!hasHeaderData && !hasLineData) return;

    const timer = setTimeout(() => saveCurrentDraft(false), 500);
    return () => clearTimeout(timer);
  }, [header, lines]);

  useEffect(() => {
    const users = getLoggedInUser();
    const locationId = users?.location_id || users?.locationId || "";

    const fetchCustomers = async () => {
      try {
        if (!locationId) {
          setCustomers(mergeMasterCustomers([]));
          return;
        }

        const response = await axios.post(
          config.JobSummary.URL.Getallcustomer,
          { locationid: locationId },
          { timeout: 10000, headers: { "Content-Type": "application/json" } }
        );

        setCustomers(mergeMasterCustomers(getCustomerRowsFromResponse(response.data)));
      } catch (error) {
        console.error("Error fetching customers", error);
        setCustomers(mergeMasterCustomers([]));
      }
    };

    const fetchRateRows = async () => {
      try {
        const response = await axios.get(config.ProductMediaRateMaster.URL.GetAll, {
          timeout: 10000,
        });

        const apiRows = getRateRowsFromResponse(response.data).map(normalizeRateRow);
        const savedRows = getSavedRateRows().map(normalizeRateRow);

        setRateRows(mergeRateRows(apiRows, savedRows, buildDefaultRateRows(), buildMasterMediaRows()));
      } catch (error) {
        console.error("Unable to fetch product media rates", error);
        setRateRows(
          mergeRateRows(getSavedRateRows().map(normalizeRateRow), buildDefaultRateRows(), buildMasterMediaRows())
        );
      }
    };

    const fetchPrinterOptions = async () => {
      try {
        const payloads = locationId
          ? [{ location_id: locationId }, { locationId }, { locationid: locationId }, {}]
          : [{}];
        const responses = await Promise.allSettled(
          payloads.map((payload) =>
            axios.post(config.Printing.URL.Getallprinting, payload, {
              timeout: 10000,
              headers: { "Content-Type": "application/json" },
            })
          )
        );

        const names = responses
          .flatMap((result) => {
            if (result.status !== "fulfilled") return [];
            const responseData = result.value.data;
            const rows = getPrinterRows(responseData);
            return rows.length ? rows : [responseData];
          })
          .flatMap(extractPrinterNames)
          .map((name) => String(name || "").trim())
          .filter(Boolean);

        setPrinterOptions(uniqueValues(names));
      } catch (error) {
        console.error("Unable to fetch printer names", error);
        setPrinterOptions([]);
      }
    };

    setHeader((prev) => ({
      ...prev,
      userName: prev.userName || users?.username || users?.userName || "",
    }));

    fetchCustomers();
    fetchRateRows();
    fetchPrinterOptions();
    fetchElementGroups({ showFallbackMessage: false }).then((rows) => setElementGroupRows(rows));
  }, []);

  const refreshElementGroups = async () => {
    const rows = await fetchElementGroups({ showFallbackMessage: true });
    setElementGroupRows(rows);
  };

  const fetchJobNumbers = useCallback(async () => {
    const users = getLoggedInUser();
    const locationId = users?.location_id || users?.locationId || "";

    const toUniqueJobOptions = (rows) => {
      const seen = new Set();
      return rows
        .map(buildJobOption)
        .filter((job) => {
          if (!job?.value || seen.has(job.value)) return false;
          seen.add(job.value);
          return true;
        });
    };

    try {
      if (!locationId) {
        setJobOptions([]);
        return [];
      }

      const payload = { locationId, location_id: locationId, locationid: locationId };
      const responses = await Promise.allSettled([
        axios.post(config.JobSummary.URL.GetAllJobsFromSql, payload),
        axios.post(config.JobSummary.URL.GetAllJobsAccToLocation, payload),
        axios.post(config.JobSummary.URL.Getalljob, payload),
      ]);
      const rows = responses.flatMap((result) =>
        result.status === "fulfilled" ? getJobRows(result.value.data) : []
      );
      const options = toUniqueJobOptions(rows);

      setJobOptions(options);
      return options;
    } catch (error) {
      console.error("Unable to fetch job numbers", error);
      setJobOptions([]);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchJobNumbers();
  }, [fetchJobNumbers]);

  const selectedClientPanCard = useMemo(() => {
    const selectedCustomer = customers.find(
      (customer) =>
        getCustomerId(customer) === header.client ||
        normalizeText(getCustomerName(customer)) === normalizeText(header.clientName)
    );

    return selectedCustomer ? getCustomerPanCard(selectedCustomer) : "";
  }, [customers, header.client, header.clientName]);

  const hydratedElementGroupRows = useMemo(
    () => hydrateElementGroupPanCards(elementGroupRows, customers),
    [customers, elementGroupRows]
  );

  useEffect(() => {
    const storePanCard = normalizePanCard(header.panCard) || selectedClientPanCard;
    const storeListUrl = storePanCard
      ? `${config.Store.URL.List}?panCard=${encodeURIComponent(storePanCard)}`
      : header.client
        ? `${config.Store.URL.List}?customerId=${encodeURIComponent(header.client)}`
        : "";

    if (!storeListUrl) {
      setStoreMasterRows([]);
      return;
    }

    axios
      .get(storeListUrl, {
        timeout: 10000,
      })
      .then((response) => {
        setStoreMasterRows(getStoreRows(response.data).map(normalizeStoreRow));
      })
      .catch((error) => {
        console.error("Unable to fetch stores from Store Master", error);
        setStoreMasterRows([]);
      });
  }, [header.client, header.panCard, selectedClientPanCard]);

  const getLinePanCard = useCallback(
    (line = {}) => {
      const directPan = normalizePanCard(line.panCard) || extractPanFromText(line.salonAddress);
      if (directPan) return directPan;

      const selectedStore = storeMasterRows.find(
        (store) =>
          normalizeText(store.storeName) === normalizeText(line.store) ||
          normalizeText(formatStoreShipTo(store)) === normalizeText(line.salonAddress)
      );

      return selectedStore?.panCard || selectedClientPanCard || "";
    },
    [selectedClientPanCard, storeMasterRows]
  );

  const getElementGroupMatchRank = useCallback(
    (row, line = {}) => {
      const selectedCustomerId = String(header.client || "").trim();
      const selectedCustomerName = normalizeText(header.clientName);
      const linePanCard = getLinePanCard(line);
      const groupCustomerId = String(row.customerId || "").trim();
      const groupCustomerName = normalizeText(row.customerName);
      const groupPanCard = normalizePanCard(row.panCard);
      const isClientGroup =
        (selectedCustomerId && groupCustomerId && groupCustomerId === selectedCustomerId) ||
        (selectedCustomerName && groupCustomerName && groupCustomerName === selectedCustomerName);

      if (groupPanCard) {
        return linePanCard && linePanCard === groupPanCard ? 3 : 0;
      }

      if (isClientGroup) return 2;
      const isCommonGroup = !groupCustomerId && !groupCustomerName;
      if (isCommonGroup) return 1;
      return 0;
    },
    [getLinePanCard, header.client, header.clientName]
  );

  const getElementGroupSelectOptions = useCallback(
    (line = {}) => {
      const options = [];
      const seen = new Set();

      hydratedElementGroupRows
        .filter((row) => row.isActive !== "0")
        .map((row) => ({ row, rank: getElementGroupMatchRank(row, line) }))
        .filter((item) => item.rank > 0)
        .sort((a, b) => b.rank - a.rank)
        .forEach(({ row }) => {
          const labelParts = [row.elementGroupName];
          if (row.elementGroupCode && row.elementGroupCode !== row.elementGroupName) {
            labelParts.push(`code: ${row.elementGroupCode}`);
          }
          if (row.panCard) {
            labelParts.push(`PAN: ${row.panCard}`);
          }
          if (row.customerName) {
            labelParts.push(row.customerName);
          }

          const value = row.elementGroupName || row.elementGroupCode;
          if (!value || seen.has(value)) return;

          seen.add(value);
          options.push({ value, label: labelParts.filter(Boolean).join(" - ") });
        });

      return options;
    },
    [hydratedElementGroupRows, getElementGroupMatchRank]
  );

  const findElementGroupForLine = useCallback(
    (value, line = {}) => {
      const key = normalizeText(value);
      if (!key) return null;

      const candidates = hydratedElementGroupRows
        .filter((row) => row.isActive !== "0")
        .filter(
          (row) =>
            normalizeText(row.elementGroupName) === key ||
            normalizeText(row.elementGroupCode) === key
        )
        .map((row) => ({ row, rank: getElementGroupMatchRank(row, line) }))
        .sort((a, b) => b.rank - a.rank);

      return candidates.find((item) => item.rank > 0)?.row || candidates[0]?.row || null;
    },
    [hydratedElementGroupRows, getElementGroupMatchRank]
  );

  const getElementGroupDescription = (group, item, fallback = "") =>
    String(item?.description || group?.description || fallback || "").trim();

  const createGroupLine = (baseLine, item, suffix, group = null) => {
    const newLine = createLine(`${Date.now()}-${suffix}`);
    const width = Number(item.width || baseLine.width || 0);
    const height = Number(item.height || baseLine.height || 0);
    const qty = Number(item.qty || baseLine.qty || 0);
    const media = baseLine.media || "";
    const pricing = findPricing(media);
    const rateValue = Number(pricing?.rate ?? item.rate ?? baseLine.rate ?? 0);
    const sqft = width > 0 && height > 0 && qty > 0 ? roundAmount((qty * width * height) / 144) : 0;
    const amount = roundAmount(sqft * rateValue);
    const widthText = item.width ? String(item.width) : baseLine.width || "";
    const heightText = item.height ? String(item.height) : baseLine.height || "";

    return {
      ...newLine,
      store: baseLine.store,
      panCard: getLinePanCard(baseLine),
      city: baseLine.city,
      prodLoc: baseLine.prodLoc,
      billLoc: baseLine.billLoc,
      salonAddress: baseLine.salonAddress,
      brandingLocation: baseLine.brandingLocation,
      printingMachine: baseLine.printingMachine,
      printReadyFile: baseLine.printReadyFile,
      remarks: baseLine.remarks,
      media,
      internalMedia: pricing?.internalMedia || baseLine.internalMedia || "",
      externalMedia: pricing?.externalMedia || baseLine.externalMedia || "",
      elementGroup: baseLine.elementGroup,
      description: getElementGroupDescription(group, item, baseLine.description),
      articleCode:
        item.articleCode ||
        item.ArticleCode ||
        item.articlecode ||
        item.ARTICLECODE ||
        "",
      visualCode:
        item.articleCode ||
        item.ArticleCode ||
        item.articlecode ||
        item.ARTICLECODE ||
        "",
      qty: item.qty ? String(item.qty) : baseLine.qty || "",
      width: widthText,
      height: heightText,
      billingWidth: widthText,
      billingHeight: heightText,
      sqft: sqft ? String(sqft) : "",
      rate: rateValue ? String(rateValue) : baseLine.rate || "",
      amount: amount ? String(amount) : baseLine.amount || "",
      installationCharges: baseLine.installationCharges || "",
      transportationCharges: baseLine.transportationCharges || "",
      layoutingCharges: baseLine.layoutingCharges || "",
      laminationFlag: item.laminationFlag || baseLine.laminationFlag || "",
      lamination: item.lamination || baseLine.lamination || "",
      mountingFlag: item.mountingFlag || baseLine.mountingFlag || "",
      mounting: item.mounting || baseLine.mounting || "",
      implementation: item.implementation || baseLine.implementation || "",
      jobDeadline: baseLine.jobDeadline,
      printerDeadline: baseLine.printerDeadline,
      groupAutoAdded: true,
    };
  };

  const shouldAutoPopulateGroup = (line) => {
    return (
      !String(line.visualCode || "").trim() &&
      !String(line.qty || "").trim() &&
      !String(line.width || "").trim() &&
      !String(line.height || "").trim() &&
      !String(line.media || "").trim()
    );
  };

  const applyElementGroupToLine = (line, group) => {
    if (!group) {
      return { ...line, elementGroup: line.elementGroup };
    }

    if (!group.elements?.length) {
      return {
        ...line,
        elementGroup: line.elementGroup,
        description: getElementGroupDescription(group, null, line.description),
        visualCode: "",
      };
    }

    const items = group.elements;
    if (!shouldAutoPopulateGroup(line)) {
      return { ...line, elementGroup: line.elementGroup };
    }

    const firstItem = items[0];
    const width = Number(firstItem.width || line.width || 0);
    const height = Number(firstItem.height || line.height || 0);
    const qty = Number(firstItem.qty || line.qty || 0);
    const media = line.media || "";
    const pricing = findPricing(media);
    const rateValue = Number(pricing?.rate ?? firstItem.rate ?? line.rate ?? 0);
    const sqft = width > 0 && height > 0 && qty > 0 ? roundAmount((qty * width * height) / 144) : 0;
    const amount = roundAmount(sqft * rateValue);
    const widthText = firstItem.width ? String(firstItem.width) : line.width || "";
    const heightText = firstItem.height ? String(firstItem.height) : line.height || "";

    return {
      ...line,
      elementGroup: line.elementGroup,
      description: getElementGroupDescription(group, firstItem, line.description),
      articleCode:
        firstItem.articleCode ||
        firstItem.ArticleCode ||
        firstItem.articlecode ||
        firstItem.ARTICLECODE ||
        "",
      visualCode:
        firstItem.articleCode ||
        firstItem.ArticleCode ||
        firstItem.articlecode ||
        firstItem.ARTICLECODE ||
        "",
      qty: firstItem.qty ? String(firstItem.qty) : line.qty || "",
      width: widthText,
      height: heightText,
      billingWidth: widthText,
      billingHeight: heightText,
      media,
      internalMedia: pricing?.internalMedia || line.internalMedia || "",
      externalMedia: pricing?.externalMedia || line.externalMedia || "",
      rate: rateValue ? String(rateValue) : line.rate || "",
      sqft: sqft ? String(sqft) : "",
      amount: amount ? String(amount) : line.amount || "",
      laminationFlag: firstItem.laminationFlag || line.laminationFlag || "",
      lamination: firstItem.lamination || line.lamination || "",
      mountingFlag: firstItem.mountingFlag || line.mountingFlag || "",
      mounting: firstItem.mounting || line.mounting || "",
      implementation: firstItem.implementation || line.implementation || "",
    };
  };

  const createAdditionalGroupLines = (baseLine, group) => {
    if (!group?.elements?.length || group.elements.length < 2) return [];
    return group.elements.slice(1).map((item, index) =>
      createGroupLine(baseLine, item, `group-${index}`, group)
    );
  };

  const totals = useMemo(
    () =>
      lines.reduce(
        (summary, row) => ({
          sqft: summary.sqft + Number(row.sqft || 0),
          amount: summary.amount + Number(row.amount || 0),
        }),
        { sqft: 0, amount: 0 }
      ),
    [lines]
  );

  const estimateLineItems = useMemo(
    () => getEstimateLineItems(header, lines),
    [header, lines]
  );

  const estimateTotals = useMemo(
    () => getEstimateTotals(estimateLineItems),
    [estimateLineItems]
  );

  const estimateAttachmentGroups = useMemo(
    () => getEstimateAttachmentGroups(header, estimateLineItems),
    [header, estimateLineItems]
  );

  const estimateAttachmentName = useMemo(
    () =>
      estimateAttachmentGroups.length > 1
        ? `${estimateAttachmentGroups.length} estimate PDFs`
        : estimateAttachmentGroups[0]?.fileName || buildEstimateAttachmentName(header),
    [estimateAttachmentGroups, header]
  );

  const estimateMailLineItems = useMemo(
    () => applyEstimateMailChargesToLineItems(estimateLineItems, estimateMailChargeRows),
    [estimateLineItems, estimateMailChargeRows]
  );

  const estimateMailTotals = useMemo(
    () => getEstimateTotals(estimateMailLineItems),
    [estimateMailLineItems]
  );

  const estimateMailAttachmentGroups = useMemo(
    () => getEstimateAttachmentGroups(header, estimateMailLineItems),
    [header, estimateMailLineItems]
  );

  const estimateMailAttachmentName = useMemo(
    () =>
      estimateMailAttachmentGroups.length > 1
        ? `${estimateMailAttachmentGroups.length} estimate PDFs`
        : estimateMailAttachmentGroups[0]?.fileName || buildEstimateAttachmentName(header),
    [estimateMailAttachmentGroups, header]
  );

  const selectedCount = selectedLineIds.length;

  const customerRateRows = useMemo(
    () => getCustomerRates(rateRows, header.client, header.clientName),
    [header.client, header.clientName, rateRows]
  );

  const pricingOptions = useMemo(() => {
    const generalRows = getGeneralRateRows(rateRows);
    const rows = [...customerRateRows, ...generalRows];
    const seen = new Set();

    return rows.filter((row) => {
      const media = normalizeText(row.media);
      if (!media || seen.has(media)) return false;
      seen.add(media);
      return true;
    });
  }, [customerRateRows, rateRows]);

  const jobSelectOptions = useMemo(() => {
    if (!header.jobNo || jobOptions.some((option) => option.value === header.jobNo)) {
      return jobOptions;
    }

    const fallbackOption = {
      value: header.jobNo,
      label: header.clientName ? `${header.jobNo} (${header.clientName})` : header.jobNo,
      clientName: header.clientName,
      subClient: header.subClient,
      customerId: header.client,
    };

    return [fallbackOption, ...jobOptions];
  }, [header.client, header.clientName, header.jobNo, header.subClient, jobOptions]);

  const customerSelectOptions = useMemo(
    () =>
      customers.map((customer) => {
        const customerId = getCustomerId(customer);
        const customerName = getCustomerName(customer);
        return { value: customerId, label: customerName || customerId };
      }),
    [customers]
  );

  const citySelectOptions = useMemo(
    () => buildValueOptions(indiaCities, lines.map((line) => line.city)),
    [lines]
  );

  const storeSelectOptions = useMemo(() => {
    const options = [];
    const seen = new Set();

    storeMasterRows.forEach((store) => {
      const value = store.storeName;
      if (!value || seen.has(value)) return;
      seen.add(value);
      options.push({
        value,
        label: [store.storeName, store.city, store.location].filter(Boolean).join(" - "),
      });
    });

    lines
      .map((line) => String(line.store || "").trim())
      .filter(Boolean)
      .forEach((value) => {
        if (!seen.has(value)) {
          seen.add(value);
          options.push({ value, label: value });
        }
      });

    return options;
  }, [storeMasterRows, lines]);

  const storeAddressSelectOptions = useMemo(() => {
    const options = [];
    const seen = new Set();

    storeMasterRows.forEach((store) => {
      const value = formatStoreShipTo(store);
      if (!value || seen.has(value)) return;
      seen.add(value);
      options.push({
        value,
        label: [store.storeName, store.address, store.city].filter(Boolean).join(" - "),
      });
    });

    lines
      .map((line) => String(line.salonAddress || "").trim())
      .filter(Boolean)
      .forEach((value) => {
        if (!seen.has(value)) {
          seen.add(value);
          options.push({ value, label: value.replace(/\s+/g, " ") });
        }
      });

    return options;
  }, [storeMasterRows, lines]);

  const brandingLocationSelectOptions = useMemo(() => {
    const locations = storeMasterRows.map((store) => store.location);
    return buildValueOptions(locations, lines.map((line) => line.brandingLocation));
  }, [storeMasterRows, lines]);

  const locationSelectOptions = useMemo(
    () => buildValueOptions(locationOptions, billingLocationOptions),
    []
  );

  const mediaSelectOptions = useMemo(
    () => pricingOptions.map((row) => ({ value: row.media, label: row.media })),
    [pricingOptions]
  );

  const laminationFlagSelectOptions = useMemo(
    () => buildValueOptions(yesNoOptions, lines.map((line) => line.laminationFlag)),
    [lines]
  );

  const laminationSelectOptions = useMemo(
    () =>
      buildValueOptions(
        laminationDefaults,
        [
          ...hydratedElementGroupRows.flatMap((group) =>
            (group.elements || []).map((item) => item.lamination)
          ),
          ...lines.map((line) => line.lamination),
        ]
      ),
    [hydratedElementGroupRows, lines]
  );

  const mountingFlagSelectOptions = useMemo(
    () => buildValueOptions(yesNoOptions, lines.map((line) => line.mountingFlag)),
    [lines]
  );

  const mountingSelectOptions = useMemo(
    () =>
      buildValueOptions(
        mountingDefaults,
        [
          ...hydratedElementGroupRows.flatMap((group) =>
            (group.elements || []).map((item) => item.mounting)
          ),
          ...lines.map((line) => line.mounting),
        ]
      ),
    [hydratedElementGroupRows, lines]
  );

  const implementationSelectOptions = useMemo(
    () => buildValueOptions(implementationDefaults),
    []
  );

  const printReadySelectOptions = useMemo(
    () => buildValueOptions(printReadyDefaults),
    []
  );

  const printerSelectOptions = useMemo(
    () =>
      buildValueOptions(
        [...printerOptions, ...printerMasterDefaults],
        lines.map((line) => line.printingMachine)
      ),
    [printerOptions, lines]
  );

  const findPricing = (media) => findPricingFromRows(media, customerRateRows, rateRows);

  const clearMediaPricing = (line) =>
    recalculateLine({
      ...line,
      media: "",
      internalMedia: "",
      externalMedia: "",
      hsn: "",
      rate: "",
      amount: "",
    });

  const applyPricing = (line, pricing) => {
    if (!pricing) return recalculateLine(line);

    return recalculateLine({
      ...line,
      media: pricing.media || line.media,
      internalMedia: pricing.internalMedia || line.internalMedia || pricing.media || "",
      externalMedia: pricing.externalMedia || line.externalMedia || pricing.media || "",
      hsn: pricing.hsn || pricing.hsnCode || line.hsn,
      rate:
        pricing.rate !== "" && pricing.rate !== null && pricing.rate !== undefined
          ? String(pricing.rate)
          : line.rate,
    });
  };

  useEffect(() => {
    if (!rateRows.length) return;

    setLines((prev) => {
      let changed = false;

      const nextLines = prev.map((line) => {
        if (!String(line.media || "").trim()) return line;
        if (line.hsn && line.rate) return line;

        const pricing = findPricingFromRows(line.media, customerRateRows, rateRows);

        if (!pricing) return line;

        changed = true;
        return applyPricing(line, pricing);
      });

      return changed ? nextLines : prev;
    });
  }, [customerRateRows, rateRows]);

  const updateHeader = (field, value) => {
    setDraftSyncDisabled(false);

    if (field === "date" && value && value !== formatDate(new Date())) {
      toast.warning("Job date is locked to today for new job entry.");
      return;
    }

    if (field === "client") {
      const customer = customers.find((item) => getCustomerId(item) === value);
      const clientName = customer ? getCustomerName(customer) : "";
      const panCard = customer ? getCustomerPanCard(customer) : "";
      const nextCustomerRates = getCustomerRates(rateRows, value, clientName);

      setHeader((prev) => ({ ...prev, client: value, clientName, panCard }));
      setLines((prev) =>
        prev.map((line) => {
          if (!String(line.media || "").trim()) return clearMediaPricing(line);

          const pricing = findPricingFromRows(
            line.media,
            nextCustomerRates,
            nextCustomerRates.length ? nextCustomerRates : rateRows
          );

          if (pricing) return applyPricing(line, pricing);

          return recalculateLine({
            ...line,
            internalMedia: "",
            externalMedia: "",
            rate: "",
            amount: "",
          });
        })
      );
      return;
    }

    if (field === "jobNo") {
      const selectedJob = jobOptions.find((job) => job.value === value);
      const clientName = selectedJob?.clientName || "";
      const matchedCustomer = customers.find(
        (item) =>
          getCustomerId(item) === selectedJob?.customerId ||
          normalizeText(getCustomerName(item)) === normalizeText(clientName)
      );
      const clientId = matchedCustomer ? getCustomerId(matchedCustomer) : selectedJob?.customerId || "";
      const panCard = matchedCustomer ? getCustomerPanCard(matchedCustomer) : "";
      const savedDraft = value ? getAllDrafts()[value] : null;

      if (savedDraft) {
        loadDraft(savedDraft);
        return;
      }

      setHeader((prev) => ({
        ...prev,
        jobNo: value,
        client: clientId,
        panCard,
        clientName,
        subClient: selectedJob?.subClient || prev.subClient,
      }));

      setLines((prev) => {
        if (prev.length) return prev;

        return [createLine(0)];
      });
      return;
    }

    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateNewJob = async () => {
    const users = getLoggedInUser();
    const userId = users?.user_id || users?.userid || users?.userId || "";
    const locationId = users?.location_id || users?.locationId || "";
    const emailid = users?.emailid || users?.email || users?.email_id || "";
    const userName = header.userName || users?.username || users?.userName || "";
    const customerName = header.clientName || "";
    const customerId = header.client || "";
    const customerPanCard = normalizePanCard(header.panCard) || selectedClientPanCard;

    if (!userId || !locationId) {
      toast.error("User or location details not found");
      return;
    }

    if (!customerName.trim()) {
      toast.warning("Please select client before creating a new job");
      return;
    }

    const loadingToast = toast.loading("Creating new job...");

    try {
      setIsCreatingJob(true);

      const payload = [
        {
          ISnewjob: "1",
          customername: customerName,
          customerid: customerId,
          enteredby: userName,
          userid: userId,
          userName,
          username: userName,
          locationid: locationId,
          emailid,
          entereddt: new Date().toISOString().split("T")[0],
          Date: header.date,
          "Job Date": header.date,
          client: customerName,
          CLIENT: customerName,
          subClient: header.subClient || "",
          "Sub Client": header.subClient || "",
          businessType: header.businessType || "",
          customerEmail: header.customerEmail || "",
          contactPerson: header.contactPerson || "",
          lpono: header.poNo || "",
          lpodate: header.poDate || "",
          potype: header.poType || "",

          jobdesc: "",
          projectname: header.projectName || "",
          projectName: header.projectName || "",
          ProjectName: header.projectName || "",
        },
      ];

      const response = await axios.post(config.JobSummary.URL.Addjobdetails, payload);

      const createdJobNo = response?.data?.jobno || response?.data?.jobNo || response?.data?.JobNo || "";

      if (!createdJobNo) throw new Error("Job number was not returned by the server");

      const refreshedOptions = await fetchJobNumbers();
      const createdOption =
        refreshedOptions.find((option) => option.value === createdJobNo) || {
          value: createdJobNo,
          label: `${createdJobNo} (${customerName})`,
          clientName: customerName,
          subClient: header.subClient || "",
          customerId,
        };

          const nextHeader = {
        ...header,
        jobNo: createdJobNo,
        client: createdOption.customerId || customerId,
        panCard: customerPanCard,
        clientName: createdOption.clientName || customerName,
        subClient: createdOption.subClient || header.subClient,
        userName,
      };

      setHeader(nextHeader);
      setJobOptions((prev) =>
        prev.some((option) => option.value === createdJobNo) ? prev : [createdOption, ...prev]
      );
      setDraftSyncDisabled(false);

      const allDrafts = getAllDrafts();
      delete allDrafts[TEMP_DRAFT_ID];
      allDrafts[createdJobNo] = {
        draftId: createdJobNo,
        jobNo: createdJobNo,
        clientName: nextHeader.clientName,
        header: nextHeader,
        lines,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(JOB_DRAFT_KEY, JSON.stringify(allDrafts));

      setSaveStatus(`New job created: ${createdJobNo}`);
      setActiveJobEntryTab("existing");

      toast.update(loadingToast, {
        render: `Created new job ${createdJobNo}`,
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });
    } catch (error) {
      console.error("Failed to create new job", error);

      toast.update(loadingToast, {
        render: error?.response?.data?.message || error?.message || "Failed to create new job",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setIsCreatingJob(false);
    }
  };

  const updateLine = (id, field, value) => {
    if (deadlineLineFields.has(field) && isBackDatedDeadlineValue(value)) {
      toast.warning("Deadline cannot be back dated");
      return;
    }

    const nextValue = ["width", "height", "billingWidth", "billingHeight"].includes(field)
      ? maskDimensionValue(value)
      : value;

    setDraftSyncDisabled(false);

    if (field === "store") {
      const selectedStore = storeMasterRows.find(
        (store) => normalizeText(store.storeName) === normalizeText(nextValue)
      );

      setLines((prev) =>
        prev.map((line) => {
          if (line.id !== id) return line;
          if (!selectedStore) {
            const nextLine = { ...line, store: nextValue, panCard: "" };
            return { ...nextLine, sequenceNo: buildLineSequence(nextLine) };
          }

          const nextLine = {
            ...line,
            store: selectedStore.storeName,
            panCard: selectedStore.panCard || "",
            salonAddress: formatStoreShipTo(selectedStore) || line.salonAddress,
            brandingLocation: selectedStore.location || line.brandingLocation,
            city: selectedStore.city || line.city,
          };

          return {
            ...nextLine,
            sequenceNo: buildLineSequence(nextLine),
          };
        })
      );
      return;
    }

    if (field === "salonAddress") {
      const selectedStore = storeMasterRows.find(
        (store) => normalizeText(formatStoreShipTo(store)) === normalizeText(nextValue)
      );

      setLines((prev) =>
        prev.map((line) => {
          if (line.id !== id) return line;

          const nextLine = selectedStore
            ? {
                ...line,
                salonAddress: formatStoreShipTo(selectedStore),
                store: selectedStore.storeName || line.store,
                panCard: selectedStore.panCard || extractPanFromText(nextValue),
                brandingLocation: selectedStore.location || line.brandingLocation,
                city: selectedStore.city || line.city,
              }
            : {
                ...line,
                salonAddress: nextValue,
                panCard: extractPanFromText(nextValue) || line.panCard || "",
              };

          return {
            ...nextLine,
            sequenceNo: buildLineSequence(nextLine),
          };
        })
      );
      return;
    }

    if (field === "elementGroup") {
      setLines((prev) => {
        const lineIndex = prev.findIndex((line) => line.id === id);
        if (lineIndex === -1) return prev;

        const line = prev[lineIndex];
        const group = findElementGroupForLine(nextValue, line);
        const updatedLine = {
          ...line,
          [field]: nextValue,
          description: getElementGroupDescription(group, null, line.description),
          articleCode:
            group?.elements?.[0]?.articleCode ||
            group?.elements?.[0]?.ArticleCode ||
            group?.elements?.[0]?.articlecode ||
            group?.elements?.[0]?.ARTICLECODE ||
            "",
          visualCode:
            group?.elements?.[0]?.articleCode ||
            group?.elements?.[0]?.ArticleCode ||
            group?.elements?.[0]?.articlecode ||
            group?.elements?.[0]?.ARTICLECODE ||
            "",
        };

        if (!group?.elements?.length) {
          return prev.map((l, idx) => (idx === lineIndex ? updatedLine : l));
        }

        // Replace the selected line with all elements from the group
        const groupLines = group.elements.map((item, index) =>
          createGroupLine({ ...line, [field]: nextValue }, item, `group-${index}`, group)
        );

        return [...prev.slice(0, lineIndex), ...groupLines, ...prev.slice(lineIndex + 1)];
      });

      return;
    }

    setLines((prev) => {
      const mapped = prev.map((line) => {
        if (line.id !== id) return line;

        const nextLine = applyDimensionPatch(line, { [field]: nextValue });

        if (["city", "brandingLocation"].includes(field)) {
          nextLine.sequenceNo = buildLineSequence(nextLine);
        }

        if (field === "lamination" && nextValue && !nextLine.laminationFlag) {
          nextLine.laminationFlag = "Yes";
        }

        if (field === "mounting" && nextValue && !nextLine.mountingFlag) {
          nextLine.mountingFlag = "Yes";
        }

        if (field === "media") {
          return nextValue ? applyPricing(nextLine, findPricing(nextValue)) : clearMediaPricing(nextLine);
        }

        if (["width", "height", "billingWidth", "billingHeight", "qty", "rate"].includes(field)) {
          return recalculateLine(nextLine);
        }

        return nextLine;
      });

      return mapped.reduce((acc, current) => acc.concat(current), []);
    });
  };

  const addLine = () => {
    setDraftSyncDisabled(false);

    setLines((prev) => {
      const newLine = createLine(prev.length);
      return [...prev, newLine];
    });
  };

  const addStore = () => {
    setDraftSyncDisabled(false);

    setLines((prev) => {
      const newLine = { ...createLine(prev.length), store: `Salon/Store ${prev.length + 1}` };
      return [...prev, newLine];
    });
  };

  const toggleLine = (id) => {
    setSelectedLineIds((prev) =>
      prev.includes(id) ? prev.filter((lineId) => lineId !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedLineIds((prev) =>
      prev.length === lines.length ? [] : lines.map((line) => line.id)
    );
  };

  const removeSelected = () => {
    if (!selectedLineIds.length) return;

    setLines((prev) => {
      const remaining = prev.filter((line) => !selectedLineIds.includes(line.id));
      return remaining;
    });

    setSelectedLineIds([]);
    setDraftSyncDisabled(true);
    setSaveStatus("Removed from UI only. Saved draft in local storage is unchanged.");
  };

  const writeClipboardText = async (text) => {
    if (!text) return false;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const copyLines = async () => {
    if (!selectedLineIds.length) {
      setSaveStatus("Select row(s) before copying.");
      toast.warning("Select row(s) first");
      return;
    }

    const rowsToCopy = lines.filter((line) => selectedLineIds.includes(line.id));

    if (!rowsToCopy.length) {
      setSaveStatus("Selected row(s) were not found.");
      toast.warning("Selected row(s) were not found");
      return;
    }

    setCopiedLines(rowsToCopy.map((line) => ({ ...line })));

    try {
      const copied = await writeClipboardText(buildLineClipboardText(rowsToCopy));
      if (!copied) throw new Error("Clipboard copy was blocked");
    } catch (error) {
      console.warn("Clipboard write failed", error);
      toast.error("Could not copy to clipboard");
      return;
    }

    setSaveStatus(`Copied ${rowsToCopy.length} row(s) for Excel.`);
    toast.success(`Copied ${rowsToCopy.length} row(s)`);
  };

  const getDefaultPricedLine = (index) => {
    return createLine(index);
  };

  const getExcelPasteSummary = (grid, startColumnIndex, headerColumns = null) => {
    return grid.reduce(
      (summary, row) => {
        row.forEach((cell, columnOffset) => {
          const column = headerColumns
            ? headerColumns[columnOffset]
            : pasteableLineColumns[startColumnIndex + columnOffset];
          const hasText = String(cell || "").trim();

          if (!column) {
            if (hasText) summary.ignoredCells += 1;
            return;
          }

          const nextValue = normalizePastedLineValue(column.key, cell);
          if (deadlineLineFields.has(column.key) && isBackDatedDeadlineValue(nextValue)) {
            summary.skippedDeadlines += 1;
            return;
          }

          summary.cells += 1;
        });

        return summary;
      },
      { cells: 0, ignoredCells: 0, skippedDeadlines: 0 }
    );
  };

  const applyExcelGridToLines = (rawGrid, options = {}) => {
    const pasteData = getClipboardPasteData(rawGrid);
    const grid = pasteData.rows.filter((row) =>
      row.some((cell) => String(cell || "").trim())
    );

    if (!grid.length) {
      toast.warning("No Excel data found in clipboard");
      return;
    }

    const startColumnIndex = Math.max(
      0,
      pasteableLineColumns.findIndex((column) => column.key === (options.field || "visualCode"))
    );
    const startColumn =
      (pasteData.headerColumns || []).find(Boolean) || pasteableLineColumns[startColumnIndex];
    const summary = getExcelPasteSummary(grid, startColumnIndex, pasteData.headerColumns);

    setDraftSyncDisabled(false);

    setLines((prev) => {
      const next = [...prev];
      const targetIndex = next.findIndex((line) => line.id === options.lineId);
      const hasOnlyBlankLine = next.length === 1 && isLineBlank(next[0]);
      let startRowIndex = next.length;

      if (options.append) {
        startRowIndex = hasOnlyBlankLine ? 0 : next.length;
      } else if (targetIndex >= 0) {
        startRowIndex = targetIndex;
      } else if (hasOnlyBlankLine) {
        startRowIndex = 0;
      }

      const neededRows = startRowIndex + grid.length;

      while (next.length < neededRows) {
        next.push(getDefaultPricedLine(next.length));
      }

      grid.forEach((row, rowOffset) => {
        const patch = {};

        row.forEach((cell, columnOffset) => {
          const column = pasteData.headerColumns
            ? pasteData.headerColumns[columnOffset]
            : pasteableLineColumns[startColumnIndex + columnOffset];
          if (!column) return;

          const nextValue = normalizePastedLineValue(column.key, cell);
          if (deadlineLineFields.has(column.key) && isBackDatedDeadlineValue(nextValue)) {
            return;
          }

          patch[column.key] = nextValue;
        });

        if (Object.keys(patch).length) {
          const lineIndex = startRowIndex + rowOffset;
          next[lineIndex] = applyPastedLinePatch(next[lineIndex], patch);
        }
      });

      return next;
    });

    const status = `Pasted ${grid.length} Excel row(s) from ${startColumn.label}.`;
    setSaveStatus(status);
    toast.success(status);

    if (summary.skippedDeadlines) {
      toast.warning(`${summary.skippedDeadlines} back-dated deadline value(s) were skipped.`);
    }
  };

  const pasteExcelRangeFromClipboard = async (targetOverride = null) => {
    try {
      if (!navigator.clipboard?.readText) {
        toast.error("Clipboard access is not available in this browser.");
        return;
      }

      const text = await navigator.clipboard.readText();
      const grid = parseClipboardGrid(text);
      const target = targetOverride || (activePasteCell?.lineId
        ? activePasteCell
        : { append: true, field: "visualCode" });

      applyExcelGridToLines(grid, target);
    } catch (error) {
      console.error("Excel paste failed", error);
      toast.error("Could not read Excel clipboard data");
    }
  };

  const handleLineCellPaste = (event, lineId, field) => {
    const text = event.clipboardData?.getData("text/plain") || "";
    const isExcelRange = text.includes("\t") || /\r?\n/.test(text);

    if (!isExcelRange) return;

    event.preventDefault();
    setActivePasteCell({ lineId, field });
    applyExcelGridToLines(parseClipboardGrid(text), { lineId, field });
  };

  const getPasteCellProps = (lineId, field) => ({
    onFocus: () => setActivePasteCell({ lineId, field }),
    onPaste: (event) => handleLineCellPaste(event, lineId, field),
  });

  const pasteLines = () => {
    if (!copiedLines.length) {
      toast.warning("Copy row(s) first, then paste.");
      return;
    }

    setDraftSyncDisabled(false);

    setLines((prev) => [
      ...prev,
      ...copiedLines.map((line, index) =>
        recalculateLine({ ...line, id: `${Date.now()}-paste-${index}` })
      ),
    ]);

    toast.success(`Pasted ${copiedLines.length} row(s)`);
  };

  const clearSelection = () => {
    setSelectedLineIds([]);
    setSaveStatus("Selection cleared.");
  };

  const selectAllLines = () => setSelectedLineIds(lines.map((line) => line.id));

  const csvEscape = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const downloadCsv = () => {
    const columns = [
      "Job No",
      "Client",
      "Sub Client",
      "Job Date",
      "Salon/Store Name",
      "PAN Card",
      "Branding Location",
      "City",
      "Description",
      "Production Location",
      "Billing Location",
      "Salon/Store Address",
      "Printing Machine",
      "Print Ready File",
      "Media",
      "Element Group",
      ...productColumns,
      "Remarks/Instructions",
    ];

    const rows = lines.filter((line) => !isLineBlank(line));

    if (!rows.length) {
      toast.warning("Enter at least one row before downloading.");
      return;
    }

    const csvRows = [
      columns.map(csvEscape).join(","),
      ...rows.map((line) =>
        [
          header.jobNo,
          header.clientName,
          header.subClient,
          header.date,
          line.store,
          getLinePanCard(line),
          line.brandingLocation,
          line.city,
          line.description,
          line.prodLoc,
          line.billLoc,
          line.salonAddress,
          line.printingMachine,
          line.printReadyFile,
          line.media,
          line.elementGroup,
          line.visualCode,
          line.qty,
          line.width,
          line.height,
          getLineBillingWidth(line),
          getLineBillingHeight(line),
          line.sqft,
          line.installationCharges,
          line.transportationCharges,
          line.layoutingCharges,
          line.laminationFlag,
          line.lamination,
          line.mountingFlag,
          line.mounting,
          line.implementation,
          line.jobDeadline,
          line.printerDeadline,
          line.remarks,
        ]
          .map(csvEscape)
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `JobEntry_${header.jobNo || "draft"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success("CSV downloaded");
  };

  const buildDefaultEstimateMail = () => {
    const projectTitle = getEstimateProjectTitle(header);
    const users = getLoggedInUser();
    const senderName = header.userName || users?.username || users?.userName || "Team";
    const greeting = header.contactPerson ? `Dear ${header.contactPerson},` : "Dear Customer,";
    const isSplitByLocation = estimateAttachmentGroups.length > 1;

    return {
      to: header.customerEmail || "",
      subject: `Estimate for ${projectTitle}`,
      body: [
        greeting,
        "",
        `Please find attached the PDF estimate${isSplitByLocation ? "s" : ""} for ${projectTitle}.`,
        ...(isSplitByLocation
          ? [
              `The estimates are split by billing location: ${estimateAttachmentGroups
                .map((group) => group.label)
                .join(", ")}.`,
            ]
          : []),
        "",
        "Regards,",
        senderName,
      ].join("\n"),
    };
  };

  const openEstimateMail = () => {
    if (!estimateLineItems.length) {
      toast.warning("Enter at least one row before sending estimate.");
      return;
    }

    setEstimateMailChargeRows([]);
    setEstimateMail(buildDefaultEstimateMail());
    setIsEstimateMailOpen(true);
  };

  const closeEstimateMail = () => {
    if (isSendingEstimateMail) return;
    setIsEstimateMailOpen(false);
  };

  const updateEstimateMail = (field, value) => {
    setEstimateMail((prev) => ({ ...prev, [field]: value }));
  };

  const updateEstimateMailCharge = (estimateLineKey, value) => {
    const nextValue = normalizeNumericPasteValue(value);

    setEstimateMailChargeRows((prev) =>
      prev.map((row) =>
        row.estimateLineKey === estimateLineKey ? { ...row, amount: nextValue } : row
      )
    );
  };

  const addEstimateMailChargeRows = (chargeKey) => {
    const chargeType = ESTIMATE_MAIL_CHARGE_TYPES.find((item) => item.key === chargeKey);
    if (!chargeType) return;

    setEstimateMailChargeRows((prev) => {
      const existingKeys = new Set(prev.map((row) => row.estimateLineKey));

      const newRows = estimateLineItems
        .map((item, index) => {
          const parentKey = item.estimateLineKey || `estimate-line-${index}`;
          const estimateLineKey = `${parentKey}-${chargeType.key}`;

          if (existingKeys.has(estimateLineKey)) return null;

          return {
            estimateLineKey,
            parentEstimateLineKey: parentKey,
            chargeKey: chargeType.key,
            description: chargeType.label,
            region: item.region || "",
            salonName: item.salonName || "",
            billingLocation: item.billingLocation || item.region || "",
            productionLocation: item.productionLocation || "",
            amount: "",
          };
        })
        .filter(Boolean);

      return [...prev, ...newRows];
    });
  };

  const downloadEstimateAttachment = () => {
    if (!estimateLineItems.length) {
      toast.warning("Enter at least one row before downloading estimate.");
      return;
    }

    estimateAttachmentGroups.forEach((group) => {
      buildEstimatePdfDocument(
        buildEstimateHeaderForLocation(header, group.label),
        group.items
      ).save(group.fileName);
    });

    toast.success(
      estimateAttachmentGroups.length > 1
        ? `${estimateAttachmentGroups.length} estimate PDFs downloaded`
        : "Estimate PDF downloaded"
    );
  };

  const downloadEstimateMailAttachment = () => {
    if (!estimateMailLineItems.length) {
      toast.warning("Enter at least one row before downloading estimate.");
      return;
    }

    estimateMailAttachmentGroups.forEach((group) => {
      buildEstimatePdfDocument(
        buildEstimateHeaderForLocation(header, group.label),
        group.items
      ).save(group.fileName);
    });

    toast.success(
      estimateMailAttachmentGroups.length > 1
        ? `${estimateMailAttachmentGroups.length} estimate PDFs downloaded`
        : "Estimate PDF downloaded"
    );
  };

  const sendEstimateMail = async (event) => {
    event.preventDefault();

    if (!estimateLineItems.length) {
      toast.warning("Enter at least one row before sending estimate.");
      return;
    }

    const recipients = getEstimateRecipients(estimateMail.to);
    const invalidRecipients = recipients.filter((email) => !ESTIMATE_EMAIL_PATTERN.test(email));

    if (!recipients.length) {
      toast.warning("Please enter at least one customer email.");
      return;
    }

    if (invalidRecipients.length) {
      toast.warning(`Invalid email: ${invalidRecipients[0]}`);
      return;
    }

    if (!estimateMail.subject.trim()) {
      toast.warning("Please enter the subject.");
      return;
    }

    if (!estimateMail.body.trim()) {
      toast.warning("Please enter the mail body.");
      return;
    }

    const users = getLoggedInUser();
    const formData = new FormData();

    formData.append("emailId", users?.emailid || users?.email || users?.email_id || "");
    formData.append("to", recipients.join(","));
    formData.append("cc", "");
    formData.append("bcc", "");
    formData.append("subject", estimateMail.subject.trim());
    formData.append("body", estimateMail.body.trim().replace(/\n/g, "<br />"));
    formData.append("isHtml", "true");

    estimateMailAttachmentGroups.forEach((group) => {
      const attachmentBlob = createEstimatePdfBlob(
        buildEstimateHeaderForLocation(header, group.label),
        group.items
      );

      formData.append("attachments", attachmentBlob, group.fileName);
    });

    const loadingToast = toast.loading(
      estimateMailAttachmentGroups.length > 1
        ? "Sending estimate mail with location PDFs..."
        : "Sending estimate mail..."
    );

    let didSendEstimateMail = false;

    try {
      setIsSendingEstimateMail(true);

      const estimateTotals = getEstimateTotals(estimateMailLineItems);
      const sentAtUtc = new Date().toISOString();
      const estimateAttachmentDetails = estimateMailAttachmentGroups.map((group) => ({
        billingLocation: group.label || "",
        fileName: group.fileName || "",
        rowCount: group.items.length,
      }));
      const estimatePayload = {
        id: null,
        jobNo: header.jobNo || "",
        client: header.clientName || "",
        subClient: header.subClient || "",
        projectName: header.projectName || "",
        customerName: header.clientName || header.client || "",
        panCard:
          header.panCard ||
          estimateMailLineItems?.find((x) => x.panCard)?.panCard ||
          lines?.find((x) => x.panCard)?.panCard ||
          "",
        mailTo: recipients.join(","),
        mailSubject: estimateMail.subject.trim(),
        mailBody: estimateMail.body.trim(),
        totalSqFt: String(estimateTotals.printableSqftTotal || ""),
        amount: String(estimateTotals.amountTotal || ""),
        gstAmount: String(estimateTotals.gstAmount || ""),
        grandTotal: String(estimateTotals.grandTotal || ""),
        status: "Mail Sent",
        createdBy: users?.username || users?.userName || users?.emailid || "",
        sentAtUtc,
        attachmentCount: estimateMailAttachmentGroups.length,
        attachmentNames: estimateMailAttachmentGroups.map((group) => group.fileName).join(", "),
        billingLocations: estimateAttachmentDetails.map((group) => group.billingLocation).join(", "),
        fullEstimateJson: JSON.stringify({
          header,
          rows: estimateMailLineItems,
          totals: estimateTotals,
          attachments: estimateAttachmentDetails,
          sentAtUtc,
        }),
        lines: estimateMailLineItems.map((item) => ({
          store: item.salonName || "",
          city: item.region || "",
          billingLocation: item.billingLocation || item.region || "",
          productionLocation: item.productionLocation || "",
          description: item.description || "",
          media: item.media || "",
          hsnCode: item.hsn || "",
          articleCode: item.articleCode || item.visualCode || "",
          visualCode: item.visualCode || "",
          qty: String(item.qty || ""),
          width: String(item.width || ""),
          height: String(item.height || ""),
          totalSqFt: String(item.printableSqft || ""),
          rate: String(item.rate || ""),
          amount: String(item.amount || "")
        })),
      };

      await axios.post(config.GoogleGmail.URL.SendMail, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      didSendEstimateMail = true;

      toast.update(loadingToast, {
        render: "Mail sent successfully. Saving estimate in collection...",
        type: "info",
        isLoading: true,
      });

      const saveResponse = await axios.post(config.JobSummary.URL.SaveEstimate, estimatePayload, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      const savedEstimateNo = saveResponse?.data?.estimateNo;

      toast.update(loadingToast, {
        render: savedEstimateNo
          ? `Estimate mail sent and saved successfully (${savedEstimateNo})`
          : "Estimate mail sent and saved successfully",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });

      setIsEstimateMailOpen(false);
    } catch (error) {
      console.error("Failed to send or save estimate mail", error);

      toast.update(loadingToast, {
        render:
          error?.response?.data ||
          error?.message ||
          (didSendEstimateMail
            ? "Estimate mail sent, but estimate record was not saved"
            : "Failed to send estimate mail"),
        type: "error",
        isLoading: false,
        autoClose: 3500,
      });
    } finally {
      setIsSendingEstimateMail(false);
    }
  };

  const buildExistingJobPayload = () => {
    const users = getLoggedInUser();
    const userId = users?.user_id || users?.userid || users?.userId || "";
    const userName = header.userName || users?.username || users?.userName || "";
    const emailid = users?.emailid || users?.email || users?.email_id || "";
    const enteredDate = new Date().toISOString();
    const rowsToSave = lines.filter((line) => !isLineBlank(line));

    return rowsToSave.map((line) => {
      const sqft = Number(line.sqft || 0);
      const rate = Number(line.rate || 0);
      const amount = roundAmount(sqft * rate);
      const installationCharges = toNumber(line.installationCharges);
      const transportationCharges = toNumber(line.transportationCharges);
      const layoutingCharges = toNumber(line.layoutingCharges);
      const linePanCard = getLinePanCard(line);

     return {
        ISnewjob: "0",
        JobNo: header.jobNo,
        "Job No": header.jobNo,
        Client: header.clientName,
        CLIENT: header.clientName,
        SubClient: header.subClient,
        "Sub Client": header.subClient,
        "Job Date": header.date,
        Date: header.date,
        businessType: header.businessType || "",
        customerEmail: header.customerEmail || "",
        contactPerson: header.contactPerson || "",
        lpono: header.poNo || "",
        lpodate: header.poDate || "",
        potype: header.poType || "",
        jobdesc: "",
        projectname: header.projectName || "",
        projectName: header.projectName || "",
        ProjectName: header.projectName || "",
        "Salon/Store Name": line.store,
        SalonStoreName: line.store,
        Store: line.store,
        panCard: linePanCard,
        PanCard: linePanCard,
        PANCard: linePanCard,
        panNo: linePanCard,
        PANNo: linePanCard,
        BrandingLocation: line.brandingLocation,
        "Branding Location": line.brandingLocation,
        SequenceNo: line.sequenceNo || buildLineSequence(line),
        Sequence: line.sequenceNo || buildLineSequence(line),
        City: line.city,
        CITY: line.city,
        Description: line.description,
        description: line.description,
        ProductionLocation: line.prodLoc,
        "Production Location": line.prodLoc,
        BillingLocation: line.billLoc,
        "Billing  Location": line.billLoc,
        SalonAddress: line.salonAddress,
        "SALON ADDRESS": line.salonAddress,
        "Salon/Store Address": line.salonAddress,
        SalonStoreAddress: line.salonAddress,
        PrintingMachine: line.printingMachine,
        "Printing Machine": line.printingMachine,
        PrintReadyFile: line.printReadyFile,
        "Print Ready File": line.printReadyFile,
        Remarks: line.remarks,
        "Remarks/Instructions": line.remarks,
        Media: line.media,
        InternalMedia: line.internalMedia,
        "Internal Media": line.internalMedia,
        ExternalMedia: line.externalMedia,
        "External Media": line.externalMedia,
        "Element Group": line.elementGroup,
        ElementGroup: line.elementGroup,
        Subgroup: line.elementGroup,
        Description: line.description,
        description: line.description,
        VisualCode: line.visualCode,
        "VISUAL CODE": line.visualCode,
        articleCode: line.visualCode,
        ArticleCode: line.visualCode,

        Qty: line.qty,
        QTY: line.qty,
        HSN: line.hsn,
        HsnCode: line.hsn,
        "HSN / SAC": line.hsn,
        Width: line.width,
        Height: line.height,
        BillingWidth: getLineBillingWidth(line),
        BillingHeight: getLineBillingHeight(line),
        billingWidth: getLineBillingWidth(line),
        billingHeight: getLineBillingHeight(line),
        "Billing Width": getLineBillingWidth(line),
        "Billing Height": getLineBillingHeight(line),
        TotalSqFt: String(sqft),
        "Total Sq.ft": String(sqft),
        "Total Sq.f": String(sqft),
        Rate: String(rate),
        Amount: String(amount),
        InstallationCharges: String(installationCharges),
        installationCharges: String(installationCharges),
        "Installation charges": String(installationCharges),
        TransportationCharges: String(transportationCharges),
        transportationCharges: String(transportationCharges),
        "Transportation charges": String(transportationCharges),
        LayoutingCharges: String(layoutingCharges),
        layoutingCharges: String(layoutingCharges),
        "Layouting charges": String(layoutingCharges),
        Lamination: line.laminationFlag,
        LAMINATION: line.laminationFlag,
        LaminationFlag: line.laminationFlag,
        "Lamination Flag": line.laminationFlag,
        TypeOfLamination: line.lamination,
        "Type of Lamination": line.lamination,
        Mounting: line.mountingFlag,
        MOUNTING: line.mountingFlag,
        MountingFlag: line.mountingFlag,
        "Mounting Flag": line.mountingFlag,
        TypeOfMounting: line.mounting,
        "Type of Mounting": line.mounting,
        Implementation: line.implementation,
        Deadline: line.jobDeadline,
        "Job Deadline": line.jobDeadline,
        PrinterDeadline: line.printerDeadline,
        "Printer Deadline": line.printerDeadline,
        userName,
        user_id: userId,
        username: userName,
        UserId: userId,
        emailid,
        entereddt: enteredDate,
      };
    });
  };

  const saveExistingJobLines = async () => {
    if (!header.jobNo) {
      toast.warning("⚠️ Please select a job number");
      return;
    }

    const payload = buildExistingJobPayload();

    if (!payload.length) {
      toast.warning("⚠️ Please enter at least one line item");
      return;
    }

    const loadingToast = toast.loading("Saving job data...");

    try {
      setIsSaving(true);
      await axios.post(config.JobSummary.URL.Addjobdetails, payload);

      toast.update(loadingToast, {
        render: `✅ ${payload.length} item(s) added to ${header.jobNo}`,
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      setSaveStatus(`Added ${payload.length} line item(s) to job ${header.jobNo}.`);
      clearCurrentDraft();
      setDraftSyncDisabled(false);
    } catch (error) {
      console.error("Failed to save job entry lines", error);

      toast.update(loadingToast, {
        render: error?.response?.data?.message || error?.message || "❌ Failed to save job entry",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });

      setSaveStatus(error?.response?.data?.message || error?.message || "Failed to save job entry lines.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleShortcut = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isTyping = ["input", "select", "textarea"].includes(tagName);

      if (activeJobEntryTab !== "existing") return;

      if (event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        addLine();
      }

      if (event.altKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        addStore();
      }

      if (event.key === "Escape") clearSelection();
      if (isTyping) return;

      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveExistingJobLines();
     } else if (event.ctrlKey && event.key.toLowerCase() === "e") {
  event.preventDefault();
  downloadEstimateAttachment();

      } else if (event.ctrlKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copyLines();
      } else if (event.ctrlKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        if (copiedLines.length) pasteLines();
        else pasteExcelRangeFromClipboard();
      } else if (event.ctrlKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectAllLines();
      } else if (event.ctrlKey && event.key.toLowerCase() === "x") {
        event.preventDefault();
        removeSelected();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  return (
    <div className="job-entry-page">
      <main className="job-entry-shell">
        <section className="job-entry-topbar">
          <div className="job-entry-title">
            <h1>Job Entry</h1>
            <p>
              {header.jobNo ? `Adding rows to ${header.jobNo}` : "Select a job number"}{" "}
              - {lines.length} salon/store(s) - {lines.length} line(s)
              {draftRestored ? " - Draft restored" : ""}
            </p>
          </div>

          <div className="job-entry-actions">
            {activeJobEntryTab === "existing" ? (
              <>
                <div className="job-entry-summary" aria-label="Job totals">
                  <div>
                    <span>TOTAL SQ.F</span>
                    <strong>{totals.sqft.toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <button className="job-primary-btn" type="button" onClick={addLine}>
                  <Plus size={18} />
                  Add Row
                </button>

                <button
                  className="job-secondary-btn job-new-job-top"
                  type="button"
                  onClick={() => setActiveJobEntryTab("new")}
                  title="Open add new job"
                >
                  <FilePlus size={16} />
                  <span>Add New Job</span>
                </button>

                <button className="job-secondary-btn" type="button" onClick={refreshElementGroups}>
                  <Plus size={14} />
                  Refresh Groups
                </button>

                <button className="job-secondary-btn" type="button" onClick={() => (window.location.href = "/element-group-master") }>
                  <Plus size={14} />
                  Manage Element Groups
                </button>

                <Link className="job-secondary-btn job-link-btn" to="/storemaster" title="Open Store Master">
                  <ExternalLink size={14} />
                  Store Master
                </Link>

                <div className="job-icon-group" aria-label="Job actions">
                  <button type="button" title="New salon/store" onClick={addStore}>
                    <FolderPlus size={16} />
                    <span>Salon/Store</span>
                  </button>

                  <button type="button" title="Show Drafts" onClick={showDrafts}>
                    <Save size={16} />
                    <span>Draft</span>
                  </button>

                  <button type="button" title="Copy selected rows for Excel" onClick={copyLines}>
                    <Copy size={16} />
                    <span>Copy</span>
                  </button>

                  <button type="button" title="Paste copied rows" onClick={pasteLines}>
                    <Clipboard size={16} />
                    <span>Paste</span>
                  </button>
                  <button
                    type="button"
                    title="Paste Excel column or range as new rows"
                    onClick={() => pasteExcelRangeFromClipboard({ append: true, field: "visualCode" })}
                  >
                    <Clipboard size={16} />
                    <span>Excel Range</span>
                  </button>

                  <button type="button" title="Delete selected" onClick={removeSelected} className="danger">
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>

                  <button type="button" title="Save" onClick={saveExistingJobLines} disabled={isSaving}>
                    <Save size={16} />
                    <span>{isSaving ? "Saving" : "Save"}</span>
                  </button>

                  <button type="button" title="Send estimate mail" onClick={openEstimateMail}>
                    <Mail size={16} />
                    <span>Send Mail</span>
                  </button>

             <button type="button" title="Download PDF" onClick={downloadEstimateAttachment}>
              <Download size={16} />
              <span>PDF</span>
            </button>

                  <button type="button" title="Clear job entry" onClick={clearJobEntry} className="danger">
                    <RotateCcw size={16} />
                    <span>Clear</span>
                  </button>
                </div>
              </>
            ) : (
              <button
                className="job-primary-btn job-create-job-btn"
                type="button"
                onClick={handleCreateNewJob}
                disabled={isCreatingJob}
                title="Create new job"
              >
                <FilePlus size={16} />
                <span>{isCreatingJob ? "Creating..." : "Create Job"}</span>
              </button>
            )}
          </div>
        </section>

        <nav className="job-entry-tabs" aria-label="Job entry mode">
          <button
            type="button"
            className={`job-entry-tab ${activeJobEntryTab === "new" ? "active" : ""}`}
            onClick={() => setActiveJobEntryTab("new")}
          >
            <FilePlus size={15} />
            Add New Job
          </button>
          <button
            type="button"
            className={`job-entry-tab ${activeJobEntryTab === "existing" ? "active" : ""}`}
            onClick={() => setActiveJobEntryTab("existing")}
          >
            <Clipboard size={15} />
            Existing Job
          </button>
        </nav>

        {activeJobEntryTab === "new" ? (
          <section className="job-entry-form-grid job-new-job-grid">
            <label>
              <span>Job Date</span>
              <div className="job-date-input">
                <DatePicker
                  selected={getDatePickerValue(header.date)}
                  onChange={(date) => updateHeader("date", date ? formatDate(date) : "")}
                  dateFormat="dd-MMM-yyyy"
                  placeholderText="Select job date"
                  className="job-date-picker-input"
                  minDate={new Date()}
                  maxDate={new Date()}
                  isClearable={false}
                  popperPlacement="bottom-start"
                  popperContainer={({ children }) => createPortal(children, document.body)}
                />
                <Calendar size={15} />
              </div>
            </label>

            <label>
              <span>Client</span>
              <Select
                classNamePrefix="job-form-select"
                styles={formSelectStyles}
                menuPortalTarget={selectPortalTarget()}
                isClearable
                options={customerSelectOptions}
                value={getSelectedOption(customerSelectOptions, header.client)}
                onChange={(option) => updateHeader("client", option?.value || "")}
                placeholder="Search customer"
              />
              {header.client && (
                <small className="job-rate-hint">
                  {customerRateRows.length
                    ? `${customerRateRows.length} customer rate(s) available`
                    : "Using general product media rates"}
                </small>
              )}
            </label>

            <label>
              <span>User Name</span>
              <input value={header.userName} onChange={(event) => updateHeader("userName", event.target.value)} />
            </label>

            <label>
              <span>Sub Client</span>
              <input value={header.subClient} onChange={(event) => updateHeader("subClient", event.target.value)} />
            </label>

            <label>
              <span>Business Type</span>
              <select value={header.businessType} onChange={(event) => updateHeader("businessType", event.target.value)}>
                <option value="">Select Business Type</option>
                {businessTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Contact Person</span>
              <input value={header.contactPerson} onChange={(event) => updateHeader("contactPerson", event.target.value)} placeholder="Enter Contact Person" />
            </label>

            <label>
              <span>PO No</span>
              <input value={header.poNo} onChange={(event) => updateHeader("poNo", event.target.value)} placeholder="Enter PO No" />
            </label>

      <label>
  <span>PO Date</span>
  <DatePicker
    selected={header.poDate ? new Date(header.poDate) : null}
    onChange={(date) =>
      updateHeader(
        "poDate",
        date ? formatDate(date) : ""
      )
    }
    dateFormat="dd-MMM-yyyy"
    placeholderText="Select PO Date"
    className="job-date-picker-input"
    isClearable
    popperPlacement="bottom-start"
    popperContainer={({ children }) =>
      createPortal(children, document.body)
    }
  />
</label>

            <label>
              <span>PO Type</span>
              <select value={header.poType} onChange={(event) => updateHeader("poType", event.target.value)}>
                <option value="">Select PO Type</option>
                {poTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Customer Email</span>
              <input type="email" value={header.customerEmail} onChange={(event) => updateHeader("customerEmail", event.target.value)} placeholder="Enter Customer Email" />
            </label>

            <label>
              <span>Project Name</span>
              <input value={header.projectName} onChange={(event) => updateHeader("projectName", event.target.value)} placeholder="Enter Project Name" />
            </label>

            <div className="job-new-job-submit">
              <button
                className="job-primary-btn job-create-job-btn"
                type="button"
                onClick={handleCreateNewJob}
                disabled={isCreatingJob}
              >
                <FilePlus size={16} />
                <span>{isCreatingJob ? "Creating..." : "Create Job"}</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="job-entry-form-grid job-existing-job-grid">
            <label>
              <span>Job No</span>
              <div className="job-jobno-row">
                <Select
                  classNamePrefix="job-form-select"
                  styles={formSelectStyles}
                  menuPortalTarget={selectPortalTarget()}
                  isClearable
                  options={jobSelectOptions}
                  value={getSelectedOption(jobSelectOptions, header.jobNo)}
                  onChange={(option) => updateHeader("jobNo", option?.value || "")}
                  placeholder="Search job number"
                  autoFocus
                />
              </div>
            </label>
          </section>
        )}

        {saveStatus && <div className="job-save-status">{saveStatus}</div>}
        {activeJobEntryTab === "existing" && (
          <>
            {header.jobNo && (
              <section className="job-current-info" aria-label="Selected job information">
                <strong>{header.jobNo}</strong>
                <span>Job Date: {header.date || "-"}</span>
                <span>Client: {header.clientName || "-"}</span>
                <span>Sub Client: {header.subClient || "-"}</span>
                <span>Business Type: {header.businessType || "-"}</span>
                <span>PO No: {header.poNo || "-"}</span>
                <span>PO Date: {header.poDate || "-"}</span>
                <span>PO Type: {header.poType || "-"}</span>
                <span>Project: {header.projectName || "-"}</span>
                <span>Created / Edited By: {header.userName || "-"}</span>
              </section>
            )}

            <section className="job-lines-wrap" aria-label="Job line items">
              <div className="job-lines-scroll">
                <table className="job-lines-table">
              <colgroup>
                <col className="job-col-select" />
                <col className="job-col-city" />
                <col className="job-col-store" />
                <col className="job-col-address" />
                <col className="job-col-branding" />
                <col className="job-col-small" />
                <col className="job-col-small" />
                <col className="job-col-machine" />
                <col className="job-col-print-ready" />
                <col className="job-col-medium" />
                <col className="job-col-element" />
                <col className="job-col-visual"style={{ width: "300px", minWidth: "300px" }}  />
                <col className="job-col-qty" style={{ width: "120px", minWidth: "150px" }} />
                <col className="job-col-number" />
                <col className="job-col-number" />
                <col className="job-col-number" />
                <col className="job-col-number" />
                <col className="job-col-number" />
                <col className="job-col-charge" />
                <col className="job-col-charge" />
                <col className="job-col-charge" />
                <col className="job-col-flag" />
                <col className="job-col-medium" />
                <col className="job-col-flag" />
                <col className="job-col-medium" />
                <col className="job-col-implementation" />
                <col className="job-col-deadline" />
                <col className="job-col-deadline" />
                <col className="job-col-remarks" />
              </colgroup>
              <thead>
                <tr className="job-group-row">
                  <th className="select-col">
                    <input
                      type="checkbox"
                      checked={selectedCount === lines.length && lines.length > 0}
                      onChange={toggleAll}
                      aria-label="Select all rows"
                    />
                  </th>
                  <th colSpan="8">SALON / STORE DETAILS (SHARED ACROSS TS LINES)</th>
                  <th colSpan={productColumns.length + 4}>LINE ITEM</th>
                </tr>
                <tr>
                  <th className="select-col"></th>
                  <th>CITY</th>
                  <th>Description</th>
                  <th>SALON/STORE NAME</th>
                  <th>SALON/STORE ADDRESS</th>
                  <th>BRANDING LOCATION</th>
                  <th>PROD LOC</th>
                  <th>BILL LOC</th>
                  <th>PRINTING MACHINE</th>
                  <th>PRINT READY FILE</th>
                  <th>MEDIA</th>
                  <th>ELEMENT GROUP</th>
                  {productColumns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                  <th>REMARKS/INSTRUCTIONS</th>
                </tr>
              </thead>

              <tbody>
                {lines.length ? lines.map((line) => (
                  <tr key={line.id}>
                    <td className="select-col">
                      <input
                        type="checkbox"
                        checked={selectedLineIds.includes(line.id)}
                        onChange={() => toggleLine(line.id)}
                        aria-label={`Select ${line.store || "line"}`}
                      />
                    </td>

                    <td>
                      <Select
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={citySelectOptions}
                        value={getSelectedOption(citySelectOptions, line.city)}
                        onChange={(option) => updateLine(line.id, "city", option?.value || "")}
                        placeholder="-"
                      />
                    </td>
                    <td>
                
                  <input
                    value={line.description || ""}
                    onChange={(event) =>
                      updateLine(line.id, "description", event.target.value)
                    }
                    placeholder="Description"
                  />
                </td>

                    <td>
                      <Select
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={storeSelectOptions}
                        value={getSelectedOption(storeSelectOptions, line.store)}
                        onChange={(option) => updateLine(line.id, "store", option?.value || "")}
                        placeholder={header.client ? "Select store" : "Select client"}
                      />
                    </td>
                    <td>
                      <Select
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={storeAddressSelectOptions}
                        value={getSelectedOption(storeAddressSelectOptions, line.salonAddress)}
                        onChange={(option) => updateLine(line.id, "salonAddress", option?.value || "")}
                        placeholder={header.client ? "Select ship to" : "Select client"}
                      />
                    </td>
                    <td>
                      <Select
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={brandingLocationSelectOptions}
                        value={getSelectedOption(brandingLocationSelectOptions, line.brandingLocation)}
                        onChange={(option) => updateLine(line.id, "brandingLocation", option?.value || "")}
                        placeholder={header.client ? "Select location" : "Select client"}
                      />
                    </td>
                    <td>
                      <Select
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={locationSelectOptions}
                        value={getSelectedOption(locationSelectOptions, line.prodLoc)}
                        onChange={(option) => updateLine(line.id, "prodLoc", option?.value || "")}
                        placeholder="-"
                      />
                    </td>
                    <td>
                      <Select
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={locationSelectOptions}
                        value={getSelectedOption(locationSelectOptions, line.billLoc)}
                        onChange={(option) => updateLine(line.id, "billLoc", option?.value || "")}
                        placeholder="-"
                      />
                    </td>

                    <td>
                      <Select
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={printerSelectOptions}
                        value={getSelectedOption(printerSelectOptions, line.printingMachine)}
                        onChange={(option) => updateLine(line.id, "printingMachine", option?.value || "")}
                        placeholder={printerSelectOptions.length ? "-" : "Loading..."}
                      />
                    </td>

                    <td>
                      <Select
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={printReadySelectOptions}
                        value={getSelectedOption(printReadySelectOptions, line.printReadyFile)}
                        onChange={(option) => updateLine(line.id, "printReadyFile", option?.value || "")}
                        placeholder="-"
                      />
                    </td>

                    <td>
                      <Select
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={mediaSelectOptions}
                        value={getSelectedOption(mediaSelectOptions, line.media)}
                        onChange={(option) => updateLine(line.id, "media", option?.value || "")}
                        placeholder="-"
                      />
                    </td>

                    <td>
                      <CreatableSelect
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={getElementGroupSelectOptions(line)}
                        value={getSelectedOption(getElementGroupSelectOptions(line), line.elementGroup)}
                        onChange={(option) => updateLine(line.id, "elementGroup", option?.value || "")}
                        placeholder="-"
                      />
                    </td>
<td>
                      <input
                        value={line.visualCode || ""}
                        onChange={(event) => updateLine(line.id, "visualCode", event.target.value)}
                        {...getPasteCellProps(line.id, "visualCode")}
                      />
                    </td>


                    <td>
                      <input
                        value={line.qty}
                        type="number"
                        onChange={(event) => updateLine(line.id, "qty", event.target.value)}
                        {...getPasteCellProps(line.id, "qty")}
                      />
                    </td>

                    <td>
                      <input
                        value={line.width}
                        type="number"
                        onChange={(event) => updateLine(line.id, "width", event.target.value)}
                        {...getPasteCellProps(line.id, "width")}
                      />
                    </td>

                    <td>
                      <input
                        value={line.height}
                        type="number"
                        onChange={(event) => updateLine(line.id, "height", event.target.value)}
                        {...getPasteCellProps(line.id, "height")}
                      />
                    </td>

                    <td>
                      <input
                        value={line.billingWidth ?? getLineBillingWidth(line)}
                        type="number"
                        onChange={(event) => updateLine(line.id, "billingWidth", event.target.value)}
                        {...getPasteCellProps(line.id, "billingWidth")}
                      />
                    </td>

                    <td>
                      <input
                        value={line.billingHeight ?? getLineBillingHeight(line)}
                        type="number"
                        onChange={(event) => updateLine(line.id, "billingHeight", event.target.value)}
                        {...getPasteCellProps(line.id, "billingHeight")}
                      />
                    </td>

                    <td>
                      <input value={line.sqft} readOnly className="job-readonly-input" />
                    </td>

                    <td>
                      <input
                        value={line.installationCharges}
                        type="number"
                        onChange={(event) => updateLine(line.id, "installationCharges", event.target.value)}
                        {...getPasteCellProps(line.id, "installationCharges")}
                      />
                    </td>

                    <td>
                      <input
                        value={line.transportationCharges}
                        type="number"
                        onChange={(event) => updateLine(line.id, "transportationCharges", event.target.value)}
                        {...getPasteCellProps(line.id, "transportationCharges")}
                      />
                    </td>

                    <td>
                      <input
                        value={line.layoutingCharges}
                        type="number"
                        onChange={(event) => updateLine(line.id, "layoutingCharges", event.target.value)}
                        {...getPasteCellProps(line.id, "layoutingCharges")}
                      />
                    </td>

                    <td>
                      <Select
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={laminationFlagSelectOptions}
                        value={getSelectedOption(laminationFlagSelectOptions, line.laminationFlag)}
                        onChange={(option) => updateLine(line.id, "laminationFlag", option?.value || "")}
                        placeholder="-"
                      />
                    </td>

                    <td>
                      <CreatableSelect
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={laminationSelectOptions}
                        value={getSelectedOption(laminationSelectOptions, line.lamination)}
                        onChange={(option) => updateLine(line.id, "lamination", option?.value || "")}
                        placeholder="-"
                      />
                    </td>

                    <td>
                      <Select
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={mountingFlagSelectOptions}
                        value={getSelectedOption(mountingFlagSelectOptions, line.mountingFlag)}
                        onChange={(option) => updateLine(line.id, "mountingFlag", option?.value || "")}
                        placeholder="-"
                      />
                    </td>

                    <td>
                      <CreatableSelect
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={mountingSelectOptions}
                        value={getSelectedOption(mountingSelectOptions, line.mounting)}
                        onChange={(option) => updateLine(line.id, "mounting", option?.value || "")}
                        placeholder="-"
                      />
                    </td>

                    <td>
                      <CreatableSelect
                        classNamePrefix="job-cell-select"
                        styles={compactSelectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={implementationSelectOptions}
                        value={getSelectedOption(implementationSelectOptions, line.implementation)}
                        onChange={(option) => updateLine(line.id, "implementation", option?.value || "")}
                        placeholder="-"
                      />
                    </td>

                    <td>
                     <DatePicker
  selected={line.jobDeadline ? new Date(line.jobDeadline) : null}
  onChange={(date) => updateLine(line.id, "jobDeadline", date)}
  showTimeSelect
  dateFormat="dd-MMM-yyyy hh:mm aa"
/>
                    </td>

                    <td>
                  <DatePicker
  selected={line.printerDeadline ? new Date(line.printerDeadline) : null}
  onChange={(date) => updateLine(line.id, "printerDeadline", date)}
  showTimeSelect
  dateFormat="dd-MMM-yyyy hh:mm aa"
  minDate={new Date()}
/>
                    </td>

                    <td>
                      <input
                        value={line.remarks}
                        onChange={(event) => updateLine(line.id, "remarks", event.target.value)}
                        {...getPasteCellProps(line.id, "remarks")}
                      />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={productColumns.length + 13} style={{ textAlign: "center", padding: "18px 12px", color: "#6b7280" }}>
                      No rows in UI. Saved draft is still available in local storage.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="job-entry-footer">
          <button className="job-wide-add" type="button" onClick={addLine}>
            <FilePlus size={17} />
            Add Row
            <kbd>Alt+N</kbd>
          </button>

          <button className="job-new-store" type="button" onClick={addStore}>
            <FolderPlus size={17} />
            New Salon/Store
            <kbd>Alt+M</kbd>
          </button>
        </section>

        <p className="job-shortcuts">
            Shortcuts: Ctrl+S Save - Ctrl+E PDF - Ctrl+C/V Copy/Paste - Ctrl+A Select All - Ctrl+X Delete - Alt+N Add Line - Alt+M New Salon/Store - Esc Clear selection
          </p>
          </>
        )}
      </main>

      {isDraftPanelOpen && (
        <div className="job-draft-backdrop" role="presentation" onClick={() => setIsDraftPanelOpen(false)}>
          <section
            className="job-draft-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-draft-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="job-draft-header">
              <div>
                <h2 id="job-draft-title">Saved Drafts</h2>
                <p>{draftList.length ? `${draftList.length} draft(s) available` : "No saved drafts yet"}</p>
              </div>
              <button type="button" className="job-draft-close" onClick={() => setIsDraftPanelOpen(false)}>
                x
              </button>
            </div>

            <div className="job-draft-toolbar">
              <span>Drafts save automatically while you work.</span>
              <button type="button" className="job-primary-btn" onClick={() => saveCurrentDraft(true)}>
                <Save size={16} />
                Save Now
              </button>
            </div>

            <div className="job-draft-list">
              {draftList.length ? (
                draftList.map((draft) => {
                  const title = draft.jobNo || "New Job Draft";
                  const savedAt = draft.savedAt ? new Date(draft.savedAt).toLocaleString() : "Not saved";
                  const draftLines = Array.isArray(draft.lines) ? draft.lines : [];
                  const lineCount = draftLines.filter((line) => !isLineBlank(line)).length;
                  const totalSqft = draftLines.reduce(
                    (summary, line) => summary + Number(line.sqft || 0),
                    0
                  );
                  const draftHeader = draft.header || {};

                  return (
                    <article className="job-draft-card" key={draft.draftId || title}>
                      <div>
                        <strong>{title}</strong>
                        <span>{draft.clientName || "No client selected"}</span>
                        <small>
                          {lineCount} row(s) - {savedAt}
                        </small>
                        <dl className="job-draft-details">
                          <div>
                            <dt>Job Date</dt>
                            <dd>{draftHeader.date || "-"}</dd>
                          </div>
                          <div>
                            <dt>Sub Client</dt>
                            <dd>{draftHeader.subClient || "-"}</dd>
                          </div>
                          <div>
                            <dt>Total Sq.f</dt>
                            <dd>{totalSqft.toLocaleString("en-IN")}</dd>
                          </div>
                          <div>
                            <dt>User</dt>
                            <dd>{draftHeader.userName || "-"}</dd>
                          </div>
                        </dl>
                      </div>
                      <div className="job-draft-card-actions">
                        <button type="button" onClick={() => loadDraft(draft)}>
                          Load
                        </button>
                        <button type="button" className="danger" onClick={() => deleteDraft(draft)}>
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="job-draft-empty">
                  <strong>No drafts found</strong>
                  <span>Save the current entry as a draft to see it here.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {isEstimateMailOpen && (
        <div className="job-mail-backdrop" role="presentation" onClick={closeEstimateMail}>
          <form
            className="job-mail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-mail-title"
            onSubmit={sendEstimateMail}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="job-mail-header">
              <div>
                <h2 id="job-mail-title">Estimate Mail</h2>
                <p>
                  {estimateMailAttachmentName} - {estimateMailLineItems.length} row(s)
                </p>
              </div>
              <button type="button" className="job-draft-close" onClick={closeEstimateMail}>
                <X size={16} />
              </button>
            </div>

            <div className="job-mail-body">
              <label>
                <span>To</span>
                <input
                  type="text"
                  value={estimateMail.to}
                  onChange={(event) => updateEstimateMail("to", event.target.value)}
                  placeholder="customer@example.com"
                  autoFocus
                />
              </label>

              <label>
                <span>Subject</span>
                <input
                  type="text"
                  value={estimateMail.subject}
                  onChange={(event) => updateEstimateMail("subject", event.target.value)}
                />
              </label>

              <label className="job-mail-message">
                <span>Body</span>
                <textarea
                  value={estimateMail.body}
                  onChange={(event) => updateEstimateMail("body", event.target.value)}
                  rows={8}
                />
              </label>

              <div className="job-mail-attachment-list" aria-label="Estimate attachments">
                {estimateMailAttachmentGroups.map((group) => (
                  <div className="job-mail-attachment" key={group.key}>
                    <Paperclip size={17} />
                    <div>
                      <strong>{group.fileName}</strong>
                      <span>
                        {group.label} billing location - {group.items.length} row(s) attached as PDF
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="job-mail-preview">
                <div className="job-mail-preview-header">
                  <strong>Current Job Rows</strong>
                  <span>Total amount: {estimateMailTotals.amountTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="job-mail-charge-actions">
                  <button
                    type="button"
                    onClick={() => addEstimateMailChargeRows("installationCharges")}
                  >
                    Installation Charges
                  </button>
                  <button
                    type="button"
                    onClick={() => addEstimateMailChargeRows("transportationCharges")}
                  >
                    Transportation Charges
                  </button>
                  <button
                    type="button"
                    onClick={() => addEstimateMailChargeRows("layoutingCharges")}
                  >
                    Layouting Charges
                  </button>
                </div>
                <div className="job-mail-preview-table-wrap current-job-rows-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Region</th>
                        <th>Salon Name</th>
                        <th>Description / Media</th>
                        <th>Qty</th>
                        <th>Printable Sqft</th>
                        <th>Rate</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimateMailLineItems.map((item) => (
                        <tr
                          key={item.estimateLineKey}
                          className={item.isChargeRow ? "job-mail-charge-line" : ""}
                        >
                          <td>{item.region || "-"}</td>
                          <td>{item.salonName || "-"}</td>
                          <td>{item.isChargeRow ? "" : item.media || "-"}</td>
                          <td>{item.qty || "-"}</td>
                          <td>{item.printableSqft || "-"}</td>
                          <td>{toNumber(item.rate).toLocaleString("en-IN")}</td>
                          <td>{toNumber(item.amount).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                      {estimateMailChargeRows.map((row) => (
                        <tr key={row.estimateLineKey} className="job-mail-charge-edit-row">
                          <td>{row.region || "-"}</td>
                          <td>{row.salonName || "-"}</td>
                          <td>{row.description}</td>
                          <td>1</td>
                          <td>-</td>
                          <td>-</td>
                          <td>
                            <input
                              type="number"
                              value={row.amount}
                              onChange={(event) =>
                                updateEstimateMailCharge(row.estimateLineKey, event.target.value)
                              }
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="job-mail-footer">
              <button type="button" className="job-mail-ghost" onClick={downloadEstimateMailAttachment}>
                <Download size={15} />
                {estimateMailAttachmentGroups.length > 1 ? "Download PDFs" : "Download PDF"}
              </button>
              <div className="job-mail-footer-actions">
                <button type="button" className="job-mail-ghost" onClick={closeEstimateMail}>
                  Cancel
                </button>
                <button type="submit" className="job-primary-btn" disabled={isSendingEstimateMail}>
                  <Send size={15} />
                  {isSendingEstimateMail ? "Sending..." : "Send Mail"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <button className="job-float-toggle" type="button" title="Select all rows" onClick={selectAllLines}>
        <CheckSquare size={18} />
      </button>

      <button className="job-print-float" type="button" title="Print" onClick={() => window.print()}>
        <Printer size={18} />
      </button>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default JobEntry;
