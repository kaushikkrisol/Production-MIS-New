import React, { useState } from 'react';

const ApprovalPage = () => {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if all fields are provided
    if (!email || !mobile || !status) {
      setMessage('Please provide email, mobile number, and status');
      return;
    }

    try {
      // Send a POST request to the backend API to send the approval email
      const response = await fetch('https://localhost:7035/api/Design/Sendmailforcustomer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, mobile, status }),
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
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="status">Status:</label>
          <input
            type="text"
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
          />
        </div>
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

export default ApprovalPage;
