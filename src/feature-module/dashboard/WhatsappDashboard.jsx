import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import PptxGenJS from "pptxgenjs";
import { jsPDF } from "jspdf";
import config from "../../config";
import { Button, Form, Row, Col, Card, Alert, Spinner } from "react-bootstrap";
import { Download, Eye, FileText, RefreshCw, Search, X } from "react-feather";
import "./whatsapp-dashboard.css";
import exportContentTemplate from "./whatsapp-export-assets/image1.png";
import exportCoverTemplate from "./whatsapp-export-assets/image2.png";
import exportLogo from "./whatsapp-export-assets/image3.jpeg";
import exportThankYouTemplate from "./whatsapp-export-assets/image4.png";

// Keep the dashboard light: only this many job/store cards are returned and
// rendered at one time. The API must apply Skip/Limit for this to be effective.
const PAGE_SIZE = 12;
const CARD_PREVIEW_IMAGE_COUNT = 4;
const EXPORT_SLIDE_WIDTH = 13.333;
const EXPORT_SLIDE_HEIGHT = 7.5;
const EXPORT_IMAGES_PER_PAGE = 4;
const imageDataUrlCache = new Map();
const exportImageDataCache = new Map();

const getRowsFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.message)) return data.message;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (data?.data && typeof data.data === "object") return [data.data];
  if (data?.result && typeof data.result === "object") return [data.result];
  return [];
};

const getValue = (item, ...keys) => {
  if (!item || typeof item !== "object") return "";

  for (const key of keys) {
    const directValue = item?.[key];
    if (directValue !== undefined && directValue !== null && directValue !== "") return directValue;
  }

  const normalizedKeys = keys.map((key) => String(key).toLowerCase());
  const matchedEntry = Object.entries(item).find(
    ([key, value]) =>
      normalizedKeys.includes(String(key).toLowerCase()) &&
      value !== undefined &&
      value !== null &&
      value !== ""
  );

  return matchedEntry ? matchedEntry[1] : "";
};

const normalizeSearchText = (value) =>
  String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .toLowerCase();

const storeMatches = (row, searchStoreName) => {
  const searchText = normalizeSearchText(searchStoreName);
  if (!searchText) return true;

  const rowStore = normalizeSearchText(
    getImplementationValue(row, "storeName", "StoreName", "salonStoreName", "SalonStoreName", "store", "Store")
  );

  return rowStore === searchText || rowStore.includes(searchText) || searchText.includes(rowStore);
};

const jobMatches = (row, searchJobNo) => {
  const searchText = normalizeSearchText(searchJobNo);
  if (!searchText) return true;

  const rowJobNo = normalizeSearchText(
    getImplementationValue(row, "jobNo", "JobNo", "jobNumber", "JobNumber", "comartJobNo", "ComartJobNo")
  );

  return rowJobNo === searchText;
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  return [];
};

const getOriginFromUrl = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
};

const mediaBaseOrigin =
  getOriginFromUrl(config.ImplementationUpload?.URL?.ImageBaseURL) ||
  getOriginFromUrl(config.ImplementationUpload?.URL?.GetAllWithImagesPaged) ||
  getOriginFromUrl(config.ImplementationUpload?.URL?.GetAllWithImages) ||
  getOriginFromUrl(config.ImplementationUpload?.URL?.GetAllImplementationUpload) ||
  getOriginFromUrl(config.downloadPDF?.URL?.GetPdf) ||
  getOriginFromUrl(config.API_BASE_URL) ||
  getOriginFromUrl(config.BASE_URL) ||
  "";

const uniqueValues = (values) => [...new Set(values.filter(Boolean))];

const safeImageUrl = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  try {
    return encodeURI(decodeURI(text));
  } catch {
    return text.replace(/ /g, "%20").replace(/%2520/gi, "%20");
  }
};

const normalizeImageUrl = (url) => {
  const imageUrl = String(url || "").trim().replace(/\\/g, "/");
  if (!imageUrl) return "";

  if (/^(data|blob):/i.test(imageUrl) || /^[a-z][a-z\d+.-]*:\/\//i.test(imageUrl) || imageUrl.startsWith("//")) {
    return safeImageUrl(imageUrl);
  }

  const imagePath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  const fullUrl = mediaBaseOrigin ? `${mediaBaseOrigin}${imagePath}` : imagePath;
  return safeImageUrl(fullUrl);
};

const isLocalFrontend = () => {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
};

const toSameOriginImageUrl = (url) => {
  if (typeof window === "undefined") return url;

  const normalizedUrl = normalizeImageUrl(url);
  if (!normalizedUrl) return "";

  try {
    const parsedUrl = new URL(normalizedUrl, window.location.origin);
    if (parsedUrl.pathname.toLowerCase().startsWith("/images/") && isLocalFrontend()) {
      return `${parsedUrl.pathname}${parsedUrl.search}`;
    }
  } catch {
    // Keep the normalized URL when it cannot be parsed.
  }

  return normalizedUrl;
};

const encodePathSegments = (segments) =>
  segments.map((segment) => encodeURIComponent(String(segment || ""))).join("/");

const capitalizePathSegment = (value) => {
  const text = String(value || "").toLowerCase();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "";
};

const toTitleCasePathSegment = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

const buildMediaUrl = (origin, segments) => {
  if (!origin || !segments.length) return "";
  return `${origin}/images/${encodePathSegments(segments)}`;
};

const getStorePathVariants = (storeSegments = []) => {
  if (!storeSegments.length) return [[]];

  const joinedStore = storeSegments.join(" ").trim();
  const noCommaStore = joinedStore.replace(/,/g, "").replace(/\s+/g, " ").trim();
  const punctuationAsSpaceStore = joinedStore
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Folder names on the server always keep spaces (encoded as %20) — never underscores or
  // dashes — so we only vary casing/punctuation here, never the word separator itself.
  // Lowercase is listed first since that's what production actually stores.
  const singleSegmentVariants = uniqueValues([
    joinedStore.toLowerCase(),
    joinedStore,
    noCommaStore.toLowerCase(),
    noCommaStore,
    toTitleCasePathSegment(joinedStore),
    joinedStore.toUpperCase(),
    toTitleCasePathSegment(noCommaStore),
    punctuationAsSpaceStore.toLowerCase(),
    punctuationAsSpaceStore,
    toTitleCasePathSegment(punctuationAsSpaceStore),
  ]);

  return [
    storeSegments,
    ...singleSegmentVariants.map((storeVariant) => [storeVariant]),
  ];
};

