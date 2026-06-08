// run with: node tools/build-data.mjs  (from project root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/countries.json"), "utf8"));

// Here we define all the territories we want to include as individual countries in the output data
const INCLUDE = new Set([
  // Africa (54)
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CD", "CG", "CI", "DJ", "EG",
  "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML",
  "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD",
  "TZ", "TG", "TN", "UG", "ZM", "ZW",
  // Asia (48)
  "AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "CY", "GE", "IN", "ID", "IR", "IQ", "IL",
  "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MY", "MV", "MN", "MM", "NP", "KP", "OM", "PK", "PS",
  "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW", "TJ", "TH", "TL", "TR", "TM", "AE", "UZ", "VN", "YE",
  // Europe (44)
  "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IS", "IE", "IT", "XK", "LV", "LI", "LT", "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL",
  "PT", "RO", "RU", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "UA", "GB", "VA",
  // North America (23)
  "AG", "BS", "BB", "BZ", "CA", "CR", "CU", "DM", "DO", "SV", "GD", "GT", "HT", "HN", "JM", "MX",
  "NI", "PA", "KN", "LC", "VC", "TT", "US",
  // South America (12)
  "AR", "BO", "BR", "CL", "CO", "EC", "GY", "PY", "PE", "SR", "UY", "VE",
  // Oceania (14)
  "AU", "FJ", "KI", "MH", "FM", "NR", "NZ", "PW", "PG", "WS", "SB", "TO", "TV", "VU",
]);

// To fix some typos in the original JSON dataset, we define custom overrides for some entries
const OVERRIDES = {
  VA: { en: "Vatican City", fr: "Cité du Vatican" },
  XK: { fr: "Kosovo" },
  PS: { en: "Palestine" },
};

