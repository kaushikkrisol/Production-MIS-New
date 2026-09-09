import React, { useState, useMemo, useEffect } from "react";


import PropTypes from "prop-types";
import { FaBoxOpen } from "react-icons/fa";
import Select from "react-select";
import { Button } from "react-bootstrap";
import { Rnd } from "react-rnd";
import "./orderPopup.css";
import axios from "axios";
import config from "../../config";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useCampaignStore from "../../store/orderstore";
import { toast } from "react-toastify";

const headerMapping = {
  "Job No": "jobNo",
  "Client": "client",
  "Campaign Name": "campaignName",
  "Sub Client": "category",
  "Job Date": "createdAt",
  "Production Location *": "productionLocation",
  "Billing Location *": "billingLocation",
  "Visual Code": "visualCode",
  "Product Details": "nameSubCode",
  "City": "city",
  "Qty": "qty",
  "Width": "width",
  "Height": "height",
  "Total Sq.Ft": "totalSqFt",
  "Media": "media",
  "Installation": "installation",
  "Job Deadline": "jobdeadline",
  "Designer Name": "designerName",
  "Designer ID": "designerId",
  "Designer Deadline": "designerDeadline",
  "Printer Name": "printerPrintingName",
  "Printer Deadline": "printerDeadline",
  "Print Ready File": "printReadyAvailable",
  "Lamination": "lamination",
  "Mounting": "mounting",
  "Implementation": "implementation",
  "Salon / Store Address": "salonAddress",
  "Image URL": "imageUrl",
  "Remarks / Instructions": "REMARK"
};

