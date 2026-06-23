const fallbackCustomers = [
  {
    customeR_ID: 523,
    customeR_NAME: "FSN E-Commerce Ventures",
    contacT_PERSON: "Vinit Shirsath",
    billinG_ADD1:
      "A-1, 135 SHAH AND NAHAR INDUSTRIAL ESTATE DHANRAJ SITARAM JADHAV MARG",
    billinG_ADD2: "LOWER PAREL,",
    gsT_NO: "27AABCF9661J1Z8",
    billinG_CITY: "Mumbai",
    billinG_PINCODE: "400013",
    statemasteR_ID: 25,
  },
  {
    customeR_ID: 762,
    customeR_NAME: "Loreal India",
    contacT_PERSON: "Prasad Malekar",
    billinG_ADD1: "MARATHON FUTUREX. A WING,",
    billinG_ADD2: "8TH FLOOR, N.M JOSHI MARG, ,LOWER PAREL,",
    gsT_NO: "27AAACL0738K1ZH",
    billinG_CITY: "Mumbai",
    billinG_PINCODE: "400013",
    statemasteR_ID: 25,
  },
];

const getCustomerKey = (customer) =>
  String(
    customer?.customeR_ID ?? customer?.CustomerId ?? customer?.CUSTOMER_ID ?? ""
  ).trim();

const normalizeText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const mergeFallbackCustomers = (customers) => {
  const merged = new Map();

  fallbackCustomers.forEach((customer) => {
    const key = getCustomerKey(customer);
    if (key) merged.set(key, customer);
  });

  (Array.isArray(customers) ? customers : []).forEach((customer) => {
    const key = getCustomerKey(customer);
    if (key) {
      merged.set(key, { ...merged.get(key), ...customer });
    }
  });

  return Array.from(merged.values());
};

export const findCustomerRecord = (customers, source = {}) => {
  const customerList = Array.isArray(customers) ? customers : [];
  const candidateIds = [
    source?.customeR_ID,
    source?.customerId,
    source?.customerid,
    source?.CUSTOMER_ID,
    source?.customer_id,
    source?.CustomerId,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  const byId = customerList.find((customer) => {
    const customerId = getCustomerKey(customer);
    return customerId && candidateIds.includes(customerId);
  });

  if (byId) return byId;
  if (candidateIds.length) return null;

  const candidateNames = [
    source?.customeR_NAME,
    source?.customerName,
    source?.customername,
    source?.clientName,
    source?.client,
    source?.subClient,
  ]
    .map(normalizeText)
    .filter(Boolean);

  return (
    customerList.find((customer) => {
      const customerName = normalizeText(customer?.customeR_NAME);
      return (
        customerName &&
        candidateNames.some((name) => name === customerName)
      );
    }) || null
  );
};

export default fallbackCustomers;
