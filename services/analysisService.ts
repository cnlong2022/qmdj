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
  
  // 获取五行能量百分比
  const woodEnergy = analysis.elementEnergy.wood || 0;
  const fireEnergy = analysis.elementEnergy.fire || 0;
  const earthEnergy = analysis.elementEnergy.earth || 0;
  const metalEnergy = analysis.elementEnergy.metal || 0;
  const waterEnergy = analysis.elementEnergy.water || 0;
  
  // 获取五行原始得分
  const woodScore = analysis.elementCounts.wood || 0;
  const fireScore = analysis.elementCounts.fire || 0;
  const earthScore = analysis.elementCounts.earth || 0;
  const metalScore = analysis.elementCounts.metal || 0;
  const waterScore = analysis.elementCounts.water || 0;
  
  // 获取十神分布
  const tenGodDist = analysis.tenGodDistribution;
  
  // 1. 专旺格判断（一行专旺）
  const totalScore = woodScore + fireScore + earthScore + metalScore + waterScore;
  const dmScore = analysis.elementCounts[ELEMENT_TO_KEY[dmElement] as keyof typeof analysis.elementCounts] || 0;
  const dmPercentage = totalScore > 0 ? dmScore / totalScore * 100 : 0;
  
  // 专旺格：日主五行能量超过70%
  if (dmPercentage >= 70) {
    const specialNames: Record<string, string> = {
      '木': '曲直仁寿格',
      '火': '炎上格',
      '土': '稼穑格',
      '金': '从革格',
      '水': '润下格'
    };
    return `${specialNames[dmElement] || dmElement + '专旺格'}`;
  }
  
  // 2. 从格判断
  // 从弱格：日主能量很弱（<20%），其他某一行能量很强
  if (strength === '身弱' && dmPercentage < 20) {
    // 找到最强的其他五行
    const otherElements = ['木', '火', '土', '金', '水'].filter(el => el !== dmElement);
    let maxOtherEnergy = 0;
    let maxOtherElement = '';
    
    otherElements.forEach(element => {
      const key = ELEMENT_TO_KEY[element];
      const energy = analysis.elementEnergy[key] || 0;
      if (energy > maxOtherEnergy) {
        maxOtherEnergy = energy;
        maxOtherElement = element;
      }
    });
    
    // 如果最强的其他五行能量超过50%
    if (maxOtherEnergy > 50) {
      const fromNames: Record<string, string> = {
        '木': '从财格',
        '火': '从儿格',
        '土': '从杀格',
        '金': '从财格',
        '水': '从杀格'
      };
      return `从${maxOtherElement}格（${fromNames[maxOtherElement] || '从格'}）`;
    }
  }
  
  // 3. 两神成像格（两种五行能量都很强，且相生）
  // 检查是否有两种五行能量都超过30%
  const strongElements: string[] = [];
  [['木', woodEnergy], ['火', fireEnergy], ['土', earthEnergy], ['金', metalEnergy], ['水', waterEnergy]]
    .forEach(([element, energy]) => {
      if (energy > 30) {
        strongElements.push(element as string);
      }
    });
  
  // 如果有两种五行都很强
  if (strongElements.length === 2) {
    const [el1, el2] = strongElements;
    
    // 检查是否相生关系
    const el1Sheng = ELEMENT_RELATIONS[el1].sheng; // el1生的五行
    const el2Sheng = ELEMENT_RELATIONS[el2].sheng; // el2生的五行
    
    // 如果el1生el2
    if (el1Sheng === el2) {
      const twoGodPatterns: Record<string, string> = {
        '木火': '木火通明格',
        '火土': '火土相生格',
        '土金': '土金毓秀格',
        '金水': '金白水清格',
        '水木': '水木清华格'
      };
      const patternKey = el1 + el2;
      return twoGodPatterns[patternKey] || `${el1}${el2}两神成像格`;
    }
    
    // 如果el2生el1
    if (el2Sheng === el1) {
      const twoGodPatterns: Record<string, string> = {
        '火木': '木火通明格',
        '土火': '火土相生格',
        '金土': '土金毓秀格',
        '水金': '金白水清格',
        '木水': '水木清华格'
      };
      const patternKey = el2 + el1;
      return twoGodPatterns[patternKey] || `${el2}${el1}两神成像格`;
    }
  }
  
  // 4. 三气成像格（三种五行连续相生，能量都很强）
  if (strongElements.length === 3) {
    // 检查是否连续相生（如木生火生土）
    const sortedElements = [...strongElements].sort((a, b) => {
      const order = ['木', '火', '土', '金', '水', '木']; // 相生顺序
      return order.indexOf(a) - order.indexOf(b);
    });
    
    // 检查是否连续相生
    let isSequentialSheng = true;
    for (let i = 0; i < sortedElements.length - 1; i++) {
      const currentEl = sortedElements[i];
      const nextEl = sortedElements[i + 1];
      const shengEl = ELEMENT_RELATIONS[currentEl].sheng;
      
      if (shengEl !== nextEl) {
        isSequentialSheng = false;
        break;
      }
    }
    
    if (isSequentialSheng) {
      const threeGodPatterns: Record<string, string> = {
        '木火土': '三气朝阳格',
        '火土金': '三气通根格',
        '土金水': '三气流通格',
        '金水木': '三气润泽格',
        '水木火': '三气生旺格'
      };
      const patternKey = sortedElements.join('');
      return threeGodPatterns[patternKey] || `${sortedElements.join('')}三气成像格`;
    }
  }
  
  // 5. 十神特殊格局
  const bijiePercent = tenGodDist['比劫'] || 0;
  const yinshouPercent = tenGodDist['印绶'] || 0;
  const guanshaPercent = tenGodDist['官杀'] || 0;
  const caicaiPercent = tenGodDist['财才'] || 0;
  const shishangPercent = tenGodDist['食伤'] || 0;
  
  // 5.1 伤官配印格
  if (shishangPercent > 25 && yinshouPercent > 25) {
    return '伤官配印格';
  }
  
  // 5.2 食神制杀格
  if (shishangPercent > 25 && guanshaPercent > 25) {
    return '食神制杀格';
  }
  
  // 5.3 官印相生格
  if (guanshaPercent > 25 && yinshouPercent > 25) {
    return '官印相生格';
  }
  
  // 5.4 财官双美格
  if (caicaiPercent > 25 && guanshaPercent > 25) {
    return '财官双美格';
  }
  
  // 5.5 杀印相生格
  if (guanshaPercent > 30 && yinshouPercent > 20) {
    return '杀印相生格';
  }
  
  // 5.6 羊刃驾杀格
  if (bijiePercent > 30 && guanshaPercent > 25) {
    return '羊刃驾杀格';
  }
  
  // 5.7 伤官生财格
  if (shishangPercent > 25 && caicaiPercent > 25) {
    return '伤官生财格';
  }
  
  // 6. 特殊旺衰组合
  // 6.1 身旺无依（身强但无财官）
  if (strength === '身强' && caicaiPercent < 15 && guanshaPercent < 15) {
    return '身旺无依格';
  }
  
  // 6.2 身弱无扶（身弱无比劫印绶）
  if (strength === '身弱' && bijiePercent < 15 && yinshouPercent < 15) {
    return '身弱无扶格';
  }
  
  // 6.3 财多身弱
  if (strength === '身弱' && caicaiPercent > 35) {
    return '财多身弱格';
  }
  
  // 6.4 官杀混杂
  if (guanshaPercent > 40) {
    // 需要检查是否有正官和七杀同时存在，这里简化处理
    return '官杀混杂格';
  }
  
  // 6.5 印绶过重
  if (yinshouPercent > 40) {
    return '印绶过重格';
  }
  
  // 6.6 比劫夺财
  if (bijiePercent > 30 && caicaiPercent > 20) {
    return '比劫夺财格';
  }
  
  // 7. 寒暖燥湿特殊格局
  // 获取月支
  const monthBranch = analysis.pillars?.month?.sb?.branch || '';
  
  // 7.1 金寒水冷格（冬季金水旺）
  if ((monthBranch === '子' || monthBranch === '亥' || monthBranch === '丑') && 
      metalEnergy > 30 && waterEnergy > 30) {
    return '金寒水冷格';
  }
  
  // 7.2 火炎土燥格（夏季火土旺）
  if ((monthBranch === '午' || monthBranch === '巳' || monthBranch === '未') && 
      fireEnergy > 30 && earthEnergy > 30) {
    return '火炎土燥格';
  }
  
  // 7.3 水木清华格（春冬水木旺）
  if ((monthBranch === '寅' || monthBranch === '卯' || monthBranch === '亥' || monthBranch === '子') && 
      waterEnergy > 25 && woodEnergy > 25) {
    return '水木清华格';
  }
  
  // 7.4 土厚金埋格（四季土重金旺）
  if (earthEnergy > 40 && metalEnergy > 20) {
    return '土厚金埋格';
  }
  
  // 8. 六亲特殊格局
  // 8.1 财星得局（财星能量集中）
  if (caicaiPercent > 35 && 
      (analysis.pillars?.year?.tenGod.includes('财') || 
       analysis.pillars?.month?.tenGod.includes('财') ||
       analysis.pillars?.day?.tenGod.includes('财') ||
       analysis.pillars?.hour?.tenGod.includes('财'))) {
    return '财星得局格';
  }
  
  // 8.2 官星得位（官星在月令或日支）
  if (guanshaPercent > 25 && 
      (analysis.pillars?.month?.tenGod.includes('官') || 
       analysis.pillars?.day?.tenGod.includes('官'))) {
    return '官星得位格';
  }
  
  // 8.3 印星护身（印星在日支或时支）
  if (yinshouPercent > 20 && 
      (analysis.pillars?.day?.tenGod.includes('印') || 
       analysis.pillars?.hour?.tenGod.includes('印'))) {
    return '印星护身格';
  }
  
  // 9. 流通格局
  // 检查五行能量是否相对均衡（没有明显偏枯）
  const energies = [woodEnergy, fireEnergy, earthEnergy, metalEnergy, waterEnergy];
  const maxEnergy = Math.max(...energies);
  const minEnergy = Math.min(...energies);
  const energyDiff = maxEnergy - minEnergy;
  
  // 如果能量相对均衡（最大最小差小于40%）
  if (energyDiff < 40) {
    // 检查是否连续相生
    const elementOrder = ['木', '火', '土', '金', '水', '木'];
    let isCirculating = true;
    
    for (let i = 0; i < elementOrder.length - 1; i++) {
      const currentEl = elementOrder[i];
      const nextEl = elementOrder[i + 1];
      const currentEnergy = analysis.elementEnergy[ELEMENT_TO_KEY[currentEl]];
      const nextEnergy = analysis.elementEnergy[ELEMENT_TO_KEY[nextEl]];
      
      // 如果当前五行有能量，下一五行也应该有一定能量
      if (currentEnergy > 15 && nextEnergy < 10) {
        isCirculating = false;
        break;
      }
    }
    
    if (isCirculating) {
      return '五行流通格';
    }
  }
  
  // 10. 特殊日柱格局
  const dayStemBranch = `${analysis.pillars?.day?.sb?.stem}${analysis.pillars?.day?.sb?.branch}`;
  
  const specialDayPillars: Record<string, string> = {
    '甲子': '六甲趋乾格',
    '戊午': '日刃格',
    '庚申': '日禄格',
    '癸亥': '日贵格',
    '乙卯': '日德格',
    '丙午': '日刃格',
    '丁巳': '日刃格',
    '壬子': '日刃格',
    '辛酉': '日禄格',
    '己巳': '日贵格'
  };
  
  if (specialDayPillars[dayStemBranch]) {
    return specialDayPillars[dayStemBranch];
  }
  
  // 默认判断
  // 11. 调候用神格局
  if (analysis.tiaoHouShen && analysis.tiaoHouShen.length >= 2) {
    const tiaoHouStrength = analysis.tiaoHouShen
      .map(stem => STEM_ELEMENTS[stem])
      .filter((element, index, self) => self.indexOf(element) === index)
      .length;
    
    if (tiaoHouStrength >= 2) {
      return '调候有力格';
    }
  }
  
  // 12. 普通格局细分
  if (strength === '身强') {
    if (guanshaPercent > 25) {
      return '身强官旺格';
    } else if (caicaiPercent > 25) {
      return '身强财旺格';
    } else if (shishangPercent > 25) {
      return '身强食伤格';
    }
  } else if (strength === '身弱') {
    if (yinshouPercent > 25) {
      return '身弱印旺格';
    } else if (bijiePercent > 25) {
      return '身弱比劫格';
    }
  }
  
  // 最后返回普通格
  return '普通格局';
}

