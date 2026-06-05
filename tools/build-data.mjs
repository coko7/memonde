// run with: node tools/build-data.mjs  (from project root)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/countries.json"), "utf8"));

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

const OVERRIDES = {
  VA: { en: "Vatican City", fr: "Cité du Vatican" },
  XK: { fr: "Kosovo" },
  PS: { en: "Palestine" },
};

const ALIASES = {
  AE: { en: ["UAE", "United Arab Emirates"], fr: ["Émirats arabes unis", "EAU"] },
  AG: { en: ["Antigua"], fr: [] },
  BA: { en: ["Bosnia"], fr: ["Bosnie"] },
  BB: { en: ["Barbados"], fr: ["Barbade"] },
  BO: { en: ["Bolivia"], fr: ["Bolivie"] },
  BS: { en: ["Bahamas"], fr: [] },
  CD: { en: ["DRC", "DR Congo", "Congo-Kinshasa", "Democratic Republic of the Congo"], fr: ["RDC", "Congo-Kinshasa", "République démocratique du Congo"] },
  CG: { en: ["Congo-Brazzaville", "Republic of the Congo", "Congo"], fr: ["Congo-Brazzaville", "République du Congo", "Congo"] },
  CI: { en: ["Ivory Coast", "Cote d'Ivoire", "Cote dIvoire"], fr: [] },
  CN: { en: ["China"], fr: ["Chine"] },
  CV: { en: ["Cape Verde"], fr: ["Cap-Vert"] },
  CZ: { en: ["Czechia", "Czech Republic"], fr: ["Tchéquie", "République tchèque"] },
  DE: { en: ["Germany"], fr: ["Allemagne"] },
  DM: { en: ["Dominica"], fr: [] },
  FM: { en: ["Micronesia"], fr: ["Micronésie"] },
  GB: { en: ["UK", "U.K.", "Britain", "Great Britain", "England", "United Kingdom"], fr: ["UK", "Angleterre", "Grande-Bretagne", "Royaume Uni"] },
  GD: { en: ["Grenada"], fr: ["Grenade"] },
  IR: { en: ["Iran"], fr: [] },
  KI: { en: ["Kiribati"], fr: [] },
  KN: { en: ["Saint Kitts", "St Kitts and Nevis"], fr: ["Saint-Christophe-et-Niévès"] },
  KP: { en: ["North Korea", "DPRK"], fr: ["Corée du Nord"] },
  KR: { en: ["South Korea"], fr: ["Corée du Sud"] },
  LC: { en: ["Saint Lucia", "St Lucia"], fr: ["Sainte-Lucie"] },
  MH: { en: ["Marshall Islands"], fr: ["Îles Marshall"] },
  MK: { en: ["North Macedonia", "Macedonia"], fr: ["Macédoine du Nord", "Macédoine"] },
  MM: { en: ["Burma"], fr: ["Birmanie"] },
  NR: { en: ["Nauru"], fr: [] },
  PW: { en: ["Palau"], fr: [] },
  RU: { en: ["Russia"], fr: ["Russie"] },
  SB: { en: ["Solomon Islands"], fr: ["Îles Salomon"] },
  ST: { en: ["Sao Tome"], fr: ["Sao Tome"] },
  SY: { en: ["Syria"], fr: ["Syrie"] },
  SZ: { en: ["Eswatini", "Swaziland"], fr: ["Eswatini", "Swaziland"] },
  TL: { en: ["East Timor", "Timor-Leste"], fr: ["Timor oriental"] },
  TO: { en: ["Tonga"], fr: [] },
  TT: { en: ["Trinidad"], fr: ["Trinité-et-Tobago"] },
  TV: { en: ["Tuvalu"], fr: [] },
  US: { en: ["USA", "U.S.A.", "America", "United States of America"], fr: ["USA", "États-Unis d'Amérique"] },
  VA: { en: ["Vatican"], fr: ["Vatican"] },
  VC: { en: ["Saint Vincent", "St Vincent and the Grenadines"], fr: ["Saint-Vincent-et-les-Grenadines"] },
  VE: { en: ["Venezuela"], fr: [] },
  VU: { en: ["Vanuatu"], fr: [] },
  WS: { en: ["Samoa"], fr: [] },
};

function continentOf(c) {
  if (c.region === "Americas")
    return c.subregion === "South America" ? "South America" : "North America";
  return c.region;
}

const out = raw
  .filter(c => INCLUDE.has(c.iso2))
  .map(c => {
    const o = OVERRIDES[c.iso2] || {};
    return {
      iso2: c.iso2,
      numeric: parseInt(c.numeric_code, 10),
      continent: continentOf(c),
      name: {
        en: o.en ?? c.name,
        fr: o.fr ?? (c.translations?.fr || c.name),
      },
      aliases: ALIASES[c.iso2] || { en: [], fr: [] },
    };
  });

if (out.length !== 197) throw new Error(`Expected 197, got ${out.length}`);
for (const c of out) {
  if (!c.name.en) throw new Error(`Missing EN name for ${c.iso2}`);
  if (!c.name.fr) throw new Error(`Missing FR name for ${c.iso2}`);
}

// Continent counts
const counts = {};
for (const c of out) counts[c.continent] = (counts[c.continent] || 0) + 1;
console.log("Continent counts:", counts);
console.log("Total:", out.length);

fs.writeFileSync(
  path.join(__dirname, "../data/countries.js"),
  "window.COUNTRIES = " + JSON.stringify(out, null, 2) + ";\n"
);
console.log("Wrote data/countries.js");
