export interface Compound {
  id: string;
  name: string;
  formula: string;
  description: string;
  color: string;
}

export const compounds: Compound[] = [
  {
    id: "h2o",
    name: "Air",
    formula: "H₂O",
    description:
      "Senyawa penting untuk kehidupan, terdiri dari hidrogen dan oksigen",
    color: "hsl(197 71% 52%)",
  },
  {
    id: "nacl",
    name: "Garam Dapur",
    formula: "NaCl",
    description: "Natrium klorida, digunakan sebagai bumbu masakan",
    color: "hsl(0 0% 90%)",
  },
  {
    id: "co2",
    name: "Karbon Dioksida",
    formula: "CO₂",
    description: "Gas yang dihasilkan dari respirasi dan pembakaran",
    color: "hsl(0 0% 60%)",
  },
  {
    id: "h2so4",
    name: "Asam Sulfat",
    formula: "H₂SO₄",
    description: "Asam kuat yang digunakan dalam industri",
    color: "hsl(48 100% 50%)",
  },
  {
    id: "o2",
    name: "Oksigen",
    formula: "O₂",
    description: "Gas penting untuk respirasi makhluk hidup",
    color: "hsl(197 71% 73%)",
  },
  {
    id: "ch4",
    name: "Metana",
    formula: "CH₄",
    description: "Gas alam yang digunakan sebagai bahan bakar",
    color: "hsl(120 40% 60%)",
  },
  {
    id: "nh3",
    name: "Amonia",
    formula: "NH₃",
    description: "Senyawa nitrogen dengan bau menyengat",
    color: "hsl(280 50% 60%)",
  },
  {
    id: "c6h12o6",
    name: "Glukosa",
    formula: "C₆H₁₂O₆",
    description: "Gula sederhana yang merupakan sumber energi utama",
    color: "hsl(30 80% 70%)",
  },
  {
    id: "hcl",
    name: "Asam Klorida",
    formula: "HCl",
    description: "Asam kuat yang terdapat dalam lambung",
    color: "hsl(60 90% 60%)",
  },
  {
    id: "cao",
    name: "Kalsium Oksida",
    formula: "CaO",
    description: "Kapur tohor yang digunakan dalam konstruksi",
    color: "hsl(0 0% 95%)",
  },
  {
    id: "c2h5oh",
    name: "Etanol",
    formula: "C₂H₅OH",
    description: "Alkohol yang terdapat dalam minuman beralkohol",
    color: "hsl(180 50% 70%)",
  },
  {
    id: "fe2o3",
    name: "Besi Oksida",
    formula: "Fe₂O₃",
    description: "Karat yang terbentuk pada besi",
    color: "hsl(15 70% 45%)",
  },
];

export interface CompoundReaction {
  compound1: string;
  compound2: string;
  result: {
    name: string;
    formula: string;
    description: string;
    color: string;
  };
}

export const reactions: CompoundReaction[] = [
  {
    compound1: "h2o",
    compound2: "co2",
    result: {
      name: "Asam Karbonat",
      formula: "H₂CO₃",
      description: "Asam lemah yang terbentuk ketika CO₂ larut dalam air",
      color: "hsl(197 60% 55%)",
    },
  },
  {
    compound1: "nacl",
    compound2: "h2o",
    result: {
      name: "Larutan Garam",
      formula: "NaCl(aq)",
      description: "Air garam yang bersifat konduktif",
      color: "hsl(197 50% 65%)",
    },
  },
  {
    compound1: "cao",
    compound2: "h2o",
    result: {
      name: "Kalsium Hidroksida",
      formula: "Ca(OH)₂",
      description: "Kapur mati yang digunakan dalam konstruksi",
      color: "hsl(0 0% 92%)",
    },
  },
  {
    compound1: "ch4",
    compound2: "o2",
    result: {
      name: "Produk Pembakaran",
      formula: "CO₂ + H₂O",
      description: "Hasil pembakaran sempurna metana menghasilkan CO₂ dan air",
      color: "hsl(20 80% 60%)",
    },
  },
  {
    compound1: "nh3",
    compound2: "h2o",
    result: {
      name: "Amonium Hidroksida",
      formula: "NH₄OH",
      description: "Larutan basa lemah dari amonia dalam air",
      color: "hsl(280 40% 65%)",
    },
  },
  {
    compound1: "hcl",
    compound2: "nh3",
    result: {
      name: "Amonium Klorida",
      formula: "NH₄Cl",
      description: "Garam yang terbentuk dari reaksi asam-basa",
      color: "hsl(0 0% 85%)",
    },
  },
];

export const findReaction = (
  id1: string,
  id2: string
): CompoundReaction | undefined => {
  return reactions.find(
    (r) =>
      (r.compound1 === id1 && r.compound2 === id2) ||
      (r.compound1 === id2 && r.compound2 === id1)
  );
};
