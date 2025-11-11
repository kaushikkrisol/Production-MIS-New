import React, { useEffect, useState } from 'react';
import DateRangePicker from "react-bootstrap-daterangepicker";
import { Calendar } from "feather-icons-react/build/IconComponents";
import "bootstrap-daterangepicker/daterangepicker.css";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import axios from 'axios';
import { Card, CardBody, Container, Form, Row, Col, Alert, Spinner, Button, Table, Tabs, Tab } from 'react-bootstrap';
import moment from 'moment';
import config from '../../../config';
import './MisReport.css';
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Select from 'react-select';

const MisReport = () => {
  // ---------------- shared state (old tab) ----------------
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [newProduction, setNewProduction] = useState('');
  const productions = ["CS", "Design", "Printing", "Delivery", "Reprint"];
  const locations = ["North", "South", "East", "West","All"];
  const [dateRangeDisplay, setDateRangeDisplay] = useState('');
  const [hasFetched, setHasFetched] = useState(false);

  // under other state
  const [expandedRows, setExpandedRows] = useState({}); // { gangRowIndex: true/false }
  const toggleExpand = (idx) =>
    setExpandedRows((s) => ({ ...s, [idx]: !s[idx] }));

  const [data, setData] = useState([]);
  const [csData, setCsData] = useState([]);
  const [designData, setDesignData] = useState([]);
  const [printingData, setPrintingData] = useState([]);
  const [reprintData, setReprintData] = useState([]);
  const [deliveryData, setDeliveryData] = useState([]);

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  // --------------- NEW: tab control ----------------
  const [activeTab, setActiveTab] = useState('mis');

  // --------------- NEW: GANG (datewise) state ----------------
  const [gangFromDate, setGangFromDate] = useState(null);
  const [gangToDate, setGangToDate] = useState(null);
  const [gangDateRangeDisplay, setGangDateRangeDisplay] = useState('');
  const [gangLocation, setGangLocation] = useState('All');
  const [gangData, setGangData] = useState([]);

  // --------------- NEW: GANG (ALL DATA) state ----------------
  const [gangAllData, setGangAllData] = useState([]);

  // ---------- DEFAULT both date pickers to last 7 days ----------
  useEffect(() => {
    const start = moment().add(-6, 'days');
    const end = moment();

    // MIS
    setFromDate(start.format('DD-MM-YYYY'));
    setToDate(end.format('DD-MM-YYYY'));
    setDateRangeDisplay(`${start.format('DD-MM-YYYY')} - ${end.format('DD-MM-YYYY')}`);

    // GANG
    setGangFromDate(start.format('DD-MM-YYYY'));
    setGangToDate(end.format('DD-MM-YYYY'));
    setGangDateRangeDisplay(`${start.format('DD-MM-YYYY')} - ${end.format('DD-MM-YYYY')}`);
  }, []);

  // ---------- UI handlers ----------
  const handleLocationChange = (e) => setNewLocation(e.target.value);
  const handleProductionChange = (e) => setNewProduction(e.target.value);

  const handleGoReport = async () => {
    setHasFetched(false);

    if (!newProduction) { alert("Please select a Report Type"); return; }
    if (!newLocation) { alert("Please select a Location"); return; }
    if (!fromDate || !toDate) { alert("Please select a Date Range"); return; }

    try {
      await fetchReport();
      setHasFetched(true);
    } catch (err) {
      console.error("Error in handleGoReport:", err);
      setHasFetched(true);
    }
  };

  // ---------- Date helpers / shared numeric helpers ----------
  const parseDateLoose = (v) => {
    if (!v) return null;
    // Try a few common formats; moment can also parse ISO automatically
    const candidates = Array.isArray(v) ? v : [v];
    for (const c of candidates) {
      if (!c) continue;
      const m =
        moment(c, moment.ISO_8601, true).isValid() ? moment(c) :
        moment(c, ["DD-MM-YYYY HH:mm:ss","DD/MM/YYYY HH:mm:ss","YYYY-MM-DD HH:mm:ss","DD-MM-YYYY","DD/MM/YYYY","YYYY-MM-DD"], true);
      if (m.isValid()) return m;
    }
    return null;
  };

  const formatOnlyDate = (v) => {
    const m = parseDateLoose(v);
    return m ? m.local().format("DD/MMM/YYYY") : "-";
  };

  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const getFormattedDate = (item) => {
    const m =
      parseDateLoose(item?.date) ||
      parseDateLoose(item?.entereddt) ||
      parseDateLoose(item?.enteredDate) ||
      parseDateLoose(item?.lstupdatedt);
    return m ? m.format("DD/MMM/YYYY") : "-";
  };

  // === numeric helpers for exports ===
  const isNilish = (v) => v == null || String(v).trim() === '' || String(v).toLowerCase() === 'bsonnull';

  // only convert if it is a "pure" number
  const toNumberIfNumeric = (v) => {
    if (isNilish(v)) return v;
    if (typeof v === 'number') return v;
    const s = String(v).trim();
    if (/^[+-]?\d+(\.\d+)?$/.test(s)) {
      const n = Number(s);
      return Number.isFinite(n) ? n : v;
    }
    return v;
  };

  // per-report keys we want as numbers in Excel
  const numericKeysByReport = {
    CS: new Set(['qty','width','height','totalSqFt']),
    Design: new Set(['qty','width','height','totalSqFt']),
    Printing: new Set(['qty','width','height','totalSqFt']),
    Delivery: new Set(['width','height','totalSqFt']),
    Reprint: new Set(['qty','width','height','totalSqFt']),
  };

  // gang summary numeric keys
  const gangNumericKeys = new Set(['MediaWidth','MediaLength','MediaSqFt','ActualSqFt']);

  // robust numeric
  const numStrict = (v) => {
    if (v == null) return 0;
    const n = Number(String(v).replace(/[^0-9.\-eE]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  // ---------- API (old tab) ----------
  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    const reportIdByType = {
      CS: "CS",
      Design: "Design",
      Printing: "Printing",
      Delivery: "Delivery",
      Reprint: "Reprint",
    };

    const payload = {
      fromDate,
      toDate,
      reporttype: newProduction,
      reportid: reportIdByType[newProduction] ?? newProduction,
      designername: newProduction === "Design" ? "All" : "NA",
    };

    payload.Designername = payload.designername;

    const url =
      newLocation === "All"
        ? config.Report.URL.GetallreportNoLocation
        : config.Report.URL.Getallreport;

    if (newLocation !== "All") {
      payload.location = newLocation;
    }

    try {
      const response = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 && response.data) {
        switch (newProduction) {
          case "CS":
            setCsData(response.data);
            break;
          case "Design": {
            const dataWithTimeTaken = response.data.map((row) => {
              if (row.startdate && row.enddate) {
                const start = moment(row.startdate, "DD/MM/YYYY HH:mm:ss");
                const end = moment(row.enddate, "DD/MM/YYYY HH:mm:ss");
                if (start.isValid() && end.isValid()) {
                  const d = moment.duration(end.diff(start));
                  return { ...row, totalTime: `${d.hours()}h ${d.minutes()}m` };
                }
              }
              return { ...row, totalTime: "N/A" };
            });
            setDesignData(dataWithTimeTaken);
            break;
          }
          case "Printing":
            setPrintingData(response.data);
            break;
          case "Delivery":
            setDeliveryData(response.data);
            break;
          case "Reprint": {
            const isTrueish = (v) => {
              const s = String(v ?? "").trim().toLowerCase();
              return s === "1" || s === "true" || s === "yes" || s === "y";
            };
            const rows = response.data
              .filter(r => isTrueish(r.isPrinitngdone ?? r.isPrintingdone ?? r.isPrintingDone ?? r.isReprinted))
              .map(r => ({
                ...r,
                region: r.Region ?? r.region ?? "",
                branch: r.Branch ?? r.branch ?? r.productionLocation ?? "",
              }));
            setReprintData(rows);
            break;
          }
          default:
            console.warn("Unknown production type");
        }
        setData(response.data);
      } else {
        setError(`Failed to fetch data, status: ${response.status}`);
        setData([]);
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Date Range (old tab) ----------
  const handleDateRangeChange = (event, picker) => {
    const from = moment(picker.startDate).format('DD-MM-YYYY');
    const to = moment(picker.endDate).format('DD-MM-YYYY');
    setFromDate(from);
    setToDate(to);
    setDateRangeDisplay(`${from} - ${to}`);
  };

  const initialSettings = {
    endDate: new Date(),
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    timePicker: false,
    ranges: {
      "Today": [new Date(), new Date()],
      "Yesterday": [new Date(new Date().setDate(new Date().getDate() - 1)), new Date()],
      "Last 7 Days": [new Date(new Date().setDate(new Date().getDate() - 6)), new Date()],
      "Last 30 Days": [new Date(new Date().setDate(new Date().getDate() - 30)), new Date()],
      "This Month": [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)],
      "Last Month": [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), new Date(new Date().getFullYear(), new Date().getMonth(), 0)],
    },
  };

  // ---------- Printing/Gang helpers ----------
  const resolveMediaAreaSqFt = (row) => {
    if (!row || typeof row !== 'object') return null;

    const directAreaKeys = ['mediaSqFt','MediaSqFt','totalMediaSqFt','TotalMediaSqFt','media_area_sqft'];
    for (const k of directAreaKeys) {
      if (row[k] != null && row[k] !== '') {
        const area = num(row[k]);
        if (area > 0) return area;
      }
    }

    const wKeys = ['MediaWidth','mediaWidth','media_width','mediaW','mw','Media_W','Media_Width'];
    const lKeys = [
      'MediaLength','mediaLength','media_length',
      'MediaHeight','mediaHeight','media_height',
      'mediaL','ml','Media_L','Media_Length','Media_Height'
    ];

    let mw = 0, ml = 0;
    for (const wk of wKeys) { if (row[wk] != null && row[wk] !== '') { mw = num(row[wk]); break; } }
    for (const lk of lKeys) { if (row[lk] != null && row[lk] !== '') { ml = num(row[lk]); break; } }

    if (mw > 0 && ml > 0) return (mw * ml) / 144;

    const altW = num(row.mediaW || row.rollWidth || row.paperWidth);
    const altL = num(row.mediaL || row.rollLength || row.paperLength);
    if (altW > 0 && altL > 0) return (altW * altL) / 144;

    return null;
  };

  // Old tab (Printing rows) – compute using derived actual sqft
  const computeWastagePct = (row) => {
    const mediaAreaSqFt = resolveMediaAreaSqFt(row);
    if (!mediaAreaSqFt || mediaAreaSqFt <= 0) return '-';

    const w = num(row.width);
    const h = num(row.height);
    const qty = num(row.qty);
    const actualSqFt = (w * h * qty) / 144;

    if (!Number.isFinite(actualSqFt) || actualSqFt <= 0) return '-';
    if (mediaAreaSqFt <= actualSqFt) return 'Invalid (Media ≤ Actual)';

    const pct = ((mediaAreaSqFt - actualSqFt) / mediaAreaSqFt) * 100;
    return Number.isFinite(pct) ? `${pct.toFixed(2)} %` : '-';
  };

  // ---------- Table Configs (old tab) ----------
  const tableConfigs = {
    CS: { headers: [
      { label: "Job No", key: "jobNo" },
      { label: "Job Date", key: "date" },
      { label: "Sub Client", key: "subClient" },
      { label: "Billing Location", key: "billingLocation" },
      { label: "Production Location", key: "region" },
      { label: "Visual Code", key: "visualCode" },
      { label: "Product Details", key: "nameSubCode" },
      { label: "Qty", key: "qty" },
      { label: "Width", key: "width" },
      { label: "Height", key: "height" },
      { label: "Total Sq.Ft", key: "totalSqFt" },
      { label: "Media", key: "media" },
      { label: "Lamination", key: "lamination" },
      { label: "Mounting", key: "mounting" },
      { label: "Implementation", key: "implementation" },
      { label: "Salon / Store Address", key: "salonAddress" },
      { label: "City", key: "city" },
      { label: "Print Ready File", key: "printReadyAvailable" },
      { label: "Designer Name", key: "designerName" },
      { label: "Designer Deadline", key: "designerDeadline" },
      { label: "Printing Machine", key: "machineName" },
      { label: "Printer Deadline", key: "printerDeadline" },
      { label: "Client", key: "client" },
      { label: "User Name", key: "userName" },
      { label: "Job Deadline", key: "deadline" },
      { label: "Dispatch Address", key: "dispatchAddress" },
      { label: "Remarks / Instructions", key: "remarks" },
    ]},
    Design: { headers: [
      { label: "Job No", key: "jobNo" },
      { label: "Job Date", key: "date" },
      { label: "Sub Client", key: "subClient" },
      { label: "Billing Location", key: "billingLocation" },
      { label: "Production Location", key: "region" },
      { label: "Visual Code", key: "visualCode" },
      { label: "Product Details", key: "nameSubCode" },
      { label: "Qty", key: "qty" },
      { label: "Width", key: "width" },
      { label: "Height", key: "height" },
      { label: "Total Sq.Ft", key: "totalSqFt" },
      { label: "Media", key: "media" },
      { label: "Lamination", key: "lamination" },
      { label: "Mounting", key: "mounting" },
      { label: "Implementation", key: "implementation" },
      { label: "Salon / Store Address", key: "salonAddress" },
      { label: "City", key: "city" },
      { label: "Print Ready File", key: "printReadyAvailable" },
      { label: "Designer Name", key: "designerName" },
      { label: "Designer Deadline", key: "designerDeadline" },
      { label: "Printing Machine", key: "machineName" },
      { label: "Printer Deadline", key: "printerDeadline" },
      { label: "Client", key: "client" },
      { label: "User Name", key: "userName" },
      { label: "Job Deadline", key: "deadline" },
      { label: "Dispatch Address", key: "dispatchAddress" },
      { label: "Remarks / Instructions", key: "remarks" },
      { label: "No Of Artworker", key: "noOfArtworker" },
      { label: "Brief", key: "designBrief" },
      { label: "Query", key: "designQuery" },
      { label: "Design Type", key: "designType" },
      { label: "CS Name", key: "Entrdby" },
      { label: "Artworker Deadline", key: "artworkerDeadline" },
      { label: "Start Time", key: "startdate" },
      { label: "End Time", key: "enddate" },
      { label: "Time Taken", key: "totalTime" }
    ]},
    Printing: { headers: [
      { label: "Job No", key: "jobNo" },
      { label: "Job Date", key: "date" },
      { label: "Sub Client", key: "subClient" },
      { label: "Billing Location", key: "billingLocation" },
      { label: "Production Location", key: "region" },
      { label: "Visual Code", key: "visualCode" },
      { label: "Product Details", key: "nameSubCode" },
      { label: "Qty", key: "qty" },
      { label: "Width", key: "width" },
      { label: "Height", key: "height" },
      { label: "Total Sq.Ft", key: "totalSqFt" },
      { label: "Media", key: "media" },
      { label: "Lamination", key: "lamination" },
      { label: "Mounting", key: "mounting" },
      { label: "Implementation", key: "implementation" },
      { label: "Salon / Store Address", key: "salonAddress" },
      { label: "City", key: "city" },
      { label: "Print Ready File", key: "printReadyAvailable" },
      { label: "Designer Name", key: "designerName" },
      { label: "Printing Machine", key: "printerName" },
      { label: "Printer Deadline", key: "printerDeadline" },
      { label: "Client", key: "client" },
      { label: "User Name", key: "userName" },
      { label: "Job Deadline", key: "deadline" },
      { label: "Dispatch Address", key: "dispatchAddress" },
      { label: "Remarks / Instructions", key: "remarks" },
      { label: "Job Start Date", key: "startdate" },
      { label: "Job End Date", key: "enddate" },
      { label: "Account Manager", key: "userName" },
    ]},
    Delivery: { headers: [
      { label: "Job No", key: "jobNo" },
      { label: "Job Date", key: "date" },
      { label: "Client", key: "client" },
      { label: "Sub Client", key: "subClient" },
      { label: "User Name", key: "userName" },
      { label: "Production Location", key: "region" },
      { label: "Visual Code", key: "visualCode" },
      { label: "Product Details", key: "nameSubCode" },
      { label: "City", key: "city" },
      { label: "Qty", key: "qty" },
      { label: "Media", key: "media" },
      { label: "Lamination", key: "lamination" },
      { label: "Mounting", key: "mounting" },
      { label: "Implementation", key: "implementation" },
      { label: "Salon / Store Address", key: "salonAddress" },
      { label: "Dispatch Address", key: "dispatchAddress" },
      { label: "Job Deadline", key: "deadline" },
      { label: "Remarks / Instructions", key: "remarks" },
      { label: "Entered By", key: "enteredby" },
      { label: "Entered Date", key: "entereddt" },
      { label: "Last Update By", key: "lstupateby" },
      { label: "Last Updated By", key: "lstupdatedt" },
      { label: "Width", key: "width" },
      { label: "Height", key: "height" },
      { label: "Total Sq.Ft", key: "totalSqFt" },
      { label: "Delivery By", key: "deliveryBy" },
      { label: "Delivery Date", key: "deliveryDate" },
      { label: "Delivery To", key: "deliveryTo" }
    ]},
    Reprint: { headers: [
      { label: "Job No", key: "jobNo" },
      { label: "Job Date", key: "date" },
      { label: "Client", key: "client" },
      { label: "Production Branch", key: "branch" },
      { label: "Sub Client", key: "subClient" },
      { label: "User Name", key: "userName" },
      { label: "Visual Code", key: "visualCode" },
      { label: "Product Details", key: "nameSubCode" },
      { label: "City", key: "city" },
      { label: "Qty", key: "qty" },
      { label: "Media", key: "media" },
      { label: "Implementation", key: "implementation" },
      { label: "Job Deadline", key: "deadline" },
      { label: "Salon / Store Address", key: "salonAddress" },
      { label: "Dispatch Address", key: "dispatchAddress" },
      { label: "Remarks / Instructions", key: "remarks" },
      { label: "Width", key: "width" },
      { label: "Height", key: "height" },
      { label: "Total Sq.Ft", key: "totalSqFt" },
      { label: "Reprint Reason", key: "reprintReason" },
      { label: "Printing Done", key: "__printingDone__" },
    ]}
  };

  // ---------- Export helpers (old tab) ----------
  const pickReportData = () => {
    switch (newProduction) {
      case "CS": return csData;
      case "Design": return designData;
      case "Printing": return printingData;
      case "Delivery": return deliveryData;
      case "Reprint": return reprintData;
      default: return [];
    }
  };

  // === UPDATED: coerce numeric-looking fields into Numbers for Excel ===
  const mapRowForHeaders = (row, headers) => {
    const isTrueish = (v) => {
      const s = String(v ?? "").trim().toLowerCase();
      return s === "1" || s === "true" || s === "yes" || s === "y";
    };

    const numericKeys = numericKeysByReport[newProduction] ?? new Set();

    const out = {};
    headers.forEach(({ label, key }) => {
      let val;

      if (key === "date") {
        val = getFormattedDate(row);
      } else if (key === "__wastage__") {
        val = newProduction === "Printing" ? computeWastagePct(row) : "-";
      } else if (key === "__printingDone__") {
        const v = row.isPrinitngdone ?? row.isPrintingdone ?? row.isPrintingDone ?? row.isReprinted;
        val = isTrueish(v) ? "Yes" : "No";
      } else {
        val = row[key] ?? '';
      }

      if (numericKeys.has(key)) {
        val = toNumberIfNumeric(val);
      }

      out[label] = val;
    });
    return out;
  };

  const exportToExcel = () => {
    const reportConfig = tableConfigs[newProduction];
    if (!reportConfig) return alert("Invalid report type selected.");

    const reportData = pickReportData();
    if (!Array.isArray(reportData) || reportData.length === 0) return alert("No data available for export.");

    const transformedData = reportData.map(item => mapRowForHeaders(item, reportConfig.headers));
    const worksheet = XLSX.utils.json_to_sheet(transformedData);
    worksheet['!cols'] = reportConfig.headers.map(() => ({ wch: 20 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, "Report.xlsx");
  };

  const exportToCsv = () => {
    const reportConfig = tableConfigs[newProduction];
    if (!reportConfig) return alert("Invalid report type selected.");

    const reportData = pickReportData();
    if (!Array.isArray(reportData) || reportData.length === 0) return alert("No data available for export.");

    const transformedData = reportData.map(item => mapRowForHeaders(item, reportConfig.headers));
    const worksheet = XLSX.utils.json_to_sheet(transformedData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPdf = () => {
    const reportConfig = tableConfigs[newProduction];
    if (!reportConfig) return alert("Invalid report type selected.");

    const reportData = pickReportData();
    if (!Array.isArray(reportData) || reportData.length === 0) return alert("No data available for export.");

    const headerLabels = reportConfig.headers.map(h => h.label);
    const transformedData = reportData.map(item => mapRowForHeaders(item, reportConfig.headers));
    const tableRows = transformedData.map(row => headerLabels.map(lbl => row[lbl] || "-"));

    const doc = new jsPDF("landscape", "pt", "A2");
    doc.setFontSize(10);
    doc.text(`Report`, 40, 30);

    doc.autoTable({
      startY: 50,
      head: [headerLabels],
      body: tableRows,
      styles: { fontSize: 9, overflow: "linebreak", cellPadding: 5 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      columnStyles: { cellWidth: 'auto' },
      tableWidth: 'wrap',
      margin: { top: 50 },
    });

    doc.save(`Report.pdf`);
  };

  // ---------- Render main table (old tab) ----------
  const renderTable = () => {
    const cfg = tableConfigs[newProduction];
    if (!cfg) return null;

    const reportData = pickReportData();

    if (hasFetched && (!Array.isArray(reportData) || reportData.length === 0)) {
      return <div>No data available for the selected report type.</div>;
    }

    return (
      <>
        {reportData.length > 0 && (
          <Card className="mt-4">
            <CardBody style={{ padding: "0" }}>
              <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "500px", border: "1px solid #ccc" }}>
                <Table
                  striped
                  bordered
                  hover
                  className="tableBody"
                  style={{ minWidth: "1200px", tableLayout: "auto", marginBottom: 0 }}
                >
                  <thead className="table-dark">
                    <tr>
                      {cfg.headers.map((header, index) => (
                        <th key={index}>{header.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {cfg.headers.map((header, colIndex) => (
                          <td key={colIndex}>
                            {header.key === "date"
                              ? getFormattedDate(row)
                              : header.key === "__wastage__"
                                ? (newProduction === "Printing" ? computeWastagePct(row) : "-")
                                : header.key === "__printingDone__"
                                  ? (() => {
                                      const v = row.isPrinitngdone ?? row.isPrintingdone ?? row.isPrintingDone ?? row.isReprinted;
                                      return (String(v ?? "").trim().toLowerCase() === "1" || String(v ?? "").trim().toLowerCase() === "true" || String(v ?? "").trim().toLowerCase() === "yes" || String(v ?? "").trim().toLowerCase() === "y") ? "Yes" : "No";
                                    })()
                                  : (row[header.key] ?? "-")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        )}
      </>
    );
  };

  // ===================== NEW: GANG (DATEWISE) TAB =====================
  const printingHeaders = tableConfigs.Printing.headers; // reuse Printing columns

  const renderPrintingCell = (row, key) => {
    if (key === "date") return getFormattedDate(row);
    if (key === "printerName") {
      return row.printerName ?? row.PrinterName ?? row.Printer ?? row.printer ?? "-";
    }
    return row[key] ?? "-";
  };

  const computeGangWastagePct = (row) => {
    const media = numStrict(row.MediaSqFt ?? row.mediaSqFt);
    const actual = numStrict(row.ActualSqFt ?? row.actualSqFt);
    if (media <= 0 || actual <= 0) return '-';
    if (media <= actual) return 'Invalid (Media ≤ Actual)';
    const pct = ((media - actual) / media) * 100;
    return `${pct.toFixed(2)} %`;
  };

  // --- NEW: choose GangDate fallback when missing (use last-updated fields or latest child job date) ---
  const pickFallbackGangDate = (row) => {
    // 1) Prefer explicit gang-level updated fields if present
    const gangLevelCandidates = [
      row.GangDate, row.gangDate, row.createdAt, row.CreatedAt,
      row.updatedAt, row.UpdatedAt, row.lastUpdated, row.LastUpdated,
      row.Lstupdatedate, row.lstupdatedate, row.lstupdatedt, row.LstUpdatedDt, row.LstUpdatedDate
    ];
    const gangParsed = parseDateLoose(gangLevelCandidates.filter(Boolean));
    if (gangParsed) return gangParsed.toISOString();

    // 2) Otherwise compute max date from child jobs
    const jobs = Array.isArray(row.JobsData) ? row.JobsData : [];
    let best = null;
    jobs.forEach(p => {
      const childCandidates = [
        p.enddate, p.EndDate,
        p.Lstupdatedate, p.lstupdatedate, p.lstupdatedt, p.LstUpdatedDate,
        p.entereddt, p.EnteredDt,
        p.date, p.Date, p.createdAt
      ].filter(Boolean);
      const m = parseDateLoose(childCandidates);
      if (m && (!best || m.isAfter(best))) best = m;
    });
    return best ? best.toISOString() : null;
  };

  // gang headers
  const gangHeaders = [
    { label: "", key: "__expand__" },
    { label: "Printer", key: "PrinterName" },
    { label: "Media Width (in)", key: "MediaWidth" },
    { label: "Media Length/Height (in)", key: "MediaLength" },
    { label: "Media Sq.Ft", key: "MediaSqFt" },
    { label: "Actual Sq.Ft", key: "ActualSqFt" },
    { label: "Wastage %", key: "__gang_wastage_pct__" },
    { label: "Jobs Count", key: "__gang_jobs__" },
    { label: "Job Nos", key: "JobNos" },
    { label: "Date", key: "GangDate" }
  ];

  const handleGangDateRangeChange = (event, picker) => {
    const from = moment(picker.startDate).format('DD-MM-YYYY');
    const to = moment(picker.endDate).format('DD-MM-YYYY');
    setGangFromDate(from);
    setGangToDate(to);
    setGangDateRangeDisplay(`${from} - ${to}`);
  };

  const initialGangSettings = {
    endDate: new Date(),
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    timePicker: false,
    ranges: initialSettings.ranges,
  };

  const fetchGangReport = async () => {
    if (!gangFromDate || !gangToDate) {
      return alert("Please pick a date range for Gang report.");
    }
    setLoading(true);
    setError(null);
    try {
      const payload = { fromDate: gangFromDate, toDate: gangToDate };
      if (gangLocation && gangLocation !== 'All') payload.location = gangLocation;

      const res = await axios.post(
        config.Report.URL.GetGangReport,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      const rows = Array.isArray(res.data) ? res.data : [];

      const normalized = rows.map((r) => {
        const jobsArr = r.Jobs ?? r.jobs ?? r.Jobids ?? r.jobids ?? [];
        const wastageVal = r.Wastage ?? r.wastage ?? r.Wasteage ?? r.wasteage ?? "";
        const wastagePerVal = r.WastagePer ?? r.wastagePer ?? r.WasteagePer ?? r.wasteagePer ?? "";

        const jobsDataRaw = r.JobsData ?? r.jobsData ?? [];
        const jobsData = Array.isArray(jobsDataRaw) ? jobsDataRaw.map((p) => ({
          jobNo: p.JobNo ?? p.jobNo ?? "",
          date: p.Date ?? p.date ?? p.entereddt ?? p.Lstupdatedate ?? "",
          subClient: p.SubClient ?? p.subClient ?? "",
          billingLocation: p.BillingLocation ?? p.billingLocation ?? "",
          region: p.Region ?? p.region ?? "",
          visualCode: p.VisualCode ?? p.visualCode ?? "",
          nameSubCode: p.NameSubCode ?? p.nameSubCode ?? "",
          qty: p.Qty ?? p.qty ?? "",
          width: p.Width ?? p.width ?? "",
          height: p.Height ?? p.height ?? "",
          totalSqFt: p.TotalSqFt ?? p.totalSqFt ?? "",
          media: p.Media ?? p.media ?? "",
          lamination: p.Lamination ?? p.lamination ?? "",
          mounting: p.Mounting ?? p.mounting ?? "",
          implementation: p.Implementation ?? p.implementation ?? "",
          salonAddress: p.SalonAddress ?? p.salonAddress ?? "",
          city: p.City ?? p.city ?? "",
          printReadyAvailable: p.PrintReadyFile ?? p.printReadyAvailable ?? "",
          designerName: p.DesignerName ?? p.designerName ?? "",
          printerName: p.printerName ?? p.PrinterName ?? "",
          printerDeadline: p.printerDeadline ?? "",
          client: p.Client ?? p.client ?? "",
          userName: p.UserName ?? p.userName ?? "",
          deadline: p.Deadline ?? p.deadline ?? "",
          dispatchAddress: p.DispatchAddress ?? p.dispatchAddress ?? "",
          remarks: p.Remarks ?? p.remarks ?? "",
          startdate: p.startdate ?? "",
          enddate: p.enddate ?? "",
        })) : [];

        // GangDate with fallback to last updated or latest child job date
        const pickedGangDate =
          r.GangDate ?? r.gangDate ?? r.createdAt ?? r.CreatedAt ??
          r.updatedAt ?? r.UpdatedAt ?? r.lastUpdated ?? r.LastUpdated ??
          r.Lstupdatedate ?? r.lstupdatedate ?? r.lstupdatedt ?? r.LstUpdatedDt ?? r.LstUpdatedDate ??
          pickFallbackGangDate({ ...r, JobsData: jobsData });

        return {
          ...r,
          PrinterName: r.PrinterName ?? r.printerName ?? r.printer ?? r.Printer ?? "",
          MediaWidth: r.MediaWidth ?? r.mediaWidth ?? "",
          MediaLength: r.MediaLength ?? r.MediaHeight ?? r.mediaLength ?? r.mediaHeight ?? "",
          MediaSqFt: r.MediaSqFt ?? r.mediaSqFt ?? "",
          ActualSqFt: r.ActualSqFt ?? r.actualSqFt ?? "",
          Wastage: wastageVal,
          WastagePer: wastagePerVal,
          Jobs: Array.isArray(jobsArr) ? jobsArr : [],
          JobsCount: r.JobsCount ?? r.jobsCount ?? (Array.isArray(jobsArr) ? jobsArr.length : 0),
          Region: r.Region ?? r.region ?? "",
          ProductionLocation: r.ProductionLocation ?? r.productionLocation ?? r.Location ?? r.location ?? "",
          JobsData: jobsData,
          GangDate: pickedGangDate || null,
        };
      });

      setGangData(normalized);

    } catch (err) {
      console.error(err);
      setError("Failed to fetch Gang report.");
      setGangData([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Build job-level rows by apportioning gang MediaSqFt ----------
  const deriveJobLevelFromGang_ProportionalMedia = (gangRows) => {
    const out = [];

    gangRows.forEach(g => {
      const printer = g.PrinterName || g.Printer || '';
      const gangMedia = numStrict(g.MediaSqFt);
      const gangActual = numStrict(g.ActualSqFt);

      const jobs = Array.isArray(g.JobsData) ? g.JobsData : [];
      const jobActuals = jobs.map(p => {
        const totalSqFt = numStrict(p.totalSqFt);
        const w = numStrict(p.width), h = numStrict(p.height), q = numStrict(p.qty || 1);
        const fallbackActual = (w * h * (q || 1)) / 144;
        const actual = totalSqFt > 0 ? totalSqFt : fallbackActual;
        return { p, actual };
      });

      const gangActualSum = jobActuals.reduce((a, x) => a + x.actual, 0) || gangActual;

      const m = new Map();
      jobActuals.forEach(({ p, actual }) => {
        const jobNo = p.jobNo || p.JobNo || '';
        if (!jobNo) return;
        if (!m.has(jobNo)) {
          m.set(jobNo, {
            JobNo: jobNo,
            Printer: printer,
            Client: p.client || p.Client || '',
            SubClient: p.subClient || p.SubClient || '',
            Region: p.region || p.Region || '',
            ActualSqFt: 0,
            Lines: 0,
          });
        }
        const acc = m.get(jobNo);
        acc.ActualSqFt += actual;
        acc.Lines += 1;
      });

      m.forEach((acc) => {
        const mediaForJob = (gangMedia > 0 && gangActualSum > 0)
          ? (gangMedia * (acc.ActualSqFt / gangActualSum))
          : 0;

        out.push({
          JobNo: acc.JobNo,
          Printer: acc.Printer,
          Client: acc.Client,
          SubClient: acc.SubClient,
          Region: acc.Region,
          MediaSqFt: Number(mediaForJob.toFixed(4)),
          ActualSqFt: Number(acc.ActualSqFt.toFixed(4)),
          WastagePct: (mediaForJob > acc.ActualSqFt && mediaForJob > 0)
            ? (((mediaForJob - acc.ActualSqFt) / mediaForJob) * 100).toFixed(2) + ' %'
            : (mediaForJob === 0 || acc.ActualSqFt === 0) ? '-' : 'Invalid (Media ≤ Actual)',
          Lines: acc.Lines,
        });
      });
    });

    const byKey = new Map();
    out.forEach(r => {
      const k = `${r.JobNo}||${r.Printer}`;
      if (!byKey.has(k)) byKey.set(k, { ...r });
      else {
        const t = byKey.get(k);
        t.MediaSqFt += r.MediaSqFt;
        t.ActualSqFt += r.ActualSqFt;
        t.Lines += r.Lines;
      }
    });

    return Array.from(byKey.values()).map(r => {
      const pct = (r.MediaSqFt > r.ActualSqFt && r.MediaSqFt > 0)
        ? (((r.MediaSqFt - r.ActualSqFt) / r.MediaSqFt) * 100).toFixed(2) + ' %'
        : (r.MediaSqFt === 0 || r.ActualSqFt === 0) ? '-' : 'Invalid (Media ≤ Actual)';
      return { ...r, WastagePct: pct };
    });
  };

  const renderGangTable = () => {
    if (!gangData.length) return null;

    const totals = gangData.reduce(
      (acc, r) => {
        acc.media += numStrict(r.MediaSqFt);
        acc.actual += numStrict(r.ActualSqFt);
        acc.wastage += numStrict(r.Wastage);
        acc.jobs += (r.JobsCount ?? 0) || (Array.isArray(r.Jobs) ? r.Jobs.length : 0);
        return acc;
      },
      { media: 0, actual: 0, wastage: 0, jobs: 0 }
    );

    const fmt2 = (v) => {
      const n = numStrict(v);
      return Number.isFinite(n) ? n.toFixed(2) : '-';
    };

    return (
      <Card className="mt-4">
        <CardBody style={{ padding: 0 }}>
          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 500, border: "1px solid #ccc" }}>
            <Table striped bordered hover className="tableBody" style={{ minWidth: 1150, marginBottom: 0 }}>
              <thead className="table-dark">
                <tr>
                  {gangHeaders.map((h, i) => <th key={i}>{h.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {gangData.map((row, idx) => (
                  <React.Fragment key={idx}>
                    <tr>
                      {gangHeaders.map((h, j) => (
                        <td key={j}>
                          {h.key === "__expand__" ? (
                            <Button
                              size="sm"
                              variant={expandedRows[idx] ? "secondary" : "primary"}
                              onClick={() => toggleExpand(idx)}
                            >
                              {expandedRows[idx] ? "Hide Jobs" : `View Jobs (${row.JobsData?.length || 0})`}
                            </Button>
                          ) : h.key === "MediaWidth" || h.key === "MediaLength" || h.key === "MediaSqFt" || h.key === "ActualSqFt"
                            ? fmt2(row[h.key])
                            : h.key === "__gang_wastage_pct__"
                            ? computeGangWastagePct(row)
                            : h.key === "__gang_jobs__"
                            ? ((row.JobsCount ?? 0) || (Array.isArray(row.Jobs) ? row.Jobs.length : 0))
                            : h.key === "JobNos"
                            ? (Array.isArray(row.JobNos) && row.JobNos.length ? row.JobNos.join(", ") : "-")
                            : h.key === "GangDate"
                            ? formatOnlyDate(row.GangDate)
                            : (row[h.key] ?? "-")
                          }
                        </td>
                      ))}
                    </tr>

                    {expandedRows[idx] && (
                      <tr>
                        <td colSpan={gangHeaders.length} style={{ background: "#fafafa", padding: 0 }}>
                          <div style={{ padding: "10px 12px" }}>
                            <Table striped bordered hover size="sm" className="tableBody" style={{ minWidth: 1100, marginBottom: 0 }}>
                              <thead className="table-dark">
                                <tr>
                                  {printingHeaders.map((h, i) => <th key={i}>{h.label}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {(row.JobsData || []).map((p, i) => (
                                  <tr key={i}>
                                    {printingHeaders.map((h, k) => (
                                      <td key={k}>{renderPrintingCell(p, h.key)}</td>
                                    ))}
                                  </tr>
                                ))}
                                {(!row.JobsData || row.JobsData.length === 0) && (
                                  <tr><td colSpan={printingHeaders.length} className="text-center">No printing rows</td></tr>
                                )}
                              </tbody>
                            </Table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>

              <tfoot>
                <tr style={{ fontWeight: 700, background: "#f6f6f6" }}>
                  <td colSpan={3}>TOTAL</td>
                  <td>-</td>
                  <td>-</td>
                  <td>{totals.media.toFixed(2)}</td>
                  <td>{totals.actual.toFixed(2)}</td>
                  <td>{totals.wastage.toFixed(2)}</td>
                  <td>
                    {(() => {
                      const m = totals.media;
                      if (m <= 0) return "-";
                      if (m <= totals.actual) return "Invalid (Media ≤ Actual)";
                      const pct = ((totals.media - totals.actual) / totals.media) * 100;
                      return `${pct.toFixed(2)} %`;
                    })()}
                  </td>
                  <td>{totals.jobs}</td>
                </tr>
              </tfoot>
            </Table>
          </div>
        </CardBody>
      </Card>
    );
  };

  // === UPDATED: Gang export with numeric coercion ===
  const exportGang = (fmt) => {
    if (!gangData.length) return alert("No Gang data to export.");

    // Keep CSV/PDF behavior as-is
    if (fmt !== 'excel') {
      const fmt2 = (v) => {
        const n = numStrict(v);
        return Number.isFinite(n) ? n.toFixed(2) : '-';
      };

      const headerLabels = gangHeaders.map(h => h.label);
      const rows = gangData.map(row => {
        const out = {};
        gangHeaders.forEach(({ label, key }) => {
          if (key === "__gang_wastage_pct__") out[label] = computeGangWastagePct(row);
          else if (key === "__gang_jobs__") out[label] = ((row.JobsCount ?? 0) || (Array.isArray(row.Jobs) ? row.Jobs.length : 0));
          else if (key === "GangDate") out[label] = formatOnlyDate(row.GangDate);
          else out[label] = ["MediaWidth","MediaLength","MediaSqFt","ActualSqFt"].includes(key) ? fmt2(row[key]) : (key === "JobNos"
            ? (Array.isArray(row.JobNos) && row.JobNos.length ? row.JobNos.join(", ") : "")
            : (row[key] ?? ''));
        });
        return out;
      });

      if (fmt === 'csv') {
        const ws = XLSX.utils.json_to_sheet(rows);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "GangReport.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const doc = new jsPDF("landscape", "pt", "A3");
        doc.setFontSize(10);
        const body = gangData.map(r => gangHeaders.map(h => {
          if (h.key === "__gang_wastage_pct__") return computeGangWastagePct(r);
          if (h.key === "__gang_jobs__") return ((r.JobsCount ?? 0) || (Array.isArray(r.Jobs) ? r.Jobs.length : 0));
          if (h.key === "JobNos") return (Array.isArray(r.JobNos) && r.JobNos.length) ? r.JobNos.join(", ") : "-";
          if (h.key === "GangDate") return formatOnlyDate(r.GangDate);
          return ["MediaWidth","MediaLength","MediaSqFt","ActualSqFt"].includes(h.key) ? numStrict(r[h.key]).toFixed(2) : (r[h.key] ?? "-");
        }));
        doc.text(`Gang Report`, 40, 30);
        doc.autoTable({
          startY: 50,
          head: [gangHeaders.map(h => h.label)],
          body,
          styles: { fontSize: 9, overflow: "linebreak", cellPadding: 5 },
          headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 9 },
          alternateRowStyles: { fillColor: [240, 240, 240] },
        });
        doc.save("GangReport.pdf");
      }
      return;
    }

    // === EXCEL with ALL DATA ===
    const exportHeaders = gangHeaders.filter(h => h.key !== "__expand__"); // drop expand col
    const summaryHeaders = exportHeaders.map(h => h.label);

    const summaryRows = gangData.map(row => {
      const o = {};
      exportHeaders.forEach(({ label, key }) => {
        if (key === "__gang_wastage_pct__") {
          o[label] = computeGangWastagePct(row);
        } else if (key === "__gang_jobs__") {
          o[label] = ((row.JobsCount ?? 0) || (Array.isArray(row.Jobs) ? row.Jobs.length : 0));
        } else if (key === "GangDate") {
          o[label] = formatOnlyDate(row.GangDate);
        } else if (gangNumericKeys.has(key)) {
          o[label] = toNumberIfNumeric(row[key]);
        } else if (key === "JobNos") {
          o[label] = (Array.isArray(row.JobNos) && row.JobNos.length) ? row.JobNos.join(", ") : "";
        } else {
          o[label] = row[key] ?? '';
        }
      });
      return o;
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = summaryHeaders.map(() => ({ wch: 18 }));

    // Sheet 2: Gang Jobs (All Data)
    const detailHeaderLabels = [
      "Gang Id",
      "Gang Printer",
      "Gang Media Width (in)",
      "Gang Media Length/Height (in)",
      "Gang Media Sq.Ft",
      "Gang Actual Sq.Ft",
      ...printingHeaders.map(h => h.label)
    ];

    const detailsRows = [];
    gangData.forEach(g => {
      const gangId = g.GangId ?? g.gangId ?? (g._id?.$oid || g._id?.oid || (typeof g._id === "string" ? g._id : ""));
      const jobs = Array.isArray(g.JobsData) ? g.JobsData : [];
      jobs.forEach(p => {
        const row = {
          "Gang Id": gangId,
          "Gang Printer": g.PrinterName ?? "",
          "Gang Media Width (in)": toNumberIfNumeric(g.MediaWidth),
          "Gang Media Length/Height (in)": toNumberIfNumeric(g.MediaLength),
          "Gang Media Sq.Ft": toNumberIfNumeric(g.MediaSqFt),
          "Gang Actual Sq.Ft": toNumberIfNumeric(g.ActualSqFt),
        };

        printingHeaders.forEach(({ label, key }) => {
          if (key === "date") row[label] = getFormattedDate(p);
          else {
            const val = p[key] ?? "";
            row[label] = (numericKeysByReport.Printing || new Set()).has(key)
              ? toNumberIfNumeric(val)
              : val;
          }
        });

        detailsRows.push(row);
      });
    });

    const wsDetails = XLSX.utils.json_to_sheet(
      detailsRows.length ? detailsRows : [Object.fromEntries(detailHeaderLabels.map(h => [h, ""]))]
    );
    wsDetails['!cols'] = detailHeaderLabels.map(() => ({ wch: 22 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Gang Summary");
    XLSX.utils.book_append_sheet(wb, wsDetails, "Gang Jobs (All Data)");
    XLSX.writeFile(wb, "GangReport_AllData.xlsx");
  };

  // ---------- Product-by-JobNo (unchanged) ----------
  const [jobsFromSql, setJobsFromSql] = useState([]);
  const [user, setUser] = useState('');
  const [locationId, setLocationId] = useState('');
  const [exJobNumber, setExJobNumber] = useState([]);
  const [selectedExJobNumber, setSelectedExJobNumber] = useState('');
  const [productData, setProductData] = useState([]);
  const [showTable, setShowTable] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await axios.post(config.JobSummary.URL.Getalljob, {
        timeout: 10000,
        username: user,
      });
      setExJobNumber(response.data);
    } catch (err) {
      console.error("Error fetching job data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const users = localStorage.getItem('users');
    if (users) {
      const usersObject = JSON.parse(users);
      const username = usersObject.message && usersObject.message.username;
      setUser(username);
      const locationid = usersObject.message && usersObject.message.location_id;
      setLocationId(String(locationid));
    }
  }, []);

  const jobNoOptionsFromSql = jobsFromSql.map(job => ({
    value: job.comartjobno,
    label: job.comartjobno,
    clientName: job.client || ''
  }));

  const jobNoOptionsFromExJobNumber = Array.from(new Set(exJobNumber.map(job => job.jobNo)))
    .map(jobNo => {
      const job = exJobNumber.find(job => job.jobNo === jobNo);
      return { value: jobNo, label: jobNo, clientName: job ? job.client : '' };
    });

  const combinedJobNoOptions = [...jobNoOptionsFromSql, ...jobNoOptionsFromExJobNumber];
  const uniqueJobNoOptions = Array.from(new Set(combinedJobNoOptions.map(option => option.value)))
    .map(value => combinedJobNoOptions.find(option => option.value === value));

  const GetAllJobsFromSql = async () => {
    const payload = { locationId };
    try {
      const response = await axios.post(config.JobSummary.URL.GetAllJobsFromSql, payload);
      setJobsFromSql(response.data);
    } catch (err) {
      console.error('Unable to fetch jobs for the location id', err);
    }
  };

  const handleExJobNoSelectChange = (selectedOption) => {
    setSelectedExJobNumber(selectedOption ? selectedOption.value : '');
  };

  const fetchProductReportWithJobNo = async (jobNo) => {
    try {
      const url = `${config.Report.URL.GetProductReportWithJobNo}?jobNo=${encodeURIComponent(jobNo)}`
      const res = await axios.post(url);
      setProductData(res.data);
    } catch (err) {
      console.error('Error fetching Report ', err);
    }
  };

  const handleGoOfProduct = async () => {
    setLoading(true);
    try {
      if (selectedExJobNumber) {
        setProductData([]);
        setShowTable(false);
        await fetchProductReportWithJobNo(selectedExJobNumber);
        setShowTable(true);
      } else {
        alert("Please select a Job No before proceeding.");
      }
    } catch (err) {
      console.error('Error while fetching data ', err);
    } finally {
      setLoading(false);
    }
  };

  const exportProductsToExcel = () => {
    const displayedData = productData.map(row => ({
      "Client Product Name": row.media,
      "Width": toNumberIfNumeric(row.width),
      "Height": toNumberIfNumeric(row.height),
      "Unit": toNumberIfNumeric("2"),
      "Rate": toNumberIfNumeric(""),
      "Qty": toNumberIfNumeric(row.qty),
      "HSN Code": toNumberIfNumeric("39219099"),
      "Gj Code": toNumberIfNumeric("394"),
      "Store Location": row.salonAddress,
      "Billing Location": row.billingLocation,
      "Production Location": row.productionLocation,
    }));

    const worksheet = XLSX.utils.json_to_sheet(displayedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "ProductsReport.xlsx");
  };

  useEffect(() => {
    // fetchJobs();
    // GetAllJobsFromSql();
  }, []);

  // --------------------------- RENDER ---------------------------
  return (
    <Container style={{ marginLeft: 'auto', marginRight: 'auto', padding: '0 10px', marginTop: '2em' }}>
      <div className="page-wrapper">
        <div className="content container-fluid">
          
          <div className="page-header">
            <div className="row">
              <div className="col">
                <ul className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.dashboard}></Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* ------------------- TABS ------------------- */}
          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'mis')} className="mb-3">
            {/* ===== Tab 1: MIS Reports (existing) ===== */}
            <Tab eventKey="mis" title="MIS Reports">
              {/* Export buttons */}
              <Row>
                <Row>
                  <Col className="d-flex justify-content-end btn-grp">
                    <Button type="button" className='goBtn me-2' variant="primary" onClick={exportToExcel}>To Excel</Button>
                    <Button type="button" className='goBtn me-2' variant="primary" onClick={exportToCsv}>To CSV</Button>
                    <Button type="button" className='goBtn' variant="primary" onClick={exportToPdf}>To PDF</Button>
                  </Col>
                </Row>

                {/* Date range */}
                <Col xs={3}>
                  <Form.Group controlId="formDate">
                    <div className="position-relative daterange-wraper me-2">
                      <div className="input-groupicon calender-input">
                        <Form.Label style={{ width: '200px' }}>Select date</Form.Label>
                        <DateRangePicker initialSettings={initialSettings} onApply={handleDateRangeChange}>
                          <input className="form-control input-range" type="text" value={dateRangeDisplay} readOnly />
                        </DateRangePicker>
                      </div>
                      <Calendar className="feather-14" style={{ top: '45px' }} />
                    </div>
                  </Form.Group>
                </Col>

                {/* Location */}
                <Col xs={3}>
                  <Form.Group controlId="formLocation">
                    <Form.Label style={{ width: '200px' }}>Location</Form.Label>
                    <Form.Select value={newLocation} onChange={handleLocationChange} required>
                      <option value="">Select Location</option>
                      {locations.map((location, index) => (
                        <option key={index} value={location}>{location}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* Report Type */}
                <Col xs={3}>
                  <Form.Group controlId="formProduction">
                    <Form.Label style={{ width: '200px' }}>Report Type</Form.Label>
                    <Form.Select value={newProduction} onChange={handleProductionChange} required>
                      <option value="">Select Production</option>
                      {productions.map((production, index) => (
                        <option key={index} value={production}>{production}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* Go */}
                <Col xs={3} className="d-flex align-items-center justify-content-start">
                  <Button type="button" className='goBtn mt-4' variant="primary" onClick={handleGoReport}>Go</Button>
                </Col>
              </Row>

              {loading && <Spinner animation="border" />}
              {error && <Alert variant="danger">{error}</Alert>}

              <div style={{ marginTop: "4em", marginLeft: "-170px", overflow: "auto", width: '84rem' }}>
                {renderTable()}
              </div>
            </Tab>

            {/* ===== Tab 2: GANG (DATEWISE) ===== */}
            <Tab eventKey="gang" title="Gang (Datewise)">
              <Row>
                <Row>
                  <Col className="d-flex justify-content-end btn-grp">
                    <Button type="button" className='goBtn me-2' variant="primary" onClick={() => exportGang('excel')}>To Excel</Button>
                    <Button type="button" className='goBtn me-2' variant="primary" onClick={() => exportGang('csv')}>To CSV</Button>
                    <Button type="button" className='goBtn' variant="primary" onClick={() => exportGang('pdf')}>To PDF</Button>

                    {/* NEW: Job-level wastage export */}
                    <Button
                      type="button"
                      className="goBtn ms-2"
                      variant="secondary"
                      onClick={() => {
                        const jobs = deriveJobLevelFromGang_ProportionalMedia(gangData);
                        if (!jobs.length) return alert('No job-level data to export.');

                        const rows = jobs.map(r => ({
                          'Job No': r.JobNo,
                          'Printer': r.Printer,
                          'Client': r.Client,
                          'Sub Client': r.SubClient,
                          'Production Location': r.Region,
                          'Media Sq.Ft': Number(r.MediaSqFt.toFixed(2)),
                          'Actual Sq.Ft': Number(r.ActualSqFt.toFixed(2)),
                          'Wastage %': r.WastagePct,
                          'Job Count': r.Lines,
                        }));

                        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{'Job No':'','Printer':''}]);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Job Summary');
                        setTimeout(() => XLSX.writeFile(wb, 'Wastage_JobLevel.xlsx'), 0);
                      }}
                    >
                      To Excel (Job Level)
                    </Button>
                  </Col>
                </Row>

                {/* Date range for Gang */}
                <Col xs={3}>
                  <Form.Group controlId="gangDate">
                    <div className="position-relative daterange-wraper me-2">
                      <div className="input-groupicon calender-input">
                        <Form.Label style={{ width: '200px' }}>Select date</Form.Label>
                        <DateRangePicker initialSettings={initialGangSettings} onApply={handleGangDateRangeChange}>
                          <input className="form-control input-range" type="text" value={gangDateRangeDisplay} readOnly />
                        </DateRangePicker>
                      </div>
                      <Calendar className="feather-14" style={{ top: '45px' }} />
                    </div>
                  </Form.Group>
                </Col>

                {/* Spacer */}
                <Col xs={3} />

                {/* Go (Gang) */}
                <Col xs={3} className="d-flex align-items-center justify-content-start">
                  <Button type="button" className='goBtn mt-4' variant="primary" onClick={fetchGangReport}>Go</Button>
                </Col>
              </Row>

              {loading && <Spinner animation="border" />}
              {error && <Alert variant="danger">{error}</Alert>}

              <div style={{ marginTop: "4em", marginLeft: "-170px", overflow: "auto", width: '84rem' }}>
                {renderGangTable()}
              </div>
            </Tab>

            {/* ===== Tab 3: (reserved) ===== */}
          </Tabs>
        </div>

        {/* Product-by-JobNo (unchanged) */}
        {/* ...kept commented out as in your file... */}
      </div>
    </Container>
  );
};

export default MisReport;
