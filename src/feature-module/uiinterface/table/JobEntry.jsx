import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Select from "react-select";
import DatePicker from "react-datepicker";
import { createPortal } from "react-dom";
import { toast, ToastContainer } from "react-toastify";
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
  Plus,
  Printer,
  RotateCcw,
  Save,
  Trash2,
} from "react-feather";
import config from "../../../config";
import hsnRateData from "../../../core/json/hsnRateData.json";
import indiaCities from "../../../core/json/indiaCities.json";
import { mergeFallbackCustomers } from "./customerFallbacks";
import "./JobEntry.css";

const RATE_STORAGE_KEY = "productMediaRateMasterRows";
const ELEMENT_GROUP_STORAGE_KEY = "elementGroupMasterRows";
const JOB_DRAFT_KEY = "jobEntryDrafts";
const TEMP_DRAFT_ID = "new-job-draft";

const locationOptions = ["North", "South", "East", "West"];
const yesNoOptions = ["Yes", "No"];
const businessTypeOptions = ["Print", "Retail", "Onsite"];
const poTypeOptions = [
  "PO Received",
  "PO not Received",
  "Direct Billing",
  "Open PO",
  "Estimate Approval Pending",
];
const laminationDefaults = ["Matt Lamination"];
const mountingDefaults = ["3mm Sunboard", "5mm Sunboard"];
const implementationDefaults = yesNoOptions;
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
  "Total Sq.f",
  "LAMINATION",
  "TYPE OF LAMINATION",
  "MOUNTING",
  "TYPE OF MOUNTING",
  "IMPLEMENTATION",
  "JOB DEADLINE",
  "PRINTER DEADLINE",
];

const createLine = (index) => ({
  id: `${Date.now()}-${index}`,
  store: "",
  city: "",
  prodLoc: "",
  billLoc: "",
  salonAddress: "",
  brandingLocation: "",
  sequenceNo: "",
  printingMachine: "",
  printReadyFile: "",
  remarks: "",
  media: "",
  internalMedia: "",
  externalMedia: "",
  elementGroup: "",
  visualCode: "",
  qty: "",
  width: "",
  height: "",
  sqft: "",
  rate: "",
  amount: "",
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
      customer?.customerid ??
      customer?.CUSTOMER_ID ??
      ""
  ).trim();

const getCustomerName = (customer) =>
  customer?.customeR_NAME ||
  customer?.customerName ||
  customer?.client ||
  customer?.CUSTOMER_NAME ||
  "";

const roundAmount = (value) => Math.round((Number(value) || 0) * 100) / 100;

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
  const width = Number(row.width || 0);
  const height = Number(row.height || 0);

  if (qty > 0 && width > 0 && height > 0) {
    return roundAmount((qty * width * height) / 144);
  }

  return 0;
};

const recalculateLine = (row) => {
  const sqft = calculateSqft(row);
  const rate = Number(row.rate || 0);
  const amount = roundAmount(sqft * rate);

  return {
    ...row,
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
  visualCode: String(
    item?.visualCode ||
      item?.VisualCode ||
      item?.elementName ||
      item?.ElementName ||
      item?.displayName ||
      ""
  ).trim(),
  qty: String(item?.qty ?? item?.Qty ?? item?.quantity ?? ""),
  width: String(item?.width ?? item?.Width ?? ""),
  height: String(item?.height ?? item?.Height ?? ""),
  media: String(item?.media || item?.Media || "").trim(),
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
  customerName: "",
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
    rate: item.ratePerSqft ?? "",
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

  rate: row.ratePerSqft ?? row.RatePerSqft ?? row.rate ?? row.Rate ?? "",
});

const getRateRowsFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const getElementGroupRowsFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
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

  if (normalizedMedia) {
    const isMatch = (row) =>
      [row.media, row.externalMedia, row.internalMedia].some(
        (value) => normalizeText(value) === normalizedMedia
      );

    return customerRows.find(isMatch) || allRows.find(isMatch) || null;
  }

  return customerRows[0] || null;
};

const getGeneralRateRows = (rows) =>
  rows.filter((row) => !row.customerId && !row.customerName);

