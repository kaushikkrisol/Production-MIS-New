// Enhanced Implementation.jsx with AG Grid, filtering, pagination, export

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Form, Row, Col, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import config from '../../../config';
import 'bootstrap/dist/css/bootstrap.min.css';
import { all_routes } from '../../../Router/all_routes';
import { FaSyncAlt, FaSearch } from 'react-icons/fa';
import Notification from '../../Notification/Notification';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './DataTables.css'; 


const Implementation = () => {
  const [locationAccData, setLocationAccData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalValues, setTotalValues] = useState({ width: 0, height: 0 });
  const [userList, setUserList] = useState([]);
  const [name, setName] = useState('');
  const [newName, setNewName] = useState('');
  const [username, setUsername] = useState('');
  const [locationId, setLocationId] = useState('');
  const [implementationDate, setImplementationDate] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const gridRef = useRef();

  useEffect(() => {
    const users = localStorage.getItem('users');
    if (users) {
      const usersObject = JSON.parse(users);
      setUsername(usersObject.message?.username || '');
      setLocationId(usersObject.message?.location_id || '');
    }
  }, []);

  useEffect(() => {
    if (locationId && username) {
      fetchImplementationAccToLocation();
    }
  }, [locationId, username]);

  const fetchImplementationAccToLocation = async () => {  
    try {
      setLoading(true);
      const payload = { locationId, username };
      const res = await axios.post(config.Implementation.URL.GetAllImplementationAccToLocation, payload);
      setLocationAccData(res.data);
      const totals = res.data.reduce((acc, row) => {
        acc.width += parseFloat(row.width || 0);
        acc.height += parseFloat(row.height || 0);
        return acc;
      }, { width: 0, height: 0 });
      setTotalValues(totals);
    } catch (err) {
      setError('Failed to fetch implementation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (locationId) {
      axios
        .post(config.User.URL.GetAllUserAccToLocation, { locationId })
        .then(res => setUserList(res.data))
        .catch(console.error);
    }
  }, [locationId]);

  const handleNameChange = (e) => {
    const username = e.target.value;
    setName(username);
    setNewName(username);
  };

 const handleAddImplementationJob = async (e) => {
  e.preventDefault();

  console.log("Name selected for assignment: ", name);

  const selectedRows = gridRef.current.api.getSelectedRows();

  // Optional safeguard: if no rows selected
  if (!selectedRows || selectedRows.length === 0) {
    setError("Please select at least one job.");
    return;
  }

  const jobs = selectedRows.map(row => ({
    id: row.id,
    productionid: row.productionid,
    jobNo: row.jobNo,
    clientName: row.client,
    subClient: row.subClient,
    date: row.date,
    userName: row.userName,
    location: row.region,
    visualCode: row.visualCode,
    nameSubCode: row.nameSubCode,
    city: row.city,
    qty: row.qty,
    media: row.media,
    lamination: row.lamination,
    mounting: row.mounting,
    salonAddress: row.salonAddress,
    dispatchAddress: row.dispatchAddress,
    deadline: row.deadline,
    remarks: row.remarks,
    actCompleteTime: row.actCompleteTime,
    onTimeDelayed: row.onTimeDelayed,
    enteredby: row.enteredby || username,
    entereddt: row.entereddt,
    lstupdatedt: row.lstupdatedt,
    lstupateby: username,
    username: username,
    width: row.width,
    height: row.height,
    totalSqFt: row.totalSqFt,
    implementationBy: row.implementationBy || username,     // fallback
    implementationDate: implementationDate,
    implementationTo: row.implementationTo || '',           // fallback if needed
    assignName: name
  }));

  console.log("Start Job Data:", jobs);

  try {
    setLoading(true);
    const response = await axios.post(config.Implementation.URL.AddImplementation, jobs);
    console.log("printing data: ", response.data);

    if (response.status === 200) {
      console.log("Start Data submitted successfully");
      window.location.reload(); // Or optionally: re-fetch data without reload
    } else {
      setError("Unexpected response from the server.");
    }
  } catch (error) {
    console.error(error);
    setError("Failed to submit implementation job");
  } finally {
    setLoading(false);
  }
};

  const columnDefs = useMemo(() => [
    { checkboxSelection: true, headerCheckboxSelection: true, field: 'jobNo', headerName: 'Job No', filter: true },
    { field: 'client', headerName: 'Client', filter: true ,  minWidth: 160,},
    { field: 'userName', headerName: 'Account Manager', filter: true,  minWidth: 160, },
    { field: 'subClient', headerName: 'Sub Client', filter: true,  minWidth: 160, },
    { field: 'qty', headerName: 'Qty',  minWidth: 160, },
    { field: 'media', headerName: 'Media', filter: true ,  minWidth: 160,},
    { field: 'mounting', headerName: 'Mounting', filter: true,  minWidth: 160, },
    { field: 'salonAddress', headerName: 'Salon / Store Address',  minWidth: 160, filter: true },
    { field: 'deadline', headerName: 'Job Deadline',  minWidth: 160, filter: true },
    { field: 'implementation', headerName: 'Implementation',  minWidth: 160, filter: true },
    { field: 'width',  minWidth: 160, headerName: 'Width' },
    { field: 'height',  minWidth: 160, headerName: 'Length' },
    { field: 'totalSqFt',  minWidth: 160, headerName: 'Total Sq Ft' },
    { field: 'implementationDate',  minWidth: 160, headerName: 'Assigned Date' },
    { field: 'assignName',  minWidth: 160, headerName: 'Assigned To' },
    { field: 'remarks',  minWidth: 160, headerName: 'Remarks', filter: true },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    filter: 'agTextColumnFilter',
    flex: 1,
  }), []);

  const handleExportExcel = () => {
    gridRef.current.api.exportDataAsExcel();
  };

  const handleExportCSV = () => {
    gridRef.current.api.exportDataAsCsv();
  };

  return (
    <div className="p-3">
      <Row className="mb-3" style={{marginTop:'5rem',marginLeft:'15rem'}}>
        <Col>
            <Form.Group>
            <Form.Label style={{ width: '200px' }}>Assigned Name</Form.Label>
          <Form.Select value={name} onChange={handleNameChange}>
            <option value=''>Select Assigned Name</option>
            {[...new Set(userList)].map((u, i) => <option key={i} value={u}>{u}</option>)}
          </Form.Select>
          </Form.Group>
        </Col>
        <Col>
          <Form.Group controlId="formImplementationDate">
            <Form.Label style={{ width: '200px' }}>Assigned Date</Form.Label>
          <Form.Control type='date' value={implementationDate} onChange={(e) => setImplementationDate(e.target.value)} />
            </Form.Group>
        </Col>
        <Col>
           <Button type="submit" variant="primary" style={{ cursor: 'pointer', marginTop: '2em' }} onClick={(e) => handleAddImplementationJob(e)}>Add</Button>
        </Col>
        <Col>
          <Button variant="outline-secondary" onClick={() => window.location.reload()}><FaSyncAlt /></Button>
        </Col>
        <Col>
          <Button onClick={handleExportExcel}>Export Excel</Button>
        </Col>
        <Col>
          <Button onClick={handleExportCSV}>Export CSV</Button>
        </Col>
      </Row>

      {/* <InputGroup className="mb-3">
        <InputGroup.Text><FaSearch /></InputGroup.Text>
        <Form.Control
          type='text'
          placeholder='Search by Job No'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup> */}

      {loading && <Spinner animation='border' />} 
      {error && <Alert variant='danger'>{error}</Alert>}

      <div className='ag-theme-alpine custom-ag-grid' style={{ height: '600px', width: '86%' ,marginLeft:'16rem'}}>
        <AgGridReact
          ref={gridRef}
          rowData={locationAccData.filter(row => row.jobNo?.toLowerCase().includes(searchTerm.toLowerCase()))}
          columnDefs={columnDefs}
          immutableData={true}
          getRowId={params => params.data.id}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={25}
          rowSelection='multiple'
        />
      </div>

      {showNotification && (
        <Notification
          headline='Deadline Alert!'
          message={notificationMessage}
          onClose={() => setShowNotification(false)}
          show={showNotification}
          containerBg='rgba(116, 143, 231, 0.445)'
          bgColor='blue'
          headerColor='#5b79ff'
        />
      )}

      <div className="mt-3 text-end">
        <strong>Total Width:</strong> {totalValues.width} | <strong>Total Height:</strong> {totalValues.height}
      </div>
    </div>
  );
};

export default Implementation;
