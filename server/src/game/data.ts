import type { Career, House } from './types.js';

/** 모든 금액 단위: 만원 */
export const STARTING_CASH = 10000;
export const LOAN_UNIT = 5000;
export const LOAN_REPAY = 6000;
export const CHILD_BONUS = 2000;
export const WEDDING_GIFT = 1000;
export const RETIRE_BONUS = [10000, 5000, 2000];
export const MAX_PLAYERS = 6;
export const SPIN_MAX = 10;

export const PLAYER_COLORS = ['#FF6B5B', '#2BB3A3', '#FFB020', '#7B61FF', '#FF7AA8', '#3E8BFF'];

export const CAREERS: Career[] = [
  { id: 'doctor', name: '의사', emoji: '🩺', salary: 9000, degree: true },
  { id: 'lawyer', name: '변호사', emoji: '⚖️', salary: 8000, degree: true },
  { id: 'developer', name: '개발자', emoji: '💻', salary: 7000, degree: true },
  { id: 'accountant', name: '회계사', emoji: '📊', salary: 6000, degree: true },
  { id: 'teacher', name: '교사', emoji: '📚', salary: 4500, degree: true },
  { id: 'architect', name: '건축가', emoji: '📐', salary: 6500, degree: true },
  { id: 'chef', name: '요리사', emoji: '👨‍🍳', salary: 3500, degree: false },
  { id: 'hairdresser', name: '미용사', emoji: '💇', salary: 3000, degree: false },
  { id: 'police', name: '경찰관', emoji: '👮', salary: 4000, degree: false },
  { id: 'creator', name: '유튜버', emoji: '🎬', salary: 5000, degree: false },
  { id: 'driver', name: '택배 기사', emoji: '🚚', salary: 3500, degree: false },
  { id: 'athlete', name: '운동선수', emoji: '⚽', salary: 4500, degree: false },
];

export const HOUSES: House[] = [
  { id: 'studio', name: '아담한 원룸', emoji: '🏢', price: 6000, sellValue: 8000 },
  { id: 'villa', name: '아늑한 빌라', emoji: '🏘️', price: 10000, sellValue: 14000 },
  { id: 'country', name: '전원주택', emoji: '🏡', price: 18000, sellValue: 26000 },
  { id: 'apartment', name: '도심 아파트', emoji: '🏙️', price: 25000, sellValue: 35000 },
  { id: 'riverview', name: '한강뷰 아파트', emoji: '🌉', price: 40000, sellValue: 60000 },
];

export const LIFE_CARD_VALUES = [1000, 1500, 2000, 2500, 3000, 4000, 5000];
