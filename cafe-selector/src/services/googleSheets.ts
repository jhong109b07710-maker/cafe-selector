import { Order, BeanWish, CoffeeBean } from '../types';
import { getAccessToken } from './firebaseAuth';

export const DEFAULT_SPREADSHEET_TITLE = '咖啡豆選擇平台 (訂單與許願池)';

export const BEAN_LIST_COLUMNS = [
  'bean_id',
  'name',
  'origin',
  'process',
  'roast_level',
  'flavor_notes',
  'status',
];

export const INITIAL_BEAN_LIST_ROWS = [
  ['bean_1', '蕭邦', '哥斯大黎加', '厭氧日曬', '淺中', '百香果、玫瑰、藍莓', '啟用'],
  ['bean_2', '葡萄雪莉', '哥倫比亞', '厭氧日曬', '淺中', '麝香葡萄、玫瑰、櫻桃', '啟用'],
  ['bean_3', '夜梟', '哥倫比亞', '雙重厭氧', '淺中', '花蜜、蘭姆酒、白茉莉', '啟用'],
  ['bean_4', '粉紅草莓', '衣索比亞', '厭氧日曬', '淺中', '百香果、草莓、茉莉', '啟用'],
  ['bean_5', '落日花語', '混豆', '配方豆', '淺中', '藍莓、白花、香草', '啟用'],
];

export const ORDERS_COLUMNS = [
  'order_id',
  'created_at',
  'bean_name',
  'origin',
  'process',
  'brew_method',
  'temperature',
  'quantity',
  'note',
  'selection_mode',
  'status',
];

export const WISH_COLUMNS = [
  'wish_id',
  'created_at',
  'origin',
  'process',
  'other_process',
  'status',
];

interface SpreadsheetInfo {
  id: string;
  title: string;
  url: string;
}

/**
 * 從網址或 ID 字串中擷取標準 Google Spreadsheet ID
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * 免登入直接從 Google Sheets 抓取 BeanList 工作表資料
 * 支援多工作表名稱回退、Google Visualization API (gviz) 與 CSV 即時串流解析
 */
export async function fetchBeansWithoutLogin(
  spreadsheetIdOrUrl: string,
  sheetName = 'BeanList'
): Promise<CoffeeBean[]> {
  const sheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!sheetId) {
    throw new Error('未提供有效的 Google 試算表 ID 或網址');
  }

  // 1. 若記憶體中已有 OAuth Token，優先使用官方 API 讀取（即使是私人試算表亦可讀取）
  try {
    const token = await getAccessToken();
    if (token) {
      const authBeans = await fetchBeansFromSheet(token, sheetId);
      if (authBeans && authBeans.length > 0) {
        return authBeans;
      }
    }
  } catch (authErr) {
    console.warn('OAuth 模式讀取嘗試提示，轉入免登入公開協定:', authErr);
  }

  // 2. 免登入公開讀取：嘗試可能的工作表名稱與預設第一頁
  const targetSheets = [
    `sheet=${encodeURIComponent(sheetName)}`,
    '', // 預設第一張工作表
    'gid=0',
    'sheet=Sheet1',
    `sheet=${encodeURIComponent('工作表1')}`,
    `sheet=${encodeURIComponent('咖啡豆清單')}`,
  ];

  // 策略 A: Google Visualization API (gviz/tq)
  for (const target of targetSheets) {
    try {
      const queryParam = target ? `&${target}` : '';
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${queryParam}`;
      const res = await fetch(gvizUrl, { headers: { Accept: '*/*' } });

      if (res.ok) {
        const text = await res.text();
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = text.substring(jsonStart, jsonEnd + 1);
          const data = JSON.parse(jsonStr);
          if (data.status === 'ok' && data.table) {
            const parsed = parseGvizTable(data.table);
            if (parsed.length > 0) return parsed;
          }
        }
      }
    } catch {
      // 嘗試下一個分頁參數
    }
  }

  // 策略 B: CSV 匯出模式 (gviz/tq?tqx=out:csv)
  for (const target of targetSheets) {
    try {
      const queryParam = target ? `&${target}` : '';
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${queryParam}`;
      const res = await fetch(csvUrl);
      if (res.ok) {
        const csvText = await res.text();
        const parsed = parseCsvToBeans(csvText);
        if (parsed.length > 0) return parsed;
      }
    } catch {
      // 嘗試下一個分頁參數
    }
  }

  throw new Error('無法免登入讀取該 Google 試算表。請確認試算表已開啟「知道連結的使用者皆可查看」共用權限。');
}

