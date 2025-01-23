import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Row, Col, Alert, Spinner, Table } from 'react-bootstrap';
import axios from 'axios';
import config from '../../../config';
import 'bootstrap/dist/css/bootstrap.min.css';

import './Designn.css';

const Designn = () => {
    const [jobs, setJobs] = useState([]);
    const [selectedDesignIds, setSelectedDesignIds] = useState([]);
    const [data, setData] = useState([]);
    const [newJobNo, setNewJobNo] = useState('');

    const [jobNumbers, setJobNumbers] = useState([]);
    const [newClientName, setNewClientName] = useState('');
    const [newNoOfJobs, setNewNoOfJobs] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [newUploadDate, setNewUploadDate] = useState('');
    const [newWidth, setNewWidth] = useState('');
    const [newHeight, setNewHeight] = useState('');

    const [newBrief, setNewBrief] = useState('');
    const [newQuery, setNewQuery] = useState('');


    const date = new Date();
    const recDay = date.getDate();
    const recMonth = date.getMonth();
    const recYear = date.getFullYear();

    const getISOWeek = (date) => {
        const target = new Date(date.valueOf());
        const dayNr = (date.getDay() + 6) % 7; // Making Sunday=0 and Saturday=6
        target.setDate(target.getDate() + 4 - dayNr); // Adjust to Thursday
        const jan1 = new Date(target.getFullYear(), 0, 1);
        return Math.ceil((((target - jan1) / 86400000) + 1) / 7); // 86400000 is the number of milliseconds in a day
    };

    const [newMonth, setNewMonth] = useState(date.getMonth());
    const [newWeek, setNewWeek] = useState(getISOWeek(date));
    const [newReceivedDate, setNewReceivedDate] = useState(`${recDay}/${recMonth}/${recYear}`);
    console.log(data, setNewMonth, setNewWeek, setNewReceivedDate);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState({});
    const [isJobRunning, setIsJobRunning] = useState(true); // Job status
    console.log(setIsJobRunning);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [designData, setDesignData] = useState([]);
    const [clientNames, setClientNames] = useState([]);

    const [startDate, setStartDate] = useState([]);
    const [endDate, setEndDate] = useState([]);

    const [hiddenRows, setHiddenRows] = useState([]);

    const locations = ["North", "South", "East", "West", "All"];
    const status = ["Done", "Hold"];

    console.log(jobNumbers, setStartDate, setEndDate, setHiddenRows);
    console.log(clientNames, setData, selectedDesignIds, endDate);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            console.log("Fetching data from:", config.JobSummary.URL.Getalljob);
            console.log("Fetching data from:", config.Design.URL.Getalldesign);

            const response = await axios.post(config.JobSummary.URL.Getalljob, {
                timeout: 10000,
            });
            console.log("Data fetched successfully: ", response.data);
            setJobs(response.data);

        } catch (error) {
            console.error("Error fetching job data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDesignJobs = async () => {
        setLoading(true);
        try {
            console.log("Fetching data from:", config.Design.URL.Getalldesign);

            const response = await axios.post(config.Design.URL.Getalldesign);
            console.log('Design of data fetch: ', response.data);
            console.log('designfetch', designData);

            if (response.data && Array.isArray(response.data)) {
                console.log("Design Data fetched successfully: ", response.data);
                setDesignData(response.data);
            } else {
                console.warn("Data returned is not an array or is empty:", response.data);
                setError("No data returned from the API");
            }
            // setData(response.data); // Use setData to update state
            // setDesignData(response.data);

        } catch (error) {
            console.error("Error fetching job data:", error);
            setError("Error fetching job data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await Promise.all([fetchJobs(), fetchDesignJobs()]);
                setJobNumbers(response.data.map(job => job.jobNo));
                setClientNames(response.data.map(job => job.client));
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);


    const handleAddJob = async () => {
        // e.preventDefault();

        const trimmedJobNo = newJobNo.trim();

        if (!trimmedJobNo) {
            alert("Job number cannot be empty.");
            return;
        }

        const newData = {
            jobNo: newJobNo,
            clientName: newClientName,
            noOfJobs: newNoOfJobs,
            location: newLocation,
            status: newStatus,
            receivedDate: newReceivedDate,
            dueDate: newDueDate,
            uploadDate: newUploadDate,
            width: newWidth,
            height: newHeight,
            brief: newBrief,
            query: newQuery,
            month: newMonth,
            week: newWeek,
        };

        try {
            setLoading(true); // Start loading state
            console.log("API URL: ", config.Design.URL.AddDesign);
            const response = await axios.post(config.Design.URL.AddDesign, newData);
            console.log("Design Data submitted successfully: ", response.data);
            setIsJobRunning(true);
            resetForm();           
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Axios error: ", error.message);
                setError(error.response ? error.response.data : "An unexpected error occurred");
                setIsJobRunning(true);
            } else {
                console.error("Unexpected error: ", error);
                setError("An unexpected error occurred");
            }
        } finally {
            setLoading(false); // End loading state.
            
            fetchDesignJobs();
            
        }
    };

    // const handleStartJob = () => {
    //     if (Object.values(selectedRows).some(v => v)) {
    //         const currentTime = new Date().toLocaleTimeString();
    //         setData((prevData) =>
    //             prevData.map((row) => {
    //                 if (selectedRows[row.id] && !row.isStarted) { // Prevent starting already started jobs
    //                     return { ...row, startJobTime: currentTime, isStarted: true };
    //                 }
    //                 return row;
    //             })
    //         );
    //         setIsJobRunning(true);
    //         console.log('Start Time is ', currentTime);
    //     }

    // };

    // const handleStopJob = () => {
    //     const currentTime = new Date().toLocaleTimeString();
    //     setData((prevData) =>
    //         prevData.map((row) => {
    //             if (selectedRows[row.designid] && row.isStarted) { // Ensure we only stop jobs that are started
    //                 return { ...row, stopJobTime: currentTime, isCompleted: true, isStarted: false };
    //             }
    //             return row;
    //         })
    //     );
    //     setSelectedRows({});
    //     setIsJobRunning(false);

    //     console.log('Stop Time is ', currentTime);
    // };
    console.log(startDate);

    const handleStartJob = async () => {
        const selectedJobs = filteredData1
            .filter(row => selectedRows[row.designid]) // Get selected rows
            .map(row => ({ designid: row.designid, name: row.name }));

        const startData = selectedJobs.map(job => ({
            ...job,
            startdate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            entereddt: new Date().toISOString(),
        }));

        console.log("Starting jobs:", startData);

        setLoading(true);
        setIsJobRunning(true);

        try {
            const response = await axios.post(config.Design.URL.AddStart, startData);
            if (response.status === 200) {
                console.log("Start Data submitted successfully:", response.data);

                // Mark jobs as started by adding them to designData
                setDesignData(prevData =>
                    prevData.map(job =>
                        selectedJobs.some(selectedJob => selectedJob.designid === job.designid)
                            ? { ...job, isStarted: true, startDate: new Date().toISOString() }
                            : job
                    )
                );

                // Store only the selected jobs in designData after starting
                const startedJobs = filteredData1.filter(row => selectedRows[row.designid]);
                setDesignData(startedJobs);  // Update designData to show only started jobs

                // Update selectedRows
                setSelectedRows({});  // Clear selection after starting

            } else {
                setError("Unexpected response from the server.");
            }
        } catch (error) {
            handleError(error);
        } finally {
            setLoading(false);
            setIsJobRunning(false);
        }
    };



    const handleStopJob = async () => {
        const selectedJobs = filteredData1
            .filter(row => selectedRows[row.designid]) // Get selected rows
            .map(row => ({ designid: row.designid, name: row.name }));

        const stopData = selectedJobs.map(job => ({
            ...job,
            enddate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            entereddt: new Date().toISOString()
        }));

        console.log('Stopping jobs:', stopData);

        setLoading(true);
        setIsJobRunning(true);

        try {
            const response = await axios.post(config.Design.URL.AddStop, stopData);
            if (response.status === 200) {
                console.log("Stop Data submitted successfully:", response.data);

                // Only keep the started jobs in the designData
                const updatedData = filteredData1.filter(row => selectedRows[row.designid]);
                setDesignData(updatedData);  // Update the data to show only selected jobs
                setSelectedRows({});  // Clear selected rows after stopping

            } else {
                setError("Unexpected response from the server.");
            }
        } catch (error) {
            handleError(error);
        } finally {
            setLoading(false);
            await fetchDesignJobs();  // Optionally re-fetch data if needed
        }
    };



    const handleError = (error) => {
        if (axios.isAxiosError(error)) {
            console.error("Axios error: ", error.message);
            setError(error.response ? error.response.data : "An unexpected error occurred");
        } else {
            console.error("Unexpected error: ", error);
            setError("An unexpected error occurred");
        }
    };

    const convertTo24HourFormat = (timeStr) => {
        const [time, modifier] = timeStr.split(" "); // Split time and AM/PM
        let [hours, minutes, seconds] = time.split(":"); // Split into components

        // Log components for debugging
        console.log(`Original time: ${timeStr}, Hours: ${hours}, Minutes: ${minutes}, Seconds: ${seconds}, Modifier: ${modifier}`);

        if (modifier === "PM" && hours !== "12") {
            hours = (parseInt(hours) + 12).toString(); // Convert PM hours
        } else if (modifier === "AM" && hours === "12") {
            hours = "00"; // Midnight case
        }

        // Return in HH:mm:ss format
        return `${hours}:${minutes}:${seconds || '00'}`;
    };

    const calculateTotalTime = (start, stop) => {
        console.log("Start:", start, "Stop:", stop); // Log inputs

        if (!start || !stop) {
            return 'Invalid time';
        }

        // Convert to 24-hour format
        const start24 = convertTo24HourFormat(start);
        const stop24 = convertTo24HourFormat(stop);

        const startTime = new Date(`1970-01-01T${start24}`);
        const stopTime = new Date(`1970-01-01T${stop24}`);

        console.log("StartTime:", startTime, "StopTime:", stopTime); // Log date objects

        if (isNaN(startTime.getTime()) || isNaN(stopTime.getTime())) {
            return 'Invalid time';
        }

        let totalTime = stopTime - startTime;

        if (totalTime < 0) {
            return 'Stop time must be after start time';
        }

        // Calculate hours, minutes, and seconds
        const hours = Math.floor(totalTime / 3600000);
        const minutes = Math.floor((totalTime % 3600000) / 60000);
        const seconds = Math.floor((totalTime % 60000) / 1000); // Calculate seconds

        return `${hours}h ${minutes}m ${seconds}s`; // Include seconds in the return value
    };

    const totalValues = Object.keys(selectedRows).reduce((totals, id) => {
        if (selectedRows[id]) {
            const row = data.find(item => item.id === parseInt(id));
            if (row) {
                totals.width += parseInt(row.width) || 0;
                totals.height += parseInt(row.height) || 0;
            }
        }
        return totals;
    }, { width: 0, height: 0 });


    const resetForm = () => {
        setNewJobNo('');
        setNewClientName('');
        setNewNoOfJobs('');
        setNewLocation('');
        setNewStatus('');
        // setNewReceivedDate('');
        setNewDueDate('');
        setNewUploadDate('');
        setNewWidth('');
        setNewHeight('');
        setNewBrief('');
        setNewQuery('');
        // setNewMonth('');
        // setNewWeek('');
        setSelectedDesignIds([]);
        // setStartDate('');
        // setEndDate('');
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    useEffect(() => {
        fetchDesignJobs();
    }, []);

    const handleCheckboxChange = (id) => {
        setSelectedRows((prev) => {
            const newSelection = { ...prev, [id]: !prev[id] }; 
            console.log("Current selected rows state:", newSelection); 
            return newSelection;
        });
        console.log("After change:", { ...selectedRows, [id]: !selectedRows[id] });
    };

    const handleSelectAllChange = (e) => {
        const isChecked = e.target.checked;
        const newSelectedRows = {};
        filteredData1.forEach(row => {
            if (!row.isCompleted) {
                newSelectedRows[row.designid] = isChecked;
            }
        });
        setSelectedRows(newSelectedRows);
    };

    const handleJobNumberChange = (jobNo) => {
        setNewJobNo(jobNo);
        const selectedJob = jobs.find(job => job.jobNo === jobNo);
        console.log("Selected Job: ", selectedJob);
        setNewClientName(selectedJob ? selectedJob.client : ''); // Set client name or reset
    };

    const uniqueJobNumbers = [...new Set(jobs.map(job => job.jobNo))];

    const filteredData1 = Array.isArray(designData) ? designData.filter(row =>
        row.jobNo && row.jobNo.toLowerCase().includes(searchTerm.trim().toLowerCase())
    ) : [];

    // const sortedData = filteredData1.sort((a, b) => {
    //     const dateA = a.date1;
    //     const dateB = b.date2;
    //     console.log(`Date A ${dateA} Date B ${dateB}`)

    //     const diffA = Math.abs(date - dateA);
    //     const diffB = Math.abs(date - dateB);

    //     console.log(`diffA: ${diffA} diffB: ${diffB}`);
    //     return diffA - diffB;
    // });

    console.log("Filtered data 1: ", filteredData1);

    return (
        <Container className="mt-5 page-wrapper">
            <div className="content container-fluid">
                <h1 className="display-4 text-center mb-4">Design</h1>
                {error && <Alert variant="danger">{error}</Alert>}
                {loading && <Spinner animation="border" className="d-block mx-auto" />}

                <Row className="mb-3 align-items-center">
                    <Col>
                    {(isJobRunning )? 
                  
                        <Button variant="success" onClick={handleStartJob} disabled={ !Object.values(selectedRows).some(v => v)}>Start Job</Button>
                     : 
                        <Button variant="danger" onClick={handleStopJob}  className="ml-3" disabled={isJobRunning || !Object.values(selectedRows).some(v => v)}>Stop Job</Button>
                        } </Col> 
                </Row>

                <div style={{ overflowX: 'auto' }}>
                    <Form className="mb-3">
                        <Row className="mb-3 align-items-center">
                            <Col xs={2}>
                                <Form.Group>
                                    <Form.Label style={{ width: '200px' }}>Job No</Form.Label>
                                    <Form.Select
                                        placeholder="Enter job number"
                                        value={newJobNo}
                                        onChange={(e) => handleJobNumberChange(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Job Number</option>
                                        {uniqueJobNumbers.map((jobNo, index) => (
                                            <option key={index} value={jobNo}>{jobNo}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col xs={2}>
                                <Form.Group controlId="formClientName">
                                    <Form.Label style={{ width: '200px' }}>Client Name</Form.Label>
                                    <Form.Control
                                        type='text'
                                        value={newClientName}
                                        readOnly
                                    />

                                </Form.Group>
                            </Col>
                            <Col xs={2}>
                                <Form.Group controlId="formNoOfJobs">
                                    <Form.Label style={{ width: '200px' }}>No Of Jobs</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter no. of jobs"
                                        value={newNoOfJobs}
                                        onChange={(e) => setNewNoOfJobs(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={2}>
                                <Form.Group controlId="formBrief">
                                    <Form.Label style={{ width: '200px' }}>Brief</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter brief"
                                        value={newBrief}
                                        onChange={(e) => setNewBrief(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={2}>
                                <Form.Group controlId="formLocation">
                                    <Form.Label style={{ width: '200px' }}>Location</Form.Label>
                                    <Form.Select
                                        placeholder="Enter location"
                                        value={newLocation}
                                        onChange={(e) => setNewLocation(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Location</option>
                                        {locations.map((location, index) => (
                                            <option key={index} value={location}>{location}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col xs={2}>
                                <Form.Group controlId="formStatus">
                                    <Form.Label style={{ width: '200px' }}>Status</Form.Label>
                                    <Form.Select
                                        placeholder="Enter status"
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Status</option>
                                        {status.map((status, index) => (
                                            <option key={index} value={status}>{status}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col xs={2}>
                                <Form.Group controlId="formQuery">
                                    <Form.Label style={{ width: '200px' }}>Query</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter Query"
                                        value={newQuery}
                                        onChange={(e) => setNewQuery(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={2}>
                                <Form.Group controlId="formDueDate">
                                    <Form.Label style={{ width: '200px' }}>Due Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={newDueDate}
                                        placeholder="Enter Due Date"
                                        onChange={(e) => setNewDueDate(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={2}>
                                <Form.Group controlId="formUploadDate">
                                    <Form.Label style={{ width: '200px' }}>Upload Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        placeholder="Enter Upload Date"
                                        value={newUploadDate}
                                        onChange={(e) => setNewUploadDate(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={2}>
                                <Form.Group controlId="formWidth">
                                    <Form.Label style={{ width: '100px' }}>Width</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter width"
                                        value={newWidth}
                                        onChange={(e) => setNewWidth(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={2}>
                                <Form.Group controlId="formHeight">
                                    <Form.Label style={{ width: '100px' }}>Height</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter height"
                                        value={newHeight}
                                        onChange={(e) => setNewHeight(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Button type="submit" variant="primary" onClick={(e) => handleAddJob(e)}>Add</Button>
                            </Col>
                        </Row>
                    </Form>
                </div>
                <div>
                    <Form.Group className="mb-3">
                        <Form.Label>Search by Job ID</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Enter job number"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </Form.Group>
                    <div style={{ overflowX: 'auto' }}>
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    <th>
                                        <Form.Check
                                            type="checkbox"
                                            onChange={handleSelectAllChange}
                                            checked={filteredData1.length > 0 && filteredData1.every(row => selectedRows[row.designid])}
                                        />
                                    </th>
                                    <th>Job ID</th>
                                    <th>No Of Jobs</th>
                                    <th>Client Name</th>
                                    <th>Brief</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>Query/Comment</th>
                                    <th>Month</th>
                                    <th>Week</th>
                                    <th>Received Date</th>
                                    <th>Due Date</th>
                                    <th>Upload Date</th>
                                    <th>Width</th>
                                    <th>Height</th>
                                    <th>Artwork: Start time</th>
                                    <th>Artwork: End time</th>
                                    <th>Artwork: Production time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData1.length > 0 ? (
                                    filteredData1.map((row) => (
                                        <tr key={row.designid} className={hiddenRows.includes(row.designid) ? 'disappear' : ''}>
                                            <td>
                                                <Form.Check
                                                    key={row.designid}
                                                    type="checkbox"
                                                    checked={!!selectedRows[row.designid]}
                                                    onChange={() => handleCheckboxChange(row.designid)}
                                                    disabled={row.isCompleted}
                                                />
                                            </td>
                                            <td>{row.jobNo}</td>
                                            <td>{row.designNoOfJobs}</td>
                                            <td>
                                                {row.designClientName}
                                            </td>
                                            <td>
                                                {row.designBrief}
                                            </td>
                                            <td>{row.designLocation}</td>
                                            <td>
                                                {row.designStatus}
                                            </td>
                                            <td>
                                                {row.designQuery}
                                            </td>
                                            <td>{row.designMonth}</td>
                                            <td>{row.designWeek}</td>
                                            <td>{row.designReceivedDate}</td>
                                            <td>{row.designDueDate}</td>
                                            <td>{row.designUploadDate}</td>
                                            <td>{row.designWidth}</td>
                                            <td>{row.designHeight}</td>
                                            <td>{row.startdate || '-'}</td>
                                            <td>{row.enddate || '-'}</td>
                                            <td>
                                                {row.startJobTime && row.stopJobTime ?
                                                    calculateTotalTime(row.startJobTime, row.stopJobTime) : '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="10" className="text-center">No results found</td>
                                    </tr>
                                )}
                                {/* Row for displaying total values */}
                                <tr>
                                    <td colSpan="13" className="text-center"><strong>Total</strong></td>
                                    <td><strong>{totalValues.width}</strong></td>
                                    <td><strong>{totalValues.height}</strong></td>
                                    <td colSpan="3"></td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>
                </div>
            </div>
        </Container>
    );
};

export default Designn;
