import { ChartResult } from "../types";

export async function analyzeQiMen(chart: ChartResult, question: string): Promise<string> {
  // Fixed typo: `analysis.elements` should be `analysis.elementCounts`.
  const personalData = chart.personalInfo ? `
测算人信息：
姓名：${chart.personalInfo.name}（${chart.personalInfo.gender}）
八字：${chart.personalInfo.bazi}

【核心五行数据】：
五行原始得分：木${chart.personalInfo.analysis.elementCounts.wood} 火${chart.personalInfo.analysis.elementCounts.fire} 土${chart.personalInfo.analysis.elementCounts.earth} 金${chart.personalInfo.analysis.elementCounts.metal} 水${chart.personalInfo.analysis.elementCounts.water}
五行能量百分比：木${chart.personalInfo.analysis.elementEnergy.wood}% 火${chart.personalInfo.analysis.elementEnergy.fire}% 土${chart.personalInfo.analysis.elementEnergy.earth}% 金${chart.personalInfo.analysis.elementEnergy.metal}% 水${chart.personalInfo.analysis.elementEnergy.water}%

【旺相休囚死状态】：
木：${chart.personalInfo.analysis.energyState['木']}
火：${chart.personalInfo.analysis.energyState['火']}
土：${chart.personalInfo.analysis.energyState['土']}
金：${chart.personalInfo.analysis.energyState['金']}
水：${chart.personalInfo.analysis.energyState['水']}

【十神分布】：
比劫：${chart.personalInfo.analysis.tenGodDistribution['比劫']}%
印绶：${chart.personalInfo.analysis.tenGodDistribution['印绶']}%
官杀：${chart.personalInfo.analysis.tenGodDistribution['官杀']}%
财才：${chart.personalInfo.analysis.tenGodDistribution['财才']}%
食伤：${chart.personalInfo.analysis.tenGodDistribution['食伤']}%

日主：${chart.personalInfo.analysis.dayMaster}（${chart.personalInfo.analysis.dayMasterElement}命）
身强身弱：${chart.personalInfo.analysis.strength}
调候用神：${chart.personalInfo.analysis.tiaoHouShen.join(', ')}
空亡地支：${chart.personalInfo.analysis.emptyBranches.join(', ') || '无'}

【喜忌用神】：
用神：${chart.personalInfo.analysis.yongShen.join(', ')}
喜神：${chart.personalInfo.analysis.xiShen.join(', ')}
忌神：${chart.personalInfo.analysis.jiShen.join(', ')}

【四柱详情】：
年柱：${chart.personalInfo.analysis.pillars.year.sb.stem}${chart.personalInfo.analysis.pillars.year.sb.branch}（十神：${chart.personalInfo.analysis.pillars.year.tenGod}，藏干：${chart.personalInfo.analysis.pillars.year.hiddenStems.join(',')}，空亡：${chart.personalInfo.analysis.pillars.year.isEmpty ? '是' : '否'}）
月柱：${chart.personalInfo.analysis.pillars.month.sb.stem}${chart.personalInfo.analysis.pillars.month.sb.branch}（十神：${chart.personalInfo.analysis.pillars.month.tenGod}，藏干：${chart.personalInfo.analysis.pillars.month.hiddenStems.join(',')}，空亡：${chart.personalInfo.analysis.pillars.month.isEmpty ? '是' : '否'}）
日柱：${chart.personalInfo.analysis.pillars.day.sb.stem}${chart.personalInfo.analysis.pillars.day.sb.branch}（日主）
时柱：${chart.personalInfo.analysis.pillars.hour.sb.stem}${chart.personalInfo.analysis.pillars.hour.sb.branch}（十神：${chart.personalInfo.analysis.pillars.hour.tenGod}，藏干：${chart.personalInfo.analysis.pillars.hour.hiddenStems.join(',')}，空亡：${chart.personalInfo.analysis.pillars.hour.isEmpty ? '是' : '否'})
` : '';

  const chartDescription = `
【奇门遁甲排盘数据】：
排盘时间：${chart.params.yearSB.stem}${chart.params.yearSB.branch}年 ${chart.params.monthSB.stem}${chart.params.monthSB.branch}月 ${chart.params.daySB.stem}${chart.params.daySB.branch}日 ${chart.params.hourSB.stem}${chart.params.hourSB.branch}时
节气：${chart.params.solarTerm}
遁局：${chart.params.dunJu}（${chart.params.isYang ? '阳遁' : '阴遁'}${chart.params.juNum}局）
值符：${chart.zhiFu}
值使：${chart.zhiShi}
旬首：${chart.xunShou}

【九宫详情】：
${chart.palaces.map(p => `
${p.name}宫：
  神：${p.elements.god}，星：${p.elements.star}，门：${p.elements.gate}
  天盘：${p.elements.tianPan}，地盘：${p.elements.diPan}
  状态：${p.elements.status}
  ${p.elements.isEmpty ? '（空亡）' : ''}
  ${p.elements.isHorse ? '（驿马）' : ''}
  ${p.elements.hiddenStem ? `（暗干：${p.elements.hiddenStem}）` : ''}
`).join('\n')}
`;

  const prompt = `
你是一位精通传统术数（奇门遁甲 + 四柱八字）与现代大数据分析的"宗师级专家"。
用户的问题是：${question}

${personalData}
${chartDescription}

【宗师级解析要求】：

一、八字命理深度分析：
1. 日主旺衰分析：根据五行能量（${chart.personalInfo.analysis.elementEnergy.wood}%木、${chart.personalInfo.analysis.elementEnergy.fire}%火、${chart.personalInfo.analysis.elementEnergy.earth}%土、${chart.personalInfo.analysis.elementEnergy.metal}%金、${chart.personalInfo.analysis.elementEnergy.water}%水）和旺相休囚死状态（木${chart.personalInfo.analysis.energyState['木']}、火${chart.personalInfo.analysis.energyState['火']}、土${chart.personalInfo.analysis.energyState['土']}、金${chart.personalInfo.analysis.energyState['金']}、水${chart.personalInfo.analysis.energyState['水']}），深入分析日主 ${chart.personalInfo.analysis.dayMaster}（${chart.personalInfo.analysis.dayMasterElement}命）的强弱及格局层次。
2. 十神格局分析：根据十神分布（比劫${chart.personalInfo.analysis.tenGodDistribution['比劫']}%、印绶${chart.personalInfo.analysis.tenGodDistribution['印绶']}%、官杀${chart.personalInfo.analysis.tenGodDistribution['官杀']}%、财才${chart.personalInfo.analysis.tenGodDistribution['财才']}%、食伤${chart.personalInfo.analysis.tenGodDistribution['食伤']}%），分析命主的性格特征、事业倾向、财运感情等。
3. 用神实战应用：针对用户问题，结合用神（${chart.personalInfo.analysis.yongShen.join(', ')}）、喜神（${chart.personalInfo.analysis.xiShen.join(', ')}）、忌神（${chart.personalInfo.analysis.jiShen.join(', ')}）和调候用神（${chart.personalInfo.analysis.tiaoHouShen.join(', ')}），给出五行调理建议。

二、奇门遁甲精准用神：
1. 锁定核心宫位：根据用户问题类型（事业/财运/健康/感情等），结合八字喜用神，确定奇门盘中的核心用神宫位。
2. 能量旺衰分析：分析用神宫位的星、门、神、天盘地盘组合，判断力量强弱（旺、相、休、囚、死、空亡）。
3. 格局组合解析：识别特殊格局（如伏吟、反吟、三奇得使、青龙返首等），并分析其对命主的吉凶影响。

三、命理与奇门综合论断：
1. 八字与奇门呼应：分析八字喜用神在奇门盘中的落宫状态，判断内外环境是否协调。
2. 时空能量分析：结合排盘时间（${chart.params.yearSB.stem}${chart.params.yearSB.branch}年 ${chart.params.monthSB.stem}${chart.params.monthSB.branch}月 ${chart.params.daySB.stem}${chart.params.daySB.branch}日 ${chart.params.hourSB.stem}${chart.params.hourSB.branch}时）的节气能量，分析当前时空对命主的影响。
3. 行动策略建议：根据综合分析，给出具体的行动时间、方位、颜色、物品等调整建议。

四、详细断语与建议：
1. 趋势判断：明确给出吉、凶、平的趋势判断，并说明原因。
2. 风险提示：指出需要注意的风险点和不利因素。
3. 机会把握：指出可以把握的机会和有利条件。
4. 具体建议：给出可操作的具体建议，包括时间选择、方位选择、人际关系处理等。

请以专业、睿智、深刻且易懂的语气回复。使用Markdown格式，适当使用标题、列表、重点强调（**加粗**）等格式，使回答结构清晰、重点突出。
`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${'sk-471f4a4f749f493fa48d43ec80d5ab0b'}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          {
            role: 'system',
            content: '你是一位精通传统术数（奇门遁甲 + 四柱八字）与现代大数据分析的"宗师级专家"。请提供专业、准确的分析。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
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
    return "API调用失败，请检查网络或密钥配置。";
  }
}