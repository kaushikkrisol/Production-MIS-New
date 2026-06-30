
import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../config";
import { Button, Form, Row, Col, Card, Alert, Spinner } from "react-bootstrap";
import { Download, Eye, RefreshCw, Search, X } from "react-feather";
import "./whatsapp-dashboard.css";

const PAGE_SIZE = 12;
const MAX_INITIAL_ROWS = 5000;

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

const getValue = (item, ...keys) => {
  if (!item || typeof item !== "object") return "";

  for (const key of keys) {
    const directValue = item?.[key];
    if (directValue !== undefined && directValue !== null && directValue !== "") return directValue;
  }

  const normalizedKeys = keys.map((key) => String(key).toLowerCase());
  const matchedEntry = Object.entries(item).find(
    ([key, value]) =>
      normalizedKeys.includes(String(key).toLowerCase()) &&
      value !== undefined &&
      value !== null &&
      value !== ""
  );

  return matchedEntry ? matchedEntry[1] : "";
};

const normalizeSearchText = (value) =>
  String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .toLowerCase();

const storeMatches = (row, searchStoreName) => {
  const searchText = normalizeSearchText(searchStoreName);
  if (!searchText) return true;

  const rowStore = normalizeSearchText(
    getImplementationValue(row, "storeName", "StoreName", "salonStoreName", "SalonStoreName", "store", "Store")
  );

  return rowStore === searchText || rowStore.includes(searchText) || searchText.includes(rowStore);
};

const jobMatches = (row, searchJobNo) => {
  const searchText = normalizeSearchText(searchJobNo);
  if (!searchText) return true;

  const rowJobNo = normalizeSearchText(
    getImplementationValue(row, "jobNo", "JobNo", "jobNumber", "JobNumber", "comartJobNo", "ComartJobNo")
  );

  return rowJobNo === searchText;
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  return [];
};

const getOriginFromUrl = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
};

const mediaBaseOrigin =
  getOriginFromUrl(config.ImplementationUpload.URL.ImageBaseURL) ||
  getOriginFromUrl(config.ImplementationUpload.URL.GetAllImplementationUpload);

const normalizeImageUrl = (url) => {
  const imageUrl = String(url || "").trim().replace(/\\/g, "/");
  if (!imageUrl) return "";
  if (/^(data|blob):/i.test(imageUrl) || /^[a-z][a-z\d+.-]*:\/\//i.test(imageUrl) || imageUrl.startsWith("//")) {
    return encodeURI(imageUrl);
  }

  const imagePath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return encodeURI(mediaBaseOrigin ? `${mediaBaseOrigin}${imagePath}` : imagePath);
};

const getImplementationItems = (item = {}) => [
  ...toArray(item.implementationItems),
  ...toArray(item.ImplementationItems),
  ...toArray(item.implementationUploads),
  ...toArray(item.ImplementationUploads),
];

const getImplementationValue = (item = {}, ...keys) => {
  const directValue = getValue(item, ...keys);
  if (directValue !== "") return directValue;

  return getImplementationItems(item)
    .map((implementationItem) => getValue(implementationItem, ...keys))
    .find((value) => value !== "") || "";
};

const getImplementationDate = (item = {}) =>
  getImplementationValue(
    item,
    "uploadDate",
    "UploadDate",
    "createdDate",
    "CreatedDate",
    "uploadedAtUtc",
    "UploadedAtUtc",
    "entereddt",
    "Entereddt",
    "signDate",
    "SignDate"
  );

const getImplementationStatus = (item = {}) => {
  const status = getImplementationValue(item, "status", "Status");
  if (status) return status;

  const isUploaded = getImplementationValue(item, "isUploaded", "IsUploaded");
  if (isUploaded === true || isUploaded === "true" || isUploaded === 1 || isUploaded === "1") {
    return "Uploaded";
  }

  return "Active";
};

const getMediaFiles = (item = {}) => {
  const implementationItems = getImplementationItems(item);

  return [
    ...toArray(item.mediaFiles),
    ...toArray(item.MediaFiles),
    ...toArray(item.images),
    ...toArray(item.Images),
    ...toArray(item.files),
    ...toArray(item.Files),
    ...toArray(item.uploadFiles),
    ...toArray(item.UploadFiles),
    ...implementationItems.flatMap((implementationItem) => [
      ...toArray(implementationItem.mediaFiles),
      ...toArray(implementationItem.MediaFiles),
      ...toArray(implementationItem.images),
      ...toArray(implementationItem.Images),
      ...toArray(implementationItem.files),
      ...toArray(implementationItem.Files),
      ...toArray(implementationItem.uploadFiles),
      ...toArray(implementationItem.UploadFiles),
    ]),
  ].filter(Boolean);
};

