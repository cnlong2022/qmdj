import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, MessageSquare, Compass, Send, Loader2, Info, User, Clock, Shield, Sparkles, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { marked } from 'marked';
import QiMenChart from './components/QiMenChart';
import { plotChart, getTenGodLabel } from './services/qiMenEngine';
import { analyzeQiMen } from './services/geminiService';
import { loadSolarTermsFromFile } from './services/solarTermParser';
import { analyzeBaziCore } from './services/analysisService';
import { 
  formatSinglePillar as formatPillar,
} from './services/qiMenEngine';
import { 
  buildBaziVisualizationData,
  calculateElementTotals,
  generateElementRelationsText,
  formatPillarContribution
} from './services/baziVisualization';
import { ChartResult, PillarDetail, ElementScoreDetails } from './types';
  marked.setOptions({
    gfm: true,
    breaks: true,
  });
const parseAsBeijing = (dateStr: string) => {
  if (!dateStr) return new Date();
  
  try {
    // 方案1：使用标准ISO格式，显式指定时区
    const date = new Date(dateStr + '+08:00');
    
    // 验证日期有效性
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date string');
    }
    
    return date;
  } catch (error) {
    console.warn('Failed to parse date with timezone, falling back to local time:', error);
    
    // 回退方案：使用本地时间解析，然后手动调整到北京时间
    const localDate = new Date(dateStr);
    
    // 如果本地不是UTC+8，手动调整
    const localOffset = localDate.getTimezoneOffset(); // 分钟
    const beijingOffset = -480; // 北京时区偏移（分钟）
    const offsetDiff = beijingOffset - localOffset;
    
    return new Date(localDate.getTime() + offsetDiff * 60000);
  }
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
  '木': '#10b981', // emerald-500
  '火': '#ef4444', // red-500
  '土': '#ca8a04', // yellow-600
  '金': '#fbbf24', // amber-400
  '水': '#3b82f6'  // blue-500
};


const STEM_ELEMENT_COLORS: Record<string, string> = {
  '甲': 'text-emerald-500', '乙': 'text-emerald-500',
  '丙': 'text-red-500', '丁': 'text-red-500',
  '戊': 'text-yellow-600', '己': 'text-yellow-600',
  '庚': 'text-amber-400', '辛': 'text-amber-400',
  '壬': 'text-blue-500', '癸': 'text-blue-500'
};

const App: React.FC = () => {
  const [eventDate, setEventDate] = useState<string>(getLocalISO(new Date()));
  const [userName, setUserName] = useState<string>('');
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [birthDate, setBirthDate] = useState<string>(getLocalISO(new Date(1990, 0, 1, 9, 30)));
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
  // 新增：控制是否显示排盘结果
  const [showChartResult, setShowChartResult] = useState<boolean>(false);

const checkDataAvailability = async (maxRetries = 3): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 尝试加载节气数据
      await loadSolarTermsFromFile();
      return true;
    } catch (error) {
      console.warn(`数据加载尝试 ${i + 1}/${maxRetries} 失败:`, error);
      
      if (i < maxRetries - 1) {
        // 等待指数退避时间后重试
        await new Promise(resolve => 
          setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 10000))
        );
      }
    }
  }
  return false;
};

