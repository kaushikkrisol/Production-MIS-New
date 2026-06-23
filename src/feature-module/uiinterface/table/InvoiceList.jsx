import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Spinner, Table } from "react-bootstrap";
import axios from "axios";
import { Edit3, FileText, Plus, Printer, RefreshCw, Search } from "react-feather";
import { Link, useNavigate } from "react-router-dom";
import config from "../../../config";
import { all_routes } from "../../../Router/all_routes";

const GST_RATE = 18;

const toText = (value) => (value === undefined || value === null ? "" : String(value));

const toNumber = (value) => {
  const normalized = typeof value === "string" ? value.replace(/,/g, "").replace(/[^\d.-]/g, "") : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value) =>
  `Rs. ${toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";
  const dateValue = value?.$date || value;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return toText(value);
  return date.toLocaleDateString("en-IN");
};

const getResponseRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const parseMaybeJson = (value, fallback) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  if (!value || typeof value !== "string") return fallback;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed?.$values)) return parsed.$values;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const getInvoiceNo = (invoice) =>
  toText(invoice?.InvoiceNo || invoice?.invoiceNo || invoice?.CustomerInvoiceNo || invoice?.customerInvoiceNo);

const getFirstArray = (...values) => {
  for (const value of values) {
    const parsed = parseMaybeJson(value, []);
    if (parsed.length) return parsed;
  }
  return [];
};

const calculateItemTaxableAmount = (item) => {
  const savedAmount = toNumber(
    item?.InvoiceAmount ||
      item?.invoiceAmount ||
      item?.InvoiceTaxableValue ||
      item?.invoiceTaxableValue ||
      item?.Amount ||
      item?.amount ||
      item?.TaxableValue ||
      item?.taxableValue ||
      item?.TaxableAmount ||
      item?.taxableAmount
  );

  if (savedAmount) return savedAmount;

  const qty = toNumber(item?.InvoiceQty || item?.invoiceQty || item?.Qty || item?.qty || item?.Quantity || item?.quantity) || 1;
  const width = toNumber(item?.InvoiceWidth || item?.invoiceWidth || item?.Width || item?.width);
  const height = toNumber(item?.InvoiceHeight || item?.invoiceHeight || item?.Height || item?.height || item?.Length || item?.length);
  const rate = toNumber(item?.InvoiceRate || item?.invoiceRate || item?.Rate || item?.rate);
  const totalSqFt = toNumber(item?.InvoiceTotalSqFt || item?.invoiceTotalSqFt || item?.TotalSqFt || item?.totalSqFt || item?.sqFt || item?.SqFt);
  const lineType = toText(item?.Type || item?.type || item?.lineType).toLowerCase();
  const sqft = totalSqFt || (width && height ? (width * height * qty) / 144 : 0);

  if ((lineType === "transportation" || lineType === "implementation") && !sqft) return qty * rate;
  return sqft * rate;
};

const calculateItemsGrandTotal = (items) => {
  if (!items.length) return 0;

  const lineTotal = items.reduce(
    (sum, item) => sum + toNumber(item?.LineTotal || item?.lineTotal || item?.TotalAmount || item?.totalAmount),
    0
  );

  if (lineTotal) return lineTotal;

  const taxableTotal = items.reduce((sum, item) => sum + calculateItemTaxableAmount(item), 0);
  return taxableTotal ? taxableTotal + (taxableTotal * GST_RATE) / 100 : 0;
};

const calculateInvoiceTotalParts = (items, gstRate = GST_RATE) => {
  const subTotal = items.reduce((sum, item) => sum + calculateItemTaxableAmount(item), 0);
  const gstTotal = subTotal ? (subTotal * gstRate) / 100 : 0;

  return {
    SubTotal: subTotal,
    GstRate: gstRate,
    GstTotal: gstTotal,
    GrandTotal: subTotal + gstTotal,
  };
};

const getInvoiceGrandTotal = (invoice, items) => {
  const directGrandTotal = toNumber(
    invoice?.GrandTotal ||
      invoice?.grandTotal ||
      invoice?.InvoiceGrandTotal ||
      invoice?.invoiceGrandTotal ||
      invoice?.TotalAfterTax ||
      invoice?.totalAfterTax
  );
  if (directGrandTotal) return directGrandTotal;

  const subTotal = toNumber(invoice?.SubTotal || invoice?.subTotal || invoice?.TaxableAmount || invoice?.taxableAmount);
  const gstTotal = toNumber(invoice?.GstTotal || invoice?.gstTotal || invoice?.GSTTotal || invoice?.gstAmount || invoice?.GstAmount);
  if (subTotal || gstTotal) return subTotal + gstTotal;

  return calculateItemsGrandTotal(items);
};

const getInvoicePayload = (data, fallback) => {
  const rows = getResponseRows(data);
  if (rows.length) {
    const first = rows[0];
    return (
      first?.CustomerInvoice ||
      first?.customerInvoice ||
      first?.invoice ||
      first?.Invoice ||
      first?.salesInvoice ||
      first?.SalesInvoice ||
      first
    );
  }

  return (
    data?.CustomerInvoice ||
    data?.customerInvoice ||
    data?.invoice ||
    data?.Invoice ||
    data?.salesInvoice ||
    data?.SalesInvoice ||
    data?.data?.CustomerInvoice ||
    data?.data?.customerInvoice ||
    data?.data?.invoice ||
    data?.data?.Invoice ||
    data ||
    fallback
  );
};

const hasInvoiceLineItems = (invoice) => {
  const normalized = normalizeInvoice(invoice || {}, 0);
  return normalized._items.length > 0;
};

const mergeFetchedInvoice = (fetchedInvoice, fallbackInvoice) => {
  const fetched = normalizeInvoice(fetchedInvoice || {}, 0);
  if (fetched._items.length) return fetched;

  const fallback = normalizeInvoice(fallbackInvoice || {}, 0);
  return {
    ...fetched,
    _items: fallback._items,
    _billTo: fetched._billTo.length ? fetched._billTo : fallback._billTo,
    _shipTo: fetched._shipTo.length ? fetched._shipTo : fallback._shipTo,
    _jobCards: fetched._jobCards || fallback._jobCards,
    _client: fetched._client || fallback._client,
    _project: fetched._project || fallback._project,
    _grandTotal: fetched._grandTotal || fallback._grandTotal,
    _productionLocation: fetched._productionLocation || fallback._productionLocation,
    _billingLocation: fetched._billingLocation || fallback._billingLocation,
  };
};

const locationCompanyMap = {
  west: "Commercial Reprographers (Mumbai)",
  north: "Commercial Reprographers (Delhi)",
  east: "Commercial Reprographers (Kolkata)",
  south: "Commercial Reprographers (Bangalore)",
};

const getInvoiceCompanies = (productionLocation, billingLocation) => {
  const locationText = [productionLocation, billingLocation]
    .filter(Boolean)
    .join(", ")
    .toLowerCase();

  const companies = Object.entries(locationCompanyMap)
    .filter(([location]) => locationText.includes(location))
    .map(([, company]) => company);

  return [...new Set(companies)].join(", ") || "-";
};

const normalizeInvoiceTypeText = (value) =>
  toText(value)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

const getInvoiceTypeLabel = (value) => normalizeInvoiceTypeText(value);

const hasCreditNoteSignal = (...values) =>
  values.some((value) => normalizeInvoiceTypeText(value).toLowerCase().includes("credit note"));

const isCreditNoteInvoice = (invoice) =>
  hasCreditNoteSignal(
    invoice?._invoiceType,
    invoice?.InvoiceType,
    invoice?.invoiceType,
    invoice?._status,
    invoice?.Status,
    invoice?.status,
    invoice?.InvoiceStatus,
    invoice?.invoiceStatus,
    invoice?.Notes,
    invoice?.notes
  ) || Boolean(toText(invoice?.ParentInvoiceNo || invoice?.parentInvoiceNo).trim());

const normalizeInvoice = (invoice, index) => {
  const items = getFirstArray(
    invoice?.Items,
    invoice?.items,
    invoice?.InvoiceItems,
    invoice?.invoiceItems,
    invoice?.SalesInvoiceItems,
    invoice?.salesInvoiceItems,
    invoice?.ItemDetails,
    invoice?.itemDetails
  );
  const billTo = getFirstArray(invoice?.BillTo, invoice?.billTo, invoice?.BillToList, invoice?.billToList);
  const shipTo = getFirstArray(invoice?.ShipTo, invoice?.shipTo, invoice?.ShipToList, invoice?.shipToList);
  const productionLocation = toText(invoice?.ProductionLocation || invoice?.productionLocation || "");
  const billingLocation = toText(invoice?.BillingLocation || invoice?.billingLocation || "");
  const calculatedGrandTotal = getInvoiceGrandTotal(invoice, items);

  return {
    ...invoice,
    _rowId: toText(invoice?.Id || invoice?.id || getInvoiceNo(invoice) || `invoice-${index}`),
    _invoiceNo: getInvoiceNo(invoice),
    _invoiceType: toText(invoice?.InvoiceType || invoice?.invoiceType || ""),
    _invoiceDate: invoice?.InvoiceDate || invoice?.invoiceDate || "",
    _jobCards: toText(invoice?.JobCards || invoice?.jobCards || ""),
    _client: toText(invoice?.ClientBillAs || invoice?.clientBillAs || invoice?.Client || invoice?.client || ""),
    _project: toText(invoice?.ProjectName || invoice?.projectName || ""),
    _productionLocation: productionLocation,
    _billingLocation: billingLocation,
    _company: getInvoiceCompanies(productionLocation, billingLocation),
    _status: toText(
      invoice?.Status ||
        invoice?.status ||
        invoice?.InvoiceStatus ||
        invoice?.invoiceStatus ||
        (invoice?.IsFinal || invoice?.isFinal ? "Final" : "") ||
        "Draft"
    ),
    _grandTotal: calculatedGrandTotal,
    _items: items,
    _billTo: billTo,
    _shipTo: shipTo,
  };
};

const getSearchText = (invoice) =>
  [
    invoice._invoiceNo,
    invoice._invoiceType,
    invoice._jobCards,
    invoice._client,
    invoice._project,
    invoice._company,
    invoice._productionLocation,
    invoice._billingLocation,
    invoice._status,
  ]
    .join(" ")
    .toLowerCase();

const getStoredInvoiceStatusByNo = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem("invoiceStatusByNo") || "{}");
    const statusByInvoiceNo = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const normalized = {};

    Object.entries(statusByInvoiceNo).forEach(([invoiceNo, status]) => {
      const normalizedInvoiceNo = String(invoiceNo || "").trim().toLowerCase();
      const normalizedStatus = toText(status);
      if (normalizedInvoiceNo && normalizedStatus) normalized[normalizedInvoiceNo] = normalizedStatus;
    });

    const finalParsed = JSON.parse(localStorage.getItem("finalInvoiceNos") || "[]");
    if (Array.isArray(finalParsed)) {
      finalParsed.forEach((invoiceNo) => {
        const normalizedInvoiceNo = String(invoiceNo || "").trim().toLowerCase();
        if (normalizedInvoiceNo && !normalized[normalizedInvoiceNo]) normalized[normalizedInvoiceNo] = "Final";
      });
    }

    return normalized;
  } catch {
    return {};
  }
};

const mapDraftAddress = (address, index, fallbackPrefix) => ({
  id: `${fallbackPrefix.toLowerCase().replace(/\s+/g, "-")}-${index + 1}-${Date.now()}`,
  label: toText(address?.Label || address?.label || address?.Title || address?.title || `${fallbackPrefix} ${index + 1}`),
  name: toText(address?.CustomerName || address?.customerName || address?.Name || address?.name),
  address: toText(address?.Address || address?.address),
  gstNo: toText(address?.GstNo || address?.gstNo || address?.GSTNo || address?.gstNo),
});

const mapDraftItem = (item, index) => ({
  id: `draft-item-${index + 1}-${Date.now()}`,
  selected: false,
  groupByMedia: false,
  jobNo: toText(item?.JobNo || item?.jobNo),
  lineType: toText(item?.Type || item?.type || item?.lineType || "media").toLowerCase() || "media",
  storeName: toText(item?.StoreName || item?.storeName || item?.SalonAddress || item?.salonAddress),
  city: toText(item?.City || item?.city),
  description: toText(item?.InvoiceDescription || item?.invoiceDescription || item?.Description || item?.description || item?.NameSubCode || item?.nameSubCode),
  media: toText(item?.InvoiceMedia || item?.invoiceMedia || item?.Media || item?.media || item?.ExternalMedia || item?.externalMedia),
  hsnCode: toText(item?.InvoiceHsn || item?.invoiceHsn || item?.Hsn || item?.HSN || item?.HsnCode || item?.HSNCode || item?.hsnCode || item?.hsn),
  qty: toText(item?.InvoiceQty || item?.invoiceQty || item?.Qty || item?.qty || item?.Quantity || item?.quantity),
  width: toText(item?.InvoiceWidth || item?.invoiceWidth || item?.Width || item?.width),
  height: toText(item?.InvoiceHeight || item?.invoiceHeight || item?.Height || item?.height || item?.Length || item?.length),
  rate: toText(item?.InvoiceRate || item?.invoiceRate || item?.Rate || item?.rate),
  manualAmount: toText(
    item?.InvoiceAmount ||
      item?.invoiceAmount ||
      item?.InvoiceTaxableValue ||
      item?.invoiceTaxableValue ||
      item?.Amount ||
      item?.amount ||
      item?.TaxableValue ||
      item?.taxableValue
  ),
  source: item,
});

const buildDraftDataFromInvoice = (invoice) => {
  const billTo = invoice._billTo.length ? invoice._billTo.map((address, index) => mapDraftAddress(address, index, "Bill To")) : [];
  const shipTo = invoice._shipTo.length ? invoice._shipTo.map((address, index) => mapDraftAddress(address, index, "Ship To")) : [];
  const items = invoice._items.length ? invoice._items.map(mapDraftItem) : [];
  const invoiceDate = new Date(invoice._invoiceDate);

  return {
    invoiceNo: invoice._invoiceNo || "",
    invoiceDate: Number.isNaN(invoiceDate.getTime()) ? new Date().toISOString().split("T")[0] : invoiceDate.toISOString().split("T")[0],
    jobCardNo: invoice._jobCards || "",
    selectedJobIds: invoice._jobCards ? invoice._jobCards.split(",").map((jobNo) => `loaded-draft|${jobNo.trim()}`).filter(Boolean) : [],
    billTo: billTo.length ? billTo : [mapDraftAddress({}, 0, "Bill To")],
    shipTo: shipTo.length ? shipTo : [mapDraftAddress({}, 0, "Ship To")],
    items: items.length ? items : [mapDraftItem({}, 0)],
    groupByMedia: false,
    groupByStore: false,
    groupByCity: false,
    groupByDescription: false,
    clientName: invoice._client || "",
    poNumber: toText(invoice?.PoNo || invoice?.poNo),
    poDescription: toText(invoice?.PoDescription || invoice?.poDescription),
    projectName: invoice._project || "",
    notes: toText(invoice?.Notes || invoice?.notes),
    status: "Draft",
    savedAt: new Date().toISOString(),
  };
};

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await axios.post(config.SalesInvoice.URL.GetAll, {}, {
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      });
      const rows = getResponseRows(response.data).map(normalizeInvoice);
      setInvoices(rows);

      if (!rows.length) {
        setMessage("No saved invoices found.");
      }
    } catch (error) {
      console.error("Failed to load invoices", error);
      setMessage(error?.response?.data?.message || error?.message || "Could not load invoices.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const visibleInvoices = useMemo(() => {
    const statusByInvoiceNo = getStoredInvoiceStatusByNo();
    const rows = invoices.map((invoice) => {
      const storedStatus = statusByInvoiceNo[String(invoice._invoiceNo || "").trim().toLowerCase()];
      return storedStatus ? { ...invoice, _status: storedStatus } : invoice;
    });

    const query = searchText.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((invoice) => getSearchText(invoice).includes(query));
  }, [invoices, searchText]);

  const printInvoice = async (invoice) => {
    let invoiceData = invoice;

    if (invoice._invoiceNo && config.SalesInvoice.URL.GetByInvoiceNo) {
      try {
        const response = await axios.get(config.SalesInvoice.URL.GetByInvoiceNo(invoice._invoiceNo), {
          timeout: 10000,
        });
        invoiceData = mergeFetchedInvoice(getInvoicePayload(response.data, invoice), invoice);
      } catch (error) {
        console.warn("Could not load invoice by number, using list data", error);
      }
    }

    localStorage.setItem("invoicePrintPreviewData", JSON.stringify(invoiceData));
    window.open(all_routes.invoiceprintpreview, "_blank");
  };

  const loadDraft = async (invoice) => {
    let invoiceData = invoice;

    if (invoice._invoiceNo && config.SalesInvoice.URL.GetByInvoiceNo) {
      try {
        const response = await axios.get(config.SalesInvoice.URL.GetByInvoiceNo(invoice._invoiceNo), {
          timeout: 10000,
        });
        invoiceData = mergeFetchedInvoice(getInvoicePayload(response.data, invoice), invoice);
      } catch (error) {
        console.warn("Could not load invoice by number, using list data", error);
      }
    }

    if (!hasInvoiceLineItems(invoiceData) && hasInvoiceLineItems(invoice)) {
      invoiceData = invoice;
    }

    localStorage.setItem("invoiceDraftData", JSON.stringify(buildDraftDataFromInvoice(invoiceData)));
    navigate(all_routes.invoicepreviewbuilder);
  };

  const startNewInvoice = () => {
    localStorage.removeItem("invoiceDraftData");
    localStorage.removeItem("invoicePreviewBuilderData");
  };



 const createCreditNote = async (invoice) => {
  try {
    let invoiceData = invoice;

    if (invoice._invoiceNo) {
      const response = await axios.get(
        config.SalesInvoice.URL.GetByInvoiceNo(invoice._invoiceNo)
      );

      invoiceData = mergeFetchedInvoice(
        getInvoicePayload(response.data, invoice),
        invoice
      );
    }

    const totals = calculateInvoiceTotalParts(invoiceData._items || []);

    const payload = {
      InvoiceNo: "",
      ParentInvoiceNo: invoiceData._invoiceNo || invoiceData.InvoiceNo || "",
      InvoiceType: "Credit Note",
      Status: "Credit Note",
      InvoiceDate: new Date().toISOString(),
      JobCards: invoiceData._jobCards || "",
      ClientBillAs: invoiceData._client || "",
      ProjectName: invoiceData._project || "",
      ProductionLocation: invoiceData._productionLocation || "",
      BillingLocation: invoiceData._billingLocation || "",
      Notes: `Credit note against invoice ${invoiceData._invoiceNo || ""}`,
      Items: invoiceData._items || [],
      BillTo: invoiceData._billTo || [],
      ShipTo: invoiceData._shipTo || [],
      ...totals,
      Entereddat: new Date().toISOString(),
      Lstupdatedt: new Date().toISOString(),
      Del_index: "1",
    };

    console.log("CREDIT NOTE PAYLOAD", payload);

    await axios.post(config.SalesInvoice.URL.CreateCreditNote, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    alert("Credit Note created successfully");

    await loadInvoices();
  } catch (error) {
    console.error(error);

    alert(
      error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Failed to create Credit Note"
    );
  }
};

  return (
    <div className="page-wrapper">
      <div className="content container-fluid invoice-list-screen">
        <style>{`
          .invoice-list-screen {
            background: #f6f8fb;
            min-height: 100vh;
            padding: 16px 20px 32px;
          }
          .invoice-list-topbar,
          .invoice-list-card {
            background: #fff;
            border: 1px solid #dce4ef;
            border-radius: 8px;
            box-shadow: 0 10px 24px rgba(22, 34, 51, 0.05);
          }
          .invoice-list-topbar {
            display: grid;
            grid-template-columns: minmax(260px, 1fr) auto;
            gap: 14px;
            align-items: center;
            padding: 18px;
            margin-bottom: 16px;
          }
          .invoice-list-title {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }
          .invoice-list-icon {
            width: 38px;
            height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            background: #2f56d9;
            color: #fff;
          }
          .invoice-list-title h1 {
            margin: 0;
            color: #182235;
            font-size: 18px;
            font-weight: 800;
          }
          .invoice-list-title div div {
            color: #667085;
            font-size: 12px;
          }
          .invoice-list-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            flex-wrap: wrap;
          }
          .invoice-list-search {
            position: relative;
            min-width: 310px;
          }
          .invoice-list-search svg {
            position: absolute;
            top: 10px;
            left: 10px;
            color: #667085;
          }
          .invoice-list-search .form-control {
            height: 38px;
            padding-left: 34px;
          }
          .invoice-list-card {
            padding: 14px;
          }
          .invoice-list-table {
            min-width: 1120px;
            margin-bottom: 0;
          }
          .invoice-list-table th {
            background: #eef4fb;
            border: 1px solid #d5deea;
            color: #475467;
            font-size: 12px;
            padding: 9px 10px;
            white-space: nowrap;
          }
          .invoice-list-table td {
            border: 1px solid #d5deea;
            padding: 8px 10px;
            vertical-align: middle;
          }
          .invoice-list-muted {
            color: #667085;
            font-size: 12px;
          }
          .invoice-status-badge {
            display: inline-flex;
            min-width: 70px;
            justify-content: center;
            border-radius: 999px;
            padding: 3px 9px;
            background: #eef4fb;
            color: #344054;
            font-size: 12px;
            font-weight: 700;
          }
          @media (max-width: 767px) {
            .invoice-list-screen {
              padding: 12px;
            }
            .invoice-list-topbar {
              grid-template-columns: 1fr;
              align-items: start;
            }
            .invoice-list-actions,
            .invoice-list-search,
            .invoice-list-actions .btn {
              width: 100%;
            }
          }
        `}</style>

        <header className="invoice-list-topbar">
          <div className="invoice-list-title">
            <div className="invoice-list-icon">
              <FileText size={18} />
            </div>
            <div>
              <h1>All Invoices</h1>
              <div>{isLoading ? "Loading invoices..." : `${visibleInvoices.length} shown from ${invoices.length} saved invoice(s)`}</div>
            </div>
          </div>

          <div className="invoice-list-actions">
            <div className="invoice-list-search">
              <Search size={15} />
              <Form.Control
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search invoice, client, job, location"
              />
            </div>
            <Button variant="outline-secondary" onClick={loadInvoices} disabled={isLoading}>
              <RefreshCw size={15} /> Refresh
            </Button>
            <Button as={Link} to={all_routes.invoicepreviewbuilder} variant="primary" onClick={startNewInvoice}>
              <Plus size={15} /> New Invoice
            </Button>
          </div>
        </header>

        {message && (
          <Alert variant={message.includes("Could not") ? "warning" : "info"} onClose={() => setMessage("")} dismissible>
            {message}
          </Alert>
        )}

        <section className="invoice-list-card">
          {isLoading ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" />
              Loading saved invoices...
            </div>
          ) : (
            <Table responsive className="invoice-list-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Company</th>
                  <th>Client</th>
                  <th>Job Cards</th>
                  <th>Production Location</th>
                  <th>Billing Location</th>
                  <th>Items</th>
                  <th className="text-end">Grand Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleInvoices.length ? (
                  visibleInvoices.map((invoice) => {
                    const canLoadDraft = invoice._status.toLowerCase() === "draft";

                    return (
                      <tr key={invoice._rowId}>
                        <td className="fw-semibold">{invoice._invoiceNo || "-"}</td>
                        <td>{formatDate(invoice._invoiceDate)}</td>
                        <td>{invoice._company || "-"}</td>
                        <td>
                          <div>{invoice._client || "-"}</div>
                          {invoice._project ? <div className="invoice-list-muted">{invoice._project}</div> : null}
                        </td>
                        <td>{invoice._jobCards || "-"}</td>
                        <td>{invoice._productionLocation || "-"}</td>
                        <td>{invoice._billingLocation || "-"}</td>
                        <td>{invoice._items.length}</td>
                        <td className="text-end fw-semibold">{formatMoney(invoice._grandTotal)}</td>
                        <td>
                          <span className="invoice-status-badge">{invoice._status || "Draft"}</span>
                        </td>
                        <td>
                          <div className="d-flex gap-2 flex-wrap">
                            {canLoadDraft ? (
                              <Button size="sm" variant="outline-primary" onClick={() => loadDraft(invoice)}>
                                <Edit3 size={14} /> Load Draft
                              </Button>
                            ) : null}
                            <Button size="sm" variant="outline-danger" onClick={() => printInvoice(invoice)}>
                              <Printer size={14} /> View / Print
                            </Button>
                            {!isCreditNoteInvoice(invoice) && (
  <Button
    size="sm"
    variant="outline-warning"
    onClick={() => createCreditNote(invoice)}
  >
    <FileText size={14} /> Credit Note
  </Button>
)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="text-center text-muted py-4">
                      No invoices to show.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </section>
      </div>
    </div>
  );
};

export default InvoiceList;
