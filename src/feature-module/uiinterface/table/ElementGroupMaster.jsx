import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import axios from "axios";
import Select from "react-select";
import config from "../../../config";

const STORAGE_KEY = "elementGroupMasterRows";

const emptyElementItem = {
  id: "",
  articleCode: "",
  hsn: "",
  description: "",
  visualCode: "",
  qty: "",
  width: "",
  height: "",
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
  customerId: "",
  customerName: "",
  panCard: "",
  description: "",
  isActive: "1",
  elements: [],
};

const getRowsFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const getCustomerRowsFromResponse = getRowsFromResponse;

const selectPortalTarget = () =>
  typeof document !== "undefined" ? document.body : null;

const customerSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 38,
    borderColor: state.isFocused ? "#86b7fe" : "#dee2e6",
    boxShadow: state.isFocused
      ? "0 0 0 0.25rem rgba(13, 110, 253, 0.25)"
      : "none",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
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

  return (
    roleText.includes("branch manager") ||
    roleText.includes("branchmanager") ||
    roleText.includes("branch-manager") ||
    roleText.includes("accounts") ||
    roleText.includes("admin")
  );
};

const getCustomerId = (customer) =>
  String(
    customer?.customerId ??
      customer?.CustomerId ??
      customer?.CUSTOMER_ID ??
      customer?.customeR_ID ??
      customer?.customerid ??
      customer?.id ??
      customer?._id ??
      ""
  ).trim();

const getCustomerName = (customer) =>
  String(
    customer?.customerName ??
      customer?.CustomerName ??
      customer?.CUSTOMER_NAME ??
      customer?.customeR_NAME ??
      customer?.customername ??
      customer?.client ??
      customer?.Client ??
      customer?.name ??
      customer?.Name ??
      ""
  ).trim();

const getCustomerGstNo = (customer) =>
  String(
    customer?.gsT_NO ??
      customer?.gstNo ??
      customer?.GSTNo ??
      customer?.GST_NO ??
      customer?.gst_number ??
      customer?.gstin ??
      customer?.GSTIN ??
      ""
  ).trim();

const getPanFromGstin = (gstin) => {
  const clean = String(gstin || "").trim().toUpperCase();
  return clean.length >= 12 ? clean.substring(2, 12) : "";
};

const normalizePanCard = (value) => String(value || "").trim().toUpperCase();

const normalizeLookupText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const firstFilledValue = (...values) =>
  values.find((value) => String(value ?? "").trim()) ?? "";

const getElementArticleCode = (item = {}) =>
  normalizeText(
    firstFilledValue(
      item?.articleCode,
      item?.ArticleCode,
      item?.ARTICLECODE,
      item?.articlecode,
      item?.article_code,
      item?.Article_Code,
      item?.ARTICLE_CODE,
      item?.["Article Code"],
      item?.["ARTICLE CODE"],
      item?.articalCode,
      item?.ArticalCode,
      item?.ARTICALCODE,
      item?.artical_code,
      item?.itemCode,
      item?.ItemCode,
      item?.ITEMCODE,
      item?.productCode,
      item?.ProductCode,
      item?.PRODUCTCODE
    )
  );

const normalizeYesNoFlag = (value) => {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return "";

  if (["yes", "y", "true", "1", "active"].includes(text)) return "Yes";
  if (["no", "n", "false", "0", "inactive"].includes(text)) return "No";

  return "";
};

const textIfNotYesNoFlag = (value) =>
  normalizeYesNoFlag(value) ? "" : normalizeText(value);

const getElementLaminationType = (item = {}) =>
  normalizeText(
    firstFilledValue(
      item?.typeOfLamination,
      item?.TypeOfLamination,
      item?.TYPEOFLAMINATION,
      item?.laminationType,
      item?.LaminationType,
      item?.["Type of Lamination"],
      item?.["TYPE OF LAMINATION"],
      textIfNotYesNoFlag(item?.lamination),
      textIfNotYesNoFlag(item?.Lamination)
    )
  );

