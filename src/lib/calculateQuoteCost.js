import calculateItemCost from "./calculateItemCost";

const DELIVERY_TYPES = {
  afhaling: "afhaling",
  post: "post",
  "24h": "24h",
  "48h": "48h",
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampDiscount(value) {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateDeliveryCost(type, subtotalBeforeDelivery) {
  switch (type) {
    case "24h":
      return 20;
    case "48h":
      return 15;
    case "post":
      return subtotalBeforeDelivery < 50 ? 7 : 5;
    case "afhaling":
    default:
      return 0;
  }
}

function isRuleActive(rule, now = new Date()) {
  if (!rule) return false;
  if (String(rule.active ?? "1") === "0") return false;
  const today = now.toISOString().slice(0, 10);
  if (rule.valid_from && rule.valid_from > today) return false;
  if (rule.valid_to && rule.valid_to < today) return false;
  return true;
}

function findBestPriceRule(rules = [], { clientId, materialId, weightKg }) {
  const candidates = (rules || []).filter((rule) => {
    if (!isRuleActive(rule)) return false;
    if (rule.material_id && materialId && Number(rule.material_id) !== Number(materialId)) return false;
    if (rule.client_id && clientId && Number(rule.client_id) !== Number(clientId)) {
      return false;
    }
    const minQty = Number(rule.min_qty ?? 0);
    if (minQty > 0 && weightKg < minQty) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const clientA = a.client_id ? 1 : 0;
    const clientB = b.client_id ? 1 : 0;
    const matA = a.material_id ? 1 : 0;
    const matB = b.material_id ? 1 : 0;
    if (clientA !== clientB) return clientB - clientA;
    if (matA !== matB) return matB - matA;
    const minA = Number(a.min_qty ?? 0);
    const minB = Number(b.min_qty ?? 0);
    if (minA !== minB) return minB - minA;
    return (b.id || 0) - (a.id || 0);
  });

  return candidates[0];
}

export default function calculateQuoteCost(printItems = [], form = {}, settings = {}, priceRules = [], options = {}) {
  if (!Array.isArray(printItems)) {
    return { fout: "Geen printitems" };
  }

  const itemResultaten = [];
  const notesSet = new Set();

  const aggregateTotals = {
    prints_total: 0,
    design_total: 0,
    drying_total: 0,
    extra_allowances: 0,
  };

  let subtotalBeforeDelivery = 0;
  let totalEigenKost = 0;
  const clientId = options?.clientId ? Number(options.clientId) : null;

  for (const item of printItems) {
    const weightKg = toNumber(item.weight) / 1000;
    const rule = findBestPriceRule(priceRules, {
      clientId,
      materialId: item.materiaal_id,
      weightKg,
    });

    const kost = calculateItemCost(item, settings, form, {
      pricePerKg: rule?.price_per_unit,
      marginOverride: rule?.margin_override,
    });
    itemResultaten.push({ item, kost });

    if (kost?.fout || !kost?.quote) {
      continue;
    }

    const { totals } = kost.quote;
    aggregateTotals.prints_total += totals.prints_total;
    aggregateTotals.design_total += totals.design_total;
    aggregateTotals.drying_total += totals.drying_total;
    aggregateTotals.extra_allowances += totals.extra_allowances;

    subtotalBeforeDelivery += kost.subtotalBeforeDelivery ?? totals.subtotal;
    totalEigenKost += toNumber(kost.nettoKost);

    kost.quote.notes?.forEach((note) => notesSet.add(note));
    if (rule) {
      notesSet.add(
        `Prijslijstregel toegepast: ${rule.price_per_unit ? `€${toNumber(rule.price_per_unit)} per kg` : ""}${
          rule.margin_override ? ` / marge ${toNumber(rule.margin_override)}%` : ""
        }${rule.client_id ? ` (klant #${rule.client_id})` : ""}`
      );
    }
  }

  const extraAllowancesForm =
    toNumber(form.extraAllowances) +
    toNumber(form.vasteStartkost) +
    toNumber(form.vervoerskost);

  if (extraAllowancesForm > 0) {
    aggregateTotals.extra_allowances += extraAllowancesForm;
    subtotalBeforeDelivery += extraAllowancesForm;
  }

  const deliveryType = DELIVERY_TYPES[form.deliveryType] || "afhaling";
  const deliveryCost = calculateDeliveryCost(deliveryType, subtotalBeforeDelivery);

  const subtotal = subtotalBeforeDelivery + deliveryCost;

  const discountPercent = clampDiscount(toNumber(form.korting));
  const discountValue = subtotal * (discountPercent / 100);
  const totalFinal = subtotal - discountValue;

  const softDiscountPercent = clampDiscount(discountPercent + 5);
  const totalWithSoftDiscount = subtotal * (1 - softDiscountPercent / 100);

  const btwPerc = clampDiscount(toNumber(form.btw, 21));
  const btwBedrag = totalFinal * (btwPerc / 100);
  const totaalBruto = totalFinal + btwBedrag;

  const totals = {
    prints_total: roundCurrency(aggregateTotals.prints_total),
    design_total: roundCurrency(aggregateTotals.design_total),
    drying_total: roundCurrency(aggregateTotals.drying_total),
    extra_allowances: roundCurrency(aggregateTotals.extra_allowances),
    delivery_cost: roundCurrency(deliveryCost),
    subtotal_before_delivery: roundCurrency(subtotalBeforeDelivery),
    subtotal: roundCurrency(subtotal),
    discount_value: roundCurrency(discountValue),
    total_final: roundCurrency(totalFinal),
    total_with_soft_discount: roundCurrency(totalWithSoftDiscount),
    vat_percent: roundCurrency(btwPerc),
    vat_amount: roundCurrency(btwBedrag),
    total_including_vat: roundCurrency(totaalBruto),
  };

  const omzetVoorKorting =
    aggregateTotals.prints_total +
    aggregateTotals.design_total +
    aggregateTotals.drying_total +
    aggregateTotals.extra_allowances;
  const winstBedrag = omzetVoorKorting - totalEigenKost;
  const winstPerc = totalEigenKost > 0 ? (winstBedrag / totalEigenKost) * 100 : 0;

  notesSet.add(`Korting toegepast: ${totals.discount_value > 0 ? `${discountPercent.toFixed(1)}%` : "geen"}`);
  notesSet.add(`Leveringsoptie: ${deliveryType}`);

  return {
    itemResultaten,
    totals,
    meta: {
      discount_percent: roundCurrency(discountPercent),
      delivery_type: deliveryType,
      extra_allowances_form: roundCurrency(extraAllowancesForm),
    },
    inputs: {
      btw_percent: roundCurrency(btwPerc),
      electricity_cost_per_kwh: roundCurrency(
        form.overrideElektriciteitsprijs
          ? toNumber(form.elektriciteitsprijs, settings.elektriciteitsprijs)
          : toNumber(settings.elektriciteitsprijs, 0.22)
      ),
    },
    totaalNetto: roundCurrency(aggregateTotals.prints_total).toFixed(2),
    totaleEigenKost: roundCurrency(totalEigenKost).toFixed(2),
    btw: totals.vat_amount.toFixed(2),
    totaalBruto: totals.total_including_vat.toFixed(2),
    winstBedrag: roundCurrency(winstBedrag).toFixed(2),
    winstPerc: roundCurrency(winstPerc).toFixed(1),
    notes: Array.from(notesSet),
  };
}
