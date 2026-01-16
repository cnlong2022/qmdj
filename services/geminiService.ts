import {
  STEM_ELEMENTS,
  ELEMENT_RELATIONS,
  PALACE_NAMES
} from '../constants';

export const analyzeQiMen = async (chart: any, question: string): Promise<string> => {
  // 获取八字分析数据
  const analysis = chart.personalInfo?.analysis;
  
  // 新增：九星吉凶属性表
  const NINE_STARS_PROPS: Record<string, { luck: string, element: string, nature: string }> = {
    '天蓬': { luck: '大凶', element: '水', nature: '盗星' },
    '天芮': { luck: '大凶', element: '土', nature: '病星' },
    '天冲': { luck: '吉', element: '木', nature: '将星' },
    '天辅': { luck: '大吉', element: '木', nature: '文曲星' },
    '天禽': { luck: '大吉', element: '土', nature: '中央' },
    '芮禽': { luck: '中平', element: '土', nature: '合并' },
    '天心': { luck: '大吉', element: '金', nature: '武曲星' },
    '天柱': { luck: '凶', element: '金', nature: '破军星' },
    '天任': { luck: '吉', element: '土', nature: '左辅星' },
    '天英': { luck: '小凶', element: '火', nature: '右弼星' }
  };

  // 新增：八门吉凶属性表
  const EIGHT_GATES_PROPS: Record<string, { luck: string, suitable: string[], avoid: string[] }> = {
    '休门': { luck: '吉', suitable: ['休息', '谈判', '婚姻'], avoid: ['急事', '战斗'] },
    '生门': { luck: '大吉', suitable: ['求财', '生意', '建筑'], avoid: ['埋葬', '送葬'] },
    '伤门': { luck: '凶', suitable: ['捕猎', '索债'], avoid: ['出行', '婚姻'] },
    '杜门': { luck: '小凶', suitable: ['躲藏', '避难'], avoid: ['出行', '求财'] },
    '景门': { luck: '小吉', suitable: ['考试', '面试', '游玩'], avoid: ['诉讼', '争斗'] },
    '死门': { luck: '大凶', suitable: ['吊丧', '刑戮'], avoid: ['吉事', '婚姻'] },
    '惊门': { luck: '凶', suitable: ['诉讼', '博弈'], avoid: ['婚姻', '出行'] },
    '开门': { luck: '大吉', suitable: ['开业', '出行', '求官'], avoid: ['隐私', '阴谋'] }
  };

  // 新增：八神吉凶属性
  const EIGHT_GODS_PROPS: Record<string, { luck: string, influence: string }> = {
    '值符': { luck: '大吉', influence: '领导、贵人' },
    '螣蛇': { luck: '凶', influence: '虚惊、怪异' },
    '太阴': { luck: '吉', influence: '阴谋、策划' },
    '六合': { luck: '大吉', influence: '合作、婚姻' },
    '白虎': { luck: '凶', influence: '伤灾、官非' },
    '玄武': { luck: '凶', influence: '盗贼、欺骗' },
    '九地': { luck: '吉', influence: '稳定、持久' },
    '九天': { luck: '吉', influence: '发展、变动' }
  };

  // 新增：天盘地盘生克关系分析函数
  const analyzeTianDiRelation = (tianGan: string, diGan: string): string => {
    if (!tianGan || !diGan) return '无关系';
    
    const tianEl = (STEM_ELEMENTS as any)[tianGan] || '';
    const diEl = (STEM_ELEMENTS as any)[diGan] || '';
    
    if (!tianEl || !diEl) return '未知';
    
    if (tianEl === diEl) return '比和（力量增强）';
    
    // 检查生克关系
    const relations = (ELEMENT_RELATIONS as any)[tianEl];
    if (relations?.sheng === diEl) return '地盘生天盘（吉，得助力）';
    if (relations?.wasSheng === diEl) return '天盘生地盤（消耗，付出）';
    if (relations?.ke === diEl) return '天盘克地盘（主动克，劳心）';
    if (relations?.wasKe === diEl) return '地盘克天盘（受制，压力）';
    
    return '关系不明确';
  };

  // 新增：驿马详细解释
  const getMaBranchExplanation = (maBranches: string[]): string => {
    if (maBranches.length === 0) return '无驿马，主安稳，变动性小。';
    
    const explanations = maBranches.map(branch => {
      const palace = Object.entries(chart.personalInfo?.palaceBranches || {}).find(([_, branches]: [string, unknown]) => {
        // 类型断言 branches 为 string[]
        const branchArray = branches as string[];
        return branchArray.includes(branch);
      })?.[0] || '未知';
      
      return `${branch}（${palace}宫）：主变动、迁移、走动，临此宫位事多变动。`;
    });
    
    return explanations.join(' ');
  };

  // 新增：空亡详细分析
  const getEmptyBranchAnalysis = (emptyBranches: string[], palaceBranches: Record<number, string[]>): string => {
    const affectedPalaces: number[] = [];
    
    // 找出受空亡影响的宫位
    for (const [palaceStr, branches] of Object.entries(palaceBranches)) {
      const palace = parseInt(palaceStr);
      if ((branches as string[]).some(b => emptyBranches.includes(b))) {
        affectedPalaces.push(palace);
      }
    }
    
    if (affectedPalaces.length === 0) return '无宫位受空亡直接影响。';
    
    const palaceNames = affectedPalaces.map(p => {
      const palaceName = (PALACE_NAMES as any)[p as keyof typeof PALACE_NAMES];
      return palaceName || `第${p}宫`;
    }).join('、');
    
    return `空亡影响${palaceNames}，这些宫位的力量减弱，事情易落空，需加倍努力才能成事。`;
  };

  // 新增：节气交接期详细分析
  const getTermTransitionAnalysis = (termInfo: any): string => {
    if (!termInfo.isTransition) return '当前非节气交接期，气场稳定。';
    
    return `⚠️ **节气交接期注意事项**：
- 当前处于${termInfo.currentTerm}向${termInfo.nextTerm}过渡期
- 距下个节气：${termInfo.daysToNext}天${termInfo.hoursToNext}小时${termInfo.minutesToNext}分
- 交接期气场不稳定，大事宜暂缓
- 适合调整计划、清理整顿，不适合重大决策`;
  };

  // 构建大运流年信息（保持不变）
  let yunNianText = '';
  if (analysis?.yunNian) {
    const yn = analysis.yunNian;
    yunNianText = `
### 大运流年详情：
- **起运岁数**：${yn.qiYunAge}岁（${yn.qiYunDate}）
- **顺逆**：${yn.direction}行
- **当前大运**：${yn.daYun.find(d => d.isCurrent)?.pillar.stem || ''}${yn.daYun.find(d => d.isCurrent)?.pillar.branch || ''}（${yn.daYun.find(d => d.isCurrent)?.ageRange || ''}）
- **起运年份**：${new Date(chart.personalInfo.solarDate).getFullYear() + yn.qiYunAge - 1}年左右

### 当前及未来大运：
${yn.daYun.map((yun: any, index: number) => {
  const status = yun.isCurrent ? '🚩当前' : index < yn.daYun.findIndex((d: any) => d.isCurrent) ? '📜过去' : '🔮未来';
  return `${status} ${yun.decade}：${yun.pillar.stem}${yun.pillar.branch} ${yun.ageRange} ${yun.tenGod} ${yun.element}`;
}).join('\n')}

### 近年流年：
${yn.liuNian.map((nian: any) => {
  const special = nian.special ? `[${nian.special}]` : '';
  const clash = nian.clash ? `(${nian.clash})` : '';
  return `${nian.year}年（${nian.age}岁）：${nian.stemBranch.stem}${nian.stemBranch.branch} ${nian.tenGod} ${special} ${clash}`;
}).join('\n')}
`;
  }

  // 构建刑冲合害信息（保持不变）
  let xingChongHeHaiText = '';
  if (analysis?.pillars) {
    const pillars = analysis.pillars;
    const dayStem = analysis.dayMaster;
    const dayBranch = pillars.day.sb.branch;
    
    // 简单的刑冲合害分析
    const branches = [pillars.year.sb.branch, pillars.month.sb.branch, pillars.day.sb.branch, pillars.hour.sb.branch];
    const stems = [pillars.year.sb.stem, pillars.month.sb.stem, pillars.day.stem, pillars.hour.sb.stem];
    
    // 检查地支冲合
    const clashes: string[] = [];
    const combinations: string[] = [];
    
    // 地支六冲
    const branchClashes: Record<string, string> = {
      '子': '午', '午': '子',
      '丑': '未', '未': '丑',
      '寅': '申', '申': '寅',
      '卯': '酉', '酉': '卯',
      '辰': '戌', '戌': '辰',
      '巳': '亥', '亥': '巳'
    };
    
    // 地支六合
    const branchCombinations: Record<string, string> = {
      '子': '丑', '丑': '子',
      '寅': '亥', '亥': '寅',
      '卯': '戌', '戌': '卯',
      '辰': '酉', '酉': '辰',
      '巳': '申', '申': '巳',
      '午': '未', '未': '午'
    };
    
    // 检查冲合
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        if (branchClashes[branches[i]] === branches[j]) {
          clashes.push(`${branches[i]}冲${branches[j]}（${['年','月','日','时'][i]}柱冲${['年','月','日','时'][j]}柱）`);
        }
        if (branchCombinations[branches[i]] === branches[j]) {
          combinations.push(`${branches[i]}合${branches[j]}（${['年','月','日','时'][i]}柱合${['年','月','日','时'][j]}柱）`);
        }
      }
    }
    
    xingChongHeHaiText = `
### 刑冲合害分析：
${clashes.length > 0 ? `- **地支相冲**：${clashes.join('、')}` : '- 无显著地支相冲'}
${combinations.length > 0 ? `- **地支相合**：${combinations.join('、')}` : '- 无显著地支相合'}
- **日柱空亡**：${analysis.emptyBranches?.join('、') || '无'}
- **调候用神**：${analysis.tiaoHouShen?.join('、') || '无'}
`;
  }

  // 构建五行能量详细得分（保持不变）
  let elementScoreText = '';
  if (analysis?.elementScoreDetails) {
    const scores = analysis.elementScoreDetails;
    elementScoreText = `
### 五行能量得分详情：
${Object.entries(scores).map(([key, element]: [string, any]) => {
  const breakdown = element.breakdown;
  return `${element.name}：${element.value.toFixed(1)}分
  - 原始得分：天干${breakdown.rawStemScore.toFixed(1)} + 藏干${breakdown.rawHiddenScore.toFixed(1)} = ${breakdown.rawTotal.toFixed(1)}
  - 状态：${breakdown.state}（系数：${breakdown.coefficient.toFixed(1)}）
  - 调整后：${breakdown.adjustedScore.toFixed(1)}分`;
}).join('\n')}

### 五行强弱排序：
${Object.entries(scores)
  .sort((a: any, b: any) => b[1].value - a[1].value)
  .map(([key, element]: [string, any], index: number) => 
    `${index + 1}. ${element.name}（${element.value.toFixed(1)}分）`)
  .join('、')}
`;
  }

  // 🆕 新增：奇门盘详细分析
  let qiMenDetailedAnalysis = '';
  if (chart.palaces) {
    const palaceAnalysis = chart.palaces.map((palace: any) => {
      const starProp = NINE_STARS_PROPS[palace.elements.star] || { luck: '未知', element: '未知', nature: '未知' };
      const gateProp = EIGHT_GATES_PROPS[palace.elements.gate] || { luck: '未知', suitable: [], avoid: [] };
      const godProp = EIGHT_GODS_PROPS[palace.elements.god] || { luck: '未知', influence: '未知' };
      const tianDiRelation = analyzeTianDiRelation(palace.elements.tianPan, palace.elements.diPan);
      
      return `**${palace.name}**：
      🛡️神：${palace.elements.god || '--'}（${godProp.luck}，主${godProp.influence}）
      ⭐星：${palace.elements.star || '--'}（${starProp.luck}，${starProp.element}，${starProp.nature}）
      🚪门：${palace.elements.gate || '--'}（${gateProp.luck}，宜${gateProp.suitable.join('、')}，忌${gateProp.avoid.join('、')}）
      ☁️天盘：${palace.elements.tianPan || '--'} 🏔️地盘：${palace.elements.diPan || '--'}
      📊生克：${tianDiRelation}
      📈状态：${palace.elements.status || '--'}`;
    }).join('\n\n');
    
    qiMenDetailedAnalysis = `
### 🔮 奇门遁甲深度解析：

#### 值符值使分析：
- **值符星（领导）**：${chart.zhiFu}（${NINE_STARS_PROPS[chart.zhiFu]?.luck || '未知'}），主导整体趋势
- **值使门（执行）**：${chart.zhiShi}（${EIGHT_GATES_PROPS[chart.zhiShi]?.luck || '未知'}），主导具体行动
- **值符值使关系**：${analyzeTianDiRelation(
  chart.debugInfo?.tianPan?.[chart.debugInfo?.starMapping ? 
    Object.entries(chart.debugInfo.starMapping).find(([_, star]) => star === chart.zhiFu)?.[0] : '1'] || '',
  chart.debugInfo?.diPan?.[chart.debugInfo?.starMapping ? 
    Object.entries(chart.debugInfo.starMapping).find(([_, star]) => star === chart.zhiFu)?.[0] : '1'] || ''
)}

#### 驿马与空亡：
- **驿马地支**：${chart.personalInfo?.maBranches?.join('、') || '无'} 
  ${getMaBranchExplanation(chart.personalInfo?.maBranches || [])}
- **空亡地支**：${chart.personalInfo?.emptyBranches?.join('、') || '无'}
  ${getEmptyBranchAnalysis(chart.personalInfo?.emptyBranches || [], chart.personalInfo?.palaceBranches || {})}

#### 九宫详细信息：
${palaceAnalysis}`;
  }

  // 🆕 新增：节气交接期分析
  const termTransitionAnalysis = chart.personalInfo?.termInfo ? 
    getTermTransitionAnalysis(chart.personalInfo.termInfo) : '';

  // 构建个人信息描述（优化版）
  const personalData = chart.personalInfo 
    ? `## 命主核心信息

### 基本信息：
- **姓名**：${chart.personalInfo.name || '未提供'}
- **性别**：${chart.personalInfo.gender}
- **公历生日**：${chart.personalInfo.solarDate}
- **农历生日**：${chart.personalInfo.lunarDate}
- **八字四柱**：${chart.personalInfo.bazi}

### 八字四柱详情（含十神与空亡）：
${analysis?.pillars ? `
- **年柱**：${analysis.pillars.year.sb.stem}${analysis.pillars.year.sb.branch} 
  - 十神：${analysis.pillars.year.tenGod}
  - 藏干：${analysis.pillars.year.hiddenStems.join('、')}
  - 空亡：${analysis.pillars.year.isEmpty ? '是' : '否'}
