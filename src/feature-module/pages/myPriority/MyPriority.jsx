import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import { Table, Button } from "react-bootstrap";
import axios from "axios";
import config from "../../../config";
import { ArrowDown, ArrowUp } from "react-feather";

const MyPriority = () => {
    const [locationId, setLocationId] = useState("");
    const [userName, setUserName] = useState("");
    const [userId, setUserId] = useState("");
    const [data, setData] = useState([]);

    const moveRowUp = (index) => {
        if (index === 0) return; // Can't move the first row up
        const newData = [...data];
        // Swap the current row with the one above it
        [newData[index], newData[index - 1]] = [newData[index - 1], newData[index]];
        setData(newData);
        updatePriorityInBackend(newData, index - 1, index); // Update backend with new order
    };

    const moveRowDown = (index) => {
        if (index === data.length - 1) return; // Can't move the last row down
        const newData = [...data];
        [newData[index], newData[index + 1]] = [newData[index + 1], newData[index]];
        setData(newData);
        updatePriorityInBackend(newData, index + 1, index);
    };

    const updatePriorityInBackend = async (updatedData, newIndex) => {
        try {
            const newPriority = newIndex + 1;
            const priorityUpdates = {
                designId: updatedData[newIndex].designid,
                newPriority: newPriority
            };

            await axios.post(config.MyPriority.URL.UpdatePriority, priorityUpdates);
            console.log('Priority updated successfully');
        } catch (error) {
            console.error('Error updating priority:', error);
        }
    };
    
    useEffect(() => {
        const users = localStorage.getItem('users');

        if (users) {
            // Parse the JSON string into an object
            const usersObject = JSON.parse(users);

            const username = usersObject.message && usersObject.message.username;
            setUserName(username);

            const locationid = usersObject.message && usersObject.message.location_id;
            const stringlocationid = String(locationid);
            setLocationId(stringlocationid);

            const userid = usersObject.message && usersObject.message.user_id;
            setUserId(userid);
            console.log(locationId);

        } else {
            console.log('No user data found in localStorage.');
        }
    }, []);

    const fetchDesignPriority = async () => {
        try {
            const payload = {
                userId: userId
            }

            const response = await axios.post(config.Design.URL.GetDesignByUserId, payload);
            setData(response.data);
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
                                                            <th>Job Id</th>
                                                            <th>No Of Artwork</th>
                                                            <th>Client Name</th>
                                                            <th>Brief</th>
                                                            <th>Location</th>
                                                            <th>Query/Comment</th>
                                                            <th>Due Date</th>
                                                            <th>Designer Name</th>
                                                            <th>Set Priority</th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                    {data.length > 0 && data.map((row, index) => (
                                                        <tr key={row.designid}>
                                                            <td>{row.jobNo}</td>
                                                            <td>{row.designNoOfJobs}</td>
                                                            <td>{row.client}</td>
                                                            <td>{row.designBrief}</td>
                                                            <td>{row.productionLocation}</td>
                                                            <td>{row.designQuery}</td>
                                                            <td>{row.designerDeadline ? new Date(row.designerDeadline).toLocaleString() : '-'}</td>
                                                            <td>{row.enteredby}</td>
                                                            <td>
                                                                <Button variant="link" onClick={() => moveRowUp(index)} disabled={index === 0}>
                                                                    <ArrowUp />
                                                                </Button>
                                                                <Button variant="link" onClick={() => moveRowDown(index)} disabled={index === data.length - 1}>
                                                                    <ArrowDown />
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
            </div>
        </>
    )
};
export default MyPriority