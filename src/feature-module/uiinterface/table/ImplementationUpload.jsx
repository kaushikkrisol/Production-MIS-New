import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import { Alert, Spinner, Button, Table, Form, InputGroup } from 'react-bootstrap';
import { PDFDownloadLink } from '@react-pdf/renderer';
import axios from "axios";
import config from "../../../config";
import { FaDownload, FaSearch } from 'react-icons/fa';
import PdfTemplate from "../../pages/implementationUploadPdf/PdfTemplate";

const ImplementationUpload = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredData = data.filter(row =>
        row.jobNo && row.jobNo.toString().toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    console.log('Filtered data: ', filteredData);

    const urlTest = filteredData.map((data) => data.mediaFiles.map((mf) => `https://productionapi.comart.in/${mf.url}`));
    console.log('urlTest', urlTest);

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
                                <div>
                                    <Form.Group className="mb-3 mt-3">
                                        <InputGroup>
                                            <InputGroup.Text style={{ cursor: 'pointer', color: 'grey', backgroundColor: 'white', borderRight: 'none' }}>
                                                <FaSearch />
                                            </InputGroup.Text>
                                            <Form.Control
                                                type="text"
                                                placeholder="Search by Job No"
                                                value={searchTerm}
                                                style={{ borderLeft: 'none' }}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </InputGroup>
                                    </Form.Group>
                                </div>
                                {error && <Alert variant="danger">{error}</Alert>}
                                {loading ? (
                                    <Spinner animation="border" className="d-block mx-auto" />
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        {filteredData.length > 0 ? (
                                            <Table striped bordered hover>
                                                <thead>
                                                    <tr>
                                                            <th>Job No</th>
                                                        <th>Person Name</th>
                                                        <th>Contact</th>
                                                        <th>Authority</th>
                                                        <th>Sign Date</th>
                                                        <th>Image Type</th>
                                                            <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                
                                                        {
                                                            filteredData.length > 0 ? 
                                                            (filteredData.map((item) => (
                                                        <tr key={item.id}>
                                                            <td>{item.jobNo}</td>
                                                            <td>{item.mediaFiles?.[0]?.personName || ''}</td>
                                                            <td>{item.mediaFiles?.[0]?.contact || ''}</td>
                                                            <td>{item.mediaFiles?.[0]?.authority || ''}</td>
                                                            <td>{item.signDate || 'N/A'}</td>
                                                            <td>{item.mediaFiles?.[0]?.imageType || '' }</td>
                                                            <td>
                                                                        <PDFDownloadLink
                                                                            document={
                                                                                <PdfTemplate
                                                                                    logoUrl="path/to/your/logo.png" // Replace with your logo URL
                                                                                    client={item.mediaFiles?.[0]?.personName || ''}
                                                                                    jobNo={item.jobNo}
                                                                                    salonAddress="123 Salon St, City, Country" // Replace with actual address
                                                                                    // images={item.mediaFiles?.map(file => `https://cors-anywhere.herokuapp.com/https://productionapi.comart.in/${file.url}`) || []}
                                                                                    images={[
                                                                                        "https://picsum.photos/200/300", // Random image 1
                                                                                        "https://picsum.photos/200/300?random=1", // Random image 2
                                                                                        "https://picsum.photos/200/300?random=2"  // Random image 3
                                                                                    ]}
                                                                                />
                                                                            }
                                                                            fileName={`template_${item.jobNo}.pdf`}
                                                                        >
                                                                            {({ loading }) => (
                                                                                <Button variant="primary" className="download-btn">
                                                                                    {loading ? 'Loading...' : <><FaDownload /> Download</>}
                                                                                </Button>
                                                                            )}
                                                                        </PDFDownloadLink>
                                                            </td>
                                                        </tr>
                                                            ))) : (
                                                        <tr>
                                                            <td colSpan="10" className="text-center">No results found</td>
                                                        </tr>)}
                                                </tbody>
                                            </Table>
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
