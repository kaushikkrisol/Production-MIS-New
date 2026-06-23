import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Spinner, Table } from "react-bootstrap";
import axios from "axios";
import { CheckSquare, FileText, Plus, Printer, RefreshCw, RotateCcw, Save, Trash2 } from "react-feather";
import config from "../../../config";
import { all_routes } from "../../../Router/all_routes";
import { buildChallanItemPricing } from "./hsnRateLookup";
import { findCustomerRecord, mergeFallbackCustomers } from "./customerFallbacks";
import Select from "react-select";
import { getCompanyBranchDetails } from "./companyBranches";

const GST_RATE = 18;
const INVOICE_STATUS_STORAGE_KEY = "invoiceStatusByNo";
const LEGACY_FINAL_INVOICE_STORAGE_KEY = "finalInvoiceNos";
const READ_ONLY_ITEM_FIELDS = new Set(["invoiceAmount", "InvoiceAmount", "taxableValue", "TaxableValue"]);

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
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
  const width = toNumber(item.InvoiceWidth ?? item.invoiceWidth ?? item.Width ?? item.width);
  const height = toNumber(item.InvoiceHeight ?? item.invoiceHeight ?? item.Height ?? item.height ?? item.Length ?? item.length);
  const rate = toNumber(item.InvoiceRate ?? item.invoiceRate ?? item.Rate ?? item.rate);
  const totalSqFt = toNumber(item.InvoiceTotalSqFt ?? item.invoiceTotalSqFt ?? item.TotalSqFt ?? item.totalSqFt);
  const lineType = String(item.Type ?? item.type ?? item.lineType ?? "").toLowerCase();
  const sqft = totalSqFt || (width && height ? (width * height * qty) / 144 : 0);

  if ((lineType === "transportation" || lineType === "implementation") && !sqft) return qty * rate;
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

const isDifferentProductionBillingLocation = (item) => {
  const productionLocation = normalizeLocationName(item?.ProductionLocation);
  const billingLocation = normalizeLocationName(item?.BillingLocation);

  return Boolean(productionLocation && billingLocation && productionLocation !== billingLocation);
};

const getRowJobNo = (row) => getRowValue(row, "jobNo", "JobNo", "JOB NO", "Job No");
const getRowClient = (row) => getRowValue(row, "client", "Client", "customerName", "CustomerName", "subClient", "SubClient");
const getRowStore = (row) => getRowValue(row, "store", "storeName", "StoreName", "salonAddress", "SalonAddress", "city", "City");
const getRowAddress = (row) =>
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
  );
const getRowDescription = (row) =>
  getRowValue(row, "externalMedia", "ExternalMedia", "details", "Details", "nameSubCode", "NameSubCode", "visualCode", "VisualCode", "media", "Media") ||
  "Media";
const getRowMedia = (row) => getRowValue(row, "media", "Media", "externalMedia", "ExternalMedia", "internalMedia", "InternalMedia");
const getRowRegion = (row) => getRowValue(row, "region", "Region", "productionLocation", "ProductionLocation");

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
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (Array.isArray(data?.result?.$values)) return data.result.$values;
  if (Array.isArray(data?.message?.$values)) return data.message.$values;
  return [];
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const text = toText(value).trim();
    if (text) return text;
  }
  return "";
};

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
  const time = new Date(dateValue).getTime();
  return Number.isFinite(time) ? time : 0;
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
      invoiceType === "billingtocustomer" &&
      (!normalizedJobNo || rowJobNo === normalizedJobNo) &&
      (!normalizedClient || rowClient === normalizedClient) &&
      (!grandTotal || Math.abs(rowGrandTotal - grandTotal) < 0.01)
    );
  });

  const matched = matches.sort((left, right) => getInvoiceUpdatedTime(right) - getInvoiceUpdatedTime(left))[0];
  return firstNonEmpty(matched?.InvoiceNo, matched?.invoiceNo, matched?.CustomerInvoiceNo, matched?.customerInvoiceNo);
};

const createEmptyAddress = (label) => ({
  id: uid("address"),
  label,
  name: "",
  address: "",
  gstNo: "",
});

const createEmptyItem = (lineType = "media") => ({
  id: uid("item"),
  selected: false,
  groupByMedia: false,
  jobNo: "",
  lineType,
  description: lineType === "transportation" ? "Transportation Charges" : "",
  media: "",
  hsnCode: "",
  qty: lineType === "transportation" ? 1 : "",
  width: "",
  height: "",
  rate: "",
  manualAmount: "",
});

