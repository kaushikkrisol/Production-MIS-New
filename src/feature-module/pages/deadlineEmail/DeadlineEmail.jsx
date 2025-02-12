import PropTypes from "prop-types";
import React from "react";

const DeadlineEmail = ({
    jobNumber,
    deadlineDate,
    items,
    // subtotal,
    // shipping,
    // total,
    supportEmail,
    customerSupportNumber,
    companyName,
    companyWebsite,
    companyContactInfo
}) => {
    return (
        <>
            <h3>Job Details</h3>
            <ul>
                <li><strong>Job Number:</strong> {jobNumber}</li>
                <li><strong>Deadline Date:</strong> {deadlineDate}</li>
            </ul>
            <br />

            <h3>Job Created</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px", border: "1px solid #ddd" }}>
                <thead>
                    <tr style={{ background: "#f2f2f2" }}>
                        <th style={{ padding: "10px", textAlign: "left" }}>Media Name</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Quantity</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Media Width</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Media Height</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index}>
                            <td style={{ padding: "10px" }}>{item.mediaName}</td>
                            <td style={{ padding: "10px" }}>{item.quantity}</td>
                            <td style={{ padding: "10px" }}>{item.mediaWidth}</td>
                            <td style={{ padding: "10px" }}>{item.mediaHeight}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <br />

            {/* <div style={{ textAlign: "right", marginTop: "20px" }}>
                <p><strong>Subtotal:</strong> ${subtotal.toFixed(2)}</p>
                <p><strong>Shipping:</strong> ${shipping.toFixed(2)}</p>
                <p><strong>Total:</strong> ${total.toFixed(2)}</p>
            </div> */}

            <h3>Job Information</h3>
            <ul>
                <li><strong>Deadline Date:</strong> {deadlineDate}</li>
                <li>
                    <strong>Job Number:</strong> {jobNumber}
                </li>
            </ul>

            <p>
                If you have any questions, contact us at <a href={`mailto:${supportEmail}`}>{supportEmail}</a> or call {customerSupportNumber}.
            </p>

            <div style={{ marginTop: "20px", paddingTop: "10px", borderTop: "1px solid #ddd", textAlign: "center", fontSize: "14px" }}>
                <p>
                    <strong>Best Regards,</strong><br />
                    {companyName}<br />
                    <a href={companyWebsite} target="_blank" rel="noopener noreferrer">{companyWebsite}</a><br />
                    {companyContactInfo}
                </p>
            </div>
        </>
    );
};

DeadlineEmail.propTypes = {
    jobNumber: PropTypes.string.isRequired,
    deadlineDate: PropTypes.string.isRequired,
    mediaName: PropTypes.string.isRequired,
    quantity: PropTypes.number.isRequired,
    mediaWidth: PropTypes.number.isRequired,
    mediaHeight: PropTypes.number.isRequired,
    items: PropTypes.arrayOf(
        PropTypes.shape({
            mediaName: PropTypes.string.isRequired,
            quantity: PropTypes.number.isRequired,
            mediaWidth: PropTypes.number.isRequired,
            mediaHeight: PropTypes.number.isRequired,
        })
    ).isRequired,
    trackingLink: PropTypes.string.isRequired,
    supportEmail: PropTypes.string.isRequired,
    customerSupportNumber: PropTypes.string.isRequired,
    companyName: PropTypes.string.isRequired,
    companyWebsite: PropTypes.string.isRequired,
    companyContactInfo: PropTypes.string.isRequired,
};

export default DeadlineEmail;