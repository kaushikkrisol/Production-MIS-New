import React, { useState, useEffect, useMemo } from 'react';
import { Link } from "react-router-dom";
import { Table, Form, Row, Col, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import config from '../../../config';
import 'bootstrap/dist/css/bootstrap.min.css';
import { all_routes } from "../../../Router/all_routes";
import './Delivery.css';
import { FaSyncAlt, FaSearch } from 'react-icons/fa';
import Sort from '../ui/Sort';
import './implementation.css';
import Notification from '../../Notification/Notification';

const Implementation = () => {
    // const [BulkAdd, setBulkAdd] = useState(false);
    // const [headers, setHeaders] = useState([]);
    const [data, setData] = useState([]);
    const [locationAccData, setLocationAccData] = useState([]);

    console.log(data);

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

    const [username, setUsername] = useState('');
    const [locationId, setLocationId] = useState('');

    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'ascending' });

    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');

    // Check if users data exists and is not null
    useEffect(() => {
        const users = localStorage.getItem('users');

        // Check if users data exists and is not null
        if (users) {
            // Parse the JSON string into an object
            const usersObject = JSON.parse(users);

            // Access the username
            const username = usersObject.message && usersObject.message.username;
            setUsername(username);

            const locationid = usersObject.message && usersObject.message.location_id;
            setLocationId(locationid);

            // Log the username to the console
            console.log('Username:', username);
        } else {
            console.log('No user data found in localStorage.');
        }
    }, []);

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

    const fetchImplementationAccToLocation = async () => {
        const payload = {
            locationId: locationId,
            username: username,
        }
        try {
            const response = await axios.post(config.Implementation.URL.GetAllImplementationAccToLocation, payload);
            setLocationAccData(response.data);
            console.log("Implementation response acc to location: ", response.data);
        } catch (error) {
            console.error("Error fetching implementation data: ", error);
        }
    }


    useEffect(() => {
        fetchImplementationJobs();
        fetchImplementationAccToLocation();
    }, [locationId, username]);

    useEffect(() => {
        if (Array.isArray(locationAccData)) { // Check if data is an array
            const totals = locationAccData.reduce((acc, row) => {
                acc.width += parseInt(row.width) || 0;
                acc.height += parseInt(row.height) || 0;
                return acc;
            }, { width: 0, height: 0 });

            setTotalValues(totals);
        }
    }, [locationAccData]);

    useEffect(() => {
        const getUserNames = async () => {
            try {
                const response = await axios.get(config.User.URL.GetAllUserrole);
                // setUser(response.data);
                console.log('user name: ', response.data);
            } catch (error) {
                console.error('Failed to fetch users', error);
            }
        };
        getUserNames();
    }, []);

    useEffect(() => {
        const handleGetUsernameAccLocation = async () => {
            const payload = {
                locationId: locationId,
            }
            try {
                const response = await axios.post(config.User.URL.GetAllUserAccToLocation, payload);
                console.log('users acc to location: ', response.data);
                // setUserAccToLoc(response.data);
                setUser(response.data);

            } catch (error) {
                console.error("Error fetching user names according to location ", error);
            }
        };
        handleGetUsernameAccLocation();
    }, [locationId]);


    const filteredData1 = Array.isArray(locationAccData) ? locationAccData.filter(row =>
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

    const handleNameChange = (e) => {
        const username = e.target.value;
        setName(username);
        // const selectedName = user.find(u => u.username === username);
        // console.log("Selected Name: ", selectedName);
        setNewName(e.target.value);
    };

    console.log('new name: ', name);

    const uniqueNames = [...new Set(user.map((u) => u))];

  const handleCheckboxChange = (id) => {
    setSelectedRows(prev => ({
        ...prev,
        [id]: !prev[id]
    }));
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
                lstupateby: username,
                username: username,
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
            window.location.reload();
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

    useEffect(() => {
        const checkDeadlines = () => {
            const now = new Date();
            const message = [];
            console.log('now: ', now);

            data.forEach(job => {
                const Deadline = new Date(job.deadline);
                const csName = job.userName;
                const timeUntilDeadline = Deadline - now;

                console.log('design deadline: ', job);
                console.log('design deadline: ', Deadline);

                if (!job.isCompleted && timeUntilDeadline > 0 && timeUntilDeadline <= 8 * 60 * 60 * 1000) {
                    const totalHours = Math.floor(timeUntilDeadline / (1000 * 60 * 60));
                    const totalMinutes = Math.floor((timeUntilDeadline % (1000 * 60 * 60)) / (1000 * 60));
                    const totalSeconds = Math.floor((timeUntilDeadline % (1000 * 60)) / 1000);

                    message.push(`Job No: ${job.jobNo}, CS Name: ${csName}'s deadline is approaching in: ${totalHours}h ${totalMinutes}m ${totalSeconds}s`);
                }
            });

            if (message.length > 0) {
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
        const interval = setInterval(checkDeadlines, 500000);
        return () => clearInterval(interval);
    }, [data]);

    const handleCloseNotification = () => {
        setShowNotification(false);
    }

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
                                                {/* <Col xs={2}>
                                                    <Form.Group controlId="formImplementationBy">
                                                        <Form.Label style={{ width: '200px' }}>Implementation From</Form.Label>
                                                        <Form.Control
                                                            type='text'
                                                            value={implementationBy}
                                                            onChange={(e) => setImplementationBy(e.target.value)}
                                                        />

                                                    </Form.Group>
                                                </Col> */}
                                                <Col xs={2}>
                                                    <Form.Group>
                                                        <Form.Label style={{ width: '200px' }}>Assigned Name</Form.Label>
                                                        <Form.Select
                                                            value={name}
                                                            onChange={handleNameChange}
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
                                                        <Form.Label style={{ width: '200px' }}>Assigned Date</Form.Label>
                                                        <Form.Control
                                                            type="date"
                                                            value={implementationDate}
                                                            onChange={(e) => setImplementationDate(e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                {/* <Col xs={2}>
                                                    <Form.Group controlId="formImplementationTo">
                                                        <Form.Label style={{ width: '200px', marginTop: '3em' }}>Implementation To</Form.Label>
                                                        <Form.Control
                                                            as="textarea"
                                                            rows={3}
                                                            value={implementationTo}
                                                            onChange={(e) => setImplementationTo(e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col> */}

                                                <Col>
                                                    <Button type="submit" variant="primary" style={{ cursor: 'pointer', marginTop: '2em' }} onClick={(e) => handleAddImplementationJob(e)}>Add</Button>
                                                </Col>
                                                <Col>
                                                    <FaSyncAlt size={20} style={{ cursor: 'pointer', marginLeft: '15em', marginTop: '1em' }} onClick={() => window.location.reload()} />
                                                </Col>
                                            </Row>
                                        </Form>
                                    </div>

                                    <Form.Group className="mb-3 mt-3">
                                    <InputGroup>
                                            <InputGroup.Text style={{ cursor: 'pointer', color: 'grey', backgroundColor: 'white', borderRight: 'none' }}>
                                                <FaSearch />
                                            </InputGroup.Text>
                                            <Form.Control
                                                type="text"
                                                placeholder="Search by Job No"
                                                value={searchTerm}
                                                style={{ borderLeft: 'none' }}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                    </InputGroup>
                                    </Form.Group>
                                    <div style={{ overflowX: 'auto' }} className='table-container'>
                                        <Table striped bordered hover>
                                            <thead className='sticky-header'>
                                                <tr>
                                                    <th><Form.Check
                                                        type="checkbox"
                                                        onChange={handleSelectAllChange}
                                                        checked={filteredData1.length > 0 && filteredData1.every(row => selectedRows[row.id])}
                                                    /></th>
                                                    <th><Sort sortKey="date" thead="Job Date" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                    <th><Sort sortKey="jobNo" thead="Job ID" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                    <th><Sort sortKey="client" thead="Client Name" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                    <th><Sort sortKey="userName" thead="Account Manager" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                    <th><Sort sortKey="subClient" thead="Sub Client" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                    <th>Quantity</th>
                                                    <th><Sort sortKey="media" thead="Media" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                    <th><Sort sortKey="mounting" thead="Mounting" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                    <th><Sort sortKey="salonAddress" thead="Salon / Store Address" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                    <th><Sort sortKey="deadline" thead="Job Deadline" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                    <th><Sort sortKey="implementation" thead="Implementation" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                    <th>Width</th>
                                                    <th>Length</th>
                                                    <th>Total Sq Ft</th>
                                                    <th>Implementation End Time</th>
                                                    <th>Assigned To</th>
                                                    <th>Assigned Date</th>
                                                    <th>Remark</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedData.length > 0 ? (
                                                    sortedData.map((row) => (
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
                                                            <td>{row.client}</td>
                                                            <td>{row.userName}</td>
                                                            <td>{row.subClient}</td>
                                                            <td>{row.qty}</td>
                                                            <td>{row.media}</td>
                                                            <td>{row.mounting}</td>
                                                            <td>{row.salonAddress}</td>
                                                            <td>{row.deadline}</td>
                                                            <td>{row.implementation}</td>
                                                            <td>{parseFloat(row.width || 0).toFixed(2)}</td>
                                                            <td>{parseFloat(row.height || 0).toFixed(2)}</td>
                                                            <td>{parseFloat(row.totalSqFt || 0).toFixed(2)}</td>
                                                            <td>{'-'}</td>
                                                            <td>{row.assignName || '-'}</td>
                                                            <td>{row.implementationDate || '-'}</td>
                                                            <td>{row.remarks}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="10" className="text-center">No results found</td>
                                                    </tr>
                                                )}
                                                {/* Row for displaying total values */}
                                                <tr>
                                                    <td colSpan="11" className="text-center"><strong>Total</strong></td>
                                                    <td><strong>{totalValues.width}</strong></td>
                                                    <td><strong>{totalValues.height}</strong></td>
                                                    <td colSpan="10"></td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>
                                </div>
                                <div>
                                    {showNotification && (
                                        <Notification
                                            headline="Deadline Alert!"
                                            message={notificationMessage}
                                            onClose={handleCloseNotification}
                                            show={showNotification}
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
    );
};

export default Implementation;