import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import axios from "axios";
import './JobTrack.css'; // Import your CSS file for styling
import config from "../../../config";
import { Alert, Spinner } from "react-bootstrap";

const JobTrack = () => {
    const [csData, setCsData] = useState([]);
    const [designData, setDesignData] = useState([]);
    const [printingData, setPrintingData] = useState([]);
    const [deliveryData, setDeliveryData] = useState([]);
    const [implementationData, setImplementationData] = useState([]);
    const [implementationUploadData, setImplementationUploadData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCsData = async () => {
        try {
            const response = await axios.post(config.JobSummary.URL.Getalljob);
            console.log('Cs data: ', response.data);
            setCsData(response.data);
        } catch (error) {
            setError("Failed to fetch CS data.");
        }
    };

    const fetchDesignData = async () => {
        try {
            const response = await axios.post(config.Design.URL.Getalldesign);
            console.log('Design data: ', response.data);
            setDesignData(response.data);
        } catch (error) {
            setError("Failed to fetch Design data.");
        }
    };

    const fetchPrintingData = async () => {
        try {
            const response = await axios.post(config.Printing.URL.GetCompletedPrinting);
            console.log('Printing data: ', response.data);
            setPrintingData(response.data);
        } catch (error) {
            setError("Failed to fetch Printing data.");
        }
    };

    const fetchDeliveryData = async () => {
        try {
            const response = await axios.post(config.Delivery.URL.Getalldelivery);
            console.log('Delivery data: ', response.data);
            setDeliveryData(response.data);
        } catch (error) {
            setError("Failed to fetch Delivery data.");
        }
    };

    const fetchImplementationData = async () => {
        try {
            const response = await axios.post(config.Implementation.URL.GetallImplementation); 
            console.log('Implementation data: ', response.data);
            setImplementationData(response.data);
        } catch (error) {
            setError("Failed to fetch Implementation data.");
        }
    };

    const fetchImplementationUploadData = async () => {
        try {
            const response = await axios.post(config.ImplementationUpload.URL.GetAllImplementationUpload); 
            console.log('Implementation Upload data: ', response.data);
            setImplementationUploadData(response.data);
        } catch (error) {
            setError("Failed to fetch Implementation Upload data.");
        }
    };

    useEffect(() => {
        fetchCsData();
        fetchDesignData();
        fetchPrintingData();
        fetchDeliveryData();
        fetchImplementationData();
        fetchImplementationUploadData();
    }, []);

    useEffect(() => {
        if (csData.length > 0 && designData.length > 0 && printingData.length > 0 && deliveryData.length > 0 && implementationData.length > 0 && implementationUploadData.length > 0) {
            setLoading(false);
        }
    }, [csData, designData, printingData, deliveryData, implementationData, implementationUploadData]);

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
                                <h1 className="display-7 text-center mb-4">Job Tracker</h1>
                                {error && <Alert variant="danger">{error}</Alert>}
                                {loading && <Spinner animation="border" className="d-block mx-auto" />}
                                <div className="kanban-container">
                                    <div className="kanban-column">
                                        <h3>CS</h3>
                                        <div className="kanban-cards" style={{overflow: 'auto'}}>
                                            {csData.map((job) => (
                                                <div className="kanban-card" key={job.id}>
                                                    <h4>Job No: {job.jobNo}</h4>
                                                    <p>Client: {job.client}</p>
                                                    <p>City: {job.city}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="kanban-column">
                                        <h3>Design</h3>
                                        <div className="kanban-cards">
                                            {designData.map((job) => (
                                                <div className="kanban-card" key={job.designid}>
                                                    <h4>Job No: {job.jobNo}</h4>
                                                    <p>Client Name: {job.designClientName}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="kanban-column">
                                        <h3>Printing</h3>
                                        <div className="kanban-cards">
                                            {printingData.map((job) => (
                                                <div className="kanban-card" key={job.id}>
                                                    <h4>{job.jobNo}</h4>
                                                    <p>{job.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="kanban-column">
                                        <h3>Delivery</h3>
                                        <div className="kanban-cards">
                                            {deliveryData.map((job) => (
                                                <div className="kanban-card" key={job.id}>
                                                    <h4>Job No: {job.jobNo}</h4>
                                                    <p>Client: {job.client}</p>
                                                    <p>Salon Address: {job.salonAddress}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="kanban-column">
                                        <h3>Implementation</h3>
                                        <div className="kanban-cards">
                                            {implementationData.map((job) => (
                                                <div className="kanban-card" key={job.id}>
                                                    <h4>Job No: {job.jobNo}</h4>
                                                    <p>Media: {job.media}</p>
                                                    <p>Client: {job.client}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="kanban-column">
                                        <h3>Implementation Upload</h3>
                                        <div className="kanban-cards">
                                            {implementationUploadData.map((job) => (
                                                <div className="kanban-card" key={job.id}>
                                                    <h4>Job No: {job.jobNo}</h4>
                                                    <p>Person Name: {job.mediaFiles?.map((j) => j.personName)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobTrack;