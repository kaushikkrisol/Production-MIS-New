import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Download, RefreshCw, Search } from "react-feather";
import config from "../../../config";
import "./WeeklyAuditReport.css";

const locations = ["All", "North", "South", "East", "West"];

const baseCols = [
  "_id", "JobNo", "userName", "Enteredby", "Entereddat", "Client",
  "SubClient", "Region", "ProductionLocation", "BillingLocation",
  "City", "VisualCode", "NameSubCode", "Qty", "Width", "Height",
  "TotalSqFt", "BillingSqFt", "totalCalcSqFt", "Media", "Lamination",
  "Mounting", "Implementation", "SalonAddress", "Deadline",
  "DesignerName", "DesignerId", "DesignerDeadline",
  "PrinterPrintingName", "PrinterDeadline", "printReadyAvailable",
  "IsOnHold", "Remarks", "PdfUrl", "IsExcelUploaded", "IsPrinitngdone",
  "IsPackingDone", "IsDesignDone", "IsDeliveryDone",
  "IsImplementationDone", "IsImplementationUploadDone",
  "DesignerDeadline", "DeliveryTimestamp", "DeliveryTimestampUtc",
  "ImplementationTimestamp", "ImplementationTimestampUtc", "ActCompleteTime",
  "IsReprinted", "ReprintReason", "emailid", "ipaddress",
  "Lstupdatedt", "Lstupateby", "Del_index",
];

const auditCols = [
  "Entered_to_PrinterDeadline_Hours",
  "Printer_to_Deadline_Hours",
  "Total_Hours",
  "Entered_to_Printer_%",
  "Printer_to_Deadline_%",
  "Missing_PrinterDeadline",
  "Missing_Deadline",
  "Entered_After_PrinterDeadline",
  "PrinterDeadline_After_Deadline",
  "Entered_After_Deadline",
  "SLA_Risk_Flag",
  "Avg_Process_Compliance_%",
];

const finalHeaders = [...baseCols, ...auditCols];

const managementHeaders = [
  "userName",
  "Total_Line_Items",
  "Avg_Total_Hours",
  "Avg_Entered_to_PrinterDeadline_Hours",
  "Avg_Printer_to_Deadline_Hours",
  "Missing_PrinterDeadline_Count",
  "Missing_Deadline_Count",
  "Entered_After_PrinterDeadline_Count",
  "PrinterDeadline_After_Deadline_Count",
  "Entered_After_Deadline_Count",
  "High_Risk_Count",
  "Avg_Process_Compliance_%",
  "Rank",
  "RAG_Status",
];

const clientHeaders = [
  "Client",
  "Total_Line_Items",
  "Avg_Total_Hours",
  "High_Risk_Count",
];

const boolCols = new Set([
  "IsOnHold",
  "IsExcelUploaded",
  "IsPrinitngdone",
  "IsPackingDone",
  "IsDesignDone",
  "IsDeliveryDone",
  "IsImplementationDone",
  "IsImplementationUploadDone",
  "IsReprinted",
  "printReadyAvailable",
  "Del_index",
]);

