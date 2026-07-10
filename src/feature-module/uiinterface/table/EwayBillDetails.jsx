import React from "react";
import { toNumber } from "./utils"; // adjust path if utils.js doesn't export toNumber

const MODES = ["Road", "Train", "Air", "Ship"];

const EwayBillDetails = ({ data }) => {
  const subtotal = toNumber(data?.invoiceSubtotal ?? data?.invoiceGrandTotal ?? 0);

  // E-way bill section only required once invoice value crosses 50,000
  if (subtotal <= 50000) return null;

  const eway = data?.ewayBill || {};
  const selectedMode = (eway.modeOfTransportation || "Road").trim();

  return (
    <table className="classic-invoice-table eway-bill-table">
      <tbody>
        <tr>
          <td colSpan={4} className="eway-bill-heading">
            Eway Bill Details
          </td>
        </tr>
        <tr>
          <td>
            <div className="field-label">Transporter name</div>
            <div className="field-value">{eway.transporterName || "-"}</div>
          </td>
          <td>
            <div className="field-label">Mode of transportation</div>
            <div className="field-value eway-mode-row">
              {MODES.map((mode) => (
                <span key={mode} className={mode === selectedMode ? "eway-mode-selected" : "eway-mode"}>
                  {mode}
                </span>
              ))}
            </div>
          </td>
          <td>
            <div className="field-label">Distance of transportation (in km)</div>
            <div className="field-value">{eway.distanceKm || "-"}</div>
          </td>
          <td>
            <div className="field-label">Vehicle no</div>
            <div className="field-value">{eway.vehicleNo || "-"}</div>
          </td>
        </tr>
        <tr>
          <td colSpan={2}>
            <div className="field-label">Transporter GstNo</div>
            <div className="field-value">{eway.transporterGstNo || "-"}</div>
          </td>
          <td colSpan={2}></td>
        </tr>
      </tbody>
    </table>
  );
};

export default EwayBillDetails;