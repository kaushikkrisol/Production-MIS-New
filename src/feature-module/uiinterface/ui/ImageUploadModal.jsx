import PropTypes from "prop-types";
import React, { useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import "./ImageUploadModal.css";

const ImageUploadModal = ({isOpen, onClose, onConfirm}) => {
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [fileName, setFileName] = useState("");

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(file);
                setImagePreview(reader.result);
                setFileName(file.name);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConfirm = () => {
        if (image) {
            onConfirm(imagePreview);
            onClose();
        } else {
            alert("Please upload an image.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal">
        <div className="modal-content">
            <h2 className="modal-header">Upload Image</h2>
            <label className="custom-file-upload">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="file-input" />
                    Choose File
            </label>
            {fileName && <p className="file-name">{fileName}</p>}
            {imagePreview && <img src={imagePreview} alt="Preview" style={{ width: '100%', height: 'auto'}} className="image-preview" />}
            <Row>
                    <Col className="d-flex justify-content-center">
                        <Button className="ok-btn mx-2" onClick={handleConfirm}>OK</Button>
                        <Button className="cancel-btn mx-2" onClick={onClose}>Cancel</Button>
            </Col>
            </Row>
        </div>
        </div>
    )
};

ImageUploadModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired
}


export default ImageUploadModal;