const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// 초기 샘플 VIP DB (인메모리)
let vipDatabase = [
  { id: 1, name: '홍길동', title: '대표', carNumber: '123가4567', zone: 'A-01', note: '의전 필요' },
  { id: 2, name: '김철수', title: '장관', carNumber: '89나1234', zone: 'A-02', note: '발렛 요청' }
];

const cleanNumber = (str) => str ? str.replace(/[^0-9가-힣]/g, '') : '';

// [API] 전체 VIP 목록 조회
app.get('/api/vips', (req, res) => {
  res.json({ success: true, data: vipDatabase });
});

// [API] VIP 신규 등록
app.post('/api/vips', (req, res) => {
  const { name, title, carNumber, zone, note } = req.body;
  if (!name || !carNumber || !zone) {
    return res.status(400).json({ success: false, message: '필수 항목이 누락되었습니다.' });
  }

  const newVip = {
    id: Date.now(),
    name,
    title: title || '내빈',
    carNumber: cleanNumber(carNumber),
    zone,
    note: note || ''
  };

  vipDatabase.push(newVip);
  res.json({ success: true, data: newVip });
});

// [API] VIP 삭제
app.delete('/api/vips/:id', (req, res) => {
  const id = parseInt(req.params.id);
  vipDatabase = vipDatabase.filter(item => item.id !== id);
  res.json({ success: true, message: 'VIP 정보가 삭제되었습니다.' });
});

// [API] 차량 번호 검색
app.post('/api/vips/search', (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ success: false, message: '검색어를 입력해 주세요.' });
  }

  const cleanQuery = cleanNumber(query);

  const matchedVip = vipDatabase.find(vip => {
    const cleanedCar = cleanNumber(vip.carNumber);
    if (cleanQuery.length === 4 && /^\d+$/.test(cleanQuery)) {
      return cleanedCar.endsWith(cleanQuery);
    }
    return cleanQuery.includes(cleanedCar) || cleanedCar.includes(cleanQuery);
  });

  if (matchedVip) {
    res.json({ success: true, isVip: true, data: matchedVip });
  } else {
    res.json({ success: true, isVip: false, message: '일반/미등록 차량입니다.' });
  }
});

module.exports = app;