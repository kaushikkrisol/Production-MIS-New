    import React, { useEffect, useState } from 'react';
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
    import Select from 'react-select';
    import { label } from 'yet-another-react-lightbox';

    const MisReport = () => {
        const [error, setError] = useState(null);
        const [loading, setLoading] = useState(false);
        const [newLocation, setNewLocation] = useState('');
        const [newProduction, setNewProduction] = useState('');
        const productions = ["CS", "Design", "Printing", "Delivery", "Reprint"];
        const locations = ["North", "South", "East", "West"];
        const [dateRangeDisplay, setDateRangeDisplay] = useState('');

        const [data, setData] = useState([]);
        const [csData, setCsData] = useState([]);
        const [designData, setDesignData] = useState([]);
        const [printingData, setPrintingData] = useState([]);
        const [reprintData, setReprintData] = useState([]);
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
                } else if (reporttype === 'Reprint') {
                    response = await axios.post(config.Printing.URL.GetCompletedPrinting);
                    const filteredData = response.data.filter(row => row.isPrintingdone === 1);
                    setReprintData(filteredData);  // ✅ Correct state assignment
                }
                else {
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
                        case "Reprint":
                            setReprintData(response.data.filter(row => row.isPrintingdone === 1));
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
                const from = moment(picker.startDate).format('DD-MM-YYYY');
                const to = moment(picker.endDate).format('DD-MM-YYYY');

                setFromDate(from);
                setToDate(to);
                setDateRangeDisplay(`${from} - ${to}`);
                };


        // Date Range Picker settings
        const initialSettings = {
            endDate: new Date(),
            startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
            timePicker: false,
            ranges: {
                "Today": [new Date(), new Date()],
                "Yesterday": [new Date(new Date().setDate(new Date().getDate() - 1)), new Date()],              
                "Last 7 Days": [new Date(new Date().setDate(new Date().getDate() - 6)), new Date()],
                "Last 30 Days": [new Date(new Date().setDate(new Date().getDate() - 30)), new Date()],
                "This Month": [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)],
                "Last Month": [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), new Date(new Date().getFullYear(), new Date().getMonth(), 0)],
            },
        };

        const tableConfigs = {
            CS: {
                headers: [
                    { label: "Job No", key: "jobNo" },
                    { label: "Job Date", key: "date" },
                    { label: "Sub Client", key: "subClient" },
                    {label:"Billing Location",key:"billingLocation"},
                    { label: "Production Location", key: "region" },
                    { label: "Visual Code", key: "visualCode" },
                    { label: "Product Details", key: "nameSubCode" },
                    { label: "Qty", key: "qty" },
                    { label: "Width", key: "width" },
                    { label: "Height", key: "height" },
                    { label: "Total Sq.Ft", key: "totalSqFt" },
                    { label: "Media", key: "media" },
                    { label: "Lamination", key: "lamination" },
                    { label: "Mounting", key: "mounting" },
                    { label: "Implementation", key: "implementation" },
                    { label: "Salon / Store Address", key: "salonAddress" },
                    { label: "City", key: "city" },
                    {label:"Print Ready File",key:"printReadyAvailable"},
                    {label:"Designer Name",key:"designerName"},
                    {label:"Designer Deadline",key:"designerDeadline"},
                    {label:"Printing Machine",key:"machineName"},
                    {label:"Printer Deadline",key:"printerDeadline"},                
                    { label: "Client", key: "client" },
                    { label: "User Name", key: "userName" },                  
                    { label: "Job Deadline", key: "deadline" },
                    { label: "Dispatch Address", key: "dispatchAddress" },
                    { label: "Remarks / Instructions", key: "remarks" },
                  
                ]
            },
            Design: {
                headers: [
                    { label: "Job No", key: "jobNo" },
                    { label: "Job Date", key: "date" },
                    { label: "Sub Client", key: "subClient" },
                    { label: "Billing Location", key: "billingLocation" },
                    { label: "Production Location", key: "region" },
                    { label: "Visual Code", key: "visualCode" },
                    { label: "Product Details", key: "nameSubCode" },
                    { label: "Qty", key: "qty" },
                    { label: "Width", key: "width" },
                    { label: "Height", key: "height" },
                    { label: "Total Sq.Ft", key: "totalSqFt" },
                    { label: "Media", key: "media" },
                    { label: "Lamination", key: "lamination" },
                    { label: "Mounting", key: "mounting" },
                    { label: "Implementation", key: "implementation" },
                    { label: "Salon / Store Address", key: "salonAddress" },
                    { label: "City", key: "city" },
                    { label: "Print Ready File", key: "printReadyAvailable" },
                    { label: "Designer Name", key: "designerName" },
                    { label: "Designer Deadline", key: "designerDeadline" },
                    { label: "Printing Machine", key: "machineName" },
                    { label: "Printer Deadline", key: "printerDeadline" },
                    { label: "Client", key: "client" },
                    { label: "User Name", key: "userName" },
                    { label: "Job Deadline", key: "deadline" },
                    { label: "Dispatch Address", key: "dispatchAddress" },
                    { label: "Remarks / Instructions", key: "remarks" },
                    { label: "No Of Artworker", key: "noOfArtworker" },
                    { label: "Brief", key: "designBrief" },
                    { label: "Query", key: "designQuery" },
                    { label: "Design Type", key: "designType" },
                    { label: "CS Name", key: "Entrdby" },
                    { label: "Artworker Deadline", key: "artworkerDeadline" },
                    { label: "Start Time", key: "startdate" },
                    { label: "End Time", key: "enddate" }
                ]
            },
            Printing: {
                headers: [
                    { label: "Job No", key: "jobNo" },
                    { label: "Job Date", key: "date" },
                    { label: "Sub Client", key: "subClient" },
                    { label: "Billing Location", key: "billingLocation" },
                    { label: "Production Location", key: "region" },
                    { label: "Visual Code", key: "visualCode" },
                    { label: "Product Details", key: "nameSubCode" },
                    { label: "Qty", key: "qty" },
                    { label: "Width", key: "width" },
                    { label: "Height", key: "height" },
                    { label: "Total Sq.Ft", key: "totalSqFt" },
                    { label: "Media", key: "media" },
                    { label: "Lamination", key: "lamination" },
                    { label: "Mounting", key: "mounting" },
                    { label: "Implementation", key: "implementation" },
                    { label: "Salon / Store Address", key: "salonAddress" },
                    { label: "City", key: "city" },
                    { label: "Print Ready File", key: "printReadyAvailable" },
                    { label: "Designer Name", key: "designerName" },
                    { label: "Designer Deadline", key: "designerDeadline" },
                    { label: "Printing Machine", key: "printerName" },
                    { label: "Printer Deadline", key: "printerDeadline" },
                    { label: "Client", key: "client" },
                    { label: "User Name", key: "userName" },
                    { label: "Job Deadline", key: "deadline" },
                    { label: "Dispatch Address", key: "dispatchAddress" },
                    { label: "Remarks / Instructions", key: "remarks" },             
                    { label: "Job Start Date", key: "startdate" },
                    { label: "Job End Date", key: "enddate" },
                    { label: "Account Manager", key: "userName" } 
                  ]
                
            },
            Delivery: {
                headers: [
                    { label: "Job No", key: "jobNo" },
                    { label: "Job Date", key: "date" },
                    { label: "Client", key: "client" },
                    { label: "Sub Client", key: "subClient" },
                    { label: "User Name", key: "userName" },
                    { label: "Production Location", key: "region" },
                    { label: "Visual Code", key: "visualCode" },
                    { label: "Product Details", key: "nameSubCode" },
                    { label: "City", key: "city" },
                    { label: "Qty", key: "qty" },
                    { label: "Media", key: "media" },
                    { label: "Lamination", key: "lamination" },
                    { label: "Mounting", key: "mounting" },
                    { label: "Implementation", key: "implementation" },
                    { label: "Salon / Store Address", key: "salonAddress" },
                    { label: "Dispatch Address", key: "dispatchAddress" },
                    { label: "Job Deadline", key: "deadline" },
                    { label: "Remarks / Instructions", key: "remarks" },
                    { label: "Entered By", key: "enteredby" },
                    { label: "Entered Date", key: "entereddt" },
                    { label: "Last Update By", key: "lstupateby" },
                    { label: "Last Updated By", key: "lstupdatedt" },
                    { label: "Width", key: "width" },
                    { label: "Height", key: "height" },
                    { label: "Total Sq.Ft", key: "totalSqFt" },
                    { label: "Delivery By", key: "deliveryBy" },
                    { label: "Delivery Date", key: "deliveryDate" },    
                    { label: "Delivery To", key: "deliveryTo" }
                ]
            },
            Reprint: {
                headers: [
                    { label: "Job No", key: "jobNo" },
                    { label: "Client", key: "client" },
                    { label: "Sub Client", key: "subClient" },
                    { label: "User Name", key: "userName" },
                    { label: "Visual Code", key: "visualCode" },
                    { label: "Product Details", key: "nameSubCode" },
                    { label: "City", key: "city" },
                    { label: "Qty", key: "qty" },
                    { label: "Media", key: "media" },
                    { label: "Implementation", key: "implementation" },
                    { label: "Job Deadline", key: "deadline" },
                    { label: "Salon / Store Address", key: "salonAddress" },
                    { label: "Dispatch Address", key: "dispatchAddress" },
                    { label: "Remarks / Instructions", key: "remarks" },
                    { label: "Width", key: "width" },
                    { label: "Height", key: "height" },
                    { label: "Total Sq.Ft", key: "totalSqFt" },
                    { label: "Printing Done", key: "isPrintingdone" }
                ]
            }

        };

        const exportToExcel = () => {
            const reportConfig = tableConfigs[newProduction];
            if (!reportConfig) {
                alert("Invalid report type selected.");
                return;
            }

            let reportData = [];
            switch (newProduction) {
                case "CS":
                    reportData = csData;
                    break;
                case "Design":
                    reportData = designData;
                    break;
                case "Printing":
                    reportData = printingData;
                    break;
                case "Delivery":
                    reportData = deliveryData;
                    break;
                case "Reprint":
                    reportData=reprintData;
                    break;
                default:
                    reportData = [];
            }

            if (!Array.isArray(reportData) || reportData.length === 0) {
                alert("No data available for export.");
                return;
            }

            const headers = reportConfig.headers;

            const transformedData = reportData.map(item => {
                const row = {};
                headers.forEach(({ label, key }) => {
                    if (key === "date") {
                      row[label] = getFormattedDate(item);
                    } else {
                      row[label] = item[key] ?? '';
                    }
                  });
                return row;
            });

            // Let json_to_sheet create header row automatically
            const worksheet = XLSX.utils.json_to_sheet(transformedData);
            worksheet['!cols'] = headers.map(() => ({ wch: 20 }));

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
            // const headerToKey = (header) => {
            //     return header
            //         .split(' ') // Split by spaces for multi-word headers
            //         .map((word, index) =>
            //             index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1) // Make first word lowercase, rest camel case
            //         )
            //         .join('');
            // };

            // Transform the data to match the headers
            const transformedData = reportConfig.data.map(item => {
                const row = {};

                // Iterate through each header to match it to data keys
                reportConfig.headers.forEach(header => {
                    const headerWords = header.toLowerCase().split(/\s+/); // split header into words

                    // Find the first key in item that includes any word from the header
                    const matchedKey = Object.keys(item).find(field =>
                        headerWords.some(word => field.toLowerCase().includes(word))
                    );

                    row[header] = matchedKey ? item[matchedKey] : '';
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
            // const headerToKey = (header) => {
            //     return header
            //         .split(' ') // Split by spaces for multi-word headers
            //         .map((word, index) =>
            //             index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1) // Make first word lowercase, rest camel case
            //         )
            //         .join('');
            // };

            // Transform the data to match the headers
            const transformedData = reportConfig.data.map(item => {
                const row = {};

                // Iterate through each header to match it to data keys
                reportConfig.headers.forEach(header => {
                    const headerWords = header.toLowerCase().split(/\s+/); // split header into words

                    // Find the first key in item that includes any word from the header
                    const matchedKey = Object.keys(item).find(field =>
                        headerWords.some(word => field.toLowerCase().includes(word))
                    );

                    row[header] = matchedKey ? item[matchedKey] : '';
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

            // Inject data based on selected production type
            let reportData = [];
            switch (newProduction) {
                case "CS":
                    reportData = csData;
                    break;
                case "Design":
                    reportData = designData;
                    break;
                case "Printing":
                    reportData = printingData;
                    break;
                case "Delivery":
                    reportData = deliveryData;
                    break;
                case "Reprint":
                    reportData = reprintData;
                    break;
                default:
                    reportData = [];
            }

            if (!Array.isArray(reportData) || reportData.length === 0) {
                return <div>No data available for the selected report type.</div>;
            }

            return (
                <Table striped bordered hover className='tableBody'>
                    <thead>
                        <tr>
                            {config.headers.map((header, index) => (
                                <th key={index}>{header.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {config.headers.map((header, colIndex) => (
                                    <td key={colIndex}>
                                        {header.key === 'date' ? getFormattedDate(row) : (row[header.key] ?? "-")}
                                    </td>
                                ))}
                            </tr>
                        ))}
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
        const getFormattedDate = (item) => {
            if (item?.date) {
              return moment(item.date).isValid() ? moment(item.date).format("DD/MMM/YYYY") : "-";
            } else if (item?.entereddt) {
              return moment(item.entereddt).isValid() ? moment(item.entereddt).format("DD/MMM/YYYY") : "-";
            } else {
              return "-";
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
  value={dateRangeDisplay}
  readOnly
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

                        <div style={{ marginTop: "4em", marginLeft: "-170px", overflow: "auto", width: '84rem' }}>
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
                                    <Button style={{ marginTop: "29px" }} onClick={handleGoOfProduct}>Go</Button>
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