const fieldKeys = {
  _id: ["_id", "id"],
  JobNo: ["JobNo", "jobNo", "comartjobno"],
  userName: ["userName", "username", "Enteredby", "enteredby"],
  Enteredby: ["Enteredby", "enteredby", "userName", "username"],
  Entereddat: ["Entereddat", "entereddat", "entereddt", "enteredDate", "date"],
  Client: ["Client", "client", "customerName", "customername", "ClientName"],
  SubClient: ["SubClient", "subClient", "subclient"],
  Region: ["Region", "region"],
  ProductionLocation: ["ProductionLocation", "productionLocation", "region"],
  BillingLocation: ["BillingLocation", "billingLocation"],
  City: ["City", "city"],
  VisualCode: ["VisualCode", "visualCode"],
  NameSubCode: ["NameSubCode", "nameSubCode"],
  Qty: ["Qty", "qty", "quantity"],
  Width: ["Width", "width"],
  Height: ["Height", "height"],
  TotalSqFt: ["TotalSqFt", "totalSqFt", "sqft"],
  BillingSqFt: ["BillingSqFt", "billingSqFt"],
  totalCalcSqFt: ["totalCalcSqFt", "TotalCalcSqFt"],
  Media: ["Media", "media"],
  Lamination: ["Lamination", "lamination"],
  Mounting: ["Mounting", "mounting"],
  Implementation: ["Implementation", "implementation"],
  SalonAddress: ["SalonAddress", "salonAddress"],
  Deadline: ["Deadline", "deadline", "jobDeadline"],
  DesignerName: ["DesignerName", "designerName"],
  DesignerId: ["DesignerId", "designerId"],
  DesignerDeadline: ["DesignerDeadline", "designerDeadline"],
  PrinterPrintingName: ["PrinterPrintingName", "printerName", "machineName", "PrintingMachine"],
  PrinterDeadline: ["PrinterDeadline", "printerDeadline"],
  printReadyAvailable: ["printReadyAvailable", "PrintReadyAvailable"],
  IsOnHold: ["IsOnHold", "isOnHold"],
  Remarks: ["Remarks", "remarks"],
  PdfUrl: ["PdfUrl", "pdfUrl"],
  IsExcelUploaded: ["IsExcelUploaded", "isExcelUploaded"],
  IsPrinitngdone: ["IsPrinitngdone", "isPrinitngdone", "isPrintingDone", "isPrintingdone"],
  IsPackingDone: ["IsPackingDone", "isPackingDone"],
  IsDesignDone: ["IsDesignDone", "isDesignDone"],
  IsDeliveryDone: ["IsDeliveryDone", "isDeliveryDone"],
  IsImplementationDone: ["IsImplementationDone", "isImplementationDone"],
  IsImplementationUploadDone: ["IsImplementationUploadDone", "isImplementationUploadDone"],
  DeliveryTimestamp: ["DeliveryTimestamp", "deliveryTimestamp"],
  DeliveryTimestampUtc: ["DeliveryTimestampUtc", "deliveryTimestampUtc"],
  ImplementationTimestamp: ["ImplementationTimestamp", "implementationTimestamp"],
  ImplementationTimestampUtc: ["ImplementationTimestampUtc", "implementationTimestampUtc"],
  ActCompleteTime: ["ActCompleteTime", "actCompleteTime"],
  IsReprinted: ["IsReprinted", "isReprinted", "isReprinted"],
  ReprintReason: ["ReprintReason", "reprintReason"],
  emailid: ["emailid", "emailId"],
  ipaddress: ["ipaddress", "ipAddress"],
  Lstupdatedt: ["Lstupdatedt", "lstupdatedt"],
  Lstupateby: ["Lstupateby", "lstupateby"],
  Del_index: ["Del_index", "del_index"],
};

const pad = (value) => String(value).padStart(2, "0");

const toInputDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toApiDate = (dateText) => {
  const [year, month, day] = String(dateText || "").split("-");
  return `${day}-${month}-${year}`;
};

