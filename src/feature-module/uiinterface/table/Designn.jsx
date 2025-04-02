import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Alert, Spinner, Table, InputGroup} from 'react-bootstrap';
import axios from 'axios';
import config from '../../../config';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaSyncAlt, FaSearch } from 'react-icons/fa';
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import { useMemo } from 'react';
import Notification from '../../Notification/Notification';
import Sort from '../ui/Sort';
import Select from 'react-select';
import ApprovalPage from '../../components/approvalcomp/approvalPage';
// import { Modal } from 'antd'; // Ensure this is the correct import
import './Designn.css';
import ImageUploadModal from '../ui/ImageUploadModal';
import Notification2 from '../../Notification/Notification2';



const Designn = () => {
    const [jobs, setJobs] = useState([]);
    const [jobsFromSql, setJobsFromSql] = useState([]);
    const [selectedDesignIds, setSelectedDesignIds] = useState([]);
    const [data, setData] = useState([]);
    const [newJobNo, setNewJobNo] = useState('');
    const [newDropdown, setNewDropdown] = useState('');
    const [csJobs, setcsJobs] = useState([]);

    const [jobNumbers, setJobNumbers] = useState([]);
    const [newClientName, setNewClientName] = useState('');
    const [newNoOfJobs, setNewNoOfJobs] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    //approval model for design 
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [lineItems,setLineItems]=useState([{}]);

    const [newUploadDate, setNewUploadDate] = useState('');
    const [newWidth, setNewWidth] = useState('');
    const [newHeight, setNewHeight] = useState('');

    console.log(newClientName, newStatus, newDueDate, newUploadDate, newWidth, newHeight, newJobNo);

    const [newBrief, setNewBrief] = useState('');
    const [newQuery, setNewQuery] = useState('');
    // const [designName, setDesignName] = useState('');
    const [user, setUser] = useState('');
    const [locationId, setLocationId] = useState('');
    const [userId, setUserId] = useState('');

    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
 
    const [showNotification2, setShowNotification2] = useState(false);
    const [notificationMessage2, setNotificationMessage2] = useState('');

    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'ascending' });
    // const [imagePreviews, setImagePreviews] = useState(null);

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

            const locationid = usersObject.message && usersObject.message.location_id;
            const stringlocationid = String(locationid);
            setLocationId(stringlocationid);

            const userid = usersObject.message && usersObject.message.user_id;
            setUserId(userid);

            // Log the username to the console
            console.log('Username:', username, jobs, 'Location: ', stringlocationid);
        } else {
            console.log('No user data found in localStorage.');
        }
    }, []);

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
    console.log(data);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectSearchTerm, setSelectSearchTerm] = useState('');
    const [filteredJobNumbers, setFilteredJobNumbers] = useState([]);
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

    const [selectedExJobNumber, setSelectedExJobNumber] = useState('');
    const [exJobNumber, setExJobNumber] = useState([]);

    const locations = ["North", "South", "East", "West", "All"];
    const status = ["Done", "Hold"];
    // const [canStartJob, setCanStartJob] = useState(false);

    const [userName, setUserName] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);

    console.log(status, userName, imageUrl);

    console.log(jobNumbers, setStartDate, setEndDate, setHiddenRows);
    console.log(clientNames, setData, selectedDesignIds, endDate, selectedExJobNumber);

    useEffect(() => {
        const users = localStorage.getItem('users');

        if (users) {
            // Parse the JSON string into an object
            const usersObject = JSON.parse(users);

            const username = usersObject.message && usersObject.message.username;
            setUserName(username);

        } else {
            console.log('No user data found in localStorage.');
        }
    }, []);
    // const currentDate = new Date().toISOString().split('T')[0];

    const fetchJobs = async () => {
        setLoading(true);
        try {
            console.log("Fetching data from:", config.JobSummary.URL.Getalljob);
            console.log("Fetching data from:", config.Design.URL.Getalldesign);

            const payload = {
                userId: userId,
                username: user
            }

            const response = await axios.post(config.Design.URL.GetDesignByUserId, payload, {
                timeout: 10000,
                username: user,
            });
            console.log("Data fetched successfully: ", response.data);
            setJobs(response.data);
            setExJobNumber(response.data);

        } catch (error) {
            console.error("Error fetching job data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDesignJobsAccToLocation = async () => {
        const payload = {
            locationId: locationId,
            username: user,
        }
        try {
            const response = await axios.post(config.Design.URL.GetAllDesignAccToLocation, payload);
            console.log('Design data acc to location: ', response.data);
        } catch (error) {
            console.error("Error fetching design jobs according to location", error);
        }
    }
    useEffect(() => {
        fetchDesignJobsAccToLocation();
    }, [locationId, user]);

    const fetchDesignJobs = async () => {
        setLoading(true);
        const payload = {
            userId: userId,
            username: user
        };

        try {
            console.log("Fetching data from:", config.Design.URL.Getalldesign, payload);

            const response = await axios.post(config.Design.URL.GetDesignByUserId, payload);
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
        } finally {
            setLoading(false);
        }
    };

    const GetAllJobsFromSql = async () => {
        const payload = {
            locationId: locationId,
        }
        try {
            const response = await axios.post(config.JobSummary.URL.GetAllJobsFromSql, payload);
            console.log('jobs from sql: ', response.data);
            setJobsFromSql(response.data);
        } catch (error) {
            console.error('Unable to fetch jobs for the location id', error);
        }
    }

    const fetchcsJobs = async () => {
        try {
            const response = await axios.post(config.JobSummary.URL.Getalljob);
            setcsJobs(response.data);
        } catch (error) {
            console.error('Unable to fetch jobs', error);
        }
    }

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
        GetAllJobsFromSql();
        fetchcsJobs();
    }, [locationId]);

    

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
            designType: newDropdown,
            width: newWidth,
            height: newHeight,
            brief: newBrief,
            query: newQuery,
            month: newMonth,
            week: newWeek,
            username: user
        };

        try {
            setLoading(true); // Start loading state
            console.log("API URL: ", config.Design.URL.AddDesign);
            const response = await axios.post(config.Design.URL.AddDesign, newData);
            console.log("Design Data submitted successfully: ", response.data);
            // setIsJobRunning(true);
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
    console.log(handleAddJob);

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

    const handleStartJob = async (e) => {
        e.preventDefault();

        const selectedJobs = filteredData1
            .filter(row => selectedRows[row.designid]) // Get selected rows
            .map(row => ({ 
                id: row.id, 
                designid: row.designid,
                priority: row.priority,
                jobNo: row.jobNo,
                date: row.date,
                client: row.client,
                subClient: row.subClient,
                visualCode: row.visualCode,
                location: row.location,
                billingLoction: row.billingLoction,
                region: row.region,
                nameSubCode: row.nameSubCode,
                city: row.city,
                qty: row.qty,
                width: row.width,
                height: row.height,
                totalSqFt: row.totalSqFt,
                designerName: row.designerName,
                designerId: row.designerId,
                designerDeadline: row.designerDeadline,
                printerName: row.printerPrintingName,
                printerDeadline: row.printerDeadline,
                noOfArtwork: row.noOfArtwork,
                artworkerDeadline: row.artworkerDeadline,
                machineName: row.machineName,
                media: row.media,
                userName: user,
                deadline: row.deadline,
                salonAddress: row.salonAddress,
                entrdby: row.entrdby,
                entereddt: row.entereddt,
                name: row.name,
                imageUrl: row.imageUrl,
             }));

        const startData = selectedJobs.map(job => ({
            ...job,
            startdate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            entereddt: new Date().toISOString(),
            username: user
        }));

        console.log("Starting jobs:", startData);

        setIsJobRunning(true);

        try {
            const response = await axios.post(config.Design.URL.AddStart, startData);
            if (response.status === 200) {
                console.log("Start Data submitted successfully:", response.data);

                // Mark jobs as started by adding them to designData
                setDesignData(prevData =>
                    prevData.map(job =>
                        selectedJobs.some(selectedJob => selectedJob.id === job.id)
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
        } 
        finally {
            // setLoading(false);
            setIsJobRunning(false);
        }
    };

    const handleImageUploadConfirm = (uploadedImageUrl) => {
        setImageUrl(uploadedImageUrl);
        // startJobs(uploadedImageUrl);

        const updatedLineItems = lineItems.map(item => {
        if (selectedRows[item.designid]) {
            return { ...item, imageUrl: uploadedImageUrl }; // Set the imageUrl for selected items
        }
        return item; // Return the item unchanged if not selected
    });
    setLineItems(updatedLineItems);

        const designsToUpdate = updatedLineItems
            .filter(row => selectedRows[row.designid]) // Get selected rows
            .map(row => ({
                designid: row.designid,
                imageUrl: row.imageUrl,
                Lstupatedby: user,
            }));

        updateImageInDb(designsToUpdate);
    }

    const updateImageInDb = async (designsToUpdate) => {
        try {
            const response = await axios.post(config.Design.URL.UpdateDesign, designsToUpdate, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // If you want to handle the response result
            console.log('Response from backend:', response.data);

            alert('Image added successfully!');
        } catch (error) {
            console.error('Error updating designs:', error);
            alert('Error updating designs.');
        }
    };

    // const startJobs = async (uploadedImageUrl) => {
    //      const selectedJobs = filteredData1
    //         .filter(row => selectedRows[row.designid]) // Get selected rows
    //         .map(row => ({ 
    //             id: row.id, 
    //             designid: row.designid,
    //             priority: row.priority,
    //             jobNo: row.jobNo,
    //             date: row.date,
    //             client: row.client,
    //             subClient: row.subClient,
    //             visualCode: row.visualCode,
    //             location: row.location,
    //             billingLoction: row.billingLoction,
    //             region: row.region,
    //             nameSubCode: row.nameSubCode,
    //             city: row.city,
    //             qty: row.qty,
    //             width: row.width,
    //             height: row.height,
    //             totalSqFt: row.totalSqFt,
    //             designerName: row.designerName,
    //             designerId: row.designerId,
    //             designerDeadline: row.designerDeadline,
    //             printerName: row.printerPrintingName,
    //             printerDeadline: row.printerDeadline,
    //             noOfArtwork: row.noOfArtwork,
    //             artworkerDeadline: row.artworkerDeadline,
    //             machineName: row.machineName,
    //             media: row.media,
    //             userName: user,
    //             deadline: row.deadline,
    //             salonAddress: row.salonAddress,
    //             entrdby: row.entrdby,
    //             entereddt: row.entereddt,
    //             name: row.name,
    //             imageUrl: uploadedImageUrl,
    //          }));

    //         const startData = selectedJobs.map(job => ({
    //             ...job,
    //             startdate: new Date().toISOString(),
    //             lastUpdated: new Date().toISOString(),
    //             entereddt: new Date().toISOString(),
    //             username: user
    //         }));

    //          console.log("Starting jobs: ", selectedJobs);
    //          setIsJobRunning(true);

    //           try {
    //             const response = await axios.post(config.Design.URL.AddStart, startData);
    //             if (response.status === 200) {
    //                 console.log("Start Data submitted successfully:", response.data);

    //                 // Mark jobs as started by adding them to designData
    //                 setDesignData(prevData =>
    //                     prevData.map(job =>
    //                         selectedJobs.some(selectedJob => selectedJob.id === job.id)
    //                             ? { ...job, isStarted: true, startDate: new Date().toISOString() }
    //                             : job
    //                     )
    //                 );

    //                 // Store only the selected jobs in designData after starting
    //                 const startedJobs = filteredData1.filter(row => selectedRows[row.designid]);
    //                 setDesignData(startedJobs);  // Update designData to show only started jobs

    //                 // Update selectedRows
    //                 setSelectedRows({});  // Clear selection after starting

    //             } else {
    //                 setError("Unexpected response from the server.");
    //             }
    //         } catch (error) {
    //             handleError(error);
    //         } 
    //         finally {
    //             // setLoading(false);
    //             setIsJobRunning(false);
    //         }
    // }



    const handleStopJob = async () => {

        const selectedJobs = filteredData1
            .filter(row => selectedRows[row.designid]) // Get selected rows
            .map(row => ({ id: row.id, name: row.name, designid: row.designid, imageUrl: row.imageUrl }));

        const stopData = selectedJobs.map(job => ({
            ...job,
            enddate: new Date().toISOString(),
            username: user,
            lastUpdated: new Date().toISOString(),
            entereddt: new Date().toISOString(),
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

    const handleImgUpload = () => {
        setIsModalOpen(true);
    }



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
    console.log(calculateTotalTime);

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
    console.log(totalValues);

    const resetForm = () => {
        handleExJobNoSelectChange('');
        setNewJobNo('');
        setNewClientName('');
        setNewNoOfJobs('');
        setNewLocation('');
        setNewStatus('');
        setNewReceivedDate('');
        setNewDueDate('');
        setNewUploadDate('');
        setNewWidth('');
        setNewHeight('');
        setNewBrief('');
        setNewQuery('');
        setNewMonth('');
        setNewWeek('');
        setSelectedDesignIds([]);
        // setStartDate('');
        // setEndDate('');
    };

    // useEffect(() => {
    //     fetchJobs();
    // }, []);

    // useEffect(() => {
    //     fetchDesignJobs();
    // }, []);

    const handleCheckboxChange = (designid) => {
        setSelectedRows((prev) => {
            const newSelection = { ...prev, [designid]: !prev[designid] }; 
            console.log("Current selected rows state:", newSelection); 
    
            // Update lineItems based on the selected designid
            const selectedDesignIds = Object.keys(newSelection).filter(key => newSelection[key]);
            fetchDesignData(selectedDesignIds);

            console.log("selecteddesignIDs",selectedDesignIds)
            return newSelection;
        });
    
        console.log("After change:", { ...selectedRows, [designid]: !selectedRows[designid] });
    };

    const fetchDesignData = (selectedDesignIds) => {
        if (selectedDesignIds.length === 0) {
            setLineItems([]);
            return;
        }

        console.log("selecteddesignIDs",selectedDesignIds)

        // Filter jobs based on selected design IDs
        const updatedLineItems = jobs
            .filter(job => selectedDesignIds.includes(job.designid))
            .map(item => ({
                username: item.username,
                id: item.id,
                jobNo:item.jobNo,
                visualCode: item.visualCode,
                csName: item.entrdby,
                media: item.media,
                totalSqFt: item.totalSqFt,
                designid: item.designid,
                imageUrl:item.imageUrl
            }));

            //  console.log("updated line items ",updatedLineItems)

        setLineItems(updatedLineItems); // Update lineItems state
    };

    // console.log("lineitems are as follows",lineItems)


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

    const handleMailForCustomer = () => {
        console.log("opening the modal");
        setShowApprovalModal(true); // Open the modal
      }; 
     
      // Function to handle closing the modal
      const closeModal = () => {
        setShowApprovalModal(false); // Close the modal
      };


    const uniqueJobNumbers = useMemo(() => { return [...new Set(jobs.map(job => job.jobNo))] }, [jobs]);

    const filteredData1 = Array.isArray(designData) ? designData.filter(row =>
        row.jobNo && row.jobNo.toLowerCase().includes(searchTerm.trim().toLowerCase())
    ) : [];

    useEffect(() => {
        if(selectSearchTerm.trim() === '') {
            setFilteredJobNumbers(uniqueJobNumbers);
        } else {
            const filtered = uniqueJobNumbers.filter(jobNo => 
                jobNo.toLowerCase().includes(selectSearchTerm.trim().toLowerCase())
            );
            setFilteredJobNumbers(filtered);
        }
    }, [selectSearchTerm, uniqueJobNumbers]);

    const handleSelectJobNoChange = (e) => {
        const selectedJobNo = e.target.value;
        setNewJobNo(selectedJobNo);
        setSelectSearchTerm("");
        handleJobNumberChange(selectedJobNo);
    }

    console.log(filteredJobNumbers, handleSelectJobNoChange)

    const handleJobNumberChange = (jobNo) => {
        setNewJobNo(jobNo);
        const selectedJob = jobs.find(job => job.jobNo === jobNo);
        console.log("Selected Job: ", selectedJob);
        setNewClientName(selectedJob ? selectedJob.client : ''); // Set client name or reset
    };

    const jobNoOptionsFromSql = jobsFromSql.map(job => ({
        value: job.comartjobno,
        label: job.comartjobno,
        clientName: job.client || ''
    }));

    // const jobNoOptions = useMemo(() => {
    //     const uniqueJobNumbers = [...new Set(exJobNumber.map(job => job.jobNo))]; // Get unique job numbers
    //     return uniqueJobNumbers.map(jobNo => ({
    //         value: jobNo,
    //         label: jobNo,
    //         clientName: exJobNumber.find(job => job.jobNo === jobNo)?.client // Assuming job object has a client property
    //     }));
    // }, [exJobNumber]);

    const jobNoOptionsFromExJobNumber = Array.from(new Set(exJobNumber.map(job => job.jobNo)))
        .map(jobNo => {
            const job = exJobNumber.find(job => job.jobNo === jobNo); // Find the first occurrence of the job
            return {
                value: jobNo,
                label: jobNo, // Display job number
                clientName: job ? job.client : '' // Include client name if found
            };
        });

    const combinedJobNoOptions = [...jobNoOptionsFromSql, ...jobNoOptionsFromExJobNumber];
    const uniqueJobNoOptions = Array.from(new Set(combinedJobNoOptions.map(option => option.value)))
        .map(value => combinedJobNoOptions.find(option => option.value === value));


        const handleExJobNoSelectChange = (selectedOption) => {
            if (selectedOption) {
                console.log("selectedOption",selectedOption.clientName); // Log the selected option
                setSelectedExJobNumber(selectedOption.value); // Set the selected customer ID
                setNewClientName(selectedOption.clientName);


                setNewJobNo(selectedOption.value);
                // Find the customer name based on the selected option
                const selectedJobNo = uniqueJobNoOptions.find(option => option.value === selectedOption.value);
    
                // setCustomerName(selectedJobNo ? selectedJobNo.label : ''); // Set the customer name
                console.log("Job No :", selectedOption.value);
                console.log("Job No is:", selectedJobNo ? selectedJobNo.label : '');
            } else {
                setSelectedExJobNumber('');
                setNewClientName('');
                setNewJobNo('');
    
            }
        };


        console.log("selected client name is ",newClientName)
        
        
        // console.log(handleExJobNoSelectChange);


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

    const sortedData = useMemo(() => {
        let sortableItems = [...filteredData1];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData1, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    }

    useEffect(() => {
        const checkDeadlines = () => {
            const now = new Date();
            const message = [];
            console.log('now: ', now);

            jobs.forEach(job => {
                const designerDeadline = new Date(job.designerDeadline);
                const designerName = job.designerName;
                const deadlineDuration = now - designerDeadline;

                console.log('design deadline: ', job);
                console.log('design deadline: ', designerDeadline);
                if (!job.isCompleted && now > designerDeadline) {
                    const totalHours = Math.floor(deadlineDuration / (1000 * 60 * 60));
                    const days = Math.floor(totalHours / 24);
                    const hours = totalHours % 24;

                    message.push(`Job No: ${job.jobNo}, Designer Name: ${designerName} has missed its deadline! Time passed: ${days}d ${hours}h`);
                }
            });

            if (message.length > 0) {
                setNotificationMessage(message);
                setShowNotification(true);
            }
        };
        checkDeadlines();
        const interval = setInterval(checkDeadlines, 500000);
        return () => {
            clearInterval(interval);
        }
    }, [designData]);
    

    useEffect(() => {
        const checkDeadlines2 = () => {
            const now = new Date();
            const message = [];
            console.log('now: ', now);

            csJobs.forEach(csJob => {
                const Deadline = new Date(csJob.deadline);
                const csName = csJob.userName;
                const timeUntilDeadline = Deadline - now;

                console.log('design deadline: ', csJob);
                console.log('design deadline: ', Deadline);

                if (!csJob.isCompleted && timeUntilDeadline > 0 && timeUntilDeadline <= 8 * 60 * 60 * 1000) {
                    const totalHours = Math.floor(timeUntilDeadline / (1000 * 60 * 60));
                    const totalMinutes = Math.floor((timeUntilDeadline % (1000 * 60 * 60)) / (1000 * 60));
                    const totalSeconds = Math.floor((timeUntilDeadline % (1000 * 60)) / 1000);

                    message.push(`Job No: ${csJob.jobNo}, CS Name: ${csName}'s deadline is approaching in: ${totalHours}h ${totalMinutes}m ${totalSeconds}s`);
                }
            });

            if (message.length > 0) {
                setNotificationMessage2(message);
                setShowNotification2(true);
            }
        };
        checkDeadlines2();
        const interval = setInterval(checkDeadlines2, 500000);
        return () => clearInterval(interval);
    }, [csJobs]);

    const handleCloseNotification = () => {
        setShowNotification(false);
    }

    const handleCloseNotification2 = () => {
        setShowNotification2(false);
    }


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
                                    <h1 style={{ maxWidth: '100%' }} className="display-4 text-center mb-4">Design</h1>
                                    {error && <Alert variant="danger">{error}</Alert>}
                                    {loading && <Spinner animation="border" className="d-block mx-auto" />}

                                    <Row className="mb-3 align-items-center">
                                        <Col>
                                            {(isJobRunning) ?

                                                <Button variant="success" onClick={handleStartJob} disabled={!Object.values(selectedRows).some(v => v)} type='button'>Start Job</Button>
                                                :
                                                <Button variant="danger" onClick={handleStopJob} className="ml-3" disabled={isJobRunning || !Object.values(selectedRows).some(v => v)}>Stop Job</Button>
                                            } </Col>

                                        <Col className="ml-auto">
                                            <FaSyncAlt size={20} style={{ cursor: 'pointer', marginLeft: '89em' }} onClick={() => window.location.reload()} />
                                        </Col>
                                    </Row>
                                    <ImageUploadModal 
                                        isOpen={isModalOpen}
                                        onClose={() => setIsModalOpen(false)}
                                        onConfirm={handleImageUploadConfirm}
                                    />
                                    
                                    <div style={{  }}>
                                        <Form className="mb-3 mt-2">
                                            <Row className="mb-3 align-items-center">
                                                <Col xs={2}>
                                                    <Form.Group style={{ position: 'relative', zIndex: 999 }}>
                                                        <Form.Label style={{ width: '200px' }}>Job No</Form.Label>
                                                        <Select
                                                            options={uniqueJobNoOptions}
                                                            value={uniqueJobNoOptions.find(option => option.value === selectedExJobNumber) || null} // Bind the selected value
                                                            onChange={handleExJobNoSelectChange}
                                                            placeholder="Select Job No"
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col xs={2}>
                                                    <Form.Group controlId="formClientName">
                                                        <Form.Label style={{ width: '200px'}}>Client Name</Form.Label>
                                                        <Form.Control
                                                            type='text'
                                                            value={newClientName}
                                                            readOnly
                                                        />

                                                    </Form.Group>
                                                </Col>
                                                <Col xs={2}>
                                                    <Form.Group controlId="formNoOfJobs">
                                                        <Form.Label style={{ width: '200px' }}>No Of Artworker</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            placeholder="Enter no. of jobs"
                                                            value={newNoOfJobs}
                                                            onChange={(e) => setNewNoOfJobs(e.target.value)}
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
                                                        >
                                                            <option value="">Select Location</option>
                                                            {locations.map((location, index) => (
                                                                <option key={index} value={location}>{location}</option>
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
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col xs={2}>
                                                    <Form.Group>
                                                        <Form.Label style={{ width: '200px' }}>Design Type</Form.Label>
                                                        <Form.Select
                                                            value={newDropdown}
                                                            onChange={(e) => setNewDropdown(e.target.value)}
                                                        >
                                                            <option value="">Select Design Type </option>
                                                            <option value="New Layout">New Layout</option>
                                                            <option value="Print Ready File">Print Ready File</option>
                                                            <option value="Master Artwork">Master Artwork</option>
                                                            <option value="Correction at Comart End">Correction at Comart End</option>
                                                            <option value="Correction Required by Customer">Correction Required by Customer</option>

                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                
                                                <Col>
                                                    <Button type="button" variant="primary" style={{ marginTop: '28px' }} onClick={handleAddJob}>Add</Button>
                                                </Col>
                                                <Col>
                                                    <Button type="button" variant="primary" style={{ marginTop: '28px' }} onClick={handleImgUpload}>Upload Image</Button>
                                                </Col>
                                                <Col>
                                                    <Button type="button" variant="primary" style={{ marginTop: '28px' }} onClick={handleMailForCustomer}>
                                                Send Approval to Customer
                                            </Button>
                                                </Col>  
                                            </Row>
                                        </Form>
                                    </div>
                                    <hr />
                                    <div>
                                        <Form.Group className="mb-3 mt-3">
                                            <InputGroup>
                                                <InputGroup.Text style={{ cursor: 'pointer', color: 'grey', backgroundColor: 'white', borderRight: 'none' }}>
                                                    <FaSearch />
                                                </InputGroup.Text>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Enter job number"
                                                    value={searchTerm}
                                                    style={{ borderLeft: 'none' }}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                            </InputGroup>
                                        </Form.Group>
                                        <div style={{ overflowX: 'auto' }} className='table-container'>
                                            <Table striped bordered hover>
                                                <thead className='sticky-header'>
                                                    <tr>
                                                        <th>
                                                            <Form.Check
                                                                type="checkbox"
                                                                onChange={handleSelectAllChange}
                                                                checked={filteredData1.length > 0 && filteredData1.every(row => selectedRows[row.designid])}
                                                            />
                                                        </th>
                                                        {/* <th><Sort sortKey="jobNo" thead="Job ID" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="designNoOfJobs" thead="No Of Artwork" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="designClientName" thead="Client Name" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                       
                                                        <th><Sort sortKey="designLocation" thead="Location" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th>Query/Comment</th>
                                                        <th><Sort sortKey="designDueDate" thead="Due Date" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th>Artwork: Start time</th>
                                                        <th>Artwork: End time</th>
                                                        <th>Artwork: Production time</th> */}

                                                        <th><Sort sortKey="jobNo" thead="Job ID" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="client" thead="Client Name" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="noOfArtwork" thead="No Of Artwork" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="brief" thead="Brief" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="productionLocation" thead="Production Location" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="designQuery" thead="Design Query" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="designType" thead="Design Type" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="date" thead="Job Date" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="username" thead="CS Name" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="visualCode" thead="Visual Code" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="nameSubCode" thead="Product Details" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="city" thead="City" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="designerName" thead="Designer Name" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                        <th><Sort sortKey="designerDeadline" thead="Designer Deadline" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                       
                                                        <th><Sort sortKey="artworkerDeadline" thead="Artworker Deadline" sortConfig={sortConfig} requestSort={requestSort} /></th>
                                                       
                                                        <th>Start Time</th>
                                                        <th>End Time</th>                                                       

                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sortedData.length > 0 ? (
                                                        sortedData.map((row) => (
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
                                                                <td>
                                                                    {row.designClientName || row.client }
                                                                </td>
                                                                <td>{row.noOfArtwork || row.noOfArtworker}</td>
                                                                <td>{row.designBrief}</td>
                                                                <td>{row.location || row.designLocation}</td>
                                                                <td>{row.designQuery}</td>
                                                                <td>{row.designType}</td>

                                                                <td>{row.date}</td>
                                                              
                                                                <td>{row.Entrdby}</td>
                                                                <td>
                                                                    {row.visualCode}
                                                                </td>
                                                                <td>{row.nameSubCode}</td>
                                                                <td>
                                                                    {row.city}
                                                                </td>
                                                                <td>{row.designerName}</td>
                                                                <td>{row.designerDeadline}</td>
                                                               
                                                                <td>{row.artworkerDeadline}</td>
                                                               

                                                                {/* <td>{row.designDueDate ? new Date(row.designDueDate).toLocaleString() : '-'}</td> */}
                                                                <td>{row.startdate || '-'}</td>
                                                                <td>{row.enddate || '-'}</td>
                                                               
                                                               

                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="15" className="text-center">No results found</td>
                                                        </tr>
                                                    )}
                                                    {/* Row for displaying total values */}
                                                    {/* <tr>
                                    <td colSpan="10" className="text-center"><strong>Total</strong></td>
                                    <td><strong>{totalValues.width}</strong></td>
                                    <td><strong>{totalValues.height}</strong></td>
                                    <td colSpan="3"></td>
                                </tr> */}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        {showNotification && (
                                            <Notification
                                                headline="Deadline Alert!"
                                                message={notificationMessage}
                                                onClose={handleCloseNotification}
                                                show={showNotification}
                                                containerBg="rgba(231, 116, 116, 0.445)"
                                                bgColor="red"
                                                headerColor="#ff5b68"
                                            />
                                        )}
                                    </div>

                                    <div>
                                        {showNotification2 && (
                                            <Notification2
                                                headline="Deadline Alert!"
                                                message={notificationMessage2}
                                                onClose={handleCloseNotification2}
                                                show={showNotification2}
                                                containerBg="rgba(116, 143, 231, 0.445)"
                                                bgColor="blue"
                                                headerColor="#5b79ff"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showApprovalModal && (
        <div className="modal">
          <div className="modal-content">
            <button onClick={closeModal}>Close</button>
            {/* Render ApprovalPage Component inside Modal */}
            <ApprovalPage  lineItems={lineItems}/>
          </div>
        </div>
      )}
        </div>
    );
};

export default Designn;
