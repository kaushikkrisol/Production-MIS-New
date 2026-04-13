import React, { useMemo } from "react";

const formatAmount = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
};

const DeliveryChallanPreview = () => {
  const challanData = useMemo(() => {
    const raw = localStorage.getItem("challanPreviewData");
    return raw ? JSON.parse(raw) : null;
  }, []);

  if (!challanData) {
    return <div style={{ padding: 20 }}>No challan data found.</div>;
  }

  const items = Array.isArray(challanData.items) ? challanData.items : [];
  const uniqueJobNo = Array.from(
    new Set(
      String(challanData.jobNo || "")
        .split(",")
        .map((jobNo) => jobNo.trim())
        .filter(Boolean)
    )
  ).join(", ");
  const formatRoundedSize = (item) => {
    const width = Number(item.width || "");
    const height = Number(item.height || item.length || "");

    if (Number.isFinite(width) && Number.isFinite(height)) {
      return `${Math.round(width)} X ${Math.round(height)}`;
    }

    return item.size || `${item.width || ""} X ${item.height || item.length || ""}`;
  };

  return (
    <div style={{ padding: 20, background: "#f5f5f5" }}>
      <style>{`
        @media print {
          body {
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .challan-sheet {
            border: 1px solid #000 !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      <div
        className="challan-sheet"
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          background: "#fff",
          color: "#000",
          border: "1px solid #000",
          boxShadow: "0 0 8px rgba(0,0,0,0.12)"
        }}
      >
        <div style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid #000" }}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Delivery Challan</h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: challanData.companyLogo ? "300px 1fr" : "1fr",
            alignItems: "center",
            columnGap: 12,
            borderBottom: "1px solid #000"
          }}
        >
          {challanData.companyLogo && (
            <div
              style={{
                padding: "18px 8px 18px 20px",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={challanData.companyLogo}
                alt="Company Logo"
                style={{
                  width: "100%",
                  maxWidth: 280,
                  maxHeight: 130,
                  objectFit: "contain",
                }}
              />
            </div>
          )}

          <div style={{ padding: "20px 24px 20px 4px", textAlign: "center" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: 24, fontWeight: 700 }}>
              {challanData.companyName || "-"}
            </h3>
            <div style={{ lineHeight: 1.5, wordBreak: "break-word" }}>
              {challanData.companyAddress || "-"}
            </div>
            <div style={{ marginTop: 4 }}>Ph: {challanData.companyPhone || "-"}</div>
            <div style={{ marginTop: 4 }}>GST No: {challanData.companyGst || "-"}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #000" }}>
          <div style={{ padding: 12, borderRight: "1px solid #000" }}>
            <div><strong>Name:</strong> {challanData.name || "-"}</div>
            <div><strong>Address:</strong> {challanData.address || "-"}</div>
            <div><strong>GST No:</strong> {challanData.gstNo || "-"}</div>
            <div><strong>Project Name:</strong> {challanData.projectName || "-"}</div>
            <div><strong>CP Name:</strong> {challanData.cpName || "-"}</div>
            <div><strong>CP Phone:</strong> {challanData.contactPersonPhone || "-"}</div>
          </div>

          <div style={{ padding: 12 }}>
            <div><strong>Challan No:</strong> {challanData.challanNo || "-"}</div>
            <div><strong>Challan Dt:</strong> {challanData.challanDt || "-"}</div>
            <div><strong>Job No:</strong> {uniqueJobNo || "-"}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>
              <strong>Job Value:</strong> {challanData.jobValue || "-"}
            </div>
            <div><strong>PO No:</strong> {challanData.poNo || "-"}</div>
            <div><strong>PO Date:</strong> {challanData.poDate || "-"}</div>
          </div>
        </div>

        <div style={{ padding: 12, borderBottom: "1px solid #000" }}>
          <div><strong>Storename:</strong> {challanData.storeName || "-"}</div>
          <div><strong>Storeaddress:</strong> {challanData.storeAddress || "-"}</div>
          <div><strong>Production Location:</strong> {challanData.productionLocation || "-"}</div>
          {challanData.dispatchAddress && (
            <div><strong>Dispatch Address:</strong> {challanData.dispatchAddress}</div>
          )}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>S.No</th>
              <th style={thStyle}>Details</th>
              <th style={thStyle}>HSN</th>
              <th style={thStyle}>Rate / Sq Ft</th>
              <th style={thStyle}>Sq Ft</th>
              <th style={thStyle}>Size</th>
              <th style={thStyle}>Quantity</th>
              <th style={thStyle}>Line Value</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={item.sno || index}>
                  <td style={tdStyle}>{item.sno || index + 1}</td>
                  <td style={tdStyle}>{item.details || "-"}</td>
                  <td style={{ ...tdStyle, fontSize: 16, fontWeight: 700 }}>
                    {item.hsnCode || "-"}
                  </td>
                  <td style={tdStyle}>{formatAmount(item.unitPrice)}</td>
                  <td style={tdStyle}>{formatAmount(item.totalSqFt)}</td>
                  <td style={tdStyle}>{formatRoundedSize(item)}</td>
                  <td style={tdStyle}>{item.quantity || 0}</td>
                  <td style={tdStyle}>{formatAmount(item.lineJobValue)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={tdStyle} colSpan={8}>No items found</td>
              </tr>
            )}
          </tbody>
        </table>

        {(challanData.remarks || challanData.transportMode || challanData.vehicleNo || challanData.ewayBillNo) && (
          <div style={{ padding: 12, borderTop: "1px solid #000" }}>
            {challanData.remarks && <div><strong>Remarks:</strong> {challanData.remarks}</div>}
            {challanData.transportMode && <div><strong>Transport Mode:</strong> {challanData.transportMode}</div>}
            {challanData.vehicleNo && <div><strong>Vehicle No:</strong> {challanData.vehicleNo}</div>}
            {challanData.ewayBillNo && <div><strong>E-Way Bill No:</strong> {challanData.ewayBillNo}</div>}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", padding: 20, minHeight: 100 }}>
          <div>
            <strong>For: {challanData.companyName || "-"}</strong>
            {challanData.preparedBy && (
              <div style={{ marginTop: 8 }}><strong>Prepared By:</strong> {challanData.preparedBy}</div>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <strong>Please Sign and return</strong>
            {challanData.receivedBy && (
              <div style={{ marginTop: 8 }}><strong>Received By:</strong> {challanData.receivedBy}</div>
            )}
            {challanData.receivedDate && (
              <div><strong>Received Date:</strong> {challanData.receivedDate}</div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 22, padding: 10, borderTop: "1px solid #000" }}>
          Challan No: {challanData.challanNo || "-"}
        </div>

        <div className="no-print" style={{ padding: 16, textAlign: "center" }}>
          <button onClick={() => window.print()} className="btn btn-primary">
            Print
          </button>
        </div>
      </div>
    </div>
  );
};

const thStyle = {
  border: "1px solid #000",
  padding: "8px",
  background: "#f3f3f3",
  fontWeight: 700
};

const tdStyle = {
  border: "1px solid #000",
  padding: "8px",
  verticalAlign: "top"
};

export default DeliveryChallanPreview;
