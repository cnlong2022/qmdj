import { STEMS, BRANCHES, STEM_ELEMENTS, STEM_POLARITY, ELEMENT_RELATIONS } from '../constants';
import { DaYun, LiuNian, YunNianAnalysis, StemBranch } from '../types';
import { getSolarTermDate, getSolarTermForDate } from './solarTermParser';

/**
 * 计算大运和流年（基于当前事件时间）
 */
export function calculateYunNian(
  birthDate: Date,            // 出生日期
  currentDate: Date,          // 当前事件时间
  gender: '男' | '女',
  pillars: {
    year: StemBranch;
    month: StemBranch;
    day: StemBranch;
    hour: StemBranch;
  }
): YunNianAnalysis {
  // 参数验证
  if (!(birthDate instanceof Date) || isNaN(birthDate.getTime())) {
    throw new Error('出生日期参数无效');
  }
  
  if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
    throw new Error('当前事件时间参数无效');
  }
  
  if (!['男', '女'].includes(gender)) {
    throw new Error('性别参数无效');
  }
  
  // 获取出生和当前时间信息
  const birthYear = birthDate.getFullYear();
  const birthMonth = birthDate.getMonth() + 1;
  const birthDay = birthDate.getDate();
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  
  // 1. 计算起运岁数（精确计算）
  const { qiYunAge, qiYunYears, qiYunMonths, qiYunDays, qiYunHours, direction } = calculateQiYunPrecise(
    birthDate,
    pillars.year.stem,
    gender
  );
  
  // 2. 计算当前年龄（虚岁）
  const currentAge = calculateCurrentAge(birthYear, birthMonth, birthDay, currentYear, currentMonth, currentDay);
  
  // 3. 排大运
  const daYun = calculateDaYun(
    pillars.month, 
    direction, 
    qiYunAge,
    currentAge,
    pillars.day.stem,
    birthYear
  );
  
  // 4. 排流年
  const liuNian = calculateLiuNian(
    currentDate,
    currentAge,
    pillars.year,
    pillars.day.stem
  );
  
  return {
    daYun,
    liuNian,
    qiYunAge,
    qiYunDate: qiYunYears > 0 ? 
      `${qiYunYears}年${qiYunMonths}月${qiYunDays}天${qiYunHours}时` : 
      `${qiYunMonths}月${qiYunDays}天${qiYunHours}时`,
    direction
  };
}

/**
 * 计算当前虚岁
 */
function calculateCurrentAge(
  birthYear: number, birthMonth: number, birthDay: number,
  currentYear: number, currentMonth: number, currentDay: number
): number {
  let age = currentYear - birthYear + 1; // 虚岁
  
  // 如果生日还没过，需要减1岁
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age--;
  }
  
  return Math.max(1, age);
}

/**
 * 精确计算起运岁数（修正版本）
 */
