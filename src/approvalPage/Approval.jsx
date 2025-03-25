import React, { useState, useEffect } from "react";
import { Table, Form, Row, Col, Button, Modal, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import 'react-toastify/dist/ReactToastify.css'; 
import { useLocation } from "react-router-dom";
import config from "../config";
import { toast } from "react-toastify";

const Approval = () => {
    const [approvalData, setApprovalData] = useState([]);
    const [selectedRows, setSelectedRows] = useState({});
    const [selectedImage, setSelectedImage] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true); // State for loading spinner
    const [error, setError] = useState(null); // To handle any fetch errors

    // Get the query string from the URL
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const approvalCode = queryParams.get("code"); // Extract the "code" query parameter

    // Fetch data when the component is mounted
    useEffect(() => {
        const fetchApprovalData = async () => {
            if (!approvalCode) {
                setError("No approval code found in URL.");
                setLoading(false);
                return;
            }

            try {
                // Pass the approvalCode to the API endpoint
                const response = await axios.get(`${config.Approval.URL.getApprovalRequest}?code=${approvalCode}`);

                console.log("approval api response:", response.data);
                setApprovalData(response.data); // Assuming the response data is an array of approval objects
            } catch (error) {
                setError("Failed to fetch approval data.");
                console.error("Error fetching approval data:", error);  
            } finally {
                setLoading(false); // Hide loading spinner when data is fetched
            }
        };

        fetchApprovalData();
    }, [approvalCode]); // Dependency on approvalCode

    const handleCheckboxChange = (id) => {
        setSelectedRows((prev) => {
            const newSelection = { ...prev, [id]: !prev[id] };
            return newSelection;
        });
    };

    const handleSelectAllChange = (e) => {
        const isChecked = e.target.checked;
        const newSelectedRows = {};
        approvalData.forEach(row => {
            if (!row.isCompleted) {
                newSelectedRows[row.id] = isChecked;
            }
        });
        setSelectedRows(newSelectedRows);
    };

    const handleShow = () => {
        setShowModal(true);
        setSelectedImage(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setSelectedImage(null);
    };


    const handleApprove = async () => {
        // Get selected rows for approval
        const approvedItems = Object.keys(selectedRows).filter(id => selectedRows[id]);
        
        if (approvedItems.length === 0) {
            toast.error("Please select at least one item to approve.");
            return;
        }

        setLoading(true);
        try {
            // Send the approval request to the backend API
            const response = await axios.post(`${config.Approval.URL.approveApprovalRequest}`, {
                approvalCode,
                approvedItems
            });

            // Handle success
            if (response.status === 200) {
                toast.success("Approval sent successfully to the customer!");
                // You can also refresh the data or update UI if necessary
            }
        } catch (error) {
            setError("Failed to send approval.");
            toast.error("Error while sending approval.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <div className="card">
                            <div className="card-body">
                                <h1 className="display-4 text-center mb-4">Approval</h1>
                                <Row className="d-flex">
                                    <Col className="ml-auto">
                                    <Button
                                            style={{ float: "right", marginBottom: "12px" }}
                                            disabled={loading}
                                            onClick={handleApprove} // Add this click handler for approval
                                        >
                                            {loading ? <Spinner animation="border" size="sm" /> : "Approve"}
                                        </Button>
                                    </Col>
                                </Row>
                                
                                {/* Handle errors */}
                                {error && <Alert variant="danger">{error}</Alert>}

                                <div style={{ overflowX: 'auto' }} className="table-container">
                                    <Table striped bordered hover>
                                        <thead className="sticky-header">
                                            <tr>
                                                <th>Job No</th>
                                                <th>Visual Code </th>
                                                <th>CS Name</th>
                                                <th>Media</th>
                                                <th>Sq Ft.</th>
                                                <th>Sample Image</th>
                                                <th>Comment</th>
                                                <th>
                                                    <Row>
                                                        <Col>
                                                            <Form.Check
                                                                type="checkbox"
                                                                onChange={handleSelectAllChange}
                                                                checked={approvalData.length > 0 && approvalData.every(row => selectedRows[row.id])}
                                                            />
                                                        </Col>
                                                        <Col>Approval Yes/No</Col>
                                                    </Row>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {approvalData.length > 0 ? (
                                                approvalData.map((row) => {
                                                    return row.lineItems.map((lineItem, index) => (
                                                        <tr key={`${row.id}-${index}`}>
                                                            <td>{lineItem.jobNo}</td>
                                                            <td>{lineItem.visualCode}</td> {/* Visual Code from lineItems */}
                                                            <td>{row.CSName}</td>
                                                            <td>{row.imageUrl}</td>
                                                            <td>{row.SqFt}</td>
                                                            <td>
                                                            {/* Displaying sample image in a small size */}
                                                            <img 
                                                                style={{ width: "100px", height: "100px" }} 
                                                                src={lineItem.imageUrl} // Image URL from lineItem
                                                                alt={`${lineItem.jobNo} sample image`} 
                                                                onClick={handleShow}
                                                            />
                                                        </td>
                                                            <Modal key={row.id} show={showModal} onHide={handleClose} size="lg" centered>
                                                                <Modal.Header closeButton>
                                                                    <Modal.Title>Job No: {row.JobNo}</Modal.Title>
                                                                </Modal.Header>
                                                                <Modal.Body>
                                                                    {selectedImage && (
                                                                        <img
                                                                            style={{ width: '100%', height: 'auto' }}
                                                                            src={row.SampleImg}
                                                                            alt={`${row.JobNo} full-size image`}
                                                                        />
                                                                    )}
                                                                </Modal.Body>
                                                            </Modal>
                                                            <td>
                                                                <Form.Control
                                                                    as="textarea"
                                                                    rows="4"
                                                                    cols="30"
                                                                    style={{ borderRadius: "5px", padding: "4px", resize: "vertical" }}
                                                                    placeholder="Drop your comments here"
                                                                />
                                                            </td>
                                                            <td>
                                                                <Row>
                                                                    <Col>
                                                                        <Form.Check
                                                                            key={row.id}
                                                                            type="checkbox"
                                                                            checked={!!selectedRows[row.id]}
                                                                            onChange={() => handleCheckboxChange(row.id)}
                                                                            disabled={row.isCompleted}
                                                                        />
                                                                    </Col>
                                                                    <Col>{selectedRows[row.id] ? "Yes" : "No"}</Col>
                                                                </Row>
                                                            </td>
                                                        </tr>
                                                    ));
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="8" className="text-center">No data available</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Approval;