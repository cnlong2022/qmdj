
import { SOLAR_TERMS } from '../constants';

export interface SolarTermData {
  year: number;
  termIndex: number;
  date: Date;
  name: string;
}

const solarTermCache: Map<number, SolarTermData[]> = new Map();

/**
 * Parses a string in "YYYY-MM-DD HH:mm:ss" format as Beijing Time (UTC+8).
 */
function parseBeijingTime(str: string): Date {
  const isoStr = str.replace(' ', 'T') + '+08:00';
  return new Date(isoStr);
}

export async function loadSolarTermsFromFile(): Promise<void> {
  try {
    const paths = ['./services/jq.txt', './jq.txt', '/jq.txt'];
    let response: Response | null = null;
    for (const p of paths) {
      try {
        const r = await fetch(p);
        if (r.ok) { response = r; break; }
      } catch (e) { continue; }
    }
    if (!response) throw new Error("Solar terms file (jq.txt) not found");
    const content = await response.text();
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    const allSolarTerms: SolarTermData[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const bjDate = parseBeijingTime(line);
      if (isNaN(bjDate.getTime())) continue;

      const year = bjDate.getFullYear();
      /**
       * jq.txt contains exactly 12 terms per year (the "Sections" or "节").
       * The first entry (1901-01-06) corresponds to "Xiao Han" (Index 1 in SOLAR_TERMS).
       * Every entry is followed by the next "Section", skipping the "Middle Qi".
       * Index = (i % 12) * 2 + 1
       */
      const termIndex = (i % 12) * 2 + 1;
      
      allSolarTerms.push({
        year, 
        termIndex, 
        name: SOLAR_TERMS[termIndex],
        date: bjDate
      });
    }

    allSolarTerms.forEach(t => {
      if (!solarTermCache.has(t.year)) solarTermCache.set(t.year, []);
      solarTermCache.get(t.year)!.push(t);
    });
  } catch (e) {
    console.error('Failed to load solar terms:', e);
  }
}

export function getSolarTermDate(year: number, termIndex: number): Date | null {
  const yearTerms = solarTermCache.get(year);
  if (yearTerms) {
    const term = yearTerms.find(t => t.termIndex === termIndex);
    return term ? term.date : null;
  }
  return null;
}

/**
 * Returns the latest solar term before the given date.
 * Added id (termIndex) to the return object to satisfy engine requirements.
 */
export function getSolarTermForDate(date: Date): { name: string; date: Date; id: number } | null {
  const year = date.getFullYear();
  // Search within a 3-year window to ensure cross-year boundaries are handled.
  const yearsToSearch = [year - 1, year, year + 1];
  let allMatchedTerms: SolarTermData[] = [];
  
  yearsToSearch.forEach(y => {
    const terms = solarTermCache.get(y);
    if (terms) allMatchedTerms.push(...terms);
  });
  
  if (allMatchedTerms.length === 0) return null;
  
  const targetTs = date.getTime();
  const sorted = allMatchedTerms.sort((a, b) => b.date.getTime() - a.date.getTime());
  const found = sorted.find(t => t.date.getTime() <= targetTs);
  return found ? { name: found.name, date: found.date, id: found.termIndex } : null;
}