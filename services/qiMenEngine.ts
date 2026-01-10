import { 
  STEM_ELEMENTS, STEM_POLARITY, BRANCH_ELEMENTS, 
  BRANCH_HIDDEN_SCORES, ELEMENT_RELATIONS, KEY_TO_CHINESE,
  STEMS, BRANCHES, ELEMENT_TO_KEY, TERM_DUN_MAP, NINE_STARS, PALACE_NAMES, STEM_ORDER, LOSHU_SQUARE, EIGHT_GODS_YANG, EIGHT_GODS_YIN
} from '../constants';
import { StemBranch, ChartResult, PalaceData, PersonalInfo, BaziAnalysis, PillarDetail, FormattedPillar } from '../types';
import { getSolarTermDate, getSolarTermForDate } from './solarTermParser';
import { toLunar } from './nongliService';
import { analyzeBaziCore } from './analysisService';

// 旺相休囚死系数
const WANG_XIANG_XIU_QIU_SI_COEFFICIENTS: Record<string, number> = {
  '旺': 2.0,
  '余气': 1.6,
  '相': 1.5,
  '休': 0.8,
  '囚': 0.7,
  '死': 0.5
};

// 五行在每个月的旺相休囚死状态（基本状态，不考虑特殊情况）
const MONTH_ELEMENT_STATE_BASIC: Record<string, Record<string, string>> = {
  '寅': { '木': '旺', '火': '相', '土': '死', '金': '囚', '水': '休' },
  '卯': { '木': '旺', '火': '相', '土': '死', '金': '囚', '水': '休' },
  '辰': { '木': '囚', '火': '休', '土': '旺', '金': '相', '水': '死' },
  '巳': { '木': '休', '火': '旺', '土': '相', '金': '死', '水': '囚' },
  '午': { '木': '休', '火': '旺', '土': '相', '金': '死', '水': '囚' },
  '未': { '木': '囚', '火': '休', '土': '旺', '金': '相', '水': '死' },
  '申': { '木': '死', '火': '囚', '土': '休', '金': '旺', '水': '相' },
  '酉': { '木': '死', '火': '囚', '土': '休', '金': '旺', '水': '相' },
  '戌': { '木': '囚', '火': '休', '土': '旺', '金': '相', '水': '死' },
  '亥': { '木': '相', '火': '死', '土': '囚', '金': '休', '水': '旺' },
  '子': { '木': '相', '火': '死', '土': '囚', '金': '休', '水': '旺' },
  '丑': { '木': '囚', '火': '死', '土': '旺', '金': '相', '水': '死' }
};


const ZODIAC: Record<string, string> = {
  '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔', '辰': '龙', '巳': '蛇',
  '午': '马', '未': '羊', '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪'
};

// 空亡表：以日柱干支推算空亡地支
const EMPTY_BRANCHES: Record<string, string[]> = {
  '甲子': ['戌', '亥'], '甲戌': ['申', '酉'], '甲申': ['午', '未'],
  '甲午': ['辰', '巳'], '甲辰': ['寅', '卯'], '甲寅': ['子', '丑'],
  '乙丑': ['戌', '亥'], '乙亥': ['申', '酉'], '乙酉': ['午', '未'],
  '乙未': ['辰', '巳'], '乙巳': ['寅', '卯'], '乙卯': ['子', '丑'],
  '丙寅': ['戌', '亥'], '丙子': ['申', '酉'], '丙戌': ['午', '未'],
  '丙申': ['辰', '巳'], '丙午': ['寅', '卯'], '丙辰': ['子', '丑'],
  '丁卯': ['戌', '亥'], '丁丑': ['申', '酉'], '丁亥': ['午', '未'],
  '丁酉': ['辰', '巳'], '丁未': ['寅', '卯'], '丁巳': ['子', '丑'],
  '戊辰': ['戌', '亥'], '戊寅': ['申', '酉'], '戊子': ['午', '未'],
  '戊戌': ['辰', '巳'], '戊申': ['寅', '卯'], '戊午': ['子', '丑'],
  '己巳': ['戌', '亥'], '己卯': ['申', '酉'], '己丑': ['午', '未'],
  '己亥': ['辰', '巳'], '己酉': ['寅', '卯'], '己未': ['子', '丑'],
  '庚午': ['戌', '亥'], '庚辰': ['申', '酉'], '庚寅': ['午', '未'],
  '庚子': ['辰', '巳'], '庚戌': ['寅', '卯'], '庚申': ['子', '丑'],
  '辛未': ['戌', '亥'], '辛巳': ['申', '酉'], '辛卯': ['午', '未'],
  '辛丑': ['辰', '巳'], '辛亥': ['寅', '卯'], '辛酉': ['子', '丑'],
  '壬申': ['戌', '亥'], '壬午': ['申', '酉'], '壬辰': ['午', '未'],
  '壬寅': ['辰', '巳'], '壬子': ['寅', '卯'], '壬戌': ['子', '丑'],
  '癸酉': ['戌', '亥'], '癸未': ['申', '酉'], '癸巳': ['午', '未'],
  '癸卯': ['辰', '巳'], '癸丑': ['寅', '卯'], '癸亥': ['子', '丑']
};

