// public/scripts/main.js
import { tabooList } from "./data/tabooList.js";
import { generateSVG } from "./lib/generateSVG.js";
import { saveSVG, savePNGFromSVG, saveSVGsAsZip, savePNGsAsZip } from "./lib/exporters.js";
import { setupSelector } from "./ui/selector.js";
import { getCategoryColor, detectCategory, CATEGORIES, CATEGORY_COLORS } from "./lib/categories.js";
import { preloadTechybaraImages } from "./lib/imageData.js";

function setSVGOutput(html) {
  document.getElementById("output").innerHTML = html;
}

// Render category color legend
function renderLegend() {
  const legendEl = document.getElementById("legend");
  const legendItems = CATEGORIES.map(cat => {
    const color = CATEGORY_COLORS[cat];
    return `
      <div style="display: inline-flex; align-items: center; margin-right: 16px; margin-bottom: 8px;">
        <div style="width: 24px; height: 24px; background: ${color}; border-radius: 4px; margin-right: 8px; border: 1px solid #ccc;"></div>
        <span style="font-size: 14px; font-weight: 500;">${cat}</span>
      </div>
    `;
  }).join('');
  
  legendEl.innerHTML = `
    <div style="display: flex; flex-wrap: wrap; align-items: center;">
      <strong style="margin-right: 16px; margin-bottom: 8px;">Card Colors:</strong>
      ${legendItems}
    </div>
  `;
}

// Fixed stroke color for the card border
const FIXED_STROKE = "#17424A";

// Color state: only base color and a white background toggle
const colorOptions = {
  baseColor: "#17424A",      // drives gradient
  whiteBackground: false,     // if true => background #fff, else background = FIXED_STROKE
  useCustomColor: false,      // if true, use baseColor instead of category color
};

// Store current cards for printing (preserves category info)
let currentCards = null;

// Store preloaded image data URIs
let techybaraImages = {
  teacher: "./techybara/teacher.png",
  peekOut: "./techybara/peek out.png"
};

function generate() {
  const rawLines = document.getElementById("input").value
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);
  const parseLine = (line) => {
    const [w, t] = line.split("|");
    if (!w || !t) return null;
    const word = w.trim();
    return {
      word,
      taboos: t.split(",").map(s => s.trim()).filter(Boolean),
      category: detectCategory(word)
    };
  };
  const pairs = [];
  for (let i = 0; i < rawLines.length; i += 2) {
    const top = parseLine(rawLines[i]);
    // Only create a pair if we have a second word (don't duplicate)
    if (i + 1 < rawLines.length) {
      const bottom = parseLine(rawLines[i + 1]);
      if (top && bottom) pairs.push({ top, bottom });
    }
    // Skip if no pair available
  }
  if (pairs.length === 0) {
    setSVGOutput("");
    return;
  }

  const aspectRatio = 580 / 890;

  // Generate first card (preview - larger)
  const firstPair = pairs[0];
  // Use custom color if user has selected one, otherwise use category color
  const firstCardColor = colorOptions.useCustomColor ? colorOptions.baseColor : getCategoryColor(firstPair.top.category);
  const previewSVG = generateSVG(firstPair.top.word, firstPair.top.taboos, firstPair.bottom.word, firstPair.bottom.taboos, {
    baseColor: firstCardColor,
    background: colorOptions.whiteBackground ? "#ffffff" : firstCardColor,
    strokeColor: firstCardColor,
    matchStrokeBackground: false,
    showBleed: false,
    category: firstPair.top.category,
    teacherImage: techybaraImages.teacher,
    peekOutImage: techybaraImages.peekOut,
  });
  const previewCard = `
    <div style="
      width: min(90vw, 400px);
      aspect-ratio: ${aspectRatio};
      transform-origin: center;
      margin: 0 auto 20px;
    ">
      ${previewSVG}
    </div>
  `;

  // Generate remaining cards (smaller grid)
  const gridCards = pairs.slice(1).map(({top, bottom}) => {
    // Use category-based color from the top word of each card
    const cardColor = getCategoryColor(top.category);
    const svg = generateSVG(top.word, top.taboos, bottom.word, bottom.taboos, {
      baseColor: cardColor,
      background: colorOptions.whiteBackground ? "#ffffff" : cardColor,
      strokeColor: cardColor,
      matchStrokeBackground: false,
      showBleed: false,
      category: top.category,
      teacherImage: techybaraImages.teacher,
      peekOutImage: techybaraImages.peekOut,
    });
    return `
      <div style="
        width: 150px;
        aspect-ratio: ${aspectRatio};
        transform-origin: center;
        flex-shrink: 0;
      ">
        ${svg}
      </div>
    `;
  }).join('');

  const gridStyle = `
    display:flex;
    flex-wrap:wrap;
    gap:8px;
    justify-content:flex-start;
    align-items:flex-start;
  `;

  setSVGOutput(`
    <div style="text-align: center;">
      ${previewCard}
    </div>
    <div style="${gridStyle}">${gridCards}</div>
  `);
}

