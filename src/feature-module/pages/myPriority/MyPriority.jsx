import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import { Table } from "react-bootstrap";
import axios from "axios";
import config from "../../../config";

const MyPriority = () => {
    const [locationId, setLocationId] = useState("");
    const [userName, setUserName] = useState("");
    
    useEffect(() => {
        const users = localStorage.getItem('users');

        // Check if users data exists and is not null
        if (users) {
            // Parse the JSON string into an object
            const usersObject = JSON.parse(users);

            const username = usersObject.message && usersObject.message.username;
            setUserName(username);

            const locationid = usersObject.message && usersObject.message.location_id;
            const stringlocationid = String(locationid);
            setLocationId(stringlocationid);
            console.log(locationId);

        } else {
            console.log('No user data found in localStorage.');
        }
    }, []);

    const fetchDesignPriority = async () => {
        const payload = {
            username: userName,
        };

        try {
            const response = await axios.post(config.MyPriority.URL.GetAllPriority, payload);
            console.log('priority fetched data: ', response.data);
        } catch (error) {
            console.error('Failed fetching Priority Data', error);
        }
    };
    useEffect(() => {
        
        fetchDesignPriority();
    }, [userName]);
    return(
        <>
            <div>
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
                                        <h1 style={{ maxWidth: '100%' }} className="display-4 text-center mb-4">My Priority</h1>
                                        <hr />
                                        <div>
                                            <div style={{ overflowX: 'auto' }} className='table-container'>
                                                <Table striped bordered hover>
                                                    <thead className='sticky-header'>
                                                        <tr>
                                                            
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        
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
            </div>
        </>
    )
};
export default MyPriority