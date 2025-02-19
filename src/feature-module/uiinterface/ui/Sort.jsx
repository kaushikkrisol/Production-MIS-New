import React from 'react';
import PropTypes from 'prop-types';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

const Sort = ({ thead, sortKey, sortConfig, requestSort }) => {
    const isActive = sortConfig.key === sortKey;
    const direction = isActive ? sortConfig.direction : null;

    const getSortIcon = () => {
        if (direction === 'ascending') {
            return <FaSortUp style={{color: 'blue'}} />;
        } else if (direction === 'descending') {
            return <FaSortDown style={{color: 'red'}}/>;
        }
        return <FaSort />;
    };

    return (
        <sort onClick={() => requestSort(sortKey)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {thead} {getSortIcon()}
        </sort>
    );
};

Sort.propTypes = {
    thead: PropTypes.string.isRequired,
    sortKey: PropTypes.string.isRequired,
    sortConfig: PropTypes.shape({
        key: PropTypes.string,
        direction: PropTypes.oneOf(['ascending', 'descending']),
    }).isRequired,
    requestSort: PropTypes.func.isRequired,
};

export default Sort;