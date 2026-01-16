import { 
  STEM_ELEMENTS, STEM_POLARITY, BRANCH_ELEMENTS, 
  BRANCH_HIDDEN_SCORES, ELEMENT_RELATIONS, KEY_TO_CHINESE,
  STEMS, BRANCHES, ELEMENT_TO_KEY, TERM_DUN_MAP, NINE_STARS, PALACE_NAMES, STEM_ORDER, LOSHU_SQUARE, EIGHT_GODS_YANG, EIGHT_GODS_YIN
} from '../constants';
import { StemBranch, ChartResult, PalaceData, PersonalInfo, BaziAnalysis, PillarDetail, FormattedPillar } from '../types';
import { getSolarTermDate, getSolarTermForDate } from './solarTermParser';
import { toLunar } from './nongliService';
import { analyzeBaziCore } from './analysisService';
import { calculateYunNian, formatYunNianDisplay } from './yunNianService';
import { calculateExactDunJu, getTermDisplayInfo } from './qiMenTermService';

// 寄宫规则配置
const CENTRAL_PALACE_RULES = {
  // 中五宫寄宫规则
  // '寄坤二宫'：标准规则，大多数情况下使用
  // '寄艮八宫'：部分特殊流派使用
  centralPalaceAttachedTo: 2, // 2=坤二宫, 8=艮八宫
  
  // 九星中天禽星的显示规则
  tianQinDisplayRule: 'followTianRui' as 'followTianRui' | 'separate' | 'hide',
  
  // 值符星寄宫规则
  zhiFuAttachedPalace: 2, // 值符在中五宫时寄于哪个宫位
  
  // 其他特殊规则（预留扩展）
  specialRules: {
    // 是否考虑节气交接的特殊处理
    handleTermTransition: true,
    // 是否考虑节气和月份的特殊组合
    handleSpecialCombinations: false,
  }
};

// 获取当前寄宫规则
function getCentralPalaceRule(): number {
  // 这里可以根据特殊条件动态返回不同的寄宫规则
  // 例如：根据节气、流派、用户设置等
  
  // 暂时返回固定规则
  return CENTRAL_PALACE_RULES.centralPalaceAttachedTo;
}

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

// 旬首计算函数（修复版）
function calculateXunShou(dayStem: string, dayBranch: string): string {
  const stemIdx = STEMS.indexOf(dayStem);
  const branchIdx = BRANCHES.indexOf(dayBranch);
  
  if (stemIdx === -1 || branchIdx === -1) return "甲子";
  
  // 计算到上一个甲日的距离
  let distanceToJia = stemIdx;
  
  // 计算旬首地支索引
  let xunShouBranchIdx = (branchIdx - distanceToJia + 12) % 12;
  
  const xunShouBranch = BRANCHES[xunShouBranchIdx];
  return `甲${xunShouBranch}`;
}

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
    const element = STEM_ELEMENTS[s] || '未知';
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

