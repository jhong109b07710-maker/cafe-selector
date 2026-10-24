import React, { useState } from 'react';
import { SheetConnectionState } from '../types';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LogIn,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Code2,
  Send,
  Zap,
} from 'lucide-react';
import {
  ORDERS_COLUMNS,
  WISH_COLUMNS,
  BEAN_LIST_COLUMNS,
  APPS_SCRIPT_TEMPLATE,
} from '../services/googleSheets';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetState: SheetConnectionState;
  webhookUrl?: string;
  onSaveWebhookUrl?: (url: string) => void;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
  onRefreshSpreadsheet: () => void;
  onCustomSheetIdSave?: (sheetId: string) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  sheetState,
  webhookUrl = '',
  onSaveWebhookUrl,
  onConnectGoogle,
  onDisconnectGoogle,
  onRefreshSpreadsheet,
  onCustomSheetIdSave,
}) => {
  const [customSheetInput, setCustomSheetInput] = useState('');
  const [webhookInput, setWebhookInput] = useState(webhookUrl);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptBox, setShowScriptBox] = useState(false);
  const [webhookSavedNotice, setWebhookSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleCopyId = () => {
    if (sheetState.spreadsheetId) {
      navigator.clipboard.writeText(sheetState.spreadsheetId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleSaveWebhook = () => {
    if (onSaveWebhookUrl) {
      onSaveWebhookUrl(webhookInput.trim());
      setWebhookSavedNotice(true);
      setTimeout(() => setWebhookSavedNotice(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FAF7F2] border border-[#D5C6B3] rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E8DFC8] flex items-center justify-between bg-[#F5EFEB]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#4A3225] text-[#FAF6F0]">
              <FileSpreadsheet className="w-5 h-5 text-[#E6CDB5]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#2C1D15]">
                Google Sheets 雲端輸出入綁定設定
              </h3>
              <p className="text-xs text-[#7B6656]">
                強制規範：所有豆單來源與訂單輸出皆直連 Google 試算表
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#7B6656] hover:text-[#2C1D15] rounded-full hover:bg-[#EAE0D1] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-[#443126]">
          {/* 模式 A：Google Apps Script Webhook 直連（免登入即時雙向輸出入） */}
          <div className="p-4 rounded-2xl border border-[#D8C7B5] bg-[#F7F1E6] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#3D281D]">
                <Zap className="w-4 h-4 text-[#8C5E3C]" />
                <h4 className="font-bold text-sm">
                  方式一：Google 試算表 Webhook 直連 (免登入最推薦)
                </h4>
              </div>
              {webhookUrl ? (
                <span className="text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                  已啟用直連輸出
                </span>
              ) : (
                <span className="text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                  未配置
                </span>
              )}
            </div>

            <p className="text-xs text-[#6F5B4E] leading-relaxed">
              填入 Google 試算表的 Apps Script 網頁應用程式網址，平台將直接將每一筆訂單與許願即時寫入試算表的「Orders」與「BeanWishList」分頁，<strong>免登入、無彈窗、直連雲端</strong>！
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#4A3225] block">
                Google Apps Script Web App 網址：
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookInput}
                  onChange={(e) => setWebhookInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-2 bg-white border border-[#D5C4B0] rounded-xl text-xs text-[#2C1D15] placeholder-[#A89484] focus:outline-none focus:ring-1 focus:ring-[#8C5E3C]"
                />
                <button
                  type="button"
                  onClick={handleSaveWebhook}
                  className="px-4 py-2 bg-[#4A3225] hover:bg-[#382317] text-[#FAF6F0] rounded-xl text-xs font-semibold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>儲存綁定</span>
                </button>
              </div>

              {webhookSavedNotice && (
                <p className="text-xs text-emerald-800 font-medium animate-fadeIn">
                  ✓ Webhook 網址已儲存！所有訂單輸出將直連寫入該 Google 試算表。
                </p>
              )}
            </div>

            {/* Apps Script 快速建置說明與範本 */}
            <div className="pt-2 border-t border-[#E3D7C5]">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowScriptBox((prev) => !prev)}
                  className="text-xs font-semibold text-[#8C5E3C] hover:text-[#5C3920] flex items-center gap-1 cursor-pointer underline underline-offset-2"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showScriptBox ? '隱藏' : '查看'} 10 行免登入 Google Apps Script 腳本範本</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-[#D5C6B2] hover:bg-[#FAF7F2] text-[#4A3225] rounded-lg font-medium cursor-pointer"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-700" />
                      <span className="text-emerald-700">已複製腳本！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#8C5E3C]" />
                      <span>一鍵複製腳本</span>
                    </>
                  )}
                </button>
              </div>

              {showScriptBox && (
                <div className="mt-2.5 space-y-2 text-[11px] text-[#635043] animate-fadeIn">
                  <ol className="list-decimal list-inside space-y-1 bg-white/70 p-3 rounded-xl border border-[#DDD0BE]">
                    <li>在您的 Google 試算表中，點擊上方選單【擴充功能】→【Apps Script】。</li>
                    <li>將下方腳本貼上覆蓋既有內容，點擊右上角【部署】→【新部署】。</li>
                    <li>種類選擇【網頁應用程式】，將「誰可以存取」設為【所有人】。</li>
                    <li>點擊【部署】並複製產生的網頁應用程式網址，貼回上方輸入框即可完成！</li>
                  </ol>
                  <pre className="p-3 bg-[#2A1D17] text-[#FAF6F0] rounded-xl text-[11px] font-mono overflow-x-auto max-h-40 leading-relaxed">
                    {APPS_SCRIPT_TEMPLATE}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* 模式 B：Google 帳號 OAuth 官方授權 */}
          <div
            className={`p-4 rounded-2xl border ${
              sheetState.isConnected && sheetState.connectionMode === 'oauth'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-[#FAF4EB] border-[#D8C7B5] text-[#3D281D]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {sheetState.isConnected && sheetState.connectionMode === 'oauth' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                ) : (
                  <LogIn className="w-5 h-5 text-[#8C5E3C] shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    方式二：Google 官方 OAuth 授權 (個人雲端硬碟)
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5">
                    {sheetState.connectionMode === 'oauth'
                      ? `已連線帳號：${sheetState.userEmail || 'Google 使用者'}`
                      : '登入後直接透過 Google Sheets REST API 寫入雲端硬碟試算表'}
                  </p>
                </div>
              </div>

              {sheetState.connectionMode === 'oauth' ? (
                <button
                  type="button"
                  onClick={onDisconnectGoogle}
                  className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100/50 text-emerald-800 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>中斷登入</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onConnectGoogle}
                  disabled={sheetState.isLoading}
                  className="px-4 py-2 bg-[#4A3225] hover:bg-[#382317] text-[#FAF6F0] rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {sheetState.isLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-[#FAF6F0] border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <LogIn className="w-3.5 h-3.5" />
                  )}
                  <span>登入授權</span>
                </button>
              )}
            </div>
          </div>

          {/* 試算表 ID 與連結 */}
          {sheetState.spreadsheetId && (
            <div className="p-4 bg-[#F2ECE1] rounded-2xl border border-[#DDD3C1] space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#635144]">綁定之 Google 試算表 ID</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[11px] bg-white/80 px-2 py-0.5 rounded border border-[#DDD3C1]">
                    {sheetState.spreadsheetId.substring(0, 16)}...
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 hover:bg-[#E5DAC9] rounded text-[#635144]"
                    title="複製完整 ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                {sheetState.spreadsheetUrl && (
                  <a
                    href={sheetState.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#8C5E3C] hover:text-[#5C3920] font-semibold underline underline-offset-2"
                  >
                    <span>在 Google Sheets 開啟此試算表</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={onRefreshSpreadsheet}
                  disabled={sheetState.isLoading}
                  className="inline-flex items-center gap-1 text-xs text-[#7B6656] hover:text-[#2C1D15] cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sheetState.isLoading ? 'animate-spin' : ''}`} />
                  <span>重新讀取 BeanList 豆單</span>
                </button>
              </div>
            </div>
          )}

          {/* 試算表欄位架構說明 */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-[#523C2F] tracking-wide uppercase">
              Google Sheets 試算表工作表與欄位規範
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] border border-[#E0D5C3] rounded-xl">
                <span className="font-bold text-[#2E1E16] block mb-1">
                  來源：BeanList ({BEAN_LIST_COLUMNS.length} 欄位)
                </span>
                <p className="text-[11px] text-[#786455] leading-relaxed">
                  {BEAN_LIST_COLUMNS.join(' · ')}
                </p>
                <span className="text-[10px] text-emerald-800 font-medium block mt-1">★ 轉盤與選豆來源</span>
              </div>
              <div className="p-3 bg-[#FAF8F5] border border-[#E0D5C3] rounded-xl">
                <span className="font-bold text-[#2E1E16] block mb-1">
                  輸出：Orders ({ORDERS_COLUMNS.length} 欄位)
                </span>
                <p className="text-[11px] text-[#786455] leading-relaxed">
                  {ORDERS_COLUMNS.join(' · ')}
                </p>
                <span className="text-[10px] text-emerald-800 font-medium block mt-1">★ 訂單直連寫入</span>
              </div>
              <div className="p-3 bg-[#FAF8F5] border border-[#E0D5C3] rounded-xl">
                <span className="font-bold text-[#2E1E16] block mb-1">
                  輸出：BeanWishList ({WISH_COLUMNS.length} 欄位)
                </span>
                <p className="text-[11px] text-[#786455] leading-relaxed">
                  {WISH_COLUMNS.join(' · ')}
                </p>
                <span className="text-[10px] text-amber-800 font-medium block mt-1">★ 許願直連寫入</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
