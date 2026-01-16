// App.tsx - 第一部分：导入和状态声明
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Calendar, MessageSquare, Compass, Send, Loader2, Info, User, Clock, 
  Shield, Sparkles, Database, ChevronDown, ChevronUp, AlertCircle,
  History, Save, Download, ImageIcon, Trash2, X, Share2,
  HelpCircle, ArrowRight, CheckCircle, Lightbulb, Target, Clock as ClockIcon,
  AlertTriangle, TrendingUp, Users, Heart, Brain, DollarSign,
  Home, Briefcase, GraduationCap, Coffee
} from 'lucide-react';
import { marked } from 'marked';
import html2canvas from 'html2canvas';
import QiMenChart from './components/QiMenChart';
import { plotChart, getTenGodLabel, } from './services/qiMenEngine';
import { analyzeQiMen } from './services/geminiService';
import { loadSolarTermsFromFile } from './services/solarTermParser';
import { analyzeBaziCore } from './services/analysisService';
import { 
  getAllHistory, saveHistory, deleteHistory 
} from './services/storageService';
import { 
  buildBaziVisualizationData,
  calculateElementTotals,
  generateElementRelationsText,
  formatPillarContribution
} from './services/baziVisualization';
import { 
  ChartResult, PillarDetail, StemBranch, 
  QiMenParams, PalaceData, BaziAnalysis, PersonalInfo, HistoryItem,
  DunJuResult, SolarTermInfo  // 添加这两个类型
} from './types';
import { 
  STEM_ELEMENTS, 
  STEM_POLARITY, 
  BRANCH_ELEMENTS, 
  BRANCH_HIDDEN_SCORES, 
  ELEMENT_TO_KEY,
  KEY_TO_CHINESE
} from './constants';


function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 格式化函数
const formatGregorianTime = (dateStr: string): string => {
  try {
    const date = parseAsBeijing(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日${hours}点${minutes}分`;
  } catch (error) {
    return '日期格式错误';
  }
};

// 格式化显示日期（简化显示）
const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '未知';
  try {
    const date = new Date(dateStr);
    // 如果包含时间部分
    if (dateStr.includes('T')) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${date.getMonth() + 1}/${date.getDate()} ${hours}:${minutes}`;
    }
    // 只有日期部分
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch {
    return '格式错误';
  }
};

const parseAsBeijing = (dateStr: string) => {
  if (!dateStr) return new Date();
  try {
    const date = new Date(dateStr + '+08:00');
    if (isNaN(date.getTime())) throw new Error('无效的日期格式');
    return date;
  } catch (error) {
    const localDate = new Date(dateStr);
    const localOffset = localDate.getTimezoneOffset();
    const beijingOffset = -480;
    const offsetDiff = beijingOffset - localOffset;
    return new Date(localDate.getTime() + offsetDiff * 60000);
  }
};

const getZodiac = (branch: string): string => {
  const ZODIAC: Record<string, string> = {
    '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔', 
    '辰': '龙', '巳': '蛇', '午': '马', '未': '羊',
    '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪'
  };
  return ZODIAC[branch] || '未知';
};

const getLocalISO = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
};

const ELEMENT_TEXT_COLORS: Record<string, string> = {
  '木': 'text-emerald-500', '火': 'text-red-500', '土': 'text-yellow-600', '金': 'text-amber-400', '水': 'text-blue-500'
};
const ELEMENT_COLORS: Record<string, string> = {
  '木': 'bg-emerald-500', '火': 'bg-red-500', '土': 'bg-yellow-600', '金': 'bg-amber-400', '水': 'bg-blue-500'
};
const ELEMENT_SVG_COLORS: Record<string, string> = {
  '木': '#10b981', '火': '#ef4444', '土': '#ca8a04', '金': '#fbbf24', '水': '#3b82f6'
};
const STEM_ELEMENT_COLORS: Record<string, string> = {
  '甲': 'text-emerald-500', '乙': 'text-emerald-500',
  '丙': 'text-red-500', '丁': 'text-red-500',
  '戊': 'text-yellow-600', '己': 'text-yellow-600',
  '庚': 'text-amber-400', '辛': 'text-amber-400',
  '壬': 'text-blue-500', '癸': 'text-blue-500'
};

// 创建降级chart对象
const createFallbackChart = (errorMessage: string): ChartResult => {
  const now = new Date();
  const defaultStemBranch: StemBranch = { stem: '甲', branch: '子' };
  const fallbackParams: QiMenParams = {
    yearSB: defaultStemBranch,
    monthSB: defaultStemBranch,
    daySB: defaultStemBranch,
    hourSB: defaultStemBranch,
    solarTerm: '立春',
    dunJu: '阳遁一局',
    isYang: true,
    juNum: 1,
    yuan: '上元',  // 新增
    termType: '节',  // 新增
    daysSinceTerm: 0,  // 新增
    hoursSinceTerm: 0,  // 新增
    isExact: false,  // 新增
    verification: {  // 新增
      status: '近似' as const,
      message: '降级模式，使用默认节气'
    },
    type: '阳'  // 可选属性，添加以符合类型定义
  };

  const fallbackPalaces: PalaceData[] = Array.from({ length: 9 }, (_, i) => ({
    id: i + 1,
    name: ['坎一宫', '坤二宫', '震三宫', '巽四宫', '中五宫', '乾六宫', '兑七宫', '艮八宫', '离九宫'][i],
    elements: {
      god: '--',
      star: '--',
      gate: '--',
      tianPan: '--',
      diPan: '--',
      status: '降级模式'
    }
  }));
  const fallbackAnalysis: BaziAnalysis = {
    elementCounts: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    elementEnergy: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    tenGodDistribution: { '比劫': 0, '印绶': 0, '官杀': 0, '财才': 0, '食伤': 0 },
    energyState: { '木': '未知', '火': '未知', '土': '未知', '金': '未知', '水': '未知' },
    strength: '未知',
    yongShen: [],
    xiShen: [],
    jiShen: [],
    tiaoHouShen: [],
    emptyBranches: [],
    pillars: {
      year: { 
        sb: defaultStemBranch, 
        tenGod: '未知', 
        hiddenStems: [], 
        isEmpty: false 
      },
      month: { 
        sb: defaultStemBranch, 
        tenGod: '未知', 
        hiddenStems: [], 
        isEmpty: false 
      },
      day: { 
        sb: defaultStemBranch, 
        tenGod: '日主', 
        hiddenStems: [], 
        isEmpty: false 
      },
      hour: { 
        sb: defaultStemBranch, 
        tenGod: '未知', 
        hiddenStems: [], 
        isEmpty: false 
      }
    },
    dayMaster: '甲',
    dayMasterElement: '木',
    yunNian: null,
    elementScoreDetails: {}
  };
  
  const fallbackPersonalInfo: PersonalInfo = {
    name: '用户',
    gender: '男',
    solarDate: `${now.getFullYear()}年${String(now.getMonth()+1).padStart(2,'0')}月${String(now.getDate()).padStart(2,'0')}日`,
    lunarDate: '排盘失败 - 降级模式',
    bazi: '甲子 甲子 甲子 甲子',
    analysis: fallbackAnalysis,
    emptyBranches: [],
    maBranches: [],
    palaceBranches: {}
  };
  
  return {
    params: fallbackParams,
    palaces: fallbackPalaces,
    zhiFu: '天蓬',
    zhiShi: '休门',
    xunShou: '甲子',
    personalInfo: fallbackPersonalInfo,
    isFallback: true,
    error: errorMessage
  };
};

// 辅助函数：获取地支的主要藏干
const getMainHiddenStemForBranch = (branch: string): string => {
  const mainHiddenStemsMap: Record<string, string> = {
    '子': '癸',
    '丑': '己',
    '寅': '甲',
    '卯': '乙',
    '辰': '戊',
    '巳': '丙',
    '午': '丁',
    '未': '己',
    '申': '庚',
    '酉': '辛',
    '戌': '戊',
    '亥': '壬'
  };
  return mainHiddenStemsMap[branch] || '';
};

// 辅助函数：获取地支藏干列表
const getHiddenStemsForBranch = (branch: string): string[] => {
  const hiddenStemsMap: Record<string, string[]> = {
    '子': ['癸'],
    '丑': ['己', '癸', '辛'],
    '寅': ['甲', '丙', '戊'],
    '卯': ['乙'],
    '辰': ['戊', '乙', '癸'],
    '巳': ['丙', '戊', '庚'],
    '午': ['丁', '己'],
    '未': ['己', '丁', '乙'],
    '申': ['庚', '壬', '戊'],
    '酉': ['辛'],
    '戌': ['戊', '辛', '丁'],
    '亥': ['壬', '甲']
  };
  return hiddenStemsMap[branch] || [];
};

