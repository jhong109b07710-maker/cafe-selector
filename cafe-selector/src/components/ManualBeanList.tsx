import React from 'react';
import { CoffeeBean } from '../types';
import { Check, CheckCircle2 } from 'lucide-react';

interface ManualBeanListProps {
  beans: CoffeeBean[];
  selectedBean: CoffeeBean | null;
  onSelectBean: (bean: CoffeeBean) => void;
}

export const ManualBeanList: React.FC<ManualBeanListProps> = ({
  beans,
  selectedBean,
  onSelectBean,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[#7A6354] px-1">
        <span>點擊卡片即可選定咖啡豆（目前提供單一豆種訂製）</span>
        <span>共 {beans.length} 款可選</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {beans.map((bean) => {
          const isSelected = selectedBean?.id === bean.id;
          return (
            <div
              key={bean.id}
              onClick={() => onSelectBean(bean)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectBean(bean);
                }
              }}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-[#FAF4EB] border-[#9E7350] shadow-sm ring-1 ring-[#9E7350]/30'
                  : 'bg-[#FDFBF7] border-[#E8DFC8] hover:border-[#C4B19C] hover:bg-[#F8F4EC]'
              }`}
            >
              {/* Top row: Name & Selection Indicator */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-serif font-bold text-base text-[#2E1E16] leading-snug">
                    {bean.name}
                  </h4>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded bg-[#EFE5D6] text-[#463124] font-medium">
                      產地：{bean.origin}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#E4D5C2] text-[#463124] font-medium">
                      處理法：{bean.process}
                    </span>
                    {bean.roastLevel && (
                      <span className="px-2 py-0.5 rounded bg-[#DDD0BF] text-[#463124]">
                        {bean.roastLevel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Radio selection check */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[#4A3225] text-[#FAF6F0]'
                      : 'border border-[#D1BEAA] bg-transparent text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Flavor notes */}
              {bean.flavorNotes && bean.flavorNotes.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[#EFE8DC]/80 text-xs text-[#705A4B] flex items-center gap-1.5 flex-wrap">
                  <span className="text-[#8F6A4F] font-medium">風味：</span>
                  <span>{bean.flavorNotes.join(' · ')}</span>
                </div>
              )}

              {/* Demo Badge */}
              {bean.isDemo && (
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#9A8475]">
                  <span>展示測試豆種</span>
                  {isSelected && (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      已選取
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