function calculateQiYunPrecise(
  birthDate: Date,
  yearStem: string,
  gender: '男' | '女'
): {
  qiYunAge: number;      // 起运岁数（整数岁）
  qiYunYears: number;    // 起运年数
  qiYunMonths: number;   // 起运月数
  qiYunDays: number;     // 起运天数
  qiYunHours: number;    // 起运小时数
  direction: '顺' | '逆';
} {
  // 判断年干阴阳
  const yearStemYinYang = STEM_POLARITY[yearStem];
  
  // 判断顺逆规则
  const isShun = (yearStemYinYang === '阳' && gender === '男') ||
                (yearStemYinYang === '阴' && gender === '女');
  
  const direction = isShun ? '顺' : '逆';
  
  const birthYear = birthDate.getFullYear();
  const birthMonth = birthDate.getMonth() + 1;
  const birthDay = birthDate.getDate();
  const birthHour = birthDate.getHours();
  const birthMinute = birthDate.getMinutes();
  
  // 查找节气
  let termDate: Date | null = null;
  
  // 节气的索引：立春(3), 惊蛰(5), 清明(7), 立夏(9), 芒种(11), 小暑(13), 
  // 立秋(15), 白露(17), 寒露(19), 立冬(21), 大雪(23), 小寒(1)
  // 奇数索引的节气为节，偶数索引的节气为中气
  
  if (isShun) {
    // 顺排：找出生后的下一个节
    for (let i = 1; i <= 24; i += 2) {
      const term = getSolarTermDate(birthYear, i);
      if (term && term > birthDate) {
        termDate = term;
        break;
      }
    }
    
    // 如果当年没找到，找下一年的立春
    if (!termDate) {
      termDate = getSolarTermDate(birthYear + 1, 3);
    }
  } else {
    // 逆排：找出生前的上一个节
    let lastTerm: Date | null = null;
    for (let i = 1; i <= 24; i += 2) {
      const term = getSolarTermDate(birthYear, i);
      if (term && term < birthDate) {
        lastTerm = term;
      }
    }
    
    // 如果当年没找到，找上一年的小寒
    if (!lastTerm) {
      lastTerm = getSolarTermDate(birthYear - 1, 1);
    }
    termDate = lastTerm;
  }
  
  if (!termDate) {
    return {
      qiYunAge: 1,
      qiYunYears: 0,
      qiYunMonths: 0,
      qiYunDays: 0,
      qiYunHours: 0,
      direction
    };
  }
  
  // 计算时间差（毫秒）
  let timeDiffMs: number;
  if (isShun) {
    timeDiffMs = termDate.getTime() - birthDate.getTime();
  } else {
    timeDiffMs = birthDate.getTime() - termDate.getTime();
  }
  
  // 转换为分钟
  const timeDiffMinutes = timeDiffMs / (1000 * 60);
  
  // 转换为天（包括小数部分）
  const daysDiff = timeDiffMinutes / (60 * 24);
  
  // 传统算法：3天为1岁，1天为4个月，1个时辰（2小时）为10天
  // 但实际计算更精确：先计算总分钟数，然后转换为年、月、日、时
  
  // 计算总天数（包括小数）
  const totalDays = daysDiff;
  
  // 计算起运年数（3天为1岁）
  const yearsFromDays = totalDays / 3;
  const qiYunYearsInt = Math.floor(yearsFromDays);
  
  // 计算剩余的不足3天的部分
  const remainingDays = (yearsFromDays - qiYunYearsInt) * 3;
  
  // 将剩余天数转换为月（1天=4个月）
  const monthsFromRemainingDays = remainingDays * 4;
  const qiYunMonthsInt = Math.floor(monthsFromRemainingDays);
  
  // 计算剩余不足1天的部分
  const remainingDaysFromMonths = (monthsFromRemainingDays - qiYunMonthsInt) * (30 / 4); // 1个月=7.5天
  
  const qiYunDaysInt = Math.floor(remainingDaysFromMonths);
  
  // 计算剩余小时
  const remainingHours = (remainingDaysFromMonths - qiYunDaysInt) * 24;
  const qiYunHoursInt = Math.round(remainingHours);
  
  // 起运岁数 = 年数 + 1（虚岁起运）
  const qiYunAge = qiYunYearsInt + 1;

  return {
    qiYunAge,
    qiYunYears: qiYunYearsInt,
    qiYunMonths: qiYunMonthsInt,
    qiYunDays: qiYunDaysInt,
    qiYunHours: qiYunHoursInt,
    direction
  };
}

/**
 * 计算大运（修正版本）
 */
