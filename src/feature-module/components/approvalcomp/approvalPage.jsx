import React, { useState } from 'react';
import PropTypes from 'prop-types'; // Import PropTypes
import config from '../../../config';
import { Alert, Container, Form, Row, Col, Button, Spinner } from 'react-bootstrap';
import axios from 'axios';

const ApprovalPage = ({ lineItems }) => {
  console.log("lineitems are",lineItems)
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false); // New state for loading spinner

  console.log("lineItems are", lineItems);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if all fields are provided
    if (!email || !mobile || lineItems.length === 0) {
      setMessageType('danger');
      setMessage('Please provide email, mobile number, and select line items for approval.');
      return;
    }

    // Show loading spinner while waiting for response
    setLoading(true);

    try {
      // Send the POST request to the backend API to send the approval email
      console.log("config ",config.Approval.URL.Sendmailforcustomer)
      const response = await axios.post(config.Approval.URL.Sendmailforcustomer, {
        email, 
        mobile, 
        lineItems
      });

      // Handle the response from the server
      if (response.status === 200) {
        setMessageType('success');
        setMessage('Approval email sent successfully! Please check your inbox.');
      } else {
        setMessageType('danger');
        setMessage(`Error: ${response.data.message || 'An unknown error occurred'}`);
      }
    } catch (error) {
      setMessageType('danger');
      setMessage('Error occurred while sending approval email');
      console.error('API Error:', error);
    } finally {

      setLoading(false);
    }
};

  return (
    <Container>
      <h2 className='text-center my-4'>Approval Page</h2>
{/* 
      <h3>Selected Line Items:</h3>
      {lineItems.length === 0 ? (
        <p>No items selected for approval.</p>
      ) : (
        <ul className='list-group mb-4'>
          {lineItems.map((item, index) => (
            <li key={index} className="list-group-item">
              <strong>Username:</strong> {item.username} <br />
              <strong>Job Number:</strong> {item.jobNo} <br />
              <strong>Visual Code:</strong> {item.visualCode} <br />
              <strong>CS Name:</strong> {item.csName} <br />
              <strong>Design ID:</strong> {item.designid} <br />
            </li>
          ))}
        </ul>
      )} */}

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
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : 'Send Approval Email'}
            </Button>
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
