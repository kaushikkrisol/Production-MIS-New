import React, { useEffect, useState } from 'react';
import useCampaignStore from './store/orderstore';
import Select from 'react-select';
import './kanbanview.css';

const statuses = [
  'Yet to Start',
  'Order Accepted',
  'Printed',
  'Lamination/Mouting/Packing',
  'Delivered',
  'Implemented',
  'Proof of Execution'
];

const statusColors = {
  'Yet to Start': '#FFE7BA',
  'Order Accepted': '#D9F7BE',
  'Printed': '#FFF1B8',
  'Lamination/Mouting/Packing': '#CCDE33',
  'Delivered': '#E6F7FF',
  'Implemented': '#FFD6E7',
  'Proof of Execution': '#F6FFED'
};

const inProgressStatuses = [
  'Order Accepted',
  'Printed',
  'Lamination/Mouting/Packing',
  'Delivered'
];

const kanbanview = () => {
  const { campaigns, fetchCampaigns } = useCampaignStore();
  const [filters, setFilters] = useState({ brand: '', category: '', campaign: '' });
  const [groupByLocation, setGroupByLocation] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState({});

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const allItems = campaigns.flatMap(campaign =>
    campaign.items.map(item => ({
      ...item,
      campaignId: campaign.id,
      campaignName: campaign.campaignName || campaign.name || 'Untitled',
      status: item.Status || 'Yet to Start'
    }))
  );

  const getOptions = (key) => {
    const values = Array.from(new Set(allItems.map(item => item[key]).filter(Boolean)));
    return values.map(v => ({ label: v, value: v }));
  };

  const filteredItems = allItems.filter(item =>
    (!filters.brand || item['Brand name'] === filters.brand) &&
    (!filters.category || item['Cataegeory'] === filters.category) &&
    (!filters.campaign || item.campaignName === filters.campaign)
  );

  const toggleLocation = (status, location) => {
    const key = `${status}-${location}`;
    setExpandedLocations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Select
          placeholder="Filter by Brand"
          options={getOptions('Brand name')}
          isClearable
          value={filters.brand ? { label: filters.brand, value: filters.brand } : null}
          onChange={(selected) => setFilters(prev => ({ ...prev, brand: selected?.value || '' }))}
          styles={{ container: base => ({ ...base, width: 200 }) }}
        />
        <Select
          placeholder="Filter by Category"
          options={getOptions('Cataegeory')}
          isClearable
          value={filters.category ? { label: filters.category, value: filters.category } : null}
          onChange={(selected) => setFilters(prev => ({ ...prev, category: selected?.value || '' }))}
          styles={{ container: base => ({ ...base, width: 200 }) }}
        />
        <Select
          placeholder="Filter by Campaign"
          options={getOptions('campaignName')}
          isClearable
          value={filters.campaign ? { label: filters.campaign, value: filters.campaign } : null}
          onChange={(selected) => setFilters(prev => ({ ...prev, campaign: selected?.value || '' }))}
          styles={{ container: base => ({ ...base, width: 200 }) }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <input
            type="checkbox"
            checked={groupByLocation}
            onChange={() => setGroupByLocation(prev => !prev)}
          />
          Group by Location
        </label>
      </div>

      <div className="kanban-wrapper" >
      <div className="kanban-board">
        {statuses.map((status, index) => {
          const itemsByStatus = filteredItems.filter(item => item.status === status);

          if (!groupByLocation) {
            return (
              <React.Fragment key={status}>
                <div
                  style={{
                    flex: 1,
                    backgroundColor: statusColors[status],
                    padding: '10px',
                    borderRadius: '8px',
                    minHeight: 400,
                    border: '2px solid #999',
                    overflowY: 'auto'
                  }}
                >
                  <h3 style={{ textAlign: 'center' }}>{status}</h3>
                  {itemsByStatus.map((item, idx) => (
                    <React.Fragment key={item.id || item._id || JSON.stringify(item)}>
                      <div
                        className={inProgressStatuses.includes(item.status) ? 'blinking' : ''}
                        style={{
                          backgroundColor: '#fff',
                          marginBottom: '10px',
                          padding: '10px',
                          borderRadius: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        <p><strong>{item['Brand name']}</strong></p>
                        <p>{item['Cataegeory']} | Qty: {item['QTY']}</p>
                        <p><small>Campaign: {item.campaignName}</small></p>
                        <p><strong>Location:</strong> {item['Location']}</p>

                        {item['Recce Images'] && (
                          <img
                            src={item['Recce Images']}
                            alt="Recce"
                            style={{
                              width: '100%',
                              maxHeight: 100,
                              objectFit: 'cover',
                              borderRadius: 4,
                              marginTop: 5
                            }}
                          />
                        )}

                        {item['Updated Visual image'] && (
                          <div style={{ marginTop: 5 }}>
                            <strong>Updated Visual:</strong>
                            <img
                              src={item['Updated Visual image']}
                              alt="Updated Visual"
                              style={{
                                width: 60,
                                height: 60,
                                objectFit: 'cover',
                                borderRadius: 4,
                                marginTop: 4
                              }}
                            />
                          </div>
                        )}
                      </div>
                      

                      {idx < itemsByStatus.length - 1 && (
                        <div style={{ fontSize: 20, textAlign: 'center', color: '#555' }}>↓</div>
                      )}
                    </React.Fragment>
                  ))}
                  
                </div>
                

                {index < statuses.length - 1 && (
                  <div style={{
                    fontSize: 32,
                    alignSelf: 'center',
                    color: '#666'
                  }}>→</div>
                )}
              </React.Fragment>
            );
          }

          const groupedByLocation = itemsByStatus.reduce((acc, item) => {
            const loc = item.Location || 'Unknown';
            acc[loc] = acc[loc] || [];
            acc[loc].push(item);
            return acc;
          }, {});

          return (
            <React.Fragment key={status}>
              <div
                style={{
                  flex: 1,
                  backgroundColor: statusColors[status],
                  padding: '10px',
                  borderRadius: '8px',
                  minHeight: 400,
                  border: '2px solid #999',
                  overflowY: 'auto'
                }}
              >
                <h3 style={{ textAlign: 'center' }}>{status}</h3>
                {Object.entries(groupedByLocation).map(([location, items]) => {
                  const locKey = `${status}-${location}`;
                  const isOpen = expandedLocations[locKey];

                  return (
                    <div key={locKey} style={{ marginBottom: '1rem' }}>
                      <h5
                        onClick={() => toggleLocation(status, location)}
                        style={{
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          background: '#333',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: 4
                        }}
                      >
                        {isOpen ? '▼' : '▶'} {location} ({items.length})
                      </h5>
                      {isOpen &&
                        items.map(item => (
                          <div
                            key={item.id || item._id || JSON.stringify(item)}
                            className={inProgressStatuses.includes(item.status) ? 'blinking' : ''}
                            style={{
                              backgroundColor: '#fff',
                              marginBottom: '10px',
                              padding: '10px',
                              borderRadius: '6px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                          >
                            <p><strong>{item['Brand name']}</strong></p>
                            <p>{item['Cataegeory']} | Qty: {item['QTY']}</p>
                            <p><small>Campaign: {item.campaignName}</small></p>

                            {item['Recce Images'] && (
                              <img
                                src={item['Recce Images']}
                                alt="Recce"
                                style={{
                                  width: '100%',
                                  maxHeight: 100,
                                  objectFit: 'cover',
                                  borderRadius: 4,
                                  marginTop: 5
                                }}
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>

              {index < statuses.length - 1 && (
                <div style={{
                  fontSize: 32,
                  alignSelf: 'center',
                  color: '#666'
                }}>→</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
    </div>
  );
};

export default kanbanview;
