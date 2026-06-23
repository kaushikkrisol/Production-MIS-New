import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Form,
  Row,
  Col,
  Button,
  Alert,
  Spinner,
  Modal,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import axios from "axios";
import config from "../../../config";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaSyncAlt, FaUpload, FaDownload } from "react-icons/fa";
import Notification from "../../Notification/Notification";
import { AgGridReact } from "ag-grid-react";
import { all_routes } from "../../../Router/all_routes";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createPortal } from "react-dom";
import { getCompanyBranchDetails } from "./companyBranches";
import { findCustomerRecord, mergeFallbackCustomers } from "./customerFallbacks";
import {
  buildChallanItemPricing,
  formatAmount,
  getTotalJobValue,
} from "./hsnRateLookup";

import "./DataTables.css";

const formatDatePart = (value) => String(value).padStart(2, "0");

const formatDateDDMMYYYY = (dateValue = new Date()) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue || "";
  }

  return `${formatDatePart(date.getDate())}-${formatDatePart(date.getMonth() + 1)}-${date.getFullYear()}`;
};

/* =======================
   Timestamp cell
   ======================= */
const TimestampCell = (props) => {
  const { data, context } = props;
  const rowId = data?.id;
  if (!rowId) return null;

  const isLocked =
    !!data?.implementationTimestampUtc ||
    !!data?.ImplementationTimestampUtc ||
    !!data?.implementationTimestamp ||
    !!data?.ImplementationTimestamp;

  const initialIso =
    context?.rowTimestamps?.[rowId] ||
    data?.implementationTimestampUtc ||
    data?.ImplementationTimestampUtc ||
    data?.implementationTimestamp ||
    data?.ImplementationTimestamp ||
    "";

  const [draft, setDraft] = useState(initialIso ? new Date(initialIso) : null);

  useEffect(() => {
    const iso =
      context?.rowTimestamps?.[rowId] ||
      data?.implementationTimestampUtc ||
      data?.ImplementationTimestampUtc ||
      data?.implementationTimestamp ||
      data?.ImplementationTimestamp ||
      "";

    setDraft(iso ? new Date(iso) : null);
  }, [
    context,
    rowId,
    data?.implementationTimestampUtc,
    data?.ImplementationTimestampUtc,
    data?.implementationTimestamp,
    data?.ImplementationTimestamp,
  ]);

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{ display: "flex", gap: 6, alignItems: "center" }}
    >
      <DatePicker
        selected={draft}
        onChange={(date) => {
          if (isLocked) return;
          setDraft(date);
          context.setRowTimestamps((prev) => ({
            ...prev,
            [rowId]: date ? date.toISOString() : "",
          }));
        }}
        showTimeSelect
        timeIntervals={15}
        timeCaption="Time"
        dateFormat="yyyy-MM-dd HH:mm"
        placeholderText={isLocked ? "Locked" : "Pick date then time"}
        className="form-control form-control-sm"
        disabled={isLocked}
        readOnly={isLocked}
        isClearable={false}
        popperPlacement="bottom-start"
        popperContainer={({ children }) => createPortal(children, document.body)}
      />
    </div>
  );
};

const getAnyField = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

const isTruthyFlag = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const getImplementationChallanMeta = (row) => {
  const id = getAnyField(row, [
    "implementationChallanId",
    "ImplementationChallanId",
    "challanId",
    "ChallanId",
  ]);
  const no = getAnyField(row, [
    "implementationChallanNo",
    "ImplementationChallanNo",
    "challanNo",
    "ChallanNo",
  ]);
  const created = getAnyField(row, [
    "isImplementationChallanCreated",
    "IsImplementationChallanCreated",
  ]);

  return {
    id,
    no,
    isCreated: Boolean(id || no || isTruthyFlag(created)),
  };
};

/* =======================
   Implementation screen
   ======================= */
