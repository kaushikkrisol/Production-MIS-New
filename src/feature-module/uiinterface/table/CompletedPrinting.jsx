import React, { useEffect, useState } from 'react';
import config from '../../../config';
import axios from 'axios';
import { Form, Row, Col, Table, Button } from 'react-bootstrap';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './CompletedPrinting.css';

const CompletedPrinting = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exJobNumber, setExJobNumber] = useState([]);
    const [selectedExJobNumber, setSelectedExJobNumber] = useState('');
    const [filteredData, setFilteredData] = useState([]); // State for filtered data
    const [reason, setReason] = useState('');
    const [detailedReason, setDetailedReason] = useState('');
    const [selectedRows, setSelectedRows] = useState({});
    const [error, setError] = useState('');

    const getLoggedInUserName = () => {
        try {
            const users = localStorage.getItem('users');
            if (!users) return '';

            const usersObject = JSON.parse(users);
            return (
                usersObject?.message?.username ||
                usersObject?.message?.userName ||
                usersObject?.message?.name ||
                usersObject?.username ||
                usersObject?.userName ||
                usersObject?.name ||
                ''
            );
        } catch (error) {
            console.error('Unable to read logged in user:', error);
            return '';
        }
    };
    
    const reasonOptions = [
  { value: "Reprinting – Client Request", label: "Reprinting – Client Request" },
  { value: "Reprinting – Design Error (Client)", label: "Reprinting – Design Error (Client)" },
  { value: "Reprinting – Design Error (Operator)", label: "Reprinting – Design Error (Operator)" },
  { value: "Reprinting – Printer Error (Operator) internal", label: "Reprinting – Printer Error (Operator) internal" },
  { value: "Reprinting – Printer Error Client side", label: "Reprinting – Printer Error Client side" },
  { value: "Reprinting – Print Machine Error", label: "Reprinting – Print Machine Error" },
  { value: "Reprinting – Print Damage During Transit", label: "Reprinting – Print Damage During Transit" },
  { value: "Reprinting – Print Damage", label: "Reprinting – Print Damage" },
  { value: "Reprinting – Lamination Error - Internal", label: "Reprinting – Lamination Error - Internal" },
  { value: "Reprinting – Installation Error - Internal", label: "Reprinting – Installation Error - Internal" },
  { value: "Reprint due to size issue - Client", label: "Reprint due to size issue - Client" },
  { value: "Reprint due to size issue", label: "Reprint due to size issue" },
  { value: "Reprint due to media mismatch", label: "Reprint due to media mismatch" },
  { value: "Others", label: "Others" },
];


    const [user, setUser] = useState('');
    // Check if users data exists and is not null
    useEffect(() => {
        const username = getLoggedInUserName();

        if (username) {
            setUser(username);
            console.log('Username:', username);
        } else {
            console.log('No user data found in localStorage.');
        }
    }, []);


    const handleFetchCompletedPrinting = async () => {
            setLoading(true);
            try {

                const response = await axios.post(config.Printing.URL.GetCompletedPrinting, {
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json' // Ensure the correct content type
                    }
                });

                console.log("Fetching data from printing:", config.Printing.URL.GetCompletedPrinting);

                console.log("Data fetched successfully: ", response.data);

                if (Array.isArray(response.data) && response.data.length > 0) {
                    setData(response.data);
                    setExJobNumber(response.data);

                }

            } catch (error) {
                console.error("Error fetching job data:", error.response ? error.response.data : error.message);
            } finally {
                setLoading(false);
            }
        }

        const handlereason=(selectedOption)=>{
                const value=selectedOption ? selectedOption.value:'';
                setReason(value);
                if(value){
                    setError('')
                }


        }

        useEffect(() => {
            handleFetchCompletedPrinting();
        }, []);

        console.log(data, loading, error, user)

    const jobNoOptions = [...new Set(exJobNumber.map(job => job.jobNo))].map(jobNo => ({
        value: jobNo,
        label: jobNo,
    }));

    const handleExJobNoSelectChange = (selectedOption) => {
        if (selectedOption) {
            console.log(selectedOption); // Log the selected option
            setSelectedExJobNumber(selectedOption.value); // Set the selected customer ID

            // Find the customer name based on the selected option
            const selectedJobNo = jobNoOptions.find(option => option.value === selectedOption.value);

            // setCustomerName(selectedJobNo ? selectedJobNo.label : ''); // Set the customer name
            console.log("Job No :", selectedOption.value);
            console.log("Job No is:", selectedJobNo ? selectedJobNo.label : '');
        } else {
            setSelectedExJobNumber('');
        }
    };

    const handleSearch = () => {
        // Filter the data based on the selected Job No
        if (selectedExJobNumber) {
            const filtered = data.filter(row => row.jobNo === selectedExJobNumber);
            setFilteredData(filtered);
        } else {
            setFilteredData(data); // If no job number is selected, show all data
        }
    };
    const handleReprint = async (e) => {
        e.preventDefault();
        if (!reason) {
            setError('Reason for reprint is required!');
            return;
        }
        try {
            const rowsForReprint = filteredData1.filter(row => selectedRows[row.id]);
            if (rowsForReprint.length === 0) {
                setError('Please select at least one job for reprint!');
                return;
            }

            const reprintEnteredBy = user || getLoggedInUserName();
            const reprintEnteredDate = new Date().toISOString();

            const selectedJobs = rowsForReprint.map(row => ({
                    id: row.id,
                    jobNo: row.jobNo, // Job Number
                    client: row.client,
                    subClient: row.subClient,
                    date: row.date,

                    region: row.region, // Location
                    visualCode: row.visualCode, // Visual Code
                    nameSubCode: row.nameSubCode, // Name Sub Code
                    city: row.city, // City
                    qty: row.qty, // Quantity
                    media: row.media,
                    userName: reprintEnteredBy,                  
                    installation: row.installation,
                    deadline: row.deadline,
                    lamination: row.lamination, // Lamination
                    mounting: row.mounting, // Mounting
                    implementation: row.implementation, // Implementation
                    salonAddress: row.salonAddress, // Salon Address
                    dispatchAddress: row.dispatchAddress, // Dispatch Address
                    remarks: row.remarks, // Remarks
                    actualCompleteTime: row.actCompleteTime, // Actual Completion Time
                    onTimeDelayed: row.onTimeDelayed, // On Time or Delayed status
                    enteredBy: reprintEnteredBy, // Entered By
                    enteredby: reprintEnteredBy,
                    Enteredby: reprintEnteredBy,
                    enteredDate: reprintEnteredDate, // Entered Date
                    entereddt: reprintEnteredDate,
                    Entereddt: reprintEnteredDate,
                    Entereddat: reprintEnteredDate,
                   
                    width: row.width, // Width
                    length: row.height, // Height
                    actualSqFt: row.actualSqFt,
                    totalSqFt: row.totalSqFt, // Total Square Footage
                    startdate: reprintEnteredDate, // Start Date for the job
                    lastUpdated: reprintEnteredDate,
                    lastUpdatedBy: reprintEnteredBy,
                    ReprintReason: reason,
                    ReprintDetailedReason: detailedReason
                   
                   
                }));

                console.log("selected",selectedJobs);
            const response = await axios.post(config.JobSummary.URL.AddreprintData, selectedJobs, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json' // Ensure the correct content type
                }
            });

            setReason('');
            setDetailedReason('');
            setSelectedRows({});
            setError('');

            if (response.status === 200) {
                toast.success("Reprinted successfully!");
            }

            console.log(response.data);
        
        } catch (error) {
        console.error("Error fetching job data:", error.response ? error.response.data : error.message);
        // setError("Error fetching job data");
    } 

    }
    
    const filteredData1 = Array.isArray(data) ? data.filter(row =>
        row.jobNo
    ) : [];
    const isSelectAllChecked = filteredData1.length > 0 && filteredData1.every(row => row.isCompleted || selectedRows[row.id]);
    

    const handleSelectAllChange = (e) => {
        const isChecked = e.target.checked;
        const newSelectedRows = {};
        filteredData1.forEach(row => {
            if (!row.isCompleted) {
                newSelectedRows[row.id] = isChecked;
            }
        });
        setSelectedRows(newSelectedRows);
        console.log('select all', newSelectedRows);
    };

    const handleCheckboxChange = (id) => {
        setSelectedRows(prev => {
            const newSelectedRows = { ...prev, [id]: !prev[id] };
            filteredData1.forEach(job => {
                newSelectedRows[job.productionid] = true; // Mark the job as selected
            });

            console.log('prev', prev);
            console.log("Current selected rows state:", newSelectedRows); // Log the new state after change
            return newSelectedRows;
        });
        console.log("After change:", { ...selectedRows, [id]: !selectedRows[id] });
        console.log('Selected rows ', selectedRows);

        console.log(`Production id: ${id}`);
    };


    const  handleDetailedreason  = (e) => {
        const value = e.target.value;
        setDetailedReason(value);
        if (value) setError('');
    }
    return (
      <div className="completed-printing-page">
  {/* Row 1 */}
  <Row className="g-3 align-items-end">
    <Col lg={8}>
      <Form.Group>
        <Form.Label>Job No</Form.Label>
        <Select
          options={jobNoOptions}
          value={jobNoOptions.find(o => o.value === selectedExJobNumber) || null}
          onChange={handleExJobNoSelectChange}
          placeholder="Select Job No"
        />
      </Form.Group>
    </Col>

    <Col lg={2} className="d-grid">
      <Button onClick={handleSearch}>Search</Button>
    </Col>

    <Col lg={2} className="d-grid">
      <Button onClick={handleReprint} variant="danger">Reprint</Button>
    </Col>
  </Row>

  {/* Row 2 */}
  <Row className="g-3 mt-1">
    <Col lg={6}>
      <Form.Label>Reason for Reprint</Form.Label>
      <Select
        options={reasonOptions}
        value={reasonOptions.find(o => o.value === reason) || null}
        onChange={handlereason}
        placeholder="Select reason"
      />
    </Col>

    <Col lg={6}>
      <Form.Label>Detailed Remark</Form.Label>
      <Form.Control
        type="text"
        placeholder="Enter detailed reason"
        value={detailedReason}
        onChange={handleDetailedreason}
      />
    </Col>

    {error && <div className="text-danger mt-2">{error}</div>}
  </Row>
            <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
                <Table striped bordered hover className='w-100 mb-0'>
                    <thead>
                        <tr>
                        <th><Form.Check
                                type="checkbox"
                                onChange={handleSelectAllChange}
                                checked={isSelectAllChecked}
                            /></th>
                            <th>Date</th>
                            <th>Job ID</th>
                            <th>Printer Name</th>
                            <th>Qty</th>
                            <th>Print W.</th>
                            <th>Print L.</th>
                            <th>Print SQ.Ft.</th>
                            <th>Media</th>
                            <th>Implementation (Y/N)</th>
                            <th>Deadline</th>
                            <th>Lamination Media Type</th>
                            <th>Mounting</th>
                            <th>Salon Address</th>
                            <th>Client</th>
                            <th>Sub Client</th>
                            <th>Account Manager</th>
                            <th>Visual Code</th>
                            <th>Name Sub Code</th>
                            <th>Remarks</th>

                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? (
                            filteredData.map((row) => (
                                <tr key={row.id}>
                                    <td>
                                        <Form.Check
                                            key={row.id}
                                            type="checkbox"
                                            checked={!!selectedRows[row.id]}
                                            onChange={() => handleCheckboxChange(row.id)}
                                            disabled={row.isCompleted}
                                        />
                                    </td>
                                    <td>{row.date}</td>
                                    <td>{row.jobNo}</td>
                                    <td>{'-'}</td>
                                    <td>{row.qty}</td>
                                    <td>
    {row.width && !isNaN(parseFloat(row.width)) ? (Math.ceil(parseFloat(row.width) * 100) / 100).toFixed(2) : ''}
  </td>
  <td>
    {row.height && !isNaN(parseFloat(row.height)) ? (Math.ceil(parseFloat(row.height) * 100) / 100).toFixed(2) : ''}
  </td>
  <td>
    {row.totalSqFt && !isNaN(parseFloat(row.totalSqFt)) ? (Math.ceil(parseFloat(row.totalSqFt) * 100) / 100).toFixed(2) : ''}
  </td>
                                    <td>{row.media}</td>
                                    <td>{row.implementation}</td>
                                    <td>{row.deadline}</td>
                                    <td>{row.lamination}</td>
                                    <td>{row.mounting}</td>
                                    <td>{row.salonAddress}</td>
                                    <td>{row.client}</td>
                                    <td>{row.subClient}</td>
                                    <td>{row.accountManager}</td>
                                    <td>{row.visualCode}</td>
                                    <td>{row.nameSubCode}</td>
                                    <td>{row.remarks}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="20" className="text-center">No results found</td>
                            </tr>
                        )}
                        
                    </tbody>
                </Table>
                <div><ToastContainer /></div>
            </div>
        </div>
    );
};

export default CompletedPrinting;
