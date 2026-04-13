import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Line, Bar, Pie } from "react-chartjs-2";
import "chart.js/auto";
import PropTypes from "prop-types";
import * as XLSX from "xlsx";
import activityMaster from "../uiinterface/table/activiry.json";
import {
  FiActivity,
  FiCalendar,
  FiClock,
  FiDownload,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
  FiTarget,
  FiAlertCircle,
} from "react-icons/fi";

const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "https://productionapi.comart.in";

const REFRESH_INTERVAL_MS = 30000;
const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
];

function apiRequest(path, body) {
  return fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) {
      let errorDetail = "";
      try {
        const json = await res.json();
        errorDetail = json?.message || JSON.stringify(json);
      } catch {
        errorDetail = await res.text();
      }
      throw new Error(`API request failed (${res.status}): ${errorDetail || res.statusText}`);
    }
    return res.json();
  });
}

function normalizeId(value) {
  return String(value ?? "").trim();
}

function normalizeName(value) {
  return String(value ?? "").trim();
}

function normalizeLookupKey(value) {
  return normalizeName(value).toLowerCase();
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = normalizeLookupKey(value);
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;

  return null;
}

async function getAllUsers() {
  const urls = [
    `${API_BASE_URL}/User/GetAllUsers/GetAllUsers`,
    `${API_BASE_URL}/api/Timesheet/GetAllUsers`,
    `${API_BASE_URL}/api/User/GetAllUsers`,
  ];

  let lastError = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Employee API failed (${res.status})`);
      }

      const data = await res.json();
      if (!Array.isArray(data)) continue;

      const mapped = data
        .map((item) => {
          if (Array.isArray(item)) {
            return {
              id: normalizeId(item[0]),
              label: normalizeName(item[1]),
            };
          }

          return {
            id: normalizeId(item.user_id ?? item.userId ?? item.UserId ?? item.id ?? item._id),
            label: normalizeName(
              item.username ?? item.user_name ?? item.userName ?? item.UserName ?? item.name
            ),
          };
        })
        .filter((item) => item.id && item.label)
        .sort((a, b) => a.label.localeCompare(b.label));

      if (mapped.length > 0) {
        console.log("Loaded users from:", url, mapped.length);
        return mapped;
      }
    } catch (err) {
      console.warn("getAllUsers failed:", url, err);
      lastError = err;
    }
  }

  throw lastError || new Error("Unable to load users");
}

function toISODate(value) {
  const d = typeof value === "string" ? new Date(value) : value;
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function minutesToHours(minutes) {
  return Number((minutes / 60).toFixed(1));
}

function topN(rows, n = 10) {
  return [...rows].sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, n);
}

function safeIncludes(value, search) {
  return value.toLowerCase().includes(search.toLowerCase());
}

function isToday(date) {
  return date === toISODate(new Date());
}

function groupAndSum(list, keyGetter) {
  const map = new Map();

  list.forEach((item) => {
    const key = keyGetter(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + item.totalMinutes);
  });

  return [...map.entries()].map(([name, totalMinutes]) => ({
    name,
    totalMinutes,
    totalHours: minutesToHours(totalMinutes),
  }));
}

function buildExportFileName(filters) {
  const fromDate = String(filters.fromDate || "").trim() || "from";
  const toDate = String(filters.toDate || "").trim() || "to";
  return `Timesheet_Dashboard_${fromDate}_to_${toDate}.xlsx`;
}

function extractUserId(item) {
  const directId = normalizeId(item.userId ?? item.UserId ?? item.user_id);
  if (directId) return directId;

  const rawName = normalizeName(item.userName ?? item.UserName ?? item.username);
  if (rawName.startsWith("?userid=")) {
    return normalizeId(rawName.replace("?userid=", ""));
  }

  return "";
}

function resolveActivityMeta(item, activityById, activityByName) {
  const rawActivity = item.activity ?? item.Activity ?? item.activityId ?? item.ActivityId;
  const activityId = normalizeId(
    item.activityId ?? item.ActivityId ?? item.activity_id ?? item.activity ?? item.Activity
  );
  const activityName = normalizeName(rawActivity);

  const matchedActivity =
    activityById.get(activityId) ||
    activityByName.get(normalizeLookupKey(activityName)) ||
    null;

  return {
    activity: matchedActivity?.name || activityName || "Unmapped",
    activityType:
      matchedActivity?.type ||
      normalizeName(item.activityType ?? item.ActivityType ?? item.type ?? item.Type) ||
      (Boolean(item.isBillable ?? item.IsBillable ?? false) ? "Billable" : "Non billable"),
  };
}

function normalizeEntry(item, userMap, activityById, activityByName) {
  const userId = extractUserId(item);
  const activityMeta = resolveActivityMeta(item, activityById, activityByName);
  const isBillableFlag = parseBoolean(item.isBillable ?? item.IsBillable);
  const activityTypeKey = normalizeLookupKey(activityMeta.activityType);
  const isBillable =
    activityTypeKey === "billable"
      ? true
      : activityTypeKey === "non billable"
      ? false
      : isBillableFlag ?? false;

  return {
    id: normalizeId(item._id || item.id || item.Id) || Math.random().toString(36).slice(2),
    userId,
    userName: userMap.get(userId) || "Unknown",
    entryDate: normalizeName(item.entryDate ?? item.EntryDate),
    jobNo: normalizeName(item.jobNo ?? item.JobNo) || "-",
    activity: activityMeta.activity,
    activityType: activityMeta.activityType,
    description: normalizeName(item.description ?? item.Description),
    startTime: normalizeName(item.startTime ?? item.StartTime),
    endTime: normalizeName(item.endTime ?? item.EndTime),
    totalMinutes: Number(item.totalMinutes ?? item.TotalMinutes ?? 0),
    isBillable,
    enteredAt: normalizeName(item.entereddat ?? item.Entereddat),
  };
}

function isMappedEmployee(item, userMap) {
  const id = normalizeId(item.userId);
  return !!id && userMap.has(id);
}

function getDateRangeDays(fromDate, toDate) {
  const days = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return days;
  }

  const current = new Date(start);
  while (current <= end) {
    days.push(toISODate(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

async function fetchDashboardEntries(filters, userMap, activityById, activityByName) {
  try {
    const data = await apiRequest("/api/Timesheet/GetDashboardEntries", {
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      employee: filters.employee === "all" ? null : filters.employee,
      activity: filters.activity === "all" ? null : filters.activity,
      search: filters.search || null,
    });

    if (Array.isArray(data)) {
      console.log("Loaded from GetDashboardEntries:", data.length);
      return data.map((x) => normalizeEntry(x, userMap, activityById, activityByName));
    }

    if (Array.isArray(data?.data)) {
      console.log("Loaded from GetDashboardEntries.data:", data.data.length);
      return data.data.map((x) => normalizeEntry(x, userMap, activityById, activityByName));
    }
  } catch (err) {
    console.warn("GetDashboardEntries failed:", err);
  }

  try {
    const data = await apiRequest("/api/Timesheet/GetAllTimesheetEntries", {
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      employee: filters.employee === "all" ? null : filters.employee,
      activity: filters.activity === "all" ? null : filters.activity,
      search: filters.search || null,
    });

    if (Array.isArray(data)) {
      console.log("Loaded from GetAllTimesheetEntries:", data.length);
      return data.map((x) => normalizeEntry(x, userMap, activityById, activityByName));
    }

    if (Array.isArray(data?.data)) {
      console.log("Loaded from GetAllTimesheetEntries.data:", data.data.length);
      return data.data.map((x) => normalizeEntry(x, userMap, activityById, activityByName));
    }
  } catch (err) {
    console.warn("GetAllTimesheetEntries failed:", err);
  }

  try {
    const days = getDateRangeDays(filters.fromDate, filters.toDate);

    const responses = await Promise.all(
      days.map((entryDate) =>
        apiRequest("/api/Timesheet/GetTimesheetByDate", { entryDate })
          .then((res) => (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []))
          .catch(() => [])
      )
    );

    const merged = responses.flat();
    console.warn("Loaded from GetTimesheetByDate range fallback:", merged.length);

    return merged.map((x) => normalizeEntry(x, userMap, activityById, activityByName));
  } catch (err) {
    console.warn("GetTimesheetByDate range fallback failed:", err);
  }

  return [];
}

function KpiCard({ title, value, hint, icon: Icon }) {
  return (
    <div className="card shadow-sm rounded-4 h-100 border-0">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div>
            <p className="text-muted mb-1">{title}</p>
            <h3 className="mb-2">{value}</h3>
            <p className="small text-muted mb-0">{hint}</p>
          </div>
          <div className="bg-light rounded-3 p-3">
            <Icon className="text-primary" size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}

KpiCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  hint: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
};

export default function TimesheetManagementDashboard() {
  const [filters, setFilters] = useState({
    fromDate: toISODate(startOfMonth()),
    toDate: toISODate(new Date()),
    employee: "all",
    activity: "all",
    search: "",
  });

  const [entries, setEntries] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const userMap = useMemo(() => {
    const map = new Map();

    employeeOptions.forEach((u) => {
      const id = normalizeId(u.id);
      const label = normalizeName(u.label);
      if (id && label) {
        map.set(id, label);
      }
    });

    return map;
  }, [employeeOptions]);

  const activityMasterList = useMemo(
    () =>
      (Array.isArray(activityMaster) ? activityMaster : [])
        .map((item) => ({
          id: normalizeId(item.id),
          name: normalizeName(item.name),
          type: normalizeName(item.type),
        }))
        .filter((item) => item.name),
    []
  );

  const activityById = useMemo(() => {
    const map = new Map();
    activityMasterList.forEach((item) => {
      if (item.id) map.set(item.id, item);
    });
    return map;
  }, [activityMasterList]);

  const activityByName = useMemo(() => {
    const map = new Map();
    activityMasterList.forEach((item) => {
      map.set(normalizeLookupKey(item.name), item);
    });
    return map;
  }, [activityMasterList]);

  const fetchEmployeeList = useCallback(async () => {
    try {
      const data = await getAllUsers();
      setEmployeeOptions(data);
    } catch (err) {
      console.warn("Could not load employee list:", err);
      setEmployeeOptions([]);
    }
  }, []);

  const loadData = useCallback(
    async (isManual = false) => {
      try {
        setError("");
        if (isManual) setRefreshing(true);
        else setLoading(true);

        const data = await fetchDashboardEntries(filters, userMap, activityById, activityByName);
        setEntries(data);
        setLastRefreshedAt(new Date());

        console.log("UserMap:", Array.from(userMap.entries()));
        console.log(
          "UNMAPPED IDS:",
          [...new Set(data.map((x) => normalizeId(x.userId)).filter((id) => id && !userMap.has(id)))]
        );
      } catch (err) {
        setError(err?.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activityById, activityByName, filters, userMap]
  );

  useEffect(() => {
    fetchEmployeeList();
  }, [fetchEmployeeList]);

  useEffect(() => {
    if (employeeOptions.length > 0) {
      loadData();
    }
  }, [employeeOptions, loadData]);

  useEffect(() => {
    if (employeeOptions.length === 0) return;

    const id = window.setInterval(() => loadData(true), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [employeeOptions, loadData]);

  const employees = useMemo(() => {
    return [{ id: "all", label: "All Employees" }, ...employeeOptions];
  }, [employeeOptions]);

  const activities = useMemo(() => {
    const set = new Set([
      ...activityMasterList.map((x) => x.name).filter(Boolean),
      ...entries.map((x) => x.activity).filter(Boolean),
    ]);
    return ["all", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [activityMasterList, entries]);

  const filtered = useMemo(
    () =>
      entries.filter((item) => {
        if (filters.employee !== "all" && normalizeId(item.userId) !== filters.employee) return false;
        if (filters.activity !== "all" && item.activity !== filters.activity) return false;
        if (filters.search) {
          const bucket = `${item.userName} ${item.jobNo} ${item.activity} ${item.description}`;
          if (!safeIncludes(bucket, filters.search)) return false;
        }
        return true;
      }),
    [entries, filters]
  );

  const mappedEmployeeRows = useMemo(
    () => filtered.filter((item) => isMappedEmployee(item, userMap)),
    [filtered, userMap]
  );

  const totalMinutes = useMemo(() => filtered.reduce((sum, x) => sum + x.totalMinutes, 0), [filtered]);

  const billableMinutes = useMemo(
    () => filtered.filter((x) => x.isBillable).reduce((sum, x) => sum + x.totalMinutes, 0),
    [filtered]
  );

  const nonBillableMinutes = useMemo(
    () => filtered.filter((x) => !x.isBillable).reduce((sum, x) => sum + x.totalMinutes, 0),
    [filtered]
  );

  const activeEmployeesCount = useMemo(
    () => new Set(mappedEmployeeRows.map((x) => normalizeId(x.userId))).size,
    [mappedEmployeeRows]
  );

  const activeActivitiesCount = useMemo(() => new Set(filtered.map((x) => x.activity)).size, [filtered]);

  const todayMinutes = useMemo(
    () => filtered.filter((x) => isToday(x.entryDate)).reduce((sum, x) => sum + x.totalMinutes, 0),
    [filtered]
  );

  const avgPerEmployee = activeEmployeesCount ? totalMinutes / activeEmployeesCount : 0;
  const billablePct = totalMinutes ? (billableMinutes / totalMinutes) * 100 : 0;
  const nonBillablePct = totalMinutes ? (nonBillableMinutes / totalMinutes) * 100 : 0;

  const hoursByDate = useMemo(() => {
    return groupAndSum(filtered, (x) => x.entryDate)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((x) => ({ date: x.name, hours: x.totalHours }));
  }, [filtered]);

  const hoursByEmployee = useMemo(() => {
    return topN(
      groupAndSum(mappedEmployeeRows, (x) => userMap.get(normalizeId(x.userId))),
      10
    ).map((x) => ({
      employee: x.name,
      hours: x.totalHours,
    }));
  }, [mappedEmployeeRows, userMap]);

  const hoursByActivity = useMemo(
    () =>
      topN(
        groupAndSum(
          filtered,
          (x) => `${x.activity || "Unmapped"} - ${x.activityType || "Non billable"}`
        ),
        10
      ).map((x) => ({
        activity: x.name,
        hours: x.totalHours,
        totalMinutes: x.totalMinutes,
      })),
    [filtered]
  );

  const topJobs = useMemo(
    () =>
      topN(groupAndSum(filtered, (x) => x.jobNo || "-"), 10).map((x) => ({
        jobNo: x.name,
        hours: x.totalHours,
      })),
    [filtered]
  );

  const dateEmployeeSummary = useMemo(() => {
    const map = new Map();

    mappedEmployeeRows.forEach((item) => {
      const id = normalizeId(item.userId);
      const employeeName = userMap.get(id);
      const key = `${item.entryDate}|${id}`;

      const row = map.get(key) || {
        date: item.entryDate,
        employee: employeeName,
        totalMinutes: 0,
        billableMinutes: 0,
        jobs: new Set(),
        activities: new Set(),
      };

      row.totalMinutes += item.totalMinutes;
      if (item.isBillable) row.billableMinutes += item.totalMinutes;
      row.jobs.add(item.jobNo || "-");
      row.activities.add(item.activity || "-");

      map.set(key, row);
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        hours: minutesToHours(row.totalMinutes),
        billableHours: minutesToHours(row.billableMinutes),
        nonBillableHours: minutesToHours(row.totalMinutes - row.billableMinutes),
        jobs: row.jobs.size,
        activities: row.activities.size,
      }))
      .sort((a, b) =>
        a.date === b.date
          ? a.employee.localeCompare(b.employee)
          : a.date.localeCompare(b.date)
      );
  }, [mappedEmployeeRows, userMap]);

  const employeeDetail = useMemo(() => {
    const grouped = groupAndSum(
      mappedEmployeeRows,
      (x) => userMap.get(normalizeId(x.userId))
    );

    return topN(
      grouped.map((row) => {
        const employeeRows = mappedEmployeeRows.filter(
          (x) => userMap.get(normalizeId(x.userId)) === row.name
        );

        const billable = employeeRows
          .filter((x) => x.isBillable)
          .reduce((sum, x) => sum + x.totalMinutes, 0);

        const nonBillable = row.totalMinutes - billable;

        return {
          employee: row.name,
          totalMinutes: row.totalMinutes,
          hours: row.totalHours,
          billableHours: minutesToHours(billable),
          nonBillableHours: minutesToHours(nonBillable),
          utilization: row.totalMinutes
            ? `${((billable / row.totalMinutes) * 100).toFixed(1)}%`
            : "0.0%",
          jobs: new Set(employeeRows.map((x) => x.jobNo || "-")).size,
          acts: new Set(employeeRows.map((x) => x.activity || "-")).size,
        };
      }),
      20
    );
  }, [mappedEmployeeRows, userMap]);

  const lineData = {
    labels: hoursByDate.map((item) => item.date),
    datasets: [
      {
        label: "Hours",
        data: hoursByDate.map((item) => item.hours),
        borderColor: CHART_COLORS[0],
        backgroundColor: "rgba(37,99,235,0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const employeeBarData = {
    labels: hoursByEmployee.map((item) => item.employee),
    datasets: [
      {
        label: "Hours",
        data: hoursByEmployee.map((item) => item.hours),
        backgroundColor: CHART_COLORS[0],
      },
    ],
  };

  const activityPieData = {
    labels: hoursByActivity.slice(0, 6).map((item) => item.activity),
    datasets: [
      {
        data: hoursByActivity.slice(0, 6).map((item) => item.hours),
        backgroundColor: CHART_COLORS.slice(0, 6),
      },
    ],
  };

  const jobBarData = {
    labels: topJobs.map((item) => item.jobNo),
    datasets: [
      {
        label: "Hours",
        data: topJobs.map((item) => item.hours),
        backgroundColor: CHART_COLORS[4],
      },
    ],
  };

  const handleExportExcel = useCallback(() => {
    if (!filtered.length) {
      window.alert("No timesheet data available to export.");
      return;
    }

    const detailRows = filtered.map((item, index) => ({
      "Sr No": index + 1,
      Date: item.entryDate || "",
      "Employee ID": item.userId || "",
      Employee: item.userName || "",
      "Job No": item.jobNo || "",
      Activity: item.activity || "",
      "Activity Type": item.activityType || "",
      Description: item.description || "",
      "Start Time": item.startTime || "",
      "End Time": item.endTime || "",
      "Total Minutes": Number(item.totalMinutes || 0),
      Hours: minutesToHours(Number(item.totalMinutes || 0)),
      Billable: item.isBillable ? "Yes" : "No",
      "Entered At": item.enteredAt || "",
    }));

    const workbook = XLSX.utils.book_new();
    const detailSheet = XLSX.utils.json_to_sheet(detailRows);

    XLSX.utils.book_append_sheet(workbook, detailSheet, "Timesheet Detail");
    XLSX.writeFile(workbook, buildExportFileName(filters));
  }, [
    filtered,
    filters,
  ]);

  return (
    <div className="container-fluid py-4" style={{ paddingLeft: "16rem", marginTop: "3rem" }}>
      <div className="row gx-4 gy-4">
        <div className="col-12">
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body">
              <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-start">
                <div>
                  <span className="badge bg-info mb-2">Timesheet Dashboard</span>
                  <h1 className="h3">Timesheet Realtime Dashboard</h1>
                  <p className="text-muted mb-0">
                    Employee-wise, date-wise and activity-wise insights with live refresh.
                  </p>
                </div>
                <div className="d-flex flex-column flex-sm-row gap-2 align-items-sm-center">
                  <div className="small text-muted">
                    Last refresh:{" "}
                    <strong>{lastRefreshedAt ? lastRefreshedAt.toLocaleString() : "Not loaded"}</strong>
                  </div>
                  <button type="button" className="btn btn-success" onClick={handleExportExcel}>
                    <FiDownload className="me-2" /> Download Excel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => loadData(true)}>
                    <FiRefreshCw className={refreshing ? "me-2 spin" : "me-2"} /> Refresh now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">From Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filters.fromDate}
                    onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">To Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filters.toDate}
                    onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))}
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label">Employee</label>
                  <select
                    className="form-select"
                    value={filters.employee}
                    onChange={(e) => setFilters((prev) => ({ ...prev, employee: e.target.value }))}
                  >
                    {employees.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-2">
                  <label className="form-label">Activity</label>
                  <select
                    className="form-select"
                    value={filters.activity}
                    onChange={(e) => setFilters((prev) => ({ ...prev, activity: e.target.value }))}
                  >
                    {activities.map((item) => (
                      <option key={item} value={item}>
                        {item === "all" ? "All Activities" : item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-2">
                  <label className="form-label">Search</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Job / activity / description"
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="col-12">
            <div className="alert alert-danger d-flex align-items-start gap-3">
              <FiAlertCircle size={20} />
              <div>
                <strong>Dashboard load failed</strong>
                <div>{error}</div>
              </div>
            </div>
          </div>
        )}

        <div className="col-12">
          <div className="row g-3">
            <div className="col-sm-6 col-xl-4">
              <KpiCard title="Total Hours" value={`${minutesToHours(totalMinutes)} h`} hint="Selected period" icon={FiClock} />
            </div>
            <div className="col-sm-6 col-xl-4">
              <KpiCard title="Today Hours" value={`${minutesToHours(todayMinutes)} h`} hint="Current date only" icon={FiCalendar} />
            </div>
            <div className="col-sm-6 col-xl-4">
              <KpiCard title="Active Employees" value={String(activeEmployeesCount)} hint="With logged activity" icon={FiUsers} />
            </div>
            <div className="col-sm-6 col-xl-4">
              <KpiCard title="Activities" value={String(activeActivitiesCount)} hint="Unique work types" icon={FiActivity} />
            </div>
            <div className="col-sm-6 col-xl-4">
              <KpiCard title="Billable Mix" value={`${billablePct.toFixed(1)}%`} hint={`${minutesToHours(billableMinutes)} billable hours`} icon={FiTarget} />
            </div>
            <div className="col-sm-6 col-xl-4">
              <KpiCard title="Non Billable Hours" value={`${minutesToHours(nonBillableMinutes)} h`} hint={`${nonBillablePct.toFixed(1)}% of total`} icon={FiActivity} />
            </div>
            <div className="col-sm-6 col-xl-4">
              <KpiCard title="Avg / Employee" value={`${minutesToHours(avgPerEmployee)} h`} hint="Productivity average" icon={FiTrendingUp} />
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-8">
          <div className="card shadow-sm rounded-4">
            <div className="card-body">
              <h5 className="card-title">Top Employees By Hours</h5>
              <Bar
                data={employeeBarData}
                options={{ responsive: true, plugins: { legend: { display: false } }, indexAxis: "y" }}
              />
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card shadow-sm rounded-4">
            <div className="card-body">
              <h5 className="card-title">Top Jobs By Hours</h5>
              <Bar
                data={jobBarData}
                options={{ responsive: true, plugins: { legend: { display: false } }, indexAxis: "y" }}
              />
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card shadow-sm rounded-4">
            <div className="card-body">
              <h5 className="card-title">Date-Wise Employee Summary</h5>
              <div className="table-responsive" style={{ maxHeight: 420, overflowY: "auto" }}>
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Employee</th>
                      <th className="text-end">Hours</th>
                      <th className="text-end">Billable</th>
                      <th className="text-end">Non Billable</th>
                      <th className="text-end">Jobs</th>
                      <th className="text-end">Activities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateEmployeeSummary.map((row) => (
                      <tr key={`${row.date}-${row.employee}`}>
                        <td>{row.date}</td>
                        <td>{row.employee}</td>
                        <td className="text-end">{row.hours}</td>
                        <td className="text-end">{row.billableHours}</td>
                        <td className="text-end">{row.nonBillableHours}</td>
                        <td className="text-end">{row.jobs}</td>
                        <td className="text-end">{row.activities}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card shadow-sm rounded-4">
            <div className="card-body">
              <h5 className="card-title">Employee Summary</h5>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th className="text-end">Hours</th>
                      <th className="text-end">Billable</th>
                      <th className="text-end">Non Billable</th>
                      <th className="text-end">Utilization</th>
                      <th className="text-end">Jobs</th>
                      <th className="text-end">Activities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeDetail.map((row) => (
                      <tr key={row.employee}>
                        <td>{row.employee}</td>
                        <td className="text-end">{row.hours}</td>
                        <td className="text-end">{row.billableHours}</td>
                        <td className="text-end">{row.nonBillableHours}</td>
                        <td className="text-end">{row.utilization}</td>
                        <td className="text-end">{row.jobs}</td>
                        <td className="text-end">{row.acts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {(loading || refreshing) && (
          <div className="position-fixed bottom-0 end-0 m-4 bg-dark text-white rounded-4 px-4 py-3 shadow">
            {loading ? "Loading dashboard..." : "Refreshing dashboard..."}
          </div>
        )}
      </div>
    </div>
  );
}