const Implementation = () => {
  const [locationAccData, setLocationAccData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalValues, setTotalValues] = useState({ width: 0, height: 0 });

  const [userList, setUserList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [locationId, setLocationId] = useState("");

  const [rowTimestamps, setRowTimestamps] = useState({});
  const [implementationDate, setImplementationDate] = useState("");

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [challanForm, setChallanForm] = useState({
    customerAddress: "",
    customerGstNo: "",
    storeAddress: "",
    cpName: "",
    productionLocation: "",
    jobValue: "",
    items: [],
  });

  const [selectedRows, setSelectedRows] = useState([]);
  const gridRef = useRef();

  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedLineItem, setSelectedLineItem] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [mediaType, setMediaType] = useState("Image");
  const [imageType, setImageType] = useState("After");
  const [personName, setPersonName] = useState("");
  const [contact, setContact] = useState("");
  const [authority, setAuthority] = useState("");

  const statusCacheRef = useRef(new Map());
  const statusQueueRef = useRef(null);

  // ✅ top toast state
  const [showTopToast, setShowTopToast] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState("");
  const [topToastVariant, setTopToastVariant] = useState("danger");

  const triggerTopToast = useCallback((message, variant = "danger") => {
    setTopToastMessage(message);
    setTopToastVariant(variant);
    setShowTopToast(true);
  }, []);

  /* =======================
     USER + LOCATION
     ======================= */
  useEffect(() => {
    const users = localStorage.getItem("users");
    if (users) {
      const usersObject = JSON.parse(users);
      setUsername(usersObject.message?.username || "");
      setLocationId(usersObject.message?.location_id || "");
    }
  }, []);

    const buildItemDetails = (row) => {
    const parts = [
      row.media,
      row.lamination,
      row.mounting,
      row.implementation,
      row.nameSubCode || row.visualCode,
    ].filter(Boolean);

    return parts.join(" - ");
  };

  const getNormalizedProductionLocation = useCallback(
    (row) => String(row?.region || row?.productionLocation || "").trim().toLowerCase(),
    []
  );

  const getNormalizedCustomerKey = useCallback(
    (row) => {
      const customer = findCustomerRecord(customers, row);
      return String(
        customer?.customeR_ID ||
          row?.customerId ||
          row?.customerid ||
          row?.CUSTOMER_ID ||
          row?.customeR_ID ||
          row?.customer_id ||
          row?.CustomerId ||
          customer?.customeR_NAME ||
          row?.customerName ||
          row?.customername ||
          row?.clientName ||
          row?.client ||
          row?.subClient ||
          ""
      )
        .trim()
        .toLowerCase();
    },
    [customers]
  );

  const getUniqueJobNos = useCallback(
    (rows) =>
      [...new Set(rows.map((row) => String(row?.jobNo || "").trim()).filter(Boolean))].join(", "),
    []
  );

 const getSelectedExactRows = useCallback(() => {
  const api = gridRef.current?.api;
  if (!api) return [];

  const visibleKeys = new Set();

  api.forEachNodeAfterFilterAndSort((node) => {
    if (node?.data?.__rowKey) {
      visibleKeys.add(node.data.__rowKey);
    }
  });

  return api
    .getSelectedRows()
    .filter((row) => row?.__rowKey && visibleKeys.has(row.__rowKey));
}, []);

  const handleOpenInvoicePreview = useCallback(() => {
   const effectiveSelectedData = getSelectedExactRows();
    if (!effectiveSelectedData.length) {
      triggerTopToast("Please select at least one row", "danger");
      return;
    }

    localStorage.setItem(
      "invoicePreviewBuilderData",
      JSON.stringify({
        sourceModule: "implementation",
        selectedRows: effectiveSelectedData,
        customers,
        username,
        locationId,
        createdAt: new Date().toISOString(),
      })
    );

    window.open(all_routes.invoicepreviewbuilder, "_blank");
  }, [customers, getSelectedExactRows, locationId, selectedRows, triggerTopToast, username]);

  const openImplementationChallanFromRow = useCallback(
    (row) => {
      const meta = getImplementationChallanMeta(row);
      const customer = findCustomerRecord(customers, row);
      const branchDetails = getCompanyBranchDetails(row?.region || row?.productionLocation);
      const pricing = buildChallanItemPricing(row);

      localStorage.setItem(
        "challanPreviewData",
        JSON.stringify({
          companyName: branchDetails.companyName,
          companyAddress: branchDetails.companyAddress,
          companyPhone: branchDetails.companyPhone,
          companyGst: branchDetails.companyGst,
          companyLogo: branchDetails.companyLogo,
          name: customer?.customeR_NAME || row?.client || "",
          address: row?.customerAddress || row?.CustomerAddress || row?.salonAddress || "",
          gstNo: customer?.gsT_NO || row?.customerGstNo || row?.CustomerGstNo || "",
          challanNo: meta.no,
          challanId: meta.id,
          challanDt: row?.challanDate || row?.ChallanDate || formatDisplayDate(new Date()),
          jobNo: row?.jobNo || "",
          jobValue: formatAmount(pricing.lineJobValue || row?.jobValue || row?.JobValue || 0),
          storeName: row?.storeName || row?.StoreName || row?.salonAddress || "",
          storeAddress: row?.storeAddress || row?.StoreAddress || row?.salonAddress || "",
          productionLocation: row?.productionLocation || row?.region || "",
          dispatchAddress: row?.dispatchAddress || "",
          remarks: row?.remarks || "",
          preparedBy: username,
          items: [
            {
              sno: 1,
              details: buildItemDetails(row),
              hsnCode: pricing.hsnCode,
              unitPrice: pricing.unitPrice,
              totalSqFt: pricing.totalSqFt,
              width: row?.width || "",
              height: row?.height || row?.length || "",
              size: `${row?.width || ""} X ${row?.height || row?.length || ""}`,
              quantity: String(row?.qty || 0),
              lineJobValue: pricing.lineJobValue,
            },
          ],
        })
      );

      window.open("/implementationchallan/", "_blank");
    },
    [customers, username]
  );

  const buildImplementationChallanForm = useCallback(
    (selectedData) => {
      const firstRow = selectedData[0];
      const customer = findCustomerRecord(customers, firstRow);
      const items = selectedData.map((row, index) => {
        const pricing = buildChallanItemPricing(row);

        return {
          rowId: row.implementationid || row.id || "",
          csId: row.id || "",
          jobNo: row.jobNo || "",
          sno: index + 1,
          details: buildItemDetails(row),
          hsnCode: pricing.hsnCode,
          unitPrice: pricing.unitPrice,
          totalSqFt: pricing.totalSqFt,
          width: row.width || "",
          height: row.height || row.length || "",
          size: `${row.width || ""} X ${row.height || row.length || ""}`,
          quantity: String(row.qty || 0),
          lineJobValue: pricing.lineJobValue,
        };
      });

      return {
        customerAddress: [
          customer?.billinG_ADD1,
          customer?.billinG_ADD2,
          `${customer?.billinG_CITY || ""}${
            customer?.billinG_CITY && customer?.billinG_PINCODE ? " - " : ""
          }${customer?.billinG_PINCODE || ""}`,
        ]
          .filter((x) => x && String(x).trim() !== "")
          .join(", "),
        customerGstNo: customer?.gsT_NO || "",
        storeAddress: firstRow?.salonAddress || "",
        cpName:
          firstRow?.contactPersonName ||
          firstRow?.contactPerson ||
          firstRow?.contactperson ||
          customer?.contacT_PERSON ||
          "",
        productionLocation: firstRow?.region || firstRow?.productionLocation || "",
        jobValue: formatAmount(getTotalJobValue(items)),
        items,
      };
    },
    [customers]
  );

  const handleOpenImplementationChallanModal = useCallback(() => {
  const effectiveSelectedData = getSelectedExactRows();

  if (!effectiveSelectedData.length) {
    triggerTopToast("Please select at least one row", "danger");
    return;
  }

  const uniqueLocations = [
    ...new Set(
      effectiveSelectedData
        .map((row) =>
          String(row?.productionLocation || row?.ProductionLocation || row?.region || "")
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    ),
  ];

  if (uniqueLocations.length > 1) {
    triggerTopToast(
      `Please select line items from the same production location only. Selected: ${uniqueLocations.join(", ")}`,
      "warning"
    );
    return;
  }

  const uniqueCustomers = [
    ...new Set(
      effectiveSelectedData
        .map((row) => getNormalizedCustomerKey(row))
        .filter(Boolean)
    ),
  ];

  if (uniqueCustomers.length > 1) {
    triggerTopToast(
      "Please select line items for the same customer only",
      "warning"
    );
    return;
  }

  setChallanForm(buildImplementationChallanForm(effectiveSelectedData));
  setShowChallanModal(true);
}, [
  getSelectedExactRows,
  triggerTopToast,
  buildImplementationChallanForm,
  getNormalizedCustomerKey,
]);

  const validateImplementationChallanForm = useCallback(() => {
    if (!challanForm.customerAddress?.trim()) {
      triggerTopToast("Please enter address", "danger");
      return false;
    }
    if (!challanForm.storeAddress?.trim()) {
      triggerTopToast("Please enter store address", "danger");
      return false;
    }
    if (!challanForm.customerGstNo?.trim()) {
      triggerTopToast("Please enter GST No", "danger");
      return false;
    }
    if (!String(challanForm.jobValue || "").trim() || Number(challanForm.jobValue || 0) <= 0) {
      triggerTopToast("Please enter Job Value", "danger");
      return false;
    }
    return true;
  }, [challanForm, triggerTopToast]);

  /* =======================
     USER LIST
     ======================= */
  useEffect(() => {
    if (locationId) {
      axios
        .post(config.User.URL.GetAllUserAccToLocation, { locationId })
        .then((res) => setUserList(res.data || []))
        .catch(console.error);
    }
  }, [locationId]);


    const formatDisplayDate = (dateVal) => {
      if (!dateVal) return "";
      return formatDateDDMMYYYY(dateVal);
    };

  const handleNameChange = (e) => setName(e.target.value);

  const openUploadModalForRow = (row) => {
    setSelectedJob({ jobNo: row.jobNo });
    setSelectedLineItem(row);

    setUploadFiles([]);
    setMediaType("Image");
    setImageType("After");
    setPersonName("");
    setContact("");
    setAuthority("");
    setShowModal(true);
  };

  const handleSelectionChanged = useCallback(() => {
    setSelectedRows(getSelectedExactRows());
  }, [getSelectedExactRows]);

const handleSelectFilteredRows = useCallback(() => {
  const api = gridRef.current?.api;
  if (!api) return;

  api.deselectAll();

  api.forEachNodeAfterFilterAndSort((node) => {
    node.setSelected(true);
  });

  setTimeout(() => {
    setSelectedRows(getSelectedExactRows());
  }, 0);
}, [getSelectedExactRows]);

 const handleClearSelection = useCallback(() => {
  const api = gridRef.current?.api;
  if (!api) return;

  api.deselectAll();
  setSelectedRows([]);
}, []);

//   const saveImplementationTimestampForRows = useCallback(
//   async (rows) => {
//     const unlockedRows = rows.filter((row) => {
//       const locked =
//         !!row?.implementationTimestampUtc ||
//         !!row?.ImplementationTimestampUtc ||
//         !!row?.implementationTimestamp ||
//         !!row?.ImplementationTimestamp;
//       return !locked;
//     });

//     if (!unlockedRows.length) return;

//     const rowsWithoutTimestamp = unlockedRows.filter(
//       (row) => !rowTimestamps[row.id]
//     );

//     if (rowsWithoutTimestamp.length) {
//       throw new Error(
//         `Please select timestamp for all selected rows before creating challan. Missing Job No: ${rowsWithoutTimestamp
//           .map((x) => x.jobNo)
//           .join(", ")}`
//       );
//     }

//     await Promise.all(
//       unlockedRows.map((row) =>
//         axios.post(config.Implementation.URL.UpdateTimestamp, {
//           id: row.id,
//           jobNo: row.jobNo,
//           timestampUtc: rowTimestamps[row.id],
//           updatedBy: username,
//         })
//       )
//     );

//     const selectedIds = new Set(unlockedRows.map((x) => x.id));

//     setLocationAccData((prev) =>
//       prev.map((r) =>
//         selectedIds.has(r.id)
//           ? {
//               ...r,
//               implementationTimestampUtc: rowTimestamps[r.id],
//               implementationTimestamp: rowTimestamps[r.id],
//               IsImplementationDone: "1",
//             }
//           : r
//       )
//     );
//   },
//   [rowTimestamps, username]
// );

  /* =======================
     SAVE TIMESTAMP API
     ======================= */


     const saveTimestampBeforeChallan = useCallback(
  async (rows) => {
    const unlockedRows = rows.filter((row) => {
      const locked =
        !!row?.implementationTimestampUtc ||
        !!row?.ImplementationTimestampUtc ||
        !!row?.implementationTimestamp ||
        !!row?.ImplementationTimestamp;
      return !locked;
    });

    if (!unlockedRows.length) return;

    const nowIsoUtc = new Date().toISOString();

    await Promise.all(
      unlockedRows.map((row) =>
        axios.post(config.Implementation.URL.UpdateTimestamp, {
          id: row.id,
          jobNo: row.jobNo,
          timestampUtc: nowIsoUtc,
          updatedBy: username,
        })
      )
    );

    const selectedIds = new Set(unlockedRows.map((x) => x.id));

    setRowTimestamps((prev) => {
      const updated = { ...prev };
      unlockedRows.forEach((row) => {
        updated[row.id] = nowIsoUtc;
      });
      return updated;
    });

    setLocationAccData((prev) =>
      prev.map((r) =>
        selectedIds.has(r.id)
          ? {
              ...r,
              implementationTimestampUtc: nowIsoUtc,
              implementationTimestamp: nowIsoUtc,
              IsImplementationDone: "1",
            }
          : r
      )
    );
  },
  [username]
);
  const saveTimestamp = useCallback(
    async (rowId, isoUtc, row) => {
      try {
        setError(null);

        const alreadyLocked =
          !!row?.implementationTimestampUtc ||
          !!row?.ImplementationTimestampUtc ||
          !!row?.implementationTimestamp ||
          !!row?.ImplementationTimestamp;

        if (alreadyLocked) {
          triggerTopToast(
            `Timestamp already saved for Job ${row?.jobNo || rowId}`,
            "warning"
          );
          return;
        }

        await axios.post(config.Implementation.URL.UpdateTimestamp, {
          id: rowId,
          timestampUtc: isoUtc || null,
          updatedBy: username,
        });

        setLocationAccData((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? {
                  ...r,
                  implementationTimestampUtc: isoUtc,
                  implementationTimestamp: isoUtc,
                }
              : r
          )
        );

        setNotificationMessage(
          `Implementation timestamp saved for Job ${row?.jobNo || rowId}`
        );
        setShowNotification(true);

        setTimeout(() => {
          gridRef.current?.api?.refreshCells({ force: true });
        }, 0);
      } catch (e) {
        console.error(e);
        setError(e?.response?.data?.toString?.() || "Failed to save timestamp");
      }
    },
    [username, triggerTopToast]
  );



  /* =======================
     BULK SAVE TIMESTAMP
     ======================= */
  // const handleBulkSaveTimestamp = useCallback(async () => {
  //   try {
  //     setError(null);

  //     if (!bulkTimestamp) {
  //       triggerTopToast("Please select bulk implementation timestamp", "danger");
  //       return;
  //     }

  //     const selected = getSelectedExactRows();

  //     if (!selected.length) {
  //       triggerTopToast("Please select at least one row", "danger");
  //       return;
  //     }

  //     const unlockedRows = selected.filter((row) => {
  //       const locked =
  //         !!row?.implementationTimestampUtc ||
  //         !!row?.ImplementationTimestampUtc ||
  //         !!row?.implementationTimestamp ||
  //         !!row?.ImplementationTimestamp;
  //       return !locked;
  //     });

  //     if (!unlockedRows.length) {
  //       triggerTopToast("All selected rows already have timestamp locked", "warning");
  //       return;
  //     }

  //     setBulkSaving(true);

  //     const isoUtc = bulkTimestamp.toISOString();
  //     const selectedIds = new Set(unlockedRows.map((x) => x.id));

  //     setRowTimestamps((prev) => {
  //       const updated = { ...prev };
  //       unlockedRows.forEach((row) => {
  //         updated[row.id] = isoUtc;
  //       });
  //       return updated;
  //     });

  //     await Promise.all(
  //       unlockedRows.map((row) =>
  //         axios.post(config.Implementation.URL.UpdateTimestamp, {
  //           id: row.id,
  //           timestampUtc: isoUtc,
  //           updatedBy: username,
  //         })
  //       )
  //     );

  //     setLocationAccData((prev) =>
  //       prev.map((r) =>
  //         selectedIds.has(r.id)
  //           ? {
  //               ...r,
  //               implementationTimestampUtc: isoUtc,
  //               implementationTimestamp: isoUtc,
  //             }
  //           : r
  //       )
  //     );

  //     setNotificationMessage(
  //       `Implementation timestamp saved for ${unlockedRows.length} selected row(s)`
  //     );
  //     setShowNotification(true);
  //     setBulkTimestamp(null);

  //     setTimeout(() => {
  //       gridRef.current?.api?.refreshCells({ force: true });
  //     }, 0);
  //   } catch (e) {
  //     console.error(e);
  //     setError(
  //       e?.response?.data?.toString?.() || "Failed to bulk save timestamp"
  //     );
  //   } finally {
  //     setBulkSaving(false);
  //   }
  // }, [bulkTimestamp, username, getSelectedExactRows, triggerTopToast]);


  const fetchCustomerDetails = useCallback(async () => {
  try {
    if (!locationId) return;

    const response = await axios.post(
      config.JobSummary.URL.Getallcustomer,
      { locationid: locationId },
      {
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      }
    );

    setCustomers(mergeFallbackCustomers(response.data));
  } catch (error) {
    console.error(
      "Error fetching customer data:",
      error.response ? error.response.data : error.message
    );
  }
}, [locationId]);

  const fetchUploadStatusById = useCallback(async (id) => {
    const url = `${config.ImplementationUpload.URL.ImageStatusById}${encodeURIComponent(id)}`;
    const { data } = await axios.get(url);

    return {
      isUploaded: data?.isUploaded ?? data?.IsUploaded ?? false,
      uploadedFilesCount: data?.imagesCount ?? data?.ImagesCount ?? 0,
      uploadedAtUtc: data?.uploadedAtUtc ?? data?.UploadedAtUtc ?? null,
    };
  }, []);

  /* =======================
     Only current page ids
     ======================= */
  const getCurrentPageRowIds = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return [];

    const pageSize = api.paginationGetPageSize ? api.paginationGetPageSize() : 25;
    const currentPage = api.paginationGetCurrentPage ? api.paginationGetCurrentPage() : 0;

    const start = currentPage * pageSize;
    const end = Math.min(start + pageSize, api.getDisplayedRowCount());

    const ids = [];
    for (let i = start; i < end; i++) {
      const node = api.getDisplayedRowAtIndex(i);
      const id = node?.data?.id;
      if (id) ids.push(id);
    }
    return ids;
  }, []);

  const loadStatusesForIds = useCallback(
    async (ids) => {
      if (!ids?.length) return;

      const need = [];
      for (const id of ids) {
        if (!statusCacheRef.current.has(id)) need.push(id);
      }
      if (!need.length) return;

      const CONCURRENCY = 8;
      let idx = 0;

      const worker = async () => {
        while (idx < need.length) {
          const id = need[idx++];
          try {
            const status = await fetchUploadStatusById(id);
            statusCacheRef.current.set(id, status);
          } catch (err) {
            console.error("Status fetch failed for id:", id, err);
          }
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, worker));

      setLocationAccData((prev) =>
        prev.map((r) => {
          const s = statusCacheRef.current.get(r.id);
          return s ? { ...r, ...s } : r;
        })
      );
    },
    [fetchUploadStatusById]
  );

  /* =======================
     Fetch grid rows
     ======================= */
 const fetchImplementationAccToLocation = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);

    statusCacheRef.current.clear();

    const payload = { locationId, username };
    const res = await axios.post(
      config.Implementation.URL.GetAllImplementationAccToLocation,
      payload
    );

    const rows = (res.data || []).map((row, index) => ({
      ...row,
      __rowKey: `${row.id || row.implementationid || row.jobNo || "row"}-${index}`,
    }));

    setLocationAccData(rows);
    setSelectedRows([]);

    const map = {};
    rows.forEach((r) => {
      if (!r?.id) return;

      const iso =
        r.implementationTimestampUtc ||
        r.ImplementationTimestampUtc ||
        r.implementationTimestamp ||
        r.ImplementationTimestamp ||
        "";

      if (iso) map[r.id] = iso;
    });

    setRowTimestamps(map);

    const totals = rows.reduce(
      (acc, row) => {
        acc.width += parseFloat(row.width || 0);
        acc.height += parseFloat(row.height || 0);
        return acc;
      },
      { width: 0, height: 0 }
    );

    setTotalValues(totals);
  } catch (err) {
    console.error(err);
    setError("Failed to fetch implementation data");
  } finally {
    setLoading(false);
  }
}, [locationId, username]); 