const getImageUrls = (item = {}) => {
  const implementationItems = getImplementationItems(item);
  const urls = getMediaFiles(item)
    .map((value) =>
      typeof value === "string"
        ? value
        : getValue(value, "url", "Url", "fileUrl", "FileUrl", "imageUrl", "ImageUrl", "path", "Path")
    )
    .map(normalizeImageUrl)
    .filter(Boolean);

  const singleImage = getValue(item, "imageUrl", "ImageUrl", "fileUrl", "FileUrl", "url", "Url");
  if (singleImage) urls.push(normalizeImageUrl(singleImage));

  implementationItems.forEach((implementationItem) => {
    const nestedImage = getValue(implementationItem, "imageUrl", "ImageUrl", "fileUrl", "FileUrl", "url", "Url");
    if (nestedImage) urls.push(normalizeImageUrl(nestedImage));
  });

  return [...new Set(urls)];
};

const getUploadedFilesCount = (item = {}) => {
  const count = getImplementationValue(item, "uploadedFilesCount", "UploadedFilesCount", "mediaFilesCount", "MediaFilesCount");
  return count || getMediaFiles(item).length;
};

const getEnteredBy = (item = {}) =>
  getImplementationValue(item, "UploadEnteredBy", "uploadEnteredBy", "enteredby", "enteredBy", "entrdby", "Entrdby");

const getImageType = (item = {}) =>
  getMediaFiles(item)
    .map((mediaFile) => getValue(mediaFile, "imageType", "ImageType"))
    .find(Boolean) || "";

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const markImageFailed = (event) => {
  event.currentTarget.parentElement?.classList.add("image-load-failed");
};

