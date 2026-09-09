import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import axios from "axios";
import config from "../../../config";
import erpMasterData from "../../../core/json/erpMasterData.json";

const emptyForm = {
  id: "",
  mediaName: "",
  hsnCode: "",
};

const mediaApi = {
  add: config?.MediaMaster?.URL?.Add || "/api/Media/add",
  update: config?.MediaMaster?.URL?.Update || "/api/Media/update",
  delete: config?.MediaMaster?.URL?.Delete || "/api/Media/delete",
};

const getRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.media)) return data.media;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const getMongoId = (row) =>
  String(
    row?.id ??
      row?._id?.$oid ??
      row?._id ??
      row?.mediaId ??
      row?.MediaId ??
      ""
  ).trim();

const normalizeMediaRow = (row) => ({
  id: getMongoId(row),
  mediaName: String(
    row?.mediaName ?? row?.MediaName ?? row?.media ?? row?.Media ?? ""
  ).trim(),
  hsnCode: String(
    row?.hsnCode ?? row?.HsnCode ?? row?.HSNCode ?? row?.hsn ?? row?.HSN ?? ""
  ).trim(),
});

const getApiMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  return data?.message || data?.error || error?.message || fallback;
};

const MediaMaster = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const loadMedia = useCallback(() => {
    setIsLoading(true);

    try {
      const mediaRows = getRows(erpMasterData)
        .map(normalizeMediaRow)
        .filter((row) => row.mediaName);

      setRows(mediaRows);
      setMessage("");
    } catch (error) {
      console.error("Error loading erpMasterData.json", error);
      setRows([]);
      setMessage("");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      `${row.mediaName} ${row.hsnCode}`.toLowerCase().includes(query)
    );
  }, [rows, searchText]);

  const resetForm = () => {
    setForm(emptyForm);
    setMessage("");
  };

  const validate = () => {
    if (!form.mediaName.trim()) return "Please enter Media Name.";
    if (!form.hsnCode.trim()) return "Please enter HSN Code.";
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validate();
    if (validationMessage) {
      setMessageType("warning");
      setMessage(validationMessage);
      return;
    }

    const isUpdate = Boolean(form.id);
    const payload = {
      ...(isUpdate ? { Id: form.id } : {}),
      MediaName: form.mediaName.trim(),
      HsnCode: form.hsnCode.trim(),
    };

    setIsSaving(true);
    try {
      if (isUpdate) {
        await axios.put(mediaApi.update, payload, {
          timeout: 10000,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        await axios.post(mediaApi.add, payload, {
          timeout: 10000,
          headers: { "Content-Type": "application/json" },
        });
      }

      await loadMedia();
      setForm(emptyForm);
      setMessageType("success");
      setMessage(isUpdate ? "Media updated successfully." : "Media added successfully.");
    } catch (error) {
      console.error("Error saving media", error);
      setMessageType("danger");
      setMessage(getApiMessage(error, "Unable to save media."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (row) => {
    setForm(row);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete media "${row.mediaName}"?`)) return;

    setDeletingId(row.id);
    try {
      await axios.delete(mediaApi.delete, {
        params: { id: row.id },
        timeout: 10000,
      });
      await loadMedia();
      if (form.id === row.id) setForm(emptyForm);
      setMessageType("success");
      setMessage("Media deleted successfully.");
    } catch (error) {
      console.error("Error deleting media", error);
      setMessageType("danger");
      setMessage(getApiMessage(error, "Unable to delete media."));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <style>{`
          .media-master-card {
            border: 1px solid #d8e0ea;
            box-shadow: 0 10px 24px rgba(22, 34, 51, 0.06);
          }
          .media-master-table th {
            background: #eef4fb;
            border: 1px solid #d5deea;
            font-weight: 700;
            white-space: nowrap;
          }
          .media-master-table td {
            border: 1px solid #d5deea;
            vertical-align: middle;
          }
        `}</style>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h4 className="mb-1">Media Master</h4>
            <p className="text-muted mb-0">Maintain media names and their HSN codes.</p>
          </div>
          <Button variant="outline-secondary" onClick={resetForm}>
            Clear Form
          </Button>
        </div>

        {message && <Alert variant={messageType}>{message}</Alert>}
        {isLoading && <Alert variant="info">Loading Media Master...</Alert>}

        <Card className="media-master-card mb-3">
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col md={5}>
                  <Form.Group>
                    <Form.Label>Media Name</Form.Label>
                    <Form.Control
                      value={form.mediaName}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          mediaName: event.target.value,
                        }))
                      }
                      placeholder="Enter media name"
                      maxLength={200}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>HSN Code</Form.Label>
                    <Form.Control
                      value={form.hsnCode}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          hsnCode: event.target.value,
                        }))
                      }
                      placeholder="Enter HSN code"
                      maxLength={20}
                    />
                  </Form.Group>
                </Col>

                <Col md={3} className="d-flex align-items-end gap-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : form.id ? "Update Media" : "Add Media"}
                  </Button>
                  {form.id && (
                    <Button type="button" variant="outline-secondary" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>

        <Card className="media-master-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h5 className="mb-0">Media List</h5>
                <div className="text-muted small">
                  {filteredRows.length} shown from {rows.length} media record(s)
                </div>
              </div>
              <Form.Control
                style={{ maxWidth: 320 }}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search media name or HSN code"
              />
            </div>

            <Table responsive className="media-master-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Sr No</th>
                  <th>Media Name</th>
                  <th>HSN Code</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((row, index) => (
                    <tr key={row.id || `${row.mediaName}-${row.hsnCode}`}>
                      <td>{index + 1}</td>
                      <td>{row.mediaName || "-"}</td>
                      <td>{row.hsnCode || "-"}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button size="sm" variant="outline-primary" onClick={() => handleEdit(row)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            disabled={deletingId === row.id}
                            onClick={() => handleDelete(row)}
                          >
                            {deletingId === row.id ? "Delete" : ""}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-muted py-4">
                      No media records found.
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

export default MediaMaster;
