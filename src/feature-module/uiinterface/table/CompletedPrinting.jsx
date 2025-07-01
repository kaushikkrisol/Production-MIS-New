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
    
    const reasonOptions = [
        {value:'Other Error', label:'Other Error'},
        { value: 'Design Error(Operator)', label: 'Design Error(Operator)' },
        { value: 'Printer Error(Operator)', label: 'Printer Error(Operator)' },
        { value: 'Print machine Error', label: 'Print machine Error' },
        { value: 'Print Damage During Transit', label: 'Print Damage During Transit' },
        { value: 'Lamination Error', label: 'Lamination Error' },
        { value: 'Installation Error', label: 'Installation Error' },
    ];

    const [user, setUser] = useState('');
    // Check if users data exists and is not null
    useEffect(() => {
        const users = localStorage.getItem('users');

        // Check if users data exists and is not null
        if (users) {
            // Parse the JSON string into an object
            const usersObject = JSON.parse(users);

            // Access the username
            const username = usersObject.message && usersObject.message.username;
            setUser(username);

            // Log the username to the console
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
            const selectedJobs = filteredData1
                .filter(row => selectedRows[row.id]) // Include only selected rows
                .map(row => ({
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
                    userName:row.userName,                  
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
                    enteredBy: row.enteredby, // Entered By
                    enteredDate: row.entereddt, // Entered Date
                   
                    width: row.width, // Width
                    length: row.height, // Height
                    actualSqFt: row.actualSqFt,
                    totalSqFt: row.totalSqFt, // Total Square Footage
                    startdate: new Date().toISOString(), // Start Date for the job
                    lastUpdated: new Date().toISOString(),
                    ReprintReason: reason
                   
                   
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

        <div>
            <Row className="mb-3 align-items-center">
                <Col lg={9}>
                    <Form.Group>
                        <Form.Label>Job No</Form.Label>
                        <Select
                            options={jobNoOptions}
                            value={jobNoOptions.find(option => option.value === selectedExJobNumber) || null} // Bind the selected value
                            onChange={handleExJobNoSelectChange} // Call the updated function
                            placeholder="Select Job No"
                            style={{ width: '400px' }}
                        />
                    </Form.Group>
                </Col>
                <Col><Button onClick={handleSearch} className='mt-4'>Search</Button></Col>
                <Col><Button onClick={handleReprint} className='mt-4 ml-8'>Reprint</Button></Col>
                </Row>

                <Row className="mb-3">
                <Col>
                    <Form.Label>Reason for Reprint</Form.Label>
                    <Select
                        options={reasonOptions}
                        value={reasonOptions.find(option => option.value === reason) || null}
                        onChange={selected => setReason(selected?.value || '')}
                        placeholder="Select reason"
                    />
                </Col>
                <Col>
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

            <div style={{ overflowX: 'auto', overflowY: 'auto', position: 'sticky' }}>
                <Table striped bordered hover>
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
                                <td colSpan="10" className="text-center">No results found</td>
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