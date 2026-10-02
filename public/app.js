const video = document.getElementById('webcam');
const canvas = document.getElementById('captureCanvas');
const scanBtn = document.getElementById('scanBtn');
const manualBtn = document.getElementById('manualBtn');
const manualInput = document.getElementById('manualInput');
const ocrLoading = document.getElementById('ocrLoading');
const resultCard = document.getElementById('resultCard');

// 1. 후면 카메라 스트림 실행
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: "environment" }, // 후면 카메라 우선
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    video.srcObject = stream;
  } catch (err) {
    console.warn("후면 카메라를 찾을 수 없어 기본 카메라로 전환합니다.", err);
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = fallbackStream;
    } catch (e) {
      alert("카메라 권한을 허용해 주세요.");
    }
  }
}

// 2. Web Speech API (음성 안내)
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // 이전 음성 취소
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

// 3. Tesseract.js OCR을 이용한 번호판 스캔
scanBtn.addEventListener('click', async () => {
  if (!video.srcObject) return;

  // 캔버스에 현재 프레임 그리기
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // 로딩 표시
  ocrLoading.classList.remove('hidden');

  try {
    // Tesseract OCR 실행 (한국어 + 영어)
    const result = await Tesseract.recognize(canvas, 'kor+eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          document.getElementById('ocrStatusText').innerText = `인식 중... ${Math.round(m.progress * 100)}%`;
        }
      }
    });

    const recognizedText = result.data.text;
    console.log("OCR Extracted Text:", recognizedText);

    // 서버로 검색 요청
    await searchCarNumber(recognizedText);
  } catch (error) {
    console.error("OCR 에러:", error);
    alert("번호판 인식 도중 오류가 발생했습니다.");
  } finally {
    ocrLoading.classList.add('hidden');
  }
});

// 4. 수동 입력 검색
manualBtn.addEventListener('click', () => {
  const val = manualInput.value.trim();
  if (!val) {
    alert('차량 번호를 입력해 주세요.');
    return;
  }
  searchCarNumber(val);
});

manualInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') manualBtn.click();
});

// 5. 서버에 차량 번호 조회
async function searchCarNumber(queryText) {
  try {
    const res = await fetch('/api/vips/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: queryText })
    });
    const result = await res.json();

    if (result.isVip) {
      showVipResult(result.data);
    } else {
      showNormalResult();
    }
  } catch (err) {
    console.error("검색 API 에러:", err);
  }
}

// 6. VIP 결과 화면 출력 (초록색 알림)
function showVipResult(vip) {
  resultCard.className = "bg-white rounded-2xl p-6 shadow-2xl border-4 border-green-500 transition-all";

  const badge = document.getElementById('resultBadge');
  badge.className = "inline-block px-3 py-1 rounded-full text-sm font-extrabold mb-2 bg-green-100 text-green-800";
  badge.innerText = "🟢 VIP 등록 차량";

  document.getElementById('resultTitle').innerText = `${vip.name} ${vip.title}`;
  document.getElementById('resultSubtitle').innerText = `차량번호: ${vip.carNumber}`;

  const zoneBox = document.getElementById('zoneBox');
  zoneBox.className = "rounded-xl p-4 text-center my-2 border-2 bg-yellow-50 border-yellow-400 text-yellow-900";
  document.getElementById('resultZone').innerText = vip.zone;

  document.getElementById('resultNote').innerText = vip.note ? `📌 비고: ${vip.note}` : "";

  resultCard.classList.remove('hidden');

  // 음성 안내
  speakText(`${vip.name} ${vip.title}님, 지정 구역은 ${vip.zone} 입니다.`);
}

// 7. 일반 차량 결과 화면 출력 (주황/회색 알림)
function showNormalResult() {
  resultCard.className = "bg-white rounded-2xl p-6 shadow-2xl border-4 border-gray-400 transition-all";

  const badge = document.getElementById('resultBadge');
  badge.className = "inline-block px-3 py-1 rounded-full text-sm font-extrabold mb-2 bg-gray-200 text-gray-800";
  badge.innerText = "⚪ 일반 / 미등록 차량";

  document.getElementById('resultTitle').innerText = "일반 차량";
  document.getElementById('resultSubtitle').innerText = "사전 등록되지 않은 차량입니다.";

  const zoneBox = document.getElementById('zoneBox');
  zoneBox.className = "rounded-xl p-4 text-center my-2 border-2 bg-gray-100 border-gray-300 text-gray-800";
  document.getElementById('resultZone').innerText = "B구역 (일반)";

  document.getElementById('resultNote').innerText = "일반 주차장으로 안내해 주세요.";

  resultCard.classList.remove('hidden');

  // 음성 안내
  speakText("일반 차량입니다. B구역으로 안내하세요.");
}

function hideResult() {
  resultCard.classList.add('hidden');
  manualInput.value = '';
}

// 앱 시작 시 카메라 초기화
initCamera();