const getImageUrlCandidates = (url) => {
  const primaryUrl = normalizeImageUrl(url);
  if (!primaryUrl) return [];

  const candidates = [primaryUrl];

  try {
    const parsedUrl = new URL(primaryUrl, mediaBaseOrigin || window.location.origin);
    const origin = parsedUrl.origin || mediaBaseOrigin;
    const pathSegments = parsedUrl.pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      });
    const imagesIndex = pathSegments.findIndex(
      (segment) => String(segment).toLowerCase() === "images"
    );
    const mediaSegments = imagesIndex >= 0 ? pathSegments.slice(imagesIndex + 1) : pathSegments;

    if (origin && mediaSegments.length >= 3) {
      const [mediaType, jobNumber, ...restSegments] = mediaSegments;
      const fileName = restSegments[restSegments.length - 1];
      const storeSegments = restSegments.slice(0, -1);
      const storePathVariants = getStorePathVariants(storeSegments);
      // Your server stores media-type folders as uppercase (e.g. AFTER/BEFORE) even though the
      // JSON often reports it lowercase, so try that confirmed-working form first.
      const mediaTypeVariants = uniqueValues([
        String(mediaType || "").toUpperCase(),
        mediaType,
        capitalizePathSegment(mediaType),
        String(mediaType || "").toLowerCase(),
      ]);

      mediaTypeVariants.forEach((typeVariant) => {
        storePathVariants.forEach((storeVariant) => {
          candidates.push(buildMediaUrl(origin, [typeVariant, jobNumber, ...storeVariant, fileName]));
        });
        candidates.push(buildMediaUrl(origin, [typeVariant, jobNumber, fileName]));
      });
    }
  } catch {
    // Keep the primary URL. The browser will show the fallback text if it fails.
  }

  return uniqueValues(candidates.map(safeImageUrl));
};

const getExportImageUrlCandidates = (url) => {
  const candidates = getImageUrlCandidates(url);
  return uniqueValues(
    candidates.flatMap((candidate) => [
      toSameOriginImageUrl(candidate),
      candidate,
    ])
  );
};

