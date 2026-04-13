import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Form,
  Button,
  Alert,
  Spinner,
  InputGroup,
  Modal,
  Toast,
  ToastContainer
} from "react-bootstrap";
import axios from "axios";
import config from "../../../config";
import { all_routes } from "../../../Router/all_routes";
import { FaSyncAlt, FaSearch } from "react-icons/fa";
import Notification from "../../Notification/Notification";
import DatePicker from "react-datepicker";
import { createPortal } from "react-dom";
import "react-datepicker/dist/react-datepicker.css";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "./Delivery.css";
import moment from "moment";
import { getCompanyBranchDetails } from "./companyBranches";
import { findCustomerRecord, mergeFallbackCustomers } from "./customerFallbacks";
import {
  buildChallanItemPricing,
  formatAmount,
  getTotalJobValue,
} from "./hsnRateLookup";

const DeliveryTimestampCell = (props) => {
  const { data, context } = props;
  const rowId = data?.id;
  if (!rowId) return null;

  const isLocked =
    !!data?.deliveryTimestampUtc ||
    !!data?.DeliveryTimestampUtc ||
    !!data?.deliveryTimestamp ||
    !!data?.DeliveryTimestamp;

  const initialIso =
    context?.rowTimestamps?.[rowId] ||
    data?.deliveryTimestampUtc ||
    data?.DeliveryTimestampUtc ||
    data?.deliveryTimestamp ||
    data?.DeliveryTimestamp ||
    "";

  const [draft, setDraft] = useState(initialIso ? new Date(initialIso) : null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const iso =
      context?.rowTimestamps?.[rowId] ||
      data?.deliveryTimestampUtc ||
      data?.DeliveryTimestampUtc ||
      data?.deliveryTimestamp ||
      data?.DeliveryTimestamp ||
      "";

    if (!dirty) setDraft(iso ? new Date(iso) : null);
  }, [
    context,
    rowId,
    dirty,
    data?.deliveryTimestampUtc,
    data?.DeliveryTimestampUtc,
    data?.deliveryTimestamp,
    data?.DeliveryTimestamp,
  ]);

  const canSave = !isLocked && draft && dirty;

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
          setDirty(true);
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

      {!isLocked && (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={!canSave}
          onClick={() => {
            if (!draft) return;
            const isoUtc = draft.toISOString();

            context.setRowTimestamps((prev) => ({
              ...prev,
              [rowId]: isoUtc,
            }));

            context.saveTimestamp(rowId, isoUtc, data);
            setDirty(false);
          }}
        >
          Save
        </button>
      )}
    </div>
  );
};

