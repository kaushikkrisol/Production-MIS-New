import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import { Modal, ModalBody, ModalHeader, Table as ExcelTable } from 'reactstrap';
// import EditableCell from './EditableCell'; // Adjust path accordingly
// import EditableRow from './EditableRow'; // Adjust path accordingly
import './DataTables.css'; // Adjust path accordingly
import * as XLSX from 'xlsx';
import axios from "axios";
import config from "../../../config";
import { Table, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
// import { el } from "date-fns/locale";

const DataTables = () => {
  // const [searchText, setSearchText] = useState("");
  //const [selectTable, setSelectTable] = useState("CS");
  // const [isMobile, setIsMobile] = useState(false);
  // const [tableData, setTableData] = useState({
  //   CS: csDataTablesData,
  //   Design: pageDataTablesData,
  //   Production: productionDataTablesData,
  //   Implementation: implementationDataTablesData,
  //   Delivery: deliveryDataTablesData,
  // });
  const [BulkAdd, setBulkAdd] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [data, setData] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  // const [selectedRows, setSelectedRows] = useState({});
  // const [isJobRunning, setIsJobRunning] = useState(false); // Job status
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalValues, setTotalValues] = useState({ width: 0, height: 0 });

  const [userId, setUserId] = useState(null);
  const [userName, setUsername] = useState('');
  const [locationId, setLocationId] = useState(null);
  console.log(userId, userName, locationId, setLocationId);

  const totalWidth = totalValues ? totalValues.width : 0;
  const totalHeight = totalValues ? totalValues.height : 0;

  const [user, setUser] = useState('');
  const users = localStorage.getItem('users');
  const currentDate = new Date().toISOString().split('T')[0];

  // Check if users data exists and is not null
  useEffect(() => {
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

  // const locationMapping = {
  //   1: "MumbaiNanachowk",
  //   2: "BANGALORE",
  //   3: "KOLKATA",
  //   4: "GURGOAN"
  // };

  useEffect(() => {
    // Fetch user_id and username from local storage
    const users = localStorage.getItem('users');

    if (users) {
      try {
        const userObj = JSON.parse(users);
        const userId = userObj?.message?.user_id;
        const userName = userObj?.message?.username;

        // Log the retrieved values to the console
        console.log('Fetched User ID:', userId);
        console.log('Fetched Username:', userObj?.message, userName);

        // Set state if values exist
        if (userId) {
          setUserId(userId);
        }

        if (userName) {
          setUsername(userName);
          console.log("username setted", userName);
        }
      } catch (error) {
        console.error('Error parsing JSON from localStorage:', error);
      }
    } else {
      console.warn('No users data in localStorage');
    }
  }, []);

  // useEffect(() => {
  //   // Fetch the user's data including location from your backend
  //   const fetchUserData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await axios.get(config.User.URL.Checkuser, {
  //         params: {
  //           userId: userId, 
  //         }
  //       });

  //       if (response.data && response.data.user) {
  //         const { user_id, username, locationid } = response.data.user;

  //         // Save the data to localStorage
  //         const userData = {
  //           message: {
  //             user_id,
  //             username,
  //             locationid, // Save the location ID fetched from the SQL database
  //           }
  //         };

  //         localStorage.setItem('users', JSON.stringify(userData));

  //         // Set state
  //         setUserId(user_id);
  //         setUsername(username);
  //         setLocationId(locationid); // Set the locationId state
  //       }

  //     } catch (error) {
  //       console.error("Error fetching user data:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchUserData();
  // }, [userId]);

  const getLoggedInUserId = () => {
    const users = localStorage.getItem('users');

    if (!users) {
      console.warn("No 'users' found in localStorage.");
      return null;
    }

    try {
      const userObj = JSON.parse(users);
      const userId = userObj?.message?.user_id;
      const userName = userObj?.message?.username;

      if (!userId) {
        console.warn("User ID not found in the parsed data.");
        return null;
      }

      if (userName) {
        setUsername(userName);
        setData(userName);
      }

      console.log("Logged-in user ID:", userId);
      console.log("username", userName);
      return userId;

    } catch (error) {
      console.error("Failed to parse 'users' from localStorage:", error);
      return null;
    }

    // const usersString = localStorage.getItem('users'); 
    // if (!usersString){

    //   let userId = localStorage.getItem('user_id');
    //   console.log(userId); 
    //   console.warn("no users found in local storage");
    //   return null;
    // } 
    // try {
    //   const users = JSON.parse(usersString); // Parse the JSON string
    //   console.log("parsed users", users);
    //   return users && users.message && users.message.user_id ? users.message.user_id : null; // Return user_id if it exists
    // } catch (error) {
    //   console.error("Failed to parse users from localStorage:", error);
    //   return null; // In case of JSON parsing errors, return null
    // }
  };
  

  const fetchJobs = async () => {
    const user_id = getLoggedInUserId();
    // const username = userName;

    console.log('payload uname: ', userName);

    if (!user_id) {
      setError("User not logged in");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        user: { 
          user_id: user_id,
          userName: userName,
          username: user,
          entereddt: currentDate,
        }
      };

      console.log("Sending payload to fetch jobs: ", payload);
      console.log('payload username: ', payload.user.userName);

      const response = await axios.post(config.JobSummary.URL.Getalljob, payload, { // Make sure to send the payload here
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json' // Ensure the correct content type
        }
      });

      console.log("Data fetched successfully: ", response.data);
      setData(response.data);

      if (Array.isArray(response.data) && response.data.length > 0) {
        setData(response.data); // This should set jobs specific to the user
      } else {
        setData([]); // No jobs found for the user
      }

    } catch (error) {
      console.error("Error fetching job data:", error.response ? error.response.data : error.message);
      setError("Error fetching job data");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (Array.isArray(data)) { // Check if data is an array
      const totals = data.reduce((acc, row) => {
        acc.width += parseInt(row.width) || 0;
        acc.height += parseInt(row.height) || 0;
        return acc;
      }, { width: 0, height: 0 });

      setTotalValues(totals);
    }
  }, [data]);


  const filteredData1 = Array.isArray(data) ? data.filter(row =>
    row.jobNo && row.jobNo.toLowerCase().includes(searchTerm.trim().toLowerCase())
  ) : [];

  const toggleBulkAdd = useCallback(() => {
    if (BulkAdd) {
      // Reset states when closing the modal
      setBulkAdd(false);
      setHeaders([]); // Reset to an empty array
      // setData([]);    // Reset to an empty array
    } else {
      setBulkAdd(true);
    }
  }, [BulkAdd]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const resp = e.target.result;
      const workbook = XLSX.read(resp, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

      if (!jsonData.length) {
        console.error('No data found in the Excel file');
        return;
      }

      const headers = jsonData[0];
      const dataRows = jsonData.slice(1);
      const data = dataRows.map((row) => {
        const obj = {};
        headers.forEach((header, i) => {
          let cellValue = row[i];
          const cell = worksheet[XLSX.utils.encode_cell({ r: dataRows.indexOf(row) + 1, c: i })];

          if (cell && cell.t === 'n' && cell.z) {
            const date = XLSX.SSF.parse_date_code(cell.v);
            if (date) {
              cellValue = new Date(Date.UTC(date.y, date.m - 1, date.d)).toISOString().split('T')[0];
            }
          }

          obj[header] = cellValue;
        });

        return obj;
      }).filter(row => {
        return Object.values(row).some(value => value !== '' && value !== null && value !== undefined);
      });

      console.log("Filtered Data: ", data);
      setHeaders(headers);
      setData(data);
    };

    reader.readAsBinaryString(file);
  };

  {/*submitting excel data*/}

  const submitDataToAPI = async (e) => {
    const user_id = getLoggedInUserId();

    if (!user_id) {
      setError("User not logged in");
      return;
    }
    e.preventDefault();
    try {
      setLoading(true);

      const dataWithUsernames = data.map(item => ({
        ...item,  // Spread existing properties
        userName: userName, // Add the username field
        user_id: user_id,
        username: user,
        entereddt: currentDate,
      }));
      console.log('data with unames', dataWithUsernames);
      console.log("API URL: ", config.JobSummary.URL.AddJobSummary);

      // Submit the filtered data to the database
      const response = await axios.post(config.JobSummary.URL.AddJobSummary, dataWithUsernames);

      console.log("Data submitted successfully: ", response);

      // Reset the state after submission
      setHeaders([]);
      setData([]);
      setBulkAdd(false);

      await fetchJobs();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios error: ", error.message);
        console.error("Config: ", error.config);
        if (error.code === 'ECONNABORTED') {
          console.error("Request timed out");
        }
      } else {
        console.error("Unexpected error: ", error);
      }
    } finally {
      setLoading(false);
    }
  };


  // const handleStartJob = () => {
  //   if (Object.values(selectedRows).some(v => v)) {
  //     const currentTime = new Date().toLocaleTimeString();
  //     setData((prevData) =>
  //       prevData.map((row) => {
  //         if (selectedRows[row.id] && !row.isStarted) { // Prevent starting already started jobs
  //           return { ...row, startJobTime: currentTime, isStarted: true };
  //         }
  //         return row;
  //       })
  //     );
  //     setIsJobRunning(true);
  //   }
  // };

  // const handleStopJob = () => {
  //   const currentTime = new Date().toLocaleTimeString();
  //   setData((prevData) =>
  //     prevData.map((row) => {
  //       if (selectedRows[row.id] && row.isStarted) { // Ensure we only stop jobs that are started
  //         return { ...row, stopJobTime: currentTime, isCompleted: true, isStarted: false };
  //       }
  //       return row;
  //     })
  //   );
  //   setSelectedRows({});
  //   setIsJobRunning(false);
  // };

  // const convertTo24HourFormat = (timeStr) => {
  //   const [time, modifier] = timeStr.split(" "); // Split time and AM/PM
  //   let [hours, minutes, seconds] = time.split(":"); // Split into components

  //   // Log components for debugging
  //   console.log(`Original time: ${timeStr}, Hours: ${hours}, Minutes: ${minutes}, Seconds: ${seconds}, Modifier: ${modifier}`);

  //   if (modifier === "PM" && hours !== "12") {
  //     hours = (parseInt(hours) + 12).toString(); // Convert PM hours
  //   } else if (modifier === "AM" && hours === "12") {
  //     hours = "00"; // Midnight case
  //   }

  //   // Return in HH:mm:ss format
  //   return `${hours}:${minutes}:${seconds || '00'}`;
  // };

  // const calculateTotalTime = (start, stop) => {
  //   console.log("Start:", start, "Stop:", stop); // Log inputs

  //   if (!start || !stop) {
  //     return 'Invalid time';
  //   }

  //   // Convert to 24-hour format
  //   const start24 = convertTo24HourFormat(start);
  //   const stop24 = convertTo24HourFormat(stop);

  //   const startTime = new Date(`1970-01-01T${start24}`);
  //   const stopTime = new Date(`1970-01-01T${stop24}`);

  //   console.log("StartTime:", startTime, "StopTime:", stopTime); // Log date objects

  //   if (isNaN(startTime.getTime()) || isNaN(stopTime.getTime())) {
  //     return 'Invalid time';
  //   }

  //   let totalTime = stopTime - startTime;

  //   if (totalTime < 0) {
  //     return 'Stop time must be after start time';
  //   }

  //   // Calculate hours, minutes, and seconds
  //   const hours = Math.floor(totalTime / 3600000);
  //   const minutes = Math.floor((totalTime % 3600000) / 60000);
  //   const seconds = Math.floor((totalTime % 60000) / 1000); // Calculate seconds

  //   return `${hours}h ${minutes}m ${seconds}s`; // Include seconds in the return value
  // };

  // const handleInputChange = async (id, field, value) => {
  //   setData((prevData) =>
  //     prevData.map((row) =>
  //       row.id === id ? { ...row, [field]: value } : row
  //     )
  //   );

    // try {
    //     await axios.put(`${config.JobSummary.URL.UpdateJob}/${id}`, { [field]: value });
    //     console.log(`Updated job ${id}: ${field} = ${value}`);
    // } catch (error) {
    //     console.error("Error updating job:", error.response ? error.response.data : error.message);
    //     setError("Error updating job");}
  

  // const handleStatusChange = (id, value) => {
  //   setData((prevData) =>
  //     prevData.map((row) =>
  //       row.id === id ? { ...row, status: value } : row
  //     )
  //   );
  // };

  // const totalValues = Object.keys(selectedRows).reduce((totals, id) => {
  //   if (selectedRows[id]) {
  //     const row = data.find(item => item.id === parseInt(id));
  //     if (row) {
  //       totals.width += parseInt(row.width) || 0;
  //       totals.height += parseInt(row.height) || 0;
  //     }
  //   }
  //   return totals;
  // }, { width: 0, height: 0 });
    

  return (
    <div>
      <div className="page-wrapper">
        <div className="content container-fluid">
          <div className="page-header">
            <div className="row">
              <div className="col">
                <ul className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.dashboard}></Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-sm-12">
              <div className="card">
                
                <div className="card-body">
                  <div className="mb-3 d-flex justify-content-between align-items-center">
                    <div style={{ flexGrow: 1 }}></div> {/* This takes up space to push buttons to the right */}
                    {/* <div className="search-container" style={{ display: 'flex', justifyContent: 'center', flexGrow: 1 }}>
                      <Form.Control
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search"
                        aria-controls="DataTables_Table_0"
                        value={searchText}
                        onChange={handleSearch}
                        style={{ width: '400px' }} // Adjust width as necessary
                      />
                    </div> */}
                    <div className="button-group" style={{ marginLeft: 'auto' }}>
                      {/* <Button
                        type="primary"
                        style={{ backgroundColor: 'green', borderColor: 'green', marginRight: 8 }}
                        onClick={handleAddRow}
                      >
                        Add
                      </Button> */}
                      <Button
                        type="default"
                        style={{ backgroundColor: 'orange', borderColor: 'orange' }}
                        onClick={toggleBulkAdd}
                      >
                        Upload
                      </Button>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <Modal
                      isOpen={BulkAdd}
                      toggle={toggleBulkAdd}
                      centered
                      size="xl"
                      className="border-0"
                      modalClassName='modal fade zoomIn'
                      backdrop={'static'}
                    >
                      <ModalHeader className="p-3 bg-info-subtle" toggle={toggleBulkAdd}>
                        Upload Bulk
                      </ModalHeader>
                      <ModalBody className="modal-body">
                        <Row className="g-3">
                          <Col>
                            <div className="mt-4 pt-2 fs-15 mx-4 mx-sm-5">
                              <Form.Control className="form-control" type="file" onChange={handleFileChange} />
                              <br />
                              <h4>Excel Data:</h4>
                              {Array.isArray(headers) && Array.isArray(data) && headers.length > 0 && data.length > 0 ? (
                                <div className="table-responsive responsivetable">
                                  <ExcelTable className="table-bordered align-middle table-nowrap mb-0">
                                    <thead className="sticky-header table-light">
                                      <tr>
                                        {headers.map((header, index) => (
                                          <th key={index} scope="col">{header}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {data.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                          {headers.map((header, colIndex) => (
                                            <td key={colIndex}>
                                              <span className="text-ellipsis" title={row[header]}>
                                                {row[header]}
                                              </span>
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </ExcelTable>
                                </div>
                              ) : (
                                <div className="text-center">No Data Available</div>
                              )}
                            </div>
                          </Col>
                        </Row>
                      </ModalBody>

                      <div className="modal-footer">
                        <div className="hstack gap-2 justify-content-end">
                          <Button
                            type="button"
                            onClick={toggleBulkAdd}
                            className="btn-light"
                          >Close</Button>

                          <Button
                            type="submit"
                            onClick={(e) => submitDataToAPI(e)}
                            id="add-btn"
                            className="btn btn-success"
                          >Add </Button>

                        </div>
                      </div>
                    </Modal>
                    {/* {isMobile ? (
                      filteredData.map((item, index) => (
                        <div key={item.key} className="data-card">
                          {columns.map((col) => (
                            <div key={col.key} className="data-card-row">
                              <strong>{col.title}: </strong> {item[col.dataIndex]}
                            </div>
                          ))}
                          <div className="data-card-row">
                            <Button type="primary" onClick={() => handleStart(item.key, index)}>Start</Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Table
                        components={{
                          body: {
                            row: EditableRow,
                            cell: EditableCell,
                          },
                        }}
                        columns={[...columns]}
                        dataSource={filteredData}
                        rowKey="key"
                        className="table"
                      />
                    )} */}
                  </div>
                  
                  {error && <Alert variant="danger">{error}</Alert>}
                  {loading && <Spinner animation="border" className="d-block mx-auto" />}
                  {/* <Row className="mb-3 align-items-center">
                    <Col>
                      <Button variant="primary" onClick={handleStartJob} disabled={!Object.values(selectedRows).some(v => v)}>Start Job</Button>
                      <Button variant="danger" onClick={handleStopJob} className="ml-3" disabled={!isJobRunning || !Object.values(selectedRows).some(v => v)}>Stop Job</Button>
                    </Col>
                  </Row> */}
                  <Form.Group className="mb-3">
                    <Form.Label>Search by Job No</Form.Label>
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
                          {/* <th>
                            <Form.Check
                              type="checkbox"
                              onChange={handleSelectAllChange}
                              checked={filteredData1.length > 0 && filteredData1.every(row => selectedRows[row.id])}
                            />
                          </th> */}
                          <th>Job ID</th>
                          <th>Date</th>
                          <th>Client</th>
                          <th>Sub Client</th>
                          <th>Production Location</th>
                          <th>Billing Location</th>
                          <th>Visual Code</th>
                          <th>Name & Sub Code</th>
                          <th>City</th>
                          <th>Qty</th>
                          <th>Width</th>
                          <th>Length</th>
                          <th>Total Sq.ft</th>
                          <th>Media</th>
                          <th>Lamination</th>
                          <th>Mounting</th>
                          <th>Implementation</th>
                          <th>Salon Address</th>
                          <th>Billing Sq Ft</th>
                          {/* <th>Installation</th> */}
                          <th>Job Deadline</th>
                          <th>No of Artwork</th>
                          <th>Artworker Deadline</th>
                          <th>Remarks/Instructions</th>
                          <th>Actual Complete Time</th>
                          <th>On Time Delayed 2</th>
                          {/* <th>Sub Client</th>
                          <th>CS Name</th>
                          <th>Billing Location</th>
                          <th>Billing Sq Ft</th>
                          <th>Installation</th>
                          <th>Job Deadline</th>
                          <th>No of Artwork</th>
                          <th>Artworker Deadline</th> */}
                          
                         
                          {/* <th>Start Job</th>
                          <th>Stop Job</th>
                          <th>Total Time</th> */}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData1.length > 0 ? (
                          filteredData1.map((row) => (
                            <tr key={row.id}>
                              <td>{row.jobNo}</td>
                              <td>
                                {row.date}
                              </td>
                              <td>
                                {row.client}
                               
                              </td>
                              <td>{row.subClient}</td>
                            
                              <td>{row.region}</td>
                              <td>{row.billingLocation}</td>
                              <td>
                                {row.visualCode}
                              </td>
                              <td>{row.nameSubCode}</td>
                              <td>
                                {row.city}
                              </td>
                              <td>
                                {row.qty}
                              </td>
                              <td>
                                {row.width}
                              </td>
                              <td>
                                {row.height}
                              </td>
                              <td>{row.totalSqFt}</td>
                              <td>{row.media}</td>
                              <td>{row.lamination}</td>
                              <td>{row.mounting}</td>
                              <td>{row.implementation}</td>
                              <td>{row.salonAddress}</td>
                              <td>{row.billingSqFt}</td>
                              {/* <td>{row.installation}</td> */}
                              <td>{row.deadline}</td>
                              <td>{row.noOfArtwork}</td>
                              <td>{row.artworkerDeadline}</td>
                              <td>{row.remarks}</td>
                              <td>{row.actCompleteTime}</td>
                              <td>{row.onTimeDelayed}</td>


                              {/* <td>{row.subClient}</td>
                              <td>
                                {row.userName}
                              </td>
                              <td>{row.billingLocation}</td>
                              <td>{row.deadline}</td>
                               */}
                              
                              
                              {/* <td>{row.startJobTime || '-'}</td>
                              <td>{row.stopJobTime || '-'}</td>
                              <td>
                                {row.startJobTime && row.stopJobTime ?
                                  calculateTotalTime(row.startJobTime, row.stopJobTime) : '-'}
                              </td> */}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="10" className="text-center">No results found</td>
                          </tr>
                        )}
                        {/* Row for displaying total values */}
                        <tr>
                          <td colSpan="10" className="text-center"><strong>Total</strong></td>
                          <td><strong>{totalWidth}</strong></td>
                          <td><strong>{totalHeight}</strong></td>
                          <td colSpan="15"></td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTables;
