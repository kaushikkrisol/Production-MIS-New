import React, { useState } from 'react';
import PropTypes from 'prop-types'; // Import PropTypes
import config from '../../../config';

const ApprovalPage = ({ lineItems }) => {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [message, setMessage] = useState('');

  console.log("lineItems are", lineItems);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if all fields are provided
    if (!email || !mobile) {
      setMessage('Please provide email, mobile number, and status');
      return;
    }

    try {
      // Send a POST request to the backend API to send the approval email
      const response = await fetch(config.Design.URL.Sendmailforcustomer, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, mobile ,lineItems}),
      });

      // Handle the response from the server
      if (response.ok) {
        setMessage('Approval email sent successfully! Please check your inbox.');
      } else {
        const errorResponse = await response.json();
        setMessage(`Error: ${errorResponse.message}`);
      }
    } catch (error) {
      setMessage('Error occurred while sending approval email');
    }
  };

  return (
    <div>
      <h2>Approval Page</h2>

      <h3>Selected Line Items:</h3>
      {lineItems.length === 0 ? (
                <p>No items selected for approval.</p>
            ) : (
                <ul>
                    {lineItems.map((item, index) => (
                        <li key={index}>
                            <strong>Username:</strong> {item.username} <br />
                            <strong>Visual Code:</strong> {item.visualCode} <br />
                            <strong>CS Name:</strong> {item.csName} <br />
                            <strong>Design ID:</strong> {item.designid} <br />
                        </li>
                    ))}
                </ul>
            )}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="mobile">Mobile Number:</label>
          <input
            type="text"
            id="mobile"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
          />
        </div>
        <button type="submit">Send Approval Email</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
};

// Add prop validation
ApprovalPage.propTypes = {
  lineItems: PropTypes.array.isRequired, // Ensuring lineItems is an array and is required
};

export default ApprovalPage;
