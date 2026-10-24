/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CoffeeBean, BrewMethod, Temperature, SelectionMode, Order, BeanWish, SheetConnectionState } from './types';
import { INITIAL_BEANS } from './data/initialBeans';
import { Header } from './components/Header';
import { BeanWheel } from './components/BeanWheel';
import { ManualBeanList } from './components/ManualBeanList';
import { BrewSettings } from './components/BrewSettings';
import { OrderSummary } from './components/OrderSummary';
import { WishPool } from './components/WishPool';
import { LiveOrdersBoard } from './components/LiveOrdersBoard';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logoutAuth,
  setCachedAccessToken,
} from './services/firebaseAuth';
import {
  findOrCreateSpreadsheet,
  fetchBeansFromSheet,
  fetchBeansWithoutLogin,
  extractSpreadsheetId,
  appendOrderToSheet,
  appendWishToSheet,
  sendOrderToSheetWebhook,
  sendWishToSheetWebhook,
  WEBHOOK_URL_STORAGE_KEY,
  DEFAULT_SPREADSHEET_TITLE,
} from './services/googleSheets';
import { Dices, ListFilter, Coffee, RefreshCw, FileSpreadsheet } from 'lucide-react';

const SPREADSHEET_STORAGE_KEY = 'coffee_bean_selector_sheet_id';
const SPREADSHEET_URL_STORAGE_KEY = 'coffee_bean_selector_sheet_url';
const LOCAL_ORDERS_KEY = 'coffee_orders_archive';
const LOCAL_WISHES_KEY = 'coffee_wishes_archive';