const getDefaultPricing = (customerRows, allRows) =>
  customerRows[0] || getGeneralRateRows(allRows)[0] || allRows[0] || null;

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const getDatePickerValue = (value) => {
  const normalized = normalizeDateInputValue(value);
  if (!normalized) return null;

  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTimeLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getTodayDateTimeMin = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return formatDateTimeLocal(today);
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
      job?.jobNo ??
      job?.jobno ??
      job?.JobNo ??
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
  return [];
};

const getStoreRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const normalizeStoreRow = (store, index = 0) => ({
  id: String(store?.id || store?._id || store?.storeId || store?.StoreId || `store-${index}`),
  storeName: String(store?.storeName || store?.StoreName || store?.name || store?.Name || "").trim(),
  address: String(store?.address || store?.Address || store?.storeAddress || store?.StoreAddress || "").trim(),
  location: String(store?.location || store?.Location || "").trim(),
  city: String(store?.city || store?.City || "").trim(),
  panCard: String(store?.panCard || store?.PanCard || store?.pan || store?.PAN || "").trim(),
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
    line.sequenceNo,
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
    line.sqft,
    line.rate,
    line.amount,
    line.laminationFlag,
    line.lamination,
    line.mountingFlag,
    line.mounting,
    line.implementation,
    line.jobDeadline,
    line.printerDeadline,
  ].every((value) => !String(value || "").trim());

const uniqueValues = (values) => [
  ...new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
];

const toOption = (value, label = value) => ({ value, label });

const buildValueOptions = (defaults, extraValues = []) =>
  uniqueValues([...defaults, ...extraValues]).map((value) => toOption(value));

const getSelectedOption = (options, value) =>
  options.find((option) => option.value === value) || null;

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
  const deadlineMin = useMemo(() => getTodayDateTimeMin(), []);

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
    if (draft?.lines?.length) setLines(draft.lines);
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
          setCustomers(mergeFallbackCustomers([]));
          return;
        }

        const response = await axios.post(
          config.JobSummary.URL.Getallcustomer,
          { locationid: locationId },
          { timeout: 10000, headers: { "Content-Type": "application/json" } }
        );

        setCustomers(mergeFallbackCustomers(Array.isArray(response.data) ? response.data : []));
      } catch (error) {
        console.error("Error fetching customers", error);
        setCustomers(mergeFallbackCustomers([]));
      }
    };

    const fetchRateRows = async () => {
      try {
        const response = await axios.get(config.ProductMediaRateMaster.URL.GetAll, {
          timeout: 10000,
        });

        const apiRows = getRateRowsFromResponse(response.data).map(normalizeRateRow);

        setRateRows(
          apiRows.length
            ? apiRows
            : [...getSavedRateRows().map(normalizeRateRow), ...buildDefaultRateRows()]
        );
      } catch (error) {
        console.error("Unable to fetch product media rates", error);
        setRateRows([...getSavedRateRows().map(normalizeRateRow), ...buildDefaultRateRows()]);
      }
    };

    const fetchPrinterOptions = async () => {
      try {
        if (!locationId) {
          setPrinterOptions([]);
          return;
        }

        const response = await axios.post(
          config.Printing.URL.Getallprinting,
          { location_id: locationId },
          { timeout: 10000, headers: { "Content-Type": "application/json" } }
        );

        const names = (Array.isArray(response.data) ? response.data : [])
          .flatMap((item) => {
            if (Array.isArray(item?.printerName)) return item.printerName;
            return item?.printerName ? [item.printerName] : [];
          })
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

    try {
      if (!locationId) {
        setJobOptions([]);
        return [];
      }

      const response = await axios.post(config.JobSummary.URL.GetAllJobsFromSql, { locationId });

      const seen = new Set();
      const options = getJobRows(response.data)
        .map(buildJobOption)
        .filter((job) => {
          if (!job?.value || seen.has(job.value)) return false;
          seen.add(job.value);
          return true;
        });

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

  useEffect(() => {
    if (!header.client) {
      setStoreMasterRows([]);
      return;
    }

    axios
      .get(`${config.Store.URL.List}?customerId=${encodeURIComponent(header.client)}`, {
        timeout: 10000,
      })
      .then((response) => {
        setStoreMasterRows(getStoreRows(response.data).map(normalizeStoreRow));
      })
      .catch((error) => {
        console.error("Unable to fetch stores from Store Master", error);
        setStoreMasterRows([]);
      });
  }, [header.client]);

  const elementGroupLookup = useMemo(() => {
    return elementGroupRows.reduce((lookup, row) => {
      const keyName = normalizeText(row.elementGroupName);
      const keyCode = normalizeText(row.elementGroupCode);
      if (keyName) lookup[keyName] = row;
      if (keyCode) lookup[keyCode] = row;
      return lookup;
    }, {});
  }, [elementGroupRows]);

  const elementGroupSelectOptions = useMemo(() => {
    const options = [];
    const seen = new Set();

    elementGroupRows.filter((row) => row.isActive !== "0").forEach((row) => {
      const labelParts = [row.elementGroupName];
      if (row.elementGroupCode && row.elementGroupCode !== row.elementGroupName) {
        labelParts.push(`code: ${row.elementGroupCode}`);
      }
      const label = labelParts.filter(Boolean).join(" • ");
      const value = row.elementGroupName || row.elementGroupCode;
      if (!value || seen.has(value)) return;
      seen.add(value);
      options.push({ value, label });
    });

    return options;
  }, [elementGroupRows]);

  const createGroupLine = (baseLine, item, suffix) => {
    const newLine = createLine(`${Date.now()}-${suffix}`);
    const width = Number(item.width || baseLine.width || 0);
    const height = Number(item.height || baseLine.height || 0);
    const qty = Number(item.qty || baseLine.qty || 0);
    const media = baseLine.media || item.media || "";
    const pricing = findPricing(media);
    const rateValue = Number(pricing?.rate ?? item.rate ?? baseLine.rate ?? 0);
    const sqft = width > 0 && height > 0 && qty > 0 ? roundAmount((qty * width * height) / 144) : 0;
    const amount = roundAmount(sqft * rateValue);

    return {
      ...newLine,
      store: baseLine.store,
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
      visualCode: item.visualCode || baseLine.visualCode || "",
      qty: item.qty ? String(item.qty) : baseLine.qty || "",
      width: item.width ? String(item.width) : baseLine.width || "",
      height: item.height ? String(item.height) : baseLine.height || "",
      sqft: sqft ? String(sqft) : "",
      rate: rateValue ? String(rateValue) : baseLine.rate || "",
      amount: amount ? String(amount) : baseLine.amount || "",
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
    if (!group || !group.elements?.length) {
      return { ...line, elementGroup: line.elementGroup };
    }

    const items = group.elements;
    if (!shouldAutoPopulateGroup(line)) {
      return { ...line, elementGroup: line.elementGroup };
    }

    const firstItem = items[0];
    const width = Number(firstItem.width || line.width || 0);
    const height = Number(firstItem.height || line.height || 0);
    const qty = Number(firstItem.qty || line.qty || 0);
    const media = line.media || firstItem.media || "";
    const pricing = findPricing(media);
    const rateValue = Number(pricing?.rate ?? firstItem.rate ?? line.rate ?? 0);
    const sqft = width > 0 && height > 0 && qty > 0 ? roundAmount((qty * width * height) / 144) : 0;
    const amount = roundAmount(sqft * rateValue);

    return {
      ...line,
      elementGroup: line.elementGroup,
      visualCode: firstItem.visualCode || line.visualCode,
      qty: firstItem.qty ? String(firstItem.qty) : line.qty || "",
      width: firstItem.width ? String(firstItem.width) : line.width || "",
      height: firstItem.height ? String(firstItem.height) : line.height || "",
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
      createGroupLine(baseLine, item, `group-${index}`)
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

  const selectedCount = selectedLineIds.length;

  const customerRateRows = useMemo(
    () => getCustomerRates(rateRows, header.client, header.clientName),
    [header.client, header.clientName, rateRows]
  );

  const pricingOptions = useMemo(() => {
    const generalRows = getGeneralRateRows(rateRows);
    const rows = customerRateRows.length ? customerRateRows : generalRows;
    const seen = new Set();

    return rows.filter((row) => {
      const media = normalizeText(row.media);
      if (!media || seen.has(media)) return false;
      seen.add(media);
      return true;
    });
  }, [customerRateRows, rateRows]);

  const jobSelectOptions = useMemo(() => jobOptions, [jobOptions]);

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

  const locationSelectOptions = useMemo(() => buildValueOptions(locationOptions), []);

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
          ...elementGroupRows.flatMap((group) =>
            (group.elements || []).map((item) => item.lamination)
          ),
          ...lines.map((line) => line.lamination),
        ]
      ),
    [elementGroupRows, lines]
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
          ...elementGroupRows.flatMap((group) =>
            (group.elements || []).map((item) => item.mounting)
          ),
          ...lines.map((line) => line.mounting),
        ]
      ),
    [elementGroupRows, lines]
  );

  const implementationSelectOptions = useMemo(
    () => buildValueOptions(implementationDefaults),
    []
  );

  const printReadySelectOptions = useMemo(
    () => buildValueOptions(yesNoOptions),
    []
  );

  const printerSelectOptions = useMemo(
    () => buildValueOptions(printerOptions, lines.map((line) => line.printingMachine)),
    [printerOptions, lines]
  );

  const findPricing = (media) => findPricingFromRows(media, customerRateRows, rateRows);

  const applyPricing = (line, pricing) => {
    if (!pricing) return recalculateLine(line);

    return recalculateLine({
      ...line,
      media: pricing.media || line.media,
      internalMedia: pricing.internalMedia || line.internalMedia || pricing.media || "",
      externalMedia: pricing.externalMedia || line.externalMedia || pricing.media || "",
      hsn: pricing.hsn || line.hsn,
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
        if (line.hsn && line.rate) return line;

        const pricing =
          findPricingFromRows(line.media, customerRateRows, rateRows) ||
          getDefaultPricing(customerRateRows, rateRows);

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
      const nextCustomerRates = getCustomerRates(rateRows, value, clientName);

      setHeader((prev) => ({ ...prev, client: value, clientName }));
      setLines((prev) =>
        prev.map((line) => {
          const pricing =
            findPricingFromRows(
              line.media,
              nextCustomerRates,
              nextCustomerRates.length ? nextCustomerRates : rateRows
            ) || getDefaultPricing(nextCustomerRates, rateRows);

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
      const savedDraft = value ? getAllDrafts()[value] : null;

      if (savedDraft) {
        loadDraft(savedDraft);
        return;
      }

      setHeader((prev) => ({
        ...prev,
        jobNo: value,
        client: clientId,
        clientName,
        subClient: selectedJob?.subClient || prev.subClient,
      }));

      setLines((prev) => {
        if (prev.length) return prev;

        const nextCustomerRates = getCustomerRates(rateRows, clientId, clientName);
        const pricing = getDefaultPricing(nextCustomerRates, rateRows);
        const newLine = createLine(0);
        return [pricing ? applyPricing(newLine, pricing) : newLine];
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
        clientName: createdOption.clientName || customerName,
        subClient: createdOption.subClient || header.subClient,
      };

      setHeader(nextHeader);
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
    if (
      ["jobDeadline", "printerDeadline"].includes(field) &&
      value &&
      value < deadlineMin
    ) {
      toast.warning("Deadline cannot be back dated");
      return;
    }

    const nextValue = ["width", "height"].includes(field) ? maskDimensionValue(value) : value;

    setDraftSyncDisabled(false);

    if (field === "store") {
      const selectedStore = storeMasterRows.find(
        (store) => normalizeText(store.storeName) === normalizeText(nextValue)
      );

      setLines((prev) =>
        prev.map((line) => {
          if (line.id !== id) return line;
          if (!selectedStore) {
            const nextLine = { ...line, store: nextValue };
            return { ...nextLine, sequenceNo: buildLineSequence(nextLine) };
          }

          const nextLine = {
            ...line,
            store: selectedStore.storeName,
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

    if (field === "elementGroup") {
      const group = elementGroupLookup[normalizeText(nextValue)];
      
      setLines((prev) => {
        const lineIndex = prev.findIndex((line) => line.id === id);
        if (lineIndex === -1) return prev;

        const line = prev[lineIndex];
        const updatedLine = { ...line, [field]: nextValue };

        if (!group?.elements?.length) {
          return prev.map((l, idx) => (idx === lineIndex ? updatedLine : l));
        }

        // Replace the selected line with all elements from the group
        const groupLines = group.elements.map((item, index) =>
          createGroupLine({ ...line, [field]: nextValue }, item, `group-${index}`)
        );

        return [...prev.slice(0, lineIndex), ...groupLines, ...prev.slice(lineIndex + 1)];
      });

      return;
    }

    setLines((prev) => {
      const mapped = prev.map((line) => {
        if (line.id !== id) return line;

        const nextLine = { ...line, [field]: nextValue };

        if (["city", "brandingLocation"].includes(field)) {
          nextLine.sequenceNo = buildLineSequence(nextLine);
        }

        if (field === "lamination" && nextValue && !nextLine.laminationFlag) {
          nextLine.laminationFlag = "Yes";
        }

        if (field === "mounting" && nextValue && !nextLine.mountingFlag) {
          nextLine.mountingFlag = "Yes";
        }

        if (field === "media") return applyPricing(nextLine, findPricing(nextValue));

        if (["width", "height", "qty", "rate"].includes(field)) {
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
      const pricing = getDefaultPricing(customerRateRows, rateRows);
      return [...prev, pricing ? applyPricing(newLine, pricing) : newLine];
    });
  };

  const addStore = () => {
    setDraftSyncDisabled(false);

    setLines((prev) => {
      const newLine = { ...createLine(prev.length), store: `Salon/Store ${prev.length + 1}` };
      const pricing = getDefaultPricing(customerRateRows, rateRows);
      return [...prev, pricing ? applyPricing(newLine, pricing) : newLine];
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
      await writeClipboardText(JSON.stringify(rowsToCopy));
    } catch (error) {
      console.warn("Clipboard write failed", error);
    }

    setSaveStatus(`Copied ${rowsToCopy.length} row(s).`);
    toast.success(`Copied ${rowsToCopy.length} row(s)`);
  };

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
      "Branding Location",
      "Sequence",
      "City",
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
          line.brandingLocation,
          line.sequenceNo || buildLineSequence(line),
          line.city,
          line.prodLoc,
          line.billLoc,
          line.salonAddress,
          line.printingMachine,
          line.printReadyFile,
          line.media,
          line.elementGroup,
          line.visualCode,
          line.qty,
          line.hsn,
          line.width,
          line.height,
          line.sqft,
          line.rate,
          line.amount,
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
        BrandingLocation: line.brandingLocation,
        "Branding Location": line.brandingLocation,
        SequenceNo: line.sequenceNo || buildLineSequence(line),
        Sequence: line.sequenceNo || buildLineSequence(line),
        City: line.city,
        CITY: line.city,
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
        VisualCode: line.visualCode,
        "VISUAL CODE": line.visualCode,
        Qty: line.qty,
        QTY: line.qty,
       
        Width: line.width,
        Height: line.height,
        TotalSqFt: String(sqft),
        "Total Sq.ft": String(sqft),
        "Total Sq.f": String(sqft),
        Rate: String(rate),
        Amount: String(amount),
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
        downloadCsv();
      } else if (event.ctrlKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copyLines();
      } else if (event.ctrlKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteLines();
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
              onClick={handleCreateNewJob}
              disabled={isCreatingJob}
              title="Create new job"
            >
              <FilePlus size={16} />
              <span>{isCreatingJob ? "Creating..." : "Add New Job"}</span>
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

              <button type="button" title="Copy selected rows" onClick={copyLines}>
                <Copy size={16} />
                <span>Copy</span>
              </button>

              <button type="button" title="Paste copied rows" onClick={pasteLines}>
                <Clipboard size={16} />
                <span>Paste</span>
              </button>

              <button type="button" title="Delete selected" onClick={removeSelected} className="danger">
                <Trash2 size={16} />
                <span>Delete</span>
              </button>

              <button type="button" title="Save" onClick={saveExistingJobLines} disabled={isSaving}>
                <Save size={16} />
                <span>{isSaving ? "Saving" : "Save"}</span>
              </button>

              <button type="button" title="Download CSV" onClick={downloadCsv}>
                <Download size={16} />
                <span>CSV</span>
              </button>

              <button type="button" title="Clear job entry" onClick={clearJobEntry} className="danger">
                <RotateCcw size={16} />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </section>

        <section className="job-entry-form-grid">
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

          <label>
            <span>Job Date</span>
            <div className="job-date-input">
              <DatePicker
                selected={getDatePickerValue(header.date)}
                onChange={(date) => updateHeader("date", date ? formatDate(date) : "")}
                dateFormat="yyyy-MM-dd"
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
            <input type="date" value={header.poDate} onChange={(event) => updateHeader("poDate", event.target.value)} />
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
        </section>

        {saveStatus && <div className="job-save-status">{saveStatus}</div>}
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
                <col className="job-col-sequence" />
                <col className="job-col-small" />
                <col className="job-col-small" />
                <col className="job-col-machine" />
                <col className="job-col-print-ready" />
                <col className="job-col-medium" />
                <col className="job-col-element" />
                <col className="job-col-visual" />
                <col className="job-col-qty" />
                <col className="job-col-number" />
                <col className="job-col-number" />
                <col className="job-col-number" />
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
                  <th colSpan="9">SALON / STORE DETAILS (SHARED ACROSS TS LINES)</th>
                  <th colSpan={productColumns.length + 3}>LINE ITEM</th>
                </tr>
                <tr>
                  <th className="select-col"></th>
                  <th>CITY</th>
                  <th>SALON/STORE NAME</th>
                  <th>SALON/STORE ADDRESS</th>
                  <th>BRANDING LOCATION</th>
                  <th>SEQUENCE</th>
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
                      <input
                        value={line.sequenceNo || buildLineSequence(line)}
                        onChange={(event) => updateLine(line.id, "sequenceNo", event.target.value)}
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
                        options={elementGroupSelectOptions}
                        value={getSelectedOption(elementGroupSelectOptions, line.elementGroup)}
                        onChange={(option) => updateLine(line.id, "elementGroup", option?.value || "")}
                        placeholder="-"
                      />
                    </td>

                    <td>
                      <input value={line.visualCode} onChange={(event) => updateLine(line.id, "visualCode", event.target.value)} />
                    </td>

                    <td>
                      <input value={line.qty} type="number" onChange={(event) => updateLine(line.id, "qty", event.target.value)} />
                    </td>

                    <td>
                      <input value={line.width} type="number" onChange={(event) => updateLine(line.id, "width", event.target.value)} />
                    </td>

                    <td>
                      <input value={line.height} type="number" onChange={(event) => updateLine(line.id, "height", event.target.value)} />
                    </td>

                    <td>
                      <input value={line.sqft} readOnly className="job-readonly-input" />
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
                      <input
                        value={line.jobDeadline}
                        type="datetime-local"
                        min={deadlineMin}
                        onChange={(event) => updateLine(line.id, "jobDeadline", event.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        value={line.printerDeadline}
                        type="datetime-local"
                        min={deadlineMin}
                        onChange={(event) => updateLine(line.id, "printerDeadline", event.target.value)}
                      />
                    </td>

                    <td>
                      <input value={line.remarks} onChange={(event) => updateLine(line.id, "remarks", event.target.value)} />
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
          Shortcuts: Ctrl+S Save - Ctrl+E CSV - Ctrl+C/V Copy/Paste - Ctrl+A Select All - Ctrl+X Delete - Alt+N Add Line - Alt+M New Salon/Store - Esc Clear selection
        </p>
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
