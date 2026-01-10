import { BaziAnalysis, BaziCoreResult } from '../types';
import { STEM_ELEMENTS, ELEMENT_RELATIONS, ELEMENT_TO_KEY, KEY_TO_CHINESE } from '../constants';

/**
 * 中心化的八字分析服务
 */

export function determineDayMasterStrength(analysis: BaziAnalysis): '身强' | '身弱' | '中和' {
  const dmElement = analysis.dayMasterElement;
  
  // 关键修复：使用 ELEMENT_TO_KEY 将中文五行转换为英文键
  const dmKey = ELEMENT_TO_KEY[dmElement] as keyof typeof analysis.elementCounts;
  
  if (!dmKey) {
    console.warn(`无法找到日主五行 ${dmElement} 对应的键`);
    return '中和'; // 默认返回中和
  }
  
  const selfSupport = analysis.elementCounts[dmKey] || 0;
  const total = Object.values(analysis.elementCounts).reduce((a, b) => a + b, 0);
  const ratio = total > 0 ? selfSupport / total : 0.5;
  
  // 调整阈值，根据八字理论优化
  if (ratio > 0.55) return '身强';
  if (ratio < 0.35) return '身弱'; // 降低阈值，使身弱更难达到
  return '中和';
}

export function determineBaziPattern(analysis: BaziAnalysis): string {
  const dmElement = analysis.dayMasterElement;
  const strength = analysis.strength || determineDayMasterStrength(analysis);
  
  // 安全检查：确保yongShen存在且不为空
  const yongShen = analysis.yongShen || [];
  const yongShenElement = yongShen.length > 0 ? yongShen[0] : null;
  
  // 获取日主五行的能量状态
  const dmEnergyState = analysis.energyState[dmElement] || '';
  const dmEnergyValue = analysis.elementEnergy[ELEMENT_TO_KEY[dmElement] as keyof typeof analysis.elementEnergy] || 0;
  
  const isZhengGe = dmEnergyState === '旺' && dmEnergyValue > 60;
  
  // 从格判断：日主身弱，且用神能量旺盛
  const isCongGe = strength === '身弱' && yongShenElement 
    && analysis.energyState[yongShenElement] === '旺'
    && analysis.elementEnergy[ELEMENT_TO_KEY[yongShenElement]] > 50;
  
  // 假从格：日主较弱，但有较强的用神支持
  const isJiaCongGe = strength === '身弱' && yongShenElement
    && analysis.elementEnergy[ELEMENT_TO_KEY[yongShenElement]] > 30;
  
  // 化格：寻找能量最强的五行，且不是日主本身
  const elementKeys = Object.keys(ELEMENT_TO_KEY) as Array<keyof typeof ELEMENT_TO_KEY>;
  let huaGeElement = null;
  let maxEnergy = 0;
  
  for (const element of elementKeys) {
    if (element === dmElement) continue; // 跳过日主本身
    
    const key = ELEMENT_TO_KEY[element];
    const energy = analysis.elementEnergy[key] || 0;
    
    if (energy > maxEnergy && energy > 40) {
      maxEnergy = energy;
      huaGeElement = element;
    }
  }
  
  let pattern = '普通格';
  if (isZhengGe) pattern = '正格';
  else if (isCongGe) pattern = '从格';
  else if (isJiaCongGe) pattern = '假从格';
  else if (huaGeElement) pattern = `化格为${huaGeElement}格`;
  
  return pattern;
}

