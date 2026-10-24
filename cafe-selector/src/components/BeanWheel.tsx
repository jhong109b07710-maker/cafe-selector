import React, { useState, useEffect, useRef } from 'react';
import { CoffeeBean } from '../types';
import { RotateCcw, Sparkles, Check, Volume2, VolumeX, AlertCircle } from 'lucide-react';

interface BeanWheelProps {
  beans: CoffeeBean[];
  selectedBean: CoffeeBean | null;
  onSelectBean: (bean: CoffeeBean) => void;
}

// 咖啡牛奶漸層色塊調色盤
const WHEEL_COLORS = [
  { bg: '#F1E7D8', text: '#3E2A1E', accent: '#D9C7B0' },
  { bg: '#E5D5C1', text: '#332117', accent: '#CBB499' },
  { bg: '#D8C1A8', text: '#2B1A12', accent: '#BD9E7E' },
  { bg: '#C9AC8E', text: '#20120B', accent: '#A98968' },
  { bg: '#B79776', text: '#FFFFFF', accent: '#957454' },
  { bg: '#A28160', text: '#FFFFFF', accent: '#7F5E3F' },
  { bg: '#8D6B4B', text: '#FAF5EE', accent: '#6C4D32' },
  { bg: '#765538', text: '#FDFBF7', accent: '#583C25' },
];

