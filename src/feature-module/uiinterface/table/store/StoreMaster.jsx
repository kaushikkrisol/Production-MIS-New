import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Select from 'react-select';
import config from '../../../../config';

const getLoggedInUser = () => {
  try {
    return JSON.parse(localStorage.getItem('users') || '{}').message || {};
  } catch (error) {
    console.error('Failed to read logged in user', error);
    return {};
  }
};

const getRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const getCustomerId = (customer) =>
  String(
    customer?.customeR_ID ??
      customer?.customerId ??
      customer?.customerid ??
      customer?.CUSTOMER_ID ??
      customer?.id ??
      customer?._id ??
      ''
  ).trim();

const getCustomerName = (customer) =>
  customer?.customeR_NAME ||
  customer?.customerName ||
  customer?.client ||
  customer?.CUSTOMER_NAME ||
  customer?.name ||
  '';

const getCustomerGstNo = (customer) =>
  String(
    customer?.gsT_NO ??
      customer?.gstNo ??
      customer?.GST_NO ??
      customer?.gst_number ??
      customer?.gstin ??
      customer?.GSTIN ??
      ''
  ).trim();

const getPanFromGstin = (gstin) => {
  const clean = String(gstin || '').trim().toUpperCase();
  return clean.length >= 12 ? clean.substring(2, 12) : '';
};

const normalizeLookupKey = (value) =>
  String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const getSelectedOption = (options, value) =>
  options.find((option) => option.value === value) || null;

const selectPortalTarget = () =>
  typeof document !== 'undefined' ? document.body : undefined;

const storeSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderColor: state.isFocused ? '#a32d2d' : '#d8e0ea',
    borderRadius: 6,
    boxShadow: state.isFocused ? '0 0 0 3px rgba(163, 45, 45, 0.14)' : 'none',
    backgroundColor: '#ffffff',
    fontSize: 14,
    '&:hover': {
      borderColor: state.isFocused ? '#a32d2d' : '#c7d0dc',
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 12px',
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),
  placeholder: (base) => ({
    ...base,
    color: '#8794a7',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#25364d',
    fontWeight: 600,
  }),
  indicatorsContainer: (base) => ({
    ...base,
    minHeight: 42,
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: '#e4e9f0',
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? '#a32d2d' : '#6f7f94',
    padding: '8px 10px',
    '&:hover': {
      color: '#a32d2d',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: '8px 6px',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 6,
    border: '1px solid #d8e0ea',
    boxShadow: '0 12px 28px rgba(22, 34, 51, 0.16)',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#a32d2d'
      : state.isFocused
        ? '#fff4ef'
        : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#25364d',
    cursor: 'pointer',
    padding: '10px 12px',
  }),
};

const filterCustomerOption = ({ data }, inputValue) => {
  const query = String(inputValue || '').trim().toLowerCase();
  if (!query) return true;
  return data.searchText.includes(query);
};

const formatCustomerOption = (option, { context }) => {
  if (context === 'value') return option.label;

  return (
    <div className="store-customer-option">
      <span className="store-customer-option-name">{option.label}</span>
      <span className="store-customer-option-meta">
        {option.gstNo ? `GST: ${option.gstNo}` : `ID: ${option.value}`}
      </span>
    </div>
  );
};

const normalizeStoreRow = (store) => ({
  id: store?.id || store?._id || store?.storeId || store?.StoreId || '',
  storeName: store?.storeName || store?.StoreName || store?.name || '',
  address: store?.address || store?.Address || store?.storeAddress || store?.StoreAddress || '',
  location: store?.location || store?.Location || '',
  city: store?.city || store?.City || '',
  gstNo: store?.gstNo || store?.GstNo || store?.GSTNo || store?.GST_NO || '',
  panCard: store?.panCard || store?.PanCard || store?.panNo || store?.PAN || '',
});

const getStoreDistinctKey = (store) => {
  const idKey = normalizeLookupKey(store.id);
  if (idKey) return `id:${idKey}`;

  return [
    store.storeName,
    store.address,
    store.location,
    store.city,
    store.gstNo,
  ].map(normalizeLookupKey).join('|');
};

