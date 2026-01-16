// constants.ts
export const STEM_ELEMENTS: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', 
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
};

export const STEM_POLARITY: Record<string, '阳' | '阴'> = {
  '甲': '阳', '丙': '阳', '戊': '阳', '庚': '阳', '壬': '阳',
  '乙': '阴', '丁': '阴', '己': '阴', '辛': '阴', '癸': '阴'
};

export const BRANCH_ELEMENTS: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
};

// 地支藏干比例
export const BRANCH_HIDDEN_SCORES: Record<string, Array<{stem: string, score: number}>> = {
  '子': [{ stem: '癸', score: 100 }],
  '丑': [{ stem: '己', score: 60 }, { stem: '癸', score: 30 }, { stem: '辛', score: 10 }],
  '寅': [{ stem: '甲', score: 60 }, { stem: '丙', score: 30 }, { stem: '戊', score: 10 }],
  '卯': [{ stem: '乙', score: 100 }],
  '辰': [{ stem: '戊', score: 60 }, { stem: '乙', score: 30 }, { stem: '癸', score: 10 }],
  '巳': [{ stem: '丙', score: 60 }, { stem: '戊', score: 30 }, { stem: '庚', score: 10 }],
  '午': [{ stem: '丁', score: 70 }, { stem: '己', score: 30 }],
  '未': [{ stem: '己', score: 60 }, { stem: '丁', score: 30 }, { stem: '乙', score: 10 }],
  '申': [{ stem: '庚', score: 60 }, { stem: '壬', score: 30 }, { stem: '戊', score: 10 }],
  '酉': [{ stem: '辛', score: 100 }],
  '戌': [{ stem: '戊', score: 60 }, { stem: '辛', score: 30 }, { stem: '丁', score: 10 }],
  '亥': [{ stem: '壬', score: 70 }, { stem: '甲', score: 30 }]
};

// 五行生克关系
export const ELEMENT_RELATIONS: Record<string, { sheng: string, ke: string, wasSheng: string, wasKe: string }> = {
  '木': { sheng: '火', ke: '土', wasSheng: '水', wasKe: '金' },
  '火': { sheng: '土', ke: '金', wasSheng: '木', wasKe: '水' },
  '土': { sheng: '金', ke: '水', wasSheng: '火', wasKe: '木' },
  '金': { sheng: '水', ke: '木', wasSheng: '土', wasKe: '火' },
  '水': { sheng: '木', ke: '火', wasSheng: '金', wasKe: '土' }
};

// 地支冲合关系
export const BRANCH_CLASHES: Record<string, string> = {
  '子': '午', '午': '子',
  '丑': '未', '未': '丑',
  '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰',
  '巳': '亥', '亥': '巳'
};

export const BRANCH_COMBINATIONS: Record<string, string> = {
  '子': '丑', '丑': '子',
  '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳',
  '午': '未', '未': '午'
};

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 天干到键的映射
export const ELEMENT_TO_KEY: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  '木': 'wood',
  '火': 'fire', 
  '土': 'earth',
  '金': 'metal',
  '水': 'water'
};

// 键到中文的映射
export const KEY_TO_CHINESE: Record<'wood' | 'fire' | 'earth' | 'metal' | 'water', string> = {
  'wood': '木',
  'fire': '火',
  'earth': '土',
  'metal': '金',
  'water': '水'
};

export const PALACE_NAMES = {
  1: "坎一宫", 2: "坤二宫", 3: "震三宫", 4: "巽四宫", 
  5: "中五宫", 6: "乾六宫", 7: "兑七宫", 8: "艮八宫", 9: "离九宫"
};

export const EIGHT_GODS_YANG = ["值符", "螣蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"];
export const EIGHT_GODS_YIN = ["值符", "九天", "九地", "玄武", "白虎", "六合", "太阴", "螣蛇"];

export const NINE_STARS = {
  1: "天蓬", 2: "天芮", 3: "天冲", 4: "天辅", 
  5: "天禽", 6: "天心", 7: "天柱", 8: "天任", 9: "天英"
};

export const EIGHT_GATES = {
  1: "休门", 2: "死门", 3: "伤门", 4: "杜门", 
  6: "开门", 7: "惊门", 8: "生门", 9: "景门"
};

// Lo Shu Path for Stems: 戊, 己, 庚, 辛, 壬, 癸, 丁, 丙, 乙
export const STEM_ORDER = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"];

export const LOSHU_SQUARE = [4, 9, 2, 3, 5, 7, 8, 1, 6];

export const SOLAR_TERMS = [
  "冬至", "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种",
  "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪"
];

// Simplified mapping for Solar Term to Dun Ju (遁局)
// In a real pro app, this would use the precise Chai Bu logic.
export const TERM_DUN_MAP: Record<string, { type: '阳' | '阴', yuan: number[] }> = {
  // 阳遁节气
  "冬至": { type: '阳', yuan: [1, 7, 4] },
  "小寒": { type: '阳', yuan: [2, 8, 5] },
  "大寒": { type: '阳', yuan: [3, 9, 6] },
  "立春": { type: '阳', yuan: [8, 5, 2] },
  "雨水": { type: '阳', yuan: [9, 6, 3] },
  "惊蛰": { type: '阳', yuan: [1, 7, 4] },
  "春分": { type: '阳', yuan: [3, 9, 6] },
  "清明": { type: '阳', yuan: [4, 1, 7] },
  "谷雨": { type: '阳', yuan: [5, 2, 8] },
  "立夏": { type: '阳', yuan: [4, 1, 7] },
  "小满": { type: '阳', yuan: [5, 2, 8] },
  "芒种": { type: '阳', yuan: [6, 3, 9] },
  
  // 阴遁节气
  "夏至": { type: '阴', yuan: [9, 3, 6] },
  "小暑": { type: '阴', yuan: [8, 2, 5] },
  "大暑": { type: '阴', yuan: [7, 1, 4] },
  "立秋": { type: '阴', yuan: [2, 5, 8] },
  "处暑": { type: '阴', yuan: [1, 4, 7] },
  "白露": { type: '阴', yuan: [9, 3, 6] },
  "秋分": { type: '阴', yuan: [7, 1, 4] },
  "寒露": { type: '阴', yuan: [6, 9, 3] },
  "霜降": { type: '阴', yuan: [5, 8, 2] },
  "立冬": { type: '阴', yuan: [6, 9, 3] },
  "小雪": { type: '阴', yuan: [5, 8, 2] },
  "大雪": { type: '阴', yuan: [4, 7, 1] },
  
  // 默认值
  "未知": { type: '阳', yuan: [1, 7, 4] }
};
