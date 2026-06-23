import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import axios from "axios";
import CreatableSelect from "react-select/creatable";
import { Edit2, RefreshCw, Save, Trash2, XCircle } from "react-feather";
import config from "../../../config";
import hsnRateData from "../../../core/json/hsnRateData.json";
import { mergeFallbackCustomers } from "./customerFallbacks";

const RATE_STORAGE_KEY = "productMediaRateMasterRows";

const emptyForm = {
  id: "",
  customerId: "",
  customerName: "",
  panCard: "",
  storeName: "",
  media: "",
  width: "",
  height: "",
  qty: "",
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

const normalizeCustomerMatchKey = (value) =>
  normalizeKey(String(value || "").replace(/\([^)]*\)/g, " "));

const normalizePanCard = (value) => String(value || "").trim().toUpperCase();

const getPanFromGstin = (gstin) => {
  const clean = String(gstin || "").trim().toUpperCase();
  return clean.length >= 12 ? clean.substring(2, 12) : "";
};

const getPanFromText = (value) => {
  const text = String(value || "").toUpperCase();
  const gstinMatch = text.match(/\b\d{2}([A-Z]{5}\d{4}[A-Z])[A-Z0-9]{3}\b/);
  if (gstinMatch?.[1]) return gstinMatch[1];

  const panMatch = text.match(/\b[A-Z]{5}\d{4}[A-Z]\b/);
  return panMatch?.[0] || "";
};

const getLoggedInUser = () => {
  try {
    return JSON.parse(localStorage.getItem("users") || "{}")?.message || {};
  } catch (error) {
    console.error("Failed to read logged in user", error);
    return {};
  }
};

const getCustomerId = (customer) =>
  String(
    customer?.customeR_ID ??
      customer?.customerId ??
      customer?.CustomerId ??
      customer?.customerid ??
      customer?.CUSTOMER_ID ??
      customer?.id ??
      customer?._id ??
      ""
  ).trim();

const getCustomerName = (customer) =>
  normalizeText(
    customer?.customeR_NAME ||
      customer?.customerName ||
      customer?.CustomerName ||
      customer?.client ||
      customer?.CUSTOMER_NAME ||
      customer?.customername ||
      customer?.name ||
      customer?.Name ||
      ""
  );

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

const getCustomerPanCard = (customer) =>
  normalizePanCard(
    customer?.panCard ||
      customer?.PanCard ||
      customer?.panNo ||
      customer?.PANNo ||
      customer?.PAN_NO ||
      customer?.pan ||
      customer?.PAN ||
      getPanFromGstin(getCustomerGstNo(customer)) ||
      getPanFromText(getCustomerName(customer))
  );

const getPanCandidatesForCustomer = ({
  customers = [],
  rows = [],
  customerId = "",
  customerName = "",
  panCard = "",
}) => {
  const selectedCustomerId = String(customerId || "").trim();
  const selectedCustomerName = normalizeCustomerMatchKey(customerName);
  const seen = new Set();
  const candidates = [];

  const addPan = (value) => {
    const clean = normalizePanCard(value);
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    candidates.push(clean);
  };

  addPan(panCard);

  [...customers, ...rows].forEach((item) => {
    const currentCustomerId = getCustomerId(item);
    const currentCustomerName = normalizeCustomerMatchKey(
      getCustomerName(item) || item?.customerName || item?.CustomerName
    );
    const idMatches =
      selectedCustomerId &&
      currentCustomerId &&
      currentCustomerId === selectedCustomerId;
    const nameMatches =
      selectedCustomerName &&
      currentCustomerName &&
      (currentCustomerName === selectedCustomerName ||
        currentCustomerName.includes(selectedCustomerName) ||
        selectedCustomerName.includes(currentCustomerName));

    if (idMatches || nameMatches) {
      addPan(getCustomerPanCard(item) || item?.panCard || item?.PanCard || item?.panNo);
    }
  });

  return candidates;
};

