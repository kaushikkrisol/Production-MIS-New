import React, {useState} from "react";
import {  Table, Form, Row, Col, Button, Modal } from "react-bootstrap";
import { FaTrash } from "react-icons/fa";
import 'react-toastify/dist/ReactToastify.css'; 
import {  toast } from 'react-toastify';


const Approval = () => {
    const approvalData = [
        { id: "123", JobNo: "J0625032017", CSName: "Shailendra", Media: "Canvas", SqFt: 78, SampleImg: "https://picsum.photos/200/300?random=1", Comment: "", Approval: ""},
        { id: "1234", JobNo: "J0625032018", CSName: "Ganesh", Media: "Hi-star self adhesive vinyl", SqFt: 32, SampleImg: "https://picsum.photos/200/300?random=2", Comment: "", Approval: "" },    
        { id: "1236", JobNo: "J0625032019", CSName: "Shailendra", Media: "Sanfa backlit fabric", SqFt: 98, SampleImg: "https://picsum.photos/200/300?random=3", Comment: "", Approval: "" },    
        { id: "1237", JobNo: "J0625032020", CSName: "Shailendra", Media: "Canvas", SqFt: 23, SampleImg: "https://picsum.photos/200/300?random=4", Comment: "", Approval: "" },    
    ];

    const [selectedRows, setSelectedRows] = useState({});
    const [selectedImage, setSelectedImage] = useState(null);
    const [showModal, setShowModal] = useState(false);

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
                newSelectedRows[row.id] = isChecked;
            }
        });
        setSelectedRows(newSelectedRows);
    };

    const filteredData1 = Array.isArray(approvalData) ? approvalData.filter(row =>
        row.JobNo && row.JobNo.toLowerCase()
    ) : [];

    const handleReject = (id, jobNo) => {
        console.log('Rejected: ', id);
        toast.error(jobNo + ` Rejected`);
    }

    const handleShow = () => {
        setShowModal(true);
    setSelectedImage(true);
};
    const handleClose = () => {
        setShowModal(false);
        setSelectedImage(null);
    };
    
    return(
        <>
            <div>
                <div>
                    <div>
                      
                        
                               
                           
                        <div className="row">
                            <div className="col-sm-12">
                                <div className="card">
                                    <div className="card-body">
                                        <h1 style={{ maxWidth: '100%' }} className="display-4 text-center mb-4">Approval</h1>
                                        <Row className="d-flex">
                                        <Col className="ml-auto">
                                                <Button style={{ float: "right", marginBottom: "12px" }}>Approve</Button>
                                        </Col>
                                        </Row>
                                        
                                        <div style={{ overflowX: 'auto' }} className='table-container'>
                                            <Table striped bordered hover>
                                                <thead className='sticky-header'>
                                                    <tr>
                                                        <th>Job No</th>
                                                        <th>CS Name</th>
                                                        <th>Media</th>
                                                        <th>Sq Ft.</th>
                                                        <th>Sample Image</th>
                                                        <th>Comment</th>
                                                        <th><Row>
                                                        <Col><Form.Check
                                                            type="checkbox"
                                                            onChange={handleSelectAllChange}
                                                            checked={filteredData1.length > 0 && filteredData1.every(row => selectedRows[row.id])}
                                                        /></Col>
                                                            <Col>Approval Yes/No</Col>
                                                        </Row></th>
                                                        <th>Reject</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredData1.length > 0 && filteredData1.map((row) => (
                                                        <tr key={row.id}>
                                                            <td>{row.JobNo}</td>
                                                            <td>{row.CSName}</td>
                                                            <td>{row.Media}</td>
                                                            <td>{row.SqFt}</td>
                                                            <td><img style={{width: "300px", height: "300px"}} src={row.SampleImg} alt={`${row.JobNo} sample image`} onClick={handleShow}/></td>
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
                                                                    style={{borderRadius: "5px", padding: "4px", resize: "vertical"}}
                                                                    placeholder="Drop your comments here"
                                                                />
                                                            </td>
                                                            <td><Row>
                                                                <Col><Form.Check
                                                                    key={row.id}
                                                                    type="checkbox"
                                                                    checked={!!selectedRows[row.id]}
                                                                    onChange={() => handleCheckboxChange(row.id)}
                                                                    disabled={row.isCompleted}
                                                                /></Col>
                                                            <Col>{selectedRows[row.id] ? "Yes" : "No"}</Col>
                                                            </Row> 
                                                            </td>
                                                            <td>
                                                                <Button
                                                                    variant="danger"
                                                                    onClick={() => handleReject(row.id, row.JobNo)}
                                                                >
                                                                    <FaTrash /> Reject
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
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
        </>
    )
}
export default Approval;