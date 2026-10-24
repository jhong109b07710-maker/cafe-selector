import React, { useState } from 'react';
import { CoffeeBean, BrewMethod, Temperature, SelectionMode, Order, SheetConnectionState } from '../types';
import { CheckCircle2, AlertCircle, Send, ExternalLink, RefreshCw, FileSpreadsheet, LogIn } from 'lucide-react';

interface OrderSummaryProps {
  selectedBean: CoffeeBean | null;
  brewMethod: BrewMethod;
  temperature: Temperature;
  quantity: number;
  note: string;
  selectionMode: SelectionMode;
  sheetState: SheetConnectionState;
  onConnectGoogle: () => void;
  onSubmitOrder: (order: Order) => Promise<boolean>;
  onResetOrder: () => void;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  selectedBean,
  brewMethod,
  temperature,
  quantity,
  note,
  selectionMode,
  sheetState,
  onConnectGoogle,
  onSubmitOrder,
  onResetOrder,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const canSubmit = Boolean(selectedBean && brewMethod && temperature && quantity >= 1);

  const handleSubmit = async () => {
    if (!canSubmit || !selectedBean || isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);

    // 產生不重複訂單編號: ORD-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `ORD-${dateStr}-${randCode}`;
    const createdAt = now.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      hour12: false,
    });

    const newOrder: Order = {
      orderId,
      createdAt,
      beanName: selectedBean.name,
      origin: selectedBean.origin,
      process: selectedBean.process,
      brewMethod,
      temperature,
      quantity,
      note: note.trim(),
      selectionMode,
      status: '待製作',
    };

    try {
      const success = await onSubmitOrder(newOrder);
      if (success) {
        setCompletedOrder(newOrder);
      }
    } catch (err: any) {
      setSubmitError(err?.message || '訂單寫入 Google Sheets 時發生未知異常，請檢查網路連線或稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNewOrder = () => {
    setCompletedOrder(null);
    setSubmitError(null);
    onResetOrder();
  };

  // 成功送出收據畫面
  if (completedOrder) {
    return (
      <div className="bg-[#FAF7F2] border-2 border-[#8A6346] rounded-2xl p-6 sm:p-7 text-center shadow-sm animate-fadeIn">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3.5">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#2B1B13]">
          訂單已成功儲存至 Google Sheets
        </h3>
        <p className="text-xs sm:text-sm text-[#6C584A] mt-1">
          系統已即時寫入雲端試算表「Orders」工作表，感謝您的訂製！
        </p>

        {/* 訂單明細收據卡片 */}
        <div className="mt-5 max-w-md mx-auto bg-[#FDFBF7] border border-[#E6DCB8] rounded-xl p-4 text-left text-xs sm:text-sm space-y-2 text-[#463124]">
          <div className="flex justify-between pb-2 border-b border-[#EFE8DC]">
            <span className="text-[#846E5F]">訂單編號</span>
            <span className="font-mono font-bold text-[#2A1A12]">{completedOrder.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#846E5F]">建立時間</span>
            <span>{completedOrder.createdAt}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#846E5F]">咖啡豆種</span>
            <span className="font-bold text-[#2A1A12]">{completedOrder.beanName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#846E5F]">產地／處理法</span>
            <span>{completedOrder.origin} · {completedOrder.process}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#846E5F]">沖煮設定</span>
            <span>{completedOrder.brewMethod} · {completedOrder.temperature}飲</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#846E5F]">數量</span>
            <span className="font-bold">{completedOrder.quantity} 杯</span>
          </div>
          {completedOrder.note && (
            <div className="pt-2 border-t border-[#EFE8DC]">
              <span className="text-[#846E5F] block mb-0.5">備註需求：</span>
              <span className="text-[#594437] italic">{completedOrder.note}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-[#EFE8DC] text-xs">
            <span className="text-[#846E5F]">選豆方式</span>
            <span>{completedOrder.selectionMode === 'random' ? '隨機轉盤抽選' : '手動自選'}</span>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {sheetState.spreadsheetUrl && (
            <a
              href={sheetState.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#9D714C] text-[#5A3821] hover:bg-[#F2ECE0] text-xs sm:text-sm font-medium transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#8C5E3C]" />
              <span>在 Google Sheets 檢視此筆紀錄</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={handleStartNewOrder}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#4A3225] text-[#FAF6F0] hover:bg-[#382317] text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>再點一杯咖啡</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F2] border border-[#E4D9C7] rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="border-b border-[#EAE1D1] pb-3 flex items-center justify-between">
        <div>
          <h3 className="font-serif font-bold text-lg text-[#2D1F17]">訂單確認</h3>
          <p className="text-xs text-[#7B6657] mt-0.5">
            請核對您所選擇的咖啡豆與調製規格
          </p>
        </div>
        {selectedBean && (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#EAE0D1] text-[#4A3326]">
            {selectionMode === 'random' ? '轉盤抽選' : '手動選豆'}
          </span>
        )}
      </div>

      {/* 摘要明細清單 */}
      {selectedBean ? (
        <div className="bg-[#FDFBF7] border border-[#DDD0BE] rounded-xl p-4 divide-y divide-[#EFE8DC] text-xs sm:text-sm">
          <div className="py-2 flex justify-between items-center">
            <span className="text-[#846E5F]">咖啡豆名稱</span>
            <span className="font-bold text-[#2A1B13]">{selectedBean.name}</span>
          </div>
          <div className="py-2 flex justify-between items-center">
            <span className="text-[#846E5F]">產地</span>
            <span className="text-[#3D2C22]">{selectedBean.origin}</span>
          </div>
          <div className="py-2 flex justify-between items-center">
            <span className="text-[#846E5F]">處理法</span>
            <span className="text-[#3D2C22]">{selectedBean.process}</span>
          </div>
          <div className="py-2 flex justify-between items-center">
            <span className="text-[#846E5F]">製作方式</span>
            <span className="font-medium text-[#2A1B13]">{brewMethod}</span>
          </div>
          <div className="py-2 flex justify-between items-center">
            <span className="text-[#846E5F]">溫度</span>
            <span
              className={`font-semibold ${
                temperature === '冰' ? 'text-[#3E5C76]' : 'text-[#98472B]'
              }`}
            >
              {temperature}
            </span>
          </div>
          <div className="py-2 flex justify-between items-center">
            <span className="text-[#846E5F]">數量</span>
            <span className="font-bold text-[#2A1B13]">{quantity} 杯</span>
          </div>
          <div className="py-2 flex justify-between items-start">
            <span className="text-[#846E5F] shrink-0">備註</span>
            <span className="text-[#594437] text-right italic max-w-[240px]">
              {note.trim() ? note.trim() : '無特殊備註'}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center border border-dashed border-[#D2C3B1] rounded-xl bg-[#FDFBF7]">
          <p className="text-xs sm:text-sm text-[#7D6758]">
            尚未選定咖啡豆，請先於上方透過「隨機轉盤」或「手動選豆」挑選一款咖啡豆。
          </p>
        </div>
      )}

      {/* 雲端儲存目標提示 */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1.5 text-[#6B5547]">
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#885A3A]" />
          <span>輸出目標：Orders 即時連線紀錄表</span>
        </div>
        <span className="text-emerald-700 font-semibold">● 來源與輸出已即時綁定連線</span>
      </div>

      {/* 未連線或錯誤提示 */}
      {submitError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <p className="leading-relaxed">{submitError}</p>
            {!sheetState.isConnected && (
              <button
                type="button"
                onClick={onConnectGoogle}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-700 text-white rounded-md font-medium text-xs hover:bg-amber-800 transition-colors cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                <span>立即連線 Google 帳號</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 確認送出按鈕 */}
      <div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="w-full py-3.5 px-5 bg-[#4A3225] hover:bg-[#382317] active:scale-99 text-[#FAF6F0] rounded-xl font-serif font-bold text-base transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-[#FAF6F0] border-t-transparent rounded-full animate-spin"></span>
              <span>寫入 Google Sheets 中...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 text-[#E6CDB5]" />
              <span>確認送出訂單</span>
            </>
          )}
        </button>
        {!selectedBean && (
          <p className="text-[11px] text-[#8C7667] text-center mt-2">
            請先選取咖啡豆後即可送出訂單
          </p>
        )}
      </div>
    </div>
  );
};