// 调候用神表（简版）
const TIAO_HOU_SHEN: Record<string, Record<string, string[]>> = {
  '木': {
    '寅': ['丙', '癸'], '卯': ['丙', '癸'], '辰': ['丙', '癸', '庚'],
    '巳': ['癸', '庚'], '午': ['癸', '庚'], '未': ['癸', '庚'],
    '申': ['庚', '丁', '壬'], '酉': ['庚', '丁', '壬'], '戌': ['庚', '甲', '丁', '壬'],
    '亥': ['庚', '丁', '丙'], '子': ['庚', '丁', '丙'], '丑': ['庚', '丁', '丙']
  },
  '火': {
    '寅': ['壬', '庚'], '卯': ['壬', '庚'], '辰': ['壬', '庚'],
    '巳': ['壬', '庚'], '午': ['壬', '庚'], '未': ['壬', '庚'],
    '申': ['壬', '庚'], '酉': ['壬', '庚'], '戌': ['甲', '壬'],
    '亥': ['甲', '戊', '庚', '壬'], '子': ['甲', '戊', '庚', '壬'], '丑': ['甲', '戊', '庚', '壬']
  },
  '土': {
    '寅': ['丙', '癸'], '卯': ['丙', '癸'], '辰': ['丙', '癸', '甲'],
    '巳': ['癸', '丙'], '午': ['癸', '丙'], '未': ['癸', '丙'],
    '申': ['丙', '癸'], '酉': ['丙', '癸'], '戌': ['丙', '癸', '甲'],
    '亥': ['丙', '甲'], '子': ['丙', '甲'], '丑': ['丙', '甲']
  },
  '金': {
    '寅': ['丙', '庚', '甲'], '卯': ['丙', '庚', '甲'], '辰': ['丁', '甲', '庚'],
    '巳': ['壬', '庚'], '午': ['壬', '庚'], '未': ['壬', '庚'],
    '申': ['丁', '甲'], '酉': ['丁', '甲'], '戌': ['甲', '壬'],
    '亥': ['丙', '丁'], '子': ['丙', '丁'], '丑': ['丙', '丁']
  },
  '水': {
    '寅': ['庚', '丙', '戊'], '卯': ['庚', '丙', '戊'], '辰': ['庚', '丙'],
    '巳': ['壬', '庚'], '午': ['壬', '庚'], '未': ['壬', '庚'],
    '申': ['戊', '丁'], '酉': ['戊', '丁'], '戌': ['甲', '壬'],
    '亥': ['戊', '丙'], '子': ['戊', '丙'], '丑': ['丙']
  }
};

const XUN_MAP: Record<string, string> = { "甲子": "戊", "甲戌": "己", "甲申": "庚", "甲午": "辛", "甲辰": "壬", "甲寅": "癸" };
const STAR_ORIGIN: Record<string, number> = { "天蓬": 1, "天芮": 2, "天冲": 3, "天辅": 4, "天禽": 5, "天心": 6, "天柱": 7, "天任": 8, "天英": 9 };

/**
 * 判定十神
 */
export function getTenGodLabel(dayMaster: string, target: string): string {
  const dmEl = STEM_ELEMENTS[dayMaster];
  const dmPol = STEM_POLARITY[dayMaster];
  const tarEl = STEM_ELEMENTS[target] || BRANCH_ELEMENTS[target];
  const tarPol = STEM_POLARITY[target] || (['子','寅','辰','午','申','戌'].includes(target) ? '阳' : '阴');

  const samePol = dmPol === tarPol;
  const rel = ELEMENT_RELATIONS[dmEl];

  if (tarEl === dmEl) return samePol ? '比肩' : '劫财';
  if (tarEl === rel.wasSheng) return samePol ? '枭神' : '正印';
  if (tarEl === rel.sheng) return samePol ? '食神' : '伤官';
  if (tarEl === rel.ke) return samePol ? '偏财' : '正财';
  if (tarEl === rel.wasKe) return samePol ? '七杀' : '正官';
  return '--';
}

/**
 * 十神分类
 */
function getTenGodCategory(tenGod: string): string {
  if (['比肩', '劫财'].includes(tenGod)) return '比劫';
  if (['正印', '偏印'].includes(tenGod)) return '印绶';
  if (['正官', '七杀'].includes(tenGod)) return '官杀';
  if (['正财', '偏财'].includes(tenGod)) return '财才';
  if (['食神', '伤官'].includes(tenGod)) return '食伤';
  return '其他';
}

/**
 * 检查是否空亡
 */
function isEmptyBranch(dayStem: string, dayBranch: string, targetBranch: string): boolean {
  const key = `${dayStem}${dayBranch}`;
  return EMPTY_BRANCHES[key]?.includes(targetBranch) || false;
}

/**
 * 计算五行在每个月的旺相休囚死状态（考虑所有特殊情况）
 */
function getElementState(monthBranch: string, element: string, rawScores: Record<string, number>): string {
  // 基本状态
  const baseState = MONTH_ELEMENT_STATE_BASIC[monthBranch]?.[element] || '死';
  
  // 计算五行力量比例
  const totalScore = Object.values(rawScores).reduce((a, b) => a + b, 0);
  
  // 关键修复：使用 ELEMENT_TO_KEY 将中文五行转换为英文键
  const elementKey = ELEMENT_TO_KEY[element];
  const elementScore = elementKey ? rawScores[elementKey] || 0 : 0;
  
  const elementRatio = totalScore > 0 ? elementScore / totalScore : 0;
  
  // 特殊情况处理
  switch (monthBranch) {
    case '辰':
      // 木生于辰月——木不以囚论，而以余气论
      if (element === '木') return '余气';
      
      // 水生于辰月——当命局中水较旺时以相论，反之以死论
      if (element === '水') {
        return elementRatio > 0.15 ? '相' : '死';
      }
      break;
      
    case '未':
      // 火生于未月——火不以休论，而以余气论
      if (element === '火') return '余气';
      
      // 金生于未月——金以死论不以相论
      if (element === '金') return '死';
      break;
      
    case '戌':
      // 火生于戌月——当燥土党众或原局很干燥时以相论，反之以休论
      if (element === '火') {
        // 修复：正确获取土和水的分数
        const earthKey = ELEMENT_TO_KEY['土'];
        const waterKey = ELEMENT_TO_KEY['水'];
        const earthScore = earthKey ? rawScores[earthKey] || 0 : 0;
        const waterScore = waterKey ? rawScores[waterKey] || 0 : 0;
        // 土多水少为燥土
        return earthScore > waterScore * 2 ? '相' : '休';
      }
      
      // 金生于戌月——当燥土党众或原局很干燥时以死论，反之以相论
      if (element === '金') {
        const earthKey = ELEMENT_TO_KEY['土'];
        const waterKey = ELEMENT_TO_KEY['水'];
        const earthScore = earthKey ? rawScores[earthKey] || 0 : 0;
        const waterScore = waterKey ? rawScores[waterKey] || 0 : 0;
        return earthScore > waterScore * 2 ? '死' : '相';
      }
      break;
      
    case '丑':
      // 水生于丑月——水不以死论而以余气论
      if (element === '水') return '余气';
      
      // 土生于丑月——简化处理，所有土在丑月都按旺论
      if (element === '土') return '旺';
      break;
  }
  
  return baseState;
}