- **月柱**：${analysis.pillars.month.sb.stem}${analysis.pillars.month.sb.branch}
  - 十神：${analysis.pillars.month.tenGod}
  - 藏干：${analysis.pillars.month.hiddenStems.join('、')}
  - 空亡：${analysis.pillars.month.isEmpty ? '是' : '否'}
- **日柱**：${analysis.pillars.day.sb.stem}${analysis.pillars.day.sb.branch}
  - 十神：${analysis.pillars.day.tenGod}
  - 藏干：${analysis.pillars.day.hiddenStems.join('、')}
  - 空亡：${analysis.pillars.day.isEmpty ? '是' : '否'}
- **时柱**：${analysis.pillars.hour.sb.stem}${analysis.pillars.hour.sb.branch}
  - 十神：${analysis.pillars.hour.tenGod}
  - 藏干：${analysis.pillars.hour.hiddenStems.join('、')}
  - 空亡：${analysis.pillars.hour.isEmpty ? '是' : '否'}
` : ''}

### 八字深度分析：
- **日主**：${analysis?.dayMaster || '未知'}（${analysis?.dayMasterElement || '未知'}命）
- **身强身弱**：${analysis?.strength || '未知'}
- **用神（最需要）**：${analysis?.yongShen?.join('、') || '未知'}
- **喜神（其次需要）**：${analysis?.xiShen?.join('、') || '未知'}
- **忌神（需要避免）**：${analysis?.jiShen?.join('、') || '未知'}

### 五行能量分布：
- **木**：${analysis?.elementEnergy?.wood || 0}%
- **火**：${analysis?.elementEnergy?.fire || 0}%
- **土**：${analysis?.elementEnergy?.earth || 0}%
- **金**：${analysis?.elementEnergy?.metal || 0}%
- **水**：${analysis?.elementEnergy?.water || 0}%

### 十神分布：
- **比劫**：${analysis?.tenGodDistribution?.['比劫'] || 0}%
- **印绶**：${analysis?.tenGodDistribution?.['印绶'] || 0}%
- **官杀**：${analysis?.tenGodDistribution?.['官杀'] || 0}%
- **财才**：${analysis?.tenGodDistribution?.['财才'] || 0}%
- **食伤**：${analysis?.tenGodDistribution?.['食伤'] || 0}%

### 旺相休囚死状态：
${analysis?.energyState ? `
- **木**：${analysis.energyState['木']}
- **火**：${analysis.energyState['火']}
- **土**：${analysis.energyState['土']}
- **金**：${analysis.energyState['金']}
- **水**：${analysis.energyState['水']}
` : ''}

${yunNianText}
${xingChongHeHaiText}
${elementScoreText}`
    : '个人信息未提供';

  // 构建奇门盘描述（增强版）
  const chartDescription = `
## 奇门遁甲排盘信息

### 排盘时间信息：
- **排盘时间**：${new Date().toLocaleString('zh-CN')}
- **节气**：${chart.params?.solarTerm || '未知'}
- **遁局**：${chart.params?.dunJu || '未知'}（${chart.params?.isYang ? '阳遁' : '阴遁'}${chart.params?.juNum || ''}局）
- **值符**：${chart.zhiFu || '未知'}
- **值使**：${chart.zhiShi || '未知'}
- **旬首**：${chart.xunShou || '未知'}
- **元数**：${chart.params?.yuan || '未知'}
- **精确度**：${chart.params?.verification?.status || '未知'}（${chart.params?.verification?.message || ''}）

### 四柱信息：
- **年柱**：${chart.params?.yearSB?.stem}${chart.params?.yearSB?.branch}
- **月柱**：${chart.params?.monthSB?.stem}${chart.params?.monthSB?.branch}
- **日柱**：${chart.params?.daySB?.stem}${chart.params?.daySB?.branch}
- **时柱**：${chart.params?.hourSB?.stem}${chart.params?.hourSB?.branch}

${termTransitionAnalysis}

${qiMenDetailedAnalysis}`;

  // 当前日期（用于时间规划）
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();

  const prompt = `
你是一位精通传统术数（奇门遁甲 + 四柱八字 + 大六壬 + 紫微斗数）的"宗师级专家"，拥有30年实战经验，尤其擅长命理与奇门综合实战应用。

## 📋 用户咨询问题
${question}

${personalData}

${chartDescription}

## 🎯 【宗师级综合深度解析框架】

### 第一层级：八字命理深度剖析（35%权重）
1. **日主旺衰精析** - 结合五行得分和旺相休囚死分析身强身弱
2. **格局层次定论** - 基于十神分布和四柱结构判断格局层次
3. **用神忌神实战** - 结合调候用神、五行能量给出具体建议
4. **刑冲合害实战** - 分析地支冲合、藏干互动对命局的影响
5. **五行平衡策略** - 基于五行得分和旺衰状态提出调候方案

### 第二层级：大运流年趋势分析（25%权重）
1. **当前大运分析** - 分析当前十年大运吉凶，结合八字用神
2. **流年应期判断** - 未来3-5年流年趋势预测，注意本命年、冲太岁
3. **关键时间节点** - 基于起运岁数、空亡年份判断关键年龄
4. **特殊年份预警** - 标注刑冲合害严重的年份

### 第三层级：奇门遁甲精准用神（30%权重）
1. **用神宫位锁定** - 基于问题定位关键宫位，考虑驿马、空亡
2. **星门神组合解析** - 分析值符值使的作用，结合吉凶属性
3. **天盘地盘互动** - 分析天盘地盘生克比和关系的影响
4. **特殊格局识别** - 识别伏吟、反吟、击刑、入墓等特殊格局
5. **时空方位建议** - 基于九宫、节气交接期给出具体方位时间建议

### 第四层级：综合论断与实战建议（10%权重）
1. **三维综合分析** - 八字+奇门+大运的交叉验证，找出矛盾与统一
2. **风险机遇把握** - 具体的时间点和行动建议，考虑节气交接期
3. **五行调理方案** - 颜色、方位、职业、人际关系等建议
4. **心态调整建议** - 心理层面的指导，结合十神特性

## 📊 【核心任务：问题可行性分析与决策指南】

### 1. 问题本质诊断
- **问题归类**：将用户问题归类为事业、财运、感情、健康、学业、决策等
- **核心矛盾**：指出问题背后的根本矛盾（五行、十神、宫位）
- **时间属性**：判断问题是短期、中期还是长期问题
- **空间属性**：判断问题涉及的方向、方位

### 2. 四维可行性评估（八字 + 奇门 + 大运 + 节气）

**八字层面评估**：
- 日主旺衰是否支持此事
- 用神喜神是否到位，忌神是否猖獗
- 大运流年是否有利，有无空亡影响
- 四柱结构是否稳定，有无严重刑冲

**奇门层面评估**：
- 关键宫位的星门神组合吉凶
- 值符值使的吉凶倾向和位置
- 天盘地盘生克关系是否有利
- 有无驿马、空亡等特殊影响
- 是否为节气交接期（气场稳定性）

**大运层面评估**：
- 当前大运的五行属性和十神
- 未来流年的关键节点和应期
- 起运岁数的影响，有无交运期

**节气层面评估**：
- 当前节气对五行能量的影响
- 是否为交接期，气场是否稳定
- 距离下个节气的时间，时机选择

### 3. 明确可行性结论（五级评估）

**【✅ 强烈推荐做】条件**：
- 八字用神到位，大运流年非常有利
- 奇门盘显示吉门吉星吉神，生克关系好
- 无空亡、击刑等不利因素
- 成功概率 > 70%

**【👍 可以做】条件**：
- 八字条件基本具备，大运流年有利
- 奇门盘整体吉多凶少
- 成功概率 60%-70%

**【⏸️ 谨慎做/调整后做】条件**：
- 八字有条件限制但可化解
- 奇门盘有部分不利因素但可规避
- 需要特定时间、方位或方法
- 成功概率 40%-60%

**【⚠️ 不建议做】条件**：
- 八字忌神当道，大运流年不利
- 奇门盘显示凶门凶星凶神
- 空亡、伏吟等不利格局明显
- 成功概率 20%-40%

**【❌ 绝对避免做】条件**：
- 八字严重失衡，大运流年大凶
- 奇门盘凶格聚集，生克关系恶劣
- 多重空亡、击刑、入墓等
- 成功概率 < 20%

### 4. 具体行动方案（根据可行性分级）

**【如果强烈推荐做】具体方案：**
- **最佳时间窗口**：未来3个月内最佳时间段（具体到周）
- **最佳方位**：基于奇门盘推荐1-2个有利方位（具体到方向）
- **关键行动**：3-5个具体可执行的行动步骤
- **资源分配**：时间/精力/资金的合理比例
- **风险控制**：即使推荐也要注意的风险点

**【时间规划表】**
| 时间段 | 行动重点 | 预期成果 | 风险预警 | 奇门提示 |
|--------|----------|----------|----------|----------|
| 1-2周内 | [具体行动1-2项] | [可衡量目标] | [可能问题] | [相关宫位] |
| 1个月内 | [具体行动1-2项] | [可衡量目标] | [可能问题] | [相关宫位] |
| 1-3个月 | [具体行动1-2项] | [可衡量目标] | [可能问题] | [相关宫位] |

**【如果谨慎做】调整方案：**
- **前提条件**：需要先满足什么条件（八字调理、时机等待）
- **化解方法**：如何化解不利因素（方位调整、时间选择）
- **时机选择**：等待什么时机最佳（节气后、流月转换）
- **风险控制**：如何控制风险（分步实施、准备预案）

**【如果不建议做】替代方案：**
- **根本原因**：为什么不建议做（五行、十神、宫位角度）
- **替代方向**：建议投入的其他领域（基于用神喜神）
- **学习准备**：需要学习什么技能（基于八字十神）
- **时机等待**：何时可以重新考虑（大运转换、流年变化）

### 5. 五行调理与奇门应用
- **五行补益**：基于八字用神的具体调理建议（颜色、饮食、物品）
- **奇门应用**：如何利用奇门时空优势（方位、时间、人际关系）
- **日常生活**：颜色、饮食、作息、居住环境等建议
- **心理建设**：保持怎样的心态（基于十神特性）

## 📝 【回答格式要求】

# 奇门八字四维综合决策报告

## 📊 第一部分：问题诊断与四维评估

### 1.1 问题本质分析
[简要分析问题的本质、属性、时空特点]

### 1.2 八字命理评估
[基于日主、用神、大运、四柱结构的分析]

### 1.3 奇门遁甲评估  
[基于星门神组合、生克关系、特殊格局的分析]

### 1.4 大运流年评估
[基于当前大运和流年、起运岁数的分析]

### 1.5 节气时机评估
[基于当前节气、交接期的时机分析]

## 🎯 第二部分：可行性结论

### 2.1 综合可行性评级
- **结论**：[✅/👍/⏸️/⚠️/❌] 
- **成功概率**：[XX]%
- **信心指数**：[★★★★☆]
- **最佳时机**：[具体时间段]
- **最利方位**：[具体方位]

### 2.2 核心依据
1. [八字依据：用神是否到位，旺衰是否平衡]
2. [奇门依据：宫位吉凶组合，生克关系]
3. [大运依据：流年是否有利，有无空亡]
4. [节气依据：时机是否合适，气场是否稳定]

## 🛠 第三部分：具体行动方案

### 3.1 最佳时机窗口（基于当前日期：${currentYear}年${currentMonth}月${currentDay}日）
- **立即行动**（未来1-2周内）：[具体行动，考虑节气交接期]
- **关键节点**（未来1-3个月内）：[具体时间点，结合流月]
- **长期规划**（6个月-1年）：[规划建议，结合大运]

### 3.2 最佳方位与资源
- **有利方位**：[基于奇门的方位建议，具体到方向角度]
- **五行调理**：[基于八字的调理建议，具体到颜色物品]
- **资源分配**：[时间/精力/资金建议比例]
- **人际关系**：[基于十神的人际关系建议]

### 3.3 风险控制方案
- **主要风险**：[列举1-3个最大风险，注明来源]
- **预警信号**：[出现什么情况需要警惕]
- **应对策略**：[具体的应对方法，分步骤]
- **退路准备**：[如果失败，如何安全退出]

## 📈 第四部分：未来趋势展望

### 4.1 短期趋势（1-3个月）
[具体趋势分析，结合流月和节气]

### 4.2 中期趋势（3-12个月）
[具体趋势分析，结合流年和大运]

### 4.3 长期建议（1-3年）
[长期发展建议，基于八字格局和大运走势]

## 💡 第五部分：一句话核心建议

> [给用户最直接、最明确的建议，不超过30字，包含关键时间和方位]

---

### 综合评估指标
**八字匹配度**：[XX]%  
**奇门有利度**：[XX]%  
**时机适宜度**：[XX]%  
**综合成功率**：[XX]%  
**推荐指数**：[★★★★☆]  
**适合人群**：[描述适合做此事的人群特征]  
**核心提醒**：[最重要的1-2点提醒]

---

*分析时间：${currentDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}*  
*奇门八字四维决策系统 v4.0*  
*基于：八字命理 + 奇门遁甲 + 大运流年 + 节气时空 综合算法*  
*免责声明：本分析基于传统术数，仅供参考，请结合现实情况理性决策*

## 【特别提醒】
1. **所有时间规划必须基于当前日期（${currentYear}年${currentMonth}月${currentDay}日）之后**
2. 给出的建议必须具体、可执行、有时限、有方位
3. 保持专业、精准、实用的分析风格，避免空泛理论
4. 重点突出，逻辑清晰，使用表格和列表提高可读性
5. 必须考虑节气交接期的影响和驿马空亡的作用

请严格按照上述格式组织回答，确保逻辑清晰，重点突出，给出具体可行的建议。
`;

  try {
   
    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-471f4a4f749f493fa48d43ec80d5ab0b';
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          {
            role: 'system',
            content: '你是一位精通传统术数（奇门遁甲 + 四柱八字 + 大六壬 + 紫微斗数）的"宗师级专家"，拥有30年实战经验。请提供专业、精准、实用的分析，注重可操作性。严格按照用户要求的格式和结构组织回答，所有时间规划必须基于当前日期之后，必须考虑节气、驿马、空亡等时空因素。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 8000,  // 增加token数以容纳更多信息
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "解析失败，请稍后重试。";
  } catch (error) {
    console.error("DeepSeek API Error:", error);
    return "AI分析服务暂时不可用，请稍后重试。";
  }
};