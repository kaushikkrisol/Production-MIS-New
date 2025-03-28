import React from 'react';
import { Offcanvas, Button, Form } from 'react-bootstrap';
import PropTypes from 'prop-types';

const FilterSidebar = ({ show, handleClose, filters, setFilters, filterConfig }) => {
    const handleResetFilters = () => {
        const resetFilters = {};
        filterConfig.forEach((filter) => {
            resetFilters[filter.key] = '';
        });
        setFilters(resetFilters);
    };

    return (
        <Offcanvas show={show} onHide={handleClose} placement="end" style={{ height: '100%' }}>
            <Offcanvas.Header closeButton style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd' }}>
                <Offcanvas.Title>Filter Options</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 56px)', padding: '2rem' }}>
                {/* Filters */}
                {filterConfig.map((filter) => (
                    <Form.Group key={filter.key} className="mb-4">
                        <Form.Label
                            style={{ fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
                            {filter.placeholder}
                        </Form.Label>
                        <Form.Control
                            type={filter.type}
                            placeholder={filter.placeholder}
                            value={filters[filter.key] || ''}
                            onChange={(e) => setFilters({ ...filters, [filter.key]: e.target.value })}
                            style={{ borderRadius: '0.375rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderColor: '#ced4da' }}
                        />
                    </Form.Group>
                ))}

                {/* Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Reset Button */}
                    <Button
                        variant="outline-secondary"
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '0.375rem',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            backgroundColor: '#f1f1f1',
                            borderColor: '#ced4da',
                            fontWeight: '600',
                            marginRight: '1em'
                        }}
                        onClick={handleResetFilters}
                    >
                        Reset Filters
                    </Button>

                    {/* Apply Button */}
                    <Button
                        variant="primary"
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '0.375rem',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            fontWeight: '600',
                        }}
                        onClick={handleClose}
                    >
                        Apply Filters
                    </Button>
                </div>
            </Offcanvas.Body>
        </Offcanvas>
    );
};

FilterSidebar.propTypes = {
    show: PropTypes.bool.isRequired,
    handleClose: PropTypes.func.isRequired,
    filters: PropTypes.object.isRequired,
    setFilters: PropTypes.func.isRequired,
    filterConfig: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        placeholder: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
    })).isRequired,
};

export default FilterSidebar;