const DashboardImage = ({ src, alt, className = "", onClick }) => {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidates = getImageUrlCandidates(src);
  const activeSrc = candidates[candidateIndex] || "";

  useEffect(() => {
    setCandidateIndex(0);
  }, [src]);

  const handleLoad = (event) => {
    event.currentTarget.parentElement?.classList.remove("image-load-failed");
  };

  const handleError = (event) => {
    if (candidateIndex < candidates.length - 1) {
      setCandidateIndex((currentIndex) => currentIndex + 1);
      return;
    }

    markImageFailed(event);
  };

  return (
    <img
      src={activeSrc}
      data-export-src={activeSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onClick={onClick}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};

const getImplementationItems = (item = {}) => {
  if (!item || typeof item !== "object") return [];

  return [
    ...toArray(item.implementationItems || []),
    ...toArray(item.ImplementationItems || []),
    ...toArray(item.implementationUploads || []),
    ...toArray(item.ImplementationUploads || []),
  ];
};
const getImplementationValue = (item = {}, ...keys) => {
  const directValue = getValue(item, ...keys);
  if (directValue !== "") return directValue;

  return getImplementationItems(item)
    .map((implementationItem) => getValue(implementationItem, ...keys))
    .find((value) => value !== "") || "";
};

const getImplementationDate = (item = {}) =>
  getImplementationValue(
    item,
    "uploadDate",
    "UploadDate",
    "createdDate",
    "CreatedDate",
    "uploadedAtUtc",
    "UploadedAtUtc",
    "entereddt",
    "Entereddt",
    "signDate",
    "SignDate"
  );

const getImplementationStatus = (item = {}) => {
  const status = getImplementationValue(item, "status", "Status");
  if (status) return status;

  const isUploaded = getImplementationValue(item, "isUploaded", "IsUploaded");
  if (isUploaded === true || isUploaded === "true" || isUploaded === 1 || isUploaded === "1") {
    return "Uploaded";
  }

  return "Active";
};

const getMediaFiles = (item = {}) => {
  const implementationItems = getImplementationItems(item);

  return [
    ...toArray(item.mediaFiles),
    ...toArray(item.MediaFiles),
    ...toArray(item.images),
    ...toArray(item.Images),
    ...toArray(item.files),
    ...toArray(item.Files),
    ...toArray(item.uploadFiles),
    ...toArray(item.UploadFiles),
    ...implementationItems.flatMap((implementationItem) => [
      ...toArray(implementationItem.mediaFiles),
      ...toArray(implementationItem.MediaFiles),
      ...toArray(implementationItem.images),
      ...toArray(implementationItem.Images),
      ...toArray(implementationItem.files),
      ...toArray(implementationItem.Files),
      ...toArray(implementationItem.uploadFiles),
      ...toArray(implementationItem.UploadFiles),
    ]),
  ].filter(Boolean);
};

const getImageUrls = (item = {}) => {
  const implementationItems = getImplementationItems(item);
  const urls = getMediaFiles(item)
    .map((value) =>
      typeof value === "string"
        ? value
        : getValue(value, "url", "Url", "fileUrl", "FileUrl", "imageUrl", "ImageUrl", "path", "Path")
    )
    .map(normalizeImageUrl)
    .filter(Boolean);

  const singleImage = getValue(item, "imageUrl", "ImageUrl", "fileUrl", "FileUrl", "url", "Url");
  if (singleImage) urls.push(normalizeImageUrl(singleImage));

  implementationItems.forEach((implementationItem) => {
    const nestedImage = getValue(implementationItem, "imageUrl", "ImageUrl", "fileUrl", "FileUrl", "url", "Url");
    if (nestedImage) urls.push(normalizeImageUrl(nestedImage));
  });

  return [...new Set(urls)];
};

const groupImplementationRows = (rows = []) =>
  Array.from(
    rows
      .reduce((map, item, index) => {
        const itemJobNo = getImplementationValue(
          item,
          "jobNo",
          "JobNo",
          "jobNumber",
          "JobNumber",
          "comartJobNo",
          "ComartJobNo"
        );
        const itemStoreName = getImplementationValue(
          item,
          "storeName",
          "StoreName",
          "salonStoreName",
          "SalonStoreName",
          "store",
          "Store"
        );

        // Do not merge unrelated incomplete records when both values are absent.
        const normalizedJobNo = normalizeSearchText(itemJobNo);
        const normalizedStoreName = normalizeSearchText(itemStoreName);
        const key =
          normalizedJobNo || normalizedStoreName
            ? `${normalizedJobNo}__${normalizedStoreName}`
            : `missing-identifiers-${index}`;
        const mediaFiles = getMediaFiles(item);

        if (!map.has(key)) {
          map.set(key, { ...item, mediaFiles: [...mediaFiles] });
          return map;
        }

        const existingItem = map.get(key);
        const existingMediaFiles = getMediaFiles(existingItem);
        const seenUrls = new Set(
          existingMediaFiles
            .map((file) =>
              typeof file === "string"
                ? file
                : getValue(
                    file,
                    "url",
                    "Url",
                    "fileUrl",
                    "FileUrl",
                    "imageUrl",
                    "ImageUrl",
                    "path",
                    "Path"
                  )
            )
            .map(normalizeSearchText)
            .filter(Boolean)
        );

        const newMediaFiles = mediaFiles.filter((file) => {
          const url =
            typeof file === "string"
              ? file
              : getValue(
                  file,
                  "url",
                  "Url",
                  "fileUrl",
                  "FileUrl",
                  "imageUrl",
                  "ImageUrl",
                  "path",
                  "Path"
                );
          const normalizedUrl = normalizeSearchText(url);
          if (!normalizedUrl || seenUrls.has(normalizedUrl)) return false;
          seenUrls.add(normalizedUrl);
          return true;
        });

        map.set(key, {
          ...existingItem,
          mediaFiles: [...existingMediaFiles, ...newMediaFiles],
        });
        return map;
      }, new Map())
      .values()
  );

const getUploadedFilesCount = (item = {}) => {
  const count = getImplementationValue(item, "uploadedFilesCount", "UploadedFilesCount", "mediaFilesCount", "MediaFilesCount");
  return count || getMediaFiles(item).length;
};

// Media file names are stamped like 20260706090035762_<hash>_<id>.jpeg (yyyyMMddHHmmssSSS).
// Many records don't have a populated uploadDate/entereddat field, so this timestamp embedded
// in the file name is the most reliable signal for "when was this actually stored".
const FILENAME_TIMESTAMP_REGEX = /(\d{14,17})/;

const getFileNameFromUrl = (url) => {
  const withoutQuery = String(url || "").split("?")[0];
  const segments = withoutQuery.split("/");
  const lastSegment = segments[segments.length - 1] || "";

  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
};

const parseFileNameTimestamp = (fileName) => {
  const match = String(fileName || "").match(FILENAME_TIMESTAMP_REGEX);
  if (!match) return null;

  const digits = match[1];
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const hour = Number(digits.slice(8, 10) || "0");
  const minute = Number(digits.slice(10, 12) || "0");
  const second = Number(digits.slice(12, 14) || "0");

  const currentYear = new Date().getFullYear();
  if (
    year < 2000 ||
    year > currentYear + 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute, second);
  // Reject rollover dates such as 31-Feb.
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const getLatestFileNameTimestamp = (item = {}) => {
  const timestamps = getImageUrls(item)
    .map((url) => parseFileNameTimestamp(getFileNameFromUrl(url)))
    .filter(Boolean)
    .map((date) => date.getTime());

  return timestamps.length ? new Date(Math.max(...timestamps)) : null;
};

// The date actually used for sorting, display, and filtering: prefer an explicit
// uploadDate/entereddat field when it's valid, otherwise fall back to the newest
// timestamp found among that record's file names.
const getEffectiveUploadDate = (item = {}) => {
  const explicitValue = getImplementationDate(item);

  if (explicitValue) {
    const parsed = new Date(explicitValue);
    const currentYear = new Date().getFullYear();
    // Corrupt values such as year 8794/4652 must not be shown or used to sort.
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getFullYear() >= 2000 &&
      parsed.getFullYear() <= currentYear + 1
    ) {
      return parsed;
    }
  }

  return getLatestFileNameTimestamp(item);
};

const isWithinDateRange = (date, fromValue, toValue) => {
  if (!fromValue && !toValue) return true;
  if (!date) return false;

  const time = date.getTime();

  if (fromValue) {
    const fromTime = new Date(`${fromValue}T00:00:00`).getTime();
    if (!Number.isNaN(fromTime) && time < fromTime) return false;
  }

  if (toValue) {
    const toTime = new Date(`${toValue}T23:59:59.999`).getTime();
    if (!Number.isNaN(toTime) && time > toTime) return false;
  }

  return true;
};

const getEnteredBy = (item = {}) =>
  getImplementationValue(item, "UploadEnteredBy", "uploadEnteredBy", "enteredby", "enteredBy", "entrdby", "Entrdby");

const getImplementorName = (item = {}) =>
  getImplementationValue(
    item,
    "implementorName",
    "ImplementorName",
    "implementerName",
    "ImplementerName",
    "implementationBy",
    "ImplementationBy",
    "assignName",
    "AssignName",
    "assignedTo",
    "AssignedTo",
    "assignedName",
    "AssignedName"
  ) || getEnteredBy(item);

const getImplementorMobile = (item = {}) =>
  getImplementationValue(
    item,
    "implementorMobile",
    "ImplementorMobile",
    "implementorMobileNo",
    "ImplementorMobileNo",
    "implementorPhone",
    "ImplementorPhone",
    "implementerMobile",
    "ImplementerMobile",
    "mobileNo",
    "MobileNo",
    "mobileNumber",
    "MobileNumber",
    "mobile",
    "Mobile",
    "phone",
    "Phone",
    "phoneNo",
    "PhoneNo",
    "contactNo",
    "ContactNo",
    "contactPersonPhone",
    "ContactPersonPhone",
    "contactPhone",
    "ContactPhone"
  );

const getImageType = (item = {}) =>
  getMediaFiles(item)
    .map((mediaFile) => getValue(mediaFile, "imageType", "ImageType"))
    .find(Boolean) || "";

const MONTH_ABBREVIATIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const toDdMmmYyyy = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_ABBREVIATIONS[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? value : toDdMmmYyyy(date);
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${toDdMmmYyyy(date)} ${hours}:${minutes}`;
};

const sanitizePrintTitle = (value) =>
  String(value || "implementation")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120) || "implementation";

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const getDataUrlFromUrl = async (url) => {
  const resourceUrl = String(url || "").trim();
  if (!resourceUrl) throw new Error("Image URL is empty");
  if (/^data:/i.test(resourceUrl)) return resourceUrl;

  const isAbsoluteResource =
    /^(blob):/i.test(resourceUrl) ||
    /^[a-z][a-z\d+.-]*:\/\//i.test(resourceUrl) ||
    resourceUrl.startsWith("//") ||
    resourceUrl.startsWith("/");
  const finalUrl = safeImageUrl(isAbsoluteResource ? resourceUrl : `/${resourceUrl}`);

  if (imageDataUrlCache.has(finalUrl)) {
    return imageDataUrlCache.get(finalUrl);
  }

  const response = await fetch(finalUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Image request failed: ${response.status} ${finalUrl}`);
  }

  const dataUrl = await blobToDataUrl(await response.blob());
  imageDataUrlCache.set(finalUrl, dataUrl);
  return dataUrl;
};