/**
 * 五行能量计算算法（基于旺相休囚死系数）
 */
function calculateElementEnergy(
  pillars: { year: StemBranch, month: StemBranch, day: StemBranch, hour: StemBranch },
  birthDate: Date
): {
  elementCounts: BaziAnalysis['elementCounts'],
  elementEnergy: BaziAnalysis['elementEnergy'],
  tenGodDistribution: BaziAnalysis['tenGodDistribution'],
  energyState: BaziAnalysis['energyState'],
  elementScoreDetails: Record<string, any>
} {
  const dm = pillars.day.stem;
  
  // 初始化原始分数
  const rawCounts: BaziAnalysis['elementCounts'] = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const tenGodCounts: BaziAnalysis['tenGodDistribution'] = {
    '比劫': 0, '印绶': 0, '官杀': 0, '财才': 0, '食伤': 0
  };
  
  // 详细得分记录
  const elementDetails: Record<string, {
    rawStemScore: number;
    rawBranchScore: number;
    rawHiddenScore: number;
    emptyFactors: number[];
    hiddenStems: Array<{ stem: string; branch: string; score: number }>;
    pillarScores: {
      year: { stem: string; branch: string; score: number };
      month: { stem: string; branch: string; score: number };
      day: { stem: string; branch: string; score: number };
      hour: { stem: string; branch: string; score: number };
    };
  }> = {
    wood: { rawStemScore: 0, rawBranchScore: 0, rawHiddenScore: 0, emptyFactors: [], hiddenStems: [], pillarScores: { year: { stem: '', branch: '', score: 0 }, month: { stem: '', branch: '', score: 0 }, day: { stem: '', branch: '', score: 0 }, hour: { stem: '', branch: '', score: 0 } } },
    fire: { rawStemScore: 0, rawBranchScore: 0, rawHiddenScore: 0, emptyFactors: [], hiddenStems: [], pillarScores: { year: { stem: '', branch: '', score: 0 }, month: { stem: '', branch: '', score: 0 }, day: { stem: '', branch: '', score: 0 }, hour: { stem: '', branch: '', score: 0 } } },
    earth: { rawStemScore: 0, rawBranchScore: 0, rawHiddenScore: 0, emptyFactors: [], hiddenStems: [], pillarScores: { year: { stem: '', branch: '', score: 0 }, month: { stem: '', branch: '', score: 0 }, day: { stem: '', branch: '', score: 0 }, hour: { stem: '', branch: '', score: 0 } } },
    metal: { rawStemScore: 0, rawBranchScore: 0, rawHiddenScore: 0, emptyFactors: [], hiddenStems: [], pillarScores: { year: { stem: '', branch: '', score: 0 }, month: { stem: '', branch: '', score: 0 }, day: { stem: '', branch: '', score: 0 }, hour: { stem: '', branch: '', score: 0 } } },
    water: { rawStemScore: 0, rawBranchScore: 0, rawHiddenScore: 0, emptyFactors: [], hiddenStems: [], pillarScores: { year: { stem: '', branch: '', score: 0 }, month: { stem: '', branch: '', score: 0 }, day: { stem: '', branch: '', score: 0 }, hour: { stem: '', branch: '', score: 0 } } }
  };
  
  // 天干分数：每个天干100分
  const STEM_SCORE = 100;
  
  // 获取空亡地支
  const emptyBranches: string[] = EMPTY_BRANCHES[`${pillars.day.stem}${pillars.day.branch}`] || [];

  // 修复：添加分数到原始计数和详细记录
  const addScore = (el: string, score: number, type: 'stem' | 'branch' | 'hidden', pillarType?: 'year' | 'month' | 'day' | 'hour', stemInfo?: string, branchInfo?: string) => {
    // 关键修复：使用 ELEMENT_TO_KEY 将中文五行转换为英文键
    const key = ELEMENT_TO_KEY[el];
    if (key) {
      rawCounts[key] += score;
      
      // 记录详细得分
      if (type === 'stem') {
        elementDetails[key].rawStemScore += score;
        if (pillarType) {
          elementDetails[key].pillarScores[pillarType].stem = stemInfo || '';
          elementDetails[key].pillarScores[pillarType].branch = branchInfo || '';
          elementDetails[key].pillarScores[pillarType].score += score;
        }
      } else if (type === 'branch') {
        elementDetails[key].rawBranchScore += score;
      } else if (type === 'hidden') {
        elementDetails[key].rawHiddenScore += score;
        if (stemInfo && branchInfo) {
          elementDetails[key].hiddenStems.push({
            stem: stemInfo,
            branch: branchInfo,
            score: score
          });
        }
      }
    }
  };

  const addTenGodScore = (tenGod: string, score: number) => {
    const category = getTenGodCategory(tenGod);
    if (tenGodCounts[category] !== undefined) {
      tenGodCounts[category] += score;
    }
  };

  // 1. 计算天干原始分数
  [pillars.year, pillars.month, pillars.day, pillars.hour].forEach((pillar, index) => {
    const s = pillar.stem;
    const b = pillar.branch;
    const element = STEM_ELEMENTS[s];
    const tenGod = getTenGodLabel(dm, s);
    const pillarType = ['year', 'month', 'day', 'hour'][index] as 'year' | 'month' | 'day' | 'hour';
    
    addScore(element, STEM_SCORE, 'stem', pillarType, s, b);
    addTenGodScore(tenGod, STEM_SCORE);
  });
  
  // 2. 计算地支原始分数（考虑空亡）
  const pillarsArray = [
    { pillar: pillars.year, type: 'year' as const },
    { pillar: pillars.month, type: 'month' as const },
    { pillar: pillars.day, type: 'day' as const },
    { pillar: pillars.hour, type: 'hour' as const }
  ];
  
  pillarsArray.forEach(({ pillar, type }) => {
    const branch = pillar.branch;
    const stem = pillar.stem;
    
    // 检查空亡
    const isEmpty = emptyBranches.includes(branch);
    let emptyFactor = 1.0;
    if (isEmpty) {
      emptyFactor = 0.5; // 空亡减半
    }
    
    const hiddenScores = BRANCH_HIDDEN_SCORES[branch] || [];
    
    // 记录空亡系数
    Object.keys(elementDetails).forEach(key => {
      elementDetails[key as keyof typeof elementDetails].emptyFactors.push(emptyFactor);
    });
    
    // 地支本身没有独立得分，只有通过藏干贡献
    // 藏干得分
    hiddenScores.forEach(({ stem: hiddenStem, score }) => {
      const element = STEM_ELEMENTS[hiddenStem];
      const tenGod = getTenGodLabel(dm, hiddenStem);
      const adjustedScore = score * emptyFactor;
      
      addScore(element, adjustedScore, 'hidden', undefined, hiddenStem, branch);
      addTenGodScore(tenGod, adjustedScore);
    });
  });
  
  // 3. 根据旺相休囚死系数调整分数
  const monthBranch = pillars.month.branch;
  const adjustedCounts: BaziAnalysis['elementCounts'] = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const energyState: BaziAnalysis['energyState'] = {
    '木': '', '火': '', '土': '', '金': '', '水': ''
  };
  
  // 计算每个五行的旺相休囚死状态和系数
  Object.entries(rawCounts).forEach(([key, value]) => {
    // 关键修复：使用 KEY_TO_CHINESE 将英文键转换为中文五行
    const element = KEY_TO_CHINESE[key as keyof typeof KEY_TO_CHINESE];
    const state = getElementState(monthBranch, element, rawCounts);
    const coefficient = WANG_XIANG_XIU_QIU_SI_COEFFICIENTS[state] || 1;
    
    adjustedCounts[key as keyof typeof adjustedCounts] = value * coefficient;
    energyState[element] = state;
  });
  
  // 4. 确保非负数
  Object.keys(adjustedCounts).forEach(key => {
    if (adjustedCounts[key as keyof typeof adjustedCounts] < 0) {
      adjustedCounts[key as keyof typeof adjustedCounts] = 0;
    }
  });
  
  // 5. 计算百分比
  const total = Object.values(adjustedCounts).reduce((a, b) => a + b, 0);
  const elementEnergy: BaziAnalysis['elementEnergy'] = {
    wood: 0, fire: 0, earth: 0, metal: 0, water: 0
  };
  
  if (total > 0) {
    Object.entries(adjustedCounts).forEach(([key, value]) => {
      elementEnergy[key as keyof BaziAnalysis['elementEnergy']] = 
        Math.round((value / total) * 100);
    });
  }
  
  // 6. 计算十神分布百分比
  const tenGodTotal = Object.values(tenGodCounts).reduce((a, b) => a + b, 0);
  const tenGodDistribution: BaziAnalysis['tenGodDistribution'] = {
    '比劫': 0, '印绶': 0, '官杀': 0, '财才': 0, '食伤': 0
  };
  
  if (tenGodTotal > 0) {
    Object.entries(tenGodCounts).forEach(([key, value]) => {
      tenGodDistribution[key as keyof BaziAnalysis['tenGodDistribution']] = 
        Math.round((value / tenGodTotal) * 100);
    });
  }
  
  // 7. 构建详细的五行得分信息
  const elementScoreDetails: Record<string, any> = {};
  
  Object.keys(elementDetails).forEach(key => {
    const detail = elementDetails[key];
    const elementName = KEY_TO_CHINESE[key as keyof typeof KEY_TO_CHINESE];
    const state = energyState[elementName];
    const coefficient = WANG_XIANG_XIU_QIU_SI_COEFFICIENTS[state] || 1;
    const rawTotal = detail.rawStemScore + detail.rawBranchScore + detail.rawHiddenScore;
    const adjustedScore = rawTotal * coefficient;
    
    // 计算平均空亡系数
    const avgEmptyFactor = detail.emptyFactors.length > 0 
      ? detail.emptyFactors.reduce((sum, factor) => sum + factor, 0) / detail.emptyFactors.length
      : 1.0;
    
    elementScoreDetails[key] = {
      name: elementName,
      value: adjustedCounts[key as keyof typeof adjustedCounts],
      breakdown: {
        rawStemScore: detail.rawStemScore,
        rawBranchScore: detail.rawBranchScore,
        rawHiddenScore: detail.rawHiddenScore,
        emptyFactor: avgEmptyFactor,
        state: state,
        coefficient: coefficient,
        rawTotal: rawTotal,
        adjustedScore: adjustedScore,
        pillars: detail.pillarScores,
        hiddenStems: detail.hiddenStems
      }
    };
  });
  
  return {
    elementCounts: adjustedCounts,
    elementEnergy,
    tenGodDistribution,
    energyState,
    elementScoreDetails
  };
}

