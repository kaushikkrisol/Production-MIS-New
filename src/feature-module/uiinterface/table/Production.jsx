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
            console.log(gangData);

            const [open, setOpen] = useState(false);
            const toggle = () => setOpen(!open);

            const [csJobs, setcsJobs] = useState([]);
            const [searchTerm, setSearchTerm] = useState('');
            const [mediaSearchTerm, setMediaSearchTerm] = useState('');
            // const [selectedRows, setSelectedRows] = useState({});
            // const [isJobRunning, setIsJobRunning] = useState(false); // Job status
            const [error, setError] = useState(null);
            const [loading, setLoading] = useState(false);
            const [totalValues, setTotalValues] = useState({ width: 0, length: 0, totalSqFt: 0 });
            // const [isJobRunning, setIsJobRunning] = useState(true);
            // console.log(setIsJobRunning);

            console.log(setcsJobs)

            const [userId, setUserId] = useState(null);
            const [username, setUsername] = useState('');
            
            console.log(userId, username);

            const [showLength, setShowLength] = useState(false);

            const [selectedRows, setSelectedRows] = useState({});
            const selectedRowsArr = Object.keys(selectedRows);
            console.log('selected rows arr', selectedRowsArr);
            const [isJobRunning, setIsJobRunning] = useState(true);
            // const [hiddenRows, setHiddenRows] = useState([]);

            // const [startDate, setStartDate] = useState([]);
            // const [endDate, setEndDate] = useState([]);

            // console.log(startDate, setStartDate, endDate, setEndDate);

            const [printerName, setPrinterNames] = useState([]);
            const [selectedPrinter, setSelectedPrinter] = useState([]);
            const [mediaWidth, setMediaWidth] = useState('');
            // const [deadline, setDeadline] = useState('');
            const gridRef = useRef(null);

            console.log(printerName);

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
            const [notificationMessage, setNotificationMessage] = useState('');

            const [showNotification2, setShowNotification2] = useState(false);
            const [notificationMessage2, setNotificationMessage2] = useState('');

            const [sortConfig, setSortConfig] = useState({ key: '', direction: 'ascending' });

            console.log('wasteage per 0', wastePercentage)

            console.log(actualWidth, setActualWidth, actualLength, setActualLength, mediaSqFt, setWasteagePer);

            const [user, setUser] = useState('');

            // Check if users data exists and is not null
            useEffect(() => {
                const users = localStorage.getItem('users');

                // Check if users data exists and is not null
                if (users) {
                    // Parse the JSON string into an object
                    const usersObject = JSON.parse(users);

                    // Access the username
                    const username = usersObject.message && usersObject.message.username;
                    setUser(username);
                    // Log the username to the console
                    console.log('Username isss:', username);
                } else {
                    console.log('No user data found in localStorage.');
                }
            }, []);

            // Recalculate square footage whenever mediaWidth or mediaHeight changes
            useEffect(() => {
                const selectedIds = Object.keys(selectedRows).filter(id => selectedRows[id]);
                const totalSelected = selectedIds.length;
            
                if (mediaWidth && mediaLength && actualSqFt > 0 && totalSelected > 0) {
                    const mediaSqFtValue = ((parseFloat(mediaWidth) || 0) * (parseFloat(mediaLength) || 0)) / 144;
                    setMediaSqFt(mediaSqFtValue.toFixed(2));
            
                    const calculatedWasteage = (((mediaSqFtValue - actualSqFt) / mediaSqFtValue) * 100).toFixed(4);
                    setWastePercentage(calculatedWasteage);
                    setWasteageDataFetched(true);
            
                    console.log("Auto Wastage %:", calculatedWasteage);
                }
            }, [mediaWidth, mediaLength, actualSqFt, selectedRows]);

            console.log(setPrintingData);
            console.log(printingData);
            let  location_id = 1;
            useEffect(() => {
                // Fetch user_id and username from local storage
                const users = localStorage.getItem('users');

                const userObj = JSON.parse(users);
                const userId = userObj?.message?.user_id;
                location_id = userObj?.message?.location_id;
                const userName = userObj?.message?.username;

                // Log the retrieved values to the console
                console.log('Fetched User ID:', userId);
                console.log('Fetched Username:', userObj.message, userName);
                console.log('Fetched Username:', userObj.message, location_id);

                // Set state if values exist
                if (userId) {
                    setUserId(userId);
                }

                if (userName) {
                    setUsername(userName);
                }
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

    // Optional: Adjust column widths
    const max_widths = visibleRows.reduce((acc, row) => {   
        Object.keys(row).forEach((key, index) => {
            const len = row[key]?.toString().length || 10;
            if (!acc[index] || len > acc[index].wch) {
                acc[index] = { wch: len + 2 }; // +2 for padding
            }
        });
        return acc;
    }, []);
    worksheet["!cols"] = max_widths;

    XLSX.writeFile(workbook, "FilteredPrintingJobs.xlsx");
};

            


            const exportToPDF = () => {
                const doc = new jsPDF({
                    orientation: 'landscape',
                    unit: 'pt',
                    format: 'A1', // Wider format for many columns
                });
            
                doc.setFontSize(12);
                doc.text("Printing Jobs", 40, 30);
            
                const columns = columnDefs
                    .filter(col => col.field && col.headerName)
                    .map(col => ({
                        header: col.headerName,
                        dataKey: col.field
                    }));
            
                const rows = sortedData.map(row => {
                    const formattedRow = {};
                    columns.forEach(col => {
                        let value = row[col.dataKey];
                        if (typeof value === 'string') {
                            value = value.replace(/\s+/g, ' ').trim(); // remove excessive whitespace
                        }
                        formattedRow[col.dataKey] = value ?? '';
                    });
                    return formattedRow;
                });
            
                doc.autoTable({
                    columns: columns,
                    body: rows,
                    startY: 50,
                    styles: {
                        fontSize: 7,
                        overflow: 'linebreak',
                        cellWidth: 'wrap'
                    },
                    headStyles: {
                        fillColor: [153, 0, 0],
                        textColor: 255,
                        halign: 'center',
                    },
                    columnStyles: {
                        remarks: { cellWidth: 280 },
                        nameSubCode: { cellWidth: 200 },
                        visualCode: { cellWidth: 180 },
                        salonAddress: { cellWidth: 200 }
                    },
                    margin: { top: 50, left: 40, right: 40, bottom: 30 },
                    theme: 'grid',
                    didDrawPage: function (data) {
                        doc.setFontSize(10);
                        doc.text(`Page ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
                    }
                });
            
                doc.save("PrintingJobs_full.pdf");
            };
            


            // const fetchJobs = async () => {

            //     try {
            //         setLoading(true);

            //         const response = await axios.post(config.JobSummary.URL.Getalljob, data, { // Make sure to send the payload here
            //             timeout: 10000,
            //             headers: {
            //                 'Content-Type': 'application/json' // Ensure the correct content type
            //             }
            //         });

            //         console.log("Data fetched successfully: ", response.data);
            //         setData(response.data);

            //         if (Array.isArray(response.data) && response.data.length > 0) {
            //             setData(response.data); // This should set jobs specific to the user
            //         } else {
            //             setData([]); // No jobs found for the user
            //             setError("No jobs found for this user.");
            //         }

            //     } catch (error) {
            //         console.error("Error fetching job data:", error.response ? error.response.data : error.message);
            //         setError("Error fetching job data");
            //     } finally {
            //         setLoading(false);
            //     }
            // };


            // useEffect(() => {
            //     fetchJobs();
            // }, []);

            const fetchPrinting = async () => {
                setLoading(true);
                try {
                    let payload =
                    {
                        location_id: location_id
                    }

                    console.log(location_id);
                    const response = await axios.post(config.Printing.URL.Getallprinting, payload, { 
                        timeout: 10000,
                        headers: {
                            'Content-Type': 'application/json' // Ensure the correct content type
                        }
                    });

                    console.log("Fetching data from printing:", config.Printing.URL.Getallprinting);

                    console.log("Data fetched successfully: ", response.data);
                    // setPrintingData(response.data);
                    

                    if (Array.isArray(response.data) && response.data.length > 0) {
                        setData(response.data);
                
                        setPrinterNames(data.printerName);
                    } 
                    //else {
                    //    setData([]); // No jobs found for the user
                    //     setError("No jobs found for this user.");
                    //}

                } catch (error) {
                    console.error("Error fetching job data:", error.response ? error.response.data : error.message);
                    // setError("Error fetching job data");
                } finally {
                    setLoading(false);
                }
            }

            // const fetchcsJobs = async () => {
            //     try {
            //         const response = await axios.post(config.JobSummary.URL.Getalljob);
            //         setcsJobs(response.data);
            //     } catch (error) {
            //         console.error('Unable to fetch jobs', error);
            //     }
            // }

            useEffect(() => {
                fetchPrinting();
                // fetchcsJobs();
            }, []);

            useEffect(() => {

                console.log("useeffect", data);
                setData(data);
            }, [data]);

            useEffect(() => {
                if (Array.isArray(data)) { // Check if data is an array
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
                    console.log('Checking row:', row);  // Log each row to see if it has the correct data

                    // Check if the row matches the media search term
                    const matchesMedia = mediaSearchTerm.trim().length > 0 && row.media && row.media.toLowerCase().includes(mediaSearchTerm.trim().toLowerCase());

                    // Check if the row matches the jobNo search term
                    const matchesJobNo = searchTerm.trim().length > 0 && row.jobNo && row.jobNo.toLowerCase().includes(searchTerm.trim().toLowerCase());

                    console.log(`matchesMedia: ${matchesMedia}, matchesJobNo: ${matchesJobNo}`);  // Log matches to verify the filtering

                    // Return true if the row matches either media OR jobNo
                    return matchesMedia || matchesJobNo;
                })
                : data;


            console.log('Filtered data: ',filteredData1);

            const resetForm = () => {
                setUserId('');
                setUsername('');
                setPrinterNames('');
                // setMediaWidth('');
                // setMediaLength('');
            };

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

            const sortedData = useMemo(() => {
                let sortableItems = [...filteredData1];
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
            }, [filteredData1, sortConfig]);

            const requestSort = (key) => {
                let direction = 'ascending';
                if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
                    direction = 'descending';
                }
                setSortConfig({ key, direction });
            }

            const handleFileChange = (e) => {
                const file = e.target.files[0];
                const reader = new FileReader();

                reader.onload = (e) => {
                    const resp = e.target.result;
                    const workbook = XLSX.read(resp, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

                    if (!jsonData.length) {
                        console.error('No data found in the Excel file');
                        return;
                    }

                    const headers = jsonData[0];
                    const dataRows = jsonData.slice(1);
                    const data = dataRows.map((row) => {
                        const obj = {};
                        headers.forEach((header, i) => {
                            let cellValue = row[i];
                            const cell = worksheet[XLSX.utils.encode_cell({ r: dataRows.indexOf(row) + 1, c: i })];

                            if (cell && cell.t === 'n' && cell.z) {
                                const date = XLSX.SSF.parse_date_code(cell.v);
                                if (date) {
                                    cellValue = new Date(Date.UTC(date.y, date.m - 1, date.d)).toISOString().split('T')[0];
                                }
                            }

                            obj[header] = cellValue;
                        });

                        return obj;
                    }).filter(row => {
                        return Object.values(row).some(value => value !== '' && value !== null && value !== undefined);
                    });

                    console.log("Filtered Data: ", data);
                    setHeaders(headers);
                // setData(data);
                };

                reader.readAsBinaryString(file);
            };

            {/*submitting excel data*/ }

            const submitDataToAPI = async (e) => {
                e.preventDefault();
                try {
                    setLoading(true);
                    console.log("API URL: ", config.Printing.URL.AddPrinting);

                    // Submit the filtered data to the database
                    const response = await axios.post(config.Printing.URL.AddPrinting, data, {
                        timeout: 60000,
                    });

                    console.log("Data submitted successfully: ", response.data);

                    // Reset the state after submission
                    setHeaders([]);
                //   setData([]);

                    setBulkAdd(false);

                    fetchPrinting();
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        console.error("Axios error: ", error.message);
                        console.error("Config: ", error.config);
                        if (error.code === 'ECONNABORTED') {
                            console.error("Request timed out");
                        }
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
                    return; // Exit the function if validation fails
                }

                // Prepare the data for the selected jobs
                const selectedJobs = filteredData1
                    .filter(row => selectedRows[row.id]) // Include only selected rows
                    .map(row => ({
                        id: row.id,
                        jobNo: row.jobNo, // Job Number
                        client: row.client,
                        subClient: row.subClient,
                        date: row.date,
                        userName: username, // User Name
                        region: row.region, // Location
                        visualCode: row.visualCode, // Visual Code
                        nameSubCode: row.nameSubCode, // Name Sub Code
                        city: row.city, // City
                        qty: row.qty, // Quantity
                        media: row.media,
                        mediaWidth: mediaWidth, // Updated with state value
                        mediaLength: mediaLength, // Updated with state value
                        // mediaSqFt: mediaSqFt, // Updated with state value
                        printerName: selectedPrinter, // Selected printer
                        installation: row.installation,
                        deadline: row.deadline,
                        lamination: row.lamination, // Lamination
                        mounting: row.mounting, // Mounting
                        implementation: row.implementation, // Implementation
                        salonAddress: row.salonAddress, // Salon Address
                        dispatchAddress: row.dispatchAddress, // Dispatch Address
                        remarks: row.remarks, // Remarks
                        actualCompleteTime: row.actCompleteTime, // Actual Completion Time
                        onTimeDelayed: row.onTimeDelayed, // On Time or Delayed status
                        enteredBy: row.enteredby, // Entered By
                        enteredDate: row.enteredDate, // Entered Date
                        lastUpdatedBy: user, // Last Updated By
                        width: row.width, // Width
                        length: row.height, // Height
                        actualSqFt: row.actualSqFt,
                        totalSqFt: row.totalSqFt, // Total Square Footage
                        startdate: new Date().toISOString(), // Start Date for the job
                        lastUpdated: new Date().toISOString(),
                        ActualSqFt: actualSqFt,
                        MediaWidth: mediaWidth,    // Use the updated state value for MediaWidth
                        MediaLength: mediaLength,  // Use the updated state value for MediaLength
                        PrinterName: selectedPrinter,
                        entereddt: row.entereddt
                    }));

                console.log("Payload being sent to Addprintingstart:", JSON.stringify(selectedJobs, null, 2));

                // const selectedGangModels = filteredData1
                //     .filter(row => selectedRows[row.id]) // Only selected rows
                //     .map(() => ({
                //         ActualSqFt: actualSqFt,
                //         MediaWidth: mediaWidth,    // Use the updated state value for MediaWidth
                //         MediaLength: mediaLength,  // Use the updated state value for MediaLength
                //         PrinterName: selectedPrinter,  // Use selected printer
                //     }));

                setLoading(true);
                setIsJobRunning(false);
                try {
                    // Submit data to the Start Job API
                    const response = await axios.post(config.Printing.URL.AddPrintingStart, selectedJobs);
                    console.log("Printing data submitted successfully:", response.data);
                    const wastePer = response.data.result;
                    console.log('Wasteage data got: ', wastePer);
                    setWasteagePerData(wastePer);

                    const wasteagePer = wastePer.map(item => item.wasteagePer);
                    console.log('wasteage per', wasteagePer);
                    if (wasteagePer.length > 0) {
                        const wasteagePerValue = wasteagePer[0];
                        console.log('wasteage per value:', wasteagePerValue);
                        setWastePercentage(wasteagePerValue);
                    } else {
                        console.log('No data available');
                    }

                    if (response.status === 200) {
                        // Update the state with the new data
                        setData(selectedJobs);
                        console.log('wasteage1', wastePer);
                        // setGangData(selectedGangModels);
                        console.log(setGangData, setWasteagePerData);
                        setWasteageDataFetched(true);
                        setShowLength(true);

                        // Update selected rows to reflect successful job submission
                        setSelectedRows(prevSelectedRows => {
                            const newSelectedRows = { ...prevSelectedRows };
                            selectedJobs.forEach(job => {
                                newSelectedRows[job.id] = true; // Mark the job as selected
                            });
                            return newSelectedRows;
                        });
                        
                        resetForm();
                    } else {
                        setError("Unexpected response from the server.");
                    }
                } catch (error) {
                    console.error("Error submitting Start Job data:", error);
                    handleError(error);
                } finally {
                    setLoading(false);
                    // await fetchPrinting(); // Refresh the data
                }
            };
            console.log('wasteage data', wasteagePerData)

            const isStartJobDisabled = !mediaWidth || !mediaLength || !selectedPrinter || selectedRowsArr.length === 0;

            const handleStopJob = async (e) => {
                e.preventDefault();
            
                // ✅ Store selected IDs before clearing
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
            
                console.log("Stop Job Data:", stopData);
            
                setLoading(true);
                setIsJobRunning(true);
            
                try {
                    const response = await axios.post(config.Printing.URL.AddPrintingStop, stopData);
            
                    if (response.status === 200) {
                        console.log("Stop Data submitted successfully:", response.data);
            
                        await fetchPrinting(); // ✅ Refresh data first
            
                        // ✅ Restore selection
                        const newSelection = {};
                        selectedJobIds.forEach(id => {
                            newSelection[id] = true;
            
                            // ✅ Also visually re-select in AG Grid
                            const node = gridRef.current?.api?.getRowNode(id);
                            if (node) {
                                node.setSelected(true);
                            }
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
            
            useEffect(() => {
                
            }, [loading, isJobRunning]);

            const handleError = (error) => {
                if (axios.isAxiosError(error)) {
                    console.error("Axios error: ", error.message);
                    setError(error.response ? error.response.data : "An unexpected error occurred");
                } else {
                    console.error("Unexpected error: ", error);
                    setError("An unexpected error occurred");
                }
            };

            const handleCheckboxChange = (id) => {
                setSelectedRows(prev => {
                    const newSelectedRows = { ...prev, [id]: !prev[id] };
                    const selectedWasteage = wasteagePerData.find(job => job.jobids.includes(id));

                    if (selectedWasteage) {
                        console.log(`Wasteage for job ${id}:`, selectedWasteage.wasteagePer);
                        // Here you could set the wasteage data into a state to display
                        setWasteagePer(selectedWasteage.wasteagePer);
                        console.log('wast per sfos', wasteagePer);
                    }

                    // const selectedTotalSqFt = filteredData1
                    //     .filter(row => newSelectedRows[row.id]) // Only include selected rows
                    //     .reduce((total, row) => total + parseFloat(row.height || 0), 0);

                    // const selectedTotalWidth = filteredData1
                    //     .filter(row => newSelectedRows[row.id]) // Only include selected rows
                    //     .reduce((total, row) => total + parseFloat(row.width || 0), 0);
                    
                    // console.log(selectedTotalSqFt);

                    // setActualLength(selectedTotalSqFt);
                    // setActualWidth(selectedTotalWidth);

                    const selectedTotalSqFt = filteredData1
                        .filter(row => newSelectedRows[row.id]) // Only include selected rows
                        .reduce((total, row) => {
                            const width = parseFloat(row.width) || 0;
                            const height = parseFloat(row.height) || 0;
                            const qty = Number(row.qty) || 0;
                            const area = (width * height * qty) / 144; // Convert to square feet
                            console.log('Row width: ', width);
                            console.log('Row height: ', height);
                            console.log('total area: ', area, qty);
                            console.log('qty', qty);
                            return total + area; // Add the area to the total
                        }, 0);

                        setActualSqFt(selectedTotalSqFt.toFixed(2));
                        console.log("Selected Rows (Qty):", selectedRows.map(r => r.qty));

                    

                    // setMediaHeight(selectedTotalSqFt); // Update media height dynamically
                    return newSelectedRows;
                });
                console.log("After change:", { ...selectedRows, [id]: !selectedRows[id] });
            };

            const handleSelectAllChange = (e) => {
                const isChecked = e.target.checked;
                const newSelectedRows = {};
                filteredData1.forEach(row => {
                    if (!row.isCompleted) {
                        newSelectedRows[row.id] = isChecked;
                    }
                });

                // const selectedTotalSqFt = isChecked
                //     ? filteredData1
                //         .filter(row => !row.isCompleted)
                //         .reduce((total, row) => total + parseFloat(row.height || 0), 0)
                //     : 0;

                // const selectedTotalWidth = isChecked
                //     ? filteredData1
                //         .filter(row => !row.isCompleted)
                //         .reduce((total, row) => total + parseFloat(row.width || 0), 0) // Ensure you are using 'width' here
                //     : 0;
                // console.log(selectedTotalSqFt);

                // setActualLength(selectedTotalSqFt);
                // setActualWidth(selectedTotalWidth);

                const selectedTotalSqFt = filteredData1
                    .filter(row => newSelectedRows[row.id]) // Only include selected rows
                    .reduce((total, row) => {
                        const width = parseFloat(row.width) || 0;
                        const height = parseFloat(row.height) || 0;
                        const qty = parseFloat(row.qty) || 0;
                        const area = (width * height * qty) / 144; // Convert to square feet
                        return total + area; // Add the area to the total
                    }, 0);

                setActualSqFt(selectedTotalSqFt.toFixed(2));

                const selectedWasteages = filteredData1
                    .filter(row => newSelectedRows[row.id])
                    .map(row => {
                        const wasteageData = wasteagePerData.find(job => job.jobids.includes(row.id));
                        return wasteageData ? wasteageData.wasteagePer : 0; // Default to 0 if no wasteage data found
                    });

                const totalWasteagePer = selectedWasteages.reduce((total, wasteage) => total + wasteage, 0);
                console.log("Selected wasteages:", selectedWasteages);
                setWasteagePer(totalWasteagePer);

                setSelectedRows(newSelectedRows);
                console.log('select all', newSelectedRows);
            };

            const isSelectAllChecked = filteredData1.length > 0 && filteredData1.every(row => row.isCompleted || selectedRows[row.id]);

            const handlePrinterChange = (e) => {
                setSelectedPrinter(e.target.value);  // Update selected printer
            };

            console.log('selected rowwws', selectedRows);

            const printerNameSelect = (data.map(data => data.printerName));
            console.log('Printer name', printerNameSelect, actualWidth);

            const filteredPrinterNames = printerNameSelect.filter(arr => Array.isArray(arr) && arr.length > 0);

            useEffect(() => {
                const checkDeadlines = () => {
                    const now = new Date();
                    const message = [];
                    console.log('now: ', now);

                    data.forEach(job => {
                        const printingDeadline = new Date(job.printerDeadline);
                        const printerName = job.printerPrintingName;
                        const deadlineDuration = now - printingDeadline;
                        console.log('deadline duration', deadlineDuration);

                        if (!job.isCompleted && now > printingDeadline) {
                            const totalHours = Math.floor(deadlineDuration / (1000 * 60 * 60));
                            const days = Math.floor(totalHours / 24);
                            const hours = totalHours % 24;
                            
                            message.push(`Job No: ${job.jobNo}, Printer Name: ${printerName} has missed its deadline! Time passed: ${days}d ${hours}h`);
                        }
                    });

                    if(message.length > 0) {
                        setNotificationMessage(message);
                        setShowNotification(true);
                    }
                };
                checkDeadlines();
                // const timeout = setTimeout(() => {
                //     setNotificationMessage("Test notification");
                //     setShowNotification(true);
                // }, 2000);
                // return () => clearTimeout(timeout);
                const interval = setInterval(checkDeadlines, 300000);
                return () => clearInterval(interval);
            }, [data]);

            const handleCloseNotification = () => {
                setShowNotification(false);
            }

            useEffect(() => {
                const checkDeadlines2 = () => {
                    const now = new Date();
                    const message = [];
                    console.log('now: ', now);

                    csJobs.forEach(csJob => {
                        const Deadline = new Date(csJob.deadline);
                        const csName = csJob.userName;
                        const timeUntilDeadline = Deadline - now;

                        console.log('design deadline: ', csJob);
                        console.log('design deadline: ', Deadline);

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

            const handleCloseNotification2 = () => {
                setShowNotification2(false);
            }

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

    return parsedDate.isValid()
      ? parsedDate.format("DD/MMM/YYYY")
      : '-';
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
                sortable: true,
                filter: true,
                resizable: true,
                wrapText: true,
                autoHeight: true,
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

            
            
            
            
            

            
            
            const pinnedBottomRowData = useMemo(() => {
                return [{
                jobNo: 'Selected Total',
                qty: selectedTotals.qty,
                width: selectedTotals.width,
                [showLength ? 'length' : 'height']: selectedTotals.length,
                totalSqFt: selectedTotals.totalSqFt
                }];
            }, [selectedTotals, showLength]);
            

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
                                                {/* <div className="button-group" style={{ marginLeft: 'auto' }}>
                                                    <Button
                                                        type="default"
                                                        style={{ backgroundColor: 'orange', borderColor: 'orange' }}
                                                        onClick={toggleBulkAdd}
                                                    >
                                                        Upload
                                                    </Button>
                                                </div> */}
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
                                                                <div className="">
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
                                            </div>

                                            {error && <Alert variant="danger">{error}</Alert>}
                                            {loading && <Spinner animation="border" className="d-block mx-auto" />}

                                            <div>
                                                <Form className="mb-3">
                                                    <Row className="mb-3 align-items-center">
                                                        <Col xs={2}>
                                                        </Col>
                                                    </Row>
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
                                                                        filteredPrinterNames.length > 0 ? (
                                                                            filteredPrinterNames.flat().map((printer, index) => (
                                                                                <option key={index} value={printer}>
                                                                                {  console.log("filtered printer name is ",filteredPrinterNames)}
                                                                                    {printer}
                                                                                </option>
                                                                            ))
                                                                        ) : (
                                                                            <option value="">Loading...</option>
                                                                        )
                                                                    }
                                                                </Form.Select>
                                                            </Form.Group>
                                                        </Col>
                                                        <Col xs={2}>
                                                            <Form.Group controlId="formMediaWidth">
                                                                <Form.Label style={{ width: '200px' }}>Media Width</Form.Label>
                                                                <Form.Control
                                                                    type="number"
                                                                    value={mediaWidth}
                                                                    onChange={(e) => setMediaWidth(e.target.value)}
                                                                    required
                                                                    // style={{ marginLeft: '2px' }}
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                        <Col xs={2}>
                                                            <Form.Group controlId="formMediaLength">
                                                                <Form.Label style={{ width: '200px' }}>Media Length</Form.Label>
                                                                <Form.Control
                                                                type="number"
                                                                    value={mediaLength}
                                                                    // style={{ marginLeft: '30px' }}
                                                                    onChange={(e) => setMediaLength(e.target.value)}
                                                                    required
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                        {/* <Col xs={2}>
                                                            <Form.Group controlId="formActualWidth">
                                                                <Form.Label style={{ width: '200px', marginLeft: '15px' }}>Actual Width</Form.Label>
                                                                <Form.Control
                                                                    value={actualWidth}
                                                                    style={{marginLeft: '15px' }}
                                                                    readOnly
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                        <Col xs={2}>
                                                            <Form.Group controlId="formActualLength">
                                                                <Form.Label style={{ width: '200px', marginLeft: '30px' }}>Actual Length</Form.Label>
                                                                <Form.Control
                                                                    value={actualLength}
                                                                    style={{ marginLeft: '30px' }}
                                                                    readOnly
                                                                >
                                                                
                                                                </Form.Control>
                                                            </Form.Group>
                                                        </Col> */}
                                                        <Col xs={2}>
                                                            <Form.Group controlId="formMediaSqFt">
                                                                <Form.Label style={{ width: '200px' }}>Media Sq.ft</Form.Label>
                                                                <Form.Control
                                                                    value={mediaSqFt}
                                                                    // style={{ marginLeft: '30px' }}
                                                                    readOnly
                                                                >
                                                                </Form.Control>
                                                            </Form.Group>
                                                        </Col>

                                                        <Col xs={2}>
                                                            <Form.Group controlId="formActualSqFt">
                                                                <Form.Label style={{ width: '200px' }}>Actual Sq.ft</Form.Label>
                                                                <Form.Control
                                                                    value={actualSqFt}
                                                                    // style={{ marginLeft: '30px' }}
                                                                    readOnly
                                                                >
                                                                </Form.Control>
                                                            </Form.Group>
                                                        </Col>
                                                        {/* <Col xs={2}>
                                                            <Form.Group controlId="deadline">
                                                                <Form.Label style={{ width: '200px' }}>Deadline</Form.Label>
                                                                <Form.Control
                                                                    type="datetime-local"
                                                                    value={deadline}
                                                                    onChange={(e) => setDeadline(e.target.value)}
                                                                />
                                                            </Form.Group>
                                                        </Col> */}

                                                        <Col>
                                                            {/* <Button type="submit" variant="primary" onClick={(e) => handleAddPrintingJob(e)} style={{ marginLeft: '30px', marginTop: '30px' }}
                                                            >Add</Button> */}
                                                        </Col>
                                                    </Row>
                                                    <Row className="mb-3 align-items-center">
                                                    {wasteageDataFetched ? 
                                                            <Col xs={2}>
                                                                <Form.Group controlId="formWasteage">
                                                                    <Form.Label style={{ width: '300px' }}>Wasteage%</Form.Label>
                                                                    <Form.Control
                                                                        value={`${wastePercentage} %`}
                                                                        readOnly
                                                                    ></Form.Control>
                                                                </Form.Group>
                                                            </Col> : 
                                                            ''
                                                    }                                                
                                                    </Row>
                                                </Form>
                                            </div>

                                            <Row className="mt-3 mb-3 align-items-center">
                                                <Col>
                                                    {(isJobRunning) ?

                                                        <Button variant="success" onClick={handleStartJob} disabled={!Object.values(selectedRows).some(v => v) || isStartJobDisabled}>Start Job</Button>
                                                        :
                                                        <Button variant="danger" onClick={handleStopJob} className="ml-3" disabled={isJobRunning || !Object.values(selectedRows).some(v => v)}>Stop Job</Button>
                                                    } 
                                                </Col>
                                                <Row className="mt-2 mb-3">
                                                                    <Col>
                                                                        <Button variant="outline-primary" onClick={exportToExcel} style={{ marginRight: '10px' }}>
                                                                        Export to Excel
                                                                        </Button>
                                                                        <Button variant="outline-danger" onClick={exportToPDF}>
                                                                        Export to PDF
                                                                        </Button>
                                                                    </Col>
                                                                    </Row>
                                                <Col className='ml-auto' style={{display: 'flex', justifyContent: 'flex-end'}}>
                                                    <FaSyncAlt size={20} style={{ cursor: 'pointer', marginTop: '1em' }} onClick={() => window.location.reload()} />
                                                </Col>
                                            </Row>
                                            <hr />
                                            <div>
                                                <Form inline style={{marginBottom: '2em'}} onSubmit={(e) => e.preventDefault()}>
                                                    <Button color="danger" onClick={toggle}>
                                                        Reprint
                                                    </Button>
                                                </Form>
                                                <Modal isOpen={open} className="">
                                                    <ModalBody>
                                                        <CompletedPrinting />
                                                    </ModalBody>
                                                    <ModalFooter>
                                                        <Button color="primary" onClick={() => {
                                                            toggle();
                                                            window.location.reload();
                                                        }}>
                                                            Close
                                                        </Button>
                                                    </ModalFooter>
                                                </Modal>
                                            </div>
                                            {/* <Row className="mb-3 align-items-center">
                            <Col>
                            <Button variant="primary" onClick={handleStartJob} disabled={!Object.values(selectedRows).some(v => v)}>Start Job</Button>
                            <Button variant="danger" onClick={handleStopJob} className="ml-3" disabled={!isJobRunning || !Object.values(selectedRows).some(v => v)}>Stop Job</Button>
                            </Col>
                        </Row> */}
                                            {/* <Row className="mb-3 align-items-center">
                                                <Col>
                                                    {(isJobRunning) ?

                                                        <Button variant="success" onClick={handleStartJob} disabled={!Object.values(selectedRows).some(v => v)}>Start Job</Button>
                                                        :
                                                        <Button variant="danger" onClick={handleStopJob} className="ml-3" disabled={isJobRunning || !Object.values(selectedRows).some(v => v)}>Stop Job</Button>
                                                    } </Col>
                                            </Row> */}
                                            <Row className="mb-3 align-items-center">
                                                <Form.Group as={Row} className="mb-3">
                                                    {/* <Col md={6}>
                                                        <Form.Label>Search by Job Number</Form.Label>
                                                        <InputGroup>
                                                            <InputGroup.Text style={{ cursor: 'pointer', color: 'grey', backgroundColor: 'white', borderRight: 'none' }}>
                                                                <FaSearch />
                                                            </InputGroup.Text>
                                                            <Form.Control
                                                                type="text"
                                                                placeholder="Enter job Number"
                                                                value={searchTerm}
                                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                                style={{ width: '100%', borderLeft: 'none' }}
                                                            />
                                                        </InputGroup>
                                                    </Col> */}
                                                    {/* <Col md={6}>
                                                        <Form.Label>Search by Media</Form.Label>
                                                        <InputGroup>
                                                            <InputGroup.Text style={{ cursor: 'pointer', color: 'grey', backgroundColor: 'white', borderRight: 'none' }}>
                                                                <FaSearch />
                                                            </InputGroup.Text>
                                                            <Form.Control
                                                                type="text"
                                                                placeholder="Enter media name"
                                                                value={mediaSearchTerm}
                                                                onChange={(e) => setMediaSearchTerm(e.target.value)}
                                                                style={{ width: '100%', borderLeft: 'none' }}
                                                            />
                                                        </InputGroup>
                                                    </Col> */}
                                                </Form.Group>
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
                                            <div>
                                                {showNotification && (
                                                    <Notification
                                                        headline="Deadline Alert!"
                                                        message={notificationMessage}
                                                        onClose={handleCloseNotification}
                                                        show={showNotification}
                                                        containerBg="rgba(231, 116, 116, 0.445)"
                                                        bgColor="red"
                                                        headerColor="#ff5b68"
                                                    />
                                                )}
                                            </div>

                                            <div>
                                                {showNotification2 && (
                                                    <Notification2
                                                        headline="Deadline Alert!"
                                                        message={notificationMessage2}
                                                        onClose={handleCloseNotification2}
                                                        show={showNotification2}
                                                        containerBg="rgba(116, 143, 231, 0.445)"
                                                        bgColor="blue"
                                                        headerColor="#5b79ff"
                                                    />
                                                )}
                                            </div>
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