const loadImageElement = (src, { crossOrigin = "anonymous" } = {}) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) image.crossOrigin = crossOrigin;
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image load failed: ${src}`));
    image.src = src;
  });

const imageElementToJpegData = (image) => {
  const width = image.naturalWidth || image.width || 1;
  const height = image.naturalHeight || image.height || 1;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return {
    data: canvas.toDataURL("image/jpeg", 0.92),
    dimensions: { width, height },
  };
};

const dataUrlToExportImage = async (dataUrl) => {
  const image = await loadImageElement(dataUrl, { crossOrigin: "" });
  return imageElementToJpegData(image);
};

const urlToExportImage = async (url) => {
  const resourceUrl = String(url || "").trim();
  if (!resourceUrl) throw new Error("Image URL is empty");

  if (exportImageDataCache.has(resourceUrl)) {
    return exportImageDataCache.get(resourceUrl);
  }

  if (/^data:/i.test(resourceUrl)) {
    const exportImage = await dataUrlToExportImage(resourceUrl);
    exportImageDataCache.set(resourceUrl, exportImage);
    return exportImage;
  }

  try {
    const image = await loadImageElement(resourceUrl, { crossOrigin: "anonymous" });
    const exportImage = imageElementToJpegData(image);
    exportImageDataCache.set(resourceUrl, exportImage);
    return exportImage;
  } catch (imageError) {
    try {
      const dataUrl = await getDataUrlFromUrl(resourceUrl);
      const exportImage = await dataUrlToExportImage(dataUrl);
      exportImageDataCache.set(resourceUrl, exportImage);
      return exportImage;
    } catch (fetchError) {
      throw fetchError || imageError;
    }
  }
};

const getFirstExportImageFromUrl = async (url) => {
  const candidates = getExportImageUrlCandidates(url);
  let lastError = null;

  for (const candidate of candidates) {
    try {
      return await urlToExportImage(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Image could not be prepared for export");
};

const getImageFormat = (dataUrl) => {
  const match = String(dataUrl || "").match(/^data:image\/(png|jpe?g|webp)/i);
  const type = match?.[1]?.toLowerCase();
  if (type === "png") return "PNG";
  if (type === "webp") return "WEBP";
  return "JPEG";
};

const getContainRect = (image, box) => {
  const imageRatio = (image.width || 1) / (image.height || 1);
  const boxRatio = box.w / box.h;

  if (imageRatio > boxRatio) {
    const h = box.w / imageRatio;
    return { x: box.x, y: box.y + (box.h - h) / 2, w: box.w, h };
  }

  const w = box.h * imageRatio;
  return { x: box.x + (box.w - w) / 2, y: box.y, w, h: box.h };
};

const chunkArray = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const getExportInfo = (item = {}) => {
  const jobNo = String(
    getImplementationValue(item, "jobNo", "JobNo", "jobNumber", "JobNumber", "comartJobNo", "ComartJobNo") || ""
  ).trim();
  const storeName = String(
    getImplementationValue(item, "storeName", "StoreName", "salonStoreName", "SalonStoreName", "store", "Store") || ""
  ).trim();
  const uploadDate = getEffectiveUploadDate(item);
  const title = [storeName || "WHATSAPP IMPLEMENTATION", jobNo].filter(Boolean).join(" ").toUpperCase();

  return {
    jobNo: jobNo || "N/A",
    storeName,
    status: getImplementationStatus(item),
    uploadDate: formatDateTime(uploadDate),
    filesCount: getUploadedFilesCount(item) || getImageUrls(item).length,
    enteredBy: getEnteredBy(item),
    implementorName: getImplementorName(item),
    implementorMobile: getImplementorMobile(item),
    imageType: getImageType(item),
    description: getImplementationValue(item, "description", "Description", "remarks", "Remarks"),
    title,
    fileBaseName: sanitizePrintTitle(`${storeName || "WhatsApp_Implementation"}_${jobNo || "Report"}`),
  };
};

const getExportMetaLine = (info) =>
  [
    `Job No: ${info.jobNo}`,
    info.storeName ? `Store: ${info.storeName}` : "",
    `Status: ${info.status}`,
    `Upload Date: ${info.uploadDate}`,
    `Files: ${info.filesCount || 0}`,
    info.implementorName ? `Implementor: ${info.implementorName}` : "",
    info.implementorMobile ? `Mobile: ${info.implementorMobile}` : "",
    info.enteredBy ? `Entered By: ${info.enteredBy}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

const getExportAssets = async () => {
  const [content, cover, logo, thankYou] = await Promise.all([
    getDataUrlFromUrl(exportContentTemplate),
    getDataUrlFromUrl(exportCoverTemplate),
    getDataUrlFromUrl(exportLogo),
    getDataUrlFromUrl(exportThankYouTemplate),
  ]);

  return { content, cover, logo, thankYou };
};

const getDataUrlDimensions = (dataUrl) =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || image.width || 1,
        height: image.naturalHeight || image.height || 1,
      });
    image.onerror = () => resolve({ width: 1, height: 1 });
    image.src = dataUrl;
  });

const getExportImages = async (item = {}, preferredUrls = []) => {
  const urls = uniqueValues(
    (preferredUrls.length ? preferredUrls : getImageUrls(item))
      .map(normalizeImageUrl)
      .filter(Boolean)
  );

  const images = [];

  for (const url of urls) {
    const index = images.length;

    try {
      const exportImage = await getFirstExportImageFromUrl(url);

      images.push({
        data: exportImage.data,
        dimensions: exportImage.dimensions,
        index,
        url,
      });
    } catch (error) {
      console.error("Image export failed:", url, error);

      images.push({
        data: "",
        dimensions: { width: 1, height: 1 },
        error: true,
        index,
        url,
      });
    }
  }

  return images;
};

const getExportImageBoxes = () => {
  const left = 0.72;
  const top = 1.72;
  const width = 11.9;
  const height = 4.72;
  const gap = 0.18;
  const boxWidth = (width - gap) / 2;
  const boxHeight = (height - gap) / 2;

  return [
    { x: left, y: top, w: boxWidth, h: boxHeight },
    { x: left + boxWidth + gap, y: top, w: boxWidth, h: boxHeight },
    { x: left, y: top + boxHeight + gap, w: boxWidth, h: boxHeight },
    { x: left + boxWidth + gap, y: top + boxHeight + gap, w: boxWidth, h: boxHeight },
  ];
};

const addPptBackground = (slide, data) => {
  slide.addImage({ data, x: 0, y: 0, w: EXPORT_SLIDE_WIDTH, h: EXPORT_SLIDE_HEIGHT });
};

const addPptCover = (pptx, assets, info) => {
  const slide = pptx.addSlide();
  addPptBackground(slide, assets.cover);
  slide.addImage({ data: assets.logo, x: 1.58, y: 3.3, w: 3.42, h: 0.86 });
  slide.addText(info.title, {
    x: 5.5,
    y: 3.24,
    w: 7.55,
    h: 0.72,
    bold: true,
    color: "333333",
    fit: "shrink",
    fontFace: "Arial",
    fontSize: 18,
    margin: 0,
  });
};

