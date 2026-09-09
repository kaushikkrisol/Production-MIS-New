export const COMPANY_LOGO = "/assets/img/logo-comart.png";

const branchDirectory = {
  west: {
    companyName: "Commercial Reprographers (MUMBAI)",
    companyAddress:
      "6, Saraswati Mandir, Khan Bahadur Ardeshar Marg, Kennedy Bridge, Nanachowk, Mumbai City, Maharashtra, India, 400007",
    companyPhone: "02271000211",
    companyGst: "27AAAFC4913E1ZW",
    companyLogo: COMPANY_LOGO,
    bankDetails: {
      bankName: "",
      branch: "",
      accountNo: "",
      ifsc: "",
      upiId: "",
    },
  },
  south: {
    companyName: "Commercial Reprographers (BANGALORE)",
    companyAddress:
      "Ground Floor, TF-302, Corporation No.19/8 PID No 73-75-19/8, Corporation Municipal No.19, 5th Cross Airport Road, Konena Agrahara, Bengaluru, Karnataka, India, 560017",
    companyPhone: "02271000211",
    companyGst: "29AAAFC4913E1ZS",
    companyLogo: COMPANY_LOGO,
    bankDetails: {
      bankName: "",
      branch: "",
      accountNo: "",
      ifsc: "",
      upiId: "",
    },
  },
  east: {
    companyName: "Commercial Reprographers (Kolkata)",
    companyAddress:
      "1st Floor, B/29 Rajdanga Kasba, Nabapally, Kolkata, West Bengal, India, 700107",
    companyPhone: "02271000211",
    companyGst: "19AAAFC4913E1ZT",
    companyLogo: COMPANY_LOGO,
    bankDetails: {
      bankName: "",
      branch: "",
      accountNo: "",
      ifsc: "",
      upiId: "",
    },
  },
  north: {
    companyName: "Commercial Reprographers (GURGOAN)",
    companyAddress:
      "1st Floor, Plot No. 388, Udyog Vihar, Phase-IV, Gurgaon, Haryana, India, 122015",
    companyPhone: "02271000211",
    companyGst: "06AAAFC4913E1Z0",
    companyLogo: COMPANY_LOGO,
    bankDetails: {
      bankName: "",
      branch: "",
      accountNo: "",
      ifsc: "",
      upiId: "",
    },
  },
  southhyd: {
    companyName: "Commercial Reprographers (HYDREBAD)",
    companyAddress:
      "1-3-183/40/118, Beside Saibaba Mandir Arch, Gandhinagar, Hydrabad, Hyderabad, Telangana, India, 500080",
    companyPhone: "02271000211",
    companyGst: "36AAAFC4913E2ZW",
    companyLogo: COMPANY_LOGO,
    bankDetails: {
      bankName: "",
      branch: "",
      accountNo: "",
      ifsc: "",
      upiId: "",
    },
  },
  chennai: {
    companyName: "Commercial Reprographers (CHENNAI)",
    companyAddress:
      "Old 2, Rukmani Flats Gi, Appu Street, Nungambakkam, Chennai, Tamil Nadu, India, 600034",
    companyPhone: "02271000211",
    companyGst: "33AAAFC4913E1Z3",
    companyLogo: COMPANY_LOGO,
    bankDetails: {
      bankName: "",
      branch: "",
      accountNo: "",
      ifsc: "",
      upiId: "",
    },
  },
};

const normalizeLocation = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "");

const matchesAnyLocation = (normalized, values = []) =>
  values.some((value) => normalized.includes(normalizeLocation(value)));

export const getCompanyBranchDetails = (location) => {
  const normalized = normalizeLocation(location);

  if (
    matchesAnyLocation(normalized, [
      "southhyd",
      "hyd",
      "hyderabad",
      "hydrabad",
      "telangana",
    ])
  ) {
    return branchDirectory.southhyd;
  }

  if (
    matchesAnyLocation(normalized, [
      "chennai",
      "tamil nadu",
      "tamilnadu",
      "nungambakkam",
    ])
  ) {
    return branchDirectory.chennai;
  }

  if (
    matchesAnyLocation(normalized, [
      "south",
      "bangalore",
      "bengaluru",
      "karnataka",
      "konena agrahara",
    ])
  ) {
    return branchDirectory.south;
  }

  if (
    matchesAnyLocation(normalized, [
      "east",
      "kolkata",
      "west bengal",
      "westbengal",
      "nabapally",
      "rajdanga",
      "kasba",
    ])
  ) {
    return branchDirectory.east;
  }

  if (
    matchesAnyLocation(normalized, [
      "north",
      "gurgaon",
      "gurugram",
      "haryana",
      "udyog vihar",
    ])
  ) {
    return branchDirectory.north;
  }

  if (
    matchesAnyLocation(normalized, [
      "west",
      "mumbai",
      "maharashtra",
      "nanachowk",
      "kennedy bridge",
    ])
  ) {
    return branchDirectory.west;
  }

  return branchDirectory.west;
};

export default branchDirectory;
