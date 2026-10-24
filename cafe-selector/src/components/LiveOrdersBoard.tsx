import React, { useState } from 'react';
import { Order, BeanWish, SheetConnectionState } from '../types';
import { ORDERS_COLUMNS, WISH_COLUMNS } from '../services/googleSheets';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Clock,
  Coffee,
  Sparkles,
  Layers,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Settings,
} from 'lucide-react';

interface LiveOrdersBoardProps {
  orders: Order[];
  wishes: BeanWish[];
  sheetState: SheetConnectionState;
  hasWebhookOrAuth: boolean;
  onOpenSettings: () => void;
  onUpdateOrderStatus: (orderId: string, newStatus: '待製作' | '已確認' | '已完成') => void;
}

export const LiveOrdersBoard: React.FC<LiveOrdersBoardProps> = ({
  orders,
  wishes,
  sheetState,
  hasWebhookOrAuth,
  onOpenSettings,
  onUpdateOrderStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'wishes'>('orders');
  const [copiedType, setCopiedType] = useState<'orders' | 'wishes' | null>(null);

  // 匯出訂單 CSV (符合 Google Sheets 欄位架構)
  const handleExportOrdersCsv = () => {
    if (orders.length === 0) return;

    const headers = ORDERS_COLUMNS.join(',');
    const rows = orders.map((o) => [
      `"${o.orderId}"`,
      `"${o.createdAt}"`,
      `"${o.beanName}"`,
      `"${o.origin}"`,
      `"${o.process}"`,
      `"${o.brewMethod}"`,
      `"${o.temperature}"`,
      o.quantity,
      `"${(o.note || '').replace(/"/g, '""')}"`,
      `"${o.selectionMode}"`,
      `"${o.status}"`,
    ].join(','));

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Coffee_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 複製 Orders 資料以供直接貼入 Google Sheets
  const handleCopyOrdersTsv = () => {
    if (orders.length === 0) return;

    const headers = ORDERS_COLUMNS.join('\t');
    const rows = orders.map((o) => [
      o.orderId,
      o.createdAt,
      o.beanName,
      o.origin,
      o.process,
      o.brewMethod,
      o.temperature,
      o.quantity,
      o.note || '',
      o.selectionMode,
      o.status,
    ].join('\t'));

    const tsvContent = [headers, ...rows].join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopiedType('orders');
      setTimeout(() => setCopiedType(null), 2500);
    });
  };

  // 複製 Wishes 資料以供直接貼入 Google Sheets
  const handleCopyWishesTsv = () => {
    if (wishes.length === 0) return;

    const headers = WISH_COLUMNS.join('\t');
    const rows = wishes.map((w) => [
      w.wishId,
      w.createdAt,
      w.origin,
      w.process,
      w.otherProcess || '',
      w.status,
    ].join('\t'));

    const tsvContent = [headers, ...rows].join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopiedType('wishes');
      setTimeout(() => setCopiedType(null), 2500);
    });
  };

  const totalCups = orders.reduce((sum, o) => sum + (o.quantity || 1), 0);

  return (
    <section id="live-orders-board" className="bg-[#FAF7F2] border border-[#E6DCB8] rounded-3xl p-5 sm:p-7 shadow-2xs space-y-5">
      {/* 標題與即時同步標籤 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EAE0D0] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif font-bold text-lg sm:text-xl text-[#2B1B13]">
              Google Sheets 雲端即時同步紀錄表
            </h2>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              直連寫入 Google 試算表
            </span>
          </div>
          <p className="text-xs text-[#7B6656] mt-0.5">
            強制規範：所有訂單與許願一律直接寫入 Google Sheets（Orders 與 BeanWishList 工作表）
          </p>
        </div>

        {/* 分頁切換 (訂單記錄 / 許願紀錄) */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[#EFE7DA] p-1 rounded-full border border-[#D9CDBA]">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#4A3225] text-[#FAF6F0] shadow-xs'
                  : 'text-[#6C5648] hover:text-[#2C1D15]'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Orders 工作表 ({orders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wishes')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'wishes'
                  ? 'bg-[#4A3225] text-[#FAF6F0] shadow-xs'
                  : 'text-[#6C5648] hover:text-[#2C1D15]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>BeanWishList 工作表 ({wishes.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 若尚未配置輸出 Webhook 或 OAuth 授權，顯示明確警示以確保絕不只存在於 UI */}
      {!hasWebhookOrAuth && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>輸出綁定提醒：</strong>本平台依據指示嚴格限制「所有訂單必須直連寫入 Google Sheets」。請點擊右側設定 Google 試算表 Webhook 網址或登入授權！
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3 py-1.5 bg-[#4A3225] text-[#FAF6F0] hover:bg-[#382317] rounded-xl font-semibold flex items-center gap-1 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>立即設定輸出端</span>
          </button>
        </div>
      )}

      {/* 摘要數據小卡 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#F4EDE2] border border-[#DDD1C0] rounded-2xl p-3.5 flex flex-col justify-between">
          <span className="text-[#806B5D]">已寫入 Sheets 訂單</span>
          <span className="text-xl font-bold font-serif text-[#2F1F17] mt-1">{orders.length} 筆</span>
        </div>
        <div className="bg-[#F4EDE2] border border-[#DDD1C0] rounded-2xl p-3.5 flex flex-col justify-between">
          <span className="text-[#806B5D]">累計製作杯數</span>
          <span className="text-xl font-bold font-serif text-[#8C5E3C] mt-1">{totalCups} 杯</span>
        </div>
        <div className="bg-[#F4EDE2] border border-[#DDD1C0] rounded-2xl p-3.5 flex flex-col justify-between">
          <span className="text-[#806B5D]">待製作訂單</span>
          <span className="text-xl font-bold font-serif text-amber-800 mt-1">
            {orders.filter((o) => o.status === '待製作').length} 筆
          </span>
        </div>
        <div className="bg-[#F4EDE2] border border-[#DDD1C0] rounded-2xl p-3.5 flex flex-col justify-between">
          <span className="text-[#806B5D]">已寫入 Sheets 許願</span>
          <span className="text-xl font-bold font-serif text-[#4A3225] mt-1">{wishes.length} 則</span>
        </div>
      </div>

      {/* 主表格與輸出操作區 */}
      {activeTab === 'orders' ? (
        <div className="space-y-3">
          {/* 快捷操作列 */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-xs font-semibold text-[#4A3225] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#8C5E3C]" />
              <span>Google Sheets「Orders」工作表即時同步清單</span>
            </span>

            <div className="flex items-center gap-2">
              {sheetState.spreadsheetUrl && (
                <a
                  href={sheetState.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#EFE7DB] border border-[#D5C6B2] text-[#4A3225] rounded-xl text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#8C5E3C]" />
                  <span>開啟線上試算表</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleCopyOrdersTsv}
                disabled={orders.length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#EFE7DB] border border-[#D5C6B2] text-[#4A3225] rounded-xl text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                title="複製符合 Google Sheets 欄位格式之訂單列"
              >
                {copiedType === 'orders' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-emerald-700 font-semibold">已複製 Sheet 列！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#8C5E3C]" />
                    <span>複製貼入 Google Sheet</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportOrdersCsv}
                disabled={orders.length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#4A3225] hover:bg-[#382317] text-[#FAF6F0] rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>匯出 Orders.csv</span>
              </button>
            </div>
          </div>

          {/* 訂單卡片/表格 */}
          {orders.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#D2C3B1] rounded-2xl bg-[#FDFBF7]">
              <Coffee className="w-8 h-8 text-[#A89484] mx-auto mb-2 opacity-60" />
              <p className="text-xs sm:text-sm font-medium text-[#7D6758]">
                尚無訂單寫入紀錄
              </p>
              <p className="text-[11px] text-[#A89484] mt-0.5">
                於上方選擇咖啡豆與飲品參數後點擊送出，訂單將直連寫入 Google Sheets 並即時顯示於此看板。
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {orders.map((order) => (
                <div
                  key={order.orderId}
                  className="p-3.5 bg-[#FDFBF7] border border-[#E0D5C3] hover:border-[#C4B29C] rounded-2xl transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#8C5E3C] bg-[#EFE7DA] px-2 py-0.5 rounded-md">
                        {order.orderId}
                      </span>
                      <span className="font-serif font-bold text-sm text-[#2C1D15]">
                        {order.beanName}
                      </span>
                      <span className="text-[11px] text-[#7A6455] bg-[#F2ECE1] px-2 py-0.5 rounded-full">
                        {order.origin} · {order.process}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          order.temperature === '冰'
                            ? 'text-sky-800 bg-sky-100/90'
                            : 'text-amber-800 bg-amber-100/90'
                        }`}
                      >
                        {order.temperature}
                      </span>
                      <span className="text-xs font-semibold text-[#4A3225]">
                        {order.brewMethod} × {order.quantity} 杯
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        已同步 Google Sheets
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#857063]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#A89484]" />
                        {order.createdAt}
                      </span>
                      <span>模式：{order.selectionMode === 'random' ? '轉盤抽選' : '手動自選'}</span>
                      {order.note && (
                        <span className="text-[#594437] italic">備註：{order.note}</span>
                      )}
                    </div>
                  </div>

                  {/* 狀態切換按鈕 */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    {(['待製作', '已確認', '已完成'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onUpdateOrderStatus(order.orderId, st)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          order.status === st
                            ? st === '已完成'
                              ? 'bg-emerald-800 text-white shadow-2xs'
                              : st === '已確認'
                              ? 'bg-[#4A3225] text-white shadow-2xs'
                              : 'bg-amber-700 text-white shadow-2xs'
                            : 'bg-[#EFE7DA] text-[#6C5648] hover:bg-[#E5DAC9]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 許願池紀錄清單 */
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-xs font-semibold text-[#4A3225] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8C5E3C]" />
              <span>Google Sheets「BeanWishList」工作表即時同步清單</span>
            </span>

            <button
              type="button"
              onClick={handleCopyWishesTsv}
              disabled={wishes.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#EFE7DB] border border-[#D5C6B2] text-[#4A3225] rounded-xl text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {copiedType === 'wishes' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-emerald-700 font-semibold">已複製許願列！</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#8C5E3C]" />
                  <span>複製貼入 Google Sheet</span>
                </>
              )}
            </button>
          </div>

          {wishes.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#D2C3B1] rounded-2xl bg-[#FDFBF7]">
              <Sparkles className="w-8 h-8 text-[#A89484] mx-auto mb-2 opacity-60" />
              <p className="text-xs sm:text-sm font-medium text-[#7D6758]">
                尚無許願寫入紀錄
              </p>
              <p className="text-[11px] text-[#A89484] mt-0.5">
                於下方「豆子許願池」提交想喝的產區與處理法，將直連寫入 Google Sheets「BeanWishList」。
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {wishes.map((wish) => (
                <div
                  key={wish.wishId}
                  className="p-3.5 bg-[#FDFBF7] border border-[#E0D5C3] rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#8C5E3C] bg-[#EFE7DA] px-2 py-0.5 rounded-md">
                        {wish.wishId}
                      </span>
                      <span className="font-bold text-[#2C1D15]">
                        期望產地：{wish.origin}
                      </span>
                      <span className="text-[11px] text-[#7A6455] bg-[#F2ECE1] px-2 py-0.5 rounded-full">
                        處理法：{wish.process} {wish.otherProcess ? `(${wish.otherProcess})` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        已同步 Google Sheets
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-[#857063]">
                      <Clock className="w-3 h-3 text-[#A89484]" />
                      {wish.createdAt}
                    </span>
                  </div>

                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-lg shrink-0">
                    已收錄至 Sheets
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
