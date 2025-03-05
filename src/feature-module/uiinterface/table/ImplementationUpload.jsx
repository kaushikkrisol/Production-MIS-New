import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import { Alert, Spinner, Button, Table, Form, InputGroup } from 'react-bootstrap';
import { PDFDownloadLink } from '@react-pdf/renderer';
import axios from "axios";
import config from "../../../config";
import { FaDownload, FaSearch } from 'react-icons/fa';
import PdfTemplate from "../../pages/implementationUploadPdf/PdfTemplate";
import Sort from "../ui/Sort";



const ImplementationUpload = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [salonAddresses, setSalonAddresses] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'ascending' });
    const [imageURLs, setImageURLs] = useState({}); 

    const fetchImplUploadData = async () => {
        setLoading(true);
        
        try {
            const response = await axios.post(config.ImplementationUpload.URL.GetAllImplementationUpload);
            setData(response.data);        
            const salonAddressPromises = response.data.map(item => fetchImplSalonAddress(item.id));
            await Promise.all(salonAddressPromises);
        } catch (e) {
            setError("Failed to fetch data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchImplSalonAddress = async (id) => {
        try {
            const response = await axios.get(`${config.ImplementationUpload.URL.GetImplementationUploadWithSalonAddress}/${id}`);
            setSalonAddresses(prev => ({ ...prev, [id]: response.data.salonAddress }));
            console.log(response.data);
        } catch (e) {
            setError("Failed to fetch salon address");
        }
    };

    useEffect(() => {
        fetchImplUploadData();
    }, []);

    console.log('salon address is: ', salonAddresses);

    const filteredData = data.filter(row =>
        row.jobNo && row.jobNo.toString().toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    console.log('Filtered data: ', filteredData);

    const urlTest = filteredData.map((data) => data.mediaFiles.map((mf) => `https://productionapi.comart.in/${mf.url}`));
    console.log('urlTest', urlTest);


    const sortedData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // download test
    const downloadImageAndDisplayInPDF = (imageURL, jobNo) => {
        // Download the image (you can use a temporary link for download)
        const link = document.createElement('a');
        link.href = imageURL;
        link.download = `${jobNo}_image.jpg`;
        link.click();

        setImageURLs(prev => ({ ...prev, [jobNo]: imageURL }));
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
                                    <div style={{ overflowX: 'auto' }} className="table-container">
                                        {filteredData.length > 0 ? (
                                            <Table striped bordered hover>
                                                <thead className="sticky-header">
                                                    <tr>
                                                            <th><Sort sortKey="jobNo" thead="Job No" sortConfig={sortConfig} requestSort={requestSort} /></th>
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
                                                            sortedData.length > 0 ? 
                                                            (sortedData.map((item) => (
                                                        <tr key={item.id}>
                                                            <td>{item.jobNo}</td>
                                                            <td>{item.mediaFiles?.[0]?.personName || ''}</td>
                                                            <td>{item.mediaFiles?.[0]?.contact || ''}</td>
                                                            <td>{item.mediaFiles?.[0]?.authority || ''}</td>
                                                            <td>{item.signDate || 'N/A'}</td>
                                                            <td>{item.mediaFiles?.[0]?.imageType || '' }</td>
                                                            <td>
                                                                        <Button variant="primary" onClick={() => downloadImageAndDisplayInPDF(`https://productionapi.comart.in/${item.mediaFiles?.[0]?.url}`, item.jobNo)}>
                                                                            <FaDownload /> Download Image & Generate PDF
                                                                        </Button>
                                                                        

                                                                        <PDFDownloadLink
                                                                            document={
                                                                                <PdfTemplate
                                                                                    client={item.mediaFiles?.[0]?.personName || ''}
                                                                                    jobNo={item.jobNo}
                                                                                    salonAddress={salonAddresses[item.id] || 'N/A'} // Replace with actual address
                                                                                    // images={item.mediaFiles?.map(file => `https://localhost:7035/`+ file.url) || []}
                                                                                    images={imageURLs[item.jobNo] ? [imageURLs[item.jobNo]] : []}
                                                                                    // images={[
                                                                                    //     "https://productionapi.comart.in/signatures/J0625021769/download.jpg",
                                                                                    //     "https://picsum.photos/200/300?random=1", // Random image 2
                                                                                    //     "https://picsum.photos/200/300?random=2"  // Random image 3
                                                                                    // ]}
                                                                                />
                                                                            }
                                                                            fileName={`${item.jobNo}_${salonAddresses[item.id]}.pdf`}
                                                                        >
                                                                            <Button variant="primary">
                                                                                <FaDownload /> Generate PDF
                                                                            </Button>
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
