// DataTablesBranchManager.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import axios from 'axios';
import { Button, Spinner } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const config = {
  JobSummary: {
    URL: {
      GetAllJobsAccToLocation: '/api/job/get-jobs-location',
      UpdateField: '/api/job/update-field'
    }
  }
};

const filterConfig = [
  { key: 'jobNo', placeholder: 'Job No' },
  { key: 'client', placeholder: 'Client' },
  { key: 'subClient', placeholder: 'Sub Client' },
  { key: 'date', placeholder: 'Job Date' },
  { key: 'productionLocation', placeholder: 'Production Location' },
  { key: 'qty', placeholder: 'Qty' },
  { key: 'width', placeholder: 'Width' },
  { key: 'height', placeholder: 'Height' },
  { key: 'totalSqFt', placeholder: 'Total Sq.Ft' },
  { key: 'media', placeholder: 'Media' },
  { key: 'lamination', placeholder: 'Lamination' },
  { key: 'mounting', placeholder: 'Mounting' },
  { key: 'remarks', placeholder: 'Remarks' }
];

const DataTablesBranchManager = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const gridRef = useRef();

  const columnDefs = useMemo(() => {
    return filterConfig.map(col => ({
      headerName: col.placeholder,
      field: col.key,
      editable: true,
      sortable: true,
      filter: true,
      minWidth: 120,
      resizable: true,
    }));
  }, []);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    editable: true,
    sortable: true,
    filter: true,
    resizable: true
  }), []);

  const getJobs = async () => {
    try {
      setLoading(true);
      const users = JSON.parse(localStorage.getItem('users'));
      const payload = {
        locationId: users?.message?.location_id,
        username: users?.message?.username
      };
      const res = await axios.post(config.JobSummary.URL.GetAllJobsAccToLocation, payload);
      setData(res.data.items);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching job data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getJobs();
  }, []);

  const handleCellEdit = async (params) => {
    try {
      const { jobNo } = params.data;
      const field = params.colDef.field;
      const value = params.newValue;

      await axios.post(config.JobSummary.URL.UpdateField, {
        jobNo,
        field,
        value
      });

      toast.success(`${field} updated successfully`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to update field`);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <ToastContainer />
        <h3>Branch Manager Job Editor</h3>
        {loading ? (
          <Spinner animation="border" className="d-block mx-auto" />
        ) : (
          <div className="ag-theme-alpine" style={{ height: 600, width: '100%' }}>
            <AgGridReact
              ref={gridRef}
              rowData={data}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              pagination={true}
              paginationPageSize={50}
              onCellValueChanged={handleCellEdit}
              rowSelection="multiple"
            />
          </div>
        )}
        <Button variant="secondary" className="mt-3" onClick={getJobs}>Refresh Data</Button>
      </div>
    </div>
  );
};

export default DataTablesBranchManager;
