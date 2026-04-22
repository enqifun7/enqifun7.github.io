// === 新增全局变量，用来存第一步生成的食谱 ===
let currentRecipeData = null;
let thinkInterval = null; // 用于轮播暖心话语的定时器

// 抓取页面上的 DOM 元素
const generateBtn = document.getElementById('generateBtn');
const resultArea = document.getElementById('resultArea');
const scrollToForm = document.getElementById('scrollToForm');
const navLinks = document.querySelectorAll('.nav-menu a');
const sampleButtons = document.querySelectorAll('.sample-button');

// 新增的外卖元素抓取
const generateTakeoutBtn = document.getElementById('generateTakeoutBtn');
const takeoutArea = document.getElementById('takeoutArea');

// 原有的收藏偏好按钮抓取
const tipsBtn = document.getElementById('tipsBtn');

const defaultTips = '<p class="result-tip">输入偏好后，点击“生成推荐”，即可得到早餐、午餐、晚餐建议。</p >';

const createMealBlock = (title, text) => {
  return `
    <div class="meal-block">
      <h4>${title}</h4>
      <p>${text}</p >
    </div>
  `;
};

// === 核心功能 1：生成一日三餐推荐 ===
const generateRecommendation = async () => {
  const taste = document.getElementById('taste').value.trim();
  const budget = document.getElementById('budget').value.trim();
  const health = document.getElementById('health').value.trim();

  if (!taste && !budget && !health) {
    resultArea.innerHTML = '<p class="result-tip">请先输入至少一项饮食需求，例如口味、预算或健康偏好。</p >';
    return;
  }

  // 加载中提示（同时显示暖心话语）
  if (thinkInterval) { clearInterval(thinkInterval); thinkInterval = null; }
  const warmMessages = [
    '别着急，美味正在为你备好~',
    '一会儿就好，营养又安心。',
    'AI 正在挑选最适合你今天的几道好菜 🍲'
  ];
  let _warmIndex = 0;
  resultArea.innerHTML = `
    <div style="text-align:center; padding: 24px; color: var(--accent);">
       <p>✨ 顶尖 AI 营养师正在为您定制专属食谱，请稍候...</p>
       <p id="warmMsg" style="margin-top:12px;color:var(--muted); font-size:0.98rem">${warmMessages[0]}</p>
    </div>
  `;

  thinkInterval = setInterval(() => {
    _warmIndex = (_warmIndex + 1) % warmMessages.length;
    const el = document.getElementById('warmMsg');
    if (el) el.textContent = warmMessages[_warmIndex];
  }, 4200);

  try {
    const response = await fetch('http://127.0.0.1:5000/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taste, budget, health })
    });

    const result = await response.json();

    if (result.status === 'success') {
      if (thinkInterval) { clearInterval(thinkInterval); thinkInterval = null; }
      const aiData = result.data;
      resultArea.innerHTML = `
        ${createMealBlock('早餐', aiData.breakfast)}
        ${createMealBlock('午餐', aiData.lunch)}
        ${createMealBlock('晚餐', aiData.dinner)}
      `;
      
      // === 保存食谱数据，并激活下方的外卖转化按钮 ===
      currentRecipeData = aiData;
      
      if (generateTakeoutBtn && takeoutArea) {
        generateTakeoutBtn.style.display = 'inline-block';
        generateTakeoutBtn.innerText = '一键转化为外卖单'; // 重置按钮文字
        takeoutArea.innerHTML = `
            <article class="feature-card"><div class="feature-icon">🥞</div><h4>早餐外卖</h4><p>等待转化...</p ></article>
            <article class="feature-card"><div class="feature-icon">🍱</div><h4>午餐外卖</h4><p>等待转化...</p ></article>
            <article class="feature-card"><div class="feature-icon">🍲</div><h4>晚餐外卖</h4><p>等待转化...</p ></article>
        `;
      }

    } else {
      if (thinkInterval) { clearInterval(thinkInterval); thinkInterval = null; }
      resultArea.innerHTML = `<p class="result-tip" style="color: red;">错误：${result.message}</p >`;
    }
  } catch (error) {
    console.error("请求后端失败:", error);
    if (thinkInterval) { clearInterval(thinkInterval); thinkInterval = null; }
    resultArea.innerHTML = '<p class="result-tip" style="color: red;">无法连接到大模型服务器，请确保后端已启动。</p >';
  }
};

