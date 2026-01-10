
import React from 'react';
import { ChartResult, PalaceData } from '../types';

interface Props {
  chart: ChartResult;
}

const getFortuneColorClass = (name: string): string => {
  const good = ["开门", "休门", "生门", "天辅", "天任", "天心", "值符", "太阴", "六合", "九天"];
  const bad = ["死门", "惊门", "伤门", "天芮", "天蓬", "白虎", "玄武", "螣蛇"];
  if (good.some(g => name.includes(g))) return 'text-emerald-400 font-bold';
  if (bad.some(b => name.includes(b))) return 'text-red-400 font-bold';
  return 'text-neutral-300';
};

const QiMenChart: React.FC<Props> = ({ chart }) => {
  const visualOrder = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  const getPalace = (id: number) => chart.palaces.find(p => p.id === id);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-3 gap-1 bg-neutral-800 p-1 rounded-xl shadow-2xl border border-neutral-700">
        {visualOrder.map(id => {
          const p = getPalace(id);
          if (!p) return <div key={id} className="aspect-square bg-neutral-900 rounded-lg"></div>;
          
          return (
            <div key={id} className="aspect-square bg-neutral-950 border border-neutral-800 p-2 flex flex-col justify-between rounded-lg relative hover:bg-neutral-900 transition-colors">
              <div className="absolute top-1 right-1 text-[8px] text-neutral-700 font-bold">{p.name}</div>
              
              {/* 八神 */}
              <div className={`text-xs sm:text-sm ${getFortuneColorClass(p.elements.god)}`}>{p.elements.god}</div>

              {/* 中间核心：星、门 */}
              <div className="flex flex-col items-center justify-center -mt-1">
                <div className={`text-xs sm:text-base ${getFortuneColorClass(p.elements.star)}`}>{p.elements.star}</div>
                <div className={`text-sm sm:text-lg ${getFortuneColorClass(p.elements.gate)}`}>{p.elements.gate}</div>
              </div>

              {/* 天干地干 */}
              <div className="flex justify-end items-end gap-1">
                <div className="flex flex-col items-center leading-none">
                    <span className="text-orange-400 text-sm sm:text-lg font-bold">{p.elements.tianPan}</span>
                    <span className="text-neutral-500 text-[10px] sm:text-sm">{p.elements.diPan}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 grid grid-cols-4 gap-2 text-[10px] sm:text-sm bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
        <div className="flex flex-col"><span className="text-neutral-500">值符</span><span className="text-yellow-500 font-bold">{chart.zhiFu}</span></div>
        <div className="flex flex-col"><span className="text-neutral-500">值使</span><span className="text-emerald-500 font-bold">{chart.zhiShi}</span></div>
        <div className="flex flex-col"><span className="text-neutral-500">旬首</span><span className="text-orange-500 font-bold">{chart.xunShou}</span></div>
        <div className="flex flex-col"><span className="text-neutral-500">局数</span><span className="text-white font-bold">{chart.params.dunJu}</span></div>
      </div>
    </div>
  );
};

export default QiMenChart;
