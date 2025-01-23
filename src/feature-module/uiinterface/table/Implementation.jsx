import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { Table, Form, Row, Col, Button, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import config from '../../../config';
import 'bootstrap/dist/css/bootstrap.min.css';
import { all_routes } from "../../../Router/all_routes";
import './Delivery.css';

const Implementation = () => {
    // const [BulkAdd, setBulkAdd] = useState(false);
    // const [headers, setHeaders] = useState([]);
    const [data, setData] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    // const [selectedRows, setSelectedRows] = useState({});
    // const [isJobRunning, setIsJobRunning] = useState(false); // Job status
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [totalValues, setTotalValues] = useState({ width: 0, height: 0 });
    // const [isJobRunning, setIsJobRunning] = useState(true);
    // console.log(setIsJobRunning);

    const [implementationBy, setImplementationBy] = useState('');
    const [name, setName] = useState('');
    const [newName, setNewName] = useState('');
    console.log(newName);
    const [user, setUser] = useState([]);
    const [implementationDate, setImplementationDate] = useState('');
    const [implementationTo, setImplementationTo] = useState('');

    console.log(setImplementationBy, setImplementationDate, setImplementationTo);

    const [selectedRows, setSelectedRows] = useState({});
    const [isJobRunning, setIsJobRunning] = useState(true);

    const [printingData, setPrintingData] = useState([]);
    console.log(setPrintingData);
    console.log(printingData, isJobRunning);
    console.log('user name selected: ', name.username);

    const fetchImplementationJobs = async () => {
        try {
            const response = await axios.post(config.Implementation.URL.GetallImplementation, {
                headers: {
                    'Content-Type': 'application/json' // Ensure the correct content type
                }
            });

            console.log("Data fetched successfully: ", response.data);
            setData(response.data);
            if (Array.isArray(response.data) && response.data.length > 0) {
                setData(response.data); // This should set jobs specific to the user
            } else {
                setData([]); // No jobs found for the user
            }

        } catch (error) {
            console.error("Error fetching job data:", error.response ? error.response.data : error.message);
            setError("Error fetching job data");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchImplementationJobs();
    }, []);

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

    useEffect(() => {
        const getUserNames = async () => {
            try {
                const response = await axios.get(config.User.URL.GetAllUserrole);
                setUser(response.data);
                console.log('user name: ', response.data);
            } catch (error) {
                console.error('Failed to fetch users', error);
            }
        };
        getUserNames();
    }, []);


    const filteredData1 = Array.isArray(data) ? data.filter(row =>
        row.jobNo && row.jobNo.toLowerCase().includes(searchTerm.trim().toLowerCase())
    ) : [];

    console.log('Filtered data: ', filteredData1);

    const resetForm = () => {
        setImplementationBy('');
        setImplementationDate('');
        setImplementationTo('');
        setName('');
    };
    console.log(resetForm);

    const handleNameChange = (username) => {
        setName(username);
        const selectedName = user.find(u => u.username === username);
        console.log("Selected Name: ", selectedName);
        setNewName(selectedName ? selectedName.client : '');
    };

    console.log('new name: ', name);

    const uniqueNames = [...new Set(user.map((u) => u.username))];

    const handleCheckboxChange = (id) => {
        setSelectedRows(prev => {
            const newSelectedRows = { ...prev, [id]: !prev[id] };
            filteredData1.forEach(job => {
                newSelectedRows[job.productionid] = true;
            });

            console.log('prev', prev);
            console.log("Current selected rows state:", newSelectedRows);
            return newSelectedRows;
        });
        console.log("After change:", { ...selectedRows, [id]: !selectedRows[id] });
        console.log('Selected rows ', selectedRows);

        console.log(`Production id: ${id}`);
    };

    const handleSelectAllChange = (e) => {
        const isChecked = e.target.checked;
        const newSelectedRows = {};
        filteredData1.forEach(row => {
            if (!row.isCompleted) {
                newSelectedRows[row.id] = isChecked;
            }
        });
        setSelectedRows(newSelectedRows);
        console.log('select all', newSelectedRows);
    };

    const handleAddImplementationJob = async (e) => {
        e.preventDefault();

        console.log("Name selected for assignment: ", name);

        const selectedJobs = filteredData1
            .filter(row => selectedRows[row.id])  // Filter to only include selected jobs
            .map(row => ({
                id: row.id,
                productionid: row.productionid,
                jobNo: row.jobNo,                // Job Number
                clientName: row.client,
                subClient: row.subClient,
                date: row.date,
                userName: row.userName,          // User Name
                location: row.region,          // Location
                visualCode: row.visualCode,      // Visual Code
                nameSubCode: row.nameSubCode,    // Name Sub Code
                city: row.city,                  // City
                qty: row.qty,          // Quantity
                media: row.media,                // Media
                lamination: row.lamination,      // Lamination
                mounting: row.mounting,          // Mounting
                // implementation: row.implementation,  // Implementation
                salonAddress: row.salonAddress,  // Salon Address
                dispatchAddress: row.dispatchAddress, // Dispatch Address
                deadline: row.deadline,          // Deadline
                remarks: row.remarks,            // Remarks
                actCompleteTime: row.actCompleteTime,  // Actual Completion Time
                onTimeDelayed: row.onTimeDelayed, // On Time or Delayed status
                enteredby: row.enteredby,        // Entered By
                entereddt: row.entereddt,    // Entered Date
                lstupdatedt: row.lstupdatedt,  // Last Updated By
                width: row.width,                // Width
                height: row.height,              // Height
                totalSqFt: row.totalSqFt,        // Total Square Footage
                implementationBy: implementationBy,
                implementationDate: implementationDate,
                implementationTo: implementationTo,
                assignName: name,
            }));

        console.log("Start Job Data:", selectedJobs);


        setLoading(true);
        try {
            const response = await axios.post(config.Implementation.URL.AddImplementation, selectedJobs);
            console.log("printing data: ", response.data);
            if (response.status === 200) {
                console.log("Start Data submitted successfully: ", response.data);

                setData([[]]);

                setData(response.data);

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
            setIsJobRunning(false);

        } catch (error) {
            handleError(error);
        } finally {
            setLoading(false);
        }
    }

    const handleError = (error) => {
        if (axios.isAxiosError(error)) {
            console.error("Axios error: ", error.message);
            setError(error.response ? error.response.data : "An unexpected error occurred");
        } else {
            console.error("Unexpected error: ", error);
            setError("An unexpected error occurred");
        }
    };

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

                                    {error && <Alert variant="danger">{error}</Alert>}
                                    {loading && <Spinner animation="border" className="d-block mx-auto" />}

                                    <Row className="mb-3 align-items-center">
                                        {/* <Col>
                                            {(isJobRunning) ?

                                                <Button variant="success" onClick={handleStartJob} disabled={!Object.values(selectedRows).some(v => v)}>Start Job</Button>
                                                :
                                                <Button variant="danger" onClick={handleStopJob} className="ml-3" disabled={isJobRunning || !Object.values(selectedRows).some(v => v)}>Stop Job</Button>
                                            } </Col> */}
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
                                    <div style={{ overflowX: 'auto' }}>
                                        <Form className="mb-3">
                                            <Row className="mb-3 align-items-center">
                                                <Col xs={2}>
                                                    <Form.Group controlId="formImplementationBy">
                                                        <Form.Label style={{ width: '200px' }}>Implementation From</Form.Label>
                                                        <Form.Control
                                                            type='text'
                                                            value={implementationBy}
                                                            onChange={(e) => setImplementationBy(e.target.value)}
                                                        />

                                                    </Form.Group>
                                                </Col>
                                                <Col xs={2}>
                                                    <Form.Group>
                                                        <Form.Label style={{ width: '200px' }}>Name</Form.Label>
                                                        <Form.Select
                                                            value={name}
                                                            onChange={(e) => handleNameChange(e.target.value)}
                                                            required
                                                        >
                                                            <option value="">Select Name</option>
                                                            {uniqueNames.map((usern, index) => (
                                                                <option key={index} value={usern}>{usern}</option>
                                                            ))}
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col xs={2}>
                                                    <Form.Group controlId="formImplementationDate">
                                                        <Form.Label style={{ width: '200px' }}>Implementation Date</Form.Label>
                                                        <Form.Control
                                                            type="date"
                                                            value={implementationDate}
                                                            onChange={(e) => setImplementationDate(e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col xs={2}>
                                                    <Form.Group controlId="formImplementationTo">
                                                        <Form.Label style={{ width: '200px' }}>Implementation To</Form.Label>
                                                        <Form.Control
                                                            as="textarea"
                                                            rows={3}
                                                            value={implementationTo}
                                                            onChange={(e) => setImplementationTo(e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>

                                                <Col>
                                                    <Button type="submit" variant="primary" onClick={(e) => handleAddImplementationJob(e)}>Add</Button>
                                                </Col>
                                            </Row>
                                        </Form>
                                    </div>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Search by Job No</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Enter job number"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </Form.Group>
                                    <div style={{ overflowX: 'auto' }}>
                                        <Table striped bordered hover>
                                            <thead>
                                                <tr>
                                                    <th><Form.Check
                                                        type="checkbox"
                                                        onChange={handleSelectAllChange}
                                                        checked={filteredData1.length > 0 && filteredData1.every(row => selectedRows[row.id])}
                                                    /></th>
                                                    <th>Date</th>
                                                    <th>Job ID</th>
                                                    <th>Client Name</th>
                                                    <th>CS Name</th>
                                                    <th>Location</th>
                                                    <th>Implementation</th>
                                                    <th>Sub Client</th>
                                                    
                                                    <th>Visual Code</th>
                                                    <th>Name Sub Code</th>
                                                    <th>City</th>
                                                    <th>Quantity</th>
                                                    <th>Media</th>
                                                    <th>Lamination</th>
                                                    <th>Mounting</th>
                                                    <th>Salon Address</th>
                                                    {/* <th>Dispatch Address</th> */}
                                                    <th>Deadline</th>
                                                    <th>Remark</th>
                                                    <th>Actual Complete Time</th>
                                                    <th>On Time Delayed</th>
                                                    {/* <th>Entered By</th>
                                                    <th>Entered Date</th>
                                                    <th>Last Update By</th>
                                                    <th>Last Updated By</th> */}
                                                    <th>Width</th>
                                                    <th>Height</th>
                                                    <th>Total Sq Ft</th>
                                                    <th>Impl Name</th>
                                                    <th>Implementation Start Date & Time</th>
                                                    <th>Implementation End Date & Time</th>
                                                    <th>Assigned To</th>
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
                                                            <td>
                                                                {row.date}
                                                            </td>
                                                            <td>{row.jobNo}</td>
                                                            <td>
                                                                {row.client}
                                                            </td>
                                                            <td>{row.userName}</td>
                                                            <td>{row.region}</td>
                                                            <td>{row.installation}</td>
                                                            
                                                            <td>{row.subClient}</td>
                                                            
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
                                                            <td>{row.media}</td>
                                                            <td>{row.lamination}</td>
                                                            <td>{row.mounting}</td>
                                                            <td>{row.salonAddress}</td>
                                                            {/* <td>{row.dispatchAddress}</td> */}
                                                            <td>{row.deadline}</td>
                                                            <td>{row.remarks}</td>
                                                            <td>{row.actCompleteTime}</td>
                                                            <td>{row.onTimeDelayed}</td>
                                                            {/* <td>{row.enteredby}</td>
                                                            <td>{row.entereddt}</td>
                                                            <td>{row.lstupateby}</td>
                                                            <td>{row.lstupdatedt}</td> */}
                                                            <td>
                                                                {row.width}
                                                            </td>
                                                            <td>
                                                                {row.height}
                                                            </td>
                                                            <td>{row.totalSqFt}</td>
                                                            <td>{row.implementationBy || '-'}</td>
                                                            <td>{row.implementationDate || '-'}</td>
                                                            <td>{row.implementationTo || '-'}</td>
                                                            <td>{row.assignName || '-'}</td>
                                                            {/* <td>{row.startdate || '-'}</td>
                                                            <td>{row.enddate || '-'}</td> */}
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
                                                    <td colSpan="20" className="text-center"><strong>Total</strong></td>
                                                    <td><strong>{totalValues.width}</strong></td>
                                                    <td><strong>{totalValues.height}</strong></td>
                                                    <td colSpan="10"></td>
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

export default Implementation;