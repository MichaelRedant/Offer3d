export function calculateItemPrice(item, settings) {
  const {
    gewicht = 0,
    printtijd = 0,
    nozzle = 0,
    assemblage = 0,
    post = 0,
    scan = 0,
    toeslag = 0,
    moetDrogen = false
  } = item;

  const margePerc = settings.geenMarge
    ? 0
    : item.marge !== undefined && settings.itemMarges
      ? item.marge
      : settings.standaardMarge;

  const filamentPrijsPerKg = 23.38; // placeholder – later dynamisch
  const elektriciteitPrijs = settings.elektriciteitsprijs || 0.12;
  const droogPerPrint = moetDrogen ? 0.05 : 0;
  const droogEenmalig = moetDrogen ? 5.0 : 0;

  const filamentKost = gewicht * filamentPrijsPerKg / 1000;
  const extraKosten = nozzle + assemblage + post + scan + toeslag;

  const basisKost = filamentKost + extraKosten;
  const metMarge = basisKost * (1 + margePerc / 100);

  const elektriciteitskost = printtijd * elektriciteitPrijs;
  const droogkost = droogPerPrint + droogEenmalig;

  const totaal = metMarge + elektriciteitskost + droogkost;

  return {
    filamentKost,
    extraKosten,
    marge: margePerc,
    margeBedrag: metMarge - basisKost,
    elektriciteitskost,
    droogkost,
    totaal
  };
}
