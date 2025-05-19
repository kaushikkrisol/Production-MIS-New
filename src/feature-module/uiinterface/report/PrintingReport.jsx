import React, { useEffect, useState } from 'react';
import "bootstrap-daterangepicker/daterangepicker.css";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import axios from 'axios';
import { Container, Form, Row, Col, Spinner, Button, Table } from 'react-bootstrap';
import config from '../../../config';
import './MisReport.css';
import * as XLSX from "xlsx";
import "jspdf-autotable";
import Select from 'react-select';

const PrintingReport = () => {
    const [loading, setLoading] = useState(false);
    
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
                {/* <div className="content container-fluid">
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
                </div> */}

                <div className="content container-fluid mt-4 mb-4">
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

export default PrintingReport;
