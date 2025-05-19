import React, { useState, useEffect, useCallback, useMemo } from "react";
import DateRangePicker from "react-bootstrap-daterangepicker";
import { Calendar } from "feather-icons-react/build/IconComponents";
import axios from "axios";
import config from "../../config";
import useCampaignStore from "../../store/orderstore";
import Notification from "../Notification/Notification";
import { Button } from "react-bootstrap";
import OrderPopup from "./orderPopup";

const Dashboard = () => {
  // Function to get the last N days
  const getLastNDays = (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    return [startDate, endDate];
  };

  const [productionData, setProductionData] = useState([]);
  const [delayData, setDelayData] = useState([]);
  const [lowStockData, setLowStockData] = useState([]);
  const [jobsFromSql, setJobsFromSql] = useState([]);
  const [locationid, setLocationid] = useState("");
  const [jobNo,setJobNo]=useState('');
  const [showOrderPopup, setShowOrderPopup] = useState(false);

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: getLastNDays(7)[0], // Ensure getLastNDays is defined before use
    endDate: new Date(),
  });

  console.log(productionData);
  const { campaigns, fetchCampaigns } = useCampaignStore();

  useEffect(() => {
    const users = localStorage.getItem("users");
  
    if (users) {
      try {
        const userObj = JSON.parse(users);
        const id = userObj?.message?.location_id;
        if (id) setLocationid(id);
      } catch (error) {
        console.error("Error parsing JSON from localStorage:", error);
      }
    } else {
      console.warn("No users data in localStorage");
    }
  
    fetchCampaigns(); // this one doesn’t depend on locationid
  }, []);
  
  useEffect(() => {
    if (locationid) {
      GetAllJobsFromSql(); // ✅ Only call this once locationid is available
    }
  }, [locationid]);
  

  // const yetToStartItems = useMemo(() => {
  //   return campaigns.flatMap(c =>
  //     c.items
  //       .map(item => ({
  //         ...item,
  //         status: item.status || item.Status || "Yet to Start",
  //         jobNo: c.jobNo || c.id || "N/A",
  //         customerName: c.name || "N/A",
  //         campaignId: c.id  // ✅ ADD THIS LINE
  //       }))
  //       .filter(item => item.status.toLowerCase() === "yet to start")
  //   );
  // }, [campaigns]);
  

  const yetToStartItems = useMemo(() => {
    return campaigns.flatMap(c =>
      c.items.map(item => ({
        ...item,
        status: item.status || item.Status || "Yet to Start",
        jobNo: c.jobNo || c.id || "N/A",
        customerName: c.name || "N/A",
        campaignId: c.id
      }))
    );
  }, [campaigns]);
  
  
  
  useEffect(() => {
    if (campaigns.length && yetToStartItems.length > 0) {
      console.log("campaigns",campaigns)
      setShowOrderPopup(true);
    }
  }, [campaigns, yetToStartItems]);


  const GetAllJobsFromSql = async () => {
    const payload = { locationId: locationid };
  
    try {
      const response = await axios.post(`${config.JobSummary.URL.GetAllJobsFromSql}`, payload);
      setJobsFromSql(response.data);
  
      // Generate jobNo options
      const jobNoOptionsFromSql = response.data.map(job => ({
        value: job.comartjobno,
        label: `${job.comartjobno} (${job.client})`,
        clientName: job.client || '',
        subClient: job.subClient || ''
      }));
  
      // Optional: Combine with job numbers from campaign store
      const jobNoOptionsFromCampaigns = campaigns.map(c => ({
        value: c.jobNo || c.id || 'N/A',
        label: `${c.jobNo || c.id || 'N/A'} (${c.name || 'Unknown'})`
      }));
  
      const combinedJobNoOptions = [
        ...jobNoOptionsFromSql,
        ...jobNoOptionsFromCampaigns
      ];
  
      // Remove duplicates
      const uniqueJobNoOptions = Array.from(new Map(
        combinedJobNoOptions.map(opt => [opt.value, opt])
      ).values());
  
      setJobNo(uniqueJobNoOptions);  // ✅ Store clean options
    } catch (error) {
      console.error("Error for displaying jobno", error);
    }
  };
  
  

  const fetchData = useCallback(
    async (url, setData) => {
      try {
        const response = await axios.post(url, {
          startDate: dateRange.startDate.toISOString(), // Send startDate in ISO format
          endDate: dateRange.endDate.toISOString(),   // Send endDate in ISO format
        });
        setData(response.data); // Update state with the response data
      } catch (error) {
        console.error(`Error fetching data from ${url}:`, error);
      }
    },
    [dateRange]
  );

  const fetchJobsWithoutExcelUpload = async () => {
    try {
      const response = await axios.get(config.JobSummary.URL.GetJobsWithoutExcelUpload);
      const data = response.data;
      console.log('excel upload fetch: ', response.data);
      const message = data.filter(job => job.isExcelUploaded === false).map(job => `Job No: ${job.jobNo} has not uploaded Excel data`);

      if (message.length > 0) {
        setNotificationMessage(message);
        setShowNotification(true);
      } else {
        setShowNotification(false);
      }
    } catch (error) {
      console.error("Error fetching jobs without Excel upload:", error);
    }
  }

  useEffect(() => {
    fetchData("https://localhost:7035/api/Printing/TotalSQFT", setProductionData);
  //  fetchData(config.Delay.URL.Delivery, setDelayData);
       setDelayData([]);
    setLowStockData([]);
    fetchJobsWithoutExcelUpload();
    //fetchData(config.Inventory.URL.LowStock, setLowStockData);
  }, [dateRange, fetchData]);

  const initialSettings = {
    endDate: dateRange.endDate,
    ranges: {
      "Last 30 Days": getLastNDays(30),
      "Last 7 Days": getLastNDays(7),
    },
    startDate: dateRange.startDate,
    timePicker: false,
    applyButtonClasses: "btn-primary",
    locale: { format: "YYYY-MM-DD" },
  };

  const handleDateRangeChange = (event, picker) => {
    setDateRange({
      startDate: picker.startDate.toDate(),
      endDate: picker.endDate.toDate(),
    });
  };

  const handleCloseNotification = () => {
    setShowNotification(false);
  };

  const renderTable = (title, columns, data = []) => (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title">{title}</h4>
      </div>
      <div className="card-body">
        <div className="table-responsive dataview">
          <table className="table dashboard-table">
            <thead>
              <tr>
                {columns.map((col, index) => (
                  <th key={index}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((col, colIndex) => (
                      <td key={colIndex}>{row[col] || "N/A"}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length}>No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="row mb-4">
            <div className="d-flex align-items-center top-right">
              <div className="position-relative daterange-wraper me-2">
                <div className="input-groupicon calender-input">
                  <DateRangePicker
                    initialSettings={initialSettings}
                    onApply={handleDateRangeChange}
                  >
                    <input
                      className="form-control col-4 input-range"
                      type="text"
                      value={`${dateRange.startDate
                        .toISOString()
                        .split("T")[0]} - ${dateRange.endDate
                          .toISOString()
                          .split("T")[0]}`}
                      readOnly
                    />
                  </DateRangePicker>
                </div>
                <Calendar className="feather-14" />
              </div>
            </div>
          </div>

          {renderTable(
            "Delay in Delivery",
            ["No of Cases", "Customer Name"],
            delayData
          )}
          {/* {renderTable(
            "Production",
            ["Location", "Customer", "Media", "SQFT", "Machine"],
            productionData
          )} */}
          {renderTable(
            "Low Stock Products",
            ["Product", "SKU", "Stock Level", "Reorder Level"],
            lowStockData
          )}


          <div>
            {showNotification && (
              <Notification
                headline="Excel not uploaded!"
                message={notificationMessage}
                onClose={handleCloseNotification}
                show={showNotification}
                containerBg="rgba(116, 143, 231, 0.445)"
                bgColor="blue"
                headerColor="#5b79ff"
              />
            )}
      {showOrderPopup && yetToStartItems.length > 0 && (
        <OrderPopup
          show={showOrderPopup}
          items={yetToStartItems}
          jobOptions={jobNo}
          onClose={() => setShowOrderPopup(false)}
          containerBg="rgba(220, 53, 69, 0.95)"
          bgColor="#f8d7da"
          headerColor="#b02a37"
        />
      )}


          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
