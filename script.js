const wordLevels = {
  1: ["하마", "나라", "아마", "어머니", "호랑이", "머리", "하나", "아리아", "마리아", "로마", "마나", "하모니", "오리", "나이", "아이", "어이", "하이", "이하", "오하이오", "아나", "라마", "할머니", "알", "말", "날", "일", "밀", "올", "놀", "홀", "몸", "남", "암", "맘", "함"],
  2: ["가방", "바다", "모기", "거미", "사자", "가지", "바지", "고기", "아기", "독사", "모자", "다리", "오소리", "보리", "가시", "도토리", "호기심", "아버지", "바가지", "비비기"],
  3: ["매미", "개미", "여자", "병아리", "별", "요리", "학교", "냄비", "해바라기", "모래", "대머리", "배", "새", "재미", "매", "야자", "야사", "교자", "도쿄", "묘지"],
  4: [],
  5: ["기차", "피아노", "기타", "토마토", "포도", "파도", "코끼리", "치타", "파출소", "카메라", "타조", "코", "피", "차", "파리", "포크", "코트", "차표", "치마"],
  6: ["사과", "구름", "무지개", "수박", "자두", "컴퓨터", "스마트폰", "우주", "원숭이", "얼룩말", "펭귄", "플루트", "축구", "농구", "야구", "수영", "테니스", "강아지", "고양이", "다람쥐"],
  7: [],
  8: ["하늘이 참 푸르다", "비가 내리고 있다", "게임이 재미있다", "빠르게 타자를 치자", "우리는 할 수 있다"],
  9: [],
  10: ["소나기가 내리는 날에는 집에 있는 것이 좋다", "타자 연습을 꾸준히 하면 손가락이 엄청 빨라진다", "키보드 위에서 손가락이 춤을 추는 것만 같다", "한글은 매우 과학적이고 아름다운 문자 체계이다", "오늘 하루도 행복하고 즐거운 시간이 되었으면 좋겠다"]
};

let currentWordPool = [];

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const canvasWrapper = document.querySelector(".canvas-wrapper");

const levelElement = document.getElementById("level");
const scoreElement = document.getElementById("score");
const lifeElement = document.getElementById("life");
const inputForm = document.getElementById("inputForm");
const wordInput = document.getElementById("wordInput");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreElement = document.getElementById("finalScore");
const restartBtn = document.getElementById("restartBtn");

let level = 1;
let score = 0;
let life = 3;
let activeWords = [];
let particles = [];
let stars = [];
let animationId = null;
let lastTime = 0;
let wordSpawnTimer = 0;
let wordSpawnInterval = 1500;
let isGameOver = false;

// Audio Context 생성
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  const now = audioCtx.currentTime;
  
  if (type === 'ping') {
    // 단어 맞추기: 높은 주파수, 짧고 경쾌한 소리
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
    
  } else if (type === 'miss') {
    // 단어 놓침: 짧고 둔탁한 소리
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
    
  } else if (type === 'levelup') {
    // 레벨업: 상승하는 음계 (경쾌함)
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      const startTime = now + idx * 0.1;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
      
      osc.start(startTime);
      osc.stop(startTime + 0.1);
    });
    
  } else if (type === 'gameover') {
    // 게임오버: 하강하는 음계
    const notes = [440, 415.30, 392.00, 349.23, 220]; // A4, G#4, G4, F4, A3
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      const startTime = now + idx * 0.15;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.15);
      
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }
}

// 별(배경) 초기화
function initStars() {
  stars = [];
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.3 + 0.1, // 단어보다 매우 느린 속도
      opacity: Math.random() * 0.5 + 0.1
    });
  }
}

// 레벨에 맞는 단어 풀 갱신
function updateWordPool() {
  currentWordPool = [];
  for (let i = 1; i <= level; i++) {
    if (wordLevels[i]) {
      currentWordPool = currentWordPool.concat(wordLevels[i]);
    }
  }
  // 기본 풀 보장
  if (currentWordPool.length === 0) {
    currentWordPool = wordLevels[1];
  }
}

// 파티클 생성 함수 (불꽃놀이 효과)
function createParticles(x, y, text) {
  const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  // 파티클 30개 생성
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    particles.push({
      x: x + 20, // 텍스트 중앙 쯤
      y: y + 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: Math.random() * 0.02 + 0.015,
      color: color,
      size: Math.random() * 3 + 1
    });
  }
}