function fillInputFromList(index1, index2) {
  if (index1 === undefined || index2 === undefined) return;
  const w1 = tabooList[index1];
  const w2 = tabooList[index2];
  document.getElementById("input").value = `${w1.word} | ${w1.taboo.join(", ")}\n${w2.word} | ${w2.taboo.join(", ")}`;
  generate();
}

function fillInputRandomCard() {
  // Generate a random single card (pair of words from the same category)
  const idx1 = Math.floor(Math.random() * tabooList.length);
  const w1 = tabooList[idx1];
  const category1 = w1.category || detectCategory(w1.word);
  
  // Find all words in the same category
  const sameCategory = tabooList
    .map((item, idx) => ({ item, idx }))
    .filter(({ item, idx }) => {
      const cat = item.category || detectCategory(item.word);
      return cat === category1 && idx !== idx1;
    });
  
  // Pick a random word from the same category, or fall back to any word if none available
  let idx2;
  if (sameCategory.length > 0) {
    const randomPick = sameCategory[Math.floor(Math.random() * sameCategory.length)];
    idx2 = randomPick.idx;
  } else {
    // Fallback: pick any different word
    idx2 = Math.floor(Math.random() * tabooList.length);
    while (idx2 === idx1 && tabooList.length > 1) {
      idx2 = Math.floor(Math.random() * tabooList.length);
    }
  }

  const w2 = tabooList[idx2];
  document.getElementById("input").value = `${w1.word} | ${w1.taboo.join(", ")}\n${w2.word} | ${w2.taboo.join(", ")}`;
  generate();
}

function fillInputAllCards() {
  // Show custom modal for category selection
  showCategoryModal((selectedCategory) => {
    if (!selectedCategory) return; // User cancelled
    
    const categoriesToGenerate = selectedCategory === 'ALL' ? CATEGORIES : [selectedCategory];
    
    // Generate ALL cards from the taboo list, pairing words from same category
    // Group words by category
    const byCategory = {};
    tabooList.forEach((item, idx) => {
      const cat = item.category || detectCategory(item.word);
      if (categoriesToGenerate.includes(cat)) {
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push({ item, idx });
      }
    });
    
    generateCardsFromCategories(byCategory, categoriesToGenerate);
  });
}