export const BeanWheel: React.FC<BeanWheelProps> = ({
  beans,
  selectedBean,
  onSelectBean,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastSelectedResult, setLastSelectedResult] = useState<CoffeeBean | null>(selectedBean);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 柔和木質轉盤滴答聲（使用 Web Audio API，無需外掛音檔）
  const playTickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio context might be restricted
    }
  };

  // 繪製轉盤
  const drawWheel = (rotationDeg: number) => {
    const canvas = canvasRef.current;
    if (!canvas || beans.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 16;
    const numSlices = beans.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const rotationRad = (rotationDeg * Math.PI) / 180;

    ctx.clearRect(0, 0, width, height);

    // 外圈陰影與木質邊框
    ctx.save();
    ctx.shadowColor = 'rgba(44, 30, 24, 0.15)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#442F22';
    ctx.fill();
    ctx.restore();

    // 內襯金屬金邊
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#C8AB83';
    ctx.fill();

    // 繪製各扇區
    beans.forEach((bean, index) => {
      const startAngle = rotationRad + index * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const color = WHEEL_COLORS[index % WHEEL_COLORS.length];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color.bg;
      ctx.fill();

      // 扇區分隔細線
      ctx.strokeStyle = '#F7F2E8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 文字標籤（咖啡豆名稱）
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color.text;
      ctx.font = '600 13px "Noto Serif TC", serif';

      // 截短過長的文字
      let displayName = bean.name;
      if (displayName.length > 8) {
        displayName = displayName.substring(0, 7) + '…';
      }
      ctx.fillText(displayName, radius - 24, 0);

      // 產地小標記
      ctx.fillStyle = color.text;
      ctx.globalAlpha = 0.75;
      ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(bean.origin, radius - 24, 16);
      ctx.restore();

      ctx.restore();
    });

    // 中心微縮同心圓中軸（精緻軸心）
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#2C1D16';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#4A3427';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 14, 0, 2 * Math.PI);
    ctx.fillStyle = '#C8AB83';
    ctx.fill();

    // 軸心使用「咖啡豆圖樣」覆蓋取代原本的文字
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-Math.PI / 6); // 傾斜角度呈現自然咖啡豆姿態

    // 咖啡豆本體（圓潤橢圓）
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5, 8.5, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#2C1D16';
    ctx.fill();

    // 咖啡豆中央經典 S 型微凹縫隙
    ctx.beginPath();
    ctx.moveTo(0, -7.5);
    ctx.bezierCurveTo(2.2, -3.5, -2.2, 3.5, 0, 7.5);
    ctx.strokeStyle = '#E8D5BF';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  };

  // 當豆子清單或角度改變時重繪
  useEffect(() => {
    drawWheel(currentRotation);
  }, [beans, currentRotation]);

  // 隨機抽選旋轉邏輯
  const spinWheel = () => {
    if (isSpinning || beans.length === 0) return;

    setIsSpinning(true);

    // 真正由清單隨機選出目標
    const targetIndex = Math.floor(Math.random() * beans.length);
    const targetBean = beans[targetIndex];

    const sliceAngle = 360 / beans.length;
    // 轉盤指針在正上方 (270度 / -90度)
    // 當第 targetIndex 塊的中心停在正上方 (270度) 時：
    // (finalAngle + targetIndex * sliceAngle + sliceAngle / 2) % 360 == 270
    // => finalAngle = 270 - (targetIndex * sliceAngle + sliceAngle / 2)
    const targetCenterAngle = targetIndex * sliceAngle + sliceAngle / 2;
    const normalizedTarget = (270 - targetCenterAngle + 360) % 360;

    // 增加 5 到 7 圈完整旋轉
    const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const startAngle = currentRotation;
    // 保持旋轉方向向前
    const currentModulo = startAngle % 360;
    const angleDiff = ((normalizedTarget - currentModulo + 360) % 360) + extraSpins;
    const finalAngle = startAngle + angleDiff;

    const duration = 3800; // 3.8 秒
    const startTime = performance.now();
    let lastTickSlice = -1;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutCubic / easeOutQuart 減速曲線
      const ease = 1 - Math.pow(1 - progress, 4);
      const angleNow = startAngle + (finalAngle - startAngle) * ease;

      setCurrentRotation(angleNow);

      // 檢查是否經過扇區以觸發滴答聲
      const currentSlice = Math.floor((angleNow % 360) / sliceAngle);
      if (currentSlice !== lastTickSlice) {
        lastTickSlice = currentSlice;
        playTickSound();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setLastSelectedResult(targetBean);
        onSelectBean(targetBean);
      }
    };

    requestAnimationFrame(animate);
  };

  // 友善無資料提示
  if (beans.length === 0) {
    return (
      <div className="p-8 text-center bg-[#FAF7F2] rounded-2xl border border-[#E8DFC8]">
        <AlertCircle className="w-8 h-8 text-[#9E7D63] mx-auto mb-2" />
        <p className="text-[#594437] font-medium">目前尚無啟用的咖啡豆資料</p>
        <p className="text-xs text-[#8C7565] mt-1">請稍候或聯繫店主新增豆種</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* 轉盤容器與頂部指針 */}
      <div className="relative p-3 select-none">
        {/* 精緻指針 (固定在正上方) */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center drop-shadow-md">
          <div className="w-4 h-6 bg-[#2B1B13] rounded-t-full border border-[#D8C1A8]"></div>
          <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[14px] border-t-[#2B1B13] -mt-0.5"></div>
        </div>

        {/* 畫布 */}
        <div className="w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] relative flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={360}
            height={360}
            className="w-full h-full rounded-full transition-transform"
          />
        </div>

        {/* 聲音切換小按鈕 */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="absolute bottom-2 right-2 p-2 rounded-full bg-[#F3ECE1] hover:bg-[#E7DDCF] text-[#695244] text-xs transition-colors shadow-xs"
          title={soundEnabled ? '轉盤音效已開啟' : '轉盤音效已靜音'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* 控制按鈕 */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={spinWheel}
          disabled={isSpinning}
          className="px-6 py-2.5 bg-[#4A3225] hover:bg-[#392419] active:scale-98 text-[#FAF6F0] rounded-full font-serif font-semibold text-sm sm:text-base shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
        >
          {isSpinning ? (
            <>
              <span className="w-4 h-4 border-2 border-[#FAF6F0] border-t-transparent rounded-full animate-spin"></span>
              <span>咖啡豆抽選中...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#E6CDB5]" />
              <span>{lastSelectedResult ? '重新抽選' : '開始轉盤'}</span>
            </>
          )}
        </button>
      </div>

      {/* 旋轉結束後的抽中結果卡片 */}
      {lastSelectedResult && !isSpinning && (
        <div className="mt-5 w-full max-w-md bg-[#FBF8F3] border border-[#DDD0BE] rounded-2xl p-4 sm:p-5 shadow-xs transition-all animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8DFC8]">
            <div className="flex items-center gap-1.5 text-xs text-[#8C6242] font-semibold tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>轉盤抽選結果</span>
            </div>
            {lastSelectedResult.isDemo && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFE6D8] text-[#7A6150]">
                展示測試豆
              </span>
            )}
          </div>

          <div className="mt-3">
            <h3 className="text-lg sm:text-xl font-serif font-bold text-[#2A1C15]">
              {lastSelectedResult.name}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-[#EBE0D0] text-[#3D291E] font-medium">
                產地：{lastSelectedResult.origin}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#E2D5C3] text-[#3D291E] font-medium">
                處理法：{lastSelectedResult.process}
              </span>
              {lastSelectedResult.roastLevel && (
                <span className="px-2.5 py-1 rounded-md bg-[#DFD0BC] text-[#3D291E]">
                  焙度：{lastSelectedResult.roastLevel}
                </span>
              )}
            </div>

            {lastSelectedResult.flavorNotes && lastSelectedResult.flavorNotes.length > 0 && (
              <p className="mt-2.5 text-xs text-[#6F5B4D] leading-relaxed">
                <span className="font-medium text-[#463327]">風味調性：</span>
                {lastSelectedResult.flavorNotes.join('、')}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-[#EFE8DC]">
              <div className="flex items-center gap-1.5 text-xs text-emerald-800">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">已帶入下方飲品製作</span>
              </div>
              <button
                type="button"
                onClick={spinWheel}
                disabled={isSpinning}
                className="text-xs text-[#855B3C] hover:text-[#4F3320] flex items-center gap-1 font-medium underline underline-offset-2"
              >
                <RotateCcw className="w-3 h-3" />
                <span>不滿意？再抽一次</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