const addPptImageBox = (pptx, slide, image, box) => {
  slide.addShape(pptx.ShapeType.rect, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    fill: { color: "F8FAFC" },
    line: { color: "D8E0EA", width: 1 },
  });

  if (image?.data) {
    const imageRect = getContainRect(image.dimensions, box);
    slide.addImage({
      data: image.data,
      x: imageRect.x,
      y: imageRect.y,
      w: imageRect.w,
      h: imageRect.h,
    });
  } else {
    slide.addText("Image not available", {
      x: box.x,
      y: box.y + box.h / 2 - 0.12,
      w: box.w,
      h: 0.25,
      align: "center",
      color: "6B778C",
      fontFace: "Arial",
      fontSize: 10,
      margin: 0,
    });
  }

  slide.addText(`Image ${Number(image?.index ?? 0) + 1}`, {
    x: box.x,
    y: box.y + box.h + 0.04,
    w: box.w,
    h: 0.18,
    align: "center",
    color: "6B778C",
    fontFace: "Arial",
    fontSize: 7,
    margin: 0,
  });
};

const addPptContentSlide = (pptx, assets, info, images, pageNo, totalPages) => {
  const slide = pptx.addSlide();
  addPptBackground(slide, assets.content);

  slide.addText(info.title, {
    x: 0.72,
    y: 0.86,
    w: 11.9,
    h: 0.35,
    bold: true,
    color: "111827",
    fit: "shrink",
    fontFace: "Arial",
    fontSize: 15,
    margin: 0,
  });
  slide.addText(getExportMetaLine(info), {
    x: 0.72,
    y: 1.22,
    w: 11.9,
    h: 0.25,
    color: "4B5563",
    fit: "shrink",
    fontFace: "Arial",
    fontSize: 8,
    margin: 0,
  });

  if (images.length) {
    const boxes = getExportImageBoxes();
    images.forEach((image, index) => addPptImageBox(pptx, slide, image, boxes[index]));
  } else {
    slide.addText("No images available for this record.", {
      x: 0.72,
      y: 3.35,
      w: 11.9,
      h: 0.35,
      align: "center",
      color: "6B778C",
      fontFace: "Arial",
      fontSize: 13,
      margin: 0,
    });
  }

  slide.addText(`Page ${pageNo} of ${totalPages}`, {
    x: 11.18,
    y: 6.82,
    w: 1.25,
    h: 0.2,
    align: "right",
    color: "6B778C",
    fontFace: "Arial",
    fontSize: 8,
    margin: 0,
  });
};

const addPptThankYou = (pptx, assets) => {
  const slide = pptx.addSlide();
  addPptBackground(slide, assets.thankYou);
};

const addPdfBackground = (pdf, data) => {
  pdf.addImage(data, getImageFormat(data), 0, 0, EXPORT_SLIDE_WIDTH, EXPORT_SLIDE_HEIGHT);
};

const addPdfCover = (pdf, assets, info) => {
  addPdfBackground(pdf, assets.cover);
  pdf.addImage(assets.logo, getImageFormat(assets.logo), 1.58, 3.3, 3.42, 0.86);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(51, 51, 51);
  const lines = pdf.splitTextToSize(info.title, 7.45).slice(0, 3);
  pdf.text(lines, 5.5, 3.45, { maxWidth: 7.45 });
};

const addPdfImageBox = (pdf, image, box) => {
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(216, 224, 234);
  pdf.rect(box.x, box.y, box.w, box.h, "FD");

  if (image?.data) {
    try {
      const imageRect = getContainRect(image.dimensions, box);
     pdf.addImage(image.data, "JPEG", imageRect.x, imageRect.y, imageRect.w, imageRect.h);
    } catch (error) {
      console.warn("Could not add image to PDF", image.url, error);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(107, 119, 140);
      pdf.text("Image not available", box.x + box.w / 2, box.y + box.h / 2, { align: "center" });
    }
  } else {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(107, 119, 140);
    pdf.text("Image not available", box.x + box.w / 2, box.y + box.h / 2, { align: "center" });
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(107, 119, 140);
  pdf.text(`Image ${Number(image?.index ?? 0) + 1}`, box.x + box.w / 2, box.y + box.h + 0.14, {
    align: "center",
  });
};

const addPdfContentPage = (pdf, assets, info, images, pageNo, totalPages) => {
  addPdfBackground(pdf, assets.content);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(17, 24, 39);
  pdf.text(pdf.splitTextToSize(info.title, 11.9).slice(0, 1), 0.72, 1.04);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(75, 85, 99);
  pdf.text(pdf.splitTextToSize(getExportMetaLine(info), 11.9).slice(0, 2), 0.72, 1.34);

  if (images.length) {
    const boxes = getExportImageBoxes();
    images.forEach((image, index) => addPdfImageBox(pdf, image, boxes[index]));
  } else {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(13);
    pdf.setTextColor(107, 119, 140);
    pdf.text("No images available for this record.", EXPORT_SLIDE_WIDTH / 2, 3.55, { align: "center" });
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(107, 119, 140);
  pdf.text(`Page ${pageNo} of ${totalPages}`, 12.42, 6.98, { align: "right" });
};

const addPdfThankYou = (pdf, assets) => {
  addPdfBackground(pdf, assets.thankYou);
};

const markImageFailed = (event) => {
  event.currentTarget.parentElement?.classList.add("image-load-failed");
};

const downloadPptReport = async (item) => {
  const info = getExportInfo(item);
  const [assets, images] = await Promise.all([
    getExportAssets(),
    getExportImages(item),
  ]);
  const imagePages = chunkArray(images, EXPORT_IMAGES_PER_PAGE);
  const contentPages = imagePages.length ? imagePages : [[]];
  const pptx = new PptxGenJS();

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Comart";
  pptx.company = "Comart";
  pptx.subject = "WhatsApp Implementation Report";
  pptx.title = info.title;
  pptx.lang = "en-US";

  addPptCover(pptx, assets, info);
  contentPages.forEach((pageImages, index) =>
    addPptContentSlide(pptx, assets, info, pageImages, index + 1, contentPages.length)
  );
  addPptThankYou(pptx, assets);

  const pptBlob = await pptx.write("blob");
  const pptUrl = URL.createObjectURL(pptBlob);
  const pptLink = document.createElement("a");
  pptLink.href = pptUrl;
  pptLink.download = `${info.fileBaseName}_implementation.pptx`;
  document.body.appendChild(pptLink);
  pptLink.click();
  setTimeout(() => {
    URL.revokeObjectURL(pptUrl);
    pptLink.remove();
  }, 1000);

  return { missingImages: images.filter((image) => image.error).length };
};

const downloadPdfReport = async (item) => {
  const info = getExportInfo(item);
  const [assets, images] = await Promise.all([
    getExportAssets(),
    getExportImages(item),
  ]);
  const imagePages = chunkArray(images, EXPORT_IMAGES_PER_PAGE);
  const contentPages = imagePages.length ? imagePages : [[]];
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: [EXPORT_SLIDE_WIDTH, EXPORT_SLIDE_HEIGHT],
    compress: true,
  });

  addPdfCover(pdf, assets, info);
  contentPages.forEach((pageImages, index) => {
    pdf.addPage([EXPORT_SLIDE_WIDTH, EXPORT_SLIDE_HEIGHT], "landscape");
    addPdfContentPage(pdf, assets, info, pageImages, index + 1, contentPages.length);
  });
  pdf.addPage([EXPORT_SLIDE_WIDTH, EXPORT_SLIDE_HEIGHT], "landscape");
  addPdfThankYou(pdf, assets);
  const pdfBlob = pdf.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const pdfLink = document.createElement("a");
  pdfLink.href = pdfUrl;
  pdfLink.download = `${info.fileBaseName}_implementation.pdf`;
  document.body.appendChild(pdfLink);
  pdfLink.click();
  setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
    pdfLink.remove();
  }, 1000);

  return { missingImages: images.filter((image) => image.error).length };
};

