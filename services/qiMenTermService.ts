import { 
  getSolarTermForDate,
  getNextSolarTerm,
  getTimeToSolarTerm,
  getTermType
} from './solarTermParser';
import type { DunJuResult, SolarTermInfo } from '../types';
// 完整的遁局映射表（标准奇门规则）
const DUN_JU_MAPPING: Record<string, { type: '阳' | '阴', yuan: [number, number, number] }> = {
  // 阳遁九局 - 冬至上元阳一局，小寒上元阳二局，大寒上元阳三局，...
  '冬至': { type: '阳', yuan: [1, 7, 4] },
  '小寒': { type: '阳', yuan: [2, 8, 5] },
  '大寒': { type: '阳', yuan: [3, 9, 6] },
  '立春': { type: '阳', yuan: [8, 5, 2] },
  '雨水': { type: '阳', yuan: [9, 6, 3] },
  '惊蛰': { type: '阳', yuan: [1, 7, 4] },
  '春分': { type: '阳', yuan: [3, 9, 6] },
  '清明': { type: '阳', yuan: [4, 1, 7] },
  '谷雨': { type: '阳', yuan: [5, 2, 8] },
  '立夏': { type: '阳', yuan: [4, 1, 7] },
  '小满': { type: '阳', yuan: [5, 2, 8] },
  '芒种': { type: '阳', yuan: [6, 3, 9] },
  
  // 阴遁九局 - 夏至上元阴九局，小暑上元阴八局，...
  '夏至': { type: '阴', yuan: [9, 3, 6] },
  '小暑': { type: '阴', yuan: [8, 2, 5] },
  '大暑': { type: '阴', yuan: [7, 1, 4] },
  '立秋': { type: '阴', yuan: [2, 5, 8] },
  '处暑': { type: '阴', yuan: [1, 4, 7] },
  '白露': { type: '阴', yuan: [9, 3, 6] },
  '秋分': { type: '阴', yuan: [7, 1, 4] },
  '寒露': { type: '阴', yuan: [6, 9, 3] },
  '霜降': { type: '阴', yuan: [5, 8, 2] },
  '立冬': { type: '阴', yuan: [6, 9, 3] },
  '小雪': { type: '阴', yuan: [5, 8, 2] },
  '大雪': { type: '阴', yuan: [4, 7, 1] }
};

export interface DunJuResult {
  type: '阳' | '阴';  // 确保这行存在
  ju: number;
  yuan: '上元' | '中元' | '下元';
  termName: string;
  termDate: Date;
  daysSinceTerm: number;
  hoursSinceTerm: number;
  minutesSinceTerm: number;
  secondsSinceTerm: number;
  totalHoursSinceTerm: number;
  termType: '节' | '气';
  isExact: boolean;
  verification: {
    status: '精确' | '近似' | '错误';
    message: string;
  };
}

function formatDunJuResult(dunJu: DunJuResult): DunJuResult {
  return {
    type: dunJu.type,
    ju: dunJu.ju,
    yuan: dunJu.yuan,
    termName: dunJu.termName,
    termDate: dunJu.termDate,
    daysSinceTerm: Math.floor(dunJu.daysSinceTerm),
    hoursSinceTerm: dunJu.hoursSinceTerm,
    minutesSinceTerm: dunJu.minutesSinceTerm,
    secondsSinceTerm: dunJu.secondsSinceTerm,
    totalHoursSinceTerm: dunJu.totalHoursSinceTerm,
    termType: dunJu.termType,
    isExact: dunJu.isExact,
    verification: dunJu.verification
  };
}

/**
 * 计算精确的奇门遁局（基于精确节气数据）
 */