function calculateBaziAnalysis(pillars: { year: StemBranch, month: StemBranch, day: StemBranch, hour: StemBranch }, birthDate: Date): BaziAnalysis {
  // 1. 计算五行能量和十神分布，现在包含详细得分信息
  const energyResult = calculateElementEnergy(pillars, birthDate);
  
  const dm = pillars.day.stem;
  const dmEl = STEM_ELEMENTS[dm];
  const rel = ELEMENT_RELATIONS[dmEl];
  
  // 2. 计算身强身弱（基于旺相休囚死调整后的能量）
  const self_support = energyResult.elementCounts[ELEMENT_TO_KEY[dmEl]] + 
                       energyResult.elementCounts[ELEMENT_TO_KEY[rel.wasSheng]];
  const total = Object.values(energyResult.elementCounts).reduce((a, b) => a + b, 0);
  const strengthRatio = total > 0 ? self_support / total : 0.5;
  
  let strength: BaziAnalysis['strength'] = '中和';
  if (strengthRatio > 0.55) strength = '身强';
  else if (strengthRatio < 0.35) strength = '身弱';
  
  // 3. 获取调候用神
  const tiaoHouShen = TIAO_HOU_SHEN[dmEl]?.[pillars.month.branch] || [];
  
  // 4. 获取空亡地支
  const emptyBranches: string[] = EMPTY_BRANCHES[`${pillars.day.stem}${pillars.day.branch}`] || [];
  
  // 5. 综合喜忌神判定
  let yongShen: string[] = [];
  let xiShen: string[] = [];
  let jiShen: string[] = [];

  const deductors = [rel.wasKe, rel.sheng, rel.ke]; // 异类：克、泄、耗 (官杀、食伤、财星)
  const supporters = [dmEl, rel.wasSheng];         // 同类：生、扶 (比劫、印星)

  // 修改 calculateBaziAnalysis 函数中的喜用神选择逻辑
  // 对五行进行能量排序的辅助函数
  const sortElementsByEnergy = (elements: string[], reverse: boolean = false) => {
    return [...elements].sort((a, b) => {
      const keyA = ELEMENT_TO_KEY[a];
      const keyB = ELEMENT_TO_KEY[b];
      const energyA = energyResult.elementCounts[keyA] || 0;
      const energyB = energyResult.elementCounts[keyB] || 0;
      return reverse ? energyA - energyB : energyB - energyA; // reverse=true 时从弱到强
    });
  };

  if (strength === '身强' || (strength === '中和' && strengthRatio >= 0.5)) {
    // 身强宜克泄耗，选择最弱的克泄耗五行
    const deductorsFromWeakToStrong = sortElementsByEnergy(deductors, true); // 从弱到强排序
    
    // 获取调候用神的五行
    const tiaoHouElements = tiaoHouShen.map(s => STEM_ELEMENTS[s]);
    
    // 优先选择在调候用神中的、且在克泄耗中的最弱五行
    const candidateTiaoHou = tiaoHouElements
      .filter(el => deductors.includes(el))
      .sort((a, b) => {
        const keyA = ELEMENT_TO_KEY[a];
        const keyB = ELEMENT_TO_KEY[b];
        return energyResult.elementCounts[keyA] - energyResult.elementCounts[keyB]; // 从弱到强
      });
    
    if (candidateTiaoHou.length > 0) {
      yongShen = [candidateTiaoHou[0]]; // 最弱的调候用神五行
    } else {
      // 没有调候用神，选择最弱的克泄耗五行
      yongShen = [deductorsFromWeakToStrong[0]];
    }
    
    // 喜神：其他克泄耗的五行
    xiShen = deductors.filter(el => el !== yongShen[0]);
    // 忌神：生扶的五行
    jiShen = supporters;
  } else {
    // 身弱宜生扶，选择最强的生扶五行
    const supportersFromStrongToWeak = sortElementsByEnergy(supporters, false); // 从强到弱排序
    const deductorsFromStrongToWeak = sortElementsByEnergy(deductors, false); // 从强到弱排序，用于选择忌神
    
    // 获取调候用神的五行
    const tiaoHouElements = tiaoHouShen.map(s => STEM_ELEMENTS[s]);
    
    // 优先选择在调候用神中的、且在生扶中的最强五行
    const candidateTiaoHou = tiaoHouElements
      .filter(el => supporters.includes(el))
      .sort((a, b) => {
        const keyA = ELEMENT_TO_KEY[a];
        const keyB = ELEMENT_TO_KEY[b];
        return energyResult.elementCounts[keyB] - energyResult.elementCounts[keyA]; // 从强到弱
      });
    
    if (candidateTiaoHou.length > 0) {
      yongShen = [candidateTiaoHou[0]]; // 最强的调候用神五行
    } else {
      // 没有调候用神，选择最强的生扶五行
      yongShen = [supportersFromStrongToWeak[0]];
    }
    
    // 喜神：其他生扶的五行
    xiShen = supporters.filter(el => el !== yongShen[0]);
    // 忌神：克泄耗的五行（选择最强的）
    jiShen = [deductorsFromStrongToWeak[0]];
  }

  const getPillarDetail = (sb: StemBranch, isDM: boolean): PillarDetail => ({
    sb, 
    tenGod: isDM ? '日主' : getTenGodLabel(dm, sb.stem), 
    hiddenStems: (BRANCH_HIDDEN_SCORES[sb.branch] || []).map(h => h.stem),
    isEmpty: emptyBranches.includes(sb.branch)
  });

  return {
    elementCounts: energyResult.elementCounts,
    elementEnergy: energyResult.elementEnergy,
    tenGodDistribution: energyResult.tenGodDistribution,
    energyState: energyResult.energyState,
    strength, 
    yongShen, 
    xiShen, 
    jiShen,
    tiaoHouShen,
    emptyBranches,
    pillars: {
      year: getPillarDetail(pillars.year, false),
      month: getPillarDetail(pillars.month, false),
      day: getPillarDetail(pillars.day, true),
      hour: getPillarDetail(pillars.hour, false),
    },
    dayMaster: dm, 
    dayMasterElement: dmEl,
    elementScoreDetails: energyResult.elementScoreDetails // 添加详细得分信息
  };
}

