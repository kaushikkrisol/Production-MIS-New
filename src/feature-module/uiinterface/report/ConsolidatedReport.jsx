import React, { useMemo, useState, useEffect } from "react";
import {
  Container, Row, Col, Card, CardBody, Button, Form, Table, Spinner, Alert
} from "react-bootstrap";
import DateRangePicker from "react-bootstrap-daterangepicker";
import "bootstrap-daterangepicker/daterangepicker.css";
import { Calendar } from "feather-icons-react/build/IconComponents";
import moment from "moment";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import config from "../../../config";
import "./ConsolidatedReport.css";

const ConsolidatedReport = () => {
  const [dateRangeDisplay, setDateRangeDisplay] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const initialSettings = {
    endDate: new Date(),
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    timePicker: false,
    ranges: {
      Today: [new Date(), new Date()],
      Yesterday: [new Date(new Date().setDate(new Date().getDate() - 1)), new Date()],
      "Last 7 Days": [new Date(new Date().setDate(new Date().getDate() - 6)), new Date()],
      "Last 30 Days": [new Date(new Date().setDate(new Date().getDate() - 30)), new Date()],
      "This Month": [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)],
      "Last Month": [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), new Date(new Date().getFullYear(), new Date().getMonth(), 0)]
    }
  };

  // default range so Go works without clicking Apply
  useEffect(() => {
    const start = moment(initialSettings.startDate);
    const end = moment(initialSettings.endDate);
    const from = start.format("DD-MM-YYYY");
    const to = end.format("DD-MM-YYYY");
    setFromDate(from);
    setToDate(to);
    setDateRangeDisplay(`${from} - ${to}`);
  }, []);

  const handleDateRangeChange = (_e, picker) => {
    const from = moment(picker.startDate).format("DD-MM-YYYY");
    const to = moment(picker.endDate).format("DD-MM-YYYY");
    setFromDate(from);
    setToDate(to);
    setDateRangeDisplay(`${from} - ${to}`);
  };

  // ---------- helpers ----------
  const fmtDateTime = (val) =>
    val && moment(val).isValid() ? moment(val).format("DD/MMM/YYYY HH:mm:ss") : "-";

  const getFormattedJobDate = (item) => {
    const candidates = [item?.date, item?.jobDate, item?.entereddt, item?.createdAt, item?.data?.lstupdatedt, item?.data?.entereddt];
    const firstValid = candidates.find((d) => d && moment(d).isValid());
    return fmtDateTime(firstValid);
  };

  const getFormattedEnteredDate = (item) => {
    const d = item?.data || {};
    const candidates = [
      item?.enteredDate, d?.enteredDate,
      item?.entereddt, d?.entereddt,
      item?.entereddat, d?.entereddat,
      d?.lstupdatedt,
      item?.createdAt, d?.createdAt,
      d?.date
    ];
    const firstValid = candidates.find((x) => x && moment(x).isValid());
    return fmtDateTime(firstValid);
  };

  const inferDepartment = (r) => {
    if (r?.isReprint || r?.isPrintingdone === 1) return "Reprint";
    if (r?.printerName || r?.totalSqFt || r?.data?.printerPrintingName) return "Printing";
    if (r?.designerName || r?.data?.designerName || (r?.startdate && r?.enddate)) return "Design";
    if (r?.deliveryDate || r?.vehicleNo) return "Delivery";
    return r?.department || "CS";
  };

  // ---------- data fetch ----------
  const fetchReport = async () => {
    setError(null);
    setHasFetched(false);
    setLoading(true);

    if (!fromDate || !toDate) {
      setError("Please select a date range.");
      setLoading(false);
      return;
    }

    try {
      const url = (config && config.Report && config.Report.URL && config.Report.URL.Getallreport) || "/api/report/getallreport";
      const payload = { fromDate, toDate }; // no dept filter

      const resp = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
        // timeout: 120000, // uncomment if you need longer than default
      });

      const data = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp?.data?.data) ? resp.data.data : []);

      const normalized = data.map((r) => {
        const d = r.data || {};

        const originalDepartment = r?.department ?? d?.department ?? inferDepartment({ ...r, data: d });

        return {
          // keep both; UI uses original dept; Excel will override for the CS sheet only
          originalDepartment,
          department: originalDepartment,

          jobNo: r?.jobNo ?? d.jobNo ?? "-",

          // Job Date (with time when available)
          date: r?.jobDate ?? d.lstupdatedt ?? d.entereddt ?? r?.createdAt ?? d?.createdAt ?? null,

          // Entered Date (with time)
          enteredDate:
            r?.enteredDate ??
            d?.enteredDate ??
            r?.entereddt ??
            d?.entereddt ??
            r?.entereddat ??
            d?.entereddat ??
            d?.lstupdatedt ??
            r?.createdAt ??
            d?.createdAt ??
            d?.date ??
            null,

          client: r?.client ?? d.client ?? "-",
          subClient: r?.subClient ?? d.subClient ?? "-",
          region: r?.region ?? d.productionLocation ?? "-",
          visualCode: r?.visualCode ?? d.visualCode ?? "-",
          nameSubCode: r?.nameSubCode ?? d.nameSubCode ?? "-",
          qty: r?.qty ?? d.qty ?? "-",
          width: r?.width ?? d.width ?? "-",
          height: r?.height ?? d.height ?? "-",
          totalSqFt: r?.totalSqFt ?? d.totalSqFt ?? 0,
          media: r?.media ?? d.media ?? "-",
          city: r?.city ?? d.city ?? "-",
          salonAddress: r?.salonAddress ?? d.salonAddress ?? "-",
          designerName: r?.designerName ?? d.designerName ?? "-",
          printerName: r?.printerName ?? d.printerPrintingName ?? d.printerName ?? "-",
          startdate: r?.startdate ?? d.startdate ?? d.StartTime ?? null,
          enddate: r?.enddate ?? d.enddate ?? d.EndTime ?? null,
          totalTime: r?.totalTime ?? null,

          data: d
        };
      });

      setRows(normalized);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "Failed to fetch production report. Check console for details.");
      setRows([]);
    } finally {
      setHasFetched(true);
      setLoading(false);
    }
  };

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    if (!rows.length) return { totalRecords: 0, totalSqFt: 0, jobs: 0 };
    const totalSqFt = rows.reduce((sum, r) => sum + (Number.isFinite(+r.totalSqFt) ? +r.totalSqFt : 0), 0);
    const jobs = new Set(rows.map((r) => r.jobNo)).size;
    return { totalRecords: rows.length, totalSqFt, jobs };
  }, [rows]);

  // ---------- columns (Entered Date with time, after Job Date) ----------
  const columns = [
    { label: "Department", key: "department" },
    { label: "Job No", key: "jobNo" },
    { label: "Job Date", key: "date", render: getFormattedJobDate },
    { label: "Entered Date", key: "enteredDate", render: getFormattedEnteredDate }, // NEW
    { label: "Client", key: "client" },
    { label: "Sub Client", key: "subClient" },
    { label: "Production Location", key: "region" },
    { label: "Visual Code", key: "visualCode" },
    { label: "Product Details", key: "nameSubCode" },
    { label: "Qty", key: "qty" },
    { label: "Width", key: "width" },
    { label: "Height", key: "height" },
    { label: "Total Sq.Ft", key: "totalSqFt" },
    { label: "Media", key: "media" },
    { label: "City", key: "city" },
    { label: "Salon / Store Address", key: "salonAddress" },
    { label: "Designer", key: "designerName" },
    { label: "Printing Machine", key: "printerName" },
    { label: "Start Time", key: "startdate" },
    { label: "End Time", key: "enddate" },
    {
      label: "Time Taken (Design)",
      key: "totalTime",
      render: (r) => {
        if (r?.totalTime) return r.totalTime;
        const s = r?.startdate ? moment(r.startdate, "DD/MM/YYYY HH:mm:ss") : null;
        const e = r?.enddate ? moment(r.enddate, "DD/MM/YYYY HH:mm:ss") : null;
        if (s?.isValid() && e?.isValid()) {
          const d = moment.duration(e.diff(s));
          return `${d.hours()}h ${d.minutes()}m`;
        }
        return "-";
      },
    },
  ];

  // ---------- exports ----------
  const toSheetRows = (list) =>
    list.map((r) => {
      const out = {};
      columns.forEach(({ label, key, render }) => {
        out[label] = render ? render(r) : (r[key] ?? "");
      });
      return out;
    });

  const exportToExcel = () => {
    if (!rows.length) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(toSheetRows(rows));
    ws["!cols"] = columns.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Production");
    XLSX.writeFile(wb, "Production_Report.xlsx");
  };

  // This is the one you asked for: generate multiple sheets inside 1 Excel
  const exportToExcelDeptwise = () => {
    if (!rows.length) return alert("No data to export");

    const wb = XLSX.utils.book_new();

    // 1) CS sheet -> ALL jobs, forced department label as "CS"
    const csRows = rows.map((r) => ({ ...r, department: "CS" }));
    const csWs = XLSX.utils.json_to_sheet(toSheetRows(csRows));
    csWs["!cols"] = columns.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, csWs, "CS");

    // Helper to filter by original department value
    const only = (dept) =>
      rows
        .filter((r) => (r.originalDepartment || r.department || "CS") === dept)
        .map((r) => ({ ...r, department: dept }));

    // 2) Design sheet -> only design jobs
    const designWs = XLSX.utils.json_to_sheet(toSheetRows(only("Design")));
    designWs["!cols"] = columns.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, designWs, "Design");

    // 3) Printing sheet -> only printing jobs
    const printingWs = XLSX.utils.json_to_sheet(toSheetRows(only("Printing")));
    printingWs["!cols"] = columns.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, printingWs, "Printing");

    // 4) All sheet -> everything with original department
    const allRows = rows.map((r) => ({ ...r, department: r.originalDepartment || r.department || "CS" }));
    const allWs = XLSX.utils.json_to_sheet(toSheetRows(allRows));
    allWs["!cols"] = columns.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, allWs, "All");

    XLSX.writeFile(wb, "Production_Report_By_Department.xlsx");
  };

  const exportToCsv = () => {
    if (!rows.length) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(toSheetRows(rows));
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Production_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPdf = () => {
    if (!rows.length) return alert("No data to export");
    const doc = new jsPDF("landscape", "pt", "A2");
    doc.setFontSize(10);
    doc.text("Production Report", 40, 30);

    const head = [columns.map((c) => c.label)];
    const body = rows.map((r) =>
      columns.map(({ key, render }) => (render ? render(r) : (r[key] ?? "-")))
    );

    doc.autoTable({
      startY: 50,
      head,
      body,
      styles: { fontSize: 10, overflow: "linebreak", cellPadding: 5 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      columnStyles: { cellWidth: "auto" },
      tableWidth: "wrap",
      margin: { top: 50 },
    });

    doc.save("Production_Report.pdf");
  };

  return (
    <Container style={{ marginLeft: "auto", marginRight: "auto", padding: "0 10px", marginTop: "2em" }}>
      <div className="page-wrapper">
        <div className="content container-fluid">
          {loading && <Spinner animation="border" className="d-block mx-auto" />}

          <Row className="mb-3">
            <Col className="d-flex justify-content-end consolidated-btn-grp">
              <Button className="me-2" onClick={exportToExcel}>To Excel</Button>
              <Button className="me-2" onClick={exportToCsv}>To CSV</Button>
              <Button className="me-2" onClick={exportToPdf}>To PDF</Button>
              <Button className="me-2" onClick={exportToExcelDeptwise}>Dept-wise Excel</Button>
            </Col>
          </Row>

          <Row className="align-items-end">
            <Col xs={5}>
              <Form.Group controlId="formDate">
                <Form.Label>Select date</Form.Label>
                <div className="daterange-wrapper">
                  <DateRangePicker initialSettings={initialSettings} onApply={handleDateRangeChange}>
                    <input
                      className="form-control input-range"
                      type="text"
                      value={dateRangeDisplay}
                      readOnly
                    />
                  </DateRangePicker>
                  <Calendar className="calendar-icon" size={18} />
                </div>
              </Form.Group>
            </Col>

            <Col xs="auto">
              <Button className="mt-3" onClick={fetchReport}>Go</Button>
            </Col>
          </Row>

          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

          {hasFetched && (
            <Row className="mt-4 g-3">
              <Col md={4}>
                <Card className="kpi-card">
                  <CardBody>
                    <div className="kpi-title">Total Records</div>
                    <div className="kpi-value">{kpis.totalRecords}</div>
                  </CardBody>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="kpi-card">
                  <CardBody>
                    <div className="kpi-title">Distinct Jobs</div>
                    <div className="kpi-value">{kpis.jobs}</div>
                  </CardBody>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="kpi-card">
                  <CardBody>
                    <div className="kpi-title">Total Sq.Ft</div>
                    <div className="kpi-value">{kpis.totalSqFt.toFixed(2)}</div>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          )}

          <Card className="mt-4">
            <CardBody style={{ padding: 0 }}>
              <div className="consolidated-table-wrap">
                {hasFetched && !rows.length ? (
                  <div className="p-3">No data available for the selected date range.</div>
                ) : (
                  <Table striped bordered hover className="consolidated-table" style={{ marginBottom: 0 }}>
                    <thead className="table-dark">
                      <tr>
                        {columns.map((c) => (
                          <th key={c.key}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={`${r.jobNo ?? i}-${i}`}>
                          {columns.map((c) => (
                            <td key={c.key}>
                              {c.render ? c.render(r) : (r[c.key] ?? "-")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  );
};

export default ConsolidatedReport;
