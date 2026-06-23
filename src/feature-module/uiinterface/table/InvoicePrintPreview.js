import React, { useMemo } from "react";
import { Alert } from "react-bootstrap";
import QRCode from "react-qr-code";
import { COMPANY_LOGO, getCompanyBranchDetails } from "./companyBranches";

const GST_RATE_FALLBACK = 18;

const toText = (value) => (value === undefined || value === null ? "" : String(value));

const toNumber = (value) => {
  const normalized =
    typeof value === "string" ? value.replace(/,/g, "").replace(/[^\d.-]/g, "") : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value) =>
  toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "-";

  const dateValue = value?.$date || value;
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return toText(value) || "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const parseMaybeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed?.$values)) return parsed.$values;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const firstValue = (...values) => {
  for (const value of values) {
    const text = toText(value).trim();
    if (text) return text;
  }
  return "";
};

const normalizeCompanyLogo = (value) => {
  const logo = firstValue(value, COMPANY_LOGO);
  const logoPath = logo.split("?")[0].replace(/\\/g, "/").toLowerCase();

  if (logoPath.endsWith("/assets/img/comart.jpg") || logoPath === "assets/img/comart.jpg") {
    return COMPANY_LOGO;
  }

  return logo;
};

const normalizeDocumentTypeText = (value) =>
  toText(value)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

const hasCreditNoteSignal = (...values) =>
  values.some((value) => normalizeDocumentTypeText(value).toLowerCase().includes("credit note"));

const getInvoiceDocumentType = (data) => {
  const typeText = normalizeDocumentTypeText(
    firstValue(
      data?._invoiceType,
      data?.InvoiceType,
      data?.invoiceType,
      data?.DocumentType,
      data?.documentType,
      data?.Status,
      data?.status,
      data?.InvoiceStatus,
      data?.invoiceStatus
    )
  ).toLowerCase();

  if (
    typeText.includes("credit note") ||
    firstValue(data?.ParentInvoiceNo, data?.parentInvoiceNo)
  ) {
    return "Credit Note";
  }

  return "Tax Invoice";
};


const splitAddressLines = (value) =>
  toText(value)
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);

const extractGstNo = (value) => {
  const match = toText(value).match(/GST\s*(?:No\.?|IN)?\s*:?\s*([0-9A-Z]{15})/i);
  return match?.[1] || "";
};

const getCompanyPan = (companyDetails) => {
  const explicitPan = firstValue(companyDetails?.companyPan, companyDetails?.panNo, companyDetails?.PanNo);
  if (explicitPan) return explicitPan;

  const gstNo = firstValue(companyDetails?.companyGst, companyDetails?.gstNo, companyDetails?.GSTNo);
  return gstNo.length >= 12 ? gstNo.slice(2, 12) : "";
};

const firstArray = (...values) => {
  for (const value of values) {
    const parsed = parseMaybeArray(value);
    if (parsed.length) return parsed;
  }
  return [];
};

const normalizeAddress = (entry, fallbackLabel) => {
  const rawAddress = firstValue(entry?.address, entry?.Address);
  const name = firstValue(
    entry?.name,
    entry?.Name,
    entry?.CustomerName,
    entry?.customerName,
    splitAddressLines(rawAddress)[0]
  );
  const gstNo = firstValue(entry?.gstNo, entry?.GstNo, entry?.GSTNo, extractGstNo(rawAddress));
  const addressLines = splitAddressLines(rawAddress).filter((line) => {
    const normalized = line.toLowerCase();
    return line !== name && !normalized.includes("gst no") && !normalized.includes("gstin");
  });

  return {
    label: firstValue(entry?.label, entry?.Label, entry?.Title, fallbackLabel),
    name,
    address: addressLines.join(", "),
    gstNo,
    phone: firstValue(entry?.phone, entry?.Phone, entry?.Mobile, entry?.mobile),
    placeOfSupply: firstValue(entry?.placeOfSupply, entry?.PlaceOfSupply, entry?.state, entry?.State),
  };
};

