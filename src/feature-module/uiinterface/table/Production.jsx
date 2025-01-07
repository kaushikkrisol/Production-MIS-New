import React, { useState, useEffect, useCallback } from 'react';
import { Link } from "react-router-dom";
import { Table, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Modal, ModalBody, ModalHeader, Table as ExcelTable } from 'reactstrap';
import config from '../../../config';
import 'bootstrap/dist/css/bootstrap.min.css';
import { all_routes } from "../../../Router/all_routes";
import './Production.css';

const Production = () => {
    const [BulkAdd, setBulkAdd] = useState(false);
    const [headers, setHeaders] = useState([]);
    const [data, setData] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [mediaSearchTerm, setMediaSearchTerm] = useState('');
    // const [selectedRows, setSelectedRows] = useState({});
    // const [isJobRunning, setIsJobRunning] = useState(false); // Job status
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [totalValues, setTotalValues] = useState({ width: 0, height: 0, totalSqFt: 0 });
    // const [isJobRunning, setIsJobRunning] = useState(true);
    // console.log(setIsJobRunning);

    const [userId, setUserId] = useState(null);
    const [username, setUsername] = useState('');
    
    console.log(userId, username);

    const [selectedRows, setSelectedRows] = useState({});
    const [isJobRunning, setIsJobRunning] = useState(true);
    // const [hiddenRows, setHiddenRows] = useState([]);

    // const [startDate, setStartDate] = useState([]);
    // const [endDate, setEndDate] = useState([]);

    // console.log(startDate, setStartDate, endDate, setEndDate);

    const [printerName, setPrinterNames] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState([]);
    const [mediaWidth, setMediaWidth] = useState('');
    console.log(printerName);

    const [printingData, setPrintingData] = useState([]);
    const [mediaHeight, setMediaHeight] = useState(0);
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

    useEffect(() => {
        fetchPrinting();
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


    const filteredData1 = Array.isArray(data) && mediaSearchTerm.trim()
        ? data.filter(row =>
            (row.media && row.media.toLowerCase().includes(mediaSearchTerm.trim().toLowerCase())) ||
            (row.jobNo && row.jobNo.toLowerCase().includes(mediaSearchTerm.trim().toLowerCase()))
        )
        : data;


    console.log('Filtered data: ',filteredData1);

    const resetForm = () => {
        setUserId('');
        setUsername('');
        setPrinterNames('');
        setMediaWidth('');
        setMediaHeight('');      
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

        // Prepare the data for the selected jobs
        const selectedJobs = filteredData1
            .filter(row => selectedRows[row.id]) // Include only selected rows
            .map(row => ({
                id: row.id,
                jobNo: row.jobNo, // Job Number
                client: row.client,
                date: row.date,
                userName: username, // User Name
                region: row.region, // Location
                visualCode: row.visualCode, // Visual Code
                nameSubCode: row.nameSubCode, // Name Sub Code
                city: row.city, // City
                qty: row.qty, // Quantity
                media: row.media,
                mediaWidth: mediaWidth, // Updated with state value
                mediaHeight: mediaHeight, // Updated with state value
                printerName: selectedPrinter, // Selected printer
                installation: row.installation,
                deadline: row.deadline,
                lamination: row.lamination, // Lamination
                mounting: row.mounting, // Mounting
                // implementation: row.implementation, // Implementation
                salonAddress: row.salonAddress, // Salon Address
                dispatchAddress: row.dispatchAddress, // Dispatch Address
                remarks: row.remarks, // Remarks
                actualCompleteTime: row.actCompleteTime, // Actual Completion Time
                onTimeDelayed: row.onTimeDelayed, // On Time or Delayed status
                enteredBy: row.enteredby, // Entered By
                enteredDate: row.entereddt, // Entered Date
                lastUpdatedBy: row.lstupdatedt, // Last Updated By
                width: row.width, // Width
                height: row.height, // Height
                totalSqFt: row.totalSqFt, // Total Square Footage
                startdate: new Date().toISOString(), // Start Date for the job
                lastUpdated: new Date().toISOString(), // Timestamp for last update
            }));

        console.log("Payload being sent to Addprintingstart:", JSON.stringify(selectedJobs, null, 2));

        setLoading(true);
        setIsJobRunning(false);
        try {
            // Submit data to the Start Job API
            const response = await axios.post(config.Printing.URL.AddPrintingStart, selectedJobs);
            console.log("Printing data submitted successfully:", response.data);

            if (response.status === 200) {
                // Update the state with the new data
                setData(selectedJobs);

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


    const handleStopJob = async (e) => {
        e.preventDefault();
        console.log('clicked', filteredData1);
        console.log('clicked selected rows', selectedRows);

        const stopData = filteredData1
            .filter(row => selectedRows[row.id]) // Filter to get selected rows
            .map(row => ({
                id: row.id,
                productionid: row.productionid,
                name: row.name,
                enddate: new Date().toISOString(),
                
                // lastUpdated: new Date().toISOString(), // Timestamp for last update
            }));

        console.log("Stop Job Data:", stopData);

        setLoading(true);
        setIsJobRunning(true);

        try {
            const response = await axios.post(config.Printing.URL.AddPrintingStop, stopData);
            console.log(`Printing id with prints: `, stopData);
            if (response.status === 200) {
                console.log("Stop Data submitted successfully:", response.data);
                const updatedData = filteredData1.filter(row => !selectedRows[row.id]);
                setData(updatedData);
                setSelectedRows({});
                
            } else {
                setError("Unexpected response from the server.");
            }
            
            // window.location.reload();
        } catch (error) {
            handleError(error);
        } finally {
            setLoading(false);
            // setIsJobRunning(false);
                     

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

            const selectedTotalSqFt = filteredData1
                .filter(row => newSelectedRows[row.id]) // Only include selected rows
                .reduce((total, row) => total + parseFloat(row.totalSqFt || 0), 0);

            setMediaHeight(selectedTotalSqFt); // Update media height dynamically
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

        const selectedTotalSqFt = isChecked
            ? filteredData1
                .filter(row => !row.isCompleted)
                .reduce((total, row) => total + parseFloat(row.totalSqFt || 0), 0)
            : 0;

        setMediaHeight(selectedTotalSqFt);

        setSelectedRows(newSelectedRows);
        console.log('select all', newSelectedRows);
    };

    const isSelectAllChecked = filteredData1.length > 0 && filteredData1.every(row => row.isCompleted || selectedRows[row.id]);

    const handlePrinterChange = (e) => {
        setSelectedPrinter(e.target.value);  // Update selected printer
    };

    const printerNameSelect = (data.map(data => data.printerName));
    console.log('Printer name', printerNameSelect);

    const filteredPrinterNames = printerNameSelect.filter(arr => Array.isArray(arr) && arr.length > 0);

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
                                            size="xl"
                                            className="border-0"
                                            modalClassName='modal fade zoomIn'
                                            backdrop={'static'}
                                        >
                                            <ModalHeader className="p-3 bg-info-subtle" toggle={toggleBulkAdd}>
                                                Upload Bulk
                                            </ModalHeader>
                                            <ModalBody className="modal-body">
                                                <Row className="g-3">
                                                    <Col>
                                                        <div className="mt-4 pt-2 fs-15 mx-4 mx-sm-5">
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
                                                    <Form.Group controlId="formPrinterName">
                                                        <Form.Label style={{ width: '300px' }}>Printer Name</Form.Label>
                                                        <Form.Select
                                                        id='printerName'
                                                            value={selectedPrinter}
                                                            onChange={handlePrinterChange}
                                                            style={{ width: '200px' }}
                                                        >
                                                            <option value="">Select Printer Name</option>
                                                            {
                                                                filteredPrinterNames.length > 0 ? (
                                                                    filteredPrinterNames.flat().map((printer, index) => (
                                                                        <option key={index} value={printer}>
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
                                                        <Form.Label style={{ width: '200px', marginLeft: '15px' }}>Media Width</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            value={mediaWidth}
                                                            onChange={(e) => setMediaWidth(e.target.value)}
                                                            style={{marginLeft: '15px' }}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col xs={2}>
                                                    <Form.Group controlId="formMediaHeight">
                                                        <Form.Label style={{ width: '200px', marginLeft: '30px' }}>Media Height</Form.Label>
                                                        <Form.Control
                                                            value={mediaHeight}
                                                            style={{ marginLeft: '30px' }}
                                                            readOnly
                                                        >
                                                        
                                                        </Form.Control>
                                                    </Form.Group>
                                                </Col>

                                                <Col>
                                                    {/* <Button type="submit" variant="primary" onClick={(e) => handleAddPrintingJob(e)} style={{ marginLeft: '30px', marginTop: '30px' }}
                                                    >Add</Button> */}
                                                </Col>
                                            </Row>
                                        </Form>
                                    </div>

                                    <Row className="mt-3 mb-3 align-items-center">
                                        <Col>
                                            {(isJobRunning) ?

                                                <Button variant="success" onClick={handleStartJob} disabled={!Object.values(selectedRows).some(v => v)}>Start Job</Button>
                                                :
                                                <Button variant="danger" onClick={handleStopJob} className="ml-3" disabled={isJobRunning || !Object.values(selectedRows).some(v => v)}>Stop Job</Button>
                                            } </Col>
                                    </Row>
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
                                        <Form.Group className="mb-3">
                                            <Form.Label>Search by Job No</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Enter job number"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                style={{ width: '200px' }}
                                            />
                                            <Form.Label>Search by Media</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Enter media name"
                                                value={mediaSearchTerm}
                                                onChange={(e) => setMediaSearchTerm(e.target.value)}
                                                style={{ width: '300px' }}
                                            />
                                        </Form.Group>
                                    </Row>
                                    <div style={{ overflowX: 'auto', position: 'sticky', bottom: 0 }}>
                                        <Table striped bordered hover>
                                            <thead>
                                                <tr>
                                                    <th><Form.Check
                                                        type="checkbox"
                                                        onChange={handleSelectAllChange}
                                                        checked={isSelectAllChecked}
                                                    /></th>
                                                    <th>Job No</th>
                                                    <th>Date</th>
                                                    <th>Client Name</th>
                                                    <th>User Name</th>
                                                    <th>Width</th>
                                                    <th>Height</th>
                                                    <th>Total Sq Ft</th>
                                                    <th>Printer Name</th>
                                                    <th>Location</th>
                                                    <th>Media</th>
                                                    <th>Visual Code</th>
                                                    <th>Name Sub Code</th>
                                                    <th>City</th>
                                                    <th>Quantity</th>
                                                    <th>Media Width</th>
                                                    <th>Media Height</th>
                                                    <th>Installation</th>
                                                    <th>Job Deadline</th>
                                                    <th>Lamination</th>
                                                    <th>Mounting</th>
                                                    {/* <th>Implementation</th> */}
                                                    <th>Salon Address</th>
                                                    <th>Dispatch Address</th>
                                                    <th>Remarks</th>
                                                    <th>Actual Complete Time</th>
                                                    <th>On Time Delayed</th>
                                                    <th>Sub Client</th>
                                                    {/* <th>IP Address</th> */}
                                                    <th>Start Job</th>
                                                    <th>Stop Job</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredData1.length > 0 ? (
                                                    filteredData1.map((row) => (
                                                        <tr key={row.id}>
                                                            <td>
                                                                <Form.Check
                                                                    key={row.id}
                                                                    type="checkbox"
                                                                    checked={!!selectedRows[row.id]}
                                                                    onChange={() => handleCheckboxChange(row.id)}
                                                                    disabled={row.isCompleted}
                                                                />
                                                            </td>
                                                            <td>{row.jobNo}</td>
                                                            <td>
                                                                {row.date}
                                                            </td>
                                                            <td>
                                                                {row.client}
                                                            </td>
                                                            <td>{row.userName}</td>
                                                            <td>
                                                                {row.width}
                                                            </td>
                                                            <td>
                                                                {row.height}
                                                            </td>
                                                            <td>{row.totalSqFt}</td>
                                                            <td>{selectedPrinter}</td>
                                                            <td>{row.region}</td>
                                                            <td>{row.media}</td>
                                                            <td>
                                                                {row.visualCode}
                                                            </td>
                                                            <td>{row.nameSubCode}</td>
                                                            <td>
                                                                {row.city}
                                                            </td>
                                                            <td>
                                                                {row.qty}
                                                            </td>
                                                            <td>
                                                                {isJobRunning ? mediaWidth : row.mediaWidth || '-'}
                                                            </td>
                                                            <td>
                                                                {isJobRunning ? mediaHeight : row.mediaHeight || '-'}
                                                            </td>
                                                            <td>{row.installation}</td>
                                                            <td>{row.deadline}</td>
                                                            <td>{row.lamination}</td>
                                                            <td>{row.mounting}</td>
                                                            {/* <td>{row.implementation}</td> */}
                                                            <td>{row.salonAddress}</td>
                                                            <td>{row.dispatchAddress}</td>
                                                            <td>{row.remarks}</td>
                                                            <td>{row.actCompleteTime}</td>
                                                            <td>{row.onTimeDelayed}</td>
                                                            <td>{row.subClient}</td>
                                                            {/* <td>{row.ipaddress}</td> */}
                                                            <td>{row.startdate || '-'}</td>
                                                            <td>{row.enddate || '-'}</td>
                                                            {/* <td>{row.startJobTime || '-'}</td>
                              <td>{row.stopJobTime || '-'}</td>
                              <td>
                                {row.startJobTime && row.stopJobTime ?
                                  calculateTotalTime(row.startJobTime, row.stopJobTime) : '-'}
                              </td> */}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="10" className="text-center">No results found</td>
                                                    </tr>
                                                )}
                                                {/* Row for displaying total values */}
                                                <tr>
                                                    <td colSpan="5" className="text-center"><strong>Total</strong></td>
                                                    <td><strong>{totalValues.width}</strong></td>
                                                    <td><strong>{totalValues.height}</strong></td>
                                                    <td><strong>{totalValues.totalSqFt}</strong></td>
                                                    <td colSpan="13"></td>
                                                </tr>
                                            </tbody>
                                        </Table>
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