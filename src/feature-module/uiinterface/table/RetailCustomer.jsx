import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import axios from "axios";
import Select from "react-select";
import DatePicker from "react-datepicker";
import { Edit2, RefreshCw, Save, Trash2, XCircle } from "react-feather";
import "react-datepicker/dist/react-datepicker.css";
import config from "../../../config";

const STORAGE_KEY = "retailCustomerRows";

const emptyElementItem = {
  id: "",
  description: "",
  vendorCost: "",
  customerPrice: "",
  jobDeadline: "",
  vendorDeadline: "",
  vendorName: "",
};

const emptyForm = {
  id: "",
  jobNo: "",
  clientName: "",
  customerId: "",
  subClient: "",
  businessType: "",
  elements: [],
};

const getRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeKey = (value) => normalizeText(value).toLowerCase();

const isRetailBusinessType = (value) => normalizeKey(value).includes("retail");

const getLoggedInUser = () => {
  try {
    return JSON.parse(localStorage.getItem("users") || "{}")?.message || {};
  } catch (error) {
    console.error("Failed to read logged in user", error);
    return {};
  }
};

const getJobNo = (job = {}) =>
  normalizeText(
    job?.comartjobno ??
      job?.comartJobNo ??
      job?.ComartJobNo ??
      job?.COMARTJOBNO ??
      job?.jobNo ??
      job?.jobno ??
      job?.JobNo ??
      job?.jobNumber ??
      job?.JobNumber ??
      job?.["Job No"] ??
      ""
  );

const getJobClient = (job = {}) =>
  normalizeText(
    job?.client ??
      job?.CLIENT ??
      job?.customername ??
      job?.customerName ??
      job?.CustomerName ??
      ""
  );

const getJobSubClient = (job = {}) =>
  normalizeText(job?.subClient ?? job?.subclient ?? job?.["Sub Client"] ?? "");

const getJobCustomerId = (job = {}) =>
  normalizeText(job?.customerid ?? job?.customerId ?? job?.customeR_ID ?? "");

const getJobBusinessType = (job = {}) =>
  normalizeText(
    job?.businessType ??
      job?.BusinessType ??
      job?.businesstype ??
      job?.["Business Type"] ??
      job?.segment ??
      job?.Segment ??
      ""
  );

const normalizeMoney = (value) =>
  String(value || "")
    .trim()
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

const isPositiveAmount = (value) => {
  const numberValue = Number(normalizeMoney(value));
  return Number.isFinite(numberValue) && numberValue > 0;
};

const normalizeElementRow = (item = {}, index = 0) => ({
  id: String(item?.id || item?.elementId || `element-${index}`),
  description: normalizeText(item?.description || item?.Description || ""),
  vendorCost: String(item?.vendorCost ?? item?.VendorCost ?? ""),
  customerPrice: String(item?.customerPrice ?? item?.CustomerPrice ?? ""),
  jobDeadline: item?.jobDeadline || item?.JobDeadline || "",
  vendorDeadline: item?.vendorDeadline || item?.VendorDeadline || "",
  vendorName: normalizeText(item?.vendorName || item?.VendorName || ""),
});

const normalizeRetailRow = (row = {}, index = 0) => ({
  id: String(row?.id || row?.retailCustomerId || `retail-${index}`),
  jobNo: normalizeText(row?.jobNo || row?.JobNo || row?.["Job No"] || ""),
  clientName: normalizeText(
    row?.clientName || row?.ClientName || row?.Client || row?.CLIENT || ""
  ),
  customerId: normalizeText(row?.customerId || row?.CustomerId || ""),
  subClient: normalizeText(
    row?.subClient || row?.SubClient || row?.["Sub Client"] || ""
  ),
  businessType: normalizeText(
    row?.businessType || row?.BusinessType || row?.["Business Type"] || ""
  ),
  elements: Array.isArray(row?.elements || row?.Elements)
    ? (row.elements || row.Elements).map(normalizeElementRow)
    : [],
  Enteredby: row?.Enteredby || row?.enteredby || "",
  Entereddat: row?.Entereddat || row?.entereddat || "",
});