const getImplementationUploads = async ({
  pageNo = 1,
  jobNo = "",
  storeName = "",
  dateFrom = "",
  dateTo = "",
  signal,
} = {}) => {
  // Use the exact route already present in the user's config.js:
  // https://productionapi.comart.in/api/ImplementationUpload/GetAllWithImages
  const implementationUrl =
    config.ImplementationUpload?.URL?.GetAllWithImages ||
    config.ImplementationUpload?.URL?.GetAllImplementationUpload;

  if (!implementationUrl) {
    throw new Error("GetAllWithImages is missing in config.js.");
  }

  const params = new URLSearchParams({
    page: String(pageNo),
    pageSize: String(PAGE_SIZE),
  });

  if (jobNo.trim()) params.append("jobNo", jobNo.trim());
  if (storeName.trim()) params.append("storeName", storeName.trim());
  if (dateFrom) params.append("dateFrom", dateFrom);
  if (dateTo) params.append("dateTo", dateTo);

  const response = await axios.get(
    `${implementationUrl}?${params.toString()}`,
    { signal }
  );
  const payload = response.data || {};
  const returnedRows = getRowsFromResponse(payload.data || payload);
  const hasServerPaging =
    payload &&
    !Array.isArray(payload) &&
    (
      payload.totalRecords !== undefined ||
      payload.totalCount !== undefined ||
      payload.totalPages !== undefined
    );

  // New backend: use its already-paged result directly.
  // Existing backend: filter/sort/page the returned array so the UI still
  // renders only 12 cards and never loads all images into the DOM.
  const filteredRows = hasServerPaging
    ? returnedRows
    : returnedRows
        .filter((row) => jobMatches(row, jobNo))
        .filter((row) => storeMatches(row, storeName))
        .filter((row) =>
          isWithinDateRange(getEffectiveUploadDate(row), dateFrom, dateTo)
        );

  // The legacy API can return several upload rows for the same job/store.
  // Combine those rows before calculating totals and before applying paging.
  const groupedAndSortedRows = groupImplementationRows(filteredRows)
        .sort((a, b) => {
          const dateA = getEffectiveUploadDate(a)?.getTime() || 0;
          const dateB = getEffectiveUploadDate(b)?.getTime() || 0;
          return dateB - dateA;
        });

  const totalRecords = hasServerPaging
    ? Number(payload.totalRecords ?? payload.totalCount ?? returnedRows.length)
    : groupedAndSortedRows.length;
  const pageSize = Number(payload.pageSize || PAGE_SIZE);
  const startIndex = (pageNo - 1) * pageSize;
  const rows = hasServerPaging
    ? groupedAndSortedRows
    : groupedAndSortedRows.slice(startIndex, startIndex + pageSize);

  return {
    rows,
    page: Number(payload.page || pageNo),
    pageSize,
    totalRecords,
    totalPages: Number(payload.totalPages || Math.max(1, Math.ceil(totalRecords / pageSize))),
  };
};