export function getStemBranch(date: Date): { year: StemBranch, month: StemBranch, day: StemBranch, hour: StemBranch } {
  try {
    // 尝试使用 Intl.DateTimeFormat 获取北京时间（首选方法）
    const bjParts = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    }).formatToParts(date);

    const getPart = (type: string) => {
      const part = bjParts.find(p => p.type === type);
      return part ? parseInt(part.value) : 0;
    };
    
    let bjY = getPart('year');
    let bjM = getPart('month');
    let bjD = getPart('day');
    let bjH = getPart('hour');
    const bjMin = getPart('minute');
    const bjSec = getPart('second');
    
    // 验证获取的时间是否有效
    if (isNaN(bjY) || bjY < 1900) {
      throw new Error('Invalid year from Intl.DateTimeFormat');
    }
    
    // 返回获取到的北京时间
    return calculateStemBranchFromBJTime(bjY, bjM, bjD, bjH, bjMin, bjSec);
    
  } catch (error) {
    console.warn('Intl.DateTimeFormat with timeZone failed, falling back to local time:', error);
    
    // 回退方案：使用本地时间，并假设它已经是北京时间
    // 或者手动加上8小时（如果本地是UTC时间）
    return getStemBranchFallback(date);
  }
}

/**
 * 回退方案：手动计算北京时间
 */