// === 核心功能 2：点击“转化为外卖单”按钮的逻辑 ===
if (generateTakeoutBtn) {
  generateTakeoutBtn.addEventListener('click', async () => {
    if (!currentRecipeData) return;

    // 1. 改变按钮状态和页面滚动
    generateTakeoutBtn.innerText = '🛵 AI 正在为您搜寻附近外卖...';
    generateTakeoutBtn.disabled = true;
    smoothScroll('#daily-recipe'); // 滚到每日推荐区

    // 2. 显示卡片加载中
    if (takeoutArea) {
      takeoutArea.innerHTML = `
        <article class="feature-card"><div class="feature-icon">🛵</div><h4>早餐外卖</h4><p>规划中...</p ></article>
        <article class="feature-card"><div class="feature-icon">🛵</div><h4>午餐外卖</h4><p>规划中...</p ></article>
        <article class="feature-card"><div class="feature-icon">🛵</div><h4>晚餐外卖</h4><p>规划中...</p ></article>
      `;
    }

    try {
      // 3. 把刚才生成的食谱发给后端的 Agent 3
      const response = await fetch('http://127.0.0.1:5000/api/takeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRecipeData)
      });
      
      const result = await response.json();
      
      // 4. 将 Agent 3 返回的店名、菜品、价格渲染到卡片里
      if (result.status === 'success') {
        const tData = result.data;
        if (takeoutArea) {
          takeoutArea.innerHTML = `
            <article class="feature-card">
              <div class="feature-icon">🥞</div>
              <h4>早餐外卖</h4>
              <p><strong>🏪 店名：</strong>${tData.breakfast.shop}<br><strong>🥢 菜品：</strong>${tData.breakfast.dish}<br><strong style="color:var(--accent)">💰 价格：${tData.breakfast.price}</strong></p >
            </article>
            <article class="feature-card">
              <div class="feature-icon">🍱</div>
              <h4>午餐外卖</h4>
              <p><strong>🏪 店名：</strong>${tData.lunch.shop}<br><strong>🥢 菜品：</strong>${tData.lunch.dish}<br><strong style="color:var(--accent)">💰 价格：${tData.lunch.price}</strong></p >
            </article>
            <article class="feature-card">
              <div class="feature-icon">🍲</div>
              <h4>晚餐外卖</h4>
              <p><strong>🏪 店名：</strong>${tData.dinner.shop}<br><strong>🥢 菜品：</strong>${tData.dinner.dish}<br><strong style="color:var(--accent)">💰 价格：${tData.dinner.price}</strong></p >
            </article>
          `;
        }
        generateTakeoutBtn.innerText = '✅ 转化完成 (点击可重新生成)';
      } else {
        generateTakeoutBtn.innerText = '❌ 转化失败，请重试';
      }
    } catch (error) {
      generateTakeoutBtn.innerText = '❌ 网络错误';
    }
    generateTakeoutBtn.disabled = false;
  });
}

// === 辅助功能：自动填充示例、平滑滚动、收藏偏好等 ===
const fillSample = (taste, budget, health) => {
  document.getElementById('taste').value = taste;
  document.getElementById('budget').value = budget;
  document.getElementById('health').value = health;
  generateRecommendation();
};

const smoothScroll = (targetId) => {
  const target = document.querySelector(targetId);
  if (target) {
    window.scrollTo({ top: target.offsetTop - 60, behavior: 'smooth' });
  }
};

if (generateBtn) {
  generateBtn.addEventListener('click', generateRecommendation);
}

if (scrollToForm) {
  scrollToForm.addEventListener('click', () => smoothScroll('#input'));
}

navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    smoothScroll(link.getAttribute('href'));
  });
});

sampleButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const taste = button.dataset.taste || '';
    const budget = button.dataset.budget || '';
    const health = button.dataset.health || '';
    fillSample(taste, budget, health);
  });
});