// 生成整理后的问题描述
const generateQuestionFromGuide = (data: any): string => {
  const { category, area, situation, pastExperience, expectation, timeframe, details } = data;
  
  let question = `【${category}咨询】`;
  
  if (area) {
    question += ` 关于${area}`;
  }
  
  if (timeframe) {
    question += `（时间范围：${timeframe}）`;
  }
  
  question += '\n\n';
  
  // 当前状况
  if (situation) {
    question += `【当前状况】\n${situation}\n\n`;
  }
  
  // 过往经历（如果有）
  if (pastExperience && pastExperience.trim()) {
    question += `【过往经历】\n${pastExperience}\n\n`;
  }
  
  // 期望结果
  if (expectation) {
    question += `【期望目标】\n${expectation}\n\n`;
  }
  
  // 其他细节（如果有）
  if (details && details.trim()) {
    question += `【补充信息】\n${details}\n\n`;
  }
  
  // 根据类别添加专业问题提示
  const categoryPrompts: Record<string, string> = {
    '事业': '希望从奇门八字角度分析：\n1. 当前运势是否有利于事业发展\n2. 近期是否有好的机会出现\n3. 需要注意哪些阻碍和风险\n4. 最佳的行动时机和方向',
    '财运': '希望从奇门八字角度分析：\n1. 财运走势如何\n2. 投资理财是否合适\n3. 是否有偏财运机会\n4. 需要注意的财务风险',
    '感情': '希望从奇门八字角度分析：\n1. 感情运势发展趋势\n2. 适合的交往对象特征\n3. 关系中的注意事项\n4. 改善感情的建议',
    '健康': '希望从奇门八字角度分析：\n1. 健康状况评估\n2. 需要注意的身体部位\n3. 调理养生的建议\n4. 预防疾病的方向',
    '学业': '希望从奇门八字角度分析：\n1. 学习运势如何\n2. 考试升学机会\n3. 适合的专业方向\n4. 提升学习效果的方法',
    '其他': '希望从奇门八字角度提供综合分析和建议'
  };
  
  question += `【分析请求】\n${categoryPrompts[category] || '请从奇门八字角度提供专业分析和建议'}`;
  
  return question;
};

// 重置引导数据的函数
const resetGuideData = () => {
  return {
    category: '事业',
    area: '',
    situation: '',
    pastExperience: '',
    expectation: '',
    timeframe: '短期（3个月内）',
    details: ''
  };
};