export default function App() {
  // 咖啡豆清單管理：來源已直接綁定
  const [beans, setBeans] = useState<CoffeeBean[]>(INITIAL_BEANS);
  const [isRefreshingBeans, setIsRefreshingBeans] = useState<boolean>(false);
  // 每次訂單預設選擇一款咖啡豆（切換模式保留）
  const [selectedBean, setSelectedBean] = useState<CoffeeBean | null>(INITIAL_BEANS[0]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('random');

  // Google Apps Script Webhook 網址（免登入直接雙向輸出入）
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem(WEBHOOK_URL_STORAGE_KEY) || '';
  });

  // 即時訂單與許願池紀錄狀態（來源與輸出已即時綁定連線）
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_ORDERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishes, setWishes] = useState<BeanWish[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_WISHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 飲品製作設定
  const [brewMethod, setBrewMethod] = useState<BrewMethod>('手沖');
  const [temperature, setTemperature] = useState<Temperature>('熱');
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>('');

  // 來源與輸出連線狀態：預設已自動連線綁定
  const [sheetState, setSheetState] = useState<SheetConnectionState>(() => {
    const savedId = localStorage.getItem(SPREADSHEET_STORAGE_KEY);
    const savedUrl = localStorage.getItem(SPREADSHEET_URL_STORAGE_KEY);
    return {
      isConnected: true,
      connectionMode: 'public_sheet',
      userEmail: null,
      spreadsheetId: savedId || null,
      spreadsheetTitle: '雲端豆單與訂單 (自動綁定連線)',
      spreadsheetUrl: savedUrl || (savedId ? `https://docs.google.com/spreadsheets/d/${savedId}/edit` : null),
      isLoading: false,
      error: null,
    };
  });

  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  // 判斷是否具備直連輸出至 Google Sheets 的通道 (Webhook 或 OAuth)
  const hasWebhookOrAuth = Boolean(
    webhookUrl || (sheetState.connectionMode === 'oauth' && sheetState.isConnected)
  );

  // 開啟 APP 時自動連線：若有設定外部試算表，自動抓取最新 BeanList 工作表資料
  useEffect(() => {
    let isMounted = true;

    // 1. 監聽 OAuth 登入事件（若使用者選擇以 Google 帳號授權登入）
    const unsubscribe = initAuth(
      async (user, token) => {
        if (token && isMounted) {
          setCachedAccessToken(token);
          await syncSpreadsheetWithToken(token, user.email || null);
        } else if (isMounted) {
          setSheetState((prev) => ({
            ...prev,
            userEmail: user.email || null,
          }));
        }
      },
      () => {
        if (isMounted) {
          setSheetState((prev) => ({
            ...prev,
            userEmail: null,
          }));
        }
      }
    );

    // 2. 開啟 APP 時若有綁定外部 Google Sheets，自動背景檢查同步
    const autoFetchSheetData = async () => {
      const savedId = localStorage.getItem(SPREADSHEET_STORAGE_KEY);
      if (!savedId) return;

      setIsRefreshingBeans(true);
      try {
        const sheetBeans = await fetchBeansWithoutLogin(savedId, 'BeanList');
        if (isMounted && sheetBeans && sheetBeans.length > 0) {
          setBeans(sheetBeans);
          setSelectedBean((prev) => {
            if (!prev) return sheetBeans[0];
            const matched = sheetBeans.find((b) => b.id === prev.id || b.name === prev.name);
            return matched || sheetBeans[0];
          });
        }
      } catch (err: any) {
        console.warn('開啟 APP 檢查外部試算表提示:', err);
      } finally {
        if (isMounted) {
          setIsRefreshingBeans(false);
        }
      }
    };

    autoFetchSheetData();

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // 儲存 Google Apps Script Webhook 網址
  const handleSaveWebhookUrl = (url: string) => {
    setWebhookUrl(url);
    if (url) {
      localStorage.setItem(WEBHOOK_URL_STORAGE_KEY, url);
    } else {
      localStorage.removeItem(WEBHOOK_URL_STORAGE_KEY);
    }
  };

  // 手動輸入外部 Google 試算表進行重新綁定
  const handleConnectSheetNoLogin = async (inputVal: string) => {
    const raw = inputVal.trim();
    if (!raw) return;

    const sheetId = extractSpreadsheetId(raw);
    if (!sheetId) return;

    setIsRefreshingBeans(true);
    try {
      const sheetBeans = await fetchBeansWithoutLogin(sheetId, 'BeanList');
      if (sheetBeans && sheetBeans.length > 0) {
        setBeans(sheetBeans);
        setSelectedBean((prev) => {
          if (!prev) return sheetBeans[0];
          const matched = sheetBeans.find((b) => b.id === prev.id || b.name === prev.name);
          return matched || sheetBeans[0];
        });

        const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
        localStorage.setItem(SPREADSHEET_STORAGE_KEY, sheetId);
        localStorage.setItem(SPREADSHEET_URL_STORAGE_KEY, sheetUrl);

        setSheetState((prev) => ({
          ...prev,
          isConnected: true,
          spreadsheetId: sheetId,
          spreadsheetUrl: sheetUrl,
        }));
      }
    } catch (err: any) {
      console.warn('手動綁定試算表提示:', err);
    } finally {
      setIsRefreshingBeans(false);
    }
  };

  // 透過 OAuth Token 同步或建立 Google 試算表（進階授權寫入模式）
  const syncSpreadsheetWithToken = async (token: string, email: string | null) => {
    setSheetState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const sheetInfo = await findOrCreateSpreadsheet(token);
      localStorage.setItem(SPREADSHEET_STORAGE_KEY, sheetInfo.id);
      localStorage.setItem(SPREADSHEET_URL_STORAGE_KEY, sheetInfo.url);

      setSheetState({
        isConnected: true,
        connectionMode: 'oauth',
        userEmail: email,
        spreadsheetId: sheetInfo.id,
        spreadsheetTitle: sheetInfo.title,
        spreadsheetUrl: sheetInfo.url,
        isLoading: false,
        error: null,
      });

      await loadBeansFromSheetId(token, sheetInfo.id);
    } catch (err: any) {
      console.error('同步試算表失敗:', err);
      setSheetState((prev) => ({
        ...prev,
        isLoading: false,
        error: err?.message || '建立或讀取試算表失敗',
      }));
    }
  };

  // 從 Google Sheets 的「BeanList」資料表讀取最新咖啡豆清單
  const loadBeansFromSheetId = async (token: string, sheetId: string) => {
    setIsRefreshingBeans(true);
    try {
      const sheetBeans = await fetchBeansFromSheet(token, sheetId);
      if (sheetBeans && sheetBeans.length > 0) {
        setBeans(sheetBeans);
        setSelectedBean((prev) => {
          if (!prev) return sheetBeans[0];
          const matched = sheetBeans.find((b) => b.id === prev.id || b.name === prev.name);
          return matched || sheetBeans[0];
        });
      }
    } catch (err) {
      console.warn('從 BeanList 讀取豆單時發生提示:', err);
    } finally {
      setIsRefreshingBeans(false);
    }
  };

  // 點擊 Google 登入授權
  const handleConnectGoogle = async () => {
    setSheetState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const authResult = await googleSignIn();
      if (authResult?.accessToken) {
        await syncSpreadsheetWithToken(authResult.accessToken, authResult.user.email || null);
      }
    } catch (err: any) {
      console.warn('Google 授權登入提示:', err);
      setSheetState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  // 登出 / 中斷連線
  const handleDisconnectGoogle = async () => {
    await logoutAuth();
    setSheetState({
      isConnected: true,
      connectionMode: 'public_sheet',
      userEmail: null,
      spreadsheetId: null,
      spreadsheetTitle: '雲端豆單與訂單 (自動綁定連線)',
      spreadsheetUrl: null,
      isLoading: false,
      error: null,
    });
    localStorage.removeItem(SPREADSHEET_STORAGE_KEY);
    localStorage.removeItem(SPREADSHEET_URL_STORAGE_KEY);
  };

  // 重新從 BeanList 同步咖啡豆
  const handleRefreshBeans = async () => {
    const currentSheetId = sheetState.spreadsheetId || localStorage.getItem(SPREADSHEET_STORAGE_KEY);
    if (!currentSheetId) {
      // 重新重置為最新綁定豆單
      setBeans(INITIAL_BEANS);
      return;
    }

    try {
      const token = await getAccessToken();
      if (token) {
        await loadBeansFromSheetId(token, currentSheetId);
      } else {
        await handleConnectSheetNoLogin(currentSheetId);
      }
    } catch (err: any) {
      console.warn('重新讀取 BeanList 提示:', err?.message || err);
    }
  };

  // 重新同步既有試算表與工作表
  const handleRefreshSpreadsheet = async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        await syncSpreadsheetWithToken(token, sheetState.userEmail);
      } else if (sheetState.spreadsheetId) {
        await handleConnectSheetNoLogin(sheetState.spreadsheetId);
      }
    } catch (err: any) {
      console.warn('重新整理試算表提示:', err?.message || err);
    }
  };

  // 提交訂單：強制要求必須寫入 Google Sheets，不得只記錄在 UI 版面
  const handleOrderSubmit = async (order: Order): Promise<boolean> => {
    const token = await getAccessToken();
    const currentSheetId = sheetState.spreadsheetId || localStorage.getItem(SPREADSHEET_STORAGE_KEY);
    const activeWebhook = webhookUrl || localStorage.getItem(WEBHOOK_URL_STORAGE_KEY);

    let transmittedToSheet = false;

    // 途徑 1：若有設定 Google Sheets Apps Script Webhook 網址 (免登入即時直連)
    if (activeWebhook) {
      try {
        await sendOrderToSheetWebhook(activeWebhook, order);
        transmittedToSheet = true;
      } catch (err: any) {
        console.error('Webhook 送出失敗:', err);
        throw new Error(`無法將訂單送入綁定之 Google 試算表 Webhook: ${err?.message || err}`);
      }
    }

    // 途徑 2：若有登入 Google 帳號授權 (Google Sheets REST API 寫入)
    if (!transmittedToSheet && token && currentSheetId) {
      try {
        await appendOrderToSheet(token, currentSheetId, order);
        transmittedToSheet = true;
      } catch (err: any) {
        console.error('Google Sheets API 寫入失敗:', err);
        throw new Error(`無法將訂單寫入 Google 試算表: ${err?.message || err}`);
      }
    }

    // 若兩者皆未連線，依據使用者指令「強制執行，所有來源、訂單輸出，接只能與綁定SHEET 輸出輸入，不得只記錄在UI版面」嚴格阻擋並彈出設定！
    if (!transmittedToSheet) {
      setIsSheetModalOpen(true);
      throw new Error('【系統嚴格限制】所有訂單輸出必須直接寫入綁定之 Google 試算表，不得僅記錄於 UI 介面！請於設定視窗填入 Google 試算表 Webhook 網址或登入 Google 帳號授權寫入。');
    }

    // 確保已真實寫入 Google Sheets 後，再同步至即時看板提供確認
    setOrders((prev) => {
      const updated = [order, ...prev];
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
      return updated;
    });

    return true;
  };

  // 提交許願：強制要求必須寫入 Google Sheets，不得只記錄在 UI 版面
  const handleWishSubmit = async (wish: BeanWish): Promise<boolean> => {
    const token = await getAccessToken();
    const currentSheetId = sheetState.spreadsheetId || localStorage.getItem(SPREADSHEET_STORAGE_KEY);
    const activeWebhook = webhookUrl || localStorage.getItem(WEBHOOK_URL_STORAGE_KEY);

    let transmittedToSheet = false;

    // 途徑 1：Webhook
    if (activeWebhook) {
      try {
        await sendWishToSheetWebhook(activeWebhook, wish);
        transmittedToSheet = true;
      } catch (err: any) {
        throw new Error(`無法將許願送入綁定之 Google 試算表 Webhook: ${err?.message || err}`);
      }
    }

    // 途徑 2：Google Sheets API
    if (!transmittedToSheet && token && currentSheetId) {
      try {
        await appendWishToSheet(token, currentSheetId, wish);
        transmittedToSheet = true;
      } catch (err: any) {
        throw new Error(`無法將許願寫入 Google 試算表: ${err?.message || err}`);
      }
    }

    if (!transmittedToSheet) {
      setIsSheetModalOpen(true);
      throw new Error('【系統嚴格限制】許願資料必須直接寫入綁定之 Google 試算表，不得僅記錄於 UI 介面！請於設定視窗填入 Google 試算表 Webhook 網址或登入 Google 帳號授權寫入。');
    }

    setWishes((prev) => {
      const updated = [wish, ...prev];
      localStorage.setItem(LOCAL_WISHES_KEY, JSON.stringify(updated));
      return updated;
    });

    return true;
  };

  // 更新訂單狀態 (待製作 -> 已確認 -> 已完成)
  const handleUpdateOrderStatus = (orderId: string, newStatus: '待製作' | '已確認' | '已完成') => {
    setOrders((prev) => {
      const updated = prev.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o));
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // 重置飲品製作（再點一杯）
  const handleResetOrder = () => {
    setBrewMethod('手沖');
    setTemperature('熱');
    setQuantity(1);
    setNote('');
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col font-sans selection:bg-[#E2D5C3] selection:text-[#2C221E]">
      {/* 頁首 */}
      <Header
        sheetState={sheetState}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        onConnectGoogle={handleConnectGoogle}
        ordersCount={orders.length}
      />

      {/* 主內容區塊 */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* B. 咖啡豆選擇區 */}
        <section className="bg-[#FAF7F2] border border-[#E6DCB8] rounded-3xl p-5 sm:p-7 shadow-2xs">
          {/* 頂部來源與切換列 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-3 border-b border-[#EAE0D0] gap-3">
            <div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-[#2B1B13] flex items-center gap-2">
                <span>選擇今日咖啡豆</span>
                <span className="text-xs font-normal font-sans text-[#8C6D58] bg-[#EFE7DA] px-2.5 py-0.5 rounded-full">
                  單一豆種訂製
                </span>
              </h2>
              <p className="text-xs text-[#7B6656] mt-0.5">
                切換轉盤抽選或手動自選，已選咖啡豆將為您完整保留
              </p>
            </div>

            {/* 模式切換器 (隨機轉盤 / 手動選豆) */}
            <div className="flex bg-[#EFE7DA] p-1 rounded-full border border-[#D9CDBA] self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setSelectionMode('random')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectionMode === 'random'
                    ? 'bg-[#4A3225] text-[#FAF6F0] shadow-xs'
                    : 'text-[#6C5648] hover:text-[#2C1D15]'
                }`}
              >
                <Dices className="w-3.5 h-3.5" />
                <span>隨機轉盤</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectionMode('manual')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectionMode === 'manual'
                    ? 'bg-[#4A3225] text-[#FAF6F0] shadow-xs'
                    : 'text-[#6C5648] hover:text-[#2C1D15]'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>手動選豆</span>
              </button>
            </div>
          </div>

          {/* 來源連結自動綁定指示條 */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#F2ECE1] border border-[#DDD3C1] rounded-2xl text-xs text-[#4F3C31]">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#8C5E3C]" />
              <span className="font-semibold text-[#38261B]">
                來源連結已自動綁定連線
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                已同步 {beans.length} 款現貨豆種
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshBeans}
                disabled={isRefreshingBeans}
                className="inline-flex items-center gap-1 text-xs text-[#7A5B45] hover:text-[#3B281B] font-medium underline underline-offset-2 transition-colors cursor-pointer"
                title="重新整理豆單"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingBeans ? 'animate-spin' : ''}`} />
                <span>{isRefreshingBeans ? '同步中...' : '重新整理豆單'}</span>
              </button>
            </div>
          </div>

          {/* 模式內容 */}
          {selectionMode === 'random' ? (
            <BeanWheel
              beans={beans}
              selectedBean={selectedBean}
              onSelectBean={(bean) => setSelectedBean(bean)}
            />
          ) : (
            <ManualBeanList
              beans={beans}
              selectedBean={selectedBean}
              onSelectBean={(bean) => setSelectedBean(bean)}
            />
          )}
        </section>

        {/* C. 飲品製作設定區 */}
        <section>
          <BrewSettings
            brewMethod={brewMethod}
            onChangeBrewMethod={setBrewMethod}
            temperature={temperature}
            onChangeTemperature={setTemperature}
            quantity={quantity}
            onChangeQuantity={setQuantity}
            note={note}
            onChangeNote={setNote}
          />
        </section>

        {/* D. 訂單確認區 */}
        <section>
          <OrderSummary
            selectedBean={selectedBean}
            brewMethod={brewMethod}
            temperature={temperature}
            quantity={quantity}
            note={note}
            selectionMode={selectionMode}
            sheetState={sheetState}
            onConnectGoogle={handleConnectGoogle}
            onSubmitOrder={handleOrderSubmit}
            onResetOrder={handleResetOrder}
          />
        </section>

        {/* 即時連線輸出紀錄看板 (直連 Google Sheets 輸出) */}
        <LiveOrdersBoard
          orders={orders}
          wishes={wishes}
          sheetState={sheetState}
          hasWebhookOrAuth={hasWebhookOrAuth}
          onOpenSettings={() => setIsSheetModalOpen(true)}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />

        {/* E. 豆子許願池 */}
        <WishPool
          sheetState={sheetState}
          onConnectGoogle={handleConnectGoogle}
          onSubmitWish={handleWishSubmit}
        />
      </main>

      {/* 簡約頁尾 */}
      <footer className="mt-12 border-t border-[#E8DFC8] bg-[#F7F2EA]/80 py-6 text-center text-xs text-[#8A7566]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-[#8C5E3C]" />
            <span className="font-serif font-bold text-[#3D2C22]">咖啡豆選擇平台</span>
            <span className="text-[#B39D8C]">|</span>
            <span>來源與輸出已自動綁定連線 · 即時同步更新</span>
          </div>
          <div className="text-[11px] text-[#9A8475]">
            已預留庫存、價格、管理者介面與 LINE Bot 整合擴充模組
          </div>
        </div>
      </footer>

      {/* Google Sheets 設定與說明彈窗 */}
      <GoogleSheetsModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        sheetState={sheetState}
        webhookUrl={webhookUrl}
        onSaveWebhookUrl={handleSaveWebhookUrl}
        onConnectGoogle={handleConnectGoogle}
        onDisconnectGoogle={handleDisconnectGoogle}
        onRefreshSpreadsheet={handleRefreshSpreadsheet}
        onCustomSheetIdSave={(id) => handleConnectSheetNoLogin(id)}
      />
    </div>
  );
}
