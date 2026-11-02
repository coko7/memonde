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
  AE: { en: ["UAE", "Emirates", "United Arab Emirates"], fr: ["EAU", "Émirats", "Émirats arabes unis"] },
  AG: { en: ["Antigua", "Barbuda"], fr: ["Antigua", "Antigue", "Antigue-et-Barbude", "Barbude"] },
  BA: { en: ["Bosnia"], fr: ["Bosnie"] },
  BB: { en: ["Barbados"], fr: ["Barbade"] },
  BF: { en: ["Burkina"], fr: ["Burkina"] },
  BO: { en: ["Bolivia"], fr: ["Bolivie"] },
  BS: { en: ["Bahamas"], fr: ["Bahamas"] },
  BY: { en: ["Byelorussia", "Belorussia"], fr: ["Bielorussie"] },
  CD: { en: ["DRC", "DR Congo", "Congo-Kinshasa", "Democratic Republic of the Congo"], fr: ["RDC", "Congo-Kinshasa", "République démocratique du Congo"] },
  CF: { en: ["CAR", "Central Africa"], fr: ["RCA", "Centrafrique"] },
  CG: { en: ["Congo-Brazzaville", "Republic of the Congo", "Congo"], fr: ["Congo-Brazzaville", "République du Congo", "Congo"] },
  CH: { en: ["Switzerland", "Swiss"] },
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
  GW: { en: ["Bisseau"], fr: ["Bissau"] },
  KG: { en: [], fr: ["Kirghizistan", "Kirghizie", "Kirghizstan"] },
  KN: { en: ["Saint Kitts", "St Kitts", "St Kitts and Nevis"], fr: ["Saint-Christophe-et-Niévès", "Saint Christophe", "St Christophe"] },
  KP: { en: ["North Korea", "Nth Korea", "N Korea", "DPRK"], fr: ["Corée du Nord", "Corée Nord", "Corée N"] },
  KR: { en: ["South Korea", "Sth Korea", "S Korea"], fr: ["Corée du Sud", "Corée Sud", "Corée S"] },
  LC: { en: ["Saint Lucia", "St Lucia"], fr: ["Sainte-Lucie", "St Lucie"] },
  LK: { en: ["Ceylon"], fr: ["Ceylan"] },
  MH: { en: ["Marshall Islands", "Marshall"], fr: ["Îles Marshall", "Marshall"] },
  MK: { en: ["North Macedonia", "Nth Macedonia", "N Macedonia", "Macedonia"], fr: ["Macédoine du Nord", "Macédoine Nord", "Macédoine N", "Macédoine"] },
  MM: { en: ["Burma"], fr: ["Birmanie"] },
  NL: { en: ["Holland"], fr: ["Hollande"] },
  NR: { en: ["Nauru"], fr: ["Nauru"] },
  NZ: { en: ["New Zealand", "Zealand"], fr: ["Zélande"] },
  PG: { en: ["PNG", "Papua"], fr: ["Papouasie", "PNG"] },
  PW: { en: ["Palau"], fr: ["Palaos"] },
  RU: { en: ["Russia"], fr: ["Russie"] },
  SA: { en: ["Saudi", "KSA"], fr: ["Arabie Saoudite", "Arabie"] },
  SB: { en: ["Solomon Islands", "Solomon"], fr: ["Îles Salomon", "Salomon"] },
  SG: { en: [], fr: ["Singapour"] },
  SL: { en: ["Sierra"], fr: [] },
  SM: { en: ["San Marino", "RSM"], fr: ["RSM"] },
  SS: { en: ["Sth Sudan", "S Sudan"], fr: ["Soudan Sud", "Soudan S"] },
  ST: { en: ["Sao Tome"], fr: ["Sao Tome"] },
  SV: { en: ["Salvador"], fr: ["Salvador"] },
  SY: { en: ["Syria"], fr: ["Syrie"] },
  SZ: { en: ["Eswatini", "Swaziland"], fr: ["Eswatini", "Swaziland"] },
  TL: { en: ["East Timor", "Timor-Leste", "Timor"], fr: ["Timor oriental", "Timor"] },
  TO: { en: ["Tonga"], fr: ["Tonga"] },
  TR: { en: ["Turkey", "Turkiye"], fr: ["Turquie"] },
  TT: { en: ["Trinidad", "Tobago"], fr: ["Trinité-et-Tobago", "Trinité", "Tobago"] },
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

// Fixes for known-bad source data in the `capital` field (English)
const CAPITAL_OVERRIDES = {
  SG: "Singapore",    // source has the German spelling "Singapur"
  LY: "Tripoli",      // source has the German spelling "Tripolis"
  MX: "Mexico City",  // source has the Spanish "Ciudad de México"
  BI: "Gitega",       // political capital since 2019 (source still has Bujumbura)
  PW: "Ngerulmud",    // capital since 2006 (source still has Melekeok)
  MN: "Ulaanbaatar",
  MM: "Naypyidaw",
  KI: "South Tarawa",
  MV: "Malé",
  BR: "Brasília",
  CM: "Yaoundé",
  CR: "San José",
  ST: "São Tomé",
  TG: "Lomé",
  MD: "Chișinău",
  IS: "Reykjavík",
  YE: "Sana'a",
  PS: "Jerusalem",
};

// French name of every capital. Must cover all 197 countries (asserted below).
const CAPITAL_FR = {
  // Africa
  DZ: "Alger", AO: "Luanda", BJ: "Porto-Novo", BW: "Gaborone", BF: "Ouagadougou",
  BI: "Gitega", CV: "Praia", CM: "Yaoundé", CF: "Bangui", TD: "N'Djaména",
  KM: "Moroni", CD: "Kinshasa", CG: "Brazzaville", CI: "Yamoussoukro", DJ: "Djibouti",
  EG: "Le Caire", GQ: "Malabo", ER: "Asmara", SZ: "Mbabane", ET: "Addis-Abeba",
  GA: "Libreville", GM: "Banjul", GH: "Accra", GN: "Conakry", GW: "Bissau",
  KE: "Nairobi", LS: "Maseru", LR: "Monrovia", LY: "Tripoli", MG: "Antananarivo",
  MW: "Lilongwe", ML: "Bamako", MR: "Nouakchott", MU: "Port-Louis", MA: "Rabat",
  MZ: "Maputo", NA: "Windhoek", NE: "Niamey", NG: "Abuja", RW: "Kigali",
  ST: "São Tomé", SN: "Dakar", SC: "Victoria", SL: "Freetown", SO: "Mogadiscio",
  ZA: "Pretoria", SS: "Djouba", SD: "Khartoum", TZ: "Dodoma", TG: "Lomé",
  TN: "Tunis", UG: "Kampala", ZM: "Lusaka", ZW: "Harare",
  // Asia
  AF: "Kaboul", AM: "Erevan", AZ: "Bakou", BH: "Manama", BD: "Dacca",
  BT: "Thimphou", BN: "Bandar Seri Begawan", KH: "Phnom Penh", CN: "Pékin", CY: "Nicosie",
  GE: "Tbilissi", IN: "New Delhi", ID: "Jakarta", IR: "Téhéran", IQ: "Bagdad",
  IL: "Jérusalem", JP: "Tokyo", JO: "Amman", KZ: "Astana", KW: "Koweït",
  KG: "Bichkek", LA: "Vientiane", LB: "Beyrouth", MY: "Kuala Lumpur", MV: "Malé",
  MN: "Oulan-Bator", MM: "Naypyidaw", NP: "Katmandou", KP: "Pyongyang", OM: "Mascate",
  PK: "Islamabad", PS: "Jérusalem", PH: "Manille", QA: "Doha", SA: "Riyad",
  SG: "Singapour", KR: "Séoul", LK: "Colombo", SY: "Damas", TW: "Taipei",
  TJ: "Douchanbé", TH: "Bangkok", TL: "Dili", TR: "Ankara", TM: "Achgabat",
  AE: "Abou Dabi", UZ: "Tachkent", VN: "Hanoï", YE: "Sanaa",
  // Europe
  AL: "Tirana", AD: "Andorre-la-Vieille", AT: "Vienne", BY: "Minsk", BE: "Bruxelles",
  BA: "Sarajevo", BG: "Sofia", HR: "Zagreb", CZ: "Prague", DK: "Copenhague",
  EE: "Tallinn", FI: "Helsinki", FR: "Paris", DE: "Berlin", GR: "Athènes",
  HU: "Budapest", IS: "Reykjavik", IE: "Dublin", IT: "Rome", XK: "Pristina",
  LV: "Riga", LI: "Vaduz", LT: "Vilnius", LU: "Luxembourg", MT: "La Valette",
  MD: "Chișinău", MC: "Monaco", ME: "Podgorica", NL: "Amsterdam", MK: "Skopje",
  NO: "Oslo", PL: "Varsovie", PT: "Lisbonne", RO: "Bucarest", RU: "Moscou",
  SM: "Saint-Marin", RS: "Belgrade", SK: "Bratislava", SI: "Ljubljana", ES: "Madrid",
  SE: "Stockholm", CH: "Berne", UA: "Kiev", GB: "Londres", VA: "Cité du Vatican",
  // North America
  AG: "Saint John's", BS: "Nassau", BB: "Bridgetown", BZ: "Belmopan", CA: "Ottawa",
  CR: "San José", CU: "La Havane", DM: "Roseau", DO: "Saint-Domingue", SV: "San Salvador",
  GD: "Saint-Georges", GT: "Guatemala", HT: "Port-au-Prince", HN: "Tegucigalpa", JM: "Kingston",
  MX: "Mexico", NI: "Managua", PA: "Panama", KN: "Basseterre", LC: "Castries",
  VC: "Kingstown", TT: "Port-d'Espagne", US: "Washington",
  // South America
  AR: "Buenos Aires", BO: "Sucre", BR: "Brasilia", CL: "Santiago", CO: "Bogota",
  EC: "Quito", GY: "Georgetown", PY: "Asuncion", PE: "Lima", SR: "Paramaribo",
  UY: "Montevideo", VE: "Caracas",
  // Oceania
  AU: "Canberra", FJ: "Suva", KI: "Tarawa-Sud", MH: "Majuro", FM: "Palikir",
  NR: "Yaren", NZ: "Wellington", PW: "Ngerulmud", PG: "Port Moresby", WS: "Apia",
  SB: "Honiara", TO: "Nuku'alofa", TV: "Funafuti", VU: "Port-Vila",
};