function calculateDaYun(
  monthPillar: StemBranch,
  direction: '顺' | '逆',
  qiYunAge: number,      // 起运岁数
  currentAge: number,    // 当前虚岁
  dayMaster: string,
  birthYear: number      // 出生年份
): DaYun[] {
  const daYun: DaYun[] = [];
  
  // 月柱干支索引
  const monthStemIdx = STEMS.indexOf(monthPillar.stem);
  const monthBranchIdx = BRANCHES.indexOf(monthPillar.branch);
  
  // 根据顺逆确定起始干支
  let currentStemIdx: number, currentBranchIdx: number;
  
  if (direction === '顺') {
    // 顺排：从月柱的下一个干支开始
    currentStemIdx = (monthStemIdx + 1) % 10;
    currentBranchIdx = (monthBranchIdx + 1) % 12;
  } else {
    // 逆排：从月柱的上一个干支开始
    currentStemIdx = monthStemIdx - 1;
    if (currentStemIdx < 0) currentStemIdx = 9;
    
    currentBranchIdx = monthBranchIdx - 1;
    if (currentBranchIdx < 0) currentBranchIdx = 11;
  }
  
  // 计算当前所在的大运步数
  // 大运从qiYunAge岁开始，每10年一步
  const yearsSinceQiYun = Math.max(0, currentAge - qiYunAge);
  const currentDaYunStep = Math.floor(yearsSinceQiYun / 10);
  
  // 生成9个大运
  const totalSteps = 9;
  
  for (let i = 0; i < totalSteps; i++) {
    // 计算当前大运的干支
    let stemIdx: number, branchIdx: number;
    
    if (direction === '顺') {
      stemIdx = (currentStemIdx + i) % 10;
      branchIdx = (currentBranchIdx + i) % 12;
    } else {
      // 逆排：需要向前推算
      stemIdx = currentStemIdx - i;
      while (stemIdx < 0) stemIdx += 10;
      
      branchIdx = currentBranchIdx - i;
      while (branchIdx < 0) branchIdx += 12;
    }
    
    const pillar: StemBranch = {
      stem: STEMS[stemIdx],
      branch: BRANCHES[branchIdx]
    };
    
    // 计算大运起始和结束年龄
    // 第1运：从qiYunAge岁开始，到qiYunAge+9岁
    const startAge = qiYunAge + i * 10;
    const endAge = startAge + 9;
    
    // 计算对应的年份范围
    const startYear = birthYear + startAge - 1;
    const endYear = startYear + 9;
    
    // 判断是否为当前大运
    const isCurrent = i === currentDaYunStep;
    
    // 计算十神（相对于日主）
    const tenGod = getTenGodForStem(dayMaster, pillar.stem);
    
    // 判断大运状态
    let status = '';
    if (isCurrent) {
      status = '当前大运';
    } else if (endAge < currentAge) {
      status = '过去大运';
    } else if (startAge > currentAge) {
      status = '未来大运';
    }
    
    daYun.push({
      startAge,
      pillar,
      ageRange: `${startAge}～${endAge}岁`,
      decade: `${i + 1}运`,
      element: STEM_ELEMENTS[pillar.stem],
      tenGod,
      isCurrent,
      yearRange: `${startYear}～${endYear}年`,
      status
    });
  }
  
  return daYun;
}

/**
 * 计算流年（考虑立春换年）
 */
function calculateLiuNian(
  currentDate: Date,
  currentAge: number,
  yearPillar: StemBranch,
  dayMaster: string
): LiuNian[] {
  const liuNian: LiuNian[] = [];
  
  // 获取当前年份的立春
  const currentYear = currentDate.getFullYear();
  const liChunDate = getSolarTermDate(currentYear, 3);
  
  // 确定干支年：如果当前日期在立春前，用上一年干支
  let liuNianYear = currentYear;
  if (liChunDate && currentDate.getTime() < liChunDate.getTime()) {
    liuNianYear = currentYear - 1;
  }
  
  // 计算基准年（1984年为甲子年）
  const baseYear = 1984;
  const yearOffset = liuNianYear - baseYear;
  
  // 计算基准干支索引
  const baseStemIdx = ((yearOffset % 10) + 10) % 10;
  const baseBranchIdx = ((yearOffset % 12) + 12) % 12;
  
  // 排前5后9年流年（共15年）
  for (let i = -5; i <= 9; i++) {
    const year = liuNianYear + i;
    const age = currentAge + i;
    
    if (age < 1) continue;
    
    // 计算流年干支
    const stemIdx = (baseStemIdx + i + 10) % 10;
    const branchIdx = (baseBranchIdx + i + 12) % 12;
    
    const stemBranch: StemBranch = {
      stem: STEMS[stemIdx],
      branch: BRANCHES[branchIdx]
    };
    
    // 判断特殊年份
    let clash = '';
    let special = '';
    
    if (i === 0) {
      clash = '当前年';
    }
    
    // 判断是否为本命年（地支相同）
    if (stemBranch.branch === yearPillar.branch) {
      special = '本命年';
    }
    
    // 判断是否冲太岁
    const branchPairs: {[key: string]: string} = {
      '子': '午', '午': '子',
      '丑': '未', '未': '丑',
      '寅': '申', '申': '寅',
      '卯': '酉', '酉': '卯',
      '辰': '戌', '戌': '辰',
      '巳': '亥', '亥': '巳'
    };
    
    if (branchPairs[stemBranch.branch] === yearPillar.branch) {
      special = special ? special + ' 冲太岁' : '冲太岁';
    }
    
    // 计算十神
    const tenGod = getTenGodForStem(dayMaster, stemBranch.stem);
    
    liuNian.push({
      year,
      stemBranch,
      age,
      element: STEM_ELEMENTS[stemBranch.stem],
      tenGod,
      clash,
      special
    });
  }
  
  return liuNian.sort((a, b) => a.year - b.year);
}

