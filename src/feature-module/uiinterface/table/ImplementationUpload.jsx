import React, { useEffect, useState, useMemo } from "react";
import { Button, Form, Spinner, Alert, Modal } from "react-bootstrap";
import { AgGridReact } from "ag-grid-react";
import axios from "axios";
import { FaUpload, FaDownload } from "react-icons/fa";
import config from "../../../config";

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const ImplementationUpload = () => {
  const [groupedData, setGroupedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [mediaType, setMediaType] = useState("Image");
  const [imageType, setImageType] = useState("After");
  const [selectedLineItem, setSelectedLineItem] = useState(null);
const [personName, setPersonName] = useState("");
const [contact, setContact] = useState("");
const [authority, setAuthority] = useState("");
  const [uploadPage, setUploadPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(config.ImplementationUpload.URL.GetAllImplementationUpload);
      setGroupedData(response.data);
    } catch (err) {
      console.error("Error loading data", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getMediaTypeEnumValue = (type) => {
  switch (type) {
    case "Image": return 0;
    case "Video": return 1;
    case "Signature": return 2;
    default: return 0;
  }
};
const handleUpload = async () => {


   if (!uploadFile || !selectedJob || !selectedLineItem) {
    return alert("Please select a file and a line item.");
  }

  const isSignature = mediaType === "Signature";

  const users = localStorage.getItem('users');
   const userObj = JSON.parse(users);
const userName = userObj?.message?.username;


  // Create JSON payload matching ImplementationUploadmodel structure
const jsonData = JSON.stringify([
    {
        id: selectedLineItem.id,
        jobNo: selectedJob.jobNo,
        Width: selectedLineItem.width || null,
        Height: selectedLineItem.height || null,
        MediaFiles: [
            {
                FileType:getMediaTypeEnumValue (mediaType),
                ImageType: mediaType === "Image" ? imageType : null,
                PersonName: isSignature ? personName : null,
                Contact: isSignature ? contact : null,
                Authority: isSignature ? authority : null,
                productionid: selectedLineItem.id,
                Entrdby: userName,
                entereddt: new Date().toISOString(),
                Lstupatedby: userName,
                Lstupdatedate: new Date().toISOString()
            }
        ],
        enteredby: userName,
        entereddt: new Date().toISOString()
    }
]);

        const formData = new FormData();
  formData.append("files", uploadFile);
  formData.append("jsonData", jsonData);
  formData.append("enteredby", userName); // or dynamic username if available

  try {
    setLoading(true);
    await axios.post(config.ImplementationUpload.URL.Upload, formData); 
    alert("Upload successful");
    setShowModal(false);
    setUploadFile(null);
    fetchData();
  } catch (err) {
    console.error("Upload error", err);
    setError("Upload failed");
  } finally {
    setLoading(false);
  }
};


  const handleDownload = async (jobNo) => {
    try {
      const response = await axios.get(`${config.downloadPDF.URL.GetPdf}${jobNo}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${jobNo}_implementation.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Failed to download PDF');
    }
  };

  const rowData = useMemo(() => {
    return groupedData.map(group => {
      const jobArray = Array.isArray(group.jobDetails) ? group.jobDetails : [];
      const firstJob = jobArray[0] || {};
      const media = group.implementationItems?.[0]?.mediaFiles?.[0];

      return {
        jobNo: group.jobNo,
        client: firstJob.client || 'N/A',
        salonAddress: firstJob.salonAddress || 'N/A',
        fullJob: jobArray,
        imageUrl: media?.url || '',
        jobDetails: jobArray,
        implementationItems: group.implementationItems || []
      };
    });
  }, [groupedData]);

  const columnDefs = useMemo(() => [
    { headerName: "Job No", field: "jobNo", flex: 1 },
    { headerName: "Client", field: "client", flex: 1 },
    { headerName: "Salon Address", field: "salonAddress", flex: 1 },
    
    {
      headerName: "Actions",
      cellRenderer: (params) => (
        <div className="d-flex gap-2">
          <Button
            size="sm"
            variant="success"
            onClick={() => {
              setSelectedJob({
                jobNo: params.data.jobNo,
                salonAddress: params.data.salonAddress,
                jobDetails: params.data.fullJob || [],
              });
              setSelectedLineItem(null);
              setShowModal(true);
              setUploadPage(1);
            }}
          >
            <FaUpload /> Upload
          </Button>
          <Button size="sm" variant="primary" onClick={() => handleDownload(params.data.jobNo)}>
            <FaDownload /> PDF
          </Button>
        </div>
      ),
      flex: 1,
    },
  ], []);

  const paginatedRows = useMemo(() => {
    if (!selectedJob?.jobDetails) return [];
    const start = (uploadPage - 1) * pageSize;
    return selectedJob.jobDetails.slice(start, start + pageSize);
  }, [selectedJob, uploadPage]);

  const totalPages = Math.ceil((selectedJob?.jobDetails?.length || 0) / pageSize);

return (
    <div className="container mt-2" style={{ marginTop: 100 }}>
        <h4 className="text-center mb-3">Implementation Upload & Downloads</h4>

        {loading && <Spinner animation="border" />} 
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="ag-theme-alpine" style={{ height: 400, width: "100%" }}>
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                pagination={false}
                rowHeight={120}
            />
        </div>

        {/* Paging below the grid */}
        <div className="d-flex justify-content-between align-items-center mt-2">
            <Button
                disabled={uploadPage === 1}
                onClick={() => setUploadPage(p => p - 1)}
            >
                Previous
            </Button>
            <span>
                Page {uploadPage} of {totalPages}
            </span>
            <Button
                disabled={uploadPage === totalPages}
                onClick={() => setUploadPage(p => p + 1)}
            >
                Next
            </Button>
        </div>

        <Modal show={showModal} onHide={() => setShowModal(false)} centered size="xxl">
            <Modal.Header closeButton>
                <Modal.Title>Upload Media</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="ag-theme-alpine mb-3" style={{ height: 250, width: "100%" }}>
                    <AgGridReact
                        rowData={paginatedRows}
                        columnDefs={[
                            { headerName: "Product Details", field: "nameSubCode", flex: 1 },
                            { headerName: "Media", field: "media", flex: 1 },
                            { headerName: "City", field: "city", flex: 1 },
                            { headerName: "Qty", field: "qty", flex: 1 },               
                            {headerName: "width", field: "width", flex: 1},
                            {headerName: "height", field: "height", flex: 1},

                        ]}
                        rowSelection="single"
                        onRowClicked={(e) => setSelectedLineItem(e.data)}
                        domLayout="autoHeight"
                    />
                    {totalPages > 1 && (
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <Button disabled={uploadPage === 1} onClick={() => setUploadPage(p => p - 1)}>Previous</Button>
                            <span>Page {uploadPage} of {totalPages}</span>
                            <Button disabled={uploadPage === totalPages} onClick={() => setUploadPage(p => p + 1)}>Next</Button>
                        </div>
                    )}
                </div>

                <Form.Group className="mb-3" style={{ marginTop: 100 }}>
                    <Form.Label>Media Type</Form.Label>
                    <Form.Select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                        <option value="Image">Image</option>
                        <option value="Video">Video</option>
                        <option value="Signature">Signature</option>
                    </Form.Select>
                </Form.Group>

                {mediaType === "Image" && (
                    <Form.Group className="mb-3">
                        <Form.Label>Image Type</Form.Label>
                        <Form.Select value={imageType} onChange={(e) => setImageType(e.target.value)}>
                            <option value="Before">Before</option>
                            <option value="After">After</option>
                        </Form.Select>
                    </Form.Group>
                )}

                {mediaType === "Signature" && (
  <>
    <Form.Group className="mb-3">
      <Form.Label>Person Name</Form.Label>
      <Form.Control
        type="text"
        value={personName}
        onChange={(e) => setPersonName(e.target.value)}
        placeholder="Enter Person Name"
      />
    </Form.Group>

    <Form.Group className="mb-3">
      <Form.Label>Contact</Form.Label>
      <Form.Control
        type="text"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="Enter Contact Number"
      />
    </Form.Group>

    <Form.Group className="mb-3">
      <Form.Label>Authority</Form.Label>
      <Form.Control
        type="text"
        value={authority}
        onChange={(e) => setAuthority(e.target.value)}
        placeholder="Enter Authority"
      />
    </Form.Group>
  </>
)}


                <Form.Group className="mb-3">
                    <Form.Label>Choose File</Form.Label>
                    <Form.Control type="file" onChange={(e) => setUploadFile(e.target.files[0])} />
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="success" onClick={handleUpload} disabled={!uploadFile}>Upload</Button>
            </Modal.Footer>
        </Modal>
    </div>
);
};

export default ImplementationUpload;
