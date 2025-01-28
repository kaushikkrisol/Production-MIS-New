import React, { useState, useEffect, useCallback } from "react";
import DateRangePicker from "react-bootstrap-daterangepicker";
import { Calendar } from "feather-icons-react/build/IconComponents";
import axios from "axios";

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
  const [dateRange, setDateRange] = useState({
    startDate: getLastNDays(7)[0], // Ensure getLastNDays is defined before use
    endDate: new Date(),
  });

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

  useEffect(() => {
    fetchData("https://localhost:7035/api/Printing/TotalSQFT", setProductionData);
  //  fetchData(config.Delay.URL.Delivery, setDelayData);
       setDelayData([]);
    setLowStockData([]);
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
          {renderTable(
            "Production",
            ["Location", "Customer", "Media", "SQFT", "Machine"],
            productionData
          )}
          {renderTable(
            "Low Stock Products",
            ["Product", "SKU", "Stock Level", "Reorder Level"],
            lowStockData
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