// 在 analysisService.ts 中更新 generatePatternAdvice 函数

export function generatePatternAdvice(
  pattern: string, 
  yongShen: string[], 
  xiShen: string[], 
  jiShen: string[],
  dayMasterElement: string,
  strength: string,
  tenGodDistribution?: Record<string, number>,
  elementEnergy?: Record<string, number>,
  energyState?: Record<string, string>,
  tiaoHouShen?: string[],
  emptyBranches?: string[]
): string[] {
  const advices: string[] = [];
  
  // === 一、格局核心分析（扩展版）===
  advices.push(`【格局分析：${pattern}】`);
  
  // 专旺格系列
  if (pattern.includes('曲直仁寿格') || pattern.includes('木专旺格')) {
    advices.push(`木气专旺，形成"曲直仁寿格"，木主仁，性格仁慈宽厚，有领导才能。`);
    advices.push(`此格局喜水木生扶，火土为调候，忌金来砍伐。`);
    advices.push(`事业发展宜从事木、水、火相关行业，如林业、教育、文化、能源等。`);
  } else if (pattern.includes('炎上格') || pattern.includes('火专旺格')) {
    advices.push(`火气专旺，形成"炎上格"，火主礼，性格热情开朗，聪明伶俐。`);
    advices.push(`此格局喜木火生扶，土金为调候，忌水来浇灭。`);
    advices.push(`事业发展宜从事火、木、土相关行业，如能源、传媒、餐饮、建筑等。`);
  } else if (pattern.includes('稼穑格') || pattern.includes('土专旺格')) {
    advices.push(`土气专旺，形成"稼穑格"，土主信，性格诚实守信，稳重踏实。`);
    advices.push(`此格局喜火土生扶，金水为调候，忌木来克破。`);
    advices.push(`事业发展宜从事土、火、金相关行业，如房地产、建筑、金融、农业等。`);
  } else if (pattern.includes('从革格') || pattern.includes('金专旺格')) {
    advices.push(`金气专旺，形成"从革格"，金主义，性格刚毅果断，讲义气。`);
    advices.push(`此格局喜土金生扶，水木为调候，忌火来熔炼。`);
    advices.push(`事业发展宜从事金、土、水相关行业，如金融、法律、机械、物流等。`);
  } else if (pattern.includes('润下格') || pattern.includes('水专旺格')) {
    advices.push(`水气专旺，形成"润下格"，水主智，性格聪明机智，善于变通。`);
    advices.push(`此格局喜金水生扶，木火为调候，忌土来阻塞。`);
    advices.push(`事业发展宜从事水、金、木相关行业，如物流、贸易、咨询、教育等。`);
  }
  
  // 从格系列
  else if (pattern.includes('从木格') || pattern.includes('从财格')) {
    advices.push(`日主极弱从财，形成"从财格"，以财星为用，善理财，重物质。`);
    advices.push(`此格局宜顺势而为，跟随财星能量发展，忌比劫争财。`);
    advices.push(`事业发展宜从事金融、贸易、销售等与钱财相关的行业。`);
  } else if (pattern.includes('从火格') || pattern.includes('从儿格')) {
    advices.push(`日主极弱从食伤，形成"从儿格"，以食伤为用，才华横溢，创意丰富。`);
    advices.push(`此格局宜发挥才华创意，忌印星克制食伤。`);
    advices.push(`事业发展宜从事艺术、设计、技术、演艺等创意性行业。`);
  } else if (pattern.includes('从土格') || pattern.includes('从杀格')) {
    advices.push(`日主极弱从官杀，形成"从杀格"，以官杀为用，有领导才能，善管理。`);
    advices.push(`此格局宜在体制内或大企业发展，忌食伤克制官杀。`);
    advices.push(`事业发展宜从事管理、公务员、军警、法律等权威性行业。`);
  } else if (pattern.includes('从金格')) {
    advices.push(`日主极弱从金，形成"从金格"，以金为用，果断坚决，执行力强。`);
    advices.push(`此格局宜从事需要决断力的行业，忌火来克金。`);
    advices.push(`事业发展宜从事金融、法律、机械、管理等需要决断的行业。`);
  } else if (pattern.includes('从水格')) {
    advices.push(`日主极弱从水，形成"从水格"，以水为用，聪明灵活，善于变通。`);
    advices.push(`此格局宜从事需要智慧的行业，忌土来克水。`);
    advices.push(`事业发展宜从事咨询、贸易、物流、旅游等需要智慧的行业。`);
  }
  
  // 两神成像格系列
  else if (pattern.includes('木火通明格')) {
    advices.push(`木火两神成像，形成"木火通明格"，聪明有才华，文采出众。`);
    advices.push(`此格局喜木火相生，忌金水来破。`);
    advices.push(`事业发展宜从事文化、教育、传媒、艺术等文职工作。`);
  } else if (pattern.includes('火土相生格')) {
    advices.push(`火土两神成像，形成"火土相生格"，诚实守信，稳重踏实。`);
    advices.push(`此格局喜火土相生，忌木来克土、水来克火。`);
    advices.push(`事业发展宜从事建筑、房地产、餐饮、能源等实际性行业。`);
  } else if (pattern.includes('土金毓秀格')) {
    advices.push(`土金两神成像，形成"土金毓秀格"，讲义气，有信誉，执行力强。`);
    advices.push(`此格局喜土金相生，忌火来熔金、木来克土。`);
    advices.push(`事业发展宜从事金融、建筑、管理、法律等需要信誉的行业。`);
  } else if (pattern.includes('金白水清格')) {
    advices.push(`金水两神成像，形成"金白水清格"，聪明机智，善于交际。`);
    advices.push(`此格局喜金水相生，忌土来埋金、火来熔金。`);
    advices.push(`事业发展宜从事金融、贸易、咨询、物流等需要智慧的行业。`);
  } else if (pattern.includes('水木清华格')) {
    advices.push(`水木两神成像，形成"水木清华格"，仁慈聪明，有艺术天赋。`);
    advices.push(`此格局喜水木相生，忌金来克木、土来克水。`);
    advices.push(`事业发展宜从事教育、文化、设计、园艺等艺术性行业。`);
  }
  
  // 三气成像格系列
  else if (pattern.includes('三气朝阳格') || pattern.includes('木火土三气成像格')) {
    advices.push(`木火土三气流通，形成"三气朝阳格"，生命力旺盛，事业发展顺利。`);
    advices.push(`此格局五行流通，忌金来砍木、水来克火。`);
    advices.push(`事业发展宜多元化，木、火、土相关行业均可涉足。`);
  } else if (pattern.includes('三气通根格') || pattern.includes('火土金三气成像格')) {
    advices.push(`火土金三气流通，形成"三气通根格"，根基稳固，财运亨通。`);
    advices.push(`此格局五行流通，忌水来克火、木来克土。`);
    advices.push(`事业发展宜从事火、土、金相关的实体行业。`);
  } else if (pattern.includes('三气流通格') || pattern.includes('土金水三气成像格')) {
    advices.push(`土金水三气流通，形成"三气流通格"，财运稳定，智慧过人。`);
    advices.push(`此格局五行流通，忌火来熔金、木来克土。`);
    advices.push(`事业发展宜从事土、金、水相关的金融贸易行业。`);
  } else if (pattern.includes('三气润泽格') || pattern.includes('金水木三气成像格')) {
    advices.push(`金水木三气流通，形成"三气润泽格"，聪明机智，适应力强。`);
    advices.push(`此格局五行流通，忌土来埋金、火来熔金。`);
    advices.push(`事业发展宜从事金、水、木相关的教育咨询行业。`);
  } else if (pattern.includes('三气生旺格') || pattern.includes('水木火三气成像格')) {
    advices.push(`水木火三气流通，形成"三气生旺格"，才华横溢，事业发展迅速。`);
    advices.push(`此格局五行流通，忌金来克木、土来克水。`);
    advices.push(`事业发展宜从事水、木、火相关的文化创意行业。`);
  }
  
  // 十神特殊格局系列
  else if (pattern === '伤官配印格') {
    advices.push(`伤官与印绶搭配，形成"伤官配印格"，才华与学识兼备，大器晚成。`);
    advices.push(`伤官主才华，印绶主学识，二者结合能发挥最大潜力。`);
    advices.push(`事业发展宜先积累学识，再发挥才华，忌财星坏印。`);
  } else if (pattern === '食神制杀格') {
    advices.push(`食神制伏七杀，形成"食神制杀格"，以智谋化解压力，成就非凡。`);
    advices.push(`七杀主压力挑战，食神主智慧才华，能化压力为动力。`);
    advices.push(`事业发展宜从事需要智慧应对挑战的行业，忌印星克制食神。`);
  } else if (pattern === '官印相生格') {
    advices.push(`官星生印绶，形成"官印相生格"，有官运，得贵人扶持，学业事业顺利。`);
    advices.push(`官星主事业地位，印绶主学识贵人，二者相生大利事业学业。`);
    advices.push(`事业发展宜在体制内或大企业发展，忌财星坏印。`);
  } else if (pattern === '财官双美格') {
    advices.push(`财星与官星俱旺，形成"财官双美格"，富贵双全，事业财运俱佳。`);
    advices.push(`财星主财富，官星主地位，二者俱旺则富贵可期。`);
    advices.push(`事业发展宜从事能同时获得财富和地位的行业，忌比劫夺财。`);
  } else if (pattern === '杀印相生格') {
    advices.push(`七杀生印绶，形成"杀印相生格"，化压力为动力，有权威地位。`);
    advices.push(`七杀主压力权威，印绶主智慧化解，能掌权柄。`);
    advices.push(`事业发展宜从事管理、军警、法律等权威性行业，忌财星坏印。`);
  } else if (pattern === '羊刃驾杀格') {
    advices.push(`羊刃与七杀搭配，形成"羊刃驾杀格"，勇猛果断，能成大业。`);
    advices.push(`羊刃主刚强，七杀主挑战，二者搭配能应对重大挑战。`);
    advices.push(`事业发展宜从事需要勇气决断的行业，忌食伤泄身。`);
  } else if (pattern === '伤官生财格') {
    advices.push(`伤官生财星，形成"伤官生财格"，以才华创造财富，财运亨通。`);
    advices.push(`伤官主才华创意，财星主财富，能凭才华致富。`);
    advices.push(`事业发展宜从事创意、技术、艺术等能变现才华的行业，忌印星克制伤官。`);
  }
  
  // 特殊旺衰格局系列
  else if (pattern === '身旺无依格') {
    advices.push(`身强但财官弱，形成"身旺无依格"，有能力但缺乏施展平台。`);
    advices.push(`此格局需等待时机，或寻找能发挥能力的平台。`);
    advices.push(`事业发展宜寻找合作机会，忌单打独斗。`);
  } else if (pattern === '身弱无扶格') {
    advices.push(`身弱无比劫印绶，形成"身弱无扶格"，缺乏支持帮助，需自强不息。`);
    advices.push(`此格局需培养自身能力，寻找外部支持。`);
    advices.push(`事业发展宜稳扎稳打，积累实力，忌冒险激进。`);
  } else if (pattern === '财多身弱格') {
    advices.push(`财星多而日主弱，形成"财多身弱格"，富贵难担，需先强身。`);
    advices.push(`此格局需先增强自身能力，再图财富。`);
    advices.push(`事业发展宜先学技能，再求财富，忌盲目追求钱财。`);
  } else if (pattern === '官杀混杂格') {
    advices.push(`正官七杀俱现，形成"官杀混杂格"，事业多变，压力重重。`);
    advices.push(`此格局需分清主次，专一发展，忌三心二意。`);
    advices.push(`事业发展宜专注一个领域，忌频繁变换。`);
  } else if (pattern === '印绶过重格') {
    advices.push(`印绶过多，形成"印绶过重格"，依赖心重，缺乏决断。`);
    advices.push(`此格局需培养独立性，增强决断力。`);
    advices.push(`事业发展宜增强实践能力，忌纸上谈兵。`);
  } else if (pattern === '比劫夺财格') {
    advices.push(`比劫多而克财，形成"比劫夺财格"，易有财务纠纷，需注意理财。`);
    advices.push(`此格局需谨慎理财，避免合伙投资。`);
    advices.push(`事业发展宜独立经营，忌盲目合伙。`);
  }
  
  // 寒暖燥湿格局系列
  else if (pattern === '金寒水冷格') {
    advices.push(`金水过旺而寒，形成"金寒水冷格"，性格偏冷，需火来调候。`);
    advices.push(`此格局喜火来暖局，忌再加金水。`);
    advices.push(`事业发展宜从事需要热情活力的行业，忌过于冷静的行业。`);
  } else if (pattern === '火炎土燥格') {
    advices.push(`火土过旺而燥，形成"火炎土燥格"，性格急躁，需水来调候。`);
    advices.push(`此格局喜水来润局，忌再加火土。`);
    advices.push(`事业发展宜从事需要冷静智慧的行业，忌过于急躁的行业。`);
  } else if (pattern === '水木清华格') {
    advices.push(`水木清华，形成"水木清华格"，聪明仁慈，有艺术天赋。`);
    advices.push(`此格局喜水木相生，忌土来克水、金来克木。`);
    advices.push(`事业发展宜从事教育、文化、艺术等清雅行业。`);
  } else if (pattern === '土厚金埋格') {
    advices.push(`土重埋金，形成"土厚金埋格"，才华难显，需木来疏土。`);
    advices.push(`此格局喜木来疏土，忌再加土金。`);
    advices.push(`事业发展宜寻找能发挥才华的平台，忌埋没才能。`);
  }
  
  // 六亲格局系列
  else if (pattern === '财星得局格') {
    advices.push(`财星集中有力，形成"财星得局格"，财运亨通，善理财。`);
    advices.push(`此格局宜发挥理财能力，忌比劫争财。`);
    advices.push(`事业发展宜从事金融、贸易、销售等与钱财相关的行业。`);
  } else if (pattern === '官星得位格') {
    advices.push(`官星位置得当，形成"官星得位格"，有官运，事业顺利。`);
    advices.push(`此格局宜在体制内或大企业发展，忌伤官克官。`);
    advices.push(`事业发展宜从事管理、公务员、法律等权威性行业。`);
  } else if (pattern === '印星护身格') {
    advices.push(`印星贴身保护，形成"印星护身格"，有贵人扶持，学业顺利。`);
    advices.push(`此格局宜多学习，积累知识，忌财星坏印。`);
    advices.push(`事业发展宜从事教育、研究、文化等需要学识的行业。`);
  }
  
  // 流通格局
  else if (pattern === '五行流通格') {
    advices.push(`五行流通有情，形成"五行流通格"，运势平稳，适应力强。`);
    advices.push(`此格局各方面发展均衡，无明显短板。`);
    advices.push(`事业发展宜多元化发展，忌偏废某一方面。`);
  }
  
  // 特殊日柱格局
  else if (pattern === '六甲趋乾格') {
    advices.push(`甲子日柱，形成"六甲趋乾格"，有领导才能，智慧超群。`);
    advices.push(`此格局宜发挥领导才能，忌急躁冒进。`);
    advices.push(`事业发展宜从事管理、领导岗位。`);
  } else if (pattern === '日刃格' || pattern === '日禄格') {
    advices.push(`日坐刃禄，形成"${pattern}"，自我意识强，需注意人际关系。`);
    advices.push(`此格局宜发挥个人才能，忌过于自我。`);
    advices.push(`事业发展宜独立经营或发挥专业技能。`);
  } else if (pattern === '日贵格') {
    advices.push(`日坐贵人，形成"日贵格"，有贵人扶持，遇难呈祥。`);
    advices.push(`此格局宜多结交贵人，忌孤芳自赏。`);
    advices.push(`事业发展宜借助他人力量，忌单打独斗。`);
  } else if (pattern === '日德格') {
    advices.push(`乙卯日柱，形成"日德格"，仁慈有德，受人尊敬。`);
    advices.push(`此格局宜以德服人，忌失德行为。`);
    advices.push(`事业发展宜从事需要信誉的行业。`);
  }
  
  // 调候格局
  else if (pattern === '调候有力格') {
    advices.push(`调候用神有力，形成"调候有力格"，能改善命局不足。`);
    advices.push(`此格局宜坚持调候用神的调理，效果明显。`);
    advices.push(`事业发展宜根据调候用神选择行业和方向。`);
  }
  
  // 普通格局细分
  else if (pattern === '身强官旺格') {
    advices.push(`身强官旺，能担财官，事业有成。`);
    advices.push(`此格局宜积极进取，争取地位权力。`);
    advices.push(`事业发展宜在体制内或大企业发展。`);
  } else if (pattern === '身强财旺格') {
    advices.push(`身强财旺，能担财富，财运亨通。`);
    advices.push(`此格局宜积极求财，投资理财。`);
    advices.push(`事业发展宜从事与钱财相关的行业。`);
  } else if (pattern === '身强食伤格') {
    advices.push(`身强食伤旺，才华横溢，能创财富。`);
    advices.push(`此格局宜发挥才华创意，忌压抑才能。`);
    advices.push(`事业发展宜从事创意、技术、艺术等行业。`);
  } else if (pattern === '身弱印旺格') {
    advices.push(`身弱印旺，依赖心重，需增强独立性。`);
    advices.push(`此格局宜多学习，积累知识，忌过度依赖。`);
    advices.push(`事业发展宜从事需要学识的行业。`);
  } else if (pattern === '身弱比劫格') {
    advices.push(`身弱比劫帮身，需朋友帮助，忌孤独奋斗。`);
    advices.push(`此格局宜多交朋友，寻求合作，忌单打独斗。`);
    advices.push(`事业发展宜合作经营，忌独立冒险。`);
  }
  
  // 默认普通格局
  else {
    advices.push(`八字格局平和普通，五行能量相对均衡。`);
    advices.push(`人生轨迹较为平稳，需靠自身努力积累成就。`);
    advices.push(`注意保持心态平和，避免极端情绪影响判断。`);
  }
  
  advices.push(``); // 空行分隔
  
  // === 二、用神与喜神详细建议（分开说明）===
  advices.push(`【用神详解】`);
  if (yongShen.length > 0) {
    const yongShenText = yongShen.join('、');
    advices.push(`核心用神：${yongShenText}`);
    advices.push(`用神作用：补救命局之不足，增强日主能量或平衡五行。`);
    
    // 用神五行具体建议
    const yongShenAdvice: Record<string, string[]> = {
      '木': [
        '方位：东方、东南方',
        '颜色：绿色、青色',
        '行业：教育、文化、设计、园艺、木材',
        '行为：早晨运动、读书学习、种植植物',
        '数字：3、8',
        '季节：春季最有利'
      ],
      '火': [
        '方位：南方',
        '颜色：红色、紫色、橙色',
        '行业：能源、餐饮、传媒、科技、艺术',
        '行为：午间活动、社交聚会、学习新技术',
        '数字：2、7',
        '季节：夏季最有利'
      ],
      '土': [
        '方位：中央、东北、西南',
        '颜色：黄色、棕色、土色',
        '行业：房地产、建筑、农业、金融、咨询',
        '行为：整理家务、稳定作息、培养耐心',
        '数字：5、10',
        '季节：四季末月最有利'
      ],
      '金': [
        '方位：西方、西北',
        '颜色：白色、金色、银色',
        '行业：金融、法律、机械、珠宝、管理',
        '行为：傍晚散步、培养决断力、整理财务',
        '数字：4、9',
        '季节：秋季最有利'
      ],
      '水': [
        '方位：北方',
        '颜色：黑色、蓝色、灰色',
        '行业：物流、贸易、旅游、咨询、医疗',
        '行为：晚上思考、多喝水、学习沟通技巧',
        '数字：1、6',
        '季节：冬季最有利'
      ]
    };
    
    yongShen.forEach(element => {
      if (yongShenAdvice[element]) {
        advices.push(`${element}行用神具体调理：`);
        yongShenAdvice[element].forEach(item => advices.push(`  - ${item}`));
      }
    });
  } else {
    advices.push(`八字用神不明显，需综合调理五行平衡。`);
  }
  
  advices.push(``); // 空行分隔
  
  advices.push(`【喜神辅助】`);
  if (xiShen.length > 0) {
    const xiShenText = xiShen.join('、');
    advices.push(`辅助喜神：${xiShenText}`);
    advices.push(`喜神作用：辅助用神发挥作用，增强正面能量。`);
    advices.push(`喜神应用：可适度接触，但不要过度依赖。`);
    
    xiShen.forEach(element => {
      advices.push(`${element}行喜神可适当增强：`);
      switch(element) {
        case '木': advices.push(`  - 培养仁慈心，多行善事，接触自然`); break;
        case '火': advices.push(`  - 增强行动力，保持积极心态，适度表达`); break;
        case '土': advices.push(`  - 增强诚信，培养稳定性，注重实际`); break;
        case '金': advices.push(`  - 增强决断力，保持原则，培养纪律`); break;
        case '水': advices.push(`  - 增强智慧，灵活应变，培养沟通`); break;
      }
    });
  } else {
    advices.push(`喜神不明显，重点强化用神即可。`);
  }
  
  advices.push(``); // 空行分隔
  
  // === 三、忌神规避策略 ===
  advices.push(`【忌神规避】`);
  if (jiShen.length > 0) {
    const jiShenText = jiShen.join('、');
    advices.push(`主要忌神：${jiShenText}`);
    advices.push(`忌神影响：消耗日主能量，带来阻力与挑战。`);
    
    const jiShenAvoid: Record<string, string[]> = {
      '木': [
        '避免：过度竞争、急躁决策',
        '注意：肝胆健康、情绪波动',
        '减少：熬夜、过度劳累',
        '方位谨慎：东方'
      ],
      '火': [
        '避免：冲动行事、过度张扬',
        '注意：心脏健康、血压问题',
        '减少：辛辣食物、激烈运动',
        '方位谨慎：南方'
      ],
      '土': [
        '避免：固执己见、过度保守',
        '注意：脾胃健康、消化问题',
        '减少：甜食、油腻食物',
        '方位谨慎：中央、东北、西南'
      ],
      '金': [
        '避免：过度挑剔、言辞尖锐',
        '注意：呼吸道健康、皮肤问题',
        '减少：辛辣刺激、过度干燥',
        '方位谨慎：西方、西北'
      ],
      '水': [
        '避免：多变不定、缺乏坚持',
        '注意：肾脏健康、泌尿系统',
        '减少：寒凉食物、潮湿环境',
        '方位谨慎：北方'
      ]
    };
    
    jiShen.forEach(element => {
      if (jiShenAvoid[element]) {
        advices.push(`${element}行忌神需特别注意：`);
        jiShenAvoid[element].forEach(item => advices.push(`  - ${item}`));
      }
    });
  } else {
    advices.push(`忌神力量不强，但仍需注意五行平衡。`);
  }
  
  advices.push(``); // 空行分隔
  
  // === 四、十神分布与性格事业建议 ===
  if (tenGodDistribution) {
    advices.push(`【十神性格分析】`);
    
    // 找出最强的十神类别
    const strongestTenGod = Object.entries(tenGodDistribution)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (strongestTenGod && strongestTenGod[1] > 20) {
      const [category, percentage] = strongestTenGod;
      
      switch(category) {
        case '比劫':
          advices.push(`比劫旺（${percentage}%）：性格独立自主，重情重义，但需注意固执和自我中心。`);
          advices.push(`  事业建议：适合团队合作、创业、自由职业，需学习妥协与配合。`);
          break;
        case '印绶':
          advices.push(`印绶旺（${percentage}%）：聪明好学，有慈悲心，但可能依赖心重。`);
          advices.push(`  事业建议：适合教育、研究、咨询、文化行业，需增强实践能力。`);
          break;
        case '官杀':
          advices.push(`官杀旺（${percentage}%）：责任感强，有领导才能，但压力较大。`);
          advices.push(`  事业建议：适合管理、公务员、军警、法律行业，需注意情绪调节。`);
          break;
        case '财才':
          advices.push(`财才旺（${percentage}%）：理财能力强，重视物质，但可能过于现实。`);
          advices.push(`  事业建议：适合金融、贸易、销售、投资行业，需注意人际关系。`);
          break;
        case '食伤':
          advices.push(`食伤旺（${percentage}%）：才华横溢，创意丰富，但可能缺乏耐心。`);
          advices.push(`  事业建议：适合艺术、设计、演艺、技术行业，需增强执行力。`);
          break;
      }
    }
  }
  
  advices.push(``); // 空行分隔
  
  // === 五、调候用神专项建议 ===
  if (tiaoHouShen && tiaoHouShen.length > 0) {
    advices.push(`【调候用神】`);
    advices.push(`调候用神：${tiaoHouShen.join('、')}`);
    advices.push(`作用：平衡命局的寒暖燥湿，改善整体运势。`);
    advices.push(`建议：长期坚持调候用神的相关调理，效果会更明显。`);
    
    // 具体调候建议
    tiaoHouShen.forEach(stem => {
      const element = STEM_ELEMENTS[stem];
      switch(stem) {
        case '甲':
        case '乙':
          advices.push(`${stem}木调候：增强活力与生机，适合早晨锻炼，接触绿色植物。`);
          break;
        case '丙':
        case '丁':
          advices.push(`${stem}火调候：增加温暖与热情，适合午间活动，培养积极心态。`);
          break;
        case '戊':
        case '己':
          advices.push(`${stem}土调候：增强稳定与包容，适合家居整理，培养耐心。`);
          break;
        case '庚':
        case '辛':
          advices.push(`${stem}金调候：增加决断与清晰，适合傍晚思考，保持原则。`);
          break;
        case '壬':
        case '癸':
          advices.push(`${stem}水调候：增加智慧与灵活，适合晚上学习，培养沟通。`);
          break;
      }
    });
  }
  
  advices.push(``); // 空行分隔
  
  // === 六、空亡地支影响与化解 ===
  if (emptyBranches && emptyBranches.length > 0) {
    advices.push(`【空亡地支】`);
    advices.push(`空亡地支：${emptyBranches.join('、')}`);
    advices.push(`影响：能量减半，相关领域容易出现虚而不实的情况。`);
    advices.push(`化解建议：`);
    advices.push(`  1. 多接触与空亡地支相合的地支能量`);
    advices.push(`  2. 在相关领域采取保守策略`);
    advices.push(`  3. 用天干能量补足地支不足`);
    
    // 具体空亡地支建议
    emptyBranches.forEach(branch => {
      switch(branch) {
        case '子':
          advices.push(`子水空亡：注意泌尿系统健康，人际关系易有虚情假意。`);
          break;
        case '丑':
          advices.push(`丑土空亡：注意脾胃健康，财务上易有虚耗。`);
          break;
        case '寅':
        case '卯':
          advices.push(`${branch}木空亡：注意肝胆健康，事业发展易有阻碍。`);
          break;
        case '辰':
        case '戌':
        case '丑':
        case '未':
          advices.push(`${branch}土空亡：注意脾胃健康，稳定性较差。`);
          break;
        case '巳':
        case '午':
          advices.push(`${branch}火空亡：注意心脏健康，热情易退。`);
          break;
        case '申':
        case '酉':
          advices.push(`${branch}金空亡：注意呼吸系统健康，决断力不足。`);
          break;
        case '亥':
          advices.push(`亥水空亡：注意肾脏健康，智慧发挥受限。`);
          break;
      }
    });
  }
  
  advices.push(``); // 空行分隔
  
  // === 七、综合人生建议 ===
  advices.push(`【综合人生建议】`);
  
  if (strength === '身强') {
    advices.push(`1. 身强者宜"克泄耗"：主动迎接挑战，承担更多责任。`);
    advices.push(`2. 事业上可积极进取，但需注意刚愎自用。`);
    advices.push(`3. 财富管理：宜主动投资理财，但要避免盲目扩张。`);
    advices.push(`4. 人际关系：多帮助他人，但注意分寸，避免过度干涉。`);
  } else if (strength === '身弱') {
    advices.push(`1. 身弱者宜"生扶"：寻求合作支持，借力使力。`);
    advices.push(`2. 事业上宜稳扎稳打，积累实力，避免过度冒险。`);
    advices.push(`3. 财富管理：宜保守理财，注重储蓄，避免高风险投资。`);
    advices.push(`4. 人际关系：多结交贵人，学习他人长处。`);
  } else {
    advices.push(`1. 中和者宜"平衡"：保持中庸之道，避免极端。`);
    advices.push(`2. 事业上可多元发展，寻找最适合的领域。`);
    advices.push(`3. 财富管理：均衡投资，分散风险。`);
    advices.push(`4. 人际关系：保持和谐，广结善缘。`);
  }
  
  advices.push(`5. 健康建议：根据五行旺衰调整作息饮食`);
  advices.push(`6. 学习建议：针对命局不足补充相关知识技能`);
  advices.push(`7. 心态建议：保持平和，顺应命局特点发展`);
  advices.push(`8. 风水建议：根据用神选择适宜方位和颜色`);
  
  advices.push(``); // 空行分隔
  advices.push(`【提醒】以上建议仅供参考，实际运势还需结合大运流年具体分析。`);
  advices.push(`人生主动权始终在自己手中，八字只是了解自己的工具之一。`);
  
  return advices;
}