function getStemBranchFallback(date: Date): { year: StemBranch, month: StemBranch, day: StemBranch, hour: StemBranch } {
  // 方案1：假设传入的日期已经是北京时间（App.tsx中的parseAsBeijing已经处理过）
  const bjYear = date.getFullYear();
  const bjMonth = date.getMonth() + 1; // getMonth() 返回 0-11
  const bjDay = date.getDate();
  const bjHour = date.getHours();
  const bjMinute = date.getMinutes();
  const bjSecond = date.getSeconds();
  
  return calculateStemBranchFromBJTime(bjYear, bjMonth, bjDay, bjHour, bjMinute, bjSecond);
}

/**
 * 备选回退方案：手动将UTC时间转换为北京时间
 */
function getStemBranchFallbackUTC(date: Date): { year: StemBranch, month: StemBranch, day: StemBranch, hour: StemBranch } {
  // 方案2：将UTC时间转换为北京时间（UTC+8）
  const utcTime = date.getTime(); // 毫秒数
  const bjTime = new Date(utcTime + 8 * 60 * 60 * 1000); // 加上8小时
  
  const bjYear = bjTime.getUTCFullYear();
  const bjMonth = bjTime.getUTCMonth() + 1;
  const bjDay = bjTime.getUTCDate();
  const bjHour = bjTime.getUTCHours();
  const bjMinute = bjTime.getUTCMinutes();
  const bjSecond = bjTime.getUTCSeconds();
  
  return calculateStemBranchFromBJTime(bjYear, bjMonth, bjDay, bjHour, bjMinute, bjSecond);
}

/**
 * 从北京时间计算四柱（核心计算逻辑提取为独立函数）
 */
