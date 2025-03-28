import React, { useState } from "react";
import { Button } from "react-bootstrap";
import PropTypes from "prop-types";
import { FaExclamationTriangle } from "react-icons/fa";
import "./notification.css";
import Draggable from "react-draggable"; // Import Draggable

const Notification = ({ headline, message, onClose, show, containerBg, bgColor, headerColor }) => {
    const [isMinimized, setIsMinimized] = useState(false);

    const toggleMinimize = () => {
        setIsMinimized(prev => !prev);
    }

    const initialPosition = { x: 0, y: 0 };

    return (
        <Draggable defaultPosition={initialPosition}>
            <div className={`notification ${show ? 'show' : 'hide'} ${isMinimized ? 'minimized' : ''}`} style={{ backgroundColor: containerBg }}>
                <div className={`notification-content`} style={{ backgroundColor: bgColor }}>
                    <div className="notification-header" style={{ backgroundColor: headerColor }}>
                        <FaExclamationTriangle style={{ color: 'white' }} />
                        <strong>{headline}</strong>
                        <button className="notification-toggle" onClick={toggleMinimize}>
                            {isMinimized ? '+' : '-'}
                        </button>
                        <Button variant="close" onClick={onClose} />
                    </div>
                    {!isMinimized && (
                        <div className={`notification-body ${isMinimized ? 'minimized' : ''}`}>
                            {message.map((msg, index) => (
                                <div key={index}>
                                    <p>{msg}</p>
                                    {index < message.length - 1 && <hr />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Draggable>
    )
};

Notification.propTypes = {
    headline: PropTypes.string.isRequired,
    message: PropTypes.arrayOf(PropTypes.string).isRequired,
    onClose: PropTypes.func.isRequired,
    show: PropTypes.bool.isRequired,
    containerBg: PropTypes.string.isRequired,
    bgColor: PropTypes.string.isRequired,
    headerColor: PropTypes.string.isRequired,
}

export default Notification;
