import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import { Alert, Card, Spinner, Button } from 'react-bootstrap';
import axios from "axios";
import config from "../../../config";
import { FaDownload, FaImage, FaVideo, FaFilePdf, FaUserCircle, FaPhoneAlt, FaShieldAlt, FaCalendarAlt } from 'react-icons/fa';

const ImplementationUpload = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);

    const fetchImplUploadData = async () => {
        try {
            const response = await axios.post(config.ImplementationUpload.URL.GetAllImplementationUpload);
            setData(response.data);
        } catch (e) {
            setError("Failed to fetch data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImplUploadData();
    }, []);

    const handleDownload = (url) => {
        window.open(url, '_blank');
    };

    return (
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
                                <h1 className="display-7 text-center mb-4">Implementation Upload</h1>
                                {error && <Alert variant="danger">{error}</Alert>}
                                {loading ? (
                                    <Spinner animation="border" className="d-block mx-auto" />
                                ) : (
                                    <div>
                                        {data.length > 0 ? (
                                            data.map((item) => (
                                                <Card key={item.id} className="mb-3 shadow-sm card-container">
                                                    <Card.Body>
                                                        <div className="card-header">
                                                            <Card.Title>Job No: {item.jobNo}</Card.Title>
                                                            <div className="file-type-icons">
                                                                {item.mediaFiles?.[0]?.imageType === 'Image' && <FaImage className="icon" />}
                                                                {item.mediaFiles?.[0]?.imageType === 'Video' && <FaVideo className="icon" />}
                                                                {item.mediaFiles?.[0]?.imageType === 'PDF' && <FaFilePdf className="icon" />}
                                                            </div>
                                                        </div>
                                                        <Card.Text className="text-muted mt-3">
                                                            <div className="info-row">
                                                                <FaUserCircle /> <strong>Person Name:</strong> {item.mediaFiles?.[0]?.personName || 'N/A'}
                                                            </div>
                                                            <div className="info-row">
                                                                <FaPhoneAlt /> <strong>Contact:</strong> {item.mediaFiles?.[0]?.contact || 'N/A'}
                                                            </div>
                                                            <div className="info-row">
                                                                <FaShieldAlt /> <strong>Authority:</strong> {item.mediaFiles?.[0]?.authority || 'N/A'}
                                                            </div>
                                                            <div className="info-row">
                                                                <FaCalendarAlt /> <strong>Sign Date:</strong> {item.signDate || 'N/A'}
                                                            </div>
                                                        </Card.Text>
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <Button
                                                                variant="primary"
                                                                onClick={() => handleDownload(item.mediaFiles?.[0]?.url)}
                                                                className="download-btn"
                                                            >
                                                                <FaDownload /> Download
                                                            </Button>
                                                        </div>
                                                    </Card.Body>
                                                </Card>
                                            ))
                                        ) : (
                                            <Alert variant="info">No implementation uploads found.</Alert>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImplementationUpload;
