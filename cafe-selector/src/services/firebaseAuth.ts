import firebaseConfig from '../../firebase-applet-config.json';

// 使用者資訊型別
export interface AuthUser {
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

// 請求之 Google Workspace 授權範圍 (Google Sheets & Google Drive)
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

// 記憶體中暫存 Access Token (嚴格遵循安全準則，絕不存放於 localStorage)
let cachedAccessToken: string | null = null;
let cachedUser: AuthUser | null = null;
let authListener: ((user: AuthUser | null, token: string | null) => void) | null = null;

/**
 * 取得 OAuth Client ID (公開客戶端識別碼，非 API KEY)
 */
export const getOAuthClientId = (): string => {
  return (
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    firebaseConfig.oAuthClientId ||
    ''
  );
};

/**
 * 初始化授權狀態監聽
 */
export const initAuth = (
  onAuthSuccess?: (user: AuthUser, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  authListener = (user, token) => {
    if (user && token) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  };

  // 若當前記憶體已有快取狀態則觸發
  if (cachedUser && cachedAccessToken) {
    if (onAuthSuccess) onAuthSuccess(cachedUser, cachedAccessToken);
  }

  return () => {
    authListener = null;
  };
};

/**
 * 等候 Google Identity Services SDK (GIS) 載入
 */
export function waitForGoogleAccounts(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      resolve((window as any).google.accounts.oauth2);
      return;
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        clearInterval(interval);
        resolve((window as any).google.accounts.oauth2);
      } else if (attempts > 50) {
        clearInterval(interval);
        reject(new Error('Google Identity Services (GIS) 載入超時，請檢查網路連線'));
      }
    }, 100);
  });
}

/**
 * 取得使用者 Profile 資料
 */
async function fetchUserInfo(accessToken: string): Promise<AuthUser> {
  let userInfo: AuthUser = {
    email: null,
    displayName: null,
  };

  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (userRes.ok) {
      const uData = await userRes.json();
      userInfo = {
        email: uData.email || null,
        displayName: uData.name || null,
        photoURL: uData.picture || null,
      };
    }
  } catch (e) {
    console.warn('取得使用者基本資料提示:', e);
  }

  return userInfo;
}

/**
 * 觸發 Google OAuth 授權
 * prompt: '' 為靜默模式（使用背景 iframe，不用點擊也不會被瀏覽器阻擋）
 * prompt: 'consent' 為互動模式（會彈出視窗，必須在使用者點擊事件中呼叫）
 */
export const googleSignIn = async (options?: {
  prompt?: '' | 'consent' | 'select_account';
}): Promise<{ user: AuthUser; accessToken: string } | null> => {
  const clientId = getOAuthClientId();
  if (!clientId) {
    throw new Error('未設定 Google OAuth Client ID');
  }

  const oauth2 = await waitForGoogleAccounts();
  const promptMode = options?.prompt !== undefined ? options.prompt : 'consent';

  return new Promise((resolve, reject) => {
    try {
      const client = oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        prompt: promptMode,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            // 靜默模式下需要使用者互動是正常回傳，非例外錯誤
            if (promptMode === '') {
              resolve(null);
              return;
            }
            console.warn('Google 授權回應:', tokenResponse.error);
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }

          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            if (promptMode === '') {
              resolve(null);
              return;
            }
            reject(new Error('未能自授權流程取得存取憑證 (Access Token)'));
            return;
          }

          cachedAccessToken = accessToken;
          const userInfo = await fetchUserInfo(accessToken);
          cachedUser = userInfo;

          if (authListener) {
            authListener(userInfo, accessToken);
          }

          resolve({ user: userInfo, accessToken });
        },
      });

      client.requestAccessToken({ prompt: promptMode });
    } catch (err) {
      if (promptMode === '') {
        resolve(null);
      } else {
        reject(err);
      }
    }
  });
};

/**
 * 開啟 APP 時自動連線：
 * 使用 prompt: '' 靜默認證。
 * 若使用者在此瀏覽器先前已通過授權，將完全在背景無感秒速連線，不會被瀏覽器彈出視窗阻擋！
 */
export const autoConnectGoogle = async (): Promise<{ user: AuthUser; accessToken: string } | null> => {
  try {
    return await googleSignIn({ prompt: '' });
  } catch (err) {
    console.warn('靜默自動連線檢查完畢:', err);
    return null;
  }
};

/**
 * 取得當前存於記憶體中的 Access Token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * 手動設定記憶體 Access Token
 */
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * 登出 Google 授權並清除記憶體憑證
 */
export const logoutAuth = async () => {
  if (cachedAccessToken && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
    try {
      (window as any).google.accounts.oauth2.revoke(cachedAccessToken, () => {
        // revoked
      });
    } catch {
      // ignore revoke error
    }
  }

  cachedAccessToken = null;
  cachedUser = null;

  if (authListener) {
    authListener(null, null);
  }
};