function showCategoryModal(callback) {
  const modal = document.getElementById('categoryModal');
  const optionsContainer = document.getElementById('categoryOptions');
  
  // Create radio buttons - "All Categories" first, then individual categories
  const allOption = `
    <label style="display: flex; align-items: center; padding: 12px; margin-bottom: 8px; border: 2px solid #0A1F33; border-radius: 8px; cursor: pointer; transition: all 0.2s; background: #f0f0f0;" onmouseover="this.style.borderColor='#0A1F33'" onmouseout="if(!this.querySelector('input').checked) this.style.borderColor='#0A1F33'">
      <input type="radio" name="category" value="ALL" style="margin-right: 12px; cursor: pointer;" checked onchange="this.parentElement.parentElement.querySelectorAll('label').forEach(l => {l.style.borderColor='#ddd'; l.style.background='white';}); this.parentElement.style.borderColor='#0A1F33'; this.parentElement.style.background='#f0f0f0';">
      <div style="width: 20px; height: 20px; background: linear-gradient(135deg, #3F51B5 0%, #6A1B9A 33%, #00796B 66%, #E64A19 100%); border-radius: 4px; margin-right: 10px;"></div>
      <span style="font-weight: 600;">All Categories</span>
    </label>
  `;
  
  const categoryOptions = CATEGORIES.map((cat, idx) => {
    const color = CATEGORY_COLORS[cat];
    return `
      <label style="display: flex; align-items: center; padding: 12px; margin-bottom: 8px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.2s; background: white;" onmouseover="this.style.borderColor='${color}'" onmouseout="if(!this.querySelector('input').checked) this.style.borderColor='#ddd'">
        <input type="radio" name="category" value="${cat}" style="margin-right: 12px; cursor: pointer;" onchange="this.parentElement.parentElement.querySelectorAll('label').forEach(l => {l.style.borderColor='#ddd'; l.style.background='white';}); this.parentElement.style.borderColor='${color}';">
        <div style="width: 20px; height: 20px; background: ${color}; border-radius: 4px; margin-right: 10px;"></div>
        <span style="font-weight: 500;">${cat}</span>
      </label>
    `;
  }).join('');
  
  optionsContainer.innerHTML = allOption + categoryOptions;
  
  modal.style.display = 'flex';
  
  const confirm = () => {
    const selected = optionsContainer.querySelector('input[name="category"]:checked');
    modal.style.display = 'none';
    callback(selected ? selected.value : null);
  };
  
  const cancel = () => {
    modal.style.display = 'none';
    callback(null);
  };
  
  document.getElementById('modalConfirm').onclick = confirm;
  document.getElementById('modalCancel').onclick = cancel;
  
  // Close on background click
  modal.onclick = (e) => {
    if (e.target === modal) cancel();
  };
}

function generateCardsFromCategories(byCategory, selectedCategories) {

  // Shuffle words within each category
  Object.keys(byCategory).forEach(cat => {
    const arr = byCategory[cat];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  });

  // Create pairs from each category, sorted by category
  const pairsByCategory = [];
  // Sort categories to maintain consistent order
  const sortedCategories = selectedCategories.sort();
  
  sortedCategories.forEach(cat => {
    if (!byCategory[cat]) return;
    const words = byCategory[cat];
    const categoryPairs = [];
    for (let i = 0; i < words.length; i += 2) {
      const w1 = tabooList[words[i].idx];
      
      // If there's a second word in this category, pair them
      if (i + 1 < words.length) {
        const w2 = tabooList[words[i + 1].idx];
        categoryPairs.push([w1, w2]);
      } else {
        // Odd number of words in category - pair with itself
        categoryPairs.push([w1, w1]);
      }
    }
    // Add all pairs from this category together (sorted by category)
    pairsByCategory.push(...categoryPairs);
  });

  // Create lines from shuffled pairs (for display in textarea)
  const lines = [];
  pairsByCategory.forEach(([w1, w2]) => {
    lines.push(`${w1.word} | ${w1.taboo.join(", ")}`);
    lines.push(`${w2.word} | ${w2.taboo.join(", ")}`);
  });

  // Update textarea without triggering events
  const inputEl = document.getElementById("input");
  inputEl.value = lines.join("\n");
  
  // Generate directly with the pairs data (preserving category info)
  generateFromPairs(pairsByCategory);
}

