import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "../../config";
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { Eye, RefreshCw, Search, X } from "react-feather";
import "./designer-dashboard.css";

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

const textValue = (value) => String(value ?? "").trim();

const getJobNo = (job) => getValue(job, "jobNo", "JobNo", "jobNumber", "JobNumber", "comartJobNo", "ComartJobNo");
const getClient = (job) => getValue(job, "client", "Client", "designClientName", "DesignClientName", "clientName", "ClientName");
const getDesigner = (job) => getValue(job, "designerName", "DesignerName", "designer", "Designer");
const getDeadline = (job) => getValue(job, "designerDeadline", "DesignerDeadline", "dueDate", "DueDate", "deadline", "Deadline");
const getCreatedDate = (job) =>
  getValue(job, "date", "Date", "createdDate", "CreatedDate", "enteredDate", "Entereddat", "entereddt");

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const readUserContext = () => {
  try {
    const rawUsers = localStorage.getItem("users");
    if (!rawUsers) return {};

    const user = JSON.parse(rawUsers);
    const message = user?.message || user || {};
    return {
      userId: message.user_id || message.userId || message.id || "",
      username: message.username || message.userName || message.name || "",
      locationId: message.location_id ? String(message.location_id) : message.locationId ? String(message.locationId) : "",
      rolename: message.rolename || message.roleName || message.role || "",
    };
  } catch (error) {
    console.error("Unable to read user context:", error);
    return {};
  }
};

const isCompleted = (job) => {
  const explicitCompleted = getValue(job, "isCompleted", "IsCompleted", "completed", "Completed");
  if (explicitCompleted === true || String(explicitCompleted).toLowerCase() === "true") return true;
  if (getValue(job, "enddate", "endDate", "EndDate")) return true;

  const status = textValue(getValue(job, "status", "Status", "designStatus", "DesignStatus")).toLowerCase();
  return status.includes("complete") || status === "done";
};

const isOverdue = (job) => {
  if (isCompleted(job)) return false;
  const deadline = getDeadline(job);
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  return !Number.isNaN(deadlineDate.getTime()) && deadlineDate < new Date();
};

const getStatus = (job) => {
  if (isOverdue(job)) return "Overdue";

  const status = textValue(getValue(job, "status", "Status", "designStatus", "DesignStatus"));
  if (status) return status;

  if (isCompleted(job)) return "Completed";
  if (getValue(job, "startdate", "startDate", "StartDate")) return "In Progress";
  return "Pending";
};

const getStatusVariant = (status) => {
  const normalized = textValue(status).toLowerCase();
  if (normalized.includes("overdue") || normalized.includes("delay")) return "danger";
  if (normalized.includes("complete") || normalized === "done") return "success";
  if (normalized.includes("progress") || normalized.includes("start")) return "primary";
  if (normalized.includes("hold")) return "secondary";
  if (normalized.includes("pending")) return "warning";
  return "info";
};

const detailFields = [
  ["Job No", getJobNo],
  ["Client", getClient],
  ["Designer", getDesigner],
  ["Deadline", (job) => formatDateTime(getDeadline(job))],
  ["Received Date", (job) => formatDateTime(getCreatedDate(job))],
  ["Location", (job) => getValue(job, "location", "Location", "designLocation", "DesignLocation")],
  ["Visual Code", (job) => getValue(job, "visualCode", "VisualCode")],
  ["Product Details", (job) => getValue(job, "nameSubCode", "NameSubCode", "productDetails", "ProductDetails")],
  ["Artwork", (job) => getValue(job, "noOfArtwork", "NoOfArtwork", "noOfArtworker", "NoOfArtworker")],
  ["Design Type", (job) => getValue(job, "designType", "DesignType")],
  ["Brief", (job) => getValue(job, "designBrief", "DesignBrief", "brief", "Brief")],
  ["Query", (job) => getValue(job, "designQuery", "DesignQuery", "query", "Query")],
  ["Start Time", (job) => formatDateTime(getValue(job, "startdate", "startDate", "StartDate"))],
  ["End Time", (job) => formatDateTime(getValue(job, "enddate", "endDate", "EndDate"))],
  ["Entered By", (job) => getValue(job, "Entrdby", "enteredby", "Enteredby", "userName", "username")],
];

