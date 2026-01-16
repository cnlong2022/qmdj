import React, { useState } from 'react';
import { ChartResult, PalaceData } from '../types';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  chart: ChartResult;
  gregorianTime?: string; // 新增：公历时间
  lunarTime?: string;     // 新增：农历时间
}

// 地支对应的宫位
const BRANCH_PALACE_MAP: Record<string, number> = {
  '子': 1, // 坎一宫
  '丑': 8, // 艮八宫
  '寅': 8, // 艮八宫
  '卯': 3, // 震三宫
  '辰': 4, // 巽四宫
  '巳': 4, // 巽四宫
  '午': 9, // 离九宫
  '未': 2, // 坤二宫
  '申': 2, // 坤二宫
  '酉': 7, // 兑七宫
  '戌': 6, // 乾六宫
  '亥': 6, // 乾六宫
};

const getXunShou = (dayStem: string, dayBranch: string): string => {
  // 根据日柱干支计算旬首
  const stemIndex = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].indexOf(dayStem);
  const branchIndex = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].indexOf(dayBranch);
  
  if (stemIndex === -1 || branchIndex === -1) return '未知';
  
  // 计算当前干支距离上一个甲日的距离
  let distanceToJia = stemIndex;
  
  // 计算旬首地支索引
  let xunShouBranchIdx = (branchIndex - distanceToJia + 12) % 12;
  
  // 旬首地支
  const xunShouBranch = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'][xunShouBranchIdx];
  
  // 旬首天干总是甲
  return `甲${xunShouBranch}`;
};

// 宫位对应的主要地支
const PALACE_BRANCH_MAP: Record<number, string[]> = {
  1: ['子'],
  2: ['未', '申'],
  3: ['卯'],
  4: ['辰', '巳'],
  5: [], // 中五宫无地支
  6: ['戌', '亥'],
  7: ['酉'],
  8: ['丑', '寅'],
  9: ['午'],
};

const getFortuneColorClass = (name: string): string => {
  const good = ["开门", "休门", "生门", "天辅", "天任", "天心", "值符", "太阴", "六合", "九天"];
  const bad = ["死门", "惊门", "伤门", "天芮", "天蓬", "白虎", "玄武", "螣蛇"];
  if (good.some(g => name.includes(g))) return 'text-emerald-400 font-bold';
  if (bad.some(b => name.includes(b))) return 'text-red-400 font-bold';
  return 'text-neutral-300';
};

// 计算驿马地支
const getHorseBranch = (hourBranch: string): string => {
  const horseMap: Record<string, string> = {
    '申': '寅', '子': '寅', '辰': '寅',
    '寅': '申', '午': '申', '戌': '申',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '亥': '巳', '卯': '巳', '未': '巳'
  };
  return horseMap[hourBranch] || '';
};

