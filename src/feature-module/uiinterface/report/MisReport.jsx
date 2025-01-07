import React, { useState } from 'react';
import DateRangePicker from "react-bootstrap-daterangepicker";
import { Calendar } from "feather-icons-react/build/IconComponents";
import "bootstrap-daterangepicker/daterangepicker.css";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import axios from 'axios';
import { Container, Form, Row, Col, Alert, Spinner, Button, Table } from 'react-bootstrap';
import moment from 'moment';
import config from '../../../config';
import './MisReport.css';
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const MisReport = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [newLocation, setNewLocation] = useState('');
    const [newProduction, setNewProduction] = useState('');
    const productions = ["CS", "Design", "Printing", "Delivery", "All"];
    const locations = ["North", "South", "East", "West", "All"];
    const [data, setData] = useState([]);
    const [csData, setCsData] = useState([]);
    const [designData, setDesignData] = useState([]);
    const [printingData, setPrintingData] = useState([]);
    const [deliveryData, setDeliveryData] = useState([]);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [enteredDt, setEnteredDt] = useState(null);

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
            console.error("Error in handleGoReport:", error, fetchData);
        }
    };

    const fetchData = async (reporttype) => {
        setLoading(true);
        
        try {
            let response;
            
            if (reporttype === 'CS') {
                response = await axios.post(config.JobSummary.URL.Getalljob);
                setCsData(response.data);
            } else if (reporttype === 'Design') {
                response = await axios.post(config.Design.URL.Getalldesign);
                setDesignData(response.data);
            } else if (reporttype === 'Printing') {
                response = await axios.post(config.Printing.URL.Getallprinting);
                setPrintingData(response.data);
            } else if (reporttype === 'Delivery') {
                response = await axios.post(config.Delivery.URL.Getalldelivery);
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
            entereddt: enteredDt,
            reporttype: newProduction,
            location: newLocation,
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
            setError("Error fetching data");
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
                "Job No", "Date", "Client", "Sub Client", "User Name", "Region", "Visual Code", "Name Sub Code",
                "City", "Qty", "Media", "Implementation", "Deadline", "Lamination", "Mounting",
                "Salon Address", "Dispatch Address", "Remarks", "Actual Complete Time",
                "On-Time/Delayed", "Width", "Height", "Total SqFt"
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
                    <td>{row.actCompleteTime}</td>
                    <td>{row.onTimeDelayed}</td>
                    <td>{row.width}</td>
                    <td>{row.height}</td>
                    <td>{row.totalSqFt}</td>
                </tr>
            ),
        },
        Design: {
            data: designData,
            headers: ["Job No", "Client Name", "No Of Jobs", "Brief", "Location", "Status",
                "Query", "Month", "Week", "Received Date", "Due Date", "Upload Date",
                "Width", "Height", "Start Job", "Stop Job"],
            renderRow: (row) => (
                <tr key={row.id}>
                    <td>{row.jobNo}</td>
                    <td>{row.designClientName}</td>
                    <td>{row.designNoOfJobs}</td>
                    <td>{row.designBrief}</td>
                    <td>{row.designLocation}</td>
                    <td>{row.designStatus}</td>
                    <td>{row.designQuery}</td>
                    <td>{row.designMonth}</td>
                    <td>{row.designWeek}</td>
                    <td>{row.designReceivedDate}</td>
                    <td>{row.designDueDate}</td>
                    <td>{row.designUploadDate}</td>
                    <td>{row.designWidth}</td>
                    <td>{row.designHeight}</td>
                    <td>{row.startdate || '-'}</td>
                    <td>{row.enddate || '-'}</td>
                </tr>
            ),
        },
        Printing: {
            data: printingData,
            headers: ["Job No", "Date", "Client Name", "Sub Client", "User Name", "Location", "Visual Code", "Name Sub Code",
                "City", "Quantity", "Media", "Installation", "Deadline", "Lamination", "Mounting", "Salon Address",
                "Dispatch Address", "Deadline", "Remarks", "Actual Complete Time", "On Time Delayed", "Entered By", "Entered Date",
                "Last Update By", "Last Updated By", "IP Address", "Width", "Height", "Total Sq Ft", "Start Job", "Stop Job"],
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
                    <td>{row.installation}</td>
                    <td>{row.deadline}</td>
                    <td>
                        {row.visualCode}
                    </td>
                    <td>{row.nameSubCode}</td>
                    <td>
                        {row.city}
                    </td>
                    <td>{row.qty}</td>
                    <td>{row.media}</td>
                    <td>{row.lamination}</td>
                    <td>{row.mounting}</td>
                    {/* <td>{row.implementation}</td> */}
                    <td>{row.salonAddress}</td>
                    <td>{row.dispatchAddress}</td>
                    <td>{row.remarks}</td>
                    <td>{row.actCompleteTime}</td>
                    <td>{row.onTimeDelayed}</td>
                    <td>{row.enteredby}</td>
                    <td>{row.entereddt}</td>
                    <td>{row.lstupateby}</td>
                    <td>{row.lstupdatedt}</td>
                    <td>{row.ipaddress}</td>
                    <td>{row.width}</td>
                    <td>{row.height}</td>
                    <td>{row.totalSqFt}</td>
                    <td>{row.startdate || '-'}</td>
                    <td>{row.enddate || '-'}</td>
                </tr>
            ),
        },
        Delivery: {
            data: deliveryData,
            headers: ["Job No", "Date", "Client Name", "Sub Client", "User Name", "Location", "Visual Code", "Name Sub Code",
                "City", "Quantity", "Media", "Lamination", "Mounting", "Implementation", "Salon Address",
                "Dispatch Address", "Deadline", "Remarks", "Actual Complete Time", "On Time Delayed", "Entered By", "Entered Date",
                "Last Update By", "Last Updated By", "Width", "Height", "Total Sq Ft", "Delivery By", "Delivery Date", "Delivery To"],
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
                    <td>{row.actCompleteTime}</td>
                    <td>{row.onTimeDelayed}</td>
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
        const worksheet = XLSX.utils.json_to_sheet(data); // Convert data to a worksheet
        const workbook = XLSX.utils.book_new(); // Create a new workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1"); // Append the worksheet to the workbook
        XLSX.writeFile(workbook, "Report.xlsx"); // Save as Excel file
    };

    // Function to export to CSV
    const exportToCsv = () => {
        const worksheet = XLSX.utils.json_to_sheet(data); // Convert data to a worksheet
        const csv = XLSX.utils.sheet_to_csv(worksheet); // Convert the worksheet to CSV
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "Report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Function to export to PDF
    const exportToPdf = () => {
        console.log("Available report types:", Object.keys(tableConfigs));

        const reportConfig = tableConfigs[newProduction];

        if (!reportConfig) {
            alert(`No data found for the report type`);
            return;
        }

        const { data, headers } = reportConfig; // Now it's safe to destructure

        if (!data || data.length === 0) {
            alert("No data available to export.");
            return;
        }

        const unit = "pt";
        const size = "A2"; // A1, A2, A3, or A4
        const orientation = "landscape"; // portrait or landscape

        const doc = new jsPDF(orientation, unit, size);
        doc.setFontSize(8);

        // Add title
        const title = `Report`;
        doc.text(title, 40, 30);

        // Prepare rows for the table
        const tableRows = data.map((row) => headers.map((header) => row[header.toLowerCase()] || "-"));

        // Configure and add the table
        doc.autoTable({
            startY: 50,
            head: [headers],
            body: tableRows,
            styles: {
                fontSize: 10, // Smaller font for better readability
                overflow: "linebreak", // Handle text overflow
                cellPadding: 5,
            },
            headStyles: {
                fillColor: [0, 0, 0], // Blue header
                textColor: [255, 255, 255], // White text
                fontSize: 8,
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240], // Light gray for alternating rows
            },
            columnStyles: {
                cellWidth: 'auto',
            },
            tableWidth: 'wrap',
            margin: { top: 50 },
        });

        // Save the PDF
        doc.save(`Report.pdf`);
    };

    const renderTable = () => {
        const config = tableConfigs[newProduction];
        if (!config) return null;

        if (config.data.length === 0) {
            return <div>No data available for the selected report type.</div>;
        }

        return (
            <Table striped bordered hover>
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


    return (
        <Container style={{ marginLeft: 'auto', marginRight: 'auto', padding: '0 10px' }}>
            <div className="page-wrapper">
                <div className="content container-fluid">
                    {error && <Alert variant="danger">{error}</Alert>}
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
                            <Button type="submit" className='goBtn' variant="primary" onClick={handleGoReport}>
                                Go
                            </Button>
                        </Col>

                    </Row>

                    {loading && <Spinner animation="border" />}
                    {error && <Alert variant="danger">{error}</Alert>}

                    <div style={{ marginTop: "30px", marginLeft: "-170px", overflow: "auto", width: '84rem'}}>
                        {renderTable()}
                    </div>

                </div>
            </div>
        </Container>
    );
};

export default MisReport;
