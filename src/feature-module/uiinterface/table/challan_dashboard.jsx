import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import config from "../../../config";

const ChallanDashboard = () => {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    fromDate: "",
    toDate: "",
    type: "all",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchAllChallans = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(config.Delivery.URL.GetAllChallansDashboard);

      const data = Array.isArray(res.data) ? res.data : [];

      console.log("data is as follows ", res.data);

      const normalized = data
        .map((item) => ({
          id: item.id,

          ChallanNo: item.challanNo,
          ChallanDate: item.challanDate,

          CompanyName: item.companyName,
          CompanyAddress: item.companyAddress,
          CompanyPhone: item.companyPhone,
          CompanyGst: item.companyGst,
          CompanyLogo: item.companyLogo,

          CustomerName: item.customerName,
          CustomerAddress: item.customerAddress,
          CustomerGstNo: item.customerGstNo,

          ProjectName: item.projectName,
          CpName: item.cpName,
          ContactPersonPhone: item.contactPersonPhone,

          JobNo: item.jobNo,
          JobValue: item.jobValue,

          PoNo: item.poNo,
          PoDate: item.poDate,

          StoreName: item.storeName,
          StoreAddress: item.storeAddress,
          ProductionLocation: item.productionLocation,

          DispatchAddress: item.dispatchAddress,
          Remarks: item.remarks,

          PreparedBy: item.preparedBy,
          ReceivedBy: item.receivedBy,
          ReceivedDate: item.receivedDate,

          CreatedAt: item.createdAt,

          Items: Array.isArray(item.items)
            ? item.items.map((it, index) => ({
                RowId: it.rowId || it.PackingRowId,
                CsId: it.csId,
                JobNo: it.jobNo,
                Sno: it.sno || index + 1,
                Details: it.details,
                HsnCode: it.hsnCode,
                Width: it.width,
                Height: it.height,
                Size: it.size,
                Quantity: it.quantity,
              }))
            : [],

          ChallanType: item.challanType || "Challan",
        }))
        .sort((a, b) => {
          const da = new Date(a.CreatedAt || 0).getTime();
          const db = new Date(b.CreatedAt || 0).getTime();
          return db - da;
        });

      setChallans(normalized);
    } catch (err) {
      console.error(err);
      setError("Failed to load challans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllChallans();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.fromDate, filters.toDate, filters.type]);

  const normalizeDate = (value) => {
    if (!value) return "";
    if (typeof value === "object" && value.$date) {
      return new Date(value.$date);
    }
    return new Date(value);
  };

  const filteredData = useMemo(() => {
    return challans.filter((item) => {
      const search = filters.search.trim().toLowerCase();

      const challanNo = String(item?.ChallanNo || "").toLowerCase();
      const customerName = String(item?.CustomerName || "").toLowerCase();
      const jobNo = String(item?.JobNo || "").toLowerCase();
      const challanType = String(item?.ChallanType || "").toLowerCase();

      const matchSearch =
        !search ||
        challanNo.includes(search) ||
        customerName.includes(search) ||
        jobNo.includes(search) ||
        challanType.includes(search);

      const createdAt = normalizeDate(item?.CreatedAt);

      const matchFrom =
        !filters.fromDate ||
        (createdAt instanceof Date &&
          !Number.isNaN(createdAt.getTime()) &&
          createdAt >= new Date(filters.fromDate));

      const matchTo =
        !filters.toDate ||
        (createdAt instanceof Date &&
          !Number.isNaN(createdAt.getTime()) &&
          createdAt <= new Date(`${filters.toDate}T23:59:59`));

      const matchType =
        filters.type === "all" || item?.ChallanType === filters.type;

      return matchSearch && matchFrom && matchTo && matchType;
    });
  }, [challans, filters]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleView = (row) => {
    const previewData = {
      companyName: row.CompanyName || "",
      companyAddress: row.CompanyAddress || "",
      companyPhone: row.CompanyPhone || "",
      companyGst: row.CompanyGst || "",
      companyLogo: row.CompanyLogo || "",
      name: row.CustomerName || "",
      address: row.CustomerAddress || "",
      gstNo: row.CustomerGstNo || "",
      projectName: row.ProjectName || "",
      cpName: row.cpName || row.CpName || "",
      contactPersonPhone:
        row.contactPersonPhone || row.ContactPersonPhone || "",
      challanNo: row.ChallanNo || "",
      challanDt: row.ChallanDate || "",
      jobNo: row.JobNo || "",
      jobValue: row.JobValue || "",
      poNo: row.PoNo || "",
      poDate: row.PoDate || "",
      storeName: row.StoreName || "",
      storeAddress: row.StoreAddress || "",
      productionLocation: row.ProductionLocation || "",
      dispatchAddress: row.DispatchAddress || "",
      remarks: row.Remarks || "",
      preparedBy: row.PreparedBy || "",
      receivedBy: row.ReceivedBy || "",
      receivedDate: row.ReceivedDate || "",
      items: Array.isArray(row.Items)
        ? row.Items.map((item, index) => ({
            rowId: item.RowId || item.PackingRowId || "",
            csId: item.CsId || item.PackingCsId || "",
            jobNo: item.JobNo || "",
            sno: item.Sno || index + 1,
            details: item.Details || "",
            hsnCode: item.HsnCode || "",
            width: item.Width || "",
            height: item.Height || "",
            size: item.Size || "",
            quantity: item.Quantity || "",
            totalSqFt: item.TotalSqFt || "",
            unitPrice: item.UnitPrice || 0,
            lineJobValue: item.LineJobValue || 0,
          }))
        : [],
    };

    localStorage.setItem("challanPreviewData", JSON.stringify(previewData));

    if (row.ChallanType === "Implementation") {
      window.open("/implementationchallan", "_blank");
    } else {
      window.open("/deliverychallan", "_blank");
    }
  };

  return (
    <div
      className="container-fluid py-4"
      style={{ paddingLeft: "16rem", marginTop: "3rem" }}
    >
      <div className="card shadow-sm border-0 rounded-4 mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h3 className="mb-1">Challan Dashboard</h3>
              <p className="text-muted mb-0">
                View all Implementation and Delivery challans
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={fetchAllChallans}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search challan / customer / job / type"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
              />
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button
                className="btn btn-secondary w-100"
                onClick={() =>
                  setFilters({
                    search: "",
                    fromDate: "",
                    toDate: "",
                    type: "all",
                  })
                }
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Challan No</th>
                  <th>Type</th>
                  <th>Challan Date</th>
                  <th>Customer Name</th>
                  <th>Job No</th>
                  <th>Store Name</th>
                  <th>Production Location</th>
                  <th>Job Value</th>
                  <th>Prepared By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4">
                      No challans found
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <tr key={row.id || index}>
                      <td>{row.ChallanNo}</td>
                      <td>
                        <span
                          className={`badge ${
                            row.ChallanType === "Implementation"
                              ? "bg-success"
                              : "bg-info"
                          }`}
                        >
                          {row.ChallanType}
                        </span>
                      </td>
                      <td>{row.ChallanDate}</td>
                      <td>{row.CustomerName}</td>
                      <td>{row.JobNo}</td>
                      <td>{row.StoreName}</td>
                      <td>{row.ProductionLocation}</td>
                      <td>{row.JobValue}</td>
                      <td>{row.PreparedBy}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleView(row)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredData.length > 0 && (
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
              <div className="text-muted">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredData.length)} of{" "}
                {filteredData.length} entries
              </div>

              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(
                    Math.max(currentPage - 3, 0),
                    Math.min(Math.max(currentPage - 3, 0) + 5, totalPages)
                  )
                  .map((page) => (
                    <button
                      key={page}
                      className={`btn btn-sm ${
                        currentPage === page
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}

                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallanDashboard;