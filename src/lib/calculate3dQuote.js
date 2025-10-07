const FILAMENT_PRICES = Object.freeze({
  "PLA Basic": 23.38,
  "PLA Matte": 23.38,
  "PLA Basic Gradient": 33.54,
  "PLA Silk": 33.54,
  "PLA Silk Dual Color": 33.54,
  "PLA Metal": 33.54,
  "PLA Galaxy": 32.52,
  "PLA Sparkle": 33.54,
  "PLA Marble": 33.54,
  "PLA Glow": 33.54,
  "PLA-CF": 39.64,
  TPU: 25.5,
  PETG: 23.38,
  "PLA Wood": 28.46,
});

const DRYING_FILAMENTS = new Set(["TPU", "PLA Wood", "PETG"]);
const DELIVERY_TYPES = new Set(["afhaling", "post", "24h", "48h"]);

const DESIGN_RATE_PER_HOUR = 40;
const DRYING_BASE_COST = 5.0;
const DRYING_VARIABLE_COST = 0.05;

const ELECTRICITY_USAGE_KW = 1.0;

const PRECISION = 2;
const CURRENCY_FACTOR = 10 ** PRECISION;

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * CURRENCY_FACTOR) / CURRENCY_FACTOR;
}

function clampDiscount(value) {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function normaliseFloat(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculate3DQuote(params = {}) {
  const {
    printing_time_hours,
    filament_type,
    filament_weight_grams,
    number_of_prints,
    design_hours = 0,
    design_rate_per_hour = DESIGN_RATE_PER_HOUR,
    delivery_type = "afhaling",
    travel_distance_km = 0,
    extra_allowances = 0,
    discount_percent = 0,
    profit_margin = 0.25,
    material_markup = 0.2,
    electricity_cost_per_kwh = 0.12,
    filament_prices,
  } = params;

  if (printing_time_hours === undefined || printing_time_hours === null) {
    throw new Error("printing_time_hours is vereist.");
  }
  if (filament_type === undefined || filament_type === null || filament_type === "") {
    throw new Error("filament_type is vereist.");
  }
  if (filament_weight_grams === undefined || filament_weight_grams === null) {
    throw new Error("filament_weight_grams is vereist.");
  }
  if (number_of_prints === undefined || number_of_prints === null) {
    throw new Error("number_of_prints is vereist.");
  }

  const printsCount = Math.trunc(number_of_prints);
  if (!Number.isFinite(printsCount) || printsCount < 1) {
    throw new Error("number_of_prints moet minimaal 1 zijn.");
  }

  const printTimeHours = normaliseFloat(printing_time_hours);
  if (printTimeHours <= 0) {
    throw new Error("printing_time_hours moet groter dan 0 zijn.");
  }

  const filamentWeight = normaliseFloat(filament_weight_grams);
  if (filamentWeight <= 0) {
    throw new Error("filament_weight_grams moet groter dan 0 zijn.");
  }

  const priceTable = filament_prices
    ? { ...FILAMENT_PRICES, ...filament_prices }
    : FILAMENT_PRICES;

  const filamentPricePerKg = priceTable[filament_type];
  if (!filamentPricePerKg) {
    const supported = Object.keys(priceTable).sort().join(", ");
    throw new Error(
      `Onbekend filament_type '${filament_type}'. Ondersteunde types: ${supported}.`
    );
  }

  if (!DELIVERY_TYPES.has(delivery_type)) {
    throw new Error("delivery_type moet één van afhaling, post, 24h of 48h zijn.");
  }

  const designHours = Math.max(0, normaliseFloat(design_hours));
  const designRate = Math.max(
    0,
    normaliseFloat(design_rate_per_hour, DESIGN_RATE_PER_HOUR)
  );
  const travelDistance = Math.max(0, normaliseFloat(travel_distance_km));
  const allowances = Math.max(0, normaliseFloat(extra_allowances));

  const margin = Math.max(0, normaliseFloat(profit_margin));
  const markup = Math.max(0, normaliseFloat(material_markup));
  const electricityRate = Math.max(0, normaliseFloat(electricity_cost_per_kwh));

  const discountPercentClamped = clampDiscount(normaliseFloat(discount_percent));

  const filamentCostPerGram = filamentPricePerKg / 1000;
  const materialRawOne = filamentWeight * filamentCostPerGram;
  const materialOne = materialRawOne * (1 + markup);

  const electricityOne = printTimeHours * ELECTRICITY_USAGE_KW * electricityRate;
  const costOne = materialOne + electricityOne;
  const costOneWithMargin = costOne * (1 + margin);

  const printsTotal = costOneWithMargin * printsCount;

  const designTotal = designHours * designRate;

  const dryingApplied = DRYING_FILAMENTS.has(filament_type);
  const dryingVariable = dryingApplied ? DRYING_VARIABLE_COST * printsCount : 0;
  const dryingFixed = dryingApplied ? DRYING_BASE_COST : 0;
  const dryingTotal = dryingFixed + dryingVariable;

  const subtotalBeforeDelivery = printsTotal + designTotal + dryingTotal + allowances;

  let deliveryCost = 0;
  switch (delivery_type) {
    case "24h":
      deliveryCost = 20;
      break;
    case "48h":
      deliveryCost = 15;
      break;
    case "post":
      deliveryCost = subtotalBeforeDelivery < 50 ? 7 : 5;
      break;
    case "afhaling":
    default:
      deliveryCost = 0;
      break;
  }

  const subtotal = subtotalBeforeDelivery + deliveryCost;
  const discountValue = subtotal * (discountPercentClamped / 100);
  const totalFinal = subtotal - discountValue;

  const softDiscountPercent = clampDiscount(discountPercentClamped + 5);
  const totalWithSoftDiscount = subtotal * (1 - softDiscountPercent / 100);

  const perPrint = {
    material_raw: roundCurrency(materialRawOne),
    material_with_markup: roundCurrency(materialOne),
    electricity: roundCurrency(electricityOne),
    cost_before_margin: roundCurrency(costOne),
    cost_with_margin: roundCurrency(costOneWithMargin),
  };

  const totals = {
    prints_total: roundCurrency(printsTotal),
    design_total: roundCurrency(designTotal),
    drying_total: roundCurrency(dryingTotal),
    delivery_cost: roundCurrency(deliveryCost),
    extra_allowances: roundCurrency(allowances),
    subtotal: roundCurrency(subtotal),
    discount_value: roundCurrency(discountValue),
    total_final: roundCurrency(totalFinal),
    total_with_soft_discount: roundCurrency(totalWithSoftDiscount),
  };

  const notes = [
    `Materiaalopslag toegepast: ${(markup * 100).toFixed(1)}%`,
    `Marge toegepast: ${(margin * 100).toFixed(1)}%`,
    `Modelleringstarief gebruikt: ${designRate.toFixed(2)} EUR/u`,
    `Droogkosten toegepast voor materiaal: ${dryingApplied}`,
    "Posttarief drempel toegepast bij €50",
    "Alle bedragen in EUR, incl. btw-status niet meegenomen (netto aannames)",
  ];

  const input = {
    filament_type,
    number_of_prints: printsCount,
    printing_time_hours: roundCurrency(printTimeHours),
    filament_weight_grams: roundCurrency(filamentWeight),
    design_hours: roundCurrency(designHours),
    design_rate_per_hour: roundCurrency(designRate),
    delivery_type,
    travel_distance_km: roundCurrency(travelDistance),
    electricity_cost_per_kwh: roundCurrency(electricityRate),
    profit_margin: roundCurrency(margin),
    material_markup: roundCurrency(markup),
    discount_percent: roundCurrency(discountPercentClamped),
    extra_allowances: roundCurrency(allowances),
  };

  return {
    input,
    per_print: perPrint,
    totals,
    notes,
  };
}

export { FILAMENT_PRICES };

export default calculate3DQuote;