export function calculateExactDunJu(eventDate: Date): DunJuResult {
  // 1. 尝试获取当前节气
  const currentTerm = getSolarTermForDate(eventDate);
  
  if (!currentTerm) {
    console.warn('无法获取精确节气信息，使用近似算法');
    return calculateFallbackDunJu(eventDate);
  }
  
  // 2. 验证节气数据的合理性
  const termDate = currentTerm.date;
  const eventYear = eventDate.getFullYear();
  const termYear = termDate.getFullYear();
  
  // 年份差异不应超过1年
  if (Math.abs(eventYear - termYear) > 1) {
    console.warn(`节气年份 ${termYear} 与事件年份 ${eventYear} 差异过大，使用近似算法`);
    return calculateFallbackDunJu(eventDate);
  }
  
  // 检查节气是否在合理的时间范围内（事件时间应在节气之后）
  const diffMs = eventDate.getTime() - termDate.getTime();
  if (diffMs < 0) {
    console.warn(`事件时间在节气 ${currentTerm.name} 之前，需要重新计算`);
    // 尝试查找前一个节气
    return handleTermBeforeEvent(eventDate);
  }
  
  // 3. 精确计算时间差（毫秒）
  const totalSeconds = Math.max(0, diffMs / 1000);
  const totalMinutes = totalSeconds / 60;
  const totalHours = totalMinutes / 60;
  const totalDays = totalHours / 24;
  
  // 精确的天数（含小数）
  const daysSinceTermExact = totalDays;
  
  // 分解为天、小时、分钟、秒
  const daysSinceTerm = Math.floor(daysSinceTermExact);
  const remainingHours = (daysSinceTermExact - daysSinceTerm) * 24;
  const hoursSinceTerm = Math.floor(remainingHours);
  const remainingMinutes = (remainingHours - hoursSinceTerm) * 60;
  const minutesSinceTerm = Math.floor(remainingMinutes);
  const secondsSinceTerm = Math.floor((remainingMinutes - minutesSinceTerm) * 60);
  
  // 4. 验证天数合理性（不应超过15天一个周期）
  if (daysSinceTermExact >= 15) {
    console.warn(`距节气 ${currentTerm.name} 已 ${daysSinceTermExact.toFixed(2)} 天，超过正常周期，使用近似算法`);
    return calculateFallbackDunJu(eventDate);
  }
  
  // 5. 确定元数（每5天一元，共15天） - 使用精确的小数天数计算
  const yuanIndex = calculateYuanIndex(daysSinceTermExact);
  const yuanText = ['上元', '中元', '下元'][yuanIndex] as '上元' | '中元' | '下元';
  
  console.log(`精确计算: 距${currentTerm.name}节气 ${daysSinceTermExact.toFixed(2)} 天, 元数索引: ${yuanIndex} (${yuanText})`);
  
  // 6. 获取遁局映射
  const dunMapping = DUN_JU_MAPPING[currentTerm.name];
  
  if (!dunMapping) {
    console.warn(`未找到节气 ${currentTerm.name} 的遁局映射，使用近似算法`);
    return calculateFallbackDunJu(eventDate);
  }
  
  const juNum = dunMapping.yuan[yuanIndex];
  
  // 7. 验证结果
  const verification = verifyDunJuCalculation(
    eventDate,
    currentTerm.name,
    dunMapping.type,
    juNum,
    yuanIndex,
    daysSinceTermExact
  );
  
  // 如果验证失败，使用近似算法
  if (verification.status === '错误') {
    console.warn(`遁局计算验证失败: ${verification.message}，使用近似算法`);
    return calculateFallbackDunJu(eventDate);
  }
  
  const result = {
    type: dunMapping.type,
    ju: juNum,
    yuan: yuanText,
    termName: currentTerm.name,
    termDate: termDate,
    daysSinceTerm: daysSinceTermExact, // 保留小数天数
    hoursSinceTerm,
    minutesSinceTerm,
    secondsSinceTerm,
    totalHoursSinceTerm: totalHours, // 总小时数
    termType: getTermType(currentTerm.name) as '节' | '气',
    isExact: true,
    verification
  };
  
  return formatDunJuResult(result);
}

/**
 * 处理事件时间在节气之前的情况
 */
function handleTermBeforeEvent(eventDate: Date): DunJuResult {
  console.log('事件时间在节气之前，尝试查找前一个节气');
  
  // 这里需要查找前一个节气
  // 简化处理：使用近似算法
  return calculateFallbackDunJu(eventDate);
}

/**
 * 确定元数索引 - 使用精确的小数天数
 */
/**
 * 确定元数索引 - 使用精确的小数天数（修复版）
 */
function calculateYuanIndex(daysSinceTerm: number): number {
  console.log(`元数计算开始: 距节气 ${daysSinceTerm.toFixed(6)} 天`);
  
  // 标准奇门规则：每5天为一元，15天为一循环
  // 处理跨节气周期的情况
  let dayInCycle = daysSinceTerm % 15;
  
  // 处理负数情况
  if (dayInCycle < 0) {
    dayInCycle += 15;
  }
  
  console.log(`周期内第 ${dayInCycle.toFixed(6)} 天`);
  
  // 精确边界处理（使用0.0001容差避免浮点误差）
  const EPSILON = 0.0001;
  
  // 0-4.999...天：上元，5-9.999...天：中元，10-14.999...天：下元
  if (dayInCycle < 5 - EPSILON) {
    console.log(`  → 上元 (${dayInCycle.toFixed(6)} < 5)`);
    return 0; // 上元
  }
  if (dayInCycle < 10 - EPSILON) {
    console.log(`  → 中元 (${dayInCycle.toFixed(6)} < 10)`);
    return 1; // 中元
  }
  
  console.log(`  → 下元 (${dayInCycle.toFixed(6)} >= 10)`);
  return 2; // 下元
}

