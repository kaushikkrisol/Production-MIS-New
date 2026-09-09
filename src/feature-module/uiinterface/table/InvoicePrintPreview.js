import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import config from "../../../config";
import { Alert } from "react-bootstrap";
import { COMPANY_LOGO, getCompanyBranchDetails } from "./companyBranches";

const GST_RATE_FALLBACK = 18;

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

const toText = (value) => (value === undefined || value === null ? "" : String(value));

const toNumber = (value) => {
  const normalized =
    typeof value === "string" ? value.replace(/,/g, "").replace(/[^\d.-]/g, "") : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value) =>
  toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseFlexibleDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const dateValue = value?.$date || value;
  if (dateValue instanceof Date) return Number.isNaN(dateValue.getTime()) ? null : dateValue;

  const text = String(dateValue).trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const monthMatch = text.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{4})$/);
  if (monthMatch) {
    const [, day, monthText, year] = monthMatch;
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

const formatDate = (value) => {
  if (!value) return "-";

  const date = parseFlexibleDate(value);

  if (!date || Number.isNaN(date.getTime())) return toText(value) || "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const parseMaybeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed?.$values)) return parsed.$values;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const firstValue = (...values) => {
  for (const value of values) {
    const text = toText(value).trim();
    if (text && text !== "-") return text;
  }
  return "";
};

const normalizeCompanyLogo = (value) => {
  const logo = firstValue(value, COMPANY_LOGO);
  const logoPath = logo.split("?")[0].replace(/\\/g, "/").toLowerCase();

  if (logoPath.endsWith("/assets/img/comart.jpg") || logoPath === "assets/img/comart.jpg") {
    return COMPANY_LOGO;
  }

  return logo;
};

const normalizeDocumentTypeText = (value) =>
  toText(value)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

const getInvoiceDocumentType = (data) => {
  const typeText = normalizeDocumentTypeText(
    firstValue(
      data?._invoiceType,
      data?.InvoiceType,
      data?.invoiceType,
      data?.DocumentType,
      data?.documentType,
      data?.Status,
      data?.status,
      data?.InvoiceStatus,
      data?.invoiceStatus
    )
  ).toLowerCase();

  const hasExplicitCreditNoteReference = [
    data?.CreditNoteNo,
    data?.creditNoteNo,
    data?.CNNo,
    data?.cnNo,
    data?.DocumentNo,
    data?.documentNo,
  ].some((value) => {
    const normalized = normalizeDocumentTypeText(value).toLowerCase();
    return (
      normalized.includes("credit note") ||
      normalized.startsWith("cn") ||
      normalized.includes("cn no") ||
      normalized.includes("creditnote")
    );
  });

  if (
    typeText.includes("credit note") ||
    hasExplicitCreditNoteReference
  ) {
    return "Credit Note";
  }

  if (
    typeText.includes("internal invoice") ||
    typeText.includes("production to billing") ||
    typeText.includes("internal bill")
  ) {
    return "Internal Bill";
  }

  if (
    typeText.includes("invoice to customer") ||
    typeText.includes("invoicetocustomer") ||
    typeText.includes("billing to customer") ||
    typeText.includes("billingtocustomer")
  ) {
    return "Tax Invoice";
  }

  return "Tax Invoice";
};

const splitAddressLines = (value) =>
  toText(value)
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);

const extractGstNo = (value) => {
  const match = toText(value).match(/GST\s*(?:No\.?|IN)?\s*:?\s*([0-9A-Z]{15})/i);
  return match?.[1] || "";
};

const getCompanyPan = (companyDetails) => {
  const explicitPan = firstValue(companyDetails?.companyPan, companyDetails?.panNo, companyDetails?.PanNo);
  if (explicitPan) return explicitPan;

  const gstNo = firstValue(companyDetails?.companyGst, companyDetails?.gstNo, companyDetails?.GSTNo);
  return gstNo.length >= 12 ? gstNo.slice(2, 12) : "";
};

const firstArray = (...values) => {
  for (const value of values) {
    const parsed = parseMaybeArray(value);
    if (parsed.length) return parsed;
  }
  return [];
};

const parseMaybeObject = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const hasInvoiceHeaderSignal = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      firstValue(
        value?.InvoiceNo,
        value?.invoiceNo,
        value?.CustomerInvoiceNo,
        value?.customerInvoiceNo,
        value?.CreditNoteNo,
        value?.creditNoteNo,
        value?.CNNo,
        value?.cnNo,
        value?.DocumentNo,
        value?.documentNo,
        value?.ParentInvoiceNo,
        value?.parentInvoiceNo,
        value?.InvoiceType,
        value?.invoiceType,
        value?.JobCards,
        value?.jobCards,
        value?.ClientBillAs,
        value?.clientBillAs
      )
  );

const unwrapInvoiceData = (payload) => {
  const candidates = [
    payload?.CustomerInvoice,
    payload?.customerInvoice,
    payload?.invoice,
    payload?.Invoice,
    payload?.salesInvoice,
    payload?.SalesInvoice,
    payload?.data?.CustomerInvoice,
    payload?.data?.customerInvoice,
    payload?.data?.invoice,
    payload?.data?.Invoice,
    payload?.data?.salesInvoice,
    payload?.data?.SalesInvoice,
    payload?.data,
    payload?.result,
    payload?.message,
    payload,
  ];

  const directInvoice = candidates.find(hasInvoiceHeaderSignal);
  if (directInvoice) return directInvoice;

  const rows = firstArray(payload?.items, payload?.Items, payload?.data?.items, payload?.result, payload?.message);
  for (const row of rows) {
    const nestedInvoice = [
      row?.CustomerInvoice,
      row?.customerInvoice,
      row?.invoice,
      row?.Invoice,
      row?.salesInvoice,
      row?.SalesInvoice,
      row,
    ].find(hasInvoiceHeaderSignal);

    if (nestedInvoice) return nestedInvoice;
  }

  return payload || {};
};