function generateFromPairs(pairData) {
  // Generate cards directly from pair data with preserved categories
  const pairs = pairData.map(([w1, w2]) => ({
    top: {
      word: w1.word,
      taboos: w1.taboo,
      category: w1.category || detectCategory(w1.word)
    },
    bottom: {
      word: w2.word,
      taboos: w2.taboo,
      category: w2.category || detectCategory(w2.word)
    }
  }));

  // Store cards globally for printing
  currentCards = pairs;

  if (pairs.length === 0) {
    setSVGOutput("");
    return;
  }

  const aspectRatio = 580 / 890;

  // Generate first card (preview - larger)
  const firstPair = pairs[0];
  const firstCardColor = getCategoryColor(firstPair.top.category);
  const previewSVG = generateSVG(firstPair.top.word, firstPair.top.taboos, firstPair.bottom.word, firstPair.bottom.taboos, {
    baseColor: firstCardColor,
    background: colorOptions.whiteBackground ? "#ffffff" : firstCardColor,
    strokeColor: firstCardColor,
    matchStrokeBackground: false,
    showBleed: false,
    category: firstPair.top.category,
    teacherImage: techybaraImages.teacher,
    peekOutImage: techybaraImages.peekOut,
  });
  const previewCard = `
    <div style="
      width: min(90vw, 400px);
      aspect-ratio: ${aspectRatio};
      transform-origin: center;
      margin: 0 auto 20px;
    ">
      ${previewSVG}
    </div>
  `;

  // Generate remaining cards (smaller grid)
  const gridCards = pairs.slice(1).map(({top, bottom}) => {
    const cardColor = getCategoryColor(top.category);
    const svg = generateSVG(top.word, top.taboos, bottom.word, bottom.taboos, {
      baseColor: cardColor,
      background: colorOptions.whiteBackground ? "#ffffff" : cardColor,
      strokeColor: cardColor,
      matchStrokeBackground: false,
      showBleed: false,
      category: top.category,
      teacherImage: techybaraImages.teacher,
      peekOutImage: techybaraImages.peekOut,
    });
    return `
      <div style="
        width: 150px;
        aspect-ratio: ${aspectRatio};
        transform-origin: center;
        flex-shrink: 0;
      ">
        ${svg}
      </div>
    `;
  }).join("");

  const gridContainer = pairs.length > 1 ? `
    <div style="
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding: 10px 0;
      justify-content: center;
      flex-wrap: wrap;
    ">
      ${gridCards}
    </div>
  ` : "";

  setSVGOutput(previewCard + gridContainer);
}

// wire UI
document.getElementById("btn-generate").addEventListener("click", generate);
document.getElementById("btn-random").addEventListener("click", fillInputRandomCard);
document.getElementById("btn-generate-all").addEventListener("click", fillInputAllCards);

const { showWordSelector } = setupSelector({
  tabooList,
  onSelect: (i1, i2) => fillInputFromList(i1, i2),
});
document.getElementById("btn-choose").addEventListener("click", showWordSelector);

// re-render when selector appends pairs
document.getElementById("input").addEventListener("tt-input-updated", generate);

document.getElementById("btn-save-svg").addEventListener("click", async () => {
  const { saveSvgsFromContainer } = await import('./lib/utils.js');
  await saveSvgsFromContainer('#output', 'card.svg', 'taboo-cards-svg.zip');
});

document.getElementById("btn-save-png").addEventListener("click", async () => {
  const { savePngsFromContainer } = await import('./lib/utils.js');
  await savePngsFromContainer('#output', 'card.png', 'taboo-cards-png.zip', 580, 890);
});

