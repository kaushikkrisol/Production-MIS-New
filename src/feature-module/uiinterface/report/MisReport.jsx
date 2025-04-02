import React, { useEffect, useState } from 'react';
import DateRangePicker from "react-bootstrap-daterangepicker";
import { Calendar } from "feather-icons-react/build/IconComponents";
import "bootstrap-daterangepicker/daterangepicker.css";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import axios from 'axios';
import { Container, Form, Row, Col, Alert, Spinner, Button, Table} from 'react-bootstrap';
import moment from 'moment';
import config from '../../../config';
import './MisReport.css';
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Select from 'react-select';

const MisReport = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [newLocation, setNewLocation] = useState('');
    const [newProduction, setNewProduction] = useState('');
    const productions = ["CS", "Design", "Printing", "Delivery"];
    const locations = ["North", "South", "East", "West"];
    const [data, setData] = useState([]);
    const [csData, setCsData] = useState([]);
    const [designData, setDesignData] = useState([]);
    const [printingData, setPrintingData] = useState([]);
    const [deliveryData, setDeliveryData] = useState([]);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [enteredDt, setEnteredDt] = useState(null);
    const [designEnteredDt, setDesignEnteredDt] = useState(null);
    const [printingEnteredDt, setPrintingEnteredDt] = useState(null);
    const [deliveryEnteredDt, setDeliveryEnteredDt] = useState(null);
    
    console.log(setFromDate, setToDate, data, setEnteredDt);

    // Handle location change
    const handleLocationChange = (e) => {
        setNewLocation(e.target.value);
    };

    // Handle production change
    const handleProductionChange = (e) => {
        setNewProduction(e.target.value);
    };

    // Handle 'Go' button click
    const handleGoReport = async () => {
        if (!newProduction) {
            console.error("Production type is missing.");
            return;
        }

        if (!newLocation) {
            console.error("Location is missing.");
        }

        if (!fromDate || !toDate) {
            console.error("Date range is missing.");
            return;
        }

        try {
            // Fetch the data for the selected production type
            await fetchReport();
            // await fetchData(newProduction);
            
        } catch (error) {
            console.error("Error in handleGoReport:", error);
        }
    };

    const fetchData = async (reporttype) => {
        setLoading(true);
        
        try {
            let response;
            
            if (reporttype === 'CS') {
                response = await axios.post(config.JobSummary.URL.Getalljob);
                console.log(enteredDt, 'entered datae of cs: ', response.data);
                setEnteredDt(response.data);
                setCsData(response.data);
            } else if (reporttype === 'Design') {
                response = await axios.post(config.Design.URL.Getalldesign);
                console.log(designEnteredDt, 'entered datae of design: ', response.data);
                setDesignEnteredDt(response.data)
                setDesignData(response.data);

                const dataWithTotalTimes = response.data.map((row) => {
                    if (row.startdate && row.enddate) {
                        try {
                            const startDate = moment(row.startdate, "DD/MM/YYYY HH:mm:ss");
                            const endDate = moment(row.enddate, "DD/MM/YYYY HH:mm:ss");

                            if (startDate.isValid() && endDate.isValid()) {
                                const totalTime = moment.duration(endDate.diff(startDate));
                                return {
                                    ...row,
                                    totalTime: `${totalTime.days()}d ${totalTime.hours()}h ${totalTime.minutes()}m`
                                };
                            }
                        } catch (e) {
                            console.error("Error calculating time for row: ", row, e);
                        }
                        
                        
                    }
                    return {
                        ...row,
                        totalTime: "N/A"
                    };
                });
                setDesignData(dataWithTotalTimes);
                console.log("Total Times: ", dataWithTotalTimes);
            } else if (reporttype === 'Printing') {
                response = await axios.post(config.Printing.URL.GetCompletedPrinting);
                console.log(printingEnteredDt, 'entered datae of printing: ', response.data);
                setPrintingEnteredDt(response.data)
                setPrintingData(response.data);
            } else if (reporttype === 'Delivery') {
                response = await axios.post(config.Delivery.URL.Getalldelivery);
                console.log(deliveryEnteredDt, 'entered datae of delivery: ', response.data);
                setDeliveryEnteredDt(response.data);
                setDeliveryData(response.data);
            } else {
                console.log('Invalid production type');
            }

            console.log('response', response.data);
        } catch (err) {
            
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        setError(null);

        let payload = {
            fromDate: fromDate,
            toDate: toDate,
            // entereddt: enteredDt,
            reporttype: newProduction,
            location: newLocation,
            // lstupdatedt: lstupdatedt,
        };

        try {
            const response = await axios.post(config.Report.URL.Getallreport, payload, {
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.status === 200 && response.data) {
                await fetchData();
                switch (newProduction) {
                    case "CS":
                        setCsData(response.data);
                        break;
                    case "Design":
                        setDesignData(response.data);
                        break;
                    case "Printing":
                        setPrintingData(response.data);
                        break;
                    case "Delivery":
                        setDeliveryData(response.data);
                        break;
                    default:
                        console.warn("Unknown production type");
                }
                setData(response.data);
                console.log('selected', response.data);
            } else {
                setError(`Failed to fetch data, status: ${response.status}`);
                setData([]);
            }
        } catch (err) {
            console.error(err);
            setData([]);
        } finally {
            setLoading(false);
        }
    }
    console.log('Entered dt', enteredDt);

    // useEffect(() => {
    //     const fetchJobs = async () => {
    //         try {
    //             // Fetch both jobs concurrently
    //             const [ fetchRep ] = await Promise.all([
                    
    //             ]);
    //             // Handle successful response (if needed, you can set state here)
    //             console.log( fetchRep );
    //         } catch (error) {
    //             // Handle error
    //             console.error("Error fetching jobs:", error);
    //         }
    //     };

    //     fetchJobs(); // Call the function to fetch data
    // }, []);

    // const resetForm = () => {
    //     setCsData('');
    //     setDesignData('');
    //     setPrintingData('');
    //     setDeliveryData('');
    // }

    const handleDateRangeChange = (event, picker) => {
        setFromDate(moment(picker.startDate).format('DD-MM-YYYY'));
        setToDate(moment(picker.endDate).format('DD-MM-YYYY'));
    };

    // Date Range Picker settings
    const initialSettings = {
        endDate: new Date(),
        startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
        timePicker: false,
        ranges: {
            "Today": [new Date(), new Date()],
            "Yesterday": [new Date(new Date().setDate(new Date().getDate() - 1)), new Date(new Date().setDate(new Date().getDate() - 1))],
            "Last 7 Days": [new Date(new Date().setDate(new Date().getDate() - 7)), new Date()],
            "Last 30 Days": [new Date(new Date().setDate(new Date().getDate() - 30)), new Date()],
            "This Month": [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)],
            "Last Month": [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), new Date(new Date().getFullYear(), new Date().getMonth(), 0)],
        },
    };

    const tableConfigs = {
        CS: {
            data: csData,
            headers: [
                "Job No", "Job Date", "Client", "Sub Client", "User Name", "Production Location", "Visual Code", "Product Details",
                "City", "Qty", "Media", "Implementation", "Job Deadline", "Lamination", "Mounting",
                "Salon / Store Address", "Dispatch Address", "Remarks / Instructions", "Width", "Height", "Total Sq.Ft"
            ],
            renderRow: (row) => (
                <tr key={row.id}>
                    <td>{row.jobNo}</td>
                    <td>{row.date}</td>
                    <td>{row.client}</td>
                    <td>{row.subClient}</td>
                    <td>{row.userName}</td>
                    <td>{row.region}</td>
                    <td>{row.visualCode}</td>
                    <td>{row.nameSubCode}</td>
                    <td>{row.city}</td>
                    <td>{row.qty}</td>
                    <td>{row.media}</td>
                    <td>{row.implementation}</td>
                    <td>{row.deadline}</td>
                    <td>{row.lamination}</td>
                    <td>{row.mounting}</td>
                    {/* <td>{row.implementation}</td> */}
                    <td>{row.salonAddress}</td>
                    <td>{row.dispatchAddress}</td>
                    <td>{row.remarks}</td>
                    <td>{row.width}</td>
                    <td>{row.height}</td>
                    <td>{row.totalSqFt}</td>
                </tr>
            ),
        },
        Design: {
            data: designData,
            headers: ["Job No", "Designer Name",  "Client Name", "No Of Artworker", "Brief", "Production Location", 
                "Query", "Design Type", "Job Date", "CS Name", "Visual Code", "Product Details",
                "City", "Designer Deadline", "Artworker Deadline", "Start Time", "End Time"],
            renderRow: (row) => (
                <tr key={row.id}>
                    <td>{row.jobNo}</td>
                    <td>{row.designerName}</td>
                    <td>{row.designClientName || row.client}</td>
                    <td>{row.noOfArtwork || row.noOfArtworker}</td>
                    <td>{row.designBrief}</td>
                    <td>{row.location || row.designLocation}</td>
                {/* <td>{row.designStatus}</td> */}
                    <td>{row.designQuery}</td>
                    <td>{row.designType}</td>
                    <td>{row.date}</td>
                    <td>{row.Entrdby}</td>
                    <td>{row.visualCode}</td>
                    <td>{row.nameSubCode}</td>
                    <td>{row.city || '-'}</td>
                    <td>{row.designerDeadline}</td>
                    <td>{row.artworkerDeadline}</td>
                    <td>{row.startdate || '-'}</td>
                    <td>{row.enddate || '-'}</td>
                </tr>
            ),
        },
        Printing: {
            data: printingData,
            headers: ["Job No", "Job Date", "Printing Machine", "Production Location", "Qty", "Print W.", "Print L.", "Print SQ.Ft.", "Media",
                "Implementation", "Job Deadline", "Salon / Store Address", "Lamination", "Mounting",
                "Job Start Date", "Job End Date", "Client", "Sub Client", "Account Manager", "Visual Code", "Product Details", "Remarks"],
            renderRow: (row) => (
                <tr key={row.id}>
                    <td>{row.jobNo}</td>
                    <td>
                        {row.date}
                    </td>
                    <td>{row.printerName}</td>
                    <td>{row.region}</td>
                    <td>{row.qty}</td>
                    <td>{row.width}</td>
                    <td>{row.height}</td>
                    <td>{row.totalSqFt}</td>
                    <td>{row.media}</td>
                    <td>{row.implementation}</td>
                    <td>{row.deadline}</td>
                    <td>{row.salonAddress}</td>
                    <td>{row.lamination}</td>
                    <td>{row.mounting}</td>
                    <td>{row.startdate || '-'}</td>
                    <td>{row.enddate || '-'}</td>
                    <td>
                        {row.client}
                    </td>
                    <td>{row.subClient}</td>
                    <td>{row.userName}</td>
                    <td>
                        {row.visualCode}
                    </td>
                    <td>{row.nameSubCode}</td>
                    <td>{row.remarks}</td>                    
                    
                </tr>
            ),
        },
        Delivery: {
            data: deliveryData,
            headers: ["Job No", "Job Date", "Client Name", "Sub Client", "User Name", "Production Location", "Visual Code", "Product Details",
                "City", "Quantity", "Media", "Lamination", "Mounting", "Implementation", "Salon / Store Address",
                "Dispatch Address", "Job Deadline", "Remarks", "Entered By", "Entered Date",
                "Last Update By", "Last Updated By", "Width", "Height", "Total Sq.Ft", "Delivery By", "Delivery Date", "Delivery To"],
            renderRow: (row) => (
                <tr key={row.id}>
                    <td>{row.jobNo}</td>
                    <td>
                        {row.date}
                    </td>
                    <td>
                        {row.client}
                    </td>
                    <td>{row.subClient}</td>
                    <td>{row.userName}</td>
                    <td>{row.region}</td>
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
                    <td>{row.media}</td>
                    <td>{row.lamination}</td>
                    <td>{row.mounting}</td>
                    <td>{row.implementation}</td>
                    <td>{row.salonAddress}</td>
                    <td>{row.dispatchAddress}</td>
                    <td>{row.deadline}</td>
                    <td>{row.remarks}</td>
                    <td>{row.enteredby}</td>
                    <td>{row.entereddt}</td>
                    <td>{row.lstupateby}</td>
                    <td>{row.lstupdatedt}</td>
                    <td>
                        {row.width}
                    </td>
                    <td>
                        {row.height}
                    </td>
                    <td>{row.totalSqFt}</td>
                    <td>{row.deliveryBy || '-'}</td>
                    <td>{row.deliveryDate || '-'}</td>
                    <td>{row.deliveryTo || '-'}</td>
                </tr>
            ),
        },
    };

    const exportToExcel = () => {
        const reportConfig = tableConfigs[newProduction];
        if (!reportConfig || reportConfig.data.length === 0) {
            alert("No data available for export.");
            return;
        }

        // Function to transform headers to data keys
        const headerToKey = (header) => {
            return header
                .split(' ') // Split by spaces for multi-word headers
                .map((word, index) =>
                    index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1) // Make first word lowercase, rest camel case
                )
                .join('');
        };

        // Transform the data to match the headers
        const transformedData = reportConfig.data.map(item => {
            const row = {};
            reportConfig.headers.forEach(header => {
                const key = headerToKey(header); // Dynamically generate the key based on the header
                row[header] = item[key] !== undefined ? item[key] : ''; // Use empty string if the key is not found
            });
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(transformedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        XLSX.writeFile(workbook, "Report.xlsx");
    };

    const exportToCsv = () => {
        const reportConfig = tableConfigs[newProduction];
        if (!reportConfig || reportConfig.data.length === 0) {
            alert("No data available for export.");
            return;
        }

        // Function to transform headers to data keys
        const headerToKey = (header) => {
            return header
                .split(' ') // Split by spaces for multi-word headers
                .map((word, index) =>
                    index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1) // Make first word lowercase, rest camel case
                )
                .join('');
        };

        // Transform the data to match the headers
        const transformedData = reportConfig.data.map(item => {
            const row = {};
            reportConfig.headers.forEach(header => {
                const key = headerToKey(header); // Dynamically generate the key based on the header
                row[header] = item[key] !== null && item[key] !== undefined ? item[key] : ''; // Use empty string if the key is not found
            });
            return row;
        });

        // Generate CSV from transformed data
        const worksheet = XLSX.utils.json_to_sheet(transformedData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "Report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPdf = () => {
        const reportConfig = tableConfigs[newProduction];
        if (!reportConfig || reportConfig.data.length === 0) {
            alert("No data available for export.");
            return;
        }

        // Function to transform headers to data keys
        const headerToKey = (header) => {
            return header
                .split(' ') // Split by spaces for multi-word headers
                .map((word, index) =>
                    index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1) // Make first word lowercase, rest camel case
                )
                .join('');
        };

        // Transform the data to match the headers
        const transformedData = reportConfig.data.map(item => {
            const row = {};
            reportConfig.headers.forEach(header => {
                const key = headerToKey(header); // Dynamically generate the key based on the header
                row[header] = item[key] !== undefined ? item[key] : ''; // Use empty string if the key is not found
            });
            return row;
        });

        const doc = new jsPDF("landscape", "pt", "A2");
        doc.setFontSize(8);
        const title = `Report`;
        doc.text(title, 40, 30);

        const tableRows = transformedData.map(row => reportConfig.headers.map(header => row[header] || "-"));

        doc.autoTable({
            startY: 50,
            head: [reportConfig.headers],
            body: tableRows,
            styles: {
                fontSize: 10,
                overflow: "linebreak",
                cellPadding: 5,
            },
            headStyles: {
                fillColor: [0, 0, 0],
                textColor: [255, 255, 255],
                fontSize: 8,
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240],
            },
            columnStyles: {
                cellWidth: 'auto',
            },
            tableWidth: 'wrap',
            margin: { top: 50 },
        });

        doc.save(`Report.pdf`);
    };

    const renderTable = () => {
        const config = tableConfigs[newProduction];
        if (!config) return null;

        if (config.data.length === 0) {
            return <div>No data available for the selected report type.</div>;
        }

        return (
            <Table striped bordered hover className='tableBody'>
                <thead>
                    <tr>
                        {config.headers.map((header, index) => (
                            <th key={index}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {config.data.map(config.renderRow)}
                </tbody>
            </Table>
        );
    };

    const [jobsFromSql, setJobsFromSql] = useState([]);
    const [user, setUser] = useState('');
    const [locationId, setLocationId] = useState('');
    const [exJobNumber, setExJobNumber] = useState([]);
    const [selectedExJobNumber, setSelectedExJobNumber] = useState('');
    const [productData, setProductData] = useState([]);
    const [showTable, setShowTable] = useState(false);

    const fetchJobs = async () => {
        setLoading(true);
        try {

            const response = await axios.post(config.JobSummary.URL.Getalljob, {
                timeout: 10000,
                username: user,
            });
            console.log("Data fetched successfully: ", response.data);
            setExJobNumber(response.data);

        } catch (error) {
            console.error("Error fetching job data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const users = localStorage.getItem('users');

        if (users) {
            const usersObject = JSON.parse(users);

            const username = usersObject.message && usersObject.message.username;
            setUser(username);

            const locationid = usersObject.message && usersObject.message.location_id;
            const stringlocationid = String(locationid);
            setLocationId(stringlocationid);

            console.log('Username:', username, user, 'Location: ', stringlocationid);
        } else {
            console.log('No user data found in localStorage.');
        }
    }, []);


    const jobNoOptionsFromSql = jobsFromSql.map(job => ({
        value: job.comartjobno,
        label: job.comartjobno,
        clientName: job.client || ''
    }));

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

    const handleExJobNoSelectChange = (selectedOption) => {
        if (selectedOption) {
            console.log(selectedOption); // Log the selected option
            setSelectedExJobNumber(selectedOption.value);
            // Find the customer name based on the selected option
            const selectedJobNo = uniqueJobNoOptions.find(option => option.value === selectedOption.value);

            // setCustomerName(selectedJobNo ? selectedJobNo.label : ''); // Set the customer name
            console.log("Job No :", selectedOption.value);
            console.log("Job No is:", selectedJobNo ? selectedJobNo.label : '');
        } else {
            setSelectedExJobNumber('');
        }
    };

    const fetchProductReportWithJobNo = async (jobNo) => {
        try {
            const url = `${config.Report.URL.GetProductReportWithJobNo}?jobNo=${encodeURIComponent(jobNo)}`
            const res = await axios.post(url);
            console.log(res.data);
            setProductData(res.data);
        } catch (error) {
            console.error('Error fetching Report ', error);
        }
    }
    const handleGoOfProduct = async () => {
        setLoading(true);
        try {
            if (selectedExJobNumber) {
                setProductData([]);
                setShowTable(false);

                await fetchProductReportWithJobNo(selectedExJobNumber);
                setShowTable(true);
            } else {
                alert("Please select a Job No before proceeding.");
            }
        } catch (error) {
            console.error('Error while fetching data ', error);
        }
         finally {
            setLoading(false);
        }
    }
    const exportProductsToExcel = () => {
        const displayedData = productData.map(row => ({
            "Client Product Name": row.media,
            "Width": row.width,
            "Height": row.height,
            "Unit": "2", // Static value as per your table
            "Rate": "", // Static value as per your table
            "Qty": row.qty,
            "HSN Code": "39219099", // Static value as per your table
            "Gj Code": "394", // Static value as per your table
            "Store Location": row.salonAddress,
            "Billing Location": row.billingLocation,
            "Production Location": row.productionLocation,
        }));

        const worksheet = XLSX.utils.json_to_sheet(displayedData); // Convert data to a worksheet
        const workbook = XLSX.utils.book_new(); // Create a new workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1"); // Append the worksheet to the workbook
        XLSX.writeFile(workbook, "ProductsReport.xlsx"); // Save as Excel file
    };
    useEffect(() => {
        fetchJobs();
        GetAllJobsFromSql();
    }, []);

    return (
        <Container style={{ marginLeft: 'auto', marginRight: 'auto', padding: '0 10px', marginTop: '2em' }}>
            <div className="page-wrapper">
                <div className="content container-fluid">
                    {loading && <Spinner animation="border" className="d-block mx-auto" />}
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
                    <Row>
                        <Row>
                            <Col className="d-flex justify-content-end btn-grp">
                                <Button type="submit" className='goBtn me-2' variant="primary" onClick={exportToExcel}>
                                    To Excel
                                </Button>
                                <Button type="submit" className='goBtn me-2' variant="primary" onClick={exportToCsv}>
                                    To CSV
                                </Button>
                                <Button type="submit" className='goBtn' variant="primary" onClick={exportToPdf}>
                                    To PDF
                                </Button>
                            </Col>
                        </Row>
                        <Col xs={3}>
                            <Form.Group controlId="formDate">
                                <div className="position-relative daterange-wraper me-2">
                                    <div className="input-groupicon calender-input">
                                        <Form.Label style={{ width: '200px' }}>Select date</Form.Label>
                                        <DateRangePicker initialSettings={initialSettings}
                                            onApply={handleDateRangeChange}>
                                            <input
                                                className="form-control input-range"
                                                type="text"
                                            />
                                        </DateRangePicker>
                                    </div>
                                    <Calendar className="feather-14" style={{ top: '45px' }} />
                                </div>
                            </Form.Group>
                        </Col>

                        <Col xs={3}>
                            <Form.Group controlId="formLocation">
                                <Form.Label style={{ width: '200px' }}>Location</Form.Label>
                                <Form.Select
                                    value={newLocation}
                                    onChange={handleLocationChange}
                                    required
                                >
                                    <option value="">Select Location</option>
                                    {locations.map((location, index) => (
                                        <option key={index} value={location}>{location}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col xs={3}>
                            <Form.Group controlId="formProduction">
                                <Form.Label style={{ width: '200px' }}>Report Type</Form.Label>
                                <Form.Select
                                    value={newProduction}
                                    onChange={handleProductionChange}
                                    required
                                >
                                    <option value="">Select Production</option>
                                    {productions.map((production, index) => (
                                        <option key={index} value={production}>{production}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col xs={3} className="d-flex align-items-center justify-content-start">
                            <Button type="submit" className='goBtn mt-4' variant="primary" onClick={handleGoReport}>
                                Go
                            </Button>
                        </Col>

                    </Row>

                    {loading && <Spinner animation="border" />}
                    {error && <Alert variant="danger">{error}</Alert>}

                    <div style={{ marginTop: "4em", marginLeft: "-170px", overflow: "auto", width: '84rem'}}>
                        {renderTable()}
                    </div>

                </div>

                <div className="content container-fluid mt-4 mb-4">
                    {error && <Alert variant="danger">{error}</Alert>}
                    {loading && <Spinner animation="border" className="d-block mx-auto" />}
                    <Row>
                        <Row>
                            <Col className="d-flex justify-content-end btn-grp">
                                <Button type="submit" className='goBtn me-2' variant="primary" onClick={exportProductsToExcel}>
                                    To Excel
                                </Button>
                            </Col>
                        </Row>
                        <Row className='mb-3'>
                            <Col xs={5}>
                                <Form.Group style={{ position: 'relative', zIndex: 999 }}>
                                    <Form.Label>Job No</Form.Label>
                                    <Select
                                        options={uniqueJobNoOptions}
                                        value={uniqueJobNoOptions.find(option => option.value === selectedExJobNumber) || null} // Bind the selected value
                                        onChange={handleExJobNoSelectChange}
                                        placeholder="Select Job No"
                                    />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Button style={{marginTop: "29px"}} onClick={handleGoOfProduct}>Go</Button>
                            </Col>
                        </Row>
                    </Row>

                    {loading && <Spinner animation="border" />}
                    {error && <Alert variant="danger">{error}</Alert>}

                    {showTable && (
                        <div style={{ marginTop: "4em", marginLeft: "-170px", overflow: "auto", width: '84rem' }}>
                            <Table striped bordered hover>
                                <thead className='sticky-header'>
                                    <tr>
                                        <th>Client Product Name</th>
                                        <th>Width</th>
                                        <th>Height</th>
                                        <th>Unit</th>
                                        <th>Rate</th>
                                        <th>Qty</th>
                                        <th>HSN Code</th>
                                        <th>Gj Code</th>
                                        <th>Store Location</th>
                                        <th>Billing Location</th>
                                        <th>Production Location</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productData.length > 0 ? (
                                        productData.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.media}</td>
                                                <td>{row.width}</td>
                                                <td>{row.height}</td>
                                                <td>2</td>
                                                <td></td>
                                                <td>{row.qty}</td>
                                                <td>39219099</td>
                                                <td>394</td>
                                                <td>{row.salonAddress}</td>
                                                <td>{row.billingLocation}</td>
                                                <td>{row.productionLocation}</td>
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

                    )}

                    
                </div>
            </div>
        </Container>
    );
};

export default MisReport;
