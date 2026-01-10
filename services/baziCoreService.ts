import { analyzeBaziCore, determineDayMasterStrength, determineBaziPattern, generatePatternAdvice } from './analysisService';
import { STEM_ELEMENTS, ELEMENT_RELATIONS, STEM_POLARITY, BRANCH_ELEMENTS } from '../constants';
import { BaziAnalysis, PillarDetail, BaziCoreResult } from '../types';

// 删除重复的函数，直接导出中心化服务
export { 
  analyzeBaziCore, 
  determineDayMasterStrength, 
  determineBaziPattern, 
  generatePatternAdvice 
} from './analysisService';

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

/**
 * 完整的八字分析接口（带建议）
 */
export function analyzeBaziWithAdvice(pillars: PillarDetail[], dayMaster: string): BaziCoreResult & { advice: string[] } {
  const dayMasterElement = STEM_ELEMENTS[dayMaster];
  
  // 这里简化处理，实际应用中应该调用完整的分析流程
  const tempAnalysis: Partial<BaziAnalysis> = {
    dayMaster,
    dayMasterElement,
    pillars: {
      year: pillars[0],
      month: pillars[1],
      day: pillars[2],
      hour: pillars[3]
    },
    elementEnergy: calculateElementEnergyFromPillars(pillars) as any,
    yongShen: [],
    xiShen: [],
    jiShen: [],
    strength: '中和'
  } as any;
  
  const fullAnalysis: BaziAnalysis = {
    ...tempAnalysis as BaziAnalysis,
    elementCounts: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    tenGodDistribution: { '比劫': 0, '印绶': 0, '官杀': 0, '财才': 0, '食伤': 0 },
    energyState: { '木': '', '火': '', '土': '', '金': '', '水': '' },
    tiaoHouShen: [],
    emptyBranches: [],
    elementScoreDetails: undefined
  };
  
  return analyzeBaziCore(fullAnalysis);
}