const WhatsappDashboard = () => {
  const [jobNo, setJobNo] = useState("");
  const [storeName, setStoreName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [implementationData, setImplementationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [searched, setSearched] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [downloadingJobNo, setDownloadingJobNo] = useState("");
  const [downloadingFormat, setDownloadingFormat] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const activeRequestRef = useRef(null);
  const requestNumberRef = useRef(0);

  const loadImplementationData = async (pageNo = 1, overrideFilters = null) => {
    const activeJobNo = overrideFilters?.jobNo ?? jobNo;
    const activeStoreName = overrideFilters?.storeName ?? storeName;
    const activeDateFrom = overrideFilters?.dateFrom ?? dateFrom;
    const activeDateTo = overrideFilters?.dateTo ?? dateTo;

    // React StrictMode and quick page/filter clicks can start a second request.
    // Cancel the older request so its response cannot overwrite the latest page.
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const requestNumber = ++requestNumberRef.current;

    setLoading(true);
    setError(null);
    setNotice(null);
    setSearched(true);

    try {
      const result = await getImplementationUploads({
        pageNo,
        jobNo: activeJobNo,
        storeName: activeStoreName,
        dateFrom: activeDateFrom,
        dateTo: activeDateTo,
        signal: controller.signal,
      });

      if (requestNumber !== requestNumberRef.current) return;

      const groupedRows = Array.from(
        result.rows
          .reduce((map, item) => {
            const itemJobNo = getImplementationValue(
              item,
              "jobNo",
              "JobNo",
              "jobNumber",
              "JobNumber",
              "comartJobNo",
              "ComartJobNo"
            );
            const itemStoreName = getImplementationValue(
              item,
              "storeName",
              "StoreName",
              "salonStoreName",
              "SalonStoreName",
              "store",
              "Store"
            );
            const key = `${normalizeSearchText(itemJobNo)}__${normalizeSearchText(itemStoreName)}`;
            const mediaFiles = getMediaFiles(item);

            if (!map.has(key)) {
              map.set(key, {
                ...item,
                mediaFiles: [...mediaFiles],
              });
              return map;
            }

            const existingItem = map.get(key);
            const existingMediaFiles = getMediaFiles(existingItem);
            const seenUrls = new Set(
              existingMediaFiles
                .map((file) =>
                  typeof file === "string"
                    ? file
                    : getValue(file, "url", "Url", "fileUrl", "FileUrl", "imageUrl", "ImageUrl", "path", "Path")
                )
                .map((url) => normalizeSearchText(url))
                .filter(Boolean)
            );
            const newMediaFiles = mediaFiles.filter((file) => {
              const url =
                typeof file === "string"
                  ? file
                  : getValue(file, "url", "Url", "fileUrl", "FileUrl", "imageUrl", "ImageUrl", "path", "Path");
              const normalizedUrl = normalizeSearchText(url);
              if (!normalizedUrl || seenUrls.has(normalizedUrl)) return false;
              seenUrls.add(normalizedUrl);
              return true;
            });

            map.set(key, {
              ...existingItem,
              mediaFiles: [...existingMediaFiles, ...newMediaFiles],
            });

            return map;
          }, new Map())
          .values()
      );

      // Always show newest-first (last-stored image first), regardless of which API path
      // returned the rows. Falls back to the timestamp embedded in the file name when the
      // record itself has no explicit upload date.
      groupedRows.sort((a, b) => {
        const dateA = getEffectiveUploadDate(a)?.getTime() || 0;
        const dateB = getEffectiveUploadDate(b)?.getTime() || 0;
        return dateB - dateA;
      });

      // This is a safety check. The backend should apply this filter before Skip/Limit.
      const dateFilteredRows = groupedRows.filter((row) =>
        isWithinDateRange(getEffectiveUploadDate(row), activeDateFrom, activeDateTo)
      );

      setImplementationData(dateFilteredRows);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotalRecords(result.totalRecords);

      if (!dateFilteredRows.length) {
        setError(
          activeJobNo.trim() || activeStoreName.trim() || activeDateFrom || activeDateTo
            ? "No recent WhatsApp images found for the selected filters"
            : "No recent WhatsApp images found"
        );
      }
    } catch (err) {
      if (axios.isCancel(err) || err?.code === "ERR_CANCELED") return;
      setError(
        err?.message ||
          err.response?.data?.message ||
          err.response?.data ||
          "Failed to fetch implementation data. Please check API URL and CORS/network response."
      );
      setImplementationData([]);
      setTotalRecords(0);
      setTotalPages(1);
      setPage(1);
    } finally {
      if (requestNumber === requestNumberRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadImplementationData();
    return () => activeRequestRef.current?.abort();
    // Initial page only. Filters load when Search is clicked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadImplementationData(1);
  };

  const handleReset = async () => {
    setJobNo("");
    setStoreName("");
    setDateFrom("");
    setDateTo("");
    setError(null);
    setNotice(null);
    setSelectedItem(null);
    await loadImplementationData(1, { jobNo: "", storeName: "", dateFrom: "", dateTo: "" });
  };

  const handleExportDownload = async (item, format) => {
    const selectedJobNo = getImplementationValue(
      item,
      "jobNo",
      "JobNo",
      "jobNumber",
      "JobNumber",
      "comartJobNo",
      "ComartJobNo"
    );
    const formatLabel = format === "ppt" ? "PPT" : "PDF";

    if (!selectedJobNo) {
      setError(`Job No is required to download ${formatLabel}`);
      return;
    }

    setDownloadingJobNo(selectedJobNo);
    setDownloadingFormat(format);
    setError(null);
    setNotice(null);

    try {
      const result =
        format === "ppt"
          ? await downloadPptReport(item)
          : await downloadPdfReport(item);
      const warning = result.missingImages
        ? ` ${result.missingImages} image(s) could not be embedded and were marked unavailable.`
        : "";
      setNotice(`${formatLabel} downloaded for ${selectedJobNo}.${warning}`);
    } catch (err) {
      console.error(`${formatLabel} download error`, err);
      setError(`Failed to download ${formatLabel}. Please try again.`);
    } finally {
      setDownloadingJobNo("");
      setDownloadingFormat("");
    }
  };

  const handlePdfDownload = (item) => handleExportDownload(item, "pdf");
  const handlePptDownload = (item) => handleExportDownload(item, "ppt");

  const selectedItemJobNo = selectedItem
    ? getImplementationValue(selectedItem, "jobNo", "JobNo", "jobNumber", "JobNumber", "comartJobNo", "ComartJobNo")
    : "";
  const isSelectedPdfDownloading = downloadingJobNo === selectedItemJobNo && downloadingFormat === "pdf";
  const isSelectedPptDownloading = downloadingJobNo === selectedItemJobNo && downloadingFormat === "ppt";
  const isSelectedItemExporting = isSelectedPdfDownloading || isSelectedPptDownloading;

  return (
    <div className="page-wrapper">
      <div className="content container-fluid whatsapp-dashboard">
      <div className="dashboard-page-header">
        <div>
          <h4>WhatsApp Dashboard</h4>
          <p>Check WhatsApp implementation upload status and images.</p>
        </div>
      </div>

      <Card className="mb-4">
        <Card.Header className="whatsapp-dashboard-header">
          <Card.Title className="mb-0">WhatsApp Implementation Dashboard</Card.Title>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Job No</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Filter by Job No"
                    value={jobNo}
                    onChange={(e) => setJobNo(e.target.value)}
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Store Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Filter by Store Name"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Date From</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    disabled={loading}
                    max={dateTo || undefined}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Date To</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    disabled={loading}
                    min={dateFrom || undefined}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={12} className="d-flex justify-content-end">
                <Button
                  variant="primary"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search size={15} className="me-1" />
                      Search
                    </>
                  )}
                </Button>
              </Col>
            </Row>
          </Form>

          {error && <Alert variant="danger">{error}</Alert>}
          {notice && <Alert variant="info">{notice}</Alert>}

          {loading && <Alert variant="info">Loading implementation records...</Alert>}

          {searched && !loading && implementationData.length === 0 && !error && (
            <Alert variant="info">No implementation data found</Alert>
          )}

          <Button variant="outline-secondary" size="sm" onClick={handleReset} className="mb-3">
            <RefreshCw size={14} className="me-1" />
            Reset
          </Button>
        </Card.Body>
      </Card>

      {/* Implementation Data Display */}
      {implementationData.length > 0 && (
        <div className="implementation-results">
          <h5 className="mb-4">
            Showing {implementationData.length} of {totalRecords || implementationData.length} Recent Implementation Record(s)
          </h5>

          <Row className="g-4">
            {implementationData.map((item, index) => {
              const imageUrls = getImageUrls(item);
              const uploadDate = getEffectiveUploadDate(item);
              const uploadedBy = getEnteredBy(item);
              const implementorName = getImplementorName(item);
              const implementorMobile = getImplementorMobile(item);
              const filesCount = getUploadedFilesCount(item);
              const imageType = getImageType(item);
              const itemJobNo = getImplementationValue(
                item,
                "jobNo",
                "JobNo",
                "jobNumber",
                "JobNumber",
                "comartJobNo",
                "ComartJobNo"
              );
              const isPdfDownloading = downloadingJobNo === itemJobNo && downloadingFormat === "pdf";
              const isPptDownloading = downloadingJobNo === itemJobNo && downloadingFormat === "ppt";
              const isExportingItem = isPdfDownloading || isPptDownloading;

              return (
                <Col md={6} lg={4} key={`${getImplementationValue(item, "jobNo", "JobNo")}-${uploadDate}-${index}`}>
                  <Card className="implementation-card h-100">
                    <Card.Body>
                      <Card.Title className="text-truncate">
                        Job: {getImplementationValue(item, "jobNo", "JobNo", "jobNumber", "JobNumber") || "N/A"}
                      </Card.Title>
                      <div className="implementation-details">
                        <p>
                          <strong>Store:</strong>{" "}
                          {getImplementationValue(item, "storeName", "StoreName", "salonStoreName", "SalonStoreName") || "N/A"}
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          <span className="whatsapp-status-pill">
                            {getImplementationStatus(item)}
                          </span>
                        </p>
                        <p>
                          <strong>Date:</strong> {formatDate(uploadDate)}
                        </p>
                        <p>
                          <strong>Implementor Name:</strong> {implementorName || "N/A"}
                        </p>
                        <p>
                          <strong>Mobile Number:</strong> {implementorMobile || "N/A"}
                        </p>
                        <p>
                          <strong>Files:</strong> {filesCount || 0}
                          {imageType && <span className="image-type-text"> {imageType}</span>}
                        </p>
                        {uploadedBy && (
                          <p>
                            <strong>Entered By:</strong> {uploadedBy}
                          </p>
                        )}
                        {getImplementationValue(item, "description", "Description", "remarks", "Remarks") && (
                          <p>
                            <strong>Description:</strong> {getImplementationValue(item, "description", "Description", "remarks", "Remarks")}
                          </p>
                        )}
                      </div>

                      {imageUrls.length > 0 && (
                        <div className="implementation-images mt-3">
                          <strong>Images:</strong>
                          <div className="image-gallery">
                            {imageUrls.slice(0, CARD_PREVIEW_IMAGE_COUNT).map((img, imgIndex) => (
                              <div key={img} className="image-thumbnail">
                                <DashboardImage
                                  src={img}
                                  alt={`Implementation ${index}-${imgIndex}`}
                                  onClick={() => setSelectedItem(item)}
                                />
                                <span className="image-error-text">Image not available</span>
                              </div>
                            ))}
                          </div>
                          {imageUrls.length > CARD_PREVIEW_IMAGE_COUNT && (
                            <button
                              type="button"
                              className="btn btn-link btn-sm px-0 mt-1"
                              onClick={() => setSelectedItem(item)}
                            >
                              View all {imageUrls.length} images
                            </button>
                          )}
                        </div>
                      )}

                      <div className="dashboard-card-actions mt-3">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                        >
                          <Eye size={14} className="me-1" />
                          View Details
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handlePdfDownload(item)}
                          disabled={isExportingItem}
                        >
                          {isPdfDownloading ? (
                            <Spinner animation="border" size="sm" className="me-1" />
                          ) : (
                            <Download size={14} className="me-1" />
                          )}
                          PDF
                        </Button>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handlePptDownload(item)}
                          disabled={isExportingItem}
                        >
                          {isPptDownloading ? (
                            <Spinner animation="border" size="sm" className="me-1" />
                          ) : (
                            <FileText size={14} className="me-1" />
                          )}
                          PPT
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>

          <div className="d-flex justify-content-center align-items-center gap-2 mt-4 mb-4">
            <Button
              variant="outline-primary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => loadImplementationData(page - 1)}
            >
              Previous
            </Button>

            <span className="fw-semibold">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline-primary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => loadImplementationData(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="whatsapp-modal-overlay" onClick={() => setSelectedItem(null)}>
          <Card className="whatsapp-modal-card" onClick={(event) => event.stopPropagation()}>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Card.Title className="mb-0">
                Implementation Details - {getImplementationValue(selectedItem, "jobNo", "JobNo", "jobNumber", "JobNumber")}
              </Card.Title>
              <Button
                variant="light"
                className="dashboard-close-button"
                onClick={() => setSelectedItem(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </Button>
            </Card.Header>
            <Card.Body>
              <div className="detail-content">
                <p>
                  <strong>Job No:</strong> {getImplementationValue(selectedItem, "jobNo", "JobNo", "jobNumber", "JobNumber") || "N/A"}
                </p>
                <p>
                  <strong>Store Name:</strong>{" "}
                  {getImplementationValue(selectedItem, "storeName", "StoreName", "salonStoreName", "SalonStoreName") || "N/A"}
                </p>
                <p>
                  <strong>Status:</strong> {getImplementationStatus(selectedItem)}
                </p>
                <p>
                  <strong>Upload Date:</strong> {formatDateTime(getEffectiveUploadDate(selectedItem))}
                </p>
                <p>
                  <strong>Implementor Name:</strong> {getImplementorName(selectedItem) || "N/A"}
                </p>
                <p>
                  <strong>Mobile Number:</strong> {getImplementorMobile(selectedItem) || "N/A"}
                </p>
                <p>
                  <strong>Files:</strong> {getUploadedFilesCount(selectedItem) || 0}
                </p>
                {getImageType(selectedItem) && (
                  <p>
                    <strong>Image Type:</strong> {getImageType(selectedItem)}
                  </p>
                )}
                {getEnteredBy(selectedItem) && (
                  <p>
                    <strong>Entered By:</strong> {getEnteredBy(selectedItem)}
                  </p>
                )}
                <div className="dashboard-card-actions mb-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handlePdfDownload(selectedItem)}
                    disabled={isSelectedItemExporting}
                  >
                    {isSelectedPdfDownloading ? (
                      <Spinner animation="border" size="sm" className="me-1" />
                    ) : (
                      <Download size={14} className="me-1" />
                    )}
                    Download PDF
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => handlePptDownload(selectedItem)}
                    disabled={isSelectedItemExporting}
                  >
                    {isSelectedPptDownloading ? (
                      <Spinner animation="border" size="sm" className="me-1" />
                    ) : (
                      <FileText size={14} className="me-1" />
                    )}
                    Download PPT
                  </Button>
                </div>

                {/* Display all images in detail view */}
                {getImageUrls(selectedItem).length > 0 && (
                  <div className="mt-4">
                    <h6>Images:</h6>
                    <div className="detail-images">
                      {getImageUrls(selectedItem).map((img, idx) => (
                        <div key={img} className="detail-image-frame">
                          <DashboardImage
                            src={img}
                            alt={`Detail ${idx}`}
                            className="detail-image"
                          />
                          <span className="image-error-text">Image not available</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {getImplementationValue(selectedItem, "description", "Description", "remarks", "Remarks") && (
                  <p className="mt-3">
                    <strong>Description:</strong>
                    <br />
                    {getImplementationValue(selectedItem, "description", "Description", "remarks", "Remarks")}
                  </p>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
};

export default WhatsappDashboard;
