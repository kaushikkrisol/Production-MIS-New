import React from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '400px'
};

const center = {
    lat: 37.7749, // Default latitude
    lng: -122.4194 // Default longitude
};

const MapComponent = ({ coordinates }) => {
    return (
        <LoadScript googleMapsApiKey="YOUR_API_KEY"> {/* Replace with your Google Maps API Key */}
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={coordinates}
                zoom={10}
            >
                <Marker position={coordinates} />
            </GoogleMap>
        </LoadScript>
    );
};

export default MapComponent; 