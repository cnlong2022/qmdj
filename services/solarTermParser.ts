import { SOLAR_TERMS } from '../constants';

export interface SolarTermData {
  year: number;
  termIndex: number; // 在SOLAR_TERMS数组中的索引
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

/**
 * 加载节气数据（修复版本，正确处理索引对齐）
 */
export async function loadSolarTermsFromFile(): Promise<boolean> {
  try {
    console.log('开始加载节气数据...');
    
    // 尝试不同的文件路径
    const paths = [
      './services/jq.txt',
      './jq.txt', 
      '/jq.txt',
    ];
    
    let response: Response | null = null;
    let content = '';
    
    for (const p of paths) {
      try {
        console.log(`尝试加载: ${p}`);
        response = await fetch(p);
        
        if (response.ok) { 
          content = await response.text();
          console.log(`成功从 ${p} 加载节气数据，内容长度: ${content.length}`);
          break;
        }
      } catch (e: any) { 
        console.warn(`路径 ${p} 失败:`, e.message || e); 
        continue; 
      }
    }
    
    if (!content) {
      console.warn('节气文件未找到，使用内置默认数据');
      return false;
    }
    
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      console.warn('节气文件为空');
      return false;
    }
    
    console.log(`解析到 ${lines.length} 行节气数据`);
    
    // 清空缓存
    solarTermCache.clear();
    
    // 按年份分组存储
    const termsByYear: Map<number, Array<{date: Date; lineIndex: number}>> = new Map();
    
    // 第一步：解析所有行，按年份分组
    let globalLineIndex = 0;
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      const bjDate = parseBeijingTime(trimmedLine);
      if (isNaN(bjDate.getTime())) {
        console.warn(`行 ${globalLineIndex} 日期格式无效: ${trimmedLine}`);
        globalLineIndex++;
        continue;
      }

      const year = bjDate.getFullYear();
      
      if (!termsByYear.has(year)) {
        termsByYear.set(year, []);
      }
      termsByYear.get(year)!.push({date: bjDate, lineIndex: globalLineIndex});
      globalLineIndex++;
    }
    
    // 第二步：检查数据完整性，每年应该是12行（12个节）
    for (const [year, terms] of termsByYear.entries()) {
      terms.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      if (terms.length !== 12) {
        console.warn(`年份 ${year} 的节气数据不是12个，而是 ${terms.length} 个，可能数据不完整`);
      }
    }
    
    // 第三步：构建完整的24节气
    // 数据文件包含12个节（奇数索引），我们需要补充12个气（偶数索引）
    // 从冬至开始：0-冬至(气), 1-小寒(节), 2-大寒(气), 3-立春(节), ...
    
    // 获取所有年份，按顺序排序
    const years = Array.from(termsByYear.keys()).sort();
    