// Aliases will be used to make the user experience more enjoyable
const ALIASES = {
  AE: { en: ["UAE", "United Arab Emirates"], fr: ["EAU", "Émirats arabes unis"] },
  AG: { en: ["Antigua"], fr: ["Antigua", "Antigue", "Antigue-et-Barbude"] },
  BA: { en: ["Bosnia"], fr: ["Bosnie"] },
  BB: { en: ["Barbados"], fr: ["Barbade"] },
  BF: { en: ["Burkina"], fr: ["Burkina"] },
  BO: { en: ["Bolivia"], fr: ["Bolivie"] },
  BS: { en: ["Bahamas"], fr: ["Bahamas"] },
  BY: { en: ["Byelorussia", "Belorussia"], fr: ["Bielorussie"] },
  CD: { en: ["DRC", "DR Congo", "Congo-Kinshasa", "Democratic Republic of the Congo"], fr: ["RDC", "Congo-Kinshasa", "République démocratique du Congo"] },
  CF: { en: ["CAR", "Central Africa"], fr: ["RCA", "Centrafrique"] },
  CG: { en: ["Congo-Brazzaville", "Republic of the Congo", "Congo"], fr: ["Congo-Brazzaville", "République du Congo", "Congo"] },
  CI: { en: ["Ivory Coast", "Cote d'Ivoire", "Ivory"], fr: ["Ivoire"] },
  CN: { en: ["China"], fr: ["Chine"] },
  CV: { en: ["Cape Verde", "Cabo Verde"], fr: ["Cap-Vert"] },
  CZ: { en: ["Czechia", "Czech Republic"], fr: ["Tchéquie", "République tchèque"] },
  DE: { en: ["Germany"], fr: ["Allemagne"] },
  DM: { en: [], fr: ["Dominique"] },
  DO: { en: ["Dominican Rep", "Dom Rep", "DR"], fr: ["Rep Dominicaine", "Dominicaine"] },
  FJ: { en: ["Fidji", "Fiji"], fr: ["Fidji", "Fiji"] },
  FM: { en: ["Micronesia"], fr: ["Micronésie"] },
  GB: { en: ["UK", "Britain", "Great Britain", "England", "United Kingdom"], fr: ["UK", "Angleterre", "Grande-Bretagne", "Royaume Uni"] },
  GD: { en: ["Grenada"], fr: ["Grenade"] },
  GM: { en: ["Gambia"], fr: ["Gambie"] },
  GQ: { en: ["Equat Guinea", "Guinea Equat"], fr: ["Equat Guinée", "Guinée Equat"] },
  KG: { en: [], fr: ["Kirghizistan", "Kirghizie", "Kirghizstan"] },
  KN: { en: ["Saint Kitts", "St Kitts", "St Kitts and Nevis"], fr: ["Saint-Christophe-et-Niévès", "Saint Christophe", "St Christophe"] },
  KP: { en: ["North Korea", "DPRK"], fr: ["Corée du Nord"] },
  KR: { en: ["South Korea"], fr: ["Corée du Sud"] },
  LC: { en: ["Saint Lucia", "St Lucia"], fr: ["Sainte-Lucie", "St Lucie"] },
  LK: { en: ["Ceylon"], fr: ["Ceylan"] },
  MH: { en: ["Marshall Islands", "Marshall"], fr: ["Îles Marshall", "Marshall"] },
  MK: { en: ["North Macedonia", "Macedonia"], fr: ["Macédoine du Nord", "Macédoine"] },
  MM: { en: ["Burma"], fr: ["Birmanie"] },
  NL: { en: ["Holland"], fr: ["Hollande"] },
  NR: { en: ["Nauru"], fr: ["Nauru"] },
  PG: { en: ["PNG", "Papua"], fr: ["Papouasie", "PNG"] },
  PW: { en: ["Palau"], fr: ["Palaos"] },
  RU: { en: ["Russia"], fr: ["Russie"] },
  SA: { en: ["Saudi", "KSA"], fr: ["Arabie Saoudite", "Arabie"] },
  SB: { en: ["Solomon Islands", "Solomon"], fr: ["Îles Salomon", "Salomon"] },
  SG: { en: [], fr: ["Singapour"] },
  SL: { en: ["Sierra"], fr: [] },
  SS: { en: ["Sth Sudan", "S Sudan"], fr: ["Soudan Sud", "Soudan S"] },
  ST: { en: ["Sao Tome"], fr: ["Sao Tome"] },
  SV: { en: ["Salvador"], fr: ["Salvador"] },
  SY: { en: ["Syria"], fr: ["Syrie"] },
  SZ: { en: ["Eswatini", "Swaziland"], fr: ["Eswatini", "Swaziland"] },
  TL: { en: ["East Timor", "Timor-Leste", "Timor"], fr: ["Timor oriental", "Timor"] },
  TO: { en: ["Tonga"], fr: ["Tonga"] },
  TR: { en: ["Turkey", "Turkiye"], fr: ["Turquie"] },
  TT: { en: ["Trinidad"], fr: ["Trinité-et-Tobago", "Trinité"] },
  TV: { en: ["Tuvalu"], fr: ["Tuvalu"] },
  US: { en: ["USA", "America", "United States of America"], fr: ["USA", "États-Unis d'Amérique"] },
  VA: { en: ["Vatican"], fr: ["Vatican"] },
  VC: { en: ["Saint Vincent", "St Vincent and the Grenadines", "St Vincent"], fr: ["Saint-Vincent-et-les-Grenadines", "Saint Vincent", "St Vincent"] },
  VE: { en: ["Venezuela"], fr: ["Venezuela"] },
  VN: { en: ["Viet Nam"], fr: ["Viet Nam"] },
  VU: { en: ["Vanuatu"], fr: ["Vanuatu"] },
  WS: { en: ["Samoa"], fr: ["Samoa"] },
  ZA: { en: ["Sth Africa", "S Africa"], fr: ["Afrique Sud", "Afrique S"] },
};

function continentOf(c) {
  // Because "South America" and "North America" are not regions but subregions
  if (c.region === "Americas")
    return c.subregion === "South America" ? "South America" : "North America";
  return c.region;
}

// Build output data
const out = raw
  .filter(country => INCLUDE.has(country.iso2))
  .map(country => {
    // If the country has an override, we use it:
    const override = OVERRIDES[country.iso2] || {};
    return {
      iso2: country.iso2,
      numeric: parseInt(country.numeric_code, 10),
      continent: continentOf(country),
      name: {
        en: override.en ?? country.name,
        fr: override.fr ?? (country.translations?.fr || country.name),
      },
      aliases: ALIASES[country.iso2] || { en: [], fr: [] },
    };
  });

// Validate output data before writing
if (out.length !== 197) throw new Error(`Expected 197, got ${out.length}`);
for (const country of out) {
  if (!country.name.en) throw new Error(`Missing EN name for ${country.iso2}`);
  if (!country.name.fr) throw new Error(`Missing FR name for ${country.iso2}`);
}

// Compute number of countries per continent
const counts = {};
for (const country of out) {
  const continent = country.continent;
  counts[continent] = (counts[continent] || 0) + 1;
}

console.log("Continent counts:", counts);
console.log("Total:", out.length);

fs.writeFileSync(
  path.join(__dirname, "../data/countries.js"),
  "window.COUNTRIES = " + JSON.stringify(out, null, 2) + ";\n"
);
console.log("Wrote data/countries.js");
