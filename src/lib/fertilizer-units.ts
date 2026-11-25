export function convertFertilizerQuantity(quantity: number, fromUnit: string, stockUnit: string): number {
  const from = fromUnit.trim().toLowerCase();
  const stock = stockUnit.trim().toLowerCase();
  if (from === stock) return quantity;
  if ((stock === 'kg' || stock === 'kilogram' || stock === 'kilograms') && (from === 'g' || from === 'gram' || from === 'grams')) return quantity / 1000;
  if ((from === 'kg' || from === 'kilogram' || from === 'kilograms') && (stock === 'g' || stock === 'gram' || stock === 'grams')) return quantity * 1000;
  if ((stock === 'litre' || stock === 'liter' || stock === 'l') && (from === 'ml' || from === 'millilitre' || from === 'milliliter')) return quantity / 1000;
  if ((from === 'litre' || from === 'liter' || from === 'l') && (stock === 'ml' || stock === 'millilitre' || stock === 'milliliter')) return quantity * 1000;
  throw new Error(`Cannot convert ${fromUnit} to stock unit ${stockUnit}. Choose a compatible unit.`);
}

export function fertilizerDoseUnits(stockUnit: string): string[] {
  const unit = stockUnit.trim().toLowerCase();
  if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') return [stockUnit, 'g'];
  if (unit === 'litre' || unit === 'liter' || unit === 'l') return [stockUnit, 'ml'];
  return [stockUnit];
}