const Delivery = () => {
  const [data, setData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deliveryBy, setDeliveryBy] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryOutDate, setDeliveryOutDate] = useState("");
  const [handTempoDelivery, setHandTempoDelivery] = useState("");
  const [deliverPersonName, setDeliverPersonName] = useState([]);
  const [deliverPersonNameSelect, setDeliverPersonNameSelect] = useState("");
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [rowTimestamps, setRowTimestamps] = useState({});
  const [locationId, setLocationId] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [challanForm, setChallanForm] = useState({
    customerAddress: "",
    customerGstNo: "",
    storeAddress: "",
    cpName: "",
    jobValue: "",
    items: [],
  });

  const [bulkTimestamp, setBulkTimestamp] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [showTopToast, setShowTopToast] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState("");
  const [topToastVariant, setTopToastVariant] = useState("danger");

  const gridRef = useRef();

  const triggerTopToast = useCallback((message, variant = "danger") => {
    setTopToastMessage(message);
    setTopToastVariant(variant);
    setShowTopToast(true);
  }, []);

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem("users"));
    if (users?.message) {
      setUsername(users.message.username);
      setLocationId(users.message.location_id);
    }
  }, []);

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

  useEffect(() => {
    if (locationId && username) {
      fetchDeliveryJobs();
      fetchDeliveryByLocation();
      fetchCustomerDetails();
    }
  }, [locationId, username, fetchCustomerDetails]);

  const fetchDeliveryJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.post(config.Delivery.URL.Getalldelivery);
      setData(res.data || []);
    } catch (err) {
      setError("Error fetching job data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryByLocation = async () => {
    try {
      const payload = { locationId, username };
      const res = await axios.post(config.Delivery.URL.GetAllDeliveryAccToLocation, payload);
      const rows = res.data || [];
      setLocationData(rows);

      const map = {};
      rows.forEach((r) => {
        const iso =
          r.deliveryTimestampUtc ||
          r.DeliveryTimestampUtc ||
          r.deliveryTimestamp ||
          r.DeliveryTimestamp ||
          "";
        if (iso && r.id) map[r.id] = iso;
      });
      setRowTimestamps(map);
    } catch (err) {
      setError("Error fetching location data");
    }
  };

  useEffect(() => {
    if (!locationId) return;

    axios
      .post(config.User.URL.GetAllUserAccToLocation, { locationId })
      .then((res) => setDeliverPersonName(res.data || []))
      .catch(console.error);
  }, [locationId]);

  const filteredUserNames = [...new Set(deliverPersonName.map((u) => u))];

  const handleDeliverNameChange = (e) => {
    setDeliverPersonNameSelect(e.target.value);
  };

  const getSelectedExactRows = useCallback(() => {
    const nodes = gridRef.current?.api?.getSelectedNodes?.() || [];
    return nodes.map((n) => n.data).filter((r) => r?.id);
  }, []);

  const formatDisplayDate = (dateVal) => {
    if (!dateVal) return "";
    const m = moment(dateVal);
    return m.isValid() ? m.format("DD-MM-YYYY") : dateVal;
  };

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
          row?.subClient ||
          row?.clientName ||
          row?.client ||
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

  const buildDeliveryChallanForm = useCallback(
    (selectedData) => {
      const firstRow = selectedData[0];
      const customer = findCustomerRecord(customers, firstRow);
      const items = selectedData.map((row, index) => {
        const pricing = buildChallanItemPricing(row);

        return {
          rowId: row.deliveryid || row.id || "",
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
        jobValue: formatAmount(getTotalJobValue(items)),
        items,
      };
    },
    [customers]
  );

  const handleOpenDeliveryChallanModal = useCallback(() => {
    const selectedData = getSelectedExactRows();
    const effectiveSelectedData = selectedData.length ? selectedData : selectedRows;

    if (!effectiveSelectedData.length) {
      triggerTopToast("Please select at least one row", "danger");
      return;
    }

    const uniqueLocations = [
      ...new Set(
        effectiveSelectedData
          .map((row) => getNormalizedProductionLocation(row))
          .filter(Boolean)
      ),
    ];

    if (uniqueLocations.length > 1) {
      triggerTopToast(
        "Please select line items from the same production location only",
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

    setChallanForm(buildDeliveryChallanForm(effectiveSelectedData));
    setShowChallanModal(true);
  }, [
    getSelectedExactRows,
    selectedRows,
    triggerTopToast,
    buildDeliveryChallanForm,
    getNormalizedProductionLocation,
    getNormalizedCustomerKey,
  ]);

  const validateDeliveryChallanForm = useCallback(() => {
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

  const handleAddDeliveryJob = async (e) => {
    e.preventDefault();

    const selectedJobs = getSelectedExactRows().map((row) => ({
      id: row.id,
      productionid: row.productionid,
      jobNo: row.jobNo,
      clientName: row.client,
      subClient: row.subClient,
      date: row.date,
      userName: row.userName,
      location: row.region,
      visualCode: row.visualCode,
      nameSubCode: row.nameSubCode,
      city: row.city,
      qty: row.qty,
      media: row.media,
      lamination: row.lamination,
      mounting: row.mounting,
      salonAddress: row.salonAddress,
      dispatchAddress: row.dispatchAddress,
      deadline: row.deadline,
      remarks: row.remarks,
      actCompleteTime: row.actCompleteTime,
      onTimeDelayed: row.onTimeDelayed,
      entereddt: row.entereddt,
      lstupdatedt: new Date().toISOString(),
      lstupateby: username,
      user: username,
      width: row.width,
      height: row.height,
      totalSqFt: row.totalSqFt,
      deliveryBy,
      deliveryDate,
      deliveryOutDate,
      deliveryTo: deliverPersonNameSelect,
      handTempoDelivery,
    }));

    if (!selectedJobs.length) {
      triggerTopToast("Please select at least one job", "danger");
      return;
    }

    try {
      await axios.post(config.Delivery.URL.AddDelivery, selectedJobs);
      window.location.reload();
    } catch (err) {
      setError("Failed to submit jobs");
    }
  };

  const handleCreateDeliveryChallan = async () => {
    try {
      if (!validateDeliveryChallanForm()) return;

      const selectedData = getSelectedExactRows();
      const effectiveSelectedData = selectedData.length ? selectedData : selectedRows;

      if (!effectiveSelectedData.length) {
        triggerTopToast("Please select at least one row", "danger");
        return;
      }

      const firstRow = effectiveSelectedData[0];

      const selectedCustomerId =
        firstRow.customerId ||
        firstRow.CUSTOMER_ID ||
        firstRow.customeR_ID ||
        firstRow.customer_id ||
        firstRow.CustomerId ||
        "";

      const customer = findCustomerRecord(customers, firstRow);
      const branchDetails = getCompanyBranchDetails(
        firstRow.region || firstRow.productionLocation
      );

  const challanPayload = {
  challanDate: moment().format("DD-MM-YYYY"),

  companyName: branchDetails.companyName,
  companyAddress: branchDetails.companyAddress,
  companyPhone: branchDetails.companyPhone,
  companyGst: branchDetails.companyGst,
  companyLogo: branchDetails.companyLogo,

  customerId: String(selectedCustomerId || ""),
  customerName: customer?.customeR_NAME || firstRow.client || "",

  // ✅ FIXED ADDRESS (PROPER FORMAT)
  customerAddress: challanForm.customerAddress,

  customerGstNo: challanForm.customerGstNo,

  projectName: firstRow.visualCode || "",
  cpName: challanForm.cpName,
  contactPersonPhone: firstRow.contactPersonPhone || "",

  jobNo: getUniqueJobNos(effectiveSelectedData),
  jobValue: challanForm.jobValue,
  poNo: firstRow.poNo || "",
  poDate: formatDisplayDate(firstRow.poDate),

  storeName: firstRow.storeName || firstRow.city || "",
  storeAddress: challanForm.storeAddress,
  productionLocation: firstRow.region || firstRow.productionLocation || "",
  dispatchAddress: firstRow.dispatchAddress || "",
  remarks: firstRow.remarks || "",

  preparedBy: username || "",
  receivedBy: "",
  receivedDate: "",

  locationId: String(locationId || ""),
  createdBy: username || "",

  items: challanForm.items.map((item) => ({
    ...item,
    hsnCode: item.hsnCode || "",
    unitPrice: Number(item.unitPrice || 0),
    lineJobValue: Number(item.lineJobValue || 0),
  })),
};

      const response = await axios.post(
        config.Delivery.URL.CreateDeliveryChallan,
        challanPayload,
        { headers: { "Content-Type": "application/json" } }
      );

      const savedChallan = response.data;

      localStorage.setItem(
  "challanPreviewData",
  JSON.stringify({
    companyName:
      savedChallan.companyName || savedChallan.CompanyName || challanPayload.companyName,
    companyAddress:
      savedChallan.companyAddress ||
      savedChallan.CompanyAddress ||
      challanPayload.companyAddress,
    companyPhone:
      savedChallan.companyPhone || savedChallan.CompanyPhone || challanPayload.companyPhone,
    companyGst:
      savedChallan.companyGst || savedChallan.CompanyGst || challanPayload.companyGst,
    companyLogo:
      savedChallan.companyLogo || savedChallan.CompanyLogo || challanPayload.companyLogo,

    name:
      savedChallan.customerName ||
      savedChallan.CustomerName ||
      challanPayload.customerName,
    address:
      savedChallan.customerAddress ||
      savedChallan.CustomerAddress ||
      challanPayload.customerAddress,
    gstNo:
      savedChallan.customerGstNo ||
      savedChallan.CustomerGstNo ||
      challanPayload.customerGstNo,

    projectName:
      savedChallan.projectName ||
      savedChallan.ProjectName ||
      challanPayload.projectName,
    cpName: savedChallan.cpName || savedChallan.CpName || challanPayload.cpName,
    contactPersonPhone:
      savedChallan.contactPersonPhone ||
      savedChallan.ContactPersonPhone ||
      challanPayload.contactPersonPhone,

    challanNo: savedChallan.challanNo || savedChallan.ChallanNo,
    challanDt: savedChallan.challanDate || savedChallan.ChallanDate,
    jobNo: savedChallan.jobNo || savedChallan.JobNo || challanPayload.jobNo,
    jobValue: savedChallan.jobValue || savedChallan.JobValue || challanPayload.jobValue,
    poNo: savedChallan.poNo || savedChallan.PoNo || challanPayload.poNo,
    poDate: savedChallan.poDate || savedChallan.PoDate || challanPayload.poDate,

    storeName:
      savedChallan.storeName || savedChallan.StoreName || challanPayload.storeName,
    storeAddress:
      savedChallan.storeAddress ||
      savedChallan.StoreAddress ||
      challanPayload.storeAddress,
    productionLocation:
      savedChallan.productionLocation ||
      savedChallan.ProductionLocation ||
      challanPayload.productionLocation,
    dispatchAddress:
      savedChallan.dispatchAddress ||
      savedChallan.DispatchAddress ||
      challanPayload.dispatchAddress,
    remarks: savedChallan.remarks || savedChallan.Remarks || challanPayload.remarks,

    preparedBy:
      savedChallan.preparedBy || savedChallan.PreparedBy || challanPayload.preparedBy,
    receivedBy: savedChallan.receivedBy || savedChallan.ReceivedBy,
    receivedDate: savedChallan.receivedDate || savedChallan.ReceivedDate,

    items: savedChallan.items || savedChallan.Items || challanPayload.items || []
  })
);

      setShowChallanModal(false);
      window.open(`/deliverychallan/`, '_blank');
      await fetchDeliveryByLocation();

      triggerTopToast(
        `Delivery challan created: ${savedChallan.challanNo || savedChallan.ChallanNo}`,
        "success"
      );
    } catch (error) {
      console.error("Error creating delivery challan:", error);
      triggerTopToast("Failed to create delivery challan", "danger");
    }
  };

  const filteredData = useMemo(() => {
    return locationData.filter((row) =>
      row.jobNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [locationData, searchTerm]);

  const handleSelectionChanged = useCallback(() => {
    const selected = getSelectedExactRows();
    setSelectedRows(selected);
  }, [getSelectedExactRows]);

  const saveTimestamp = useCallback(
    async (rowId, isoUtc, row) => {
      try {
        setError(null);

        const alreadyLocked =
          !!row?.deliveryTimestampUtc ||
          !!row?.DeliveryTimestampUtc ||
          !!row?.deliveryTimestamp ||
          !!row?.DeliveryTimestamp;

        if (alreadyLocked) {
          triggerTopToast(
            `Timestamp already saved for Job ${row?.jobNo || rowId}`,
            "warning"
          );
          return;
        }

        await axios.post(config.Delivery.URL.UpdateTimestamp, {
          id: rowId,
          timestampUtc: isoUtc || null,
          updatedBy: username,
        });

        setNotificationMessage(`Delivery timestamp saved for Job ${row?.jobNo || rowId}`);
        setShowNotification(true);

        setLocationData((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? { ...r, deliveryTimestampUtc: isoUtc, deliveryTimestamp: isoUtc }
              : r
          )
        );

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

  const handleBulkSaveTimestamp = useCallback(async () => {
    try {
      setError(null);

      if (!bulkTimestamp) {
        triggerTopToast("Please select bulk delivery timestamp", "danger");
        return;
      }

      const selected = getSelectedExactRows();

      if (!selected.length) {
        triggerTopToast("Please select at least one row", "danger");
        return;
      }

      const unlockedRows = selected.filter((row) => {
        const locked =
          !!row?.deliveryTimestampUtc ||
          !!row?.DeliveryTimestampUtc ||
          !!row?.deliveryTimestamp ||
          !!row?.DeliveryTimestamp;
        return !locked;
      });

      if (!unlockedRows.length) {
        triggerTopToast("All selected rows already have timestamp locked", "warning");
        return;
      }

      setBulkSaving(true);

      const isoUtc = bulkTimestamp.toISOString();
      const selectedIds = new Set(unlockedRows.map((x) => x.id));

      setRowTimestamps((prev) => {
        const updated = { ...prev };
        unlockedRows.forEach((row) => {
          updated[row.id] = isoUtc;
        });
        return updated;
      });

      await Promise.all(
        unlockedRows.map((row) =>
          axios.post(config.Delivery.URL.UpdateTimestamp, {
            id: row.id,
            timestampUtc: isoUtc,
            updatedBy: username,
          })
        )
      );

      setLocationData((prev) =>
        prev.map((r) =>
          selectedIds.has(r.id)
            ? { ...r, deliveryTimestampUtc: isoUtc, deliveryTimestamp: isoUtc }
            : r
        )
      );

      setNotificationMessage(
        `Delivery timestamp saved for ${unlockedRows.length} selected row(s)`
      );
      setShowNotification(true);
      setBulkTimestamp(null);

      setTimeout(() => {
        gridRef.current?.api?.refreshCells({ force: true });
      }, 0);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.toString?.() || "Failed to bulk save timestamp");
    } finally {
      setBulkSaving(false);
    }
  }, [bulkTimestamp, username, getSelectedExactRows, triggerTopToast]);

  const handleSelectFilteredRows = useCallback(() => {
    if (!gridRef.current?.api) return;

    gridRef.current.api.forEachNodeAfterFilter((node) => {
      node.setSelected(true);
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    gridRef.current?.api?.deselectAll();
    setSelectedRows([]);
  }, []);

  const columnDefs = useMemo(
    () => [
      {
        checkboxSelection: true,
        headerCheckboxSelection: true,
        field: "jobNo",
        headerName: "Job ID",
        filter: true,
      },
      { field: "date", headerName: "Production Date", filter: true },
      { field: "client", headerName: "Client Name", filter: true },
      {
        field: "userName",
        headerName: "Account Manager",
        filter: true,
        minWidth: 180,
        valueGetter: (params) =>
          params.data?.userName ||
          params.data?.username ||
          params.data?.accountManager ||
          params.data?.accountmanager ||
          "",
      },
      {
        field: "region",
        headerName: "Region",
        filter: true,
        minWidth: 140,
        valueGetter: (params) => params.data?.region || params.data?.productionLocation || "",
      },
      {
        field: "productionLocation",
        headerName: "Production Location",
        filter: true,
        minWidth: 190,
        valueGetter: (params) => params.data?.productionLocation || params.data?.region || "",
      },
      { field: "salonAddress", headerName: "SalonAddress" },
      {
        headerName: "Delivery Timestamp",
        colId: "deliveryTimestamp",
        minWidth: 240,
        cellRenderer: DeliveryTimestampCell,
        sortable: false,
        filter: false,
        suppressMenu: true,
      },
      {
        headerName: "View Challan",
        minWidth: 160,
        filter: false,
        sortable: false,
        cellRenderer: (params) => {
          const challanId = params.data?.challanId || params.data?.ChallanId;
          const challanNo = params.data?.challanNo || params.data?.ChallanNo;

          if (!challanId) return "-";

          return (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => window.open(`/deliverychallan/${challanId}`, "_blank")}
            >
              {challanNo || "View Challan"}
            </button>
          );
        },
      },
    ],
    []
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

  const handleExportExcel = () => gridRef.current.api.exportDataAsExcel();
  const handleExportCSV = () => gridRef.current.api.exportDataAsCsv();

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <style>{`
          .delivery-challan-modal-root{z-index:2000 !important;}
          .delivery-challan-backdrop{z-index:1990 !important;}
          .delivery-challan-modal-root .modal-dialog{
            max-width:min(1100px,72vw);
            margin:1.75rem 2rem 1.75rem auto;
          }
          .delivery-challan-modal-root .form-control[readonly]{
            white-space:normal;
            overflow-wrap:anywhere;
          }
        `}</style>
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

        <div className="page-header">
          <Row>
            <Col>
              <Link to={all_routes.dashboard}>Dashboard</Link>
            </Col>
          </Row>
        </div>

        <Form className="mb-3">
          <Row className="align-items-end">
            <Col md={3}>
              <Form.Label>Delivery Person</Form.Label>
              <Form.Select value={deliverPersonNameSelect} onChange={handleDeliverNameChange}>
                <option value="">Select</option>
                {filteredUserNames.map((user, idx) => (
                  <option key={idx} value={user}>
                    {user}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label>Delivery Started</Form.Label>
              <Form.Control
                type="datetime-local"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </Col>

            <Col md={2}>
              <Form.Label>Delivery Completed</Form.Label>
              <Form.Control
                type="datetime-local"
                value={deliveryOutDate}
                onChange={(e) => setDeliveryOutDate(e.target.value)}
              />
            </Col>

            <Col md={2}>
              <Form.Label>Delivery Mode</Form.Label>
              <Form.Select
                value={handTempoDelivery}
                onChange={(e) => setHandTempoDelivery(e.target.value)}
              >
                <option value="">Select</option>
                <option value="Comart to Deliver">Comart to Deliver</option>
                <option value="Customer Pick-Up from Comart">Customer Pick-Up</option>
                <option value="Comart Courier">Comart Courier</option>
              </Form.Select>
            </Col>

            <Col md={3} className="d-flex gap-2 flex-wrap">
              <Button onClick={handleAddDeliveryJob}>Add</Button>
            
              <Button variant="outline-secondary" onClick={() => window.location.reload()}>
                <FaSyncAlt />
              </Button>
              <Button onClick={handleExportExcel}>Excel</Button>
              <Button onClick={handleExportCSV}>CSV</Button>
            </Col>
          </Row>
        </Form>

      

        <Row className="mb-3 align-items-end">
          <Col md={4}>
            <Form.Label>Bulk Delivery Timestamp</Form.Label>
            <DatePicker
              selected={bulkTimestamp}
              onChange={(date) => setBulkTimestamp(date)}
              showTimeSelect
              timeIntervals={15}
              timeCaption="Time"
              dateFormat="yyyy-MM-dd HH:mm"
              placeholderText="Pick one timestamp for selected rows"
              className="form-control"
              popperPlacement="bottom-start"
              popperContainer={({ children }) => createPortal(children, document.body)}
            />
          </Col>

          <Col md={8} className="d-flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={handleSelectFilteredRows}>
              Select Filtered Rows
            </Button>

            <Button variant="outline-secondary" onClick={handleClearSelection}>
              Clear Selection
            </Button>

            <Button variant="primary" onClick={handleBulkSaveTimestamp} disabled={bulkSaving}>
              {bulkSaving ? "Saving..." : `Bulk Save Timestamp (${selectedRows.length})`}
            </Button>

              <Button variant="primary" onClick={handleOpenDeliveryChallanModal}>
                Create Challan
              </Button>
          </Col>
        </Row>

        {loading && <Spinner animation="border" />}
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="ag-theme-alpine" style={{ height: 600 }}>
          <AgGridReact
            ref={gridRef}
            rowData={filteredData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onSelectionChanged={handleSelectionChanged}
            pagination={true}
            paginationPageSize={25}
            rowSelection="multiple"
            suppressRowClickSelection={true}
            context={{
              rowTimestamps,
              setRowTimestamps,
              saveTimestamp,
            }}
          />
        </div>

        {showNotification && (
          <Notification
            headline="Deadline Alert!"
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
          className="delivery-challan-modal-root"
          backdropClassName="delivery-challan-backdrop"
        >
          <Modal.Header closeButton>
            <Modal.Title>Edit Delivery Challan</Modal.Title>
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
                  <Col md={8}>
                    <Form.Group>
                      <Form.Label>Details</Form.Label>
                      <Form.Control as="textarea" rows={4} value={item.details} readOnly />
                    </Form.Group>
                  </Col>
                  <Col md={2}>
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
            <Button variant="primary" onClick={handleCreateDeliveryChallan}>
              Create Challan
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default Delivery;
