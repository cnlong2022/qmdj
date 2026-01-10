export interface StemBranch {
  stem: string;
  branch: string;
}

export interface QiMenParams {
  yearSB: StemBranch;
  monthSB: StemBranch;
  daySB: StemBranch;
  hourSB: StemBranch;
  solarTerm: string;
  dunJu: string;
  isYang: boolean;
  juNum: number;
}

export interface PalaceData {
  id: number;
  name: string;
  elements: {
    god: string;
    star: string;
    gate: string;
    tianPan: string;
    diPan: string;
    hiddenStem?: string;
    isEmpty?: boolean;
    isHorse?: boolean;
    status: string;
  };
}

export interface PillarDetail {
  sb: StemBranch;
  tenGod: string; // 用于上方显示
  hiddenStems: string[];
  // Added optional isEmpty to track void branches in Bazi calculation
  isEmpty?: boolean;
}

// 五行能量类型
export type ElementEnergy = {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
};

// 十神分布类型
export type TenGodDistribution = {
  '比劫': number;
  '印绶': number;
  '官杀': number;
  '财才': number;
  '食伤': number;
  [key: string]: number; // 索引签名，允许其他字符串键
};

// 旺相休囚死状态类型
export type EnergyState = {
  '木': string;
  '火': string;
  '土': string;
  '金': string;
  '水': string;
  [key: string]: string; // 索引签名，允许其他字符串键
};

// 五行能量百分比类型
export type ElementEnergyPercent = {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
};

// 五行得分详细分解
export interface ElementScoreBreakdown {
  rawStemScore: number;      // 天干原始得分
  rawBranchScore: number;    // 地支原始得分
  rawHiddenScore: number;    // 藏干原始得分
  emptyFactor: number;       // 空亡系数
  state: string;            // 旺相休囚死状态
  coefficient: number;      // 旺相休囚死系数
  rawTotal: number;         // 原始总分（未应用系数）
  adjustedScore: number;    // 调整后得分（应用系数后）
  pillars?: {
    year: { stem: string; branch: string; score: number };
    month: { stem: string; branch: string; score: number };
    day: { stem: string; branch: string; score: number };
    hour: { stem: string; branch: string; score: number };
  };
  hiddenStems?: Array<{ stem: string; branch: string; score: number }>;
}

// 五行得分详情
export interface ElementScoreDetails {
  name: string;
  value: number;
  breakdown: ElementScoreBreakdown;
}

// 八字核心分析结果
export interface BaziCoreResult {
  dayMaster: string;
  dayMasterElement: string;
  strength: '身强' | '身弱' | '中和';
  pattern: string;
  yongShen: string[]; // ✅ 统一为数组
  xiShen: string[];
  jiShen: string[];
  elementEnergy?: Record<string, number>;
  advice?: string[]; // ✅ 添加可选建议字段
}

// 刑冲合害组合类型
export interface CombinationEffect {
  combo: string;
  targetElement: string;
  ratio: number;
}

export interface PillarContribution {
  pillar: string; // '年柱' | '月柱' | '日柱' | '时柱'
  stem: string;
  branch: string;
  stemScore: number;
  hiddenScores: Array<{
    stem: string;
    score: number;
    element: string;
    isEmpty: boolean;
  }>;
  totalScore: number;
}

// 月令权重配置
export interface MonthWeightConfig {
  baseWeight: number;
  isDominant: boolean;
  termAdjustment?: number;
}

// 地支藏干详情
export interface HiddenStemDetail {
  stem: string;
  weight: number;
  tenGod?: string;
}

// 通根强度计算结果
export interface RootStrengthResult {
  hasRoot: boolean;
  strength: number;
  hiddenStems: HiddenStemDetail[];
}

// 八字可视化数据
export interface BaziChartData {
  pillar: string;
  stem: {
    value: string;
    element: string;
    tenGod: string;
    empty?: boolean;
  };
  branch: {
    value: string;
    hiddenStems: Array<{
      stem: string;
      element: string;
      tenGod: string;
    }>;
    empty?: boolean;
  };
  score?: any;
}

export interface BaziSummary {
  dayMaster: string;
  dayMasterElement: string;
  strength: '身强' | '身弱' | '中和';
  yongShen: string[];
  xiShen: string[];
  jiShen: string[];
  tiaoHouShen: string[];
  emptyBranches: string[];
  energyState: EnergyState;
  elementEnergy: ElementEnergyPercent;
  tenGodDistribution: TenGodDistribution;
}

export interface BaziVisualizationData {
  chartData: BaziChartData[];
  summary: BaziSummary;
  elementBarChart: Array<{
    element: string;
    value: number;
    state: string;
    breakdown: any;
  }>;
  tenGodBarChart: Array<{
    category: string;
    value: number;
  }>;
}

// 单个柱子的格式化数据
export interface FormattedPillar {
  stem: string;
  branch: string;
  tenGod: string;
  hiddenStems: string[];
  isEmpty: boolean;
  isDayMaster: boolean;
}

export interface BaziAnalysis {
  // 五行数量（原始计分）
  elementCounts: ElementEnergy;
  
  // 五行能量百分比（新增）
  elementEnergy: ElementEnergyPercent;
  
  // 十神分布百分比（新增）
  tenGodDistribution: TenGodDistribution;
  
  // 旺相休囚死状态（新增）
  energyState: EnergyState;
  
  strength: '身强' | '身弱' | '中和';
  xiShen: string[]; 
  yongShen: string[]; 
  jiShen: string[];
  
  pillars: {
    year: PillarDetail;
    month: PillarDetail;
    day: PillarDetail;
    hour: PillarDetail;
  };
  
  dayMaster: string;
  dayMasterElement: string;
  
  // 调候用神
  tiaoHouShen: string[];
  
  // 空亡地支
  emptyBranches: string[];
  
  // 五行得分详情（新增）
  elementScoreDetails?: Record<string, ElementScoreDetails>;
}

export interface PersonalInfo {
  name: string;
  gender: '男' | '女';
  solarDate: string;
  lunarDate: string;
  bazi: string;
  analysis: BaziAnalysis;
}

export interface ChartResult {
  params: QiMenParams;
  palaces: PalaceData[];
  zhiFu: string;
  zhiShi: string;
  xunShou: string;
  personalInfo?: PersonalInfo;
}

export interface AnalysisResponse {
  useGod: string;
  strength: string;
  pattern: string;
  judgment: string;
  suggestion: string;
}

// 八字格局分析结果（包含建议）
export interface BaziPatternAnalysis extends BaziCoreResult {
  advice?: string[];
}

// 五行得分摘要
export interface ElementScoreSummary {
  total: number;
  percentages: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  sortedByValue: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

// 地支藏干配置
export interface BranchHiddenConfig {
  branch: string;
  hiddenStems: Array<{
    stem: string;
    score: number;
    element: string;
  }>;
}

// 天干配置
export interface StemConfig {
  stem: string;
  element: string;
  polarity: '阳' | '阴';
}

// 五行关系配置
export interface ElementRelationConfig {
  element: string;
  sheng: string;      // 生
  ke: string;         // 克
  wasSheng: string;   // 被生
  wasKe: string;      // 被克
}