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

const headerMapping = {
  "Job No": "jobNo",
  "Client": "client",
  "Sub Client": "category",
  "Job Date": "createdAt",
  "Production Location": "Region",
  "Billing Location": "billingLocation",
  "Visual Code": "visualCode",
  "Product Details": "nameSubCode",
  "City": "city",
  "Qty": "qty",
  "Width": "width",
  "Height": "height",
  "Total Sq.Ft": "totalSqFt",
  "Media": "media",
  "Installation": "installation",
  // "Job Deadline": "deadline",
  "Designer Name": "designerName",
  "Designer ID": "designerId",
  "Designer Deadline": "designerDeadline",
  "Printing Machine": "printerPrintingName",
  "Printer Deadline": "printerDeadline",
  "Print Ready File": "printReadyAvailable",
  "Lamination": "lamination",
  "Mounting": "mounting",
  "Implementation": "implementation",
  "Salon / Store Address": "salonAddress",
  "Remarks / Instructions": "imageUrl"
};

const OrderPopup = ({
  show,
  items,
  jobOptions,
  onClose,
  containerBg = "rgba(255,255,255,0.95)",
  bgColor = "#f8f9fa",
  headerColor = "#343a40"
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [localItems, setLocalItems] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const { updateItemStatus, fetchCampaigns } = useCampaignStore();
  const todayDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const mappedItems = items.map((item) => {
      const Retailer= item["Retailer"] || "";
      const elementType = item["Assest Element Type"] || "";
      const elementName = item["Assest Element Name"] || "";
      const width = parseFloat(item["Print size (Width mm)"] || item.width || 0);
      const height = parseFloat(item["Print size (Height mm)"] || item.height || 0);
  
      const totalSqFt = width && height ? ((width * height) / 92903.04).toFixed(2) : "";
      const visualCode = [Retailer,elementType, elementName].filter(Boolean).join(" / ");
  
      return {
        ...item,
        visualCode: visualCode || item.visualCode || "",
        nameSubCode: elementType || item.nameSubCode || "",
        city:item["Location"] || item.city || "",
        qty:item["QTY"] || item.qty || "",
        width,
        height,
        totalSqFt,
        media: item["Media"] || item.media || "",
        salonAddress: item["Location"] || item.salonAddress || "",



      };
    });
    setLocalItems(mappedItems);
  }, [items]);
  

  const displayedItems = useMemo(() => {
    return localItems.map(item => ({
      ...item,
      jobNo: selectedJob?.value || item.jobNo || "",
      client: selectedJob?.clientName || item.client || "",
      category: selectedJob?.subClient || item.category || "",
      createdAt: todayDate
    }));
  }, [localItems, selectedJob, todayDate]);

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
        await axios.put(`${config.Order.URL.UpdateOrder}/${campaignId}/item/${itemId}`, {
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
  };

  const handleAcceptOrder = async (item) => {
    const elementType = item["Assest Element Type"] || "";
    const elementName = item["Assest Element Name"] || "";
    const visualCode = [elementType, elementName].filter(Boolean).join(" - ");
  
    const payload = {
      ...item,
      jobNo: selectedJob?.value,
      client: selectedJob?.clientName,
      category: selectedJob?.subClient,
      visualCode: visualCode || item.visualCode,
      nameSubCode: elementType || item.nameSubCode,
      media: item["Media"] || item.media,
      qty: item["QTY"] || item.qty,
      width: item["Print size (Width mm)"] || item.width,
      height: item["Print size (Height mm)"] || item.height,
      totalSqFt: (((item["Print size (Width mm)"] || 0) * (item["Print size (Height mm)"] || 0)) / 92903.04).toFixed(2),
      Region: item["Region"] || item.Region,
      salonAddress: item["Location"] || item.salonAddress,
      city: item["Location"] || item.city
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
                    <Button variant="success" size="sm" onClick={() => moveAllItemsToStage(displayedItems, 'Order Accepted')}>Accept All Orders</Button>
                    <Button variant="secondary" size="sm" onClick={() => moveAllItemsToStage(displayedItems, "Printed")}>Move All to Printing</Button>
                    <Button variant="warning" size="sm" onClick={() => moveAllItemsToStage(displayedItems, "Delivered")}>Move All to Delivered</Button>
                    <Button variant="success" size="sm" onClick={() => moveAllItemsToStage(displayedItems, "Implemented")}>Move All to Implementation</Button>
                    <Button variant="info" size="sm" onClick={() => moveAllItemsToStage(displayedItems, "Proof of Execution")}>Proof of Execution</Button>
                    <Button variant="dark" size="sm" onClick={handleUploadImageToOrder}>Upload Image</Button>

                  </div>

                  <div className="table-responsive" style={{ maxHeight:"700px", overflowY: "auto" }}>
                    <table className="table table-bordered table-sm table-striped">
                      <thead className="table-dark">
                        <tr>
                          {Object.keys(headerMapping).map((header, idx) => <th key={idx}>{header}</th>)}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                  {displayedItems.map((item, index) => (
                    <tr key={index}>
                          {Object.values(headerMapping).map((key, i) => (
                              <td key={i}>
                                {["Region", "billingLocation"].includes(key) ? (
                                  <Select
                                    options={[
                                      { value: "NORTH", label: "North" },
                                      { value: "SOUTH", label: "South" },
                                      { value: "EAST", label: "East" },
                                      { value: "WEST", label: "West" }
                                    ]}
                                    value={item[key] ? { value: item[key], label: item[key] } : null}
                                    onChange={(selected) => {
                                      const updated = [...localItems];
                                      updated[index][key] = selected?.value || "";
                                      setLocalItems(updated);
                                    }}
                                    menuPortalTarget={document.body}
                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: "28px", fontSize: "12px" }) }}
                                    isClearable
                                    isSearchable={false}
                                  />
                                ) : ["lamination", "mounting", "implementation", "printReadyAvailable"].includes(key) ? (
                                  <Select
                                    options={[{ value: "Yes", label: "Yes" }, { value: "No", label: "No" }]}
                                    value={item[key] ? { value: item[key], label: item[key] } : null}
                                    onChange={(selected) => {
                                      const updated = [...localItems];
                                      updated[index][key] = selected?.value || "";
                                      setLocalItems(updated);
                                    }}
                                    menuPortalTarget={document.body}
                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: "28px", fontSize: "12px" }) }}
                                    isClearable
                                    isSearchable={false}
                                  />
                                ) : ["designerDeadline", "printerDeadline"].includes(key) ? (
                                  <DatePicker
                                    selected={item[key] ? new Date(item[key]) : null}
                                    onChange={(date) => {
                                      const updated = [...localItems];
                                      updated[index][key] = date?.toISOString().split("T")[0] || "";
                                      setLocalItems(updated);
                                    }}
                                    dateFormat="yyyy-MM-dd"
                                    className="form-control form-control-sm"
                                    placeholderText="Select date"
                                  />
                                ) : (
                                  typeof item[key] === "number" ? item[key].toFixed(2) : item[key] || ""
                                )}
                              </td>
                            ))}


                      <td>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAcceptOrder(item)}
                        >
                          Accept
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
  onClose: PropTypes.func.isRequired
};

export default OrderPopup;
