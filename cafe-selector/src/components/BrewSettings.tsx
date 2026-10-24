import React from 'react';
import { BrewMethod, Temperature } from '../types';
import { Minus, Plus, Flame, Snowflake, Coffee, CupSoda } from 'lucide-react';

interface BrewSettingsProps {
  brewMethod: BrewMethod;
  onChangeBrewMethod: (method: BrewMethod) => void;
  temperature: Temperature;
  onChangeTemperature: (temp: Temperature) => void;
  quantity: number;
  onChangeQuantity: (qty: number) => void;
  note: string;
  onChangeNote: (note: string) => void;
}

export const BrewSettings: React.FC<BrewSettingsProps> = ({
  brewMethod,
  onChangeBrewMethod,
  temperature,
  onChangeTemperature,
  quantity,
  onChangeQuantity,
  note,
  onChangeNote,
}) => {
  const brewOptions: { id: BrewMethod; label: string; desc: string }[] = [
    { id: '義式', label: '義式濃縮 (Espresso)', desc: '高壓萃取，醇厚濃郁且油脂細緻' },
    { id: '手沖', label: '手沖黑咖啡 (Pour Over)', desc: '細緻過濾，風味層次與產地香氣分明' },
    { id: '拿鐵', label: '拿鐵咖啡 (Café Latte)', desc: '濃縮搭佐溫熱蒸煮鮮乳，溫潤柔滑' },
  ];

  const handleDecrease = () => {
    if (quantity > 1) {
      onChangeQuantity(quantity - 1);
    }
  };

  const handleIncrease = () => {
    onChangeQuantity(quantity + 1);
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      onChangeQuantity(val);
    } else if (e.target.value === '') {
      onChangeQuantity(1);
    }
  };

  return (
    <div className="bg-[#FAF7F2] border border-[#E4D9C7] rounded-2xl p-5 sm:p-6 space-y-6">
      <div className="border-b border-[#EAE1D1] pb-3">
        <h3 className="font-serif font-bold text-lg text-[#2D1F17]">飲品製作設定</h3>
        <p className="text-xs text-[#7B6657] mt-0.5">
          依照您的品飲習慣客製沖煮方式與溫度
        </p>
      </div>

      {/* 1. 製作方式 */}
      <div>
        <label className="block text-xs font-semibold text-[#483427] mb-2.5">
          1. 製作方式 <span className="text-[#A44331]">*必選</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {brewOptions.map((opt) => {
            const isSelected = brewMethod === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeBrewMethod(opt.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#4A3225] text-[#FAF6F0] border-[#4A3225] shadow-xs'
                    : 'bg-[#FDFBF7] text-[#332219] border-[#DDD2BE] hover:bg-[#F2ECE0]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{opt.id}</span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[#EAD4BA]"></span>
                  )}
                </div>
                <p
                  className={`text-[11px] leading-relaxed ${
                    isSelected ? 'text-[#DFD0BF]' : 'text-[#7B6758]'
                  }`}
                >
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 冰熱選擇 */}
      <div>
        <label className="block text-xs font-semibold text-[#483427] mb-2.5">
          2. 冰熱選擇 <span className="text-[#A44331]">*必選</span>
        </label>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <button
            type="button"
            onClick={() => onChangeTemperature('冰')}
            className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
              temperature === '冰'
                ? 'bg-[#3E5C76] text-white border-[#3E5C76] shadow-xs font-semibold'
                : 'bg-[#FDFBF7] text-[#3E5C76] border-[#D0DFE8] hover:bg-[#F0F5F8]'
            }`}
          >
            <Snowflake className="w-4 h-4" />
            <span className="text-sm">冰 (Iced)</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTemperature('熱')}
            className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
              temperature === '熱'
                ? 'bg-[#98472B] text-white border-[#98472B] shadow-xs font-semibold'
                : 'bg-[#FDFBF7] text-[#98472B] border-[#EAD2C6] hover:bg-[#FBF2EE]'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span className="text-sm">熱 (Hot)</span>
          </button>
        </div>
      </div>

      {/* 3. 數量選擇 */}
      <div>
        <label className="block text-xs font-semibold text-[#483427] mb-2">
          3. 製作杯數 <span className="text-[#A44331]">*至少 1 杯</span>
        </label>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-[#DDD0BE] bg-[#FDFBF7] rounded-xl overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={handleDecrease}
              disabled={quantity <= 1}
              className="p-3 text-[#584132] hover:bg-[#F0E8DA] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="減少數量"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={handleQuantityInputChange}
              className="w-16 text-center text-base font-semibold text-[#2C1D15] bg-transparent outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={handleIncrease}
              className="p-3 text-[#584132] hover:bg-[#F0E8DA] transition-colors cursor-pointer"
              title="增加數量"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs text-[#7A6455]">杯</span>
        </div>
      </div>

      {/* 4. 備註 */}
      <div>
        <label className="block text-xs font-semibold text-[#483427] mb-1.5">
          4. 備註需求 <span className="text-[#8D7667] font-normal">(選填)</span>
        </label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => onChangeNote(e.target.value)}
          placeholder="例如：奶泡少一點、風味偏酸、其他製作需求……"
          className="w-full text-sm rounded-xl border border-[#DCD0BE] bg-[#FDFBF7] p-3 text-[#2C1D15] placeholder-[#A59283] focus:border-[#866045] focus:ring-1 focus:ring-[#866045] outline-none transition-all resize-none"
        />
      </div>
    </div>
  );
};