const getImplementationUploads = async ({ pageNo = 1, jobNo = "", storeName = "" } = {}) => {
  const pagedUrl = config.ImplementationUpload?.URL?.GetAllWithImagesPaged;

  if (pagedUrl) {
    const params = new URLSearchParams({
      page: String(pageNo),
      pageSize: String(PAGE_SIZE),
    });

    if (jobNo.trim()) params.append("jobNo", jobNo.trim());
    if (storeName.trim()) params.append("storeName", storeName.trim());

    const response = await axios.get(`${pagedUrl}?${params.toString()}`);
    const payload = response.data || {};

    return {
      rows: getRowsFromResponse(payload.data || payload),
      page: Number(payload.page || pageNo),
      pageSize: Number(payload.pageSize || PAGE_SIZE),
      totalRecords: Number(payload.totalRecords || payload.totalCount || 0),
      totalPages: Number(payload.totalPages || 1),
    };
  }

  const url =
    config.ImplementationUpload?.URL?.GetAllWithImages ||
    config.ImplementationUpload?.URL?.GetAllImplementationUpload;

  if (!url) {
    throw new Error(
      "ImplementationUpload URL missing. Please add GetAllWithImagesPaged or GetAllWithImages in config.js"
    );
  }

  const response = await axios.get(url);
  const allRows = getRowsFromResponse(response.data)
    .filter((row) => getMediaFiles(row).length > 0)
    .sort((a, b) => {
      const dateA = new Date(getImplementationDate(a) || 0).getTime();
      const dateB = new Date(getImplementationDate(b) || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, MAX_INITIAL_ROWS);

  const filteredRows = filterImplementationRows(allRows, jobNo, storeName);
  const totalRecords = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const startIndex = (pageNo - 1) * PAGE_SIZE;

  return {
    rows: filteredRows.slice(startIndex, startIndex + PAGE_SIZE),
    page: pageNo,
    pageSize: PAGE_SIZE,
    totalRecords,
    totalPages,
  };
};

const filterImplementationRows = (rows, jobNumber, store) =>
  rows.filter((row) => jobMatches(row, jobNumber) && storeMatches(row, store));

const WhatsappDashboard = () => {
  const [jobNo, setJobNo] = useState("");
  const [storeName, setStoreName] = useState("");
  const [implementationData, setImplementationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [downloadingJobNo, setDownloadingJobNo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const loadImplementationData = async (pageNo = 1, overrideFilters = null) => {
    const activeJobNo = overrideFilters?.jobNo ?? jobNo;
    const activeStoreName = overrideFilters?.storeName ?? storeName;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const result = await getImplementationUploads({
        pageNo,
        jobNo: activeJobNo,
        storeName: activeStoreName,
      });

      setImplementationData(result.rows);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotalRecords(result.totalRecords);

      if (!result.rows.length) {
        setError(
          activeJobNo.trim() || activeStoreName.trim()
            ? "No recent WhatsApp images found for the selected Job No / Store Name"
            : "No recent WhatsApp images found"
        );
      }
    } catch (err) {
      setError(
        err?.message ||
          err.response?.data?.message ||
          err.response?.data ||
          "Failed to fetch implementation data. Please check API URL and CORS/network response."
      );
      setImplementationData([]);
      setTotalRecords(0);
      setTotalPages(1);
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImplementationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadImplementationData(1);
  };

  const handleReset = async () => {
    setJobNo("");
    setStoreName("");
    setError(null);
    setSelectedItem(null);
    await loadImplementationData(1, { jobNo: "", storeName: "" });
  };

  const handlePdfDownload = async (item) => {
    const selectedJobNo = getImplementationValue(item, "jobNo", "JobNo", "jobNumber", "JobNumber");

    if (!selectedJobNo) {
      setError("Job No is required to download PDF");
      return;
    }

    setDownloadingJobNo(selectedJobNo);
    setError(null);

    try {
      const response = await axios.get(
        `${config.downloadPDF.URL.GetPdf}${encodeURIComponent(selectedJobNo)}`,
        { responseType: "blob" }
      );
      const pdfUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.setAttribute("download", `${selectedJobNo}_implementation.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(pdfUrl);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to download PDF");
    } finally {
      setDownloadingJobNo("");
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content container-fluid whatsapp-dashboard">
      <div className="dashboard-page-header">
        <div>
          <h4>WhatsApp Dashboard</h4>
          <p>Check WhatsApp implementation upload status and images.</p>
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
                  <Form.Label>Job No</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Filter by Job No"
                    value={jobNo}
                    onChange={(e) => setJobNo(e.target.value)}
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group>
                  <Form.Label>Store Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Filter by Store Name"
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
                          Loading...
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

          {loading && <Alert variant="info">Loading implementation records...</Alert>}

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
            Showing {implementationData.length} of {totalRecords || implementationData.length} Recent Implementation Record(s)
          </h5>

          <Row className="g-4">
            {implementationData.map((item, index) => {
              const imageUrls = getImageUrls(item);
              const uploadDate = getImplementationDate(item);
              const uploadedBy = getEnteredBy(item);
              const filesCount = getUploadedFilesCount(item);
              const imageType = getImageType(item);
              const itemJobNo = getImplementationValue(item, "jobNo", "JobNo", "jobNumber", "JobNumber");
              const isPdfDownloading = downloadingJobNo === itemJobNo;

              return (
                <Col md={6} lg={4} key={`${getImplementationValue(item, "jobNo", "JobNo")}-${uploadDate}-${index}`}>
                  <Card className="implementation-card h-100">
                    <Card.Body>
                      <Card.Title className="text-truncate">
                        Job: {getImplementationValue(item, "jobNo", "JobNo", "jobNumber", "JobNumber") || "N/A"}
                      </Card.Title>
                      <div className="implementation-details">
                        <p>
                          <strong>Store:</strong>{" "}
                          {getImplementationValue(item, "storeName", "StoreName", "salonStoreName", "SalonStoreName") || "N/A"}
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          <span className="whatsapp-status-pill">
                            {getImplementationStatus(item)}
                          </span>
                        </p>
                        <p>
                          <strong>Date:</strong> {formatDate(uploadDate)}
                        </p>
                        <p>
                          <strong>Files:</strong> {filesCount || 0}
                          {imageType && <span className="image-type-text"> {imageType}</span>}
                        </p>
                        {uploadedBy && (
                          <p>
                            <strong>Entered By:</strong> {uploadedBy}
                          </p>
                        )}
                        {getImplementationValue(item, "description", "Description", "remarks", "Remarks") && (
                          <p>
                            <strong>Description:</strong> {getImplementationValue(item, "description", "Description", "remarks", "Remarks")}
                          </p>
                        )}
                      </div>

                      {imageUrls.length > 0 && (
                        <div className="implementation-images mt-3">
                          <strong>Images:</strong>
                          <div className="image-gallery">
                            {imageUrls.map((img, imgIndex) => (
                              <div key={img} className="image-thumbnail">
                                <img
                                  src={img}
                                  alt={`Implementation ${index}-${imgIndex}`}
                                  onClick={() => setSelectedItem(item)}
                                  onError={markImageFailed}
                                />
                                <span className="image-error-text">Image not available</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="dashboard-card-actions mt-3">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                        >
                          <Eye size={14} className="me-1" />
                          View Details
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handlePdfDownload(item)}
                          disabled={isPdfDownloading}
                        >
                          {isPdfDownloading ? (
                            <Spinner animation="border" size="sm" className="me-1" />
                          ) : (
                            <Download size={14} className="me-1" />
                          )}
                          PDF
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>

          <div className="d-flex justify-content-center align-items-center gap-2 mt-4 mb-4">
            <Button
              variant="outline-primary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => loadImplementationData(page - 1)}
            >
              Previous
            </Button>

            <span className="fw-semibold">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline-primary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => loadImplementationData(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="whatsapp-modal-overlay" onClick={() => setSelectedItem(null)}>
          <Card className="whatsapp-modal-card" onClick={(event) => event.stopPropagation()}>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Card.Title className="mb-0">
                Implementation Details - {getImplementationValue(selectedItem, "jobNo", "JobNo", "jobNumber", "JobNumber")}
              </Card.Title>
              <Button
                variant="light"
                className="dashboard-close-button"
                onClick={() => setSelectedItem(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </Button>
            </Card.Header>
            <Card.Body>
              <div className="detail-content">
                <p>
                  <strong>Job No:</strong> {getImplementationValue(selectedItem, "jobNo", "JobNo", "jobNumber", "JobNumber") || "N/A"}
                </p>
                <p>
                  <strong>Store Name:</strong>{" "}
                  {getImplementationValue(selectedItem, "storeName", "StoreName", "salonStoreName", "SalonStoreName") || "N/A"}
                </p>
                <p>
                  <strong>Status:</strong> {getImplementationStatus(selectedItem)}
                </p>
                <p>
                  <strong>Upload Date:</strong> {formatDateTime(getImplementationDate(selectedItem))}
                </p>
                <p>
                  <strong>Files:</strong> {getUploadedFilesCount(selectedItem) || 0}
                </p>
                {getImageType(selectedItem) && (
                  <p>
                    <strong>Image Type:</strong> {getImageType(selectedItem)}
                  </p>
                )}
                {getEnteredBy(selectedItem) && (
                  <p>
                    <strong>Entered By:</strong> {getEnteredBy(selectedItem)}
                  </p>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handlePdfDownload(selectedItem)}
                  disabled={downloadingJobNo === getImplementationValue(selectedItem, "jobNo", "JobNo", "jobNumber", "JobNumber")}
                >
                  {downloadingJobNo === getImplementationValue(selectedItem, "jobNo", "JobNo", "jobNumber", "JobNumber") ? (
                    <Spinner animation="border" size="sm" className="me-1" />
                  ) : (
                    <Download size={14} className="me-1" />
                  )}
                  Download PDF
                </Button>

                {/* Display all images in detail view */}
                {getImageUrls(selectedItem).length > 0 && (
                  <div className="mt-4">
                    <h6>Images:</h6>
                    <div className="detail-images">
                      {getImageUrls(selectedItem).map((img, idx) => (
                        <div key={img} className="detail-image-frame">
                          <img
                            src={img}
                            alt={`Detail ${idx}`}
                            className="detail-image"
                            onError={markImageFailed}
                          />
                          <span className="image-error-text">Image not available</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {getImplementationValue(selectedItem, "description", "Description", "remarks", "Remarks") && (
                  <p className="mt-3">
                    <strong>Description:</strong>
                    <br />
                    {getImplementationValue(selectedItem, "description", "Description", "remarks", "Remarks")}
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
