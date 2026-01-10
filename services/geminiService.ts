import { ChartResult } from "../types";

export async function analyzeQiMen(chart: ChartResult, question: string): Promise<string> {
  // Fixed typo: `analysis.elements` should be `analysis.elementCounts`.
  const personalData = chart.personalInfo ? `
    测算人信息:
    姓名: ${chart.personalInfo.name} (${chart.personalInfo.gender})
    八字: ${chart.personalInfo.bazi}
    五行分布: 木${chart.personalInfo.analysis.elementCounts.wood} 火${chart.personalInfo.analysis.elementCounts.fire} 土${chart.personalInfo.analysis.elementCounts.earth} 金${chart.personalInfo.analysis.elementCounts.metal} 水${chart.personalInfo.analysis.elementCounts.water}
    日主强弱: ${chart.personalInfo.analysis.strength}
    喜神/用神: ${chart.personalInfo.analysis.yongShen.join(', ')}
    忌神: ${chart.personalInfo.analysis.jiShen.join(', ')}
  ` : '';

  const chartDescription = `
    奇门遁甲排盘数据:
    时间: ${chart.params.yearSB.stem}${chart.params.yearSB.branch}年 ${chart.params.monthSB.stem}${chart.params.monthSB.branch}月 ${chart.params.daySB.stem}${chart.params.daySB.branch}日 ${chart.params.hourSB.stem}${chart.params.hourSB.branch}时
    定局: ${chart.params.dunJu}
    值符: ${chart.zhiFu}, 值使: ${chart.zhiShi}
    
    各宫详情:
    ${chart.palaces.map(p => `
      ${p.name}: 神[${p.elements.god}] 星[${p.elements.star}] 门[${p.elements.gate}] 天干[${p.elements.tianPan}] 地干[${p.elements.diPan}] ${p.elements.isEmpty ? '(空亡)' : ''} ${p.elements.isHorse ? '(驿马)' : ''}
    `).join('\n')}
  `;

  const prompt = `
    你是一位精通传统术数（奇门遁甲 + 四柱八字）与现代大数据分析的"宗师级专家"。
    用户的问题是: "${question}"
    
    ${personalData}
    ${chartDescription}
    
    解析要求:
    1. 结合测算人的【八字命理属性】（身强身弱、喜用神）与【奇门遁甲排盘】进行综合解析。
    2. 明确用神：根据问题和命主喜好锁定核心宫位。
    3. 力量对比：分析命主喜用神在奇门盘中的落宫状态（旺衰、空亡等）。
    4. 格局解析：识别经典格局，并特别说明该格局对特定命理属性的命主是利是弊。
    5. 断语总结：给出最终的趋势判断（吉、凶、平）及具体的行动建议。
    
    请以专业、睿智、深刻且易懂的语气回复。使用Markdown格式。
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