const getElementMountingType = (item = {}) =>
  normalizeText(
    firstFilledValue(
      item?.typeOfMounting,
      item?.TypeOfMounting,
      item?.TYPEOFMOUNTING,
      item?.mountingType,
      item?.MountingType,
      item?.["Type of Mounting"],
      item?.["TYPE OF MOUNTING"],
      textIfNotYesNoFlag(item?.mounting),
      textIfNotYesNoFlag(item?.Mounting)
    )
  );

const getElementLaminationFlag = (item = {}) =>
  normalizeYesNoFlag(
    firstFilledValue(
      item?.laminationFlag,
      item?.LaminationFlag,
      item?.LAMINATIONFLAG,
      item?.isLamination,
      item?.IsLamination,
      item?.ISLAMINATION,
      item?.hasLamination,
      item?.HasLamination,
      item?.lamination,
      item?.Lamination,
      item?.LAMINATION
    )
  ) || (getElementLaminationType(item) ? "Yes" : "");

const getElementMountingFlag = (item = {}) =>
  normalizeYesNoFlag(
    firstFilledValue(
      item?.mountingFlag,
      item?.MountingFlag,
      item?.MOUNTINGFLAG,
      item?.isMounting,
      item?.IsMounting,
      item?.ISMOUNTING,
      item?.hasMounting,
      item?.HasMounting,
      item?.mounting,
      item?.Mounting,
      item?.MOUNTING
    )
  ) || (getElementMountingType(item) ? "Yes" : "");

const getCustomerPanCard = (customer) =>
  normalizePanCard(
    customer?.panCard ??
      customer?.PanCard ??
      customer?.panNo ??
      customer?.PANNo ??
      customer?.PAN_NO ??
      customer?.pan ??
      customer?.PAN ??
      getPanFromGstin(getCustomerGstNo(customer))
  );

const findCustomerForElementGroup = (customers, customerId, customerName) => {
  const selectedCustomerId = String(customerId || "").trim();
  const selectedCustomerName = normalizeLookupText(customerName);

  return (Array.isArray(customers) ? customers : []).find((customer) => {
    const currentCustomerId = getCustomerId(customer);
    const currentCustomerName = normalizeLookupText(getCustomerName(customer));

    return (
      (selectedCustomerId &&
        currentCustomerId &&
        selectedCustomerId === currentCustomerId) ||
      (selectedCustomerName &&
        currentCustomerName &&
        selectedCustomerName === currentCustomerName)
    );
  });
};

const getCustomerPanForElementGroup = (customers, customerId, customerName) => {
  const customer = findCustomerForElementGroup(customers, customerId, customerName);
  return customer ? getCustomerPanCard(customer) : "";
};

const hydrateElementGroupPanCards = (rows, customers) =>
  (Array.isArray(rows) ? rows : []).map((row) => {
    const panCard =
      normalizePanCard(row?.panCard) ||
      getCustomerPanForElementGroup(customers, row?.customerId, row?.customerName);

    return panCard && panCard !== row?.panCard ? { ...row, panCard } : row;
  });

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
  articleCode: getElementArticleCode(item),
  hsn: String(
    item?.hsn ||
      item?.HSN ||
      item?.hsnCode ||
      item?.HsnCode ||
      item?.HSNCode ||
      ""
  ).trim(),
  description: String(
    item?.description ||
      item?.Description ||
      item?.visualCode ||
      item?.VisualCode ||
      item?.elementName ||
      item?.ElementName ||
      ""
  ).trim(),
  visualCode: String(
    item?.visualCode ||
      item?.VisualCode ||
      item?.description ||
      item?.Description ||
      item?.elementName ||
      item?.ElementName ||
      ""
  ).trim(),
  qty: String(item?.qty ?? item?.Qty ?? item?.quantity ?? ""),
  width: String(item?.width ?? item?.Width ?? ""),
  height: String(item?.height ?? item?.Height ?? ""),
  laminationFlag: getElementLaminationFlag(item),
  lamination: getElementLaminationType(item),
  mountingFlag: getElementMountingFlag(item),
  mounting: getElementMountingType(item),
  implementation: String(item?.implementation || item?.Implementation || "").trim(),
});

