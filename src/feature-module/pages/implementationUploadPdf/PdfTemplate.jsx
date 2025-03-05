import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import PropTypes from 'prop-types';
import pageOneBg from './page1-bg.png';
import middlePgBg from './middle-pgs-bg.png';
import lastPgBg from './last-pg-bg.png';

// Create styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        padding: 20,
        position: 'relative',
        height: '100%',
    },
    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        width: '100%',
        height: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: '24px',
        textAlign: 'center',
        marginBottom: '30px',
        marginLeft: '35%',
        color: '#fff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
    salonAddress: {
        fontSize: 17,
        marginBottom: 10,
        textAlign: 'center',
        marginTop: '9%',
    },
    imagesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    image: {
        width: '30%',
        height: '70%',
    },
    thankYou: {
        fontSize: 24,
        textAlign: 'center',
        marginTop: 20,
    },
});

// Create Document Component
const PdfTemplate = ({ client, jobNo, salonAddress, images }) => {
    console.log('Image url: ', images);
    // const [imageError, setImageError] = useState(false);
    // const imageUrl = images;
    // const fallbackImageUrl = "https://example.com/path/to/fallback-image.jpg";

    // // const renderImage = (image, idx) => {
    // //     if (image) {
    // //         console.log('image found in template', image);
    // //         return <img key={idx} src={image} style={styles.image} />;
    // //     } else {
    // //         console.error(`Image not found: ${image}`);
    // //         return null;
    // //     }
    // // }

    // const renderImagenaw = (image, idx) => {
    //     if (image) {
    //         console.log('image found in template', image, idx);
    //         return <p> {image} </p>;
    //     } else {
    //         console.error(`Image not found: ${image}`);
    //         return null;
    //     }
    // }
    // const [base64Images, setBase64Images] = useState([]);
    // useEffect(() => {
    //     setBase64Images(images);
    // }, [images]);

    // const imageToBase64 = async (url) => {
    //     try {
    //         const response = await fetch(url);
    //         const blob = await response.blob();
    //         const reader = new FileReader();
    //         return new Promise((resolve, reject) => {
    //             reader.onloadend = () => {
    //                 const base64String = reader.result.split(',')[1]; // Get base64 string
    //                 resolve(base64String);
    //             };
    //             reader.onerror = reject;
    //             reader.readAsDataURL(blob);
    //         });
    //     } catch (error) {
    //         console.error(`Error converting image to Base64: ${url}`, error);
    //         return null;
    //     }
    // };
    // console.log(imageError, setImageError, imageUrl, fallbackImageUrl, renderImagenaw)

    // useEffect(() => {
    //     const convertImages = async () => {
    //         try {
    //             const base64Strings = await Promise.all(images.map(imageUrl => imageToBase64(imageUrl)));
    //             setBase64Images(base64Strings.filter(Boolean)); // Filter out any null values
    //         } catch (error) {
    //             console.error("Error converting images:", error);
    //         }
    //     };

    //     if (images && images.length > 0) {
    //         convertImages(); // Trigger image conversion when images are available
    //     }
    // }, [images]);
    // console.log('base 64', base64Images);
    return (
        <Document>
            {/* First Page */}
            <Page size={{ width: 960, height: 540 }} style={styles.page}>
                <Image src={pageOneBg} style={styles.background} />
                <View style={styles.title}>
                    <View>
                        <Text>{client} - {jobNo}</Text>
                    </View>
                </View>
            </Page>

            {/* Middle Pages */}
            {Array.from({ length: 1 }).map((_, index) => (
                <Page size={{ width: 960, height: 540 }} style={styles.page} key={index}>
                    <Image src={middlePgBg} style={styles.background} />
                    <Text style={styles.salonAddress}>{salonAddress}</Text>
                    <View style={styles.imagesContainer}>

                        {/* {images.map((image, idx) => renderImage(image, idx))} */}
                        {/* {base64Images.length > 0 && base64Images.map((base64Image, idx) => (
                            <Image key={idx} src={`data:image/jpeg;base64,${base64Image}`} style={styles.image} />
                        ))} */}
                        {images.map((imageUrl, idx) => (
                            <Image key={idx} src={imageUrl} style={styles.image} />
                        ))}
                    </View>
                </Page>
            ))}

            {/* Last Page */}
            <Page size={{ width: 960, height: 540 }} style={styles.page}>
                <Image src={lastPgBg} style={styles.background} />
            </Page>
        </Document>
    );
};

PdfTemplate.propTypes = {
    client: PropTypes.string.isRequired,
    jobNo: PropTypes.string.isRequired,
    salonAddress: PropTypes.string.isRequired,
    images: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default PdfTemplate;