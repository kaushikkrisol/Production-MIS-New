import hsnRateData from "../../../core/json/hsnRateData.json";

const normalizeMedia = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const roundAmount = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getSqFt = (row) => {
  const directSqFt = Number(row?.totalSqFt ?? row?.ActualSqFt ?? 0);
  if (directSqFt > 0) return roundAmount(directSqFt);

  const width = Number(row?.width || 0);
  const height = Number(row?.height ?? row?.length ?? 0);
  const quantity = Number(row?.qty || 0);

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

export const formatAmount = (value) => roundAmount(value).toFixed(2);

export const getHsnRateDetails = (media, fallbackHsnCode = "") => {
  const matched = hsnRateMap.get(normalizeMedia(media));

  return {
    hsnCode: matched?.hsnCode || String(fallbackHsnCode || "").trim(),
    unitPrice: roundAmount(matched?.unitPrice || 0),
  };
};

export const buildChallanItemPricing = (row) => {
  const quantity = Number(row?.qty || 0);
  const { hsnCode, unitPrice } = getHsnRateDetails(row?.media, row?.hsnCode);
  const totalSqFt = getSqFt(row);
  const lineJobValue = roundAmount(unitPrice * totalSqFt);

  return {
    hsnCode,
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