/**
 * 根据日主和天干计算十神
 */
function getTenGodForStem(dayMaster: string, targetStem: string): string {
  const dayMasterElement = STEM_ELEMENTS[dayMaster];
  const targetElement = STEM_ELEMENTS[targetStem];
  
  if (dayMasterElement === targetElement) {
    const dayMasterPolarity = STEM_POLARITY[dayMaster];
    const targetPolarity = STEM_POLARITY[targetStem];
    
    if (dayMasterPolarity === targetPolarity) {
      return '比肩';
    } else {
      return '劫财';
    }
  }
  
  const relations = ELEMENT_RELATIONS[dayMasterElement];
  
  if (targetElement === relations.wasSheng) {
    const dayMasterPolarity = STEM_POLARITY[dayMaster];
    const targetPolarity = STEM_POLARITY[targetStem];
    
    if (dayMasterPolarity === targetPolarity) {
      return '偏印';
    } else {
      return '正印';
    }
  }
  
  if (targetElement === relations.sheng) {
    const dayMasterPolarity = STEM_POLARITY[dayMaster];
    const targetPolarity = STEM_POLARITY[targetStem];
    
    if (dayMasterPolarity === targetPolarity) {
      return '食神';
    } else {
      return '伤官';
    }
  }
  
  if (targetElement === relations.ke) {
    const dayMasterPolarity = STEM_POLARITY[dayMaster];
    const targetPolarity = STEM_POLARITY[targetStem];
    
    if (dayMasterPolarity === targetPolarity) {
      return '偏财';
    } else {
      return '正财';
    }
  }
  
  if (targetElement === relations.wasKe) {
    const dayMasterPolarity = STEM_POLARITY[dayMaster];
    const targetPolarity = STEM_POLARITY[targetStem];
    
    if (dayMasterPolarity === targetPolarity) {
      return '七杀';
    } else {
      return '正官';
    }
  }
  
  return '--';
}

/**
 * 格式化大运流年显示
 */
export function formatYunNianDisplay(yunNian: YunNianAnalysis): {
  daYunText: string[];
  liuNianText: string[];
} {
  const daYunText: string[] = [];
  const liuNianText: string[] = [];
  
  // 大运信息
  daYunText.push(`起运：${yunNian.qiYunAge}岁（${yunNian.qiYunDate}） ${yunNian.direction}行`);
  
  yunNian.daYun.forEach((yun) => {
    const isCurrent = yun.isCurrent ? '→ ' : '  ';
    const yearRange = (yun as any).yearRange ? ` ${(yun as any).yearRange}` : '';
    const status = (yun as any).status ? ` ${(yun as any).status}` : '';
    
    daYunText.push(
      `${isCurrent}${yun.decade}：${yun.pillar.stem}${yun.pillar.branch} ${yun.ageRange}${yearRange} ${yun.element} | ${yun.tenGod}${status}`
    );
  });
  
  // 流年信息
  liuNianText.push('近年流年：');
  yunNian.liuNian.forEach((nian) => {
    const isCurrent = nian.clash === '当前年';
    const prefix = isCurrent ? '→ ' : '  ';
    let text = `${prefix}${nian.year}年（${nian.age}岁）：${nian.stemBranch.stem}${nian.stemBranch.branch} ${nian.element} | ${nian.tenGod}`;
    if (nian.clash) text += ` [${nian.clash}]`;
    if (nian.special) text += ` (${nian.special})`;
    liuNianText.push(text);
  });
  
  return { daYunText, liuNianText };
}

/**
 * 辅助函数：获取四柱对象
 */
export function stemBranchPillars(pillars: {
  year: StemBranch;
  month: StemBranch;
  day: StemBranch;
  hour: StemBranch;
}): {
  year: StemBranch;
  month: StemBranch;
  day: StemBranch;
  hour: StemBranch;
} {
  return pillars;
}