const getInvoiceByNoUrl = (invoiceNo) => {
  const endpoint = config.SalesInvoice.URL.GetByInvoiceNo;
  return typeof endpoint === "function"
    ? endpoint(invoiceNo)
    : `${endpoint}/${encodeURIComponent(invoiceNo || "")}`;
};

const normalizeAddress = (entry, fallbackLabel) => {
  const rawAddress = firstValue(entry?.address, entry?.Address);
  const name = firstValue(
    entry?.name,
    entry?.Name,
    entry?.CustomerName,
    entry?.customerName,
    splitAddressLines(rawAddress)[0]
  );
  const gstNo = firstValue(entry?.gstNo, entry?.GstNo, entry?.GSTNo, extractGstNo(rawAddress));
  const addressLines = splitAddressLines(rawAddress).filter((line) => {
    const normalized = line.toLowerCase();
    return (
      line !== name &&
      !normalized.includes("gst no") &&
      !normalized.includes("gstin") &&
      !normalized.includes("pan :") &&
      !normalized.startsWith("pan:")
    );
  });

  return {
    label: firstValue(entry?.label, entry?.Label, entry?.Title, fallbackLabel),
    name,
    address: addressLines.join(", "),
    gstNo,
    phone: firstValue(entry?.phone, entry?.Phone, entry?.Mobile, entry?.mobile),
    placeOfSupply: firstValue(entry?.placeOfSupply, entry?.PlaceOfSupply, entry?.state, entry?.State),
  };
};

const normalizeTransportMode = (value) => {
  const rawMode = firstValue(value, "Road");
  return ["Road", "Train", "Air", "Ship"].find((mode) => mode.toLowerCase() === rawMode.toLowerCase()) || rawMode;
};

const normalizeEwayBillDetails = (data = {}) => {
  const ewayBill = parseMaybeObject(
    data.ewayBill ||
    data.EwayBill ||
    data.EWayBill ||
    data.EwayBillDetails ||
    data.EWayBillDetails ||
    {}
  );

  return {
    transporterName: firstValue(
      ewayBill.transporterName,
      ewayBill.TransporterName,
      data.transporterName,
      data.TransporterName,
      data.TransportName,
      data.transport,
      data.Transport
    ),
    transportMode: normalizeTransportMode(
      firstValue(
        ewayBill.transportMode,
        ewayBill.TransportMode,
        ewayBill.modeOfTransportation,
        ewayBill.ModeOfTransportation,
        data.transportMode,
        data.TransportMode,
        data.modeOfTransportation,
        data.ModeOfTransportation
      )
    ),
    transportDistanceKm: firstValue(
      ewayBill.transportDistanceKm,
      ewayBill.TransportDistanceKm,
      ewayBill.TransportationDistanceKm,
      ewayBill.distanceOfTransportation,
      ewayBill.DistanceOfTransportation,
      data.transportDistanceKm,
      data.TransportDistanceKm,
      data.TransportationDistanceKm,
      data.distanceOfTransportation,
      data.DistanceOfTransportation
    ),
    vehicleNo: firstValue(ewayBill.vehicleNo, ewayBill.VehicleNo, data.vehicleNo, data.VehicleNo),
    transporterGstNo: firstValue(
      ewayBill.transporterGstNo,
      ewayBill.TransporterGstNo,
      ewayBill.TransporterGSTNo,
      data.transporterGstNo,
      data.TransporterGstNo,
      data.TransporterGSTNo,
      data.transportId,
      data.TransportId
    ),
  };
};

