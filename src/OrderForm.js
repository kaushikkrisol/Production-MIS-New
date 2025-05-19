// File: /components/OrderForm.js
import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import storeData from './StoreData.json';
import useCampaignStore from './store/orderstore';

Modal.setAppElement('#root');

const customModalStyles = {
  overlay: { backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1000 },
  content: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    padding: '20px',
    borderRadius: '10px',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    overflow: 'auto',
    zIndex: 1010,
    width: '90%',
    maxWidth: '1400px',
    height: '90%',
    maxHeight: '900px',
  },
};

const OrderForm = ({ isOpen, onClose }) => {
  const [orderFilters, setOrderFilters] = useState({ doors: '', brandName: '', category: '' });
  const [selectedRows, setSelectedRows] = useState({});
  const [orderSummaryModal, setOrderSummaryModal] = useState(false);
  const [campaignName, setCampaignName] = useState('');

  const addCampaign = useCampaignStore((state) => state.addCampaign);

  useEffect(() => {
    if (!isOpen) {
      setSelectedRows({});
      setCampaignName('');
    }
  }, [isOpen]);

  const handleRowSelection = (itemId) => {
    setSelectedRows((prev) => {
      const updatedRows = { ...prev };
      if (updatedRows[itemId]) {
        delete updatedRows[itemId];
      } else {
        updatedRows[itemId] = { instructions: '', imageFile: null, imageUrl: '' };
      }
      return updatedRows;
    });
  };

  const handleInputChange = (itemId, field, value) => {
    setSelectedRows((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const filteredOrderData = storeData.filter((item) => {
    return (
      (!orderFilters.doors || item.Doors.includes(orderFilters.doors)) &&
      (!orderFilters.brandName || item['Brand name'].includes(orderFilters.brandName)) &&
      (!orderFilters.category || item.AssestElementName.includes(orderFilters.category))
    );
  });

  const openOrderSummaryModal = () => setOrderSummaryModal(true);
  const closeOrderSummaryModal = () => setOrderSummaryModal(false);

  const placeOrder = () => {
    if (!campaignName.trim()) {
      alert('Please enter a campaign name.');
      return;
    }

    const orderItems = Object.entries(selectedRows).map(([id, values]) => {
      const item = storeData.find((d) => String(d['SR. No']) === String(id));
      return {
        id: `item-${id}`,
        srNo: item['SR. No'],
        brand: item['Brand name'],
        category: item.AssestElementName,
        doors: item.Doors,
        location: item.Location,
        qty: item.QTY,
        price: item.Price,
        imageUrl: values.imageUrl || item.Images || '',
        instructions: values.instructions,
        status: 'Yet To Start',
      };
    });

    const campaign = {
      id: `campaign-${Date.now()}`,
      name: campaignName,
      createdAt: new Date().toISOString(),
      items: orderItems,
    };

    addCampaign(campaign);
    alert('Order placed successfully!');
    setSelectedRows({});
    setCampaignName('');
    setOrderSummaryModal(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} style={customModalStyles}>
      <h2>New Order Form</h2>

      <div style={{ marginBottom: '10px' }}>
        <label>Campaign Name: </label>
        <input
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="Enter campaign name"
          style={{ width: '300px', padding: '6px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <select onChange={(e) => setOrderFilters({ ...orderFilters, doors: e.target.value })}>
          <option value="">Filter by Doors</option>
          {[...new Set(storeData.map((item) => item.Doors))].map((door) => (
            <option key={door} value={door}>{door}</option>
          ))}
        </select>

        <select onChange={(e) => setOrderFilters({ ...orderFilters, brandName: e.target.value })}>
          <option value="">Filter by Brand</option>
          {[...new Set(storeData.map((item) => item['Brand name']))].map((brand) => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>

        <select onChange={(e) => setOrderFilters({ ...orderFilters, category: e.target.value })}>
          <option value="">Filter by Category</option>
          {[...new Set(storeData.map((item) => item.AssestElementName))].map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center'}}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              <th>Select</th>
              <th>SR. No</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Doors</th>
              <th>QTY</th>
              <th>Price</th>
              <th>Instructions</th>
              <th>Image URL</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrderData.map((item) => (
              <tr key={item['SR. No']}>
                <td>
                  <input
                    type="checkbox"
                    onChange={() => handleRowSelection(item['SR. No'])}
                    checked={!!selectedRows[item['SR. No']]}
                  />
                </td>
                <td>{item['SR. No']}</td>
                <td>{item['Brand name']}</td>
                <td>{item.AssestElementName}</td>
                <td>{item.Doors}</td>
                <td>{item.QTY}</td>
                <td>{item.Price}</td>
                <td>
                  <input
                    type="text"
                    value={selectedRows[item['SR. No']]?.instructions || ''}
                    onChange={(e) => handleInputChange(item['SR. No'], 'instructions', e.target.value)}
                    placeholder="Enter instructions"
                    style={{ width: '100%' }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={selectedRows[item['SR. No']]?.imageUrl || ''}
                    onChange={(e) => handleInputChange(item['SR. No'], 'imageUrl', e.target.value)}
                    placeholder="Enter image URL"
                    style={{ width: '100%' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={openOrderSummaryModal}
        style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}
      >
        Proceed to Summary
      </button>

      <Modal isOpen={orderSummaryModal} onRequestClose={closeOrderSummaryModal} style={customModalStyles}>
        <h2>Confirm Your Order</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr>
              <th>SR. No</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Doors</th>
              <th>QTY</th>
              <th>Price</th>
              <th>Instructions</th>
              <th>Image URL</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(selectedRows).map(([id, values]) => {
              const item = storeData.find((d) => String(d['SR. No']) === String(id)) || {};
              return (
                <tr key={id}>
                  <td>{item['SR. No'] || 'N/A'}</td>
                  <td>{item['Brand name'] || 'N/A'}</td>
                  <td>{item.AssestElementName || 'N/A'}</td>
                  <td>{item.Doors || 'N/A'}</td>
                  <td>{item.QTY || 'N/A'}</td>
                  <td>{item.Price || 'N/A'}</td>
                  <td>{values.instructions}</td>
                  <td>{values.imageUrl}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button onClick={placeOrder} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px' }}>
          Place Order
        </button>
      </Modal>
    </Modal>
  );
};

export default OrderForm;