function calculateStemBranchFromBJTime(
  year: number, 
  month: number, 
  day: number, 
  hour: number, 
  minute: number, 
  second: number
): { year: StemBranch, month: StemBranch, day: StemBranch, hour: StemBranch } {
  // 处理跨日问题：23:00之后算次日
  let adjustedYear = year;
  let adjustedMonth = month;
  let adjustedDay = day;
  let adjustedHour = hour;
  
  if (hour >= 23) {
    adjustedHour = hour; // 保持原小时用于计算时辰
    // 需要检查是否跨日、跨月、跨年
    const tempDate = new Date(year, month - 1, day, hour, minute, second);
    tempDate.setHours(tempDate.getHours() + 1); // 加1小时检查是否跨日
    
    adjustedYear = tempDate.getFullYear();
    adjustedMonth = tempDate.getMonth() + 1;
    adjustedDay = tempDate.getDate();
  }
  
  // 立春判断
  const liChun = getSolarTermDate(adjustedYear, 3);
  let pillarYear = adjustedYear;
  if (liChun) {
    const currentDate = new Date(adjustedYear, adjustedMonth - 1, adjustedDay, adjustedHour, minute, second);
    if (currentDate.getTime() < liChun.getTime()) {
      pillarYear = adjustedYear - 1;
    }
  }
  
  // 计算年柱
  const yearOffset = (pillarYear - 4) % 60;
  const yearSB = { 
    stem: STEMS[(yearOffset % 10 + 10) % 10], 
    branch: BRANCHES[(yearOffset % 12 + 12) % 12] 
  };

  // 计算月柱
  let monthBranchIdx = 0;
  const jieToBranch = [
    { idx: 1, b: 1 }, { idx: 3, b: 2 }, { idx: 5, b: 3 }, { idx: 7, b: 4 },
    { idx: 9, b: 5 }, { idx: 11, b: 6 }, { idx: 13, b: 7 }, { idx: 15, b: 8 },
    { idx: 17, b: 9 }, { idx: 19, b: 10 }, { idx: 21, b: 11 }, { idx: 23, b: 0 }
  ];
  
  // 创建当前日期对象用于节气判断
  const currentDate = new Date(adjustedYear, adjustedMonth - 1, adjustedDay, adjustedHour, minute, second);
  
  for (const jie of [...jieToBranch].sort((a, b) => b.idx - a.idx)) {
    const jd = getSolarTermDate(adjustedYear, jie.idx);
    if (jd && currentDate.getTime() >= jd.getTime()) {
      monthBranchIdx = jie.b;
      break;
    }
  }
  
  const yearStemIdx = STEMS.indexOf(yearSB.stem);
  const monthStemIdx = ((yearStemIdx % 5 * 2 + 2) + (monthBranchIdx - 2 + 12) % 12) % 10;
  const monthSB = { 
    stem: STEMS[monthStemIdx], 
    branch: BRANCHES[monthBranchIdx] 
  };

  // 计算日柱 - 使用固定锚点法
  const anchorTs = 946656000000; // 2000-01-01 00:00:00 UTC (北京时间2000-01-01 08:00:00)
  const anchorIdx = 54; // 2000-01-01 的日柱索引（庚辰）
  
  // 创建目标时间（北京时间）
  const targetDate = new Date(adjustedYear, adjustedMonth - 1, adjustedDay, 0, 0, 0, 0);
  // 注意：这里我们使用北京时间，所以不需要额外时区转换
  const targetTs = targetDate.getTime();
  
  let dayOffset = Math.floor((targetTs - anchorTs) / 86400000);
  
  // 处理23点后的日期偏移
  if (hour >= 23) {
    dayOffset += 1;
  }
  
  const totalDayIdx = ((dayOffset + anchorIdx) % 60 + 60) % 60;
  const daySB = { 
    stem: STEMS[totalDayIdx % 10], 
    branch: BRANCHES[totalDayIdx % 12] 
  };

  // 计算时柱
  const hourBranchIdx = Math.floor(((adjustedHour + 1) % 24) / 2);
  const hourStemIdx = ((STEMS.indexOf(daySB.stem) % 5) * 2 + hourBranchIdx) % 10;
  const hourSB = { 
    stem: STEMS[hourStemIdx], 
    branch: BRANCHES[hourBranchIdx] 
  };

  return { 
    year: yearSB, 
    month: monthSB, 
    day: daySB, 
    hour: hourSB 
  };
}

/**
 * 验证时间有效性
 */
function validateDateTime(year: number, month: number, day: number, hour: number): boolean {
  // 基本范围验证
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour < 0 || hour > 23) return false;
  
  // 日期有效性验证
  const date = new Date(year, month - 1, day);
  if (date.getMonth() + 1 !== month || date.getDate() !== day) {
    return false; // 无效日期（如2月30日）
  }
  
  return true;
}

export function plotChart(date: Date, userName: string, gender: '男' | '女', birthDate: Date): ChartResult {
  const pillars = getStemBranch(date);
  const baziPillars = getStemBranch(birthDate);
  const baziAnalysis = calculateBaziAnalysis(baziPillars, birthDate);
  
  const solarTerm = getSolarTermForDate(date);
  const termName = solarTerm?.name || "冬至";
  const dunData = TERM_DUN_MAP[termName] || { type: '阳', ju: [1, 7, 4] };
  const isYang = dunData.type === '阳';
  const juNum = dunData.ju[0]; 
  const dunJuStr = `${dunData.type}遁${['', '一', '二', '三', '四', '五', '六', '七', '八', '九'][juNum]}局`;

  const diPan: Record<number, string> = {};
  STEM_ORDER.forEach((stem, i) => {
    let palace = isYang ? ((juNum - 1 + i) % 9) + 1 : ((juNum - 1 - i + 9) % 9) + 1;
    diPan[palace] = stem;
  });

  const hourStemIdx = STEMS.indexOf(pillars.hour.stem);
  const hourBranchIdx = BRANCHES.indexOf(pillars.hour.branch);
  const xunOffset = (hourBranchIdx - hourStemIdx + 12) % 12;
  const xunShouSB = `甲${BRANCHES[xunOffset]}`;
  const xunShouStem = XUN_MAP[xunShouSB] || "戊";

  let xunShouPalace = 1;
  for (let p = 1; p <= 9; p++) if (diPan[p] === xunShouStem) { xunShouPalace = p; break; }
  const zhiFuStar = (NINE_STARS as any)[xunShouPalace];

  let hourStemPalace = 1;
  const targetStem = (pillars.hour.stem === '甲' ? xunShouStem : pillars.hour.stem);
  for (let p = 1; p <= 9; p++) if (diPan[p] === targetStem) { hourStemPalace = p; break; }
  if (hourStemPalace === 5) hourStemPalace = 2;

  const starPalaces = [1, 8, 3, 4, 9, 2, 7, 6];
  const starNames = ["天蓬", "天任", "天冲", "天辅", "天英", "天芮", "天柱", "天心"];
  const startIdx = starPalaces.indexOf(xunShouPalace === 5 ? 2 : xunShouPalace);
  const endIdx = starPalaces.indexOf(hourStemPalace);
  const shift = (endIdx - startIdx + 8) % 8;

  const starMapping: Record<number, string> = {};
  const tianPan: Record<number, string> = {};
  const godMapping: Record<number, string> = {};
  const gods = isYang ? EIGHT_GODS_YANG : EIGHT_GODS_YIN;

  starPalaces.forEach((p, i) => {
    const rawStarName = starNames[(i - shift + 8) % 8];
    const tpStem = diPan[STAR_ORIGIN[rawStarName]];
    
    // 天禽寄宫逻辑：随天芮星转动
    if (rawStarName === "天芮") {
        starMapping[p] = "芮禽";
        // 将中五宫的地盘干（寄干）合并到天盘显示
        tianPan[p] = diPan[5] + tpStem; 
    } else {
        starMapping[p] = rawStarName;
        tianPan[p] = tpStem;
    }
    
    godMapping[p] = gods[(i - endIdx + 8) % 8];
  });

  const gateNames = ["休门", "生门", "伤门", "杜门", "景门", "死门", "惊门", "开门"];
  const steps = (hourBranchIdx - xunOffset + 12) % 12;
  const gateStartIdx = starPalaces.indexOf(xunShouPalace === 5 ? 2 : xunShouPalace);
  const gateEndIdx = isYang ? (gateStartIdx + steps) % 8 : (gateStartIdx - steps + 8) % 8;
  const gateMapping: Record<number, string> = {};
  starPalaces.forEach((p, i) => {
    gateMapping[p] = gateNames[(i - gateEndIdx + gateStartIdx + 8) % 8];
  });

  const palaces: PalaceData[] = LOSHU_SQUARE.map(id => ({
    id, name: (PALACE_NAMES as any)[id],
    elements: {
      god: id === 5 ? "" : (godMapping[id] || "--"),
      star: id === 5 ? "" : (starMapping[id] || "--"),
      gate: id === 5 ? "" : (gateMapping[id] || "--"),
      tianPan: id === 5 ? "" : (tianPan[id] || ""),
      diPan: diPan[id],
      status: "旺"
    }
  }));

  const solarDateStr = `${birthDate.getFullYear()}年${String(birthDate.getMonth()+1).padStart(2,'0')}月${String(birthDate.getDate()).padStart(2,'0')}日${String(birthDate.getHours()).padStart(2,'0')}点${String(birthDate.getMinutes()).padStart(2,'0')}分`;
  const lunarYearStr = `${baziPillars.year.stem}${baziPillars.year.branch}年（${ZODIAC[baziPillars.year.branch]}）`;
  const lunarDateStr = toLunar(birthDate);

  return {
    params: { yearSB: pillars.year, monthSB: pillars.month, daySB: pillars.day, hourSB: pillars.hour, solarTerm: termName, dunJu: dunJuStr, isYang, juNum },
    palaces, zhiFu: zhiFuStar, zhiShi: gateMapping[starPalaces[gateEndIdx]], xunShou: xunShouSB,
    personalInfo: {
      name: userName, gender,
      solarDate: solarDateStr,
      lunarDate: `${lunarYearStr}${lunarDateStr}`,
      bazi: `${baziPillars.year.stem}${baziPillars.year.branch} ${baziPillars.month.stem}${baziPillars.month.branch} ${baziPillars.day.stem}${baziPillars.day.branch} ${baziPillars.hour.stem}${baziPillars.hour.branch}`,
      analysis: baziAnalysis
    }
  };
}

