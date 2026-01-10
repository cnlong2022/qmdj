import { STEM_ELEMENTS, KEY_TO_CHINESE, BRANCH_HIDDEN_SCORES, ELEMENT_TO_KEY, STEMS} from '../constants';
import { 
  BaziAnalysis, 
  BaziChartData, 
  BaziSummary, 
  BaziVisualizationData, 
  FormattedPillar,
  ElementScoreBreakdown 
} from '../types';

/**
 * 构建排盘数据结构，便于可视化
 */
export function buildBaziChart(analysis: BaziAnalysis): { chartData: BaziChartData[], summary: BaziSummary } {
  const pillars = ['year', 'month', 'day', 'hour'] as const;
  
  const chartData: BaziChartData[] = pillars.map(pillarKey => {
    const p = analysis.pillars[pillarKey];
    const stemEl = STEM_ELEMENTS[p.sb.stem];
    const hidden = BRANCH_HIDDEN_SCORES[p.sb.branch] || [];

    // 修复：将中文五行转换为英文键名
    const elementKey = ELEMENT_TO_KEY[stemEl];
    const score = elementKey && analysis.elementScoreDetails ? 
      analysis.elementScoreDetails[elementKey] : 
      undefined;

    return {
      pillar: pillarKey,
      stem: {
        value: p.sb.stem,
        element: stemEl,
        tenGod: p.tenGod,
        empty: p.isEmpty,
      },
      branch: {
        value: p.sb.branch,
        hiddenStems: hidden.map(h => ({
          stem: h.stem,
          element: STEM_ELEMENTS[h.stem],
          tenGod: analysis.dayMaster === p.sb.stem ? '日主' : p.tenGod
        })),
        empty: p.isEmpty
      },
      score: score  // 使用修复后的score
    };
  });

  // 构建喜用神 / 调候 / 身强身弱信息
  const summary: BaziSummary = {
    dayMaster: analysis.dayMaster,
    dayMasterElement: analysis.dayMasterElement,
    strength: analysis.strength,
    yongShen: analysis.yongShen,
    xiShen: analysis.xiShen,
    jiShen: analysis.jiShen,
    tiaoHouShen: analysis.tiaoHouShen,
    emptyBranches: analysis.emptyBranches,
    energyState: analysis.energyState,
    elementEnergy: analysis.elementEnergy,
    tenGodDistribution: analysis.tenGodDistribution
  };

  return { chartData, summary };
}

/**
 * 构建前端可视化柱图数据
 */
export function buildBaziBarChartData(analysis: BaziAnalysis) {
  const elementKeys = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
  const tenGodKeys = ['比劫', '印绶', '官杀', '财才', '食伤'] as const;

  const elementBar = elementKeys.map(k => ({
    element: KEY_TO_CHINESE[k],
    value: analysis.elementEnergy[k],
    state: analysis.energyState[KEY_TO_CHINESE[k]],
    breakdown: analysis.elementScoreDetails ? analysis.elementScoreDetails[k] : undefined
  }));

  const tenGodBar = tenGodKeys.map(k => ({
    category: k,
    value: analysis.tenGodDistribution[k]
  }));

  return { elementBar, tenGodBar };
}

/**
 * 可直接生成前端柱状图 + 表格数据
 */
export function buildBaziVisualizationData(analysis: BaziAnalysis): BaziVisualizationData {
  const chart = buildBaziChart(analysis);
  const barChart = buildBaziBarChartData(analysis);

  return {
    chartData: chart.chartData,
    summary: chart.summary,
    elementBarChart: barChart.elementBar,
    tenGodBarChart: barChart.tenGodBar
  };
}

/**
 * 构建单柱显示（含日主标记和空亡标记）
 */
export function formatSinglePillar(p: any, dayMaster: string): FormattedPillar {
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
 * 格式化单个柱子的贡献详情
 */
export function formatPillarContribution(
  pillar: any, 
  pillarName: string, 
  emptyBranches: string[] = []
): {
  pillar: string;
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
} {
  const stemScore = 100;
  const hiddenDetails = (BRANCH_HIDDEN_SCORES[pillar.sb.branch] || []).map(h => {
    const isEmpty = emptyBranches.includes(pillar.sb.branch);
    const adjustedScore = isEmpty ? h.score / 2 : h.score;
    
    return {
      stem: h.stem,
      score: adjustedScore,
      element: STEM_ELEMENTS[h.stem],
      isEmpty
    };
  });
  
  const totalScore = stemScore + hiddenDetails.reduce((sum, h) => sum + h.score, 0);
  
  return {
    pillar: pillarName,
    stem: pillar.sb.stem,
    branch: pillar.sb.branch,
    stemScore,
    hiddenScores: hiddenDetails,
    totalScore
  };
}

/**
 * 计算五行总得分和百分比
 */
export function calculateElementTotals(scoreDetails: Record<string, any>) {
  const total = Object.values(scoreDetails).reduce((sum: number, el: any) => sum + el.value, 0);
  
  const percentages = Object.values(scoreDetails).map((element: any) => {
    const percentage = total > 0 ? (element.value / total * 100) : 0;
    return {
      name: element.name,
      value: element.value,
      percentage: percentage
    };
  });
  
  return {
    total,
    percentages,
    sortedByValue: [...percentages].sort((a, b) => b.value - a.value)
  };
}

/**
 * 生成五行生克关系说明
 */
export function generateElementRelationsText(
  dayMasterElement: string, 
  strength: string, 
  yongShen: string[], 
  xiShen: string[], 
  jiShen: string[],
  percentages: Array<{name: string, percentage: number}>
): string {
  const mainElements = percentages.map(p => `${p.name}(${p.percentage.toFixed(1)}%)`).join('，');
  
  return `日主为${dayMasterElement}命（${strength}）。用神：${yongShen.join('、')}；喜神：${xiShen.join('、')}；忌神：${jiShen.join('、')}。五行得分分布：${mainElements}`;
}