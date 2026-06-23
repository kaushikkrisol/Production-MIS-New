import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import { Modal, ModalBody, ModalHeader, Table as ExcelTable } from 'reactstrap';
import { Table, Tab, Form, Nav, NavItem, Button, Row, NavLink, Card, Col, CardBody, Alert, Spinner, InputGroup } from 'react-bootstrap';
import 'react-toastify/dist/ReactToastify.css';
import Sort from "../ui/Sort";
import OrderPopup from "../../dashboard/orderPopup"; 
// import EditableCell from './EditableCell'; // Adjust path accordingly
// import EditableRow from './EditableRow'; // Adjust path accordingly
import { AgGridReact } from "ag-grid-react";
import './DataTables.css'; // Adjust path accordingly

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import axios from "axios";
import config from "../../../config";
import { FaSyncAlt, FaSearch, FaFilter } from 'react-icons/fa';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import FilterSidebar from "../ui/FilterComponent";
import { mergeFallbackCustomers } from "./customerFallbacks";

const loadExcelExportTools = async () => {
  const [excelModule, fileSaverModule] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  return {
    ExcelJS: excelModule.default || excelModule,
    saveAs:
      fileSaverModule.saveAs ||
      fileSaverModule.default?.saveAs ||
      fileSaverModule.default,
  };
};

const SLA_ALERT_RULES = [
  {
    threshold: 100,
    notificationType: "Dark Grey",
    label: "100%",
    recipients: [""],
    color: "#3f3f46",
    textColor: "#fff",
    detailBg: "#f4f4f5",
    meaning: "Deadline reached or passed",
  },
  {
    threshold: 80,
    notificationType: "Orange",
    label: "80%",
    recipients: ["CS", "BM", "OPS", "Sales"],
    color: "#f97316",
    textColor: "#111827",
    detailBg: "#fff7ed",
    meaning: "80% of deadline time used",
  },
  {
    threshold: 60,
    notificationType: "Yellow",
    label: "60%",
    recipients: ["CS", "BM"],
    color: "#facc15",
    textColor: "#111827",
    detailBg: "#fefce8",
    meaning: "60% of deadline time used",
  },
  {
    threshold: 35,
    notificationType: "Blue",
    label: "35%",
    recipients: ["CS"],
    color: "#0d6efd",
    textColor: "#fff",
    detailBg: "#f3f8ff",
    meaning: "35% of deadline time used",
  },
];

const getSlaAlertRuleForPercent = (percent) =>
  SLA_ALERT_RULES.find((rule) => percent >= rule.threshold) || null;

const getSlaAlertRuleByType = (notificationType) =>
  SLA_ALERT_RULES.find((rule) => rule.notificationType === notificationType);

const getAlertTypeClass = (notificationType) =>
  `erp-threshold-tile erp-threshold-tile--${String(notificationType || "")
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

const getMongoValue = (value) => {
  if (value && typeof value === "object") {
    return (
      value.$date ||
      value.$numberDecimal ||
      value.$numberInt ||
      value.$numberLong ||
      value.value ||
      ""
    );
  }

  return value;
};

const getAlertCreatedAtValue = (row = {}) =>
  getMongoValue(
    row.notificationCreatedAt ||
      row.createdAt ||
      row.CreatedAt ||
      row.shownAt ||
      row.ShownAt ||
      row.generatedAt ||
      row.GeneratedAt ||
      row.entereddt ||
      row.EnteredDt ||
      ""
  );

const formatAlertTime = (value) => {
  const rawValue = getMongoValue(value);
  if (!rawValue) return "-";

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return String(rawValue);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const getRowsFromApiResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (data?.data && typeof data.data === "object") return [data.data];
  if (data?.result && typeof data.result === "object") return [data.result];
  return [];
};

const normalizeStoredProgressAlert = (row = {}) => {
  const percentValue = getMongoValue(
    row.percent ??
      row.currentPercent ??
      row.currentDeadlinePercent ??
      row.thresholdPercent ??
      row.notificationPercent ??
      ""
  );
  const numericPercent = Number(percentValue);
  const ruleFromPercent = Number.isFinite(numericPercent)
    ? getSlaAlertRuleForPercent(numericPercent)
    : null;
  const color = getMongoValue(row.color || row.notificationType || row.type || "");
  const ruleFromColor = getSlaAlertRuleByType(color);
  const rule = ruleFromColor || ruleFromPercent;
  const notificationType = color || rule?.notificationType || "ERP Alert";
  const threshold =
    getMongoValue(row.threshold || row.notificationThreshold || "") ||
    rule?.label ||
    (Number.isFinite(numericPercent) ? `${numericPercent}%` : "Alert");

  return {
    ...row,
    jobNoDisplay: getMongoValue(row.jobNo || row.JobNo || row.jobNoDisplay || ""),
    csName: getMongoValue(row.csName || row.CSName || row.enteredby || row.Enteredby || ""),
    bmName: getMongoValue(row.bmName || row.BMName || ""),
    storeName: getMongoValue(row.storeName || row.StoreName || row.salonStoreName || ""),
    customerName: getMongoValue(row.customerName || row.client || row.Client || ""),
    notificationDeadline: getMongoValue(row.deadline || row.notificationDeadline || "N/A"),
    notificationStart: getMongoValue(row.start || row.notificationStart || "N/A"),
    notificationPercent: Number.isFinite(numericPercent) ? numericPercent : null,
    notificationActualPercent: Number.isFinite(numericPercent) ? numericPercent : null,
    notificationBandPercent: rule?.threshold || (Number.isFinite(numericPercent) ? numericPercent : null),
    notificationSource: getMongoValue(row.source || row.notificationSource || "Quartz Scheduler"),
    notificationThreshold: threshold,
    notificationRecipients: getMongoValue(row.recipients || row.notificationRecipients || ""),
    notificationType,
    notificationCreatedAt: getAlertCreatedAtValue(row),
  };
};

// import Sort from "../ui/Sort";
// import { responsiveArray } from "antd/es/_util/responsiveObserver";
// import { el } from "date-fns/locale";

const DataTables = () => {
  // const [searchText, setSearchText] = useState("");
  //const [selectTable, setSelectTable] = useState("CS");
  // const [isMobile, setIsMobile] = useState(false);
  
  // const [tableData, setTableData] = useState({
  //   CS: csDataTablesData,
  //   Design: pageDataTablesData,
  //   Production: productionDataTablesData,
  //   Implementation: implementationDataTablesData,
  //   Delivery: deliveryDataTablesData,
  // });

  
  const [BulkAdd, setBulkAdd] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [hsnCode, setHsnCode] = useState("");
  const [data, setData] = useState([]);
  console.log(data);

  const [selectSearchTerm, setSelectSearchTerm] = useState('');
  const [filteredJobNumbers, setFilteredJobNumbers] = useState([]);
  const [customerid, setCustomerid] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  // const [selectedRows, setSelectedRows] = useState({});
  // const [isJobRunning, setIsJobRunning] = useState(false); // Job status
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalValues, setTotalValues] = useState({ width: 0, height: 0 });
  const [rolename,setRolename]=useState('');
  const gridRef = useRef();
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [alertPosition, setAlertPosition] = useState(null);
  const [isDraggingAlert, setIsDraggingAlert] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ left: 0, top: 0 });
  const alertRef = useRef(null);

  const [selectedRows, setSelectedRows] = useState({});
  const [selectedTotals, setSelectedTotals] = useState({
    qty: 0,
    width: 0,
    length: 0,
    totalSqFt: 0,
  });



  const[latestJobNo,setLatestJobNo]=useState('')

  const [activeTab, setActiveTab] = useState('newJob'); // Default active tab is New Job
  const [jobNumbers, setJobNumber] = useState([]);

  const [userId, setUserId] = useState(null);
  const [userName, setUsername] = useState('');
  // const [subClient, setSubClient] = useState('');

  console.log(userId, userName, totalValues);

  // const totalWidth = totalValues ? totalValues.width : 0;
  // const totalHeight = totalValues ? totalValues.height : 0;

  const [customer, setcustomer] = useState([]);
  const [exJobNumber, setExJobNumber] = useState([]);

  const [user, setUser] = useState('');
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [deadlineWarningJobs, setDeadlineWarningJobs] = useState([]);
  const [deadlineMissedJobs, setDeadlineMissedJobs] = useState([]);
  const [implementationUploadNotificationJobs, setImplementationUploadNotificationJobs] = useState([]);
  const [schedulerAlertJobs, setSchedulerAlertJobs] = useState([]);
  const [showDeadlineDetails, setShowDeadlineDetails] = useState(false);
  const lastSavedAlertSignatureRef = useRef("");
  const saveAlertFailureShownRef = useRef(false);

  const [emailid, setEmailid] = useState('');
  const [projectname,setProjectname]=useState('');

  const [newJobNo, setNewJobNo] = useState('');
  const [clients, setClients] = useState('');
  const [subClients, setSubclients] = useState('');
  const users = localStorage.getItem('users');

  const currentDate = new Date().toISOString().split('T')[0];

  const [businessType, setBusinessType] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [lpono, setlpono] = useState("");
  const [lpoDate, setlpoDate] = useState("");
  const [poType, setPoType] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [enteredby, setEnteredby] = useState("");
  const [locationid, setLocationid] = useState("");
  // const [locationjob, setLocationJob] = useState([]);

  const [customerNameAccLocation, setCustomerNameAccLocation] = useState([]);

  const [jobsFromSql, setJobsFromSql] = useState([]);

  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'ascending' });
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [deleteComment,setDeleteComment]=useState('');
  const [showLength, setShowLength] = useState(false);
  const [actualSqFt, setActualSqFt] = useState(0);
  const [isAlertAccepted, setIsAlertAccepted] = useState(false);



  const [acceptorders,setAcceptedorders]=useState([]);
  const [filters, setFilters] = useState({
    jobNo: '',
    date: '',
    client: '',
    userName: '',
    subClient: '',
    productionLocation: '',
    billingLocation: '',
    visualCode: '',
    nameSubCode: '',
    city: '',
    qty: '',
    hsnCode: '',
    width: '',
    height: '',
    totalSqFt: '',
    media: '',
    lamination: '',
    mounting: '',
    implementation: '',
    salonAddress: '',
    machineName: '',
    deadline: '',
    designerName: '',
    designerDeadline: '',
    printerPrintingName: '',
    printerDeadline: '',
    remarks: '',
  });

  const headerMapping = {
    "Job No": "Job No",
    "Client": "CLIENT",
    "Sub Client": "Sub Client",
    "Job Date": "Date",
    "Production Location": "Production Location",
    "Billing Location": "Billing  Location",
    "Visual Code": "VISUAL CODE",
    "Product Details": "Name & Sub Code",
    "City": "CITY",
    "Qty": "QTY",
    "Width": "Width",
    "Height": "Height",
    "Total Sq.Ft": "Total Sq.ft",
    "Media": "Media",
    "Installation": "Installation",
    "HSN Code": "HSN Code",
    "Job Deadline": "Job Deadline",
    "Designer Name": "Designer Name",
    "Designer ID": "Designer ID",
    "Designer Deadline": "Designer Deadline",
    "Printing Machine": "Printer Name",
    "Printer Deadline": "Printer Deadline",
    "Print Ready File": "Print Ready Available",
    "Lamination": "LAMINATION",
    "Mounting": "MOUNTING",
    "Implementation": "Implementation",
    "Salon / Store Address": "SALON ADDRESS",
    "Remarks / Instructions": "Remarks/Instructions",
  };

  const filterConfig = [
    { key: 'jobNo', placeholder: 'Job No', type: 'text' },
    { key: 'date', placeholder: 'Job Date', type: 'date' },
    { key: 'client', placeholder: 'Client', type: 'text' },
    { key: 'userName', placeholder: 'User Name', type: 'text' },
    { key: 'subClient', placeholder: 'Sub Client', type: 'text' },
    { key: 'productionLocation', placeholder: 'Production Location', type: 'text' },
    { key: 'billingLocation', placeholder: 'Billing Location', type: 'text' },
    { key: 'visualCode', placeholder: 'Visual Code', type: 'text' },
    { key: 'nameSubCode', placeholder: 'Product Details', type: 'text' },
    { key: 'city', placeholder: 'City', type: 'text' },
    { key: 'printReadyAvailable', placeholder: 'Print Ready File', type: 'text' },
    { key: 'qty', placeholder: 'Qty', type: 'text' },
    { key: 'hsnCode', placeholder: 'HSN Code', type: 'text' },
    { key: 'width', placeholder: 'Width', type: 'text' },
    { key: 'height', placeholder: 'Height', type: 'text' },
    { key: 'totalSqFt', placeholder: 'Total Sq.Ft', type: 'text' },
    { key: 'media', placeholder: 'Media', type: 'text' },
    { key: 'lamination', placeholder: 'Lamination', type: 'text' },
    { key: 'mounting', placeholder: 'Mounting', type: 'text' },
    { key: 'implementation', placeholder: 'Implementation', type: 'text' },
    { key: 'salonAddress', placeholder: 'Salon / Store Address', type: 'text' },
    { key: 'machineName', placeholder: 'Machine Name', type: 'text' },
    { key: 'deadline', placeholder: 'Job Deadline', type: 'text' },
    { key: 'designerName', placeholder: 'Designer Name', type: 'text' },
    { key: 'designerDeadline', placeholder: 'Designer Deadline', type: 'text' },
    { key: 'printerPrintingName', placeholder: 'Printing Machine', type: 'text' },
    { key: 'printerDeadline', placeholder: 'Printer Deadline', type: 'text' },
    { key: 'remarks', placeholder: 'Remarks / Instructions', type: 'text' },
  ]

  const editableFields = [
  "billinglocation",
  "qty",
  "width",
  "height",
  "totalsqft",
  "media",
  "lamination",
  "productionlocation"
];

const dropdownFields = ["productionlocation", "billinglocation"];
const dropdownValues = ["North", "South", "East", "West"];

const customColumnDefs = filterConfig.map(column => {
  const fieldKey = column.key.toLowerCase();
  const isEditable = rolename === "Branch Manager" && editableFields.includes(fieldKey);

  // Dropdown editor for location fields
  if (dropdownFields.includes(fieldKey)) {
    return {
      headerName: column.placeholder,
      field: column.key,
      editable: isEditable,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: dropdownValues
      },
      minWidth: 160,
      resizable: true,
      sortable: true,
      filter: true
    };
  }

  // Default column
  return {
    headerName: column.placeholder,
    field: column.key,
    editable: isEditable,
    sortable: true,
    filter: true,
    minWidth: 160,
    resizable: true,
    cellRenderer: !isEditable ? (params) => {
      const value = params.value;

      if (["width", "height", "totalsqft"].includes(fieldKey)) {
        const num = parseFloat(value);
        return isNaN(num) ? '' : num.toFixed(2);
      }

      if (fieldKey === "date") {
        if (value) return value;
        const enteredDate = params.data?.entereddt;
        return enteredDate ? new Date(enteredDate).toLocaleDateString('en-GB') : '';
      }

      return value;
    } : undefined
  };
});

 
const handleExportExcel = async () => {
  const { ExcelJS, saveAs } = await loadExcelExportTools();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Job Data");

  const columns = [
    ...columnDefs.filter(col => col.field).map(col => ({
      header: col.headerName || col.field,
      key: col.field,
    })),
    { header: "Status", key: "status" },
    { header: "Download Timestamp", key: "downloadTimestamp" },
  ];

  worksheet.columns = columns;

  const downloadTime = new Date().toISOString();

  gridRef.current.api.forEachNodeAfterFilterAndSort((node) => {
    const row = { ...node.data };

    const design = row.isDesignDone === "1";
    const print = row.isPrinitngdone === "1";
    const delivery = row.isDeliveryDone === "1";
    const implementation = row.isImplementationDone === "1";
    const upload = row.isImplementationUploadDone === "1";
    const packing = row.isPackingDone === "1";

    let status = "Not Started";

    if (packing) status = "Packed";
    else if (upload) status = "Implementation Uploaded";
    else if (implementation) status = "Implementation Done";
    else if (design && print && delivery) status = "Delivered";
    else if (design && print) status = "Printed";
    else if (design) status = "Designed";

    row.status = status;
    row.downloadTimestamp = downloadTime;

    // ✅ Format specific numeric fields to 2 decimal places
    const formattedRow = { ...row };
    ["qty", "width", "height", "totalSqFt"].forEach((key) => {
      if (formattedRow[key] !== undefined) {
        const num = parseFloat(formattedRow[key]);
        formattedRow[key] = isNaN(num) ? "" : num.toFixed(2);
      }
    });

    const newRow = worksheet.addRow(formattedRow);

    // ✅ Cell coloring by status
    const statusColors = {
      "Not Started": "FFFFFF",
      Designed: "FFEB9C",
      Printed: "ADD8E6",
      Delivered: "C6EFCE",
      "Implementation Done": "FFD966",
      "Implementation Uploaded": "D9D2E9",
      Packed: "B7E1CD",
    };

    const fillColor = statusColors[status] || "FFFFFF";
    newRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillColor },
      };
    });

    const tsCell = newRow.getCell("downloadTimestamp");
    tsCell.numFmt = "yyyy-mm-dd hh:mm:ss";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `JobData_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

