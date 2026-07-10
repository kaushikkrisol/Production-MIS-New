import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import axios from "axios";
import { Edit3, FileText, Plus, Printer, RefreshCw, Search } from "react-feather";
import { Link, useNavigate } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import config from "../../../config";
import { all_routes } from "../../../Router/all_routes";

const GST_RATE = 18;
const INVOICE_EWAY_STORAGE_KEY = "invoiceEwayBillByNo";

const toText = (value) => (value === undefined || value === null ? "" : String(value));

const toNumber = (value) => {
  const normalized = typeof value === "string" ? value.replace(/,/g, "").replace(/[^\d.-]/g, "") : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value) =>
  `Rs. ${toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";
  const dateValue = value?.$date || value;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return toText(value);
  return date.toLocaleDateString("en-IN");
};

const getResponseRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const parseMaybeJson = (value, fallback) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  if (!value || typeof value !== "string") return fallback;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed?.$values)) return parsed.$values;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const getInvoiceNo = (invoice) =>
  toText(
    invoice?.InvoiceNo ||
      invoice?.invoiceNo ||
      invoice?.CustomerInvoiceNo ||
      invoice?.customerInvoiceNo ||
      invoice?.CreditNoteNo ||
      invoice?.creditNoteNo ||
      invoice?.CNNo ||
      invoice?.cnNo ||
      invoice?.DocumentNo ||
      invoice?.documentNo
  );

const getFirstArray = (...values) => {
  for (const value of values) {
    const parsed = parseMaybeJson(value, []);
    if (parsed.length) return parsed;
  }
  return [];
};

const hasInvoiceHeaderSignal = (invoice) =>
  Boolean(
    invoice &&
      typeof invoice === "object" &&
      (getInvoiceNo(invoice) ||
        toText(invoice?.ParentInvoiceNo || invoice?.parentInvoiceNo).trim() ||
        toText(invoice?.InvoiceType || invoice?.invoiceType).trim() ||
        toText(invoice?.JobCards || invoice?.jobCards).trim() ||
        toText(invoice?.ClientBillAs || invoice?.clientBillAs).trim())
  );

const getInvoiceFromWrapper = (data) => {
  const candidates = [
    data?.CustomerInvoice,
    data?.customerInvoice,
    data?.invoice,
    data?.Invoice,
    data?.salesInvoice,
    data?.SalesInvoice,
    data?.data?.CustomerInvoice,
    data?.data?.customerInvoice,
    data?.data?.invoice,
    data?.data?.Invoice,
    data?.data?.salesInvoice,
    data?.data?.SalesInvoice,
    data?.data,
    data,
  ];

  return candidates.find(hasInvoiceHeaderSignal) || null;
};

const calculateItemTaxableAmount = (item) => {
  const savedAmount = toNumber(
    item?.InvoiceAmount ||
      item?.invoiceAmount ||
      item?.InvoiceTaxableValue ||
      item?.invoiceTaxableValue ||
      item?.Amount ||
      item?.amount ||
      item?.TaxableValue ||
      item?.taxableValue ||
      item?.TaxableAmount ||
      item?.taxableAmount
  );

  if (savedAmount) return savedAmount;

  const qty = toNumber(item?.InvoiceQty || item?.invoiceQty || item?.Qty || item?.qty || item?.Quantity || item?.quantity) || 1;
  const width = toNumber(item?.InvoiceWidth || item?.invoiceWidth || item?.Width || item?.width);
  const height = toNumber(item?.InvoiceHeight || item?.invoiceHeight || item?.Height || item?.height || item?.Length || item?.length);
  const rate = toNumber(item?.InvoiceRate || item?.invoiceRate || item?.Rate || item?.rate);
  const totalSqFt = toNumber(item?.InvoiceTotalSqFt || item?.invoiceTotalSqFt || item?.TotalSqFt || item?.totalSqFt || item?.sqFt || item?.SqFt);
  const lineType = toText(item?.Type || item?.type || item?.lineType).toLowerCase();
  const sqft = totalSqFt || (width && height ? (width * height * qty) / 144 : 0);

  if ((lineType === "transportation" || lineType === "implementation") && !sqft) return qty * rate;
  return sqft * rate;
};

const calculateItemsGrandTotal = (items) => {
  if (!items.length) return 0;

  const lineTotal = items.reduce(
    (sum, item) => sum + toNumber(item?.LineTotal || item?.lineTotal || item?.TotalAmount || item?.totalAmount),
    0
  );

  if (lineTotal) return lineTotal;

  const taxableTotal = items.reduce((sum, item) => sum + calculateItemTaxableAmount(item), 0);
  return taxableTotal ? taxableTotal + (taxableTotal * GST_RATE) / 100 : 0;
};

const calculateInvoiceTotalParts = (items, gstRate = GST_RATE) => {
  const subTotal = items.reduce((sum, item) => sum + calculateItemTaxableAmount(item), 0);
  const gstTotal = subTotal ? (subTotal * gstRate) / 100 : 0;

  return {
    SubTotal: subTotal,
    GstRate: gstRate,
    GstTotal: gstTotal,
    GrandTotal: subTotal + gstTotal,
  };
};

const getInvoiceGrandTotal = (invoice, items) => {
  const directGrandTotal = toNumber(
    invoice?.GrandTotal ||
      invoice?.grandTotal ||
      invoice?.InvoiceGrandTotal ||
      invoice?.invoiceGrandTotal ||
      invoice?.TotalAfterTax ||
      invoice?.totalAfterTax
  );
  if (directGrandTotal) return directGrandTotal;

  const subTotal = toNumber(invoice?.SubTotal || invoice?.subTotal || invoice?.TaxableAmount || invoice?.taxableAmount);
  const gstTotal = toNumber(invoice?.GstTotal || invoice?.gstTotal || invoice?.GSTTotal || invoice?.gstAmount || invoice?.GstAmount);
  if (subTotal || gstTotal) return subTotal + gstTotal;

  return calculateItemsGrandTotal(items);
};

const getInvoicePayload = (data, fallback) => {
  const directInvoice = getInvoiceFromWrapper(data);
  if (directInvoice) return directInvoice;

  const rows = getResponseRows(data);
  if (rows.length) {
    const first = rows[0];
    return (
      first?.CustomerInvoice ||
      first?.customerInvoice ||
      first?.invoice ||
      first?.Invoice ||
      first?.salesInvoice ||
      first?.SalesInvoice ||
      first
    );
  }

  return (
    data?.CustomerInvoice ||
    data?.customerInvoice ||
    data?.invoice ||
    data?.Invoice ||
    data?.salesInvoice ||
    data?.SalesInvoice ||
    data?.data?.CustomerInvoice ||
    data?.data?.customerInvoice ||
    data?.data?.invoice ||
    data?.data?.Invoice ||
    data ||
    fallback
  );
};

const hasInvoiceLineItems = (invoice) => {
  const normalized = normalizeInvoice(invoice || {}, 0);
  return normalized._items.length > 0;
};

const mergeFetchedInvoice = (fetchedInvoice, fallbackInvoice) => {
  const fetched = normalizeInvoice(fetchedInvoice || {}, 0);
  const fallback = normalizeInvoice(fallbackInvoice || {}, 0);

  return {
    ...fallback,
    ...fetched,
    _rowId: fetched._rowId || fallback._rowId,
    _invoiceNo: fetched._invoiceNo || fallback._invoiceNo,
    _invoiceType: fetched._invoiceType || fallback._invoiceType,
    _invoiceDate: fetched._invoiceDate || fallback._invoiceDate,
    _items: fetched._items.length ? fetched._items : fallback._items,
    _billTo: fetched._billTo.length ? fetched._billTo : fallback._billTo,
    _shipTo: fetched._shipTo.length ? fetched._shipTo : fallback._shipTo,
    _jobCards: fetched._jobCards || fallback._jobCards,
    _client: fetched._client || fallback._client,
    _project: fetched._project || fallback._project,
    _grandTotal: fetched._grandTotal || fallback._grandTotal,
    _productionLocation: fetched._productionLocation || fallback._productionLocation,
    _billingLocation: fetched._billingLocation || fallback._billingLocation,
  };
};

const locationCompanyMap = {
  west: "Commercial Reprographers (Mumbai)",
  north: "Commercial Reprographers (Delhi)",
  east: "Commercial Reprographers (Kolkata)",
  south: "Commercial Reprographers (Bangalore)",
};

const getInvoiceCompanies = (productionLocation, billingLocation) => {
  const locationText = [productionLocation, billingLocation]
    .filter(Boolean)
    .join(", ")
    .toLowerCase();

  const companies = Object.entries(locationCompanyMap)
    .filter(([location]) => locationText.includes(location))
    .map(([, company]) => company);

  return [...new Set(companies)].join(", ") || "-";
};

const normalizeInvoiceTypeText = (value) =>
  toText(value)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

const getInvoiceTypeLabel = (value) => normalizeInvoiceTypeText(value);

const hasCreditNoteSignal = (...values) =>
  values.some((value) => normalizeInvoiceTypeText(value).toLowerCase().includes("credit note"));

const isCreditNoteInvoice = (invoice) =>
  hasCreditNoteSignal(
    invoice?._invoiceType,
    invoice?.InvoiceType,
    invoice?.invoiceType,
    invoice?._status,
    invoice?.Status,
    invoice?.status,
    invoice?.InvoiceStatus,
    invoice?.invoiceStatus,
    invoice?.Notes,
    invoice?.notes
  ) || Boolean(toText(invoice?.ParentInvoiceNo || invoice?.parentInvoiceNo).trim());

const normalizeInvoice = (invoice, index) => {
  const items = getFirstArray(
    invoice?.Items,
    invoice?.items,
    invoice?.InvoiceItems,
    invoice?.invoiceItems,
    invoice?.SalesInvoiceItems,
    invoice?.salesInvoiceItems,
    invoice?.ItemDetails,
    invoice?.itemDetails
  );
  const billTo = getFirstArray(invoice?.BillTo, invoice?.billTo, invoice?.BillToList, invoice?.billToList);
  const shipTo = getFirstArray(invoice?.ShipTo, invoice?.shipTo, invoice?.ShipToList, invoice?.shipToList);
  const productionLocation = toText(invoice?.ProductionLocation || invoice?.productionLocation || "");
  const billingLocation = toText(invoice?.BillingLocation || invoice?.billingLocation || "");
  const calculatedGrandTotal = getInvoiceGrandTotal(invoice, items);

  return {
    ...invoice,
    _rowId: toText(invoice?.Id || invoice?.id || getInvoiceNo(invoice) || `invoice-${index}`),
    _invoiceNo: getInvoiceNo(invoice),
    _invoiceType: toText(invoice?.InvoiceType || invoice?.invoiceType || ""),
    _invoiceDate: invoice?.InvoiceDate || invoice?.invoiceDate || "",
    _itrNo: toText(invoice?.ItrNo || invoice?.ITRNo || invoice?.itrNo || invoice?.ITR || invoice?.itr || ""),
    _jobCards: toText(invoice?.JobCards || invoice?.jobCards || ""),
    _client: toText(invoice?.ClientBillAs || invoice?.clientBillAs || invoice?.Client || invoice?.client || ""),
    _project: toText(invoice?.ProjectName || invoice?.projectName || ""),
    _productionLocation: productionLocation,
    _billingLocation: billingLocation,
    _company: getInvoiceCompanies(productionLocation, billingLocation),
    _status: toText(
      invoice?.Status ||
        invoice?.status ||
        invoice?.InvoiceStatus ||
        invoice?.invoiceStatus ||
        (invoice?.IsFinal || invoice?.isFinal ? "Final" : "") ||
        "Draft"
    ),
    _grandTotal: calculatedGrandTotal,
    _items: items,
    _billTo: billTo,
    _shipTo: shipTo,
  };
};

const getSearchText = (invoice) =>
  [
    invoice._invoiceNo,
    invoice._invoiceType,
    invoice._jobCards,
    invoice._client,
    invoice._project,
    invoice._company,
    invoice._productionLocation,
    invoice._billingLocation,
    invoice._status,

    invoice.PoNo,
    invoice.poNo,
    invoice.ProjectName,
    invoice.projectName,
    invoice._itrNo,
    invoice.ItrNo,
    invoice.ITRNo,
    invoice.itrNo,

    ...(invoice._items || []).flatMap((item) => [
      item.Description,
      item.description,
      item.Media,
      item.media,
      item.StoreName,
      item.storeName,
      item.City,
      item.city,
      item.JobNo,
      item.jobNo,
      item.HSN,
      item.Hsn,
      item.hsn,
    ]),

    ...(invoice._billTo || []).flatMap((address) => [
      address.name,
      address.address,
      address.gstNo,
    ]),

    ...(invoice._shipTo || []).flatMap((address) => [
      address.name,
      address.address,
      address.gstNo,
    ]),
  ]
    .map((x) => toText(x))
    .join(" ")
    .toLowerCase();

const getStoredInvoiceStatusByNo = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem("invoiceStatusByNo") || "{}");
    const statusByInvoiceNo = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const normalized = {};

    Object.entries(statusByInvoiceNo).forEach(([invoiceNo, status]) => {
      const normalizedInvoiceNo = String(invoiceNo || "").trim().toLowerCase();
      const normalizedStatus = toText(status);
      if (normalizedInvoiceNo && normalizedStatus) normalized[normalizedInvoiceNo] = normalizedStatus;
    });

    const finalParsed = JSON.parse(localStorage.getItem("finalInvoiceNos") || "[]");
    if (Array.isArray(finalParsed)) {
      finalParsed.forEach((invoiceNo) => {
        const normalizedInvoiceNo = String(invoiceNo || "").trim().toLowerCase();
        if (normalizedInvoiceNo && !normalized[normalizedInvoiceNo]) normalized[normalizedInvoiceNo] = "Final";
      });
    }

    return normalized;
  } catch {
    return {};
  }
};

const mapDraftAddress = (address, index, fallbackPrefix) => ({
  id: `${fallbackPrefix.toLowerCase().replace(/\s+/g, "-")}-${index + 1}-${Date.now()}`,
  label: toText(address?.Label || address?.label || address?.Title || address?.title || `${fallbackPrefix} ${index + 1}`),
  name: toText(address?.CustomerName || address?.customerName || address?.Name || address?.name),
  address: toText(address?.Address || address?.address),
  gstNo: toText(address?.GstNo || address?.gstNo || address?.GSTNo || address?.gstNo),
});

const mapDraftItem = (item, index) => ({
  id: `draft-item-${index + 1}-${Date.now()}`,
  selected: false,
  groupByMedia: false,
  jobNo: toText(item?.JobNo || item?.jobNo),
  lineType: toText(item?.Type || item?.type || item?.lineType || "media").toLowerCase() || "media",
  storeName: toText(item?.StoreName || item?.storeName || item?.SalonAddress || item?.salonAddress),
  city: toText(item?.City || item?.city),
  description: toText(item?.InvoiceDescription || item?.invoiceDescription || item?.Description || item?.description || item?.NameSubCode || item?.nameSubCode),
  media: toText(item?.InvoiceMedia || item?.invoiceMedia || item?.Media || item?.media || item?.ExternalMedia || item?.externalMedia),
  hsnCode: toText(item?.InvoiceHsn || item?.invoiceHsn || item?.Hsn || item?.HSN || item?.HsnCode || item?.HSNCode || item?.hsnCode || item?.hsn),
  qty: toText(item?.InvoiceQty || item?.invoiceQty || item?.Qty || item?.qty || item?.Quantity || item?.quantity),
  width: toText(item?.InvoiceWidth || item?.invoiceWidth || item?.Width || item?.width),
  height: toText(item?.InvoiceHeight || item?.invoiceHeight || item?.Height || item?.height || item?.Length || item?.length),
  rate: toText(item?.InvoiceRate || item?.invoiceRate || item?.Rate || item?.rate),
  manualAmount: toText(
    item?.InvoiceAmount ||
      item?.invoiceAmount ||
      item?.InvoiceTaxableValue ||
      item?.invoiceTaxableValue ||
      item?.Amount ||
      item?.amount ||
      item?.TaxableValue ||
      item?.taxableValue
  ),
  source: item,
});

const normalizeTransportMode = (value) => {
  const rawMode = toText(value || "Road");
  return ["Road", "Train", "Air", "Ship"].find((mode) => mode.toLowerCase() === rawMode.toLowerCase()) || rawMode || "Road";
};

const normalizeEwayBillDetails = (invoice = {}) => {
  const ewayBill =
    invoice?.ewayBill ||
    invoice?.EwayBill ||
    invoice?.EWayBill ||
    invoice?.EwayBillDetails ||
    invoice?.EWayBillDetails ||
    {};

  return {
    transporterName: toText(
      ewayBill.transporterName ||
        ewayBill.TransporterName ||
        invoice.transporterName ||
        invoice.TransporterName ||
        invoice.TransportName ||
        invoice.transport ||
        invoice.Transport
    ),
    transportMode: normalizeTransportMode(
      ewayBill.transportMode ||
        ewayBill.TransportMode ||
        ewayBill.modeOfTransportation ||
        ewayBill.ModeOfTransportation ||
        invoice.transportMode ||
        invoice.TransportMode ||
        invoice.modeOfTransportation ||
        invoice.ModeOfTransportation
    ),
    transportDistanceKm: toText(
      ewayBill.transportDistanceKm ||
        ewayBill.TransportDistanceKm ||
        ewayBill.TransportationDistanceKm ||
        ewayBill.distanceOfTransportation ||
        ewayBill.DistanceOfTransportation ||
        invoice.transportDistanceKm ||
        invoice.TransportDistanceKm ||
        invoice.TransportationDistanceKm ||
        invoice.distanceOfTransportation ||
        invoice.DistanceOfTransportation
    ),
    vehicleNo: toText(ewayBill.vehicleNo || ewayBill.VehicleNo || invoice.vehicleNo || invoice.VehicleNo),
    transporterGstNo: toText(
      ewayBill.transporterGstNo ||
        ewayBill.TransporterGstNo ||
        ewayBill.TransporterGSTNo ||
        invoice.transporterGstNo ||
        invoice.TransporterGstNo ||
        invoice.TransporterGSTNo ||
        invoice.transportId ||
        invoice.TransportId
    ),
  };
};

const buildDraftEwayFields = (invoice) => {
  const ewayBill = normalizeEwayBillDetails(invoice);

  return {
    ewayBill,
    TransporterName: ewayBill.transporterName,
    ModeOfTransportation: ewayBill.transportMode,
    DistanceOfTransportation: ewayBill.transportDistanceKm,
    VehicleNo: ewayBill.vehicleNo,
    TransporterGstNo: ewayBill.transporterGstNo,
    TransporterGSTNo: ewayBill.transporterGstNo,
  };
};

const hasEwayBillDetails = (ewayBill) =>
  Boolean(
    toText(ewayBill?.transporterName).trim() ||
      toText(ewayBill?.transportDistanceKm).trim() ||
      toText(ewayBill?.vehicleNo).trim() ||
      toText(ewayBill?.transporterGstNo).trim()
  );

const getStoredEwayBillDetails = (invoiceNo) => {
  const normalizedInvoiceNo = String(invoiceNo || "").trim().toLowerCase();
  if (!normalizedInvoiceNo) return null;

  try {
    const parsed = JSON.parse(localStorage.getItem(INVOICE_EWAY_STORAGE_KEY) || "{}");
    const stored = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed[normalizedInvoiceNo] : null;
    return stored ? normalizeEwayBillDetails(stored) : null;
  } catch {
    return null;
  }
};

const mergeStoredEwayBill = (invoice) => {
  const currentEwayBill = normalizeEwayBillDetails(invoice);
  if (hasEwayBillDetails(currentEwayBill)) return invoice;

  const storedEwayBill = getStoredEwayBillDetails(getInvoiceNo(invoice) || invoice?._invoiceNo);
  if (!hasEwayBillDetails(storedEwayBill)) return invoice;

  return {
    ...invoice,
    ...buildDraftEwayFields(storedEwayBill),
  };
};

const buildDraftDataFromInvoice = (invoice) => {
  const invoiceWithEway = mergeStoredEwayBill(invoice);
  const billTo = invoice._billTo.length ? invoice._billTo.map((address, index) => mapDraftAddress(address, index, "Bill To")) : [];
  const shipTo = invoice._shipTo.length ? invoice._shipTo.map((address, index) => mapDraftAddress(address, index, "Ship To")) : [];
  const items = invoice._items.length ? invoice._items.map(mapDraftItem) : [];
  const invoiceDate = new Date(invoice._invoiceDate);

  return {
    invoiceNo: invoice._invoiceNo || "",
    invoiceDate: Number.isNaN(invoiceDate.getTime()) ? new Date().toISOString().split("T")[0] : invoiceDate.toISOString().split("T")[0],
    jobCardNo: invoice._jobCards || "",
    selectedJobIds: invoice._jobCards ? invoice._jobCards.split(",").map((jobNo) => `loaded-draft|${jobNo.trim()}`).filter(Boolean) : [],
    billTo: billTo.length ? billTo : [mapDraftAddress({}, 0, "Bill To")],
    shipTo: shipTo.length ? shipTo : [mapDraftAddress({}, 0, "Ship To")],
    items: items.length ? items : [mapDraftItem({}, 0)],
    groupByMedia: false,
    groupByStore: false,
    groupByCity: false,
    groupByDescription: false,
    clientName: invoice._client || "",
    poNumber: toText(invoice?.PoNo || invoice?.poNo),
    poDescription: toText(invoice?.PoDescription || invoice?.poDescription),
    itrNo: invoice._itrNo || "",
    projectName: invoice._project || "",
    notes: toText(invoice?.Notes || invoice?.notes),
    ...buildDraftEwayFields(invoiceWithEway),
    status: "Draft",
    savedAt: new Date().toISOString(),
  };
};

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await axios.post(config.SalesInvoice.URL.GetAll, {}, {
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      });
      const rows = getResponseRows(response.data).map(normalizeInvoice);
      setInvoices(rows);

      if (!rows.length) {
        setMessage("No saved invoices found.");
      }
    } catch (error) {
      console.error("Failed to load invoices", error);
      setMessage(error?.response?.data?.message || error?.message || "Could not load invoices.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const visibleInvoices = useMemo(() => {
    const statusByInvoiceNo = getStoredInvoiceStatusByNo();
    const rows = invoices.map((invoice) => {
      const storedStatus = statusByInvoiceNo[String(invoice._invoiceNo || "").trim().toLowerCase()];
      return storedStatus ? { ...invoice, _status: storedStatus } : invoice;
    });

    const query = searchText.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((invoice) => getSearchText(invoice).includes(query));
  }, [invoices, searchText]);

  const getDateOnlyTime = (value) => {
    if (!value) return null;
    const dateValue = value?.$date || value;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };

  const filteredInvoices = useMemo(() => {
    const fromTime = fromDate ? getDateOnlyTime(fromDate) : null;
    const toTime = toDate ? getDateOnlyTime(toDate) : null;

    return visibleInvoices.filter((invoice) => {
      const invoiceTime = getDateOnlyTime(invoice._invoiceDate);
      if (!invoiceTime) return !fromTime && !toTime;
      if (fromTime !== null && invoiceTime < fromTime) return false;
      if (toTime !== null && invoiceTime > toTime) return false;
      return true;
    });
  }, [visibleInvoices, fromDate, toDate]);

  const resetFilters = () => {
    setSearchText("");
    setFromDate("");
    setToDate("");
  };

  const printInvoice = async (invoice) => {
    let invoiceData = invoice;

    if (invoice._invoiceNo && config.SalesInvoice.URL.GetByInvoiceNo) {
      try {
        const response = await axios.get(config.SalesInvoice.URL.GetByInvoiceNo(invoice._invoiceNo), {
          timeout: 10000,
        });
        invoiceData = mergeFetchedInvoice(getInvoicePayload(response.data, invoice), invoice);
      } catch (error) {
        console.warn("Could not load invoice by number, using list data", error);
      }
    }

    invoiceData = mergeStoredEwayBill(invoiceData);
    localStorage.setItem("invoicePrintPreviewData", JSON.stringify(invoiceData));
    window.open(all_routes.invoiceprintpreview, "_blank");
  };

  const loadDraft = async (invoice) => {
    let invoiceData = invoice;

    if (invoice._invoiceNo && config.SalesInvoice.URL.GetByInvoiceNo) {
      try {
        const response = await axios.get(config.SalesInvoice.URL.GetByInvoiceNo(invoice._invoiceNo), {
          timeout: 10000,
        });
        invoiceData = mergeFetchedInvoice(getInvoicePayload(response.data, invoice), invoice);
      } catch (error) {
        console.warn("Could not load invoice by number, using list data", error);
      }
    }

    if (!hasInvoiceLineItems(invoiceData) && hasInvoiceLineItems(invoice)) {
      invoiceData = invoice;
    }

    invoiceData = mergeStoredEwayBill(invoiceData);
    localStorage.setItem("invoiceDraftData", JSON.stringify(buildDraftDataFromInvoice(invoiceData)));
    navigate(all_routes.invoicepreviewbuilder);
  };

  const startNewInvoice = () => {
    localStorage.removeItem("invoiceDraftData");
    localStorage.removeItem("invoicePreviewBuilderData");
  };



 const createCreditNote = async (invoice) => {
  try {
    let invoiceData = invoice;

    if (invoice._invoiceNo) {
      const response = await axios.get(
        config.SalesInvoice.URL.GetByInvoiceNo(invoice._invoiceNo)
      );

      invoiceData = mergeFetchedInvoice(
        getInvoicePayload(response.data, invoice),
        invoice
      );
    }

    const totals = calculateInvoiceTotalParts(invoiceData._items || []);

    const payload = {
      InvoiceNo: "",
      ParentInvoiceNo: invoiceData._invoiceNo || invoiceData.InvoiceNo || "",
      InvoiceType: "Credit Note",
      Status: "Credit Note",
      InvoiceDate: new Date().toISOString(),
      JobCards: invoiceData._jobCards || "",
      ClientBillAs: invoiceData._client || "",
      ProjectName: invoiceData._project || "",
      ProductionLocation: invoiceData._productionLocation || "",
      BillingLocation: invoiceData._billingLocation || "",
      Notes: `Credit note against invoice ${invoiceData._invoiceNo || ""}`,
      Items: invoiceData._items || [],
      BillTo: invoiceData._billTo || [],
      ShipTo: invoiceData._shipTo || [],
      ...totals,
      Entereddat: new Date().toISOString(),
      Lstupdatedt: new Date().toISOString(),
      Del_index: "1",
    };

    console.log("CREDIT NOTE PAYLOAD", payload);

    await axios.post(config.SalesInvoice.URL.CreateCreditNote, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    alert("Credit Note created successfully");

    await loadInvoices();
  } catch (error) {
    console.error(error);

    alert(
      error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Failed to create Credit Note"
    );
  }
};

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      floatingFilter: true,
      resizable: true,
      wrapText: true,
      autoHeight: true,
      minWidth: 90,
      cellStyle: {
        lineHeight: "18px",
        whiteSpace: "normal",
        wordBreak: "break-word",
        display: "flex",
        alignItems: "center",
      },
    }),
    []
  );

  const columnDefs = useMemo(
    () => [
      {
        headerName: "Invoice No",
        field: "_invoiceNo",
        width: 125,
        pinned: "left",
        cellStyle: { fontWeight: 700 },
      },
      {
        headerName: "Date",
        field: "_invoiceDate",
        width: 105,
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        headerName: "Type",
        field: "_invoiceType",
        width: 150,
        valueGetter: (params) =>
          isCreditNoteInvoice(params.data)
            ? "Credit Note"
            : getInvoiceTypeLabel(params.data?._invoiceType) || "Tax Invoice",
      },
      {
        headerName: "Company",
        field: "_company",
        width: 230,
        flex: 1,
      },
      {
        headerName: "Client",
        field: "_client",
        width: 210,
        flex: 1,
        cellRenderer: (params) => (
          <div>
            <div>{params.data?._client || "-"}</div>
            {params.data?._project ? (
              <div className="invoice-list-muted">{params.data._project}</div>
            ) : null}
          </div>
        ),
      },
      {
        headerName: "Job Cards",
        field: "_jobCards",
        width: 270,
        flex: 1.2,
      },
      {
        headerName: "Production Location",
        field: "_productionLocation",
        width: 160,
      },
      {
        headerName: "Billing Location",
        field: "_billingLocation",
        width: 150,
      },
      {
        headerName: "Grand Total",
        field: "_grandTotal",
        width: 145,
        type: "rightAligned",
        valueFormatter: (params) => formatMoney(params.value),
        cellStyle: { fontWeight: 700, justifyContent: "flex-end" },
      },
      {
        headerName: "Status",
        field: "_status",
        width: 115,
        cellRenderer: (params) => (
          <span className="invoice-status-badge">
            {params.data?._status || "Draft"}
          </span>
        ),
      },
      {
        headerName: "Action",
        field: "action",
        width: 260,
        pinned: "right",
        sortable: false,
        filter: false,
        floatingFilter: false,
        cellRenderer: (params) => {
          const invoice = params.data;
          const canLoadDraft = invoice?._status?.toLowerCase() === "draft";

          return (
            <div className="invoice-grid-action-buttons">
              {canLoadDraft ? (
                <Button size="sm" variant="outline-primary" onClick={() => loadDraft(invoice)}>
                  <Edit3 size={13} /> Draft
                </Button>
              ) : null}

              <Button size="sm" variant="outline-danger" onClick={() => printInvoice(invoice)}>
                <Printer size={13} /> Print
              </Button>

              {!isCreditNoteInvoice(invoice) ? (
                <Button size="sm" variant="outline-warning" onClick={() => createCreditNote(invoice)}>
                  <FileText size={13} /> CN
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [loadDraft, printInvoice, createCreditNote]
  );

  return (
    <div className="page-wrapper">
      <div className="content container-fluid invoice-list-screen">
        <style>{`
