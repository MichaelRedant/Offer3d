import calculateItemCost from "./calculateItemCost";

const DELIVERY_TYPES = {
  afhaling: "afhaling",
  post: "post",
  "24h": "24h",
  "48h": "48h",
};

function toNumber(value, fallback = 0) {
  if (typeof value === "string" && value.includes(",")) {
    const normalized = value.replace(",", ".");
    const parsedNorm = Number(normalized);
    if (Number.isFinite(parsedNorm)) return parsedNorm;
  }
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

function calculateDeliveryCost(type, subtotalBeforeDelivery, postCost = 7) {
  switch (type) {
    case "24h":
      return 20;
    case "48h":
      return 15;
    case "post":
      return toNumber(postCost, 7);
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
    custom_total: 0,
  };

  let subtotalBeforeDelivery = 0;
  let totalEigenKost = 0;
  const clientId = options?.clientId ? Number(options.clientId) : null;
  const customItems = Array.isArray(options?.customItems) ? options.customItems : [];
  const postCostSetting = toNumber(settings?.postCost ?? settings?.post_cost ?? 7);
  if (Number.isNaN(postCostSetting) || postCostSetting < 0) {
    return { fout: "Postkost ongeldig in instellingen." };
  }
  const useStoredTotals = Boolean(options?.useStoredTotals);

  for (const item of printItems) {
    const weightKg = toNumber(item.weight) / 1000;
    const rule = findBestPriceRule(priceRules, {
      clientId,
      materialId: item.materiaal_id,
      weightKg,
    });

    // Bewerkmodus: behoud eerder opgeslagen subtotalen om sprongen te vermijden
    if (
      useStoredTotals &&
      ((item.subtotaal !== undefined && item.subtotaal !== null) || item.verkoopprijs_per_stuk)
    ) {
      const quantity = Math.max(1, toNumber(item.aantal, 1));
      const storedSubtotalRaw = toNumber(
        item.subtotaal !== undefined && item.subtotaal !== null ? item.subtotaal : item.verkoopprijs_per_stuk * quantity,
        0
      );
      const storedSubtotal = roundCurrency(storedSubtotalRaw);
      const storedPerPiece = roundCurrency(
        toNumber(item.verkoopprijs_per_stuk, storedSubtotal / quantity || storedSubtotal)
      );

      // Gebruik berekende kostcomponenten enkel voor interne kost (materiaal + elektriciteit),
      // maar houd verkoopprijzen/subtotaal volledig vast zoals opgeslagen. Geen herverdeling over design/drying etc.
      let materialRaw = 0;
      let electricityCost = 0;
      try {
        const kostCalc = calculateItemCost(item, settings, form, {
          pricePerKg: rule?.price_per_unit,
          marginOverride: rule?.margin_override,
        });
        materialRaw = toNumber(kostCalc?.quote?.per_print?.material_raw, 0);
        electricityCost = toNumber(kostCalc?.quote?.per_print?.electricity, 0);
      } catch (e) {
        // stilzwijgend fallback naar 0; we willen niet crashen in editmodus
      }

      const kost = {
        quote: {
          per_print: {
            material_raw: materialRaw,
            material_with_markup: 0,
            electricity: electricityCost,
            cost_before_margin: storedPerPiece,
            cost_with_margin: storedPerPiece,
          },
          totals: {
            prints_total: storedSubtotal,
            design_total: 0,
            drying_total: 0,
            extra_allowances: 0,
            subtotal: storedSubtotal,
          },
        },
        subtotaal: storedSubtotal.toFixed(2),
        nettoKost: roundCurrency((materialRaw + electricityCost) * quantity).toFixed(2),
        verkoopprijs_per_stuk: storedPerPiece.toFixed(2),
        subtotalBeforeDelivery: storedSubtotal,
        dryingApplied: false,
      };

      itemResultaten.push({ type: "print", item, kost });
      aggregateTotals.prints_total += storedSubtotal;
      subtotalBeforeDelivery += storedSubtotal;
      totalEigenKost += roundCurrency((materialRaw + electricityCost) * quantity);
      continue;
    }

    const kost = calculateItemCost(item, settings, form, {
      pricePerKg: rule?.price_per_unit,
      marginOverride: rule?.margin_override,
    });
    itemResultaten.push({ type: "print", item, kost });

    if (kost?.fout || !kost?.quote) {
      continue;
    }

    const { totals } = kost.quote;
    aggregateTotals.prints_total += totals.prints_total;
    aggregateTotals.design_total += totals.design_total;
    aggregateTotals.drying_total += totals.drying_total;
    aggregateTotals.extra_allowances += totals.extra_allowances;

    subtotalBeforeDelivery += kost.subtotalBeforeDelivery ?? totals.subtotal;

    // Netto productiekost: enkel grondstof + elektriciteit, zonder marges, ontwerp, droog of toeslagen.
    const produceCostPerPrint =
      toNumber(kost.quote?.per_print?.material_raw) + toNumber(kost.quote?.per_print?.electricity);
    const printsCount = Math.max(1, toNumber(item.aantal, 1));
    totalEigenKost += roundCurrency(produceCostPerPrint * printsCount);

    kost.quote.notes?.forEach((note) => notesSet.add(note));
    if (rule) {
      notesSet.add(
        `Prijslijstregel toegepast: ${rule.price_per_unit ? `EUR ${toNumber(rule.price_per_unit)} per kg` : ""}${
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

  // Custom regels (diensten/bundels) meenemen in totaal en marge
  for (const customItem of customItems) {
    const isOptional = Boolean(customItem.is_optional);
    const isSelected = isOptional ? Boolean(customItem.is_selected ?? true) : true;
    const quantity = toNumber(customItem.quantity, 1);
    const price = toNumber(customItem.price_amount, 0);
    const cost = toNumber(customItem.cost_amount, 0);
    const lineTotal = roundCurrency(price * quantity);
    const lineCost = roundCurrency(cost * quantity);
    const marginAmount = roundCurrency(lineTotal - lineCost);
    const marginPercent = lineCost > 0 ? roundCurrency((marginAmount / lineCost) * 100) : 0;
    if (isSelected) {
      aggregateTotals.custom_total += lineTotal;
      subtotalBeforeDelivery += lineTotal;
      totalEigenKost += lineCost;
    }

    itemResultaten.push({
      type: "custom",
      item: customItem,
      kost: {
        subtotal: lineTotal,
        kost: lineCost,
        margin_amount: marginAmount,
        margin_percent: marginPercent,
      },
      included: isSelected,
      optional: isOptional,
    });
  }

  const deliveryType = DELIVERY_TYPES[form.deliveryType] || "afhaling";
  const deliveryCost = calculateDeliveryCost(deliveryType, subtotalBeforeDelivery, postCostSetting);

  const subtotal = subtotalBeforeDelivery + deliveryCost;

  const discountPercent = clampDiscount(toNumber(form.korting));
  const discountValue = subtotal * (discountPercent / 100);
  const totalFinal = subtotal - discountValue;

  const softDiscountPercent = clampDiscount(discountPercent + 5);
  const totalWithSoftDiscount = subtotal * (1 - softDiscountPercent / 100);

  const btwPerc = clampDiscount(toNumber(form.btw, 0));
  const btwBedrag = totalFinal * (btwPerc / 100);
  const totaalBruto = totalFinal + btwBedrag;

  const totals = {
    prints_total: roundCurrency(aggregateTotals.prints_total),
    design_total: roundCurrency(aggregateTotals.design_total),
    drying_total: roundCurrency(aggregateTotals.drying_total),
    extra_allowances: roundCurrency(aggregateTotals.extra_allowances),
    custom_total: roundCurrency(aggregateTotals.custom_total),
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
    aggregateTotals.extra_allowances +
    aggregateTotals.custom_total;
  // Gebruik netto totaal (na korting, incl. levering) om winst te berekenen; eigen kost bevat geen levering.
  const winstBedrag = roundCurrency(totals.total_final - totalEigenKost);
  const winstPerc = totalEigenKost > 0 ? roundCurrency((winstBedrag / totalEigenKost) * 100) : 0;

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
    totaalNetto: roundCurrency(totals.total_final).toFixed(2),
    totaleEigenKost: roundCurrency(totalEigenKost).toFixed(2),
    btw: totals.vat_amount.toFixed(2),
    totaalBruto: totals.total_including_vat.toFixed(2),
    winstBedrag: roundCurrency(winstBedrag).toFixed(2),
    winstPerc: roundCurrency(winstPerc).toFixed(1),
    notes: Array.from(notesSet),
  };
}