const getExportStatus = (row = {}) => {
  const design = row.isDesignDone === "1";
  const print = row.isPrinitngdone === "1";
  const delivery = row.isDeliveryDone === "1";
  const implementation = row.isImplementationDone === "1";
  const upload = row.isImplementationUploadDone === "1";
  const packing = row.isPackingDone === "1";

  if (packing) return "Packed";
  if (upload) return "Implementation Uploaded";
  if (implementation) return "Implementation Done";
  if (design && print && delivery) return "Delivered";
  if (design && print) return "Printed";
  if (design) return "Designed";
  return "Not Started";
};

const formatExportValue = (field, value) => {
  if (["qty", "width", "height", "totalSqFt"].includes(field)) {
    const num = parseFloat(value);
    return isNaN(num) ? "" : num.toFixed(2);
  }

  return value ?? "";
};

const handleFilteredExportExcel = async () => {
  try {
    const { ExcelJS, saveAs } = await loadExcelExportTools();
    if (typeof saveAs !== "function") {
      toast.error("Excel download helper is not available.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Job Data");
    const gridApi = gridRef.current?.api;
    const displayedColumns = gridApi?.getAllDisplayedColumns
      ? gridApi.getAllDisplayedColumns()
      : [];
    const downloadTime = new Date().toISOString();

    const exportColumns = displayedColumns.length
      ? displayedColumns
          .map((column) => {
            const colDef = column.getColDef();
            if (!colDef.field && !colDef.valueGetter) return null;
            return {
              header: colDef.headerName || colDef.field || column.getColId(),
              key: column.getColId(),
              field: colDef.field,
              column,
            };
          })
          .filter(Boolean)
      : columnDefs
          .filter((col) => col.field)
          .map((col) => ({
            header: col.headerName || col.field,
            key: col.field,
            field: col.field,
          }));

    worksheet.columns = [
      ...exportColumns.map((col) => ({
        header: col.header,
        key: col.key,
        width: Math.max(14, String(col.header || "").length + 4),
      })),
      { header: "Status", key: "status", width: 24 },
      { header: "Download Timestamp", key: "downloadTimestamp", width: 24 },
    ];

    const rowsToExport = [];

    if (gridApi?.forEachNodeAfterFilterAndSort && displayedColumns.length) {
      gridApi.forEachNodeAfterFilterAndSort((node) => {
        const exportRow = {};

        exportColumns.forEach((col) => {
          const value = col.column ? gridApi.getValue(col.column, node) : node.data?.[col.field];
          exportRow[col.key] = formatExportValue(col.field, value);
        });

        const status = getExportStatus(node.data);
        exportRow.status = status;
        exportRow.downloadTimestamp = downloadTime;
        rowsToExport.push({ values: exportRow, status });
      });
    } else {
      sortedData.forEach((row) => {
        const exportRow = {};

        exportColumns.forEach((col) => {
          exportRow[col.key] = formatExportValue(col.field, row?.[col.field]);
        });

        const status = getExportStatus(row);
        exportRow.status = status;
        exportRow.downloadTimestamp = downloadTime;
        rowsToExport.push({ values: exportRow, status });
      });
    }

    if (!rowsToExport.length) {
      toast.info("No filtered records available to download.");
      return;
    }

    const statusColors = {
      "Not Started": "FFFFFF",
      Designed: "FFEB9C",
      Printed: "ADD8E6",
      Delivered: "C6EFCE",
      "Implementation Done": "FFD966",
      "Implementation Uploaded": "D9D2E9",
      Packed: "B7E1CD",
    };

    rowsToExport.forEach(({ values, status }) => {
      const newRow = worksheet.addRow(values);
      const fillColor = statusColors[status] || "FFFFFF";

      newRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillColor },
        };
      });

      newRow.getCell("downloadTimestamp").numFmt = "yyyy-mm-dd hh:mm:ss";
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columnCount },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `JobData_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Downloaded ${rowsToExport.length} filtered record(s).`);
  } catch (error) {
    console.error("Excel export failed", error);
    toast.error("Failed to download Excel.");
  }
};





const onSelectionChanged = () => {
            const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
            const visibleRowIndexes = gridRef.current?.api.getRenderedNodes().map(n => n.rowIndex) || [];
            const selectedVisibleData = selectedNodes.filter(node => visibleRowIndexes.includes(node.rowIndex)).map(node => node.data);

            let totalQty = 0, totalW = 0, totalL = 0, totalSqFt = 0;
            selectedVisibleData.forEach(row => {
            totalQty += parseFloat(row.qty || "0");
            totalW += parseFloat(row.width || "0");
            totalL += parseFloat(row.length || "0");

            totalSqFt += parseFloat(row.totalSqFt || "0");
            });

            setSelectedTotals({
            qty: totalQty,
            width: totalW.toFixed(2),
            length: totalL.toFixed(2),
            totalSqFt: totalSqFt.toFixed(2),
            });

            const selectedMap = {};
            selectedVisibleData.forEach(row => {
            if (row.id) selectedMap[row.id] = true;
            });
            setSelectedRows(selectedMap);
            setActualSqFt(totalSqFt.toFixed(2));
        };


  console.log(setSortConfig)

  console.log(filteredJobNumbers, setSelectSearchTerm);

  const resetForm = () => {
    setNewJobNo('');
    setClients('');
    setBusinessType('');
    setContactPerson('');
    setlpono('');
    setlpoDate('');
    setPoType('');
    setCustomerName('');
    setSelectedCustomerId('');
    setCustomerid('');
    setSelectedExJobNumber('');
    setCustomerEmail('');
  }


  console.log("job", subClients)
  console.log(setJobNumber, setExJobNumber)

  const getImplementationUploadListUrl = () =>
    config?.ImplementationUpload?.URL?.GetAllImplementationUpload || "";

  const normalizeImplementationLookupValue = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const uniqueTextValues = (values) => {
    const seen = new Set();

    return values
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .filter((value) => {
        const key = normalizeImplementationLookupValue(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const getImplementationUploadJobNo = (row = {}) =>
    row.jobNo ||
    row.JobNo ||
    row.comartjobno ||
    row.ComartJobNo ||
    row["Job No"] ||
    row["JOB NO"] ||
    "";

  const getImplementationUploadStoreName = (row = {}) =>
    row.store ||
    row.Store ||
    row.storeName ||
    row.StoreName ||
    row.salonStoreName ||
    row.SalonStoreName ||
    row.salonAddress ||
    row.SalonAddress ||
    row.SalonStoreAddress ||
    row["Salon/Store Name"] ||
    row["Salon / Store Name"] ||
    row["Store Name"] ||
    row["SALON ADDRESS"] ||
    row["Salon / Store Address"] ||
    row["Salon/Store Address"] ||
    "";

  const getImplementationUploadMediaFiles = (row = {}) => {
    const mediaFiles =
      row.mediaFiles ||
      row.MediaFiles ||
      row.upload?.mediaFiles ||
      row.Upload?.MediaFiles ||
      [];

    return Array.isArray(mediaFiles) ? mediaFiles : [];
  };

  const getImplementationUploadRowIds = (row = {}) =>
    uniqueTextValues([
      row.id,
      row.Id,
      row.ID,
      row.productionid,
      row.productionId,
      row.ProductionId,
      row.productionID,
      row.ProductionID,
      row.implementationid,
      row.implementationId,
      row.ImplementationId,
      row.csid,
      row.csId,
      row.CsId,
      row.upload?.id,
      row.upload?.Id,
      row.Upload?.id,
      row.Upload?.Id,
      ...getImplementationUploadMediaFiles(row).flatMap((file) => [
        file.productionid,
        file.productionId,
        file.ProductionId,
        file.productionID,
        file.ProductionID,
        file.id,
        file.Id,
      ]),
    ]);

  const getImplementationUploadFilesCountFromRow = (row = {}) => {
    const countFromField = Number(
      row.uploadedFilesCount ||
        row.UploadedFilesCount ||
        row.imagesCount ||
        row.ImagesCount ||
        row.upload?.uploadedFilesCount ||
        row.Upload?.UploadedFilesCount ||
        0
    );

    if (countFromField > 0) return countFromField;

    return getImplementationUploadMediaFiles(row).length;
  };

  const isImplementationUploadRowUploaded = (row = {}) => {
    const uploadedFlag =
      row.isUploaded ??
      row.IsUploaded ??
      row.uploaded ??
      row.Uploaded ??
      row.hasUpload ??
      row.HasUpload;

    return (
      uploadedFlag === true ||
      normalizeImplementationLookupValue(uploadedFlag) === "true" ||
      normalizeImplementationLookupValue(uploadedFlag) === "yes" ||
      normalizeImplementationLookupValue(uploadedFlag) === "1" ||
      getImplementationUploadFilesCountFromRow(row) > 0
    );
  };

  const getImplementationUploadRows = (payload) => {
    const rows = [];
    const nestedKeys = [
      "data",
      "Data",
      "records",
      "Records",
      "items",
      "Items",
      "result",
      "Result",
      "jobDetails",
      "JobDetails",
      "details",
      "Details",
      "lineItems",
      "LineItems",
      "uploads",
      "Uploads",
      "implementationUploads",
      "ImplementationUploads",
    ];

    const visit = (value, context = {}) => {
      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, context));
        return;
      }

      if (!value || typeof value !== "object") return;

      const nestedJobDetails = value.jobDetails || value.JobDetails;
      const storeNameFromDetails = Array.isArray(nestedJobDetails)
        ? nestedJobDetails.map(getImplementationUploadStoreName).find(Boolean)
        : "";
      const jobNo = getImplementationUploadJobNo(value) || context.jobNo || "";
      const storeName =
        getImplementationUploadStoreName(value) ||
        context.storeName ||
        storeNameFromDetails ||
        "";
      const uploadFilesCount = getImplementationUploadFilesCountFromRow(value);
      const hasUploadIdentity = jobNo || storeName || uploadFilesCount > 0;

      if (hasUploadIdentity) {
        rows.push({
          ...value,
          jobNo,
          storeName,
          implementationUploadFilesCount: uploadFilesCount,
          isImplementationUploadDone: isImplementationUploadRowUploaded(value) ? "1" : "0",
        });
      }

      const childContext = { jobNo, storeName };
      nestedKeys.forEach((key) => {
        if (value[key]) {
          visit(value[key], childContext);
        }
      });
    };

    visit(payload);
    return rows;
  };

  const getImplementationUploadLookupKey = (jobNo, storeName) => {
    const normalizedJobNo = normalizeImplementationLookupValue(jobNo);
    const normalizedStoreName = normalizeImplementationLookupValue(storeName);

    if (!normalizedJobNo || !normalizedStoreName) return "";

    return `${normalizedJobNo}||${normalizedStoreName}`;
  };

  const getImplementationUploadIdLookupKey = (id) => {
    const normalizedId = normalizeImplementationLookupValue(id);
    return normalizedId ? `id||${normalizedId}` : "";
  };

  const getImplementationUploadLookupKeysForRow = (row = {}) => {
    const idKeys = getImplementationUploadRowIds(row).map(getImplementationUploadIdLookupKey);
    const jobStoreKey = getImplementationUploadLookupKey(
      getImplementationUploadJobNo(row),
      getImplementationUploadStoreName(row)
    );

    return Array.from(new Set([...idKeys, jobStoreKey].filter(Boolean)));
  };

  const mergeImplementationUploadStatus = (currentStatus, nextStatus) => ({
    uploaded: Boolean(currentStatus?.uploaded || nextStatus?.uploaded),
    uploadedFilesCount:
      Number(currentStatus?.uploadedFilesCount || 0) +
      Number(nextStatus?.uploadedFilesCount || 0),
    uploadedAtUtc: nextStatus?.uploadedAtUtc || currentStatus?.uploadedAtUtc || null,
  });

  const parseImplementationUploadStatus = (payload = {}) => {
    const uploadedFilesCount = Number(
      payload.imagesCount ??
        payload.ImagesCount ??
        payload.uploadedFilesCount ??
        payload.UploadedFilesCount ??
        payload.mediaFilesCount ??
        payload.MediaFilesCount ??
        getImplementationUploadFilesCountFromRow(payload) ??
        0
    );
    const uploadedFlag =
      payload.isUploaded ??
      payload.IsUploaded ??
      payload.uploaded ??
      payload.Uploaded ??
      payload.hasUpload ??
      payload.HasUpload;

    const uploaded =
      uploadedFlag === true ||
      normalizeImplementationLookupValue(uploadedFlag) === "true" ||
      normalizeImplementationLookupValue(uploadedFlag) === "yes" ||
      normalizeImplementationLookupValue(uploadedFlag) === "1" ||
      uploadedFilesCount > 0;

    return {
      uploaded,
      uploadedFilesCount,
      uploadedAtUtc: payload.uploadedAtUtc ?? payload.UploadedAtUtc ?? null,
    };
  };

  const buildImplementationUploadStatusLookup = (payload) => {
    const lookup = new Map();

    getImplementationUploadRows(payload).forEach((row) => {
      const status = parseImplementationUploadStatus(row);

      getImplementationUploadLookupKeysForRow(row).forEach((key) => {
        lookup.set(
          key,
          mergeImplementationUploadStatus(lookup.get(key), status)
        );
      });
    });

    return lookup;
  };

  const getUploadStatusFromLookup = (job, lookup) => {
    if (!lookup?.size) return null;

    const keys = [
      ...getImplementationUploadRowIds(job).map(getImplementationUploadIdLookupKey),
      getImplementationUploadLookupKey(getJobNo(job), getStoreName(job)),
    ].filter(Boolean);

    return keys.map((key) => lookup.get(key)).find(Boolean) || null;
  };

  const withDefaultImplementationUploadStatus = (job) => ({
    ...job,
    isImplementationUploadDone: job?.isImplementationUploadDone || "0",
    implementationUploadFilesCount: Number(
      job?.implementationUploadFilesCount || 0
    ),
  });

 const enrichJobsWithImplementationUploadStatus = async (jobs = []) => {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return [];
  }

  const jobsWithDefaults = jobs.map(withDefaultImplementationUploadStatus);
  const apiUrl = getImplementationUploadListUrl();

  if (!apiUrl) {
    return jobsWithDefaults;
  }

  try {
    const response = await axios.get(apiUrl);
    const uploadStatusLookup = buildImplementationUploadStatusLookup(response.data);

    return jobsWithDefaults.map((job) => {
      const uploadStatus = getUploadStatusFromLookup(job, uploadStatusLookup);

      if (!uploadStatus) {
        return job;
      }

      return {
        ...job,
        isImplementationUploadDone: uploadStatus.uploaded ? "1" : "0",
        implementationUploadFilesCount: uploadStatus.uploadedFilesCount || 0,
        implementationUploadUploadedAtUtc:
          uploadStatus.uploadedAtUtc || job.implementationUploadUploadedAtUtc || null,
      };
    });
  } catch (error) {
    console.warn("Could not load implementation upload status list", error);
    return jobsWithDefaults;
  }
};

 const [columnDefs] = useState([
  {
    headerCheckboxSelection: true,
    checkboxSelection: true,
    field: '',
    width: 50,
    pinned: 'left'
  },
  ...customColumnDefs,
  {
    headerName: "Image Upload",
    field: "isImplementationUploadDone",
    width: 160,
    minWidth: 160,
    cellRenderer: (params) => {
      const uploaded =
        params.value === "1" ||
        params.data?.isImplementationUploadDone === "1" ||
        Number(params.data?.implementationUploadFilesCount || 0) > 0;

      return uploaded ? (
        <span className="badge bg-success">
          Uploaded
          {params.data?.implementationUploadFilesCount
            ? ` (${params.data.implementationUploadFilesCount})`
            : ""}
        </span>
      ) : (
        <span className="badge bg-danger">Pending</span>
      );
    }
  },
  {
    headerName: 'Sent to Printing',
    field: "Sent to Printing",
    valueGetter: (params) => params.data.approved === "Yes" ? "Yes" : "No",
    cellRenderer: (params) => (
      <button className={`btn btn-sm ${params.value === "Yes" ? "btn-success" : "btn-danger"}`} disabled>
        {params.value}
      </button>
    )
  },
  {
    headerName: "On Hold",
    field: "isOnHold",
    cellRenderer: (params) => (
      <span className={`badge ${params.value === "1" ? "bg-primary" : "bg-secondary"}`}>
        {params.value === "1" ? "Yes" : "No"}
      </span>
    )
  }
]);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 120,
    resizable: true,
    sortable: true,
    filter: true
  }), []);

  const handleAcceptOrder = (orderItems) => {
  console.log("Accepted Order Items:", orderItems);

  // You can now push them into AG Grid or save to Mongo
  // Example: POST to Addjobdetails API

  axios.post(config.JobSummary.URL.Addjobdetails, orderItems)
    .then(res => {
      toast.success("Accepted orders added as jobs");
      GetAllJobAccToLocation(); // Refresh grid
    })
    .catch(err => {
      toast.error("Failed to add job details");
      console.error(err);
    });
};

  // Check if users data exists and is not null
  useEffect(() => {
    // Check if users data exists and is not null
    if (users) {
      // Parse the JSON string into an object
      const usersObject = JSON.parse(users);

      // Access the username
      const username = usersObject.message && usersObject.message.username;
      setUser(username);

      const emailid = usersObject.message && usersObject.message.email_id;
      console.log('emailid is: ', emailid);
      setEmailid(emailid);

      // Log the username to the console
      console.log('Username:', username);
    } else {
      console.log('No user data found in localStorage.');
    }
  }, []);


  // const locationMapping = {
  //   1: "MumbaiNanachowk",
  //   2: "BANGALORE",
  //   3: "KOLKATA",
  //   4: "GURGOAN"
  // };

  useEffect(() => {
    // Fetch user_id and username from local storage
    const users = localStorage.getItem('users');

    if (users) {
      try {
        const userObj = JSON.parse(users);
        const userId = userObj?.message?.user_id;
        const userName = userObj?.message?.username;
        const Role=userObj?.message?.rolE_NAME;

        setRolename(Role)

        // Log the retrieved values to the console
        console.log('Fetched User ID:', userId);
        console.log('Fetched Username:', userObj?.message, userName);

        console.log('Entered by ', userObj?.message?.enteredby);
        console.log('Location id ', userObj?.message?.location_id);
        setEnteredby(userObj?.message?.enteredby);
        setLocationid(userObj?.message?.location_id);

        // Set state if values exist
        if (userId) {
          setUserId(userId);
        }

        if (userName) {
          setUsername(userName);
          console.log("username setted", userName);
        }
      } catch (error) {
        console.error('Error parsing JSON from localStorage:', error);
      }
   
  } else {
    console.warn('No users data in localStorage');
  }
  }, []);

  // useEffect(() => {
  //   // Fetch the user's data including location from your backend
  //   const fetchUserData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await axios.get(config.User.URL.Checkuser, {
  //         params: {
  //           userId: userId, 
  //         }
  //       });

  //       if (response.data && response.data.user) {
  //         const { user_id, username, locationid } = response.data.user;

  //         // Save the data to localStorage
  //         const userData = {
  //           message: {
  //             user_id,
  //             username,
  //             locationid, // Save the location ID fetched from the SQL database
  //           }
  //         };

  //         localStorage.setItem('users', JSON.stringify(userData));

  //         // Set state
  //         setUserId(user_id);
  //         setUsername(username);
  //         setLocationId(locationid); // Set the locationId state
  //       }

  //     } catch (error) {
  //       console.error("Error fetching user data:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchUserData();
  // }, [userId]);




  const getLoggedInUserId = () => {
    const users = localStorage.getItem('users');

    if (!users) {
      console.warn("No 'users' found in localStorage.");
      return null;
    }

    try {
      const userObj = JSON.parse(users);
      const userId = userObj?.message?.user_id;
      const userName = userObj?.message?.username;

      if (!userId) {
        console.warn("User ID not found in the parsed data.");
        return null;
      }

      if (userName) {
        setUsername(userName);
        // setData(userName);
      }

      console.log("Logged-in user ID:", userId);
      console.log("username", userName);
      return userId;

    } catch (error) {
      console.error("Failed to parse 'users' from localStorage:", error);
      return null;
    }

    // const usersString = localStorage.getItem('users'); 
    // if (!usersString){

    //   let userId = localStorage.getItem('user_id');
    //   console.log(userId); 
    //   console.warn("no users found in local storage");
    //   return null;
    // } 
    // try {
    //   const users = JSON.parse(usersString); // Parse the JSON string
    //   console.log("parsed users", users);
    //   return users && users.message && users.message.user_id ? users.message.user_id : null; // Return user_id if it exists
    // } catch (error) {
    //   console.error("Failed to parse users from localStorage:", error);
    //   return null; // In case of JSON parsing errors, return null
    // }
  };

  // console.log(setClients,setSubclients)

  const uniqueJobNumbers = useMemo(() => { return [...new Set(jobNumbers.map(job => job.jobNo))] }, [jobNumbers]);
  console.log("unique", uniqueJobNumbers)

  // const filteredData = Array.isArray(designData) ? designData.filter(row =>
  //   row.jobNumbers && row.jobNumbers.toLowerCase().includes(searchTerm.trim().toLowerCase())
  // ) : [];

  useEffect(() => {
    if (selectSearchTerm.trim() === '') {
      setFilteredJobNumbers(uniqueJobNumbers);
    } else {
      const filtered = uniqueJobNumbers.filter(jobNumbers =>
        jobNumbers.toLowerCase().includes(selectSearchTerm.trim().toLowerCase())
      );
      setFilteredJobNumbers(filtered);
    }
  }, [selectSearchTerm, uniqueJobNumbers]);

      const handleDeleteSelectedJobs = async () => {
      const selectedNodes = gridRef.current.api.getSelectedNodes();
      const selectedData = selectedNodes.map(node => node.data);

      if (selectedData.length === 0) {
        toast.error("Please select at least one job to delete.");
        return;
      }
      if(!deleteComment.trim()){
        toast.error("Please enter a comment for deletion.");
        return;
      }

      const jobNos = selectedData.map(job => job.id);
      console.log("Selected job number is ", jobNos);

      try {
        await axios.post(config.JobSummary.URL.DeleteSelectedJobs, 
          {
            jobNos: jobNos,
            userName: userName,
            DeleteComment:deleteComment
          }
        );
        toast.success("Selected jobs deleted successfully.");

        GetAllJobAccToLocation()
      } catch (error) {
        console.error("Error deleting jobs:", error);
        toast.error("Failed to delete jobs.");
      }
    };


  // const handleSelectJobNoChange = (e) => {
  //   const selectedJobNo = e.target.value;
  //   console.log("e is ", e)
  //   setNewJobNo(selectedJobNo);
  //   setSelectSearchTerm("");

  //   if (selectedJobNo) {
  //     // Set sub-client name

  //     if  ( jobNumbers.length > 0 && jobNumbers !=null)
  //     {


  //       const foundJob = jobNumbers.find(job => job.jobNo === selectedJobNo);


  //       if (foundJob)
  //       {


  //         console.log("client ", foundJob.client, foundJob.subClient)
  //         setClients(foundJob.client);
  //         setSubclients(foundJob.subClient);

  //       }

  //     }

  //     else {
  //       setClients('');
  //       setSubclients('');
  //   }
  //   }
  // }


  // const handleJobNumberChange = (jobNo) => {
  //   setNewJobNo(jobNo);
  //   const selectedJob = jobNumbers.find(job => job.jobNo === jobNo);
  //   console.log("Selected Job: ", selectedJob);
  // };


  // const fetchJobs = async () => {
  //   const user_id = getLoggedInUserId();
  //   // const username = userName;

  //   console.log('payload uname: ', userName);

  //   if (!user_id) {
  //     setError("User not logged in");
  //     return;
  //   }

  //   try {
  //     setLoading(true);

  //     const payload = {
  //       user: {
  //         user_id: user_id,
  //         userName: userName,
  //         username: user,
  //         entereddt: currentDate,
  //       }
  //     };

  //     console.log("Sending payload to fetch jobs: ", payload);
  //     console.log('payload username: ', payload.user.userName);

  //     const response = await axios.post(config.JobSummary.URL.Getalljob, payload, { // Make sure to send the payload here
  //       timeout: 10000,
  //       headers: {
  //         'Content-Type': 'application/json' // Ensure the correct content type
  //       }
  //     });

  //     console.log("Data fetched successfully: ", response.data);

  //     setData(response.data);

  //     // setJobNumber(response.data)

  //     setJobNumber(response.data);
  //     setExJobNumber(response.data);
  //     console.log('exjobno: ', response.data);
  //     // If there are jobs, set the client and sub-client based on the first job
  //     if (Array.isArray(response.data) && response.data.length > 0) {
  //       const firstJob = response.data[0]; // Assuming you want to set based on the first job
  //       setClients(firstJob.client); // Adjust according to your data structure
  //       setSubclients(firstJob.subClient); // Adjust according to your data structure
  //     } else {
  //       setClients('');
  //       setSubclients('');
  //     }
  //     console.log('getdata is ', response.data)

  //     if (Array.isArray(response.data) && response.data.length > 0) {
  //       setData(response.data); // This should set jobs specific to the user
  //     } else {
  //       setData([]); // No jobs found for the user
  //     }

  //   } catch (error) {
  //     console.error("Error fetching job data:", error.response ? error.response.data : error.message);
  //     setError("Error fetching job data");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

const getRowsFromAnyResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.message)) return payload.message;
  if (Array.isArray(payload?.$values)) return payload.$values;
  if (Array.isArray(payload?.data?.$values)) return payload.data.$values;
  if (Array.isArray(payload?.items?.$values)) return payload.items.$values;
  return [];
};

const GetAllJobAccToLocation = async () => {
  const users = localStorage.getItem("users");
  if (!users) {
    setData([]);
    return;
  }

  let userObj = {};

  try {
    userObj = JSON.parse(users);
  } catch (error) {
    console.error("Invalid users JSON in localStorage", error);
    setData([]);
    return;
  }

  const userNamedata = userObj?.message?.username;
  const locationdata = userObj?.message?.location_id;
  const roleName = userObj?.message?.rolE_NAME;

  const allowedAdminRoles = ["SuperAdmin", "Admindelete", "Branch Manager"];

  const payload = {
    locationId: locationdata,
    username: userNamedata,
    ...(allowedAdminRoles.includes(roleName) && { rolename: roleName }),
  };

  try {
    setLoading(true);

    const response = await axios.post(
      config.JobSummary.URL.GetAllJobsAccToLocation,
      payload
    );

    const jobs = getRowsFromAnyResponse(response.data);
    const jobsWithUploadStatus = await enrichJobsWithImplementationUploadStatus(jobs);

    setData(jobsWithUploadStatus);
  } catch (error) {
    console.error("Error fetching jobs according to location", error);
    setData([]);
  } finally {
    setLoading(false);
  }
};

const handleResumeSelectedJobs = async () => {
  const selectedNodes = gridRef.current.api.getSelectedNodes();
  const selectedData = selectedNodes.map(node => node.data);

  if (selectedData.length === 0) {
    toast.error("Please select at least one job.");
    return;
  }

  try {
    for (const job of selectedData) {
      await axios.post(config.JobSummary.URL.ResumeJobFromHold, {
        jobNo: job.jobNo,
        userName: userName,
      });
    }

    toast.success("Selected jobs resumed from Hold.");
    GetAllJobAccToLocation();
  } catch (error) {
    console.error("Error resuming jobs:", error);
    toast.error("Failed to resume jobs.");
  }
};


  const GetAllJobsFromSql = async () => {
    const payload = {
      locationId: locationid,
    }
    try {
      const response = await axios.post(config.JobSummary.URL.GetAllJobsFromSql, payload);
      console.log('jobs from sql: ', response.data.comartjobno);
      setJobsFromSql(response.data);
    } catch (error) {
      console.error('Unable to fetch jobs for the location id', error);
    }
  }

const normalize = (value) => String(value || "").trim().toLowerCase();

const parseDeadline = (value) => {
  if (!value) return null;

  const s = String(value).trim();

  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  const m = s.match(
    /^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!m) return null;

  const months = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };

  const day = parseInt(m[1], 10);
  const mon = months[m[2].toUpperCase()];
  const year = parseInt(m[3], 10);
  const hour = parseInt(m[4], 10);
  const min = parseInt(m[5], 10);
  const sec = parseInt(m[6] || "0", 10);

  if (mon === undefined) return null;

  d = new Date(year, mon, day, hour, min, sec);
  return isNaN(d.getTime()) ? null : d;
};

const getJobNo = (row) =>
  row.jobNo || row.JobNo || row.comartjobno || row.ComartJobNo || row.id || "";

const getCSName = (row) =>
  row.userName ||
  row.UserName ||
  row.enteredby ||
  row.Enteredby ||
  row.EnteredBy ||
  row.accountManager ||
  row.AccountManager ||
  "CS Not Assigned";

const getBMName = (row) =>
  row.bmName ||
  row.BMName ||
  row.branchManagerName ||
  row.BranchManagerName ||
  row.branchManager ||
  row.BranchManager ||
  "BM Not Assigned";

const getStoreName = (row) =>
  row.store ||
  row.Store ||
  row.storeName ||
  row.StoreName ||
  row.salonStoreName ||
  row.SalonStoreName ||
  row["Salon/Store Name"] ||
  row["Salon / Store Name"] ||
  row["Store Name"] ||
  row.salonAddress ||
  row.SalonAddress ||
  row.SalonStoreAddress ||
  row["SALON ADDRESS"] ||
  row["Salon / Store Address"] ||
  row["Salon/Store Address"] ||
  "Store Not Available";


  const getCustomerName = (row) =>
  row.client ||
  row.Client ||
  row.CLIENT ||
  row.customername ||
  row.customerName ||
  row.CustomerName ||
  row["Customer Name"] ||
  row.customer ||
  row.Customer ||
  row.subClient ||
  row.SubClient ||
  "Customer Not Available";

const getRowUserValues = (row) => [
  row.userName,
  row.UserName,
  row.username,
  row.Username,
  row["User Name"],
  row["USER NAME"],
  row["CS Name"],
  row.enteredby,
  row.Enteredby,
  row.EnteredBy,
  row.enteredBy,
  row["Entered By"],
  row.csName,
  row.CSName,
  row.accountManager,
  row.AccountManager,
  row.employeeName,
  row.EmployeeName,
  row.employeename,
  row.userid,
  row.userId,
  row.UserId,
  row.UserID,
  row.user_id,
  row.User_ID,
];

const normalizeUserMatchValue = (value) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isUserValueMatch = (loggedInValue, rowValue) => {
  const loginValue = normalizeUserMatchValue(loggedInValue);
  const jobValue = normalizeUserMatchValue(rowValue);

  if (!loginValue || !jobValue) return false;
  if (loginValue === jobValue) return true;

  const loginIsNumber = /^\d+$/.test(loginValue);
  const jobIsNumber = /^\d+$/.test(jobValue);
  if (loginIsNumber || jobIsNumber) return false;

  return (
    loginValue.length >= 3 &&
    jobValue.length >= 3 &&
    (jobValue.includes(loginValue) || loginValue.includes(jobValue))
  );
};

const isLoggedInUserJob = (row) => {
  const loggedInValues = [userName, user, enteredby, userId].filter(Boolean);

  if (!loggedInValues.length) {
    return false;
  }

  return getRowUserValues(row).some((value) =>
    loggedInValues.some((loggedInValue) => isUserValueMatch(loggedInValue, value))
  );
};

const isLoggedInEddieUser = () =>
  [userName, user, enteredby]
    .map(normalizeUserMatchValue)
    .some((value) => value === "eddie" || value === "eddie sir");

const getSuperAdminName = (row) =>
  row.superAdminName ||
  row.SuperAdminName ||
  row.superadminName ||
  row.SuperadminName ||
  "SuperAdmin";

const getNotificationRecipients = (row, alertRule) => {
  const csName = getCSName(row);
  const bmName = getBMName(row);

  return alertRule.recipients
    .map((recipient) => {
      if (recipient === "CS") return csName;
      if (recipient === "BM") return bmName;
      return recipient;
    })
    .filter(Boolean)
    .join(" / ");
};

const getDeadlineValue = (row) =>
  row.deadline ||
  row.Deadline ||
  row["Job Deadline"] ||
  row.jobDeadline ||
  row.JobDeadline ||
  row.printerDeadline ||
  row.PrinterDeadline ||
  row["Printer Deadline"] ||
  row.designerDeadline ||
  row.DesignerDeadline ||
  row["Designer Deadline"] ||
  "";

const getJobStartValue = (row) =>
  row.date ||
  row.Date ||
  row["Job Date"] ||
  row.entereddt ||
  row.EnteredDt ||
  row.EnteredDT ||
  row.startdate ||
  row.startDate ||
  row.StartDate ||
  row.lstupdatedt ||
  row.LstUpdateDt ||
  "";

const isTruthyFlag = (value) =>
  ["1", "true", "yes", "y", "completed", "done"].includes(normalize(value));

const isJobCompletedForAlert = (row) =>
  isTruthyFlag(row.isCompleted) ||
  isTruthyFlag(row.IsCompleted) ||
  isTruthyFlag(row.isJobCompleted) ||
  isTruthyFlag(row.IsJobCompleted) ||
  normalize(row.status) === "completed" ||
  normalize(row.Status) === "completed" ||
  normalize(row.jobStatus) === "completed" ||
  normalize(row.JobStatus) === "completed";

const getDeadlineProgressPercent = (startDate, deadlineDate, now) => {
  if (!startDate || !deadlineDate) return null;

  const totalMs = deadlineDate.getTime() - startDate.getTime();
  if (totalMs <= 0) return null;

  const elapsedMs = now.getTime() - startDate.getTime();
  if (elapsedMs <= 0) return 0;

  return Math.min(100, (elapsedMs / totalMs) * 100);
};

const shouldShowNotificationToUser = (row, alertRule) => {
  if (!alertRule) return false;

  const role = normalize(rolename);

  if (
    role === "superadmin" ||
    role === "admindelete" ||
    role === "branch manager"
  ) {
    return true;
  }

  return isLoggedInUserJob(row);
};

const shouldShowJobNotificationToUser = (row) => {
  const role = normalize(rolename);

  if (
    role === "superadmin" ||
    role === "admindelete" ||
    role === "branch manager"
  ) {
    return true;
  }

  return isLoggedInUserJob(row);
};

const isImplementationUploadDoneForNotification = (row = {}) =>
  row.isImplementationUploadDone === "1" ||
  isTruthyFlag(row.isImplementationUploadDone) ||
  Number(row.implementationUploadFilesCount || 0) > 0;

const getImplementationUploadNotificationKey = (row) =>
  `${getJobNo(row)}|${getStoreName(row)}`;

const getNotificationStorageKey = (alert) =>
  `${alert.jobNoDisplay || alert.jobNo || ""}|${alert.notificationThreshold || ""}`;

const getNotificationSignatureKey = (alert) =>
  `${getNotificationStorageKey(alert)}|${alert.notificationPercent ?? ""}`;

const toStoredNotification = (alert) => ({
  jobNo: alert.jobNoDisplay,
  threshold: alert.notificationThreshold,
  thresholdPercent: alert.notificationBandPercent,
  currentPercent: alert.notificationPercent,
  currentDeadlinePercent: alert.notificationPercent,
  color: alert.notificationType,
  recipients: alert.notificationRecipients,
  csName: alert.csName,
  bmName: alert.bmName,
  storeName: alert.storeName,
  customerName: alert.customerName || "",
  client: alert.customerName || alert.client || alert.Client || "",
  source: alert.notificationSource,
  start: alert.notificationStart,
  deadline: alert.notificationDeadline,
  createdFrom: "CS Dashboard",
  createdAt: getAlertCreatedAtValue(alert) || new Date().toISOString(),
  shownAt: getAlertCreatedAtValue(alert) || new Date().toISOString(),
});

const saveProgressNotifications = useCallback(async (alerts) => {
  const endpoint = config.JobProgressAlert?.URL?.SaveBulk;
  if (!endpoint || !Array.isArray(alerts) || alerts.length === 0) return;

  const uniqueAlerts = Array.from(
    new Map(alerts.map((alert) => [getNotificationStorageKey(alert), alert])).values()
  );
  const signature = uniqueAlerts
    .map(getNotificationSignatureKey)
    .sort()
    .join("||");

  if (!signature || signature === lastSavedAlertSignatureRef.current) return;
  lastSavedAlertSignatureRef.current = signature;

  try {
    await axios.post(endpoint, {
      generatedBy: userName || user || "",
      roleName: rolename || "",
      locationId: locationid || "",
      alerts: uniqueAlerts.map(toStoredNotification),
    });
    saveAlertFailureShownRef.current = false;
  } catch (error) {
    console.warn("Could not save job progress notifications", error);
    if (!saveAlertFailureShownRef.current) {
      toast.warning("Notifications are showing, but backend save failed. Check JobProgressAlert SaveBulk API.");
      saveAlertFailureShownRef.current = true;
    }
  }
}, [locationid, rolename, user, userName]);

const fetchActiveSchedulerAlerts = useCallback(async () => {
  const endpoint = config.JobProgressAlert?.URL?.GetActive;
  if (!endpoint) return;

  try {
    const response = await axios.get(endpoint);
    const rows = getRowsFromApiResponse(response.data);
    setSchedulerAlertJobs(
      rows
        .map(normalizeStoredProgressAlert)
        .filter((alert) => alert.jobNoDisplay || alert.notificationSource)
    );
  } catch (error) {
    console.warn("Could not load active ERP scheduler alerts", error);
    setSchedulerAlertJobs([]);
  }
}, []);


const checkDeadlines = useCallback(() => {
  if (!Array.isArray(data)) {
    setDeadlineWarningJobs([]);
    setDeadlineMissedJobs([]);
    return;
  }

  const now = new Date();

  const finalJobs = [];
  const activeThresholdJobs = [];
  const notificationMap = new Map();

  data.forEach((row) => {
    if (isJobCompletedForAlert(row)) return;

    const deadlineValue = getDeadlineValue(row);
    const startValue = getJobStartValue(row);
    const deadlineDate = parseDeadline(deadlineValue);
    const startDate = parseDeadline(startValue);

    const deadlineProgressPercent = getDeadlineProgressPercent(startDate, deadlineDate, now);
    if (deadlineProgressPercent === null) return;

    const alertRule = getSlaAlertRuleForPercent(deadlineProgressPercent);
    if (!shouldShowNotificationToUser(row, alertRule)) return;

    const roundedDeadlinePercent = Number(deadlineProgressPercent.toFixed(1));
    const alertCreatedAt = getAlertCreatedAtValue(row) || now.toISOString();
    const notificationRow = {
      ...row,
      jobNoDisplay: getJobNo(row),
      csName: getCSName(row),
      bmName: getBMName(row),
      storeName: getStoreName(row),
        customerName: getCustomerName(row),
      superAdminName: getSuperAdminName(row),
      notificationDeadline: deadlineValue || "N/A",
      notificationStart: startValue || "N/A",
      notificationPercent: roundedDeadlinePercent,
      notificationActualPercent: roundedDeadlinePercent,
      notificationBandPercent: alertRule.threshold,
      notificationSource: getMongoValue(row.source || row.Source || "") || "Deadline",
      notificationThreshold: alertRule.label,
      notificationRecipients: getNotificationRecipients(row, alertRule),
      notificationType: alertRule.notificationType,
      notificationCreatedAt: alertCreatedAt,
    };

    notificationMap.set(getNotificationStorageKey(notificationRow), notificationRow);
  });

  Array.from(notificationMap.values()).forEach((notificationRow) => {
    const alertRule = getSlaAlertRuleByType(notificationRow.notificationType);
    if (alertRule?.threshold >= 100) {
      finalJobs.push(notificationRow);
    } else {
      activeThresholdJobs.push(notificationRow);
    }
  });

  setDeadlineMissedJobs(finalJobs);
  setDeadlineWarningJobs(activeThresholdJobs);
  saveProgressNotifications([...activeThresholdJobs, ...finalJobs]);
}, [data, enteredby, saveProgressNotifications, user, userId, userName]);

