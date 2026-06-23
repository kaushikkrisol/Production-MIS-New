import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import axios from "axios";
import Select from "react-select";
import config from "../../../config";
import hsnRateData from "../../../core/json/hsnRateData.json";
import { mergeFallbackCustomers } from "./customerFallbacks";

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

const getPanFromGstin = (gstin) => {
  const clean = String(gstin || "").trim().toUpperCase();
  return clean.length >= 12 ? clean.substring(2, 12) : "";
};

const getSelectedOption = (options, value) =>
  options.find((option) => option.value === value) || null;

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

const seedRows = () =>
  (Array.isArray(hsnRateData) ? hsnRateData : []).map((item, index) => ({
    id: `seed-${index}`,
    customerId: "",
    customerName: "",
    gstNo: "",
    panNo: "",
    productCode: item.productCode || `PM-${String(index + 1).padStart(4, "0")}`,
    hsnCode: item.hsnCode || "",
    ratePerSqft: item.ratePerSqft ?? "",
    internalMedia: item.media || "",
    externalMedia: item.externalMedia || item.media || "",
  }));

const hsnSheetRows = (Array.isArray(hsnRateData) ? hsnRateData : []).map(
  (item, index) => ({
    id: `hsn-sheet-${index}`,
    media: item.media || "",
    hsnCode: item.hsnCode || "",
    ratePerSqft: item.ratePerSqft ?? "",
  })
);

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
    internalMedia:
      row?.internalMedia ?? row?.InternalMedia ?? row?.media ?? row?.Media ?? "",
    externalMedia:
      row?.externalMedia ?? row?.ExternalMedia ?? row?.media ?? row?.Media ?? "",
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

const ProductMediaRateMaster = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [searchText, setSearchText] = useState("");
  const [hsnSearchText, setHsnSearchText] = useState("");
  const [message, setMessage] = useState("");
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProductMediaRates = useCallback(
    async ({ showFallbackMessage = true } = {}) => {
      setIsLoading(true);
      try {
        const response = await axios.get(config.ProductMediaRateMaster.URL.GetAll, {
          timeout: 10000,
        });

        const apiRows = getRowsFromResponse(response.data).map((row, index) =>
          normalizeRateRow(row, index, customers)
        );

        setRows(apiRows.length ? apiRows : seedRows());
        return true;
      } catch (error) {
        console.error("Error fetching product media rates", error);

        const savedRows = localStorage.getItem(STORAGE_KEY);
        if (savedRows) {
          try {
            const parsed = JSON.parse(savedRows).map((row, index) =>
              normalizeRateRow(row, index, customers)
            );
            setRows(parsed);
            if (showFallbackMessage) {
              setMessage("Could not load rates from API. Showing saved local rates.");
            }
            return false;
          } catch (parseError) {
            console.error("Failed to parse product media rate rows", parseError);
          }
        }

        setRows(seedRows());
        if (showFallbackMessage) {
          setMessage("Could not load rates from API. Showing default rates.");
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [customers]
  );

  useEffect(() => {
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
      }
    };

    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchProductMediaRates();
  }, [fetchProductMediaRates]);

  useEffect(() => {
    if (rows.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    }
  }, [rows]);

  const filteredRows = useMemo(() => {
  const query = searchText.trim().toLowerCase();
  const selectedCustomerId = String(form.customerId || "").trim();
  const selectedCustomerName = String(form.customerName || "").trim().toLowerCase();

  let list = rows;

  // If customer selected, show only that customer's rates
  if (selectedCustomerId || selectedCustomerName) {
    list = list.filter((row) => {
      const rowCustomerId = String(row.customerId || "").trim();
      const rowCustomerName = String(row.customerName || "").trim().toLowerCase();

      return (
        (selectedCustomerId && rowCustomerId === selectedCustomerId) ||
        (selectedCustomerName && rowCustomerName === selectedCustomerName)
      );
    });
  }

  if (!query) return list;

  return list.filter((row) =>
    [
      row.customerName,
      row.gstNo,
      row.panNo,
      row.productCode,
      row.hsnCode,
      row.ratePerSqft,
      row.internalMedia,
      row.externalMedia,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}, [rows, searchText, form.customerId, form.customerName]);

  const filteredHsnSheetRows = useMemo(() => {
    const query = hsnSearchText.trim().toLowerCase();
    if (!query) return hsnSheetRows;

    return hsnSheetRows.filter((row) =>
      [row.media, row.hsnCode, row.ratePerSqft]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [hsnSearchText]);

  const mediaTypeOptions = [
  { value: "MEDIA", label: "Media" },
  { value: "LAMINATION", label: "Lamination" },
  { value: "MOUNTING", label: "Mounting" }
];

  const customerOptions = useMemo(
    () => [
      { value: "", label: "General Rate" },
      ...customers.map((customer) => {
        const customerId = getCustomerId(customer);
        const customerName = getCustomerName(customer);
        const gstNo = getCustomerGstNo(customer);
        const panNo = getPanFromGstin(gstNo);

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
      const panNo = getPanFromGstin(gstNo);

      setForm((prev) => ({
        ...prev,
        customerId: value,
        customerName,
        gstNo,
        panNo,
      }));
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

    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMessage("");
  };

  const validateForm = () => {
    if (!String(form.productCode || "").trim()) return "Please enter product code.";
    if (!String(form.hsnCode || "").trim()) return "Please enter HSN code.";
    if (!String(form.ratePerSqft || "").trim())
      return "Please enter rate per sqft.";
    if (!String(form.internalMedia || "").trim())
      return "Please enter internal media.";
    if (!String(form.externalMedia || "").trim())
      return "Please enter external media.";
    if (Number(form.ratePerSqft) < 0 || Number.isNaN(Number(form.ratePerSqft))) {
      return "Rate per sqft must be a valid number.";
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
      internalMedia: String(form.internalMedia).trim(),
      externalMedia: String(form.externalMedia).trim(),
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

  const handleEdit = (row) => {
    setForm({
      id: row.id,
      customerId: row.customerId || "",
      customerName: row.customerName || "",
      gstNo: row.gstNo || "",
      panNo: row.panNo || getPanFromGstin(row.gstNo || ""),
      productCode: row.productCode || "",
      hsnCode: row.hsnCode || "",
      ratePerSqft: row.ratePerSqft ?? "",
      internalMedia: row.internalMedia || "",
      externalMedia: row.externalMedia || "",
      mediaType: row.mediaType || "MEDIA",
    });
    setMessage("");
  };

  const handleUseHsnSheetRow = (row) => {
    setForm((prev) => ({
      ...prev,
      productCode: prev.productCode || "",
      hsnCode: row.hsnCode || "",
      ratePerSqft: row.ratePerSqft ?? "",
      internalMedia: row.media || "",
      externalMedia: row.media || "",
    }));
    setMessage("HSN sheet row copied to the rate form.");
  };

  const handleDelete = async (rowId) => {
    try {
      setIsSaving(true);
      const selectedRow = rows.find((row) => row.id === rowId) || { id: rowId };

      await axios.post(
        config.ProductMediaRateMaster.URL.Delete,
        toApiPayload({ ...selectedRow, id: rowId, Del_index: "0" }, "delete"),
        {
          timeout: 10000,
          headers: { "Content-Type": "application/json" },
        }
      );

      await fetchProductMediaRates({ showFallbackMessage: false });
      if (form.id === rowId) resetForm();
      setMessage("Product media rate deleted.");
    } catch (error) {
      console.error("Error deleting product media rate", error);
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete product media rate."
      );
    } finally {
      setIsSaving(false);
    }
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
              Maintain product code, HSN code, rate per sqft, internal media,
              external media, GST, and PAN.
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
                      isClearable={false}
                      options={customerOptions}
                      value={getSelectedOption(customerOptions, form.customerId)}
                      onChange={(option) =>
                        handleChange("customerId", option?.value || "")
                      }
                      placeholder="Search customer"
                    />
                  </Form.Group>
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

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>HSN Code</Form.Label>
                    <Form.Control
                      value={form.hsnCode}
                      onChange={(e) => handleChange("hsnCode", e.target.value)}
                      placeholder="Enter HSN code"
                    />
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Rate </Form.Label>
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
                    <Form.Label> Media</Form.Label>
                    <Form.Control
                      value={form.internalMedia}
                      onChange={(e) =>
                        handleChange("internalMedia", e.target.value)
                      }
                      placeholder="media"
                    />
                  </Form.Group>
                </Col>
               <Col md={3}>
  <Form.Group>
    <Form.Label>Media Type</Form.Label>
    <Select
      options={mediaTypeOptions}
      value={mediaTypeOptions.find(
        (x) => x.value === form.mediaType
      )}
      onChange={(option) =>
        handleChange("mediaType", option?.value || "MEDIA")
      }
    />
  </Form.Group>
</Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      value={form.externalMedia}
                      onChange={(e) =>
                        handleChange("externalMedia", e.target.value)
                      }
                      placeholder="External/client media name"
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

        <Card className="rate-master-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h5 className="mb-0">Product Media Rate List</h5>
              <Form.Control
                style={{ maxWidth: 320 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search customer/GST/PAN/product/media/HSN"
              />
            </div>

            <Table responsive className="rate-master-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>GST Number</th>
                  <th>PAN Number</th>
                  <th>Product Code</th>
                  <th>HSN Code</th>
                  <th>Rate / Sqft</th>
                  <th>Internal Media</th>
                  <th>External Media</th>
                  <th>Media Type</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.customerName || "General Rate"}</td>
                      <td>{row.gstNo || "-"}</td>
                      <td>{row.panNo || "-"}</td>
                      <td>{row.productCode || "-"}</td>
                      <td>{row.hsnCode || "-"}</td>
                      <td>{row.ratePerSqft ?? "-"}</td>
                      <td>{row.internalMedia || "-"}</td>
                      <td>{row.externalMedia || "-"}</td>
                      <td>{row.mediaType || row.MediaType || "-"}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleEdit(row)}
                            disabled={isSaving}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDelete(row.id)}
                            disabled={isSaving}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center text-muted">
                      No product media rates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>

        <Card className="rate-master-card mt-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h5 className="mb-0">HSN Rate Sheet</h5>
                <div className="text-muted small">
                  {filteredHsnSheetRows.length} shown from {hsnSheetRows.length} default HSN row(s)
                </div>
              </div>
              <Form.Control
                style={{ maxWidth: 320 }}
                value={hsnSearchText}
                onChange={(e) => setHsnSearchText(e.target.value)}
                placeholder="Search media/HSN/rate"
              />
            </div>

            <Table responsive className="rate-master-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Sr No</th>
                  <th>Media</th>
                  <th>HSN Code</th>
                  <th>Rate / Sqft</th>
                  <th style={{ width: 110 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHsnSheetRows.length ? (
                  filteredHsnSheetRows.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>{row.media || "-"}</td>
                      <td>{row.hsnCode || "-"}</td>
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
                      No HSN sheet rows found.
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
