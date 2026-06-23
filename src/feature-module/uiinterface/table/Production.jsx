import React, { Suspense, lazy, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from "react-router-dom";
import { Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { Modal, ModalBody, ModalHeader, ModalFooter, Table as ExcelTable } from 'reactstrap';
import config from '../../../config';
import 'bootstrap/dist/css/bootstrap.min.css';
import { all_routes } from "../../../Router/all_routes";
import './Production.css';
import { FaSyncAlt } from 'react-icons/fa';
import Notification from '../../Notification/Notification';
import Notification2 from '../../Notification/Notification2';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const CompletedPrinting = lazy(() => import('./CompletedPrinting'));

const formatDateTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatJobDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).replace(/ /g, '/');
};

const Production = () => {
  const [BulkAdd, setBulkAdd] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [selectedTotals, setSelectedTotals] = useState({ qty: 0, width: 0, length: 0, totalSqFt: 0 });
  const [data, setData] = useState([]);

  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [locationId, setLocationId] = useState(null);

  const [showLength, setShowLength] = useState(false);

  const [selectedRows, setSelectedRows] = useState({});
  const selectedRowsArr = Object.keys(selectedRows);
  const [isJobRunning, setIsJobRunning] = useState(true);

  const [selectedPrinter, setSelectedPrinter] = useState([]);
  const [mediaWidth, setMediaWidth] = useState('');
  const gridRef = useRef(null);

  const [printingData, setPrintingData] = useState([]);
  const [mediaLength, setMediaLength] = useState('');
  const [mediaSqFt, setMediaSqFt] = useState(0);

  const [actualSqFt, setActualSqFt] = useState(0);

  const [wastePercentage, setWastePercentage] = useState([]);
  const [wasteageDataFetched, setWasteageDataFetched] = useState(false);

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState([]); // is array

  const [showDeadlineWarning, setShowDeadlineWarning] = useState(false);
  const [deadlineWarningMessages, setDeadlineWarningMessages] = useState([]);
  const [showDeadlineMissed, setShowDeadlineMissed] = useState(false);
  const [deadlineMissedMessages, setDeadlineMissedMessages] = useState([]);

  // ✅ Keep this as an array because Notification does message.map(...)
  const [showWastePopup, setShowWastePopup] = useState(false);
  const [wastePopupMessage, setWastePopupMessage] = useState([]); // <-- array

  const [user, setUser] = useState('');

  useEffect(() => {
    const users = localStorage.getItem('users');
    if (users) {
      const usersObject = JSON.parse(users);
      const username = usersObject.message && usersObject.message.username;
      setUser(username);
    }
  }, []);

  // helpers
  const toNum = (v) => {
    if (v == null) return 0;
    const n = Number.parseFloat(String(v).replace(/[^0-9.\-eE]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const formatNumber = (value, digits = 2) => {
    const n = toNum(value);
    return Number.isFinite(n) ? n.toFixed(digits) : '0.00';
  };
  const getRowValue = (row, keys) => {
    if (!row) return undefined;
    const matchedKey = keys.find(key => row[key] != null && String(row[key]).trim() !== '');
    return matchedKey ? row[matchedKey] : undefined;
  };
  const calcMediaSqFt = (w, l) => {
    const W = toNum(w), L = toNum(l);
    return (W > 0 && L > 0) ? (W * L) / 144 : 0;
  };
  const getPrintLength = (row) => {
    const height = getRowValue(row, ['height', 'Height', 'HEIGHT']);
    return height != null && String(height).trim() !== ''
      ? height
      : getRowValue(row, ['length', 'Length', 'LENGTH']);
  };
  const calcActualSqFt = (row) => {
    const width = toNum(getRowValue(row, ['width', 'Width', 'WIDTH']));
    const length = toNum(getPrintLength(row));
    const qty = toNum(getRowValue(row, ['qty', 'Qty', 'QTY']));

    if (width > 0 && length > 0 && qty > 0) {
      return (width * length * qty) / 144;
    }

    return toNum(getRowValue(row, ['totalSqFt', 'TotalSqFt', 'Total SQ.Ft.', 'Total Sq.ft', 'Total Sq.f']));
  };

  // compute wastage / show red popup when invalid
  useEffect(() => {
    const selectedIds = Object.keys(selectedRows).filter(id => selectedRows[id]);
    const totalSelected = selectedIds.length;

    const mSqft = calcMediaSqFt(mediaWidth, mediaLength);
    setMediaSqFt(mSqft > 0 ? mSqft.toFixed(2) : 0);

    const aSqft = toNum(actualSqFt);

    if (mSqft > 0 && aSqft > 0 && totalSelected > 0) {
      if (mSqft <= aSqft) {
        setWasteageDataFetched(false);
        setWastePercentage('');
        setWastePopupMessage([
          'Wastage % Formula: Ensure correct wastage formula, media Sqft must be greater than actual Sqft (they cannot be equal or less).'
        ]);
        setShowWastePopup(true);
      } else {
        const pct = ((mSqft - aSqft) / mSqft) * 100;
        setWastePercentage(pct.toFixed(4));
        setWasteageDataFetched(true);
        setShowWastePopup(false);
        setWastePopupMessage([]);
      }
    } else {
      setWasteageDataFetched(false);
      setWastePercentage('');
      setShowWastePopup(false);
      setWastePopupMessage([]);
    }
  }, [mediaWidth, mediaLength, actualSqFt, selectedRows]);

  useEffect(() => {
    const users = localStorage.getItem('users');
    const userObj = JSON.parse(users || '{}');
    const userLocationId = userObj?.message?.location_id;
    const userName = userObj?.message?.username;

    setLocationId(userLocationId || 1);
    if (userName) setUsername(userName);
  }, []);

  const exportToExcel = async () => {
    if (!gridRef.current) return;
    const XLSX = await import('xlsx');
    const visibleRows = [];
    gridRef.current.api.forEachNodeAfterFilterAndSort(node => {
      visibleRows.push({
        ...node.data,
        totalSqFt: formatNumber(calcActualSqFt(node.data)),
      });
    });
    if (visibleRows.length === 0) {
      alert("No data to export.");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(visibleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Printing Jobs");
    const max_widths = visibleRows.reduce((acc, row) => {
      Object.keys(row).forEach((key, index) => {
        const len = row[key]?.toString().length || 10;
        if (!acc[index] || len > acc[index].wch) acc[index] = { wch: len + 2 };
      });
      return acc;
    }, []);
    worksheet["!cols"] = max_widths;
    XLSX.writeFile(workbook, "FilteredPrintingJobs.xlsx");
  };

  const exportToPDF = async () => {
    const [{ default: jsPDF }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A1' });
    doc.setFontSize(12);
    doc.text("Printing Jobs", 40, 30);

    const columns = columnDefs
      .filter(col => col.field && col.headerName)
      .map(col => ({ header: col.headerName, dataKey: col.field }));

    const rows = filteredData1.map(row => {
      const formattedRow = {};
      columns.forEach(col => {
        let value = row[col.dataKey];
        if (typeof value === 'string') value = value.replace(/\s+/g, ' ').trim();
        formattedRow[col.dataKey] = value ?? '';
      });
      return formattedRow;
    });

    doc.autoTable({
      columns,
      body: rows,
      startY: 50,
      styles: { fontSize: 7, overflow: 'linebreak', cellWidth: 'wrap' },
      headStyles: { fillColor: [153, 0, 0], textColor: 255, halign: 'center' },
      columnStyles: { remarks: { cellWidth: 280 }, nameSubCode: { cellWidth: 200 }, visualCode: { cellWidth: 180 }, salonAddress: { cellWidth: 200 } },
      margin: { top: 50, left: 40, right: 40, bottom: 30 },
      theme: 'grid',
      didDrawPage: function (data) {
        doc.setFontSize(10);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });

    doc.save("PrintingJobs_full.pdf");
  };



  // --- popup positions ---
const wastePopupTopStyle = {
  position: 'fixed',
  top: '90px',         // adjust if it clashes with your header
  right: '24px',
  maxWidth: '420px',
  zIndex: 2147483647,  // stay above AG Grid & modals
};

const wastePopupBottomStyle = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  maxWidth: '420px',
  zIndex: 2147483647,
};


  const fetchPrinting = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const payload = { location_id: locationId };
      const response = await axios.post(config.Printing.URL.Getallprinting, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      setData(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching job data:", error.response ? error.response.data : error.message);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => { fetchPrinting(); }, [fetchPrinting]);

  const filteredData1 = data;

  const resetForm = () => {
    setSelectedPrinter('');
  };

  const toggleBulkAdd = useCallback(() => {
    if (BulkAdd) {
      setBulkAdd(false);
      setHeaders([]);
    } else {
      setBulkAdd(true);
    }
  }, [BulkAdd]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const XLSX = await import('xlsx');
      const resp = e.target.result;
      const workbook = XLSX.read(resp, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

      if (!jsonData.length) return;
      const headers = jsonData[0];
      const dataRows = jsonData.slice(1);
      const data = dataRows.map((row, rIdx) => {
        const obj = {};
        headers.forEach((header, i) => {
          let cellValue = row[i];
          const cell = worksheet[XLSX.utils.encode_cell({ r: rIdx + 1, c: i })];
          if (cell && cell.t === 'n' && cell.z) {
            const date = XLSX.SSF.parse_date_code(cell.v);
            if (date) cellValue = new Date(Date.UTC(date.y, date.m - 1, date.d)).toISOString().split('T')[0];
          }
          obj[header] = cellValue;
        });
        return obj;
      }).filter(row => Object.values(row).some(value => value !== '' && value !== null && value !== undefined));

      setHeaders(headers);
      // setData(data);
    };
    reader.readAsBinaryString(file);
  };

  const submitDataToAPI = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post(config.Printing.URL.AddPrinting, data, { timeout: 60000 });
      setHeaders([]);
      setBulkAdd(false);
      fetchPrinting();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios error: ", error.message);
        if (error.code === 'ECONNABORTED') console.error("Request timed out");
      } else {
        console.error("Unexpected error: ", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartJob = async (e) => {
    e.preventDefault();
    if (!mediaWidth || !mediaLength || !selectedPrinter || selectedRowsArr.length === 0) {
      setError("Please fill in all required fields and select at least one job.");
      return;
    }
    const mSqft = calcMediaSqFt(mediaWidth, mediaLength);
    const aSqft = toNum(actualSqFt);
    if (mSqft > 0 && aSqft > 0 && mSqft <= aSqft) {
      setWastePopupMessage([
        'Wastage % Formula: Ensure correct wastage formula, media Sqft must be greater than actual Sqft (they cannot be equal or less).'
      ]);
      setShowWastePopup(true);
      return;
    }

    const selectedJobs = filteredData1
      .filter(row => selectedRows[row.id])
      .map(row => {
        const rowActualSqFt = calcActualSqFt(row).toFixed(2);

        return {
          id: row.id,
          jobNo: row.jobNo,
          client: row.client,
          subClient: row.subClient,
          date: row.date,
          userName: username,
          region: row.region,
          visualCode: row.visualCode,
          nameSubCode: row.nameSubCode,
          city: row.city,
          qty: row.qty,
          media: row.media,
          mediaWidth: mediaWidth,
          mediaLength: mediaLength,
          printerName: selectedPrinter,
          installation: row.installation,
          deadline: row.deadline,
          lamination: row.lamination,
          mounting: row.mounting,
          implementation: row.implementation,
          salonAddress: row.salonAddress,
          dispatchAddress: row.dispatchAddress,
          remarks: row.remarks,
          actualCompleteTime: row.actCompleteTime,
          onTimeDelayed: row.onTimeDelayed,
          enteredBy: row.enteredby,
          enteredDate: row.enteredDate,
          lastUpdatedBy: user,
          width: row.width,
          length: getPrintLength(row),
          actualSqFt: rowActualSqFt,
          totalSqFt: rowActualSqFt,
          startdate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          ActualSqFt: actualSqFt,
          MediaWidth: mediaWidth,
          MediaLength: mediaLength,
          PrinterName: selectedPrinter,
          entereddt: row.entereddt
        };
      });

    setLoading(true);
    setIsJobRunning(false);
    try {
      const response = await axios.post(config.Printing.URL.AddPrintingStart, selectedJobs);
      const wastePer = response.data.result;

      const wasteagePer = wastePer.map(item => item.wasteagePer);
      if (wasteagePer.length > 0) setWastePercentage(wasteagePer[0]);

      if (response.status === 200) {
        setData(selectedJobs);
        setWasteageDataFetched(true);
        setShowLength(true);
        setSelectedRows(prev => {
          const map = { ...prev };
          selectedJobs.forEach(job => { map[job.id] = true; });
          return map;
        });
        resetForm();
      } else {
        setError("Unexpected response from the server.");
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const isStartJobDisabled = !mediaWidth || !mediaLength || !selectedPrinter || selectedRowsArr.length === 0;

  const handleStopJob = async (e) => {
    e.preventDefault();
    const selectedJobIds = Object.keys(selectedRows);
    const stopData = filteredData1
      .filter(row => selectedRows[row.id])
      .map(row => ({
        id: row.id,
        productionid: row.productionid,
        name: row.name,
        enddate: new Date().toISOString(),
        lastUpdatedBy: user,
        lastUpdated: new Date().toISOString(),
        entereddt: row.entereddt
      }));

    setLoading(true);
    setIsJobRunning(true);

    try {
      const response = await axios.post(config.Printing.URL.AddPrintingStop, stopData);
      if (response.status === 200) {
        await fetchPrinting();
        const newSelection = {};
        selectedJobIds.forEach(id => {
          newSelection[id] = true;
          const node = gridRef.current?.api?.getRowNode(id);
          if (node) node.setSelected(true);
        });
        setSelectedRows(newSelection);
        setWasteageDataFetched(false);
        setShowLength(false);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {}, [loading, isJobRunning]);

  const handleError = (error) => {
    if (axios.isAxiosError(error)) {
      setError(error.response ? error.response.data : "An unexpected error occurred");
    } else {
      setError("An unexpected error occurred");
    }
  };

  const handlePrinterChange = (e) => setSelectedPrinter(e.target.value);

  const filteredPrinterNames = useMemo(
    () => data.map(d => d.printerName).filter(arr => Array.isArray(arr) && arr.length > 0),
    [data]
  );

  useEffect(() => {
    if (!data.length) return undefined;

    const checkDeadlines = () => {
      const now = new Date();
      const printerMessages = [];
      const warningMessages = [];
      const missedMessages = [];

      data.forEach(job => {
        const printingDeadline = new Date(job.printerDeadline);
        if (!job.isCompleted && !Number.isNaN(printingDeadline.getTime()) && now > printingDeadline) {
          const deadlineDuration = now - printingDeadline;
          const totalHours = Math.floor(deadlineDuration / (1000 * 60 * 60));
          const days = Math.floor(totalHours / 24);
          const hours = totalHours % 24;
          printerMessages.push(`Job No: ${job.jobNo}, Job Date: ${job.date}, Client name: ${job.client}, Printer Name: ${job.printerPrintingName} has missed its deadline! Time passed: ${days}d ${hours}h`);
        }

        if (!job.deadline) return;
        const jobDeadline = new Date(job.deadline);
        if (Number.isNaN(jobDeadline.getTime())) return;

        const diffMs = jobDeadline - now;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (!job.isCompleted && diffMs > 0 && diffMs <= 6 * 60 * 60 * 1000) {
          warningMessages.push(
            `Job No: ${job.jobNo} is due in ${diffHours}h ${diffMinutes}m (Deadline: ${formatDateTime(jobDeadline)})`
          );
        }

        if (!job.isCompleted && diffMs <= 0) {
          const passedHours = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
          const passedMinutes = Math.abs(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
          missedMessages.push(
            `Job No: ${job.jobNo} missed the deadline by ${passedHours}h ${passedMinutes}m (Deadline: ${formatDateTime(jobDeadline)})`
          );
        }
      });

      setNotificationMessage(printerMessages);
      setShowNotification(printerMessages.length > 0);
      setDeadlineWarningMessages(warningMessages);
      setShowDeadlineWarning(warningMessages.length > 0);
      setDeadlineMissedMessages(missedMessages);
      setShowDeadlineMissed(missedMessages.length > 0);
    };

    const timeout = setTimeout(checkDeadlines, 1500);
    const interval = setInterval(checkDeadlines, 300000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [data]);

  const columnDefs = useMemo(() => [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionCurrentPageOnly: true,
      headerCheckboxSelectionFilteredOnly: true,
      width: 50,
      filter: false
    },
    {
      headerName: 'Job Date',
      minWidth: 130,
     valueGetter: params => {
  const { date, entereddt, lstupdatedt } = params.data;
  const finalDate = date || entereddt || lstupdatedt;
  return formatJobDate(finalDate);
}
    },
    { headerName: 'Job ID', field: 'jobNo', minWidth: 140 },
    { headerName: 'Printer Name', field: 'printerPrintingName', minWidth: 180 },
    {
      headerName: 'Qty',
      field: 'qty',
      valueGetter: params => getRowValue(params.data, ['qty', 'Qty', 'QTY']),
      minWidth: 110
    },
    {
      headerName: 'Print W.',
      field: 'width',
      valueGetter: params => getRowValue(params.data, ['width', 'Width', 'WIDTH']),
      valueFormatter: params => formatNumber(params.value),
      minWidth: 130
    },
    {
      headerName: 'Print L.',
      field: showLength ? 'length' : 'height',
      valueGetter: params => {
        if (params.node?.rowPinned) {
          return params.data?.[showLength ? 'length' : 'height'];
        }
        return showLength
          ? getRowValue(params.data, ['length', 'Length', 'LENGTH']) || getPrintLength(params.data)
          : getPrintLength(params.data);
      },
      valueFormatter: params => formatNumber(params.value),
      minWidth: 130
    },
    {
      headerName: 'Print SQ.Ft.',
      field: 'totalSqFt',
      valueGetter: params => params.node?.rowPinned ? params.data?.totalSqFt : calcActualSqFt(params.data),
      valueFormatter: params => formatNumber(params.value),
      minWidth: 140
    },
    { headerName: 'Media', field: 'media', minWidth: 180 },
    { headerName: 'Implementation', field: 'implementation', minWidth: 150 },
    { headerName: 'Job Deadline', field: 'deadline', minWidth: 170 },
    { headerName: 'Lamination Media Type', field: 'lamination', minWidth: 200 },
    { headerName: 'Mounting', field: 'mounting', minWidth: 140 },
    { headerName: 'Salon / Store Address', field: 'salonAddress', minWidth: 220 },
    { headerName: 'Job Start Date', field: 'startdate', minWidth: 170 },
    { headerName: 'Job End Date', field: 'enddate', minWidth: 170 },
    { headerName: 'Client', field: 'client', minWidth: 140 },
    { headerName: 'Sub Client', field: 'subClient', minWidth: 140 },
    { headerName: 'Account Manager', field: 'userName', minWidth: 160 },
    { headerName: 'Visual Code', field: 'visualCode', minWidth: 200 },
    { headerName: 'Product Details', field: 'nameSubCode', minWidth: 400 },
    { headerName: 'Printing Machine', field: 'printerPrintingName', minWidth: 180 },
    { headerName: 'Printer Deadline', field: 'printerDeadline', minWidth: 180 },
    { headerName: 'Remarks', field: 'remarks', minWidth: 1000 }
  ], [showLength]);

  const defaultColDef = useMemo(() => ({
    sortable: true, filter: true, resizable: true, wrapText: true,
  }), []);

  const getCurrentPageSelectedRows = () => {
    const api = gridRef.current?.api;
    if (!api) return [];

    const displayedCount = api.getDisplayedRowCount();
    const currentPage = api.paginationGetCurrentPage?.() || 0;
    const pageSize = api.paginationGetPageSize?.() || displayedCount;
    const startIndex = currentPage * pageSize;
    const endIndex = Math.min(startIndex + pageSize, displayedCount);
    const rows = [];

    for (let index = startIndex; index < endIndex; index += 1) {
      const node = api.getDisplayedRowAtIndex(index);
      if (node?.isSelected?.() && node.data) rows.push(node.data);
    }

    return rows;
  };

  const onSelectionChanged = () => {
    const selectedRowsData = getCurrentPageSelectedRows();

    let totalQty = 0, totalW = 0, totalL = 0, totalSqFt = 0;
    selectedRowsData.forEach(row => {
      const qty = toNum(getRowValue(row, ['qty', 'Qty', 'QTY']));
      const width = toNum(getRowValue(row, ['width', 'Width', 'WIDTH']));
      const length = toNum(getPrintLength(row));

      totalQty += qty;
      totalW += width * qty;
      totalL += length * qty;
      totalSqFt += calcActualSqFt(row);
    });

    setSelectedTotals({
      qty: totalQty,
      width: totalW.toFixed(2),
      length: totalL.toFixed(2),
      totalSqFt: totalSqFt.toFixed(2),
    });

    const selectedMap = {};
    selectedRowsData.forEach(row => {
      if (row.id) selectedMap[row.id] = true;
    });
    setSelectedRows(selectedMap);
    setActualSqFt(totalSqFt.toFixed(2));
  };

  const pinnedBottomRowData = useMemo(() => [{
    jobNo: 'Visible Selected Total',
    qty: selectedTotals.qty,
    width: selectedTotals.width,
    [showLength ? 'length' : 'height']: selectedTotals.length,
    totalSqFt: selectedTotals.totalSqFt
  }], [selectedTotals, showLength]);

  return (
    <div>
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

          <div className="row">
            <div className="col-sm-12">
              <div className="card">
                <div className="card-body">

                  <div className="mb-3 d-flex justify-content-between align-items-center">
                    <div style={{ flexGrow: 1 }} />
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
                            <div>
                              <Form.Control className="form-control" type="file" onChange={handleFileChange} />
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
                                      {printingData.map((row, rowIndex) => (
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
                            </div>
                          </Col>
                        </Row>
                      </ModalBody>

                      <div className="modal-footer">
                        <div className="hstack gap-2 justify-content-end">
                          <Button type="button" onClick={toggleBulkAdd} className="btn-light">Close</Button>
                          <Button type="submit" onClick={(e) => submitDataToAPI(e)} id="add-btn" className="btn btn-success">Add</Button>
                        </div>
                      </div>
                    </Modal>
                  </div>

                  {error && <Alert variant="danger">{error}</Alert>}
                  {loading && <Spinner animation="border" className="d-block mx-auto" />}

                  <div>
                    <Form className="mb-3">
                      <Row className="mb-3 align-items-center"><Col xs={2}></Col></Row>
                      <Row className="mb-3 align-items-center">
                        <Col xs={2}>
                          <Form.Group controlId="formPrinterName">
                            <Form.Label style={{ width: '300px' }}>Printer Name</Form.Label>
                            <Form.Select
                              id='printerName'
                              value={selectedPrinter}
                              onChange={handlePrinterChange}
                              style={{ width: '200px' }}
                              required
                            >
                              <option value="">Select Printer Name</option>
                              {
                                (Array.isArray(filteredPrinterNames) && filteredPrinterNames.length > 0)
                                  ? filteredPrinterNames.flat().map((printer, index) => (
                                      <option key={index} value={printer}>{printer}</option>
                                    ))
                                  : <option value="">Loading...</option>
                              }
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col xs={2}>
                          <Form.Group controlId="formMediaWidth">
                            <Form.Label style={{ width: '200px' }}>Media Width</Form.Label>
                            <Form.Control type="number" value={mediaWidth} onChange={(e) => setMediaWidth(e.target.value)} required />
                          </Form.Group>
                        </Col>
                        <Col xs={2}>
                          <Form.Group controlId="formMediaLength">
                            <Form.Label style={{ width: '200px' }}>Media Length</Form.Label>
                            <Form.Control type="number" value={mediaLength} onChange={(e) => setMediaLength(e.target.value)} required />
                          </Form.Group>
                        </Col>
                        <Col xs={2}>
                          <Form.Group controlId="formMediaSqFt">
                            <Form.Label style={{ width: '200px' }}>Media Sq.ft</Form.Label>
                            <Form.Control value={mediaSqFt} readOnly />
                          </Form.Group>
                        </Col>
                        <Col xs={2}>
                          <Form.Group controlId="formActualSqFt">
                            <Form.Label style={{ width: '200px' }}>Actual Sq.ft</Form.Label>
                            <Form.Control value={actualSqFt} readOnly />
                          </Form.Group>
                        </Col>
                        <Col />
                      </Row>

                      <Row className="mb-3 align-items-center">
                        {wasteageDataFetched &&
                          <Col xs={2}>
                            <Form.Group controlId="formWasteage">
                              <Form.Label style={{ width: '300px' }}>Wasteage%</Form.Label>
                              <Form.Control value={`${wastePercentage} %`} readOnly />
                            </Form.Group>
                          </Col>
                        }
                      </Row>
                    </Form>
                  </div>

                  <Row className="mt-3 mb-3 align-items-center">
                    <Col>
                      {isJobRunning ? (
                        <Button
                          variant="success"
                          onClick={handleStartJob}
                          disabled={!Object.values(selectedRows).some(v => v) || isStartJobDisabled}
                        >
                          Start Job
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          onClick={handleStopJob}
                          className="ml-3"
                          disabled={isJobRunning || !Object.values(selectedRows).some(v => v)}
                        >
                          Stop Job
                        </Button>
                      )}
                    </Col>
                    <Row className="mt-2 mb-3">
                      <Col>
                        <Button variant="outline-primary" onClick={exportToExcel} style={{ marginRight: '10px' }}>Export to Excel</Button>
                        <Button variant="outline-danger" onClick={exportToPDF}>Export to PDF</Button>
                      </Col>
                    </Row>
                    <Col className='ml-auto' style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <FaSyncAlt size={20} style={{ cursor: 'pointer', marginTop: '1em' }} onClick={() => window.location.reload()} />
                    </Col>
                  </Row>

                  <hr />

                  <div>
                   
                      <Form inline style={{ marginBottom: '2em' }} onSubmit={(e) => e.preventDefault()}>
                        <Button color="danger" onClick={toggle}>Reprint</Button>
                      </Form>
                  
                    <Modal isOpen={open} className="completed-printing-modal">
                      <ModalBody>
                        <Suspense fallback={<div className="p-3 text-center">Loading...</div>}>
                          <CompletedPrinting />
                        </Suspense>
                      </ModalBody>
                      <ModalFooter>
                        <Button color="primary" onClick={() => { toggle(); window.location.reload(); }}>Close</Button>
                      </ModalFooter>
                    </Modal>
                  </div>

                  <Row className="mb-3 align-items-center">
                    <Form.Group as={Row} className="mb-3">{/* (search inputs intentionally omitted) */}</Form.Group>
                  </Row>

                  <div className="ag-theme-alpine custom-ag-grid" style={{ height: '600px', width: '100%' }}>
                    <AgGridReact
                      ref={gridRef}
                      rowData={filteredData1}
                      columnDefs={columnDefs}
                      defaultColDef={defaultColDef}
                      getRowHeight={() => 40}
                      getRowNodeId={row => row.id}
                      suppressRowClickSelection={true}
                      rowSelection="multiple"
                      onSelectionChanged={onSelectionChanged}
                      onPaginationChanged={onSelectionChanged}
                      onFilterChanged={onSelectionChanged}
                      onSortChanged={onSelectionChanged}
                      pagination
                      paginationPageSize={50}
                      pinnedBottomRowData={pinnedBottomRowData}
                    />
                  </div>

                  {/* Deadline notifications (array messages) */}
                 {showDeadlineWarning && (
  <Notification2
    headline="Job Deadline Approaching"
    message={deadlineWarningMessages}
    onClose={() => setShowDeadlineWarning(false)}
    show={showDeadlineWarning}
    
    // Updated colors
    containerBg="rgba(255, 140, 0, 0.15)"   // light orange background
    bgColor="#ff8c00"                      // orange
    headerColor="#e65100"                  // dark orange
  />
)}

                  {showDeadlineMissed && (
                    <Notification
                      headline="Deadline Missed"
                      message={deadlineMissedMessages}
                      onClose={() => setShowDeadlineMissed(false)}
                      show={showDeadlineMissed}
                      containerBg="rgba(231, 116, 116, 0.445)"
                      bgColor="#c82333"
                      headerColor="#ff5b68"
                    />
                  )}

                  {showNotification && (
                    <Notification
                      headline="Deadline Alert!"
                      message={notificationMessage}
                      onClose={() => setShowNotification(false)}
                      show={showNotification}
                      containerBg="rgba(231, 116, 116, 0.445)"
                      bgColor="red"
                      headerColor="#ff5b68"
                    />
                  )}

                  {/* ✅ Red popup for invalid wastage rule (message is an ARRAY) */}
                 {showWastePopup && (
  <>
    {/* TOP-RIGHT popup */}
    <div style={wastePopupTopStyle}>
      <Notification
        headline="Wastage % Formula"
        message={wastePopupMessage}   // array, as we fixed earlier
        onClose={() => setShowWastePopup(false)}
        show={showWastePopup}
        containerBg="rgba(231, 116, 116, 0.445)"
        bgColor="red"
        headerColor="#ff5b68"
      />
    </div>

    {/* BOTTOM-RIGHT popup (kept for compatibility) */}
    <div style={wastePopupBottomStyle}>
      <Notification
        headline="Wastage % Formula"
        message={wastePopupMessage}
        onClose={() => setShowWastePopup(false)}
        show={showWastePopup}
        containerBg="rgba(231, 116, 116, 0.445)"
        bgColor="red"
        headerColor="#ff5b68"
      />
    </div>
  </>
)}

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Production;
