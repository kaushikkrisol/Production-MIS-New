import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Row, Col, Form, Table, Button, Spinner } from "react-bootstrap";
import Select from "react-select";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import config from "../../../config";
import "./PendingJobsWithHold.css";

const PendingJobsWithHold = () => {
  const [rawData, setRawData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedRows, setSelectedRows] = useState({});
  const [loading, setLoading] = useState(false);

  const [selectedJobNo, setSelectedJobNo] = useState("");
  const [user, setUser] = useState("");

  const [holdReason, setHoldReason] = useState("");
  const [holdRemark, setHoldRemark] = useState("");
  const [error, setError] = useState("");

  // ✅ Buckets / reasons (includes your new one)
  const holdReasonOptions = [
    { value: "Waiting permission from client", label: "Waiting permission from client" },
    { value: "Client not responding", label: "Client not responding" },
    { value: "Artwork pending from client", label: "Artwork pending from client" },
    { value: "Payment pending", label: "Payment pending" },
    { value: "Other", label: "Other" },
  ];

  // read username from localStorage
  useEffect(() => {
    const users = localStorage.getItem("users");
    if (users) {
      const usersObject = JSON.parse(users);
      const username = usersObject?.message?.username || "";
      setUser(username);
    }
  }, []);

  // ✅ Only show jobs where Impl pending AND Delivery pending
  // Handles "0"/0/"No"/false/"" also.
  const onlyPendingImplAndDelivery = (arr) =>
    (Array.isArray(arr) ? arr : []).filter((x) => {
      const impl = String(
        x?.isImplementationDone ??
          x?.IsImplementationDone ??
          x?.IsImplementationdone ??
          ""
      )
        .toLowerCase()
        .trim();

      const del = String(
        x?.isDeliveryDone ?? x?.IsDeliveryDone ?? x?.IsDeliverydone ?? ""
      )
        .toLowerCase()
        .trim();

      const implPending = ["0", "no", "false", ""].includes(impl);
      const delPending = ["0", "no", "false", ""].includes(del);

      return implPending && delPending;
    });

    const onlyOnHold = (arr) =>
  (Array.isArray(arr) ? arr : []).filter((x) => String(x?.isOnHold ?? x?.IsOnHold ?? "0") === "1");

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        config.Printing.URL.GetCompletedPrinting,
        {}, // body
        {
          timeout: 15000,
          headers: { "Content-Type": "application/json" },
        }
      );

      const list = onlyOnHold(onlyPendingImplAndDelivery(response.data));

      setRawData(list);
      setFilteredData(list);
      setSelectedRows({});
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // ✅ JobNo dropdown options
  const jobNoOptions = useMemo(() => {
    const set = new Set((rawData || []).map((x) => x?.jobNo).filter(Boolean));
    return [...set].map((j) => ({ value: j, label: j }));
  }, [rawData]);

  const handleSearch = () => {
    if (!selectedJobNo) {
      setFilteredData(rawData);
      setSelectedRows({});
      return;
    }
    setFilteredData((rawData || []).filter((x) => x.jobNo === selectedJobNo));
    setSelectedRows({});
  };

  // checkbox selection helpers
  const visibleRows = filteredData || [];

  const isSelectAllChecked =
    visibleRows.length > 0 && visibleRows.every((r) => selectedRows[r.id]);

  const handleSelectAllChange = (e) => {
    const checked = e.target.checked;
    const next = {};
    visibleRows.forEach((r) => {
      next[r.id] = checked;
    });
    setSelectedRows(next);
  };

  const handleRowCheck = (id) => {
    setSelectedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedJobs = useMemo(
    () => visibleRows.filter((r) => selectedRows[r.id]),
    [visibleRows, selectedRows]
  );

  // ✅ Call SetJobOnHold for each selected job
  const handleSetOnHold = async () => {
    setError("");

    if (!holdReason) {
      setError("Hold reason is required!");
      return;
    }
    if (holdReason === "Other" && !holdRemark.trim()) {
      setError("Remark is required when reason is Other!");
      return;
    }
    if (selectedJobs.length === 0) {
      setError("Please select at least 1 job.");
      return;
    }

    try {
      setLoading(true);

      for (const job of selectedJobs) {
        await axios.post(
          config.JobSummary.URL.SetJobOnHold,
          {
            jobNo: job.jobNo,
            reason: holdReason,
            remark: holdRemark,
            userName: user,
          },
          {
            timeout: 15000,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      toast.success(`Marked ${selectedJobs.length} job(s) On Hold`);
      setHoldReason("");
      setHoldRemark("");
      setSelectedRows({});
      await fetchJobs();
    } catch (err) {
      console.error(err);
      toast.error("Failed to set On Hold");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeHold = async () => {
  setError("");

  if (selectedJobs.length === 0) {
    setError("Please select at least 1 job.");
    return;
  }

  try {
    setLoading(true);

    for (const job of selectedJobs) {
      await axios.post(
        config.JobSummary.URL.ResumeJobFromHold,
        {
          jobNo: job.jobNo,
          userName: user,
        },
        {
          timeout: 15000,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    toast.success(`Resumed ${selectedJobs.length} job(s) from Hold`);
    setSelectedRows({});
    await fetchJobs();
  } catch (err) {
    console.error(err);
    toast.error("Failed to resume hold");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="pjwh-page">
      <ToastContainer />

      <Row className="mt-5 align-items-end">
        <Col lg={4}>
          <Form.Group>
            <Form.Label>Job No</Form.Label>
            <Select
              classNamePrefix="react-select"
              options={jobNoOptions}
              value={jobNoOptions.find((o) => o.value === selectedJobNo) || null}
              onChange={(opt) => setSelectedJobNo(opt?.value || "")}
              placeholder="Select Job No"
            />
          </Form.Group>
        </Col>

        <Col lg={2}>
          <Button onClick={handleSearch} className="w-100">
            Search
          </Button>
        </Col>

        <Col lg={2}>
          <Button variant="secondary" onClick={fetchJobs} className="w-100">
            Refresh
          </Button>
        </Col>

        <Col lg={4} style={{ textAlign: "right" }}>
          {loading && (
            <span>
              <Spinner size="sm" /> Loading...
            </span>
          )}
        </Col>
      </Row>

      <Row className="mb-3">
        <Col lg={4}>
          <Form.Label>Hold Reason (Bucket)</Form.Label>
          <Select
            classNamePrefix="react-select"
            options={holdReasonOptions}
            value={holdReasonOptions.find((o) => o.value === holdReason) || null}
            onChange={(opt) => {
              setHoldReason(opt?.value || "");
              if (opt?.value) setError("");
            }}
            placeholder="Select hold reason"
          />
        </Col>

        <Col lg={6}>
          <Form.Label>Remark</Form.Label>
          <Form.Control
            type="text"
            value={holdRemark}
            placeholder="Enter remark (mandatory if reason is Other)"
            onChange={(e) => {
              setHoldRemark(e.target.value);
              if (e.target.value) setError("");
            }}
          />
        </Col>

        <Col lg={2} className="d-grid">
          <Button variant="warning" onClick={handleSetOnHold}>
            Set On Hold
          </Button>
        </Col>
        <Col lg={2} className="d-grid">
        <Button variant="success" onClick={handleResumeHold}>
          Resume Hold
        </Button>
      </Col>

        {error && (
          <Col lg={12} className="mt-2">
            <div className="text-danger">{error}</div>
          </Col>
        )}
      </Row>

      <div className="pjwh-table-wrap">
        <Table className="pjwh-table" striped bordered hover size="sm">
          <thead>
            <tr>
              <th style={{ width: 60 }}>
                <Form.Check
                  type="checkbox"
                  checked={isSelectAllChecked}
                  onChange={handleSelectAllChange}
                />
              </th>
              <th>Date</th>
              <th>Job No</th>
              <th>Client</th>
              <th>Sub Client</th>
              <th>Qty</th>
              <th>Media</th>
              <th>Deadline</th>
              <th>Implementation</th>
              <th>Delivery</th>
              <th>Remarks</th>
            </tr>
          </thead>

          <tbody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      checked={!!selectedRows[row.id]}
                      onChange={() => handleRowCheck(row.id)}
                    />
                  </td>
                  <td>{row.date || "-"}</td>
                  <td>{row.jobNo || "-"}</td>
                  <td>{row.client || "-"}</td>
                  <td>{row.subClient || "-"}</td>
                  <td>{row.qty || "-"}</td>
                  <td>{row.media || "-"}</td>
                  <td>{row.deadline || "-"}</td>
                  <td>
                    {["0", "no", "false", ""].includes(
                      String(
                        row.isImplementationDone ??
                          row.IsImplementationDone ??
                          row.IsImplementationdone ??
                          ""
                      )
                        .toLowerCase()
                        .trim()
                    )
                      ? "Pending"
                      : "Done"}
                  </td>
                  <td>
                    {["0", "no", "false", ""].includes(
                      String(
                        row.isDeliveryDone ??
                          row.IsDeliveryDone ??
                          row.IsDeliverydone ??
                          ""
                      )
                        .toLowerCase()
                        .trim()
                    )
                      ? "Pending"
                      : "Done"}
                  </td>
                  <td>{row.remarks || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="text-center">
                  No jobs found (Implementation=0 and Delivery=0 only)
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div style={{ marginTop: 8, fontSize: 13 }}>
        <b>Selected:</b> {selectedJobs.length}
      </div>
    </div>
  );
};

export default PendingJobsWithHold;
