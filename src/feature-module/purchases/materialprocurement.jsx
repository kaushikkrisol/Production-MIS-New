import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import Select from "react-select";
import {
  CheckCircle,
  Edit2,
  FilePlus,
  RefreshCw,
  Save,
  Trash2,
  XCircle,
} from "react-feather";
import branchDirectory from "../uiinterface/table/companyBranches";
import "./materialprocurement.css";

const STORAGE_KEY = "materialProcurementDocuments";

const DOCUMENT_TYPES = {
  materialRequest: {
    value: "material-request",
    label: "Material Requisition",
    prefix: "MR",
    itemLabel: "Material",
  },
  materialPo: {
    value: "material-po",
    label: "Material Purchase Order",
    prefix: "MPO",
    itemLabel: "Material",
  },
  servicePo: {
    value: "service-po",
    label: "Service Purchase Order",
    prefix: "SPO",
    itemLabel: "Service",
  },
};

const documentTypeOptions = Object.values(DOCUMENT_TYPES).map((item) => ({
  value: item.value,
  label: item.label,
}));

const priorityOptions = [
  { value: "Normal", label: "Normal" },
  { value: "High", label: "High" },
  { value: "Urgent", label: "Urgent" },
];

const departmentOptions = [
  { value: "Production", label: "Production" },
  { value: "Design", label: "Design" },
  { value: "Delivery", label: "Delivery" },
  { value: "Implementation", label: "Implementation" },
  { value: "Administration", label: "Administration" },
  { value: "IT", label: "IT" },
];

const uomOptions = [
  { value: "Nos", label: "Nos" },
  { value: "Sqft", label: "Sqft" },
  { value: "Mtr", label: "Mtr" },
  { value: "Kg", label: "Kg" },
  { value: "Day", label: "Day" },
  { value: "Job", label: "Job" },
];

const baseLocationOptions = Object.entries(branchDirectory).map(
  ([key, branch]) => ({
    value: key,
    label: branch.companyName.replace("Commercial Reprographers ", ""),
    gstNo: branch.companyGst,
  })
);

const roleAliases = {
  admin: ["admin", "administrator", "admindelete", "superadmin"],
  "Branch Manager": ["branchmanager", "branch manager", "bm"],
  "Regional Manager": ["regionalmanager", "regional manager", "rm"],
  "Store Manager": ["storemanager", "store manager", "inventorymanager"],
  "Purchase Manager": [
    "purchasemanager",
    "purchase manager",
    "procurementmanager",
    "procurement manager",
  ],
  "Operations Manager": ["operationsmanager", "operations manager", "ops"],
  "Finance Manager": ["financemanager", "finance manager", "accounts"],
  Director: ["director", "management"],
};

const approvalMatrix = {
  "material-request": ["Branch Manager", "Store Manager"],
  "material-po": ["Branch Manager", "Purchase Manager", "Finance Manager"],
  "service-po": ["Operations Manager", "Purchase Manager", "Finance Manager"],
};

const blankItem = {
  description: "",
  category: "",
  qty: "1",
  uom: "Nos",
  estimatedRate: "",
  gstPercent: "18",
  vendorName: "",
  deliveryLocation: "",
  remarks: "",
};

const blankForm = {
  id: "",
  documentNo: "",
  documentType: DOCUMENT_TYPES.materialRequest.value,
  linkedRequestNo: "",
  requestDate: new Date().toISOString().slice(0, 10),
  neededBy: "",
  department: "Production",
  priority: "Normal",
  locations: [],
  vendorName: "",
  costCenter: "",
  remarks: "",
  items: [{ ...blankItem }],
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeRole = (role) =>
  normalizeText(role)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getDocumentMeta = (documentType) =>
  Object.values(DOCUMENT_TYPES).find((item) => item.value === documentType) ||
  DOCUMENT_TYPES.materialRequest;

const getLoggedInUser = () => {
  try {
    return JSON.parse(localStorage.getItem("users") || "{}")?.message || {};
  } catch (error) {
    console.error("Failed to read logged in user", error);
    return {};
  }
};

const getUserName = (user) =>
  normalizeText(
    user?.user_name ||
      user?.username ||
      user?.userName ||
      user?.name ||
      user?.FullName ||
      ""
  ) || "Current User";

const getUserRole = (user) =>
  normalizeText(user?.rolE_NAME || user?.roleName || user?.role || "") || "Admin";

const getRowsFromStorage = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse procurement documents", error);
    return [];
  }
};

