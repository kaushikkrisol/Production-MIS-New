import hsnRateData from "../../../core/json/hsnRateData.json";
import productRateData from "../../../core/json/productRateData.json";
import { normalizeCustomerName } from "./customerFallbacks";

const productKey = (value) => String(value || "").toLowerCase()
  .replace(/self adhesive vinyl/g, "sav")
  .replace(/front\s*lit/g, "")
  .replace(/sun\s*board/g, "sb")
  .replace(/(\d+)\s*mm/g, "$1mm")
  .replace(/\bmounting\b/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim().split(/\s+/).filter(Boolean).sort().join(" ");

const findCustomerProduct = (row, customer, media) => {
  const customerName = normalizeCustomerName(customer?.customeR_NAME || customer?.customerName || row?.customerName || row?.client);
  if (!customerName) return null;
  const candidates = productRateData.filter((item) => normalizeCustomerName(item.customerName) === customerName);
  const keys = [productKey(media)];
  if (/\bsav\b/i.test(media || "") && /\d+\s*mm\s*(sb|sun\s*board)/i.test(media || "") &&
      /^(glossy|gloss|matt|matte)$/i.test(String(row?.lamination || "").trim())) {
    keys.push(productKey(`${media} lamination`));
  }
  // Prefer the complete specification including lamination.
  for (const key of keys.reverse()) {
    const matches = candidates.filter((item) => [item.productAsPerRateCard, item.simplifiedProductName].some((name) => productKey(name) === key));
    if (!matches.length) continue;
    const rates = new Set(matches.map((item) => Number(item.ratePerSqft)));
    if (rates.size === 1 && Number.isFinite([...rates][0]) && [...rates][0] > 0) return matches[0];
    return null;
  }
  return null;
};

const normalizeMedia = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const roundAmount = (value) => Math.round((Number(value) || 0) * 100) / 100;

const firstNumber = (...values) => {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 0;
};

const getSqFt = (row) => {
  const directSqFt = firstNumber(
    row?.totalSqFt,
    row?.TotalSqFt,
    row?.totalSqft,
    row?.TotalSqft,
    row?.["Total Sq.ft"],
    row?.["Total Sq.Ft"],
    row?.ActualSqFt,
    row?.actualSqFt,
    row?.sqft,
    row?.Sqft,
    row?.SQFT
  );
  if (directSqFt > 0) return roundAmount(directSqFt);

  const width = firstNumber(row?.width, row?.Width, row?.W);
  const height = firstNumber(row?.height, row?.Height, row?.length, row?.Length, row?.H);
  const quantity = firstNumber(row?.qty, row?.Qty, row?.QTY, row?.quantity, row?.Quantity);

  if (width > 0 && height > 0 && quantity > 0) {
    return roundAmount((width * height * quantity) / 144);
  }

  return 0;
};

const hsnRateMap = new Map(
  hsnRateData.map((item) => [
    normalizeMedia(item.media),
    {
      media: item.media,
      hsnCode: String(item.hsnCode || "").trim(),
      unitPrice: Number(item.ratePerSqft || 0),
    },
  ])
);

const findFuzzyRateMatch = (media) => {
  const normalizedMedia = normalizeMedia(media);
  if (!normalizedMedia) return null;

  return hsnRateData
    .map((item) => ({
      media: item.media,
      normalizedMedia: normalizeMedia(item.media),
      hsnCode: String(item.hsnCode || "").trim(),
      unitPrice: Number(item.ratePerSqft || 0),
    }))
    .filter(
      (item) =>
        item.normalizedMedia.length >= 4 &&
        (normalizedMedia.includes(item.normalizedMedia) ||
          item.normalizedMedia.includes(normalizedMedia))
    )
    .sort((a, b) => b.normalizedMedia.length - a.normalizedMedia.length)[0];
};

export const formatAmount = (value) => roundAmount(value).toFixed(2);

export const getHsnRateDetails = (media, fallbackHsnCode = "") => {
  const matched = hsnRateMap.get(normalizeMedia(media)) || findFuzzyRateMatch(media);

  return {
    hsnCode: matched?.hsnCode || String(fallbackHsnCode || "").trim(),
    unitPrice: roundAmount(matched?.unitPrice || 0),
    media: matched?.media || "",
  };
};

export const buildChallanItemPricing = (row, customer) => {
  const quantity = firstNumber(row?.qty, row?.Qty, row?.QTY, row?.quantity, row?.Quantity);
  const fallbackHsnCode =
    row?.hsnCode ??
    row?.HsnCode ??
    row?.HSNCode ??
    row?.hsn ??
    row?.HSN ??
    row?.["HSN Code"] ??
    row?.["HSN CODE"] ??
    "";
  const rowRate = firstNumber(row?.rate, row?.Rate, row?.unitPrice, row?.UnitPrice, row?.ratePerSqft, row?.RatePerSqft);
  const rowAmount = firstNumber(row?.amount, row?.Amount, row?.lineJobValue, row?.LineJobValue, row?.jobValue, row?.JobValue);
  const mediaSource =
    row?.media ||
    row?.Media ||
    row?.externalMedia ||
    row?.ExternalMedia ||
    row?.internalMedia ||
    row?.InternalMedia ||
    row?.nameSubCode ||
    row?.NameSubCode ||
    row?.description ||
    row?.Description ||
    row?.details ||
    row?.Details;
  const product = findCustomerProduct(row, customer, mediaSource);
  const productHsnMedia = product?.simplifiedProductName
    ?.replace(/frontlit/gi, "Front Lit")
    .replace(/\s+\d+\s*mm\s*SB\b/gi, "").trim();
  const lookup = getHsnRateDetails(productHsnMedia || mediaSource, fallbackHsnCode);
  const hsnCode = String(fallbackHsnCode || product?.hsnCode || lookup.hsnCode || "").trim();
  const lookupUnitPrice = product ? Number(product.ratePerSqft) : lookup.unitPrice;
  const media = product?.simplifiedProductName || lookup.media;
  const totalSqFt = getSqFt(row);
  const unitPrice = rowRate || (totalSqFt > 0 && rowAmount > 0 ? roundAmount(rowAmount / totalSqFt) : lookupUnitPrice);
  const lineJobValue = rowAmount || roundAmount(unitPrice * totalSqFt);

  return {
    hsnCode,
    media,
    unitPrice,
    quantity,
    totalSqFt,
    lineJobValue,
  };
};

export const getCommonHsnCode = (items) => {
  const uniqueHsn = [...new Set((items || []).map((item) => item.hsnCode).filter(Boolean))];
  return uniqueHsn.length === 1 ? uniqueHsn[0] : "";
};

export const getTotalJobValue = (items) =>
  roundAmount((items || []).reduce((sum, item) => sum + Number(item.lineJobValue || 0), 0));