const getRowAmount = (item) => {
  const savedAmount = toNumber(
    item?.manualAmount ||
      item?.ManualAmount ||
      item?.taxableValue ||
      item?.TaxableValue ||
      item?.InvoiceAmount ||
      item?.invoiceAmount ||
      item?.InvoiceTaxableValue ||
      item?.invoiceTaxableValue ||
      item?.Amount ||
      item?.amount ||
      item?.TaxableAmount ||
      item?.taxableAmount
  );
  if (savedAmount) return savedAmount;

  const qty = toNumber(item?.qty || item?.Qty || item?.InvoiceQty || item?.invoiceQty || item?.Quantity || item?.quantity) || 1;
  const width = toNumber(item?.width || item?.Width || item?.InvoiceWidth || item?.invoiceWidth);
  const height = toNumber(item?.height || item?.Height || item?.InvoiceHeight || item?.invoiceHeight || item?.Length || item?.length);
  const rate = toNumber(item?.rate || item?.Rate || item?.InvoiceRate || item?.invoiceRate);
  const totalSqFt = toNumber(item?.InvoiceTotalSqFt || item?.invoiceTotalSqFt || item?.TotalSqFt || item?.totalSqFt || item?.sqFt || item?.SqFt);
  const sqft = totalSqFt || (width && height ? (width * height * qty) / 144 : 0);

  return sqft ? sqft * rate : qty * rate;
};

const normalizeInvoiceRow = (item, index, dataGstRate, invoiceData) => {
  const taxableValue = getRowAmount(item);
  const gstRate = toNumber(item?.gstRate || item?.GstRate || item?.GSTPercent || item?.gstPercent || dataGstRate);
  const gstAmount = toNumber(item?.gstAmount || item?.GstAmount) || (taxableValue * gstRate) / 100;
  const lineTotal =
    toNumber(item?.lineTotal || item?.LineTotal || item?.TotalAmount || item?.totalAmount) ||
    taxableValue + gstAmount;

  return {
    key: item?.id || item?.Id || item?.key || index + 1,
    sno: item?.sno || item?.SNo || index + 1,
    type: firstValue(item?.type, item?.Type, item?.lineType),
    jobNo: firstValue(item?.jobNo, item?.JobNo, invoiceData?._jobCards, invoiceData?.JobCards, invoiceData?.jobCards),
    description: firstValue(
      item?.description,
      item?.Description,
      item?.InvoiceDescription,
      item?.invoiceDescription,
      item?.NameSubCode,
      item?.nameSubCode,
      item?.media,
      item?.Media,
      "Service"
    ),
    media: firstValue(item?.media, item?.Media, item?.InvoiceMedia, item?.invoiceMedia),
    hsnCode: firstValue(item?.hsnCode, item?.HsnCode, item?.HSNCode, item?.InvoiceHsn, item?.invoiceHsn, item?.Hsn, item?.hsn),
    qty: firstValue(item?.qty, item?.Qty, item?.InvoiceQty, item?.invoiceQty, item?.Quantity, item?.quantity, "1"),
    width: firstValue(item?.width, item?.Width, item?.InvoiceWidth, item?.invoiceWidth),
    height: firstValue(item?.height, item?.Height, item?.InvoiceHeight, item?.invoiceHeight, item?.Length, item?.length),
    rate: toNumber(item?.rate || item?.Rate || item?.InvoiceRate || item?.invoiceRate),
    taxableValue,
    gstRate,
    gstAmount,
    lineTotal,
  };
};

const ones = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

const twoDigitWords = (number) => {
  if (number < 20) return ones[number];
  return [tens[Math.floor(number / 10)], ones[number % 10]].filter(Boolean).join(" ");
};

const threeDigitWords = (number) => {
  const hundred = Math.floor(number / 100);
  const rest = number % 100;
  return [hundred ? `${ones[hundred]} hundred` : "", rest ? twoDigitWords(rest) : ""]
    .filter(Boolean)
    .join(" and ");
};