    for (let i = 0; i < years.length; i++) {
      const year = years[i];
      const currentYearTerms = termsByYear.get(year) || [];
      const nextYear = years[i + 1];
      const prevYear = years[i - 1];
      
      const fullYearTerms: SolarTermData[] = [];
      
      // 如果当前年份没有完整12个节，跳过
      if (currentYearTerms.length < 12) {
        console.warn(`年份 ${year} 节气数据不完整，跳过`);
        continue;
      }
      
      // 获取相邻年份的数据用于插值
      const prevYearLastTerm = prevYear ? termsByYear.get(prevYear)?.slice(-1)[0] : null;
      const nextYearFirstTerm = nextYear ? termsByYear.get(nextYear)?.[0] : null;
      
      // 构建24节气
      for (let termIdx = 0; termIdx < 24; termIdx++) {
        const isJie = termIdx % 2 === 1; // 奇数索引为"节"
        const termName = SOLAR_TERMS[termIdx];
        
        if (isJie) {
          // 节：从数据文件中获取
          const jieIndex = Math.floor(termIdx / 2); // 0-小寒, 1-立春, 2-惊蛰, ...
          if (jieIndex < currentYearTerms.length) {
            fullYearTerms.push({
              year,
              termIndex: termIdx,
              name: termName,
              date: currentYearTerms[jieIndex].date
            });
          }
        } else {
          // 气：需要插值计算
          // 气在两个节之间，取前后两个节的中点
          let prevJie: Date | null = null;
          let nextJie: Date | null = null;
          
          if (termIdx === 0) {
            // 冬至：在前一年大雪(23)和当年小寒(1)之间
            if (prevYearLastTerm) {
              prevJie = prevYearLastTerm.date; // 前一年大雪
            }
            if (currentYearTerms[0]) {
              nextJie = currentYearTerms[0].date; // 当年小寒
            }
          } else if (termIdx === 22) {
            // 小雪：在当年立冬(21)和大雪(23)之间
            if (currentYearTerms[10]) { // 立冬是第11个节（索引10）
              prevJie = currentYearTerms[10].date;
            }
            if (currentYearTerms[11]) { // 大雪是第12个节（索引11）
              nextJie = currentYearTerms[11].date;
            }
          } else if (termIdx === 2) {
            // 大寒：在小寒(1)和立春(3)之间
            if (currentYearTerms[0]) { // 小寒
              prevJie = currentYearTerms[0].date;
            }
            if (currentYearTerms[1]) { // 立春
              nextJie = currentYearTerms[1].date;
            }
          } else if (termIdx === 4) {
            // 雨水：在立春(3)和惊蛰(5)之间
            if (currentYearTerms[1]) { // 立春
              prevJie = currentYearTerms[1].date;
            }
            if (currentYearTerms[2]) { // 惊蛰
              nextJie = currentYearTerms[2].date;
            }
          } else if (termIdx === 6) {
            // 春分：在惊蛰(5)和清明(7)之间
            if (currentYearTerms[2]) { // 惊蛰
              prevJie = currentYearTerms[2].date;
            }
            if (currentYearTerms[3]) { // 清明
              nextJie = currentYearTerms[3].date;
            }
          } else if (termIdx === 8) {
            // 谷雨：在清明(7)和立夏(9)之间
            if (currentYearTerms[3]) { // 清明
              prevJie = currentYearTerms[3].date;
            }
            if (currentYearTerms[4]) { // 立夏
              nextJie = currentYearTerms[4].date;
            }
          } else if (termIdx === 10) {
            // 小满：在立夏(9)和芒种(11)之间
            if (currentYearTerms[4]) { // 立夏
              prevJie = currentYearTerms[4].date;
            }
            if (currentYearTerms[5]) { // 芒种
              nextJie = currentYearTerms[5].date;
            }
          } else if (termIdx === 12) {
            // 夏至：在芒种(11)和小暑(13)之间
            if (currentYearTerms[5]) { // 芒种
              prevJie = currentYearTerms[5].date;
            }
            if (currentYearTerms[6]) { // 小暑
              nextJie = currentYearTerms[6].date;
            }
          } else if (termIdx === 14) {
            // 大暑：在小暑(13)和立秋(15)之间
            if (currentYearTerms[6]) { // 小暑
              prevJie = currentYearTerms[6].date;
            }
            if (currentYearTerms[7]) { // 立秋
              nextJie = currentYearTerms[7].date;
            }
          } else if (termIdx === 16) {
            // 处暑：在立秋(15)和白露(17)之间
            if (currentYearTerms[7]) { // 立秋
              prevJie = currentYearTerms[7].date;
            }
            if (currentYearTerms[8]) { // 白露
              nextJie = currentYearTerms[8].date;
            }
          } else if (termIdx === 18) {
            // 秋分：在白露(17)和寒露(19)之间
            if (currentYearTerms[8]) { // 白露
              prevJie = currentYearTerms[8].date;
            }
            if (currentYearTerms[9]) { // 寒露
              nextJie = currentYearTerms[9].date;
            }
          } else if (termIdx === 20) {
            // 霜降：在寒露(19)和立冬(21)之间
            if (currentYearTerms[9]) { // 寒露
              prevJie = currentYearTerms[9].date;
            }
            if (currentYearTerms[10]) { // 立冬
              nextJie = currentYearTerms[10].date;
            }
          }
          
          // 如果有前后两个节，计算中点
          if (prevJie && nextJie) {
            const midTime = (prevJie.getTime() + nextJie.getTime()) / 2;
            fullYearTerms.push({
              year,
              termIndex: termIdx,
              name: termName,
              date: new Date(midTime)
            });
          } else {
            // 无法计算，使用近似值（每月15号）
            const month = Math.floor(termIdx / 2);
            fullYearTerms.push({
              year,
              termIndex: termIdx,
              name: termName,
              date: new Date(year, month, 15, 12, 0, 0)
            });
          }
        }
      }
      
      // 按日期排序
      fullYearTerms.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // 验证排序后的索引顺序
      let hasIssue = false;
      for (let j = 0; j < fullYearTerms.length; j++) {
        if (fullYearTerms[j].termIndex !== j) {
          console.warn(`年份 ${year}: 第${j}个节气索引应为${j}，实际为${fullYearTerms[j].termIndex}，名称${fullYearTerms[j].name}`);
          hasIssue = true;
        }
      }
      
      // 如果有问题，尝试重新调整索引
      if (hasIssue) {
        console.warn(`年份 ${year} 节气索引不连续，尝试修复`);
        for (let j = 0; j < fullYearTerms.length; j++) {
          fullYearTerms[j].termIndex = j;
          fullYearTerms[j].name = SOLAR_TERMS[j];
        }
      }
      
      solarTermCache.set(year, fullYearTerms);
    }
    