// Countries that share one capital. Naming it credits all of them in one go.
const SHARED_CAPITALS = [
  ["IL", "PS"], // Jerusalem
];

// Accepted alternate spellings for capitals, per language. Also covers countries
// with several capitals (seat of government, judicial capital, former capital…).
const CAPITAL_ALIASES = {
  UA: { en: ["Kiev"], fr: ["Kyiv"] },
  MN: { en: ["Ulan Bator"], fr: ["Ulaanbaatar"] },
  MM: { en: ["Nay Pyi Taw"], fr: ["Nay Pyi Taw"] },
  KI: { en: ["Tarawa"], fr: ["Tarawa"] },
  KZ: { en: ["Nur-Sultan"], fr: ["Nour-Soultan", "Nur-Sultan"] },
  BI: { en: ["Bujumbura"], fr: ["Bujumbura"] },
  PW: { en: ["Melekeok"], fr: ["Melekeok"] },
  BO: { en: ["La Paz"], fr: ["La Paz"] },
  ZA: { en: ["Cape Town", "Bloemfontein"], fr: ["Le Cap", "Bloemfontein"] },
  CI: { en: ["Abidjan"], fr: ["Abidjan"] },
  MY: { en: ["Putrajaya"], fr: ["Putrajaya"] },
  LK: { en: ["Sri Jayawardenepura Kotte", "Kotte"], fr: ["Sri Jayawardenepura Kotte", "Kotte"] },
  SZ: { en: ["Lobamba"], fr: ["Lobamba"] },
  PS: { en: ["East Jerusalem", "Ramallah"], fr: ["Jérusalem-Est", "Ramallah"] },
  IL: { en: ["Tel Aviv", "Tel Aviv-Yafo"], fr: ["Tel Aviv", "Tel Aviv-Jaffa"] },
  MX: { en: ["Ciudad de México"], fr: ["Ciudad de México"] },
  GT: { en: ["Guatemala"], fr: ["Ciudad de Guatemala"] },
  PA: { en: ["Panama"], fr: [] },
  KW: { en: ["Kuwait"], fr: ["Ville de Koweït"] },
  US: { en: ["Washington DC"], fr: ["Washington DC"] },
  IN: { en: ["Delhi"], fr: ["Delhi"] },
  VA: { en: ["Vatican"], fr: ["Vatican"] },
  BD: { en: ["Dacca"], fr: ["Dhaka"] },
  CN: { en: ["Peking"], fr: ["Beijing"] },
  BT: { en: [], fr: ["Thimphu"] },
  AE: { en: [], fr: ["Abou Dhabi"] },
  MG: { en: [], fr: ["Tananarive"] },
  MD: { en: [], fr: ["Kichinev"] },
  TM: { en: ["Ashkhabad"], fr: ["Achkhabad"] },
  AD: { en: [], fr: ["Andorra la Vella"] },
  SS: { en: [], fr: ["Juba"] },
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
    const capitalEn = CAPITAL_OVERRIDES[country.iso2] ?? country.capital;
    return {
      iso2: country.iso2,
      numeric: parseInt(country.numeric_code, 10),
      continent: continentOf(country),
      name: {
        en: override.en ?? country.name,
        fr: override.fr ?? (country.translations?.fr || country.name),
      },
      capital: {
        en: capitalEn,
        fr: CAPITAL_FR[country.iso2],
      },
      aliases: ALIASES[country.iso2] || { en: [], fr: [] },
      capitalAliases: CAPITAL_ALIASES[country.iso2] || { en: [], fr: [] },
    };
  });