useEffect(() => {
  if (locationId && username) {
    fetchImplementationAccToLocation();
    fetchCustomerDetails();
  }
}, [locationId, username, fetchImplementationAccToLocation, fetchCustomerDetails]);



const handleCreateImplementationChallan = async () => {
  try {
    if (!validateImplementationChallanForm()) return;

 const effectiveSelectedData = getSelectedExactRows();

    if (!effectiveSelectedData.length) {
      triggerTopToast("Please select at least one row", "danger");
      return;
    }

    const firstRow = effectiveSelectedData[0];

    const selectedCustomerId =
      firstRow.customerId ||
      firstRow.customerid ||
      firstRow.CUSTOMER_ID ||
      firstRow.customeR_ID ||
      firstRow.customer_id ||
      firstRow.CustomerId ||
      "";

    const customer = findCustomerRecord(customers, firstRow);
    const branchDetails = getCompanyBranchDetails(
      firstRow.region || firstRow.productionLocation
    );

    const customerName =
      customer?.customeR_NAME ||
      firstRow.customerName ||
      firstRow.customername ||
      firstRow.clientName ||
      firstRow.client ||
      firstRow.subClient ||
      "";

    const contactPersonPhone =
      firstRow.contactPersonPhone ||
      firstRow.contactPhone ||
      customer?.mobilE_NO ||
      customer?.phone ||
      customer?.phonE_NO ||
      customer?.contacT_NO ||
      "";

    const challanPayload = {
      challanDate: formatDateDDMMYYYY(),

      companyName: branchDetails.companyName,
      companyAddress: branchDetails.companyAddress,
      companyPhone: branchDetails.companyPhone,
      companyGst: branchDetails.companyGst,
      companyLogo: branchDetails.companyLogo,

      customerId: String(selectedCustomerId || ""),
      customerName,
      customerAddress: challanForm.customerAddress,
      customerGstNo: challanForm.customerGstNo,

      projectName: firstRow.visualCode || "",
      cpName: challanForm.cpName,
      contactPersonPhone,

      jobNo: getUniqueJobNos(effectiveSelectedData),
      jobValue: challanForm.jobValue,
      poNo: firstRow.poNo || firstRow.lpono || "",
      poDate: formatDisplayDate(firstRow.poDate || firstRow.lpodate),

      storeName: firstRow.storeName || firstRow.city || "",
      storeAddress: challanForm.storeAddress,
      productionLocation:
        challanForm.productionLocation || firstRow.region || firstRow.productionLocation || "",
      dispatchAddress: firstRow.dispatchAddress || "",
      remarks: firstRow.remarks || "",

      preparedBy: username || "",
      receivedBy: "",
      receivedDate: "",

      locationId: String(locationId || ""),
      createdBy: username || "",

      items: challanForm.items.map((item) => ({
        ...item,
        csId: item.csId || item.rowId,
        hsnCode: item.hsnCode || "",
        unitPrice: Number(item.unitPrice || 0),
        lineJobValue: Number(item.lineJobValue || 0),
      })),
    };

    const response = await axios.post(
      config.Implementation.URL.CreateImplementationChallan,
      challanPayload,
      { headers: { "Content-Type": "application/json" } }
    );

    const savedChallan = response.data;
    const savedItems = savedChallan.items || savedChallan.Items || [];
    const previewItems = (Array.isArray(savedItems) && savedItems.length ? savedItems : challanPayload.items || []).map(
      (item, index) => ({
        ...(challanPayload.items?.[index] || {}),
        ...item,
        hsnCode: item.hsnCode || item.HsnCode || challanPayload.items?.[index]?.hsnCode || "",
        unitPrice: item.unitPrice ?? item.UnitPrice ?? challanPayload.items?.[index]?.unitPrice ?? 0,
        totalSqFt: item.totalSqFt ?? item.TotalSqFt ?? challanPayload.items?.[index]?.totalSqFt ?? 0,
        lineJobValue:
          item.lineJobValue ??
          item.LineJobValue ??
          item.jobValue ??
          item.JobValue ??
          challanPayload.items?.[index]?.lineJobValue ??
          0,
      })
    );

    localStorage.setItem(
      "challanPreviewData",
      JSON.stringify({
        companyName: savedChallan.companyName || savedChallan.CompanyName || challanPayload.companyName,
        companyAddress: savedChallan.companyAddress || savedChallan.CompanyAddress || challanPayload.companyAddress,
        companyPhone: savedChallan.companyPhone || savedChallan.CompanyPhone || challanPayload.companyPhone,
        companyGst: savedChallan.companyGst || savedChallan.CompanyGst || challanPayload.companyGst,
        companyLogo: savedChallan.companyLogo || savedChallan.CompanyLogo || challanPayload.companyLogo,
        name: savedChallan.customerName || savedChallan.CustomerName || challanPayload.customerName,
        address: savedChallan.customerAddress || savedChallan.CustomerAddress || challanPayload.customerAddress,
        gstNo: savedChallan.customerGstNo || savedChallan.CustomerGstNo || challanPayload.customerGstNo,
        projectName: savedChallan.projectName || savedChallan.ProjectName || challanPayload.projectName,
        cpName: savedChallan.cpName || savedChallan.CpName || challanPayload.cpName,
        contactPersonPhone: savedChallan.contactPersonPhone || savedChallan.ContactPersonPhone || challanPayload.contactPersonPhone,
        challanNo: savedChallan.challanNo || savedChallan.ChallanNo,
        challanDt: savedChallan.challanDate || savedChallan.ChallanDate,
        jobNo: savedChallan.jobNo || savedChallan.JobNo || challanPayload.jobNo,
        jobValue: savedChallan.jobValue || savedChallan.JobValue || challanPayload.jobValue,
        poNo: savedChallan.poNo || savedChallan.PoNo || challanPayload.poNo,
        poDate: savedChallan.poDate || savedChallan.PoDate || challanPayload.poDate,
        storeName: savedChallan.storeName || savedChallan.StoreName || challanPayload.storeName,
        storeAddress: savedChallan.storeAddress || savedChallan.StoreAddress || challanPayload.storeAddress,
        productionLocation: savedChallan.productionLocation || savedChallan.ProductionLocation || challanPayload.productionLocation,
        dispatchAddress: savedChallan.dispatchAddress || savedChallan.DispatchAddress || challanPayload.dispatchAddress,
        remarks: savedChallan.remarks || savedChallan.Remarks || challanPayload.remarks,
        preparedBy: savedChallan.preparedBy || savedChallan.PreparedBy || challanPayload.preparedBy,
        receivedBy: savedChallan.receivedBy || savedChallan.ReceivedBy,
        receivedDate: savedChallan.receivedDate || savedChallan.ReceivedDate,
        items: previewItems,
      })
    );

    setShowChallanModal(false);
    await fetchImplementationAccToLocation();
    window.open(`/implementationchallan/`, "_blank");

    triggerTopToast(
      `Implementation challan created: ${savedChallan.challanNo || savedChallan.ChallanNo}`,
      "success"
    );
  } catch (error) {
    console.error("Error creating implementation challan:", error);
    triggerTopToast(
      error?.response?.data || error?.message || "Failed to create implementation challan",
      "danger"
    );
  }
};

  /* =======================
     Add Implementation Job
     ======================= */
  const handleAddImplementationJob = async (e) => {
    e.preventDefault();
    setError(null);

    const selectedGridRows = getSelectedExactRows();

    if (!selectedGridRows.length) {
      triggerTopToast("Please select at least one job.", "danger");
      return;
    }

    const jobs = selectedGridRows.map((row) => ({
      ...row,
      enteredby: row.enteredby || username,
      lstupateby: username,
      username: username,
      implementationBy: row.implementationBy || username,
      implementationDate: implementationDate,
      assignName: name,
    }));

    try {
      setLoading(true);
      const response = await axios.post(
        config.Implementation.URL.AddImplementation,
        jobs
      );

      if (response.status === 200) {
        await fetchImplementationAccToLocation();
        setNotificationMessage("Implementation jobs added successfully");
        setShowNotification(true);
      } else {
        setError("Unexpected response from server.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to submit implementation job");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     FIRST ROW PER JOB (PDF)
     ======================= */
  const firstRowIdByJob = useMemo(() => {
    const seen = new Set();
    const keep = new Set();
    for (const r of locationAccData) {
      if (!seen.has(r.jobNo)) {
        seen.add(r.jobNo);
        if (r.id != null) keep.add(r.id);
      }
    }
    return keep;
  }, [locationAccData]);

  const buildPdfUrl = (row) => {
    const base = config.downloadPDF?.URL?.GetPdf || "";
    if (!base || !row?.jobNo) return null;
    const encodedJob = encodeURIComponent(row.jobNo);
    return base.endsWith("/") ? `${base}${encodedJob}` : `${base}/${encodedJob}`;
  };

  const openPdfDirect = (row) => {
    const url = buildPdfUrl(row);
    if (!url) {
      setError("PDF endpoint is not configured.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  /* =======================
     UPLOAD HANDLER
     ======================= */
  const handleUpload = async () => {
    if (!uploadFiles?.length || !selectedJob || !selectedLineItem) {
      triggerTopToast("Please select a line item and a file.", "danger");
      return;
    }

    const jobNoValue = selectedJob?.jobNo || selectedLineItem?.jobNo;
    const isSignature = mediaType === "Signature";
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    const userName = users?.message?.username || "";

    const payload = {
      id: selectedLineItem.id,
      jobNo: jobNoValue,
      record: { ...selectedLineItem },
      uploadMeta: {
        mediaType,
        imageType: mediaType === "Image" ? imageType : null,
        signature: isSignature ? { personName, contact, authority } : null,
      },
    };

    const formData = new FormData();
    uploadFiles.forEach((f) => formData.append("files", f));
    formData.append("jobNo", jobNoValue);
    formData.append("enteredby", userName);
    formData.append("jsonData", JSON.stringify([payload]));

    try {
      await axios.post(config.ImplementationUpload.URL.Upload, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const status = await fetchUploadStatusById(selectedLineItem.id);

      setLocationAccData((prev) =>
        prev.map((r) => (r.id === selectedLineItem.id ? { ...r, ...status } : r))
      );

      statusCacheRef.current.set(selectedLineItem.id, status);

      setTimeout(() => {
        gridRef.current?.api?.refreshCells({ force: true });
      }, 0);

      setShowModal(false);
      setNotificationMessage(`Upload successful for Job ${jobNoValue}`);
      setShowNotification(true);
    } catch (e) {
      console.error(e);
      triggerTopToast(e?.response?.data || "Upload failed", "danger");
    }
  };

  /* =======================
     Column definitions
     ======================= */
  const columnDefs = useMemo(
    () => [
      {
        checkboxSelection: true,
        headerCheckboxSelection: true,
        field: "jobNo",
        headerName: "Job No",
        filter: true,
        minWidth: 160,
      },
      { field: "client", headerName: "Client", filter: true, minWidth: 160 },
      { field: "userName", headerName: "Account Manager", filter: true, minWidth: 180 },
      { field: "subClient", headerName: "Sub Client", filter: true, minWidth: 160 },
      { field: "qty", headerName: "Qty", minWidth: 100 },
      {
        field: "region",
        headerName: "Region",
        minWidth: 140,
        filter: true,
        valueGetter: (params) => params.data?.region || "",
      },
      {
        field: "productionLocation",
        headerName: "Production Location",
        minWidth: 180,
        filter: true,
        valueGetter: (params) => params.data?.region || params.data?.productionLocation || "",
      },
      { field: "media", headerName: "Media", filter: true, minWidth: 160 },
      { field: "mounting", headerName: "Mounting", filter: true, minWidth: 160 },
      { field: "salonAddress", headerName: "Salon / Store Address", minWidth: 220, filter: true },
      { field: "deadline", headerName: "Job Deadline", minWidth: 160, filter: true },
      { field: "implementation", headerName: "Implementation", minWidth: 160, filter: true },
      { field: "width", minWidth: 110, headerName: "Width" },
      { field: "height", minWidth: 110, headerName: "Length" },
      { field: "totalSqFt", minWidth: 130, headerName: "Total Sq Ft" },
      { field: "implementationDate", minWidth: 160, headerName: "Assigned Date" },
      { field: "assignName", minWidth: 160, headerName: "Assigned To" },
      { field: "remarks", minWidth: 160, headerName: "Remarks", filter: true },

      {
        field: "isUploaded",
        headerName: "Uploaded",
        minWidth: 120,
        cellRenderer: (params) => {
          const v = params.data?.isUploaded;
          if (v === null || v === undefined) {
            return <span title="Loading...">…</span>;
          }
          return (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2em",
              }}
              title={v ? "File Uploaded" : "Not Uploaded"}
            >
              {v ? "✅" : "❌"}
            </span>
          );
        },
        filter: true,
        sortable: true,
      },

      {
        headerName: "Implementation Timestamp",
        colId: "timestamp",
        minWidth: 240,
        cellRenderer: TimestampCell,
        sortable: false,
        filter: false,
        suppressMenu: true,
      },
      {
        headerName: "Implementation Challan",
        minWidth: 210,
        filter: false,
        sortable: false,
        cellRenderer: (params) => {
          const meta = getImplementationChallanMeta(params.data);

          if (!meta.isCreated) return "-";

          return (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => openImplementationChallanFromRow(params.data)}
            >
              {meta.no || "View Challan"}
            </button>
          );
        },
      },

      {
        headerName: "Actions",
        colId: "actions",
        cellRenderer: (params) => (
          <div className="d-flex gap-2">
            <Button
              size="sm"
              variant="success"
              onClick={() => openUploadModalForRow(params.data)}
            >
              <FaUpload /> Upload
            </Button>

            {firstRowIdByJob.has(params.data.id) && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => openPdfDirect(params.data)}
                title="Download PDF"
              >
                <FaDownload /> PDF
              </Button>
            )}
          </div>
        ),
        filter: false,
        sortable: false,
        suppressMenu: true,
        minWidth: 230,
        flex: 0,
      },
    ],
    [firstRowIdByJob, openImplementationChallanFromRow]
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      filter: "agTextColumnFilter",
      flex: 1,
    }),
    []
  );

  const handleExportExcel = () => gridRef.current?.api?.exportDataAsExcel?.();
  const handleExportCSV = () => gridRef.current?.api?.exportDataAsCsv?.();

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return locationAccData;
    return locationAccData.filter((r) =>
      (r.jobNo || "").toLowerCase().includes(term)
    );
  }, [locationAccData, searchTerm]);

  return (
    <div className="p-3">
      <style>{`
        .implementation-challan-modal-root{z-index:2000 !important;}
        .implementation-challan-backdrop{z-index:1990 !important;}
        .implementation-challan-modal-root .modal-dialog{
          max-width:min(1100px,72vw);
          margin:1.75rem 2rem 1.75rem auto;
        }
        .implementation-challan-modal-root .form-control[readonly]{
          white-space:normal;
          overflow-wrap:anywhere;
        }
      `}</style>
      {/* ✅ Top Center Toast */}
      <ToastContainer
        position="top-center"
        className="p-3"
        style={{ zIndex: 99999, marginTop: "20px" }}
      >
        <Toast
          show={showTopToast}
          onClose={() => setShowTopToast(false)}
          delay={2500}
          autohide
          bg={topToastVariant}
        >
          <Toast.Header closeButton>
            <strong className="me-auto">
              {topToastVariant === "warning"
                ? "Warning"
                : topToastVariant === "success"
                ? "Success"
                : "Error"}
            </strong>
          </Toast.Header>
          <Toast.Body className={topToastVariant === "warning" ? "text-dark" : "text-white"}>
            {topToastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <Row className="mb-3" style={{ marginTop: "5rem", marginLeft: "15rem" }}>
        <Col>
          <Form.Group>
            <Form.Label style={{ width: "200px" }}>Assigned Name</Form.Label>
            <Form.Select value={name} onChange={handleNameChange}>
              <option value="">Select Assigned Name</option>
              {[...new Set(userList)].map((u, i) => (
                <option key={i} value={u}>
                  {u}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        <Col>
          <Form.Group controlId="formImplementationDate">
            <Form.Label style={{ width: "200px" }}>Assigned Date</Form.Label>
            <Form.Control
              type="date"
              value={implementationDate}
              onChange={(e) => setImplementationDate(e.target.value)}
            />
          </Form.Group>
        </Col>

        <Col>
          <Button
            type="submit"
            variant="primary"
            style={{ cursor: "pointer", marginTop: "2em" }}
            onClick={handleAddImplementationJob}
          >
            Add
          </Button>
        </Col>

        <Col>
          <Button variant="outline-secondary" onClick={fetchImplementationAccToLocation}>
            <FaSyncAlt />
          </Button>
        </Col>

        <Col>
          <Form.Control
            placeholder="Search Job No"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Col>

        <Col>
          <Button onClick={handleExportExcel}>Export Excel</Button>
        </Col>

        <Col>
          <Button onClick={handleExportCSV}>Export CSV</Button>
        </Col>
      </Row>
<Row className="mb-3 align-items-end" style={{ marginLeft: "15rem", width: "86%" }}>
  <Col md={12} className="d-flex gap-2 flex-wrap">
    <Button variant="secondary" onClick={handleSelectFilteredRows}>
      Select Filtered Rows
    </Button>

    <Button variant="outline-secondary" onClick={handleClearSelection}>
      Clear Selection
    </Button>

    <Button variant="primary" onClick={handleOpenImplementationChallanModal}>
      Create Challan
    </Button>

    <Button variant="success" onClick={handleOpenInvoicePreview}>
      Invoice Preview
    </Button>
  </Col>
</Row>

      {loading && <Spinner animation="border" />}
      {error && <Alert variant="danger">{error}</Alert>}

      <div
        className="ag-theme-alpine custom-ag-grid"
        style={{ height: "600px", width: "86%", marginLeft: "16rem" }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={filteredRows}
          columnDefs={columnDefs}
          immutableData={true}
          getRowId={(params) => params.data.__rowKey}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={25}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          stopEditingWhenCellsLoseFocus={true}
          onSelectionChanged={handleSelectionChanged}
          context={{
            rowTimestamps,
            setRowTimestamps,
            // saveTimestamp,
          }}
          onFirstDataRendered={() => {
            setTimeout(() => loadStatusesForIds(getCurrentPageRowIds()), 0);
          }}
          onPaginationChanged={() => {
            clearTimeout(statusQueueRef.current);
            statusQueueRef.current = setTimeout(() => {
              loadStatusesForIds(getCurrentPageRowIds());
            }, 150);
          }}
        />
      </div>

      {showNotification && (
        <Notification
          headline="Implementation Alert!"
          message={notificationMessage ? [notificationMessage] : []}
          onClose={() => setShowNotification(false)}
          show={showNotification}
          containerBg="rgba(116, 143, 231, 0.445)"
          bgColor="blue"
          headerColor="#5b79ff"
        />
      )}

      <Modal
        show={showChallanModal}
        onHide={() => setShowChallanModal(false)}
        centered
        size="xl"
        fullscreen="lg-down"
        className="implementation-challan-modal-root"
        backdropClassName="implementation-challan-backdrop"
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Implementation Challan</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "80vh", overflowY: "auto" }}>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={challanForm.customerAddress}
                  onChange={(e) =>
                    setChallanForm((prev) => ({
                      ...prev,
                      customerAddress: e.target.value,
                    }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Store Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={challanForm.storeAddress}
                  onChange={(e) =>
                    setChallanForm((prev) => ({
                      ...prev,
                      storeAddress: e.target.value,
                    }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>GST No</Form.Label>
                <Form.Control
                  value={challanForm.customerGstNo}
                  onChange={(e) =>
                    setChallanForm((prev) => ({
                      ...prev,
                      customerGstNo: e.target.value,
                    }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Job Value</Form.Label>
                <Form.Control
                  value={challanForm.jobValue}
                  placeholder="Enter Job Value"
                  onChange={(e) =>
                    setChallanForm((prev) => ({
                      ...prev,
                      jobValue: e.target.value,
                    }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Contact Person</Form.Label>
                <Form.Control
                  value={challanForm.cpName}
                  onChange={(e) =>
                    setChallanForm((prev) => ({
                      ...prev,
                      cpName: e.target.value,
                    }))
                  }
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Production Location</Form.Label>
                <Form.Control value={challanForm.productionLocation} readOnly />
              </Form.Group>
            </Col>
          </Row>

          <div className="mt-4">
            <h6 className="mb-3">Selected Items</h6>
            {challanForm.items.map((item, index) => (
              <Row key={`${item.rowId}-${index}`} className="g-3 mb-2 align-items-end">
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Job No</Form.Label>
                    <Form.Control value={item.jobNo} readOnly />
                  </Form.Group>
                </Col>
                <Col md={7}>
                  <Form.Group>
                    <Form.Label>Details</Form.Label>
                    <Form.Control as="textarea" rows={4} value={item.details} readOnly />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>HSN</Form.Label>
                    <Form.Control
                      value={item.hsnCode}
                      placeholder="Enter HSN"
                      onChange={(e) =>
                        setChallanForm((prev) => ({
                          ...prev,
                          items: prev.items.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? { ...currentItem, hsnCode: e.target.value }
                              : currentItem
                          ),
                        }))
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Rate / Sq Ft</Form.Label>
                    <Form.Control value={formatAmount(item.unitPrice)} readOnly />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Sq Ft</Form.Label>
                    <Form.Control value={formatAmount(item.totalSqFt)} readOnly />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Line Value</Form.Label>
                    <Form.Control value={formatAmount(item.lineJobValue)} readOnly />
                  </Form.Group>
                </Col>
              </Row>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowChallanModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateImplementationChallan}>
            Create Challan
          </Button>
        </Modal.Footer>
      </Modal>

      <div className="mt-3 text-end">
        <strong>Total Width:</strong> {totalValues.width} |{" "}
        <strong>Total Height:</strong> {totalValues.height}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Upload Media for Job {selectedJob?.jobNo}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedLineItem && (
            <div className="mb-3">
              <div className="fw-bold mb-2">Selected Line Item (All Columns)</div>
              <div className="ag-theme-alpine" style={{ height: 200 }}>
                <AgGridReact
                  rowData={[selectedLineItem]}
                  columnDefs={columnDefs
                    .filter((c) => c.colId !== "actions")
                    .map((c) => ({
                      ...c,
                      checkboxSelection: false,
                      headerCheckboxSelection: false,
                    }))}
                  defaultColDef={{
                    ...defaultColDef,
                    suppressMenu: true,
                    sortable: false,
                    filter: false,
                  }}
                  domLayout="autoHeight"
                  headerHeight={28}
                  rowHeight={28}
                  suppressRowClickSelection={true}
                />
              </div>
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Media Type</Form.Label>
            <Form.Select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
              <option value="Image">Image</option>
              <option value="Video">Video</option>
              <option value="Signature">Signature</option>
            </Form.Select>
          </Form.Group>

          {mediaType === "Image" && (
            <Form.Group className="mb-3">
              <Form.Label>Image Type</Form.Label>
              <Form.Select value={imageType} onChange={(e) => setImageType(e.target.value)}>
                <option value="Before">Before</option>
                <option value="After">After</option>
              </Form.Select>
            </Form.Group>
          )}

          {mediaType === "Signature" && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Person Name</Form.Label>
                <Form.Control
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="Enter Person Name"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Contact</Form.Label>
                <Form.Control
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Enter Contact Number"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Authority</Form.Label>
                <Form.Control
                  type="text"
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                  placeholder="Enter Authority"
                />
              </Form.Group>
            </>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Choose File</Form.Label>
            <Form.Control
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button
            variant="success"
            onClick={handleUpload}
            disabled={!uploadFiles.length || !selectedLineItem}
          >
            <FaUpload /> Upload
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Implementation;
