import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import config from '../../../config';
import moment from 'moment';
import { getCompanyBranchDetails } from './companyBranches';
import { findCustomerRecord, mergeFallbackCustomers } from './customerFallbacks';

const Printlaminpacking = ({ location_id }) => {
  const [loading, setLoading] = useState(false);
  const [showLength, setShowLength] = useState(false);
  const [data, setData] = useState([]);
  const [selectedTotals, setSelectedTotals] = useState({ qty: 0, width: 0, length: 0, totalSqFt: 0 });
  const [printerNames, setPrinterNames] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState("");
  const [wasteagePerData, setWasteagePerData] = useState([]);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [isJobRunning, setIsJobRunning] = useState(true);
  const [lastSelectedIds, setLastSelectedIds] = useState([]);
  const [gridApi, setGridApi] = useState(null);
  const [selectedRows, setSelectedRows] = useState({});
  const [actualSqFt, setActualSqFt] = useState(0);

  const pinnedBottomRowData = useMemo(() => {
    return [{
      jobNo: 'Selected Total',
      qty: selectedTotals.qty,
      width: selectedTotals.width,
      [showLength ? 'length' : 'height']: selectedTotals.length,
      totalSqFt: selectedTotals.totalSqFt
    }];
  }, [selectedTotals, showLength]);

  useEffect(() => {
    const users = localStorage.getItem('users');
    const userObj = users ? JSON.parse(users) : null;

    const locId = userObj?.message?.location_id || '';
    setLocationId(locId);
    setUserId(userObj?.message?.user_id || null);
    setUsername(userObj?.message?.username || '');

    if (locId) {
      fetchPrinting(locId);
      fetchCustomerDetails(locId);
    }
  }, [location_id]);

  const fetchPrinting = async (location_id) => {
    try {
      const payload = { locationId: location_id };
      const response = await axios.post(config.Packing.URL.GetAllPacking, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });

      setData(response.data || []);
      console.log('Fetched packing data:', response.data);

      setTimeout(() => {
        if (gridApi && lastSelectedIds.length > 0) {
          gridApi.forEachNode(node => {
            if (lastSelectedIds.includes(node.data.id)) {
              node.setSelected(true);
            }
          });
        }
      }, 200);
    } catch (error) {
      console.error("Error fetching job data:", error.response ? error.response.data : error.message);
    }
  };



  const formatDisplayDate = (dateVal) => {
    if (!dateVal) return '';
    const m = moment(dateVal);
    return m.isValid() ? m.format('DD-MM-YYYY') : dateVal;
  };

  const buildItemDetails = (row) => {
    const parts = [
      row.media,
      row.lamination,
      row.mounting,
      row.implementation,
      row.nameSubCode || row.visualCode
    ].filter(Boolean);

    return parts.join(' - ');
  };

  const fetchCustomerDetails = async () => {
    try {
      const users = localStorage.getItem('users');
      if (!users) {
        console.error("No user data found in local storage.");
        return; // Exit if no user data
      }

      const userObj = JSON.parse(users);
      let location_id = userObj?.message?.location_id;

      if (!location_id) {
        console.error("Location ID is not found in user data.");
        return; // Exit if no location ID
      }

      console.log('Location ID for fetch customers: ', location_id);

      let payload = {
        locationid: location_id
      };

      console.log('Payload for fetch customers:', payload);

      const response = await axios.post(config.JobSummary.URL.Getallcustomer, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Get customer response:', response.data);
      setCustomers(mergeFallbackCustomers(response.data));


    } catch (error) {
      console.error("Error fetching customer data:", error.response ? error.response.data : error.message);
      // setError("Error fetching job data");
    } finally {
      setLoading(false);
    }
  };


  const handleStartJob = async () => {
    if (!gridApi) return;

    const selectedNodes = gridApi.getSelectedNodes();
    const selectedJobs = selectedNodes.map(node => {
      const row = node.data;

      const width = parseFloat(row.width || 0);
      const height = parseFloat(row.height || row.length || 0);
      const qty = parseFloat(row.qty || 0);
      const totalSqFt = ((width * height * qty) / 144).toFixed(2);

      return {
        id: row.id,
        jobNo: row.jobNo || '',
        date: row.date || row.entereddt || '',
        client: row.client || '',
        subClient: row.subClient || '',
        userName: username || '',
        printerName: row.printerPrintingName || row.printerName || '',
        region: row.region || '',
        visualCode: row.visualCode || '',
        nameSubCode: row.nameSubCode || '',
        city: row.city || '',
        qty: row.qty || 0,
        media: row.media || '',
        mediaWidth: row.width || '',
        mediaLength: row.height || row.length || '',
        width: row.width || '',
        length: row.height || row.length || '',
        totalSqFt: row.totalSqFt || totalSqFt,
        installation: row.installation || '',
        deadline: row.deadline || '',
        lamination: row.lamination || '',
        mounting: row.mounting || '',
        implementation: row.implementation || '',
        salonAddress: row.salonAddress || '',
        dispatchAddress: row.dispatchAddress || '',
        remarks: row.remarks || '',
        actualCompleteTime: row.actCompleteTime || '',
        onTimeDelayed: row.onTimeDelayed || '',
        enteredBy: row.enteredBy || '',
        entereddt: row.entereddt || '',
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: username || '',
        startdate: new Date().toISOString(),
        ActualSqFt: totalSqFt
      };
    });

    if (selectedJobs.length === 0) {
      alert('❗ Please select at least one job to Start!');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(config.Packing.URL.StartPacking, selectedJobs);

      if (response.status === 200 && Array.isArray(response.data.lstdata)) {
        alert('✅ Job Started Successfully!');
        setData(response.data.lstdata);
        setSelectedTotals({ qty: 0, width: 0, length: 0, totalSqFt: 0 });
        setLastSelectedIds([]);
        gridApi.deselectAll();
      } else {
        console.error("Unexpected response:", response.data);
        alert('⚠️ Unexpected data format from StartPacking API.');
      }
    } catch (error) {
      console.error('Error starting job:', error);
      alert('❌ Failed to Start Job!');
      const selectedIds = selectedJobs.map(j => j.id);
      setLastSelectedIds(selectedIds);
    } finally {
      setLoading(false);
    }
  };

  const handleStopJob = async () => {
    if (!gridApi) return;

    const selectedNodes = gridApi.getSelectedNodes();
    const selectedJobs = selectedNodes.map(node => ({
      id: node.data.id,
      packingId: node.data.packingid,
      location_id: locationId,
      enddate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: username
    }));

    if (selectedJobs.length === 0) {
      alert('❗ Please select at least one job to Stop!');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(config.Packing.URL.StopPacking, selectedJobs);

      if (response.status === 200) {
        alert('✅ Job Stopped Successfully!');
        setData(response.data);
        setLastSelectedIds([]);
        gridApi.deselectAll();
      }
    } catch (error) {
      console.error('Error stopping job:', error);
      alert('❌ Failed to Stop Job!');
    } finally {
      setLoading(false);
    }
  };

  const columnDefs = useMemo(() => [
    { headerName: '', checkboxSelection: true, headerCheckboxSelection: true, width: 50, filter: false },
    {
      headerName: 'Job Date',
      field: 'date',
      minWidth: 130,
      filter: 'agDateColumnFilter',
      valueGetter: params => {
        const dateVal = params.data.date || params.data.entereddt;
        return dateVal ? moment(dateVal).format("DD/MMM/YYYY") : '-';
      }
    },
    { headerName: 'Job ID', field: 'jobNo', minWidth: 140, filter: 'agTextColumnFilter' },
    { headerName: 'Printer Name', valueGetter: params => params.data.printerPrintingName || params.data.printerName || '-', minWidth: 180, filter: 'agTextColumnFilter' },
    { headerName: 'Qty', field: 'qty', minWidth: 110, filter: 'agNumberColumnFilter' },
    { headerName: 'Print W.', field: 'width', valueFormatter: params => parseFloat(params.value || 0).toFixed(2), minWidth: 130, filter: 'agNumberColumnFilter' },
    { headerName: 'Print L.', field: showLength ? 'length' : 'height', valueFormatter: params => parseFloat(params.value || 0).toFixed(2), minWidth: 130, filter: 'agNumberColumnFilter' },
    { headerName: 'Print SQ.Ft.', field: 'totalSqFt', valueFormatter: params => parseFloat(params.value || 0).toFixed(2), minWidth: 140, filter: 'agNumberColumnFilter' },
    { headerName: 'Media', field: 'media', minWidth: 180, filter: 'agTextColumnFilter' },
    { headerName: 'Implementation', field: 'implementation', minWidth: 150, filter: 'agTextColumnFilter' },
    { headerName: 'Job Deadline', field: 'deadline', minWidth: 170, filter: 'agDateColumnFilter' },
    { headerName: 'Lamination Media Type', field: 'lamination', minWidth: 200, filter: 'agTextColumnFilter' },
    { headerName: 'Mounting', field: 'mounting', minWidth: 140, filter: 'agTextColumnFilter' },
    { headerName: 'Salon / Store Address', field: 'salonAddress', minWidth: 220, filter: 'agTextColumnFilter' },
    { headerName: 'Dispatch Address', field: 'dispatchAddress', minWidth: 220, filter: 'agTextColumnFilter' },
    { headerName: 'Job Start Date', field: 'startdate', minWidth: 170, filter: 'agDateColumnFilter' },
    { headerName: 'Job End Date', field: 'enddate', minWidth: 170, filter: 'agDateColumnFilter' },
    { headerName: 'Client', field: 'client', minWidth: 140, filter: 'agTextColumnFilter' },
    { headerName: 'Sub Client', field: 'subClient', minWidth: 140, filter: 'agTextColumnFilter' },
    { headerName: 'Account Manager', field: 'userName', minWidth: 160, filter: 'agTextColumnFilter' },
    { headerName: 'Visual Code', field: 'visualCode', minWidth: 200, filter: 'agTextColumnFilter' },
    { headerName: 'Product Details', field: 'nameSubCode', minWidth: 400, filter: 'agTextColumnFilter' },
    { headerName: 'Printing Machine', field: 'printerPrintingName', minWidth: 180, filter: 'agTextColumnFilter' },
    { headerName: 'Printer Deadline', field: 'printerDeadline', minWidth: 180, filter: 'agDateColumnFilter' },
    { headerName: 'Remarks', field: 'remarks', minWidth: 300, filter: 'agTextColumnFilter' },
    {
  headerName: 'View Challan',
  minWidth: 150,
  cellRenderer: (params) => {
    const challanId = params.data?.challanId;
    if (!challanId) return '-';

    return (
      <button
        className="btn btn-sm btn-primary"
        onClick={() => window.open(`/deliverychallan/${challanId}`, '_blank')}
      >
        View Challan
      </button>
    );
  }
}
  ], [showLength]);

  const onSelectionChanged = (event) => {
    const selectedNodes = event.api.getSelectedNodes();
    const selectedRowsData = selectedNodes.map(node => node.data);

    const newSelectedRows = {};
    let totalQty = 0;
    let totalWidth = 0;
    let totalLength = 0;
    let totalSqFt = 0;

    selectedRowsData.forEach(row => {
      if (row) {
        newSelectedRows[row.id] = true;

        const width = parseFloat(row.width) || 0;
        const length = parseFloat(row.height || row.length) || 0;
        const qty = parseFloat(row.qty) || 0;

        totalQty += qty;
        totalWidth += width * qty;
        totalLength += length * qty;
        totalSqFt += (width * length * qty) / 144;
      }
    });

    setSelectedRows(newSelectedRows);

    setSelectedTotals({
      qty: totalQty,
      width: totalWidth.toFixed(2),
      length: totalLength.toFixed(2),
      totalSqFt: totalSqFt.toFixed(2)
    });

    setActualSqFt(totalSqFt.toFixed(2));
  };

  return (
    <div className="print-lamination-packing-container">
      <h1 style={{ height: '10rem', width: '90%', paddingLeft: "50rem", paddingTop: "6rem" }}>
        Lamination / Mounting and Packing
      </h1>

      {loading ? (
        <div className="loading" style={{ fontSize: '18px', fontWeight: 'bold' }}>
          Loading data...
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginLeft: "17rem", marginBottom: '1rem', gap: '1rem' }}>
            <button className="btn btn-success" onClick={handleStartJob}>
              Start Job
            </button>

            <button className="btn btn-danger" onClick={handleStopJob}>
              Stop Job
            </button>

         
          </div>

          <div className="ag-theme-alpine custom-ag-grid" style={{ width: '85%', marginLeft: "17rem" }}>
            <AgGridReact
              rowData={data}
              columnDefs={columnDefs}
              rowSelection="multiple"
              onGridReady={(params) => setGridApi(params.api)}
              onSelectionChanged={onSelectionChanged}
              getRowHeight={() => 40}
              domLayout="autoHeight"
              getRowNodeId={data => data.id}
              suppressRowClickSelection
              pagination
              paginationPageSize={20}
              pinnedBottomRowData={pinnedBottomRowData}
            />
          </div>

          <div>
            <h3>Printer Names</h3>
            {printerNames.length > 0 ? (
              <ul>
                {printerNames.map((printer, index) => (
                  <li key={index}>{printer}</li>
                ))}
              </ul>
            ) : (
              <p>No printers available.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Printlaminpacking;