const saveRowsToStorage = (rows) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
};

const numberValue = (value) => {
  const number = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const getItemSubtotal = (item) =>
  numberValue(item.qty) * numberValue(item.estimatedRate);

const getItemTax = (item) => getItemSubtotal(item) * (numberValue(item.gstPercent) / 100);

const getItemTotal = (item) => getItemSubtotal(item) + getItemTax(item);

const getDocumentTotal = (items = []) =>
  items.reduce((sum, item) => sum + getItemTotal(item), 0);

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numberValue(value));

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const getLocationLabels = (locationValues = []) =>
  locationValues
    .map((value) => baseLocationOptions.find((option) => option.value === value)?.label)
    .filter(Boolean);

const roleMatches = (currentRole, requiredRole) => {
  const normalizedCurrent = normalizeRole(currentRole);
  const adminRoles = roleAliases.admin.map(normalizeRole);

  if (adminRoles.includes(normalizedCurrent)) return true;

  const allowedRoles = roleAliases[requiredRole] || [requiredRole];
  return allowedRoles.map(normalizeRole).includes(normalizedCurrent);
};

const buildApprovalFlow = (documentType, locations, amount) => {
  const roles = [...(approvalMatrix[documentType] || [])];

  if ((locations || []).length > 1) {
    roles.unshift("Regional Manager");
  }

  if (amount >= 100000) {
    roles.push("Director");
  }

  return roles.map((role, index) => ({
    id: `${normalizeRole(role)}-${index}`,
    role,
    status: index === 0 ? "Pending" : "Waiting",
    actionBy: "",
    actionAt: "",
    remarks: "",
  }));
};

const getCurrentApprovalStep = (document) =>
  (document.approvalFlow || []).find((step) => step.status === "Pending") || null;

const getStatusClass = (status) => {
  const normalized = normalizeRole(status);
  if (normalized.includes("approved")) return "approved";
  if (normalized.includes("rejected")) return "rejected";
  if (normalized.includes("draft")) return "draft";
  return "pending";
};

const makeDocumentNo = (documentType, rows) => {
  const meta = getDocumentMeta(documentType);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count =
    rows.filter((row) => row.documentNo?.startsWith(`${meta.prefix}-${today}`)).length +
    1;

  return `${meta.prefix}-${today}-${String(count).padStart(3, "0")}`;
};

const selectPortalTarget = () =>
  typeof document !== "undefined" ? document.body : undefined;

