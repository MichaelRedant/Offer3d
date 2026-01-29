import calculate3DQuote, { FILAMENT_PRICES } from "./calculate3dQuote";

const DEFAULT_ASSEMBLY_RATE = 35;
const DEFAULT_DESIGN_RATE = 40;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function resolveFilamentType(item = {}) {
  if (item.filamentType) return item.filamentType;
  if (item.material?.naam) return item.material.naam;
  if (item.filamentDisplayName) return item.filamentDisplayName;
  return null;
}

function mergeFilamentPrices(settings) {
  if (!settings?.filamentPrices) return FILAMENT_PRICES;
  return { ...FILAMENT_PRICES, ...settings.filamentPrices };
}

export default function calculateItemCost(item = {}, settings = {}, form = {}, overrides = {}) {
  if (!item || typeof item !== "object") {
    return { fout: "Ongeldig printitem." };
  }

  const aantal = Math.max(1, parseInt(item.aantal, 10) || 1);

  const seconden =
    (parseInt(item.hours, 10) || 0) * 3600 +
    (parseInt(item.minutes, 10) || 0) * 60 +
    (parseInt(item.seconds, 10) || 0);
  const printUren = seconden / 3600;

  const filamentType = resolveFilamentType(item);
  if (!filamentType) {
    return { fout: "Geen filamenttype geselecteerd voor dit item." };
  }

  const weight = toNumber(item.weight);
  if (weight <= 0) {
    return { fout: "Filamentgewicht ontbreekt of is 0." };
  }

  const kWhPrijs = form.overrideElektriciteitsprijs
    ? toNumber(form.elektriciteitsprijs, 0.22)
    : toNumber(settings.elektriciteitsprijs, 0.22);

  const baseDesignRate = toNumber(
    settings.modelleringTariefPerUur ??
      settings.modelleringsTariefPerUur ??
      settings.modelleringTarief ??
      settings.designRatePerHour ??
      settings.designHourlyRate ??
      DEFAULT_DESIGN_RATE,
    DEFAULT_DESIGN_RATE
  );

  const marginPercentage = (() => {
    if (overrides?.marginOverride !== undefined && overrides.marginOverride !== null) {
      return toNumber(overrides.marginOverride);
    }
    if (form.gebruikGeenMarge) return 0;
    if (form.gebruikIndividueleMarges) {
      return toNumber(item.margin, toNumber(form.globaleWinstmarge, 25));
    }
    if (item.override_marge && toNumber(item.custom_winstmarge_perc) > 0) {
      return toNumber(item.custom_winstmarge_perc);
    }
    return toNumber(form.globaleWinstmarge, 25);
  })();

  const materialMarkupPercentage = toNumber(
    settings.materialMarkup ?? settings.materiaalOpslagPerc ?? form.materialMarkup,
    20
  );

  const modelleringUren = item.modelleringNodig
    ? Math.max(0, toNumber(item.modellering_uur))
    : 0;
  const designHours = modelleringUren;
  const designRate =
    item.modelleringNodig && item.gebruik_custom_uurtarief
      ? toNumber(item.custom_uurtarief, baseDesignRate)
      : baseDesignRate;

  const nozzleCost = toNumber(item.nozzle_slijtagekost);
  const postProcessingCost = toNumber(item.post_processing_kost);
  const scanCost = toNumber(item.scan_kost);
  const assemblyHours = Math.max(0, toNumber(item.assemblage_uur));
  const assemblyCost = assemblyHours * DEFAULT_ASSEMBLY_RATE;
  const manualSurcharge = toNumber(item.manuele_toeslag);

  const extraAllowances =
    nozzleCost + postProcessingCost + scanCost + assemblyCost + manualSurcharge;

  const filamentPrices = mergeFilamentPrices(settings);
  const materialPricePerKg = toNumber(
    item.material?.prijs_per_kg ??
      item.materiaal_prijs ??
      item.prijs_per_kg ??
      item.price_per_kg
  );
  if (materialPricePerKg > 0 && filamentType) {
    filamentPrices[filamentType] = materialPricePerKg;
  }
  if (overrides?.pricePerKg && filamentType) {
    filamentPrices[filamentType] = toNumber(overrides.pricePerKg);
  }

  const params = {
    printing_time_hours: printUren,
    filament_type: filamentType,
    filament_weight_grams: weight,
    number_of_prints: aantal,
    design_hours: designHours,
    design_rate_per_hour: designRate,
    delivery_type: "afhaling",
    travel_distance_km: 0,
    extra_allowances: extraAllowances,
    discount_percent: 0,
    profit_margin: toNumber(marginPercentage) / 100,
    material_markup: toNumber(materialMarkupPercentage) / 100,
    electricity_cost_per_kwh: kWhPrijs,
    post_cost: toNumber(settings.postCost ?? settings.post_cost ?? 7),
    filament_prices: filamentPrices,
  };

  let quote;
  try {
    quote = calculate3DQuote(params);
  } catch (error) {
    return { fout: error?.message || "Onbekende fout bij berekening." };
  }

  const subtotalBeforeDelivery = quote.totals.subtotal;
  const perPrintCostBeforeMargin = quote.per_print.cost_before_margin;
  const baseCost =
    perPrintCostBeforeMargin * aantal +
    quote.totals.design_total +
    quote.totals.drying_total +
    quote.totals.extra_allowances;

  const verkoopprijsPerStuk = quote.per_print.cost_with_margin;
  const subtotaal = quote.totals.subtotal;

  const dryingApplied =
    quote.notes?.some((note) =>
      note.toLowerCase().includes("droogkosten toegepast")
    ) ?? false;

  return {
    quote,
    subtotaal: subtotaal.toFixed(2),
    nettoKost: roundCurrency(baseCost).toFixed(2),
    verkoopprijs_per_stuk: roundCurrency(verkoopprijsPerStuk).toFixed(2),
    subtotalBeforeDelivery,
    dryingApplied,
  };
}
