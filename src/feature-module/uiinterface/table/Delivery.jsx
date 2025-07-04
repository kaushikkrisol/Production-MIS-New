import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import config from '../../../config';
import { all_routes } from '../../../Router/all_routes';
import { FaSyncAlt, FaSearch } from 'react-icons/fa';
import Notification from '../../Notification/Notification';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './Delivery.css';

const Delivery = () => {
  const [data, setData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [selectedRows, setSelectedRows] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryBy, setDeliveryBy] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryOutDate, setDeliveryOutDate] = useState('');
  const [handTempoDelivery, setHandTempoDelivery] = useState('');
  const [deliverPersonName, setDeliverPersonName] = useState([]);
  const [deliverPersonNameSelect, setDeliverPersonNameSelect] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);

  const gridRef = useRef();

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('users'));
    if (users?.message) {
      setUsername(users.message.username);
      setLocationId(users.message.location_id);
    }
  }, []);

  useEffect(() => {
    if (locationId && username) {
      fetchDeliveryJobs();
      fetchDeliveryByLocation();
    }
  }, [locationId, username]);

  const fetchDeliveryJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.post(config.Delivery.URL.Getalldelivery);
      setData(res.data);
    } catch (err) {
      setError('Error fetching job data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryByLocation = async () => {
    try {
      const payload = { locationId, username };
      const res = await axios.post(config.Delivery.URL.GetAllDeliveryAccToLocation, payload);
      setLocationData(res.data);
    } catch (err) {
      setError('Error fetching location data');
    }
  };

  useEffect(() => {
    axios.post(config.User.URL.GetAllUserAccToLocation, { locationId })
      .then(res => setDeliverPersonName(res.data))
      .catch(console.error);
  }, [locationId]);

  const filteredUserNames = [...new Set(deliverPersonName.map((u) => u))];

  const handleDeliverNameChange = (e) => {
    const name = e.target.value;
    setDeliverPersonNameSelect(name);
  };

  const handleAddDeliveryJob = async (e) => {

    e.preventDefault()

   const selectedJobs = gridRef.current.api.getSelectedRows().map(row => ({
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
    entereddt: row.entereddt,
    lstupdatedt: new Date().toISOString(),
    lstupateby: username,
    user: username,
    width: row.width,
    height: row.height,
    totalSqFt: row.totalSqFt,
    deliveryBy,
    deliveryDate,
    deliveryOutDate,
    deliveryTo: deliverPersonNameSelect,
    handTempoDelivery,
  }));

    try {
      await axios.post(config.Delivery.URL.AddDelivery, selectedJobs);
      window.location.reload();
    } catch (err) {
      setError('Failed to submit jobs');
    }
  };

  const filteredData = useMemo(() => {
    return locationData.filter(row => row.jobNo?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [locationData, searchTerm]);


    const handleSelectionChanged = () => {
    const selected = gridRef.current.api.getSelectedRows();
    setSelectedRows(selected);
  };

  const columnDefs = useMemo(() => [
    { checkboxSelection: true, headerCheckboxSelection: true, field: 'jobNo', headerName: 'Job ID', filter: true },
    { field: 'date', headerName: 'Production Date', filter: true },
    { field: 'client', headerName: 'Client Name', filter: true },
    { field: 'region', headerName: 'Production Location', filter: true },
    // { field: 'deliveryTo', headerName: 'Delivery Person' },
    // { field: 'deliveryDate', headerName: 'Delivery Started' },
    // { field: 'deliveryOutDate', headerName: 'Delivery Completed' },
    // { field: 'handTempoDelivery', headerName: 'Delivery Mode' },
    { field: 'salonAddress', headerName: 'SalonAddress' },
    // { field: 'implementation', headerName: 'Implementation' }
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    filter: 'agTextColumnFilter',
    flex: 1
  }), []);

  const handleExportExcel = () => gridRef.current.api.exportDataAsExcel();
  const handleExportCSV = () => gridRef.current.api.exportDataAsCsv();

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <div className="page-header">
          <Row>
            <Col><Link to={all_routes.dashboard}>Dashboard</Link></Col>
          </Row>
        </div>

        <Form className="mb-3">
          <Row className="align-items-end">
            <Col md={3}>
              <Form.Label>Delivery Person</Form.Label>
              <Form.Select value={deliverPersonNameSelect} onChange={handleDeliverNameChange}>
                <option value="">Select</option>
                {filteredUserNames.map((user, idx) => (
                  <option key={idx} value={user}>{user}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label>Delivery Started</Form.Label>
              <Form.Control type="datetime-local" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </Col>
            <Col md={2}>
              <Form.Label>Delivery Completed</Form.Label>
              <Form.Control type="datetime-local" value={deliveryOutDate} onChange={(e) => setDeliveryOutDate(e.target.value)} />
            </Col>
            <Col md={2}>
              <Form.Label>Delivery Mode</Form.Label>
              <Form.Select value={handTempoDelivery} onChange={(e) => setHandTempoDelivery(e.target.value)}>
                <option value="">Select</option>
                <option value="Comart to Deliver">Comart to Deliver</option>
                <option value="Customer Pick-Up from Comart">Customer Pick-Up</option>
                <option value="Comart Courier">Comart Courier</option>
              </Form.Select>
            </Col>
            <Col md={3} className="d-flex gap-2">
              <Button onClick={handleAddDeliveryJob}>Add</Button>
              <Button variant="outline-secondary" onClick={() => window.location.reload()}><FaSyncAlt /></Button>
              <Button onClick={handleExportExcel}>Excel</Button>
              <Button onClick={handleExportCSV}>CSV</Button>
            </Col>
          </Row>
        </Form>

        <InputGroup className="mb-3">
          <InputGroup.Text><FaSearch /></InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search by Job No"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        {loading && <Spinner animation='border' />} 
        {error && <Alert variant='danger'>{error}</Alert>}

        <div className="ag-theme-alpine" style={{ height: 600 }}>
          <AgGridReact
            ref={gridRef}
            rowData={filteredData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onSelectionChanged={handleSelectionChanged}
            pagination={true}
            paginationPageSize={25}
            rowSelection='multiple'
          />
        </div>

        {showNotification && (
          <Notification
            headline="Deadline Alert!"
            message={notificationMessage}
            onClose={() => setShowNotification(false)}
            show={showNotification}
            containerBg="rgba(116, 143, 231, 0.445)"
            bgColor="blue"
            headerColor="#5b79ff"
          />
        )}
      </div>
    </div>
  );
};

export default Delivery;