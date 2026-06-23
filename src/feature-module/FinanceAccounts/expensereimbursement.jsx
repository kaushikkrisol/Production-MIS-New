import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import Select from "react-select";
import {
  CheckCircle,
  CreditCard,
  Edit2,
  FilePlus,
  RefreshCw,
  Save,
  Trash2,
  XCircle,
} from "react-feather";
import branchDirectory from "../uiinterface/table/companyBranches";
import "./expensereimbursement.css";

const STORAGE_KEY = "expenseRequestReimbursementRows";

const REQUEST_TYPES = {
  expenseRequest: {
    value: "expense-request",
    label: "Expense Request",
    prefix: "ER",
  },
  advanceRequest: {
    value: "advance-request",
    label: "Advance Request",
    prefix: "ADV",
  },
  reimbursementClaim: {
    value: "reimbursement-claim",
    label: "Reimbursement Claim",
    prefix: "RMB",
  },
};

const requestTypeOptions = Object.values(REQUEST_TYPES).map((item) => ({
  value: item.value,
  label: item.label,
}));

const departmentOptions = [
  { value: "Production", label: "Production" },
  { value: "Design", label: "Design" },
  { value: "Delivery", label: "Delivery" },
  { value: "Implementation", label: "Implementation" },
  { value: "Sales", label: "Sales" },
  { value: "Administration", label: "Administration" },
  { value: "Finance", label: "Finance" },
];

const categoryOptions = [
  { value: "Travel", label: "Travel" },
  { value: "Food", label: "Food" },
  { value: "Fuel", label: "Fuel" },
  { value: "Lodging", label: "Lodging" },
  { value: "Courier", label: "Courier" },
  { value: "Office Supplies", label: "Office Supplies" },
  { value: "Vendor Payment", label: "Vendor Payment" },
  { value: "Other", label: "Other" },
];

const paymentModeOptions = [
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cash", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "Company Card", label: "Company Card" },
];

const locationOptions = Object.entries(branchDirectory).map(([key, branch]) => ({
  value: key,
  label: branch.companyName.replace("Commercial Reprographers ", ""),
  gstNo: branch.companyGst,
}));

const approvalMatrix = {
  "expense-request": ["Reporting Manager", "Branch Manager", "Finance Manager"],
  "advance-request": ["Reporting Manager", "Finance Manager"],
  "reimbursement-claim": [
    "Reporting Manager",
    "Branch Manager",
    "Finance Manager",
  ],
};

const roleAliases = {
  admin: ["admin", "administrator", "admindelete", "superadmin"],
  "Reporting Manager": [
    "reportingmanager",
    "reporting manager",
    "manager",
    "teamlead",
    "team lead",
  ],
  "Branch Manager": ["branchmanager", "branch manager", "bm"],
  "Regional Manager": ["regionalmanager", "regional manager", "rm"],
  "Finance Manager": [
    "financemanager",
    "finance manager",
    "accounts",
    "accountant",
  ],
  Director: ["director", "management"],
};

const blankExpenseItem = {
  jobNo: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  category: "Travel",
  description: "",
  merchant: "",
  billNo: "",
  amount: "",
  gstAmount: "",
  receiptRef: "",
};

