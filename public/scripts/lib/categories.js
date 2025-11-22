// public/scripts/lib/categories.js
export const CATEGORIES = [
  "General",
  "Software Engineering",
  "Data",
  "AI",
  "Product Management",
];

// Default colors for each category
export const CATEGORY_COLORS = {
  "General": "#faf9f5",              // Cream
  "AI": "#f97883",              // Primary Pink (darker)
  "Data": "#7dbfba",           // Secondary Turquoise (darker)
  "Software Engineering": "#e8c555", // Accent Cream (darker)
  "Product Management": "#8b5a49", // Brown Dark
};

// Text title colors for each category
export const CATEGORY_TEXT_COLORS = {
  "General": "#7d7c78",
  "Product Management": "#efe7e4",
  "Data": "#ebf5f6",
  "AI": "#ffebed",
  "Software Engineering": "#fdf7e7",
};

export const CATEGORY_KEYWORDS = {
  AI: [
    "ai","ml","machine learning","deep learning","neural","transformer","llm","gpt","chatgpt","dall-e","midjourney","anthropic","claude","gemini","slm","llama","fine-tuning","retrieval","vector","embedding","tokenization","vision","computer vision","voice","speech","text-to-speech","speech-to-text","multimodal","sam","rlhf","synthetic","diffusion","stable diffusion","diffusers","prompt","prompt engineering","alignment","hallucination","moderation","ethics","regulation","autonomous","agent","federated","few-shot","zero-shot","one-shot",
  ],
  Data: [
    "data","database","sql","nosql","etl","bi","business intelligence","visualization","warehouse","lakehouse","analytics","mining","predictive","governance","elasticsearch","kafka","rabbitmq","redis",
  ],
  "Software Engineering": [
    "api","http","rest","graphql","websocket","react","vue","angular","node","express","docker","kubernetes","git","compiler","debug","ide","microservices","devops","ci/cd","pipeline","test","unit","integration","regression","staging","production","rollback","hotfix","responsive","bootstrap","tailwind","spa","ssr","pwa","service worker","oauth","jwt","browser","html","css","javascript","server","cache","router","firewall","bandwidth","lan","wan","dns","ip","tls","ssl","certificate","cloud","aws","azure","gcp",
  ],
  "Product Management": [
    "product","roadmap","backlog","epic","user story","persona","mvp","minimum viable product","kpi","okr","agile","scrum","sprint","standup","retrospective","iteration","velocity","story points","acceptance criteria","use case","user journey","customer journey","stakeholder","product sense","product market fit","product-led","churn","retention","a/b testing","beta","wireframe","prototype","go-to-market","gtm","pivot","value proposition","north star","user research","user acquisition","pdr","product document review","impact","roi","return on investment","rate of interest","technical debt","grooming","refinement",
  ],
};

export function detectCategory(word) {
  const w = word.toLowerCase();
  if (CATEGORY_KEYWORDS.AI.some((k) => w.includes(k))) return "AI";
  if (CATEGORY_KEYWORDS.Data.some((k) => w.includes(k))) return "Data";
  if (CATEGORY_KEYWORDS["Product Management"].some((k) => w.includes(k))) return "Product Management";
  return "Software Engineering";
}

// Ensure each item has a category property. If missing, infer from word.
export function ensureCategories(tabooList) {
  return tabooList.map((item) => ({
    ...item,
    category: item.category || detectCategory(item.word),
  }));
}

export function buildCategoryMaps(tabooList) {
  const ensured = ensureCategories(tabooList);
  const map = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  ensured.forEach((item, index) => {
    const cat = item.category;
    if (!map[cat]) map[cat] = [];
    map[cat].push({ index, word: item.word });
  });
  return map;
}

// Get the default color for a category
export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || "#17424A"; // fallback to classic teal
}

// Get the text title color for a category
export function getCategoryTextColor(category) {
  return CATEGORY_TEXT_COLORS[category] || "#ffffff"; // fallback to white
}