const formatDisplayDate = (dateText) => {
  if (!dateText) return "-";
  const date = new Date(`${dateText}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getLastCompletedAuditWindow = (baseDate = new Date()) => {
  const date = new Date(baseDate);
  date.setHours(12, 0, 0, 0);

  const day = date.getDay();
  const daysSinceFriday = (day - 5 + 7) % 7;
  const end = new Date(date);
  end.setDate(date.getDate() - daysSinceFriday);

  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  return {
    fromDate: toInputDate(start),
    toDate: toInputDate(end),
  };
};

const getRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const safeSheetName = (name) => {
  const cleaned = String(name || "Unknown")
    .replace(/[:\\/?*[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "Unknown").slice(0, 31);
};

const valueOf = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

const numberValue = (value) => {
  const number = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const toBoolText = (value) => {
  if (value === null || value === undefined || value === "") return value;
  if (typeof value === "boolean") return value ? "True" : "False";
  if ((typeof value === "number" || typeof value === "string") && ["0", "1"].includes(String(value).trim())) {
    return String(value).trim() === "1" ? "True" : "False";
  }

  const text = String(value).trim().toLowerCase();
  if (["true", "yes"].includes(text)) return "True";
  if (["false", "no"].includes(text)) return "False";
  return value;
};

const boolDone = (value) => {
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes"].includes(String(value ?? "").trim().toLowerCase());
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value?.$date) return toDate(value.$date);

  const text = String(value).trim();
  if (!text || ["nan", "nat", "none", "null"].includes(text.toLowerCase())) return null;

  const native = new Date(text);
  if (!Number.isNaN(native.getTime())) return native;

  const match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;

  const [, day, month, year, hour = "0", minute = "0", second = "0"] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const hoursBetween = (start, end) => {
  if (!start || !end) return null;
  return (end.getTime() - start.getTime()) / 3600000;
};

const pct = (part, total) => {
  if (part === null || part === undefined || !total) return null;
  return (part / total) * 100;
};

const avgFiltered = (values, mode) => {
  const nums = values.filter((value) => {
    if (typeof value !== "number" || Number.isNaN(value)) return false;
    if (mode === "gt0") return value > 0;
    if (mode === "ge0") return value >= 0;
    return true;
  });
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
};

const round = (value) =>
  typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(2)) : value;

const computeExtraCols = (row) => {
  const entered = toDate(row.Entereddat);
  const printerDeadline = toDate(row.PrinterDeadline);
  const deadline = toDate(row.Deadline);

  const enteredToPrinter = hoursBetween(entered, printerDeadline);
  const printerToDeadline = hoursBetween(printerDeadline, deadline);
  const total = hoursBetween(entered, deadline);

  const missingPrinter = printerDeadline ? "No" : "Yes";
  const missingDeadline = deadline ? "No" : "Yes";
  const enteredAfterPrinter = entered && printerDeadline && entered > printerDeadline ? "Yes" : "No";
  const printerAfterDeadline = printerDeadline && deadline && printerDeadline > deadline ? "Yes" : "No";
  const enteredAfterDeadline = entered && deadline && entered > deadline ? "Yes" : "No";

  const risk =
    enteredAfterPrinter === "Yes" ||
    missingPrinter === "Yes" ||
    missingDeadline === "Yes" ||
    printerAfterDeadline === "Yes" ||
    enteredAfterDeadline === "Yes"
      ? "High"
      : "OK";

  const printerClean = String(row.PrinterPrintingName || "").toLowerCase().replace(/[ -]/g, "");
  const printingDone = printerClean.includes("outsource") ? true : boolDone(row.IsPrinitngdone);
  const packingDone = boolDone(row.IsPackingDone);
  const deliveryOrImplementationDone = [
    row.IsDeliveryDone,
    row.IsImplementationDone,
    row.IsImplementationUploadDone,
  ].some(boolDone);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const compliance =
    deadline && deadline >= today
      ? 100
      : ([printingDone, packingDone, deliveryOrImplementationDone].filter(Boolean).length / 3) * 100;

  return {
    Entered_to_PrinterDeadline_Hours: round(enteredToPrinter),
    Printer_to_Deadline_Hours: round(printerToDeadline),
    Total_Hours: round(total),
    "Entered_to_Printer_%": round(pct(enteredToPrinter, total)),
    "Printer_to_Deadline_%": round(pct(printerToDeadline, total)),
    Missing_PrinterDeadline: missingPrinter,
    Missing_Deadline: missingDeadline,
    Entered_After_PrinterDeadline: enteredAfterPrinter,
    PrinterDeadline_After_Deadline: printerAfterDeadline,
    Entered_After_Deadline: enteredAfterDeadline,
    SLA_Risk_Flag: risk,
    "Avg_Process_Compliance_%": round(compliance),
  };
};

const normalizeRow = (row, index) => {
  const normalized = {};

  baseCols.forEach((column) => {
    normalized[column] = valueOf(row, fieldKeys[column] || [column]);
  });

  normalized._id = normalized._id?.$oid || normalized._id || `row-${index}`;
  normalized.userName = normalized.userName || normalized.Enteredby || "Unknown";
  normalized.Client = normalized.Client || normalized.SubClient || "Unknown";

  const qty = numberValue(normalized.Qty);
  const width = numberValue(normalized.Width);
  const height = numberValue(normalized.Height);
  if (!normalized.TotalSqFt && qty && width && height) {
    normalized.TotalSqFt = round((qty * width * height) / 144);
  }

  const printerClean = String(normalized.PrinterPrintingName || "").toLowerCase().replace(/[ -]/g, "");
  if (printerClean.includes("outsource")) {
    normalized.IsPrinitngdone = "True";
  }

  boolCols.forEach((column) => {
    if (column in normalized) normalized[column] = toBoolText(normalized[column]);
  });

  return {
    ...normalized,
    ...computeExtraCols(normalized),
  };
};

const buildManagementSummary = (rows) => {
  const groups = rows.reduce((acc, row) => {
    const user = String(row.userName || "Unknown").trim() || "Unknown";
    acc[user] = acc[user] || [];
    acc[user].push(row);
    return acc;
  }, {});

  const summary = Object.entries(groups).map(([userName, items]) => ({
    userName,
    Total_Line_Items: items.length,
    Avg_Total_Hours: round(avgFiltered(items.map((item) => item.Total_Hours), "gt0")),
    Avg_Entered_to_PrinterDeadline_Hours: round(avgFiltered(items.map((item) => item.Entered_to_PrinterDeadline_Hours), "ge0")),
    Avg_Printer_to_Deadline_Hours: round(avgFiltered(items.map((item) => item.Printer_to_Deadline_Hours), "ge0")),
    Missing_PrinterDeadline_Count: items.filter((item) => item.Missing_PrinterDeadline === "Yes").length,
    Missing_Deadline_Count: items.filter((item) => item.Missing_Deadline === "Yes").length,
    Entered_After_PrinterDeadline_Count: items.filter((item) => item.Entered_After_PrinterDeadline === "Yes").length,
    PrinterDeadline_After_Deadline_Count: items.filter((item) => item.PrinterDeadline_After_Deadline === "Yes").length,
    Entered_After_Deadline_Count: items.filter((item) => item.Entered_After_Deadline === "Yes").length,
    High_Risk_Count: items.filter((item) => item.SLA_Risk_Flag === "High").length,
    "Avg_Process_Compliance_%": round(avgFiltered(items.map((item) => item["Avg_Process_Compliance_%"]), "any")),
  }));

  summary.sort((a, b) => (b["Avg_Process_Compliance_%"] || 0) - (a["Avg_Process_Compliance_%"] || 0));

  return summary.map((row, index) => {
    const compliance = row["Avg_Process_Compliance_%"];
    return {
      ...row,
      Rank: index + 1,
      RAG_Status: compliance === null || compliance === undefined ? "" : compliance >= 80 ? "Green" : compliance >= 60 ? "Amber" : "Red",
    };
  });
};

const buildClientSummary = (rows) => {
  const groups = rows.reduce((acc, row) => {
    const client = String(row.Client || "Unknown").trim() || "Unknown";
    acc[client] = acc[client] || [];
    acc[client].push(row);
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([Client, items]) => ({
      Client,
      Total_Line_Items: items.length,
      Avg_Total_Hours: round(avgFiltered(items.map((item) => item.Total_Hours), "gt0")),
      High_Risk_Count: items.filter((item) => item.SLA_Risk_Flag === "High").length,
    }))
    .sort((a, b) => b.Total_Line_Items - a.Total_Line_Items);
};

const rowsForHeaders = (rows, headers) =>
  rows.map((row) =>
    headers.reduce((acc, header) => {
      acc[header] = row[header] ?? "";
      return acc;
    }, {})
  );

const WeeklyAuditReport = () => {
  const defaultWindow = useMemo(() => getLastCompletedAuditWindow(), []);
  const [fromDate, setFromDate] = useState(defaultWindow.fromDate);
  const [toDate, setToDate] = useState(defaultWindow.toDate);
  const [location, setLocation] = useState("All");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isMonday = new Date().getDay() === 1;
  const managementRows = useMemo(() => buildManagementSummary(rows), [rows]);
  const clientRows = useMemo(() => buildClientSummary(rows), [rows]);

  const totals = useMemo(
    () => ({
      rows: rows.length,
      review: rows.filter((row) => row.SLA_Risk_Flag === "High").length,
      compliance: round(avgFiltered(rows.map((row) => row["Avg_Process_Compliance_%"]), "any")) || 0,
    }),
    [rows]
  );

  const fetchAuditRows = async () => {
    const payload = {
      fromDate: toApiDate(fromDate),
      toDate: toApiDate(toDate),
      reporttype: "CS",
      reportid: "CS",
      designername: "NA",
      Designername: "NA",
    };

    const url =
      location === "All"
        ? config.Report.URL.GetallreportNoLocation
        : config.Report.URL.Getallreport;

    if (location !== "All") {
      payload.location = location;
    }

    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });

    return getRows(response.data).map(normalizeRow);
  };

  const generateReport = async () => {
    setLoading(true);
    setMessage("");

    try {
      const nextRows = await fetchAuditRows();
      setRows(nextRows);
      setMessage(
        nextRows.length
          ? `Audit report generated for ${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}.`
          : "No audit rows found for the selected week."
      );
    } catch (error) {
      console.error("Weekly audit report failed", error);
      setRows([]);
      setMessage("Unable to generate weekly audit report. Please check API connection.");
    } finally {
      setLoading(false);
    }
  };

  const resetToWeeklyWindow = () => {
    const window = getLastCompletedAuditWindow();
    setFromDate(window.fromDate);
    setToDate(window.toDate);
  };

  const exportToExcel = () => {
    if (!rows.length) {
      setMessage("Generate report before export.");
      return;
    }

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rowsForHeaders(managementRows, managementHeaders)),
      "Management_Summary"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rowsForHeaders(clientRows, clientHeaders)),
      "Client_Summary"
    );

    const byUser = rows.reduce((acc, row) => {
      const user = String(row.userName || "Unknown").trim() || "Unknown";
      acc[user] = acc[user] || [];
      acc[user].push(row);
      return acc;
    }, {});

    Object.entries(byUser).forEach(([user, userRows]) => {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(rowsForHeaders(userRows, finalHeaders)),
        safeSheetName(user)
      );
    });

    XLSX.writeFile(workbook, `Audit_${fromDate}_${toDate}.xlsx`);
  };

  useEffect(() => {
    if (isMonday) {
      generateReport();
    }
    // Auto-run only on first mount when the screen opens on Monday.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page-wrapper">
      <div className="content weekly-audit-page">
        <div className="weekly-audit-header">
          <div>
            <h4>Weekly Audit Report</h4>
            <p>Saturday to Friday audit window, prepared every Monday.</p>
          </div>
          <div className="weekly-audit-actions">
            <button type="button" className="btn btn-light" onClick={resetToWeeklyWindow}>
              <RefreshCw size={16} />
              Reset Week
            </button>
            <button type="button" className="btn btn-primary" onClick={generateReport} disabled={loading}>
              <Search size={16} />
              {loading ? "Generating..." : "Generate"}
            </button>
            <button type="button" className="btn btn-success" onClick={exportToExcel} disabled={!rows.length}>
              <Download size={16} />
              Excel
            </button>
          </div>
        </div>

        <div className="weekly-audit-filters weekly-audit-filters-compact">
          <label>
            <span>From Saturday</span>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label>
            <span>To Friday</span>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
          <label>
            <span>Location</span>
            <select value={location} onChange={(event) => setLocation(event.target.value)}>
              {locations.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        {message && <div className="weekly-audit-message">{message}</div>}

        <div className="weekly-audit-summary">
          <article>
            <span>Total Line Items</span>
            <strong>{totals.rows}</strong>
          </article>
          <article>
            <span>High Risk</span>
            <strong>{totals.review}</strong>
          </article>
          <article>
            <span>Avg Compliance</span>
            <strong>{totals.compliance}%</strong>
          </article>
          <article>
            <span>Audit Period</span>
            <strong>{formatDisplayDate(fromDate)} - {formatDisplayDate(toDate)}</strong>
          </article>
        </div>

        <div className="card table-list-card">
          <div className="card-body">
            <h5 className="weekly-audit-section-title">Management Summary</h5>
            <div className="table-responsive weekly-audit-table-wrap weekly-audit-summary-table">
              <table className="table table-bordered table-striped weekly-audit-table">
                <thead>
                  <tr>
                    {managementHeaders.map((header) => <th key={header}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {managementRows.length ? (
                    managementRows.map((row) => (
                      <tr key={row.userName}>
                        {managementHeaders.map((header) => (
                          <td key={header}>{row[header] ?? "-"}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={managementHeaders.length} className="text-center">
                        {loading ? "Generating weekly audit report..." : "No audit data generated yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h5 className="weekly-audit-section-title mt-4">Audit Details</h5>
            <div className="table-responsive weekly-audit-table-wrap">
              <table className="table table-bordered table-striped weekly-audit-table">
                <thead>
                  <tr>
                    <th>JobNo</th>
                    <th>userName</th>
                    <th>Entereddat</th>
                    <th>Client</th>
                    <th>SubClient</th>
                    <th>Region</th>
                    <th>PrinterDeadline</th>
                    <th>Deadline</th>
                    <th>Total_Hours</th>
                    <th>SLA_Risk_Flag</th>
                    <th>Avg_Process_Compliance_%</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((row) => (
                      <tr key={row._id}>
                        <td>{row.JobNo || "-"}</td>
                        <td>{row.userName || "-"}</td>
                        <td>{String(row.Entereddat || "-")}</td>
                        <td>{row.Client || "-"}</td>
                        <td>{row.SubClient || "-"}</td>
                        <td>{row.Region || "-"}</td>
                        <td>{String(row.PrinterDeadline || "-")}</td>
                        <td>{String(row.Deadline || "-")}</td>
                        <td>{row.Total_Hours ?? "-"}</td>
                        <td>
                          <span className={row.SLA_Risk_Flag === "OK" ? "audit-ok" : "audit-review"}>
                            {row.SLA_Risk_Flag}
                          </span>
                        </td>
                        <td>{row["Avg_Process_Compliance_%"] ?? "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="11" className="text-center">
                        {loading ? "Generating weekly audit report..." : "No audit data generated yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyAuditReport;