const blankForm = {
  id: "",
  requestNo: "",
  requestType: REQUEST_TYPES.expenseRequest.value,
  employeeName: "",
  employeeCode: "",
  jobNo: "",
  requestDate: new Date().toISOString().slice(0, 10),
  periodFrom: "",
  periodTo: "",
  department: "Production",
  locations: [],
  purpose: "",
  advanceAmount: "",
  advanceAdjusted: "",
  paymentMode: "Bank Transfer",
  bankAccount: "",
  paymentRef: "",
  remarks: "",
  items: [{ ...blankExpenseItem }],
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeRole = (role) =>
  normalizeText(role)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

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

const getUserCode = (user) =>
  normalizeText(
    user?.employeeCode ||
      user?.employee_code ||
      user?.user_id ||
      user?.userid ||
      user?.id ||
      ""
  );

const getRowsFromStorage = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse expense requests", error);
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

const getRequestMeta = (requestType) =>
  Object.values(REQUEST_TYPES).find((item) => item.value === requestType) ||
  REQUEST_TYPES.expenseRequest;

const getLineTotal = (item) =>
  numberValue(item.amount) + numberValue(item.gstAmount);

const getExpenseTotal = (items = []) =>
  items.reduce((sum, item) => sum + getLineTotal(item), 0);

const getPayableAmount = (form) => {
  if (form.requestType === REQUEST_TYPES.advanceRequest.value) {
    return numberValue(form.advanceAmount);
  }

  return Math.max(getExpenseTotal(form.items) - numberValue(form.advanceAdjusted), 0);
};

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

const getLocationLabels = (locations = []) =>
  locations
    .map((value) => locationOptions.find((option) => option.value === value)?.label)
    .filter(Boolean);

const roleMatches = (currentRole, requiredRole) => {
  const normalizedCurrent = normalizeRole(currentRole);
  if (roleAliases.admin.map(normalizeRole).includes(normalizedCurrent)) {
    return true;
  }

  const aliases = roleAliases[requiredRole] || [requiredRole];
  return aliases.map(normalizeRole).includes(normalizedCurrent);
};

const buildApprovalFlow = (requestType, locations, amount) => {
  const roles = [...(approvalMatrix[requestType] || [])];

  if ((locations || []).length > 1) {
    roles.unshift("Regional Manager");
  }

  if (amount >= 50000) {
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

const getCurrentApprovalStep = (row) =>
  (row.approvalFlow || []).find((step) => step.status === "Pending") || null;

const getStatusClass = (status) => {
  const normalized = normalizeRole(status);
  if (normalized.includes("paid") || normalized.includes("reimbursed")) return "paid";
  if (normalized.includes("approved")) return "approved";
  if (normalized.includes("rejected")) return "rejected";
  if (normalized.includes("draft")) return "draft";
  return "pending";
};

const makeRequestNo = (requestType, rows) => {
  const meta = getRequestMeta(requestType);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count =
    rows.filter((row) => row.requestNo?.startsWith(`${meta.prefix}-${today}`)).length +
    1;

  return `${meta.prefix}-${today}-${String(count).padStart(3, "0")}`;
};

const selectPortalTarget = () =>
  typeof document !== "undefined" ? document.body : undefined;

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderColor: state.isFocused ? "#1f8b4c" : "#d8e0ea",
    borderRadius: 6,
    boxShadow: state.isFocused ? "0 0 0 3px rgba(31, 139, 76, 0.14)" : "none",
    fontSize: 14,
    "&:hover": {
      borderColor: state.isFocused ? "#1f8b4c" : "#c7d0dc",
    },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#1f8b4c"
      : state.isFocused
        ? "#eef8f2"
        : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#25364d",
    cursor: "pointer",
  }),
};

