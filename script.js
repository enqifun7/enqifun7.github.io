const generateBtn = document.getElementById('generateBtn');
const resultArea = document.getElementById('resultArea');
const scrollToForm = document.getElementById('scrollToForm');
const navLinks = document.querySelectorAll('.nav-menu a');

const generateRecommendation = () => {
  const taste = document.getElementById('taste').value.trim();
  const budget = document.getElementById('budget').value.trim();
  const health = document.getElementById('health').value.trim();

  if (!taste && !budget && !health) {
    resultArea.innerHTML = '<p>请先输入至少一项饮食需求，例如口味、预算或健康偏好。</p>';
    return;
  }

  const breakfast = `早餐：推荐一份${taste || '清淡'}早饭，如${health ? '燕麦水果碗' : '豆浆油条'}。`;
  const lunch = `午餐：建议一套${budget || '经济'}方案，${health ? '蔬菜鸡胸肉沙拉' : '学生食堂热菜'}。`;
  const dinner = `晚餐：可以选择${taste || '家常'}口味的${health ? '蒸鱼+青菜' : '简易炒菜'}。`;

  resultArea.innerHTML = `
    <div class="meal-block">
      <h4>早餐</h4>
      <p>${breakfast}</p>
    </div>
    <div class="meal-block">
      <h4>午餐</h4>
      <p>${lunch}</p>
    </div>
    <div class="meal-block">
      <h4>晚餐</h4>
      <p>${dinner}</p>
    </div>
  `;
};

const smoothScroll = (targetId) => {
  const target = document.querySelector(targetId);
  if (target) {
    window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
  }
};

generateBtn.addEventListener('click', generateRecommendation);
scrollToForm.addEventListener('click', () => smoothScroll('#input'));

navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    smoothScroll(link.getAttribute('href'));
  });
});