const checkImplementationUploadNotifications = useCallback(() => {
  if (!Array.isArray(data)) {
    setImplementationUploadNotificationJobs([]);
    return;
  }

  const notificationMap = new Map();

  data.forEach((row) => {
    if (!isImplementationUploadDoneForNotification(row)) return;
    if (!shouldShowJobNotificationToUser(row)) return;

    const jobNoDisplay = getJobNo(row);
    const storeName = getStoreName(row);
    const notificationKey = getImplementationUploadNotificationKey(row);

    if (!jobNoDisplay || !storeName || !notificationKey) return;

    const filesCount = Number(row.implementationUploadFilesCount || 0);
    const current = notificationMap.get(notificationKey);
    const alertCreatedAt = getAlertCreatedAtValue(row) || new Date().toISOString();

    notificationMap.set(notificationKey, {
      ...row,
      jobNoDisplay,
      csName: getCSName(row),
      bmName: getBMName(row),
      storeName,
      customerName: getCustomerName(row),
      notificationDeadline: getDeadlineValue(row) || "N/A",
      notificationStart: getJobStartValue(row) || "N/A",
      notificationPercent: null,
      notificationActualPercent: null,
      notificationBandPercent: null,
      notificationSource: getMongoValue(row.source || row.Source || "") || "Implementation Upload",
      notificationThreshold: "Uploaded",
      notificationRecipients: getCSName(row),
      notificationType: "Implementation Upload",
      notificationCreatedAt: alertCreatedAt,
      implementationUploadFilesCount: Math.max(
        current?.implementationUploadFilesCount || 0,
        filesCount
      ),
    });
  });

  setImplementationUploadNotificationJobs(Array.from(notificationMap.values()));
}, [data, enteredby, rolename, user, userId, userName]);

  useEffect(() => {
    if (!locationid || !userName) return;

    // fetchJobs();
    fetchcustomers();
    GetAllJobsFromSql();
    GetAllJobAccToLocation();
  }, [locationid, userName]);

  useEffect(() => {
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [checkDeadlines]);

  useEffect(() => {
    fetchActiveSchedulerAlerts();
    const interval = setInterval(fetchActiveSchedulerAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchActiveSchedulerAlerts]);

  useEffect(() => {
    checkImplementationUploadNotifications();
  }, [checkImplementationUploadNotifications]);

  useEffect(() => {
    if (!isDraggingAlert) return;

    const handleMouseMove = (event) => {
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      setAlertPosition({
        left: Math.max(8, dragStartPos.left + dx),
        top: Math.max(8, dragStartPos.top + dy),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingAlert(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingAlert, dragStart, dragStartPos]);

  const handleAlertMouseDown = (event) => {
    if (!alertRef.current) return;
    const rect = alertRef.current.getBoundingClientRect();
    setIsDraggingAlert(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    setDragStartPos({ left: rect.left, top: rect.top });
  };

  useEffect(() => {
    if (Array.isArray(data)) { // Check if data is an array
      const totals = data.reduce((acc, row) => {
        acc.width += parseInt(row.width) || 0;
        acc.height += parseInt(row.height) || 0;
        return acc;
      }, { width: 0, height: 0 });

      setTotalValues(totals);
    }
  }, [data]);


  const filteredData1 = Array.isArray(data) ? data.filter(row =>
    row.jobNo && row.jobNo.toLowerCase().includes(searchTerm.trim().toLowerCase())
  ) : [];
  console.log(filteredData1);



  const filteredData = useMemo(() => {
    return filteredData1.filter((row) => {
      return Object.keys(filters).every((key) => {
        return row[key]?.toString().toLowerCase().includes(filters[key].toLowerCase()) || filters[key] === '';
      });
    });
  }, [filteredData1, filters]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  // const filteredData = useMemo(() => {
  //   return sortedData.filter(row => {
  //     return (
  //       (row.jobNo && row.jobNo.toLowerCase().includes(filters.jobNo.toLowerCase())) &&
  //       (row.date && row.date.includes(filters.date)) &&
  //       (row.client && row.client.toLowerCase().includes(filters.client.toLowerCase())) &&
  //       (row.userName && row.userName.toLowerCase().includes(filters.userName.toLowerCase())) &&
  //       (row.subClient && row.subClient.toLowerCase().includes(filters.subClient.toLowerCase())) &&
  //       (row.productionLocation && row.productionLocation.toLowerCase().includes(filters.productionLocation.toLowerCase())) &&
  //       (row.billingLocation && row.billingLocation.toLowerCase().includes(filters.billingLocation.toLowerCase())) &&
  //       (row.visualCode && row.visualCode.toLowerCase().includes(filters.visualCode.toLowerCase())) &&
  //       (row.nameSubCode && row.nameSubCode.toLowerCase().includes(filters.nameSubCode.toLowerCase())) &&
  //       (row.city && row.city.toLowerCase().includes(filters.city.toLowerCase())) &&
  //       (row.qty && row.qty.toLowerCase().includes(filters.qty.toLowerCase())) &&
  //       (row.width && row.width.toLowerCase().includes(filters.width.toLowerCase())) &&
  //       (row.height && row.height.toLowerCase().includes(filters.height.toLowerCase())) &&
  //       (row.totalSqFt && row.totalSqFt.toLowerCase().includes(filters.totalSqFt.toLowerCase())) &&
  //       (row.media && row.media.toLowerCase().includes(filters.media.toLowerCase())) &&
  //       (row.lamination && row.lamination.toLowerCase().includes(filters.lamination.toLowerCase())) &&
  //       (row.mounting && row.mounting.toLowerCase().includes(filters.mounting.toLowerCase())) &&
  //       (row.implementation && row.implementation.toLowerCase().includes(filters.implementation.toLowerCase())) &&
  //       (row.salonAddress && row.salonAddress.toLowerCase().includes(filters.salonAddress.toLowerCase())) &&
  //       (row.machineName && row.machineName.toLowerCase().includes(filters.machineName.toLowerCase())) &&
  //       (row.deadline && row.deadline.toLowerCase().includes(filters.deadline.toLowerCase())) &&
  //       (row.designerName && row.designerName.toLowerCase().includes(filters.designerName.toLowerCase())) &&
  //       (row.designerDeadline && row.designerDeadline.toLowerCase().includes(filters.designerDeadline.toLowerCase())) &&
  //       (row.printerPrintingName && row.printerPrintingName.toLowerCase().includes(filters.printerPrintingName.toLowerCase())) &&
  //       (row.printerDeadline && row.printerDeadline.toLowerCase().includes(filters.printerDeadline.toLowerCase())) &&
  //       (row.remarks && row.remarks.toLowerCase().includes(filters.remarks.toLowerCase()))

  //     );
  //   });
  // }, [sortedData, filters]);
  console.log(filteredData)

  const toggleBulkAdd = useCallback(() => {
    if (BulkAdd) {
      // Reset states when closing the modal
      setBulkAdd(false);
      setHeaders([]); // Reset to an empty array
      // setData([]);    // Reset to an empty array
    } else {
      setBulkAdd(true);
    }
  }, [BulkAdd]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  }


  const fetchcustomers = async () => {
    try {
      const users = localStorage.getItem('users');
      if (!users) {
        console.error("No user data found in local storage.");
        return; // Exit if no user data
      }

      const userObj = JSON.parse(users);
      let location_id = userObj?.message?.location_id;

      if (!location_id) {
        console.error("Location ID is not found in user data.");
        return; // Exit if no location ID
      }

      console.log('Location ID for fetch customers: ', location_id);

      let payload = {
        locationid: location_id
      };

      console.log('Payload for fetch customers:', payload);

      const response = await axios.post(config.JobSummary.URL.Getallcustomer, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Get customer response:', response.data);
      setcustomer(mergeFallbackCustomers(response.data));

    } catch (error) {
      console.error("Error fetching customer data:", error.response ? error.response.data : error.message);
      // setError("Error fetching job data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCustomerName = async () => {
      if (!locationid) return;

      const payload = {
        locationId: locationid,
      };

      try {
        const response = await axios.post(config.JobSummary.URL.GetCustomerNameAccToLocation, payload);
        const rows = getRowsFromAnyResponse(response.data);
        setCustomerNameAccLocation(rows);
        console.log('customer names', rows);
      } catch (error) {
        console.error('Error fetching customer name', error);
        setCustomerNameAccLocation([]);
      }
    };

    fetchCustomerName();
  }, [locationid]);

  const normalizeHeader = (header) => header?.trim().toLowerCase();

  const EXPECTED_FORMAT = "dd/MMM/yyyy HH:mm:ss (e.g. 23/FEB/2026 15:00:00)";

const parseExcelDeadline = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;

  // allow Excel date values too (sometimes becomes Date-like string)
  const s = String(value).trim();

  // Must be like: 23/FEB/2026 15:00:00
  const m = s.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return { ok: false, reason: `Wrong format. Use ${EXPECTED_FORMAT}` };

  const day = parseInt(m[1], 10);
  const monStr = m[2].toUpperCase();
  const year = parseInt(m[3], 10);
  const hh = parseInt(m[4], 10);
  const mm = parseInt(m[5], 10);
  const ss = parseInt(m[6] ?? "0", 10);

  const months = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11 };
  if (!(monStr in months)) return { ok: false, reason: `Invalid month '${m[2]}'. Use JAN..DEC` };

  const dt = new Date(year, months[monStr], day, hh, mm, ss);
  if (isNaN(dt.getTime())) return { ok: false, reason: `Invalid date/time. Use ${EXPECTED_FORMAT}` };

  // Validate exact match (prevents 32/FEB becoming March, etc.)
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== months[monStr] ||
    dt.getDate() !== day ||
    dt.getHours() !== hh ||
    dt.getMinutes() !== mm ||
    dt.getSeconds() !== ss
  ) {
    return { ok: false, reason: `Invalid date/time. Use ${EXPECTED_FORMAT}` };
  }

  return { ok: true, date: dt };
};

const validateDeadlines = (rows) => {
  const errors = [];
  const now = new Date();

  rows.forEach((r, idx) => {
    const jobVal = r["Job Deadline"];
    const printVal = r["Printer Deadline"];

    // 1) cannot be empty
    if (jobVal === null || jobVal === undefined || String(jobVal).trim() === "") {
      errors.push({ rowIndex: idx, field: "Job Deadline", value: jobVal, message: "Job Deadline cannot be empty." });
    }
    if (printVal === null || printVal === undefined || String(printVal).trim() === "") {
      errors.push({ rowIndex: idx, field: "Printer Deadline", value: printVal, message: "Printer Deadline cannot be empty." });
    }

    // If empty, skip further checks
    const pJob = parseExcelDeadline(jobVal);
    const pPrint = parseExcelDeadline(printVal);

    // 2) format dd/MMM/yyyy HH:mm:ss
    if (pJob && pJob.ok === false) {
      errors.push({ rowIndex: idx, field: "Job Deadline", value: jobVal, message: pJob.reason });
    }
    if (pPrint && pPrint.ok === false) {
      errors.push({ rowIndex: idx, field: "Printer Deadline", value: printVal, message: pPrint.reason });
    }

    // 3) cannot be previous date/time
    if (pJob && pJob.ok && pJob.date < now) {
      errors.push({ rowIndex: idx, field: "Job Deadline", value: jobVal, message: "Job Deadline cannot be in the past." });
    }
    if (pPrint && pPrint.ok && pPrint.date < now) {
      errors.push({ rowIndex: idx, field: "Printer Deadline", value: printVal, message: "Printer Deadline cannot be in the past." });
    }
  });

  return errors;
};

// Better display for client: one toast + open modal
const showExcelValidationUI = (errors) => {
  setValidationErrors(errors);
  setShowValidationModal(true);

  const affectedRows = new Set(errors.map(e => e.rowIndex)).size;

  toast.error(
    `Excel has ${errors.length} issue(s) in ${affectedRows} row(s). Please click "View Errors" and fix.`,
    { autoClose: false }
  );
};

const exportValidationErrorsToExcel = async () => {
  try {
    if (!validationErrors || validationErrors.length === 0) {
      toast.info("No validation errors to export.");
      return;
    }

    const { ExcelJS, saveAs } = await loadExcelExportTools();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Excel Errors");

    ws.columns = [
      { header: "Row No", key: "rowNo", width: 10 },
      { header: "Column", key: "field", width: 22 },
      { header: "Your Value", key: "value", width: 30 },
      { header: "Fix / Message", key: "message", width: 45 },
      { header: "Expected Format", key: "expected", width: 35 },
    ];

    // Header styling
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    validationErrors.forEach((e) => {
      ws.addRow({
        rowNo: (e.rowIndex ?? 0) + 2,
        field: e.field,
        value: e.value ?? "",
        message: e.message,
        expected: EXPECTED_FORMAT,
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `Excel_Validation_Errors_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Error report exported.");
  } catch (err) {
    console.error(err);
    toast.error("Failed to export error report.");
  }
};

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const { read, utils } = await import("xlsx");
      const binaryStr = event.target.result;
      const workbook = read(binaryStr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = utils.sheet_to_json(worksheet, { header: 1, raw: false });

      if (!jsonData.length) {
        console.error('No data found in the Excel file');
        return;
      }

      const excelHeaders = jsonData[0];
      const dataRows = jsonData.slice(1);

      const normalizedHeaderMap = {};
      excelHeaders.forEach((header, i) => {
        const normalized = normalizeHeader(header);
        Object.entries(headerMapping).forEach(([key, value]) => {
          if (normalizeHeader(key) === normalized || normalizeHeader(value) === normalized) {
            normalizedHeaderMap[i] = value;
          }
        });
      });

      const mappedData = dataRows.map((row) => {
  const obj = {};
  Object.keys(normalizedHeaderMap).forEach((index) => {
    const colIndex = parseInt(index);
    const fieldName = normalizedHeaderMap[colIndex];
    obj[fieldName] = row[colIndex];
  });

  // ✅ If "Date" is still missing, fallback to "Job Date"
  if (!obj["Date"] && row[excelHeaders.indexOf("Job Date")] != null) {
    obj["Date"] = row[excelHeaders.indexOf("Job Date")];
  }

  return obj;
}).filter(row => Object.values(row).some(val => val !== '' && val !== null && val !== undefined));


      setHeaders(Object.values(normalizedHeaderMap));

// ✅ Validate only when excel contains these columns
const hasJobDeadline = headers.includes("Job Deadline") || Object.values(normalizedHeaderMap).includes("Job Deadline");
const hasPrinterDeadline = headers.includes("Printer Deadline") || Object.values(normalizedHeaderMap).includes("Printer Deadline");

const errors = validateDeadlines(mappedData);

if (errors.length > 0) {
  setData([]);               // block preview
  showExcelValidationUI(errors);
  return;
}

setData(mappedData);
      console.log('✅ Mapped Excel Headers:', Object.values(normalizedHeaderMap));
      console.log('✅ Parsed Data:', mappedData);
    };

    reader.readAsBinaryString(file);
  };

  {/*submitting excel data*/ }
  const submitDataToAPI = async (e) => {
    const user_id = getLoggedInUserId();
    // let ISnewjob = 1;

    if (!user_id) {
      setError("User not logged in");
      return;
    }
   // if (!emailid) {
     // toast.error("Email id not found!");
      //return;
    //}
    e.preventDefault();
    try {
      setLoading(true);

      const dataWithUsernames = data.map(item => ({
        ...item,  // Spread existing properties
        userName: userName, // Add the username field
        user_id: user_id,
        username: user,
        emailid: emailid,
        entereddt: currentDate,
      }));

      console.log('data with unames', dataWithUsernames, newJobNo, clients, subClients);
      console.log("API URL: ", config.JobSummary.URL.Addjobdetails);

      // const jobNumbers = [];

      if (newJobNo != '')
      {
        // ISnewjob = 0;
        let newdata = dataWithUsernames.map(item => ({
          ...item,  // Spread existing properties
          "Job No": newJobNo,
          "CLIENT": clients,
          "UserId": userId,
          // "Sub Client": subClients,

          ISnewjob:'0'
        }));

        console.log("newdata",newdata);
        const response = await axios.post(config.JobSummary.URL.Addjobdetails, newdata);
        console.log("response of the job number", newdata);
        const jobNoCreated = response.data.jobno || response.data.jobNo || '';
        setLatestJobNo(jobNoCreated); // after existing job response

        console.log("Job created successfully. Job No:", jobNoCreated);
        const data = response.config.data;
        const parsedData = JSON.parse(data);
        const jobNumbers = parsedData.map(item => item['Job No']);
        console.log("Data submitted successfully: ", jobNumbers);
        console.log("data is here ",data)

        if (jobNoCreated) {
          toast.success(`Job created successfully. Job No: ${jobNoCreated}`);
        } else {
          toast.success(`Job created successfully`);
        }

        

        // Reset the state after submission
        setHeaders([]);
        setData([]);
        setBulkAdd(false);      
      }
      else {    
        // ISnewjob = 1;
        let newdata = dataWithUsernames.map(item => ({
          ...item,
          ISnewjob: '1',
          "customername": customerName,
          "businessType": businessType,
          "customerEmail": customerEmail,
          "contactPerson": contactPerson,
          "customerid": customerid,
          "lpono": lpono,
          "lpodate": lpoDate.toString(),
          "potype": poType,
          "jobdesc": "",
          "enteredby": userName,
          "userid": userId,
          "locationid": locationid,
          "emailid": emailid,
        }));
      
        const newemptyjob = [{
          ISnewjob: '1',
          customername: customerName,
          businessType: businessType,
          customerEmail: customerEmail,
          contactPerson: contactPerson,
          customerid: customerid,
          lpono: lpono,
          lpodate: lpoDate.toString(),
          potype: poType,
          jobdesc: "",
          enteredby: userName,
          userid: userId,
          locationid: locationid,
          emailid: emailid,
          projectname:projectname,
        }];
      
        newdata = newemptyjob;
      
        const response = await axios.post(config.JobSummary.URL.Addjobdetails, newdata);
      
        const createdJobNo = response?.data?.jobno || ""; 
        console.log("Data submitted successfully: ", response);
        setLatestJobNo(createdJobNo); // after new job response

      
        if (createdJobNo) {
          toast.success(`Job created successfully. Job No: ${createdJobNo}`);
        } else {
          toast.success("Job created successfully.");
        }
      }

      // Reset form and UI
      resetForm();
      toggleBulkAdd();
      // fetchJobs();
      setHeaders([]);
      // setData([]);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios error: ", error.message);
      } else {
        console.error("Unexpected error: ", error);
      }
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };


  console.log(customerid);
  

  // const handleStartJob = () => {
  //   if (Object.values(selectedRows).some(v => v)) {
  //     const currentTime = new Date().toLocaleTimeString();
  //     setData((prevData) =>
  //       prevData.map((row) => {
  //         if (selectedRows[row.id] && !row.isStarted) { // Prevent starting already started jobs
  //           return { ...row, startJobTime: currentTime, isStarted: true };
  //         }
  //         return row;
  //       })
  //     );
  //     setIsJobRunning(true);
  //   }
  // };

  // const handleStopJob = () => {
  //   const currentTime = new Date().toLocaleTimeString();
  //   setData((prevData) =>
  //     prevData.map((row) => {
  //       if (selectedRows[row.id] && row.isStarted) { // Ensure we only stop jobs that are started
  //         return { ...row, stopJobTime: currentTime, isCompleted: true, isStarted: false };
  //       }
  //       return row;
  //     })
  //   );
  //   setSelectedRows({});
  //   setIsJobRunning(false);
  // };

  // const convertTo24HourFormat = (timeStr) => {
  //   const [time, modifier] = timeStr.split(" "); // Split time and AM/PM
  //   let [hours, minutes, seconds] = time.split(":"); // Split into components

  //   // Log components for debugging
  //   console.log(`Original time: ${timeStr}, Hours: ${hours}, Minutes: ${minutes}, Seconds: ${seconds}, Modifier: ${modifier}`);

  //   if (modifier === "PM" && hours !== "12") {
  //     hours = (parseInt(hours) + 12).toString(); // Convert PM hours
  //   } else if (modifier === "AM" && hours === "12") {
  //     hours = "00"; // Midnight case
  //   }

  //   // Return in HH:mm:ss format
  //   return `${hours}:${minutes}:${seconds || '00'}`;
  // };

  // const calculateTotalTime = (start, stop) => {
  //   console.log("Start:", start, "Stop:", stop); // Log inputs

  //   if (!start || !stop) {
  //     return 'Invalid time';
  //   }

  //   // Convert to 24-hour format
  //   const start24 = convertTo24HourFormat(start);
  //   const stop24 = convertTo24HourFormat(stop);

  //   const startTime = new Date(`1970-01-01T${start24}`);
  //   const stopTime = new Date(`1970-01-01T${stop24}`);

  //   console.log("StartTime:", startTime, "StopTime:", stopTime); // Log date objects

  //   if (isNaN(startTime.getTime()) || isNaN(stopTime.getTime())) {
  //     return 'Invalid time';
  //   }

  //   let totalTime = stopTime - startTime;

  //   if (totalTime < 0) {
  //     return 'Stop time must be after start time';
  //   }

  //   // Calculate hours, minutes, and seconds
  //   const hours = Math.floor(totalTime / 3600000);
  //   const minutes = Math.floor((totalTime % 3600000) / 60000);
  //   const seconds = Math.floor((totalTime % 60000) / 1000); // Calculate seconds

  //   return `${hours}h ${minutes}m ${seconds}s`; // Include seconds in the return value
  // };

  // const handleInputChange = async (id, field, value) => {
  //   setData((prevData) =>
  //     prevData.map((row) =>
  //       row.id === id ? { ...row, [field]: value } : row
  //     )
  //   );

  // try {
  //     await axios.put(`${config.JobSummary.URL.UpdateJob}/${id}`, { [field]: value });
  //     console.log(`Updated job ${id}: ${field} = ${value}`);
  // } catch (error) {
  //     console.error("Error updating job:", error.response ? error.response.data : error.message);
  //     setError("Error updating job");}


  // const handleStatusChange = (id, value) => {
  //   setData((prevData) =>
  //     prevData.map((row) =>
  //       row.id === id ? { ...row, status: value } : row
  //     )
  //   );
  // };

  // const totalValues = Object.keys(selectedRows).reduce((totals, id) => {
  //   if (selectedRows[id]) {
  //     const row = data.find(item => item.id === parseInt(id));
  //     if (row) {
  //       totals.width += parseInt(row.width) || 0;
  //       totals.height += parseInt(row.height) || 0;
  //     }
  //   }
  //   return totals;
  // }, { width: 0, height: 0 });

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedExJobNumber, setSelectedExJobNumber] = useState('');

  const handleSelectChange = (selectedOption) => {
    if (selectedOption) {
      console.log(selectedOption); // Log the selected option
      setSelectedCustomerId(selectedOption.value); // Set the selected customer ID
      setCustomerid(selectedOption.value); // Set the customer ID state

      // Find the customer name based on the selected option
      const selectedCustomer = customerOptions.find(option => option.value === selectedOption.value);
      setCustomerName(selectedCustomer ? selectedCustomer.label : ''); // Set the customer name
      console.log("Customer ID is for new customer:", selectedOption.value);
      console.log("Customer Name is:", selectedCustomer ? selectedCustomer.label : '');
    } else {
      setSelectedCustomerId('');
      setCustomerName('');
    }
  };

  const handleExJobNoSelectChange = (selectedOption) => {
    if (selectedOption) {
      console.log(selectedOption); // Log the selected option
      setSelectedExJobNumber(selectedOption.value);

      // Find the customer name based on the selected option
      const selectedJobNo = uniqueJobNoOptions.find(option => option.value === selectedOption.value);
      console.log(selectedJobNo, "selected job no");
      setNewJobNo(selectedOption.value);
      if (selectedJobNo) {
        setClients(selectedJobNo.clientName); // Set the client name
        setSubclients(selectedJobNo.subClient); // Set the sub-client name if it exists
        console.log('Selected client name is: ', selectedJobNo.client);
        console.log('Selected sub-client name is: ', selectedJobNo.subClient);
      } else {
        setClients(''); // Clear client if not found
        setSubclients(''); // Clear sub-client if not found
      }

      console.log('selected client name is: ', selectedOption);
      setCustomerName(selectedJobNo ? selectedJobNo.label : ''); // Set the customer name
      console.log("Job No :", selectedOption.value);
      console.log("Job No is:", selectedJobNo ? selectedJobNo.label : '');
    } else {
      setSelectedExJobNumber('');
    }
  };

  const handleJobOnHold = async () => {
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const selectedData = selectedNodes.map(node => node.data);
  
    if (selectedData.length === 0) {
      toast.error("Please select at least one job.");
      return;
    }
  
    try {
      for (const job of selectedData) {
        await axios.post(config.JobSummary.URL.SetJobOnHold, { jobNo: job.jobNo });
      }
  
      toast.success("Selected jobs marked as On Hold.");
      GetAllJobAccToLocation(); // Refresh data
    } catch (error) {
      console.error("Error marking jobs as on hold:", error);
      toast.error("Failed to mark jobs as on hold.");
    }
  };
  
  

  // const customerOptions = customer.map((cust) => ({
  //   value: cust.customeR_ID,
  //   label: cust.customeR_NAME,
  // }));
  console.log(customer, customerNameAccLocation, 'customer name');

  const customerOptions = customerNameAccLocation.map((cust) => ({
    value: cust.customerid,
    label: cust.client,
  }));

  const formatDecimal = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? '' : num.toFixed(2);
  };
  

  // const jobNoOptions = Array.from(new Set(exJobNumber.map(job => job.jobNo)))
  //   .map(jobNo => {
  //     const job = exJobNumber.find(job => job.jobNo === jobNo); // Find the first occurrence of the job
  //     return {
  //       value: jobNo,
  //       label: jobNo, // Display job number
  //       clientName: job ? job.client : '' // Include client name if found
  //     };
  //   });
  const jobNoOptionsFromSql = jobsFromSql.map(job => ({
    value: job.comartjobno,
    label: `${job.comartjobno} (${job.client})`,
    clientName: job.client || '',
    subClient: job.subClient || ''
  }));


  const jobNoOptionsFromExJobNumber = Array.from(new Set(exJobNumber.map(job => job.jobNo)))
  .map(jobNo => {
    const job = exJobNumber.find(job => job.jobNo === jobNo); // Find the first occurrence
    return {
      value: jobNo,
      label: `${jobNo} (${job?.client || 'Unknown'})`,
      clientName: job?.client || '',
      subClient: job?.subClient || ''
    };
  });

  const combinedJobNoOptions = [...jobNoOptionsFromSql, ...jobNoOptionsFromExJobNumber];
  const uniqueJobNoOptions = Array.from(new Set(combinedJobNoOptions.map(option => option.value)))
    .map(value => combinedJobNoOptions.find(option => option.value === value));
    // setJobNoOptions(uniqueJobNoOptions); 

  console.log('selected job No options: ', uniqueJobNoOptions);

  console.log('selected date is: ', lpoDate, exJobNumber);

  const handleBusinessType = (e) => {
    setBusinessType(e.target.value);
  }
  const handlePoType = (e) => {
    setPoType(e.target.value);
  }

  console.log('comart job no: ', jobsFromSql.comartjobno);

  const activeNotificationJobs = Array.from(
    new Map(
      [
        ...schedulerAlertJobs,
        ...implementationUploadNotificationJobs,
        ...deadlineWarningJobs,
        ...deadlineMissedJobs,
      ].map((job) => [
        `${job.notificationSource || ""}|${job.jobNoDisplay || ""}|${job.storeName || ""}|${job.notificationThreshold || ""}|${job.notificationType || ""}`,
        job,
      ])
    ).values()
  );
  const uploadNotificationCount = implementationUploadNotificationJobs.length;
  const activeNotificationSignature = activeNotificationJobs
    .map((job) =>
      `${job.notificationSource || ""}|${job.jobNoDisplay || ""}|${job.storeName || ""}|${job.notificationThreshold || ""}|${job.notificationPercent ?? ""}|${getAlertCreatedAtValue(job) || ""}`
    )
    .sort()
    .join("||");


  useEffect(() => {
  if (activeNotificationJobs.length > 0) {
    setIsAlertAccepted(false);
  }
}, [activeNotificationJobs.length, activeNotificationSignature]);

  const visibleAlertRules = [...SLA_ALERT_RULES]
    .reverse()
    .filter((rule) =>
      activeNotificationJobs.some((job) => job.notificationType === rule.notificationType)
    );

  return (
    <div>
      <div className="page-wrapper">
        <div className="content container-fluid">
          <ToastContainer />

        {activeNotificationJobs.length > 0 && !isAlertAccepted && (
  <Alert
    ref={alertRef}
    variant="light"
    style={{
  position: "fixed",
  left: 0,
  top: 0,
  width: "100vw",
  height: "100vh",
  zIndex: 99999,
  borderRadius: 0,
  overflow: "auto",
  boxShadow: "none",
  padding: "35px",
  background: "rgba(255,255,255,0.98)",
  userSelect: "auto",
}}
  >
    <div
      onMouseDown={handleAlertMouseDown}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        cursor: "move",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700 }}>
        ERP Scheduler Alerts
      </div>
      <div style={{ fontSize: 13, opacity: 0.7 }}>Drag</div>
    </div>

    <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
  gap: 24,
  marginBottom: 20,
}}
>
  {uploadNotificationCount > 0 && (
    <div
      className="erp-alert-tile-blink"
      style={{
        background: "#16a34a",
        color: "#fff",
        borderRadius: 20,
        padding: "30px",
        minHeight: "220px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
        animation: "pulseBlink 1.2s infinite",
      }}
    >
      <div
        style={{
          fontSize: "38px",
          fontWeight: 900,
          lineHeight: 1.1,
        }}
      >
        Uploaded
      </div>

      <div
        style={{
          fontSize: "26px",
          fontWeight: 700,
          marginTop: 14,
        }}
      >
        Implementation Pictures
      </div>

      <div
        style={{
          fontSize: "64px",
          fontWeight: 900,
          marginTop: 18,
        }}
      >
        {uploadNotificationCount}
      </div>
    </div>
  )}

  {visibleAlertRules.map((rule) => {
    const alertCount = activeNotificationJobs.filter(
      (job) => job.notificationType === rule.notificationType
    ).length;

    if (alertCount <= 0) return null;

    return (
      <div
        key={rule.notificationType}
        className="erp-alert-tile-blink"
        style={{
          background: rule.color,
          color: rule.textColor || "#fff",
          borderRadius: 20,
          padding: "30px",
          minHeight: "220px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
          animation: "pulseBlink 1.2s infinite",
        }}
      >
        <div
          style={{
            fontSize: "42px",
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {rule.label}
        </div>

        <div
          style={{
            fontSize: "28px",
            fontWeight: 700,
            marginTop: 14,
          }}
        >
          {rule.notificationType}
        </div>

        <div
          style={{
            fontSize: "64px",
            fontWeight: 900,
            marginTop: 18,
          }}
        >
          {alertCount}
        </div>
      </div>
    );
  })}
</div>

    <div
      style={{
        marginTop: 16,
        padding: "12px 14px",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#fff",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Color meaning</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          fontSize: 13,
          lineHeight: 1.35,
        }}
      >
        {uploadNotificationCount > 0 && (
          <div
            style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: "#16a34a",
                border: "1px solid rgba(15,23,42,0.18)",
                flex: "0 0 14px",
                marginTop: 2,
              }}
            />
            <div>
              <div>
                <b>Implementation Upload</b>: Pictures uploaded for job/store
              </div>
              <div style={{ color: "#6b7280" }}>
                To: CS
              </div>
            </div>
          </div>
        )}

        {[...SLA_ALERT_RULES].reverse().map((rule) => (
          <div
            key={`legend-${rule.notificationType}`}
            style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: rule.color,
                border: "1px solid rgba(15,23,42,0.18)",
                flex: "0 0 14px",
                marginTop: 2,
              }}
            />
            <div>
              <div>
                <b>{rule.notificationType}</b>: {rule.meaning}
              </div>
              <div style={{ color: "#6b7280" }}>
                To: {rule.recipients.join(" / ")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div style={{ marginTop: 16, fontSize: 15, lineHeight: 1.65 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        Showing {activeNotificationJobs.length} alert(s)
      </div>
      <div
        style={{
          maxHeight: 260,
          overflowY: "auto",
          paddingRight: 6,
        }}
      >
      {activeNotificationJobs.map((job, index) => {
        const isUploadNotification = job.notificationSource === "Implementation Upload";
        const alertTime = formatAlertTime(job.notificationCreatedAt || job.createdAt || job.shownAt);

        return (
          <div
            key={index}
            style={{
              padding: "4px 0",
              borderBottom:
                index === activeNotificationJobs.length - 1
                  ? "none"
                  : "1px solid #e5e7eb",
            }}
          >
            {isUploadNotification ? (
              <span>
                <b>Implementation pictures uploaded</b> - {job.jobNoDisplay} | Time: <b>{alertTime}</b> | Customer: <b>{job.customerName}</b> | Store: <b>{job.storeName}</b> | Files: <b>{job.implementationUploadFilesCount || "Yes"}</b> | CS: <b>{job.csName}</b>
              </span>
            ) : (
              <span>
                <b>{job.notificationPercent}% Deadline</b> ({job.notificationThreshold} {job.notificationType}) - {job.jobNoDisplay} | Time: <b>{alertTime}</b> | Customer: <b>{job.customerName}</b> | Store: <b>{job.storeName}</b> | Deadline: <b>{job.notificationDeadline}</b> | CS: <b>{job.csName}</b>
              </span>
            )}
          </div>
        );
      })}
      </div>
    </div>

 <div style={{ textAlign: "right", marginTop: 24 }}>
  <Button
    variant="secondary"
    onClick={() => setShowDeadlineDetails(true)}
    style={{ marginRight: 12 }}
  >
    View details
  </Button>

  <Button
    variant="success"
    onClick={() => setIsAlertAccepted(true)}
    style={{
      padding: "10px 34px",
      fontWeight: 700,
      fontSize: 16,
    }}
  >
    OK
  </Button>
</div>
  </Alert>
)}

<Modal
  isOpen={showDeadlineDetails}
  toggle={() => setShowDeadlineDetails(false)}
  centered
  size="xl"
>
  <ModalHeader toggle={() => setShowDeadlineDetails(false)}>
    ERP Notification Details
  </ModalHeader>

  <ModalBody style={{ padding: 20, maxHeight: "72vh", overflowY: "auto" }}>
    {activeNotificationJobs.length === 0 && (
      <div>No active notifications.</div>
    )}

    {activeNotificationJobs.map((job, index) => {
      const isUploadNotification = job.notificationSource === "Implementation Upload";
      const rule = getSlaAlertRuleByType(job.notificationType);
      const detailColor = isUploadNotification ? "#16a34a" : rule?.color || "#0d6efd";
      const detailBg = isUploadNotification ? "#f0fdf4" : rule?.detailBg || "#f3f8ff";

      return (
        <div
          key={index}
          style={{
            marginBottom: 16,
            padding: 18,
            borderRadius: 8,
            borderLeft: `7px solid ${detailColor}`,
            background: detailBg,
            fontSize: 15,
            lineHeight: 1.65,
          }}
        >
          <div><b>Type:</b> {isUploadNotification ? "Implementation pictures uploaded" : `${job.notificationThreshold} (${job.notificationType})`}</div>
          <div><b>Meaning:</b> {isUploadNotification ? "Uploaded pictures are available for this job/store" : rule?.meaning || "Deadline alert"}</div>
          <div><b>Time:</b> {formatAlertTime(job.notificationCreatedAt || job.createdAt || job.shownAt)}</div>
          <div><b>Job No:</b> {job.jobNoDisplay}</div>
          <div><b>Store:</b> {job.storeName}</div>
          {isUploadNotification ? (
            <div><b>Uploaded Files:</b> {job.implementationUploadFilesCount || "Yes"}</div>
          ) : (
            <div><b>Deadline Progress:</b> {job.notificationPercent}%</div>
          )}
          <div><b>Source:</b> {job.notificationSource}</div>
          <div><b>Recipients:</b> {job.notificationRecipients}</div>
          <div><b>CS:</b> {job.csName}</div>
          <div><b>BM:</b> {job.bmName}</div>
          <div><b>Start:</b> {job.notificationStart}</div>
          <div><b>Deadline:</b> {job.notificationDeadline}</div>
        </div>
      );
    })}
  </ModalBody>
</Modal>

          <Modal isOpen={showValidationModal} toggle={() => setShowValidationModal(false)} centered>
  <ModalHeader toggle={() => setShowValidationModal(false)}>
    Excel Errors (Fix & Re-upload)
  </ModalHeader>

  <ModalBody>
    <div style={{ marginBottom: 10 }}>
      <b>Required format:</b>
      <div style={{ fontFamily: "monospace" }}>{EXPECTED_FORMAT}</div>
      <div style={{ color: "#666", marginTop: 6 }}>
        Also: Deadline must not be past date/time.
      </div>
    </div>

    <div style={{ maxHeight: 350, overflowY: "auto" }}>
      <table className="table table-bordered table-sm">
        <thead className="table-light" style={{ position: "sticky", top: 0 }}>
          <tr>
            <th style={{ width: 70 }}>Row</th>
            <th style={{ width: 170 }}>Column</th>
            <th>Your Value</th>
            <th>Fix</th>
          </tr>
        </thead>
        <tbody>
          {validationErrors.map((e, i) => (
            <tr key={i}>
              <td>{(e.rowIndex ?? 0) + 2}</td>
              <td><b>{e.field}</b></td>
              <td style={{ fontFamily: "monospace" }}>{String(e.value ?? "")}</td>
              <td>{e.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="d-flex justify-content-end mt-2">
    <Button
  variant="success"
  onClick={exportValidationErrorsToExcel}
  style={{ marginRight: "10px" }}
>
  Export Errors (Excel)
</Button>

<Button variant="secondary" onClick={() => setShowValidationModal(false)}>
  Close
</Button>
    </div>
  </ModalBody>
</Modal>
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
          <div className="row">
            <div className="col-sm-12">
              <div className="card">
                <div className="card-body">
                  <div className="mb-3 d-flex justify-content-between align-items-center">
                    <div style={{ flexGrow: 1 }}></div> {/* This takes up space to push buttons to the right */}
                    {/* <div className="search-container" style={{ display: 'flex', justifyContent: 'center', flexGrow: 1 }}>
                        <Form.Control
                          type="search"
                          className="form-control form-control-sm"
                          placeholder="Search"
                          aria-controls="DataTables_Table_0"
                          value={searchText}
                          onChange={handleSearch}
                          style={{ width: '400px' }} // Adjust width as necessary
                        />
                      </div> */}
                  <div
  className="button-group"
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',              // Adds space between input and button
    marginBottom: '1em',
    

    width: 'fit-content'
  }}
>
  {rolename === "Admindelete" && (
    <>
       <input
        type="text"
        placeholder="Enter deletion comment"
        value={deleteComment}
        onChange={(e) => setDeleteComment(e.target.value)}
        style={{
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          minWidth: '220px'
        }}
      /> 
      <Button
        variant="danger"
        onClick={() => handleDeleteSelectedJobs(deleteComment)}
        style={{
          padding: '8px 16px'
        }}
      >
        Delete Selected Jobs
      </Button>
    </>
  )}

                    <Button
                variant="success"
                onClick={() => handleFilteredExportExcel()}
                style={{ marginBottom: "1em" }}
              >
                Download Excel
              </Button>

                    <Button
                      variant="warning"
                      onClick={handleJobOnHold}
                      style={{ marginBottom: "1em", marginLeft: '10px' }}
                     
                    >
                      Job On Hold
                    </Button>
                    <Button
  variant="success"
  onClick={handleResumeSelectedJobs}
  style={{ marginBottom: "1em", marginLeft: "10px" }}
>
  Resume Hold
</Button>
  

{/*                     
                    <Button
                      variant="warning"
                      onClick={handleJobOnHold}
                      style={{ marginBottom: "1em", marginLeft: '10px' }}
                     
                    >
                      Edit Job
                    </Button> */}

                    
                      <FilterSidebar
                        show={showFilterSidebar}
                        handleClose={() => setShowFilterSidebar(false)}
                        filters={filters}
                        setFilters={setFilters}
                        filterConfig={filterConfig}
                      />
                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: 'column', marginRight: '48px' }}>
                        {latestJobNo && (
                          <div style={{ fontWeight: 600, fontSize: '14px', color: '#2c3e50' }}>
                            Latest Job No: <span style={{ color: '#007bff' }}>{latestJobNo}</span>
                            
                          </div>
                        )}


                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FaSyncAlt size={20} style={{ cursor: 'pointer', marginRight: '48px' }} onClick={() => window.location.reload()} />

                        <Button
                          type="default"
                          style={{ backgroundColor: 'orange', borderColor: 'orange' }}
                          onClick={toggleBulkAdd}
                        >
                          Upload
                        </Button>
                      </div>
                      </div>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <Modal
                      isOpen={BulkAdd}
                      toggle={toggleBulkAdd}
                      centered
                      className="border-0"
                      modalClassName='modal fade zoomIn'
                      backdrop={false}
                    >
                      <ModalHeader className="p-3 bg-info-subtle" toggle={toggleBulkAdd}>
                        Upload Bulk
                      </ModalHeader>
                      <ModalBody className="modal-body">
                        <Row className="gap-3">
                          <Col>
                            <div className="external-nav">
                              <Tab.Container id="form-tabs" className={'tab-container'} activeKey={activeTab} onSelect={(key) => setActiveTab(key)} >
                                <Nav variant="tabs" className="nav-tabs">
                                  <NavItem>
                                    <NavLink eventKey="newJob">New Job</NavLink>
                                  </NavItem>
                                  <NavItem>
                                    <NavLink eventKey="existingJob">Existing Job</NavLink>
                                  </NavItem>
                                </Nav>
                                <Card>
                                  <CardBody>
                                    <Tab.Content>
                                      {/* New Job Tab */}
                                      <Tab.Pane eventKey="newJob">
                                        <Row className="mb-3">
                                          <Col sm={6}>
                                            <Form.Group controlId="customerName">
                                              <Form.Label>Customer Name</Form.Label>
                                              <Select
                                                options={customerOptions}
                                                value={customerOptions.find(option => option.value === selectedCustomerId)} // Bind the selected value
                                                onChange={handleSelectChange} // Call the updated function
                                                placeholder="Select Customer"
                                              />
                                            </Form.Group>
                                          </Col>
                                          <Col sm={6}>
                                            <Form.Group controlId="businessType">
                                              <Form.Label>Business Type</Form.Label>
                                              <Form.Select value={businessType} onChange={handleBusinessType}>
                                                <option value="">Select Business Type</option>
                                                <option value="Print">Print</option>
                                                <option value="Retail">Retail</option>
                                                <option value="Onsite">Onsite</option>
                                                <option value="Print + Retail">Print + Retail</option>
                                              </Form.Select>
                                            </Form.Group>
                                          </Col>
                                        </Row>

                                        <Row className="mb-3">
                                          <Col sm={6}>
                                            <Form.Group controlId="contactPerson">
                                              <Form.Label>Contact Person</Form.Label>
                                              <Form.Control type="text" placeholder="Enter Contact Person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
                                            </Form.Group>
                                          </Col>
                                          <Col sm={6}>
                                            <Form.Group controlId="poNo">
                                              <Form.Label>PO No</Form.Label>
                                              <Form.Control type="text" placeholder="Enter PO No" value={lpono} onChange={(e) => setlpono(e.target.value)} />
                                            </Form.Group>
                                          </Col>
                                        </Row>

                                        <Row className="mb-3">
                                          <Col sm={6}>
                                            <Form.Group controlId="poDate">
                                              <Form.Label>PO Date</Form.Label>
                                              <Form.Control type="date" value={lpoDate} onChange={(e) => setlpoDate(e.target.value)} />
                                            </Form.Group>
                                          </Col>
                                          <Col sm={6}>
                                              <Form.Group controlId="hsnCode">
                                                <Form.Label>HSN code</Form.Label>
                                                <Form.Control type="text" placeholder="Enter HSN code" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} />
                                              </Form.Group>
                                            </Col>
                                          <Col sm={6}>
                                            <Form.Group controlId="PoType">
                                              <Form.Label>PO Type</Form.Label>
                                              <Form.Select value={poType} onChange={handlePoType}>
                                                <option value="">Select PO Type</option>
                                                <option value="PO Received">PO Received</option>
                                                <option value="PO not Received">PO not Received</option>
                                                <option value="Direct Billing">Direct Billing</option>
                                                <option value="Open PO">Open PO</option>
                                                <option value="Estimate Approval Pending">Estimate Approval Pending</option>
                                              </Form.Select>
                                            </Form.Group>
                                          </Col>
                                        </Row>
                                        <Row className="mb-3">
                                          <Col sm={6}>
                                            <Form.Group controlId="customerEmail">
                                              <Form.Label>Customer Email</Form.Label>
                                              <Form.Control type="email" placeholder="Enter Customer Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                                            </Form.Group>
                                          </Col>
                                          <Col sm={6}>
                                            <Form.Group>
                                              <Form.Label>Project Name</Form.Label>
                                              <Form.Control type="text" placeholder="Enter Project Name" value={projectname} onChange={(e) => setProjectname(e.target.value)} />
                                            </Form.Group>
                                          </Col>
                                        </Row>
                                      </Tab.Pane>

                                      {/* Existing Job Tab */}
                                      <Tab.Pane eventKey="existingJob">
                                        {/* Job Number Dropdown */}
                                        {/* <Form.Group controlId="customerName">
                                            <Form.Label>Job Number</Form.Label>
                                            <Select
                                              options={jobNoOptions}
                                              value={jobNoOptions.find(option => option.value === selectedExJobNumber) || null} // Bind the selected value
                                              onChange={handleExJobNoSelectChange} // Call the updated function
                                              placeholder="Select Job No"
                                            />
                                          </Form.Group> */}
                                        <Form.Group controlId="customerName" style={{ position: 'relative', zIndex: 999 }}>
                                          <Form.Label>Job Number</Form.Label>
                                          <Select
                                            options={uniqueJobNoOptions}
                                            value={uniqueJobNoOptions.find(option => option.value === selectedExJobNumber) || null} // Bind the selected value
                                            onChange={handleExJobNoSelectChange} // Call the updated function
                                            placeholder="Select Job No"
                                          />
                                        </Form.Group>
                                        <Row className="mb-3 mt-5">
                                          <Col>
                                            <Form.Control className="form-control file-choose" type="file" onChange={handleFileChange} />
                                            <br />
                                            <h4>Excel Data:</h4>
                                            {Array.isArray(headers) && Array.isArray(data) && headers.length > 0 && data.length > 0 ? (
                                              <div className="table-responsive responsivetable">
                                                <ExcelTable className="table-bordered align-middle table-nowrap mb-0">
                                                  <thead className="sticky-header table-light">
                                                    <tr>
                                                      {headers.map((header, index) => (
                                                        <th key={index} scope="col">{header}</th>
                                                      ))}
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {data.map((row, rowIndex) => (
                                                      <tr key={rowIndex}>
                                                        {headers.map((header, colIndex) => (
                                                          <td key={colIndex}>
                                                            <span className="text-ellipsis" title={row[header]}>
                                                              {row[header]}
                                                            </span>
                                                          </td>
                                                        ))}
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </ExcelTable>
                                              </div>
                                            ) : (
                                              <div className="text-center">No Data Available</div>
                                            )}

                                          </Col>
                                        </Row>
                                      </Tab.Pane>
                                    </Tab.Content>
                                  </CardBody>
                                </Card>
                              </Tab.Container>
                            </div>
                          </Col>
                        </Row>

                        {/* Excel Upload Control - Moved Outside the Tab */}
                        {/* <Row className="mb-3">
                            <Col>
                              <Form.Control className="form-control file-choose" type="file" onChange={handleFileChange} />
                              <br />
                              <h4>Excel Data:</h4>
                              {Array.isArray(headers) && Array.isArray(data) && headers.length > 0 && data.length > 0 ? (
                                <div className="table-responsive responsivetable">
                                  <ExcelTable className="table-bordered align-middle table-nowrap mb-0">
                                    <thead className="sticky-header table-light">
                                      <tr>
                                        {headers.map((header, index) => (
                                          <th key={index} scope="col">{header}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {data.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                          {headers.map((header, colIndex) => (
                                            <td key={colIndex}>
                                              <span className="text-ellipsis" title={row[header]}>
                                                {row[header]}
                                              </span>
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </ExcelTable>
                                </div>
                              ) : (
                                <div className="text-center">No Data Available</div>
                              )}
                            </Col>
                          </Row> */}
                      </ModalBody>

                      <div className="modal-footer">
                        <div className="hstack gap-2 justify-content-end">
                          <Button
                            type="button"
                            onClick={toggleBulkAdd}
                            className="btn-light"
                          >Close</Button>
                          <Button
                            type="submit"
                            onClick={(e) => submitDataToAPI(e)}
                            id="add-btn"
                            className="btn btn-success"
                          >Add </Button>
                        </div>
                      </div>
                    </Modal>
                    {/* {isMobile ? (
                        filteredData.map((item, index) => (
                          <div key={item.key} className="data-card">
                            {columns.map((col) => (
                              <div key={col.key} className="data-card-row">
                                <strong>{col.title}: </strong> {item[col.dataIndex]}
                              </div>
                            ))}
                            <div className="data-card-row">
                              <Button type="primary" onClick={() => handleStart(item.key, index)}>Start</Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <Table
                          components={{
                            body: {
                              row: EditableRow,
                              cell: EditableCell,
                            },
                          }}
                          columns={[...columns]}
                          dataSource={filteredData}
                          rowKey="key"
                          className="table"
                        />
                      )} */}
                  </div>

                  {error && <Alert variant="danger">{error}</Alert>}
                  {loading && <Spinner animation="border" className="d-block mx-auto" />}
                  {/* <Row className="mb-3 align-items-center">
                      <Col>
                        <Button variant="primary" onClick={handleStartJob} disabled={!Object.values(selectedRows).some(v => v)}>Start Job</Button>
                        <Button variant="danger" onClick={handleStopJob} className="ml-3" disabled={!isJobRunning || !Object.values(selectedRows).some(v => v)}>Stop Job</Button>
                      </Col>
                    </Row> */}
                  {/* <Form.Group className="mb-3">
                    <Form.Label>Search by Job No</Form.Label>
                    <InputGroup>
                      <InputGroup.Text style={{ cursor: 'pointer', color: 'grey', backgroundColor: 'white', borderRight: 'none' }}>
                        <FaSearch />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Enter job number"
                        value={searchTerm}
                        style={{ borderLeft: 'none' }}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </InputGroup>
                  </Form.Group> */}

                  <div style={{ overflowX: 'auto' }} className="table-container">
                  <div className="ag-theme-alpine custom-ag-grid" style={{ height: '600px', width: '100%' }}>
                    <div className="ag-theme-alpine custom-ag-grid" style={{ height: '600px', width: '100%' }}>
                      <AgGridReact
                        ref={gridRef}
                        singleClickEdit={true}
                        suppressClickEdit={false}
                        rowData={sortedData}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        pagination={true}
                        paginationPageSize={50}
                        // onSelectionChanged={onSelectionChanged}
                        //  getRowNodeId={row => row.id}
                        domLayout="normal"
                        rowSelection="multiple"
                        getRowHeight={() => 60}
                        headerHeight={50}
                        suppressRowClickSelection={true}
                       rowClassRules={{

  // ✅ HIGHEST PRIORITY
  "row-delivery": params =>
    params.data?.isDeliveryDone === "1",

  "row-implupload": params =>
    params.data?.isImplementationUploadDone === "1" &&
    params.data?.isDeliveryDone !== "1",

  "row-implementation": params =>
    params.data?.isImplementationDone === "1" &&
    params.data?.isImplementationUploadDone !== "1" &&
    params.data?.isDeliveryDone !== "1",

  "row-packing": params =>
    params.data?.isPackingDone === "1" &&
    params.data?.isImplementationDone !== "1" &&
    params.data?.isImplementationUploadDone !== "1" &&
    params.data?.isDeliveryDone !== "1",

  "row-printing": params =>
    params.data?.isPrinitngdone === "1" &&
    params.data?.isPackingDone !== "1" &&
    params.data?.isImplementationDone !== "1" &&
    params.data?.isImplementationUploadDone !== "1" &&
    params.data?.isDeliveryDone !== "1",

  // ✅ LOWEST PRIORITY
  "row-design": params =>
    params.data?.isDesignDone === "1" &&
    params.data?.isPrinitngdone !== "1" &&
    params.data?.isPackingDone !== "1" &&
    params.data?.isImplementationDone !== "1" &&
    params.data?.isImplementationUploadDone !== "1" &&
    params.data?.isDeliveryDone !== "1"
}}

            onCellValueChanged={(params) => {
              if (params.colDef.field === 'productionLocation') {
                const id = params.data.id;
                const newLocation = params.newValue;

                axios.post(`${config.JobSummary.URL.UpdateProductionLocation}`, {
                  id: id,
                  productionLocation: newLocation,
                  employeename: userName,
                  rolename: rolename
                }).then(() => {
                  toast.success("Production Location updated");
                }).catch((error) => {
                  toast.error("Failed to update Production Location");
                  console.error("API error:", error);
                });
              }
            }}

/>
                  



                </div>
                {/* <OrderPopup
                show={isPopupVisible}
                items={data.filter(d => d.approved === "Yes")}
                onClose={() => setIsPopupVisible(false)}
                jobOptions={uniqueJobNoOptions}
                onAcceptAllOrders={handleAcceptOrder}
              /> */}



                    {/* <div>
                        <DeadlineEmail
                          jobNumber="12345"
                          deadlineDate="01/01/2023"
                          items={[
                            { mediaName: "Product 1", quantity: 1, mediaWidth: 29.99, mediaHeight: 40 },
                            { mediaName: "Product 2", quantity: 2, mediaWidth: 19.99, mediaHeight: 40 }
                          ]}
                          // subtotal={69.97}
                          // shipping={5.00}
                          // total={74.97}
                          trackingLink="http://trackinglink.com"
                          supportEmail="support@example.com"
                          customerSupportNumber="(123) 456-7890"
                          companyName="Your Company Name"
                          companyWebsite="http://yourcompany.com"
                          companyContactInfo="(123) 456-7890"
                        />
                      </div> */}
                  </div>

                    <OrderPopup
                show={isPopupVisible}
                items={data.filter(d => d.approved === "Yes")}
                onClose={() => setIsPopupVisible(false)}
                jobOptions={uniqueJobNoOptions}
                onAcceptAllOrders={handleAcceptOrder} // ✅ here
              />
              </div>
                </div>
                        <div className="status-legend-bar">
  <span className="legend-box printing">✅ Printing Done</span>
  <span className="legend-box delivery">🚚 Delivery Done</span>
  <span className="legend-box implementation">🛠️ Implementation Done</span>
  <span className="legend-box packing">📦 Packing Done</span>


</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTables;