// Validate output data before writing
if (out.length !== 197) throw new Error(`Expected 197, got ${out.length}`);
for (const table of [CAPITAL_FR, CAPITAL_ALIASES]) {
  for (const iso2 of Object.keys(table)) {
    if (!INCLUDE.has(iso2)) throw new Error(`Unknown iso2 "${iso2}" in capital table`);
  }
}
for (const country of out) {
  if (!country.name.en) throw new Error(`Missing EN name for ${country.iso2}`);
  if (!country.name.fr) throw new Error(`Missing FR name for ${country.iso2}`);
  if (!country.capital.en) throw new Error(`Missing EN capital for ${country.iso2}`);
  if (!country.capital.fr) throw new Error(`Missing FR capital for ${country.iso2}`);
}
for (const lang of ["en", "fr"]) {
  const seen = new Map(); // folded name → iso2
  for (const country of out) {
    for (const capital of [country.capital[lang], ...country.capitalAliases[lang]]) {
      // Same folding as normalize() in src/utils.js, so collisions match what the game sees
      const key = capital.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) {
        const owner = seen.get(key);
        const shared = capital === country.capital[lang]
          && SHARED_CAPITALS.some(group => group.includes(owner) && group.includes(country.iso2));
        if (shared) continue;
        throw new Error(owner === country.iso2
          ? `Redundant ${lang} capital alias "${capital}" (${country.iso2})`
          : `Duplicate ${lang} capital "${capital}" (${country.iso2}, ${owner})`);
      }
      seen.set(key, country.iso2);
    }
  }
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