/**
 * 解析 Google Visualization API 回傳之資料表
 */
function parseGvizTable(table: any): CoffeeBean[] {
  const cols: any[] = table.cols || [];
  const rows: any[] = table.rows || [];

  if (rows.length === 0) return [];

  // 尋找各欄位索引
  const headerLabels = cols.map((col: any) => ((col?.label || col?.id || '') as string).toLowerCase().trim());

  let idIdx = headerLabels.findIndex((h) => h.includes('id'));
  let nameIdx = headerLabels.findIndex((h) => h.includes('name') || h.includes('豆') || h.includes('名稱'));
  let originIdx = headerLabels.findIndex((h) => h.includes('origin') || h.includes('產地'));
  let processIdx = headerLabels.findIndex((h) => h.includes('process') || h.includes('處理'));
  let roastIdx = headerLabels.findIndex((h) => h.includes('roast') || h.includes('焙'));
  let flavorIdx = headerLabels.findIndex((h) => h.includes('flavor') || h.includes('風味'));
  let statusIdx = headerLabels.findIndex((h) => h.includes('status') || h.includes('狀態'));

  let startRowIndex = 0;

  // 若 cols 未提供 label，檢查第一列資料是否為標題
  if (nameIdx === -1 && rows.length > 0) {
    const firstRowValues = (rows[0].c || []).map((cell: any) => ((cell?.v ?? '') as string).toLowerCase().trim());
    if (firstRowValues.some((v: string) => v.includes('name') || v.includes('豆') || v.includes('產地'))) {
      idIdx = firstRowValues.findIndex((v: string) => v.includes('id'));
      nameIdx = firstRowValues.findIndex((v: string) => v.includes('name') || v.includes('豆'));
      originIdx = firstRowValues.findIndex((v: string) => v.includes('origin') || v.includes('產地'));
      processIdx = firstRowValues.findIndex((v: string) => v.includes('process') || v.includes('處理'));
      roastIdx = firstRowValues.findIndex((v: string) => v.includes('roast') || v.includes('焙'));
      flavorIdx = firstRowValues.findIndex((v: string) => v.includes('flavor') || v.includes('風味'));
      statusIdx = firstRowValues.findIndex((v: string) => v.includes('status') || v.includes('狀態'));
      startRowIndex = 1;
    }
  }

  // 預設欄位順序 fallback
  if (nameIdx === -1) nameIdx = 1;
  if (originIdx === -1) originIdx = 2;
  if (processIdx === -1) processIdx = 3;
  if (roastIdx === -1) roastIdx = 4;
  if (flavorIdx === -1) flavorIdx = 5;
  if (statusIdx === -1) statusIdx = 6;

  const result: CoffeeBean[] = [];

  for (let r = startRowIndex; r < rows.length; r++) {
    const c = rows[r].c || [];
    const getVal = (idx: number) => {
      if (idx < 0 || idx >= c.length || !c[idx]) return '';
      const cell = c[idx];
      return String(cell.f || cell.v || '').trim();
    };

    const name = getVal(nameIdx);
    if (!name) continue;

    const status = getVal(statusIdx).toLowerCase();
    if (status === '停用' || status === '下架' || status === 'disabled' || status === 'inactive') {
      continue;
    }

    const id = getVal(idIdx) || `bean_${r}`;
    const origin = getVal(originIdx) || '精選產區';
    const process = getVal(processIdx) || '水洗';
    const roast = getVal(roastIdx) || '';
    const rawFlavors = getVal(flavorIdx);

    const flavorNotes = rawFlavors
      ? rawFlavors.split(/[、,，;；/|\s]+/).map((f) => f.trim()).filter(Boolean)
      : [];

    result.push({
      id,
      name,
      origin,
      process,
      roastLevel: roast || undefined,
      flavorNotes: flavorNotes.length > 0 ? flavorNotes : undefined,
      isDemo: false,
    });
  }

  return result;
}

