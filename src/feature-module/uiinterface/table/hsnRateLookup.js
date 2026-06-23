import hsnRateData from "../../../core/json/hsnRateData.json";

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

export const buildChallanItemPricing = (row) => {
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
  const { hsnCode, unitPrice: lookupUnitPrice, media } = getHsnRateDetails(mediaSource, fallbackHsnCode);
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
