import React from "react";
import PropTypes from "prop-types";

const SuccessFailMsg = ({message, type, onClose}) => {
    if (!message) return null;
    return (
        <div className={`notification ${type}`}>
            <span>{message}</span>
            <button onClick={onClose}>Close</button>
        </div>
    )
}
SuccessFailMsg.propTypes = {
    message: PropTypes.string.isRequired, // message should be a string and is required
    type: PropTypes.oneOf(['success', 'error']).isRequired, // type should be either 'success' or 'error' and is required
    onClose: PropTypes.func.isRequired, // onClose should be a function and is required
};

export default SuccessFailMsg;