const getSavedRetailRows = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeRetailRow) : [];
  } catch (error) {
    console.error("Failed to parse retail customer rows", error);
    return [];
  }
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const selectPortalTarget = () =>
  typeof document !== "undefined" ? document.body : undefined;

const retailSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderColor: state.isFocused ? "#2f5ed9" : "#d8e0ea",
    borderRadius: 6,
    boxShadow: state.isFocused ? "0 0 0 3px rgba(47, 94, 217, 0.14)" : "none",
    fontSize: 14,
    "&:hover": {
      borderColor: state.isFocused ? "#2f5ed9" : "#c7d0dc",
    },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#2f5ed9"
      : state.isFocused
        ? "#eef3ff"
        : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#25364d",
    cursor: "pointer",
  }),
};

const businessTypeOptions = [
  { value: "Retail", label: "Retail" },
  { value: "Print + Retail", label: "Print + Retail" },
  { value: "Print", label: "Print" },
  { value: "Onsite", label: "Onsite" },
];

const RetailCustomer = () => {
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState(getSavedRetailRows);
  const [jobOptions, setJobOptions] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("");
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    const loadJobs = async () => {
      const user = getLoggedInUser();
      const locationId = user?.location_id || user?.locationId || "";

      if (!locationId) {
        setJobOptions([]);
        return;
      }

      setIsLoadingJobs(true);

      try {
        const payload = {
          locationId,
          location_id: locationId,
          locationid: locationId,
        };

        const responses = await Promise.allSettled([
          axios.post(config.JobSummary.URL.GetAllJobsFromSql, payload),
          axios.post(config.JobSummary.URL.GetAllJobsAccToLocation, payload),
          axios.post(config.JobSummary.URL.Getalljob, payload),
        ]);

        const seen = new Set();

        const options = responses
          .flatMap((result) =>
            result.status === "fulfilled" ? getRows(result.value.data) : []
          )
          .map((job) => {
            const jobNo = getJobNo(job);

            if (!jobNo || seen.has(jobNo)) return null;

            seen.add(jobNo);

            const clientName = getJobClient(job);
            const businessType = getJobBusinessType(job);

            return {
              value: jobNo,
              label: clientName ? `${jobNo} (${clientName})` : jobNo,
              jobNo,
              clientName,
              customerId: getJobCustomerId(job),
              subClient: getJobSubClient(job),
              businessType,
            };
          })
          .filter(Boolean);

        setJobOptions(options);
      } catch (error) {
        console.error("Unable to load job numbers for retail customer", error);
        setJobOptions([]);
        setMessage("Could not load job numbers from API.");
      } finally {
        setIsLoadingJobs(false);
      }
    };

    loadJobs();
  }, []);

  const selectedJobOption = useMemo(() => {
    if (!form.jobNo) return null;

    return (
      jobOptions.find((option) => option.value === form.jobNo) || {
        value: form.jobNo,
        label: form.clientName ? `${form.jobNo} (${form.clientName})` : form.jobNo,
      }
    );
  }, [form.clientName, form.jobNo, jobOptions]);

  const selectedBusinessTypeOption = useMemo(
    () =>
      businessTypeOptions.find((option) => option.value === form.businessType) ||
      (form.businessType
        ? { value: form.businessType, label: form.businessType }
        : null),
    [form.businessType]
  );

  const filteredRows = useMemo(() => {
    const query = normalizeKey(searchText);
    if (!query) return rows;

    return rows.filter((row) =>
      [
        row.jobNo,
        row.clientName,
        row.subClient,
        row.businessType,
        ...(row.elements || []).flatMap((item) => [
          item.description,
          item.vendorCost,
          item.customerPrice,
          item.jobDeadline,
          item.vendorDeadline,
          item.vendorName,
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [rows, searchText]);

  const handleJobChange = (option) => {
    if (!option) {
      setForm(emptyForm);
      setMessage("");
      return;
    }

    const existingRow = rows.find((row) => row.jobNo === option.jobNo);

    if (existingRow) {
      setForm(existingRow);
      setMessage("Existing retail customer details loaded for this job.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      id: "",
      jobNo: option.jobNo,
      clientName: option.clientName || "",
      customerId: option.customerId || "",
      subClient: option.subClient || "",
      businessType: option.businessType || prev.businessType || "",
      elements: [],
    }));

    setMessage("");
  };

  const handleBusinessTypeChange = (option) => {
    setForm((prev) => ({
      ...prev,
      businessType: option?.value || "",
    }));
  };

  const handleElementChange = (index, field, value) => {
    const next = [...(form.elements || [])];

    next[index] = {
      ...next[index],
      [field]: value,
    };

    setForm((prev) => ({
      ...prev,
      elements: next,
    }));
  };

  const addElementRow = () => {
    setForm((prev) => ({
      ...prev,
      elements: [...(prev.elements || []), { ...emptyElementItem }],
    }));
  };

  const removeElementRow = (index) => {
    const next = [...(form.elements || [])];
    next.splice(index, 1);

    setForm((prev) => ({
      ...prev,
      elements: next,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMessage("");
  };

  const validateForm = () => {
    if (!form.jobNo) return "Please select job number.";

    if (!isRetailBusinessType(form.businessType)) {
      return "Please select Retail business type for this screen.";
    }

    if (!form.elements.length) {
      return "Please add at least one element.";
    }

    for (let i = 0; i < form.elements.length; i += 1) {
      const item = form.elements[i];

      if (!normalizeText(item.description)) {
        return `Please enter description in element row ${i + 1}.`;
      }

      if (!isPositiveAmount(item.vendorCost)) {
        return `Vendor cost must be greater than 0 in row ${i + 1}.`;
      }

      if (!isPositiveAmount(item.customerPrice)) {
        return `Customer price must be greater than 0 in row ${i + 1}.`;
      }

      if (!item.jobDeadline) {
        return `Please select job deadline in row ${i + 1}.`;
      }

      if (!item.vendorDeadline) {
        return `Please select vendor deadline in row ${i + 1}.`;
      }

      if (!normalizeText(item.vendorName)) {
        return `Please enter vendor name in row ${i + 1}.`;
      }
    }

    return "";
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSaving(true);

    const user = getLoggedInUser();

    const cleanRow = normalizeRetailRow({
      ...form,
      id: form.id || `retail-${Date.now()}`,
      elements: (form.elements || []).map((item, index) => ({
        ...item,
        id: item.id || `element-${Date.now()}-${index}`,
        description: normalizeText(item.description),
        vendorCost: normalizeMoney(item.vendorCost),
        customerPrice: normalizeMoney(item.customerPrice),
        jobDeadline: item.jobDeadline,
        vendorDeadline: item.vendorDeadline,
        vendorName: normalizeText(item.vendorName),
      })),
      Enteredby: user?.username || user?.userName || user?.name || "",
      Entereddat: new Date().toISOString(),
    });

    setRows((prev) => {
      const exists = prev.some(
        (row) => row.id === cleanRow.id || row.jobNo === cleanRow.jobNo
      );

      if (exists) {
        return prev.map((row) =>
          row.id === cleanRow.id || row.jobNo === cleanRow.jobNo ? cleanRow : row
        );
      }

      return [cleanRow, ...prev];
    });

    setForm(cleanRow);
    setMessage("Retail customer details saved.");
    setIsSaving(false);
  };

  const handleEdit = (row) => {
    setForm({
      ...row,
      elements: Array.isArray(row.elements) ? row.elements : [],
    });
    setMessage("");
  };

  const handleDelete = (rowId) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
    if (form.id === rowId) resetForm();
    setMessage("Retail customer row deleted.");
  };

  const isWarningMessage =
    message.includes("Please") ||
    message.includes("must") ||
    message.includes("Could not");

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <style>{`
          .retail-header {
            align-items: center;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: space-between;
            margin-bottom: 14px;
          }
          .retail-header h4 {
            color: #14213d;
            font-weight: 700;
            margin: 0;
          }
          .retail-count {
            background: #eef3ff;
            border: 1px solid #b9c8f7;
            border-radius: 6px;
            color: #2f5ed9;
            font-size: 13px;
            font-weight: 700;
            padding: 6px 10px;
          }
          .retail-card {
            border: 1px solid #d8e0ea;
            border-radius: 8px;
            box-shadow: 0 10px 24px rgba(22, 34, 51, 0.06);
          }
          .retail-card label {
            color: #31425a;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 6px;
          }
          .retail-card .form-control,
          .retail-card .form-select,
          .retail-date-input {
            border-color: #d8e0ea;
            border-radius: 6px;
            color: #25364d;
            font-size: 14px;
            min-height: 42px;
          }
          .retail-card .form-control:focus,
          .retail-card .form-select:focus,
          .retail-date-input:focus {
            border-color: #2f5ed9;
            box-shadow: 0 0 0 3px rgba(47, 94, 217, 0.14);
          }
          .retail-readonly {
            background: #f8fafc;
            border: 1px solid #d8e0ea;
            border-radius: 6px;
            min-height: 42px;
            padding: 10px 12px;
          }
          .retail-table th {
            background: #eef4fb;
            border-color: #d5deea;
            color: #1d2f49;
            font-weight: 700;
            white-space: nowrap;
          }
          .retail-table td {
            border-color: #d5deea;
            color: #25364d;
            vertical-align: middle;
          }
          .retail-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          @media (max-width: 767.98px) {
            .retail-header {
              align-items: flex-start;
              flex-direction: column;
            }
            .retail-actions .btn {
              width: 100%;
            }
          }
        `}</style>

        <div className="retail-header">
          <h4>Retail Customer</h4>
          <span className="retail-count">{rows.length} Retail Row(s)</span>
        </div>

        {message && (
          <Alert variant={isWarningMessage ? "warning" : "success"}>
            {message}
          </Alert>
        )}

        {isLoadingJobs && <Alert variant="info">Loading job numbers...</Alert>}

        <Card className="retail-card mb-3">
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col xl={4} md={6}>
                  <Form.Group>
                    <Form.Label>Job No</Form.Label>
                    <Select
                      classNamePrefix="retail-job-select"
                      styles={retailSelectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      isClearable
                      isSearchable
                      options={jobOptions}
                      value={selectedJobOption}
                      onChange={handleJobChange}
                      placeholder="Search job number"
                      noOptionsMessage={() => "No job numbers found"}
                    />
                  </Form.Group>
                </Col>

                <Col xl={4} md={6}>
                  <Form.Group>
                    <Form.Label>Client</Form.Label>
                    <div className="retail-readonly">{form.clientName || "-"}</div>
                  </Form.Group>
                </Col>

                <Col xl={4} md={6}>
                  <Form.Group>
                    <Form.Label>Business Type</Form.Label>
                    <Select
                      classNamePrefix="retail-business-select"
                      styles={retailSelectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      isClearable
                      options={businessTypeOptions}
                      value={selectedBusinessTypeOption}
                      onChange={handleBusinessTypeChange}
                      placeholder="Select business type"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12}>
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                    <div>
                      <h6 className="mb-0">Add Elements</h6>
                      <small className="text-muted">
                        Add description, vendor cost, customer price, job deadline,
                        vendor deadline and vendor name.
                      </small>
                    </div>

                    <Button
                      size="sm"
                      variant="outline-primary"
                      type="button"
                      onClick={addElementRow}
                    >
                      Add Element
                    </Button>
                  </div>

                  <Table responsive className="retail-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Vendor Cost</th>
                        <th>Customer Price</th>
                        <th>Job Deadline</th>
                        <th>Vendor Deadline</th>
                        <th>Vendor Name</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(form.elements || []).length ? (
                        (form.elements || []).map((item, index) => (
                          <tr key={index}>
                            <td>
                              <Form.Control
                                value={item.description}
                                onChange={(event) =>
                                  handleElementChange(
                                    index,
                                    "description",
                                    event.target.value
                                  )
                                }
                                placeholder="Description"
                              />
                            </td>

                            <td>
                              <Form.Control
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.vendorCost}
                                onChange={(event) =>
                                  handleElementChange(
                                    index,
                                    "vendorCost",
                                    event.target.value
                                  )
                                }
                                placeholder="Vendor cost"
                              />
                            </td>

                            <td>
                              <Form.Control
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.customerPrice}
                                onChange={(event) =>
                                  handleElementChange(
                                    index,
                                    "customerPrice",
                                    event.target.value
                                  )
                                }
                                placeholder="Customer price"
                              />
                            </td>

                            <td>
                              <DatePicker
                                selected={
                                  item.jobDeadline
                                    ? new Date(item.jobDeadline)
                                    : null
                                }
                                onChange={(date) =>
                                  handleElementChange(
                                    index,
                                    "jobDeadline",
                                    date ? date.toISOString() : ""
                                  )
                                }
                                showTimeSelect
                                dateFormat="dd-MMM-yyyy hh:mm aa"
                                minDate={new Date()}
                                className="form-control retail-date-input"
                                placeholderText="Select job deadline"
                                popperPlacement="bottom-start"
                              />
                            </td>

                            <td>
                              <DatePicker
                                selected={
                                  item.vendorDeadline
                                    ? new Date(item.vendorDeadline)
                                    : null
                                }
                                onChange={(date) =>
                                  handleElementChange(
                                    index,
                                    "vendorDeadline",
                                    date ? date.toISOString() : ""
                                  )
                                }
                                showTimeSelect
                                dateFormat="dd-MMM-yyyy hh:mm aa"
                                minDate={new Date()}
                                className="form-control retail-date-input"
                                placeholderText="Select vendor deadline"
                                popperPlacement="bottom-start"
                              />
                            </td>

                            <td>
                              <Form.Control
                                value={item.vendorName}
                                onChange={(event) =>
                                  handleElementChange(
                                    index,
                                    "vendorName",
                                    event.target.value
                                  )
                                }
                                placeholder="Vendor name"
                              />
                            </td>

                            <td>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                type="button"
                                onClick={() => removeElementRow(index)}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center text-muted py-3">
                            No element rows added.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Col>

                <Col xs={12}>
                  <div className="retail-actions">
                    <Button type="submit" variant="primary" disabled={isSaving}>
                      <Save size={15} className="me-1" />
                      {form.id ? "Update Retail" : "Save Retail"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={resetForm}
                      disabled={isSaving}
                    >
                      <RefreshCw size={15} className="me-1" />
                      Clear
                    </Button>
                  </div>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>

        <Card className="retail-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h5 className="mb-0">Retail Customer List</h5>

              <Form.Control
                style={{ maxWidth: 320 }}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search retail customer"
              />
            </div>

            <Table responsive className="retail-table">
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Client</th>
                  <th>Business Type</th>
                  <th>Elements</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.jobNo || "-"}</td>
                      <td>{row.clientName || "-"}</td>
                      <td>{row.businessType || "-"}</td>
                      <td>
                        {row.elements?.length ? (
                          <Table responsive size="sm" className="mb-0 retail-table">
                            <thead>
                              <tr>
                                <th>Description</th>
                                <th>Vendor Cost</th>
                                <th>Customer Price</th>
                                <th>Job Deadline</th>
                                <th>Vendor Deadline</th>
                                <th>Vendor</th>
                              </tr>
                            </thead>

                            <tbody>
                              {row.elements.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.description || "-"}</td>
                                  <td>{item.vendorCost || "-"}</td>
                                  <td>{item.customerPrice || "-"}</td>
                                  <td>{formatDateTime(item.jobDeadline)}</td>
                                  <td>{formatDateTime(item.vendorDeadline)}</td>
                                  <td>{item.vendorName || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleEdit(row)}
                          >
                            <Edit2 size={14} className="me-1" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDelete(row.id)}
                          >
                            <Trash2 size={14} className="me-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      <XCircle size={16} className="me-1" />
                      No retail customer rows found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default RetailCustomer;