/**
 * 解析 CSV 字串為咖啡豆清單
 */
function parseCsvToBeans(csvText: string): CoffeeBean[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('豆'));
  const originIdx = header.findIndex((h) => h.includes('origin') || h.includes('產地'));
  const processIdx = header.findIndex((h) => h.includes('process') || h.includes('處理'));
  const roastIdx = header.findIndex((h) => h.includes('roast') || h.includes('焙'));
  const flavorIdx = header.findIndex((h) => h.includes('flavor') || h.includes('風味'));
  const statusIdx = header.findIndex((h) => h.includes('status') || h.includes('狀態'));

  const beans: CoffeeBean[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = cols[nameIdx >= 0 ? nameIdx : 1] || '';
    if (!name) continue;

    const status = (cols[statusIdx >= 0 ? statusIdx : 6] || '').toLowerCase();
    if (status === '停用' || status === '下架' || status === 'disabled') continue;

    const origin = cols[originIdx >= 0 ? originIdx : 2] || '單一產區';
    const process = cols[processIdx >= 0 ? processIdx : 3] || '水洗';
    const roast = cols[roastIdx >= 0 ? roastIdx : 4] || '';
    const rawFlavors = cols[flavorIdx >= 0 ? flavorIdx : 5] || '';

    const flavorNotes = rawFlavors
      ? rawFlavors.split(/[、,，;；/|\s]+/).map((f) => f.trim()).filter(Boolean)
      : [];

    beans.push({
      id: cols[0] || `bean_${i}`,
      name,
      origin,
      process,
      roastLevel: roast || undefined,
      flavorNotes: flavorNotes.length > 0 ? flavorNotes : undefined,
      isDemo: false,
    });
  }

  return beans;
}

/**
 * 尋找現有的咖啡豆試算表，若不存在則自動於使用者的 Google Drive 建立
 */