/**
 * 验证遁局计算结果（增强版）
 */
function verifyDunJuCalculation(
  date: Date,
  termName: string,
  type: '阳' | '阴',
  ju: number,
  yuanIndex: number,
  daysSinceTerm: number
): { status: '精确' | '近似' | '错误'; message: string } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. 检查元数索引
  if (yuanIndex < 0 || yuanIndex > 2) {
    errors.push(`元数索引 ${yuanIndex} 超出范围 (0-2)`);
  }
  
  // 2. 检查节气类型
  const termType = getTermType(termName);
  
  // 奇门规则：阳遁从冬至开始，阴遁从夏至开始
  if (termType === '气' && !['冬至', '夏至'].includes(termName)) {
    warnings.push('使用中气计算遁局，可能存在误差');
  }
  
  // 3. 检查天数合理性
  if (daysSinceTerm < 0) {
    errors.push(`距节气天数不能为负数: ${daysSinceTerm.toFixed(2)}`);
  }
  
  if (daysSinceTerm > 15) {
    warnings.push(`距节气 ${daysSinceTerm.toFixed(2)} 天，可能已进入下个节气周期`);
  }
  
  // 4. 检查局数合理性
  if (ju < 1 || ju > 9) {
    errors.push(`局数 ${ju} 超出1-9范围`);
  }
  
  // 5. 检查节气与遁局类型匹配
  const yangTerms = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种'];
  const yinTerms = ['夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪'];
  
  if (type === '阳' && !yangTerms.includes(termName)) {
    errors.push(`节气 ${termName} 不应为阳遁`);
  }
  
  if (type === '阴' && !yinTerms.includes(termName)) {
    errors.push(`节气 ${termName} 不应为阴遁`);
  }
  
  // 6. 验证节气映射是否存在
  if (!DUN_JU_MAPPING[termName]) {
    errors.push(`未找到节气 ${termName} 的遁局映射`);
  }
  
  // 返回结果
  if (errors.length > 0) {
    return {
      status: '错误',
      message: errors.join('; ')
    };
  }
  
  if (warnings.length > 0) {
    return {
      status: '近似',
      message: warnings.join('; ')
    };
  }
  
  return {
    status: '精确',
    message: '计算通过所有验证'
  };
}

/**
 * 备用算法（当节气数据不可用时）
 */
function calculateFallbackDunJu(date: Date): DunJuResult {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  
  // 简易节气判断
  const termName = getApproximateTerm(month, day);
  
  // 获取节气近似日期（每月1号）
  const termDate = new Date(date.getFullYear(), month - 1, 1);
  
  // 计算近似天数
  const daysSinceTerm = day - 1 + hour / 24 + minute / 1440 + second / 86400;
  
  const yuanIndex = calculateYuanIndex(daysSinceTerm);
  const yuanText = ['上元', '中元', '下元'][yuanIndex] as '上元' | '中元' | '下元';
  
  const dunMapping = DUN_JU_MAPPING[termName] || { type: '阳', yuan: [1, 7, 4] };
  const juNum = dunMapping.yuan[yuanIndex];
  
  // 分解时间
  const days = Math.floor(daysSinceTerm);
  const remainingHours = (daysSinceTerm - days) * 24;
  const hours = Math.floor(remainingHours);
  const remainingMinutes = (remainingHours - hours) * 60;
  const minutes = Math.floor(remainingMinutes);
  const seconds = Math.floor((remainingMinutes - minutes) * 60);
  
  return {
    type: dunMapping.type,
    ju: juNum,
    yuan: yuanText,
    termName,
    termDate,
    daysSinceTerm: daysSinceTerm,
    hoursSinceTerm: hours,
    minutesSinceTerm: minutes,
    secondsSinceTerm: seconds,
    totalHoursSinceTerm: daysSinceTerm * 24,
    termType: getTermType(termName) as '节' | '气',
    isExact: false,
    verification: {
      status: '近似',
      message: '使用近似算法计算'
    }
  };
}

/**
 * 根据月份和日期近似判断节气
 */