const selectStyles = {
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

const MaterialProcurement = () => {
  const [documents, setDocuments] = useState(getRowsFromStorage);
  const [form, setForm] = useState(blankForm);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const user = useMemo(() => getLoggedInUser(), []);
  const userName = getUserName(user);
  const currentRole = getUserRole(user);
  const formTotal = useMemo(() => getDocumentTotal(form.items), [form.items]);
  const formMeta = getDocumentMeta(form.documentType);
  const formApprovalFlow = useMemo(
    () => buildApprovalFlow(form.documentType, form.locations, formTotal),
    [form.documentType, form.locations, formTotal]
  );

  useEffect(() => {
    saveRowsToStorage(documents);
  }, [documents]);

  const stats = useMemo(() => {
    const pending = documents.filter((item) => item.status === "Pending Approval").length;
    const approved = documents.filter((item) => item.status === "Approved").length;
    const purchaseOrders = documents.filter((item) => item.documentType !== "material-request").length;

    return {
      total: documents.length,
      pending,
      approved,
      purchaseOrders,
    };
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const query = normalizeText(searchText).toLowerCase();

    return documents.filter((document) => {
      const matchesStatus =
        statusFilter === "All" || document.status === statusFilter;
      const matchesLocation =
        locationFilter === "All" || document.locations?.includes(locationFilter);
      const searchable = [
        document.documentNo,
        getDocumentMeta(document.documentType).label,
        document.vendorName,
        document.department,
        document.requestedBy,
        document.status,
        getLocationLabels(document.locations).join(" "),
        ...(document.items || []).map((item) => item.description),
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && matchesLocation && (!query || searchable.includes(query));
    });
  }, [documents, locationFilter, searchText, statusFilter]);

  const requisitionOptions = useMemo(
    () =>
      documents
        .filter(
          (document) =>
            document.documentType === "material-request" &&
            document.status === "Approved"
        )
        .map((document) => ({
          value: document.documentNo,
          label: `${document.documentNo} - ${formatMoney(document.totalAmount)}`,
          document,
        })),
    [documents]
  );

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setItemField = (index, field, value) => {
    setForm((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...blankItem }],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const resetForm = () => {
    setForm({
      ...blankForm,
      requestDate: new Date().toISOString().slice(0, 10),
      items: [{ ...blankItem }],
    });
    setMessage("");
  };

  const validateForm = () => {
    if (!form.documentType) return "Please select document type.";
    if (!form.requestDate) return "Please select request date.";
    if (!form.neededBy) return "Please select required date.";
    if (!form.locations.length) return "Please select at least one location.";
    if (form.documentType !== "material-request" && !normalizeText(form.vendorName)) {
      return "Please enter vendor name for purchase order.";
    }
    if (!form.items.length) return "Please add at least one item.";

    for (let index = 0; index < form.items.length; index += 1) {
      const item = form.items[index];
      if (!normalizeText(item.description)) {
        return `Please enter ${formMeta.itemLabel.toLowerCase()} in row ${index + 1}.`;
      }
      if (numberValue(item.qty) <= 0) {
        return `Quantity must be greater than zero in row ${index + 1}.`;
      }
      if (numberValue(item.estimatedRate) <= 0) {
        return `Rate must be greater than zero in row ${index + 1}.`;
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

    const now = new Date().toISOString();
    const cleanItems = form.items.map((item, index) => ({
      id: item.id || `item-${Date.now()}-${index}`,
      description: normalizeText(item.description),
      category: normalizeText(item.category),
      qty: numberValue(item.qty),
      uom: item.uom || "Nos",
      estimatedRate: numberValue(item.estimatedRate),
      gstPercent: numberValue(item.gstPercent),
      vendorName: normalizeText(item.vendorName),
      deliveryLocation: item.deliveryLocation,
      remarks: normalizeText(item.remarks),
    }));

    const totalAmount = getDocumentTotal(cleanItems);
    const documentNo = form.documentNo || makeDocumentNo(form.documentType, documents);
    const approvalFlow = buildApprovalFlow(
      form.documentType,
      form.locations,
      totalAmount
    );

    const nextDocument = {
      ...form,
      id: form.id || `proc-${Date.now()}`,
      documentNo,
      requestDate: form.requestDate,
      totalAmount,
      items: cleanItems,
      approvalFlow,
      status: approvalFlow.length ? "Pending Approval" : "Approved",
      requestedBy: form.requestedBy || userName,
      requestedRole: form.requestedRole || currentRole,
      createdAt: form.createdAt || now,
      updatedAt: now,
      updatedBy: userName,
    };

    setDocuments((prev) => {
      const exists = prev.some((document) => document.id === nextDocument.id);
      if (exists) {
        return prev.map((document) =>
          document.id === nextDocument.id ? nextDocument : document
        );
      }
      return [nextDocument, ...prev];
    });

    setForm(nextDocument);
    setMessage(`${getDocumentMeta(nextDocument.documentType).label} saved.`);
    setIsSaving(false);
  };

  const handleEdit = (document) => {
    setForm({
      ...blankForm,
      ...document,
      items: document.items?.length ? document.items : [{ ...blankItem }],
    });
    setMessage("");
  };

  const handleDelete = (documentId) => {
    setDocuments((prev) => prev.filter((document) => document.id !== documentId));
    if (form.id === documentId) resetForm();
    setMessage("Document deleted.");
  };

  const handleApproval = (documentId, decision) => {
    setDocuments((prev) =>
      prev.map((document) => {
        if (document.id !== documentId) return document;

        const currentStep = getCurrentApprovalStep(document);
        if (!currentStep || !roleMatches(currentRole, currentStep.role)) {
          setMessage(`Approval pending with ${currentStep?.role || "next role"}.`);
          return document;
        }

        const now = new Date().toISOString();
        const flow = (document.approvalFlow || []).map((step) => {
          if (step.id !== currentStep.id) return step;
          return {
            ...step,
            status: decision,
            actionBy: userName,
            actionAt: now,
            remarks: decision === "Approved" ? "Approved" : "Rejected",
          };
        });

        if (decision === "Rejected") {
          return {
            ...document,
            approvalFlow: flow,
            status: "Rejected",
            updatedAt: now,
            updatedBy: userName,
          };
        }

        const nextPendingIndex = flow.findIndex((step) => step.status === "Waiting");
        if (nextPendingIndex >= 0) {
          flow[nextPendingIndex] = {
            ...flow[nextPendingIndex],
            status: "Pending",
          };
        }

        const isApproved = flow.every((step) => step.status === "Approved");

        return {
          ...document,
          approvalFlow: flow,
          status: isApproved ? "Approved" : "Pending Approval",
          updatedAt: now,
          updatedBy: userName,
        };
      })
    );

    setMessage(decision === "Approved" ? "Approval recorded." : "Document rejected.");
  };

  const handleCreatePoFromRequest = (document) => {
    const newType = DOCUMENT_TYPES.materialPo.value;
    setForm({
      ...blankForm,
      documentType: newType,
      linkedRequestNo: document.documentNo,
      requestDate: new Date().toISOString().slice(0, 10),
      neededBy: document.neededBy || "",
      department: document.department || "Production",
      priority: document.priority || "Normal",
      locations: document.locations || [],
      vendorName: document.vendorName || "",
      costCenter: document.costCenter || "",
      remarks: document.remarks || "",
      items: document.items?.length ? document.items : [{ ...blankItem }],
    });
    setMessage(`Material PO prepared from ${document.documentNo}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRequisitionLink = (option) => {
    if (!option?.document) {
      setField("linkedRequestNo", "");
      return;
    }

    const document = option.document;
    setForm((prev) => ({
      ...prev,
      linkedRequestNo: document.documentNo,
      department: document.department || prev.department,
      priority: document.priority || prev.priority,
      locations: document.locations || [],
      neededBy: document.neededBy || prev.neededBy,
      items: document.items?.length ? document.items : prev.items,
    }));
  };

  const isWarningMessage =
    message.includes("Please") ||
    message.includes("must") ||
    message.includes("pending") ||
    message.includes("rejected");

  return (
    <div className="page-wrapper procurement-page">
      <div className="content container-fluid">
        <div className="procurement-header">
          <div>
            <h4>Material Requisition & Purchase Order</h4>
            <div className="text-muted small">
              {userName} | {currentRole}
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <span className="procurement-role-pill">Role: {currentRole}</span>
            <span className="procurement-count-pill">
              {documents.length} Document(s)
            </span>
          </div>
        </div>

        <div className="procurement-stat-grid">
          <div className="procurement-stat">
            <span>Total</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="procurement-stat">
            <span>Pending</span>
            <strong>{stats.pending}</strong>
          </div>
          <div className="procurement-stat">
            <span>Approved</span>
            <strong>{stats.approved}</strong>
          </div>
          <div className="procurement-stat">
            <span>Purchase Orders</span>
            <strong>{stats.purchaseOrders}</strong>
          </div>
        </div>

        {message && (
          <Alert variant={isWarningMessage ? "warning" : "success"}>
            {message}
          </Alert>
        )}

        <Card className="procurement-card mb-3">
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col xl={3} md={6}>
                  <Form.Group>
                    <Form.Label>Document Type</Form.Label>
                    <Select
                      classNamePrefix="procurement-select"
                      styles={selectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      options={documentTypeOptions}
                      value={documentTypeOptions.find(
                        (option) => option.value === form.documentType
                      )}
                      onChange={(option) =>
                        setField(
                          "documentType",
                          option?.value || DOCUMENT_TYPES.materialRequest.value
                        )
                      }
                    />
                  </Form.Group>
                </Col>

                <Col xl={3} md={6}>
                  <Form.Group>
                    <Form.Label>Document No</Form.Label>
                    <div className="procurement-readonly">
                      {form.documentNo || "Auto generated"}
                    </div>
                  </Form.Group>
                </Col>

                <Col xl={3} md={6}>
                  <Form.Group>
                    <Form.Label>Request Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={form.requestDate}
                      onChange={(event) => setField("requestDate", event.target.value)}
                    />
                  </Form.Group>
                </Col>

                <Col xl={3} md={6}>
                  <Form.Group>
                    <Form.Label>Required By</Form.Label>
                    <Form.Control
                      type="date"
                      value={form.neededBy}
                      onChange={(event) => setField("neededBy", event.target.value)}
                    />
                  </Form.Group>
                </Col>

                {form.documentType !== DOCUMENT_TYPES.materialRequest.value && (
                  <Col xl={4} md={6}>
                    <Form.Group>
                      <Form.Label>Linked Requisition</Form.Label>
                      <Select
                        classNamePrefix="procurement-select"
                        styles={selectStyles}
                        menuPortalTarget={selectPortalTarget()}
                        isClearable
                        options={requisitionOptions}
                        value={
                          requisitionOptions.find(
                            (option) => option.value === form.linkedRequestNo
                          ) || null
                        }
                        onChange={handleRequisitionLink}
                        placeholder="Select approved MR"
                      />
                    </Form.Group>
                  </Col>
                )}

                <Col xl={4} md={6}>
                  <Form.Group>
                    <Form.Label>Locations</Form.Label>
                    <Select
                      classNamePrefix="procurement-select"
                      styles={selectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      isMulti
                      options={baseLocationOptions}
                      value={baseLocationOptions.filter((option) =>
                        form.locations.includes(option.value)
                      )}
                      onChange={(options) =>
                        setField(
                          "locations",
                          (options || []).map((option) => option.value)
                        )
                      }
                      placeholder="Select location"
                    />
                  </Form.Group>
                </Col>

                <Col xl={2} md={6}>
                  <Form.Group>
                    <Form.Label>Department</Form.Label>
                    <Select
                      classNamePrefix="procurement-select"
                      styles={selectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      options={departmentOptions}
                      value={departmentOptions.find(
                        (option) => option.value === form.department
                      )}
                      onChange={(option) =>
                        setField("department", option?.value || "Production")
                      }
                    />
                  </Form.Group>
                </Col>

                <Col xl={2} md={6}>
                  <Form.Group>
                    <Form.Label>Priority</Form.Label>
                    <Select
                      classNamePrefix="procurement-select"
                      styles={selectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      options={priorityOptions}
                      value={priorityOptions.find(
                        (option) => option.value === form.priority
                      )}
                      onChange={(option) =>
                        setField("priority", option?.value || "Normal")
                      }
                    />
                  </Form.Group>
                </Col>

                <Col xl={4} md={6}>
                  <Form.Group>
                    <Form.Label>Vendor</Form.Label>
                    <Form.Control
                      value={form.vendorName}
                      onChange={(event) => setField("vendorName", event.target.value)}
                      placeholder={
                        form.documentType === DOCUMENT_TYPES.materialRequest.value
                          ? "Suggested vendor"
                          : "Vendor name"
                      }
                    />
                  </Form.Group>
                </Col>

                <Col xl={4} md={6}>
                  <Form.Group>
                    <Form.Label>Cost Center</Form.Label>
                    <Form.Control
                      value={form.costCenter}
                      onChange={(event) => setField("costCenter", event.target.value)}
                      placeholder="Cost center / project"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12}>
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                    <div>
                      <h6 className="mb-0">{formMeta.itemLabel} Details</h6>
                      <small className="text-muted">
                        Total {formatMoney(formTotal)}
                      </small>
                    </div>
                    <Button type="button" variant="outline-primary" size="sm" onClick={addItem}>
                      <FilePlus size={15} className="me-1" />
                      Add Line
                    </Button>
                  </div>

                  <Table responsive className="procurement-table">
                    <thead>
                      <tr>
                        <th>{formMeta.itemLabel}</th>
                        <th>Category</th>
                        <th>Qty</th>
                        <th>UOM</th>
                        <th>Rate</th>
                        <th>GST %</th>
                        <th>Vendor</th>
                        <th>Location</th>
                        <th>Total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, index) => (
                        <tr key={index} className="procurement-item-row">
                          <td>
                            <Form.Control
                              value={item.description}
                              onChange={(event) =>
                                setItemField(index, "description", event.target.value)
                              }
                              placeholder={`${formMeta.itemLabel} name`}
                            />
                          </td>
                          <td>
                            <Form.Control
                              value={item.category}
                              onChange={(event) =>
                                setItemField(index, "category", event.target.value)
                              }
                              placeholder="Category"
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.qty}
                              onChange={(event) =>
                                setItemField(index, "qty", event.target.value)
                              }
                            />
                          </td>
                          <td>
                            <Form.Select
                              value={item.uom}
                              onChange={(event) =>
                                setItemField(index, "uom", event.target.value)
                              }
                            >
                              {uomOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.estimatedRate}
                              onChange={(event) =>
                                setItemField(index, "estimatedRate", event.target.value)
                              }
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.gstPercent}
                              onChange={(event) =>
                                setItemField(index, "gstPercent", event.target.value)
                              }
                            />
                          </td>
                          <td>
                            <Form.Control
                              value={item.vendorName}
                              onChange={(event) =>
                                setItemField(index, "vendorName", event.target.value)
                              }
                              placeholder="Vendor"
                            />
                          </td>
                          <td>
                            <Form.Select
                              value={item.deliveryLocation}
                              onChange={(event) =>
                                setItemField(
                                  index,
                                  "deliveryLocation",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Select</option>
                              {baseLocationOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Form.Select>
                          </td>
                          <td>{formatMoney(getItemTotal(item))}</td>
                          <td>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline-danger"
                              onClick={() => removeItem(index)}
                              disabled={form.items.length === 1}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Remarks</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={form.remarks}
                      onChange={(event) => setField("remarks", event.target.value)}
                      placeholder="Terms, delivery notes, or request details"
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Label>Approval Flow</Form.Label>
                  <div className="procurement-flow">
                    {formApprovalFlow.map((step, index) => (
                      <span
                        key={step.id}
                        className={`procurement-flow-step ${
                          index === 0 ? "current" : "waiting"
                        }`}
                      >
                        {step.role}
                      </span>
                    ))}
                  </div>
                </Col>

                <Col xs={12}>
                  <div className="procurement-actions">
                    <Button type="submit" variant="primary" disabled={isSaving}>
                      <Save size={15} className="me-1" />
                      {form.id ? "Update Document" : "Save Document"}
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

        <Card className="procurement-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h5 className="mb-0">Requests & Purchase Orders</h5>
              <div className="d-flex flex-wrap gap-2">
                <Form.Control
                  style={{ width: 260 }}
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search document"
                />
                <Form.Select
                  style={{ width: 180 }}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </Form.Select>
                <Form.Select
                  style={{ width: 180 }}
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                >
                  <option value="All">All Locations</option>
                  {baseLocationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </div>

            <Table responsive className="procurement-table">
              <thead>
                <tr>
                  <th>Document No</th>
                  <th>Type</th>
                  <th>Locations</th>
                  <th>Department</th>
                  <th>Required By</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Next Approver</th>
                  <th>Approval Flow</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length ? (
                  filteredDocuments.map((document) => {
                    const currentStep = getCurrentApprovalStep(document);
                    const canApprove =
                      document.status === "Pending Approval" &&
                      currentStep &&
                      roleMatches(currentRole, currentStep.role);
                    const canCreatePo =
                      document.documentType === "material-request" &&
                      document.status === "Approved";

                    return (
                      <tr key={document.id}>
                        <td>
                          <strong>{document.documentNo}</strong>
                          {document.linkedRequestNo && (
                            <div className="text-muted small">
                              MR: {document.linkedRequestNo}
                            </div>
                          )}
                        </td>
                        <td>{getDocumentMeta(document.documentType).label}</td>
                        <td>
                          <div className="procurement-location-tags">
                            {getLocationLabels(document.locations).map((label) => (
                              <span key={label}>{label}</span>
                            ))}
                          </div>
                        </td>
                        <td>{document.department || "-"}</td>
                        <td>{formatDate(document.neededBy)}</td>
                        <td>{formatMoney(document.totalAmount)}</td>
                        <td>
                          <span
                            className={`procurement-badge ${getStatusClass(
                              document.status
                            )}`}
                          >
                            {document.status}
                          </span>
                        </td>
                        <td>{currentStep?.role || "-"}</td>
                        <td>
                          <div className="procurement-flow">
                            {(document.approvalFlow || []).map((step) => (
                              <span
                                key={step.id}
                                className={`procurement-flow-step ${
                                  step.status === "Approved"
                                    ? "done"
                                    : step.status === "Pending"
                                      ? "current"
                                      : "waiting"
                                }`}
                              >
                                {step.role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="procurement-actions">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => handleEdit(document)}
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-success"
                              onClick={() => handleApproval(document.id, "Approved")}
                              disabled={!canApprove}
                            >
                              <CheckCircle size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleApproval(document.id, "Rejected")}
                              disabled={!canApprove}
                            >
                              <XCircle size={14} />
                            </Button>
                            {canCreatePo && (
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() => handleCreatePoFromRequest(document)}
                              >
                                PO
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleDelete(document.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center text-muted py-4">
                      No procurement documents found.
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

export default MaterialProcurement;
