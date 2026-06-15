// IATA DGR edition helper.
// Reference anchor: 65th edition = 2024.
export function iataDgrEdition(date: Date = new Date()): { edition: number; year: number; label: string } {
  const year = date.getFullYear();
  const edition = 65 + (year - 2024);
  const suffix = edition % 100 >= 11 && edition % 100 <= 13
    ? "th"
    : edition % 10 === 1 ? "st" : edition % 10 === 2 ? "nd" : edition % 10 === 3 ? "rd" : "th";
  return { edition, year, label: `IATA ${edition}${suffix} Ed, Jan${year}` };
}