// 计算空亡地支
// 计算空亡地支
const getEmptyBranches = (dayStem: string, dayBranch: string): string[] => {
  // 首先，我们需要根据日柱干支确定旬首
  
  // 天干索引
  const stemIndex = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].indexOf(dayStem);
  // 地支索引
  const branchIndex = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].indexOf(dayBranch);
  
  if (stemIndex === -1 || branchIndex === -1) {
    console.warn(`无效的干支: ${dayStem}${dayBranch}`);
    return [];
  }
  
  // 计算旬首（找到天干为甲的组合）
  // 公式：从当前干支向前推，直到天干为甲
  // 当前干支的序号 = stemIndex * 12 + branchIndex（简化计算）
  
  // 更直接的方法：使用预定义的旬首映射表
  const xunShouMap: Record<string, { xunShou: string, empty: string[] }> = {
    // 甲子旬
    '甲子': { xunShou: '甲子', empty: ['戌', '亥'] },
    '乙丑': { xunShou: '甲子', empty: ['戌', '亥'] },
    '丙寅': { xunShou: '甲子', empty: ['戌', '亥'] },
    '丁卯': { xunShou: '甲子', empty: ['戌', '亥'] },
    '戊辰': { xunShou: '甲子', empty: ['戌', '亥'] },
    '己巳': { xunShou: '甲子', empty: ['戌', '亥'] },
    '庚午': { xunShou: '甲子', empty: ['戌', '亥'] },
    '辛未': { xunShou: '甲子', empty: ['戌', '亥'] },
    '壬申': { xunShou: '甲子', empty: ['戌', '亥'] },
    '癸酉': { xunShou: '甲子', empty: ['戌', '亥'] },
    
    // 甲戌旬
    '甲戌': { xunShou: '甲戌', empty: ['申', '酉'] },
    '乙亥': { xunShou: '甲戌', empty: ['申', '酉'] },
    '丙子': { xunShou: '甲戌', empty: ['申', '酉'] },
    '丁丑': { xunShou: '甲戌', empty: ['申', '酉'] },
    '戊寅': { xunShou: '甲戌', empty: ['申', '酉'] },
    '己卯': { xunShou: '甲戌', empty: ['申', '酉'] },
    '庚辰': { xunShou: '甲戌', empty: ['申', '酉'] },
    '辛巳': { xunShou: '甲戌', empty: ['申', '酉'] },
    '壬午': { xunShou: '甲戌', empty: ['申', '酉'] },
    '癸未': { xunShou: '甲戌', empty: ['申', '酉'] },
    
    // 甲申旬
    '甲申': { xunShou: '甲申', empty: ['午', '未'] },
    '乙酉': { xunShou: '甲申', empty: ['午', '未'] },
    '丙戌': { xunShou: '甲申', empty: ['午', '未'] },
    '丁亥': { xunShou: '甲申', empty: ['午', '未'] },
    '戊子': { xunShou: '甲申', empty: ['午', '未'] },
    '己丑': { xunShou: '甲申', empty: ['午', '未'] },
    '庚寅': { xunShou: '甲申', empty: ['午', '未'] },
    '辛卯': { xunShou: '甲申', empty: ['午', '未'] },
    '壬辰': { xunShou: '甲申', empty: ['午', '未'] },
    '癸巳': { xunShou: '甲申', empty: ['午', '未'] },
    
    // 甲午旬
    '甲午': { xunShou: '甲午', empty: ['辰', '巳'] },
    '乙未': { xunShou: '甲午', empty: ['辰', '巳'] },
    '丙申': { xunShou: '甲午', empty: ['辰', '巳'] },
    '丁酉': { xunShou: '甲午', empty: ['辰', '巳'] },
    '戊戌': { xunShou: '甲午', empty: ['辰', '巳'] },
    '己亥': { xunShou: '甲午', empty: ['辰', '巳'] },
    '庚子': { xunShou: '甲午', empty: ['辰', '巳'] },
    '辛丑': { xunShou: '甲午', empty: ['辰', '巳'] },
    '壬寅': { xunShou: '甲午', empty: ['辰', '巳'] },
    '癸卯': { xunShou: '甲午', empty: ['辰', '巳'] },
    
    // 甲辰旬
    '甲辰': { xunShou: '甲辰', empty: ['寅', '卯'] },
    '乙巳': { xunShou: '甲辰', empty: ['寅', '卯'] },
    '丙午': { xunShou: '甲辰', empty: ['寅', '卯'] },
    '丁未': { xunShou: '甲辰', empty: ['寅', '卯'] },
    '戊申': { xunShou: '甲辰', empty: ['寅', '卯'] },
    '己酉': { xunShou: '甲辰', empty: ['寅', '卯'] },
    '庚戌': { xunShou: '甲辰', empty: ['寅', '卯'] },
    '辛亥': { xunShou: '甲辰', empty: ['寅', '卯'] },
    '壬子': { xunShou: '甲辰', empty: ['寅', '卯'] },
    '癸丑': { xunShou: '甲辰', empty: ['寅', '卯'] },
    
    // 甲寅旬
    '甲寅': { xunShou: '甲寅', empty: ['子', '丑'] },
    '乙卯': { xunShou: '甲寅', empty: ['子', '丑'] },
    '丙辰': { xunShou: '甲寅', empty: ['子', '丑'] },
    '丁巳': { xunShou: '甲寅', empty: ['子', '丑'] },
    '戊午': { xunShou: '甲寅', empty: ['子', '丑'] },
    '己未': { xunShou: '甲寅', empty: ['子', '丑'] },
    '庚申': { xunShou: '甲寅', empty: ['子', '丑'] },
    '辛酉': { xunShou: '甲寅', empty: ['子', '丑'] },
    '壬戌': { xunShou: '甲寅', empty: ['子', '丑'] },
    '癸亥': { xunShou: '甲寅', empty: ['子', '丑'] }
  };
  
  const key = `${dayStem}${dayBranch}`;
  const result = xunShouMap[key];
  
  if (!result) {
    console.warn(`未找到干支 ${key} 的空亡信息`);
    return [];
  }
  
  return result.empty;
};