const normalizeRow = (row, index = 0) => ({
  id: String(row?.id ?? row?.ID ?? row?._id ?? `api-${index}`),
  elementGroupCode:
    row?.elementGroupCode ?? row?.ElementGroupCode ?? row?.groupCode ?? "",
  elementGroupName:
    row?.elementGroupName ??
    row?.ElementGroupName ??
    row?.groupName ??
    row?.elementGroup ??
    "",
  customerId: String(
    row?.customerId ?? row?.CustomerId ?? row?.CUSTOMER_ID ?? ""
  ).trim(),
  customerName: String(
    row?.customerName ?? row?.CustomerName ?? row?.client ?? row?.CLIENT ?? ""
  ).trim(),
  panCard: normalizePanCard(
    row?.panCard ??
      row?.PanCard ??
      row?.panNo ??
      row?.PANNo ??
      row?.PAN_NO ??
      row?.pan ??
      row?.PAN ??
      getPanFromGstin(row?.gstNo || row?.GSTNo || row?.GST_NO || row?.gstin || row?.GSTIN) ??
      ""
  ),
  description: row?.description ?? row?.Description ?? "",
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
    customerId: row.customerId || "",
    CustomerId: row.customerId || "",
    customerName: row.customerName || "",
    CustomerName: row.customerName || "",
    panCard: row.panCard || "",
    PanCard: row.panCard || "",
    PANCard: row.panCard || "",
    panNo: row.panCard || "",
    PANNo: row.panCard || "",
    description: row.description || "",
    isActive: row.isActive || "1",
    elements: (row.elements || []).map((item) => ({
      ...item,
      articleCode: getElementArticleCode(item),
      ArticleCode: getElementArticleCode(item),
      articlecode: getElementArticleCode(item),
      ARTICLECODE: getElementArticleCode(item),
      "Article Code": getElementArticleCode(item),
      hsn: String(item.hsn || "").trim(),
      description: String(item.description || item.visualCode || "").trim(),
      visualCode: String(item.visualCode || item.description || "").trim(),
      qty: String(item.qty || "").trim(),
      width: String(item.width || "").trim(),
      height: String(item.height || "").trim(),
      laminationFlag: getElementLaminationFlag(item),
      LaminationFlag: getElementLaminationFlag(item),
      Lamination: getElementLaminationFlag(item),
      isLamination: getElementLaminationFlag(item) === "Yes" ? "1" : getElementLaminationFlag(item) === "No" ? "0" : "",
      lamination: getElementLaminationType(item),
      typeOfLamination: getElementLaminationType(item),
      TypeOfLamination: getElementLaminationType(item),
      "Type of Lamination": getElementLaminationType(item),
      mountingFlag: getElementMountingFlag(item),
      MountingFlag: getElementMountingFlag(item),
      Mounting: getElementMountingFlag(item),
      isMounting: getElementMountingFlag(item) === "Yes" ? "1" : getElementMountingFlag(item) === "No" ? "0" : "",
      mounting: getElementMountingType(item),
      typeOfMounting: getElementMountingType(item),
      TypeOfMounting: getElementMountingType(item),
      "Type of Mounting": getElementMountingType(item),
      implementation: String(item.implementation || "").trim(),
    })),
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
  const [customerRows, setCustomerRows] = useState([]);

  const didLoadRef = useRef(false);
  const canManageElementGroups = useMemo(() => isFinanceUser(), []);

  const fetchElementGroups = useCallback(
    async ({ showFallbackMessage = true } = {}) => {
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
            return false;
          } catch (parseError) {
            console.error("Failed to parse element group rows", parseError);
          }
        }

        setRows([]);

        if (showFallbackMessage) {
          setMessage(
            "Could not load element groups from API and no saved local data was found."
          );
        }

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    const loadFormResources = async () => {
      await fetchElementGroups();

      try {
        const user = getLoggedInUser();
        const locationId = user?.location_id || user?.locationId || "";

        if (locationId) {
          const customerResponse = await axios.post(
            config.JobSummary.URL.Getallcustomer,
            { locationid: locationId },
            {
              timeout: 10000,
              headers: { "Content-Type": "application/json" },
            }
          );

          setCustomerRows(getCustomerRowsFromResponse(customerResponse.data));
        } else {
          setCustomerRows([]);
        }
      } catch (error) {
        console.warn("Unable to load customers for Element Group Master", error);
        setCustomerRows([]);
      }

    };

    loadFormResources();
  }, [fetchElementGroups]);

  const hydratedRows = useMemo(
    () => hydrateElementGroupPanCards(rows, customerRows),
    [customerRows, rows]
  );

  useEffect(() => {
    if (hydratedRows.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hydratedRows));
    }
  }, [hydratedRows]);

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const selectedPanCard = normalizePanCard(form.panCard);
    const selectedCustomerId = String(form.customerId || "").trim();
    const selectedCustomerName = normalizeLookupText(form.customerName);
    const hasSelectedCustomer =
      selectedPanCard || selectedCustomerId || selectedCustomerName;

    const customerScopedRows = hasSelectedCustomer
      ? hydratedRows.filter((row) => {
          const rowPanCard = normalizePanCard(row.panCard);
          const rowCustomerId = String(row.customerId || "").trim();
          const rowCustomerName = normalizeLookupText(row.customerName);

          if (selectedPanCard) {
            return rowPanCard === selectedPanCard;
          }

          if (selectedCustomerId && rowCustomerId) {
            return rowCustomerId === selectedCustomerId;
          }

          return Boolean(
            selectedCustomerName &&
              rowCustomerName &&
              rowCustomerName === selectedCustomerName
          );
        })
      : hydratedRows;

    if (!query) return customerScopedRows;

    return customerScopedRows.filter((row) =>
      [
        row.elementGroupCode,
        row.elementGroupName,
        row.customerName,
        row.panCard,
        row.description,
        row.customerName ? "client" : "master general",
        row.isActive === "1" ? "active" : "inactive",
        ...(row.elements || []).flatMap((item) => [item.articleCode, item.hsn]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [
    form.customerId,
    form.customerName,
    form.panCard,
    hydratedRows,
    searchText,
  ]);

  const customerOptions = useMemo(() => {
    const seen = new Set();

    return customerRows
      .map((customer) => {
        const customerId = getCustomerId(customer);
        const customerName = getCustomerName(customer);
        const panCard = getCustomerPanCard(customer);

        return {
          value: customerId || customerName,
          customerId,
          customerName,
          panCard,
          label: [customerName || customerId, panCard ? `PAN: ${panCard}` : ""]
            .filter(Boolean)
            .join(" - "),
        };
      })
      .filter((option) => {
        const key = String(option.value || option.label || "")
          .trim()
          .toLowerCase();

        if (!key || seen.has(key)) return false;

        seen.add(key);
        return true;
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [customerRows]);

  const selectedCustomerOption = useMemo(
    () =>
      customerOptions.find(
        (option) => option.value === (form.customerId || form.customerName)
      ) || null,
    [customerOptions, form.customerId, form.customerName]
  );

  const handleCustomerChange = (value) => {
    const selectedCustomer = customerOptions.find(
      (option) => option.value === value
    );

    const customerId = selectedCustomer?.customerId || "";
    const customerName = selectedCustomer?.customerName || "";
    const panCard = selectedCustomer?.panCard || "";

    setForm((prev) => ({
      ...prev,
      customerId,
      customerName,
      panCard,
    }));
  };

  const handleChange = (field, value) => {
    if (field === "panCard") {
      setForm((prev) => ({
        ...prev,
        panCard: normalizePanCard(value),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleElementChange = (index, field, value) => {
    const next = [...(form.elements || [])];

    next[index] = {
      ...next[index],
      [field]: value,
    };

    if (field === "description") {
      next[index].visualCode = value;
    }

    setForm((prev) => ({ ...prev, elements: next }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMessage("");
  };

  const validateForm = () => {
    if (!canManageElementGroups) {
      return "Only Branch Manager / Finance / Accounts team users can create or edit element groups.";
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
      customerId: String(form.customerId || "").trim(),
      customerName: String(form.customerName || "").trim(),
      panCard:
        normalizePanCard(form.panCard) ||
        getCustomerPanForElementGroup(
          customerRows,
          form.customerId,
          form.customerName
        ),
      description: String(form.description || "").trim(),
      isActive: String(form.isActive || "1"),
      elements: Array.isArray(form.elements)
        ? form.elements.map((item) => ({
            ...item,
            articleCode: getElementArticleCode(item),
            ArticleCode: getElementArticleCode(item),
            articlecode: getElementArticleCode(item),
            ARTICLECODE: getElementArticleCode(item),
            "Article Code": getElementArticleCode(item),
            hsn: String(item.hsn || "").trim(),
            description: String(item.description || item.visualCode || "").trim(),
            visualCode: String(item.visualCode || item.description || "").trim(),
            qty: String(item.qty || "").trim(),
            width: String(item.width || "").trim(),
            height: String(item.height || "").trim(),
            laminationFlag: getElementLaminationFlag(item),
            LaminationFlag: getElementLaminationFlag(item),
            Lamination: getElementLaminationFlag(item),
            isLamination: getElementLaminationFlag(item) === "Yes" ? "1" : getElementLaminationFlag(item) === "No" ? "0" : "",
            lamination: getElementLaminationType(item),
            typeOfLamination: getElementLaminationType(item),
            TypeOfLamination: getElementLaminationType(item),
            "Type of Lamination": getElementLaminationType(item),
            mountingFlag: getElementMountingFlag(item),
            MountingFlag: getElementMountingFlag(item),
            Mounting: getElementMountingFlag(item),
            isMounting: getElementMountingFlag(item) === "Yes" ? "1" : getElementMountingFlag(item) === "No" ? "0" : "",
            mounting: getElementMountingType(item),
            typeOfMounting: getElementMountingType(item),
            TypeOfMounting: getElementMountingType(item),
            "Type of Mounting": getElementMountingType(item),
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

      await axios.post(
        apiUrl,
        toApiPayload(cleanRow, isUpdate ? "update" : "add"),
        {
          timeout: 10000,
          headers: { "Content-Type": "application/json" },
        }
      );

      await fetchElementGroups({ showFallbackMessage: false });

      setMessage(isUpdate ? "Element group updated." : "Element group added.");
      setForm(emptyForm);
    } catch (error) {
      console.error("Error saving element group", error);
      setMessage("API unavailable or failed to save to server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (row) => {
    setForm({
      id: row.id,
      elementGroupCode: row.elementGroupCode || "",
      elementGroupName: row.elementGroupName || "",
      customerId: row.customerId || "",
      customerName: row.customerName || "",
      panCard: row.panCard || "",
      description: row.description || "",
      isActive: row.isActive || "1",
      elements:
        Array.isArray(row.elements) && row.elements.length ? row.elements : [],
    });

    setMessage("");
  };

  const handleDelete = async (rowId) => {
    try {
      setIsSaving(true);

      const selectedRow =
        hydratedRows.find((row) => row.id === rowId) ||
        rows.find((row) => row.id === rowId) ||
        { id: rowId };

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
      setMessage("API unavailable or failed to delete on server.");
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
              message.includes("failed") ||
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
            Element group creation and editing is limited to Branch Manager /
            Finance / Accounts team users.
          </Alert>
        )}

        <Card className="element-group-card mb-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h5 className="mb-0">Element Group List</h5>

              <Form.Control
                style={{ maxWidth: 320 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search customer/PAN/code/name/status"
              />
            </div>

            <Table responsive className="element-group-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>PAN Card</th>
                  <th>Element Group Code</th>
                  <th>Element Group Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.customerName || "Master / All Clients"}</td>
                      <td>{row.panCard || "-"}</td>
                      <td>{row.elementGroupCode || "-"}</td>
                      <td>{row.elementGroupName || "-"}</td>
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
                    <td colSpan={7} className="text-center text-muted">
                      No element groups found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>

        <Card className="element-group-card mb-3">
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Client</Form.Label>
                    <Select
                      classNamePrefix="element-group-customer-select"
                      styles={customerSelectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      isClearable
                      isSearchable
                      isDisabled={!canManageElementGroups}
                      options={customerOptions}
                      value={selectedCustomerOption}
                      onChange={(option) =>
                        handleCustomerChange(option?.value || "")
                      }
                      placeholder="Search customer / all clients"
                      noOptionsMessage={() => "No customers found"}
                    />
                  </Form.Group>
                </Col>

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

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>PAN Card</Form.Label>
                    <Form.Control
                      value={form.panCard}
                      onChange={(e) => handleChange("panCard", e.target.value)}
                      placeholder="PAN for matching"
                      disabled={!canManageElementGroups}
                    />
                  </Form.Group>
                </Col>

                <Col md={5}>
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
                      onChange={(e) => handleChange("description", e.target.value)}
                      placeholder="Enter description"
                      disabled={!canManageElementGroups}
                    />
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <h6 className="mb-0">Group Element Rows</h6>
                      <small className="text-muted">
                        Define default elements and sizes for this group.
                      </small>
                    </div>

                    <Button
                      size="sm"
                      variant="outline-primary"
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          elements: [
                            ...(prev.elements || []),
                            { ...emptyElementItem },
                          ],
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
                        <th>Article Code</th>
                        <th>HSN Code</th>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Width</th>
                        <th>Height</th>
                        <th>Lamination</th>
                        <th>Type of Lamination</th>
                        <th>Mounting</th>
                        <th>Type of Mounting</th>
                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {(Array.isArray(form.elements) ? form.elements : []).map(
                        (item, index) => (
                          <tr key={index}>
                            <td>
                              <Form.Control
                                value={item.articleCode || ""}
                                onChange={(e) =>
                                  handleElementChange(
                                    index,
                                    "articleCode",
                                    e.target.value
                                  )
                                }
                                placeholder="Article code"
                                disabled={!canManageElementGroups}
                              />
                            </td>

                            <td>
                              <Form.Control
                                value={item.hsn || ""}
                                onChange={(e) =>
                                  handleElementChange(
                                    index,
                                    "hsn",
                                    e.target.value
                                  )
                                }
                                placeholder="HSN Code"
                                disabled={!canManageElementGroups}
                              />
                            </td>

                            <td>
                              <Form.Control
                                value={item.description || item.visualCode || ""}
                                onChange={(e) =>
                                  handleElementChange(
                                    index,
                                    "description",
                                    e.target.value
                                  )
                                }
                                placeholder="Description"
                                disabled={!canManageElementGroups}
                              />
                            </td>

                            <td>
                              <Form.Control
                                value={item.qty}
                                onChange={(e) =>
                                  handleElementChange(index, "qty", e.target.value)
                                }
                                placeholder="Qty"
                                disabled={!canManageElementGroups}
                              />
                            </td>

                            <td>
                              <Form.Control
                                value={item.width}
                                onChange={(e) =>
                                  handleElementChange(
                                    index,
                                    "width",
                                    e.target.value
                                  )
                                }
                                placeholder="Width"
                                disabled={!canManageElementGroups}
                              />
                            </td>

                            <td>
                              <Form.Control
                                value={item.height}
                                onChange={(e) =>
                                  handleElementChange(
                                    index,
                                    "height",
                                    e.target.value
                                  )
                                }
                                placeholder="Height"
                                disabled={!canManageElementGroups}
                              />
                            </td>

                            <td>
                              <Form.Select
                                value={item.laminationFlag}
                                onChange={(e) =>
                                  handleElementChange(
                                    index,
                                    "laminationFlag",
                                    e.target.value
                                  )
                                }
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

                                  setForm((prev) => ({
                                    ...prev,
                                    elements: next,
                                  }));
                                }}
                                placeholder="Type of lamination"
                                disabled={!canManageElementGroups}
                              />
                            </td>

                            <td>
                              <Form.Select
                                value={item.mountingFlag}
                                onChange={(e) =>
                                  handleElementChange(
                                    index,
                                    "mountingFlag",
                                    e.target.value
                                  )
                                }
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

                                  setForm((prev) => ({
                                    ...prev,
                                    elements: next,
                                  }));
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

                                  setForm((prev) => ({
                                    ...prev,
                                    elements: next,
                                  }));
                                }}
                                disabled={!canManageElementGroups}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </Table>
                </Col>

                <Col md={3} className="d-flex align-items-end gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSaving || !canManageElementGroups}
                  >
                    {isSaving ? "Saving..." : form.id ? "Update Group" : "Add Group"}
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
      </div>
    </div>
  );
};

export default ElementGroupMaster;