// 修改初始化逻辑
useEffect(() => {
  const initData = async () => {
    try {
      const success = await checkDataAvailability();
      
      if (success) {
        console.log('节气数据加载成功');
      } else {
        console.warn('节气数据加载失败，使用降级模式');
        setDataError(true);
        // 可以在这里加载本地缓存或默认数据
      }
      
      // 无论如何，都标记数据就绪，允许用户使用基础功能
      setDataReady(true);
      
    } catch (error) {
      console.error('数据初始化失败:', error);
      setDataError(true);
      setDataReady(true); // 强制进入可用状态
    } finally {
      setLoading(false);
    }
  };
  
  initData();
}, []);
  const [showBaziAdviceDetails, setShowBaziAdviceDetails] = useState<boolean>(false);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState<boolean>(true);
  const handleCalculate = useCallback(() => {
    if (!dataReady) return;
    setLoading(true);
    try {
      const eDate = parseAsBeijing(eventDate);
      const bDate = parseAsBeijing(birthDate);
      const result = plotChart(eDate, userName, gender, bDate);
      setChart(result);
      setAnalysis('');
      setShowChartResult(true); // 新增：显示排盘结果
      
      // 生成八字分析和建议
      if (result.personalInfo) {
        const baziAnalysis = analyzeBaziCore(result.personalInfo.analysis);
        setBaziAdvice(baziAnalysis.advice);
        
        // 生成可视化数据
        const vizData = buildBaziVisualizationData(result.personalInfo.analysis);
        setVisualizationData(vizData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  }, [dataReady, eventDate, userName, gender, birthDate]);

  // 移除自动排盘的useEffect
  // 不再自动调用handleCalculate

  const handleAnalyze = async () => {
    if (!chart || !question) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeQiMen(chart, question);
      setAnalysis(result);
    } catch (err) {
      setAnalysis("分析失败，请检查网络或密钥。");
    } finally {
      setIsAnalyzing(false);
    }
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

  // 获取五行得分详情
  const scoreDetails = chart?.personalInfo?.analysis.elementScoreDetails;

  // 生成动态四柱详细贡献
const dynamicPillarDetails = chart?.personalInfo?.analysis.pillars ? [
  formatPillarContribution(chart.personalInfo.analysis.pillars.year, '年柱', chart.personalInfo.analysis.emptyBranches),
  formatPillarContribution(chart.personalInfo.analysis.pillars.month, '月柱', chart.personalInfo.analysis.emptyBranches),
  formatPillarContribution(chart.personalInfo.analysis.pillars.day, '日柱', chart.personalInfo.analysis.emptyBranches),
  formatPillarContribution(chart.personalInfo.analysis.pillars.hour, '时柱', chart.personalInfo.analysis.emptyBranches)
] : null;

  // 计算五行总分和百分比
  const elementTotals = scoreDetails ? calculateElementTotals(scoreDetails) : null;

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

  // 五行分布图组件 - 使用SVG绘制饼图
  const ElementDistributionChart = ({ scoreDetails }: { scoreDetails: any }) => {
    if (!scoreDetails) return null;
    
    // 转换为数组并排序，确保绘制顺序一致
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
    
    // 计算百分比
    const chartData = data.map((item: any) => ({
      ...item,
      percentage: (item.value / total) * 100
    }));
    
    return (
      <div className="mt-4">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">五行分布图</h4>
        <div className="flex items-center justify-center h-40">
          <div className="relative w-32 h-32">
            {/* 使用 SVG 绘制饼图 */}
            <svg width="128" height="128" viewBox="0 0 32 32" className="transform -rotate-90">
              {(() => {
                let cumulativePercentage = 0;
                return chartData.map((item: any) => {
                  const percentage = item.percentage;
                  const startAngle = cumulativePercentage * 3.6;
                  const endAngle = (cumulativePercentage + percentage) * 3.6;
                  
                  // 计算圆弧路径
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
              {/* 中心圆 */}
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
            {loading && <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-yellow-500">
              <Clock className="w-5 h-5" />
              <h2 className="font-bold">排盘配置</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1 ml-1 font-bold uppercase tracking-wider">排盘时刻 (事发时间)</label>
                <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all text-sm font-mono"/>
              </div>
              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <MessageSquare className="w-5 h-5" />
                <h2 className="font-bold">咨询提问</h2>
              </div>
              <textarea placeholder="描述您想询问的具体事项（例如：近日财运、事业发展方向等）..." value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none text-base"/>
              <div className="pt-2 border-t border-neutral-800">
                <div className="flex gap-4 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-500 mb-1 ml-1 font-medium">姓名</label>
                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="姓名" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-white text-sm"/>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1 ml-1 font-medium">性别</label>
                    <div className="flex bg-neutral-800 border border-neutral-700 rounded-xl p-1">
                      <button onClick={() => setGender('男')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${gender === '男' ? 'bg-blue-600 text-white' : 'text-neutral-500'}`}>男</button>
                      <button onClick={() => setGender('女')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${gender === '女' ? 'bg-pink-600 text-white' : 'text-neutral-500'}`}>女</button>
                    </div>
                  </div>
                </div>
                <label className="block text-xs text-neutral-500 mb-1 ml-1 font-bold uppercase tracking-wider">出生时刻 (用于八字分析)</label>
                <input type="datetime-local" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none text-sm font-mono"/>
              </div>
              <button onClick={handleCalculate} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2">
                {showChartResult ? '重新排盘' : '开始排盘'}
              </button>
            </div>
          </section>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {/* 条件渲染：只在点击排盘后显示结果 */}
          
          {showChartResult && chart && chart.personalInfo ? (
            <>
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-6 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]"></span>
                  <h2 className="text-xl font-bold text-white">时家奇门排盘</h2>
                </div>
                <QiMenChart chart={chart} />
              </section>

              <section className="bg-neutral-900/40 border border-neutral-700/50 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                <div className="flex justify-center mt-4">
                  <button onClick={handleAnalyze} disabled={isAnalyzing || !question} className={`px-10 py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${isAnalyzing || !question ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95'}`}>
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-4 h-4" /> AI 宗师深度解盘</>}
                  </button>
                </div>
              </section>

            {analysis && !isAnalyzing && (
              <section className="bg-neutral-900/60 border border-neutral-700/50 rounded-2xl p-6 mt-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-blue-400 w-5 h-5" />
                    <h3 className="text-lg font-bold text-blue-400 tracking-tight">宗师解析天机</h3>
                  </div>
                </div>
                
                {showAnalysisDetails && (
                  <div className="prose prose-invert max-w-none prose-emerald">
                    <div 
                      className="text-neutral-300 leading-relaxed font-serif"
                      dangerouslySetInnerHTML={{ __html: marked.parse(analysis) }}
                    />
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

              <section className="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex flex-wrap gap-y-6 items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-inner ${chart.personalInfo.gender === '男' ? 'bg-blue-900/40 text-blue-400' : 'bg-pink-900/40 text-pink-400'}`}>{chart.personalInfo.gender}</div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-white leading-none">{chart.personalInfo.name || '测算人'}</p>
                      <p className="text-xs text-neutral-300 font-mono">公历：{chart.personalInfo.solarDate}</p>
                      <p className="text-xs text-neutral-400 font-mono">农历：{chart.personalInfo.lunarDate}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    {['year', 'month', 'day', 'hour'].map((key) => {
                      const pillar = chart.personalInfo!.analysis.pillars[key as keyof typeof chart.personalInfo.analysis.pillars];
                      return (
                        <div key={key} className="flex flex-col items-center gap-1">
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
                    <span className={`text-sm font-bold ${ELEMENT_TEXT_COLORS[chart.personalInfo.analysis.dayMasterElement]}`}>{chart.personalInfo.analysis.dayMasterElement}命</span>
                  </div>
                   <div className="flex items-center gap-2">
                    <span className="bg-emerald-950 text-orange-400 px-2 py-0.5 rounded border border-emerald-800/50 font-bold">旺衰</span>
                    <span className={`text-sm font-bold ${chart.personalInfo.analysis.strength === '身强' ? 'text-orange-500' : chart.personalInfo.analysis.strength === '身弱' ? 'text-blue-400' : 'text-green-400'}`}>{chart.personalInfo.analysis.strength}</span>
                  </div>
                   <div className="flex items-center gap-2">
                     <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/50 font-bold">用神</span>
                     <span className="text-neutral-300 font-medium">{chart.personalInfo.analysis.yongShen.join(' ')}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="bg-blue-950 text-blue-400 px-2 py-0.5 rounded border border-blue-800/50 font-bold">喜神</span>
                     <span className="text-neutral-300 font-medium">{chart.personalInfo.analysis.xiShen.join(' ')}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-800/50 font-bold">忌神</span>
                     <span className="text-neutral-300 font-medium">{chart.personalInfo.analysis.jiShen.join(' ')}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="bg-purple-950 text-purple-400 px-2 py-0.5 rounded border border-purple-800/50 font-bold">调候</span>
                     <span className="text-neutral-300 font-medium">{chart.personalInfo.analysis.tiaoHouShen.join(' ')}</span>
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
            {showChartResult && baziAdvice.length > 0 && (
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
                        // 检查是否为标题行（包含【】）
                        const isTitle = advice.includes('【') && advice.includes('】');
                        // 检查是否为分隔空行（只有空字符）
                        const isEmptyLine = advice.trim() === '';
                        
                        // 如果是分隔空行，只渲染空div
                        if (isEmptyLine) {
                          return <div key={index} className="h-3"></div>;
                        }
                        
                        // 如果是标题行，不需要蓝点
                        if (isTitle) {
                          return (
                            <div key={index} className="mt-4 mb-2">
                              <p className="text-sm font-bold text-blue-400 leading-relaxed">
                                {advice}
                              </p>
                            </div>
                          );
                        }
                        
                        // 普通建议行，带蓝点
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

            </>
          ) : (
            // 未排盘时的等待状态
            <div className="h-[400px] flex flex-col items-center justify-center text-neutral-600 border-2 border-dashed border-neutral-800 rounded-3xl gap-4">
              <Compass className="w-16 h-16 text-neutral-700 opacity-50" />
              <p className="font-medium text-neutral-500">等待排盘...</p>
              <p className="text-xs text-neutral-600">填写信息后点击上方"开始排盘"按钮</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;