import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import { Modal, ModalBody, ModalHeader, Table as ExcelTable } from 'reactstrap';
import { Table, Tab, Form, Nav, NavItem, Button, Row, NavLink, Card, Col, CardBody, Alert, Spinner, InputGroup } from 'react-bootstrap';
import 'react-toastify/dist/ReactToastify.css';
import Sort from "../ui/Sort";
import OrderPopup from "../../dashboard/orderPopup"; 

// import EditableCell from './EditableCell'; // Adjust path accordingly
// import EditableRow from './EditableRow'; // Adjust path accordingly
import { AgGridReact } from "ag-grid-react";
import './DataTables.css'; // Adjust path accordingly

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { read, utils } from 'xlsx';
import axios from "axios";
import config from "../../../config";
import { FaSyncAlt, FaSearch, FaFilter } from 'react-icons/fa';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import FilterSidebar from "../ui/FilterComponent";

// import Sort from "../ui/Sort";
// import { responsiveArray } from "antd/es/_util/responsiveObserver";
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
  console.log(data);

  const [selectSearchTerm, setSelectSearchTerm] = useState('');
  const [filteredJobNumbers, setFilteredJobNumbers] = useState([]);
  const [customerid, setCustomerid] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  // const [selectedRows, setSelectedRows] = useState({});
  // const [isJobRunning, setIsJobRunning] = useState(false); // Job status
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalValues, setTotalValues] = useState({ width: 0, height: 0 });
  const gridRef = useRef();


  const[latestJobNo,setLatestJobNo]=useState('')

  const [activeTab, setActiveTab] = useState('newJob'); // Default active tab is New Job
  const [jobNumbers, setJobNumber] = useState([]);

  const [userId, setUserId] = useState(null);
  const [userName, setUsername] = useState('');
  // const [subClient, setSubClient] = useState('');

  console.log(userId, userName, totalValues);

  // const totalWidth = totalValues ? totalValues.width : 0;
  // const totalHeight = totalValues ? totalValues.height : 0;

  const [customer, setcustomer] = useState([]);
  const [exJobNumber, setExJobNumber] = useState([]);

  const [user, setUser] = useState('');
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const [emailid, setEmailid] = useState('');
  const [projectname,setProjectname]=useState('');

  const [newJobNo, setNewJobNo] = useState('');
  const [clients, setClients] = useState('');
  const [subClients, setSubclients] = useState('');
  const users = localStorage.getItem('users');

  const currentDate = new Date().toISOString().split('T')[0];

  const [businessType, setBusinessType] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [lpono, setlpono] = useState("");
  const [lpoDate, setlpoDate] = useState("");
  const [poType, setPoType] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [enteredby, setEnteredby] = useState("");
  const [locationid, setLocationid] = useState("");
  // const [locationjob, setLocationJob] = useState([]);

  const [customerNameAccLocation, setCustomerNameAccLocation] = useState([]);

  const [jobsFromSql, setJobsFromSql] = useState([]);

  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'ascending' });
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);

  const [acceptorders,setAcceptedorders]=useState([]);
  const [filters, setFilters] = useState({
    jobNo: '',
    date: '',
    client: '',
    userName: '',
    subClient: '',
    productionLocation: '',
    billingLocation: '',
    visualCode: '',
    nameSubCode: '',
    city: '',
    qty: '',
    width: '',
    height: '',
    totalSqFt: '',
    media: '',
    lamination: '',
    mounting: '',
    implementation: '',
    salonAddress: '',
    machineName: '',
    deadline: '',
    designerName: '',
    designerDeadline: '',
    printerPrintingName: '',
    printerDeadline: '',
    remarks: '',
  });

  const headerMapping = {
    "Job No": "Job No",
    "Client": "CLIENT",
    "Sub Client": "Sub Client",
    "Job Date": "Date",
    "Production Location": "Production Location",
    "Billing Location": "Billing  Location",
    "Visual Code": "VISUAL CODE",
    "Product Details": "Name & Sub Code",
    "City": "CITY",
    "Qty": "QTY",
    "Width": "Width",
    "Height": "Height",
    "Total Sq.Ft": "Total Sq.ft",
    "Media": "Media",
    "Installation": "Installation",
    "Job Deadline": "Job Deadline",
    "Designer Name": "Designer Name",
    "Designer ID": "Designer ID",
    "Designer Deadline": "Designer Deadline",
    "Printing Machine": "Printer Name",
    "Printer Deadline": "Printer Deadline",
    "Print Ready File": "Print Ready Available",
    "Lamination": "LAMINATION",
    "Mounting": "MOUNTING",
    "Implementation": "Implementation",
    "Salon / Store Address": "SALON ADDRESS",
    "Remarks / Instructions": "Remarks/Instructions",
  };

  const filterConfig = [
    { key: 'jobNo', placeholder: 'Job No', type: 'text' },
    { key: 'date', placeholder: 'Job Date', type: 'date' },
    { key: 'client', placeholder: 'Client', type: 'text' },
    { key: 'userName', placeholder: 'User Name', type: 'text' },
    { key: 'subClient', placeholder: 'Sub Client', type: 'text' },
    { key: 'productionLocation', placeholder: 'Production Location', type: 'text' },
    { key: 'billingLocation', placeholder: 'Billing Location', type: 'text' },
    { key: 'visualCode', placeholder: 'Visual Code', type: 'text' },
    { key: 'nameSubCode', placeholder: 'Product Details', type: 'text' },
    { key: 'city', placeholder: 'City', type: 'text' },
    { key: 'printReadyAvailable', placeholder: 'Print Ready File', type: 'text' },
    { key: 'qty', placeholder: 'Qty', type: 'text' },
    { key: 'width', placeholder: 'Width', type: 'text' },
    { key: 'height', placeholder: 'Height', type: 'text' },
    { key: 'totalSqFt', placeholder: 'Total Sq.Ft', type: 'text' },
    { key: 'media', placeholder: 'Media', type: 'text' },
    { key: 'lamination', placeholder: 'Lamination', type: 'text' },
    { key: 'mounting', placeholder: 'Mounting', type: 'text' },
    { key: 'implementation', placeholder: 'Implementation', type: 'text' },
    { key: 'salonAddress', placeholder: 'Salon / Store Address', type: 'text' },
    { key: 'machineName', placeholder: 'Machine Name', type: 'text' },
    { key: 'deadline', placeholder: 'Job Deadline', type: 'text' },
    { key: 'designerName', placeholder: 'Designer Name', type: 'text' },
    { key: 'designerDeadline', placeholder: 'Designer Deadline', type: 'text' },
    { key: 'printerPrintingName', placeholder: 'Printing Machine', type: 'text' },
    { key: 'printerDeadline', placeholder: 'Printer Deadline', type: 'text' },
    { key: 'remarks', placeholder: 'Remarks / Instructions', type: 'text' },
  ]
 


  const customColumnDefs = filterConfig.map(column => {
  if (column.key === "productionLocation") {
    return {
      headerName: column.placeholder,
       field: "productionLocation", 
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ["North", "South", "East", "West"], // You can fetch these dynamically too
      },
      minWidth: 160,
      resizable: true,
      sortable: true,
      filter: true,
    };
  }

  return {
    headerName: column.placeholder,
    field: column.key,
    sortable: true,
    filter: true,
    minWidth: 160,
    resizable: true,
    cellRenderer: (params) => {
      const value = params.value;

      if (["width", "height", "totalSqFt"].includes(column.key)) {
        const num = parseFloat(value);
        return isNaN(num) ? '' : num.toFixed(2);
      }

      if (column.key === "date") {
        if (value) return value;
        const enteredDate = params.data.entereddt;
        return enteredDate ? new Date(enteredDate).toLocaleDateString('en-GB') : '';
      }

      return value;
    }
  };
});


  console.log(setSortConfig)

  console.log(filteredJobNumbers, setSelectSearchTerm);

  const resetForm = () => {
    setNewJobNo('');
    setClients('');
    setBusinessType('');
    setContactPerson('');
    setlpono('');
    setlpoDate('');
    setPoType('');
    setCustomerName('');
    setSelectedCustomerId('');
    setCustomerid('');
    setSelectedExJobNumber('');
    setCustomerEmail('');
  }


  console.log("job", subClients)
  console.log(setJobNumber, setExJobNumber)

 const [columnDefs] = useState([
  {
    headerCheckboxSelection: true,
    checkboxSelection: true,
    field: '',
    width: 50,
    pinned: 'left'
  },
  ...customColumnDefs,
  {
    headerName: 'Sent to Printing',
    field: "Sent to Printing",
    valueGetter: (params) => params.data.approved === "Yes" ? "Yes" : "No",
    cellRenderer: (params) => (
      <button className={`btn btn-sm ${params.value === "Yes" ? "btn-success" : "btn-danger"}`} disabled>
        {params.value}
      </button>
    )
  },
  {
    headerName: "On Hold",
    field: "isOnHold",
    cellRenderer: (params) => (
      <span className={`badge ${params.value === "1" ? "bg-primary" : "bg-secondary"}`}>
        {params.value === "1" ? "Yes" : "No"}
      </span>
    )
  }
]);

  


  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 120,
    resizable: true,
    sortable: true,
    filter: true
  }), []);


  const handleAcceptOrder = (orderItems) => {
  console.log("Accepted Order Items:", orderItems);

  // You can now push them into AG Grid or save to Mongo
  // Example: POST to Addjobdetails API

  axios.post(config.JobSummary.URL.Addjobdetails, orderItems)
    .then(res => {
      toast.success("Accepted orders added as jobs");
      GetAllJobAccToLocation(); // Refresh grid
    })
    .catch(err => {
      toast.error("Failed to add job details");
      console.error(err);
    });
};




  // Check if users data exists and is not null
  useEffect(() => {
    // Check if users data exists and is not null
    if (users) {
      // Parse the JSON string into an object
      const usersObject = JSON.parse(users);

      // Access the username
      const username = usersObject.message && usersObject.message.username;
      setUser(username);

      const emailid = usersObject.message && usersObject.message.email_id;
      console.log('emailid is: ', emailid);
      setEmailid(emailid);

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

        console.log('Entered by ', userObj?.message?.enteredby);
        console.log('Location id ', userObj?.message?.location_id);
        setEnteredby(userObj?.message?.enteredby);
        setLocationid(userObj?.message?.location_id);

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
        // setData(userName);
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

  // console.log(setClients,setSubclients)

  const uniqueJobNumbers = useMemo(() => { return [...new Set(jobNumbers.map(job => job.jobNo))] }, [jobNumbers]);
  console.log("unique", uniqueJobNumbers)

  // const filteredData = Array.isArray(designData) ? designData.filter(row =>
  //   row.jobNumbers && row.jobNumbers.toLowerCase().includes(searchTerm.trim().toLowerCase())
  // ) : [];

  useEffect(() => {
    if (selectSearchTerm.trim() === '') {
      setFilteredJobNumbers(uniqueJobNumbers);
    } else {
      const filtered = uniqueJobNumbers.filter(jobNumbers =>
        jobNumbers.toLowerCase().includes(selectSearchTerm.trim().toLowerCase())
      );
      setFilteredJobNumbers(filtered);
    }
  }, [selectSearchTerm, uniqueJobNumbers]);

  // const handleSelectJobNoChange = (e) => {
  //   const selectedJobNo = e.target.value;
  //   console.log("e is ", e)
  //   setNewJobNo(selectedJobNo);
  //   setSelectSearchTerm("");

  //   if (selectedJobNo) {
  //     // Set sub-client name

  //     if  ( jobNumbers.length > 0 && jobNumbers !=null)
  //     {


  //       const foundJob = jobNumbers.find(job => job.jobNo === selectedJobNo);


  //       if (foundJob)
  //       {


  //         console.log("client ", foundJob.client, foundJob.subClient)
  //         setClients(foundJob.client);
  //         setSubclients(foundJob.subClient);

  //       }

  //     }

  //     else {
  //       setClients('');
  //       setSubclients('');
  //   }
  //   }
  // }


  // const handleJobNumberChange = (jobNo) => {
  //   setNewJobNo(jobNo);
  //   const selectedJob = jobNumbers.find(job => job.jobNo === jobNo);
  //   console.log("Selected Job: ", selectedJob);
  // };


  // const fetchJobs = async () => {
  //   const user_id = getLoggedInUserId();
  //   // const username = userName;

  //   console.log('payload uname: ', userName);

  //   if (!user_id) {
  //     setError("User not logged in");
  //     return;
  //   }

  //   try {
  //     setLoading(true);

  //     const payload = {
  //       user: {
  //         user_id: user_id,
  //         userName: userName,
  //         username: user,
  //         entereddt: currentDate,
  //       }
  //     };

  //     console.log("Sending payload to fetch jobs: ", payload);
  //     console.log('payload username: ', payload.user.userName);

  //     const response = await axios.post(config.JobSummary.URL.Getalljob, payload, { // Make sure to send the payload here
  //       timeout: 10000,
  //       headers: {
  //         'Content-Type': 'application/json' // Ensure the correct content type
  //       }
  //     });

  //     console.log("Data fetched successfully: ", response.data);

  //     setData(response.data);

  //     // setJobNumber(response.data)

  //     setJobNumber(response.data);
  //     setExJobNumber(response.data);
  //     console.log('exjobno: ', response.data);
  //     // If there are jobs, set the client and sub-client based on the first job
  //     if (Array.isArray(response.data) && response.data.length > 0) {
  //       const firstJob = response.data[0]; // Assuming you want to set based on the first job
  //       setClients(firstJob.client); // Adjust according to your data structure
  //       setSubclients(firstJob.subClient); // Adjust according to your data structure
  //     } else {
  //       setClients('');
  //       setSubclients('');
  //     }
  //     console.log('getdata is ', response.data)

  //     if (Array.isArray(response.data) && response.data.length > 0) {
  //       setData(response.data); // This should set jobs specific to the user
  //     } else {
  //       setData([]); // No jobs found for the user
  //     }

  //   } catch (error) {
  //     console.error("Error fetching job data:", error.response ? error.response.data : error.message);
  //     setError("Error fetching job data");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const GetAllJobAccToLocation = async () => {


    const users = localStorage.getItem('users');

    const userObj = JSON.parse(users);

    const userNamedata = userObj?.message?.username;
    const locationdata = userObj?.message?.location_id
    const payload = {
      locationId: locationdata,
      username: userNamedata,
    }

    console.log("locationid and username is ", payload)
    try {

      const response = await axios.post(config.JobSummary.URL.GetAllJobsAccToLocation, payload);
      console.log('response of jobs acc to location: ', response.data);
      // setLocationJob(response.data);

      setData(response.data.items);

    } catch (error) {
      console.error('Error fetching jobs according to location', error);
    } finally {
      setLoading(false);
    }
  }


  const GetAllJobsFromSql = async () => {
    const payload = {
      locationId: locationid,
    }
    try {
      const response = await axios.post(config.JobSummary.URL.GetAllJobsFromSql, payload);
      console.log('jobs from sql: ', response.data.comartjobno);
      setJobsFromSql(response.data);
    } catch (error) {
      console.error('Unable to fetch jobs for the location id', error);
    }
  }

  useEffect(() => {
    // fetchJobs();
    fetchcustomers();
    GetAllJobsFromSql();
    GetAllJobAccToLocation();
  }, [locationid, userName]);

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
  console.log(filteredData1);



  const filteredData = useMemo(() => {
    return filteredData1.filter((row) => {
      return Object.keys(filters).every((key) => {
        return row[key]?.toString().toLowerCase().includes(filters[key].toLowerCase()) || filters[key] === '';
      });
    });
  }, [filteredData1, filters]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
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
  }, [filteredData, sortConfig]);

  // const filteredData = useMemo(() => {
  //   return sortedData.filter(row => {
  //     return (
  //       (row.jobNo && row.jobNo.toLowerCase().includes(filters.jobNo.toLowerCase())) &&
  //       (row.date && row.date.includes(filters.date)) &&
  //       (row.client && row.client.toLowerCase().includes(filters.client.toLowerCase())) &&
  //       (row.userName && row.userName.toLowerCase().includes(filters.userName.toLowerCase())) &&
  //       (row.subClient && row.subClient.toLowerCase().includes(filters.subClient.toLowerCase())) &&
  //       (row.productionLocation && row.productionLocation.toLowerCase().includes(filters.productionLocation.toLowerCase())) &&
  //       (row.billingLocation && row.billingLocation.toLowerCase().includes(filters.billingLocation.toLowerCase())) &&
  //       (row.visualCode && row.visualCode.toLowerCase().includes(filters.visualCode.toLowerCase())) &&
  //       (row.nameSubCode && row.nameSubCode.toLowerCase().includes(filters.nameSubCode.toLowerCase())) &&
  //       (row.city && row.city.toLowerCase().includes(filters.city.toLowerCase())) &&
  //       (row.qty && row.qty.toLowerCase().includes(filters.qty.toLowerCase())) &&
  //       (row.width && row.width.toLowerCase().includes(filters.width.toLowerCase())) &&
  //       (row.height && row.height.toLowerCase().includes(filters.height.toLowerCase())) &&
  //       (row.totalSqFt && row.totalSqFt.toLowerCase().includes(filters.totalSqFt.toLowerCase())) &&
  //       (row.media && row.media.toLowerCase().includes(filters.media.toLowerCase())) &&
  //       (row.lamination && row.lamination.toLowerCase().includes(filters.lamination.toLowerCase())) &&
  //       (row.mounting && row.mounting.toLowerCase().includes(filters.mounting.toLowerCase())) &&
  //       (row.implementation && row.implementation.toLowerCase().includes(filters.implementation.toLowerCase())) &&
  //       (row.salonAddress && row.salonAddress.toLowerCase().includes(filters.salonAddress.toLowerCase())) &&
  //       (row.machineName && row.machineName.toLowerCase().includes(filters.machineName.toLowerCase())) &&
  //       (row.deadline && row.deadline.toLowerCase().includes(filters.deadline.toLowerCase())) &&
  //       (row.designerName && row.designerName.toLowerCase().includes(filters.designerName.toLowerCase())) &&
  //       (row.designerDeadline && row.designerDeadline.toLowerCase().includes(filters.designerDeadline.toLowerCase())) &&
  //       (row.printerPrintingName && row.printerPrintingName.toLowerCase().includes(filters.printerPrintingName.toLowerCase())) &&
  //       (row.printerDeadline && row.printerDeadline.toLowerCase().includes(filters.printerDeadline.toLowerCase())) &&
  //       (row.remarks && row.remarks.toLowerCase().includes(filters.remarks.toLowerCase()))

  //     );
  //   });
  // }, [sortedData, filters]);
  console.log(filteredData)

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

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  }


  const fetchcustomers = async () => {
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
      setcustomer(response.data);

    } catch (error) {
      console.error("Error fetching customer data:", error.response ? error.response.data : error.message);
      setError("Error fetching job data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCustomerName = async () => {
      const payload = {
        locationId: locationid,
      }
      try {
        const response = await axios.post(config.JobSummary.URL.GetCustomerNameAccToLocation, payload);
        setCustomerNameAccLocation(response.data);
        console.log('customer names', response.data);
      } catch (error) {
        console.error('Error fetching customer name');
      }
    }
    fetchCustomerName();
  }, [locationid]);

  const normalizeHeader = (header) => header?.trim().toLowerCase();


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const binaryStr = event.target.result;
      const workbook = read(binaryStr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = utils.sheet_to_json(worksheet, { header: 1, raw: false });

      if (!jsonData.length) {
        console.error('No data found in the Excel file');
        return;
      }

      const excelHeaders = jsonData[0];
      const dataRows = jsonData.slice(1);

      const normalizedHeaderMap = {};
      excelHeaders.forEach((header, i) => {
        const normalized = normalizeHeader(header);
        Object.entries(headerMapping).forEach(([key, value]) => {
          if (normalizeHeader(key) === normalized || normalizeHeader(value) === normalized) {
            normalizedHeaderMap[i] = value;
          }
        });
      });

      const mappedData = dataRows.map((row) => {
  const obj = {};
  Object.keys(normalizedHeaderMap).forEach((index) => {
    const colIndex = parseInt(index);
    const fieldName = normalizedHeaderMap[colIndex];
    obj[fieldName] = row[colIndex];
  });

  // ✅ If "Date" is still missing, fallback to "Job Date"
  if (!obj["Date"] && row[excelHeaders.indexOf("Job Date")] != null) {
    obj["Date"] = row[excelHeaders.indexOf("Job Date")];
  }

  return obj;
}).filter(row => Object.values(row).some(val => val !== '' && val !== null && val !== undefined));


      setHeaders(Object.values(normalizedHeaderMap));
      setData(mappedData);

      console.log('✅ Mapped Excel Headers:', Object.values(normalizedHeaderMap));
      console.log('✅ Parsed Data:', mappedData);
    };

    reader.readAsBinaryString(file);
  };

  {/*submitting excel data*/ }
  const submitDataToAPI = async (e) => {
    const user_id = getLoggedInUserId();
    // let ISnewjob = 1;

    if (!user_id) {
      setError("User not logged in");
      return;
    }
   // if (!emailid) {
     // toast.error("Email id not found!");
      //return;
    //}
    e.preventDefault();
    try {
      setLoading(true);

      const dataWithUsernames = data.map(item => ({
        ...item,  // Spread existing properties
        userName: userName, // Add the username field
        user_id: user_id,
        username: user,
        emailid: emailid,
        entereddt: currentDate,
      }));

      console.log('data with unames', dataWithUsernames, newJobNo, clients, subClients);
      console.log("API URL: ", config.JobSummary.URL.Addjobdetails);

      // const jobNumbers = [];

      if (newJobNo != '')
      {
        // ISnewjob = 0;
        let newdata = dataWithUsernames.map(item => ({
          ...item,  // Spread existing properties
          "Job No": newJobNo,
          "CLIENT": clients,
          "UserId": userId,
          // "Sub Client": subClients,

          ISnewjob:'0'
        }));

        console.log("newdata",newdata);
        const response = await axios.post(config.JobSummary.URL.Addjobdetails, newdata);
        console.log("response of the job number", newdata);
        const jobNoCreated = response.data.jobno || response.data.jobNo || '';
        setLatestJobNo(jobNoCreated); // after existing job response

        console.log("Job created successfully. Job No:", jobNoCreated);
        const data = response.config.data;
        const parsedData = JSON.parse(data);
        const jobNumbers = parsedData.map(item => item['Job No']);
        console.log("Data submitted successfully: ", jobNumbers);
        console.log("data is here ",data)

        if (jobNoCreated) {
          toast.success(`Job created successfully. Job No: ${jobNoCreated}`);
        } else {
          toast.success(`Job created successfully`);
        }

        

        // Reset the state after submission
        setHeaders([]);
        setData([]);
        setBulkAdd(false);      
      }
      else {    
        // ISnewjob = 1;
        let newdata = dataWithUsernames.map(item => ({
          ...item,
          ISnewjob: '1',
          "customername": customerName,
          "businessType": businessType,
          "customerEmail": customerEmail,
          "contactPerson": contactPerson,
          "customerid": customerid,
          "lpono": lpono,
          "lpodate": lpoDate.toString(),
          "potype": poType,
          "jobdesc": "",
          "enteredby": userName,
          "userid": userId,
          "locationid": locationid,
          "emailid": emailid,
        }));
      
        const newemptyjob = [{
          ISnewjob: '1',
          customername: customerName,
          businessType: businessType,
          customerEmail: customerEmail,
          contactPerson: contactPerson,
          customerid: customerid,
          lpono: lpono,
          lpodate: lpoDate.toString(),
          potype: poType,
          jobdesc: "",
          enteredby: userName,
          userid: userId,
          locationid: locationid,
          emailid: emailid,
          projectname:projectname,
        }];
      
        newdata = newemptyjob;
      
        const response = await axios.post(config.JobSummary.URL.Addjobdetails, newdata);
      
        const createdJobNo = response?.data?.jobno || ""; 
        console.log("Data submitted successfully: ", response);
        setLatestJobNo(createdJobNo); // after new job response

      
        if (createdJobNo) {
          toast.success(`Job created successfully. Job No: ${createdJobNo}`);
        } else {
          toast.success("Job created successfully.");
        }
      }

      // Reset form and UI
      resetForm();
      toggleBulkAdd();
      // fetchJobs();
      setHeaders([]);
      // setData([]);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios error: ", error.message);
      } else {
        console.error("Unexpected error: ", error);
      }
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };


  console.log(customerid);
  

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

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedExJobNumber, setSelectedExJobNumber] = useState('');

  const handleSelectChange = (selectedOption) => {
    if (selectedOption) {
      console.log(selectedOption); // Log the selected option
      setSelectedCustomerId(selectedOption.value); // Set the selected customer ID
      setCustomerid(selectedOption.value); // Set the customer ID state

      // Find the customer name based on the selected option
      const selectedCustomer = customerOptions.find(option => option.value === selectedOption.value);
      setCustomerName(selectedCustomer ? selectedCustomer.label : ''); // Set the customer name
      console.log("Customer ID is for new customer:", selectedOption.value);
      console.log("Customer Name is:", selectedCustomer ? selectedCustomer.label : '');
    } else {
      setSelectedCustomerId('');
      setCustomerName('');
    }
  };

  const handleExJobNoSelectChange = (selectedOption) => {
    if (selectedOption) {
      console.log(selectedOption); // Log the selected option
      setSelectedExJobNumber(selectedOption.value);

      // Find the customer name based on the selected option
      const selectedJobNo = uniqueJobNoOptions.find(option => option.value === selectedOption.value);
      console.log(selectedJobNo, "selected job no");
      setNewJobNo(selectedOption.value);
      if (selectedJobNo) {
        setClients(selectedJobNo.clientName); // Set the client name
        setSubclients(selectedJobNo.subClient); // Set the sub-client name if it exists
        console.log('Selected client name is: ', selectedJobNo.client);
        console.log('Selected sub-client name is: ', selectedJobNo.subClient);
      } else {
        setClients(''); // Clear client if not found
        setSubclients(''); // Clear sub-client if not found
      }

      console.log('selected client name is: ', selectedOption);
      setCustomerName(selectedJobNo ? selectedJobNo.label : ''); // Set the customer name
      console.log("Job No :", selectedOption.value);
      console.log("Job No is:", selectedJobNo ? selectedJobNo.label : '');
    } else {
      setSelectedExJobNumber('');
    }
  };

  const handleJobOnHold = async () => {
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const selectedData = selectedNodes.map(node => node.data);
  
    if (selectedData.length === 0) {
      toast.error("Please select at least one job.");
      return;
    }
  
    try {
      for (const job of selectedData) {
        await axios.post(config.JobSummary.URL.SetJobOnHold, { jobNo: job.jobNo });
      }
  
      toast.success("Selected jobs marked as On Hold.");
      GetAllJobAccToLocation(); // Refresh data
    } catch (error) {
      console.error("Error marking jobs as on hold:", error);
      toast.error("Failed to mark jobs as on hold.");
    }
  };
  
  

  // const customerOptions = customer.map((cust) => ({
  //   value: cust.customeR_ID,
  //   label: cust.customeR_NAME,
  // }));
  console.log(customer, customerNameAccLocation, 'customer name');

  const customerOptions = customerNameAccLocation.map((cust) => ({
    value: cust.customerid,
    label: cust.client,
  }));

  const formatDecimal = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? '' : num.toFixed(2);
  };
  

  // const jobNoOptions = Array.from(new Set(exJobNumber.map(job => job.jobNo)))
  //   .map(jobNo => {
  //     const job = exJobNumber.find(job => job.jobNo === jobNo); // Find the first occurrence of the job
  //     return {
  //       value: jobNo,
  //       label: jobNo, // Display job number
  //       clientName: job ? job.client : '' // Include client name if found
  //     };
  //   });
  const jobNoOptionsFromSql = jobsFromSql.map(job => ({
    value: job.comartjobno,
    label: `${job.comartjobno} (${job.client})`,
    clientName: job.client || '',
    subClient: job.subClient || ''
  }));


  const jobNoOptionsFromExJobNumber = Array.from(new Set(exJobNumber.map(job => job.jobNo)))
  .map(jobNo => {
    const job = exJobNumber.find(job => job.jobNo === jobNo); // Find the first occurrence
    return {
      value: jobNo,
      label: `${jobNo} (${job?.client || 'Unknown'})`,
      clientName: job?.client || '',
      subClient: job?.subClient || ''
    };
  });

  const combinedJobNoOptions = [...jobNoOptionsFromSql, ...jobNoOptionsFromExJobNumber];
  const uniqueJobNoOptions = Array.from(new Set(combinedJobNoOptions.map(option => option.value)))
    .map(value => combinedJobNoOptions.find(option => option.value === value));
    // setJobNoOptions(uniqueJobNoOptions); 

  console.log('selected job No options: ', uniqueJobNoOptions);

  console.log('selected date is: ', lpoDate, exJobNumber);

  const handleBusinessType = (e) => {
    setBusinessType(e.target.value);
  }
  const handlePoType = (e) => {
    setPoType(e.target.value);
  }

  console.log('comart job no: ', jobsFromSql.comartjobno);

  return (
    <div>
      <div className="page-wrapper">
        <div className="content container-fluid">
          <ToastContainer />
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
                    <div className="button-group" style={{ display: 'flex', justifyContent: 'space-between', marginLeft: 'auto', width: '100%' }}>

                      <Button variant="primary" style={{ marginBottom: "1em" }} onClick={() => setShowFilterSidebar(true)}>
                        <FaFilter style={{ marginRight: '0.5em' }} />
                        Open Filters
                      </Button>

                    <Button
                      variant="warning"
                      onClick={handleJobOnHold}
                      style={{ marginBottom: "1em", marginLeft: '10px' }}
                     
                    >
                      Job On Hold
                    </Button>
                      <FilterSidebar
                        show={showFilterSidebar}
                        handleClose={() => setShowFilterSidebar(false)}
                        filters={filters}
                        setFilters={setFilters}
                        filterConfig={filterConfig}
                      />
                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: 'column', marginRight: '48px' }}>
                        {latestJobNo && (
                          <div style={{ fontWeight: 600, fontSize: '14px', color: '#2c3e50' }}>
                            Latest Job No: <span style={{ color: '#007bff' }}>{latestJobNo}</span>
                            
                          </div>
                        )}


                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FaSyncAlt size={20} style={{ cursor: 'pointer', marginRight: '48px' }} onClick={() => window.location.reload()} />

                        <Button
                          type="default"
                          style={{ backgroundColor: 'orange', borderColor: 'orange' }}
                          onClick={toggleBulkAdd}
                        >
                          Upload
                        </Button>
                      </div>
                      </div>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <Modal
                      isOpen={BulkAdd}
                      toggle={toggleBulkAdd}
                      centered
                      className="border-0"
                      modalClassName='modal fade zoomIn'
                      backdrop={false}
                    >
                      <ModalHeader className="p-3 bg-info-subtle" toggle={toggleBulkAdd}>
                        Upload Bulk
                      </ModalHeader>
                      <ModalBody className="modal-body">
                        <Row className="gap-3">
                          <Col>
                            <div className="external-nav">
                              <Tab.Container id="form-tabs" className={'tab-container'} activeKey={activeTab} onSelect={(key) => setActiveTab(key)} >
                                <Nav variant="tabs" className="nav-tabs">
                                  <NavItem>
                                    <NavLink eventKey="newJob">New Job</NavLink>
                                  </NavItem>
                                  <NavItem>
                                    <NavLink eventKey="existingJob">Existing Job</NavLink>
                                  </NavItem>
                                </Nav>
                                <Card>
                                  <CardBody>
                                    <Tab.Content>
                                      {/* New Job Tab */}
                                      <Tab.Pane eventKey="newJob">
                                        <Row className="mb-3">
                                          <Col sm={6}>
                                            <Form.Group controlId="customerName">
                                              <Form.Label>Customer Name</Form.Label>
                                              <Select
                                                options={customerOptions}
                                                value={customerOptions.find(option => option.value === selectedCustomerId)} // Bind the selected value
                                                onChange={handleSelectChange} // Call the updated function
                                                placeholder="Select Customer"
                                              />
                                            </Form.Group>
                                          </Col>
                                          <Col sm={6}>
                                            <Form.Group controlId="businessType">
                                              <Form.Label>Business Type</Form.Label>
                                              <Form.Select value={businessType} onChange={handleBusinessType}>
                                                <option value="">Select Business Type</option>
                                                <option value="Print">Print</option>
                                                <option value="Retail">Retail</option>
                                                <option value="Onsite">Onsite</option>
                                                <option value="Print + Retail">Print + Retail</option>
                                              </Form.Select>
                                            </Form.Group>
                                          </Col>
                                        </Row>

                                        <Row className="mb-3">
                                          <Col sm={6}>
                                            <Form.Group controlId="contactPerson">
                                              <Form.Label>Contact Person</Form.Label>
                                              <Form.Control type="text" placeholder="Enter Contact Person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
                                            </Form.Group>
                                          </Col>
                                          <Col sm={6}>
                                            <Form.Group controlId="poNo">
                                              <Form.Label>PO No</Form.Label>
                                              <Form.Control type="text" placeholder="Enter PO No" value={lpono} onChange={(e) => setlpono(e.target.value)} />
                                            </Form.Group>
                                          </Col>
                                        </Row>

                                        <Row className="mb-3">
                                          <Col sm={6}>
                                            <Form.Group controlId="poDate">
                                              <Form.Label>PO Date</Form.Label>
                                              <Form.Control type="date" value={lpoDate} onChange={(e) => setlpoDate(e.target.value)} />
                                            </Form.Group>
                                          </Col>
                                          {/* <Col sm={6}>
                                              <Form.Group controlId="subClient">
                                                <Form.Label>Sub Client</Form.Label>
                                                <Form.Control type="text" placeholder="Enter Sub Client" value={subClient} onChange={(e) => setSubClient(e.target.value)} />
                                              </Form.Group>
                                            </Col> */}
                                          <Col sm={6}>
                                            <Form.Group controlId="PoType">
                                              <Form.Label>PO Type</Form.Label>
                                              <Form.Select value={poType} onChange={handlePoType}>
                                                <option value="">Select PO Type</option>
                                                <option value="PO Received">PO Received</option>
                                                <option value="PO not Received">PO not Received</option>
                                                <option value="Direct Billing">Direct Billing</option>
                                                <option value="Open PO">Open PO</option>
                                                <option value="Estimate Approval Pending">Estimate Approval Pending</option>
                                              </Form.Select>
                                            </Form.Group>
                                          </Col>
                                        </Row>
                                        <Row className="mb-3">
                                          <Col sm={6}>
                                            <Form.Group controlId="customerEmail">
                                              <Form.Label>Customer Email</Form.Label>
                                              <Form.Control type="email" placeholder="Enter Customer Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                                            </Form.Group>
                                          </Col>
                                          <Col sm={6}>
                                            <Form.Group>
                                              <Form.Label>Project Name</Form.Label>
                                              <Form.Control type="text" placeholder="Enter Project Name" value={projectname} onChange={(e) => setProjectname(e.target.value)} />
                                            </Form.Group>
                                          </Col>
                                        </Row>
                                      </Tab.Pane>

                                      {/* Existing Job Tab */}
                                      <Tab.Pane eventKey="existingJob">
                                        {/* Job Number Dropdown */}
                                        {/* <Form.Group controlId="customerName">
                                            <Form.Label>Job Number</Form.Label>
                                            <Select
                                              options={jobNoOptions}
                                              value={jobNoOptions.find(option => option.value === selectedExJobNumber) || null} // Bind the selected value
                                              onChange={handleExJobNoSelectChange} // Call the updated function
                                              placeholder="Select Job No"
                                            />
                                          </Form.Group> */}
                                        <Form.Group controlId="customerName" style={{ position: 'relative', zIndex: 999 }}>
                                          <Form.Label>Job Number</Form.Label>
                                          <Select
                                            options={uniqueJobNoOptions}
                                            value={uniqueJobNoOptions.find(option => option.value === selectedExJobNumber) || null} // Bind the selected value
                                            onChange={handleExJobNoSelectChange} // Call the updated function
                                            placeholder="Select Job No"
                                          />
                                        </Form.Group>
                                        <Row className="mb-3 mt-5">
                                          <Col>
                                            <Form.Control className="form-control file-choose" type="file" onChange={handleFileChange} />
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

                                          </Col>
                                        </Row>
                                      </Tab.Pane>
                                    </Tab.Content>
                                  </CardBody>
                                </Card>
                              </Tab.Container>
                            </div>
                          </Col>
                        </Row>

                        {/* Excel Upload Control - Moved Outside the Tab */}
                        {/* <Row className="mb-3">
                            <Col>
                              <Form.Control className="form-control file-choose" type="file" onChange={handleFileChange} />
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
                            </Col>
                          </Row> */}
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
                  {/* <Form.Group className="mb-3">
                    <Form.Label>Search by Job No</Form.Label>
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
                  </Form.Group> */}

                  <div style={{ overflowX: 'auto' }} className="table-container">
                  <div className="ag-theme-alpine custom-ag-grid" style={{ height: '600px', width: '100%' }}>
                 <AgGridReact
              ref={gridRef}
              rowData={sortedData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              pagination={true}
              paginationPageSize={50}
              domLayout="normal"
              rowSelection="multiple"
              getRowHeight={() => 60}
              headerHeight={50}
              singleClickEdit={true}
                                  rowClassRules={{
  "row-packing": params => params.data?.isPackingDone === "1",
  "row-implupload": params =>
    params.data?.isImplementationUploadDone === "1" &&
    params.data?.isPackingDone !== "1",
  "row-implementation": params =>
    params.data?.isImplementationDone === "1" &&
    params.data?.isImplementationUploadDone !== "1" &&
    params.data?.isPackingDone !== "1",
  "row-design": params =>
    params.data?.isDesignDone === "1" &&
    params.data?.isImplementationDone !== "1" &&
    params.data?.isImplementationUploadDone !== "1" &&
    params.data?.isPackingDone !== "1",
  "row-delivery": params =>
    params.data?.isDeliveryDone === "1" &&
    params.data?.isDesignDone !== "1" &&
    params.data?.isImplementationDone !== "1" &&
    params.data?.isImplementationUploadDone !== "1" &&
    params.data?.isPackingDone !== "1",
  "row-printing": params =>
    params.data?.isPrinitngdone === "1" &&
    params.data?.isDeliveryDone !== "1" &&
    params.data?.isDesignDone !== "1" &&
    params.data?.isImplementationDone !== "1" &&
    params.data?.isImplementationUploadDone !== "1" &&
    params.data?.isPackingDone !== "1"
}}
          suppressRowClickSelection={true} // ✅ Prevent automatic selection
            onCellValueChanged={(params) => {
              if (params.colDef.field === 'productionLocation') {
                const jobNo = params.data.jobNo;
                const newLocation = params.newValue;
                const billingLocation = params.data.billingLocation; // Assuming you want to keep the existing billing location

    axios.post(`${config.JobSummary.URL.UpdateProductionLocation}`, {
      jobNo,
      productionLocation: newLocation,
      billingLocation:billingLocation,
      

    }).then(() => {
      toast.success("Production Location updated");
    }).catch((error) => {
      toast.error("Failed to update Production Location");
      console.error("API error:", error);
    });
  }
}}
/>
                </div>
                  <OrderPopup
                show={isPopupVisible}
                items={data.filter(d => d.approved === "Yes")}
                onClose={() => setIsPopupVisible(false)}
                jobOptions={uniqueJobNoOptions}
                onAcceptAllOrders={handleAcceptOrder}
              />


                    {/* <div>
                        <DeadlineEmail
                          jobNumber="12345"
                          deadlineDate="01/01/2023"
                          items={[
                            { mediaName: "Product 1", quantity: 1, mediaWidth: 29.99, mediaHeight: 40 },
                            { mediaName: "Product 2", quantity: 2, mediaWidth: 19.99, mediaHeight: 40 }
                          ]}
                          // subtotal={69.97}
                          // shipping={5.00}
                          // total={74.97}
                          trackingLink="http://trackinglink.com"
                          supportEmail="support@example.com"
                          customerSupportNumber="(123) 456-7890"
                          companyName="Your Company Name"
                          companyWebsite="http://yourcompany.com"
                          companyContactInfo="(123) 456-7890"
                        />
                      </div> */}
                  </div>

                    <OrderPopup
                show={isPopupVisible}
                items={data.filter(d => d.approved === "Yes")}
                onClose={() => setIsPopupVisible(false)}
                jobOptions={uniqueJobNoOptions}
                onAcceptAllOrders={handleAcceptOrder} // ✅ here
              />


                </div>
              </div>
              
              <div className="status-legend-bar">
  <span className="legend-box printing">✅ Printing Done</span>
  <span className="legend-box delivery">🚚 Delivery Done</span>
  <span className="legend-box implementation">🛠️ Implementation Done</span>
  <span className="legend-box packing">📦 Packing Done</span>
  <span className="legend-box design">🎨 Design Done</span>
  <span className="legend-box implupload">⬆️ Impl Upload Done</span>
</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTables;