export function generatePatternAdvice(
  pattern: string, 
  yongShen: string[], 
  xiShen: string[], 
  jiShen: string[],
  dayMasterElement: string
): string[] {
  const advices: string[] = [];
  
  // 根据格局给出建议
  if (pattern.includes('正格')) {
    advices.push('八字格局正，日主能量平衡，适合稳扎稳打的发展策略。');
    advices.push('保持五行平衡，注意季节变化对运势的影响。');
  } else if (pattern.includes('从格')) {
    const yongShenText = yongShen.length > 0 ? yongShen.join('、') : '相关五行';
    const jiShenText = jiShen.length > 0 ? jiShen.join('、') : '不利五行';
    advices.push(`日主偏弱从势，应以从神为主，多借助 ${yongShenText} 的能量。`);
    advices.push(`避免与 ${jiShenText} 产生冲突，顺势而为方为上策。`);
  } else if (pattern.includes('假从格')) {
    const yongShenText = yongShen.length > 0 ? yongShen.join('、') : '相关五行';
    advices.push(`八字看似从格，但日主尚有根气，需要适度借助 ${yongShenText} 的力量。`);
    advices.push('进退有度，时机合适时可以考虑独立发展。');
  } else if (pattern.includes('化格')) {
    const patternElement = pattern.replace('化格为', '').replace('格', '');
    advices.push(`日主有化气趋势，可能向 ${patternElement} 的能量转化。`);
    advices.push(`多培养自身的 ${patternElement} 属性特质，减少对抗性思维。`);
  } else {
    advices.push('八字格局平和，注意保持五行平衡即可。');
  }
  
  // 喜用神建议
  if (yongShen.length > 0) {
    const yongShenText = yongShen.join('、');
    
    // 根据用神五行给出具体建议
    const elementAdvice: Record<string, string[]> = {
      '木': ['多接触绿色环境', '培养植物', '早晨活动', '东方方位有利'],
      '火': ['多穿红色衣物', '保持热情开朗', '中午活动', '南方方位有利'],
      '土': ['接触大地自然', '培养稳定性', '黄色系有利', '中央方位稳定'],
      '金': ['佩戴金属饰品', '培养决断力', '傍晚活动', '西方方位有利'],
      '水': ['多接触水域', '培养灵活性', '晚上活动', '北方方位有利']
    };
    
    const specificAdvices: string[] = [];
    yongShen.forEach(element => {
      if (elementAdvice[element]) {
        specificAdvices.push(...elementAdvice[element]);
      }
    });
    
    if (specificAdvices.length > 0) {
      advices.push(`喜用神为 ${yongShenText}，建议：${specificAdvices.slice(0, 3).join('、')}`);
    } else {
      advices.push(`喜用神为 ${yongShenText}，日常宜多接触相应元素的事物。`);
    }
  }
  
  // 忌神注意
  if (jiShen.length > 0) {
    const jiShenText = jiShen.join('、');
    
    const elementAvoid: Record<string, string[]> = {
      '木': ['避免过度竞争', '减少熬夜', '东方方位谨慎'],
      '火': ['避免过度急躁', '减少辛辣食物', '南方方位注意'],
      '土': ['避免固执己见', '减少甜食', '注意脾胃健康'],
      '金': ['避免过度尖锐', '减少辛辣刺激', '西方方位谨慎'],
      '水': ['避免过度变动', '减少寒凉食物', '北方方位注意']
    };
    
    const avoidAdvices: string[] = [];
    jiShen.forEach(element => {
      if (elementAvoid[element]) {
        avoidAdvices.push(...elementAvoid[element]);
      }
    });
    
    if (avoidAdvices.length > 0) {
      advices.push(`忌神为 ${jiShenText}，注意：${avoidAdvices.slice(0, 2).join('、')}`);
    } else {
      advices.push(`忌神为 ${jiShenText}，应尽量避免过多消耗日主力量。`);
    }
  }
  
  // 洩神建议
  if (xiShen.length > 0) {
    advices.push(`洩神为 ${xiShen.join('、')}，当感到能量过旺时，可适度利用以泄身。`);
  }
  
  // 默认建议
  if (advices.length === 0) {
    advices.push('八字格局平衡，注意保持五行调和即可。');
    advices.push('顺其自然，保持心态平和是最佳策略。');
  }
  
  return advices;
}

export function analyzeBaziCore(analysis: BaziAnalysis): BaziCoreResult {
  // 确保所有必需字段都有默认值
  const safeAnalysis: BaziAnalysis = {
    ...analysis,
    yongShen: analysis.yongShen || [],
    xiShen: analysis.xiShen || [],
    jiShen: analysis.jiShen || [],
    tiaoHouShen: analysis.tiaoHouShen || [],
    emptyBranches: analysis.emptyBranches || [],
    elementCounts: analysis.elementCounts || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    elementEnergy: analysis.elementEnergy || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    tenGodDistribution: analysis.tenGodDistribution || { '比劫': 0, '印绶': 0, '官杀': 0, '财才': 0, '食伤': 0 },
    energyState: analysis.energyState || { '木': '', '火': '', '土': '', '金': '', '水': '' }
  };
  
  const strength = safeAnalysis.strength || determineDayMasterStrength(safeAnalysis);
  const pattern = determineBaziPattern(safeAnalysis);
  
  const advice = generatePatternAdvice(
    pattern, 
    safeAnalysis.yongShen, 
    safeAnalysis.xiShen, 
    safeAnalysis.jiShen,
    safeAnalysis.dayMasterElement
  );
  
  return {
    dayMaster: safeAnalysis.dayMaster,
    dayMasterElement: safeAnalysis.dayMasterElement,
    strength,
    pattern,
    yongShen: safeAnalysis.yongShen,
    xiShen: safeAnalysis.xiShen,
    jiShen: safeAnalysis.jiShen,
    elementEnergy: safeAnalysis.elementEnergy,
    advice
  };
}

/**
 * 辅助函数：获取五行对应的英文键
 */
export function getElementKey(element: string): keyof BaziAnalysis['elementCounts'] | null {
  return ELEMENT_TO_KEY[element] as keyof BaziAnalysis['elementCounts'] || null;
}

/**
 * 辅助函数：获取英文键对应的中文五行
 */
export function getChineseElement(key: keyof BaziAnalysis['elementCounts']): string {
  return KEY_TO_CHINESE[key];
}