const amountInWords = (amount) => {
  let number = Math.round(toNumber(amount));
  if (!number) return "ZERO RUPEES ONLY";

  const parts = [];
  const crore = Math.floor(number / 10000000);
  number %= 10000000;
  const lakh = Math.floor(number / 100000);
  number %= 100000;
  const thousand = Math.floor(number / 1000);
  number %= 1000;

  if (crore) parts.push(`${threeDigitWords(crore)} crore`);
  if (lakh) parts.push(`${threeDigitWords(lakh)} lakh`);
  if (thousand) parts.push(`${threeDigitWords(thousand)} thousand`);
  if (number) parts.push(threeDigitWords(number));

  return `${parts.join(" ")} rupees only`.toUpperCase();
};

const normalizeInvoiceData = (data) => {
  const gstRate = toNumber(data?.gstRate || data?.GstRate || data?.GST_RATE || GST_RATE_FALLBACK);
  const backendItems = firstArray(
    data?._items,
    data?.Items,
    data?.items,
    data?.InvoiceItems,
    data?.invoiceItems,
    data?.SalesInvoiceItems,
    data?.salesInvoiceItems
  );
  const localRows = firstArray(data?.invoiceRows, data?.InvoiceRows);
  const rawRows = backendItems.length ? backendItems : localRows;
  const invoiceRows = rawRows.map((item, index) => normalizeInvoiceRow(item, index, gstRate, data));
  const calculatedSubtotal = invoiceRows.reduce((sum, row) => sum + toNumber(row.taxableValue), 0);
  const calculatedGstTotal = invoiceRows.reduce((sum, row) => sum + toNumber(row.gstAmount), 0);
  const calculatedGrandTotal = invoiceRows.reduce((sum, row) => sum + toNumber(row.lineTotal), 0);
  const region = firstValue(
    data?._region,
    data?.Region,
    data?.region,
    data?._billingLocation,
    data?.BillingLocation,
    data?.billingLocation,
    data?._productionLocation,
    data?.ProductionLocation,
    data?.productionLocation
  );
  const branchDetails = getCompanyBranchDetails(region);
  const companyLogo = normalizeCompanyLogo(
    firstValue(
      data?.companyDetails?.companyLogo,
      data?.CompanyLogo,
      data?.companyLogo,
      branchDetails.companyLogo,
      COMPANY_LOGO
    )
  );
  const companyDetails = {
    companyName: firstValue(
      data?.companyDetails?.companyName,
      data?.CompanyName,
      data?.companyName,
      branchDetails.companyName,
      "Commercial Reprographers"
    ),
    companyAddress: firstValue(
      data?.companyDetails?.companyAddress,
      data?.CompanyAddress,
      data?.companyAddress,
      branchDetails.companyAddress
    ),
    companyPhone: firstValue(data?.companyDetails?.companyPhone, data?.CompanyPhone, data?.companyPhone, branchDetails.companyPhone),
    companyGst: firstValue(data?.companyDetails?.companyGst, data?.CompanyGst, data?.companyGst, branchDetails.companyGst),
    companyLogo,
    companyPan: firstValue(data?.companyDetails?.companyPan, data?.CompanyPan, data?.companyPan),
  };

  const billToList = firstArray(data?._billTo, data?.BillTo, data?.billTo, data?.billToList).map((entry) =>
    normalizeAddress(entry, "Customer Detail")
  );
  const shipToList = firstArray(data?._shipTo, data?.ShipTo, data?.shipTo, data?.shipToList).map((entry) =>
    normalizeAddress(entry, "Ship To")
  );
  const bankDetails = data?.bankDetails || data?.BankDetails || {};
  const invoiceSubtotal = toNumber(data?.SubTotal || data?.subTotal || data?.invoiceSubtotal) || calculatedSubtotal;
  const invoiceGstTotal = toNumber(data?.GstTotal || data?.gstTotal || data?.invoiceGstTotal) || calculatedGstTotal;
  const invoiceGrandTotal =
    toNumber(data?._grandTotal || data?.GrandTotal || data?.grandTotal || data?.invoiceGrandTotal) ||
    calculatedGrandTotal ||
    invoiceSubtotal + invoiceGstTotal;
  const invoiceType = getInvoiceDocumentType(data);
  const isCreditNote = invoiceType.toLowerCase() === "credit note";

  return {
    companyDetails,
    companyPan: getCompanyPan(companyDetails),
    billAsName: firstValue(data?._client, data?.ClientBillAs, data?.clientBillAs, data?.billAsName, data?.clientName, billToList[0]?.name, "Sales Invoice"),
    invoiceType,
    isCreditNote,
    invoiceNo: firstValue(data?._invoiceNo, data?.InvoiceNo, data?.invoiceNo),
    parentInvoiceNo: firstValue(data?.ParentInvoiceNo, data?.parentInvoiceNo),
    invoiceDate: formatDate(data?._invoiceDate || data?.InvoiceDate || data?.invoiceDate),
    poNumber: firstValue(data?.PoNo, data?.poNo, data?.poNumber),
    projectName: firstValue(data?._project, data?.ProjectName, data?.projectName),
    region,
    selectedJobNo: firstValue(data?._jobCards, data?.JobCards, data?.jobCards, data?.selectedJobNo, data?.jobCardNo),
    challanNo: firstValue(data?.ChallanNo, data?.challanNo, data?.DeliveryChallanNo, data?.deliveryChallanNo),
    challanDate: formatDate(data?.ChallanDate || data?.challanDate),
    eWayBillNo: firstValue(data?.EWayBillNo, data?.ewayBillNo),
    transport: firstValue(data?.Transport, data?.transport, data?.TransportName, data?.transportName),
    transportId: firstValue(data?.TransportId, data?.transportId),
    gstRate,
    invoiceRows,
    invoiceSubtotal,
    invoiceGstTotal,
    invoiceGrandTotal,
    billToList,
    shipToList,
    notes: firstValue(data?.Notes, data?.notes),
    bankDetails: {
      bankName: firstValue(bankDetails?.bankName, bankDetails?.BankName, data?.BankName, data?.bankName),
      branch: firstValue(bankDetails?.branch, bankDetails?.Branch, data?.BankBranch, data?.bankBranch),
      accountNo: firstValue(bankDetails?.accountNo, bankDetails?.AccountNo, data?.AccountNo, data?.accountNo),
      ifsc: firstValue(bankDetails?.ifsc, bankDetails?.IFSC, data?.IFSC, data?.ifsc),
      upiId: firstValue(bankDetails?.upiId, bankDetails?.UPIId, data?.UPIId, data?.upiId),
    },
  };
};