const App: React.FC = () => {
  const [eventDate, setEventDate] = useState<string>(getLocalISO(new Date()));
  const [userName, setUserName] = useState<string>('');
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [birthDate, setBirthDate] = useState<string>(getLocalISO(new Date(1979, 6, 11, 9, 30)));
  const [question, setQuestion] = useState<string>('');
  const [chart, setChart] = useState<ChartResult | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [dataReady, setDataReady] = useState<boolean>(false);
  const [dataError, setDataError] = useState<boolean>(false);
  const [showScoreDetails, setShowScoreDetails] = useState<boolean>(false);
  const [baziAdvice, setBaziAdvice] = useState<string[]>([]);
  const [visualizationData, setVisualizationData] = useState<any>(null);
  const [showChartResult, setShowChartResult] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [showBaziAdviceDetails, setShowBaziAdviceDetails] = useState<boolean>(false);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState<boolean>(true);
  const [showYunNianDetails, setShowYunNianDetails] = useState<boolean>(true);
  
  // 历史记录相关
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // 引导提问相关状态
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [guideStep, setGuideStep] = useState<number>(0);
  const [guideData, setGuideData] = useState(resetGuideData());
  
  // 删除确认相关状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // 刷新历史记录函数
  const refreshHistory = useCallback(async () => {
    try {
      const savedHistory = await getAllHistory();
      const sortedHistory = savedHistory.sort((a, b) => b.timestamp - a.timestamp);
      setHistory(sortedHistory);
      console.log('历史记录已刷新，数量:', sortedHistory.length);
      return sortedHistory;
    } catch (error) {
      console.error('刷新历史记录失败:', error);
      return [];
    }
  }, []);

// App.tsx - 第二部分：useEffect 和核心函数

  // 初始化加载
  useEffect(() => {
    const init = async () => {
      try {
        const solarTermsLoaded = await loadSolarTermsFromFile();
        if (!solarTermsLoaded) setDataError(true);
        setDataReady(true);
        // 加载历史记录 - 只调用一次
        await refreshHistory();
      } catch (error) {
        console.error('Initialization failed:', error);
        setDataError(true);
        setDataReady(true);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []); // 移除 refreshHistory 依赖，避免循环

  // 当打开历史记录模态框时自动刷新
  useEffect(() => {
    if (showHistoryModal) {
      refreshHistory();
    }
  }, [showHistoryModal]); // 只依赖 showHistoryModal

  // 五行分布图组件
  const ElementDistributionChart = ({ scoreDetails }: { scoreDetails: any }) => {
    if (!scoreDetails) return null;
    
    const data = Object.values(scoreDetails)
      .map((element: any) => ({
        name: element.name,
        value: element.value,
        svgColor: ELEMENT_SVG_COLORS[element.name] || '#cccccc',
        twColor: ELEMENT_COLORS[element.name]
      }))
      .sort((a: any, b: any) => b.value - a.value);
      
    const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
    if (total <= 0) return null;
    
    const chartData = data.map((item: any) => ({
      ...item,
      percentage: (item.value / total) * 100
    }));
    
    return (
      <div className="mt-4">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">五行分布图</h4>
        <div className="flex items-center justify-center h-40">
          <div className="relative w-32 h-32">
            <svg width="128" height="128" viewBox="0 0 32 32" className="transform -rotate-90">
              {(() => {
                let cumulativePercentage = 0;
                return chartData.map((item: any) => {
                  const percentage = item.percentage;
                  const startAngle = cumulativePercentage * 3.6;
                  const endAngle = (cumulativePercentage + percentage) * 3.6;
                  const startX = 16 + 14 * Math.cos(startAngle * Math.PI / 180);
                  const startY = 16 + 14 * Math.sin(startAngle * Math.PI / 180);
                  const endX = 16 + 14 * Math.cos(endAngle * Math.PI / 180);
                  const endY = 16 + 14 * Math.sin(endAngle * Math.PI / 180);
                  const largeArcFlag = percentage > 50 ? 1 : 0;
                  const pathData = [
                    `M 16 16`,
                    `L ${startX} ${startY}`,
                    `A 14 14 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                    `Z`
                  ].join(' ');
                  cumulativePercentage += percentage;
                  return (
                    <path
                      key={item.name}
                      d={pathData}
                      fill={item.svgColor}
                      fillOpacity={0.8}
                      stroke="#1f2937"
                      strokeWidth="0.5"
                    />
                  );
                });
              })()}
              <circle cx="16" cy="16" r="8" fill="#0a0a0a" />
            </svg>
          </div>
          <div className="ml-4 space-y-2">
            {chartData.map((item: any) => (
              <div key={item.name} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ 
                    backgroundColor: item.svgColor
                  }}
                ></div>
                <span className="text-xs text-neutral-400">
                  {item.name}: {item.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ElementBar = ({ name, keyName, color }: { name: string, keyName: 'wood' | 'fire' | 'earth' | 'metal' | 'water', color: string }) => {
    const count = chart?.personalInfo?.analysis.elementCounts[keyName] || 0;
    const elementCounts = chart?.personalInfo?.analysis.elementCounts;
    const total = elementCounts ? 
      elementCounts.wood + elementCounts.fire + elementCounts.earth + 
      elementCounts.metal + elementCounts.water : 0;
    const percentage = total > 0 ? ((count / total) * 100) : 0;
    const displayValue = Math.round(percentage * 10) / 10;
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500 w-4">{name}</span>
        <div className="flex-1 h-2 bg-neutral-900 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${Math.min(displayValue, 100)}%` }}></div>
        </div>
        <span className="text-[10px] text-neutral-400 font-mono w-8 text-right">{displayValue.toFixed(1)}</span>
      </div>
    );
  };

  const scoreDetails = chart?.personalInfo?.analysis.elementScoreDetails;
  const elementTotals = scoreDetails ? calculateElementTotals(scoreDetails) : null;
  
  // 生成动态四柱详细贡献
  const dynamicPillarDetails = chart?.personalInfo?.analysis.pillars ? [
    formatPillarContribution(chart.personalInfo.analysis.pillars.year, '年柱', chart.personalInfo.analysis.emptyBranches),
    formatPillarContribution(chart.personalInfo.analysis.pillars.month, '月柱', chart.personalInfo.analysis.emptyBranches),
    formatPillarContribution(chart.personalInfo.analysis.pillars.day, '日柱', chart.personalInfo.analysis.emptyBranches),
    formatPillarContribution(chart.personalInfo.analysis.pillars.hour, '时柱', chart.personalInfo.analysis.emptyBranches)
  ] : null;
  
  // 生成五行生克关系说明
  const elementRelationsText = chart?.personalInfo?.analysis ? 
    generateElementRelationsText(
      chart.personalInfo.analysis.dayMasterElement,
      chart.personalInfo.analysis.strength,
      chart.personalInfo.analysis.yongShen,
      chart.personalInfo.analysis.xiShen,
      chart.personalInfo.analysis.jiShen,
      elementTotals?.percentages || []
    ) : '';

  // 核心计算函数
  const handleCalculate = useCallback(() => {
    if (!dataReady) {
      setChartError('数据尚未加载完成，请稍后重试');
      return;
    }
    
    setLoading(true);
    setChartError(null);
    setChart(null);
    setAnalysis('');
    
    try {
      const eDate = parseAsBeijing(eventDate);
      const bDate = parseAsBeijing(birthDate);
      if (isNaN(eDate.getTime()) || isNaN(bDate.getTime())) {
        throw new Error('请输入有效的日期时间');
      }
      
      // 验证事件时间不早于出生时间
      if (eDate < bDate) {
        console.warn('事件时间早于出生时间，可能影响排盘准确性');
      }
      
      let result;
      try {
        result = plotChart(eDate, userName, gender, bDate);
      } catch (plotError) {
        console.error('plotChart 函数内部错误:', plotError);
        throw new Error(`排盘内部错误: ${plotError instanceof Error ? plotError.message : '未知错误'}`);
      }
      
      if (!result) {
        throw new Error('排盘函数返回空结果');
      }
      if (!result.personalInfo) {
        throw new Error('排盘结果缺少个人信息数据');
      }
      
      // 检查 yunNian 是否存在
      if (!result.personalInfo.analysis.yunNian) {
        console.warn('大运流年数据为空');
        result.personalInfo.analysis.yunNian = null;
      }
      
      setChart(result);
      setShowChartResult(true);
      
      // 尝试生成八字分析和建议
      try {
        if (result.personalInfo && result.personalInfo.analysis) {
          const baziAnalysis = analyzeBaziCore(result.personalInfo.analysis);
          setBaziAdvice(baziAnalysis.advice || []);
          const vizData = buildBaziVisualizationData(result.personalInfo.analysis);
          setVisualizationData(vizData);
        }
      } catch (baziError) {
        console.warn('八字分析失败:', baziError);
        setBaziAdvice(['八字分析功能暂时不可用，但奇门排盘正常']);
      }
    } catch (err) {
      console.error('排盘过程总错误:', err);
      let errorMessage = '排盘失败，请检查输入参数';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      const fallbackChart = createFallbackChart(errorMessage);
      setChart(fallbackChart);
      setBaziAdvice([`排盘过程中出现错误: ${errorMessage}`]);
      setChartError(`排盘错误: ${errorMessage}`);
      setShowChartResult(true);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }
  }, [dataReady, eventDate, userName, gender, birthDate]);

  // 保存到档案
  const handleSaveToHistory = async () => {
    if (!chart) {
      alert('请先完成排盘');
      return;
    }
    
    try {
      const historyItem: HistoryItem = {
        id: generateUUID(), // 使用我们自己的函数
        timestamp: Date.now(),
        userName: chart.personalInfo?.name || '匿名',
        question: question || '无问题描述',
        eventDate: eventDate,        // 新增：保存排盘时间
        birthDate: birthDate,        // 新增：保存出生时间
        gender: gender,              // 新增：保存性别
        chart: chart,
        analysis: analysis
      };
      
      console.log('保存历史记录:', historyItem.id);
      await saveHistory(historyItem);
      
      // 重新从数据库加载历史记录以确保同步
      const updatedHistory = await getAllHistory();
      const sortedHistory = updatedHistory.sort((a, b) => b.timestamp - a.timestamp);
      setHistory(sortedHistory);
      
      console.log('保存成功，历史记录总数:', sortedHistory.length);
      alert(`已成功保存至历史档案，当前共有 ${sortedHistory.length} 条记录`);
      
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请检查浏览器是否支持 IndexedDB 或存储空间已满');
    }
  };

  // 从历史加载
  const loadFromHistory = (item: HistoryItem) => {
    setChart(item.chart);
    setAnalysis(item.analysis || '');
    setQuestion(item.question);
    setUserName(item.userName);
    setGender(item.chart.personalInfo?.gender || '男');
    setShowChartResult(true);
    setShowHistoryModal(false);
    if (item.chart.personalInfo?.analysis) {
      const baziAnalysis = analyzeBaziCore(item.chart.personalInfo.analysis);
      setBaziAdvice(baziAnalysis.advice || []);
      setVisualizationData(buildBaziVisualizationData(item.chart.personalInfo.analysis));
    }
  };

  // 删除历史记录
  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('用户点击删除按钮，ID:', id);
    console.log('当前历史记录数量:', history.length);
    
    // 设置要删除的项ID并显示确认模态框
    setDeleteItemId(id);
    setShowDeleteConfirm(true);
  };

  // 确认删除函数
  const confirmDelete = async () => {
    if (!deleteItemId) return;
    
    console.log('用户确认删除，开始删除操作...');
    try {
      console.log('开始调用 deleteHistory...');
      await deleteHistory(deleteItemId);
      console.log('deleteHistory 调用成功，重新加载历史记录...');
      
      const updatedHistory = await getAllHistory();
      console.log('重新加载后的记录数:', updatedHistory.length);
      
      const sortedHistory = updatedHistory.sort((a, b) => b.timestamp - a.timestamp);
      setHistory(sortedHistory);
      
      console.log('历史记录状态已更新，当前数量:', sortedHistory.length);
      alert('删除成功');
      
    } catch (err) {
      console.error('删除历史记录失败:', err);
      alert(`删除失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteItemId(null);
    }
  };

  // 取消删除
  const cancelDelete = () => {
    console.log('用户取消了删除操作');
    setShowDeleteConfirm(false);
    setDeleteItemId(null);
  };

  // 提取删除操作为一个单独的函数
  const performDelete = async (id: string) => {
    try {
      console.log('开始调用 deleteHistory...');
      await deleteHistory(id);
      console.log('deleteHistory 调用成功，重新加载历史记录...');
      
      // 添加延迟确保 IndexedDB 更新完成
      setTimeout(async () => {
        try {
          const updatedHistory = await getAllHistory();
          console.log('重新加载后的记录数:', updatedHistory.length);
          
          const sortedHistory = updatedHistory.sort((a, b) => b.timestamp - a.timestamp);
          setHistory(sortedHistory);
          
          console.log('历史记录状态已更新，当前数量:', sortedHistory.length);
          
          // 检查是否真的删除了
          const stillExists = sortedHistory.some(item => item.id === id);
          if (stillExists) {
            console.warn('记录似乎未被删除，将重试...');
            // 重试一次
            await performDelete(id);
          } else {
            alert('删除成功');
          }
        } catch (reloadErr) {
          console.error('重新加载历史记录失败:', reloadErr);
          // 即使重新加载失败，也刷新一次
          refreshHistory();
          alert('删除成功，但刷新列表时出现小问题');
        }
      }, 200);
      
    } catch (err) {
      console.error('删除历史记录失败:', err);
      
      // 如果是事务错误，尝试重试一次
      if (err instanceof Error && err.message.includes('事务')) {
        console.log('事务错误，尝试重试...');
        setTimeout(() => {
          performDelete(id);
        }, 100);
      } else {
        alert(`删除失败: ${err instanceof Error ? err.message : '未知错误'}`);
      }
    }
  };

  // 修改历史记录项的点击事件
  const handleLoadHistory = (item: HistoryItem) => {
    // 设置时间字段
    setEventDate(item.eventDate || getLocalISO(new Date()));
    setBirthDate(item.birthDate || getLocalISO(new Date(1979, 6, 11, 9, 30)));
    setGender(item.gender || '男');
    
    // 设置其他字段
    setChart(item.chart);
    setAnalysis(item.analysis || '');
    setQuestion(item.question);
    setUserName(item.userName);
    setShowChartResult(true);
    setShowHistoryModal(false);
    
    if (item.chart.personalInfo?.analysis) {
      const baziAnalysis = analyzeBaziCore(item.chart.personalInfo.analysis);
      setBaziAdvice(baziAnalysis.advice || []);
      setVisualizationData(buildBaziVisualizationData(item.chart.personalInfo.analysis));
    }
  };

  // 导出JSON - 修改导出函数，包含时间字段
  const exportJSON = () => {
    if (!chart) return;
    const data = {
      version: "1.0",
      exportTime: new Date().toISOString(),
      userName,
      question,
      eventDate,           // 新增：排盘时间
      birthDate,           // 新增：出生时间
      gender,              // 新增：性别
      chart,
      analysis
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `奇门排盘_${userName || '用户'}_${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 保存为长图
  const saveAsImage = async () => {
    if (!reportRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true,
        logging: false,
        ignoreElements: (el) => el.classList.contains('no-export'),
        // 添加自定义处理来解决 oklch 问题
        onclone: (clonedDoc) => {
          // 移除所有可能包含 oklch 的样式
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(style => {
            if (style.textContent?.includes('oklch')) {
              style.remove();
            }
          });
          
          // 为所有元素添加后备颜色
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            const computedStyle = window.getComputedStyle(el);
            const color = computedStyle.color;
            if (color.includes('oklch')) {
              // 替换为安全的颜色
              (el as HTMLElement).style.color = '#ffffff';
            }
            const bgColor = computedStyle.backgroundColor;
            if (bgColor.includes('oklch')) {
              // 替换为安全的颜色
              (el as HTMLElement).style.backgroundColor = '#0a0a0a';
            }
          });
        }
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `奇门宗师报告_${userName || '用户'}_${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.error('Screenshot failed:', err);
      
      // 如果仍然失败，尝试更简单的配置
      try {
        const simpleCanvas = await html2canvas(reportRef.current, {
          backgroundColor: '#0a0a0a',
          scale: 1,
          useCORS: true,
          logging: false,
          allowTaint: true,
          foreignObjectRendering: true
        });
        const url = simpleCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `奇门宗师报告_${userName || '用户'}_${Date.now()}.png`;
        a.click();
      } catch (simpleErr) {
        console.error('简单截图也失败:', simpleErr);
        alert('图片生成失败，请尝试其他导出方式（如导出JSON）');
      }
    } finally {
      setLoading(false);
    }
  };

  // AI 分析函数
  const handleAnalyze = async () => {
    if (!chart || !question) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeQiMen(chart, question);
      setAnalysis(result);
    } catch (err) {
      setAnalysis("## 分析失败\n\nAI分析服务暂时不可用，请稍后重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 渲染咨询提问部分
  const renderConsultationSection = () => (
    <section className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
      <div className="flex items-center gap-2 mb-4 text-blue-400">
        <MessageSquare className="w-5 h-5" />
        <h2 className="font-bold">咨询提问</h2>
        <button
          onClick={() => setShowGuideModal(true)}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 rounded-lg border border-blue-700/50 transition-all text-xs font-medium"
          title="引导提问助手"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          引导提问助手
        </button>
      </div>
      
      <textarea 
        placeholder="请详细描述您想咨询的问题...（例如：想了解近期事业发展方向、财运状况、感情走势等）" 
        value={question} 
        onChange={(e) => setQuestion(e.target.value)} 
        rows={4} 
        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-neutral focus:outline-none text-base resize-none"
      />
      
      {/* 引导问题显示区域（当有引导问题时显示） */}
      {guideData.category && question && (
        <div className="mt-3 text-xs text-neutral-500 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>已通过引导助手优化问题，类别：<span className="text-blue-400">{guideData.category}</span></span>
        </div>
      )}
    </section>
  );

// App.tsx - 第三部分：JSX 渲染主体
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 pb-20 selection:bg-yellow-500/30">
      <header className="border-b border-neutral-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-900/20">
              <Compass className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">奇门遁甲 AI 宗师</h1>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">QUANTUM DIVINATION SYSTEM</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHistoryModal(true)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
              title="历史档案"
            >
              <History className="w-5 h-5" />
            </button>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />}
            {dataError && (
              <div className="flex items-center gap-1 text-xs text-yellow-500">
                <AlertCircle className="w-3 h-3" />
                <span>数据降级模式</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          {/* 排盘配置部分 */}
          <section className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-yellow-500">
              <Clock className="w-5 h-5" />
              <h2 className="font-bold">排盘配置</h2>
            </div>
            
            {/* 显示数据加载状态 */}
            {!dataReady && (
              <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-xl">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-semibold">数据加载中...</span>
                </div>
                <p className="text-xs text-yellow-300/70 mt-1">正在初始化排盘数据，请稍候</p>
              </div>
            )}
            
            {/* 显示排盘错误信息 */}
            {chartError && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-xl">
                <div className="flex items-center gap-2 mb-1 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-semibold">排盘警告</span>
                </div>
                <p className="text-sm text-red-300">{chartError}</p>
                <p className="text-xs text-red-300/70 mt-1">已使用降级模式显示基础信息</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1 ml-1 font-bold uppercase tracking-wider">排盘时刻 (事发时间)</label>
                <input 
                  type="datetime-local" 
                  value={eventDate} 
                  onChange={(e) => setEventDate(e.target.value)} 
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none text-sm font-mono"
                />
              </div>
              
              {/* 咨询提问部分 */}
              {renderConsultationSection()}
              
              <div className="pt-2 border-t border-neutral-800">
                <div className="flex gap-4 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-500 mb-1 ml-1 font-medium">姓名</label>
                    <input 
                      type="text" 
                      value={userName} 
                      onChange={(e) => setUserName(e.target.value)} 
                      placeholder="姓名" 
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1 ml-1 font-medium">性别</label>
                    <div className="flex bg-neutral-800 border border-neutral-700 rounded-xl p-1">
                      <button 
                        onClick={() => setGender('男')} 
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold ${gender === '男' ? 'bg-blue-600 text-white' : 'text-neutral-500'}`}
                      >
                        男
                      </button>
                      <button 
                        onClick={() => setGender('女')} 
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold ${gender === '女' ? 'bg-pink-600 text-white' : 'text-neutral-500'}`}
                      >
                        女
                      </button>
                    </div>
                  </div>
                </div>
                
                <label className="block text-xs text-neutral-500 mb-1 ml-1 font-bold uppercase tracking-wider">出生时刻 (用于八字分析)</label>
                <input 
                  type="datetime-local" 
                  value={birthDate} 
                  onChange={(e) => setBirthDate(e.target.value)} 
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none text-sm font-mono"
                />
              </div>
              
              <button 
                onClick={handleCalculate} 
                disabled={!dataReady || loading}
                className={`w-full ${!dataReady || loading ? 'bg-neutral-700 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400'} text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    排盘中...
                  </>
                ) : showChartResult ? '重新排盘' : '开始排盘'}
              </button>
              
              {dataError && (
                <div className="text-xs text-yellow-500/70 text-center mt-2">
                  <p>※ 数据加载异常，部分高级功能可能受限</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-8 space-y-6" ref={reportRef}>
          {showChartResult && chart ? (
            <>
              {/* 显示降级模式警告 */}
              {chartError && (
                <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">注意：排盘过程中出现异常</span>
                  </div>
                  <p className="text-sm text-yellow-300/80 mt-1">{chartError}</p>
                  <p className="text-xs text-yellow-300/60 mt-2">部分高级功能可能受限，但基本排盘信息正常显示</p>
                </div>
              )}
              
              <div className="flex items-center justify-between no-export">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]"></span>
                  <h2 className="text-xl font-bold text-white">时家奇门排盘</h2>
                  {chart.isFallback && (
                    <span className="text-xs bg-red-900/40 text-red-300 px-2 py-1 rounded-full border border-red-700/50">
                      降级模式
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveToHistory} className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-400 transition-all" title="保存到档案"><Save className="w-4 h-4" /></button>
                  <button onClick={exportJSON} className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-400 transition-all" title="导出数据"><Download className="w-4 h-4" /></button>
                  <button onClick={saveAsImage} className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-400 transition-all" title="生成长图"><ImageIcon className="w-4 h-4" /></button>
                </div>
              </div>

  <QiMenChart 
    chart={chart} 
    gregorianTime={formatGregorianTime(eventDate)}
    lunarTime={`${chart.params.yearSB.stem}${chart.params.yearSB.branch}年（${getZodiac(chart.params.yearSB.branch)}）${chart.params.monthSB.stem}${chart.params.monthSB.branch}月 ${chart.params.daySB.stem}${chart.params.daySB.branch}日 ${chart.params.hourSB.stem}${chart.params.hourSB.branch}时，节气：${chart.params.solarTerm}`}
  />

              <section className="bg-neutral-900/40 border border-neutral-700/50 rounded-2xl p-6 no-export">
                <div className="flex justify-center">
                  <button 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing || !question || chart.isFallback}
                    className={`px-10 py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${isAnalyzing || !question || chart.isFallback ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'}`}
                  >
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : chart.isFallback ? '降级模式下不可用' : <><Sparkles className="w-4 h-4" /> AI 宗师深度解盘</>}
                  </button>
                </div>
              </section>

              {analysis && !isAnalyzing && (
                <section className="bg-neutral-900/60 border border-neutral-700/50 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4 border-b border-neutral-800 pb-4">
                    <Sparkles className="text-blue-400 w-5 h-5" />
                    <h3 className="text-lg font-bold text-blue-400 tracking-tight">宗师解析天机</h3>
                  </div>
                  {showAnalysisDetails && (
                    <div className="prose prose-invert max-w-none">
                      <div className="text-neutral-300 leading-relaxed font-serif" dangerouslySetInnerHTML={{ __html: marked.parse(analysis) }} />
                    </div>
                  )}
                  <button 
                    onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
                    className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1"
                  >
                    {showAnalysisDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showAnalysisDetails ? '隐藏详情' : '显示详情'}
                  </button>
                </section>
              )}

              {/* 八字信息卡片 - 仅在非降级模式下完整显示 */}
              {!chart.isFallback ? (
                <>
                  <section className="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-2xl p-6 shadow-xl space-y-6">
                    <div className="flex flex-wrap gap-y-6 items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-inner ${chart.personalInfo!.gender === '男' ? 'bg-blue-900/40 text-blue-400' : 'bg-pink-900/40 text-pink-400'}`}>
                          {chart.personalInfo!.gender}
                        </div>
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-white leading-none">{chart.personalInfo!.name || '测算人'}</p>
                          <p className="text-xs text-neutral-300 font-mono">公历：{chart.personalInfo!.solarDate}</p>
                          <p className="text-xs text-neutral-400 font-mono">农历：{chart.personalInfo!.lunarDate}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        {(['year', 'month', 'day', 'hour'] as const).map((pKey) => {
                          const pillar = chart.personalInfo!.analysis.pillars[pKey];
                          return (
                            <div key={pKey} className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-white-400 font-bold mb-1">{pillar.tenGod}</span>
                              <div className="bg-neutral-950 px-3 py-3 rounded-xl border border-neutral-700 flex flex-col items-center min-w-[56px] shadow-lg">
                                <span className="text-lg font-bold text-yellow-500 leading-tight">{pillar.sb.stem}</span>
                                <span className="text-lg font-bold text-yellow-500 leading-tight">{pillar.sb.branch}</span>
                              </div>
                              <div className="flex flex-col items-center mt-1 space-y-0.5">
                                {pillar.hiddenStems.map((hs, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    <span className="text-[9px] text-white-400">{hs}</span>
                                    <span className="text-[8px] text-white-600">({getTenGodLabel(chart.personalInfo!.analysis.dayMaster, hs).slice(0,1)})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-neutral-800 text-xs flex flex-wrap gap-x-8 gap-y-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-950 text-yellow-400 px-2 py-0.5 rounded border border-emerald-800/50 font-bold">日主</span>
                        <span className={`text-sm font-bold ${ELEMENT_TEXT_COLORS[chart.personalInfo!.analysis.dayMasterElement]}`}>
                          {chart.personalInfo!.analysis.dayMasterElement}命
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-950 text-orange-400 px-2 py-0.5 rounded border border-emerald-800/50 font-bold">旺衰</span>
                        <span className={`text-sm font-bold ${chart.personalInfo!.analysis.strength === '身强' ? 'text-orange-500' : chart.personalInfo!.analysis.strength === '身弱' ? 'text-blue-400' : 'text-green-400'}`}>
                          {chart.personalInfo!.analysis.strength}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/50 font-bold">用神</span>
                        <span className="text-neutral-300 font-medium">{chart.personalInfo!.analysis.yongShen.join(' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-950 text-blue-400 px-2 py-0.5 rounded border border-blue-800/50 font-bold">喜神</span>
                        <span className="text-neutral-300 font-medium">{chart.personalInfo!.analysis.xiShen.join(' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-800/50 font-bold">忌神</span>
                        <span className="text-neutral-300 font-medium">{chart.personalInfo!.analysis.jiShen.join(' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-950 text-purple-400 px-2 py-0.5 rounded border border-purple-800/50 font-bold">调候</span>
                        <span className="text-neutral-300 font-medium">{chart.personalInfo!.analysis.tiaoHouShen.join(' ')}</span>
                      </div>
                    </div>
                  </section>

                  <section className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-2 mb-4 text-emerald-500">
                      <Database className="w-5 h-5" />
                      <h2 className="font-bold">五行力量平衡</h2>
                      <button 
                        onClick={() => setShowScoreDetails(!showScoreDetails)}
                        className="ml-auto text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1"
                      >
                        {showScoreDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {showScoreDetails ? '隐藏得分详情' : '显示得分详情'}
                      </button>
                    </div>
                    <div className="space-y-4 mb-6">
                      <ElementBar name="木" keyName="wood" color="bg-emerald-500" />
                      <ElementBar name="火" keyName="fire" color="bg-red-500" />
                      <ElementBar name="土" keyName="earth" color="bg-yellow-600" />
                      <ElementBar name="金" keyName="metal" color="bg-amber-400" />
                      <ElementBar name="水" keyName="water" color="bg-blue-500" />
                    </div>
                    
                    {/* 五行得分详情 */}
                    {showScoreDetails && scoreDetails && (
                      <div className="mb-6 p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-4">
                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">五行得分详细计算</h3>
                        {Object.entries(scoreDetails).map(([key, element]: [string, any]) => {
                          const elementName = element.name;
                          const breakdown = element.breakdown;
                          const actualStemScore = breakdown.rawStemScore;
                          const actualHiddenScore = breakdown.rawHiddenScore;
                          return (
                            <div key={key} className="space-y-3 p-3 bg-neutral-900/50 rounded-lg">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className={`w-3 h-3 rounded-full ${ELEMENT_COLORS[elementName]}`}></span>
                                  <span className={`text-sm font-bold ${ELEMENT_TEXT_COLORS[elementName]}`}>
                                    {elementName}命得分
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-white">{element.value.toFixed(1)}</span>
                              </div>
                              <div className="text-xs space-y-2 pl-5">
                                <div className="flex justify-between">
                                  <span className="text-neutral-400">天干得分：</span>
                                  <div className="text-right">
                                    <span className="text-neutral-300">{actualStemScore.toFixed(1)}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-400">地支藏干得分：</span>
                                  <div className="text-right">
                                    <span className="text-neutral-300">{actualHiddenScore.toFixed(1)}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between text-neutral-300 font-medium">
                                  <span>原始总分：</span>
                                  <span>{breakdown.rawTotal.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-400">旺相休囚死：</span>
                                  <div className="text-right">
                                    <span className="text-neutral-300">{breakdown.state}</span>
                                    <div className="text-[10px] text-neutral-500">系数: {breakdown.coefficient.toFixed(1)}</div>
                                  </div>
                                </div>
                                <div className="pt-2 border-t border-neutral-800 mt-2">
                                  <div className="flex flex-col gap-1">
                                    <div className="text-neutral-400 text-[10px]">计算公式：</div>
                                    <div className="text-neutral-300 font-mono text-[10px]">
                                      ({actualStemScore.toFixed(1)} + {actualHiddenScore.toFixed(1)}) × {breakdown.coefficient.toFixed(1)}
                                    </div>
                                    <div className="text-neutral-300 font-mono text-[10px]">
                                      = {breakdown.rawTotal.toFixed(1)} × {breakdown.coefficient.toFixed(1)}
                                    </div>
                                    <div className="text-neutral-300 font-mono text-[10px] font-bold">
                                      = {element.value.toFixed(1)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* 五行分布图 */}
                        <ElementDistributionChart scoreDetails={scoreDetails} />
                        
                        {/* 五行生克关系说明 */}
                        <div className="mt-4 p-3 bg-neutral-900/30 rounded-lg">
                          <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">五行生克关系</h4>
                          <div className="text-xs text-neutral-400 space-y-2">
                            <div>{elementRelationsText}</div>
                            <div className="text-[10px] text-neutral-500 mt-2">
                              五行得分排序：{
                                elementTotals?.sortedByValue
                                  .map(el => `${el.name}(${el.percentage.toFixed(1)}%)`)
                                  .join(' > ')
                              }
                            </div>
                          </div>
                        </div>
                        
                        {/* 动态四柱详细贡献 */}
                        {dynamicPillarDetails && (
                          <div className="pt-3 border-t border-neutral-800 mt-2">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">四柱详细贡献</h4>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              {dynamicPillarDetails.map((pillar, index) => (
                                <div key={index} className="p-2 bg-neutral-900/30 rounded">
                                  <div className="font-bold text-neutral-400 mb-1">
                                    {pillar.pillar}：{pillar.stem}{pillar.branch}
                                    {pillar.hiddenScores.some(h => h.isEmpty) && (
                                      <span className="ml-1 text-xs text-red-500">(空亡)</span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between">
                                      <span>天干{pillar.stem}：</span>
                                      <span className={`${STEM_ELEMENT_COLORS[pillar.stem]}`}>+{pillar.stemScore.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>地支{pillar.branch}藏干：</span>
                                      <span className="text-neutral-400">
                                        {pillar.hiddenScores.map((hs, idx) => (
                                          <span key={idx} className={idx > 0 ? 'ml-1' : ''}>
                                            {hs.stem}({hs.score.toFixed(0)})
                                            {idx < pillar.hiddenScores.length - 1 && '/'}
                                          </span>
                                        ))}
                                      </span>
                                    </div>
                                    {pillar.hiddenScores.some(h => h.isEmpty) && (
                                      <div className="text-[10px] text-red-500 mt-1">
                                        ⚠️ {pillar.branch}支空亡，藏干得分减半
                                      </div>
                                    )}
                                    <div className="flex justify-between text-neutral-300 font-medium pt-1 border-t border-neutral-800">
                                      <span>总分：</span>
                                      <span>{pillar.totalScore.toFixed(0)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 五行总分和百分比计算 */}
                        {elementTotals && (
                          <div className="pt-3 border-t border-neutral-800 mt-2">
                            <div className="flex justify-between items-center text-xs mb-2">
                              <span className="text-neutral-500 font-bold">五行总分计算</span>
                              <span className="text-neutral-400">(五个五行调整后得分之和)</span>
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between text-neutral-400">
                                <span>五行总分：</span>
                                <span className="font-mono">{elementTotals.total.toFixed(1)}</span>
                              </div>
                              {elementTotals.percentages.map((element: any) => (
                                <div key={element.name} className="flex justify-between text-neutral-400">
                                  <span>{element.name}的百分比：</span>
                                  <span className="font-mono">
                                    {element.value.toFixed(1)} ÷ {elementTotals.total.toFixed(1)} × 100 = {element.percentage.toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 十神分布可视化 */}
                        {visualizationData && (
                          <div className="pt-3 border-t border-neutral-800 mt-2">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">十神分布</h4>
                            <div className="space-y-2">
                              {visualizationData.tenGodBarChart.map((item: any) => (
                                <div key={item.category} className="flex items-center">
                                  <span className="text-xs text-neutral-400 w-16">{item.category}</span>
                                  <div className="flex-1 h-3 bg-neutral-900 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                      style={{ width: `${item.value}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] text-neutral-400 w-8 text-right ml-2">{item.value}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                  
                  {/* 八字分析建议卡片 */}
                  {baziAdvice.length > 0 && (
                    <section className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-blue-400">
                          <Shield className="w-5 h-5" />
                          <h2 className="font-bold">八字命理建议</h2>
                        </div>
                        <button 
                          onClick={() => setShowBaziAdviceDetails(!showBaziAdviceDetails)}
                          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1"
                        >
                          {showBaziAdviceDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {showBaziAdviceDetails ? '隐藏详情' : '显示详情'}
                        </button>
                      </div>
                      {showBaziAdviceDetails && (
                        <div className="space-y-3">
                          {baziAdvice
                            .filter(advice => advice && advice.trim() !== '')
                            .map((advice, index) => {
                              const isTitle = advice.includes('【') && advice.includes('】');
                              const isEmptyLine = advice.trim() === '';
                              
                              if (isEmptyLine) {
                                return <div key={index} className="h-3"></div>;
                              }
                              
                              if (isTitle) {
                                return (
                                  <div key={index} className="mt-4 mb-2">
                                    <p className="text-sm font-bold text-blue-400 leading-relaxed">
                                      {advice}
                                    </p>
                                  </div>
                                );
                              }
                              
                              return (
                                <div key={index} className="flex items-start gap-3">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <p className="text-sm text-blue-200/90 leading-relaxed">{advice}</p>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </section>
                  )}
                  
                  {/* 大运流年卡片 */}
                  {chart.personalInfo?.analysis.yunNian && (
                    <section className="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-purple-400">
                          <Clock className="w-5 h-5" />
                          <h2 className="font-bold">大运流年</h2>
                        </div>
                        <button 
                          onClick={() => setShowYunNianDetails(!showYunNianDetails)}
                          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1"
                        >
                          {showYunNianDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {showYunNianDetails ? '隐藏详情' : '显示详情'}
                        </button>
                      </div>
                      
                      {showYunNianDetails && (
                        <div className="space-y-6">
                          {/* 起运信息摘要 */}
                          <div className="bg-neutral-900/40 p-4 rounded-xl border border-neutral-800">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-bold text-purple-300">起运信息</div>
                                <div className="text-xs text-neutral-400">
                                  {chart.personalInfo.analysis.yunNian.qiYunAge}岁起运，{chart.personalInfo.analysis.yunNian.direction}行大运
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-neutral-500">当前大运</div>
                                <div className="text-lg font-bold text-yellow-500">
                                  {(() => {
                                    const yunNian = chart.personalInfo?.analysis?.yunNian;
                                    if (!yunNian) return '';
                                    const currentDaYun = yunNian.daYun.find(yun => yun.isCurrent);
                                    if (currentDaYun) {
                                      return `${currentDaYun.pillar.stem}${currentDaYun.pillar.branch}`;
                                    } else if (yunNian.daYun.length > 0) {
                                      return `${yunNian.daYun[0].pillar.stem}${yunNian.daYun[0].pillar.branch}`;
                                    }
                                    return '';
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 大运部分 */}
                          <div className="space-y-3">
                            <h3 className="text-sm font-bold text-purple-300 border-b border-purple-800/50 pb-2">
                              人生大运
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {chart.personalInfo.analysis.yunNian.daYun.map((yun, index) => {
                                const dayMaster = chart.personalInfo.analysis.dayMaster;
                                const stemElement = STEM_ELEMENTS[yun.pillar.stem] || '?';
                                const stemTenGod = yun.tenGod || '?';
                                const stemElementColor = STEM_ELEMENT_COLORS[yun.pillar.stem] || 'text-neutral-400';
                                const branchElement = (() => {
                                  const branch = yun.pillar.branch;
                                  if (['寅', '卯'].includes(branch)) return '木';
                                  if (['巳', '午'].includes(branch)) return '火';
                                  if (['辰', '戌', '丑', '未'].includes(branch)) return '土';
                                  if (['申', '酉'].includes(branch)) return '金';
                                  if (['子', '亥'].includes(branch)) return '水';
                                  return '未知';
                                })();
                                const branchElementColor = ELEMENT_TEXT_COLORS[branchElement] || 'text-neutral-400';
                                const hiddenStems = getHiddenStemsForBranch(yun.pillar.branch);
                                const hiddenDetails = hiddenStems.map(stem => {
                                  const element = STEM_ELEMENTS[stem] || '?';
                                  const tenGod = getTenGodLabel(dayMaster, stem) || '?';
                                  return { stem, element, tenGod };
                                });
                                const hiddenText = hiddenDetails.length > 0 
                                  ? `${yun.pillar.branch}中藏干：${hiddenDetails.map(h => `${h.stem}${h.element}（${h.tenGod}）`).join(' ')}`
                                  : '';
                                const mainHiddenStem = getMainHiddenStemForBranch(yun.pillar.branch);
                                const branchTenGod = mainHiddenStem ? getTenGodLabel(dayMaster, mainHiddenStem) : '?';
                                
                                return (
                                  <div 
                                    key={index} 
                                    className={`bg-neutral-900/60 p-4 rounded-xl border ${
                                      yun.isCurrent 
                                        ? 'border-purple-700 bg-purple-900/20' 
                                        : 'border-neutral-800'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <span className={`text-xs ${
                                        yun.isCurrent ? 'text-purple-400' : 'text-neutral-500'
                                      } font-bold`}>
                                        {yun.decade}
                                      </span>
                                      <span className="text-xs text-neutral-400">{yun.ageRange}</span>
                                    </div>
                                    <div className="text-center mb-3">
                                      <div className={`text-2xl font-bold ${
                                        yun.isCurrent ? 'text-yellow-500' : 'text-neutral-300'
                                      } mb-2`}>
                                        {yun.pillar.stem}{yun.pillar.branch}
                                      </div>
                                      <div className="space-y-1 text-xs">
                                        <div className="flex justify-center gap-3 flex-wrap">
                                          <div className="px-2 py-1 bg-neutral-800/50 rounded flex items-center gap-1">
                                            <span className="font-bold text-neutral-200">{yun.pillar.stem}</span>
                                            <span className={stemElementColor}>
                                              {stemElement}
                                            </span>
                                            <span className="text-neutral-400 ml-1">:{stemTenGod}</span>
                                          </div>
                                          <div className="px-2 py-1 bg-neutral-800/50 rounded flex items-center gap-1">
                                            <span className="font-bold text-neutral-200">{yun.pillar.branch}</span>
                                            <span className={branchElementColor}>
                                              {branchElement}
                                            </span>
                                            <span className="text-neutral-400 ml-1">:{branchTenGod}</span>
                                          </div>
                                        </div>
                                        {hiddenText && (
                                          <div className="text-[10px] text-neutral-400 mt-2 bg-neutral-900/30 p-2 rounded leading-tight">
                                            {hiddenText}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-xs text-neutral-500 text-center mt-2">
                                      {yun.isCurrent ? '当前大运' : 
                                      index < 4 ? '过去大运' : '未来大运'}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* 流年部分 */}
                          <div className="space-y-4">
                            <h3 className="text-sm font-bold text-blue-300 border-b border-blue-800/50 pb-2">
                              近年流年（前后5年）
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {chart.personalInfo.analysis.yunNian.liuNian
                                .sort((a, b) => a.year - b.year)
                                .map((nian, index) => {
                                  const currentYear = new Date(eventDate).getFullYear();
                                  const isCurrent = nian.year === currentYear;
                                  const isBirthYear = nian.year === new Date(birthDate).getFullYear();
                                  const dayMaster = chart.personalInfo.analysis.dayMaster;
                                  const stemElement = STEM_ELEMENTS[nian.stemBranch.stem] || '?';
                                  const stemTenGod = nian.tenGod || '?';
                                  const stemElementColor = STEM_ELEMENT_COLORS[nian.stemBranch.stem] || 'text-neutral-400';
                                  const branchElement = (() => {
                                    const branch = nian.stemBranch.branch;
                                    if (['寅', '卯'].includes(branch)) return '木';
                                    if (['巳', '午'].includes(branch)) return '火';
                                    if (['辰', '戌', '丑', '未'].includes(branch)) return '土';
                                    if (['申', '酉'].includes(branch)) return '金';
                                    if (['子', '亥'].includes(branch)) return '水';
                                    return '未知';
                                  })();
                                  const branchElementColor = ELEMENT_TEXT_COLORS[branchElement] || 'text-neutral-400';
                                  const hiddenStems = getHiddenStemsForBranch(nian.stemBranch.branch);
                                  const hiddenDetails = hiddenStems.map(stem => {
                                    const element = STEM_ELEMENTS[stem] || '?';
                                    const tenGod = getTenGodLabel(dayMaster, stem) || '?';
                                    return { stem, element, tenGod };
                                  });
                                  const hiddenText = hiddenDetails.length > 0 
                                    ? `${nian.stemBranch.branch}中藏干：${hiddenDetails.map(h => `${h.stem}${h.element}（${h.tenGod}）`).join(' ')}`
                                    : '';
                                  const mainHiddenStem = getMainHiddenStemForBranch(nian.stemBranch.branch);
                                  const branchTenGod = mainHiddenStem ? getTenGodLabel(dayMaster, mainHiddenStem) : '?';
                                  const isEmptyBranch = chart.personalInfo.analysis.emptyBranches?.includes(nian.stemBranch.branch) || false;
                                  
                                  return (
                                    <div 
                                      key={index} 
                                      className={`bg-neutral-900/60 p-4 rounded-xl border ${
                                        isCurrent 
                                          ? 'border-blue-700 bg-blue-900/20 shadow-lg shadow-blue-900/20' 
                                          : isBirthYear
                                            ? 'border-purple-700 bg-purple-900/20'
                                            : nian.year < currentYear
                                              ? 'border-neutral-800'
                                              : 'border-emerald-800/50 bg-emerald-900/10'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-sm font-bold ${
                                            isCurrent 
                                              ? 'text-blue-400' 
                                              : isBirthYear
                                                ? 'text-purple-400'
                                                : nian.year < currentYear
                                                  ? 'text-neutral-400'
                                                  : 'text-emerald-400'
                                          }`}>
                                            {nian.year}年
                                          </span>
                                          {isCurrent && (
                                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                                              当前年
                                            </span>
                                          )}
                                          {isBirthYear && !isCurrent && (
                                            <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                                              本命年
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-xs text-neutral-500">
                                          {nian.age}岁
                                        </span>
                                      </div>
                                      <div className="text-center mb-4">
                                        <div className={`text-2xl font-bold ${
                                          isCurrent 
                                            ? 'text-yellow-400' 
                                            : isBirthYear
                                              ? 'text-purple-300'
                                              : nian.year < currentYear
                                                ? 'text-neutral-300'
                                                : 'text-emerald-300'
                                        } mb-3`}>
                                          {nian.stemBranch.stem}{nian.stemBranch.branch}
                                        </div>
                                        <div className="space-y-1 text-xs mb-3">
                                          <div className="flex justify-center gap-3 flex-wrap">
                                            <div className="px-2 py-1 bg-neutral-800/50 rounded flex items-center gap-1">
                                              <span className="font-bold text-neutral-200">{nian.stemBranch.stem}</span>
                                              <span className={stemElementColor}>
                                                {stemElement}
                                              </span>
                                              <span className="text-neutral-400 ml-1">:{stemTenGod}</span>
                                            </div>
                                            <div className="px-2 py-1 bg-neutral-800/50 rounded flex items-center gap-1">
                                              <span className="font-bold text-neutral-200">{nian.stemBranch.branch}</span>
                                              <span className={branchElementColor}>
                                                {branchElement}
                                              </span>
                                              <span className="text-neutral-400 ml-1">:{branchTenGod}</span>
                                              {isEmptyBranch && (
                                                <span className="text-xs text-red-500 ml-1 font-bold">(空)</span>
                                              )}
                                            </div>
                                          </div>
                                          {hiddenText && (
                                            <div className="text-[10px] text-neutral-400 mt-2 bg-neutral-900/30 p-2 rounded leading-tight">
                                              {hiddenText}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {nian.special && (
                                          <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded border border-red-800/50">
                                            {nian.special}
                                          </span>
                                        )}
                                        {nian.clash && nian.clash !== '当前年' && (
                                          <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded border border-yellow-800/50">
                                            {nian.clash}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-neutral-600 text-center mt-3 pt-2 border-t border-neutral-800">
                                        {nian.year < currentYear ? '过去年' : nian.year > currentYear ? '未来年' : '当前年'}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                            <div className="flex items-center justify-center gap-4 text-xs text-neutral-500 mt-6">
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-blue-900/30 border border-blue-700 rounded"></div>
                                <span>当前年</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-purple-900/30 border border-purple-700 rounded"></div>
                                <span>本命年</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-emerald-900/20 border border-emerald-800/30 rounded"></div>
                                <span>未来年</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-neutral-900/30 border border-neutral-800 rounded"></div>
                                <span>过去年</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 大运流年简要分析 */}
                          <div className="pt-4 border-t border-neutral-800">
                            <h4 className="text-sm font-bold text-emerald-300 mb-2">大运流年提示</h4>
                            <div className="text-xs text-neutral-400 space-y-2">
                              <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></div>
                                <span><strong>大运</strong>：以10年为一周期，影响人生长期运势走向</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1"></div>
                                <span><strong>流年</strong>：每年变化，影响当年具体运势吉凶</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-1"></div>
                                <span>大运与命局五行相生为吉，相克为凶</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1"></div>
                                <span>流年干支与日柱天克地冲需特别注意</span>
                              </div>
                              <div className="text-[10px] text-neutral-500 mt-3 pt-2 border-t border-neutral-800">
                                注：大运从{chart.personalInfo.analysis.yunNian.qiYunAge}岁开始，{chart.personalInfo.analysis.yunNian.direction}排。
                                流年以虚岁计算，红色标记为当前年份。
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                </>
              ) : (
                /* 降级模式下的简化信息显示 */
                <section className="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-2xl p-6 shadow-xl space-y-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-inner ${chart.personalInfo!.gender === '男' ? 'bg-blue-900/40 text-blue-400' : 'bg-pink-900/40 text-pink-400'}`}>
                      {chart.personalInfo!.gender}
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-white leading-none">{chart.personalInfo!.name || '用户'}</p>
                      <p className="text-xs text-neutral-300 font-mono">公历：{chart.personalInfo!.solarDate}</p>
                      <p className="text-xs text-neutral-400 font-mono">农历：{chart.personalInfo!.lunarDate}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl">
                    <div className="flex items-center gap-2 text-yellow-400 mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-semibold">降级模式说明</span>
                    </div>
                    <p className="text-sm text-yellow-300/80">
                      由于排盘过程中出现错误，八字分析、五行力量平衡、大运流年等高级功能暂时不可用。
                    </p>
                    <p className="text-xs text-yellow-300/60 mt-2">
                      请检查输入参数是否正确，或稍后重试。奇门排盘核心功能仍然可用。
                    </p>
                  </div>
                </section>
              )}
            </>
          ) : (
            // 未排盘时的等待状态
            <div className="h-[400px] flex flex-col items-center justify-center text-neutral-600 border-2 border-dashed border-neutral-800 rounded-3xl gap-4">
              <Compass className="w-16 h-16 opacity-50" />
              <p className="font-medium text-neutral-500">等待排盘...</p>
              <p className="text-xs text-neutral-600">填写信息后点击上方"开始排盘"按钮</p>
            </div>
          )}
        </div>
      </main>

      {/* 历史记录模态框 */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl max-h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-500">
                <History className="w-6 h-6" />
                <h2 className="text-xl font-bold">历法档案库</h2>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-20 text-neutral-500">暂无排盘存档记录</div>
              ) : (
                history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => handleLoadHistory(item)}
                    className="p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-2xl border border-neutral-700 cursor-pointer transition-all flex justify-between items-center group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{item.userName}</span>
                        <span className="text-[10px] bg-neutral-900 px-2 py-0.5 rounded text-neutral-500">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-400 line-clamp-1">{item.question}</p>
                      <div className="flex gap-4 text-xs text-neutral-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>排盘: {formatDisplayDate(item.eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>出生: {formatDisplayDate(item.birthDate)}</span>
                        </div>
                        <div className={`px-1 rounded ${item.gender === '男' ? 'bg-blue-900/50 text-blue-400' : 'bg-pink-900/50 text-pink-400'}`}>
                          {item.gender}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteHistory(item.id, e)} 
                      className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-900/20 rounded-full transition-all opacity-70 hover:opacity-100 group-hover:opacity-100"
                      title="删除记录"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 引导提问模态框 */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl max-h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-500">
                <HelpCircle className="w-6 h-6" />
                <h2 className="text-xl font-bold">引导提问助手</h2>
                <div className="text-xs bg-blue-900/50 text-blue-400 px-2 py-1 rounded-full">
                  步骤 {guideStep + 1}/7
                </div>
              </div>
              <button onClick={() => setShowGuideModal(false)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                {/* 进度条 */}
                <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
                    style={{ width: `${((guideStep + 1) / 7) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-neutral-400 text-center">
                  分步骤帮助您清晰描述问题，获得更准确的分析
                </p>
              </div>
              
              <div className="space-y-6">
                {/* 步骤1：选择类别 */}
                {guideStep === 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-2">您主要想咨询哪方面的问题？</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['事业', '财运', '感情', '健康', '学业', '其他'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setGuideData({...guideData, category: cat})}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            guideData.category === cat 
                              ? 'border-blue-500 bg-blue-900/20 text-blue-300' 
                              : 'border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:border-neutral-600'
                          }`}
                        >
                          <div className="font-bold text-center">{cat}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-neutral-500 mt-4">
                      💡 选择主要咨询方向，后续问题会根据此方向个性化引导
                    </p>
                  </div>
                )}
                
                {/* 步骤2：具体方面 */}
                {guideStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-2">具体是关于什么方面？</h3>
                    <textarea
                      placeholder="例如：工作晋升机会、创业计划、职业转型、投资理财、房地产投资、寻找对象、婚姻关系、健康状况、考试升学等..."
                      value={guideData.area}
                      onChange={(e) => setGuideData({...guideData, area: e.target.value})}
                      rows={3}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none resize-none"
                    />
                    <div className="text-sm text-neutral-400 space-y-1">
                      <p>🔍 请尽量具体描述，例如：</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>想了解<strong className="text-blue-400">今年下半年</strong>是否有升职机会</li>
                        <li>准备<strong className="text-blue-400">投资某个项目</strong>是否合适</li>
                        <li><strong className="text-blue-400">与某人的关系</strong>发展如何</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* 步骤3：当前情况 */}
                {guideStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-2">您目前的状况是怎样的？</h3>
                    <textarea
                      placeholder="请描述当前的实际情况，包括环境、状态、面临的挑战等..."
                      value={guideData.situation}
                      onChange={(e) => setGuideData({...guideData, situation: e.target.value})}
                      rows={4}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none resize-none"
                    />
                    <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-800/50">
                      <p className="text-sm text-blue-300 font-bold mb-1">💡 提示：当前状况应该包括</p>
                      <ul className="text-xs text-blue-200/80 space-y-1">
                        <li>• 所处环境：工作单位、家庭环境、居住地等</li>
                        <li>• 当前状态：职位、收入、健康状况、感情状态等</li>
                        <li>• 面临的问题：具体困难、挑战、阻碍等</li>
                        <li>• 现有资源：人脉、资金、技能等优势</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* 步骤4：过往经历 */}
                {guideStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-2">过去在这方面有什么相关经历？</h3>
                    <textarea
                      placeholder="可以描述过去的尝试、经验、成功或失败的经历..."
                      value={guideData.pastExperience}
                      onChange={(e) => setGuideData({...guideData, pastExperience: e.target.value})}
                      rows={4}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none resize-none"
                    />
                    <div className="text-sm text-neutral-400">
                      <p>📚 过往经历有助于分析问题模式和趋势，例如：</p>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>之前是否尝试过类似的事情？结果如何？</li>
                        <li>有没有什么特殊的经历或转折点？</li>
                        <li>之前是否咨询过其他人或尝试过其他方法？</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* 步骤5：期望结果 */}
                {guideStep === 4 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-2">您希望达成什么样的结果？</h3>
                    <textarea
                      placeholder="请描述您期望达到的目标或想要的结果..."
                      value={guideData.expectation}
                      onChange={(e) => setGuideData({...guideData, expectation: e.target.value})}
                      rows={4}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none resize-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setGuideData({...guideData, expectation: '希望能顺利解决问题，消除障碍'})}
                        className="p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:bg-neutral-700/50 transition-colors"
                      >
                        解决问题
                      </button>
                      <button
                        onClick={() => setGuideData({...guideData, expectation: '希望把握机会，获得更好的发展'})}
                        className="p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:bg-neutral-700/50 transition-colors"
                      >
                        把握机会
                      </button>
                      <button
                        onClick={() => setGuideData({...guideData, expectation: '希望能做出正确的决策选择'})}
                        className="p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:bg-neutral-700/50 transition-colors"
                      >
                        决策选择
                      </button>
                      <button
                        onClick={() => setGuideData({...guideData, expectation: '希望能了解趋势，提前做好准备'})}
                        className="p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:bg-neutral-700/50 transition-colors"
                      >
                        趋势预判
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 步骤6：时间范围 */}
                {guideStep === 5 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-2">您关心的时间范围是？</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {['短期（3个月内）', '中期（3-12个月）', '长期（1年以上）'].map((time) => (
                        <button
                          key={time}
                          onClick={() => setGuideData({...guideData, timeframe: time})}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            guideData.timeframe === time 
                              ? 'border-purple-500 bg-purple-900/20 text-purple-300' 
                              : 'border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:border-neutral-600'
                          }`}
                        >
                          <div className="font-bold text-center">{time}</div>
                        </button>
                      ))}
                    </div>
                    <div className="text-sm text-neutral-500 mt-4">
                      <p>⏰ 时间范围会影响分析的侧重点：</p>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>短期</strong>：关注近期具体行动和决策</li>
                        <li><strong>中期</strong>：关注机会把握和趋势判断</li>
                        <li><strong>长期</strong>：关注战略规划和基础建设</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* 步骤7：其他细节 */}
                {guideStep === 6 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-2">还有其他需要补充的信息吗？</h3>
                    <textarea
                      placeholder="可以补充任何您认为重要的信息，或特殊关注点..."
                      value={guideData.details}
                      onChange={(e) => setGuideData({...guideData, details: e.target.value})}
                      rows={4}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none resize-none"
                    />
                    
                    {/* 问题预览 */}
                    <div className="mt-6 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700">
                      <h4 className="text-sm font-bold text-neutral-300 mb-2">📋 您的问题总结预览：</h4>
                      <div className="text-xs text-neutral-400 space-y-1">
                        <p><strong>类别：</strong>{guideData.category}</p>
                        <p><strong>方面：</strong>{guideData.area || '未指定'}</p>
                        <p><strong>当前：</strong>{guideData.situation ? `${guideData.situation.substring(0, 80)}...` : '未描述'}</p>
                        <p><strong>期望：</strong>{guideData.expectation || '未指定'}</p>
                        <p><strong>时间：</strong>{guideData.timeframe}</p>
                      </div>
                    </div>
                    
                    <div className="text-sm text-neutral-500 mt-4">
                      <p>✨ 所有信息已收集完成！点击"生成问题"会自动整理成清晰的问题描述。</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-neutral-800 flex justify-between items-center">
              <div>
                {guideStep > 0 && (
                  <button
                    onClick={() => setGuideStep(guideStep - 1)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-400 transition-colors"
                  >
                    上一步
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-400 transition-colors"
                >
                  取消
                </button>
                
                {guideStep < 6 ? (
                  <button
                    onClick={() => {
                      // 简单的验证
                      if (guideStep === 0 && !guideData.category) {
                        alert('请选择一个咨询类别');
                        return;
                      }
                      if (guideStep === 1 && !guideData.area.trim()) {
                        alert('请描述具体方面');
                        return;
                      }
                      if (guideStep === 2 && !guideData.situation.trim()) {
                        alert('请描述当前状况');
                        return;
                      }
                      setGuideStep(guideStep + 1);
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg transition-all hover:opacity-90"
                  >
                    下一步
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // 生成整理后的问题
                      const generatedQuestion = generateQuestionFromGuide(guideData);
                      setQuestion(generatedQuestion);
                      setShowGuideModal(false);
                      setGuideStep(0);
                      setGuideData(resetGuideData());
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg transition-all hover:opacity-90"
                  >
                    生成问题并应用
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-red-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-red-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">确认删除</h2>
                  <p className="text-sm text-neutral-400 mt-1">此操作不可恢复，请谨慎操作</p>
                </div>
              </div>
              <p className="text-neutral-300">
                确定要永久删除这条排盘记录吗？删除后将无法恢复。
              </p>
            </div>
            <div className="p-6 flex justify-end gap-3">
              <button 
                onClick={cancelDelete}
                className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white font-medium transition-colors"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media screen { .no-export { display: flex; } }
      `}</style>
    </div>
  );
};

export default App;