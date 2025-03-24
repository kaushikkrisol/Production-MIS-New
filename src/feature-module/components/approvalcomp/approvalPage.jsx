import React, { useState } from 'react';
import PropTypes from 'prop-types'; // Import PropTypes
import config from '../../../config';
import { Alert, Container, Form, Row, Col, Button } from 'react-bootstrap';

const ApprovalPage = ({ lineItems }) => {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  console.log("lineItems are", lineItems);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if all fields are provided
    if (!email || !mobile) {
      setMessageType('danger');
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
        setMessageType('success');
        setMessage('Approval email sent successfully! Please check your inbox.');
      } else {
        const errorResponse = await response.json();
        setMessageType('danger');
        setMessage(`Error: ${errorResponse.message}`);
      }
    } catch (error) {
      setMessageType('danger');
      setMessage('Error occurred while sending approval email');
    }
  };

  return (
    <Container>
      <h2 className='text-center my-4'>Approval Page</h2>

      <h3>Selected Line Items:</h3>
      {lineItems.length === 0 ? (
                <p>No items selected for approval.</p>
            ) : (
                <ul className='list-group mb-4'>
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
      <Form onSubmit={handleSubmit}>
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group controlId="email">
              <Form.Label>Email:</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="mobile">
              <Form.Label>Mobile Number:</Form.Label>
              <Form.Control
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                placeholder="Enter your mobile number"
              />
            </Form.Group>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col className="d-flex justify-content-center">
            <Button variant="primary" type="submit">Send Approval Email</Button>
          </Col>
        </Row>
      </Form>

      {message && (
       <Alert variant={messageType} className='mt-3'>
        {message}
       </Alert> 
        )}
    </Container>
  );
};

// Add prop validation
ApprovalPage.propTypes = {
  lineItems: PropTypes.array.isRequired, // Ensuring lineItems is an array and is required
};

export default ApprovalPage;