// 新增函数：分析多重格局组合
export function analyzeMultiplePatterns(analysis: BaziAnalysis): string[] {
  const patterns: string[] = [];
  
  // 主要格局（使用determineBaziPattern）
  const mainPattern = determineBaziPattern(analysis);
  patterns.push(mainPattern);
  
  // 辅助格局判断（可以同时存在的格局）
  const dmElement = analysis.dayMasterElement;
  const strength = analysis.strength;
  const tenGodDist = analysis.tenGodDistribution;
  
  // 1. 检查是否有特殊十神组合（即使不是主要格局）
  if (tenGodDist) {
    // 伤官见官
    if ((tenGodDist['食伤'] > 20 && tenGodDist['官杀'] > 20) ||
        (analysis.pillars?.year?.tenGod.includes('伤官') && analysis.pillars?.month?.tenGod.includes('正官'))) {
      patterns.push('伤官见官');
    }
    
    // 枭神夺食
    if (tenGodDist['印绶'] > 25 && tenGodDist['食伤'] > 20) {
      patterns.push('枭神夺食');
    }
    
    // 比劫争夫/争妻
    if (tenGodDist['比劫'] > 25 && tenGodDist['财才'] > 20) {
      patterns.push('比劫争财');
    }
  }
  
  // 2. 检查特殊神煞组合
  const emptyBranches = analysis.emptyBranches || [];
  if (emptyBranches.length > 0) {
    // 检查是否有重要的地支空亡
    const importantBranches = ['子', '午', '卯', '酉']; // 四桃花
    const hasImportantEmpty = importantBranches.some(branch => emptyBranches.includes(branch));
    if (hasImportantEmpty) {
      patterns.push('桃花空亡');
    }
    
    // 驿马空亡
    const horseBranches = ['寅', '申', '巳', '亥']; // 四驿马
    const hasHorseEmpty = horseBranches.some(branch => emptyBranches.includes(branch));
    if (hasHorseEmpty) {
      patterns.push('驿马空亡');
    }
  }
  
  // 3. 检查五行特殊组合
  const elementEnergy = analysis.elementEnergy;
  if (elementEnergy) {
    // 金木交战
    if (elementEnergy.metal > 25 && elementEnergy.wood > 25) {
      patterns.push('金木交战');
    }
    
    // 水火交战
    if (elementEnergy.water > 25 && elementEnergy.fire > 25) {
      patterns.push('水火交战');
    }
    
    // 木土交战
    if (elementEnergy.wood > 25 && elementEnergy.earth > 25) {
      patterns.push('木土交战');
    }
    
    // 火金交战
    if (elementEnergy.fire > 25 && elementEnergy.metal > 25) {
      patterns.push('火金交战');
    }
  }
  
  // 4. 检查月令特殊组合
  const monthBranch = analysis.pillars?.month?.sb?.branch || '';
  const dayBranch = analysis.pillars?.day?.sb?.branch || '';
  
  // 月日相同
  if (monthBranch === dayBranch) {
    patterns.push('月日同支');
  }
  
  // 月日相冲
  const clashes: Record<string, string> = {
    '子': '午', '午': '子',
    '丑': '未', '未': '丑',
    '寅': '申', '申': '寅',
    '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰',
    '巳': '亥', '亥': '巳'
  };
  
  if (clashes[monthBranch] === dayBranch) {
    patterns.push('月日相冲');
  }
  
  // 月日相合
  const combinations: Record<string, string> = {
    '子': '丑', '丑': '子',
    '寅': '亥', '亥': '寅',
    '卯': '戌', '戌': '卯',
    '辰': '酉', '酉': '辰',
    '巳': '申', '申': '巳',
    '午': '未', '未': '午'
  };
  
  if (combinations[monthBranch] === dayBranch) {
    patterns.push('月日相合');
  }
  
  // 去除重复
  return [...new Set(patterns)];
}

