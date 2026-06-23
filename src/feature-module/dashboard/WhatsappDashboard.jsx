import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../config";
import { Button, Form, Row, Col, Card, Alert, Spinner } from "react-bootstrap";
import { Eye, RefreshCw, Search, X } from "react-feather";
import "./whatsapp-dashboard.css";

const getRowsFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (data?.data && typeof data.data === "object") return [data.data];
  if (data?.result && typeof data.result === "object") return [data.result];
  return [];
};

const getValue = (item, ...keys) =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== "") || "";

const getImageUrls = (item = {}) => {
  const imageFields = [
    item.images,
    item.Images,
    item.files,
    item.Files,
    item.uploadFiles,
    item.UploadFiles,
  ];
  const urls = imageFields
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .map((value) =>
      typeof value === "string"
        ? value
        : getValue(value, "url", "Url", "fileUrl", "FileUrl", "imageUrl", "ImageUrl", "path", "Path")
    )
    .filter(Boolean);

  const singleImage = getValue(item, "imageUrl", "ImageUrl", "fileUrl", "FileUrl", "url", "Url");
  if (singleImage) urls.push(singleImage);

  return [...new Set(urls)];
};

const WhatsappDashboard = () => {
  const [jobNo, setJobNo] = useState("");
  const [storeName, setStoreName] = useState("");
  const [implementationData, setImplementationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Fetch implementation uploads
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!jobNo.trim() || !storeName.trim()) {
      setError("Job No and Store Name are required");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await axios.get(
        `${config.ImplementationUpload.URL.GetByJobNoAndStoreName}?jobNo=${jobNo.trim()}&storeName=${storeName.trim()}`
      );

      const rows = getRowsFromResponse(response.data);

      if (rows.length) {
        setImplementationData(rows);
      } else {
        setImplementationData([]);
        setError("No data found for the provided Job No and Store Name");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch implementation data");
      setImplementationData([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
  fetchAllImplementationUploads();
}, []);

const fetchAllImplementationUploads = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await axios.get(
      config.ImplementationUpload.URL.GetAllImplementationUpload
    );

    const rows = getRowsFromResponse(response.data);
    setImplementationData(rows);
    setSearched(true);
  } catch (err) {
    setError(err.response?.data?.message || "Failed to fetch implementation uploads");
    setImplementationData([]);
  } finally {
    setLoading(false);
  }
};

  const handleReset = () => {
  setJobNo("");
  setStoreName("");
  setError(null);
  setSelectedItem(null);
  fetchAllImplementationUploads();
};

  return (
    <div className="page-wrapper">
      <div className="content container-fluid whatsapp-dashboard">
      <div className="dashboard-page-header">
        <div>
          <h4>WhatsApp Dashboard</h4>
          <p>Check implementation upload status and images by job and store.</p>
        </div>
      </div>

      <Card className="mb-4">
        <Card.Header className="whatsapp-dashboard-header">
          <Card.Title className="mb-0">WhatsApp Implementation Dashboard</Card.Title>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <Row className="mb-3">
              <Col md={5}>
                <Form.Group>
                  <Form.Label>Job No *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter Job No"
                    value={jobNo}
                    onChange={(e) => setJobNo(e.target.value)}
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group>
                  <Form.Label>Store Name *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter Store Name"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>&nbsp;</Form.Label>
                  <div>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={loading}
                      className="w-100"
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search size={15} className="me-1" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>
                </Form.Group>
              </Col>
            </Row>
          </Form>

          {error && <Alert variant="danger">{error}</Alert>}

          {searched && !loading && implementationData.length === 0 && !error && (
            <Alert variant="info">No implementation data found</Alert>
          )}

          <Button variant="outline-secondary" size="sm" onClick={handleReset} className="mb-3">
            <RefreshCw size={14} className="me-1" />
            Reset
          </Button>
        </Card.Body>
      </Card>

      {/* Implementation Data Display */}
      {implementationData.length > 0 && (
        <div className="implementation-results">
          <h5 className="mb-4">
            Found {implementationData.length} Implementation Record(s)
          </h5>

          <Row className="g-4">
            {implementationData.map((item, index) => (
              <Col md={6} lg={4} key={index}>
                <Card className="implementation-card h-100">
                  <Card.Body>
                    <Card.Title className="text-truncate">
                      Job: {getValue(item, "jobNo", "JobNo", "jobNumber", "JobNumber") || "N/A"}
                    </Card.Title>
                    <div className="implementation-details">
                      <p>
                        <strong>Store:</strong>{" "}
                        {getValue(item, "storeName", "StoreName", "salonStoreName", "SalonStoreName") || "N/A"}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span className="whatsapp-status-pill">
                          {getValue(item, "status", "Status") || "Active"}
                        </span>
                      </p>
                      <p>
                        <strong>Date:</strong>{" "}
                        {getValue(item, "uploadDate", "UploadDate", "createdDate", "CreatedDate")
                          ? new Date(getValue(item, "uploadDate", "UploadDate", "createdDate", "CreatedDate")).toLocaleDateString()
                          : "N/A"}
                      </p>
                      {getValue(item, "description", "Description", "remarks", "Remarks") && (
                        <p>
                          <strong>Description:</strong> {getValue(item, "description", "Description", "remarks", "Remarks")}
                        </p>
                      )}
                    </div>

                    {/* Display Images if available */}
                    {getImageUrls(item).length > 0 && (
                      <div className="implementation-images mt-3">
                        <strong>Images:</strong>
                        <div className="image-gallery">
                          {getImageUrls(item).map((img, imgIndex) => (
                            <div key={imgIndex} className="image-thumbnail">
                              <img
                                src={img}
                                alt={`Implementation ${index}-${imgIndex}`}
                                onClick={() => setSelectedItem(item)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="mt-3"
                      onClick={() => setSelectedItem(item)}
                    >
                      <Eye size={14} className="me-1" />
                      View Details
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="whatsapp-modal-overlay" onClick={() => setSelectedItem(null)}>
          <Card className="whatsapp-modal-card" onClick={(event) => event.stopPropagation()}>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Card.Title className="mb-0">
                Implementation Details - {getValue(selectedItem, "jobNo", "JobNo", "jobNumber", "JobNumber")}
              </Card.Title>
              <Button
                variant="light"
                className="dashboard-close-button"
                onClick={() => setSelectedItem(null)}
              >
                <X size={18} />
              </Button>
            </Card.Header>
            <Card.Body>
              <div className="detail-content">
                <p>
                  <strong>Job No:</strong> {getValue(selectedItem, "jobNo", "JobNo", "jobNumber", "JobNumber") || "N/A"}
                </p>
                <p>
                  <strong>Store Name:</strong>{" "}
                  {getValue(selectedItem, "storeName", "StoreName", "salonStoreName", "SalonStoreName") || "N/A"}
                </p>
                <p>
                  <strong>Status:</strong> {getValue(selectedItem, "status", "Status") || "Active"}
                </p>
                <p>
                  <strong>Upload Date:</strong>{" "}
                  {getValue(selectedItem, "uploadDate", "UploadDate", "createdDate", "CreatedDate")
                    ? new Date(getValue(selectedItem, "uploadDate", "UploadDate", "createdDate", "CreatedDate")).toLocaleString()
                    : "N/A"}
                </p>

                {/* Display all images in detail view */}
                {getImageUrls(selectedItem).length > 0 && (
                  <div className="mt-4">
                    <h6>Images:</h6>
                    <div className="detail-images">
                      {getImageUrls(selectedItem).map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Detail ${idx}`}
                          className="detail-image"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {getValue(selectedItem, "description", "Description", "remarks", "Remarks") && (
                  <p className="mt-3">
                    <strong>Description:</strong>
                    <br />
                    {getValue(selectedItem, "description", "Description", "remarks", "Remarks")}
                  </p>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
};

export default WhatsappDashboard;