const DesignerDashboard = () => {
  const [jobNumber, setJobNumber] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [designJobs, setDesignJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchedJobNumber, setSearchedJobNumber] = useState("");
  const [userContext, setUserContext] = useState(() => readUserContext());

  useEffect(() => {
    setUserContext(readUserContext());
  }, []);

  const fetchDesignerJobs = useCallback(async () => {
    setLoading(true);
    setError("");

    const payload = {
      locationId: userContext.locationId || "",
      userId: userContext.userId || "",
      username: userContext.username || "",
      rolename: userContext.rolename || "",
    };

    const requests = [
      payload.locationId && {
        label: "location design jobs",
        run: () => axios.post(config.Design.URL.GetAllDesignAccToLocation, payload),
      },
      (payload.userId || payload.username) && {
        label: "assigned design jobs",
        run: () => axios.post(config.Design.URL.GetDesignByUserId, payload),
      },
      {
        label: "design job dashboard",
        run: () => axios.get(config.DesignJobs.URL.GetAllDesignJobs),
      },
      {
        label: "all design jobs",
        run: () => axios.post(config.Design.URL.Getalldesign),
      },
    ].filter(Boolean);

    let lastError = null;

    for (const request of requests) {
      try {
        const response = await request.run();
        const rows = getRowsFromResponse(response.data);
        if (rows.length > 0) {
          setDesignJobs(rows);
          setLoading(false);
          return;
        }
      } catch (requestError) {
        lastError = requestError;
        console.error(`Failed to load ${request.label}:`, requestError);
      }
    }

    setDesignJobs([]);
    if (lastError) {
      setError(lastError.response?.data?.message || "Could not load designer dashboard data.");
    }
    setLoading(false);
  }, [userContext.locationId, userContext.rolename, userContext.userId, userContext.username]);

  useEffect(() => {
    fetchDesignerJobs();
  }, [fetchDesignerJobs]);

  const statusOptions = useMemo(
    () => [...new Set(designJobs.map((job) => getStatus(job)).filter(Boolean))],
    [designJobs]
  );

  const filteredJobs = useMemo(() => {
    const search = searchedJobNumber.toLowerCase();

    return designJobs
      .filter((job) => {
        const matchesStatus = statusFilter === "all" || getStatus(job).toLowerCase() === statusFilter.toLowerCase();
        if (!matchesStatus) return false;
        if (!search) return true;

        return [
          getJobNo(job),
          getClient(job),
          getDesigner(job),
          getValue(job, "visualCode", "VisualCode"),
          getValue(job, "nameSubCode", "NameSubCode", "productDetails", "ProductDetails"),
        ]
          .some((value) => textValue(value).toLowerCase().includes(search));
      })
      .sort((a, b) => {
        const aDeadline = new Date(getDeadline(a)).getTime();
        const bDeadline = new Date(getDeadline(b)).getTime();
        const aSort = Number.isNaN(aDeadline) ? Number.MAX_SAFE_INTEGER : aDeadline;
        const bSort = Number.isNaN(bDeadline) ? Number.MAX_SAFE_INTEGER : bDeadline;
        return aSort - bSort;
      });
  }, [designJobs, searchedJobNumber, statusFilter]);

  const summary = useMemo(() => {
    const counts = {
      total: designJobs.length,
      overdue: 0,
      inProgress: 0,
      pending: 0,
      completed: 0,
    };

    designJobs.forEach((job) => {
      const status = getStatus(job).toLowerCase();
      if (status.includes("overdue")) counts.overdue += 1;
      else if (status.includes("complete") || status === "done") counts.completed += 1;
      else if (status.includes("progress") || status.includes("start")) counts.inProgress += 1;
      else counts.pending += 1;
    });

    return counts;
  }, [designJobs]);

  const handleSearch = (event) => {
    event.preventDefault();
    setSearchedJobNumber(jobNumber.trim());
  };

  const handleReset = () => {
    setJobNumber("");
    setSearchedJobNumber("");
    setStatusFilter("all");
    setSelectedJob(null);
  };

  const handleRefresh = () => {
    handleReset();
    fetchDesignerJobs();
  };

  return (
    <div className="page-wrapper">
      <div className="content container-fluid designer-dashboard">
        <div className="dashboard-page-header">
          <div>
            <h4>Designer Dashboard</h4>
            <p>{userContext.username ? `Signed in as ${userContext.username}` : "Design production overview"}</p>
          </div>
          <Button variant="outline-primary" onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={15} className="me-1" />
            Refresh
          </Button>
        </div>

        <Row className="g-3 dashboard-summary-row">
          <Col sm={6} xl={3}>
            <div className="designer-summary-card">
              <span>Total</span>
              <strong>{summary.total}</strong>
            </div>
          </Col>
          <Col sm={6} xl={3}>
            <div className="designer-summary-card is-danger">
              <span>Overdue</span>
              <strong>{summary.overdue}</strong>
            </div>
          </Col>
          <Col sm={6} xl={3}>
            <div className="designer-summary-card is-active">
              <span>In Progress</span>
              <strong>{summary.inProgress}</strong>
            </div>
          </Col>
          <Col sm={6} xl={3}>
            <div className="designer-summary-card is-success">
              <span>Completed</span>
              <strong>{summary.completed}</strong>
            </div>
          </Col>
        </Row>

        <Card className="designer-filter-panel">
          <Card.Body>
            <Form onSubmit={handleSearch}>
              <Row className="g-3 align-items-end">
                <Col lg={5}>
                  <Form.Group>
                    <Form.Label>Job No / Client / Designer</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search"
                      value={jobNumber}
                      onChange={(event) => setJobNumber(event.target.value)}
                      disabled={loading}
                    />
                  </Form.Group>
                </Col>
                <Col lg={3}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      disabled={loading}
                    >
                      <option value="all">All Status</option>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col lg={2} className="d-grid">
                  <Button type="submit" variant="primary" disabled={loading}>
                    <Search size={15} className="me-1" />
                    Search
                  </Button>
                </Col>
                <Col lg={2} className="d-grid">
                  <Button type="button" variant="outline-secondary" onClick={handleReset} disabled={loading}>
                    Clear
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>

        {error && <Alert variant="danger">{error}</Alert>}

        <Card className="designer-table-card">
          <Card.Header>
            <div>
              <Card.Title className="mb-0">Design Jobs</Card.Title>
              <span>{filteredJobs.length} rows</span>
            </div>
          </Card.Header>
          <Card.Body>
            {loading ? (
              <div className="designer-empty-state">
                <Spinner animation="border" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="designer-empty-state">No design jobs found</div>
            ) : (
              <div className="table-responsive">
                <Table hover className="designer-jobs-table">
                  <thead>
                    <tr>
                      <th>Job No</th>
                      <th>Client</th>
                      <th>Designer</th>
                      <th>Status</th>
                      <th>Deadline</th>
                      <th>Visual Code</th>
                      <th>Product Details</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job, index) => {
                      const status = getStatus(job);
                      const rowKey = getValue(job, "designid", "DesignId", "id", "Id", "_id") || `${getJobNo(job)}-${index}`;
                      return (
                        <tr key={rowKey}>
                          <td className="fw-semibold">{getJobNo(job) || "-"}</td>
                          <td>{getClient(job) || "-"}</td>
                          <td>{getDesigner(job) || "-"}</td>
                          <td>
                            <Badge bg={getStatusVariant(status)}>{status}</Badge>
                          </td>
                          <td>{formatDateTime(getDeadline(job))}</td>
                          <td>{getValue(job, "visualCode", "VisualCode") || "-"}</td>
                          <td>{getValue(job, "nameSubCode", "NameSubCode", "productDetails", "ProductDetails") || "-"}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="designer-icon-button"
                              onClick={() => setSelectedJob(job)}
                              title="View details"
                            >
                              <Eye size={14} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>

        {selectedJob && (
          <div className="designer-modal-overlay" onClick={() => setSelectedJob(null)}>
            <Card className="designer-modal-card" onClick={(event) => event.stopPropagation()}>
              <Card.Header>
                <div>
                  <Card.Title className="mb-0">{getJobNo(selectedJob) || "Design Job"}</Card.Title>
                  <Badge bg={getStatusVariant(getStatus(selectedJob))}>{getStatus(selectedJob)}</Badge>
                </div>
                <Button
                  variant="light"
                  className="dashboard-close-button"
                  onClick={() => setSelectedJob(null)}
                  title="Close"
                >
                  <X size={18} />
                </Button>
              </Card.Header>
              <Card.Body>
                <div className="designer-detail-grid">
                  {detailFields.map(([label, resolver]) => (
                    <div key={label} className="designer-detail-item">
                      <span>{label}</span>
                      <strong>{resolver(selectedJob) || "-"}</strong>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignerDashboard;