// 新增函数：生成格局综合建议
export function generatePatternCombinedAdvice(patterns: string[]): string[] {
  const advices: string[] = [];
  
  advices.push(`【格局组合分析】`);
  advices.push(`主要格局：${patterns[0]}`);
  
  if (patterns.length > 1) {
    advices.push(`辅助格局：${patterns.slice(1).join('、')}`);
  }
  
  // 针对不同格局组合给出建议
  if (patterns.includes('伤官见官')) {
    advices.push(``);
    advices.push(`【伤官见官格局建议】`);
    advices.push(`伤官见官，易有口舌是非，需注意言行。`);
    advices.push(`事业发展宜发挥才华，但需遵守规则。`);
    advices.push(`人际关系需谨慎处理，避免冲突。`);
  }
  
  if (patterns.includes('枭神夺食')) {
    advices.push(``);
    advices.push(`【枭神夺食格局建议】`);
    advices.push(`枭神夺食，才华易受压制，需寻找发挥空间。`);
    advices.push(`注意饮食健康，易有消化问题。`);
    advices.push(`事业发展需突破限制，寻找新方向。`);
  }
  
  if (patterns.includes('金木交战')) {
    advices.push(``);
    advices.push(`【金木交战格局建议】`);
    advices.push(`金木交战，易有冲突矛盾，需注意情绪管理。`);
    advices.push(`注意肝胆健康和筋骨问题。`);
    advices.push(`事业发展需调和矛盾，寻找平衡点。`);
  }
  
  if (patterns.includes('水火交战')) {
    advices.push(``);
    advices.push(`【水火交战格局建议】`);
    advices.push(`水火交战，情绪易波动，需保持心态平和。`);
    advices.push(`注意心脏和肾脏健康。`);
    advices.push(`事业发展需冷静应对，避免冲动决策。`);
  }
  
  if (patterns.includes('桃花空亡')) {
    advices.push(``);
    advices.push(`【桃花空亡格局建议】`);
    advices.push(`桃花空亡，感情易有虚而不实的情况。`);
    advices.push(`需用心经营感情，避免表面关系。`);
    advices.push(`人际关系需真诚相待，忌虚伪应付。`);
  }
  
  if (patterns.includes('驿马空亡')) {
    advices.push(``);
    advices.push(`【驿马空亡格局建议】`);
    advices.push(`驿马空亡，外出发展易遇阻碍。`);
    advices.push(`需做好充分准备再外出发展。`);
    advices.push(`旅行出行需注意安全，做好预案。`);
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
  
  // 获取多重格局分析
  const multiplePatterns = analyzeMultiplePatterns(safeAnalysis);
  
  // 生成主要格局建议
  const patternAdvice = generatePatternAdvice(
    pattern, 
    safeAnalysis.yongShen, 
    safeAnalysis.xiShen, 
    safeAnalysis.jiShen,
    safeAnalysis.dayMasterElement,
    strength,
    safeAnalysis.tenGodDistribution,
    safeAnalysis.elementEnergy,
    safeAnalysis.energyState,
    safeAnalysis.tiaoHouShen,
    safeAnalysis.emptyBranches
  );
  
  // 生成多重格局组合建议
  const combinedAdvice = generatePatternCombinedAdvice(multiplePatterns);
  
  // 合并建议
  const advice = [...combinedAdvice, ...patternAdvice,];
  
  return {
    dayMaster: safeAnalysis.dayMaster,
    dayMasterElement: safeAnalysis.dayMasterElement,
    strength,
    pattern: multiplePatterns.join('、'), // 返回所有格局
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