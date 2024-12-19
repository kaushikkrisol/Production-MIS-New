import React from 'react';
import PropTypes from 'prop-types';
import { Input } from 'antd';

const EditableCell = ({

    editable,
    children,
    record,
    dataIndex,
    ...restProps
}) => {
    return (
        <td {...restProps}>
            {editable ? (
                <Input
                    value={record[dataIndex]}
                    onChange={e => {
                        record[dataIndex] = e.target.value;

                    }}
                    style={{ width: '150px' }}
                    onBlur={() => {
                        // Trigger update
                        console.log(`Updated ${dataIndex}: ${record[dataIndex]}`);
                    }}
                />
            ) : (
                children
            )}
        </td>
    );
};

EditableCell.propTypes = {
    title: PropTypes.string.isRequired,
    editable: PropTypes.bool.isRequired,
    children: PropTypes.node,
    record: PropTypes.object.isRequired,
    dataIndex: PropTypes.string.isRequired,
};

export default EditableCell;
