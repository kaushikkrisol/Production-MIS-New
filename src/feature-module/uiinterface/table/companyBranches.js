const branchDirectory = {
  west: {
    companyName: "Commercial Reprographers (MUMBAI)",
    companyAddress:
      "6, Saraswati Mandir, Khan Bahadur Ardeshar Marg, Kennedy Bridge, Nanachowk, Mumbai City, Maharashtra, India, 400007",
    companyPhone: "02271000211",
    companyGst: "27AAAFC4913E1ZW",
    companyLogo: "/assets/img/comart.jpg",
  },
  south: {
    companyName: "Commercial Reprographers (BANGALORE)",
    companyAddress:
      "Ground Floor, TF-302, Corporation No.19/8 PID No 73-75-19/8, Corporation Municipal No.19, 5th Cross Airport Road, Konena Agrahara, Bengaluru, Karnataka, India, 560017",
    companyPhone: "02271000211",
    companyGst: "29AAAFC4913E1ZS",
    companyLogo: "/assets/img/comart.jpg",
  },
  east: {
    companyName: "Commercial Reprographers (Kolkata)",
    companyAddress:
      "1st Floor, B/29 Rajdanga Kasba, Nabapally, Kolkata, West Bengal, India, 700107",
    companyPhone: "02271000211",
    companyGst: "19AAAFC4913E1ZT",
    companyLogo: "/assets/img/comart.jpg",
  },
  north: {
    companyName: "Commercial Reprographers (GURGOAN)",
    companyAddress:
      "1st Floor, Plot No. 388, Udyog Vihar, Phase-IV, Gurgaon, Haryana, India, 122015",
    companyPhone: "02271000211",
    companyGst: "06AAAFC4913E1Z0",
    companyLogo: "/assets/img/comart.jpg",
  },
  southhyd: {
    companyName: "Commercial Reprographers (HYDREBAD)",
    companyAddress:
      "1-3-183/40/118, Beside Saibaba Mandir Arch, Gandhinagar, Hydrabad, Hyderabad, Telangana, India, 500080",
    companyPhone: "02271000211",
    companyGst: "36AAAFC4913E2ZW",
    companyLogo: "/assets/img/comart.jpg",
  },
  chennai: {
    companyName: "Commercial Reprographers (CHENNAI)",
    companyAddress:
      "Old 2, Rukmani Flats Gi, Appu Street, Nungambakkam, Chennai, Tamil Nadu, India, 600034",
    companyPhone: "02271000211",
    companyGst: "33AAAFC4913E1Z3",
    companyLogo: "/assets/img/comart.jpg",
  },
};

const normalizeLocation = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "");

export const getCompanyBranchDetails = (location) => {
  const normalized = normalizeLocation(location);

  if (normalized.includes("southhyd") || normalized.includes("hyd")) {
    return branchDirectory.southhyd;
  }

  if (normalized.includes("chennai")) {
    return branchDirectory.chennai;
  }

  if (normalized.includes("south")) {
    return branchDirectory.south;
  }

  if (normalized.includes("east")) {
    return branchDirectory.east;
  }

  if (normalized.includes("north")) {
    return branchDirectory.north;
  }

  return branchDirectory.west;
};

export default branchDirectory;