function getApproximateTerm(month: number, day: number): string {
  const termMap: { [key: number]: { name: string; approxDay: number }[] } = {
    1: [{ name: '小寒', approxDay: 5 }, { name: '大寒', approxDay: 20 }],
    2: [{ name: '立春', approxDay: 4 }, { name: '雨水', approxDay: 19 }],
    3: [{ name: '惊蛰', approxDay: 5 }, { name: '春分', approxDay: 20 }],
    4: [{ name: '清明', approxDay: 4 }, { name: '谷雨', approxDay: 20 }],
    5: [{ name: '立夏', approxDay: 5 }, { name: '小满', approxDay: 21 }],
    6: [{ name: '芒种', approxDay: 5 }, { name: '夏至', approxDay: 21 }],
    7: [{ name: '小暑', approxDay: 7 }, { name: '大暑', approxDay: 23 }],
    8: [{ name: '立秋', approxDay: 7 }, { name: '处暑', approxDay: 23 }],
    9: [{ name: '白露', approxDay: 7 }, { name: '秋分', approxDay: 23 }],
    10: [{ name: '寒露', approxDay: 8 }, { name: '霜降', approxDay: 23 }],
    11: [{ name: '立冬', approxDay: 7 }, { name: '小雪', approxDay: 22 }],
    12: [{ name: '大雪', approxDay: 7 }, { name: '冬至', approxDay: 22 }]
  };
  
  const terms = termMap[month] || [];
  let selectedTerm = '冬至';
  
  for (const term of terms) {
    if (day >= term.approxDay) {
      selectedTerm = term.name;
    }
  }
  
  return selectedTerm;
}

/**
 * 获取节气信息用于显示
 */
export function getTermDisplayInfo(date: Date): {
  currentTerm: string;
  currentTermDate: Date;
  nextTerm: string | null;
  nextTermDate: Date | null;
  daysToNext: number | null;
  hoursToNext: number | null;
  minutesToNext: number | null;
  isTransition: boolean;
} {
  const currentTerm = getSolarTermForDate(date);
  const nextTerm = getNextSolarTerm(date);
  
  if (!currentTerm) {
    return {
      currentTerm: '未知',
      currentTermDate: date,
      nextTerm: null,
      nextTermDate: null,
      daysToNext: null,
      hoursToNext: null,
      minutesToNext: null,
      isTransition: false
    };
  }
  
  let daysToNext: number | null = null;
  let hoursToNext: number | null = null;
  let minutesToNext: number | null = null;
  
  if (nextTerm) {
    const diffMs = nextTerm.date.getTime() - date.getTime();
    const totalHours = diffMs / (1000 * 60 * 60);
    daysToNext = Math.floor(totalHours / 24);
    hoursToNext = Math.floor(totalHours % 24);
    minutesToNext = Math.floor((totalHours * 60) % 60);
  }
  
  // 节气交接期：节气前后3天
  const isTransition = daysToNext !== null && daysToNext <= 3;
  
  return {
    currentTerm: currentTerm.name,
    currentTermDate: currentTerm.date,
    nextTerm: nextTerm?.name || null,
    nextTermDate: nextTerm?.date || null,
    daysToNext,
    hoursToNext,
    minutesToNext,
    isTransition
  };
}

/**
 * 测试特定日期的遁局计算
 */
export function testDunJuCalculation(date: Date): void {
  console.log('=== 遁局计算测试 ===');
  console.log('测试日期:', date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
  
  const dunJu = calculateExactDunJu(date);
  console.log('计算结果:');
  console.log('  节气:', dunJu.termName);
  console.log('  类型:', dunJu.type);
  console.log('  局数:', dunJu.ju);
  console.log('  元数:', dunJu.yuan);
  console.log('  距节气:', `${dunJu.daysSinceTerm.toFixed(2)}天 (${Math.floor(dunJu.daysSinceTerm)}天${dunJu.hoursSinceTerm}小时${dunJu.minutesSinceTerm}分)`);
  console.log('  精度:', dunJu.verification.status);
  console.log('  消息:', dunJu.verification.message);
  
  const termInfo = getTermDisplayInfo(date);
  console.log('\n节气信息:');
  console.log('  当前节气:', termInfo.currentTerm);
  if (termInfo.nextTerm) {
    console.log('  下个节气:', termInfo.nextTerm);
    console.log('  距离下个节气:', `${termInfo.daysToNext}天${termInfo.hoursToNext}小时${termInfo.minutesToNext}分`);
  }
}