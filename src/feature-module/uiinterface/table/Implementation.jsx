import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Form, Row, Col, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import axios from 'axios';
import config from '../../../config';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaSyncAlt, FaUpload, FaDownload } from 'react-icons/fa';
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

  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedLineItem, setSelectedLineItem] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [mediaType, setMediaType] = useState('Image');
  const [imageType, setImageType] = useState('After');
  const [personName, setPersonName] = useState('');
  const [contact, setContact] = useState('');
  const [authority, setAuthority] = useState('');

  const fmt2 = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : '—';
  };

  const fmtInt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? String(Math.round(n)) : '—';
  };

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

  const openUploadModalForRow = (row) => {
    setSelectedJob({ jobNo: row.jobNo });

    console.log('Selected Row for Upload:', row.jobNo);
    setSelectedLineItem(row);
    setUploadFiles([]);
    setMediaType('Image');
    setImageType('After');
    setPersonName('');
    setContact('');
    setAuthority('');
    setShowModal(true);
  };


  // keep one function; fetch by line-item id (NOT jobNo)
const fetchUploadStatusById = async (id) => {
  const url = `${config.ImplementationUpload.URL.ImageStatusById}${encodeURIComponent(id)}`;
  const { data } = await axios.get(url);

  console.log('Fetched upload status by id:', id, data);
  return {
    isUploaded: data?.isUploaded ?? data?.IsUploaded ?? false,
    uploadedFilesCount: data?.imagesCount ?? data?.ImagesCount ?? 0,
    uploadedAtUtc: data?.uploadedAtUtc ?? data?.UploadedAtUtc ?? null,
  };
};


 const fetchImplementationAccToLocation = async () => {
  try {
    setLoading(true);
    const payload = { locationId, username };
    const res = await axios.post(config.Implementation.URL.GetAllImplementationAccToLocation, payload);
    const rows = res.data || [];

    // fetch statuses in parallel by id
    const statuses = await Promise.all(rows.map((r) => fetchUploadStatusById(r.id)));

    // merge back by id
    const merged = rows.map((row, idx) => ({ ...row, ...statuses[idx] }));

    setLocationAccData(merged);

    const totals = merged.reduce(
      (acc, row) => {
        acc.width += parseFloat(row.width || 0);
        acc.height += parseFloat(row.height || 0);
        return acc;
      },
      { width: 0, height: 0 }
    );
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
        .then((res) => setUserList(res.data))
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

    const selectedRows = gridRef.current.api.getSelectedRows();

    if (!selectedRows || selectedRows.length === 0) {
      setError('Please select at least one job.');
      return;
    }

    const jobs = selectedRows.map((row) => ({
      ...row,
      enteredby: row.enteredby || username,
      lstupateby: username,
      username: username,
      implementationBy: row.implementationBy || username,
      implementationDate: implementationDate,
      assignName: name,
    }));

    try {
      setLoading(true);
      const response = await axios.post(config.Implementation.URL.AddImplementation, jobs);
      if (response.status === 200) {
        window.location.reload();
      } else {
        setError('Unexpected response from the server.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to submit implementation job');
    } finally {
      setLoading(false);
    }
  };

  const firstRowIdByJob = useMemo(() => {
    const seen = new Set();
    const keep = new Set();
    for (const r of locationAccData) {
      if (!seen.has(r.jobNo)) {
        seen.add(r.jobNo);
        if (r.id != null) keep.add(r.id);
      }
    }
    return keep;
  }, [locationAccData]);

  const buildPdfUrl = (jobNo) => {
    const base = config.downloadPDF?.URL?.GetPdf || '';
    if (!base) return null;

    const encodedJob = encodeURIComponent(jobNo);
    if (base.endsWith('/')) return `${base}${encodedJob}`;
    if (/[?&]jobNo=/.test(base)) return `${base}${encodedJob}`;
    return `${base}?jobNo=${encodedJob}`;
  };

  const openPdfDirect = (jobNo) => {
    const url = buildPdfUrl(jobNo);
    if (!url) {
      setError('PDF endpoint is not configured.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

const handleUpload = async () => {
  if (!uploadFiles?.length || !selectedJob || !selectedLineItem) {
    alert('Please select a line item and a file.');
    return;
  }

  // Use Job Number only
  const jobNoValue = selectedJob?.jobNo || selectedLineItem?.jobNo;
  const isSignature = mediaType === 'Signature';
  const users = JSON.parse(localStorage.getItem('users') || '{}');
  const userName = users?.message?.username || '';

  // Save ALL columns from the selected row + upload meta
  const payload = {
     id: selectedLineItem.id,
    jobNo: jobNoValue,
    record: { ...selectedLineItem },          // all fields from the row
    uploadMeta: {
      mediaType,
      imageType: mediaType === 'Image' ? imageType : null,
      signature: isSignature ? { personName, contact, authority } : null,
    },
  };

  const formData = new FormData();
  uploadFiles.forEach((f) => formData.append('files', f)); // keep field name "files"
  formData.append('jobNo', jobNoValue);                    // ONLY jobNo
  formData.append('enteredby', userName);
  formData.append('jsonData', JSON.stringify([payload]));  // array for backend compatibility

  try {
    await axios.post(config.ImplementationUpload.URL.Upload, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    alert('Upload successful');

      const status = await fetchUploadStatus(jobNoValue);
    setLocationAccData((prev) =>
      prev.map((r) => (r.jobNo === jobNoValue ? { ...r, ...status } : r))
    );
    setShowModal(false);
  } catch (e) {
    console.error(e);
    alert(e?.response?.data || 'Upload failed');
  }
};





  const columnDefs = useMemo(
    () => [
      { checkboxSelection: true, headerCheckboxSelection: true, field: 'jobNo', headerName: 'Job No', filter: true },
      { field: 'client', headerName: 'Client', filter: true, minWidth: 160 },
      { field: 'userName', headerName: 'Account Manager', filter: true, minWidth: 160 },
      { field: 'subClient', headerName: 'Sub Client', filter: true, minWidth: 160 },
      { field: 'qty', headerName: 'Qty', minWidth: 160 },
      { field: 'media', headerName: 'Media', filter: true, minWidth: 160 },
      { field: 'mounting', headerName: 'Mounting', filter: true, minWidth: 160 },
      { field: 'salonAddress', headerName: 'Salon / Store Address', minWidth: 160, filter: true },
      { field: 'deadline', headerName: 'Job Deadline', minWidth: 160, filter: true },
      { field: 'implementation', headerName: 'Implementation', minWidth: 160, filter: true },
      { field: 'width', minWidth: 160, headerName: 'Width' },
      { field: 'height', minWidth: 160, headerName: 'Length' },
      { field: 'totalSqFt', minWidth: 160, headerName: 'Total Sq Ft' },
      { field: 'implementationDate', minWidth: 160, headerName: 'Assigned Date' },
      { field: 'assignName', minWidth: 160, headerName: 'Assigned To' },
      { field: 'remarks', minWidth: 160, headerName: 'Remarks', filter: true },
       {
      field: 'isUploaded',
      headerName: 'Uploaded',
      minWidth: 120,
      cellRenderer: (params) => {
        const uploaded = params.data?.isUploaded ?? false;
        return (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2em',
            }}
            title={uploaded ? 'File Uploaded' : 'Not Uploaded'}
          >
            {uploaded ? '✅' : '❌'}
          </span>
        );
      },
      filter: true,
      sortable: true,
    },
      {
        headerName: 'Actions',
        colId: 'actions',
        cellRenderer: (params) => (
          <div className="d-flex gap-2">
            <Button size="sm" variant="success" onClick={() => openUploadModalForRow(params.data)}>
              <FaUpload /> Upload
            </Button>
            {firstRowIdByJob.has(params.data.id) && (
              <Button size="sm" variant="primary" onClick={() => openPdfDirect(params.data.jobNo)} title="Download PDF">
                <FaDownload /> PDF
              </Button>
            )}
          </div>
        ),
        filter: false,
        sortable: false,
        suppressMenu: true,
        minWidth: 230,
        flex: 0,
      },
    ],
    [locationAccData, firstRowIdByJob]
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      filter: 'agTextColumnFilter',
      flex: 1,
    }),
    []
  );

  const handleExportExcel = () => {
    gridRef.current.api.exportDataAsExcel();
  };

  const handleExportCSV = () => {
    gridRef.current.api.exportDataAsCsv();
  };

  return (
    <div className="p-3">
      <Row className="mb-3" style={{ marginTop: '5rem', marginLeft: '15rem' }}>
        <Col>
          <Form.Group>
            <Form.Label style={{ width: '200px' }}>Assigned Name</Form.Label>
            <Form.Select value={name} onChange={handleNameChange}>
              <option value="">Select Assigned Name</option>
              {[...new Set(userList)].map((u, i) => (
                <option key={i} value={u}>{u}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col>
          <Form.Group controlId="formImplementationDate">
            <Form.Label style={{ width: '200px' }}>Assigned Date</Form.Label>
            <Form.Control type="date" value={implementationDate} onChange={(e) => setImplementationDate(e.target.value)} />
          </Form.Group>
        </Col>
        <Col>
          <Button type="submit" variant="primary" style={{ cursor: 'pointer', marginTop: '2em' }} onClick={(e) => handleAddImplementationJob(e)}>
            Add
          </Button>
        </Col>
        <Col>
          <Button variant="outline-secondary" onClick={() => window.location.reload()}>
            <FaSyncAlt />
          </Button>
        </Col>
        <Col>
          <Button onClick={handleExportExcel}>Export Excel</Button>
        </Col>
        <Col>
          <Button onClick={handleExportCSV}>Export CSV</Button>
        </Col>
      </Row>

      {loading && <Spinner animation="border" />}
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="ag-theme-alpine custom-ag-grid" style={{ height: '600px', width: '86%', marginLeft: '16rem' }}>
        <AgGridReact
          ref={gridRef}
          rowData={locationAccData.filter((row) => row.jobNo?.toLowerCase().includes(searchTerm.toLowerCase()))}
          columnDefs={columnDefs}
          immutableData={true}
          getRowId={(params) => params.data.id}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={25}
          rowSelection="multiple"
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

      <div className="mt-3 text-end">
        <strong>Total Width:</strong> {totalValues.width} | <strong>Total Height:</strong> {totalValues.height}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Upload Media for Job {selectedJob?.jobNo}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLineItem && (
            <div className="mb-3">
              <div className="fw-bold mb-2">Selected Line Item (All Columns)</div>
              <div className="ag-theme-alpine" style={{ height: 200 }}>
              <AgGridReact
  rowData={[selectedLineItem]}
  columnDefs={columnDefs
    .filter((c) => c.colId !== 'actions') // hide Actions
    .map((c) => ({
      ...c,
      checkboxSelection: false,
      headerCheckboxSelection: false,
    }))
  }
  defaultColDef={{ ...defaultColDef, suppressMenu: true, sortable: false, filter: false }}
  domLayout="autoHeight"
  headerHeight={28}
  rowHeight={28}
  suppressRowClickSelection={true}
/>

              </div>
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Media Type</Form.Label>
            <Form.Select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
              <option value="Image">Image</option>
              <option value="Video">Video</option>
              <option value="Signature">Signature</option>
            </Form.Select>
          </Form.Group>

          {mediaType === 'Image' && (
            <Form.Group className="mb-3">
              <Form.Label>Image Type</Form.Label>
              <Form.Select value={imageType} onChange={(e) => setImageType(e.target.value)}>
                <option value="Before">Before</option>
                <option value="After">After</option>
              </Form.Select>
            </Form.Group>
          )}

          {mediaType === 'Signature' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Person Name</Form.Label>
                <Form.Control type="text" value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Enter Person Name" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Contact</Form.Label>
                <Form.Control type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Enter Contact Number" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Authority</Form.Label>
                <Form.Control type="text" value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="Enter Authority" />
              </Form.Group>
            </>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Choose File</Form.Label>
            <Form.Control type="file" multiple accept="image/*,video/*,application/pdf" onChange={(e) => setUploadFiles(Array.from(e.target.files || []))} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
          <Button variant="success" onClick={handleUpload} disabled={!uploadFiles.length || !selectedLineItem}>
            <FaUpload /> Upload
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Implementation;