.invoice-list-screen {
  background: #f5f7fb;
  min-height: 100vh;
  padding: 14px 18px 24px;
}

.invoice-list-topbar,
.invoice-list-card {
  background: #fff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.invoice-list-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.invoice-list-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.invoice-list-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2f56d9;
  color: #fff;
}

.invoice-list-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.invoice-list-title div div {
  font-size: 12px;
  color: #6b7280;
}

.invoice-list-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.invoice-list-search {
  position: relative;
  width: 300px;
}

.invoice-list-search svg {
  position: absolute;
  top: 11px;
  left: 10px;
  color: #6b7280;
  z-index: 1;
}

.invoice-list-search input {
  padding-left: 34px;
  height: 38px;
}

.invoice-list-card {
  padding: 12px;
}

.invoice-filter-row {
  display: flex;
  align-items: end;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.invoice-filter-control {
  min-width: 170px;
}

.invoice-filter-control label {
  color: #475467;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 4px;
}

.invoice-grid-wrapper {
  width: 100%;
  height: 660px;
}

.invoice-list-muted {
  color: #6b7280;
  font-size: 11px;
  margin-top: 2px;
}

.invoice-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 70px;
  border-radius: 999px;
  padding: 4px 10px;
  background: #edf2ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 600;
}

.invoice-grid-action-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.invoice-grid-action-buttons .btn {
  padding: 3px 7px;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.ag-theme-quartz {
  --ag-font-size: 12px;
  --ag-row-height: 48px;
  --ag-header-height: 42px;
  --ag-list-item-height: 28px;
  --ag-border-color: #d8e2ee;
  --ag-header-background-color: #eef4fb;
  --ag-odd-row-background-color: #fff;
}

.ag-theme-quartz .ag-header-cell-label {
  font-weight: 700;
  color: #344054;
}

.ag-theme-quartz .ag-cell {
  display: flex;
  align-items: center;
  line-height: 18px;
  white-space: normal;
  word-break: break-word;
}

@media (max-width: 991px) {
  .invoice-list-topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .invoice-list-actions,
  .invoice-list-search {
    width: 100%;
  }

  .invoice-list-actions .btn {
    flex: 1;
  }

  .invoice-filter-control {
    width: 100%;
  }

  .invoice-grid-wrapper {
    height: 560px;
  }
}
`}</style>

        <header className="invoice-list-topbar">
          <div className="invoice-list-title">
            <div className="invoice-list-icon">
              <FileText size={18} />
            </div>
            <div>
              <h1>All Invoices</h1>
              <div>{isLoading ? "Loading invoices..." : `${filteredInvoices.length} shown from ${invoices.length} saved invoice(s)`}</div>
            </div>
          </div>

          <div className="invoice-list-actions">
            <div className="invoice-list-search">
              <Search size={15} />
              <Form.Control
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search invoice, client, job, location"
              />
            </div>
            <Button variant="outline-secondary" onClick={loadInvoices} disabled={isLoading}>
              <RefreshCw size={15} /> Refresh
            </Button>
            <Button as={Link} to={all_routes.invoicepreviewbuilder} variant="primary" onClick={startNewInvoice}>
              <Plus size={15} /> New Invoice
            </Button>
          </div>
        </header>

        {message && (
          <Alert variant={message.includes("Could not") ? "warning" : "info"} onClose={() => setMessage("")} dismissible>
            {message}
          </Alert>
        )}

        <section className="invoice-list-card">
          <div className="invoice-filter-row">
            <Form.Group className="invoice-filter-control">
              <Form.Label>From Date</Form.Label>
              <Form.Control
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </Form.Group>

            <Form.Group className="invoice-filter-control">
              <Form.Label>To Date</Form.Label>
              <Form.Control
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </Form.Group>

            <Button variant="outline-secondary" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>

          {isLoading ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" />
              Loading saved invoices...
            </div>
          ) : (
            <div className="ag-theme-quartz invoice-grid-wrapper">
              <AgGridReact
                rowData={filteredInvoices}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                quickFilterText={searchText}
                pagination={true}
                paginationPageSize={20}
                paginationPageSizeSelector={[10, 20, 50, 100]}
                animateRows={true}
                suppressCellFocus={true}
                rowHeight={54}
                overlayNoRowsTemplate="<span style='color:#667085'>No invoices to show.</span>"
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default InvoiceList;