const DataRow = ({ label, value }) => (
  <tr>
    <th>{label}</th>
    <td>{value || "-"}</td>
  </tr>
);

const InvoicePrintPreview = () => {
  const previewData = useMemo(() => {
    const readPreview = (storageKey) => {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;

      try {
        return normalizeInvoiceData(JSON.parse(raw));
      } catch (error) {
        console.error(`Failed to parse ${storageKey}`, error);
        return null;
      }
    };

    const primaryPreview = readPreview("invoicePrintPreviewData");
    if (primaryPreview?.invoiceRows?.length) return primaryPreview;

    const draftPreview = readPreview("invoiceDraftData");
    if (draftPreview?.invoiceRows?.length) return draftPreview;

    if (primaryPreview) return primaryPreview;
    return draftPreview;
  }, []);

  if (!previewData) {
    return (
      <div className="page-wrapper">
        <div className="content container-fluid">
          <Alert variant="warning">No bill preview data found.</Alert>
        </div>
      </div>
    );
  }

  const {
    companyDetails,
    companyPan,
    billAsName,
    invoiceType,
    isCreditNote,
    invoiceNo,
    parentInvoiceNo,
    invoiceDate,
    poNumber,
    projectName,
    region,
    selectedJobNo,
    challanNo,
    challanDate,
    eWayBillNo,
    transport,
    transportId,
    invoiceRows = [],
    invoiceSubtotal,
    invoiceGstTotal,
    invoiceGrandTotal,
    billToList = [],
    shipToList = [],
    notes,
    bankDetails,
  } = previewData;
  const customer = billToList[0] || {};
  const shipTo = shipToList[0] || {};
  const documentTitle = invoiceType || (isCreditNote ? "Credit Note" : "Tax Invoice");
  const documentNoun = isCreditNote ? "Credit Note" : "Invoice";
  const documentServiceLine = isCreditNote
    ? "Credit note for production and supply services"
    : "Tax invoice for production and supply services";
  const qrValue =
    bankDetails.upiId ||
    `${documentNoun} No: ${invoiceNo || "-"} | Amount: ${formatAmount(invoiceGrandTotal)} | ${companyDetails.companyName}`;

  return (
    <div className="page-wrapper">
      <div className="content container-fluid classic-invoice-page">
        <style>{`
          .classic-invoice-page {
            background: #eef1f5;
            min-height: 100vh;
            padding: 20px 12px 36px;
            color: #000;
          }
          .classic-invoice-toolbar {
            max-width: 210mm;
            margin: 0 auto 12px;
            text-align: right;
          }
          .classic-invoice-toolbar button {
            border: 0;
            background: #0f766e;
            color: #fff;
            font-weight: 700;
            padding: 8px 16px;
            border-radius: 4px;
          }
          .classic-invoice-canvas {
            overflow-x: auto;
          }
          .classic-invoice-sheet {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #fff;
            border: 1px solid #333;
            box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            line-height: 1.25;
          }
          .classic-invoice-sheet table {
            width: 100%;
            border-collapse: collapse;
          }
          .classic-invoice-sheet th,
          .classic-invoice-sheet td {
            border: 1px solid #555;
            padding: 4px 5px;
            vertical-align: top;
          }
          .classic-company-header {
            display: grid;
            grid-template-columns: 1fr 168px;
            gap: 10px;
            align-items: center;
            padding: 12px 16px 8px;
          }
          .classic-company-name {
            margin: 0 0 3px;
            color: #20265d;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 26px;
            line-height: 1;
            font-weight: 900;
            letter-spacing: 0;
            text-transform: uppercase;
          }
          .classic-company-strip {
            display: inline-block;
            min-width: 385px;
            margin-bottom: 5px;
            background: #009a9a;
            color: #fff;
            font-weight: 800;
            padding: 4px 12px;
          }
          .classic-company-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .classic-company-logo {
            width: 156px;
            max-width: 156px;
            max-height: 52px;
            object-fit: contain;
            justify-self: end;
          }
          .classic-title-strip {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            align-items: center;
            border-top: 1px solid #555;
            border-bottom: 1px solid #555;
          }
          .classic-title-strip > div {
            padding: 5px 8px;
          }
          .classic-title-main {
            border-left: 1px solid #555;
            border-right: 1px solid #555;
            text-align: center;
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
          }
          .classic-recipient-copy {
            text-align: right;
            font-size: 8px;
            font-weight: 800;
          }
          .classic-details-grid {
            display: grid;
            grid-template-columns: 38% 32% 30%;
            border-bottom: 1px solid #555;
          }
          .classic-details-grid table th,
          .classic-details-grid table td {
            border-width: 0 0 1px 0;
          }
          .classic-details-grid table tr:last-child th,
          .classic-details-grid table tr:last-child td {
            border-bottom: 0;
          }
          .classic-details-grid table + table,
          .classic-detail-panel + .classic-detail-panel {
            border-left: 1px solid #555;
          }
          .classic-detail-panel-title {
            text-align: center;
            font-weight: 800;
            border-bottom: 1px solid #555;
            background: #f5f5f5;
            padding: 3px;
          }
          .classic-detail-panel th {
            width: 82px;
            font-size: 8px;
            font-weight: 800;
          }
          .classic-detail-panel td {
            word-break: break-word;
          }
          .classic-items th {
            text-align: center;
            font-size: 8px;
            font-weight: 900;
            background: #f7f7f7;
          }
          .classic-items td {
            height: 22px;
          }
          .classic-items .classic-description {
            min-width: 185px;
          }
          .classic-items .classic-number {
            text-align: right;
            white-space: nowrap;
          }
          .classic-items .classic-center {
            text-align: center;
          }
          .classic-total-row td {
            height: auto;
            font-weight: 800;
            background: #fbfbfb;
          }
          .classic-bottom-grid {
            display: grid;
            grid-template-columns: 62% 38%;
          }
          .classic-bottom-grid > div {
            min-height: 145px;
          }
          .classic-bottom-grid > div + div {
            border-left: 1px solid #555;
          }
          .classic-section-title {
            text-align: center;
            font-weight: 900;
            background: #f5f5f5;
            border-bottom: 1px solid #555;
            padding: 3px 5px;
          }
          .classic-amount-words {
            display: grid;
            grid-template-columns: 118px 1fr;
            border-bottom: 1px solid #555;
          }
          .classic-amount-words div {
            padding: 5px;
          }
          .classic-amount-words div:first-child {
            border-right: 1px solid #555;
            font-weight: 900;
            text-align: center;
          }
          .classic-bank-grid {
            display: grid;
            grid-template-columns: 1fr 112px;
            min-height: 132px;
          }
          .classic-bank-details {
            padding-bottom: 5px;
          }
          .classic-bank-details table th,
          .classic-bank-details table td {
            border: 0;
            padding: 4px 8px;
          }
          .classic-bank-details table th {
            width: 100px;
            font-weight: 400;
          }
          .classic-qr {
            border-left: 1px solid #555;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 3px;
            padding: 5px;
            text-align: center;
            font-size: 8px;
            font-weight: 800;
          }
          .classic-tax-summary table th,
          .classic-tax-summary table td {
            padding: 5px 8px;
          }
          .classic-tax-summary table th {
            width: 58%;
            font-weight: 800;
          }
          .classic-tax-summary table td {
            text-align: right;
            white-space: nowrap;
          }
          .classic-tax-summary .classic-grand th,
          .classic-tax-summary .classic-grand td {
            font-size: 12px;
            font-weight: 900;
          }
          .classic-declaration {
            min-height: 84px;
            display: grid;
            grid-template-rows: auto 1fr auto;
            border-top: 1px solid #555;
            text-align: center;
          }
          .classic-declaration-text {
            padding: 6px 8px;
            font-size: 8px;
          }
          .classic-signature-company {
            font-weight: 900;
            padding: 4px 8px;
          }
          .classic-signature-label {
            border-top: 1px solid #555;
            padding: 4px 8px;
            font-size: 8px;
            font-weight: 800;
          }
          .classic-terms-sign {
            display: grid;
            grid-template-columns: 62% 38%;
            border-top: 1px solid #555;
          }
          .classic-terms {
            min-height: 82px;
            border-right: 1px solid #555;
          }
          .classic-terms ul {
            margin: 4px 8px 4px 18px;
            padding: 0;
          }
          .classic-customer-sign {
            display: grid;
            grid-template-rows: 1fr auto;
            min-height: 82px;
          }
          .classic-customer-sign div:last-child {
            border-top: 1px solid #555;
            text-align: center;
            padding: 4px;
            font-weight: 800;
            font-size: 8px;
          }
          .classic-footer-note {
            padding: 7px 8px;
            border-top: 1px solid #555;
          }
          @media (max-width: 900px) {
            .classic-invoice-toolbar,
            .classic-invoice-sheet {
              margin-left: 0;
              margin-right: 0;
            }
          }
          @media print {
            body {
              background: #fff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print {
              display: none !important;
            }
            .page-wrapper,
            .content,
            .container-fluid,
            .classic-invoice-page {
              padding: 0 !important;
              margin: 0 !important;
              background: #fff !important;
            }
            .classic-invoice-canvas {
              overflow: visible !important;
            }
            .classic-invoice-sheet {
              width: 100%;
              min-height: auto;
              margin: 0;
              border: 1px solid #000;
              box-shadow: none;
              page-break-after: avoid;
            }
            .classic-invoice-sheet th,
            .classic-invoice-sheet td,
            .classic-title-strip,
            .classic-details-grid,
            .classic-bottom-grid > div + div,
            .classic-amount-words,
            .classic-amount-words div:first-child,
            .classic-bank-grid .classic-qr,
            .classic-declaration,
            .classic-signature-label,
            .classic-terms-sign,
            .classic-terms,
            .classic-footer-note {
              border-color: #000 !important;
            }
            @page {
              size: A4 portrait;
              margin: 7mm;
            }
          }
        `}</style>

        <div className="classic-invoice-toolbar no-print">
          <button type="button" onClick={() => window.print()}>
            Print {documentNoun}
          </button>
        </div>

        <div className="classic-invoice-canvas">
          <section className="classic-invoice-sheet">
            <header className="classic-company-header">
              <div>
                <h1 className="classic-company-name">{companyDetails.companyName}</h1>
                <div className="classic-company-strip">{documentServiceLine}</div>
                <div className="classic-company-meta">
                  <div>{companyDetails.companyAddress || "-"}</div>
                  <div>
                    <div>Tel: {companyDetails.companyPhone || "-"}</div>
                    <div>GSTIN: {companyDetails.companyGst || "-"}</div>
                  </div>
                </div>
              </div>
              {companyDetails.companyLogo ? (
                <img className="classic-company-logo" src={companyDetails.companyLogo} alt="Company logo" />
              ) : null}
            </header>

            <div className="classic-title-strip">
              <div>
                <strong>PAN :</strong> {companyPan || "-"}
              </div>
              <div className="classic-title-main">{documentTitle}</div>
              <div className="classic-recipient-copy">ORIGINAL FOR RECIPIENT</div>
            </div>

            <section className="classic-details-grid">
              <div className="classic-detail-panel">
                <div className="classic-detail-panel-title">Customer Detail</div>
                <table>
                  <tbody>
                    <DataRow label="M/S" value={customer.name || billAsName} />
                    <DataRow label="Address" value={customer.address} />
                    <DataRow label="Phone" value={customer.phone} />
                    <DataRow label="GSTIN" value={customer.gstNo} />
                    <DataRow label="Place of Supply" value={customer.placeOfSupply || region} />
                  </tbody>
                </table>
              </div>

              <div className="classic-detail-panel">
                <table>
                  <tbody>
                    <DataRow label={`${documentNoun} No.`} value={invoiceNo} />
                    {isCreditNote ? (
                      <DataRow label="Original Invoice No." value={parentInvoiceNo} />
                    ) : (
                      <DataRow label="Challan No" value={challanNo} />
                    )}
                    <DataRow label="E-Way Bill No." value={eWayBillNo} />
                    <DataRow label="Transport" value={transport} />
                    <DataRow label="Transport ID" value={transportId} />
                  </tbody>
                </table>
              </div>

              <div className="classic-detail-panel">
                <table>
                  <tbody>
                    <DataRow label={`${documentNoun} Date`} value={invoiceDate} />
                    <DataRow label="Challan Date" value={challanDate === "-" ? "" : challanDate} />
                    <DataRow label="PO No." value={poNumber} />
                    <DataRow label="Job No." value={selectedJobNo} />
                    <DataRow label="Region" value={region} />
                  </tbody>
                </table>
              </div>
            </section>

            <table className="classic-items">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: 28 }}>Sr. No.</th>
                  <th rowSpan={2} className="classic-description">Name of Product / Service</th>
                  <th rowSpan={2} style={{ width: 72 }}>HSN / SAC</th>
                  <th rowSpan={2} style={{ width: 48 }}>Qty</th>
                  <th rowSpan={2} style={{ width: 72 }}>Rate</th>
                  <th rowSpan={2} style={{ width: 88 }}>Taxable Value</th>
                  <th colSpan={2}>IGST</th>
                  <th rowSpan={2} style={{ width: 88 }}>Total</th>
                </tr>
                <tr>
                  <th style={{ width: 42 }}>%</th>
                  <th style={{ width: 78 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.length ? (
                  invoiceRows.map((row) => (
                    <tr key={row.key}>
                      <td className="classic-center">{row.sno}</td>
                      <td>
                        <strong>{row.description || "-"}</strong>
                        {row.media ? <div>{row.media}</div> : null}
                        {row.jobNo ? <div>Job No: {row.jobNo}</div> : null}
                        {row.width || row.height ? <div>Size: {row.width || "-"} x {row.height || "-"}</div> : null}
                      </td>
                      <td className="classic-center">{row.hsnCode || "-"}</td>
                      <td className="classic-center">{row.qty || "-"}</td>
                      <td className="classic-number">{formatAmount(row.rate)}</td>
                      <td className="classic-number">{formatAmount(row.taxableValue)}</td>
                      <td className="classic-center">{formatAmount(row.gstRate)}</td>
                      <td className="classic-number">{formatAmount(row.gstAmount)}</td>
                      <td className="classic-number">{formatAmount(row.lineTotal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="classic-center" colSpan={9}>No invoice items found</td>
                  </tr>
                )}
                <tr className="classic-total-row">
                  <td colSpan={3} className="classic-number">Total</td>
                  <td className="classic-center">
                    {invoiceRows.reduce((sum, row) => sum + toNumber(row.qty), 0) || "-"}
                  </td>
                  <td />
                  <td className="classic-number">{formatAmount(invoiceSubtotal)}</td>
                  <td />
                  <td className="classic-number">{formatAmount(invoiceGstTotal)}</td>
                  <td className="classic-number">{formatAmount(invoiceGrandTotal)}</td>
                </tr>
              </tbody>
            </table>

            <section className="classic-bottom-grid">
              <div>
                <div className="classic-amount-words">
                  <div>Total in words</div>
                  <div>{amountInWords(invoiceGrandTotal)}</div>
                </div>

                <div className="classic-bank-details">
                  <div className="classic-section-title">Bank Details</div>
                  <div className="classic-bank-grid">
                    <table>
                      <tbody>
                        <DataRow label="Name" value={bankDetails.bankName} />
                        <DataRow label="Branch" value={bankDetails.branch} />
                        <DataRow label="Acc. Number" value={bankDetails.accountNo} />
                        <DataRow label="IFSC" value={bankDetails.ifsc} />
                        <DataRow label="UPI ID" value={bankDetails.upiId} />
                      </tbody>
                    </table>
                    <div className="classic-qr">
                      <QRCode value={qrValue} size={82} />
                      <div>{bankDetails.upiId ? "Pay using UPI" : `${documentNoun} QR`}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="classic-tax-summary">
                <table>
                  <tbody>
                    <DataRow label="Taxable Amount" value={formatAmount(invoiceSubtotal)} />
                    <DataRow label="Add : IGST" value={formatAmount(invoiceGstTotal)} />
                    <DataRow label="Total Tax" value={formatAmount(invoiceGstTotal)} />
                    <tr className="classic-grand">
                      <th>Total Amount After Tax</th>
                      <td>{formatAmount(invoiceGrandTotal)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="classic-declaration">
                  <div className="classic-declaration-text">
                    Certified that the particulars given above are true and correct.
                  </div>
                  <div className="classic-signature-company">For {companyDetails.companyName || "-"}</div>
                  <div className="classic-signature-label">Authorised Signatory</div>
                </div>
              </div>
            </section>

            <section className="classic-terms-sign">
              <div className="classic-terms">
                <div className="classic-section-title">Terms and Conditions</div>
                <ul>
                  <li>Subject to jurisdiction applicable to the company branch.</li>
                  <li>Our responsibility ceases as soon as goods leave our premises.</li>
                  <li>Goods once sold will not be taken back.</li>
                  {notes ? <li>{notes}</li> : null}
                </ul>
              </div>
              <div className="classic-customer-sign">
                <div>
                  <div className="classic-section-title">Ship To</div>
                  <div style={{ padding: 6 }}>
                    <strong>{shipTo.name || "-"}</strong>
                    <div>{shipTo.address || "-"}</div>
                    {shipTo.gstNo ? <div>GSTIN: {shipTo.gstNo}</div> : null}
                    {projectName ? <div>Project: {projectName}</div> : null}
                  </div>
                </div>
                <div>Customer Signature</div>
              </div>
            </section>

            <div className="classic-footer-note">Thank you for shopping with us!</div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintPreview;
