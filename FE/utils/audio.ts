export const playSuccessSound = () => {
  try {
    const audio = new Audio();
    // Use local file for stability and speed
    audio.src = "/audios/success-audio.mp3";
    audio.volume = 0.5;
    audio.play().catch((e) => console.log("Audio play failed:", e));
  } catch (error) {
    console.error("Audio error", error);
  }
};

// --- LOGIC ĐỌC SỐ TIỀN TIẾNG VIỆT ---

const CHU_SO = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];
const HANG = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

function docSo3ChuSo(baso: number): string {
  const tram = Math.floor(baso / 100);
  const chuc = Math.floor((baso % 100) / 10);
  const donvi = baso % 10;
  let ketqua = "";

  // Đọc hàng trăm
  if (tram !== 0) {
    ketqua += CHU_SO[tram] + " trăm";
    if (chuc === 0 && donvi !== 0) ketqua += " linh";
  }

  // Đọc hàng chục
  if (chuc !== 0 && chuc !== 1) {
    ketqua += " " + CHU_SO[chuc] + " mươi";
    if (chuc === 0 && donvi !== 0) ketqua += " linh";
  } else if (chuc === 1) {
    ketqua += " mười";
  }

  // Đọc hàng đơn vị
  if (donvi !== 0) {
    if (chuc !== 0 && chuc !== 1) {
      if (donvi === 1) ketqua += " mốt";
      else if (donvi === 5) ketqua += " lăm";
      else ketqua += " " + CHU_SO[donvi];
    } else if (chuc === 1) {
      if (donvi === 1) ketqua += " một";
      else if (donvi === 5) ketqua += " lăm";
      else ketqua += " " + CHU_SO[donvi];
    } else {
      // Chục = 0
      if (tram !== 0) ketqua += " " + CHU_SO[donvi];
      else ketqua += CHU_SO[donvi]; // Trường hợp số < 10
    }
  }

  return ketqua;
}

export function readMoney(number: number): string {
  if (number === 0) return "không";
  const str = Math.abs(number).toString();
  let i = 0;
  const arr = [];
  let index = str.length;
  const result: string[] = [];

  // Chia chuỗi số thành các nhóm 3 số từ cuối lên
  while (index > 0) {
    arr.push(str.substring(Math.max(index - 3, 0), index));
    index -= 3;
  }

  // Duyệt từng nhóm (arr đang là ngược [đơn vị, nghìn, triệu...])
  for (i = 0; i < arr.length; i++) {
    const so3 = parseInt(arr[i]);
    if (so3 !== 0) {
      const str3 = docSo3ChuSo(so3);
      const tenHang = HANG[i];
      if (str3.trim().length > 0) {
        // Thêm nhóm đọc được vào đầu mảng kết quả
        result.unshift((str3 + " " + tenHang).trim());
      }
    }
  }

  return result.join(" ").replace(/\s+/g, " ").trim();
}

// ------------------------------------

export const speakPaymentSuccess = (amount: number) => {
  if (!("speechSynthesis" in window)) return;

  // STEP 1: Dùng hàm đọc tiền thay vì toLocaleString
  // Sẽ đọc là "năm trăm nghìn" thay vì "500000"
  const moneyText = readMoney(amount);
  const text = `Thanh toán thành công. Đã nhận ${moneyText} đồng`;

  const utterance = new SpeechSynthesisUtterance(text);

  const speakIfVietnameseAvailable = () => {
    const voices = speechSynthesis.getVoices();

    // Fix: Tìm rộng hơn (cả vi-VN và vi_VN)
    const viVoice = voices.find(
      (v) => v.lang === "vi-VN" || v.lang === "vi_VN"
    );

    if (!viVoice) {
      console.warn("Không có voice tiếng Việt → bỏ qua đọc");
      return;
    }

    utterance.voice = viVoice;
    utterance.lang = "vi-VN";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    speechSynthesis.cancel(); // tránh nói chồng
    speechSynthesis.speak(utterance);
  };

  // Chrome load voices async
  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.onvoiceschanged = speakIfVietnameseAvailable;
  } else {
    speakIfVietnameseAvailable();
  }
};
