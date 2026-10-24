import { CoffeeBean } from '../types';

/**
 * 系統來源綁定之咖啡豆清單（免登入自動連線）
 * 欄位依序對應：bean_id, name, origin, process, roast_level, flavor_notes, status
 */
export const INITIAL_BEANS: CoffeeBean[] = [
  {
    id: 'bean_1',
    name: '蕭邦',
    origin: '哥斯大黎加',
    process: '厭氧日曬',
    roastLevel: '淺中',
    flavorNotes: ['百香果', '玫瑰', '藍莓'],
    description: '哥斯大黎加厭氧日曬，百香果、玫瑰、藍莓果香芬芳。',
    isDemo: false,
  },
  {
    id: 'bean_2',
    name: '葡萄雪莉',
    origin: '哥倫比亞',
    process: '厭氧日曬',
    roastLevel: '淺中',
    flavorNotes: ['麝香葡萄', '玫瑰', '櫻桃'],
    description: '哥倫比亞厭氧日曬，帶有麝香葡萄、玫瑰與櫻桃甜美香氣。',
    isDemo: false,
  },
  {
    id: 'bean_3',
    name: '夜梟',
    origin: '哥倫比亞',
    process: '雙重厭氧',
    roastLevel: '淺中',
    flavorNotes: ['花蜜', '蘭姆酒', '白茉莉'],
    description: '哥倫比亞雙重厭氧處理，花蜜、蘭姆酒與白茉莉層次細緻優雅。',
    isDemo: false,
  },
  {
    id: 'bean_4',
    name: '粉紅草莓',
    origin: '衣索比亞',
    process: '厭氧日曬',
    roastLevel: '淺中',
    flavorNotes: ['百香果', '草莓', '茉莉'],
    description: '衣索比亞厭氧日曬，散發百香果、草莓與茉莉清新明亮調性。',
    isDemo: false,
  },
  {
    id: 'bean_5',
    name: '落日花語',
    origin: '混豆',
    process: '配方豆',
    roastLevel: '淺中',
    flavorNotes: ['藍莓', '白花', '香草'],
    description: '店內招牌獨家配方，藍莓、白花與香草交織甘甜柔順。',
    isDemo: false,
  },
];