const OrderPopup = ({
  show,
  items,
  jobOptions,
  printerOptions,
  onClose,
  onAcceptAllOrders = () => {} ,
  containerBg = "rgba(255,255,255,0.95)",
  bgColor = "#f8f9fa",
  headerColor = "#343a40"
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [localItems, setLocalItems] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const [latestJobNo, setLatestJobNo] = useState('');
const [loading, setLoading] = useState(false);
const currentDate = new Date().toISOString().split('T')[0];


  const { updateItemStatus, fetchCampaigns } = useCampaignStore();
  const todayDate = new Date().toISOString().split("T")[0];


const userObj = JSON.parse(localStorage.getItem('users'));
const userId = userObj?.message?.user_id;
const userName = userObj?.message?.username;
const emailid = userObj?.message?.email_id;


const IST_TIMEZONE = 'Asia/Kolkata';
  useEffect(() => {
    const mappedItems = items
      .filter(item => item.status !== "Order Accepted" && item.Status !== "Order Accepted") // ✅ Exclude accepted orders
      .map((item) => {
        const Retailer = item["Retailer"] || "";
        const elementType = item["Assest Element Type"] || "";
        const elementName = item["Assest Element Name"] || "";
        const widthMm = parseFloat(item["Print size (Width mm)"] || item.width || 0);
        const heightMm = parseFloat(item["Print size (Height mm)"] || item.height || 0);
        // Convert mm to inches
        const widthInch = widthMm ? (widthMm / 25.4).toFixed(2) : "";
        const heightInch = heightMm ? (heightMm / 25.4).toFixed(2) : "";
        // Calculate sq ft: (width_inch * height_inch) / 144
        const totalSqFt = (widthInch && heightInch) ? ((widthInch * heightInch) / 144).toFixed(2) : "";
        const visualCode = [Retailer, elementType, elementName].filter(Boolean).join(" / ");

        return {
        ...item,
        visualCode: visualCode || item.visualCode || "",
        nameSubCode: elementType || item.nameSubCode || "",
        city: item["Location"] || item.city || "",
        qty: item["QTY"] || item.qty || "",
        width: item["Width"] || widthInch,
        height: item["Height"] || heightInch,
        totalSqFt,
        media: item["Media"] || item.media || "",
        salonAddress: item["Location"] || item.salonAddress || "",
        imageUrl:
    // item["Updated Visual image"] || // from your sample JSON
    item["ImageURL"] ||             // fallback
    item.imageUrl || ""  
      };
    });

    setLocalItems(mappedItems);
  }, [items]);


const getMissingLocationFields = (item = {}) => {
  const missingLocationFields = [];
  if (!String(item.productionLocation || selectedJob?.productionLocation || "").trim()) {
    missingLocationFields.push("Production Location");
  }
  if (!String(item.billingLocation || "").trim()) {
    missingLocationFields.push("Billing Location");
  }
  return missingLocationFields;
};

const isNewJobRequest = (item = {}) =>
  String(item?.ISnewjob ?? item?.isnewjob ?? "0") === "1";

const addSingleJobDetail = async (item) => {
  if (!userId) {
    toast.error("User not logged in");
    return false;
  }

  if (!isNewJobRequest(item) && !selectedJob?.value) {
    toast.error("Please select a Job Number.");
    return false;
  }

  const missingLocationFields = getMissingLocationFields(item);
  if (missingLocationFields.length) {
    toast.error(`Please select ${missingLocationFields.join(" and ")} before accepting the order.`);
    return false;
  }

  const currentDate = new Date().toISOString().split('T')[0];

  let jobNo = selectedJob?.value || item.jobNo || item["Job No"] || "";

  try {
    setLoading(true);

    if (isNewJobRequest(item)) {
      const headerDate = item.createdAt || item.Date || item["Job Date"] || currentDate;
      const customerName =
        item.customerName || item.customername || item.client || item.CLIENT || "";
      const subClient =
        item.subClient || item.subclient || item.category || item["Sub Client"] || "";
      const projectName =
        item.projectname || item.projectName || item.ProjectName || item["Campaign Name"] || item.campaignName || "";

      const headerPayload = [{
        ISnewjob: "1",
        customername: customerName,
        customerid: item.customerid || item.clientId || "",
        customerEmail: item.customerEmail || "",
        contactPerson: item.contactPerson || "",
        contactperson: item.contactPerson || "",
        lpono: item.lpono || "",
        lpodate: item.lpodate || "",
        potype: item.potype || "",
        hsnCode: item.hsnCode || "",
        businessType: item.businessType || "",
        projectname: projectName,
        projectName: projectName,
        ProjectName: projectName,
        jobdesc: item.jobdesc || "",
        enteredby: userName || "",
        userid: userId,
        UserId: userId,
        user_id: userId,
        username: userName || "",
        userName: userName || "",
        locationid: item.locationid || "",
        emailid: emailid || "",
        entereddt: currentDate,
        Date: headerDate,
        "Job Date": headerDate,
        jobdate: headerDate,
        client: customerName,
        CLIENT: customerName,
        subClient: subClient,
        subclient: subClient,
        "Sub Client": subClient,
      }];

      const headerResponse = await axios.post(config.JobSummary.URL.Addjobdetails, headerPayload);
      jobNo =
        headerResponse?.data?.jobno ||
        headerResponse?.data?.jobNo ||
        headerResponse?.data?.JobNo ||
        "";

      if (!jobNo) {
        throw new Error("Job number was not returned by the server");
      }
    }

    const payload = [{
      ...item,
      ISnewjob: "0",
      JobNo: jobNo,
      "Job No": jobNo,
      Date: item.createdAt || item.Date || item["Job Date"] || currentDate,
      "Job Date": item.createdAt || item.Date || item["Job Date"] || currentDate,
      client: selectedJob?.clientName || item.client || item.CLIENT || "",
      CLIENT: selectedJob?.clientName || item.client || item.CLIENT || "",
      subClient: selectedJob?.subClient || item.category || item["Sub Client"] || "",
      "Sub Client": selectedJob?.subClient || item.category || item["Sub Client"] || "",
      "Campaign Name": item.campaignName || item["Campaign Name"] || "",
      "Production Location": item.productionLocation || selectedJob?.productionLocation || "",
      BillingLocation:
        item.BillingLocation ||
        item.billingLocation ||
        item["Billing  Location"] ||
        item["Billing Location"] ||
        "",
      "Billing  Location":
        item["Billing  Location"] ||
        item["Billing Location"] ||
        item.BillingLocation ||
        item.billingLocation ||
        "",
      "Print Ready Available": item.printReadyAvailable || "",
      Implementation: item.implementation || "",
      LAMINATION: item.lamination || "",
      MOUNTING: item.mounting || "",
      emailid: emailid || item.emailid || "",
      UserId: userId || item.UserId || "",
      userName: userName || item.userName || "",
      username: userName || item.username || "",
      entereddt: currentDate,
      "VISUAL CODE": item.visualCode || item["VISUAL CODE"] || "",
      "Name & Sub Code": item.nameSubCode || item["Name & Sub Code"] || "",
      "HSN Code": item.hsnCode || item["HSN Code"] || "",
      CITY: item.city || item["CITY"] || "",
      QTY: item.qty || item.QTY || item["QTY"] || "",
      qty: item.qty || item.QTY || item["QTY"] || "",
      Width: item.width || item["Width"] || "",
      Height: item.height || item["Height"] || "",
      "Total Sq.ft": item.totalSqFt || item["Total Sq.ft"] || "",
      Media: item.media || item["Media"] || "",
      Installation: item.installation || item["Installation"] || "",
      "SALON ADDRESS": item.salonAddress || item["SALON ADDRESS"] || "",
      campaignid: item.campaignId || item.campaignid || "",
      "Designer Name": item.designerName || item["Designer Name"] || "",
      "Designer ID": item.designerId || item["Designer ID"] || "",
      "Designer Deadline": item.designerDeadline || item["Designer Deadline"] || "",
      "Job Deadline": item.jobdeadline || item["Job Deadline"] || "",
      "Printer Name": item.printerPrintingName || item["Printer Name"] || "",
      "Printer Deadline": item.printerDeadline || item["Printer Deadline"] || "",
      "Project Name": item.projectname || item.projectName || item.ProjectName || item["Project Name"] || "",
      "Remarks/Instructions": item.REMARK || item["Remarks/Instructions"] || item["REMARK"] || "",
      "Machine Name": item.printerPrintingName || item["Machine Name"] || "",
      itemid: item.id || item.itemid || "",
      ImageURL: item.ImageURL || item.imageUrl || ""
    }];
    const response = await axios.post(config.JobSummary.URL.Addjobdetails, payload);
    const jobNoCreated = response.data?.jobno || response.data?.jobNo || jobNo || '';
    setLatestJobNo(jobNoCreated);
    toast.success(`Order Accepted. Job No: ${jobNoCreated}`);
    return true;
  } catch (error) {
    console.error("Error adding job detail:", error);
    toast.error("Failed to add job detail.");
    return false;
  } finally {
    setLoading(false);
  }
};


  

  const displayedItems = useMemo(() => {
    return localItems.map(item => ({
      ...item,
      jobNo: selectedJob?.value || item.jobNo || "",
      client: selectedJob?.clientName || item.client || "",
      category: selectedJob?.subClient || item.category || "",
      createdAt: todayDate
    }));
  }, [localItems, selectedJob, todayDate]);

  const addJobDetails = async () => {
    if (!displayedItems.length) return;

    const rowsWithMissingLocations = displayedItems
      .map((item, index) => ({
        index: index + 1,
        missingLocationFields: getMissingLocationFields(item),
      }))
      .filter(({ missingLocationFields }) => missingLocationFields.length);

    if (rowsWithMissingLocations.length) {
      const preview = rowsWithMissingLocations
        .slice(0, 5)
        .map(({ index, missingLocationFields }) => `Row ${index}: ${missingLocationFields.join(", ")}`)
        .join("; ");
      const extraCount = rowsWithMissingLocations.length - 5;
      toast.error(`Please select mandatory location field(s): ${preview}${extraCount > 0 ? ` and ${extraCount} more row(s)` : ""}.`);
      return;
    }

    const acceptedItems = [];

    for (const item of displayedItems) {
      const saved = await addSingleJobDetail(item);
      if (saved) acceptedItems.push(item);
    }

    if (acceptedItems.length) {
      await moveAllItemsToStage(acceptedItems, "Order Accepted");
    }
  };

  const handleUploadImageToOrder = async () => {
  const imageUrl = "https://productionapi.comart.in/images/after/J0625021924/d7434db3-2101-41e5-8f6d-844ebe2e04872171320907437520549.jpg";

  for (let i = 0; i < displayedItems.length; i++) {
    const item = displayedItems[i];

    // Only update items with valid campaign and item ID
    const campaignId = item.campaignId || item.campaignID || item.campaign_id || item.campaign || item?.id; // fallback
    const itemId = item.id;

    if (!campaignId || !itemId) {
      console.warn(`❌ Missing campaignId or itemId for item`, item);
      continue;
    }

    try {
      await axios.put(`${config.Order.URL.UpdateOrder}/${campaignId}/item/${itemId}`, {
        implementImage: imageUrl
      });

      const updatedItems = [...localItems];
      updatedItems[i].implementImage = imageUrl;
      setLocalItems(updatedItems);

      console.log(`✅ Uploaded image for item ${itemId} in campaign ${campaignId}`);
    } catch (error) {
      console.error(`❌ Failed to upload image for ${itemId}`, error);
    }
  }
};


  const toggleMinimize = () => setIsMinimized(prev => !prev);

const moveAllItemsToStage = async (itemsToMove, stage) => {
  const updatedLocalItems = [];

  for (const item of itemsToMove) {
    const { campaignId, id: itemId } = item;
    if (!campaignId || !itemId) continue;

    try {
      await axios.patch(`${config.Order.URL.UpdateOrder}/${campaignId}/item/${itemId}`, {
        status: stage,
        Status: stage
      });
      updateItemStatus({ from: item.status, to: stage, campaignId, itemId });
      updatedLocalItems.push({ ...item, status: stage });
    } catch (error) {
      console.error(`Failed to update item ${itemId}`, error);
    }
  }

  setLocalItems(updatedLocalItems);
  await fetchCampaigns();

  if (stage === "Order Accepted" && typeof onAcceptAllOrders === "function") {
    onAcceptAllOrders(updatedLocalItems);
  }
};

  const handleAcceptOrder = async (item) => {
    const elementType = item["Assest Element Type"] || "";
    const elementName = item["Assest Element Name"] || "";
    const visualCode = [elementType, elementName].filter(Boolean).join(" - ");
  
    // Convert mm to inches (1 inch = 25.4 mm)
    const widthInInches = (parseFloat(item["Print size (Width mm)"] || item.width || 0) / 25.4).toFixed(2);
    const heightInInches = (parseFloat(item["Print size (Height mm)"] || item.height || 0) / 25.4).toFixed(2);


    const payload = {
      ...item,
      jobNo: selectedJob?.value,
      client: selectedJob?.clientName,
      category: selectedJob?.subClient,
      visualCode: visualCode || item.visualCode,
      nameSubCode: elementType || item.nameSubCode,
      media: item["Media"] || item.media,
      qty: item["QTY"] || item.qty,
      width: widthInInches,
      height: heightInInches,
      // Total Sq.Ft = width (inches) * height (inches) / 144
      totalSqFt: ((widthInInches * heightInInches) / 144).toFixed(2),
      Region: item["Region"] || item.Region,
      salonAddress: item["Location"] || item.salonAddress,
      city: item["Location"] || item.city,
      campaignid: item["id"] || item.id,
    };
  
    try {
      const response = await axios.post(`${config.Order.URL.GetOrder}`, payload);
      console.log("✅ Order accepted for", item.id);
      console.log("ORDER DATA RECEIVED:", response.data);

    } catch (error) {
      console.error("Error accepting order", error);
    }
  };


  
  

  if (!show) return null;

  return (
    <Rnd
    default={{
      x: window.innerWidth * 0.1,
      y: window.innerHeight * 0.1,
      width: window.innerWidth * 0.8,
      height: window.innerHeight * 0.8
    }}
    minWidth={700}
    minHeight={300}
    bounds="window"
    dragHandleClassName="order-popup-header"
    style={{
      zIndex: 9999,
      maxWidth: "80vw",
      maxHeight: "80vh"
    }}
  >
  
      <div
        className={`order-popup ${isMinimized ? "minimized" : ""}`}
        style={{
          backgroundColor: containerBg,
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          overflow: "hidden"
        }}
      >
        <div
          className="order-popup-content"
          style={{
            backgroundColor: bgColor,
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            height: "100%"
          }}
        >
          <div
            className="order-popup-header d-flex align-items-center px-3 py-2"
            style={{
              backgroundColor: headerColor,
              color: "#fff",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              cursor: "move"
            }}
          >
            <FaBoxOpen className="me-2" />
            <strong>Loreal Luxury Order</strong>
            <div style={{ marginLeft: "auto" }}>
              <button className="btn btn-sm btn-light me-2" onClick={toggleMinimize}>
                {isMinimized ? "+" : "-"}
              </button>
              <Button variant="close" onClick={onClose} />
            </div>
          </div>

          {!isMinimized && (
            <div className="order-popup-body p-3" style={{ overflowY: "auto", flex: 1 }}>
              <div className="mb-3">
                <label><strong>Select Job No</strong></label>
                <Select
                  options={jobOptions}
                  value={selectedJob}
                  onChange={setSelectedJob}
                  placeholder="Filter by Job Number"
                  isClearable
                />
              </div>

              {displayedItems.length > 0 ? (
                <>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                    <Button variant="success" size="sm" onClick={addJobDetails}>Accept All Orders</Button>
                  </div>

                 <div className="table-responsive" style={{ maxHeight: "700px", overflowY: "auto" }}>
  <table className="table table-bordered table-sm table-striped">
    <thead className="table-dark" style={{ color: 'white' }}>
      <tr>
        {Object.keys(headerMapping).map((header, idx) => (
          <th key={idx}>{header}</th>
        ))}
        <th>Actions</th> 
      </tr>
    </thead>
  <tbody>
  {displayedItems.map((item, index) => (
    <tr key={index}>
      {Object.values(headerMapping).map((key, i) => (
        <td key={i}>
          {["productionLocation", "billingLocation"].includes(key) ? (
            <Select
              options={[
                { value: "North", label: "North" },
                { value: "South", label: "South" },
                { value: "East", label: "East" },
                { value: "West", label: "West" }
              ]}
              value={item[key] ? { value: item[key], label: item[key] } : null}
              onChange={(selected) => {
                const updated = [...localItems];
                updated[index][key] = selected?.value || "";
                setLocalItems(updated);
              }}
              menuPortalTarget={document.body}
              styles={{
                menuPortal: base => ({ ...base, zIndex: 9999 }),
                control: base => ({ ...base, minHeight: "28px", fontSize: "12px" })
              }}
              isClearable={false}
              isSearchable={false}
            />
          ) : key === "printerPrintingName" ? (
            <Select
              options={printerOptions || []}
              value={item[key] ? { value: item[key], label: item[key] } : null}
              onChange={(selected) => {
                const updated = [...localItems];
                updated[index][key] = selected?.value || "";
                setLocalItems(updated);
              }}
              menuPortalTarget={document.body}
              styles={{
                menuPortal: base => ({ ...base, zIndex: 9999 }),
                control: base => ({ ...base, minHeight: "28px", fontSize: "12px" })
              }}
              isClearable
              isSearchable
            />
          ) : ["lamination", "mounting", "implementation", "printReadyAvailable"].includes(key) ? (
            <Select
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" }
              ]}
              value={item[key] ? { value: item[key], label: item[key] } : null}
              onChange={(selected) => {
                const updated = [...localItems];
                updated[index][key] = selected?.value || "";
                setLocalItems(updated);
              }}
              menuPortalTarget={document.body}
              styles={{
                menuPortal: base => ({ ...base, zIndex: 9999 }),
                control: base => ({ ...base, minHeight: "28px", fontSize: "12px" })
              }}
              isClearable
              isSearchable={false}
            />
          ) : ["designerDeadline", "jobdeadline", "printerDeadline", "createdAt"].includes(key) ? (
            <DatePicker
              selected={item[key] ? new Date(item[key]) : new Date()}
              onChange={(date) => {
                const updated = [...localItems];
                updated[index][key] = date.toISOString();
                setLocalItems(updated);
              }}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="yyyy-MM-dd HH:mm"
              className="form-control form-control-sm"
              placeholderText="Select date & time"
            />
          ) : (
            typeof item[key] === "number" ? item[key].toFixed(2) : item[key] || ""
          )}
        </td>
      ))}
      <td>
        <Button
          variant="outline-success"
          size="sm"
          onClick={async () => {
            const saved = await addSingleJobDetail(item);
            if (!saved) return;
            await moveAllItemsToStage([item], "Order Accepted");
            toast.success(`Accepted order for Visual Code: ${item.visualCode}`);
          }}
          disabled={loading}
        >
          Accept Order
        </Button>
      </td>
    </tr>
  ))}
</tbody>

  </table>
</div>

                </>
              ) : <p className="text-muted">No items available.</p>}
            </div>
          )}
        </div>
      </div>
    </Rnd>
  );
};

OrderPopup.propTypes = {
  show: PropTypes.bool.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  jobOptions: PropTypes.array,
  printerOptions: PropTypes.array,
  onClose: PropTypes.func.isRequired,
  onAcceptAllOrders: PropTypes.func 
};

export default OrderPopup;