const normalizeStoreRow = (store = {}) => {
  const gstNo = String(
    store?.gstNo ||
      store?.GstNo ||
      store?.GSTNo ||
      store?.GST_NO ||
      store?.gst_number ||
      store?.gstin ||
      store?.GSTIN ||
      ""
  ).trim();

  return {
    id: String(store?.id || store?._id || store?.storeId || store?.StoreId || ""),
    customerId: String(
      store?.customerId ||
        store?.customerID ||
        store?.CustomerId ||
        store?.customerid ||
        store?.customeR_ID ||
        store?.CUSTOMER_ID ||
        store?.customer_id ||
        ""
    ).trim(),
    storeName: normalizeText(
      store?.storeName ||
        store?.StoreName ||
        store?.storeNameAsPerPan ||
        store?.StoreNameAsPerPan ||
        store?.storeNameAsPerPAN ||
        store?.StoreNameAsPerPAN ||
        store?.salonStoreName ||
        store?.SalonStoreName ||
        store?.name ||
        store?.Name ||
        ""
    ),
    panCard: normalizePanCard(
      store?.panCard ||
        store?.PanCard ||
        store?.panNo ||
        store?.PANNo ||
        store?.PAN_NO ||
        store?.pan ||
        store?.PAN ||
        getPanFromGstin(gstNo)
    ),
    gstNo,
  };
};

const getRateMedia = (row = {}) =>
  normalizeText(
    row?.externalMedia ||
      row?.ExternalMedia ||
      row?.internalMedia ||
      row?.InternalMedia ||
      row?.media ||
      row?.Media ||
      row?.productCode ||
      row?.ProductCode ||
      ""
  );

const normalizeRecceRow = (row = {}, index = 0) => ({
  id: String(row?.id || row?._id || row?.recceId || `recce-${index}`),
  customerId: String(row?.customerId || row?.CustomerId || "").trim(),
  customerName: normalizeText(row?.customerName || row?.CustomerName || ""),
  panCard: normalizePanCard(row?.panCard || row?.PanCard || row?.panNo || ""),
  storeName: normalizeText(row?.storeName || row?.StoreName || ""),
  media: normalizeText(row?.media || row?.Media || ""),
  width: String(row?.width ?? row?.Width ?? ""),
  height: String(row?.height ?? row?.Height ?? ""),
  qty: String(row?.qty ?? row?.QTY ?? row?.quantity ?? ""),
  Enteredby: row?.Enteredby || row?.enteredby || "",
  Entereddat: row?.Entereddat || row?.entereddat || "",
});

const selectPortalTarget = () =>
  typeof document !== "undefined" ? document.body : undefined;

const recceSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderColor: state.isFocused ? "#a32d2d" : "#d8e0ea",
    borderRadius: 6,
    boxShadow: state.isFocused ? "0 0 0 3px rgba(163, 45, 45, 0.14)" : "none",
    fontSize: 14,
    "&:hover": {
      borderColor: state.isFocused ? "#a32d2d" : "#c7d0dc",
    },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#a32d2d"
      : state.isFocused
        ? "#fff4ef"
        : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#25364d",
    cursor: "pointer",
  }),
};

const toSelectOption = (value) => {
  const clean = normalizeText(value);
  return clean ? { value: clean, label: clean } : null;
};

const isPositiveNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0;
};

const formatCustomerOption = (option, { context }) => {
  if (context === "value") return option.label;

  return (
    <div className="recce-select-option">
      <span>{option.label}</span>
      {option.panCard && <small>PAN: {option.panCard}</small>}
    </div>
  );
};

const formatStoreOption = (option, { context }) => {
  if (context === "value") return option.label;

  return (
    <div className="recce-select-option">
      <span>{option.label}</span>
      {option.panCard && <small>PAN: {option.panCard}</small>}
    </div>
  );
};

