const fs = require('fs');
const path = require('path');

// Path to your JSON file
const jsonFilePath = path.join(__dirname, '', 'StoreData.json');

// List of available images (assuming you have 154 images named 1.jpg to 154.jpg)
const availableImages = Array.from({ length: 154 }, (_, i) => `./images/${i + 1}.jpg`);

// Function to get a random selection of images from the available images
const getRandomImages = (count) => {
    const shuffled = availableImages.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

// Read the existing JSON data
fs.readFile(jsonFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the JSON file:', err);
        return;
    }

    // Parse the JSON data
    let stores;
    try {
        stores = JSON.parse(data);
    } catch (parseError) {
        console.error('Error parsing JSON data:', parseError);
        return;
    }

    // Update each store entry to include random images
    stores.forEach(store => {
        // Get 3 random images for each store (you can change this number)
        store.images = getRandomImages(3);
        
        // Remove the old single image field if it exists
        delete store.image; // Remove the old image field if it exists
    });

    // Convert the updated stores back to JSON
    const updatedData = JSON.stringify(stores, null, 2);

    // Write the updated JSON data back to the file
    fs.writeFile(jsonFilePath, updatedData, 'utf8', (writeErr) => {
        if (writeErr) {
            console.error('Error writing the updated JSON file:', writeErr);
            return;
        }
        console.log('JSON file has been updated with random images.');
    });
});
