export type Language = 'en' | 'ru';

export const languages = {
  en: 'English',
  ru: 'Русский'
};

export const translations = {
  en: {
    // Navigation
    home: 'Home',
    chat: 'Chat',
    voice: 'Voice',
    coach: 'Coach',
    progress: 'Progress',
    
    // Dashboard
    dashboard: 'Dashboard',
    welcomeBack: 'Ready to close more deals? Let\'s practice your sales conversations.',
    dailyChallenge: 'Daily Challenge',
    practiceAreas: 'Practice Areas',
    chatPractice: 'Chat Practice',
    chatPracticeDesc: 'Practice conversations with AI clients',
    voicePractice: 'Voice Practice',
    voicePracticeDesc: 'Record and analyze your voice responses',
    voiceCall: 'Voice Call',
    voiceCallDesc: 'Simulate real phone calls with prospects',
    coachMe: 'Coach Me',
    coachMeDesc: 'Get personalized coaching tips and phrases',
    knowledgeBase: 'Knowledge Base',
    knowledgeBaseDesc: 'Manage scenarios, challenges & coaching content',
    dayStreak: 'Day Streak',
    avgScore: 'Avg Score',
    sessions: 'Sessions',
    recentActivity: 'Recent Activity',
    viewAll: 'View All',
    practiceNow: 'Practice Now',
    startChallenge: 'Start Challenge',
    
    // Chat Practice
    chatPracticeTitle: 'Chat Practice',
    chooseScenario: 'Choose a roleplay scenario',
    chooseChallenge: 'Choose Your Challenge',
    selectScenario: 'Select a scenario to practice your sales conversations',
    startRoleplay: 'Start Roleplay',
    typeResponse: 'Type your response...',
    sessionComplete: 'Session Complete!',
    greatWork: 'Great Work!',
    averageScore: 'Your average score was',
    tryAnother: 'Try Another Scenario',
    backToDashboard: 'Back to Dashboard',
    end: 'End',
    send: 'Send',
    
    // AI Scenarios
    investorPriceObjection: 'Investor Price Objection',
    investorPriceObjectionDesc: 'An experienced investor questioning your pricing',
    firstTimeBuyerInquiry: 'First-Time Buyer Inquiry', 
    firstTimeBuyerInquiryDesc: 'A nervous first-time buyer with many questions',
    bulkPurchaseNegotiation: 'Bulk Purchase Negotiation',
    bulkPurchaseNegotiationDesc: 'Investor looking for volume discounts',
    offPlanInquiry: 'Off-Plan Inquiry',
    offPlanInquiryDesc: 'Client interested in pre-construction properties',
    
    // Feedback
    liveFeedback: 'Live Feedback',
    confidence: 'Confidence',
    clarity: 'Clarity',
    grammar: 'Grammar',
    value: 'Value',
    cta: 'Call to Action',
    quickTips: 'Quick Tips:',
    detailedFeedback: 'Detailed Feedback',
    overallScore: 'Overall Score',
    
    // Voice Practice
    voicePracticeTitle: 'Voice Practice',
    chooseVoiceScenario: 'Choose a voice practice scenario',
    record: 'Record',
    analyzing: 'Analyzing...',
    recording: 'Recording...',
    stopRecording: 'Stop Recording',
    playback: 'Playback',
    retryRecording: 'Retry Recording',
    submitForAnalysis: 'Submit for Analysis',
    
    // Voice Call
    voiceCallTitle: 'Voice Call Practice',
    simulateCall: 'Simulate real sales calls',
    startCall: 'Start Call',
    endCall: 'End Call',
    callActive: 'Call Active',
    connecting: 'Connecting...',
    callEnded: 'Call Ended',
    
    // Coach Me
    coachMeTitle: 'Coach Me',
    situationalPhrases: 'Situational Phrases',
    poorExample: 'Poor Example',
    betterExample: 'Better Example',
    coachingTip: 'Coaching Tip',
    
    // Progress
    progressTitle: 'Progress',
    weeklyProgress: 'Weekly Progress',
    monthlyProgress: 'Monthly Progress',
    skillsBreakdown: 'Skills Breakdown',
    achievements: 'Achievements',
    streakCounter: 'Streak Counter',
    
    // Knowledge Base
    knowledgeBaseTitle: 'Knowledge Base',
    scenarios: 'Scenarios',
    addScenario: 'Add Scenario',
    editScenario: 'Edit Scenario',
    deleteScenario: 'Delete Scenario',
    coachingPhrases: 'Coaching Phrases',
    addPhrase: 'Add Phrase',
    difficulty: 'Difficulty',
    category: 'Category',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    close: 'Close',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Settings
    language: 'Language',
    selectLanguage: 'Select Language',
    settings: 'Settings',
    
    // DISC Profile
    discProfile: 'DISC Profile',
    dominance: 'Dominance',
    influence: 'Influence',
    steadiness: 'Steadiness',
    conscientiousness: 'Conscientiousness'
  },
  
  ru: {
    // Navigation
    home: 'Главная',
    chat: 'Чат',
    voice: 'Голос',
    coach: 'Коуч',
    progress: 'Прогресс',
    
    // Dashboard
    dashboard: 'Панель управления',
    welcomeBack: 'Готовы закрывать больше сделок? Давайте практиковать ваши продажи.',
    dailyChallenge: 'Ежедневный вызов',
    practiceAreas: 'Области практики',
    chatPractice: 'Практика чата',
    chatPracticeDesc: 'Практикуйте разговоры с ИИ клиентами',
    voicePractice: 'Голосовая практика',
    voicePracticeDesc: 'Записывайте и анализируйте свои голосовые ответы',
    voiceCall: 'Голосовой звонок',
    voiceCallDesc: 'Симулируйте реальные телефонные звонки с клиентами',
    coachMe: 'Коучинг',
    coachMeDesc: 'Получите персональные советы и фразы',
    knowledgeBase: 'База знаний',
    knowledgeBaseDesc: 'Управляйте сценариями, вызовами и контентом коучинга',
    dayStreak: 'Дней подряд',
    avgScore: 'Ср. балл',
    sessions: 'Сессий',
    recentActivity: 'Последняя активность',
    viewAll: 'Смотреть все',
    practiceNow: 'Практиковать сейчас',
    startChallenge: 'Начать вызов',
    
    // Chat Practice
    chatPracticeTitle: 'Практика чата',
    chooseScenario: 'Выберите сценарий ролевой игры',
    chooseChallenge: 'Выберите ваш вызов',
    selectScenario: 'Выберите сценарий для практики продаж',
    startRoleplay: 'Начать ролевую игру',
    typeResponse: 'Введите ваш ответ...',
    sessionComplete: 'Сессия завершена!',
    greatWork: 'Отличная работа!',
    averageScore: 'Ваш средний балл',
    tryAnother: 'Попробовать другой сценарий',
    backToDashboard: 'Вернуться на панель',
    end: 'Завершить',
    send: 'Отправить',
    
    // AI Scenarios
    investorPriceObjection: 'Возражение инвестора по цене',
    investorPriceObjectionDesc: 'Опытный инвестор сомневается в ваших ценах',
    firstTimeBuyerInquiry: 'Запрос от начинающего покупателя',
    firstTimeBuyerInquiryDesc: 'Нервный новичок с множеством вопросов',
    bulkPurchaseNegotiation: 'Переговоры по оптовой покупке',
    bulkPurchaseNegotiationDesc: 'Инвестор ищет скидки за объем',
    offPlanInquiry: 'Запрос по проектам',
    offPlanInquiryDesc: 'Клиент интересуется недвижимостью на стадии строительства',
    
    // Feedback
    liveFeedback: 'Живая обратная связь',
    confidence: 'Уверенность',
    clarity: 'Ясность',
    grammar: 'Грамматика',
    value: 'Ценность',
    cta: 'Призыв к действию',
    quickTips: 'Быстрые советы:',
    detailedFeedback: 'Подробная обратная связь',
    overallScore: 'Общий балл',
    
    // Voice Practice
    voicePracticeTitle: 'Голосовая практика',
    chooseVoiceScenario: 'Выберите сценарий голосовой практики',
    record: 'Записать',
    analyzing: 'Анализ...',
    recording: 'Запись...',
    stopRecording: 'Остановить запись',
    playback: 'Воспроизведение',
    retryRecording: 'Переписать',
    submitForAnalysis: 'Отправить на анализ',
    
    // Voice Call
    voiceCallTitle: 'Практика голосовых звонков',
    simulateCall: 'Симулируйте реальные продажи по телефону',
    startCall: 'Начать звонок',
    endCall: 'Завершить звонок',
    callActive: 'Звонок активен',
    connecting: 'Соединение...',
    callEnded: 'Звонок завершен',
    
    // Coach Me
    coachMeTitle: 'Коучинг',
    situationalPhrases: 'Ситуационные фразы',
    poorExample: 'Плохой пример',
    betterExample: 'Лучший пример',
    coachingTip: 'Совет коуча',
    
    // Progress
    progressTitle: 'Прогресс',
    weeklyProgress: 'Недельный прогресс',
    monthlyProgress: 'Месячный прогресс',
    skillsBreakdown: 'Разбор навыков',
    achievements: 'Достижения',
    streakCounter: 'Счетчик серии',
    
    // Knowledge Base
    knowledgeBaseTitle: 'База знаний',
    scenarios: 'Сценарии',
    addScenario: 'Добавить сценарий',
    editScenario: 'Редактировать сценарий',
    deleteScenario: 'Удалить сценарий',
    coachingPhrases: 'Коучинговые фразы',
    addPhrase: 'Добавить фразу',
    difficulty: 'Сложность',
    category: 'Категория',
    
    // Common
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Редактировать',
    add: 'Добавить',
    close: 'Закрыть',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    
    // Settings
    language: 'Язык',
    selectLanguage: 'Выберите язык',
    settings: 'Настройки',
    
    // DISC Profile
    discProfile: 'DISC профиль',
    dominance: 'Доминирование',
    influence: 'Влияние',
    steadiness: 'Стабильность',
    conscientiousness: 'Добросовестность'
  }
};

export function createTranslator(language: Language) {
  return function t(key: string): string {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };
}

// Language context for React
import { createContext, useContext } from 'react';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}