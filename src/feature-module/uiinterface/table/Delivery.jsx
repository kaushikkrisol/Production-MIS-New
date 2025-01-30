import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { Table, Form, Row, Col, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import config from '../../../config';
import 'bootstrap/dist/css/bootstrap.min.css';
import { all_routes } from "../../../Router/all_routes";
import { FaSyncAlt, FaSearch } from 'react-icons/fa';
import './Delivery.css';

const Delivery = () => {
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

    const [deliveryBy, setDeliveryBy] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [deliveryOutDate, setDeliveryOutDate] = useState('');
    const [handTempoDelivery, setHandTempoDelivery] = useState('');
    const [deliveryTo, setDeliveryTo] = useState('');

    console.log(setDeliveryBy, setDeliveryDate, setDeliveryTo);

    const [selectedRows, setSelectedRows] = useState({});
    const [isJobRunning, setIsJobRunning] = useState(true);

    const [printingData, setPrintingData] = useState([]);
    console.log(setPrintingData);
    console.log(printingData, isJobRunning, totalValues);
    const [user, setUser] = useState('');
    const currentDate = new Date().toISOString().split('T')[0];
    const [enteredBy, setEnteredBy] = useState('');
    const [deliverPersonName, setDeliveryPersonName] = useState([]);
    const [deliverPersonNameSelect, setDeliveryPersonNameSelect] = useState('');
    const [newDeliveryPersonName, setNewDeliveryPersonName] = useState('');

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
            console.log('Username:', username);
        } else {
            console.log('No user data found in localStorage.');
        }
    }, []);

    const fetchDeliveryJobs = async () => {
        try { 
            const response = await axios.post(config.Delivery.URL.Getalldelivery, { 
                headers: {
                    'Content-Type': 'application/json' // Ensure the correct content type
                }
            });

            console.log("Data fetched successfully: ", response.data);
            setData(response.data);
            console.log(setEnteredBy, enteredBy);

            if (Array.isArray(response.data) && response.data.length > 0) {
                setData(response.data); // This should set jobs specific to the user
                const enteredBy = response.data[0].enteredby;
                setEnteredBy(enteredBy);
                console.log("enteredBy", enteredBy)
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
        fetchDeliveryJobs();
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


    const filteredData1 = Array.isArray(data) ? data.filter(row =>
        row.jobNo && row.jobNo.toLowerCase().includes(searchTerm.trim().toLowerCase())
    ) : [];

    console.log('Filtered data: ', filteredData1);

    const resetForm = () => {
        setDeliveryBy('');
        setDeliveryDate('');
        setDeliveryTo('');
        setHandTempoDelivery('');
    };
    console.log(resetForm, deliveryTo);

    
    const handleCheckboxChange = (id) => {
        setSelectedRows(prev => {
            const newSelectedRows = { ...prev, [id]: !prev[id] };
            filteredData1.forEach(job => {
                newSelectedRows[job.productionid] = true; // Mark the job as selected
            });

            console.log('prev', prev);
            console.log("Current selected rows state:", newSelectedRows); // Log the new state after change
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

    const handleAddDeliveryJob = async (e) => {
        e.preventDefault();

        const selectedJobs = filteredData1
            .filter(row => selectedRows[row.id])
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
                onTimeDelayed: row.onTimeDelayed, // On Time or Delayed status     // Entered By
                entereddt: row.entereddt,    // Entered Date
                lstupdatedt: currentDate,  // Last Updated By
                lstupateby: user,
                user: user,
                width: row.width,                // Width
                height: row.height,              // Height
                totalSqFt: row.totalSqFt,        // Total Square Footage
                deliveryBy: deliveryBy,
                deliveryDate: deliveryDate,
                deliveryOutDate: deliveryOutDate,
                deliveryTo: deliverPersonNameSelect,
                handTempoDelivery: handTempoDelivery,
            }));

        console.log("Start Job Data:", selectedJobs);


        setLoading(true);
        try {

            const response = await axios.post(config.Delivery.URL.AddDelivery, selectedJobs);
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

    useEffect(() => {
        const getUserNames = async () => {
            try {
                const response = await axios.get(config.User.URL.GetAllUserrole);
                setDeliveryPersonName(response.data);
                console.log('Deliv person name', response.data);
            } catch (error) {
                console.error('Failed to fetch users ', error);
            }
        };
        getUserNames();
    }, []);

    const handleDeliverNameChange = (username) => {
        setDeliveryPersonNameSelect(username);
        const selectedName = deliverPersonName.find(u => u.username === username);
        console.log("Selected Name: ", selectedName);
        setNewDeliveryPersonName(selectedName ? selectedName.client : '');
    }
    console.log('new name: ', deliverPersonNameSelect, newDeliveryPersonName);
    
    const filteredUserNames = [...new Set(deliverPersonName.map((u) => u.username))];

    const handleError = (error) => {
        if (axios.isAxiosError(error)) {
            console.error("Axios error: ", error.message);
            setError(error.response ? error.response.data : "An unexpected error occurred");
        } else {
            console.error("Unexpected error: ", error);
            setError("An unexpected error occurred");
        }
    };
    console.log('selected delivery mode: ', handTempoDelivery);

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
                                                    <Form.Group controlId="formDeliveryBy">
                                                        <Form.Label style={{ width: '200px' }}>Delivery Person</Form.Label>
                                                        <Form.Select
                                                            id='deliverPerson'
                                                            value={deliverPersonNameSelect}
                                                            onChange={(e) => handleDeliverNameChange(e.target.value)}
                                                            required
                                                        >
                                                        <option value="">Select Delivery Person</option>
                                                        {
                                                                filteredUserNames.map((user, index) => (
                                                                    <option key={index} value={user}>{user}</option>
                                                                ))
                                                        }
                                                        </Form.Select>

                                                    </Form.Group>
                                                </Col>
                                                <Col xs={2}>
                                                    <Form.Group controlId="formDeliveryInDate">
                                                        <Form.Label style={{ width: '200px' }}>Delivery In Time</Form.Label>
                                                        <Form.Control
                                                            type="datetime-local"
                                                            value={deliveryDate}
                                                            onChange={(e) => setDeliveryDate(e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col xs={2}>
                                                    <Form.Group controlId="formDeliveryOutDate">
                                                        <Form.Label style={{ width: '200px' }}>Delivery Out Time</Form.Label>
                                                        <Form.Control
                                                            type="datetime-local"
                                                            value={deliveryOutDate}
                                                            onChange={(e) => setDeliveryOutDate(e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                {/* <Col xs={2}>
                                                    <Form.Group controlId="formDeliveryTo">
                                                        <Form.Label style={{ width: '200px' }}>Delivery To</Form.Label>
                                                        <Form.Control
                                                            as="textarea"
                                                            rows={3}
                                                            value={deliveryTo}
                                                            onChange={(e) => setDeliveryTo(e.target.value)}
                                                        />
                                                    </Form.Group>
                                                </Col> */}
                                                <Col xs={2}>
                                                    <Form.Group controlId="formhandTempoDelivery">
                                                        <Form.Label style={{ width: '200px' }}>Delivery Mode</Form.Label>
                                                        <Form.Select
                                                            type='text'
                                                            value={handTempoDelivery}
                                                            onChange={(e) => setHandTempoDelivery(e.target.value)}
                                                        >
                                                            <option value="">Select Delivery Mode</option>
                                                            <option value="Hand Pick Up">Hand Pick Up</option>
                                                            <option value="Customer Pick Up">Customer Pick Up</option>
                                                            <option value="Courier Service">Courier Service</option>
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col style={{ marginTop: '25px' }}>
                                                    <Button type="submit" variant="primary" onClick={(e) => handleAddDeliveryJob(e)}>Add</Button>
                                                </Col>
                                                <Col style={{ marginTop: '15px', marginLeft: '28em' }}>
                                                    <FaSyncAlt size={20} style={{ cursor: 'pointer' }} onClick={() => window.location.reload()}/> 
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
                                                placeholder="Search job number"
                                                style={{ borderLeft: 'none' }}
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                    </InputGroup>
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
                                                    <th>Location</th>
                                                    {/* <th>Sub Client</th>
                                                    <th>CS Name</th>
                                                    <th>Visual Code</th>
                                                    <th>Name Sub Code</th>
                                                    <th>City</th>
                                                    <th>Quantity</th>
                                                    <th>Media</th>
                                                    <th>Lamination</th>
                                                    <th>Mounting</th> */}
                                                    {/* <th>Implementation</th> */}
                                                    {/* <th>Salon Address</th> */}
                                                    {/* <th>Dispatch Address</th> */}
                                                    {/* <th>Deadline</th>
                                                    <th>Remarks</th>
                                                    <th>Actual Complete Time</th>
                                                    <th>On Time Delayed</th> */}
                                                    {/* <th>Entered By</th>
                                                    <th>Entered Date</th>
                                                    <th>Last Update By</th>
                                                    <th>Last Updated By</th> */}
                                                    {/* <th>Width</th>
                                                    <th>Height</th>
                                                    <th>Total Sq Ft</th> */}
                                                    <th>Delivery Person</th>
                                                    <th>Delivery Out Time</th>
                                                    <th>Delivery In Time</th>
                                                    <th>Delivery Mode</th>
                                                    {/* <th>Delivery To</th> */}
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
                                                            {/* <td>{row.subClient}</td> */}
                                                            <td>{row.region}</td>
                                                            {/* <td>{row.userName}</td>                                                            <td>
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
                                                            <td>{row.mounting}</td> */}
                                                            {/* <td>{row.implementation}</td> */}
                                                            {/* <td>{row.salonAddress}</td> */}
                                                            {/* <td>{row.dispatchAddress}</td> */}
                                                            {/* <td>{row.deadline}</td>
                                                            <td>{row.remarks}</td>
                                                            <td>{row.actCompleteTime}</td>
                                                            <td>{row.onTimeDelayed}</td> */}
                                                            {/* <td>{row.enteredby}</td>
                                                            <td>{row.entereddt}</td>
                                                            <td>{row.lstupateby}</td>
                                                            <td>{row.lstupdatedt}</td> */}
                                                            {/* <td>
                                                                {row.width}
                                                            </td>
                                                            <td>
                                                                {row.height}
                                                            </td>
                                                            <td>{row.totalSqFt}</td> */}
                                                            <td>{row.deliveryBy || '-'}</td>
                                                            <td>{row.deliveryDate || '-'}</td>
                                                            <td>{row.deliveryOutDate || '-'}</td>
                                                            <td>{row.handTempoDelivery || '-'}</td>
                                                            {/* <td>{row.deliveryTo || '-'}</td> */}
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
                                                        <td colSpan="8" className="text-center">No results found</td>
                                                    </tr>
                                                )}
                                                {/* Row for displaying total values */}
                                                {/* <tr>
                                                    <td colSpan="8" className="text-center"><strong>Total</strong></td>
                                                    <td><strong>{totalValues.width}</strong></td>
                                                    <td><strong>{totalValues.height}</strong></td>
                                                    <td colSpan="10"></td>
                                                </tr> */}
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

export default Delivery;