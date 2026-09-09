import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import axios from "axios";
import config from "../../../config";
import erpMasterData from "../../../core/json/erpMasterData.json";
import productRateData from "../../../core/json/productRateData.json";
import { mergeFallbackCustomers } from "./customerFallbacks";
import Select from "react-select";

const STORAGE_KEY = "productMediaRateMasterRows";

const emptyForm = {
  id: "",
  customerId: "",
  customerName: "",
  gstNo: "",
  panNo: "",
  productCode: "",
  hsnCode: "",
  ratePerSqft: "",
  internalMedia: "",
  externalMedia: "",
  mediaType: "MEDIA",
  productAsPerRateCard: "",
  simplifiedProductName: "",

};

const getCustomerId = (customer) =>
  String(
    customer?.customeR_ID ??
      customer?.customerId ??
      customer?.CUSTOMER_ID ??
      ""
  ).trim();

const getCustomerName = (customer) =>
  customer?.customeR_NAME ||
  customer?.customerName ||
  customer?.CUSTOMER_NAME ||
  "";

const getCustomerGstNo = (customer) =>
  String(
    customer?.gsT_NO ??
      customer?.gstNo ??
      customer?.GST_NO ??
      customer?.gst_number ??
      customer?.gstin ??
      customer?.GSTIN ??
      ""
  ).trim();

const getCustomerPanCard = (customer) =>
  String(
    customer?.panCard ??
      customer?.PanCard ??
      customer?.panNo ??
      customer?.PANNo ??
      customer?.pan_number ??
      customer?.PAN_NO ??
      customer?.pan ??
      customer?.PAN ??
      getPanFromGstin(getCustomerGstNo(customer))
  )
    .trim()
    .toUpperCase();

const getPanFromGstin = (gstin) => {
  const clean = String(gstin || "").trim().toUpperCase();
  return clean.length >= 12 ? clean.substring(2, 12) : "";
};

const getSelectedOption = (options, value) =>
  options.find((option) => option.value === value) || null;

const getMasterGroup = (key) =>
  Array.isArray(erpMasterData?.groups?.[key]) ? erpMasterData.groups[key] : [];

const getMasterValues = (key) =>
  getMasterGroup(key)
    .map((item) => String(item?.value || item?.label || "").trim())
    .filter(Boolean);