const getDistinctStoreRows = (rows) => {
  const seen = new Set();

  return rows.filter((store) => {
    const key = getStoreDistinctKey(store);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const StoreMaster = () => {
  const [customers, setCustomers] = useState([]);
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    gstNo: '',
    panCard: '',
    storeName: '',
    address: '',
    location: '',
    city: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const customerOptions = useMemo(
    () =>
      customers
        .reduce((options, customer) => {
          const customerId = getCustomerId(customer);
          const customerName = getCustomerName(customer);
          const gstNo = getCustomerGstNo(customer).toUpperCase();
          const panCard = getPanFromGstin(gstNo);
          const distinctKey = normalizeLookupKey(customerId);

          if (!distinctKey || options.seen.has(distinctKey)) {
            return options;
          }

          options.seen.add(distinctKey);

          options.rows.push({
            value: customerId,
            label: customerName || customerId,
            customerName,
            gstNo,
            panCard,
            searchText: [customerName, customerId, gstNo, panCard]
              .join(' ')
              .toLowerCase(),
          });

          return options;
        }, { seen: new Set(), rows: [] }).rows,
    [customers]
  );

  const selectedCustomerOption = getSelectedOption(customerOptions, form.customerId);

  useEffect(() => {
    const users = getLoggedInUser();
    const locationId = users?.location_id || users?.locationId || '';

    if (!locationId) {
      setCustomers([]);
      setMessage('Location details not found. Please login again.');
      return;
    }

    axios.post(
      config.JobSummary.URL.Getallcustomer,
      { locationid: locationId },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    )
      .then(res => setCustomers(getRows(res.data)))
      .catch(() => {
        setCustomers([]);
        setMessage('Error loading customers');
      });
  }, []);

  useEffect(() => {
    if (form.customerId) {
      // Fetch stores for selected customer
      axios.get(`${config.Store.URL.List}?customerId=${encodeURIComponent(form.customerId)}`, { timeout: 10000 })
        .then(res => setStores(getDistinctStoreRows(getRows(res.data).map(normalizeStoreRow))))
        .catch((error) => {
          console.error('Error loading stores', error);
          setStores([]);
        });
    } else {
      setStores([]);
    }
  }, [form.customerId]);

  const handleChange = e => {
    const { name, value } = e.target;

    if (name === 'gstNo') {
      const gstNo = String(value || '').trim().toUpperCase();
      setForm({
        ...form,
        gstNo,
        panCard: getPanFromGstin(gstNo),
      });
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const handleCustomerChange = (option) => {
    const value = option?.value || '';
    const selectedCustomer = customers.find(customer => getCustomerId(customer) === String(value));
    const customerName = option?.customerName || (selectedCustomer ? getCustomerName(selectedCustomer) : '');
    const gstNo = (option?.gstNo || (selectedCustomer ? getCustomerGstNo(selectedCustomer) : '')).toUpperCase();

    setForm({
      ...form,
      customerId: value,
      customerName,
      gstNo,
      panCard: getPanFromGstin(gstNo),
    });
  };

  const buildPayload = () => {
    const users = getLoggedInUser();
    const locationId = users?.location_id || users?.locationId || '';
    const userName = users?.username || users?.userName || users?.name || '';
    const panCard = form.panCard || getPanFromGstin(form.gstNo);

    return {
      id: '',
      customerId: form.customerId,
      CustomerId: form.customerId,
      customerName: form.customerName,
      CustomerName: form.customerName,
      gstNo: form.gstNo,
      GstNo: form.gstNo,
      GSTNo: form.gstNo,
      panCard,
      PanCard: panCard,
      panNo: panCard,
      storeName: form.storeName,
      StoreName: form.storeName,
      address: form.address,
      Address: form.address,
      location: form.location,
      Location: form.location,
      city: form.city,
      City: form.city,
      locationId,
      locationid: locationId,
      Enteredby: userName,
      Entereddat: new Date().toISOString(),
    };
  };

  const selectedCustomerGstNo = form.gstNo || getCustomerGstNo(
    customers.find(customer => getCustomerId(customer) === String(form.customerId))
  );

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const payload = buildPayload();

      if (!form.customerId) {
        setMessage('Please select a customer.');
        setLoading(false);
        return;
      }

      if (!form.gstNo) {
        setMessage('Please enter GST No. PAN will be generated automatically.');
        setLoading(false);
        return;
      }

      if (!payload.panCard) {
        setMessage('Please enter a valid GST No. PAN could not be generated.');
        setLoading(false);
        return;
      }

      await axios.post(config.Store.URL.Add, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });
      setMessage('Store added successfully');
      setForm({ ...form, panCard: payload.panCard, storeName: '', address: '', location: '', city: '' });
      // Refresh store list
      const res = await axios.get(`${config.Store.URL.List}?customerId=${encodeURIComponent(form.customerId)}`, { timeout: 10000 });
      setStores(getDistinctStoreRows(getRows(res.data).map(normalizeStoreRow)));
    } catch (error) {
      console.error('Error adding store', error);
      const apiMessage =
        typeof error?.response?.data === 'string'
          ? error.response.data
          : error?.response?.data?.message;
      setMessage(apiMessage || error?.message || 'Error adding store');
    }
    setLoading(false);
  };

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <style>{`
          .store-master-header {
            align-items: center;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
          }
          .store-master-header h4 {
            color: #14213d;
            font-weight: 700;
            margin: 0;
          }
          .store-master-count {
            background: #fff4ef;
            border: 1px solid #f1c7bb;
            border-radius: 6px;
            color: #9b2e2e;
            font-size: 13px;
            font-weight: 700;
            padding: 6px 10px;
          }
          .store-master-panel,
          .store-master-table-panel {
            background: #ffffff;
            border: 1px solid #d8e0ea;
            border-radius: 8px;
            box-shadow: 0 10px 24px rgba(22, 34, 51, 0.06);
            padding: 18px;
          }
          .store-master-panel label {
            color: #31425a;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 6px;
          }
          .store-master-panel .form-control {
            border-color: #d8e0ea;
            border-radius: 6px;
            color: #25364d;
            font-size: 14px;
            min-height: 42px;
          }
          .store-master-panel .form-control:focus {
            border-color: #a32d2d;
            box-shadow: 0 0 0 3px rgba(163, 45, 45, 0.14);
          }
          .store-readonly-box {
            background: #f7f9fc;
            font-weight: 700;
          }
          .store-master-actions {
            display: flex;
            justify-content: flex-start;
          }
          .store-master-submit {
            min-height: 42px;
            min-width: 112px;
            padding-left: 18px;
            padding-right: 18px;
          }
          .store-master-table-panel {
            margin-top: 18px;
            padding: 0;
            overflow: hidden;
          }
          .store-master-table-title {
            align-items: center;
            border-bottom: 1px solid #d8e0ea;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 18px;
          }
          .store-master-table-title h5 {
            color: #14213d;
            font-size: 16px;
            font-weight: 700;
            margin: 0;
          }
          .store-master-table {
            margin-bottom: 0;
          }
          .store-master-table th {
            background: #eef4fb;
            border-color: #d5deea;
            color: #1d2f49;
            font-weight: 700;
            white-space: nowrap;
          }
          .store-master-table td {
            border-color: #d5deea;
            color: #25364d;
            vertical-align: middle;
          }
          .store-customer-option {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .store-customer-option-name {
            font-weight: 700;
            line-height: 1.2;
          }
          .store-customer-option-meta {
            color: inherit;
            font-size: 12px;
            opacity: 0.76;
          }
          @media (max-width: 767.98px) {
            .store-master-header,
            .store-master-table-title {
              align-items: flex-start;
              flex-direction: column;
            }
            .store-master-panel,
            .store-master-table-panel {
              padding: 14px;
            }
          }
        `}</style>

        <div className="store-master-header">
          <h4>Store Master</h4>
          <span className="store-master-count">{customerOptions.length} Customers</span>
        </div>

        {message && <div className="alert alert-info">{message}</div>}

        <form onSubmit={handleSubmit} className="store-master-panel mb-3">
          <div className="row g-3">
            <div className="col-lg-5 col-md-6">
              <label>Customer</label>
              <Select
                classNamePrefix="store-customer-select"
                styles={storeSelectStyles}
                menuPortalTarget={selectPortalTarget()}
                isClearable
                options={customerOptions}
                value={selectedCustomerOption}
                onChange={handleCustomerChange}
                filterOption={filterCustomerOption}
                formatOptionLabel={formatCustomerOption}
                placeholder="Search customer"
                noOptionsMessage={() => 'No customers found'}
              />
            </div>
            <div className="col-lg-3 col-md-6">
              <label>GST No</label>
              <input
                name="gstNo"
                value={form.gstNo}
                onChange={handleChange}
                className="form-control"
                maxLength="15"
                required
              />
            </div>
            <div className="col-lg-4 col-md-6">
              <label>PAN Card</label>
              <input name="panCard" value={form.panCard} className="form-control store-readonly-box" readOnly required />
            </div>
            <div className="col-lg-3 col-md-6">
              <label>Store Name</label>
              <input name="storeName" value={form.storeName} onChange={handleChange} className="form-control" required />
            </div>
            <div className="col-lg-3 col-md-6">
              <label>Address</label>
              <input name="address" value={form.address} onChange={handleChange} className="form-control" required />
            </div>
            <div className="col-lg-3 col-md-6">
              <label>Location</label>
              <input name="location" value={form.location} onChange={handleChange} className="form-control" required />
            </div>
            <div className="col-lg-3 col-md-6">
              <label>City</label>
              <input name="city" value={form.city} onChange={handleChange} className="form-control" required />
            </div>
            <div className="col-12 store-master-actions">
              <button type="submit" className="btn btn-primary store-master-submit" disabled={loading}>
                {loading ? 'Saving...' : 'Add Store'}
              </button>
            </div>
          </div>
        </form>

        <div className="store-master-table-panel">
          <div className="store-master-table-title">
            <h5>Stores for selected customer</h5>
          </div>
          <div className="table-responsive">
            <table className="table table-bordered store-master-table">
              <thead>
                <tr>
                  <th>Store Name</th>
                  <th>Address</th>
                  <th>Location</th>
                  <th>City</th>
                  <th>GST No</th>
                  <th>PAN Card</th>
                </tr>
              </thead>
              <tbody>
                {stores.length ? (
                  stores.map(s => (
                    <tr key={s.id || s._id || `${s.storeName}-${s.city}`}>
                      <td>{s.storeName || '-'}</td>
                      <td>{s.address || '-'}</td>
                      <td>{s.location || '-'}</td>
                      <td>{s.city || '-'}</td>
                      <td>{s.gstNo || selectedCustomerGstNo || '-'}</td>
                      <td>{s.panCard || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      No stores found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreMaster;
