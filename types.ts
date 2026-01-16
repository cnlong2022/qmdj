// types.ts - 奇门遁甲系统类型定义

// 基础类型
export interface StemBranch {
  stem: string;
  branch: string;
}

export interface PillarDetail {
  sb: StemBranch;
  tenGod: string;
  hiddenStems: string[];
  isEmpty: boolean;
}

// 大运流年相关类型
export interface DaYunItem {
  decade: string;          // 如 "3-12岁"
  ageRange: string;        // 如 "3-12岁"
  pillar: StemBranch;      // 大运干支
  tenGod?: string;         // 大运对应的十神
  isCurrent: boolean;      // 是否当前大运
}

export interface LiuNianItem {
  year: number;            // 年份
  age: number;             // 虚岁年龄
  stemBranch: StemBranch;  // 流年干支
  tenGod?: string;         // 流年对应的十神
  special?: string;        // 特殊标记（如本命年）
  clash?: string;          // 冲克信息
}

export interface YunNianResult {
  daYun: DaYunItem[];      // 大运列表
  liuNian: LiuNianItem[];  // 流年列表
  qiYunAge: number;        // 起运年龄
  qiYunDate: string;       // 起运日期
  direction: '顺' | '逆';   // 顺排/逆排
}

// 八字分析类型
export interface BaziAnalysis {
  elementCounts: { 
    wood: number; 
    fire: number; 
    earth: number; 
    metal: number; 
    water: number 
  };
  elementEnergy: { 
    wood: number; 
    fire: number; 
    earth: number; 
    metal: number; 
    water: number 
  };
  tenGodDistribution: Record<'比劫' | '印绶' | '官杀' | '财才' | '食伤', number>;
  energyState: Record<'木' | '火' | '土' | '金' | '水', string>;
  strength: '身强' | '身弱' | '中和' | '未知';
  yongShen: string[];
  xiShen: string[];
  jiShen: string[];
  tiaoHouShen: string[];
  emptyBranches: string[];
  pillars: {
    year: PillarDetail;
    month: PillarDetail;
    day: PillarDetail;
    hour: PillarDetail;
  };
  dayMaster: string;
  dayMasterElement: string;
  yunNian: YunNianResult | null;
  elementScoreDetails?: Record<string, any>;
}

// 个人信息
export interface PersonalInfo {
  name: string;
  gender: '男' | '女';
  solarDate: string;
  lunarDate: string;
  bazi: string;
  analysis: BaziAnalysis;
  termInfo?: {
    current: string;
    currentDate: string;
    next: string | null;
    nextDate: string | null;
    daysToNext: number | null;
    hoursToNext: number | null;
    minutesToNext: number | null;
    isTransition: boolean;
  };
  emptyBranches?: string[];
  maBranches?: string[];
  palaceBranches?: Record<number, string[]>;
}

// 奇门排盘相关类型
export interface PalaceElements {
  god: string;     // 八神
  star: string;    // 九星
  gate: string;    // 八门
  tianPan: string; // 天盘干
  diPan: string;   // 地盘干
  status: string;  // 状态
}

export interface PalaceData {
  id: number;
  name: string;
  elements: PalaceElements;
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
  yuan: string;
  termType: string;
  daysSinceTerm: number;
  hoursSinceTerm: number;
  isExact: boolean;
  verification: any;
  type?: '阳' | '阴';
}

export interface ChartResult {
  params: QiMenParams;
  palaces: PalaceData[];
  zhiFu: string;
  zhiShi: string;
  xunShou: string;
  personalInfo: PersonalInfo;
  isFallback?: boolean;
  error?: string;
  debugInfo?: {
    starMapping: Record<number, string>;
    gateMapping: Record<number, string>;
    godMapping: Record<number, string>;
    tianPan: Record<number, string>;
    diPan: Record<number, string>;
    dunJuResult: any;
    pillars: any;
    baziPillars: any;
  };
}

// 历史记录类型
export interface HistoryItem {
  id: string;
  timestamp: number;
  userName: string;
  question: string;
  eventDate: string;
  birthDate: string;
  gender: '男' | '女';
  chart: ChartResult;
  analysis: string;
}

// 引导提问相关类型
export interface GuideData {
  category: string;
  area: string;
  situation: string;
  pastExperience: string;
  expectation: string;
  timeframe: string;
  details: string;
}

// 八字可视化相关类型 - 使用别名避免重复定义
export type ElementScoreDetail = {
  name: string;
  value: number;
  breakdown: {
    rawStemScore: number;
    rawBranchScore: number;
    rawHiddenScore: number;
    emptyFactor: number;
    state: string;
    coefficient: number;
    rawTotal: number;
    adjustedScore: number;
    pillars: Record<string, { stem: string; branch: string; score: number }>;
    hiddenStems: Array<{ stem: string; branch: string; score: number }>;
  };
};

export type ElementScores = Record<string, ElementScoreDetail>;

export type ElementTotal = {
  name: string;
  value: number;
  percentage: number;
};

export type TenGodBarItem = {
  category: string;
  value: number;
};

// 格式化柱子显示类型
export type FormattedPillar = {
  stem: string;
  branch: string;
  tenGod: string;
  hiddenStems: string[];
  isEmpty: boolean;
  isDayMaster: boolean;
};

// 遁局结果类型（与 qiMenTermService.ts 同步）
export type DunJuResult = {
  type: '阳' | '阴';
  ju: number;
  yuan: '上元' | '中元' | '下元';
  termName: string;
  termDate: Date;
  daysSinceTerm: number;
  hoursSinceTerm: number;
  minutesSinceTerm: number;
  secondsSinceTerm: number;
  totalHoursSinceTerm: number;
  termType: '节' | '气';  // 确保这里是 '节' | '气'，不是 string
  isExact: boolean;
  verification: {
    status: '精确' | '近似' | '错误';
    message: string;
  };
};

// 节气信息类型
export type SolarTermInfo = {
  name: string;
  date: Date;
};