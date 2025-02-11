import React, { useState } from "react";
import { Button } from "react-bootstrap"
import PropTypes from "prop-types";
import { FaExclamationTriangle } from "react-icons/fa";
import "./notification.css";

const Notification = ({message, onClose, show}) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const toggleMinimize = () => {
        setIsMinimized(prev => !prev);
    }
    return (
        <div className={`notification ${show ? 'show' : 'hide'}`}>
            <div className="notification-content">
                <div className="notification-header">
                    <FaExclamationTriangle style={{color: 'white'}} />
                    <strong>Deadline Alert!</strong>
                    <button className="notification-toggle" onClick={toggleMinimize}>
                        {isMinimized ? '+' : '-'}
                    </button>
                    <Button variant="close" onClick={onClose} />
                </div>
                {!isMinimized && (
                    <div className="notification-body">
                        {message.map((msg, index) => (
                            <div key={index}>
                                <p>{msg}</p>
                                {index < message.length - 1 && <hr />}
                            </div>
                        ))}
                    </div>
                )}
                {/* <div className="notification-footer">
                    <Button onClick={onClose}>Close</Button>
                </div> */}
            </div>
        </div>
    )
};

Notification.propTypes = {
    message: PropTypes.arrayOf(PropTypes.string).isRequired,
    onClose: PropTypes.func.isRequired,
    show: PropTypes.bool.isRequired,
}
export default Notification;