function init() {
  if (animationId) cancelAnimationFrame(animationId);
  
  level = 1;
  score = 0;
  life = 3;
  activeWords = [];
  particles = [];
  wordSpawnInterval = 1500;
  isGameOver = false;
  wordSpawnTimer = 0;
  
  updateWordPool();
  initStars();
  updateStats();
  
  gameOverScreen.classList.add("hidden");
  wordInput.value = "";
  wordInput.disabled = false;
  wordInput.focus();
  canvasWrapper.style.backgroundColor = "var(--canvas-bg)";
  
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function updateStats() {
  levelElement.textContent = level;
  scoreElement.textContent = score;
  lifeElement.textContent = life;
}

function spawnWord() {
  const wordText = currentWordPool[Math.floor(Math.random() * currentWordPool.length)];
  ctx.font = "bold 26px Pretendard, sans-serif";
  const metrics = ctx.measureText(wordText);
  const wordWidth = metrics.width;
  
  const x = Math.max(10, Math.random() * (canvas.width - wordWidth - 20));
  
  const baseSpeed = 0.5;
  const speedMultiplier = 1 + ((level - 1) * 0.3) + (score * 0.015); 
  const speed = baseSpeed * speedMultiplier;
  
  activeWords.push({
    text: wordText,
    x: x,
    y: -30, // 캔버스 위에서 생성
    speed: speed,
    width: wordWidth
  });
}

function triggerGameOver() {
  isGameOver = true;
  wordInput.disabled = true;
  finalScoreElement.textContent = score;
  gameOverScreen.classList.remove("hidden");
  playSound('gameover');
}

function gameLoop(timestamp) {
  if (isGameOver) return;
  
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 배경 별(Stars) 처리
  ctx.fillStyle = "#cbd5e1"; // 은은한 회파란색
  stars.forEach(star => {
    star.y += star.speed * (deltaTime / 16);
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
    ctx.globalAlpha = star.opacity;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;
  
  // 파티클 처리
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.life -= p.decay * (deltaTime / 16);
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * (deltaTime / 16);
    p.y += p.vy * (deltaTime / 16);
    p.vy += 0.05; // 중력
    
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
  
  // 단어 생성 처리
  wordSpawnTimer += deltaTime;
  if (wordSpawnTimer > wordSpawnInterval) {
    spawnWord();
    wordSpawnTimer = 0;
    // 레벨/점수 비례 감소 간격 조절
    wordSpawnInterval = Math.max(500, 1500 - ((level - 1) * 150) - (score * 10));
  }
  
  // 단어 그리기 및 이동 처리
  ctx.font = "bold 26px Pretendard, sans-serif";
  ctx.fillStyle = "#1e293b";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  
  for (let i = 0; i < activeWords.length; i++) {
    let word = activeWords[i];
    word.y += word.speed * (deltaTime / 16);
    ctx.fillText(word.text, word.x, word.y);
  }
  
  // 충돌 검사 (역순)
  for (let i = activeWords.length - 1; i >= 0; i--) {
    if (activeWords[i].y > canvas.height) {
      activeWords.splice(i, 1);
      life--;
      updateStats();
      playSound('miss');
      
      canvasWrapper.style.backgroundColor = "#fee2e2";
      setTimeout(() => {
        if (!isGameOver) canvasWrapper.style.backgroundColor = "var(--canvas-bg)";
      }, 150);
      
      if (life <= 0) {
        triggerGameOver();
        return;
      }
    }
  }
  
  animationId = requestAnimationFrame(gameLoop);
}

function handleInputSubmit() {
  if (isGameOver) return;
  
  const typedWord = wordInput.value.trim();
  if (!typedWord) return;
  
  let matchIdx = -1;
  let maxTargetY = -1;
  
  for (let i = 0; i < activeWords.length; i++) {
    // 공백 섞인 문장용을 위해 두 텍스트 모두 불필요한 공백 제거 비교
    if (activeWords[i].text.replace(/\s+/g, '') === typedWord.replace(/\s+/g, '')) {
      if (activeWords[i].y > maxTargetY) {
        maxTargetY = activeWords[i].y;
        matchIdx = i;
      }
    }
  }
  
  if (matchIdx !== -1) {
    const matchedWord = activeWords[matchIdx];
    // 파티클 펑 효과 생성
    createParticles(matchedWord.x, matchedWord.y, matchedWord.text);
    playSound('ping');
    
    activeWords.splice(matchIdx, 1);
    score++;
    
    // 점수 10점마다 레벨 상승
    if (score % 10 === 0) {
      level++;
      updateWordPool(); // 레벨업 시 풀 갱신
      playSound('levelup');
      
      canvasWrapper.style.boxShadow = "0 0 20px 5px rgba(251, 191, 36, 0.6)";
      setTimeout(() => {
        canvasWrapper.style.boxShadow = "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
      }, 500);
    }
    
    updateStats();
  }
  
  wordInput.value = "";
}

// 텍스트 입력 처리 (엔터 키)
inputForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleInputSubmit();
});

// 스페이스바 입력 처리
wordInput.addEventListener("keydown", (e) => {
  if (e.key === " " || e.code === "Space") {
    e.preventDefault(); // 스페이스바가 입력창에 공백을 남기는 것을 방지
    handleInputSubmit();
  }
});

restartBtn.addEventListener("click", init);

init();
