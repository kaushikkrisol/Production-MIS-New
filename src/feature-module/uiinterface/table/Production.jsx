import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from "react-router-dom";
import { Table, Form, Button, Row, Col, Alert, Spinner, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Modal, ModalBody, ModalHeader, ModalFooter, Table as ExcelTable } from 'reactstrap';
import config from '../../../config';
import 'bootstrap/dist/css/bootstrap.min.css';
import { all_routes } from "../../../Router/all_routes";
import './Production.css';
import { FaSyncAlt, FaSearch } from 'react-icons/fa';
import CompletedPrinting from './CompletedPrinting';
import Notification from '../../Notification/Notification';
import Sort from "../ui/Sort";
import Notification2 from '../../Notification/Notification2';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import moment from 'moment';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Production = () => {
  const [BulkAdd, setBulkAdd] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [selectedTotals, setSelectedTotals] = useState({ qty: 0, width: 0, length: 0, totalSqFt: 0 });
  const [data, setData] = useState([]);
  const [gangData, setGangData] = useState([]);

  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);

  const [csJobs, setcsJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaSearchTerm, setMediaSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalValues, setTotalValues] = useState({ width: 0, length: 0, totalSqFt: 0 });

  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [rolenamedata, setrolenamedata] = useState('');

  const [showLength, setShowLength] = useState(false);

  const [selectedRows, setSelectedRows] = useState({});
  const selectedRowsArr = Object.keys(selectedRows);
  const [isJobRunning, setIsJobRunning] = useState(true);

  const [printerName, setPrinterNames] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState([]);
  const [mediaWidth, setMediaWidth] = useState('');
  const gridRef = useRef(null);

  const [printingData, setPrintingData] = useState([]);
  const [mediaLength, setMediaLength] = useState('');
  const [mediaSqFt, setMediaSqFt] = useState(0);

  const [actualWidth, setActualWidth] = useState('');
  const [actualLength, setActualLength] = useState('');
  const [actualSqFt, setActualSqFt] = useState(0);

  const [wasteagePer, setWasteagePer] = useState('');
  const [wasteagePerData, setWasteagePerData] = useState([]);
  const [wastePercentage, setWastePercentage] = useState([]);
  const [wasteageDataFetched, setWasteageDataFetched] = useState(false);

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState([]); // is array

  const [showNotification2, setShowNotification2] = useState(false);
  const [notificationMessage2, setNotificationMessage2] = useState([]); // is array

  const [showDeadlineWarning, setShowDeadlineWarning] = useState(false);
  const [deadlineWarningMessages, setDeadlineWarningMessages] = useState([]);
  const [showDeadlineMissed, setShowDeadlineMissed] = useState(false);
  const [deadlineMissedMessages, setDeadlineMissedMessages] = useState([]);

  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'ascending' });

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
  const calcMediaSqFt = (w, l) => {
    const W = toNum(w), L = toNum(l);
    return (W > 0 && L > 0) ? (W * L) / 144 : 0;
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

  let location_id = 1;
  useEffect(() => {
    const users = localStorage.getItem('users');
    const userObj = JSON.parse(users || '{}');
    const userId = userObj?.message?.user_id;
    location_id = userObj?.message?.location_id;
    const userName = userObj?.message?.username;
    const rolename = userObj?.message?.rolE_NAME;

    if (userId) setUserId(userId);
    if (userName) setUsername(userName);
    if (rolename) setrolenamedata(rolename);
  }, []);

  const exportToExcel = () => {
    if (!gridRef.current) return;
    const visibleRows = [];
    gridRef.current.api.forEachNodeAfterFilterAndSort(node => {
      visibleRows.push(node.data);
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

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A1' });
    doc.setFontSize(12);
    doc.text("Printing Jobs", 40, 30);

    const columns = columnDefs
      .filter(col => col.field && col.headerName)
      .map(col => ({ header: col.headerName, dataKey: col.field }));

    const rows = sortedData.map(row => {
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


  const fetchPrinting = async () => {
    setLoading(true);
    try {
      const payload = { location_id };
      const response = await axios.post(config.Printing.URL.Getallprinting, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      if (Array.isArray(response.data) && response.data.length > 0) {
        setData(response.data);
        setPrinterNames(response.data.printerName || []);
      }
    } catch (error) {
      console.error("Error fetching job data:", error.response ? error.response.data : error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrinting(); }, []);
  useEffect(() => { setData(data); }, [data]);

  useEffect(() => {
    if (Array.isArray(data)) {
      const totals = data.reduce((acc, row) => {
        acc.width += parseInt(row.width) || 0;
        acc.height += parseInt(row.height) || 0;
        acc.totalSqFt += parseInt(row.totalSqFt) || 0;
        return acc;
      }, { width: 0, height: 0, totalSqFt: 0 });
      setTotalValues(totals);
    }
  }, [data]);

  const filteredData1 = Array.isArray(data) && (mediaSearchTerm.trim().length > 0 || searchTerm.trim().length > 0)
    ? data.filter(row => {
        const matchesMedia = mediaSearchTerm.trim().length > 0 && row.media && row.media.toLowerCase().includes(mediaSearchTerm.trim().toLowerCase());
        const matchesJobNo = searchTerm.trim().length > 0 && row.jobNo && row.jobNo.toLowerCase().includes(searchTerm.trim().toLowerCase());
        return matchesMedia || matchesJobNo;
      })
    : data;

  const resetForm = () => {
    setUserId('');
    setUsername('');
    setPrinterNames('');
  };

  const toggleBulkAdd = useCallback(() => {
    if (BulkAdd) {
      setBulkAdd(false);
      setHeaders([]);
    } else {
      setBulkAdd(true);
    }
  }, [BulkAdd]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData1];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData1, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
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
      .map(row => ({
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
        length: row.height,
        actualSqFt: row.actualSqFt,
        totalSqFt: row.totalSqFt,
        startdate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        ActualSqFt: actualSqFt,
        MediaWidth: mediaWidth,
        MediaLength: mediaLength,
        PrinterName: selectedPrinter,
        entereddt: row.entereddt
      }));

    setLoading(true);
    setIsJobRunning(false);
    try {
      const response = await axios.post(config.Printing.URL.AddPrintingStart, selectedJobs);
      const wastePer = response.data.result;
      setWasteagePerData(wastePer);

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

  const handleCheckboxChange = (id) => {
    setSelectedRows(prev => {
      const newSelectedRows = { ...prev, [id]: !prev[id] };
      const selectedWasteage = wasteagePerData.find(job => job.jobids.includes(id));
      if (selectedWasteage) setWasteagePer(selectedWasteage.wasteagePer);

      const selectedTotalSqFt = filteredData1
        .filter(row => newSelectedRows[row.id])
        .reduce((total, row) => {
          const width = parseFloat(row.width) || 0;
          const height = parseFloat(row.height) || 0;
          const qty = Number(row.qty) || 0;
          const area = (width * height * qty) / 144;
          return total + area;
        }, 0);

      setActualSqFt(selectedTotalSqFt.toFixed(2));
      return newSelectedRows;
    });
  };

  const handleSelectAllChange = (e) => {
    const isChecked = e.target.checked;
    const newSelectedRows = {};
    filteredData1.forEach(row => {
      if (!row.isCompleted) newSelectedRows[row.id] = isChecked;
    });

    const selectedTotalSqFt = filteredData1
      .filter(row => newSelectedRows[row.id])
      .reduce((total, row) => {
        const width = parseFloat(row.width) || 0;
        const height = parseFloat(row.height) || 0;
        const qty = parseFloat(row.qty) || 0;
        const area = (width * height * qty) / 144;
        return total + area;
      }, 0);

    setActualSqFt(selectedTotalSqFt.toFixed(2));

    const selectedWasteages = filteredData1
      .filter(row => newSelectedRows[row.id])
      .map(row => {
        const wasteageData = wasteagePerData.find(job => job.jobids.includes(row.id));
        return wasteageData ? wasteageData.wasteagePer : 0;
      });

    const totalWasteagePer = selectedWasteages.reduce((total, w) => total + w, 0);
    setWasteagePer(totalWasteagePer);
    setSelectedRows(newSelectedRows);
  };

  const isSelectAllChecked = filteredData1.length > 0 && filteredData1.every(row => row.isCompleted || selectedRows[row.id]);

  const handlePrinterChange = (e) => setSelectedPrinter(e.target.value);

  const printerNameSelect = (data.map(d => d.printerName));
  const filteredPrinterNames = printerNameSelect.filter(arr => Array.isArray(arr) && arr.length > 0);

  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date();
      const message = [];
      data.forEach(job => {
        const printingDeadline = new Date(job.printerDeadline);
        const printerName = job.printerPrintingName;
        const deadlineDuration = now - printingDeadline;
        if (!job.isCompleted && now > printingDeadline) {
          const totalHours = Math.floor(deadlineDuration / (1000 * 60 * 60));
          const days = Math.floor(totalHours / 24);
          const hours = totalHours % 24;
          message.push(`Job No: ${job.jobNo},Job Date: ${job.date}, Client name: ${job.client}, Printer Name: ${printerName} has missed its deadline! Time passed: ${days}d ${hours}h`);
        }
      });
      if (message.length > 0) {
        setNotificationMessage(message);
        setShowNotification(true);
      }
    };
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 300000);
    return () => clearInterval(interval);
  }, [data]);

  const handleCloseNotification = () => setShowNotification(false);

  useEffect(() => {
    const checkJobDeadlines = () => {
      const now = new Date();
      const warningMessages = [];
      const missedMessages = [];

      data.forEach(job => {
        if (!job.deadline) return;
        const jobDeadline = new Date(job.deadline);
        if (!jobDeadline || Number.isNaN(jobDeadline.getTime())) return;

        const diffMs = jobDeadline - now;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (!job.isCompleted && diffMs > 0 && diffMs <= 6 * 60 * 60 * 1000) {
          warningMessages.push(
            `Job No: ${job.jobNo} is due in ${diffHours}h ${diffMinutes}m (Deadline: ${moment(jobDeadline).format('DD/MM/YYYY HH:mm')})`
          );
        }

        if (!job.isCompleted && diffMs <= 0) {
          const passedHours = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
          const passedMinutes = Math.abs(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
          missedMessages.push(
            `Job No: ${job.jobNo} missed the deadline by ${passedHours}h ${passedMinutes}m (Deadline: ${moment(jobDeadline).format('DD/MM/YYYY HH:mm')})`
          );
        }
      });

      setDeadlineWarningMessages(warningMessages);
      setShowDeadlineWarning(warningMessages.length > 0);
      setDeadlineMissedMessages(missedMessages);
      setShowDeadlineMissed(missedMessages.length > 0);
    };

    checkJobDeadlines();
    const interval = setInterval(checkJobDeadlines, 60000);
    return () => clearInterval(interval);
  }, [data]);

  useEffect(() => {
    const checkDeadlines2 = () => {
      const now = new Date();
      const message = [];
      csJobs.forEach(csJob => {
        const Deadline = new Date(csJob.deadline);
        const csName = csJob.userName;
        const timeUntilDeadline = Deadline - now;
        if (!csJob.isCompleted && timeUntilDeadline > 0 && timeUntilDeadline <= 8 * 60 * 60 * 1000) {
          const totalHours = Math.floor(timeUntilDeadline / (1000 * 60 * 60));
          const totalMinutes = Math.floor((timeUntilDeadline % (1000 * 60 * 60)) / (1000 * 60));
          const totalSeconds = Math.floor((timeUntilDeadline % (1000 * 60)) / 1000);
          message.push(`Job No: ${csJob.jobNo}, CS Name: ${csName}'s deadline is approaching in: ${totalHours}h ${totalMinutes}m ${totalSeconds}s`);
        }
      });
      if (message.length > 0) {
        setNotificationMessage2(message);
        setShowNotification2(true);
      }
    };
    checkDeadlines2();
    const interval = setInterval(checkDeadlines2, 500000);
    return () => clearInterval(interval);
  }, [csJobs]);

  const handleCloseNotification2 = () => setShowNotification2(false);

  const columnDefs = useMemo(() => [
    { headerName: '', checkboxSelection: true, headerCheckboxSelection: true, width: 50, filter: false },
    {
      headerName: 'Job Date',
      minWidth: 130,
      valueGetter: params => {
        const { date, entereddt, lstupdatedt } = params.data;
        const finalDate = date || entereddt || lstupdatedt;
        const parsedDate = moment(finalDate, [
          "DD/MMM/YYYY",
          "YYYY-MM-DDTHH:mm:ss.SSSZ",
          "DD/MM/YYYY HH:mm:ss",
          moment.ISO_8601
        ]);
        return parsedDate.isValid() ? parsedDate.format("DD/MMM/YYYY") : '-';
      },
      comparator: (valueA, valueB) => {
        const parseDate = str => moment(str, "DD/MMM/YYYY").valueOf();
        return parseDate(valueA) - parseDate(valueB);
      }
    },
    { headerName: 'Job ID', field: 'jobNo', minWidth: 140 },
    { headerName: 'Printer Name', field: 'printerPrintingName', minWidth: 180 },
    { headerName: 'Qty', field: 'qty', minWidth: 110 },
    { headerName: 'Print W.', field: 'width', valueFormatter: params => parseFloat(params.value).toFixed(2), minWidth: 130 },
    { headerName: 'Print L.', field: showLength ? 'length' : 'height', valueFormatter: params => parseFloat(params.value).toFixed(2), minWidth: 130 },
    { headerName: 'Print SQ.Ft.', field: 'totalSqFt', valueFormatter: params => parseFloat(params.value).toFixed(2), minWidth: 140 },
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
    sortable: true, filter: true, resizable: true, wrapText: true, autoHeight: true,
  }), []);

  const onSelectionChanged = () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    const visibleRowIndexes = gridRef.current?.api.getRenderedNodes().map(n => n.rowIndex) || [];
    const selectedVisibleData = selectedNodes.filter(node => visibleRowIndexes.includes(node.rowIndex)).map(node => node.data);

    let totalQty = 0, totalW = 0, totalL = 0, totalSqFt = 0;
    selectedVisibleData.forEach(row => {
      totalQty += parseFloat(row.qty || "0");
      totalW += parseFloat(row.width || "0");
      totalL += parseFloat((showLength ? row.length : row.height) || "0");
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

  const pinnedBottomRowData = useMemo(() => [{
    jobNo: 'Selected Total',
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
                      <ModalBody ><CompletedPrinting /></ModalBody>
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
                      rowData={sortedData}
                      columnDefs={columnDefs}
                      defaultColDef={defaultColDef}
                      getRowHeight={() => 40}
                      domLayout="autoHeight"
                      getRowNodeId={row => row.id}
                      suppressRowClickSelection={true}
                      rowSelection="multiple"
                      onSelectionChanged={onSelectionChanged}
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

                  {showNotification2 && (
                    <Notification2
                      headline="Deadline Alert!"
                      message={notificationMessage2}
                      onClose={() => setShowNotification2(false)}
                      show={showNotification2}
                      containerBg="rgba(116, 143, 231, 0.445)"
                      bgColor="blue"
                      headerColor="#5b79ff"
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