export async function findOrCreateSpreadsheet(accessToken: string): Promise<SpreadsheetInfo> {
  try {
    const query = encodeURIComponent(
      `name = '${DEFAULT_SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        const file = data.files[0];
        await ensureSheetsExist(accessToken, file.id);
        return {
          id: file.id,
          title: file.name,
          url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
        };
      }
    }
  } catch (err) {
    console.warn('搜尋既有試算表時發生非致命提示，將嘗試直接建立:', err);
  }

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: DEFAULT_SPREADSHEET_TITLE,
      },
      sheets: [
        {
          properties: {
            title: 'BeanList',
            gridProperties: { rowCount: 100, columnCount: 10 },
          },
        },
        {
          properties: {
            title: 'Orders',
            gridProperties: { rowCount: 100, columnCount: 15 },
          },
        },
        {
          properties: {
            title: 'BeanWishList',
            gridProperties: { rowCount: 100, columnCount: 10 },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorBody = await createRes.text();
    throw new Error(`建立 Google 試算表失敗 (${createRes.status}): ${errorBody}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;

  await initializeSheetHeaders(accessToken, spreadsheetId, true);

  return {
    id: spreadsheetId,
    title: DEFAULT_SPREADSHEET_TITLE,
    url: createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * 確保 BeanList、Orders 與 BeanWishList 工作表均存在並含有標題列
 */
export async function ensureSheetsExist(accessToken: string, spreadsheetId: string): Promise<void> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaRes.ok) {
    throw new Error(`讀取試算表資訊失敗: ${metaRes.statusText}`);
  }

  const metaData = await metaRes.json();
  const sheetTitles: string[] = (metaData.sheets || []).map((s: any) => s.properties?.title);

  const requests: any[] = [];
  if (!sheetTitles.includes('BeanList')) {
    requests.push({ addSheet: { properties: { title: 'BeanList', index: 0 } } });
  }
  if (!sheetTitles.includes('Orders')) {
    requests.push({ addSheet: { properties: { title: 'Orders' } } });
  }
  if (!sheetTitles.includes('BeanWishList')) {
    requests.push({ addSheet: { properties: { title: 'BeanWishList' } } });
  }

  if (requests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  }

  await initializeSheetHeaders(accessToken, spreadsheetId, false);
}

/**
 * 初始化標題列與 BeanList 初始種子資料
 */
async function initializeSheetHeaders(accessToken: string, spreadsheetId: string, isNewlyCreated = false) {
  const dataPayload: any[] = [];

  if (isNewlyCreated) {
    dataPayload.push(
      {
        range: 'BeanList!A1:G9',
        values: [BEAN_LIST_COLUMNS, ...INITIAL_BEAN_LIST_ROWS],
      },
      {
        range: 'Orders!A1:K1',
        values: [ORDERS_COLUMNS],
      },
      {
        range: 'BeanWishList!A1:F1',
        values: [WISH_COLUMNS],
      }
    );
  } else {
    try {
      const checkRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=BeanList!A1:G2&ranges=Orders!A1:K1&ranges=BeanWishList!A1:F1`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (checkRes.ok) {
        const valData = await checkRes.json();
        const beanRows = valData.valueRanges?.[0]?.values;
        const ordersRows = valData.valueRanges?.[1]?.values;
        const wishRows = valData.valueRanges?.[2]?.values;

        if (!beanRows || beanRows.length === 0) {
          dataPayload.push({
            range: 'BeanList!A1:G9',
            values: [BEAN_LIST_COLUMNS, ...INITIAL_BEAN_LIST_ROWS],
          });
        }

        if (!ordersRows || ordersRows.length === 0) {
          dataPayload.push({
            range: 'Orders!A1:K1',
            values: [ORDERS_COLUMNS],
          });
        }

        if (!wishRows || wishRows.length === 0) {
          dataPayload.push({
            range: 'BeanWishList!A1:F1',
            values: [WISH_COLUMNS],
          });
        }
      }
    } catch (err) {
      console.warn('檢查工作表標題列時發生提示:', err);
    }
  }

  if (dataPayload.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataPayload,
      }),
    });
  }
}

/**
 * 透過 OAuth 憑證讀取 BeanList
 */
export async function fetchBeansFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<CoffeeBean[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/BeanList!A1:G100`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`從 Google Sheets 讀取 BeanList 失敗 (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];
  if (rows.length <= 1) return [];

  const headerRow = rows[0].map((h) => (h || '').toString().trim().toLowerCase());
  const idIdx = headerRow.findIndex((h) => h.includes('id'));
  const nameIdx = headerRow.findIndex((h) => h.includes('name') || h.includes('豆') || h.includes('名稱'));
  const originIdx = headerRow.findIndex((h) => h.includes('origin') || h.includes('產地'));
  const processIdx = headerRow.findIndex((h) => h.includes('process') || h.includes('處理'));
  const roastIdx = headerRow.findIndex((h) => h.includes('roast') || h.includes('焙'));
  const flavorIdx = headerRow.findIndex((h) => h.includes('flavor') || h.includes('風味'));
  const statusIdx = headerRow.findIndex((h) => h.includes('status') || h.includes('狀態'));

  const parsedBeans: CoffeeBean[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawName = (nameIdx >= 0 && row[nameIdx]) ? row[nameIdx].trim() : (row[1] || '').trim();
    if (!rawName) continue;

    const rawStatus = (statusIdx >= 0 && row[statusIdx]) ? row[statusIdx].trim().toLowerCase() : (row[6] || '').trim().toLowerCase();
    if (rawStatus === '停用' || rawStatus === '下架' || rawStatus === 'disabled' || rawStatus === 'inactive') {
      continue;
    }

    const rawId = (idIdx >= 0 && row[idIdx]) ? row[idIdx].trim() : (row[0] || `bean_${i}`).trim();
    const rawOrigin = (originIdx >= 0 && row[originIdx]) ? row[originIdx].trim() : (row[2] || '單一產區').trim();
    const rawProcess = (processIdx >= 0 && row[processIdx]) ? row[processIdx].trim() : (row[3] || '水洗').trim();
    const rawRoast = (roastIdx >= 0 && row[roastIdx]) ? row[roastIdx].trim() : (row[4] || '').trim();
    const rawFlavors = (flavorIdx >= 0 && row[flavorIdx]) ? row[flavorIdx].trim() : (row[5] || '').trim();

    const flavorNotes = rawFlavors
      ? rawFlavors.split(/[、,，;；/|\s]+/).map((f) => f.trim()).filter(Boolean)
      : [];

    parsedBeans.push({
      id: rawId || `bean_${i}`,
      name: rawName,
      origin: rawOrigin || '單一產地',
      process: rawProcess || '水洗',
      roastLevel: rawRoast || undefined,
      flavorNotes: flavorNotes.length > 0 ? flavorNotes : undefined,
      isDemo: false,
    });
  }

  return parsedBeans;
}

/**
 * 將訂單寫入 Google Sheets 工作表「Orders」
 */
export async function appendOrderToSheet(
  accessToken: string,
  spreadsheetId: string,
  order: Order
): Promise<{ success: boolean; updatedRange?: string }> {
  const rowValues = [
    order.orderId,
    order.createdAt,
    order.beanName,
    order.origin,
    order.process,
    order.brewMethod,
    order.temperature,
    order.quantity,
    order.note || '',
    order.selectionMode,
    order.status,
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Orders!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let message = `寫入 Google Sheets 失敗 (${res.status})`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) {
        message = parsed.error.message;
      }
    } catch {
      // use raw
    }
    throw new Error(message);
  }

  const result = await res.json();
  return {
    success: true,
    updatedRange: result.updates?.updatedRange,
  };
}

/**
 * 將許願資料寫入 Google Sheets 工作表「BeanWishList」
 */
export async function appendWishToSheet(
  accessToken: string,
  spreadsheetId: string,
  wish: BeanWish
): Promise<{ success: boolean; updatedRange?: string }> {
  const rowValues = [
    wish.wishId,
    wish.createdAt,
    wish.origin,
    wish.process,
    wish.otherProcess || '',
    wish.status,
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/BeanWishList!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let message = `寫入許願池記錄失敗 (${res.status})`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) {
        message = parsed.error.message;
      }
    } catch {
      // use raw
    }
    throw new Error(message);
  }

  const result = await res.json();
  return {
    success: true,
    updatedRange: result.updates?.updatedRange,
  };
}

export const WEBHOOK_URL_STORAGE_KEY = 'coffee_bean_selector_webhook_url';

/**
 * 透過 Google Apps Script Webhook 免登入直接將訂單寫入 Google Sheets 的「Orders」工作表
 */
export async function sendOrderToSheetWebhook(
  webhookUrl: string,
  order: Order
): Promise<boolean> {
  const payload = {
    action: 'addOrder',
    type: 'order',
    ...order,
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err: any) {
    throw new Error(`無法將訂單送出至 Google Sheets Webhook: ${err?.message || err}`);
  }
}

/**
 * 透過 Google Apps Script Webhook 免登入直接將許願寫入 Google Sheets 的「BeanWishList」工作表
 */
export async function sendWishToSheetWebhook(
  webhookUrl: string,
  wish: BeanWish
): Promise<boolean> {
  const payload = {
    action: 'addWish',
    type: 'wish',
    ...wish,
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err: any) {
    throw new Error(`無法將許願送出至 Google Sheets Webhook: ${err?.message || err}`);
  }
}

export const APPS_SCRIPT_TEMPLATE = `// 貼入 Google 試算表 > 擴充功能 > Apps Script，並部署為「網頁應用程式」(存取權：所有人)
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.type === 'order') {
      var sheet = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['order_id', 'created_at', 'bean_name', 'origin', 'process', 'brew_method', 'temperature', 'quantity', 'note', 'selection_mode', 'status']);
      }
      sheet.appendRow([data.orderId, data.createdAt, data.beanName, data.origin, data.process, data.brewMethod, data.temperature, data.quantity, data.note || '', data.selectionMode, data.status]);
    } else if (data.type === 'wish') {
      var sheet = ss.getSheetByName('BeanWishList') || ss.insertSheet('BeanWishList');
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['wish_id', 'created_at', 'origin', 'process', 'other_process', 'status']);
      }
      sheet.appendRow([data.wishId, data.createdAt, data.origin, data.process, data.otherProcess || '', data.status]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('BeanList');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  var values = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(values)).setMimeType(ContentService.MimeType.JSON);
}`;

