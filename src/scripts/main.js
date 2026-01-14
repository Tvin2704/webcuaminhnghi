
function updateCountdowns() {
    const now = new Date().getTime();

    // Cấu hình ngày thi [cite: 2026-01-12]
    const dates = {
        'v10': new Date('2026-06-01T07:30:00').getTime(), // Thay ngày thi vào 10 của bạn
        'thpt': new Date('2026-06-11T07:30:00').getTime() // Thay ngày thi THPT của bạn
    };

    for (let target in dates) {
        const distance = dates[target] - now;
        const element = document.getElementById(`countdown-${target}`);

        if (!element) continue;

        if (distance < 0) {
            element.innerHTML = "ĐÃ ĐẾN NGÀY THI! 🔥";
            continue;
        }

        // Tính toán Ngày, Giờ, Phút, Giây [cite: 2026-01-12]
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Hiển thị ra màn hình (Giao diện cực gọn cho điện thoại) [cite: 2026-01-12]
        element.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
}

// Chạy cập nhật mỗi 1 giây [cite: 2026-01-12]
setInterval(updateCountdowns, 1000);
updateCountdowns();

// ... (Giữ nguyên phần code createFloatingTimer và logic Pomodoro bên dưới) ...




// 1. Hàm tạo giao diện HTML cho đồng hồ (Chạy ngay khi web tải)
function createFloatingTimer() {
    const timerHTML = `
        <div id="timer-icon" onclick="toggleTimer()">⏳</div>
        <div id="timer-popup">
            <h3>Pomodoro</h3>
            <div id="timer-display">25:00</div>
            <div class="timer-controls">
                <button class="btn-start" onclick="startTimer()">Start</button>
                <button class="btn-stop" onclick="stopTimer()">Stop</button>
                <button class="btn-reset" onclick="resetTimer()">Reset</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', timerHTML);
}

// Gọi hàm tạo đồng hồ
createFloatingTimer();

// 2. Logic xử lý đồng hồ
let timer; // Biến lưu trạng thái đồng hồ
let timeLeft = 25 * 60; // 25 phút đổi ra giây
let isRunning = false;

function toggleTimer() {
    const popup = document.getElementById("timer-popup");
    // Bật/tắt class 'active' để hiện/ẩn
    if (popup.style.display === "block") {
        popup.style.display = "none";
    } else {
        popup.style.display = "block";
    }
}

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    // Thêm số 0 đằng trước nếu nhỏ hơn 10 (VD: 09:05)
    document.getElementById("timer-display").innerText = 
        `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function startTimer() {
    if (!isRunning) {
        isRunning = true;
        timer = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateDisplay();
            } else {
                clearInterval(timer);
                alert("Đã hết giờ học! Hãy nghỉ ngơi chút nhé.");
                isRunning = false;
            }
        }, 1000);
    }
}

function stopTimer() {
    clearInterval(timer);
    isRunning = false;
}

function resetTimer() {
    stopTimer();
    timeLeft = 25 * 60; // Reset về 25 phút
    updateDisplay();
}// --- TỰ ĐỘNG TẠO CHAT WIDGET ---
function createFloatingChat() {
    const chatHTML = `
        <div id="chat-widget-icon" onclick="toggleChat()">💬</div>
        <div id="chat-widget-window">
            <div class="chat-widget-header">
                <span>Các huynh đệ hãy bàn tán😘</span>
                <span class="close-chat" onclick="toggleChat()">×</span>
            </div>
            <<iframe src="https://www5.cbox.ws/box/?boxid=960715&boxtag=mHaV4c" width="100%" height="450" allowtransparency="yes" allow="autoplay" frameborder="0" marginheight="0" marginwidth="0" scrolling="auto"></iframe>	
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatHTML);
}

// Hàm bật/tắt khung chat
function toggleChat() {
    const chatWin = document.getElementById("chat-widget-window");
    chatWin.classList.toggle("active");
}

// Gọi hàm khởi tạo
createFloatingChat();
function filterDocs() {
    const input = document.getElementById('doc-search').value.toLowerCase();
    
    // Quét cả các ô ở trang chủ (.card) và các khối tài liệu ở trang con (.doc-card)
    const docContainers = document.querySelectorAll('.card, .doc-card, .subject-item'); 

    docContainers.forEach(container => {
        // Lấy toàn bộ chữ bên trong khối tài liệu đó
        const text = container.innerText.toLowerCase();
        
        if (text.includes(input)) {
            container.style.display = ""; // Hiện nếu khớp "moon"
        } else {
            container.style.display = "none"; // Ẩn nếu không khớp
        }
    });
}