const createInitialData = () => ({
  invoiceNo: "",
  invoiceDate: new Date().toISOString().split("T")[0],
  jobCardNo: "",
  selectedJobIds: [],
  billTo: [createEmptyAddress("Bill To 1")],
  shipTo: [createEmptyAddress("Ship To 1")],
  items: [createEmptyItem("media")],
  groupByMedia: false,
  groupByStore: false,
  groupByCity: false,
  groupByDescription: false,
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
  const width = toNumber(item.width);
  const height = toNumber(item.height);
  const rate = toNumber(item.rate);
  const sqft = width && height ? (width * height) / 144 : 0;

  if ((item.lineType === "transportation" || item.lineType === "implementation") && !sqft) return qty * rate;
  return sqft * qty * rate;
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

const buildFallbackAddress = (label, rows) => ({
  id: uid("address"),
  label,
  name: joinUnique(rows.map((row) => getRowClient(row))),
  address: joinUnique(rows.map((row) => getRowAddress(row)), "\n"),
  gstNo: joinUnique(rows.map((row) => getRowValue(row, "gstNo", "GSTNo", "GST No", "customerGstNo", "CustomerGstNo"))),
});

const rowToLineItem = (row) => {
  const pricing = buildChallanItemPricing(row);
  const qty = toNumber(getRowValue(row, "qty", "Qty", "quantity", "Quantity")) || toNumber(pricing.quantity) || 1;
  const width = toNumber(getRowValue(row, "width", "Width"));
  const height = toNumber(getRowValue(row, "height", "Height", "length", "Length"));
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

  return {
    id: uid("item"),
    selected: false,
    groupByMedia: false,
    jobNo: getRowJobNo(row),
    lineType: row._invoiceSource === "implementation" ? "implementation" : "media",
    storeName: getRowStore(row),
    city: getRowValue(row, "city", "City"),
    description: getRowDescription(row),
    media: getRowMedia(row) || pricing.media,
    hsnCode: pricing.hsnCode || getRowValue(row, "hsnCode", "HsnCode", "HSNCode", "hsn", "HSN"),
    qty,
    width,
    height,
    rate: pricing.unitPrice || getRowValue(row, "rate", "Rate", "unitPrice", "UnitPrice"),
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

const buildJobCards = (rows, customers) => {
  const grouped = new Map();

  rows.forEach((row, index) => {
    const source = row._invoiceSource || "job";
    const jobCardNo = getRowJobNo(row) || `Job ${index + 1}`;
    const challanNo = getChallanMeta(row).no;
    const storeName = getRowStore(row);
    const key = [source, jobCardNo, challanNo, storeName].map((value) => String(value || "").trim()).join("|");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });

  return Array.from(grouped.entries()).map(([key, jobRows], index) => {
    const [source, jobCardNo] = key.split("|");
    const matchedCustomer = findCustomerRecord(customers, jobRows[0]);
    const customerAddress = matchedCustomer
      ? buildAddressFromCustomer(matchedCustomer, `Bill To ${index + 1} (${jobCardNo})`)
      : buildFallbackAddress(`Bill To ${index + 1} (${jobCardNo})`, jobRows);
    const challanNo = joinUnique(jobRows.map((row) => getChallanMeta(row).no));

    return {
      id: key,
      source,
      jobCardNo,
      challanNo,
      hasChallan: jobRows.some((row) => getChallanMeta(row).isCreated),
      isDone: source === "delivery" ? jobRows.some(isDeliveryDone) : jobRows.some(isImplementationDone),
      clientName: joinUnique(jobRows.map((row) => getRowClient(row))) || "Client",
      storeName: joinUnique(jobRows.map((row) => getRowStore(row))) || "-",
      region: joinUnique(jobRows.map((row) => getRowRegion(row))) || "",
      billTo: customerAddress,
      shipTo: {
        ...buildFallbackAddress(`Ship To ${index + 1} (${jobCardNo})`, jobRows),
        name: joinUnique(jobRows.map((row) => getRowStore(row))) || customerAddress.name,
      },
      items: jobRows.map(rowToLineItem),
    };
  });
};

const groupInvoiceItems = (items, groupByMedia, groupByStore, groupByCity, groupByDescription) => {
  if (!groupByMedia && !groupByStore && !groupByCity && !groupByDescription) return items;

  const grouped = new Map();

  items.forEach((item) => {
    const key = [
      item.lineType,
      groupByMedia && !item.groupByMedia ? item.id : "",
      groupByStore ? String(item.storeName || "").toLowerCase() : "",
      groupByCity ? String(item.city || "").toLowerCase() : "",
      groupByMedia && item.groupByMedia ? String(item.media || item.description || "").toLowerCase() : "",
      groupByDescription ? String(item.description || "").toLowerCase() : "",
      item.hsnCode,
      toNumber(item.width),
      toNumber(item.height),
      toNumber(item.rate),
    ].join("|");

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
  });

  return Array.from(grouped.values());
};

const InvoicePreviewBuilder = () => {
  const [data, setData] = useState(createInitialData);
  const [jobCards, setJobCards] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [queueJobFilterNos, setQueueJobFilterNos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [message, setMessage] = useState("");

  const loadInvoiceJobs = useCallback(async () => {
    const { username, locationId, roleName } = getUserContext();
    setIsLoading(true);
    setMessage("");

    try {
      const customerPromise = locationId
        ? axios.post(
            config.JobSummary.URL.Getallcustomer,
            { locationid: locationId },
            { timeout: 10000, headers: { "Content-Type": "application/json" } }
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
          ? axios.post(config.Delivery.URL.GetAllDeliveryAccToLocation, payload)
          : axios.post(config.Delivery.URL.Getalldelivery);
      const implementationPromise =
        locationId && username
          ? axios.post(config.Implementation.URL.GetAllImplementationAccToLocation, payload)
          : axios.post(config.Implementation.URL.GetallImplementation);
      const challanDashboardPromise = axios.get(config.Delivery.URL.GetAllChallansDashboard);
      const allJobsPromise =
        locationId && username
          ? axios.post(config.JobSummary.URL.GetAllJobsAccToLocation, allJobsPayload)
          : Promise.resolve({ data: [] });

      const [
  customerResult,
  deliveryResult,
  implementationResult,
  challanDashboardResult,
  allJobsResult,
] = await Promise.allSettled([
  customerPromise,
  deliveryPromise,
  implementationPromise,
  challanDashboardPromise,
  allJobsPromise,
]);

const customerResponse =
  customerResult.status === "fulfilled" ? customerResult.value : { data: [] };

const deliveryResponse =
  deliveryResult.status === "fulfilled" ? deliveryResult.value : { data: [] };

const implementationResponse =
  implementationResult.status === "fulfilled"
    ? implementationResult.value
    : { data: [] };

const challanDashboardResponse =
  challanDashboardResult.status === "fulfilled" ? challanDashboardResult.value : { data: [] };

const allJobsResponse =
  allJobsResult.status === "fulfilled" ? allJobsResult.value : { data: [] };

if (implementationResult.status === "rejected") {
  console.warn(
    "Implementation API failed:",
    implementationResult.reason?.response?.status,
    implementationResult.reason?.config?.url
  );
}

      const customers = mergeFallbackCustomers(Array.isArray(customerResponse.data) ? customerResponse.data : []);
      const jobRows = getResponseRows(allJobsResponse.data);
      const deliveryRows = getResponseRows(deliveryResponse.data).map((row) => ({
        ...row,
        _invoiceSource: "delivery",
      }));
      const implementationRows = getResponseRows(implementationResponse.data).map((row) => ({
        ...row,
        _invoiceSource: "implementation",
      }));
      const challanRows = normalizeChallanDashboardRows(challanDashboardResponse.data);

      const eligibleRows = enrichRowsWithJobDetails([...deliveryRows, ...implementationRows], jobRows).filter(
        (row) => isDeliveryDone(row) || isImplementationDone(row) || getChallanMeta(row).isCreated
      );
      const cardMap = new Map();
      buildJobCards(challanRows, customers).forEach((card) => cardMap.set(card.id, card));
      buildJobCards(eligibleRows, customers).forEach((card) => {
        if (!cardMap.has(card.id)) cardMap.set(card.id, card);
      });
      const nextCards = Array.from(cardMap.values());

      setJobCards(nextCards);
      setData((prev) => {
        const selectedIds = prev.selectedJobIds.filter((id) => nextCards.some((card) => card.id === id));
        if (!selectedIds.length) return { ...prev, selectedJobIds: [] };
        return buildDataForJobs(prev, nextCards.filter((card) => selectedIds.includes(card.id)));
      });

      if (!nextCards.length) {
        setMessage("No delivery done, implementation done, or challan-created jobs found for invoice.");
      }
    } catch (error) {
      console.error("Failed to load invoice jobs", error);
      setMessage(error?.response?.data?.message || error?.message || "Could not load invoice jobs from Delivery and Implementation.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoiceJobs();
  }, [loadInvoiceJobs]);

  useEffect(() => {
    const raw = localStorage.getItem("invoicePreviewBuilderData");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed?.selectedRows)
        ? parsed.selectedRows.map((row) => ({ ...row, _invoiceSource: parsed.sourceModule || row._invoiceSource || "job" }))
        : [];
      const customers = Array.isArray(parsed?.customers) ? mergeFallbackCustomers(parsed.customers) : [];
      const cards = buildJobCards(rows, customers);

      if (cards.length) {
        setJobCards((prev) => {
          const existing = new Map(prev.map((card) => [card.id, card]));
          cards.forEach((card) => existing.set(card.id, card));
          return Array.from(existing.values());
        });
        setData((prev) => buildDataForJobs(prev, cards));
      }
    } catch (error) {
      console.error("Failed to load selected invoice rows", error);
    }
  }, []);

  useEffect(() => {
    const rawDraft = localStorage.getItem("invoiceDraftData");
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft);
      if (draft && typeof draft === "object" && Array.isArray(draft.items)) {
        setData((prev) => ({
          ...prev,
          ...draft,
          billTo: Array.isArray(draft.billTo) && draft.billTo.length ? draft.billTo : prev.billTo,
          shipTo: Array.isArray(draft.shipTo) && draft.shipTo.length ? draft.shipTo : prev.shipTo,
          items: draft.items.length ? draft.items : prev.items,
        }));
        setMessage("Invoice draft loaded. Review and use Final Invoice when ready.");
      }
    } catch (error) {
      console.error("Failed to load invoice draft", error);
    }
  }, []);

  const jobSelectOptions = useMemo(
    () =>
      jobCards
        .filter((job) => String(job.jobCardNo || "").trim())
        .map((job) => {
          const detail = [job.source, job.storeName !== "-" ? job.storeName : "", job.challanNo ? `Challan: ${job.challanNo}` : ""]
            .filter(Boolean)
            .join(" | ");

          return {
            value: job.id,
            label: detail ? `${job.jobCardNo} - ${detail}` : job.jobCardNo,
            jobCardNo: job.jobCardNo,
          };
        }),
    [jobCards]
  );

  const selectedJobOptions = useMemo(
    () => jobSelectOptions.filter((option) => queueJobFilterNos.includes(option.value)),
    [jobSelectOptions, queueJobFilterNos]
  );

  const visibleJobCards = useMemo(() => {
    if (queueJobFilterNos.length) {
      const selectedCardIds = new Set(queueJobFilterNos);
      return jobCards.filter((card) => selectedCardIds.has(card.id));
    }

    if (data.selectedJobIds.length) {
      const selectedIds = new Set(data.selectedJobIds);
      return jobCards.filter((card) => selectedIds.has(card.id));
    }

    return [];
  }, [data.selectedJobIds, jobCards, queueJobFilterNos]);

  const selectedItems = useMemo(() => data.items.filter((item) => item.selected), [data.items]);
  const invoiceItems = useMemo(
    () => groupInvoiceItems(selectedItems, data.groupByMedia, data.groupByStore, data.groupByCity, data.groupByDescription),
    [data.groupByCity, data.groupByDescription, data.groupByMedia, data.groupByStore, selectedItems]
  );
 const grandTotal = useMemo(() => invoiceItems.reduce((sum, item) => sum + calculateItemAmount(item), 0), [invoiceItems]);
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

  const handleJobsSelected = useCallback(
    (selectedIds) => {
      const jobs = jobCards.filter((job) => selectedIds.includes(job.id));

      if (!jobs.length) {
        setData((prev) => ({
          ...prev,
          selectedJobIds: [],
          billTo: [createEmptyAddress("Bill To 1")],
          shipTo: [createEmptyAddress("Ship To 1")],
          items: [createEmptyItem("media")],
          jobCardNo: "",
        }));
        return;
      }

      setData((prev) => buildDataForJobs(prev, jobs));
    },
    [jobCards]
  );

  const updateMeta = (field, value) => setData((prev) => ({ ...prev, [field]: value }));

  const updateAddress = (type, id, field, value) => {
    setData((prev) => ({
      ...prev,
      [type]: prev[type].map((address) => (address.id === id ? { ...address, [field]: value } : address)),
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
      items: prev.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = (lineType = "media") => {
    setData((prev) => ({ ...prev, items: [...prev.items, createEmptyItem(lineType)] }));
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
      return {
        key: item.id || `invoice-row-${index}`,
        sno: index + 1,
        description: item.description || item.media || "Product",
        jobNo: item.jobNo,
        qty: toNumber(item.qty),
        width: toNumber(item.width),
        height: toNumber(item.height),
        rate: toNumber(item.rate),
        hsnCode: item.hsnCode || "",
        taxableValue,
        gstRate: GST_RATE,
        gstAmount,
        lineTotal: taxableValue + gstAmount,
      };
    });

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

  const userContext = getUserContext();
  const previewPayload = buildInvoicePreviewPayload(data, jobCards, invoiceRows);

  const completeItems = invoiceItems.map((item) => {
    const fullSourceRow = stripInvoiceHelperFields(item.source || {});

    const sourceQty = fullSourceRow.Qty ?? fullSourceRow.qty ?? fullSourceRow.Quantity ?? fullSourceRow.quantity ?? "";
    const sourceWidth = fullSourceRow.Width ?? fullSourceRow.width ?? "";
    const sourceHeight = fullSourceRow.Height ?? fullSourceRow.height ?? fullSourceRow.Length ?? fullSourceRow.length ?? "";
    const sourceRate = fullSourceRow.Rate ?? fullSourceRow.rate ?? fullSourceRow.unitPrice ?? fullSourceRow.UnitPrice ?? "";
    const sourceDescription = fullSourceRow.Description ?? fullSourceRow.description ?? fullSourceRow.NameSubCode ?? fullSourceRow.nameSubCode ?? "";
    const sourceHsn = fullSourceRow.Hsn ?? fullSourceRow.HsnCode ?? fullSourceRow.HSNCode ?? fullSourceRow.hsnCode ?? fullSourceRow.hsn ?? "";
    const sourceMedia = fullSourceRow.Media ?? fullSourceRow.media ?? "";

    const invoiceQty = toNumber(item.qty || sourceQty);
    const invoiceWidth = toNumber(item.width || sourceWidth);
    const invoiceHeight = toNumber(item.height || sourceHeight);
    const invoiceRate = toNumber(item.rate || sourceRate);
    const invoiceAmount = calculateItemAmount(item);
    const invoiceGstAmount = (invoiceAmount * GST_RATE) / 100;
    const invoiceLineTotal = invoiceAmount + invoiceGstAmount;

    const totalSqFt =
      fullSourceRow.TotalSqFt ??
      fullSourceRow["Total Sq.ft"] ??
      (toNumber(sourceWidth) && toNumber(sourceHeight)
        ? (toNumber(sourceWidth) * toNumber(sourceHeight) * (toNumber(sourceQty) || 1)) / 144
        : 0);
    const invoiceTotalSqFt =
      invoiceWidth && invoiceHeight ? (invoiceWidth * invoiceHeight * (invoiceQty || 1)) / 144 : 0;

    return {
      CsId: toText(fullSourceRow.CsId || fullSourceRow.csId || fullSourceRow.id || fullSourceRow._id),
      JobNo: toText(item.jobNo || fullSourceRow.JobNo || fullSourceRow.jobNo),
      Client: toText(fullSourceRow.Client || fullSourceRow.client),
      SubClient: toText(fullSourceRow.SubClient || fullSourceRow.subClient),
      AccountManager: toText(fullSourceRow.AccountManager || fullSourceRow.accountManager),

      Region: toText(fullSourceRow.Region || fullSourceRow.region || previewPayload.region),
      ProductionLocation: toText(fullSourceRow.ProductionLocation || fullSourceRow.productionLocation),
      BillingLocation: toText(fullSourceRow.BillingLocation || fullSourceRow.billingLocation),

      City: toText(fullSourceRow.City || fullSourceRow.city),
      Date: toText(fullSourceRow.Date || fullSourceRow.date || data.invoiceDate),
      VisualCode: toText(fullSourceRow.VisualCode || fullSourceRow.visualCode),

      NameSubCode: toText(
        fullSourceRow.NameSubCode ||
          fullSourceRow.nameSubCode ||
          sourceDescription ||
          item.description
      ),

      ProjectName: toText(fullSourceRow.ProjectName || fullSourceRow.projectname || data.projectName),
      Type: toText(item.lineType || fullSourceRow.Type || fullSourceRow.type || "media"),
      ProductCode: toText(fullSourceRow.ProductCode || fullSourceRow.productCode),

Description: toText(item.description || sourceDescription),
Hsn: toText(item.hsnCode || sourceHsn),
Media: toText(item.media || sourceMedia),
Qty: toText(invoiceQty || sourceQty),
Width: toText(invoiceWidth || sourceWidth),
Height: toText(invoiceHeight || sourceHeight),
Rate: toText(invoiceRate || sourceRate),
description: toText(item.description || sourceDescription),
hsn: toText(item.hsnCode || sourceHsn),
media: toText(item.media || sourceMedia),
qty: toText(invoiceQty || sourceQty),
width: toText(invoiceWidth || sourceWidth),
height: toText(invoiceHeight || sourceHeight),
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

      InvoiceDescription: toText(item.description || sourceDescription),
      invoiceDescription: toText(item.description || sourceDescription),
      InvoiceMedia: toText(item.media || sourceMedia),
      invoiceMedia: toText(item.media || sourceMedia),
      InvoiceHsn: toText(item.hsnCode || sourceHsn),
      invoiceHsn: toText(item.hsnCode || sourceHsn),
      InvoiceQty: toText(invoiceQty),
      invoiceQty: toText(invoiceQty),
      InvoiceWidth: toText(invoiceWidth),
      invoiceWidth: toText(invoiceWidth),
      InvoiceHeight: toText(invoiceHeight),
      invoiceHeight: toText(invoiceHeight),
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

      DeliveryChallanNo: toText(fullSourceRow.DeliveryChallanNo || fullSourceRow.deliveryChallanNo),
      ImplementationChallanNo: toText(
        fullSourceRow.ImplementationChallanNo || fullSourceRow.implementationChallanNo
      ),

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

  const productionGroups = groupByKey(
    completeItems.filter(isDifferentProductionBillingLocation),
    "ProductionLocation"
  );

  const productionInvoices = Object.entries(productionGroups).map(([productionLocation, items]) => {
    const totals = calculateInvoiceTotals(items);

    return {
      InvoiceNo: "",
      InvoiceType: "ProductionToBilling",
      ParentInvoiceNo: data.invoiceNo || "",

      InvoiceDate: data.invoiceDate || "",
      JobCards: joinUnique(items.map((x) => x.JobNo)),
      ClientBillAs: data.clientName || previewPayload.billAsName,
      PoNo: data.poNumber || "",
      ProjectName: data.projectName || "",
      Region: joinUnique(items.map((x) => x.Region)),

      ProductionLocation: productionLocation,
      BillingLocation: items[0]?.BillingLocation || "",

      BillFromLocation: productionLocation,
      BillToLocation: items[0]?.BillingLocation || "",

      BillTo: mapInvoiceAddress(data.billTo),
      ShipTo: mapInvoiceAddress(data.shipTo),

      Items: items,
      ...totals,

      Notes: data.notes || "",
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
    InvoiceType: "BillingToCustomer",
    ParentInvoiceNo: "",

    InvoiceDate: data.invoiceDate || "",
    JobCards: data.jobCardNo || "",
    ClientBillAs: data.clientName || previewPayload.billAsName,
    PoNo: data.poNumber || "",
    ProjectName: data.projectName || "",
    Region: previewPayload.region || "",

    ProductionLocation: joinUnique(completeItems.map((x) => x.ProductionLocation)),
    BillingLocation: completeItems[0]?.BillingLocation || "",

    BillFromLocation: completeItems[0]?.BillingLocation || "",
    BillToLocation: "Customer",

    BillTo: mapInvoiceAddress(data.billTo),
    ShipTo: mapInvoiceAddress(data.shipTo),

    Items: completeItems,
    ...customerTotals,

    Notes: data.notes || "",
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
    Status: status,
    status,
    InvoiceStatus: status,
    invoiceStatus: status,
    IsFinal: status === "Final",
    isFinal: status === "Final",
    BillingLocation: completeItems[0]?.BillingLocation || "",
    CustomerInvoice: customerInvoice,
    ProductionInvoices: productionInvoices,
  };

  try {
    setIsSaving(true);

    const response = await axios.post(
      config.SalesInvoice.URL.SaveMultiLocationInvoice,
      savePayload,
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

    if (savedInvoiceNo) {
      setData((prev) => ({
        ...prev,
        invoiceNo: savedInvoiceNo,
      }));
    }
    const resolvedInvoiceNo = savedInvoiceNo || data.invoiceNo || previewPayload.invoiceNo;

    const nextPreviewPayload = addInvoiceNoToPreviewPayload(previewPayload, resolvedInvoiceNo);
    const invoiceNoForStatus = resolvedInvoiceNo;

    rememberInvoiceStatus(invoiceNoForStatus, status);

    if (status === "Draft") {
      localStorage.setItem(
        "invoiceDraftData",
        JSON.stringify({
          ...data,
          invoiceNo: resolvedInvoiceNo,
          status,
          savedAt: new Date().toISOString(),
        })
      );
    } else {
      localStorage.removeItem("invoiceDraftData");
    }
    localStorage.setItem("invoicePrintPreviewData", JSON.stringify(nextPreviewPayload));

    const productionNos = response?.data?.productionInvoiceNos || [];

    setMessage(
      `${status} customer invoice ${resolvedInvoiceNo || ""} saved successfully. Production invoices: ${
        productionNos.length ? productionNos.join(", ") : "-"
      }`
    );
  } catch (error) {
    console.error("Failed to save multi-location invoice", error);
    setMessage(
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
    localStorage.removeItem("invoiceDraftData");
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
    const previewPayload = buildInvoicePreviewPayload(data, jobCards, invoiceRows);
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

    localStorage.setItem(
      "invoicePrintPreviewData",
      JSON.stringify(addInvoiceNoToPreviewPayload(previewPayload, resolvedInvoiceNo))
    );

    if (!resolvedInvoiceNo) {
      setMessage("Print preview opened, but invoice number was not found. Please save the invoice or print from All Invoices.");
    }

    window.open(all_routes.invoiceprintpreview, "_blank");
  };

  return (
    <div className="page-wrapper">
      <div className="content container-fluid invoice-screen">
        <style>{`
          .invoice-screen {
            background: #f6f8fb;
            min-height: 100vh;
            padding: 16px 20px 32px;
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
          .invoice-meta-grid .form-label,
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
            grid-template-columns: minmax(260px, 1fr) auto auto;
            align-items: start;
            width: 100%;
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
            min-width: 1080px;
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
          .invoice-grid-table td:nth-child(6),
          .invoice-grid-table th:nth-child(7),
          .invoice-grid-table td:nth-child(7),
          .invoice-grid-table th:nth-child(8),
          .invoice-grid-table td:nth-child(8),
          .invoice-grid-table th:nth-child(9),
          .invoice-grid-table td:nth-child(9) {
            width: 120px;
          }
          .invoice-grid-table th:nth-child(10),
          .invoice-grid-table td:nth-child(10) {
            width: 130px;
          }
          .invoice-grid-table th {
            background: #eaf2ff;
            border: 1px solid #d5deea;
            color: #1f3f76;
            font-size: 12px;
            padding: 9px 10px;
            white-space: nowrap;
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
              grid-template-columns: minmax(220px, 1fr) auto auto;
              width: 100%;
            }
            .invoice-queue-actions .form-control {
              width: 100%;
            }
            .invoice-meta-grid,
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
              <div className="invoice-subtitle">Delivery done, implementation done, and challan-created jobs are loaded here</div>
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

        <section className="invoice-section">
          <div className="invoice-section-header">
            <div className="invoice-section-heading">
              <h5>Invoice Job Queue</h5>
              <div className="text-muted small">
                {isLoading
                  ? "Loading jobs..."
                  : queueJobFilterNos.length || data.selectedJobIds.length
                    ? `${visibleJobCards.length} shown from ${jobCards.length} invoice-ready job card(s)`
                    : `${jobCards.length} invoice-ready job card(s). Select Job No to show cards.`}
              </div>
            </div>
      <div className="invoice-queue-actions" style={{ minWidth: 420 }}>
  <Select
    isMulti
    isClearable
    isLoading={isLoading}
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
        ? selected.map((option) => option.value)
        : [];

      setQueueJobFilterNos(selectedCardIds);
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
              Loading delivery and implementation jobs...
            </div>
          ) : visibleJobCards.length ? (
            <div className="job-card-grid">
              {visibleJobCards.map((job) => {
                const checked = data.selectedJobIds.includes(job.id);
                return (
                  <label key={job.id} className={`job-picker-card ${checked ? "active" : ""}`}>
                    <div className="d-flex align-items-start gap-2">
                      <Form.Check
                        checked={checked}
                        onChange={(event) => {
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
                        <div className="text-muted small">{job.items.length} item(s)</div>
                        {job.challanNo ? <div className="small fw-semibold job-card-text">Challan: {job.challanNo}</div> : null}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <Alert variant="info" className="mb-0">
              {queueJobFilterNos.length
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
          <div className="invoice-meta-grid">
            <Form.Group>
              <Form.Label>Invoice No.</Form.Label>
              <Form.Control value={data.invoiceNo} onChange={(event) => updateMeta("invoiceNo", event.target.value)} placeholder="INV-001" />
            </Form.Group>
            <Form.Group>
              <Form.Label>Invoice Date</Form.Label>
              <Form.Control type="date" value={data.invoiceDate} onChange={(event) => updateMeta("invoiceDate", event.target.value)} />
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
              <Form.Control value={data.poNumber || ""} onChange={(event) => updateMeta("poNumber", event.target.value)} />
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
              <Form.Control value={data.projectName || ""} onChange={(event) => updateMeta("projectName", event.target.value)} />
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
              <Button size="sm" variant="outline-secondary" onClick={() => addItem("transportation")}>
                Transportation
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
                <th>Width</th>
                <th>Height</th>
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
                    <Form.Control type="number" min="0" step="0.01" value={item.width} onChange={(event) => updateItem(item.id, "width", event.target.value)} />
                  </td>
                  <td>
                    <Form.Control type="number" min="0" step="0.01" value={item.height} onChange={(event) => updateItem(item.id, "height", event.target.value)} />
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
                    <th>Size</th>
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
                      <td>{toNumber(item.width) || "-"} X {toNumber(item.height) || "-"}</td>
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
              <Form.Control as="textarea" rows={2} value={data.notes || ""} onChange={(event) => updateMeta("notes", event.target.value)} />
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

const buildDataForJobs = (prev, jobs) => ({
  ...prev,
  selectedJobIds: jobs.map((job) => job.id),
  billTo: jobs.map((job, index) => ({
    ...job.billTo,
    id: uid("address"),
    label: `Bill To ${index + 1} (${job.jobCardNo})`,
  })),
  shipTo: jobs.map((job, index) => ({
    ...job.shipTo,
    id: uid("address"),
    label: `Ship To ${index + 1} (${job.jobCardNo})`,
  })),
  items: jobs.flatMap((job) => job.items.map((item) => ({ ...item, id: uid("item"), selected: false }))),
  jobCardNo: jobs.map((job) => job.jobCardNo).join(", "),
  clientName: joinUnique(jobs.map((job) => job.clientName)),
});

const buildInvoicePreviewPayload = (data, jobCards, invoiceRows) => {
  const invoiceSubtotal = invoiceRows.reduce((sum, row) => sum + row.taxableValue, 0);
  const invoiceGstTotal = invoiceRows.reduce((sum, row) => sum + row.gstAmount, 0);
  const region = joinUnique(jobCards.filter((job) => data.selectedJobIds.includes(job.id)).map((job) => job.region));

  return {
    companyDetails: getCompanyBranchDetails(region),
    billAsName: data.clientName || data.billTo[0]?.name || "Sales Invoice",
    invoiceNo: data.invoiceNo,
    invoiceDate: data.invoiceDate,
    poNumber: data.poNumber || "",
    projectName: data.projectName || "",
    region,
    selectedJobNo: data.jobCardNo,
    gstRate: GST_RATE,
    invoiceRows,
    invoiceSubtotal,
    invoiceGstTotal,
    invoiceGrandTotal: invoiceSubtotal + invoiceGstTotal,
    billToList: data.billTo.map((address) => ({
      id: address.id,
      label: address.label,
      address: [address.name, address.address, address.gstNo ? `GST No: ${address.gstNo}` : ""].filter(Boolean).join("\n"),
    })),
    shipToList: data.shipTo.map((address) => ({
      id: address.id,
      label: address.label,
      address: [address.name, address.address, address.gstNo ? `GST No: ${address.gstNo}` : ""].filter(Boolean).join("\n"),
    })),
    notes: data.notes || "",
  };
};

export default InvoicePreviewBuilder; 