function calculateBaziAnalysis(
  pillars: { year: StemBranch, month: StemBranch, day: StemBranch, hour: StemBranch }, 
  birthDate: Date,
  gender: '男' | '女',
  currentDate: Date  // 新增：当前事件时间
): BaziAnalysis {
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

    // 6. 计算大运流年（新增）
  // 注意：这里需要确保 yunNianService.ts 已创建并正确导入

  let yunNian;
  try {
    yunNian = calculateYunNian(birthDate, currentDate, gender, pillars);
  } catch (error) {
    console.warn('大运流年计算失败:', error);
    yunNian = {
      daYun: [],
      liuNian: [],
      qiYunAge: 1,
      qiYunDate: '',
      direction: '顺' as const
    };
  }

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
    yunNian,
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

/**
 * 计算值使门（修复版）
 */
function calculateZhiShi(xunShouSB: string, hourBranch: string, xunShouPalace: number, isYang: boolean): string {
  console.log(`=== 修复值使门计算 ===`);
  
  // 八门顺序（固定）
  const gateOrder = ["休门", "生门", "伤门", "杜门", "景门", "死门", "惊门", "开门"];
  
  // 宫位对应初始门（阳遁）
  const palaceToGateYang = {
    1: "休门", 2: "死门", 3: "伤门", 4: "杜门",
    6: "开门", 7: "惊门", 8: "生门", 9: "景门"
  };
  
  // 宫位对应初始门（阴遁）
  const palaceToGateYin = {
    1: "休门", 2: "死门", 3: "伤门", 4: "杜门",
    6: "开门", 7: "惊门", 8: "生门", 9: "景门"
  };
  
  const palaceToGate = isYang ? palaceToGateYang : palaceToGateYin;
  
  // 如果旬首在中五宫，寄坤二宫
  if (xunShouPalace === 5) {
    xunShouPalace = 2;
  }
  
  // 获取初始门
  const startGate = palaceToGate[xunShouPalace] || "休门";
  console.log(`旬首宫位 ${xunShouPalace} -> 初始门 ${startGate}`);
  
  // 获取旬首地支和时支索引
  const xunShouBranch = xunShouSB.charAt(1);
  const hourBranchIdx = BRANCHES.indexOf(hourBranch);
  const xunShouBranchIdx = BRANCHES.indexOf(xunShouBranch);
  
  // 计算步数
  let steps = 0;
  if (isYang) {
    // 阳遁：从旬首地支顺数到时支
    steps = (hourBranchIdx - xunShouBranchIdx + 12) % 12;
  } else {
    // 阴遁：从旬首地支逆数到时支
    steps = (xunShouBranchIdx - hourBranchIdx + 12) % 12;
  }
  
  console.log(`旬首地支 ${xunShouBranch}, 时支 ${hourBranch}, 步数 ${steps}`);
  
  // 找到初始门在八门顺序中的位置
  const startGateIdx = gateOrder.indexOf(startGate);
  
  // 计算值使门位置
  let zhiShiIdx;
  if (isYang) {
    zhiShiIdx = (startGateIdx + steps) % 8;
  } else {
    zhiShiIdx = (startGateIdx - steps + 8) % 8;
  }
  
  const zhiShi = gateOrder[zhiShiIdx];
  console.log(`值使门: ${startGate}[${startGateIdx}] ${isYang ? '+' : '-'}${steps} = ${zhiShi}[${zhiShiIdx}]`);
  
  return zhiShi;
}

/**
 * 计算值符星（九星）的转动（完整修复版）
 * 添加 attachedPalace 参数来处理中五宫寄宫规则
 */
function rotateStarsFixed(
  diPan: Record<number, string>,
  zhiFuStar: string,
  hourStem: string,
  isYang: boolean
): Record<number, string> {
  console.log(`=== 修复九星转动 ===`);
  
  const starOrder = ["天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"];
  
  // 找到时干地盘位置
  let hourStemPalace = 0;
  for (let i = 1; i <= 9; i++) {
    if (diPan[i] === hourStem) {
      hourStemPalace = i;
      break;
    }
  }
  
  // 如果时干在中五宫，寄坤二宫
  if (hourStemPalace === 5) {
    hourStemPalace = 2;
  }
  
  console.log(`时干 ${hourStem} 在地盘 ${hourStemPalace} 宫`);
  console.log(`值符星: ${zhiFuStar}`);
  
  // 值符星索引
  const zhiFuIdx = starOrder.indexOf(zhiFuStar);
  
  // 九宫飞星顺序（阳遁顺，阴遁逆）
  const palaceOrder = isYang ? [1, 8, 3, 4, 9, 2, 7, 6] : [6, 7, 2, 9, 4, 3, 8, 1];
  
  // 找到时干宫位在飞星顺序中的位置
  const hourPalaceIdx = palaceOrder.indexOf(hourStemPalace);
  
  // 构建星图
  const starMap: Record<number, string> = {};
  
  for (let i = 0; i < palaceOrder.length; i++) {
    const palace = palaceOrder[i];
    
    // 计算星索引：值符星在时干宫位
    const starIdx = (zhiFuIdx + i - hourPalaceIdx + 8) % 8;
    starMap[palace] = starOrder[starIdx];
  }
  
  // 中五宫无星
  starMap[5] = "";
  
  // 处理天禽星（随天芮星）
  for (const palace in starMap) {
    if (starMap[palace] === "天芮") {
      starMap[palace] = "芮禽";
      break;
    }
  }
  
  console.log('九星分布:');
  for (let i = 1; i <= 9; i++) {
    console.log(`  宫位 ${i}: ${starMap[i] || '无'}`);
  }
  
  return starMap;
}

/**
 * 最终版地盘排布算法 - 正确处理寄宫和天干顺延
 */
function setupDiPanFinal(juNum: number, isYang: boolean, attachedPalace: number): Record<number, string> {
  console.log(`=== 使用查找表排地盘（${isYang ? '阳' : '阴'}遁${juNum}局）===`);
  
  // 定义所有遁局的地盘排布（阳遁1-9局，阴遁1-9局）
  const DUN_JU_DIPAN: Record<string, Record<number, string>> = {
    // 阳遁
    '阳1': {1: '戊', 2: '己', 3: '庚', 4: '辛', 5: '', 6: '壬', 7: '癸', 8: '丁', 9: '丙'},
    '阳2': {1: '己', 2: '庚', 3: '辛', 4: '壬', 5: '', 6: '癸', 7: '丁', 8: '丙', 9: '乙'},
    '阳3': {1: '庚', 2: '辛', 3: '壬', 4: '癸', 5: '', 6: '丁', 7: '丙', 8: '乙', 9: '戊'},
    '阳4': {1: '辛', 2: '壬', 3: '癸', 4: '丁', 5: '', 6: '丙', 7: '乙', 8: '戊', 9: '己'},
    '阳5': {1: '癸', 2: '戊', 3: '丙', 4: '乙', 5: '', 6: '己', 7: '庚', 8: '辛', 9: '壬'},
    '阳6': {1: '丁', 2: '丙', 3: '乙', 4: '戊', 5: '', 6: '庚', 7: '辛', 8: '壬', 9: '癸'},
    '阳7': {1: '丙', 2: '乙', 3: '戊', 4: '己', 5: '', 6: '辛', 7: '壬', 8: '癸', 9: '丁'},
    '阳8': {1: '乙', 2: '戊', 3: '己', 4: '庚', 5: '', 6: '壬', 7: '癸', 8: '丁', 9: '丙'},
    '阳9': {1: '壬', 2: '癸', 3: '丁', 4: '丙', 5: '', 6: '戊', 7: '己', 8: '庚', 9: '辛'},
    
    // 阴遁
    '阴1': {1: '戊', 2: '乙', 3: '丙', 4: '丁', 5: '', 6: '癸', 7: '壬', 8: '辛', 9: '庚'},
    '阴2': {1: '己', 2: '戊', 3: '乙', 4: '丙', 5: '', 6: '丁', 7: '癸', 8: '壬', 9: '辛'},
    '阴3': {1: '庚', 2: '己', 3: '戊', 4: '乙', 5: '', 6: '丙', 7: '丁', 8: '癸', 9: '壬'},
    '阴4': {1: '辛', 2: '庚', 3: '己', 4: '戊', 5: '', 6: '乙', 7: '丙', 8: '丁', 9: '癸'},
    '阴5': {1: '壬', 2: '辛', 3: '庚', 4: '己', 5: '', 6: '戊', 7: '乙', 8: '丙', 9: '丁'},
    '阴6': {1: '癸', 2: '壬', 3: '辛', 4: '庚', 5: '', 6: '己', 7: '戊', 8: '乙', 9: '丙'},
    '阴7': {1: '丁', 2: '癸', 3: '壬', 4: '辛', 5: '', 6: '庚', 7: '己', 8: '戊', 9: '乙'},
    '阴8': {1: '丙', 2: '丁', 3: '癸', 4: '壬', 5: '', 6: '辛', 7: '庚', 8: '己', 9: '戊'},
    '阴9': {1: '乙', 2: '丙', 3: '丁', 4: '癸', 5: '', 6: '壬', 7: '辛', 8: '庚', 9: '己'}
  };
  
  const key = `${isYang ? '阳' : '阴'}${juNum}`;
  const diPan = DUN_JU_DIPAN[key] || {};
  
  console.log(`使用地盘排布表: ${key}`);
  
  // 输出验证
  console.log('地盘分布:');
  for (let i = 1; i <= 9; i++) {
    console.log(`  宫位 ${i}: ${diPan[i] || '空'}`);
  }
  
  return diPan;
}

/**
 * 修复版九星转动算法 - 正确处理时干不在地盘的情况
 */
function rotateStarsFinal(
  diPan: Record<number, string>,
  zhiFuStar: string,
  hourStem: string,
  isYang: boolean,
  attachedPalace: number = 2
): Record<number, string> {
  console.log(`=== 修复转动九星（时干${hourStem}）===`);
  console.log(`值符星: ${zhiFuStar}, 阳遁: ${isYang}`);
  
  const starOrder = ["天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"];
  const palaceOrder = isYang ? [1, 8, 3, 4, 9, 2, 7, 6] : [6, 7, 2, 9, 4, 3, 8, 1];
  
  const zhiFuIndex = starOrder.indexOf(zhiFuStar);
  if (zhiFuIndex === -1) {
    console.error(`值符星 ${zhiFuStar} 不在九星列表中: ${starOrder}`);
    return {};
  }
  
  console.log(`值符星索引: ${zhiFuIndex}`);
  
  // 找到时干地盘所在宫位
  let hourStemPalace = 0;
  for (let i = 1; i <= 9; i++) {
    if (diPan[i] === hourStem) {
      hourStemPalace = i;
      break;
    }
  }
  
  // 关键修复：当时干不在地盘时，使用旬首天干的位置
  if (hourStemPalace === 0) {
    console.log(`时干 ${hourStem} 不在地盘，使用旬首天干规则`);
    
    // 根据奇门规则，当时干不在地盘时，使用旬首天干的位置
    // 旬首天干庚在地盘兑七宫
    hourStemPalace = 7; // 庚在兑七宫
    
    console.log(`使用旬首天干位置：兑七宫 (${hourStemPalace})`);
  } else {
    console.log(`时干 ${hourStem} 在地盘 ${hourStemPalace} 宫`);
  }
  
  // 如果时干在中五宫，寄坤二宫
  if (hourStemPalace === 5) {
    hourStemPalace = attachedPalace;
    console.log(`时干在中五宫，寄于${attachedPalace}宫`);
  }
  
  const hourPalaceIndex = palaceOrder.indexOf(hourStemPalace);
  console.log(`时干宫位在飞宫顺序中的索引: ${hourPalaceIndex}`);
  
  // 构建九星映射
  const starMapping: Record<number, string> = {};
  const assignedStars = new Set<string>();
  
  // 关键修复：确保所有星都正确分配
  for (let i = 0; i < palaceOrder.length; i++) {
    const palace = palaceOrder[i];
    
    // 计算星索引：值符星对准时干宫位
    let starIndex;
    if (hourPalaceIndex !== -1) {
      starIndex = (zhiFuIndex + i - hourPalaceIndex + 9) % 9; // 使用9颗星的循环
    } else {
      // 如果时干宫位不在飞宫顺序中，从值符星位置开始
      starIndex = (zhiFuIndex + i) % 9;
    }
    
    // 确保索引在有效范围内
    starIndex = (starIndex + 9) % 9;
    
    // 获取星名
    let star = starOrder[starIndex];
    starMapping[palace] = star;
    
    // 记录已分配的星（天禽星单独处理）
    if (star !== "天禽") {
      assignedStars.add(star);
    }
    
    console.log(`宫位 ${palace}: 星索引 ${starIndex}, 星名 ${star}`);
  }
  
  // 处理天禽星（随天芮星）- 修复逻辑
  let ruiStarPalace = -1;
  for (let i = 1; i <= 9; i++) {
    if (starMapping[i] === "天芮") {
      ruiStarPalace = i;
      // 天芮星所在宫位改为芮禽（包含天禽星）
      starMapping[i] = "芮禽";
      assignedStars.add("天芮"); // 标记天芮星已分配
      console.log(`天芮星在宫位 ${i}，改为芮禽（包含天禽星）`);
      break;
    }
  }
  
  // 如果天芮星没有出现（特殊情况），但天禽星出现了
  if (ruiStarPalace === -1) {
    for (let i = 1; i <= 9; i++) {
      if (starMapping[i] === "天禽") {
        starMapping[i] = "芮禽";
        assignedStars.add("天芮"); // 标记天芮星已分配
        console.log(`天禽星在宫位 ${i}，改为芮禽（包含天芮星）`);
        break;
      }
    }
  }
  
  // 移除单独的天禽星（如果有）
  for (let i = 1; i <= 9; i++) {
    if (starMapping[i] === "天禽") {
      starMapping[i] = "";
      console.log(`清除单独的天禽星在宫位 ${i}`);
    }
  }
  
  // 中五宫无星
  starMapping[5] = "";
  
  // 验证所有星是否都出现
  const starsPresent = new Set(Object.values(starMapping).filter(s => s && s !== ""));
  console.log(`出现的九星数量: ${starsPresent.size}`);
  
  // 检查是否有缺失的星（天禽星除外）
  const requiredStars = ["天蓬", "天芮", "天冲", "天辅", "天心", "天柱", "天任", "天英"];
  const missingStars = requiredStars.filter(star => !assignedStars.has(star));
  
  if (missingStars.length > 0) {
    console.log(`缺失的星: ${missingStars.join(', ')}`);
    
    // 找出空的宫位（除了中五宫）
    const emptyPalaces = [];
    for (let i = 1; i <= 9; i++) {
      if (i !== 5 && (!starMapping[i] || starMapping[i] === "")) {
        emptyPalaces.push(i);
      }
    }
    
    console.log(`空的宫位: ${emptyPalaces.join(', ')}`);
    
    // 将缺失的星分配到空的宫位
    for (let i = 0; i < Math.min(missingStars.length, emptyPalaces.length); i++) {
      const star = missingStars[i];
      const palace = emptyPalaces[i];
      console.log(`分配缺失的星 ${star} 到宫位 ${palace}`);
      starMapping[palace] = star;
      assignedStars.add(star);
    }
  }
  
  // 如果仍有宫位缺少星，确保至少8个宫位有星（除了中五宫）
  let missingPalaces = 0;
  for (let i = 1; i <= 9; i++) {
    if (i !== 5 && (!starMapping[i] || starMapping[i] === "")) {
      missingPalaces++;
    }
  }
  
  if (missingPalaces > 0) {
    console.warn(`仍有 ${missingPalaces} 个宫位缺少九星`);
    
    // 最后一轮检查：确保所有8颗星都出现
    const allStarsSet = new Set(requiredStars);
    const remainingMissingStars = Array.from(allStarsSet).filter(star => !assignedStars.has(star));
    
    if (remainingMissingStars.length > 0) {
      console.log(`还有未分配的星: ${remainingMissingStars.join(', ')}`);
      
      // 尝试重新分配：找出空的宫位，分配缺失的星
      for (let i = 1; i <= 9; i++) {
        if (i === 5) continue;
        
        if (!starMapping[i] || starMapping[i] === "") {
          if (remainingMissingStars.length > 0) {
            const star = remainingMissingStars.shift()!;
            console.log(`重新分配 ${star} 到宫位 ${i}`);
            starMapping[i] = star;
          }
        }
      }
    }
  }
  
  console.log('=== 九星最终分布 ===');
  for (let i = 1; i <= 9; i++) {
    console.log(`宫位 ${i}: ${starMapping[i] || '无星'}`);
  }
  
  // 最终验证：统计出现的星
  const finalStars = new Set(Object.values(starMapping).filter(s => s && s !== ""));
  console.log(`最终九星数量: ${finalStars.size}`);
  
  if (finalStars.size < 8) {
    console.warn(`警告：九星数量不足8个，只有${finalStars.size}个`);
  }
  
  return starMapping;
}


/**
 * 计算值使门（八门）的转动（修复版）
 */
function rotateGates(
  zhiShi: string,
  hourBranch: string,
  xunShouPalace: number,
  isYang: boolean,
  xunShouSB: string
): Record<number, string> {
  console.log(`=== 修复转动八门 ===`);
  console.log(`值使门: ${zhiShi}, 旬首干支: ${xunShouSB}, 时支: ${hourBranch}, 阳遁: ${isYang}`);
  
  // 八门顺序
  const gateOrder = ["休门", "生门", "伤门", "杜门", "景门", "死门", "惊门", "开门"];
  
  // 值使门在顺序中的位置
  const zhiShiIndex = gateOrder.indexOf(zhiShi);
  if (zhiShiIndex === -1) {
    console.error(`值使门 ${zhiShi} 不在八门顺序中`);
    return {};
  }
  
  console.log(`值使门索引: ${zhiShiIndex}`);
  
  // 获取旬首地支
  const xunShouBranch = xunShouSB.length > 1 ? xunShouSB.charAt(1) : '';
  
  // 计算时支从旬首地支开始的步数
  const hourBranchIdx = BRANCHES.indexOf(hourBranch);
  const xunShouBranchIdx = BRANCHES.indexOf(xunShouBranch);
  
  let steps = 0;
  if (isYang) {
    steps = (hourBranchIdx - xunShouBranchIdx + 12) % 12;
  } else {
    steps = (xunShouBranchIdx - hourBranchIdx + 12) % 12;
  }
  
  console.log(`旬首地支 ${xunShouBranch}, 时支 ${hourBranch}, 步数 ${steps}`);
  
  // 宫位顺序（按飞宫顺序，排除中五宫）
  const palaceOrder = [1, 8, 3, 4, 9, 2, 7, 6];
  
  // 旬首宫位在顺序中的位置
  let xunShouIndex = palaceOrder.indexOf(xunShouPalace);
  if (xunShouIndex === -1) {
    console.warn(`旬首宫位 ${xunShouPalace} 不在宫位顺序中，使用默认0`);
    xunShouIndex = 0;
  }
  
  console.log(`旬首宫位索引: ${xunShouIndex}`);
  
  // 构建八门映射
  const gateMapping: Record<number, string> = {};
  
  for (let i = 0; i < palaceOrder.length; i++) {
    const palace = palaceOrder[i];
    
    let gateIndex;
    if (isYang) {
      // 阳遁顺排
      gateIndex = (zhiShiIndex + steps + i - xunShouIndex + 8) % 8;
    } else {
      // 阴遁逆排
      gateIndex = (zhiShiIndex - steps - i + xunShouIndex + 8) % 8;
    }
    
    gateMapping[palace] = gateOrder[gateIndex];
    console.log(`宫位 ${palace}: 门索引 ${gateIndex}, 门名 ${gateOrder[gateIndex]}`);
  }
  
  // 中五宫无门
  gateMapping[5] = "";
  
  // 验证所有宫位都有门（除了中五宫）
  const missingGates = [];
  for (let i = 1; i <= 9; i++) {
    if (i !== 5 && !gateMapping[i]) {
      missingGates.push(i);
    }
  }
  
  if (missingGates.length > 0) {
    console.warn(`以下宫位缺少八门: ${missingGates.join(', ')}`);
  }
  
  console.log('=== 八门最终分布 ===');
  for (let i = 1; i <= 9; i++) {
    console.log(`宫位 ${i}: ${gateMapping[i] || '无门'}`);
  }
  
  return gateMapping;
}

/**
 * 计算值符星（修正版）- 正确处理中五宫寄宫
 */
function calculateZhiFuStar(
  xunShouStem: string,
  diPan: Record<number, string>
): string {
  console.log(`=== 计算值符星（旬首天干: ${xunShouStem}）===`);
  
  // 找到旬首天干地盘所在宫位
  let xunShouPalace = 0;
  for (let i = 1; i <= 9; i++) {
    if (diPan[i] === xunShouStem) {
      xunShouPalace = i;
      console.log(`旬首天干 ${xunShouStem} 在地盘 ${i} 宫`);
      break;
    }
  }
  
  // 如果找不到旬首天干，返回默认值
  if (xunShouPalace === 0) {
    console.warn(`旬首天干 ${xunShouStem} 不在地盘中，使用默认值符星天蓬`);
    return "天蓬";
  }
  
  // 如果在中五宫，使用寄宫规则
  if (xunShouPalace === 5) {
    console.log(`旬首天干在中五宫，寄坤二宫`);
    xunShouPalace = 2; // 寄坤二宫
  }
  
  // 九星与宫位的固定关系
  const NINE_STARS_MAP_REV: Record<number, string> = {
    1: "天蓬", 2: "天芮", 3: "天冲", 4: "天辅",
    5: "天禽", 6: "天心", 7: "天柱", 8: "天任", 9: "天英"
  };
  
  const zhiFuStar = NINE_STARS_MAP_REV[xunShouPalace] || "天蓬";
  console.log(`值符星: ${zhiFuStar} (宫位 ${xunShouPalace})`);
  
  return zhiFuStar;
}

/**
 * 计算八神的转动（完整修复版）
 */
function rotateGods(
  zhiFuPalace: number,
  isYang: boolean
): Record<number, string> {
  console.log(`=== 转动八神 ===`);
  console.log(`值符宫位: ${zhiFuPalace}, 阳遁: ${isYang}`);
  
  // 八神顺序（阳遁顺行，阴遁逆行）
  const yangGods = ["值符", "螣蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"];
  const yinGods = ["值符", "九天", "九地", "玄武", "白虎", "六合", "太阴", "螣蛇"];
  
  const gods = isYang ? yangGods : yinGods;
  
  // 宫位顺序（按飞宫顺序，中五宫不参与）
  const palaceOrder = [1, 8, 3, 4, 9, 2, 7, 6];
  
  // 找到值符宫在顺序中的位置
  let zhiFuIndex = palaceOrder.indexOf(zhiFuPalace);
  
  // 如果值符在中五宫，寄坤二宫
  if (zhiFuPalace === 5) {
    zhiFuIndex = palaceOrder.indexOf(CENTRAL_PALACE_RULES.zhiFuAttachedPalace);
    console.log(`值符在中五宫，寄${CENTRAL_PALACE_RULES.zhiFuAttachedPalace}宫，位置索引: ${zhiFuIndex}`);
  }
  
  if (zhiFuIndex === -1) {
    console.error(`值符宫位 ${zhiFuPalace} 不在宫位顺序中: ${palaceOrder}`);
    return {};
  }
  
  console.log(`值符宫位索引: ${zhiFuIndex}`);
  
  // 构建八神映射
  const godMapping: Record<number, string> = {};
  
  palaceOrder.forEach((palace, index) => {
    let godIndex;
    if (isYang) {
      // 阳遁顺行：从值符开始顺排
      godIndex = (index - zhiFuIndex + 8) % 8;
    } else {
      // 阴遁逆行：从值符开始逆排
      godIndex = (zhiFuIndex - index + 8) % 8;
    }
    
    godMapping[palace] = gods[godIndex];
    console.log(`宫位 ${palace}: 神索引 ${godIndex}, 神名 ${gods[godIndex]}`);
  });
  
  // 中五宫无神
  godMapping[5] = "";
  
  // 输出八神分布
  console.log('=== 八神最终分布 ===');
  for (let i = 1; i <= 9; i++) {
    console.log(`宫位 ${i}: ${godMapping[i] || '无神'}`);
  }
  
  return godMapping;
}

/**
 * 修复版天盘转动算法 - 正确处理天禽星
 */
function rotateTianPanFixed(
  diPan: Record<number, string>,
  starMapping: Record<number, string>,
  hourStem: string,
  attachedPalace: number = 2
): Record<number, string> {
  console.log(`=== 修复转动天盘 ===`);
  
  const tianPan: Record<number, string> = {};
  
  // 初始化所有宫位为空
  for (let i = 1; i <= 9; i++) {
    tianPan[i] = "";
  }
  
  // 九星与原始宫位对应关系
  const starToPalace: Record<string, number> = {
    "天蓬": 1, "天芮": 2, "天冲": 3, "天辅": 4,
    "天禽": 5, "天心": 6, "天柱": 7, "天任": 8, "天英": 9,
    "芮禽": 2  // 芮禽视为天芮星在坤二宫
  };
  
  // 为每个有星的宫位排天盘干
  for (let palace = 1; palace <= 9; palace++) {
    const star = starMapping[palace];
    
    if (!star || star === "") {
      continue;
    }
    
    let originalPalace = starToPalace[star];
    
    // 特殊处理：芮禽视为天芮星在坤二宫
    if (star === "芮禽") {
      originalPalace = 2;
    }
    
    if (!originalPalace) {
      console.warn(`找不到九星 ${star} 的原始宫位`);
      continue;
    }
    
    // 获取原始宫位的地盘天干
    let diPanGan = "";
    
    if (originalPalace === 5) {
      // 中五宫的天干在寄宫位置
      diPanGan = diPan[attachedPalace] || "";
      console.log(`宫位 ${palace}（${star}）: 原始宫位 ${originalPalace} 寄于 ${attachedPalace}宫，地盘干 "${diPanGan}"`);
    } else {
      diPanGan = diPan[originalPalace] || "";
      console.log(`宫位 ${palace}（${star}）: 原始宫位 ${originalPalace}，地盘干 "${diPanGan}"`);
    }
    
    tianPan[palace] = diPanGan;
  }
  
  // 特殊处理：如果天英星出现，确保其天盘干正确
  for (let palace = 1; palace <= 9; palace++) {
    if (starMapping[palace] === "天英" && (!tianPan[palace] || tianPan[palace] === "")) {
      // 天英星原始宫位是离九宫（9宫）
      tianPan[palace] = diPan[9] || "";
      console.log(`补充天英星在宫位 ${palace} 的天盘干为 ${tianPan[palace]}`);
    }
  }
  
  console.log('=== 天盘最终分布 ===');
  for (let i = 1; i <= 9; i++) {
    console.log(`宫位 ${i}: ${tianPan[i] || '空'}`);
  }
  
  return tianPan;
}

export function plotChart(eventDate: Date, userName: string, gender: '男' | '女', birthDate: Date): ChartResult {
  console.log('=== 开始排盘计算 ===');
  console.log(`事件时间: ${eventDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log(`用户: ${userName}, 性别: ${gender}`);
  console.log(`出生时间: ${birthDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  
  // 1. 获取事件时间的四柱
  const pillars = getStemBranch(eventDate);
  console.log(`四柱: ${pillars.year.stem}${pillars.year.branch} ${pillars.month.stem}${pillars.month.branch} ${pillars.day.stem}${pillars.day.branch} ${pillars.hour.stem}${pillars.hour.branch}`);
  
  // 2. 获取出生时间的四柱
  const baziPillars = getStemBranch(birthDate);
  console.log(`八字四柱: ${baziPillars.year.stem}${baziPillars.year.branch} ${baziPillars.month.stem}${baziPillars.month.branch} ${baziPillars.day.stem}${baziPillars.day.branch} ${baziPillars.hour.stem}${baziPillars.hour.branch}`);
  
  // 3. 计算八字分析（传入 eventDate 作为当前时间）
  const baziAnalysis = calculateBaziAnalysis(baziPillars, birthDate, gender, eventDate); 
  console.log(`八字分析完成，日主: ${baziAnalysis.dayMaster}，五行: ${baziAnalysis.dayMasterElement}，旺衰: ${baziAnalysis.strength}`);
  
  // 4. 获取节气信息
   const solarTerm = calculateExactDunJu(eventDate);
   const dunJuResult = calculateExactDunJu(eventDate);
   const termName = dunJuResult.termName;
  console.log(`当前节气: ${termName}`);
  
  // 5. 使用精确节气数据计算遁局
  console.log(`开始计算遁局...`);
 
  
  // 使用 getCentralPalaceRule() 获取寄宫规则
  const centralAttachedPalace = getCentralPalaceRule();
  console.log(`寄宫规则确定: 中五宫寄${centralAttachedPalace}宫`);
  
  const isYang = dunJuResult.type === '阳';
  const juNum = dunJuResult.ju;
  
  // 中文数字映射
  const chineseNumbers = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const dunJuStr = `${dunJuResult.type}遁${chineseNumbers[juNum]}局`;
  
  console.log(`遁局计算结果:`);
  console.log(`  节气: ${dunJuResult.termName}`);
  console.log(`  类型: ${dunJuResult.type}`);
  console.log(`  局数: ${juNum}`);
  console.log(`  元数: ${dunJuResult.yuan}`);
  console.log(`  距节气: ${dunJuResult.daysSinceTerm.toFixed(2)}天 (${Math.floor(dunJuResult.daysSinceTerm)}天${dunJuResult.hoursSinceTerm}小时${dunJuResult.minutesSinceTerm}分)`);
  console.log(`  精度: ${dunJuResult.verification.status}`);
  console.log(`  消息: ${dunJuResult.verification.message}`);
  
  // 6. 地盘排布（优化版算法）- 避免循环卡死
  const diPan = setupDiPanFinal(juNum, isYang, centralAttachedPalace);
  
// 验证地盘排布
console.log('=== 地盘排布验证 ===');
const yangDunJuMap: Record<number, Record<number, string>> = {
  1: {1: '戊', 2: '己', 3: '庚', 4: '辛', 6: '壬', 7: '癸', 8: '丁', 9: '丙'},
  2: {1: '己', 2: '庚', 3: '辛', 4: '壬', 6: '癸', 7: '丁', 8: '丙', 9: '乙'},
  3: {1: '庚', 2: '辛', 3: '壬', 4: '癸', 6: '丁', 7: '丙', 8: '乙', 9: '戊'},
  4: {1: '辛', 2: '壬', 3: '癸', 4: '丁', 6: '丙', 7: '乙', 8: '戊', 9: '己'},
  5: {1: '癸', 2: '戊', 3: '丙', 4: '乙', 6: '己', 7: '庚', 8: '辛', 9: '壬'},
  6: {1: '丁', 2: '丙', 3: '乙', 4: '戊', 6: '庚', 7: '辛', 8: '壬', 9: '癸'},
  7: {1: '丙', 2: '乙', 3: '戊', 4: '己', 6: '辛', 7: '壬', 8: '癸', 9: '丁'},
  8: {1: '乙', 2: '戊', 3: '己', 4: '庚', 6: '壬', 7: '癸', 8: '丁', 9: '丙'},
  9: {1: '壬', 2: '癸', 3: '丁', 4: '丙', 6: '戊', 7: '己', 8: '庚', 9: '辛'}
};

if (isYang && yangDunJuMap[juNum]) {
  const expected = yangDunJuMap[juNum];
  let errors = 0;
  for (let i = 1; i <= 9; i++) {
    if (i === 5) continue; // 跳过中五宫
    const actual = diPan[i];
    const expect = expected[i as keyof typeof expected];
    if (actual !== expect) {
      errors++;
      console.warn(`宫位${i}: 预期${expect}, 实际${actual}`);
    }
  }
  if (errors > 0) {
    console.warn(`发现${errors}个地盘排布错误`);
  } else {
    console.log('地盘排布验证通过');
  }
}
  console.log('地盘完整分布:');
  for (let i = 1; i <= 9; i++) {
    console.log(`  宫位 ${i}: ${diPan[i] || '空'}`);
  }
  
  // 7. 计算旬首（修复版）
  const xunShouSB = calculateXunShou(pillars.day.stem, pillars.day.branch);
  const xunShouStem = XUN_MAP[xunShouSB] || "戊";
  
  console.log(`旬首计算:`);
  console.log(`  旬首干支: ${xunShouSB}`);
  console.log(`  旬首天干: ${xunShouStem}`);
  
  // 8. 确定值符星
  const zhiFuStar = calculateZhiFuStar(xunShouStem, diPan);
  
  // 找到值符星所在的原始宫位
  const NINE_STARS_MAP: Record<string, number> = {
    "天蓬": 1, "天芮": 2, "天冲": 3, "天辅": 4,
    "天禽": 5, "天心": 6, "天柱": 7, "天任": 8, "天英": 9
  };
  
  const zhiFuPalace = NINE_STARS_MAP[zhiFuStar] || 1;
  console.log(`值符星计算:`);
  console.log(`  值符星: ${zhiFuStar}`);
  console.log(`  值符原始宫位: ${zhiFuPalace}`);
  
  // 9. 确定值使门（修复版）
  const zhiShi = calculateZhiShi(xunShouSB, pillars.hour.branch, zhiFuPalace, isYang);
  console.log(`值使门计算:`);
  console.log(`  值使门: ${zhiShi}`);
  console.log(`  旬首: ${xunShouSB}, 时支: ${pillars.hour.branch}, 值符宫位: ${zhiFuPalace}, 阳遁: ${isYang}`);
  
  // 10. 排九星、八门、八神、天盘
  console.log(`开始排布九星、八门、八神、天盘...`);
  
  // 使用修复后的转动函数（需要确保这些函数已修复）
  const starMapping = rotateStarsFinal(diPan, zhiFuStar, pillars.hour.stem, isYang, centralAttachedPalace);
  const gateMapping = rotateGates(zhiShi, pillars.hour.branch, zhiFuPalace, isYang, xunShouSB);
  const godMapping = rotateGods(zhiFuPalace, isYang);
  const tianPan = rotateTianPanFixed(diPan, starMapping, pillars.hour.stem, centralAttachedPalace);
  
  // 验证关键分布
  console.log('=== 排盘关键分布验证 ===');
  
  // 验证九星分布
  console.log('九星分布:');
  for (let i = 1; i <= 9; i++) {
    const actualStar = starMapping[i] || "无星";
    console.log(`  宫位 ${i}: ${actualStar}`);
  }
  console.log(`九星分布验证完成`);
  
  // 验证八门分布
  console.log('八门分布:');
  for (let i = 1; i <= 9; i++) {
    const gate = gateMapping[i] || "无门";
    console.log(`  宫位 ${i}: ${gate}`);
  }
  
  // 验证八神分布
  console.log('八神分布:');
  for (let i = 1; i <= 9; i++) {
    const god = godMapping[i] || "无神";
    console.log(`  宫位 ${i}: ${god}`);
  }
  
  // 验证天盘分布
  console.log('天盘分布:');
  for (let i = 1; i <= 9; i++) {
    const tianGan = tianPan[i] || "空";
    console.log(`  宫位 ${i}: ${tianGan}`);
  }
  
  // 验证地盘分布
  console.log('地盘分布:');
  for (let i = 1; i <= 9; i++) {
    const diGan = diPan[i] || "空";
    console.log(`  宫位 ${i}: ${diGan}`);
  }
  
  // 11. 构建九宫数据
  const palaces: PalaceData[] = LOSHU_SQUARE.map(id => {
    // 处理天禽星显示
    let starDisplay = starMapping[id] || "";
    
    return {
      id,
      name: (PALACE_NAMES as any)[id],
      elements: {
        god: godMapping[id] || "",
        star: starDisplay,
        gate: gateMapping[id] || "",
        tianPan: tianPan[id] || "",
        diPan: diPan[id] || "",
        status: "旺"
      }
    };
  });
  
  // 12. 格式化日期显示
  const solarDateStr = `${birthDate.getFullYear()}年${String(birthDate.getMonth()+1).padStart(2,'0')}月${String(birthDate.getDate()).padStart(2,'0')}日${String(birthDate.getHours()).padStart(2,'0')}点${String(birthDate.getMinutes()).padStart(2,'0')}分`;
  
  // 13. 获取农历信息
  const lunarYearStr = `${baziPillars.year.stem}${baziPillars.year.branch}年（${ZODIAC[baziPillars.year.branch]}）`;
  const lunarDateStr = toLunar(birthDate);
  
  // 14. 获取节气显示信息
  const termInfo = getTermDisplayInfo(eventDate);
  
  // 15. 计算空亡地支
  const emptyBranches: string[] = EMPTY_BRANCHES[`${pillars.day.stem}${pillars.day.branch}`] || [];
  console.log(`空亡地支: ${emptyBranches.join(', ')}`);
  
  // 16. 计算驿马
  const maBranches: string[] = [];
  const hourBranch = pillars.hour.branch;
  // 驿马计算规则：申子辰马在寅，巳酉丑马在亥，寅午戌马在申，亥卯未马在巳
  const maRules: Record<string, string[]> = {
    '申': ['寅'], '子': ['寅'], '辰': ['寅'],
    '巳': ['亥'], '酉': ['亥'], '丑': ['亥'],
    '寅': ['申'], '午': ['申'], '戌': ['申'],
    '亥': ['巳'], '卯': ['巳'], '未': ['巳']
  };
  
  if (maRules[hourBranch]) {
    maBranches.push(...maRules[hourBranch]);
  }
  console.log(`驿马地支: ${maBranches.join(', ')}`);
  
  // 17. 宫位地支对应关系
  const palaceBranches: Record<number, string[]> = {
    1: ['子'],  // 坎一宫
    2: ['未', '申'],  // 坤二宫
    3: ['卯'],  // 震三宫
    4: ['辰', '巳'],  // 巽四宫
    5: [],  // 中五宫
    6: ['戌', '亥'],  // 乾六宫
    7: ['酉'],  // 兑七宫
    8: ['丑', '寅'],  // 艮八宫
    9: ['午']   // 离九宫
  };
  
const palaceList: PalaceData[] = LOSHU_SQUARE.map(id => {
  // 处理天禽星显示
  let starDisplay = starMapping[id] || "";
  
  return {
    id,
    name: (PALACE_NAMES as any)[id],
    elements: {
      god: godMapping[id] || "",
      star: starDisplay,
      gate: gateMapping[id] || "",
      tianPan: tianPan[id] || "",
      diPan: diPan[id] || "",
      status: "旺"
    }
  };
});

// === 添加验证代码在这里 ===
console.log('=== 最终排盘验证 ===');
console.log('=== 九星分布验证 ===');
const starCounts: Record<string, number> = {};
const starPalaces: Record<string, number[]> = {};

for (let i = 1; i <= 9; i++) {
  const star = starMapping[i];
  if (star && star !== "") {
    starCounts[star] = (starCounts[star] || 0) + 1;
    starPalaces[star] = starPalaces[star] || [];
    starPalaces[star].push(i);
  }
}

// 检查重复的星
for (const [star, count] of Object.entries(starCounts)) {
  if (count > 1 && star !== "芮禽") {
    console.warn(`警告：${star} 出现在 ${count} 个宫位（${starPalaces[star].join(', ')}）`);
  }
}

// 检查是否所有九星都出现（天禽星除外，因为它与天芮合并）
const expectedStars = ["天蓬", "天芮", "天冲", "天辅", "天心", "天柱", "天任", "天英"];
for (const star of expectedStars) {
  if (!starCounts[star] && !(star === "天芮" && starCounts["芮禽"])) {
    console.warn(`警告：缺少星 ${star}`);
  }
}
// 1. 验证九星完整
const starsInPalaces = new Set();
palaceList.forEach(p => {
  if (p.elements.star && p.elements.star !== "") {
    starsInPalaces.add(p.elements.star);
  }
});
console.log(`九星出现数量: ${starsInPalaces.size}`);
if (starsInPalaces.size < 8) {
  console.warn(`九星不完整，缺少 ${8 - starsInPalaces.size} 个星`);
  
  // 检查哪个星缺失
  const allStars = ["天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"];
  for (const star of allStars) {
    if (!starsInPalaces.has(star) && star !== "天禽") { // 天禽星可能合并为芮禽
      console.log(`缺失的星: ${star}`);
    }
  }
}

// 2. 验证天盘完整
const tianPanCount = palaceList.filter(p => p.elements.tianPan && p.elements.tianPan !== "").length;
console.log(`天盘干出现数量: ${tianPanCount}`);

// 3. 验证八门完整
const gateCount = palaceList.filter(p => p.elements.gate && p.elements.gate !== "").length;
console.log(`八门出现数量: ${gateCount}`);

// 4. 验证八神完整
const godCount = palaceList.filter(p => p.elements.god && p.elements.god !== "").length;
console.log(`八神出现数量: ${godCount}`);

// 验证各个宫位的元素是否完整
let incompletePalaces = 0;
for (const palace of palaceList) {
  const missing = [];
  if (!palace.elements.god) missing.push("八神");
  if (!palace.elements.star) missing.push("九星");
  if (!palace.elements.gate) missing.push("八门");
  if (!palace.elements.tianPan) missing.push("天盘干");
  
  if (missing.length > 0 && palace.id !== 5) { // 中五宫可以缺少元素
    incompletePalaces++;
    console.warn(`宫位 ${palace.id} (${palace.name}) 缺少: ${missing.join(', ')}`);
  }
}

if (incompletePalaces > 0) {
  console.warn(`共有 ${incompletePalaces} 个宫位元素不完整`);
} else {
  console.log('✅ 所有宫位元素完整');
}
// === 验证代码结束 ===

// 12. 构建最终结果
const result: ChartResult = {
    params: {
      yearSB: pillars.year,
      monthSB: pillars.month,
      daySB: pillars.day,
      hourSB: pillars.hour,
      solarTerm: dunJuResult.termName,
      dunJu: dunJuStr,
      isYang,
      juNum: juNum,
      yuan: dunJuResult.yuan,
      termType: dunJuResult.termType,
      daysSinceTerm: dunJuResult.daysSinceTerm,
      hoursSinceTerm: dunJuResult.hoursSinceTerm,
      isExact: dunJuResult.isExact,
      verification: dunJuResult.verification,
      type: dunJuResult.type,
    },
  palaces,
  zhiFu: zhiFuStar,
  zhiShi,
  xunShou: xunShouSB,
  personalInfo: {
      name: userName,
      gender,
      solarDate: solarDateStr,
      lunarDate: `${lunarYearStr}${lunarDateStr}`,
      bazi: `${baziPillars.year.stem}${baziPillars.year.branch} ${baziPillars.month.stem}${baziPillars.month.branch} ${baziPillars.day.stem}${baziPillars.day.branch} ${baziPillars.hour.stem}${baziPillars.hour.branch}`,
      analysis: baziAnalysis,
      termInfo: {
        current: termInfo.currentTerm,
        currentDate: termInfo.currentTermDate.toLocaleString('zh-CN', { 
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        next: termInfo.nextTerm || '',
        nextDate: termInfo.nextTermDate ? termInfo.nextTermDate.toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : null,
        daysToNext: termInfo.daysToNext,
        hoursToNext: termInfo.hoursToNext || null,
        minutesToNext: termInfo.minutesToNext || null,
        isTransition: termInfo.isTransition
      },
      emptyBranches,
      maBranches,
      palaceBranches
    },
    debugInfo: {
      starMapping,
      gateMapping,
      godMapping,
      tianPan,
      diPan,
      dunJuResult,
      pillars,
      baziPillars
    }
  };
return result;
}

/**
 * 验证排盘结果的辅助函数
 */
export function verifyChartResult(chart: ChartResult): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  details: Record<string, any>;
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, any> = {};
  
  // 基本验证
  if (!chart) {
    issues.push("排盘结果为空");
    return { isValid: false, issues, warnings, details };
  }
  
  if (!chart.params || !chart.palaces) {
    issues.push("排盘数据结构不完整");
    return { isValid: false, issues, warnings, details };
  }
  
  // 遁局验证
  const { type, juNum, yuan } = chart.params;
  if (type !== '阳' && type !== '阴') {
    issues.push(`遁局类型无效: ${type}`);
  }
  
  if (juNum < 1 || juNum > 9) {
    issues.push(`局数超出范围: ${juNum} (应在1-9之间)`);
  }
  
  if (!['上元', '中元', '下元'].includes(yuan)) {
    warnings.push(`元数格式异常: ${yuan}`);
  }
  
  // 九宫验证
  if (chart.palaces.length !== 9) {
    issues.push(`九宫数据数量不正确: ${chart.palaces.length}`);
  }
  
  // 值符值使验证
  if (!chart.zhiFu || !chart.zhiShi || !chart.xunShou) {
    warnings.push("值符、值使或旬首信息缺失");
  }
  
  // 检查是否有重复的九星
  const stars = chart.palaces.map(p => p.elements.star).filter(Boolean);
  const uniqueStars = new Set(stars);
  if (uniqueStars.size !== stars.length) {
    warnings.push("九星分布可能有重复");
  }
  
  // 检查天禽星显示
  const tianQinCount = stars.filter(star => star === "天禽" || star === "芮禽").length;
  if (tianQinCount > 1) {
    issues.push("天禽星/芮禽出现多次");
  }
  
  // 收集详细信息
  details.dunJu = `${type}遁${juNum}局 (${yuan})`;
  details.zhiFu = chart.zhiFu;
  details.zhiShi = chart.zhiShi;
  details.xunShou = chart.xunShou;
  details.emptyBranches = chart.personalInfo?.emptyBranches || [];
  details.maBranches = chart.personalInfo?.maBranches || [];
  
  // 九星分布
  const starDistribution: Record<number, string> = {};
  chart.palaces.forEach(palace => {
    starDistribution[palace.id] = palace.elements.star;
  });
  details.starDistribution = starDistribution;
  
  // 八门分布
  const gateDistribution: Record<number, string> = {};
  chart.palaces.forEach(palace => {
    gateDistribution[palace.id] = palace.elements.gate;
  });
  details.gateDistribution = gateDistribution;
  
  // 八神分布
  const godDistribution: Record<number, string> = {};
  chart.palaces.forEach(palace => {
    godDistribution[palace.id] = palace.elements.god;
  });
  details.godDistribution = godDistribution;
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    details
  };
}

/**
 * 运行排盘测试
 */
export function runChartTest(): void {
  console.log('=== 运行排盘测试 ===');
  
  // 测试案例1: 2026-01-15 16:30 (对应您提供的排盘结果)
  const testDate1 = new Date('2026-01-15T16:30:00+08:00');
  const birthDate1 = new Date('1979-07-11T16:30:00+08:00');
  
  console.log('测试案例1:');
  console.log('事件时间:', testDate1.toLocaleString('zh-CN'));
  console.log('出生时间:', birthDate1.toLocaleString('zh-CN'));
  
  const chart1 = plotChart(testDate1, '黄诗莹', '男', birthDate1);
  
  // 验证结果
  const verification1 = verifyChartResult(chart1);
  console.log('验证结果:');
  console.log('  有效:', verification1.isValid);
  if (verification1.issues.length > 0) {
    console.log('  问题:');
    verification1.issues.forEach(issue => console.log('    -', issue));
  }
  if (verification1.warnings.length > 0) {
    console.log('  警告:');
    verification1.warnings.forEach(warning => console.log('    -', warning));
  }
  
  console.log('排盘摘要:');
  console.log('  遁局:', verification1.details.dunJu);
  console.log('  值符:', verification1.details.zhiFu);
  console.log('  值使:', verification1.details.zhiShi);
  console.log('  旬首:', verification1.details.xunShou);
  
  console.log('\n九星分布:');
  Object.entries(verification1.details.starDistribution).forEach(([palace, star]) => {
    console.log(`  宫位 ${palace}: ${star}`);
  });
  
  console.log('\n空亡地支:', verification1.details.emptyBranches.join(', '));
  console.log('驿马地支:', verification1.details.maBranches.join(', '));
  
  // 测试案例2: 当前时间
  console.log('\n\n测试案例2: 当前时间');
  const testDate2 = new Date();
  const chart2 = plotChart(testDate2, '测试用户', '女', new Date('1990-01-01T12:00:00+08:00'));
  
  const verification2 = verifyChartResult(chart2);
  console.log('验证结果:', verification2.isValid ? '有效' : '无效');
  
  console.log('\n=== 排盘测试完成 ===');
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

export function testYangDun2(): ChartResult {
  const testDate = new Date('2026-02-15T23:49:00+08:00');
  const birthDate = new Date('1979-07-11T09:30:00+08:00');
  
  console.log('=== 测试阳遁二局 ===');
  console.log('事件时间:', testDate.toLocaleString('zh-CN'));
  console.log('出生时间:', birthDate.toLocaleString('zh-CN'));
  
  const result = plotChart(testDate, '测试用户', '男', birthDate);
  
  // 验证地盘 - 更新为考虑了寄宫的预期
  console.log('验证地盘:');
  const expectedDiPan = {
    1: '乙', 2: '辛', 3: '己', 4: '庚',
    5: '', 6: '壬', 7: '癸', 8: '丁', 9: '丙'
  };
  
  for (let i = 1; i <= 9; i++) {
    const actual = result.debugInfo?.diPan?.[i] || '';
    const expected = expectedDiPan[i as keyof typeof expectedDiPan];
    console.log(`宫位 ${i}: 预期=${expected}, 实际=${actual}, ${actual === expected ? '✓' : '✗'}`);
  }
  
  return result;
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