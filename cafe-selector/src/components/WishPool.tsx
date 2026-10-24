import React, { useState } from 'react';
import { BeanWish, SheetConnectionState } from '../types';
import { Sparkles, HeartHandshake, CheckCircle2, AlertCircle, Send, LogIn } from 'lucide-react';

interface WishPoolProps {
  sheetState: SheetConnectionState;
  onConnectGoogle: () => void;
  onSubmitWish: (wish: BeanWish) => Promise<boolean>;
}

const COMMON_PROCESSES = ['水洗', '日曬', '蜜處理', '厭氧發酵', '其他'];

export const WishPool: React.FC<WishPoolProps> = ({
  sheetState,
  onConnectGoogle,
  onSubmitWish,
}) => {
  const [origin, setOrigin] = useState('');
  const [process, setProcess] = useState('水洗');
  const [otherProcess, setOtherProcess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedWish, setSubmittedWish] = useState<BeanWish | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedOrigin = origin.trim();
    if (!trimmedOrigin) {
      setErrorMessage('請輸入您希望喝到的咖啡豆產地');
      return;
    }

    if (process === '其他' && !otherProcess.trim()) {
      setErrorMessage('請填寫其他處理法的詳細名稱或說明');
      return;
    }

    // 檢查 Google Sheets 連線狀態
    if (!sheetState.isConnected || !sheetState.spreadsheetId) {
      setErrorMessage('尚未連接 Google Sheets 雲端試算表。請先登入 Google 帳號授權，以將許願記錄儲存至 BeanWishList 工作表。已填寫的內容已為您保留。');
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const wishId = `WSH-${dateStr}-${randCode}`;
    const createdAt = now.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      hour12: false,
    });

    const newWish: BeanWish = {
      wishId,
      createdAt,
      origin: trimmedOrigin,
      process: process === '其他' ? '其他' : process,
      otherProcess: process === '其他' ? otherProcess.trim() : '',
      status: 'pending',
    };

    try {
      const success = await onSubmitWish(newWish);
      if (success) {
        setSubmittedWish(newWish);
        // 清空表單
        setOrigin('');
        setProcess('水洗');
        setOtherProcess('');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || '許願送出失敗，請檢查網路連線或稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-16 pt-10 border-t border-[#E8DFC8]">
      <div className="bg-gradient-to-b from-[#F7F2EA] to-[#F1EAE0] border border-[#DDD0BE] rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto shadow-xs">
        {/* Header */}
        <div className="text-center max-w-md mx-auto mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#E5D5C1] text-[#4A3225] mb-2 shadow-2xs">
            <HeartHandshake className="w-5 h-5 text-[#6B4B35]" />
          </div>
          <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#2B1B13]">
            豆子許願池
          </h3>
          <p className="text-xs sm:text-sm text-[#705A4B] mt-1.5 leading-relaxed">
            希望下一次喝到什麼風味？告訴我們你期待的咖啡豆。
          </p>
        </div>

        {/* 成功許願提示 */}
        {submittedWish ? (
          <div className="bg-[#FAF7F2] border border-emerald-300 rounded-2xl p-6 text-center space-y-3 animate-fadeIn">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-serif font-bold text-lg text-[#2A1D15]">
              收到您的許願了！
            </h4>
            <p className="text-xs sm:text-sm text-[#6C584A] leading-relaxed">
              許願編號：<span className="font-mono font-bold text-[#2A1D15]">{submittedWish.wishId}</span>
              <br />
              產地「{submittedWish.origin}」與處理法「{submittedWish.process === '其他' ? submittedWish.otherProcess : submittedWish.process}」已即時寫入 Google Sheets 許願池清單！
            </p>
            <button
              type="button"
              onClick={() => setSubmittedWish(null)}
              className="mt-2 px-5 py-2 rounded-full bg-[#4A3225] text-[#FAF6F0] text-xs font-medium hover:bg-[#382317] transition-colors cursor-pointer"
            >
              再許願一款咖啡豆
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. 產地 */}
            <div>
              <label className="block text-xs font-semibold text-[#483427] mb-1.5">
                希望提供的產地 <span className="text-[#A44331]">*必填</span>
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="例如：衣索比亞、哥倫比亞、巴拿馬、肯亞、台灣阿里山……"
                className="w-full text-sm rounded-xl border border-[#D5C6B3] bg-[#FAF8F5] px-3.5 py-2.5 text-[#2C1D15] placeholder-[#A59283] focus:border-[#866045] focus:ring-1 focus:ring-[#866045] outline-none transition-all"
              />
            </div>

            {/* 2. 處理法 */}
            <div>
              <label className="block text-xs font-semibold text-[#483427] mb-1.5">
                希望提供的處理法 <span className="text-[#A44331]">*必選</span>
              </label>
              <div className="relative">
                <select
                  value={process}
                  onChange={(e) => setProcess(e.target.value)}
                  className="w-full text-sm rounded-xl border border-[#D5C6B3] bg-[#FAF8F5] px-3.5 py-2.5 text-[#2C1D15] focus:border-[#866045] focus:ring-1 focus:ring-[#866045] outline-none transition-all appearance-none cursor-pointer"
                >
                  {COMMON_PROCESSES.map((proc) => (
                    <option key={proc} value={proc}>
                      {proc}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#7D6B5F] text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* 2-1. 其他處理法額外說明 */}
            {process === '特殊' || process === '其他' ? (
              <div className="animate-fadeIn">
                <label className="block text-xs font-semibold text-[#483427] mb-1.5">
                  其他處理法補充說明 <span className="text-[#A44331]">*必填</span>
                </label>
                <input
                  type="text"
                  value={otherProcess}
                  onChange={(e) => setOtherProcess(e.target.value)}
                  placeholder="例如：雙重厭氧、乳酸發酵、酵母浸漬、二氧化碳浸漬法……"
                  className="w-full text-sm rounded-xl border border-[#D5C6B3] bg-[#FAF8F5] px-3.5 py-2.5 text-[#2C1D15] placeholder-[#A59283] focus:border-[#866045] focus:ring-1 focus:ring-[#866045] outline-none transition-all"
                />
              </div>
            ) : null}

            {/* 錯誤提示 */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p>{errorMessage}</p>
                  {!sheetState.isConnected && (
                    <button
                      type="button"
                      onClick={onConnectGoogle}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-700 text-white rounded text-xs font-medium hover:bg-amber-800 transition-colors"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>連線 Google 帳號</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 送出按鈕 */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-5 bg-[#5A3F30] hover:bg-[#462F23] active:scale-99 text-[#FAF6F0] rounded-xl font-serif font-semibold text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#FAF6F0] border-t-transparent rounded-full animate-spin"></span>
                    <span>寫入許願池中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#E6CDB5]" />
                    <span>送出許願</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};