const normalizeStateText = (value) =>
  toText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getStateCodeFromGst = (value) => {
  const match = firstValue(value).match(/^([0-9]{2})[0-9A-Z]{13}$/i);
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

const getRowAmount = (item) => {
  const savedAmount = toNumber(
    item?.manualAmount ||
      item?.ManualAmount ||
      item?.taxableValue ||
      item?.TaxableValue ||
      item?.InvoiceAmount ||
      item?.invoiceAmount ||
      item?.InvoiceTaxableValue ||
      item?.invoiceTaxableValue ||
      item?.Amount ||
      item?.amount ||
      item?.TaxableAmount ||
      item?.taxableAmount
  );
  if (savedAmount) return savedAmount;

  const qty = toNumber(item?.qty || item?.Qty || item?.InvoiceQty || item?.invoiceQty || item?.Quantity || item?.quantity) || 1;
  const width = toNumber(item?.width || item?.Width || item?.InvoiceWidth || item?.invoiceWidth);
  const height = toNumber(item?.height || item?.Height || item?.InvoiceHeight || item?.invoiceHeight || item?.Length || item?.length);
  const rate = toNumber(item?.rate || item?.Rate || item?.InvoiceRate || item?.invoiceRate);
  const totalSqFt = toNumber(item?.InvoiceTotalSqFt || item?.invoiceTotalSqFt || item?.TotalSqFt || item?.totalSqFt || item?.sqFt || item?.SqFt);
  const sqft = totalSqFt || (width && height ? (width * height * qty) / 144 : 0);

  return sqft ? sqft * rate : qty * rate;
};

const normalizeInvoiceRow = (item, index, dataGstRate, invoiceData) => {
  const taxableValue = getRowAmount(item);
  const gstRate = toNumber(item?.gstRate || item?.GstRate || item?.GSTPercent || item?.gstPercent || dataGstRate);
  const gstAmount = toNumber(item?.gstAmount || item?.GstAmount) || (taxableValue * gstRate) / 100;
  const lineTotal =
    toNumber(item?.lineTotal || item?.LineTotal || item?.TotalAmount || item?.totalAmount) ||
    taxableValue + gstAmount;

  return {
    key: item?.id || item?.Id || item?.key || index + 1,
    sno: item?.sno || item?.SNo || index + 1,
    type: firstValue(item?.type, item?.Type, item?.lineType),
    jobNo: firstValue(item?.jobNo, item?.JobNo, invoiceData?._jobCards, invoiceData?.JobCards, invoiceData?.jobCards),
    description: firstValue(
      item?.InvoiceDescription,
      item?.invoiceDescription,
      item?.description,
      item?.Description,
      item?.NameSubCode,
      item?.nameSubCode,
      item?.InvoiceMedia,
      item?.invoiceMedia,
      item?.media,
      item?.Media,
      "Service"
    ),
    media: firstValue(item?.InvoiceMedia, item?.invoiceMedia, item?.media, item?.Media),
    hsnCode: firstValue(item?.InvoiceHsn, item?.invoiceHsn, item?.hsnCode, item?.HsnCode, item?.HSNCode, item?.Hsn, item?.hsn),
    qty: firstValue(item?.InvoiceQty, item?.invoiceQty, item?.qty, item?.Qty, item?.Quantity, item?.quantity, "1"),
    width: firstValue(item?.InvoiceBillingWidth, item?.invoiceBillingWidth, item?.InvoiceWidth, item?.invoiceWidth, item?.width, item?.Width),
    height: firstValue(item?.InvoiceBillingHeight, item?.invoiceBillingHeight, item?.InvoiceHeight, item?.invoiceHeight, item?.height, item?.Height, item?.Length, item?.length),
    rate: toNumber(item?.InvoiceRate || item?.invoiceRate || item?.rate || item?.Rate),
    taxableValue,
    gstRate,
    gstAmount,
    lineTotal,
  };
};

const ones = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

const twoDigitWords = (number) => {
  if (number < 20) return ones[number];
  return [tens[Math.floor(number / 10)], ones[number % 10]].filter(Boolean).join(" ");
};

const threeDigitWords = (number) => {
  const hundred = Math.floor(number / 100);
  const rest = number % 100;
  return [hundred ? `${ones[hundred]} hundred` : "", rest ? twoDigitWords(rest) : ""]
    .filter(Boolean)
    .join(" and ");
};

const amountInWords = (amount) => {
  let number = Math.round(toNumber(amount));
  if (!number) return "ZERO RUPEES ONLY";

  const parts = [];
  const crore = Math.floor(number / 10000000);
  number %= 10000000;
  const lakh = Math.floor(number / 100000);
  number %= 100000;
  const thousand = Math.floor(number / 1000);
  number %= 1000;

  if (crore) parts.push(`${threeDigitWords(crore)} crore`);
  if (lakh) parts.push(`${threeDigitWords(lakh)} lakh`);
  if (thousand) parts.push(`${threeDigitWords(thousand)} thousand`);
  if (number) parts.push(threeDigitWords(number));

  return `${parts.join(" ")} rupees only`.toUpperCase();
};

const normalizeInvoiceData = (payload) => {
  const data = unwrapInvoiceData(payload);
  const gstRate = toNumber(data?.gstRate || data?.GstRate || data?.GST_RATE || GST_RATE_FALLBACK);
  const backendItems = firstArray(
    data?._items,
    data?.Items,
    data?.items,
    data?.InvoiceItems,
    data?.invoiceItems,
    data?.SalesInvoiceItems,
    data?.salesInvoiceItems
  );
  const localRows = firstArray(data?.invoiceRows, data?.InvoiceRows);
  const rawRows = backendItems.length ? backendItems : localRows;
  const invoiceRows = rawRows.map((item, index) => normalizeInvoiceRow(item, index, gstRate, data));
  const calculatedSubtotal = invoiceRows.reduce((sum, row) => sum + toNumber(row.taxableValue), 0);
  const calculatedGstTotal = invoiceRows.reduce((sum, row) => sum + toNumber(row.gstAmount), 0);
  const calculatedGrandTotal = invoiceRows.reduce((sum, row) => sum + toNumber(row.lineTotal), 0);
  const region = firstValue(
    // A saved invoice branch must override a legacy/general Region value.
    data?.BillFromLocation,
    data?.billFromLocation,
    data?._region,
    data?.Region,
    data?.region,
    data?._billingLocation,
    data?.BillingLocation,
    data?.billingLocation,
    data?._productionLocation,
    data?.ProductionLocation,
    data?.productionLocation
  );
  const branchDetails = getCompanyBranchDetails(region);
  const companyLogo = normalizeCompanyLogo(
    firstValue(
      data?.companyDetails?.companyLogo,
      data?.CompanyLogo,
      data?.companyLogo,
      branchDetails.companyLogo,
      COMPANY_LOGO
    )
  );
  const companyDetails = {
    companyName: firstValue(
      data?.BillFromCompanyName,
      data?.billFromCompanyName,
      data?.companyDetails?.companyName,
      data?.CompanyName,
      data?.companyName,
      branchDetails.companyName,
      "Commercial Reprographers"
    ),
    companyAddress: firstValue(
      data?.BillFromCompanyAddress,
      data?.billFromCompanyAddress,
      data?.companyDetails?.companyAddress,
      data?.CompanyAddress,
      data?.companyAddress,
      branchDetails.companyAddress
    ),
    companyPhone: firstValue(data?.companyDetails?.companyPhone, data?.CompanyPhone, data?.companyPhone, branchDetails.companyPhone),
    companyGst: firstValue(data?.BillFromCompanyGst, data?.billFromCompanyGst, data?.companyDetails?.companyGst, data?.CompanyGst, data?.companyGst, branchDetails.companyGst),
    companyLogo,
    companyPan: firstValue(data?.companyDetails?.companyPan, data?.CompanyPan, data?.companyPan),
  };

  const invoiceType = getInvoiceDocumentType(data);
  const internalBillToLocation = firstValue(
    data?.BillToLocation,
    data?.billToLocation,
    data?.BillingLocation,
    data?.billingLocation
  );
  const internalBillToBranchDetails = getCompanyBranchDetails(internalBillToLocation || region);

  const billToList = firstArray(data?._billTo, data?.BillTo, data?.billTo, data?.billToList).map((entry) =>
    normalizeAddress(entry, "Customer Detail")
  );
  const rawShipToList = firstArray(data?._shipTo, data?.ShipTo, data?.shipTo, data?.shipToList).map((entry) =>
    normalizeAddress(entry, "Ship To")
  );
  const internalBillToList =
    invoiceType === "Internal Bill"
      ? [
          {
            label: "Customer Detail",
            name: firstValue(
              data?.BillToCompanyName,
              data?.billToCompanyName,
              internalBillToBranchDetails.companyName
            ),
            address: firstValue(
              data?.BillToCompanyAddress,
              data?.billToCompanyAddress,
              internalBillToBranchDetails.companyAddress
            ),
            gstNo: firstValue(
              data?.BillToCompanyGst,
              data?.billToCompanyGst,
              internalBillToBranchDetails.companyGst
            ),
            phone: firstValue(
              data?.BillToCompanyPhone,
              data?.billToCompanyPhone,
              internalBillToBranchDetails.companyPhone
            ),
            placeOfSupply: firstValue(internalBillToLocation, data?.BillingLocation, data?.billingLocation, region),
          },
        ]
      : [];
  const bankDetails = data?.bankDetails || data?.BankDetails || {};
  const invoiceSubtotal = toNumber(data?.SubTotal || data?.subTotal || data?.invoiceSubtotal) || calculatedSubtotal;
  const invoiceGstTotal = toNumber(data?.GstTotal || data?.gstTotal || data?.invoiceGstTotal) || calculatedGstTotal;
  const invoiceGrandTotal =
    toNumber(data?._grandTotal || data?.GrandTotal || data?.grandTotal || data?.invoiceGrandTotal) ||
    calculatedGrandTotal ||
    invoiceSubtotal + invoiceGstTotal;
  
  const shipToSource =
    invoiceType === "Tax Invoice"
      ? rawShipToList.length
        ? rawShipToList
        : billToList
      : internalBillToList.length
        ? internalBillToList
        : rawShipToList.length
          ? rawShipToList
          : billToList;
  const shipToList = shipToSource.map((entry, index) => ({
    ...entry,
    label: entry.label || `Ship To ${index + 1}`,
  }));
  const isCreditNote = invoiceType.toLowerCase() === "credit note";
  const ewayBill = normalizeEwayBillDetails(data);

  return {
    companyDetails,
    companyPan: getCompanyPan(companyDetails),
    billAsName: firstValue(data?._client, data?.ClientBillAs, data?.clientBillAs, data?.billAsName, data?.clientName, billToList[0]?.name, "Sales Invoice"),
    invoiceType,
    isCreditNote,
    invoiceNo: firstValue(
      data?.InvoiceNo,
      data?.invoiceNo,
      data?.CustomerInvoiceNo,
      data?.customerInvoiceNo,
      data?.CreditNoteNo,
      data?.creditNoteNo,
      data?.CNNo,
      data?.cnNo,
      data?.DocumentNo,
      data?.documentNo,
      data?._invoiceNo
    ),
    parentInvoiceNo: firstValue(
      data?.ParentInvoiceNo,
      data?.parentInvoiceNo,
      data?.OriginalInvoiceNo,
      data?.originalInvoiceNo,
      data?.AgainstInvoiceNo,
      data?.againstInvoiceNo,
      data?.RefInvoiceNo,
      data?.refInvoiceNo
    ),
    invoiceDate: formatDate(data?._invoiceDate || data?.InvoiceDate || data?.invoiceDate),
    itrNo: firstValue(data?.ItrNo, data?.ITRNo, data?.itrNo, data?.ITR, data?.itr, data?._itrNo),
    poNumber: firstValue(data?.PoNo, data?.poNo, data?.PONo, data?.poNumber, data?.PoNumber, data?.PONumber),
    projectName: firstValue(data?._project, data?.ProjectName, data?.projectName),
    region: firstValue(region, data?.productionLocation, data?.ProductionLocation, data?.billingLocation, data?.BillingLocation),
    selectedJobNo: firstValue(data?._jobCards, data?.JobCards, data?.jobCards, data?.selectedJobNo, data?.jobCardNo),
    challanNo: firstValue(
      data?.ChallanNo,
      data?.challanNo,
      data?.DeliveryChallanNo,
      data?.deliveryChallanNo,
      data?.items?.[0]?.challanNo,
      data?.items?.[0]?.ChallanNo,
      data?.items?.[0]?.deliveryChallanNo,
      data?.items?.[0]?.DeliveryChallanNo,
      data?.items?.[0]?.implementationChallanNo,
      data?.items?.[0]?.ImplementationChallanNo
    ),
    challanDate: formatDate(
      firstValue(
        data?.ChallanDate,
        data?.challanDate,
        data?.items?.[0]?.challanDate,
        data?.items?.[0]?.ChallanDate,
        data?.items?.[0]?.deliveryChallanDate,
        data?.items?.[0]?.DeliveryChallanDate,
        data?.items?.[0]?.implementationChallanDate,
        data?.items?.[0]?.ImplementationChallanDate
      )
    ),
    transporterName: ewayBill.transporterName,
    transportMode: ewayBill.transportMode,
    transportDistanceKm: ewayBill.transportDistanceKm,
    vehicleNo: ewayBill.vehicleNo,
    transporterGstNo: ewayBill.transporterGstNo,
    gstRate,
    invoiceRows,
    invoiceSubtotal,
    invoiceGstTotal,
    invoiceGrandTotal,
    billToList: internalBillToList.length ? internalBillToList : billToList,
    shipToList,
    notes: firstValue(data?.Notes, data?.notes),
    bankDetails: {
      bankName: firstValue(bankDetails?.bankName, bankDetails?.BankName, data?.BankName, data?.bankName, branchDetails.bankDetails?.bankName, branchDetails.bankName),
      branch: firstValue(bankDetails?.branch, bankDetails?.Branch, data?.BankBranch, data?.bankBranch, branchDetails.bankDetails?.branch, branchDetails.bankBranch),
      accountNo: firstValue(bankDetails?.accountNo, bankDetails?.AccountNo, data?.AccountNo, data?.accountNo, branchDetails.bankDetails?.accountNo, branchDetails.accountNo),
      ifsc: firstValue(bankDetails?.ifsc, bankDetails?.IFSC, data?.IFSC, data?.ifsc, branchDetails.bankDetails?.ifsc, branchDetails.ifsc),
      upiId: firstValue(bankDetails?.upiId, bankDetails?.UPIId, data?.UPIId, data?.upiId, branchDetails.bankDetails?.upiId, branchDetails.upiId),
    },
  };
};

const readStoredPreviewData = (storageKey) => {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to parse ${storageKey}`, error);
    return null;
  }
};

const DataRow = ({ label, value }) => (
  <tr>
    <th>{label}</th>
    <td>{value || "-"}</td>
  </tr>
);

const InvoicePrintPreview = () => {
  const { invoiceNo: routeInvoiceNo } = useParams();
  const [apiInvoice, setApiInvoice] = useState(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(Boolean(routeInvoiceNo));
  const [loadError, setLoadError] = useState("");
  const [previewRevision, setPreviewRevision] = useState(0);

  useEffect(() => {
    const handlePreviewUpdate = (event) => {
      if (event.key === "invoicePrintPreviewData") {
        setPreviewRevision((revision) => revision + 1);
      }
    };

    window.addEventListener("storage", handlePreviewUpdate);
    return () => window.removeEventListener("storage", handlePreviewUpdate);
  }, []);

  useEffect(() => {
    const invoiceNo = String(routeInvoiceNo || "").trim();
    if (!invoiceNo) return;

    let isMounted = true;
    setIsLoadingInvoice(true);
    setLoadError("");

    axios
      .get(getInvoiceByNoUrl(invoiceNo))
      .then((response) => {
        if (!isMounted) return;
        setApiInvoice(response.data);
        const storedPreview = readStoredPreviewData("invoicePrintPreviewData");
        const storedPreviewInvoiceNo = String(
          storedPreview?.invoiceNo ||
            storedPreview?.InvoiceNo ||
            storedPreview?.CustomerInvoiceNo ||
            storedPreview?.customerInvoiceNo ||
            storedPreview?._invoiceNo ||
            ""
        ).trim();

        if (!storedPreviewInvoiceNo || storedPreviewInvoiceNo !== invoiceNo) {
          localStorage.setItem("invoicePrintPreviewData", JSON.stringify(response.data));
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("Failed to load invoice for print", error);
        setLoadError(error?.response?.data?.message || error?.message || "Failed to load invoice for print.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingInvoice(false);
      });

    return () => {
      isMounted = false;
    };
  }, [routeInvoiceNo]);

  const previewData = useMemo(() => {
    const readPreview = (storageKey) => {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;

      try {
        return normalizeInvoiceData(JSON.parse(raw));
      } catch (error) {
        console.error(`Failed to parse ${storageKey}`, error);
        return null;
      }
    };

    const primaryPreview = readPreview("invoicePrintPreviewData");
    const normalizedRouteInvoiceNo = String(routeInvoiceNo || "").trim();
    const localPreviewMatchesRoute =
      primaryPreview &&
      (!normalizedRouteInvoiceNo ||
        String(primaryPreview.invoiceNo || "").trim() === normalizedRouteInvoiceNo);

    if (localPreviewMatchesRoute) return primaryPreview;

    if (apiInvoice) return normalizeInvoiceData(apiInvoice);

    if (primaryPreview) return primaryPreview;

    return readPreview("invoiceDraftData");
  }, [apiInvoice, previewRevision, routeInvoiceNo]);

  if (isLoadingInvoice && !previewData) {
    return (
      <div className="classic-invoice-page">
        <Alert variant="info">Loading invoice...</Alert>
      </div>
    );
  }

  if (loadError && !previewData) {
    return (
      <div className="classic-invoice-page">
        <Alert variant="danger">{loadError}</Alert>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="classic-invoice-page">
        <Alert variant="warning">No bill preview data found.</Alert>
      </div>
    );
  }

  const {
    companyDetails,
    companyPan,
    billAsName,
    invoiceType,
    isCreditNote,
    invoiceNo,
    parentInvoiceNo,
    invoiceDate,
    itrNo,
    poNumber,
    projectName,
    region,
    selectedJobNo,
    challanNo,
    challanDate,
    transporterName,
    transportMode,
    transportDistanceKm,
    vehicleNo,
    transporterGstNo,
    invoiceRows = [],
    invoiceSubtotal,
    invoiceGstTotal,
    invoiceGrandTotal,
    billToList = [],
    shipToList = [],
    notes,
    bankDetails,
  } = previewData;
  const customer = billToList[0] || {};
  const shipTo = shipToList[0] || {};
  const companyStateCode = getStateCode({
    gstNo: companyDetails.companyGst,
    address: companyDetails.companyAddress,
  });
  const customerStateCode = getStateCode({
    gstNo: firstValue(customer.gstNo, shipTo.gstNo),
    address: firstValue(customer.address, shipTo.address),
    placeOfSupply: firstValue(customer.placeOfSupply, shipTo.placeOfSupply),
  });
  const useSplitGst = Boolean(companyStateCode && customerStateCode && companyStateCode === customerStateCode);
  const isInterStateInvoice = Boolean(companyStateCode && customerStateCode && companyStateCode !== customerStateCode);
  const ewayBillRequired = isInterStateInvoice || invoiceGrandTotal > 50000;
  const hasEwayBillDetails =
    [transporterName, transportDistanceKm, vehicleNo, transporterGstNo].some((value) => firstValue(value)) ||
    (firstValue(transportMode) && transportMode !== "Road");
  const taxColumnCount = useSplitGst ? 11 : 9;
  const splitGstTotal = invoiceGstTotal / 2;
  const documentTitle = invoiceType || (isCreditNote ? "Credit Note" : "Tax Invoice");
  const documentNoun = isCreditNote ? "Credit Note" : "Invoice";
  const documentServiceLine = isCreditNote
    ? "Credit note for production and supply services"
    : "Tax invoice for production and supply services";

  return (
    <div className="classic-invoice-page">
      <style>{`
        .classic-invoice-page {
          background: #eef1f5;
          min-height: 100vh;
          padding: 20px 12px 36px;
          color: #000;
        }
        .classic-invoice-toolbar {
          max-width: 210mm;
          margin: 0 auto 12px;
          text-align: right;
        }
        .classic-invoice-toolbar button {
          border: 0;
          background: #0f766e;
          color: #fff;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 4px;
        }
        .classic-invoice-canvas {
          overflow-x: auto;
        }
        .classic-invoice-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #333;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          line-height: 1.25;
        }
        .classic-invoice-sheet table {
          width: 100%;
          border-collapse: collapse;
        }
        .classic-invoice-sheet th,
        .classic-invoice-sheet td {
          border: 1px solid #555;
          padding: 4px 5px;
          vertical-align: top;
        }
        .classic-company-header {
          display: grid;
          grid-template-columns: 1fr 168px;
          gap: 10px;
          align-items: center;
          padding: 12px 16px 8px;
        }
        .classic-company-name {
          margin: 0 0 3px;
          color: #20265d;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 26px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        .classic-company-strip {
          display: inline-block;
          min-width: 385px;
          margin-bottom: 5px;
          background: #009a9a;
          color: #fff;
          font-weight: 800;
          padding: 4px 12px;
        }
        .classic-company-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .classic-company-logo {
          width: 156px;
          max-width: 156px;
          max-height: 52px;
          object-fit: contain;
          justify-self: end;
        }
        .classic-title-strip {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          align-items: center;
          border-top: 1px solid #555;
          border-bottom: 1px solid #555;
        }
        .classic-title-strip > div {
          padding: 5px 8px;
        }
        .classic-title-main {
          border-left: 1px solid #555;
          border-right: 1px solid #555;
          text-align: center;
          font-size: 16px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .classic-recipient-copy {
          text-align: right;
          font-size: 8px;
          font-weight: 800;
        }
        .classic-details-grid {
          display: grid;
          grid-template-columns: 38% 32% 30%;
          border-bottom: 1px solid #555;
        }
        .classic-details-grid table th,
        .classic-details-grid table td {
          border-width: 0 0 1px 0;
        }
        .classic-details-grid table tr:last-child th,
        .classic-details-grid table tr:last-child td {
          border-bottom: 0;
        }
        .classic-detail-panel + .classic-detail-panel {
          border-left: 1px solid #555;
        }
        .classic-detail-panel-title {
          text-align: center;
          font-weight: 800;
          border-bottom: 1px solid #555;
          background: #f5f5f5;
          padding: 3px;
        }
        .classic-detail-panel th {
          width: 82px;
          font-size: 8px;
          font-weight: 800;
        }
        .classic-detail-panel td {
          word-break: break-word;
        }
        .classic-eway-section {
          border-bottom: 1px solid #555;
        }
        .classic-eway-section table th {
          width: 118px;
          font-size: 8px;
          font-weight: 800;
          background: #f7f7f7;
        }
        .classic-eway-section table td {
          word-break: break-word;
        }
        .classic-items th {
          text-align: center;
          font-size: 8px;
          font-weight: 900;
          background: #f7f7f7;
        }
        .classic-items td {
          height: 22px;
        }
        .classic-items .classic-description {
          min-width: 185px;
        }
        .classic-items .classic-number {
          text-align: right;
          white-space: nowrap;
        }
        .classic-items .classic-center {
          text-align: center;
        }
        .classic-total-row td {
          height: auto;
          font-weight: 800;
          background: #fbfbfb;
        }
        .classic-bottom-grid {
          display: grid;
          grid-template-columns: 62% 38%;
        }
        .classic-bottom-grid > div {
          min-height: 145px;
        }
        .classic-bottom-grid > div + div {
          border-left: 1px solid #555;
        }
        .classic-section-title {
          text-align: center;
          font-weight: 900;
          background: #f5f5f5;
          border-bottom: 1px solid #555;
          padding: 3px 5px;
        }
        .classic-amount-words {
          display: grid;
          grid-template-columns: 118px 1fr;
          border-bottom: 1px solid #555;
        }
        .classic-amount-words div {
          padding: 5px;
        }
        .classic-amount-words div:first-child {
          border-right: 1px solid #555;
          font-weight: 900;
          text-align: center;
        }
        .classic-bank-grid {
          display: grid;
          grid-template-columns: 1fr;
          min-height: 132px;
        }
        .classic-bank-ship-row {
          display: grid;
          grid-template-columns: 62% 38%;
          min-height: 132px;
        }
        .classic-bank-details {
          padding-bottom: 5px;
        }
        .classic-bank-ship-row .classic-bank-details {
          border-right: 1px solid #555;
          padding-bottom: 0;
        }
        .classic-bank-details table th,
        .classic-bank-details table td {
          border: 0;
          padding: 4px 8px;
        }
        .classic-bank-details table th {
          width: 100px;
          font-weight: 400;
        }
        .classic-ship-panel {
          display: grid;
          grid-template-rows: 1fr auto;
          min-height: 132px;
        }
        .classic-ship-panel-body {
          padding: 6px;
        }
        .classic-ship-panel-signature {
          border-top: 1px solid #555;
          text-align: center;
          padding: 4px;
          font-weight: 800;
          font-size: 8px;
        }
        .classic-tax-summary table th,
        .classic-tax-summary table td {
          padding: 5px 8px;
        }
        .classic-tax-summary table th {
          width: 58%;
          font-weight: 800;
        }
        .classic-tax-summary table td {
          text-align: right;
          white-space: nowrap;
        }
        .classic-tax-summary .classic-grand th,
        .classic-tax-summary .classic-grand td {
          font-size: 12px;
          font-weight: 900;
        }
        .classic-declaration {
          min-height: 84px;
          display: grid;
          grid-template-rows: auto 1fr auto;
          border-top: 1px solid #555;
          text-align: center;
        }
        .classic-declaration-text {
          padding: 6px 8px;
          font-size: 8px;
        }
        .classic-signature-company {
          font-weight: 900;
          padding: 4px 8px;
        }
        .classic-signature-label {
          border-top: 1px solid #555;
          padding: 4px 8px;
          font-size: 8px;
          font-weight: 800;
        }
        .classic-terms-sign {
          border-top: 1px solid #555;
        }
        .classic-terms {
          min-height: 82px;
        }
        .classic-terms ul {
          margin: 4px 8px 4px 18px;
          padding: 0;
        }
        .classic-footer-note {
          padding: 7px 8px;
          border-top: 1px solid #555;
        }
        @media (max-width: 900px) {
          .classic-invoice-toolbar,
          .classic-invoice-sheet {
            margin-left: 0;
            margin-right: 0;
          }
        }
        @media print {
          body {
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .classic-invoice-page {
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
          }
          .classic-invoice-canvas {
            overflow: visible !important;
          }
          .classic-invoice-sheet {
            width: 100%;
            min-height: auto;
            margin: 0;
            border: 1px solid #000;
            box-shadow: none;
            page-break-after: avoid;
          }
          .classic-invoice-sheet th,
          .classic-invoice-sheet td,
          .classic-title-strip,
          .classic-details-grid,
          .classic-eway-section,
          .classic-bottom-grid > div + div,
          .classic-amount-words,
          .classic-amount-words div:first-child,
          .classic-declaration,
          .classic-signature-label,
          .classic-terms-sign,
          .classic-terms,
          .classic-footer-note {
            border-color: #000 !important;
          }
          @page {
            size: A4 portrait;
            margin: 7mm;
          }
        }
      `}</style>

      <div className="classic-invoice-toolbar no-print">
        <button type="button" onClick={() => window.print()}>
          Print {documentNoun}
        </button>
      </div>

      <div className="classic-invoice-canvas">
        <section className="classic-invoice-sheet">
          <header className="classic-company-header">
            <div>
              <h1 className="classic-company-name">{companyDetails.companyName}</h1>
              <div className="classic-company-strip">{documentServiceLine}</div>
              <div className="classic-company-meta">
                <div>{companyDetails.companyAddress || "-"}</div>
                <div>
                  <div>Tel: {companyDetails.companyPhone || "-"}</div>
                  <div>GSTIN: {companyDetails.companyGst || "-"}</div>
                </div>
              </div>
            </div>
            {companyDetails.companyLogo ? (
              <img className="classic-company-logo" src={companyDetails.companyLogo} alt="Company logo" />
            ) : null}
          </header>

          <div className="classic-title-strip">
            <div>
              <strong>PAN :</strong> {companyPan || "-"}
            </div>
            <div className="classic-title-main">{documentTitle}</div>
            <div className="classic-recipient-copy">ORIGINAL FOR RECIPIENT</div>
          </div>

          <section className="classic-details-grid">
            <div className="classic-detail-panel">
              <div className="classic-detail-panel-title">Customer Detail</div>
              <table>
                <tbody>
                  <DataRow label="M/S" value={customer.name || billAsName} />
                  <DataRow label="Address" value={customer.address} />
                  <DataRow label="Phone" value={customer.phone} />
                  <DataRow label="GSTIN" value={customer.gstNo} />
                  <DataRow label="Place of Supply" value={customer.placeOfSupply || region} />
                </tbody>
              </table>
            </div>

            <div className="classic-detail-panel">
              <table>
                <tbody>
                  <DataRow label={`${documentNoun} No.`} value={invoiceNo} />
                  {isCreditNote ? (
                    <DataRow label="Original Invoice No." value={parentInvoiceNo} />
                  ) : (
                    <DataRow label="Challan No" value={challanNo} />
                  )}
                  <DataRow label="ITR" value={itrNo} />
                  <DataRow label="Transporter" value={transporterName} />
                  <DataRow label="Vehicle No." value={vehicleNo} />
                </tbody>
              </table>
            </div>

            <div className="classic-detail-panel">
              <table>
                <tbody>
                  <DataRow label={`${documentNoun} Date`} value={invoiceDate} />
                  <DataRow label="Challan Date" value={challanDate === "-" ? "" : challanDate} />
                  <DataRow label="PO No." value={poNumber} />
                  <DataRow label="Job No." value={selectedJobNo} />
                  <DataRow label="Region" value={region} />
                </tbody>
              </table>
            </div>
          </section>

          {(ewayBillRequired || hasEwayBillDetails) ? (
            <section className="classic-eway-section">
              <div className="classic-section-title">
                Eway Bill Details{ewayBillRequired ? " (Compulsory)" : ""}
              </div>
              <table>
                <tbody>
                  <tr>
                    <th>Transporter name</th>
                    <td>{transporterName || "-"}</td>
                    <th>Mode</th>
                    <td>{transportMode || "-"}</td>
                    <th>Distance (km)</th>
                    <td>{transportDistanceKm || "-"}</td>
                  </tr>
                  <tr>
                    <th>Vehicle no</th>
                    <td>{vehicleNo || "-"}</td>
                    <th>Transporter GstNo</th>
                    <td>{transporterGstNo || "-"}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </section>
          ) : null}

          <table className="classic-items">
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: 28 }}>Sr. No.</th>
                <th rowSpan={2} className="classic-description">Name of Product / Service</th>
                <th rowSpan={2} style={{ width: 72 }}>HSN / SAC</th>
                <th rowSpan={2} style={{ width: 48 }}>Qty</th>
                <th rowSpan={2} style={{ width: 72 }}>Rate</th>
                <th rowSpan={2} style={{ width: 88 }}>Taxable Value</th>
                {useSplitGst ? (
                  <>
                    <th colSpan={2}>CGST</th>
                    <th colSpan={2}>SGST</th>
                  </>
                ) : (
                  <th colSpan={2}>IGST</th>
                )}
                <th rowSpan={2} style={{ width: 88 }}>Total</th>
              </tr>
              <tr>
                <th style={{ width: 42 }}>%</th>
                <th style={{ width: 78 }}>Amount</th>
                {useSplitGst ? (
                  <>
                    <th style={{ width: 42 }}>%</th>
                    <th style={{ width: 78 }}>Amount</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {invoiceRows.length ? (
                invoiceRows.map((row) => {
                  const splitRowRate = row.gstRate / 2;
                  const splitRowAmount = row.gstAmount / 2;

                  return (
                    <tr key={row.key}>
                      <td className="classic-center">{row.sno}</td>
                      <td>
                        <strong>{row.description || "-"}</strong>
                        {row.media ? <div>{row.media}</div> : null}
                        {row.jobNo ? <div>Job No: {row.jobNo}</div> : null}
                        {row.width || row.height ? <div>Size: {row.width || "-"} x {row.height || "-"}</div> : null}
                      </td>
                      <td className="classic-center">{row.hsnCode || "-"}</td>
                      <td className="classic-center">{row.qty || "-"}</td>
                      <td className="classic-number">{formatAmount(row.rate)}</td>
                      <td className="classic-number">{formatAmount(row.taxableValue)}</td>
                      {useSplitGst ? (
                        <>
                          <td className="classic-center">{formatAmount(splitRowRate)}</td>
                          <td className="classic-number">{formatAmount(splitRowAmount)}</td>
                          <td className="classic-center">{formatAmount(splitRowRate)}</td>
                          <td className="classic-number">{formatAmount(splitRowAmount)}</td>
                        </>
                      ) : (
                        <>
                          <td className="classic-center">{formatAmount(row.gstRate)}</td>
                          <td className="classic-number">{formatAmount(row.gstAmount)}</td>
                        </>
                      )}
                      <td className="classic-number">{formatAmount(row.lineTotal)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="classic-center" colSpan={taxColumnCount}>No invoice items found</td>
                </tr>
              )}
              <tr className="classic-total-row">
                <td colSpan={3} className="classic-number">Total</td>
                <td className="classic-center">
                  {invoiceRows.reduce((sum, row) => sum + toNumber(row.qty), 0) || "-"}
                </td>
                <td />
                <td className="classic-number">{formatAmount(invoiceSubtotal)}</td>
                {useSplitGst ? (
                  <>
                    <td />
                    <td className="classic-number">{formatAmount(splitGstTotal)}</td>
                    <td />
                    <td className="classic-number">{formatAmount(splitGstTotal)}</td>
                  </>
                ) : (
                  <>
                    <td />
                    <td className="classic-number">{formatAmount(invoiceGstTotal)}</td>
                  </>
                )}
                <td className="classic-number">{formatAmount(invoiceGrandTotal)}</td>
              </tr>
            </tbody>
          </table>

          <section className="classic-bottom-grid">
            <div>
              <div className="classic-amount-words">
                <div>Total in words</div>
                <div>{amountInWords(invoiceGrandTotal)}</div>
              </div>

              <div className="classic-bank-details">
                <div className="classic-bank-ship-row">
                  <div className="classic-bank-details">
                    <div className="classic-section-title">Bank Details</div>
                    <div className="classic-bank-grid">
                      <table>
                        <tbody>
                          <DataRow label="Name" value={bankDetails.bankName} />
                          <DataRow label="Branch" value={bankDetails.branch} />
                          <DataRow label="Acc. Number" value={bankDetails.accountNo} />
                          <DataRow label="IFSC" value={bankDetails.ifsc} />
                          <DataRow label="UPI ID" value={bankDetails.upiId} />
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="classic-ship-panel">
                    <div>
                      <div className="classic-section-title">Ship To</div>
                      <div className="classic-ship-panel-body">
                        <strong>{shipTo.name || "-"}</strong>
                        <div>{shipTo.address || "-"}</div>
                        {shipTo.gstNo ? <div>GSTIN: {shipTo.gstNo}</div> : null}
                        {projectName ? <div>Project: {projectName}</div> : null}
                      </div>
                    </div>
                    <div className="classic-ship-panel-signature">Customer Signature</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="classic-tax-summary">
              <table>
                <tbody>
                  <DataRow label="Taxable Amount" value={formatAmount(invoiceSubtotal)} />
                  {useSplitGst ? (
                    <>
                      <DataRow label="Add : CGST" value={formatAmount(splitGstTotal)} />
                      <DataRow label="Add : SGST" value={formatAmount(splitGstTotal)} />
                    </>
                  ) : (
                    <DataRow label="Add : IGST" value={formatAmount(invoiceGstTotal)} />
                  )}
                  <DataRow label="Total Tax" value={formatAmount(invoiceGstTotal)} />
                  <tr className="classic-grand">
                    <th>Total Amount After Tax</th>
                    <td>{formatAmount(invoiceGrandTotal)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="classic-declaration">
                <div className="classic-declaration-text">
                  Certified that the particulars given above are true and correct.
                </div>
                <div className="classic-signature-company">For {companyDetails.companyName || "-"}</div>
                <div className="classic-signature-label">Authorised Signatory</div>
              </div>
            </div>
          </section>

          <section className="classic-terms-sign">
            <div className="classic-terms">
              <div className="classic-section-title">Terms and Conditions</div>
              <ul>
                <li>Subject to jurisdiction applicable to the company branch.</li>
                <li>Our responsibility ceases as soon as goods leave our premises.</li>
                <li>Goods once sold will not be taken back.</li>
                {notes ? <li>{notes}</li> : null}
              </ul>
            </div>
          </section>

          <div className="classic-footer-note">Thank you for shopping with us!</div>
        </section>
      </div>
    </div>
  );
};

export default InvoicePrintPreview;
