/** Feriados nacionais do Brasil, calculados localmente (sem API). */

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function key(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Mapa "YYYY-MM-DD" → nome do feriado para um ano. */
export function brazilHolidays(year: number): Map<string, string> {
  const easter = easterSunday(year);
  const map = new Map<string, string>();

  map.set(`${year}-01-01`, "Confraternização Universal");
  map.set(key(addDays(easter, -48)), "Carnaval");
  map.set(key(addDays(easter, -47)), "Carnaval");
  map.set(key(addDays(easter, -2)), "Sexta-feira Santa");
  map.set(`${year}-04-21`, "Tiradentes");
  map.set(`${year}-05-01`, "Dia do Trabalho");
  map.set(key(addDays(easter, 60)), "Corpus Christi");
  map.set(`${year}-09-07`, "Independência do Brasil");
  map.set(`${year}-10-12`, "Nossa Senhora Aparecida");
  map.set(`${year}-11-02`, "Finados");
  map.set(`${year}-11-15`, "Proclamação da República");
  map.set(`${year}-11-20`, "Dia da Consciência Negra");
  map.set(`${year}-12-25`, "Natal");

  return map;
}

export function dateKey(d: Date): string {
  return key(d);
}