// 检查地支是否在宫位中
const isBranchInPalace = (branch: string, palaceId: number): boolean => {
  return PALACE_BRANCH_MAP[palaceId]?.includes(branch) || false;
};

// 获取节气类型对应的颜色
const getTermTypeColor = (termType: string | undefined): string => {
  if (!termType) return 'text-neutral-300';
  return termType === '节' ? 'text-orange-400' : 'text-blue-400';
};

// 获取元数对应的颜色
const getYuanColor = (yuan: string | undefined): string => {
  if (!yuan) return 'text-neutral-300';
  switch(yuan) {
    case '上元': return 'text-green-400';
    case '中元': return 'text-yellow-400';
    case '下元': return 'text-red-400';
    default: return 'text-neutral-300';
  }
};

// 获取验证状态对应的颜色
const getVerificationColor = (status: string | undefined): string => {
  if (!status) return 'text-neutral-300';
  switch(status) {
    case '精确': return 'text-green-400';
    case '近似': return 'text-yellow-400';
    case '错误': return 'text-red-400';
    default: return 'text-neutral-300';
  }
};

const QiMenChart: React.FC<Props> = ({ chart, gregorianTime, lunarTime }) => {
  // 防御性检查
  if (!chart) {
    return (
      <div className="p-8 text-center text-yellow-500">
        图表数据为空，无法渲染
      </div>
    );
  }
  
  // 解构时提供完整默认值
  const {
    params = {
      yearSB: { stem: '?', branch: '?' },
      monthSB: { stem: '?', branch: '?' },
      daySB: { stem: '?', branch: '?' },
      hourSB: { stem: '?', branch: '?' },
      solarTerm: '未知',
      dunJu: '未知',
      isYang: true,
      juNum: 1
    },
    palaces = [],
    zhiFu = '未知',
    zhiShi = '未知',
    xunShou = '未知',
    personalInfo
  } = chart;
  
  // 修复：统一使用解构后的变量
  const hourBranch = params.hourSB.branch;
  const dayBranch = params.daySB.branch;
  
  const visualOrder = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  const [showKeyInfo, setShowKeyInfo] = useState<boolean>(false);
  
  // 计算驿马地支
  const horseBranch = getHorseBranch(hourBranch);
  // 计算空亡地支
  const emptyBranches = getEmptyBranches(params.daySB.stem, params.daySB.branch);
  
  const getPalace = (id: number) => palaces.find(p => p.id === id);
  
  // 获取宫位是否有驿马或空亡
  const getSpecialMark = (palaceId: number): { isHorse: boolean, isEmpty: boolean } => {
    const branches = PALACE_BRANCH_MAP[palaceId] || [];
    let isHorse = false;
    let isEmpty = false;
    
    branches.forEach(branch => {
      if (branch === horseBranch) isHorse = true;
      if (emptyBranches.includes(branch)) isEmpty = true;
    });
    
    return { isHorse, isEmpty };
  };

  // 获取节气详细信息
  const termDetail = {
    termType: params.termType,
    yuan: params.yuan,
    daysSinceTerm: params.daysSinceTerm,
    hoursSinceTerm: params.hoursSinceTerm,
    isExact: params.isExact,
    verification: params.verification,
    nextTerm: personalInfo?.termInfo?.next,
    daysToNext: personalInfo?.termInfo?.daysToNext,
    hoursToNext: personalInfo?.termInfo?.hoursToNext,
    isTransition: personalInfo?.termInfo?.isTransition
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-2">
      {/* 控制按钮区域 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowKeyInfo(!showKeyInfo)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors"
          >
            {showKeyInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showKeyInfo ? '隐藏关键信息' : '显示关键信息'}
          </button>
        </div>
        <div className="text-xs text-neutral-500">
          时家奇门 · {params.dunJu} · {params.isYang ? '阳遁' : '阴遁'}
        </div>
      </div>
      
      {/* 奇门遁甲盘 */}
      <div className="grid grid-cols-3 gap-1.5 bg-gradient-to-br from-neutral-900 to-neutral-950 p-3 rounded-2xl shadow-2xl border-2 border-neutral-700/50">
        {visualOrder.map(id => {
          const p = getPalace(id);
          const specialMark = getSpecialMark(id);
          
          if (!p) return <div key={id} className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 aspect-square"></div>;
          
          return (
            <div key={id} className="relative bg-gradient-to-br from-neutral-950 to-neutral-900 border-2 border-neutral-800 flex flex-col justify-between rounded-xl hover:bg-neutral-900/80 hover:border-neutral-700 transition-all duration-300 group shadow-inner aspect-square">
              {/* 宫名称 - 白色 */}
              <div className="absolute top-1 right-1 text-[10px] sm:text-xs md:text-sm text-white font-bold bg-neutral-800/70 px-1.5 py-0.5 rounded border border-neutral-700/50">
                {p.name}
              </div>
              
              {/* 左中位置：驿马和空亡标记 */}
              <div className="absolute left-1 top-1/2 transform -translate-y-1/2 flex flex-col items-start gap-1">
                {specialMark.isHorse && (
                  <div className="flex items-center justify-center animate-pulse">
                    <span className="text-[9px] sm:text-[10px] md:text-xs bg-gradient-to-r from-yellow-800 to-yellow-900 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-600/50 font-bold">
                      马
                    </span>
                  </div>
                )}
                {specialMark.isEmpty && (
                  <div className="flex items-center justify-center animate-pulse">
                    <span className="text-[9px] sm:text-[10px] md:text-xs bg-gradient-to-r from-purple-800 to-purple-900 text-purple-300 px-1.5 py-0.5 rounded border border-purple-600/50 font-bold">
                      空
                    </span>
                  </div>
                )}
              </div>
              
              {/* 八神 */}
              <div className={`pt-6 sm:pt-8 px-1 text-xs sm:text-sm md:text-base ${getFortuneColorClass(p.elements.god)} font-semibold`}>
                {p.elements.god}
              </div>

              {/* 中间核心：星、门 */}
              <div className="flex flex-col items-center justify-center flex-grow px-1">
                <div className={`text-sm sm:text-base md:text-lg ${getFortuneColorClass(p.elements.star)} font-bold`}>
                  {p.elements.star}
                </div>
                <div className={`text-base sm:text-lg md:text-xl ${getFortuneColorClass(p.elements.gate)} font-bold mt-0.5 sm:mt-1`}>
                  {p.elements.gate}
                </div>
              </div>

              {/* 天盘地盘 */}
              <div className="flex justify-end items-end pb-1 pr-1">
                <div className="flex flex-col items-center leading-none">
                  <span className="text-orange-400 text-sm sm:text-base md:text-lg font-bold">
                    {p.elements.tianPan}
                  </span>
                  <span className="text-neutral-400 text-xs sm:text-sm md:text-base font-medium">
                    {p.elements.diPan}
                  </span>
                </div>
              </div>
              
              {/* 宫位地支信息（悬停显示）- 固定在左下方 */}
              <div className="absolute left-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <div className="text-[8px] sm:text-[9px] text-neutral-400 bg-neutral-900/95 p-1.5 rounded-tr-lg border-t border-r border-neutral-700/50 backdrop-blur-sm">
                  {PALACE_BRANCH_MAP[id]?.map(branch => (
                    <div key={branch} className="flex items-center gap-1 mb-0.5 last:mb-0">
                      <span className="font-medium">{branch}</span>
                      {branch === horseBranch && (
                        <span className="text-yellow-400 font-bold text-[7px]">(马)</span>
                      )}
                      {emptyBranches.includes(branch) && (
                        <span className="text-purple-400 font-bold text-[7px]">(空)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 条件渲染关键信息栏 */}
      {showKeyInfo && (
        <>
          {/* 关键信息栏 */}
          <div className="mt-4 grid grid-cols-4 gap-2 text-[10px] sm:text-sm bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
            <div className="flex flex-col">
              <span className="text-neutral-500">值符</span>
              <span className="text-yellow-500 text-[14px] font-bold">{zhiFu}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-500">值使</span>
              <span className="text-emerald-500 text-[14px] font-bold">{zhiShi}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-500">旬首</span>
              <span className="text-orange-500 text-[14px] font-bold">{xunShou}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-500">局数</span>
              <span className="text-white text-[14px] font-bold">{params.dunJu}</span>
            </div>
            
            {/* 新增：排盘时间信息 */}
            <div className="col-span-4 mt-2 pt-2 border-t border-neutral-800">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 text-xs">排盘时间：</span>
                  <span className="text-blue-400 text-xs font-medium">
                    {gregorianTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 text-xs">农历时间：</span>
                  <span className="text-purple-400 text-xs font-medium">
                    {lunarTime}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 节气详细信息栏 */}
          <div className="mt-4 bg-gradient-to-r from-blue-900/20 to-blue-950/10 p-4 rounded-lg border border-blue-800/30">
            <div className="font-bold text-blue-300 mb-2 flex items-center">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full mr-2"></span>
              节气详细信息
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex flex-col">
                <span className="text-neutral-400 text-xs">节气名称</span>
                <span className="text-white font-medium">
                  {params.solarTerm} 
                  <span className={`ml-1 ${getTermTypeColor(termDetail.termType)}`}>
                    ({termDetail.termType || '未知'})
                  </span>
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-neutral-400 text-xs">元数</span>
                <span className={`font-bold ${getYuanColor(termDetail.yuan)}`}>
                  {termDetail.yuan || '未知'}
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-neutral-400 text-xs">距节气时间</span>
                <span className="text-white font-medium">
                  {termDetail.daysSinceTerm !== undefined ? `${termDetail.daysSinceTerm}天` : '未知'}
                  {termDetail.hoursSinceTerm !== undefined && termDetail.hoursSinceTerm > 0 && 
                    `${termDetail.hoursSinceTerm}时`
                  }
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-neutral-400 text-xs">计算精度</span>
                <span className={`font-bold ${getVerificationColor(termDetail.verification?.status)}`}>
                  {termDetail.verification?.status || (termDetail.isExact ? '精确' : '近似')}
                </span>
              </div>
            </div>
            
            {/* 显示验证消息 */}
            {termDetail.verification?.message && (
              <div className="mt-2 pt-2 border-t border-blue-800/50">
                <div className="text-xs text-neutral-400">
                  验证信息：<span className="text-blue-300 ml-1">{termDetail.verification.message}</span>
                </div>
              </div>
            )}
            
            {/* 显示下一个节气信息 */}
            {termDetail.nextTerm && (
              <div className="mt-3 pt-3 border-t border-blue-800/50">
                <div className="text-xs text-neutral-400">
                  下一个节气：
                  <span className="text-blue-300 ml-1">{termDetail.nextTerm}</span>
                  {termDetail.daysToNext !== null && (
                    <span className="ml-2">
                      （约
                      <span className="text-yellow-300 mx-1">
                        {termDetail.daysToNext}天
                        {termDetail.hoursToNext !== null && termDetail.hoursToNext > 0 && 
                          `${termDetail.hoursToNext}时`
                        }
                      </span>
                      后）
                    </span>
                  )}
                </div>
                {termDetail.isTransition && (
                  <div className="text-xs text-yellow-400 mt-1 flex items-center">
                    <span className="mr-1">⚠️</span>
                    节气交接期，能量转换中
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 驿马和空亡说明 */}
          <div className="mt-4 sm:mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-r from-yellow-900/20 to-yellow-950/10 rounded-xl border border-yellow-800/30">
              <div className="flex-shrink-0">
                <span className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-800 to-yellow-900 text-yellow-300 text-xs sm:text-sm flex items-center justify-center rounded-lg border border-yellow-600/50 shadow-lg">
                  马
                </span>
              </div>
              <div>
                <div className="font-bold text-yellow-300 mb-0.5 sm:mb-1">驿马</div>
                <div className="text-neutral-300 text-[11px] sm:text-sm">
                  时支 <span className="text-yellow-400 font-bold">{hourBranch}</span> → 
                  驿马在 <span className="text-yellow-400 font-bold">{horseBranch}</span>
                </div>
                <div className="text-neutral-400 text-[10px] sm:text-xs mt-0.5">
                  驿马主变动、出行、迁移之事
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-r from-purple-900/20 to-purple-950/10 rounded-xl border border-purple-800/30">
              <div className="flex-shrink-0">
                <span className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-800 to-purple-900 text-purple-300 text-xs sm:text-sm flex items-center justify-center rounded-lg border border-purple-600/50 shadow-lg">
                  空
                </span>
              </div>
              <div>
                <div className="font-bold text-purple-300 mb-0.5 sm:mb-1">空亡</div>
<div className="text-neutral-300 text-[11px] sm:text-sm">
  日柱 <span className="text-purple-400 font-bold">{params.daySB.stem}{dayBranch}</span> → 
  空亡在 <span className="text-purple-400 font-bold">{emptyBranches.join('、')}</span>
</div>
                <div className="text-neutral-400 text-[10px] sm:text-xs mt-0.5">
                  空亡主事不实、人不在、谋事落空
                </div>
              </div>
            </div>
          </div>
          
          {/* 宫位地支对应表 */}
          <div className="mt-4 sm:mt-6 bg-gradient-to-r from-neutral-900/80 to-neutral-950/80 p-3 sm:p-5 rounded-xl border border-neutral-800/50 shadow-xl">
            <div className="font-bold text-sm sm:text-lg mb-2 sm:mb-3 text-neutral-200 flex items-center">
              <span className="w-1.5 h-4 sm:w-2 sm:h-5 bg-emerald-500 rounded-full mr-1.5 sm:mr-2"></span>
              宫位地支对应
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5 sm:gap-3">
              <div className="p-1.5 sm:p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 hover:border-emerald-500/30 transition-colors">
                <div className="text-neutral-400 text-[9px] sm:text-xs mb-0.5 sm:mb-1">坎一宫</div>
                <div className="text-white font-bold text-xs sm:text-sm">子</div>
              </div>
              <div className="p-1.5 sm:p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 hover:border-emerald-500/30 transition-colors">
                <div className="text-neutral-400 text-[9px] sm:text-xs mb-0.5 sm:mb-1">坤二宫</div>
                <div className="text-white font-bold text-xs sm:text-sm">未申</div>
              </div>
              <div className="p-1.5 sm:p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 hover:border-emerald-500/30 transition-colors">
                <div className="text-neutral-400 text-[9px] sm:text-xs mb-0.5 sm:mb-1">震三宫</div>
                <div className="text-white font-bold text-xs sm:text-sm">卯</div>
              </div>
              <div className="p-1.5 sm:p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 hover:border-emerald-500/30 transition-colors">
                <div className="text-neutral-400 text-[9px] sm:text-xs mb-0.5 sm:mb-1">巽四宫</div>
                <div className="text-white font-bold text-xs sm:text-sm">辰巳</div>
              </div>
              <div className="p-1.5 sm:p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 hover:border-emerald-500/30 transition-colors">
                <div className="text-neutral-400 text-[9px] sm:text-xs mb-0.5 sm:mb-1">中五宫</div>
                <div className="text-neutral-500 italic text-xs sm:text-sm">无</div>
              </div>
              <div className="p-1.5 sm:p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 hover:border-emerald-500/30 transition-colors">
                <div className="text-neutral-400 text-[9px] sm:text-xs mb-0.5 sm:mb-1">乾六宫</div>
                <div className="text-white font-bold text-xs sm:text-sm">戌亥</div>
              </div>
              <div className="p-1.5 sm:p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 hover:border-emerald-500/30 transition-colors">
                <div className="text-neutral-400 text-[9px] sm:text-xs mb-0.5 sm:mb-1">兑七宫</div>
                <div className="text-white font-bold text-xs sm:text-sm">酉</div>
              </div>
              <div className="p-1.5 sm:p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 hover:border-emerald-500/30 transition-colors">
                <div className="text-neutral-400 text-[9px] sm:text-xs mb-0.5 sm:mb-1">艮八宫</div>
                <div className="text-white font-bold text-xs sm:text-sm">丑寅</div>
              </div>
              <div className="p-1.5 sm:p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 hover:border-emerald-500/30 transition-colors">
                <div className="text-neutral-400 text-[9px] sm:text-xs mb-0.5 sm:mb-1">离九宫</div>
                <div className="text-white font-bold text-xs sm:text-sm">午</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QiMenChart;