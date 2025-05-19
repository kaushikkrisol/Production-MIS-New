import React, { useEffect, useState, useRef } from 'react';
import storeData from './StoreData.json'; // Import existing data
import Modal from 'react-modal';
import OrderForm from './OrderForm';
import KanbanView from './kanbanview';

Modal.setAppElement('#root');


const customModalStyles = {
    overlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1000,
    },
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
        height: '90%',
        maxWidth: '1200px',
        maxHeight: '800px',
    },
};

const StoreTable = () => {
    const [showKanbanView, setShowKanbanView] = useState(false);

    const [data, setData] = useState([]);
    const [filters, setFilters] = useState({
        region: [],
        brandName: [],
        assestElementName: [],
        doors: [],
        media: [],
        location: [],
    });
    const [selectedFilters, setSelectedFilters] = useState({
        region: [],
        brandName: [],
        assestElementName: [],
        doors: [],
        media: [],
        location: [],
    });
    const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
    const [selectedImage, setSelectedImage] = useState(null);
    const [filterVisibility, setFilterVisibility] = useState({});
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [colorFilter, setColorFilter] = useState('all');
    const dropdownRefs = useRef({});

    useEffect(() => {
        if (Array.isArray(storeData) && storeData.length > 0) {
            setData(storeData);
            setFilters({
                region: getUniqueValues('Region'),
                brandName: getUniqueValues('Brand name'),
                assestElementName: getUniqueValues('AssestElementName'),
                doors: getUniqueValues('Doors'),
                media: getUniqueValues('Media'),
                location: getUniqueValues('Location'),
            });
        }
    }, []);

    const getUniqueValues = (field) => {
        if (!Array.isArray(storeData)) return [];
        return [...new Set(storeData.map((item) => item[field] || "").filter(Boolean))];
    };

    const handleCheckboxChange = (e, field) => {
        const { value, checked } = e.target;
        setSelectedFilters((prevFilters) => {
            const updatedFilters = { ...prevFilters };
            if (checked) {
                updatedFilters[field].push(value);
            } else {
                updatedFilters[field] = updatedFilters[field].filter((v) => v !== value);
            }
            return updatedFilters;
        });
    };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = [...data].sort((a, b) => {
        if (!sortConfig.key) return 0;
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        if (sortConfig.direction === 'ascending') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
    
    const handleOpenKanban = () => {
        const kanbanWindow = window.open('/kanban', '_blank', 'noopener,noreferrer,width=1400,height=800');
        if (kanbanWindow) {
          kanbanWindow.focus();
        }
      };

    const filteredData = sortedData.filter((item) => {
        return (
            (!selectedFilters.region.length || selectedFilters.region.includes(item.Region)) &&
            (!selectedFilters.brandName.length || selectedFilters.brandName.includes(item["Brand name"])) &&
            (!selectedFilters.assestElementName.length || selectedFilters.assestElementName.includes(item.AssestElementName)) &&
            (!selectedFilters.doors.length || selectedFilters.doors.includes(item.Doors)) &&
            (!selectedFilters.media.length || selectedFilters.media.includes(item.Media)) &&
            (!selectedFilters.location.length || selectedFilters.location.includes(item.Location))
        );
    });

    const colorFilteredData = filteredData.filter((item) => {
        if (colorFilter === 'withVisualChange') return !!item["Visual Change Date"];
        if (colorFilter === 'withoutVisualChange') return !item["Visual Change Date"];
        return true;
    });

    const toggleFilterVisibility = (field) => {
        setFilterVisibility((prevVisibility) => ({
            ...prevVisibility,
            [field]: !prevVisibility[field],
        }));
    };

    const closeAllDropdowns = () => setFilterVisibility({});

    const handleOutsideClick = (e) => {
        let clickedInside = false;
        Object.keys(dropdownRefs.current).forEach((key) => {
            if (
                dropdownRefs.current[key] &&
                (dropdownRefs.current[key].contains(e.target) || e.target.dataset.field === key)
            ) {
                clickedInside = true;
            }
        });

        if (!clickedInside) closeAllDropdowns();
    };

    useEffect(() => {
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    const openImageDialog = (image) => setSelectedImage(image);
    const closeImageDialog = () => setSelectedImage(null);

    return (
        <div style={{ padding: '20px', boxSizing: 'border-box' }}>
            <h2>Store Data</h2>

            <button
                style={{ marginTop: '20px', marginBottom: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}
                onClick={() => setOrderModalOpen(true)}
            >
                New Order Form
            </button>

           
            <button
        style={{
          marginBottom: '20px',
          padding: '10px 20px',
          backgroundColor: '#28a745',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
        }}
        onClick={handleOpenKanban}
      >
        Open Order status View
      </button>
            <OrderForm isOpen={orderModalOpen} onClose={() => setOrderModalOpen(false)} />

            {showKanbanView ? (
        <KanbanView />) : ( '')}
      
            {/* Visual Change Date Filter Buttons */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <strong>Visual Change Filter: </strong>
                <button
                    onClick={() => setColorFilter('all')}
                    style={{
                        margin: '0 10px',
                        padding: '8px 16px',
                        backgroundColor: colorFilter === 'all' ? '#007bff' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                    }}
                >
                    All
                </button>
                <button
                    onClick={() => setColorFilter('withVisualChange')}
                    style={{
                        margin: '0 10px',
                        padding: '8px 16px',
                        backgroundColor: colorFilter === 'withVisualChange' ? 'green' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                    }}
                >
                    With Visual Change
                </button>
                <button
                    onClick={() => setColorFilter('withoutVisualChange')}
                    style={{
                        margin: '0 10px',
                        padding: '8px 16px',
                        backgroundColor: colorFilter === 'withoutVisualChange' ? 'gray' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                    }}
                >
                    Without Visual Change
                </button>
            </div>

            {/* Dynamic Filters */}
            <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                {Object.keys(filters).map((field) => (
                    <div key={field} style={{ position: 'relative', width: '160px' }}>
                        <button
                            onClick={() => toggleFilterVisibility(field)}
                            data-field={field}
                            style={{
                                width: '100%',
                                padding: '10px',
                                backgroundColor: '#007bff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontWeight: 'bold',
                                display: 'flex',
                                justifyContent: 'space-between',
                            }}
                        >
                            {field.charAt(0).toUpperCase() + field.slice(1)}
                            <span style={{ fontSize: '14px' }}>{filterVisibility[field] ? '▲' : '▼'}</span>
                        </button>
                        {filterVisibility[field] && (
                            <div
                                ref={(el) => (dropdownRefs.current[field] = el)}
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: '0',
                                    backgroundColor: '#fff',
                                    border: '1px solid #ccc',
                                    borderRadius: '5px',
                                    padding: '10px',
                                    zIndex: 20,
                                    width: '100%',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                                }}
                            >
                                <button
                                    onClick={() =>
                                        setSelectedFilters((prev) => ({ ...prev, [field]: [] }))
                                    }
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        marginBottom: '5px',
                                        padding: '5px',
                                        backgroundColor: '#dc3545',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        textAlign: 'center',
                                    }}
                                >
                                    Clear
                                </button>
                                {filters[field].map((value) => (
                                    <label key={value} style={{ display: 'block', marginBottom: '5px' }}>
                                        <input
                                            type="checkbox"
                                            value={value}
                                            checked={selectedFilters[field].includes(value)}
                                            onChange={(e) => handleCheckboxChange(e, field)}
                                            style={{ marginRight: '10px' }}
                                        />
                                        {value}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                <button
                    onClick={() =>
                        setSelectedFilters({
                            region: [],
                            brandName: [],
                            assestElementName: [],
                            doors: [],
                            media: [],
                            location: [],
                        })
                    }
                    style={{
                        padding: '10px 15px',
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        height: '40px',
                        alignSelf: 'center',
                    }}
                >
                    Clear All Filters
                </button>
            </div>

            {/* Table */}
            <div style={{ overflowY: 'auto', maxHeight: '500px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                    <thead
                        style={{
                            position: 'sticky',
                            top: 0,
                            backgroundColor: '#f8f9fa',
                            zIndex: 10,
                        }}
                    >
                        <tr>
                            {[
                                'SR. No',
                                'Region',
                                'Brand name',
                                'AssestElementName',
                                'Doors',
                                'Width mm',
                                'Height mm',
                                'Print size (Width mm)',
                                'Print size (Height mm)',
                                'QTY',
                                'Media',
                                'Location',
                                'Price',
                                'Reece Completion Date',
                                'Visual Change Date',
                                'Recee Images',
                                'Updated Visual Images',
                            ].map((col) => (
                                <th
                                    key={col}
                                    style={{ border: '1px solid black', cursor: 'pointer', padding: '8px 16px' }}
                                    onClick={() => handleSort(col)}
                                >
                                    {col} {sortConfig.key === col ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {colorFilteredData.map((item, index) => (
                            <tr
                                key={index}
                                style={{
                                    backgroundColor: item["Visual Change Date"] ? 'lightgreen' : 'transparent',
                                }}
                            >
                                <td style={{ border: '1px solid black' }}>{item["SR. No"]}</td>
                                <td style={{ border: '1px solid black' }}>{item.Region}</td>
                                <td style={{ border: '1px solid black' }}>{item["Brand name"]}</td>
                                <td style={{ border: '1px solid black' }}>{item.AssestElementName}</td>
                                <td style={{ border: '1px solid black' }}>{item.Doors}</td>
                                <td style={{ border: '1px solid black' }}>{item["Width mm"]}</td>
                                <td style={{ border: '1px solid black' }}>{item["Height mm"]}</td>
                                <td style={{ border: '1px solid black' }}>{item["Print size (Width mm)"]}</td>
                                <td style={{ border: '1px solid black' }}>{item["Print size (Height mm)"]}</td>
                                <td style={{ border: '1px solid black' }}>{item.QTY}</td>
                                <td style={{ border: '1px solid black' }}>{item.Media}</td>
                                <td style={{ border: '1px solid black' }}>{item.Location}</td>
                                <td style={{ border: '1px solid black' }}>{item.Price}</td>
                                <td style={{ border: '1px solid black' }}>{item["Reece Completion Date"]}</td>
                                <td style={{ border: '1px solid black' }}>{item["Visual Change Date"]}</td>
                                <td style={{ border: '1px solid black' }}>
                                    {item.Images ? (
                                        <img
                                            src={item.Images}
                                            alt="Recee"
                                            style={{ width: '50px', cursor: 'pointer' }}
                                            onClick={() => openImageDialog(item.Images)}
                                        />
                                    ) : (
                                        <span>No image</span>
                                    )}
                                </td>
                                <td>
                                    {item.VisualImages ? (
                                        <img
                                            src={item.VisualImages}
                                            alt="Visual"
                                            style={{ width: '50px', cursor: 'pointer' }}
                                            onClick={() => openImageDialog(item.VisualImages)}
                                        />
                                    ) : (
                                        <span></span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {selectedImage && (
                <Modal isOpen={!!selectedImage} onRequestClose={closeImageDialog} style={customModalStyles}>
                    <img src={selectedImage} alt="Selected" style={{ width: '100%', height: '100%' }} />
                    <button onClick={closeImageDialog} style={{ marginTop: '10px', padding: '10px 20px' }}>
                        Close
                    </button>
                </Modal>
            )}
        </div>
    );
};

export default StoreTable;
