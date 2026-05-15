import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import axios from "axios";
import config from "../../../config";

const STORAGE_KEY = "elementGroupMasterRows";

const emptyElementItem = {
  id: "",
  visualCode: "",
  qty: "",
  width: "",
  height: "",
  media: "",
  laminationFlag: "",
  lamination: "",
  mountingFlag: "",
  mounting: "",
  implementation: "",
};

const emptyForm = {
  id: "",
  elementGroupCode: "",
  elementGroupName: "",
  description: "",
  isActive: "1",
  elements: [],
};

const getRowsFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const getLoggedInUserName = () => {
  try {
    const user = JSON.parse(localStorage.getItem("users") || "{}")?.message || {};
    return user?.username || user?.userName || user?.name || "";
  } catch {
    return "";
  }
};

const getLoggedInUser = () => {
  try {
    return JSON.parse(localStorage.getItem("users") || "{}")?.message || {};
  } catch {
    return {};
  }
};

const isFinanceUser = (user = getLoggedInUser()) => {
  const roleText = [
    user?.rolE_NAME,
    user?.roleName,
    user?.ROLE_NAME,
    user?.department,
    user?.Department,
    user?.team,
    user?.Team,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return roleText.includes("finance") || roleText.includes("accounts") || roleText.includes("admin");
};

const getRateMedia = (row) =>
  row?.externalMedia ||
  row?.ExternalMedia ||
  row?.internalMedia ||
  row?.InternalMedia ||
  row?.media ||
  row?.Media ||
  row?.productCode ||
  row?.ProductCode ||
  "";

const normalizeRateRow = (row, index = 0) => ({
  id: String(row?.id || row?._id || `rate-${index}`),
  customerId: String(
    row?.customerId || row?.customerID || row?.CustomerId || row?.CUSTOMER_ID || ""
  ).trim(),
  customerName: String(
    row?.customerName || row?.CustomerName || row?.client || row?.CLIENT || ""
  ).trim(),
  media: String(getRateMedia(row) || "").trim(),
  internalMedia: String(
    row?.internalMedia || row?.InternalMedia || row?.media || row?.Media || ""
  ).trim(),
  externalMedia: String(
    row?.externalMedia || row?.ExternalMedia || row?.media || row?.Media || ""
  ).trim(),
});

const getRateRowsFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const parseElementRows = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

const normalizeElementRow = (item = {}) => ({
  id: String(item?.id || item?.elementId || item?.ElementId || ""),
  visualCode: String(item?.visualCode || item?.VisualCode || item?.elementName || item?.ElementName || "").trim(),
  qty: String(item?.qty ?? item?.Qty ?? item?.quantity ?? ""),
  width: String(item?.width ?? item?.Width ?? ""),
  height: String(item?.height ?? item?.Height ?? ""),
  media: String(item?.media || item?.Media || "").trim(),
  laminationFlag: String(
    item?.laminationFlag ||
      item?.LaminationFlag ||
      item?.isLamination ||
      item?.IsLamination ||
      (item?.lamination || item?.Lamination ? "Yes" : "")
  ).trim(),
  lamination: String(item?.lamination || item?.Lamination || "").trim(),
  mountingFlag: String(
    item?.mountingFlag ||
      item?.MountingFlag ||
      item?.isMounting ||
      item?.IsMounting ||
      (item?.mounting || item?.Mounting ? "Yes" : "")
  ).trim(),
  mounting: String(item?.mounting || item?.Mounting || "").trim(),
  implementation: String(item?.implementation || item?.Implementation || "").trim(),
});

const normalizeRow = (row, index = 0) => ({
  id: String(row?.id ?? row?.ID ?? row?._id ?? `api-${index}`),
  elementGroupCode:
    row?.elementGroupCode ??
    row?.ElementGroupCode ??
    row?.groupCode ??
    "",
  elementGroupName:
    row?.elementGroupName ??
    row?.ElementGroupName ??
    row?.groupName ??
    row?.elementGroup ??
    "",
  customerName: "",
  description:
    row?.description ??
    row?.Description ??
    "",
  isActive: String(row?.isActive ?? row?.IsActive ?? "1"),
  elements: parseElementRows(
    row?.elements ?? row?.Elements ?? row?.elementRows ?? row?.elementDetails ?? []
  ).map(normalizeElementRow),
  Del_index: row?.Del_index ?? row?.del_index ?? "1",
  Enteredby: row?.Enteredby ?? row?.enteredby ?? "",
  Entereddat: row?.Entereddat ?? row?.entereddat ?? null,
  Lstupateby: row?.Lstupateby ?? row?.lstupateby ?? "",
  Lstupdatedt: row?.Lstupdatedt ?? row?.lstupdatedt ?? null,
});

const toApiPayload = (row, mode) => {
  const now = new Date().toISOString();
  const userName = getLoggedInUserName();

  const payload = {
    id: row.id || undefined,
    elementGroupCode: row.elementGroupCode,
    elementGroupName: row.elementGroupName,
    customerName: "",
    description: row.description || "",
    isActive: row.isActive || "1",

    // ✅ send array, not JSON string
    elements: row.elements || [],

    Del_index: row.Del_index || "1",
  };

  if (mode === "add") {
    payload.Enteredby = userName;
    payload.Entereddat = now;
  }

  if (mode === "update" || mode === "delete") {
    payload.Lstupateby = userName;
    payload.Lstupdatedt = now;
  }

  return payload;
};

const ElementGroupMaster = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rateRows, setRateRows] = useState([]);
  const canManageElementGroups = useMemo(() => isFinanceUser(), []);

  const fetchElementGroups = useCallback(async ({ showFallbackMessage = true } = {}) => {
    setIsLoading(true);

    try {
      const response = await axios.get(config.ElementGroupMaster.URL.GetAll, {
        timeout: 10000,
      });

      const apiRows = getRowsFromResponse(response.data).map((row, index) =>
        normalizeRow(row, index)
      );

      setRows(apiRows);
      return true;
    } catch (error) {
      console.error("Error fetching element groups", error);

      const savedRows = localStorage.getItem(STORAGE_KEY);
      if (savedRows) {
        try {
          const parsed = JSON.parse(savedRows).map((row, index) =>
            normalizeRow(row, index)
          );
          setRows(parsed);

          if (showFallbackMessage) {
            setMessage("Could not load element groups from API. Showing saved local data.");
          }

          return false;
        } catch (parseError) {
          console.error("Failed to parse element group rows", parseError);
        }
      }

      setRows([]);
      if (showFallbackMessage) {
        setMessage("Could not load element groups from API.");
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadFormResources = async () => {
      await fetchElementGroups();

      try {
        console.log("Loading master media list");
        const rateResponse = await axios.get(config.ProductMediaRateMaster.URL.GetAll, {
          timeout: 10000,
        });
        const rates = getRateRowsFromResponse(rateResponse.data).map(normalizeRateRow);
        console.log("Fetched rates:", rates.length);
        setRateRows(rates);
      } catch (error) {
        console.warn("Unable to load media defaults for Element Group Master", error);
      }
    };

    loadFormResources();
  }, [fetchElementGroups]);

  useEffect(() => {
    if (rows.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    }
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      [
        row.elementGroupCode,
        row.elementGroupName,
        row.description,
        "master general",
        row.isActive === "1" ? "active" : "inactive",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [rows, searchText]);

  const mediaOptions = useMemo(() => {
    const seen = new Set();
    
    return rateRows.reduce((acc, row) => {
      const media = String(row.media || "").trim();
      if (media && !seen.has(media)) {
        seen.add(media);
        acc.push({ value: media, label: media });
      }
      return acc;
    }, []);
  }, [rateRows]);

  const handleElementMediaChange = (index, value) => {
    const next = [...(form.elements || [])];
    next[index] = {
      ...next[index],
      media: value,
    };
    setForm((prev) => ({ ...prev, elements: next }));
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMessage("");
  };

  const validateForm = () => {
    if (!canManageElementGroups) {
      return "Only Finance / Accounts team users can create or edit element groups.";
    }

    if (!String(form.elementGroupCode || "").trim()) {
      return "Please enter element group code.";
    }

    if (!String(form.elementGroupName || "").trim()) {
      return "Please enter element group name.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationMessage = validateForm();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    const cleanRow = {
      ...form,
      elementGroupCode: String(form.elementGroupCode || "").trim(),
      elementGroupName: String(form.elementGroupName || "").trim(),
      customerName: "",
      description: String(form.description || "").trim(),
      isActive: String(form.isActive || "1"),
      elements: Array.isArray(form.elements)
        ? form.elements.map((item) => ({
            ...item,
            visualCode: String(item.visualCode || "").trim(),
            qty: String(item.qty || "").trim(),
            width: String(item.width || "").trim(),
            height: String(item.height || "").trim(),
            media: String(item.media || "").trim(),
            laminationFlag: String(item.laminationFlag || "").trim(),
            lamination: String(item.lamination || "").trim(),
            mountingFlag: String(item.mountingFlag || "").trim(),
            mounting: String(item.mounting || "").trim(),
            implementation: String(item.implementation || "").trim(),
          }))
        : [],
    };

    try {
      setIsSaving(true);

      const isUpdate = Boolean(form.id);
      const apiUrl = isUpdate
        ? config.ElementGroupMaster.URL.Update
        : config.ElementGroupMaster.URL.Add;

      await axios.post(apiUrl, toApiPayload(cleanRow, isUpdate ? "update" : "add"), {
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      });

      await fetchElementGroups({ showFallbackMessage: false });

      setMessage(isUpdate ? "Element group updated." : "Element group added.");
      setForm(emptyForm);
    } catch (error) {
      console.error("Error saving element group", error);
      const localId = cleanRow.id || `local-${Date.now()}`;
      const savedRow = normalizeRow({ ...cleanRow, id: localId }, rows.length);
      setRows((prevRows) => [
        ...prevRows.filter((row) => row.id !== localId),
        savedRow,
      ]);
      setMessage(
        "Saved locally. API unavailable or failed to save to server."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (row) => {
    setForm({
      id: row.id,
      elementGroupCode: row.elementGroupCode || "",
      elementGroupName: row.elementGroupName || "",
      description: row.description || "",
      isActive: row.isActive || "1",
      elements: Array.isArray(row.elements) && row.elements.length ? row.elements : [],
    });

    setMessage("");
  };

  const handleDelete = async (rowId) => {
    try {
      setIsSaving(true);

      const selectedRow = rows.find((row) => row.id === rowId) || { id: rowId };

      await axios.post(
        config.ElementGroupMaster.URL.Delete,
        toApiPayload({ ...selectedRow, id: rowId, Del_index: "0" }, "delete"),
        {
          timeout: 10000,
          headers: { "Content-Type": "application/json" },
        }
      );

      await fetchElementGroups({ showFallbackMessage: false });

      if (form.id === rowId) resetForm();

      setMessage("Element group deleted.");
    } catch (error) {
      console.error("Error deleting element group", error);
      setRows((prevRows) => prevRows.filter((row) => row.id !== rowId));
      if (form.id === rowId) resetForm();
      setMessage(
        "Deleted locally. API unavailable or failed to delete on server."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <style>{`
          .element-group-card {
            border: 1px solid #d8e0ea;
            box-shadow: 0 10px 24px rgba(22, 34, 51, 0.06);
          }
          .element-group-table th {
            background: #eef4fb;
            border: 1px solid #d5deea;
            font-weight: 700;
            white-space: nowrap;
          }
          .element-group-table td {
            border: 1px solid #d5deea;
            vertical-align: middle;
          }
        `}</style>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h4 className="mb-1">Element Group Master</h4>
            <p className="text-muted mb-0">
              Maintain master element groups with group code, name, description and status.
            </p>
          </div>

          <Button variant="outline-secondary" onClick={resetForm}>
            Clear Form
          </Button>
        </div>

        {message && (
          <Alert
            variant={
              message.includes("Please") ||
              message.includes("Could not") ||
              message.includes("Failed")
                ? "warning"
                : "success"
            }
          >
            {message}
          </Alert>
        )}

        {isLoading && <Alert variant="info">Loading element groups...</Alert>}
        {!canManageElementGroups && (
          <Alert variant="warning">
            Element group creation and editing is limited to Finance / Accounts team users.
          </Alert>
        )}

        <Card className="element-group-card mb-3">
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Element Group Code</Form.Label>
                    <Form.Control
                      value={form.elementGroupCode}
                      onChange={(e) =>
                        handleChange("elementGroupCode", e.target.value)
                      }
                      placeholder="Enter group code"
                      disabled={!canManageElementGroups}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Element Group Name</Form.Label>
                    <Form.Control
                      value={form.elementGroupName}
                      onChange={(e) =>
                        handleChange("elementGroupName", e.target.value)
                      }
                      placeholder="Enter group name"
                      disabled={!canManageElementGroups}
                    />
                  </Form.Group>
                </Col>



                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={form.description}
                      onChange={(e) =>
                        handleChange("description", e.target.value)
                      }
                      placeholder="Enter description"
                      disabled={!canManageElementGroups}
                    />
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <h6 className="mb-0">Group Element Rows</h6>
                      <small className="text-muted">Define default elements and sizes for this group.</small>
                    </div>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          elements: [...(prev.elements || []), { ...emptyElementItem }],
                        }))
                      }
                      disabled={!canManageElementGroups}
                    >
                      Add Element Row
                    </Button>
                  </div>

                  <Table responsive size="sm" className="element-group-table mb-3">
                    <thead>
                      <tr>
                        <th>Visual Code</th>
                        <th>Qty</th>
                        <th>Width</th>
                        <th>Height</th>
                        <th>Media</th>
                        <th>Lamination</th>
                        <th>Type of Lamination</th>
                        <th>Mounting</th>
                        <th>Type of Mounting</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(form.elements) ? form.elements : []).map((item, index) => (
                        <tr key={index}>
                          <td>
                            <Form.Control
                              value={item.visualCode}
                              onChange={(e) => {
                                const next = [...(form.elements || [])];
                                next[index] = { ...next[index], visualCode: e.target.value };
                                setForm((prev) => ({ ...prev, elements: next }));
                              }}
                              placeholder="Visual code"
                              disabled={!canManageElementGroups}
                            />
                          </td>
                          <td>
                            <Form.Control
                              value={item.qty}
                              onChange={(e) => {
                                const next = [...(form.elements || [])];
                                next[index] = { ...next[index], qty: e.target.value };
                                setForm((prev) => ({ ...prev, elements: next }));
                              }}
                              placeholder="Qty"
                              disabled={!canManageElementGroups}
                            />
                          </td>
                          <td>
                            <Form.Control
                              value={item.width}
                              onChange={(e) => {
                                const next = [...(form.elements || [])];
                                next[index] = { ...next[index], width: e.target.value };
                                setForm((prev) => ({ ...prev, elements: next }));
                              }}
                              placeholder="Width"
                              disabled={!canManageElementGroups}
                            />
                          </td>
                          <td>
                            <Form.Control
                              value={item.height}
                              onChange={(e) => {
                                const next = [...(form.elements || [])];
                                next[index] = { ...next[index], height: e.target.value };
                                setForm((prev) => ({ ...prev, elements: next }));
                              }}
                              placeholder="Height"
                              disabled={!canManageElementGroups}
                            />
                          </td>
                          <td>
                            <Form.Select
                              value={item.media}
                              onChange={(e) => handleElementMediaChange(index, e.target.value)}
                              disabled={!canManageElementGroups}
                            >
                              <option value="">Select media</option>
                              {mediaOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Select
                              value={item.laminationFlag}
                              onChange={(e) => {
                                const next = [...(form.elements || [])];
                                next[index] = { ...next[index], laminationFlag: e.target.value };
                                setForm((prev) => ({ ...prev, elements: next }));
                              }}
                              disabled={!canManageElementGroups}
                            >
                              <option value="">Select</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Control
                              value={item.lamination}
                              onChange={(e) => {
                                const next = [...(form.elements || [])];
                                next[index] = {
                                  ...next[index],
                                  lamination: e.target.value,
                                  laminationFlag:
                                    e.target.value && !next[index]?.laminationFlag
                                      ? "Yes"
                                      : next[index]?.laminationFlag,
                                };
                                setForm((prev) => ({ ...prev, elements: next }));
                              }}
                              placeholder="Type of lamination"
                              disabled={!canManageElementGroups}
                            />
                          </td>
                          <td>
                            <Form.Select
                              value={item.mountingFlag}
                              onChange={(e) => {
                                const next = [...(form.elements || [])];
                                next[index] = { ...next[index], mountingFlag: e.target.value };
                                setForm((prev) => ({ ...prev, elements: next }));
                              }}
                              disabled={!canManageElementGroups}
                            >
                              <option value="">Select</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Control
                              value={item.mounting}
                              onChange={(e) => {
                                const next = [...(form.elements || [])];
                                next[index] = {
                                  ...next[index],
                                  mounting: e.target.value,
                                  mountingFlag:
                                    e.target.value && !next[index]?.mountingFlag
                                      ? "Yes"
                                      : next[index]?.mountingFlag,
                                };
                                setForm((prev) => ({ ...prev, elements: next }));
                              }}
                              placeholder="Type of mounting"
                              disabled={!canManageElementGroups}
                            />
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => {
                                const next = [...(form.elements || [])];
                                next.splice(index, 1);
                                setForm((prev) => ({ ...prev, elements: next }));
                              }}
                              disabled={!canManageElementGroups}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Col>

                <Col md={3} className="d-flex align-items-end gap-2">
                  <Button type="submit" variant="primary" disabled={isSaving || !canManageElementGroups}>
                    {isSaving
                      ? "Saving..."
                      : form.id
                      ? "Update Group"
                      : "Add Group"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline-secondary"
                    onClick={resetForm}
                    disabled={isSaving || !canManageElementGroups}
                  >
                    Cancel
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>

        <Card className="element-group-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h5 className="mb-0">Element Group List</h5>

              <Form.Control
                style={{ maxWidth: 320 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search code/name/status"
              />
            </div>

            <Table responsive className="element-group-table">
              <thead>
                <tr>
                  <th>Element Group Code</th>
                  <th>Element Group Name</th>
                  <th>Scope</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.elementGroupCode || "-"}</td>
                      <td>{row.elementGroupName || "-"}</td>
                      <td>Master</td>
                      <td>{row.description || "-"}</td>
                      <td>
                        {row.isActive === "1" ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-secondary">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleEdit(row)}
                            disabled={isSaving || !canManageElementGroups}
                          >
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDelete(row.id)}
                            disabled={isSaving || !canManageElementGroups}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      No element groups found.
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

export default ElementGroupMaster;