    console.log(`节气数据加载完成，缓存了 ${solarTermCache.size} 年的数据`);
    
    // 验证数据质量
    verifySolarTermData();
    
    return true;
    
  } catch (e: any) {
    console.error('加载节气数据失败:', e);
    return false;
  }
}

/**
 * 验证节气数据质量
 */
function verifySolarTermData(): void {
  let totalTerms = 0;
  const issues: string[] = [];
  
  for (const [year, terms] of solarTermCache.entries()) {
    totalTerms += terms.length;
    
    // 检查是否有24个节气
    if (terms.length !== 24) {
      issues.push(`年份 ${year}: 只有 ${terms.length} 个节气`);
      continue;
    }
    
    // 检查节气顺序和时间
    for (let i = 0; i < terms.length - 1; i++) {
      if (terms[i].termIndex !== i) {
        issues.push(`年份 ${year}: 节气索引错乱，第${i}个应为${i}，实际为${terms[i].termIndex}`);
        break;
      }
      
      // 检查时间顺序
      if (terms[i].date.getTime() > terms[i + 1].date.getTime()) {
        issues.push(`年份 ${year}: 节气时间顺序错乱，${terms[i].name}在${terms[i+1].name}之后`);
        break;
      }
    }
  }
  
  console.log(`节气数据验证: 共 ${solarTermCache.size} 年，${totalTerms} 个节气`);
  if (issues.length > 0) {
    console.warn('节气数据问题:', issues.slice(0, 10));
    if (issues.length > 10) {
      console.warn(`... 还有 ${issues.length - 10} 个问题未显示`);
    }
  } else {
    console.log('节气数据验证通过');
  }
}

// 其余函数保持不变
export function getSolarTermDate(year: number, termIndex: number): Date | null {
  const yearTerms = solarTermCache.get(year);
  if (yearTerms) {
    return yearTerms.find(t => t.termIndex === termIndex)?.date || null;
  }
  return null;
}

export function getSolarTermForDate(date: Date): { name: string; date: Date; id: number } | null {
  const year = date.getFullYear();
  const targetTs = date.getTime();
  
  // 搜索前一年、当年、后一年的节气
  const yearsToSearch = [year - 1, year, year + 1];
  
  let closestTerm: SolarTermData | null = null;
  
  for (const y of yearsToSearch) {
    const terms = solarTermCache.get(y);
    if (!terms) continue;
    
    // 找到这个日期之前的最后一个节气
    for (const term of terms) {
      if (term.date.getTime() <= targetTs) {
        // 如果这个节气比之前找到的更近
        if (!closestTerm || term.date.getTime() > closestTerm.date.getTime()) {
          closestTerm = term;
        }
      }
    }
  }
  
  return closestTerm ? { 
    name: closestTerm.name, 
    date: closestTerm.date, 
    id: closestTerm.termIndex 
  } : null;
}

export function getNextSolarTerm(date: Date): { name: string; date: Date; id: number } | null {
  const year = date.getFullYear();
  const targetTs = date.getTime();
  
  // 搜索当年和后一年的节气
  const yearsToSearch = [year, year + 1];
  
  for (const y of yearsToSearch) {
    const terms = solarTermCache.get(y);
    if (!terms) continue;
    
    // 找到这个日期之后的第一个节气
    for (const term of terms) {
      if (term.date.getTime() > targetTs) {
        return { 
          name: term.name, 
          date: term.date, 
          id: term.termIndex 
        };
      }
    }
  }
  
  return null;
}

export function getTimeToSolarTerm(date: Date, termName: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
} | null {
  const year = date.getFullYear();
  const termIndex = SOLAR_TERMS.indexOf(termName);
  
  if (termIndex === -1) return null;
  
  // 查找节气
  let termDate: Date | null = null;
  const yearsToSearch = [year - 1, year, year + 1];
  
  for (const y of yearsToSearch) {
    const terms = solarTermCache.get(y);
    if (!terms) continue;
    
    const term = terms.find(t => t.termIndex === termIndex);
    if (term) {
      termDate = term.date;
      break;
    }
  }
  
  if (!termDate) return null;
  
  const diffMs = termDate.getTime() - date.getTime();
  const totalSeconds = Math.abs(diffMs) / 1000;
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds
  };
}

export function getTermType(termName: string): '节' | '气' | '未知' {
  const termIndex = SOLAR_TERMS.indexOf(termName);
  if (termIndex === -1) return '未知';
  
  // 节气索引规则：
  // 0-冬至(气), 1-小寒(节), 2-大寒(气), 3-立春(节), ...
  // 奇数索引为"节"，偶数索引为"气"
  return termIndex % 2 === 0 ? '气' : '节';
}