const toApiPayload = (row, mode) => {
  const user = getLoggedInUser();
  const userName = user?.username || user?.userName || user?.name || "";
  const now = new Date().toISOString();

  const payload = {
    id: row.id || undefined,
    customerId: row.customerId || "",
    customerName: normalizeText(row.customerName),
    panCard: normalizePanCard(row.panCard),
    storeName: normalizeText(row.storeName),
    media: normalizeText(row.media),
    width: Number(row.width),
    height: Number(row.height),
    qty: Number(row.qty),
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

const Recce = () => {
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stores, setStores] = useState([]);
  const [mediaRows, setMediaRows] = useState([]);
  const [message, setMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchRecceRows = async () => {
    setIsLoadingRows(true);

    try {
      const response = await axios.get(config.Recce.URL.GetAll, {
        timeout: 10000,
      });

      setRows(getRows(response.data).map(normalizeRecceRow));
    } catch (error) {
      console.error("Error loading Recce rows", error);
      setRows([]);
      setMessage("Could not load Recce rows from API.");
    } finally {
      setIsLoadingRows(false);
    }
  };

  useEffect(() => {
    fetchRecceRows();
  }, []);

  useEffect(() => {
    const loadCustomers = async () => {
      const user = getLoggedInUser();
      const locationId = user?.location_id || user?.locationId || "";

      if (!locationId) {
        setCustomers(mergeFallbackCustomers([]));
        return;
      }

      setIsLoadingCustomers(true);

      try {
        const response = await axios.post(
          config.JobSummary.URL.Getallcustomer,
          { locationid: locationId },
          { timeout: 10000, headers: { "Content-Type": "application/json" } }
        );

        setCustomers(mergeFallbackCustomers(getRows(response.data)));
      } catch (error) {
        console.error("Error loading Recce customers", error);
        setCustomers(mergeFallbackCustomers([]));
        setMessage("Could not load customers from API.");
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    loadCustomers();
  }, []);

  useEffect(() => {
    const loadMediaRows = async () => {
      try {
        const response = await axios.get(config.ProductMediaRateMaster.URL.GetAll, {
          timeout: 10000,
        });

        setMediaRows(getRows(response.data).map(getRateMedia).filter(Boolean));
      } catch (error) {
        console.warn("Unable to load media options for Recce", error);

        try {
          const savedRates = JSON.parse(
            localStorage.getItem(RATE_STORAGE_KEY) || "[]"
          );

          setMediaRows(
            Array.isArray(savedRates)
              ? savedRates.map(getRateMedia).filter(Boolean)
              : []
          );
        } catch {
          setMediaRows([]);
        }
      }
    };

    loadMediaRows();
  }, []);

  const selectedPanCards = useMemo(
    () =>
      getPanCandidatesForCustomer({
        customers,
        rows,
        customerId: form.customerId,
        customerName: form.customerName,
        panCard: form.panCard,
      }),
    [customers, form.customerId, form.customerName, form.panCard, rows]
  );

  useEffect(() => {
    const loadStores = async () => {
      if (!selectedPanCards.length) {
        setStores([]);
        return;
      }

      setIsLoadingStores(true);

      try {
        const responses = await Promise.allSettled(
          selectedPanCards.map((panCard) =>
            axios.get(
              `${config.Store.URL.List}?panCard=${encodeURIComponent(panCard)}`,
              { timeout: 10000 }
            )
          )
        );
        const loadedStores = responses.flatMap((result, index) =>
          result.status === "fulfilled"
            ? getRows(result.value.data).map((store) => ({
                ...store,
                panCard:
                  store?.panCard ||
                  store?.PanCard ||
                  store?.panNo ||
                  store?.PANNo ||
                  selectedPanCards[index],
              }))
            : []
        );

        setStores(loadedStores.map(normalizeStoreRow));
      } catch (error) {
        console.error("Error loading stores for Recce", error);
        setStores([]);
      } finally {
        setIsLoadingStores(false);
      }
    };

    loadStores();
  }, [selectedPanCards]);

  const customerOptions = useMemo(() => {
    const seen = new Set();
    const options = [];

    customers.forEach((customer) => {
      const customerId = getCustomerId(customer);
      const customerName = getCustomerName(customer);
      const panCard = getCustomerPanCard(customer);
      const key = customerId || normalizeKey(customerName);

      if (!key || seen.has(key)) return;

      seen.add(key);
      options.push({
        value: customerId || customerName,
        label: customerName || customerId,
        customerId,
        customerName,
        panCard,
      });
    });

    rows.forEach((row) => {
      const customerName = normalizeText(row.customerName);
      const key = row.customerId || normalizeKey(customerName);

      if (!key || seen.has(key)) return;

      seen.add(key);
      options.push({
        value: row.customerId || customerName,
        label: customerName,
        customerId: row.customerId,
        customerName,
        panCard: row.panCard,
      });
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [customers, rows]);

  const selectedCustomerOption = useMemo(() => {
    if (!form.customerName && !form.customerId) return null;

    return (
      customerOptions.find(
        (option) =>
          (form.customerId && option.customerId === form.customerId) ||
          normalizeKey(option.customerName) === normalizeKey(form.customerName)
      ) || {
        value: form.customerId || form.customerName,
        label: form.customerName || form.customerId,
        customerId: form.customerId,
        customerName: form.customerName,
        panCard: form.panCard,
      }
    );
  }, [customerOptions, form.customerId, form.customerName, form.panCard]);

  const storeOptions = useMemo(() => {
    const selectedPanSet = new Set(selectedPanCards);
    const seen = new Set();
    const options = [];

    const addOption = (store, source) => {
      const storeName = normalizeText(store.storeName);
      const panCard = normalizePanCard(store.panCard);

      if (!storeName) return;

      if (selectedPanSet.size && panCard && !selectedPanSet.has(panCard)) return;

      const customerMatches =
        !form.customerId ||
        !store.customerId ||
        String(store.customerId) === String(form.customerId);
      const panMatches = panCard && selectedPanSet.has(panCard);

      if (source !== "storeMaster" && !customerMatches && !panMatches) return;
      if (!selectedPanSet.size && !customerMatches) return;

      const key = `${normalizeKey(storeName)}|${panCard}`;

      if (seen.has(key)) return;

      seen.add(key);

      options.push({
        value: storeName,
        label: storeName,
        panCard,
      });
    };

    stores.forEach((store) => addOption(store, "storeMaster"));
    rows.forEach((row) => addOption(row, "recce"));

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [form.customerId, rows, selectedPanCards, stores]);

  const mediaOptions = useMemo(() => {
    const seen = new Set();

    const values = [
      ...mediaRows,
      ...(Array.isArray(hsnRateData)
        ? hsnRateData.map((item) => item?.media || "")
        : []),
      ...rows.map((row) => row.media),
    ];

    return values.reduce((options, value) => {
      const media = normalizeText(value);
      const key = normalizeKey(media);

      if (!media || seen.has(key)) return options;

      seen.add(key);
      options.push({ value: media, label: media });

      return options;
    }, []);
  }, [mediaRows, rows]);

  const filteredRows = useMemo(() => {
    const query = normalizeKey(searchText);

    if (!query) return rows;

    return rows.filter((row) =>
      [
        row.customerName,
        row.panCard,
        row.storeName,
        row.media,
        row.width,
        row.height,
        row.qty,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [rows, searchText]);

  const handleCustomerChange = (option) => {
    if (!option) {
      setForm((prev) => ({
        ...prev,
        customerId: "",
        customerName: "",
        panCard: "",
        storeName: "",
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      customerId: option.customerId || "",
      customerName: option.customerName || option.label || "",
      panCard: option.panCard || "",
      storeName: "",
    }));
  };

  const handleCreateCustomer = (value) => {
    const customerName = normalizeText(value);

    if (!customerName) return;

    setForm((prev) => ({
      ...prev,
      customerId: "",
      customerName,
      panCard: "",
      storeName: "",
    }));
  };

  const handleStoreChange = (option) => {
    setForm((prev) => ({
      ...prev,
      storeName: option?.value || "",
    }));
  };

  const handleMediaChange = (option) => {
    setForm((prev) => ({
      ...prev,
      media: option?.value || "",
    }));
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
    if (!normalizeText(form.customerName)) return "Please enter customer name.";
    if (!normalizeText(form.storeName)) return "Please enter store name.";
    if (!normalizeText(form.media)) return "Please enter media.";
    if (!isPositiveNumber(form.width)) return "Width must be greater than 0.";
    if (!isPositiveNumber(form.height)) return "Height must be greater than 0.";
    if (!isPositiveNumber(form.qty)) return "QTY must be greater than 0.";
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    try {
      setIsSaving(true);

      const isUpdate = Boolean(form.id);
      const apiUrl = isUpdate ? config.Recce.URL.Update : config.Recce.URL.Add;

      await axios.post(apiUrl, toApiPayload(form, isUpdate ? "update" : "add"), {
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      });

      await fetchRecceRows();

      setMessage(isUpdate ? "Recce row updated." : "Recce row added.");

      setForm((prev) => ({
        ...emptyForm,
        customerId: prev.customerId,
        customerName: prev.customerName,
        panCard: prev.panCard,
        storeName: prev.storeName,
      }));
    } catch (error) {
      console.error("Error saving Recce row", error);
      setMessage("API unavailable or failed to save Recce row.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (row) => {
    setForm({
      id: row.id,
      customerId: row.customerId || "",
      customerName: row.customerName || "",
      panCard: row.panCard || "",
      storeName: row.storeName || "",
      media: row.media || "",
      width: row.width || "",
      height: row.height || "",
      qty: row.qty || "",
    });

    setMessage("");
  };

  const handleDelete = async (rowId) => {
    try {
      setIsSaving(true);

      await axios.post(
        config.Recce.URL.Delete,
        toApiPayload({ id: rowId }, "delete"),
        {
          timeout: 10000,
          headers: { "Content-Type": "application/json" },
        }
      );

      await fetchRecceRows();

      if (form.id === rowId) resetForm();

      setMessage("Recce row deleted.");
    } catch (error) {
      console.error("Error deleting Recce row", error);
      setMessage("API unavailable or failed to delete Recce row.");
    } finally {
      setIsSaving(false);
    }
  };

  const isWarningMessage =
    message.includes("Please") ||
    message.includes("must") ||
    message.includes("Could not") ||
    message.includes("failed");

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <style>{`
          .recce-header {
            align-items: center;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: space-between;
            margin-bottom: 14px;
          }
          .recce-header h4 {
            color: #14213d;
            font-weight: 700;
            margin: 0;
          }
          .recce-count {
            background: #fff4ef;
            border: 1px solid #f1c7bb;
            border-radius: 6px;
            color: #9b2e2e;
            font-size: 13px;
            font-weight: 700;
            padding: 6px 10px;
          }
          .recce-card {
            border: 1px solid #d8e0ea;
            border-radius: 8px;
            box-shadow: 0 10px 24px rgba(22, 34, 51, 0.06);
          }
          .recce-card label {
            color: #31425a;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 6px;
          }
          .recce-card .form-control {
            border-color: #d8e0ea;
            border-radius: 6px;
            color: #25364d;
            font-size: 14px;
            min-height: 42px;
          }
          .recce-card .form-control:focus {
            border-color: #a32d2d;
            box-shadow: 0 0 0 3px rgba(163, 45, 45, 0.14);
          }
          .recce-select-option {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .recce-select-option span {
            font-weight: 700;
            line-height: 1.2;
          }
          .recce-select-option small {
            color: inherit;
            font-size: 12px;
            opacity: 0.76;
          }
          .recce-table th {
            background: #eef4fb;
            border-color: #d5deea;
            color: #1d2f49;
            font-weight: 700;
            white-space: nowrap;
          }
          .recce-table td {
            border-color: #d5deea;
            color: #25364d;
            vertical-align: middle;
          }
          .recce-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          @media (max-width: 767.98px) {
            .recce-header {
              align-items: flex-start;
              flex-direction: column;
            }
            .recce-actions .btn {
              width: 100%;
            }
          }
        `}</style>

        <div className="recce-header">
          <h4>Recce</h4>
          <span className="recce-count">{rows.length} Recce Row(s)</span>
        </div>

        {message && (
          <Alert variant={isWarningMessage ? "warning" : "success"}>
            {message}
          </Alert>
        )}

        {(isLoadingRows || isLoadingCustomers || isLoadingStores) && (
          <Alert variant="info">
            {isLoadingRows
              ? "Loading recce rows..."
              : isLoadingCustomers
                ? "Loading customers..."
                : "Loading stores..."}
          </Alert>
        )}

        <Card className="recce-card mb-3">
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col xl={4} md={6}>
                  <Form.Group>
                    <Form.Label>Customer Name</Form.Label>
                    <CreatableSelect
                      classNamePrefix="recce-customer-select"
                      styles={recceSelectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      isClearable
                      isSearchable
                      options={customerOptions}
                      value={selectedCustomerOption}
                      onChange={handleCustomerChange}
                      onCreateOption={handleCreateCustomer}
                      formatOptionLabel={formatCustomerOption}
                      placeholder="Select or type customer"
                      noOptionsMessage={() => "No customers found"}
                    />
                  </Form.Group>
                </Col>

                <Col xl={4} md={6}>
                  <Form.Group>
                    <Form.Label>Store Name (As per PAN)</Form.Label>
                    <CreatableSelect
                      classNamePrefix="recce-store-select"
                      styles={recceSelectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      isClearable
                      isSearchable
                      options={storeOptions}
                      value={toSelectOption(form.storeName)}
                      onChange={handleStoreChange}
                      onCreateOption={(value) =>
                        handleChange("storeName", normalizeText(value))
                      }
                      formatOptionLabel={formatStoreOption}
                      placeholder="Select or type store"
                      noOptionsMessage={() => "No stores found"}
                    />
                  </Form.Group>
                </Col>

                <Col xl={4} md={6}>
                  <Form.Group>
                    <Form.Label>Media</Form.Label>
                    <CreatableSelect
                      classNamePrefix="recce-media-select"
                      styles={recceSelectStyles}
                      menuPortalTarget={selectPortalTarget()}
                      isClearable
                      isSearchable
                      options={mediaOptions}
                      value={toSelectOption(form.media)}
                      onChange={handleMediaChange}
                      onCreateOption={(value) =>
                        handleChange("media", normalizeText(value))
                      }
                      placeholder="Select or type media"
                      noOptionsMessage={() => "No media found"}
                    />
                  </Form.Group>
                </Col>

                <Col xl={2} md={4}>
                  <Form.Group>
                    <Form.Label>Width</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.width}
                      onChange={(event) =>
                        handleChange("width", event.target.value)
                      }
                      placeholder="Width"
                    />
                  </Form.Group>
                </Col>

                <Col xl={2} md={4}>
                  <Form.Group>
                    <Form.Label>Height</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.height}
                      onChange={(event) =>
                        handleChange("height", event.target.value)
                      }
                      placeholder="Height"
                    />
                  </Form.Group>
                </Col>

                <Col xl={2} md={4}>
                  <Form.Group>
                    <Form.Label>QTY</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="1"
                      value={form.qty}
                      onChange={(event) => handleChange("qty", event.target.value)}
                      placeholder="QTY"
                    />
                  </Form.Group>
                </Col>

                <Col xl={6} md={12} className="d-flex align-items-end">
                  <div className="recce-actions">
                    <Button type="submit" variant="primary" disabled={isSaving}>
                      <Save size={15} className="me-1" />
                      {isSaving
                        ? "Saving..."
                        : form.id
                          ? "Update Recce"
                          : "Add Recce"}
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

        <Card className="recce-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h5 className="mb-0">Recce List</h5>

              <Form.Control
                style={{ maxWidth: 320 }}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search recce"
              />
            </div>

            <Table responsive className="recce-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Store Name (As per PAN)</th>
                  <th>Media</th>
                  <th>Width</th>
                  <th>Height</th>
                  <th>QTY</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.customerName || "-"}</td>
                      <td>{row.storeName || "-"}</td>
                      <td>{row.media || "-"}</td>
                      <td>{row.width || "-"}</td>
                      <td>{row.height || "-"}</td>
                      <td>{row.qty || "-"}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleEdit(row)}
                            disabled={isSaving}
                          >
                            <Edit2 size={14} className="me-1" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDelete(row.id)}
                            disabled={isSaving}
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
                    <td colSpan={7} className="text-center text-muted py-4">
                      <XCircle size={16} className="me-1" />
                      No recce rows found.
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

export default Recce;