const ExpenseReimbursement = () => {
  const [requests, setRequests] = useState(getRowsFromStorage);
  const [form, setForm] = useState(blankForm);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeScreen, setActiveScreen] = useState("add");
  const [selectedRequestId, setSelectedRequestId] = useState("");

  const user = useMemo(() => getLoggedInUser(), []);
  const userName = getUserName(user);
  const userCode = getUserCode(user);
  const currentRole = getUserRole(user);

  const lineTotal = useMemo(() => getExpenseTotal(form.items), [form.items]);
  const payableAmount = useMemo(() => getPayableAmount(form), [form]);
  const approvalFlowPreview = useMemo(
    () => buildApprovalFlow(form.requestType, form.locations, payableAmount),
    [form.locations, form.requestType, payableAmount]
  );

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) || null,
    [requests, selectedRequestId]
  );

  useEffect(() => {
    saveRowsToStorage(requests);
  }, [requests]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      employeeName: prev.employeeName || userName,
      employeeCode: prev.employeeCode || userCode,
    }));
  }, [userCode, userName]);

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((item) => item.status === "Pending Approval").length,
      approved: requests.filter((item) => item.status === "Approved").length,
      paid: requests.filter((item) => item.paymentStatus === "Paid").length,
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const query = normalizeText(searchText).toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "All" ||
        request.status === statusFilter ||
        request.paymentStatus === statusFilter;
      const matchesLocation =
        locationFilter === "All" || request.locations?.includes(locationFilter);
      const searchable = [
        request.requestNo,
        getRequestMeta(request.requestType).label,
        request.jobNo,
        request.employeeName,
        request.employeeCode,
        request.department,
        request.status,
        request.paymentStatus,
        request.purpose,
        getLocationLabels(request.locations).join(" "),
        ...(request.items || []).flatMap((item) => [
          item.jobNo,
          item.category,
          item.description,
          item.merchant,
          item.billNo,
          item.receiptRef,
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && matchesLocation && (!query || searchable.includes(query));
    });
  }, [locationFilter, requests, searchText, statusFilter]);

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
      items: [...prev.items, { ...blankExpenseItem }],
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
      employeeName: userName,
      employeeCode: userCode,
      requestDate: new Date().toISOString().slice(0, 10),
      items: [{ ...blankExpenseItem }],
    });
    setMessage("");
    setActiveScreen("add");
  };

  const validateForm = () => {
    if (!form.requestType) return "Please select request type.";
    if (!normalizeText(form.employeeName)) return "Please enter employee name.";
    if (!form.requestDate) return "Please select request date.";
    if (!form.locations.length) return "Please select at least one location.";
    if (!normalizeText(form.purpose)) return "Please enter purpose.";
    if (!normalizeText(form.jobNo) && form.requestType === REQUEST_TYPES.advanceRequest.value) {
      return "Please tag job no for this advance request.";
    }

    if (form.requestType === REQUEST_TYPES.advanceRequest.value) {
      if (numberValue(form.advanceAmount) <= 0) {
        return "Advance amount must be greater than zero.";
      }
      return "";
    }

    if (!form.items.length) return "Please add at least one expense line.";

    for (let index = 0; index < form.items.length; index += 1) {
      const item = form.items[index];
      if (!item.expenseDate) return `Please select date in row ${index + 1}.`;
      if (!normalizeText(item.description)) {
        return `Please enter description in row ${index + 1}.`;
      }
      if (numberValue(item.amount) <= 0) {
        return `Amount must be greater than zero in row ${index + 1}.`;
      }
      if (!normalizeText(form.jobNo) && !normalizeText(item.jobNo)) {
        return `Please tag job no in row ${index + 1}.`;
      }
      if (!normalizeText(item.receiptRef)) {
        return `Please enter receipt reference in row ${index + 1}.`;
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
    const cleanItems =
      form.requestType === REQUEST_TYPES.advanceRequest.value
        ? []
        : form.items.map((item, index) => ({
            id: item.id || `expense-line-${Date.now()}-${index}`,
            jobNo: normalizeText(item.jobNo || form.jobNo),
            expenseDate: item.expenseDate,
            category: item.category || "Other",
            description: normalizeText(item.description),
            merchant: normalizeText(item.merchant),
            billNo: normalizeText(item.billNo),
            amount: numberValue(item.amount),
            gstAmount: numberValue(item.gstAmount),
            receiptRef: normalizeText(item.receiptRef),
          }));

    const nextPayable = getPayableAmount({ ...form, items: cleanItems });
    const approvalFlow = buildApprovalFlow(
      form.requestType,
      form.locations,
      nextPayable
    );

    const nextRequest = {
      ...form,
      id: form.id || `expense-${Date.now()}`,
      requestNo: form.requestNo || makeRequestNo(form.requestType, requests),
      employeeName: normalizeText(form.employeeName),
      employeeCode: normalizeText(form.employeeCode),
      jobNo: normalizeText(form.jobNo),
      purpose: normalizeText(form.purpose),
      bankAccount: normalizeText(form.bankAccount),
      paymentRef: normalizeText(form.paymentRef),
      remarks: normalizeText(form.remarks),
      advanceAmount: numberValue(form.advanceAmount),
      advanceAdjusted: numberValue(form.advanceAdjusted),
      grossAmount: getExpenseTotal(cleanItems),
      payableAmount: nextPayable,
      items: cleanItems,
      approvalFlow,
      status: approvalFlow.length ? "Pending Approval" : "Approved",
      paymentStatus: form.paymentStatus || "Not Paid",
      requestedBy: form.requestedBy || userName,
      requestedRole: form.requestedRole || currentRole,
      createdAt: form.createdAt || now,
      updatedAt: now,
      updatedBy: userName,
    };

    setRequests((prev) => {
      const exists = prev.some((request) => request.id === nextRequest.id);
      if (exists) {
        return prev.map((request) =>
          request.id === nextRequest.id ? nextRequest : request
        );
      }
      return [nextRequest, ...prev];
    });

    setForm(nextRequest);
    setSelectedRequestId(nextRequest.id);
    setActiveScreen("view");
    setMessage(`${getRequestMeta(nextRequest.requestType).label} saved.`);
    setIsSaving(false);
  };

  const handleEdit = (request) => {
    setForm({
      ...blankForm,
      ...request,
      items: request.items?.length ? request.items : [{ ...blankExpenseItem }],
    });
    setMessage("");
    setActiveScreen("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (requestId) => {
    setRequests((prev) => prev.filter((request) => request.id !== requestId));
    if (form.id === requestId) resetForm();
    if (selectedRequestId === requestId) setSelectedRequestId("");
    setMessage("Expense request deleted.");
  };

  const handleApproval = (requestId, decision) => {
    setRequests((prev) =>
      prev.map((request) => {
        if (request.id !== requestId) return request;

        const currentStep = getCurrentApprovalStep(request);
        if (!currentStep || !roleMatches(currentRole, currentStep.role)) {
          setMessage(`Approval pending with ${currentStep?.role || "next role"}.`);
          return request;
        }

        const now = new Date().toISOString();
        const flow = (request.approvalFlow || []).map((step) => {
          if (step.id !== currentStep.id) return step;
          return {
            ...step,
            status: decision,
            actionBy: userName,
            actionAt: now,
            remarks: decision,
          };
        });

        if (decision === "Rejected") {
          return {
            ...request,
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
          ...request,
          approvalFlow: flow,
          status: isApproved ? "Approved" : "Pending Approval",
          updatedAt: now,
          updatedBy: userName,
        };
      })
    );

    setMessage(decision === "Approved" ? "Approval recorded." : "Request rejected.");
  };

  const handleMarkPaid = (requestId) => {
    setRequests((prev) =>
      prev.map((request) => {
        if (request.id !== requestId) return request;

        const now = new Date().toISOString();
        return {
          ...request,
          paymentStatus: "Paid",
          status: "Reimbursed",
          reimbursedAmount: request.payableAmount,
          reimbursedAt: now,
          reimbursedBy: userName,
          paymentRef:
            request.paymentRef ||
            `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
          updatedAt: now,
          updatedBy: userName,
        };
      })
    );

    setMessage("Reimbursement marked as paid.");
  };

  const canMarkPaid = (request) =>
    request.status === "Approved" &&
    request.paymentStatus !== "Paid" &&
    (roleMatches(currentRole, "Finance Manager") || roleMatches(currentRole, "admin"));

  const isAdvance = form.requestType === REQUEST_TYPES.advanceRequest.value;
  const isWarningMessage =
    message.includes("Please") ||
    message.includes("must") ||
    message.includes("pending") ||
    message.includes("rejected");

  return (
    <div className="page-wrapper expense-approval-page">
      <div className="content container-fluid">
        <div className="expense-approval-header">
          <div>
            <h4>Expense Request & Reimbursement</h4>
            <div className="text-muted small">
              {userName} | {currentRole}
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <span className="expense-pill role">Role: {currentRole}</span>
            <span className="expense-pill count">{requests.length} Request(s)</span>
          </div>
        </div>

        <div className="expense-stat-grid">
          <div className="expense-stat">
            <span>Total</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="expense-stat">
            <span>Pending</span>
            <strong>{stats.pending}</strong>
          </div>
          <div className="expense-stat">
            <span>Approved</span>
            <strong>{stats.approved}</strong>
          </div>
          <div className="expense-stat">
            <span>Paid</span>
            <strong>{stats.paid}</strong>
          </div>
        </div>

        {message && (
          <Alert variant={isWarningMessage ? "warning" : "success"}>
            {message}
          </Alert>
        )}

        <div className="expense-screen-tabs mb-3">
          <Button
            type="button"
            variant={activeScreen === "add" ? "primary" : "outline-primary"}
            onClick={() => setActiveScreen("add")}
          >
            Add Request
          </Button>
          <Button
            type="button"
            variant={activeScreen === "view" ? "primary" : "outline-primary"}
            onClick={() => setActiveScreen("view")}
          >
            View Requests
          </Button>
        </div>

        {activeScreen === "add" && (
        <Card className="expense-card mb-3">
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col xl={3} md={6}>
                  <Form.Group>
                    <Form.Label>Request Type</Form.Label>
                    <Select
                      classNamePrefix="expense-select"
                      styles={selectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      options={requestTypeOptions}
                      value={requestTypeOptions.find(
                        (option) => option.value === form.requestType
                      )}
                      onChange={(option) =>
                        setField(
                          "requestType",
                          option?.value || REQUEST_TYPES.expenseRequest.value
                        )
                      }
                    />
                  </Form.Group>
                </Col>

                <Col xl={3} md={6}>
                  <Form.Group>
                    <Form.Label>Request No</Form.Label>
                    <div className="expense-readonly">
                      {form.requestNo || "Auto generated"}
                    </div>
                  </Form.Group>
                </Col>

                <Col xl={3} md={6}>
                  <Form.Group>
                    <Form.Label>Employee Name</Form.Label>
                    <Form.Control
                      value={form.employeeName}
                      onChange={(event) => setField("employeeName", event.target.value)}
                      placeholder="Employee name"
                    />
                  </Form.Group>
                </Col>

                <Col xl={3} md={6}>
                  <Form.Group>
                    <Form.Label>Employee Code</Form.Label>
                    <Form.Control
                      value={form.employeeCode}
                      onChange={(event) => setField("employeeCode", event.target.value)}
                      placeholder="Employee code"
                    />
                  </Form.Group>
                </Col>

                <Col xl={3} md={6}>
                  <Form.Group>
                    <Form.Label>Job No</Form.Label>
                    <Form.Control
                      value={form.jobNo}
                      onChange={(event) => setField("jobNo", event.target.value)}
                      placeholder="Tag request to job no"
                    />
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
                    <Form.Label>Period From</Form.Label>
                    <Form.Control
                      type="date"
                      value={form.periodFrom}
                      onChange={(event) => setField("periodFrom", event.target.value)}
                    />
                  </Form.Group>
                </Col>

                <Col xl={3} md={6}>
                  <Form.Group>
                    <Form.Label>Period To</Form.Label>
                    <Form.Control
                      type="date"
                      value={form.periodTo}
                      onChange={(event) => setField("periodTo", event.target.value)}
                    />
                  </Form.Group>
                </Col>

                <Col xl={3} md={6}>
                  <Form.Group>
                    <Form.Label>Department</Form.Label>
                    <Select
                      classNamePrefix="expense-select"
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

                <Col xl={4} md={6}>
                  <Form.Group>
                    <Form.Label>Locations</Form.Label>
                    <Select
                      classNamePrefix="expense-select"
                      styles={selectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      isMulti
                      options={locationOptions}
                      value={locationOptions.filter((option) =>
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

                <Col xl={4} md={6}>
                  <Form.Group>
                    <Form.Label>Purpose</Form.Label>
                    <Form.Control
                      value={form.purpose}
                      onChange={(event) => setField("purpose", event.target.value)}
                      placeholder="Travel, client meeting, project expense"
                    />
                  </Form.Group>
                </Col>

                <Col xl={2} md={6}>
                  <Form.Group>
                    <Form.Label>Payment Mode</Form.Label>
                    <Select
                      classNamePrefix="expense-select"
                      styles={selectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      options={paymentModeOptions}
                      value={paymentModeOptions.find(
                        (option) => option.value === form.paymentMode
                      )}
                      onChange={(option) =>
                        setField("paymentMode", option?.value || "Bank Transfer")
                      }
                    />
                  </Form.Group>
                </Col>

                <Col xl={2} md={6}>
                  <Form.Group>
                    <Form.Label>Payment Ref</Form.Label>
                    <Form.Control
                      value={form.paymentRef}
                      onChange={(event) => setField("paymentRef", event.target.value)}
                      placeholder="UTR / voucher"
                    />
                  </Form.Group>
                </Col>

                <Col xl={3} md={6}>
                  <Form.Group>
                    <Form.Label>Advance Amount</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.advanceAmount}
                      onChange={(event) => setField("advanceAmount", event.target.value)}
                      placeholder="For advance request"
                    />
                  </Form.Group>
                </Col>

                {!isAdvance && (
                  <Col xl={3} md={6}>
                    <Form.Group>
                      <Form.Label>Advance Adjusted</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.advanceAdjusted}
                        onChange={(event) =>
                          setField("advanceAdjusted", event.target.value)
                        }
                        placeholder="Advance already paid"
                      />
                    </Form.Group>
                  </Col>
                )}

                <Col xl={6} md={12}>
                  <Form.Group>
                    <Form.Label>Bank / Reimbursement Details</Form.Label>
                    <Form.Control
                      value={form.bankAccount}
                      onChange={(event) => setField("bankAccount", event.target.value)}
                      placeholder="Bank, UPI, employee account or cash voucher details"
                    />
                  </Form.Group>
                </Col>

                {!isAdvance && (
                  <Col xs={12}>
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                      <div>
                        <h6 className="mb-0">Expense Lines</h6>
                        <small className="text-muted">
                          Gross {formatMoney(lineTotal)} | Payable{" "}
                          {formatMoney(payableAmount)}
                        </small>
                      </div>
                      <Button
                        type="button"
                        variant="outline-primary"
                        size="sm"
                        onClick={addItem}
                      >
                        <FilePlus size={15} className="me-1" />
                        Add Line
                      </Button>
                    </div>

                    <Table responsive className="expense-table">
                      <thead>
                        <tr>
                          <th>Job No</th>
                          <th>Date</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Merchant</th>
                          <th>Bill No</th>
                          <th>Amount</th>
                          <th>GST</th>
                          <th>Receipt Ref</th>
                          <th>Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((item, index) => (
                          <tr key={index} className="expense-item-row">
                            <td>
                              <Form.Control
                                value={item.jobNo}
                                onChange={(event) =>
                                  setItemField(index, "jobNo", event.target.value)
                                }
                                placeholder={form.jobNo || "Job no"}
                              />
                            </td>
                            <td>
                              <Form.Control
                                type="date"
                                value={item.expenseDate}
                                onChange={(event) =>
                                  setItemField(index, "expenseDate", event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <Form.Select
                                value={item.category}
                                onChange={(event) =>
                                  setItemField(index, "category", event.target.value)
                                }
                              >
                                {categoryOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </Form.Select>
                            </td>
                            <td>
                              <Form.Control
                                value={item.description}
                                onChange={(event) =>
                                  setItemField(index, "description", event.target.value)
                                }
                                placeholder="Expense details"
                              />
                            </td>
                            <td>
                              <Form.Control
                                value={item.merchant}
                                onChange={(event) =>
                                  setItemField(index, "merchant", event.target.value)
                                }
                                placeholder="Merchant"
                              />
                            </td>
                            <td>
                              <Form.Control
                                value={item.billNo}
                                onChange={(event) =>
                                  setItemField(index, "billNo", event.target.value)
                                }
                                placeholder="Bill no"
                              />
                            </td>
                            <td>
                              <Form.Control
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.amount}
                                onChange={(event) =>
                                  setItemField(index, "amount", event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <Form.Control
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.gstAmount}
                                onChange={(event) =>
                                  setItemField(index, "gstAmount", event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <Form.Control
                                value={item.receiptRef}
                                onChange={(event) =>
                                  setItemField(index, "receiptRef", event.target.value)
                                }
                                placeholder="Attachment / receipt ref"
                              />
                            </td>
                            <td>{formatMoney(getLineTotal(item))}</td>
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
                )}

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Remarks</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={form.remarks}
                      onChange={(event) => setField("remarks", event.target.value)}
                      placeholder="Approval notes, policy exception, or settlement notes"
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Label>Approval Flow</Form.Label>
                  <div className="expense-flow">
                    {approvalFlowPreview.map((step, index) => (
                      <span
                        key={step.id}
                        className={`expense-flow-step ${
                          index === 0 ? "current" : "waiting"
                        }`}
                      >
                        {step.role}
                      </span>
                    ))}
                  </div>
                  <div className="expense-readonly mt-3">
                    Gross: {formatMoney(lineTotal)} | Payable:{" "}
                    {formatMoney(payableAmount)}
                  </div>
                </Col>

                <Col xs={12}>
                  <div className="expense-actions">
                    <Button type="submit" variant="primary" disabled={isSaving}>
                      <Save size={15} className="me-1" />
                      {form.id ? "Update Request" : "Save Request"}
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
        )}

        {activeScreen === "view" && (
        <Card className="expense-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h5 className="mb-0">Expense Requests</h5>
              <div className="d-flex flex-wrap gap-2">
                <Form.Control
                  style={{ width: 260 }}
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search request / job no"
                />
                <Form.Select
                  style={{ width: 190 }}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Reimbursed">Reimbursed</option>
                  <option value="Paid">Paid</option>
                  <option value="Not Paid">Not Paid</option>
                </Form.Select>
                <Form.Select
                  style={{ width: 180 }}
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                >
                  <option value="All">All Locations</option>
                  {locationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </div>

            <Table responsive className="expense-table">
              <thead>
                <tr>
                  <th>Request No</th>
                  <th>Type</th>
                  <th>Employee</th>
                  <th>Job No</th>
                  <th>Locations</th>
                  <th>Request Date</th>
                  <th>Payable</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Next Approver</th>
                  <th>Approval Flow</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length ? (
                  filteredRequests.map((request) => {
                    const currentStep = getCurrentApprovalStep(request);
                    const canApprove =
                      request.status === "Pending Approval" &&
                      currentStep &&
                      roleMatches(currentRole, currentStep.role);

                    return (
                      <tr key={request.id}>
                        <td>
                          <strong>{request.requestNo}</strong>
                          <div className="text-muted small">{request.purpose}</div>
                        </td>
                        <td>{getRequestMeta(request.requestType).label}</td>
                        <td>
                          {request.employeeName || "-"}
                          <div className="text-muted small">
                            {request.employeeCode || "-"}
                          </div>
                        </td>
                        <td>
                          <strong>{request.jobNo || "-"}</strong>
                          {(request.items || []).some((item) => item.jobNo) && (
                            <div className="text-muted small">
                              Lines:{" "}
                              {[
                                ...new Set(
                                  (request.items || [])
                                    .map((item) => item.jobNo)
                                    .filter(Boolean)
                                ),
                              ].join(", ")}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="expense-location-tags">
                            {getLocationLabels(request.locations).map((label) => (
                              <span key={label}>{label}</span>
                            ))}
                          </div>
                        </td>
                        <td>{formatDate(request.requestDate)}</td>
                        <td>{formatMoney(request.payableAmount)}</td>
                        <td>
                          <span className={`expense-badge ${getStatusClass(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`expense-badge ${
                              request.paymentStatus === "Paid" ? "paid" : "unpaid"
                            }`}
                          >
                            {request.paymentStatus || "Not Paid"}
                          </span>
                          {request.paymentRef && (
                            <div className="text-muted small">{request.paymentRef}</div>
                          )}
                        </td>
                        <td>{currentStep?.role || "-"}</td>
                        <td>
                          <div className="expense-flow">
                            {(request.approvalFlow || []).map((step) => (
                              <span
                                key={step.id}
                                className={`expense-flow-step ${
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
                          <div className="expense-actions">
                            <Button
                              size="sm"
                              variant={
                                selectedRequestId === request.id
                                  ? "primary"
                                  : "outline-primary"
                              }
                              onClick={() => setSelectedRequestId(request.id)}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => handleEdit(request)}
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-success"
                              onClick={() => handleApproval(request.id, "Approved")}
                              disabled={!canApprove}
                            >
                              <CheckCircle size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleApproval(request.id, "Rejected")}
                              disabled={!canApprove}
                            >
                              <XCircle size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => handleMarkPaid(request.id)}
                              disabled={!canMarkPaid(request)}
                            >
                              <CreditCard size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleDelete(request.id)}
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
                    <td colSpan={12} className="text-center text-muted py-4">
                      No expense requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>

            {selectedRequest && (
              <div className="expense-detail-panel mt-3">
                <div className="expense-detail-header">
                  <div>
                    <h5 className="mb-1">{selectedRequest.requestNo}</h5>
                    <div className="text-muted small">
                      {getRequestMeta(selectedRequest.requestType).label} | Job No:{" "}
                      {selectedRequest.jobNo || "-"}
                    </div>
                  </div>
                  <div className="expense-actions">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-primary"
                      onClick={() => handleEdit(selectedRequest)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => setSelectedRequestId("")}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                <Row className="g-3 mt-1">
                  <Col md={3}>
                    <div className="expense-readonly">
                      <strong>Employee</strong>
                      <div>{selectedRequest.employeeName || "-"}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="expense-readonly">
                      <strong>Period</strong>
                      <div>
                        {formatDate(selectedRequest.periodFrom)} to{" "}
                        {formatDate(selectedRequest.periodTo)}
                      </div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="expense-readonly">
                      <strong>Gross</strong>
                      <div>{formatMoney(selectedRequest.grossAmount)}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="expense-readonly">
                      <strong>Payable</strong>
                      <div>{formatMoney(selectedRequest.payableAmount)}</div>
                    </div>
                  </Col>
                </Row>

                <Table responsive className="expense-table mt-3 mb-0">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Job No</th>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Merchant</th>
                      <th>Bill No</th>
                      <th>Receipt Ref</th>
                      <th>Amount</th>
                      <th>GST</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.items?.length ? (
                      selectedRequest.items.map((item, index) => (
                        <tr key={item.id || index}>
                          <td>{index + 1}</td>
                          <td>{item.jobNo || selectedRequest.jobNo || "-"}</td>
                          <td>{formatDate(item.expenseDate)}</td>
                          <td>{item.category || "-"}</td>
                          <td>{item.description || "-"}</td>
                          <td>{item.merchant || "-"}</td>
                          <td>{item.billNo || "-"}</td>
                          <td>{item.receiptRef || "-"}</td>
                          <td>{formatMoney(item.amount)}</td>
                          <td>{formatMoney(item.gstAmount)}</td>
                          <td>{formatMoney(getLineTotal(item))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="text-center text-muted py-3">
                          No line items for this request.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
        )}
      </div>
    </div>
  );
};

export default ExpenseReimbursement;
