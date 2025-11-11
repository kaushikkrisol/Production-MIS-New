import React, { useEffect, useMemo, useState } from "react";
import { Button, Form, Spinner, Alert, Modal, InputGroup } from "react-bootstrap";
import { AgGridReact } from "ag-grid-react";
import axios from "axios";
import { FaUpload, FaDownload, FaSearch, FaTimes } from "react-icons/fa";
import config from "../../../config";
import "./ImplementationUpload.css";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

/* ===== Helpers to support AG Grid v31+ and older ===== */
const setQuickFilterSafe = (api, text) => {
  if (!api) return;
  if (typeof api.setGridOption === "function") {
    api.setGridOption("quickFilterText", text ?? "");
  } else if (typeof api.setQuickFilter === "function") {
    api.setQuickFilter(text ?? "");
  }
};

const setPageSizeSafe = (api, size) => {
  if (!api || !size) return;
  if (typeof api.setGridOption === "function") {
    api.setGridOption("paginationPageSize", size);
  } else if (typeof api.paginationSetPageSize === "function") {
    api.paginationSetPageSize(size);
  }
};
/* ===================================================== */

const ImplementationUpload = () => {
  const [groupedData, setGroupedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Main grid
  const [gridApi, setGridApi] = useState(null);
  const [mainQuickFilter, setMainQuickFilter] = useState("");
  const [mainPageSize, setMainPageSize] = useState(10);

  // Modal grid (filter only; no pagination)
  const [modalGridApi, setModalGridApi] = useState(null);
  const [modalQuickFilter, setModalQuickFilter] = useState("");

  // Modal state / upload fields
  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedLineItem, setSelectedLineItem] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [mediaType, setMediaType] = useState("Image");
  const [imageType, setImageType] = useState("After");
  const [personName, setPersonName] = useState("");
  const [contact, setContact] = useState("");
  const [authority, setAuthority] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        config.ImplementationUpload.URL.GetAllImplementationUpload
      );
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
    const users = localStorage.getItem("users");
    const userObj = JSON.parse(users || "{}");
    const userName = userObj?.message?.username;

    const jsonData = JSON.stringify([
      {
        id: selectedLineItem.id,
        jobNo: selectedJob.jobNo,
        Width: selectedLineItem.width || null,
        Height: selectedLineItem.height || null,
        MediaFiles: [
          {
            FileType: getMediaTypeEnumValue(mediaType),
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
    formData.append("enteredby", userName);

    try {
      setLoading(true);
      await axios.post(config.ImplementationUpload.URL.Upload, formData);
      alert("Upload successful");
      setShowModal(false);
      setUploadFile(null);
      setSelectedLineItem(null);
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
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${jobNo}_implementation.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      setError("Failed to download PDF");
    }
  };

  /** ──────────────────────────────────────────────────────────────
   *  FLATTEN: one main-grid row per LINE ITEM (with job info)
   *  Clicking Upload carries THAT SPECIFIC line item to the modal.
   *  ────────────────────────────────────────────────────────────── */
  const flatRows = useMemo(() => {
    const rows = [];
    for (const group of groupedData || []) {
      const jobNo = group.jobNo;
      const jobArray = Array.isArray(group.jobDetails) ? group.jobDetails : [];
      const firstJob = jobArray[0] || {};
      const client = firstJob.client || "N/A";
      const salonAddress = firstJob.salonAddress || "N/A";

      for (const item of jobArray) {
        rows.push({
          jobNo,
          client,
          salonAddress,
          // the line item we will upload against
          lineItem: item,
          // some visible columns
          nameSubCode: item.nameSubCode,
          media: item.media,
          city: item.city,
          qty: item.qty,
          width: item.width,
          height: item.height
        });
      }
    }
    return rows;
  }, [groupedData]);

  const defaultColDef = useMemo(
    () => ({
      filter: true,
      floatingFilter: true,
      sortable: true,
      resizable: true,
      flex: 1,
      minWidth: 120
    }),
    []
  );

  const columnDefs = useMemo(
    () => [
      { headerName: "Job No", field: "jobNo", minWidth: 130 },
      { headerName: "Client", field: "client" },
      { headerName: "Salon Address", field: "salonAddress", minWidth: 200 },
      { headerName: "Product Details", field: "nameSubCode", minWidth: 220 },
      { headerName: "Media", field: "media" },
      { headerName: "City", field: "city" },
      { headerName: "Qty", field: "qty", maxWidth: 110 },
      { headerName: "W", field: "width", maxWidth: 100 },
      { headerName: "H", field: "height", maxWidth: 100 },
      {
        headerName: "Actions",
        colId: "actions",
        cellRenderer: (params) => (
          <div className="d-flex gap-2">
            <Button
              size="sm"
              variant="success"
              onClick={() => {
                // store the exact clicked line item & minimal job info
                setSelectedJob({
                  jobNo: params.data.jobNo,
                  salonAddress: params.data.salonAddress
                });
                setSelectedLineItem(params.data.lineItem);
                setShowModal(true);

                // reset modal filter
                setModalQuickFilter("");
                if (modalGridApi) {
                  modalGridApi.setFilterModel?.(null);
                  modalGridApi.onFilterChanged?.();
                  setQuickFilterSafe(modalGridApi, "");
                }
              }}
            >
              <FaUpload /> Upload
            </Button>
            <Button size="sm" variant="primary" onClick={() => handleDownload(params.data.jobNo)}>
              <FaDownload /> PDF
            </Button>
          </div>
        ),
        filter: false,
        sortable: false,
        suppressMenu: true,
        minWidth: 220,
        flex: 0
      }
    ],
    [modalGridApi]
  );

  /* ===== Main grid events ===== */
  const onGridReady = (params) => {
    setGridApi(params.api);
    setQuickFilterSafe(params.api, mainQuickFilter);
    setPageSizeSafe(params.api, mainPageSize);
  };

  const clearMainFilters = () => {
    if (!gridApi) return;
    gridApi.setFilterModel(null);
    gridApi.onFilterChanged?.();
    setMainQuickFilter("");
    setQuickFilterSafe(gridApi, "");
  };

  /* ===== Modal grid events (no pagination) ===== */
  const onModalGridReady = (params) => {
    setModalGridApi(params.api);
    setQuickFilterSafe(params.api, modalQuickFilter);
  };

  const clearModalFilters = () => {
    if (!modalGridApi) return;
    modalGridApi.setFilterModel(null);
    modalGridApi.onFilterChanged?.();
    setModalQuickFilter("");
    setQuickFilterSafe(modalGridApi, "");
  };

  return (
    <div className="container " style={{ marginTop: 100, marginLeft: 300 }}>
      <h4 className="text-center mb-3">Implementation Upload</h4>

      {loading && <Spinner animation="border" />}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Main grid toolbar */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <InputGroup style={{ maxWidth: 420 }}>
          <InputGroup.Text style={{ background: "white" }}>
            <FaSearch />
          </InputGroup.Text>
          <Form.Control
            placeholder="Type to filter all columns…"
            value={mainQuickFilter}
            onChange={(e) => {
              const val = e.target.value;
              setMainQuickFilter(val);
              setQuickFilterSafe(gridApi, val);
            }}
          />
          {mainQuickFilter && (
            <Button variant="light" onClick={clearMainFilters} title="Clear filters">
              <FaTimes />
            </Button>
          )}
        </InputGroup>

        <div className="d-flex align-items-center gap-2">
          <Form.Select
            size="sm"
            style={{ width: 120 }}
            value={mainPageSize}
            onChange={(e) => {
              const size = Number(e.target.value);
              setMainPageSize(size);
              setPageSizeSafe(gridApi, size);
            }}
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </Form.Select>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => gridApi?.exportDataAsCsv?.({ fileName: "implementation.csv" })}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Main grid (pagination on) */}
      <div className="ag-theme-alpine" style={{ height: 460, width: "100%" }}>
        <AgGridReact
          rowData={flatRows}                   
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={mainPageSize}
          rowHeight={56}
          onGridReady={onGridReady}
        />
      </div>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Upload Media</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* Job info */}
          {selectedJob && (
            <div className="mb-2 small text-muted">
              <strong>Job:</strong> {selectedJob.jobNo} &nbsp;|&nbsp;
              <strong>Address:</strong> {selectedJob.salonAddress}
            </div>
          )}

          {/* Modal toolbar (filter only) */}
          <div className="d-flex align-items-center justify-content-between mb-2">
            <InputGroup style={{ maxWidth: 360 }}>
              <InputGroup.Text style={{ background: "white" }}>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                placeholder="Filter product/rows…"
                value={modalQuickFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setModalQuickFilter(val);
                  setQuickFilterSafe(modalGridApi, val);
                }}
              />
              {modalQuickFilter && (
                <Button variant="light" onClick={clearModalFilters} title="Clear filters">
                  <FaTimes />
                </Button>
              )}
            </InputGroup>
            <div />
          </div>

          {/* Modal grid — ALWAYS exactly one row */}
          <div className="ag-theme-alpine mb-3" style={{ height: 160, width: "100%" }}>
            <AgGridReact
              rowData={selectedLineItem ? [selectedLineItem] : []}
              columnDefs={[
                { headerName: "Product Details", field: "nameSubCode" },
                { headerName: "Media", field: "media" },
                { headerName: "City", field: "city" },
                { headerName: "Qty", field: "qty" },
                { headerName: "Width", field: "width" },
                { headerName: "Height", field: "height" }
              ]}
              defaultColDef={defaultColDef}
              rowSelection="single"
              onGridReady={onModalGridReady}
              pagination={false}                
              suppressPaginationPanel={true}
              domLayout="autoHeight"
            />
          </div>

          {/* Upload form */}
          <Form.Group className="mb-5 pt-5" style={{ marginTop: 70 }}>
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
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleUpload} disabled={!uploadFile || !selectedLineItem}>
            Upload
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ImplementationUpload;
