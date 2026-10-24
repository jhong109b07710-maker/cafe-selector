import React from 'react';
import { SheetConnectionState } from '../types';
import { Coffee, ExternalLink, Layers } from 'lucide-react';

interface HeaderProps {
  sheetState: SheetConnectionState;
  onOpenSheetModal: () => void;
  onConnectGoogle: () => void;
  ordersCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  sheetState,
  onOpenSheetModal,
  ordersCount = 0,
}) => {
  const scrollToLiveBoard = () => {
    const el = document.getElementById('live-orders-board');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="border-b border-[#E8DFC8] bg-[#FDFBF7]/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-full bg-[#3D281D] text-[#F5EFEB] flex items-center justify-center shadow-sm shrink-0">
            <Coffee className="w-5 h-5 text-[#E6CDB5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#2A1D17] tracking-tight">
              咖啡豆選擇平台
            </h1>
            <p className="text-xs sm:text-sm text-[#7D6B5F] mt-0.5">
              今天，讓一顆好豆決定你的咖啡。
            </p>
          </div>
        </div>

        {/* Cloud Connection Badge & Actions */}
        <div className="flex items-center gap-2">
          {/* 快速切換至即時訂單看板按鈕 */}
          <button
            type="button"
            onClick={scrollToLiveBoard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A3225] hover:bg-[#382317] text-[#FAF6F0] rounded-full text-xs font-semibold transition-all shadow-xs cursor-pointer"
            title="查看即時訂單輸出看板"
          >
            <Layers className="w-3.5 h-3.5 text-[#E6CDB5]" />
            <span>即時訂單 ({ordersCount})</span>
          </button>

          {/* 來源與輸出自動綁定徽章 */}
          <div className="flex items-center gap-1.5 bg-[#F2ECE1] border border-[#DDD3C1] text-[#3D2C22] px-3.5 py-1.5 rounded-full text-xs shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="font-semibold hidden sm:inline">來源與輸出已自動綁定</span>
            <span className="font-semibold sm:hidden">已綁定</span>
            {sheetState.spreadsheetUrl && (
              <a
                href={sheetState.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-[#8C5E3C] hover:text-[#5C3920] transition-colors p-0.5"
                title="在新分頁開啟試算表"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onOpenSheetModal}
              className="ml-1 text-xs text-[#7A6455] hover:text-[#2A1D17] underline underline-offset-2 cursor-pointer"
            >
              設定
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