// Open print view (A4 2x2)
function openPrint() {
  let pairs;
  
  // Use stored cards if available (from Generate All Cards), otherwise parse from textarea
  if (currentCards && currentCards.length > 0) {
    pairs = currentCards;
  } else {
    const rawLines = document.getElementById("input").value
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    // Parse a single line of the form: Word | taboo1, taboo2, ...
    const parseLine = (line) => {
      const [w, t] = line.split("|");
      if (!w || !t) return null;
      const word = w.trim();
      return {
        word,
        taboos: t.split(",").map(s => s.trim()).filter(Boolean),
        category: detectCategory(word)
      };
    };
    // Build cards from pairs of lines: [top, bottom]
    pairs = [];
    for (let i = 0; i < rawLines.length; i += 2) {
      const top = parseLine(rawLines[i]);
      const bottom = parseLine(rawLines[i + 1] || rawLines[i]);
      if (top && bottom) pairs.push({ top, bottom });
    }
  }

  if (pairs.length === 0) {
    alert("Please provide at least one line in the input area to print.");
    return;
  }

  const payload = {
    cards: pairs, // ALL cards with preserved category info
    baseColor: colorOptions.baseColor,
    whiteBackground: !!colorOptions.whiteBackground,
    strokeColor: FIXED_STROKE,
    includeBacking: !!(document.getElementById("chk-backing") && document.getElementById("chk-backing").checked),
    useCategoryColors: true, // flag to indicate category-based colors should be used
    createdAt: Date.now(),
  };
  try {
    localStorage.setItem("tt_print_payload", JSON.stringify(payload));
  } catch (_) {
    // ignore storage errors
  }
  window.open("./print.html", "_blank");
}

document.getElementById("btn-print").addEventListener("click", openPrint);

// Colors UI
function showColors() {
  const host = document.getElementById("colors");
  // Preset base color themes
  const themes = [
    { name: "Cream", value: "#faf9f5" },
    { name: "Strawberry", value: "#f97883" },
    { name: "Tiffany Blue", value: "#7dbfba" },
    { name: "Lemoncake", value: "#e8c555" },
    { name: "Product Management", value: "#8b5a49" },
    { name: "Classic Teal", value: "#17424A" },
    { name: "Midnight Blue", value: "#0A1F33" },
    { name: "Indigo", value: "#3F51B5" },
    { name: "Emerald", value: "#2E7D32" },
    { name: "Purple", value: "#6A1B9A" },
    { name: "Orange", value: "#F57C00" },
    { name: "Blue", value: "#1976D2" },
    { name: "Teal", value: "#009688" },
    { name: "Violet", value: "#9C27B0" },
    { name: "Magenta", value: "#C2185B" },
    { name: "Deep Orange", value: "#E64A19" },
    { name: "Blue Grey", value: "#455A64" },
  ];
  const optionsHtml = themes
    .map(t => `<option value="${t.value}" ${t.value===colorOptions.baseColor?"selected":""}>${t.name}</option>`) 
    .join("");
  host.innerHTML = `
    <br><div style="margin-top: 8px;">
      <div style="margin-bottom: 8px;">
        <label>Theme 
          <select id="sel-base">
            ${optionsHtml}
          </select>
        </label>
      </div>
      <div>
        <label>
          <input type="checkbox" id="chk-white" ${colorOptions.whiteBackground?"checked":""}/> White background
        </label>
      </div>
    </div>
  `;

  const selBase = document.getElementById("sel-base");
  selBase.addEventListener("change", () => {
    colorOptions.baseColor = selBase.value;
    colorOptions.useCustomColor = true;  // User has manually selected a color
    generate();
  });

  const chkWhite = document.getElementById("chk-white");
  chkWhite.addEventListener("change", () => {
    colorOptions.whiteBackground = chkWhite.checked;
    generate();
  });
}

document.getElementById("btn-colors").addEventListener("click", showColors);

// Preload techybara images as base64 data URIs for PNG export
preloadTechybaraImages().then(images => {
  techybaraImages = images;
  console.log('Techybara images preloaded for PNG export');
}).catch(err => {
  console.warn('Failed to preload techybara images:', err);
  // Continue with relative paths as fallback
});

// initial render
renderLegend();
generate();