const uniqueOptionValues = (values = []) => {
  const seen = new Set();

  return values.filter((value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const getMasterOptionValues = (key, fallback = []) => {
  const masterValues = getMasterValues(key);
  return uniqueOptionValues(masterValues.length ? masterValues : fallback);
};

const getRowsFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const getLoggedInUser = () => {
  try {
    return JSON.parse(localStorage.getItem("users") || "{}")?.message || {};
  } catch (error) {
    console.error("Failed to read logged in user", error);
    return {};
  }
};

const getLoggedInUserName = () => {
  const user = getLoggedInUser();
  return user?.username || user?.userName || user?.name || "";
};

const toApiPayload = (row, mode) => {
  const now = new Date().toISOString();
  const userName = getLoggedInUserName();

  const payload = {
    customerId: row.customerId,
    customerName: row.customerName,
    gstNo: row.gstNo,
    panNo: row.panNo,
    productCode: row.productCode,
    mediaType: row.mediaType,
    MediaType: row.mediaType,
    hsnCode: row.hsnCode,
    ratePerSqft: Number(row.ratePerSqft || 0),
    internalMedia: row.internalMedia,
    externalMedia: row.externalMedia,
    productAsPerRateCard: row.productAsPerRateCard || row.externalMedia,
    simplifiedProductName: row.simplifiedProductName || row.internalMedia,
    Del_index: row.Del_index || "1",
  };

  if (row.id) {
    payload.id = row.id;
  }

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

const normalizeRateRow = (row, index = 0, customers = []) => {
  const customerId = String(
    row?.customerId ??
      row?.customerID ??
      row?.CustomerId ??
      row?.CUSTOMER_ID ??
      ""
  ).trim();

  
  const customerName =
    row?.customerName ??
    row?.CustomerName ??
    row?.client ??
    row?.CLIENT ??
    "";

  const matchedCustomer = customers.find((customer) => {
    const cid = getCustomerId(customer);
    const cname = getCustomerName(customer);
    return (
      (customerId && cid === customerId) ||
      (customerName &&
        String(cname || "").trim().toLowerCase() ===
          String(customerName || "").trim().toLowerCase())
    );
  });

  const fallbackGst = matchedCustomer ? getCustomerGstNo(matchedCustomer) : "";

  const gstNo = String(
    row?.gstNo ??
      row?.GSTNo ??
      row?.gst_number ??
      row?.GST_NO ??
      row?.gsT_NO ??
      row?.gstin ??
      row?.GSTIN ??
      fallbackGst ??
      ""
  )
    .trim()
    .toUpperCase();

  const panNo = String(
    row?.panNo ??
      row?.PANNo ??
      row?.pan_number ??
      row?.PAN_NO ??
      row?.pan ??
      row?.PAN ??
      getPanFromGstin(gstNo)
  )
    .trim()
    .toUpperCase();

  return {
    id: String(
      row?.id ??
        row?.ID ??
        row?.productMediaRateMasterId ??
        row?.productMediaRateMasterID ??
        row?.rateId ??
        `api-${index}`
    ),
    customerId,
    customerName,
    gstNo,
    panNo,
    productCode: row?.productCode ?? row?.ProductCode ?? row?.PRODUCT_CODE ?? "",
    hsnCode:
      row?.hsnCode ?? row?.HsnCode ?? row?.HSNCode ?? row?.hsn ?? row?.HSN ?? "",
    ratePerSqft:
      row?.ratePerSqft ?? row?.RatePerSqft ?? row?.rate ?? row?.Rate ?? "",
    productAsPerRateCard:
      row?.productAsPerRateCard ??
      row?.ProductAsPerRateCard ??
      row?.externalMedia ??
      row?.ExternalMedia ??
      row?.media ??
      row?.Media ??
      "",
    simplifiedProductName:
      row?.simplifiedProductName ??
      row?.SimplifiedProductName ??
      row?.internalMedia ??
      row?.InternalMedia ??
      row?.media ??
      row?.Media ??
      "",
    internalMedia:
      row?.internalMedia ??
      row?.InternalMedia ??
      row?.simplifiedProductName ??
      row?.SimplifiedProductName ??
      row?.media ??
      row?.Media ??
      "",
    externalMedia:
      row?.externalMedia ??
      row?.ExternalMedia ??
      row?.productAsPerRateCard ??
      row?.ProductAsPerRateCard ??
      row?.media ??
      row?.Media ??
      "",
    mediaType: String(
    row?.mediaType ??
      row?.MediaType ??
      row?.MEDIA_TYPE ??
      "MEDIA"
  ).trim(),
    Enteredby: row?.Enteredby ?? row?.enteredby ?? "",
    Entereddat: row?.Entereddat ?? row?.entereddat ?? null,
    Lstupateby: row?.Lstupateby ?? row?.lstupateby ?? "",
    Lstupdatedt: row?.Lstupdatedt ?? row?.lstupdatedt ?? null,
    Del_index: row?.Del_index ?? row?.del_index ?? "1",
  };
};

const workbookRateRows = (Array.isArray(productRateData) ? productRateData : []).map(
  (item, index) =>
    normalizeRateRow(
      {
        id: `workbook-${index}`,
        customerName: item.customerName || "",
        productAsPerRateCard: item.productAsPerRateCard || "",
        simplifiedProductName: item.simplifiedProductName || "",
        ratePerSqft: item.ratePerSqft ?? "",
      },
      index,
      []
    )
);

const rateCardRowKey = (row) =>
  [
    String(row?.customerName || "").trim().toLowerCase(),
    String(row?.productAsPerRateCard || row?.externalMedia || "").trim().toLowerCase(),
    String(row?.simplifiedProductName || row?.internalMedia || "").trim().toLowerCase(),
    String(row?.ratePerSqft ?? "").trim().toLowerCase(),
  ].join("|");

const mergeWorkbookRateRows = (sourceRows = [], customers = []) => {
  const sourceMap = new Map();

  sourceRows.forEach((row, index) => {
    const normalized = normalizeRateRow(row, index, customers);
    sourceMap.set(rateCardRowKey(normalized), normalized);
  });

  return workbookRateRows.map((baseRow, index) => {
    const matchedRow = sourceMap.get(rateCardRowKey(baseRow));
    return normalizeRateRow(
      {
        ...baseRow,
        ...matchedRow,
        id: matchedRow?.id || baseRow.id || `workbook-${index}`,
      },
      index,
      customers
    );
  });
};

const ProductMediaRateMaster = () => {
  const customerLoadStartedRef = useRef(false);
  const initialRatesLoadStartedRef = useRef(false);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [hsnSearchText, setHsnSearchText] = useState("");
  const [message, setMessage] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProductMediaRates = useCallback(
    async ({ showFallbackMessage = true } = {}) => {
      setIsLoading(true);
      try {
        const response = await axios.get(config.ProductMediaRateMaster.URL.GetAll, {
          timeout: 10000,
        });

        const apiRows = getRowsFromResponse(response.data);
        setRows(mergeWorkbookRateRows(apiRows, customers));
        return true;
      } catch (error) {
        console.error("Error fetching product media rates", error);

        const savedRows = localStorage.getItem(STORAGE_KEY);
        if (savedRows) {
          try {
            const parsed = JSON.parse(savedRows);
            setRows(mergeWorkbookRateRows(parsed, customers));
            if (showFallbackMessage) {
              setMessage("Could not load rates from API. Showing product rates only.");
            }
            return false;
          } catch (parseError) {
            console.error("Failed to parse product media rate rows", parseError);
          }
        }

        setRows(workbookRateRows);
        if (showFallbackMessage) {
          setMessage("Could not load rates from API. Showing product rates only.");
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [customers]
  );

  useEffect(() => {
    if (customerLoadStartedRef.current) return;

    customerLoadStartedRef.current = true;
    const fetchCustomers = async () => {
      try {
        const users = JSON.parse(localStorage.getItem("users") || "{}");
        const locationId =
          users?.message?.location_id || users?.message?.locationId || "";

        if (!locationId) {
          setCustomers(mergeFallbackCustomers([]));
          return;
        }

        const response = await axios.post(
          config.JobSummary.URL.Getallcustomer,
          { locationid: locationId },
          {
            timeout: 10000,
            headers: { "Content-Type": "application/json" },
          }
        );

        const mergedCustomers = mergeFallbackCustomers(
          Array.isArray(response.data) ? response.data : []
        );
        setCustomers(mergedCustomers);
      } catch (error) {
        console.error("Error fetching customers", error);
        setCustomers(mergeFallbackCustomers([]));
      } finally {
        setCustomersLoaded(true);
      }
    };

    fetchCustomers();
  }, []);

  useEffect(() => {
    if (!customersLoaded || initialRatesLoadStartedRef.current) return;

    initialRatesLoadStartedRef.current = true;
    fetchProductMediaRates();
  }, [customersLoaded, fetchProductMediaRates]);

  useEffect(() => {
    if (rows.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    }
  }, [rows]);

  const filteredHsnSheetRows = useMemo(() => {
    const query = hsnSearchText.trim().toLowerCase();
    if (!query) return workbookRateRows;

    return workbookRateRows.filter((row) =>
      [
        row.customerName,
        row.productAsPerRateCard,
        row.simplifiedProductName,
        row.ratePerSqft,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [hsnSearchText]);

  const selectedCustomerHasRate = useMemo(() => {
    const selectedCustomerName = String(form.customerName || "").trim().toLowerCase();
    if (!selectedCustomerName) return false;

    return workbookRateRows.some(
      (row) =>
        String(row.customerName || "").trim().toLowerCase() === selectedCustomerName
    );
  }, [form.customerName]);

  const mediaTypeOptions = [
  { value: "MEDIA", label: "Media" },
  { value: "LAMINATION", label: "Lamination" },
  { value: "MOUNTING", label: "Mounting" }
];

  const customerOptions = useMemo(
    () => [
      ...customers.map((customer) => {
        const customerId = getCustomerId(customer);
        const customerName = getCustomerName(customer);
        const gstNo = getCustomerGstNo(customer);
        const panNo = getCustomerPanCard(customer);

        return {
          value: customerId,
          label: customerName || customerId,
          customerName,
          gstNo,
          panNo,
        };
      }),
    ],
    [customers]
  );

  const handleChange = (field, value) => {
    if (field === "customerId") {
      const selectedCustomer = customers.find(
        (customer) => getCustomerId(customer) === String(value)
      );

      const customerName = selectedCustomer ? getCustomerName(selectedCustomer) : "";
      const gstNo = selectedCustomer ? getCustomerGstNo(selectedCustomer) : "";
      const panNo = selectedCustomer
        ? getCustomerPanCard(selectedCustomer)
        : getPanFromGstin(gstNo);

      setForm((prev) => ({
        ...prev,
        customerId: value,
        customerName,
        gstNo,
        panNo,
      }));
      if (selectedCustomer && !workbookRateRows.some((row) => String(row.customerName || "").trim().toLowerCase() === String(customerName || "").trim().toLowerCase())) {
        setMessage(
          `Product rate is not available for ${customerName || "this customer"}. Please add product rate for this customer first.`
        );
      } else {
        setMessage("");
      }
      return;
    }

    if (field === "gstNo") {
      const gstNo = String(value || "").trim().toUpperCase();
      setForm((prev) => ({
        ...prev,
        gstNo,
        panNo: getPanFromGstin(gstNo),
      }));
      return;
    }

    if (field === "internalMedia" || field === "simplifiedProductName") {
      setForm((prev) => ({
        ...prev,
        internalMedia: value,
        simplifiedProductName: value,
      }));
      return;
    }

    if (field === "externalMedia") {
      setForm((prev) => ({
        ...prev,
        externalMedia: value,
        productAsPerRateCard: value,
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMessage("");
  };

  const validateForm = () => {
    if (!String(form.customerId || "").trim()) return "Please select customer name.";
    if (!selectedCustomerHasRate) {
      return `Product rate is not available for ${form.customerName || "this customer"}. Please add product rate for this customer first.`;
    }
    if (!String(form.productCode || "").trim()) return "Please enter product code.";
    if (!String(form.hsnCode || "").trim()) return "Please enter HSN code.";
    if (!String(form.ratePerSqft || "").trim())
      return "Please enter rate per PSF / PU.";
    if (!String(form.simplifiedProductName || "").trim())
      return "Please select simplified product name.";
    if (!String(form.productAsPerRateCard || form.externalMedia || "").trim())
      return "Please enter product as per rate card.";
    if (Number(form.ratePerSqft) < 0 || Number.isNaN(Number(form.ratePerSqft))) {
      return "Rate per PSF / PU must be a valid number.";
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
      id: form.id || "",
      customerId: String(form.customerId || "").trim(),
      customerName: String(form.customerName || "").trim(),
      gstNo: String(form.gstNo || "").trim().toUpperCase(),
      panNo: String(form.panNo || getPanFromGstin(form.gstNo))
        .trim()
        .toUpperCase(),
      productCode: String(form.productCode).trim(),
      hsnCode: String(form.hsnCode).trim(),
      mediaType: String(form.mediaType || "MEDIA").trim(),
      ratePerSqft: Number(form.ratePerSqft),
      internalMedia: String(form.internalMedia || form.simplifiedProductName || "").trim(),
      externalMedia: String(form.externalMedia || form.productAsPerRateCard || "").trim(),
      simplifiedProductName: String(form.simplifiedProductName || form.internalMedia || "").trim(),
      productAsPerRateCard: String(form.productAsPerRateCard || form.externalMedia || "").trim(),
    };

    try {
      setIsSaving(true);
      const isUpdate = Boolean(form.id);
      const apiUrl = isUpdate
        ? config.ProductMediaRateMaster.URL.Update
        : config.ProductMediaRateMaster.URL.Add;

      await axios.post(apiUrl, toApiPayload(cleanRow, isUpdate ? "update" : "add"), {
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      });

      await fetchProductMediaRates({ showFallbackMessage: false });
      setMessage(isUpdate ? "Product media rate updated." : "Product media rate added.");
      setForm(emptyForm);
    } catch (error) {
      console.error("Error saving product media rate", error);
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save product media rate."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseHsnSheetRow = (row) => {
    setForm((prev) => ({
      ...prev,
      productCode: prev.productCode || "",
      hsnCode: row.hsnCode || "",
      ratePerSqft: row.ratePerSqft ?? "",
      internalMedia: row.media || row.simplifiedProductName || "",
      externalMedia: row.media || row.productAsPerRateCard || "",
      productAsPerRateCard: row.productAsPerRateCard || row.media || "",
      simplifiedProductName: row.simplifiedProductName || row.media || "",
    }));
    setMessage("HSN sheet row copied to the rate form.");
  };

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <style>{`
          .rate-master-card {
            border: 1px solid #d8e0ea;
            box-shadow: 0 10px 24px rgba(22, 34, 51, 0.06);
          }
          .rate-master-table th {
            background: #eef4fb;
            border: 1px solid #d5deea;
            font-weight: 700;
            white-space: nowrap;
          }
          .rate-master-table td {
            border: 1px solid #d5deea;
            vertical-align: middle;
          }
          .rate-readonly-box {
            background: #f8f9fa;
            font-weight: 600;
          }
        `}</style>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h4 className="mb-1">Product Media Rate Master</h4>
            <p className="text-muted mb-0">
              Maintain product code, HSN code, rate per PSF / PU, simplified
              product name, product as per rate card, GST, and PAN.
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
              message.includes("must") ||
              message.includes("Could not") ||
              message.includes("Failed")
                ? "warning"
                : "success"
            }
          >
            {message}
          </Alert>
        )}

        {isLoading && <Alert variant="info">Loading product media rates...</Alert>}

        <Card className="rate-master-card mb-3">
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Customer Name</Form.Label>
                    <Select
                      classNamePrefix="rate-select"
                      className="w-100"
                      isClearable={false}
                      options={customerOptions}
                      value={getSelectedOption(customerOptions, form.customerId)}
                      formatOptionLabel={(option) => (
                        <div>
                          <div>{option.label}</div>
                          {(option.gstNo || option.panNo) && (
                            <small className="text-muted">
                              {option.gstNo ? `GST: ${option.gstNo}` : ""}
                              {option.gstNo && option.panNo ? " | " : ""}
                              {option.panNo ? `PAN: ${option.panNo}` : ""}
                            </small>
                          )}
                        </div>
                      )}
                      onChange={(option) =>
                        handleChange("customerId", option?.value || "")
                      }
                      placeholder="Search customer"
                    />
                  </Form.Group>
                  {String(form.customerId || "").trim() &&
                    !selectedCustomerHasRate && (
                      <div className="text-danger small mt-2">
                        Product rate is not available for this customer. Please add product rate for this customer first.
                      </div>
                    )}
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>GST Number</Form.Label>
                    <Form.Control
                      value={form.gstNo}
                      onChange={(e) => handleChange("gstNo", e.target.value)}
                      placeholder="Enter GST number"
                    />
                  </Form.Group>
                </Col>



                <Col md={3}>
                  <Form.Group>
                    <Form.Label>PAN Number</Form.Label>
                    <Form.Control
                      value={form.panNo}
                      readOnly
                      className="rate-readonly-box"
                      placeholder="PAN auto from GST"
                    />
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Product Code</Form.Label>
                    <Form.Control
                      value={form.productCode}
                      onChange={(e) => handleChange("productCode", e.target.value)}
                      placeholder="Enter product code"
                    />
                  </Form.Group>
                </Col>

                {/* <Col md={3}>
                  <Form.Group>
                    <Form.Label>HSN Code</Form.Label>
                    <Form.Control
                      value={form.hsnCode}
                      onChange={(e) => handleChange("hsnCode", e.target.value)}
                      placeholder="Enter HSN code"
                    />
                  </Form.Group>
                </Col> */}

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Rate per PSF / PU</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.ratePerSqft}
                      onChange={(e) =>
                        handleChange("ratePerSqft", e.target.value)
                      }
                      placeholder="Enter rate"
                    />
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Simplified Product Name</Form.Label>
                    <Form.Control
                      value={form.simplifiedProductName}
                      onChange={(e) =>
                        handleChange("simplifiedProductName", e.target.value)
                      }
                      placeholder="Enter simplified product name"
                    />
                  </Form.Group>
                </Col>
               {/* <Col md={3}>
  <Form.Group>
    <Form.Label>Media Type</Form.Label>
    <Form.Select
      value={form.mediaType}
      onChange={(e) => handleChange("mediaType", e.target.value)}
    >
      {mediaTypeOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Form.Select>
  </Form.Group>
</Col> */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Product as per Rate card</Form.Label>
                    <Form.Control
                      value={form.externalMedia}
                      onChange={(e) =>
                        handleChange("externalMedia", e.target.value)
                      }
                      placeholder="Enter product name as per rate card"
                    />
                  </Form.Group>
                </Col>

                <Col md={3} className="d-flex align-items-end gap-2">
                  <Button type="submit" variant="primary" disabled={isSaving}>
                    {isSaving ? "Saving..." : form.id ? "Update Rate" : "Add Rate"}
                  </Button>
                  <Button type="button" variant="outline-secondary" onClick={resetForm}>
                    Cancel
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>

        <Card className="rate-master-card mt-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h5 className="mb-0">Product Rate Sheet</h5>
                <div className="text-muted small">
                  {filteredHsnSheetRows.length} shown from {workbookRateRows.length} product row(s)
                </div>
              </div>
              <Form.Control
                style={{ maxWidth: 320 }}
                value={hsnSearchText}
                onChange={(e) => setHsnSearchText(e.target.value)}
                placeholder="Search customer/product/rate"
              />
            </div>

            <Table responsive className="rate-master-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Sr No</th>
                  <th>Customer Name</th>
                  <th>Product as per Rate card</th>
                  <th>Simplified Product Name</th>
                  <th>Rate per PSF / PU</th>
                  <th style={{ width: 110 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHsnSheetRows.length ? (
                  filteredHsnSheetRows.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>{row.customerName || "-"}</td>
                      <td>{row.productAsPerRateCard || "-"}</td>
                      <td>{row.simplifiedProductName || "-"}</td>
                      <td>{row.ratePerSqft ?? "-"}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleUseHsnSheetRow(row)}
                        >
                          Use
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-muted">
                      No product rate rows found.
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

export default ProductMediaRateMaster;
