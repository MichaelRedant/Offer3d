export async function fetchElectricityPrice(): Promise<number> {
  const url = 'https://opendata.elia.be/api/explore/v2.1/catalog/datasets/ods162/records?limit=1&sort=-datetime';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch electricity price');
  }
  const data = await res.json();
  const priceMwh = data?.results?.[0]?.imbalanceprice;
  if (typeof priceMwh !== 'number') {
    throw new Error('Invalid electricity price data');
  }
  return priceMwh / 1000; // convert €/MWh to €/kWh
}