// 保留你原来的：收藏偏好按钮（页面端示例）
if (tipsBtn) {
  tipsBtn.addEventListener('click', () => {
    alert('已保存到偏好（演示）。可扩展为用户偏好存储接口。');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (resultArea) {
    resultArea.innerHTML = defaultTips;
  }
});



// const generateBtn = document.getElementById('generateBtn');
// const resultArea = document.getElementById('resultArea');
// const scrollToForm = document.getElementById('scrollToForm');
// const navLinks = document.querySelectorAll('.nav-menu a');
// const sampleButtons = document.querySelectorAll('.sample-button');

// const defaultTips = '<p class="result-tip">输入偏好后，点击“生成推荐”，即可得到早餐、午餐、晚餐建议。</p>';

// const createMealBlock = (title, text) => {
//   return `
//     <div class="meal-block">
//       <h4>${title}</h4>
//       <p>${text}</p>
//     </div>
//   `;
// };

// // 注意：我们在函数前面加了 async，因为网络请求需要等待
// const generateRecommendation = async () => {
//   const taste = document.getElementById('taste').value.trim();
//   const budget = document.getElementById('budget').value.trim();
//   const health = document.getElementById('health').value.trim();

//   if (!taste && !budget && !health) {
//     resultArea.innerHTML = '<p class="result-tip">请先输入至少一项饮食需求，例如口味、预算或健康偏好。</p>';
//     return;
//   }

//   // === 1. 增加一个“加载中”的提示 ===
//   // 因为大模型生成需要几秒钟，必须给用户反馈，否则用户以为卡死了
//   resultArea.innerHTML = `
//     <div style="text-align:center; padding: 40px; color: var(--accent);">
//        <p>✨ Qwen 大模型正在为您定制专属食谱，请稍候...</p>
//     </div>
//   `;

//   try {
//     // === 2. 向你的 Python 后端发送请求 ===
//     // fetch 里的地址就是你 Flask 启动的地址
//     const response = await fetch('http://127.0.0.1:5000/api/recommend', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       // 把用户输入的数据打包发过去
//       body: JSON.stringify({
//         taste: taste,
//         budget: budget,
//         health: health
//       })
//     });

//     const result = await response.json();

//     if (result.status === 'success') {
//       // === 3. 获取大模型返回的真实数据并渲染 ===
//       const aiData = result.data;
//       resultArea.innerHTML = `
//         ${createMealBlock('早餐', aiData.breakfast)}
//         ${createMealBlock('午餐', aiData.lunch)}
//         ${createMealBlock('晚餐', aiData.dinner)}
//       `;
//     } else {
//       // 后端报错了
//       resultArea.innerHTML = `<p class="result-tip" style="color: red;">错误：${result.message}</p>`;
//     }

//   } catch (error) {
//     // 网络请求失败（比如没开后端）
//     console.error("请求后端失败:", error);
//     resultArea.innerHTML = '<p class="result-tip" style="color: red;">无法连接到大模型服务器，请确保后端和 Ollama 已启动。</p>';
//   }
// };

// const fillSample = (taste, budget, health) => {
//   document.getElementById('taste').value = taste;
//   document.getElementById('budget').value = budget;
//   document.getElementById('health').value = health;
//   generateRecommendation();
// };

// const smoothScroll = (targetId) => {
//   const target = document.querySelector(targetId);
//   if (target) {
//     window.scrollTo({ top: target.offsetTop - 60, behavior: 'smooth' });
//   }
// };

// generateBtn.addEventListener('click', generateRecommendation);
// scrollToForm.addEventListener('click', () => smoothScroll('#input'));

// navLinks.forEach((link) => {
//   link.addEventListener('click', (event) => {
//     event.preventDefault();
//     smoothScroll(link.getAttribute('href'));
//   });
// });

// sampleButtons.forEach((button) => {
//   button.addEventListener('click', () => {
//     const taste = button.dataset.taste || '';
//     const budget = button.dataset.budget || '';
//     const health = button.dataset.health || '';
//     fillSample(taste, budget, health);
//   });
// });

// // 收藏偏好按钮（页面端示例）
// const tipsBtn = document.getElementById('tipsBtn');

// if (tipsBtn) {
//   tipsBtn.addEventListener('click', () => {
//     alert('已保存到偏好（演示）。可扩展为用户偏好存储接口。');
//   });
// }

// window.addEventListener('DOMContentLoaded', () => {
//   resultArea.innerHTML = defaultTips;
// });
