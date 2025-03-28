import React, { useState, useEffect } from "react";
import { Table, Form, Row, Col, Button, Modal, Spinner, Alert } from "react-bootstrap";
// import { Table, Form, Row, Col, Modal, Alert } from "react-bootstrap";
import axios from "axios";
import 'react-toastify/dist/ReactToastify.css'; 
import { useLocation } from "react-router-dom";
import config from "../config";
import { toast, ToastContainer } from "react-toastify";

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
    const approvalCode = queryParams.get("code");

    const fetchApprovalData = async () => {
        if (!approvalCode) {
            setError("No approval code found in URL.");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get(`${config.Approval.URL.getApprovalRequest}?code=${approvalCode}`);
            setApprovalData(response.data);
        } catch (error) {
            setError("Failed to fetch approval data.");
            console.error("Error fetching approval data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovalData();
    }, []);

    const handleCheckboxChange = (designid) => {
        setSelectedRows((prev) => {
            const newSelection = { ...prev, [designid]: !prev[designid] };
            return newSelection;
        });
    };

    const handleSelectAllChange = (e) => {
        const isChecked = e.target.checked;
        const newSelectedRows = {};
        approvalData.forEach(row => {
            if (!row.isCompleted) {
                row.lineItems.forEach(lineItem => {
                    newSelectedRows[lineItem.designid] = isChecked;
                })
            }
        });
        setSelectedRows(newSelectedRows);
    };

    const handleShow = (lineItem) => {
        setShowModal(true);
        setSelectedImage(lineItem);
    };

    const handleClose = () => {
        setShowModal(false);
        setSelectedImage(null);
    };


    const handleApprove = async () => {
        const approvedItems = Object.keys(selectedRows).filter(designid => selectedRows[designid]);
        
        if (approvedItems.length === 0) {
            toast.error("Please select at least one item to approve.");
            return;
        }

        const selectedLineItemIds = [];

        approvalData.forEach(row => {
            row.lineItems.forEach(lineItem => {
                if (approvedItems.includes(lineItem.designid)) {
                    selectedLineItemIds.push(lineItem.id);
                }
            });
        });

        setLoading(true);
        try {
            // Send the approval request to the backend API
            const response = await axios.post(`${config.Approval.URL.ApproveLineItems}`, {
                approvalCode,
                approvedItems,
                id: selectedLineItemIds
            });

            // Handle success
            if (response.status === 200) {
                toast.success("Approval sent successfully to the customer!");
                await fetchApprovalData();
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
                                            onClick={handleApprove}
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
                                                                checked={approvalData.length > 0 && approvalData.every(row => 
                                                                row.lineItems.every(lineItem => selectedRows[lineItem.designid]))}
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
                                                            <td>{lineItem.visualCode}</td>
                                                            <td>{lineItem.csName}</td>
                                                            <td>{lineItem.media}</td>
                                                            <td>{lineItem.totalSqFt}</td>
                                                            <td>
                                                            <img 
                                                                style={{ width: "100px", height: "100px" }} 
                                                                src={lineItem.imageUrl} // Image URL from lineItem
                                                                alt={`${lineItem.jobNo} sample image`} 
                                                                onClick={() => handleShow(lineItem)}
                                                            />
                                                        </td>
                                                            <Modal key={row.id} show={showModal} onHide={handleClose} size="lg" centered>
                                                                <Modal.Header closeButton>
                                                                    <Modal.Title>Job No: {selectedImage ? selectedImage.jobNo : ''}</Modal.Title>
                                                                </Modal.Header>
                                                                <Modal.Body>
                                                                    {selectedImage && (
                                                                        <img
                                                                            style={{ width: '100%', height: 'auto' }}
                                                                            src={selectedImage.SampleImg}
                                                                            alt={`${selectedImage.JobNo} full-size image`}
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
                                                                            checked={!!selectedRows[lineItem.designid]}
                                                                            onChange={() => handleCheckboxChange(lineItem.designid)}
                                                                            disabled={row.isCompleted}
                                                                        />
                                                                    </Col>
                                                                    <Col>{selectedRows[lineItem.designid] ? "Yes" : "No"}</Col>
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
                            <div><ToastContainer /></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Approval;