/**
 * 格式化单个柱子显示（含日主标记和空亡标记）
 */
export function formatSinglePillar(p: PillarDetail, dayMaster: string): FormattedPillar {
  return {
    stem: p.sb.stem,
    branch: p.sb.branch,
    tenGod: p.tenGod,
    hiddenStems: p.hiddenStems,
    isEmpty: p.isEmpty || false,
    isDayMaster: p.sb.stem === dayMaster
  };
}

/**
 * 获取五行得分详细计算
 */
export function getElementScoreDetails(analysis: BaziAnalysis) {
  return analysis.elementScoreDetails || {};
}

/**
 * 获取动态四柱详细贡献
 */
export function getDynamicPillarDetails(analysis: BaziAnalysis) {
  const pillars = analysis.pillars;
  const emptyBranches = analysis.emptyBranches || [];
  
  const pillarDetails = [
    { name: '年柱', pillar: pillars.year },
    { name: '月柱', pillar: pillars.month },
    { name: '日柱', pillar: pillars.day },
    { name: '时柱', pillar: pillars.hour }
  ];
  
  return pillarDetails.map(({ name, pillar }) => {
    const stem = pillar.sb.stem;
    const branch = pillar.sb.branch;
    const isBranchEmpty = emptyBranches.includes(branch);
    const hiddenStems = BRANCH_HIDDEN_SCORES[branch] || [];
    
    const stemScore = 100;
    
    const hiddenStemDetails = hiddenStems.map(item => {
      const element = STEM_ELEMENTS[item.stem];
      return {
        stem: item.stem,
        element,
        score: item.score,
        adjustedScore: isBranchEmpty ? item.score / 2 : item.score
      };
    });
    
    return {
      name,
      stem,
      branch,
      isBranchEmpty,
      stemScore,
      hiddenStemDetails,
      totalScore: stemScore + hiddenStemDetails.reduce((sum, item) => sum + item.adjustedScore, 0)
    };
  });
}

/**
 * 计算五行能量分布
 */
export function calculateElementEnergyFromPillars(pillars: PillarDetail[]): Record<string, number> {
  const energy: Record<string, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  
  const addEnergy = (element: string, amount: number) => {
    const key = element.toLowerCase() as keyof typeof energy;
    if (energy[key] !== undefined) {
      energy[key] += amount;
    }
  };
  
  for (const pillar of pillars) {
    const stemEl = STEM_ELEMENTS[pillar.sb.stem];
    const branchEl = BRANCH_ELEMENTS[pillar.sb.branch];
    
    addEnergy(stemEl, 0.5);
    addEnergy(branchEl, 0.25);
    
    // 藏干能量
    const hiddenStems = pillar.hiddenStems || [];
    hiddenStems.forEach((stem: string) => {
      const el = STEM_ELEMENTS[stem];
      addEnergy(el, 0.25);
    });
  }
  
  // 归一化
  const total = Object.values(energy).reduce((a, b) => a + b, 0);
  if (total > 0) {
    Object.keys(energy).forEach(key => {
      energy[key as keyof typeof energy] = +(energy[key as keyof typeof energy] / total).toFixed(2);
    });
  }
  
  return energy;
}
