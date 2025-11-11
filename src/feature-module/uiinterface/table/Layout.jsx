import React, { useEffect, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import axios from 'axios';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import config from '../../../config';
import './layout.css';

const Layout = () => {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const gridRef = useRef(null);

  const columnDefs = [
    {
      headerName: "Job No",
      field: "jobNo",
      sortable: true,
      filter: true,
      checkboxSelection: true,
      headerCheckboxSelection: true,
       headerCheckboxSelectionFilteredOnly: true
    },
    { headerName: "Client", field: "client", sortable: true, filter: true },
    { headerName: "Media", field: "media", sortable: true, filter: true },
    { headerName: "Deadline", field: "deadline", sortable: true, filter: true },
    { headerName: "Region", field: "region", sortable: true, filter: true },
    { headerName: "Remarks", field: "remarks", sortable: true, filter: true },
    { headerName: "Deleted By", field: "lstupateby", sortable: true, filter: true },
    { headerName: "Deleted On", field: "lstupdatedt", sortable: true, filter: true },
    { headerName: "Deletion Comment", field: "deleteComment", sortable: true, filter: true },
  
  ];

  useEffect(() => {
    fetchDeletedJobs();
  }, []);

  const fetchDeletedJobs = async () => {
    setLoading(true);
    try {
      const response = await axios.post(config.JobSummary.URL.GetDeletedData);
      const data = response.data?.slice(0, 7000); // Limit to 7000 records
      setRowData(data);
    } catch (error) {
      console.error("Failed to fetch deleted jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (jobData) => {
  try {
    const response = await axios.post(config.JobSummary.URL.RestoreJob, { id: jobData.id });

    if (response.data.success) {
      alert("Job restored successfully!");
      fetchDeletedJobs(); // Refresh the table
    } else {
      alert("Restore failed: " + response.data.message);
    }
  } catch (error) {
    console.error("Error restoring job:", error);
    alert("An error occurred while restoring the job.");
  }
};


  const onSelectionChanged = () => {
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const selectedData = selectedNodes.map(node => node.data);
    setSelectedRows(selectedData);
  };

  const handleBulkRestore = async () => {
  if (selectedRows.length === 0) {
    alert("Please select at least one job to restore.");
    return;
  }

  if (!window.confirm(`Are you sure you want to restore ${selectedRows.length} job(s)?`)) return;

  try {
    for (const job of selectedRows) {
      const ids=selectedRows.map(job=>job.id)
      await axios.post(config.JobSummary.URL.RestoreJob, {ids});
    }
    alert(`Successfully restored ${selectedRows.length} job(s)!`);
    fetchDeletedJobs();
    setSelectedRows([]);
  } catch (error) {
    console.error("Bulk restore error:", error);
    alert("An error occurred during bulk restore.");
  }
};


  return (
    <div className="page-content">
      <div className="container-fluid">
        <h4 className="page-title text-center mb-4">Deleted Jobs</h4>

        {selectedRows.length > 0 && (
          <div className="text-end mb-3">
            <button className="btn btn-warning" onClick={handleBulkRestore}>
              🔁 Restore Selected ({selectedRows.length})
            </button>
          </div>
        )}

        <div className="ag-theme-alpine custom-ag-grid" style={{ height: 600, width: '100%' }}>
          {loading && <p>Loading deleted jobs...</p>}
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            rowSelection="multiple"
            onSelectionChanged={onSelectionChanged}
            groupSelectsFiltered={false}
            pagination={true}
            paginationPageSize={25}
            domLayout="autoHeight"
          />
        </div>
      </div>
    </div>
  );
};

export default Layout;
