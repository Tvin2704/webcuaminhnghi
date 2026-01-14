const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();

// Cho phép truy cập toàn bộ thư mục gốc để lấy ảnh/sticker [cite: 2026-01-12]
app.use(express.static('.'));
const port = process.env.PORT || 3000;

// Cấu hình Middleware hệ thống
app.use(express.static(path.join(__dirname, 'src/pages')));
app.use('/styles', express.static(path.join(__dirname, 'src/styles')));
app.use('/scripts', express.static(path.join(__dirname, 'src/scripts')));
app.use(express.json()); // Xử lý dữ liệu JSON từ trình duyệt gửi lên [cite: 2026-01-12]

// Đường dẫn file Database an toàn
const dbPath = path.join(__dirname, 'database', 'database.json');

// --- HÀM HỖ TRỢ DỮ LIỆU (Giúp code gọn và ít lỗi hơn) ---
const getDB = () => {
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (err) {
        console.error("❌ Lỗi đọc file Database:", err);
        return { users: [], documents: [] };
    }
};

const saveDB = (data) => {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("❌ Lỗi lưu file Database:", err);
    }
};

// --- MONGODB (MONGOOSE) ---
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL;
if (!MONGODB_URI) {
    console.warn("⚠️ Chưa thấy biến môi trường MONGODB_URI (hoặc MONGO_URI/MONGO_URL). Server vẫn chạy nhưng API tài liệu sẽ lỗi nếu chưa kết nối DB.");
}

// Tài liệu học tập
const documentSchema = new mongoose.Schema(
    {
        id: { type: Number, required: true, unique: true, index: true },
        category: { type: String, required: true, trim: true },
        subject: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true },
        link: { type: String, required: true, trim: true }
    },
    { timestamps: true }
);

const DocumentModel = mongoose.model('Document', documentSchema);

// Tài khoản người dùng (LƯU MẬT KHẨU PLAIN TEXT THEO YÊU CẦU)
const userSchema = new mongoose.Schema(
    {
        id: { type: Number, required: true, unique: true, index: true },
        account: { type: String, required: true, unique: true, trim: true },
        // Không dùng bcrypt: mật khẩu được lưu nguyên văn (plain text)
        password: { type: String, required: true },
        role: { type: String, default: 'user' },
        savedLinks: { type: [Number], default: [] }
    },
    { timestamps: true }
);

const UserModel = mongoose.model('User', userSchema);

async function connectMongo() {
    if (!MONGODB_URI) return false;
    try {
        await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB });
        console.log("✅ MongoDB connected via mongoose");
        return true;
    } catch (err) {
        console.error("❌ MongoDB connect error:", err.message || err);
        return false;
    }
}

async function migrateDocumentsFromJsonIfNeeded() {
    try {
        // Nếu chưa connect thì bỏ qua, để server vẫn chạy static/UI
        if (mongoose.connection.readyState !== 1) return;

        const count = await DocumentModel.estimatedDocumentCount();
        if (count > 0) return;

        const db = getDB();
        const docs = Array.isArray(db.documents) ? db.documents : [];
        if (docs.length === 0) return;

        // Chuẩn hoá dữ liệu
        const normalized = docs
            .filter(d => d && d.title && d.link)
            .map(d => ({
                id: Number(d.id) || Date.now(),
                category: String(d.category || ""),
                subject: String(d.subject || ""),
                title: String(d.title || ""),
                link: String(d.link || ""),
                sticker: d.sticker || undefined
            }));

        await DocumentModel.insertMany(normalized, { ordered: false });
        console.log(`✅ Migrated ${normalized.length} documents from database.json -> MongoDB`);
    } catch (err) {
        // insertMany ordered:false có thể ném lỗi duplicate; chấp nhận được
        console.warn("⚠️ Migration warning:", err.message || err);
    }
}

// Chuyển users từ database.json sang MongoDB (lưu password plain text)
async function migrateUsersFromJsonIfNeeded() {
    try {
        if (mongoose.connection.readyState !== 1) return;

        const count = await UserModel.estimatedDocumentCount();
        if (count > 0) return;

        const db = getDB();
        const users = Array.isArray(db.users) ? db.users : [];
        if (users.length === 0) return;

        const normalized = users
            .filter(u => u && u.account && u.password)
            .map(u => ({
                id: Number(u.id) || Date.now(),
                account: String(u.account),
                // GIỮ NGUYÊN MẬT KHẨU ĐANG CÓ (KHÔNG HASH)
                password: String(u.password),
                role: u.role || 'user',
                savedLinks: Array.isArray(u.savedLinks)
                    ? u.savedLinks.map(Number).filter(n => Number.isFinite(n))
                    : []
            }));

        await UserModel.insertMany(normalized, { ordered: false });
        console.log(`✅ Migrated ${normalized.length} users from database.json -> MongoDB`);
    } catch (err) {
        console.warn("⚠️ User migration warning:", err.message || err);
    }
}

// --- ĐIỀU HƯỚNG GIAO DIỆN ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'src/pages/admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'src/pages/index.html')));

// --- API QUẢN LÝ TÀI LIỆU (Toán, Văn, Anh, Sử, Địa, Sinh, Hóa) ---

// 1. Lấy toàn bộ tài liệu
app.get('/api/documents', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: "MongoDB chưa sẵn sàng" });
        }
        const docs = await DocumentModel.find({}, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
        // Luôn đảm bảo trả về mảng để tránh lỗi giao diện
        res.json(Array.isArray(docs) ? docs : []);
    } catch (err) {
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
});

// 2. Đăng bài mới (Tự động gán ID và Sticker mặc định)
app.post('/api/upload', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, error: "MongoDB chưa sẵn sàng" });
        }

        const newDoc = req.body || {};
        const created = await DocumentModel.create({
            id: Date.now(),
            category: newDoc.category,
            subject: newDoc.subject,
            title: newDoc.title,
            link: newDoc.link,
            sticker: newDoc.sticker
        });

        console.log(`✅ Đã đăng bài môn: ${created.subject} - Tiêu đề: ${created.title}`);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 3. Xóa bài (Đảm bảo ép kiểu số để xóa chính xác)
app.delete('/api/documents/:id', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: "MongoDB chưa sẵn sàng" });
        }

        const idToDelete = Number(req.params.id); // Ép kiểu số ngay lập tức
        const result = await DocumentModel.deleteOne({ id: idToDelete });

        if (result.deletedCount > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Không tìm thấy bài cần xóa" });
        }
    } catch (err) {
        res.status(500).json({ error: "Lỗi hệ thống khi xóa" });
    }
});

// --- API TÀI KHOẢN & KHO LƯU TRỮ ---

// 4. Đăng ký thành viên (LƯU PASSWORD PLAIN TEXT VÀO MONGODB)
app.post('/api/register', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: "MongoDB chưa sẵn sàng" });
        }

        const { account, password } = req.body;
        if (!account || !password) {
            return res.json({ success: false, message: "Thiếu tài khoản hoặc mật khẩu" });
        }

        const existing = await UserModel.findOne({ account });
        if (existing) {
            return res.json({ success: false, message: "Tài khoản này đã có người dùng!" });
        }

        await UserModel.create({
            id: Date.now(),
            account,
            // MẬT KHẨU LƯU NGUYÊN VĂN (KHÔNG HASH)
            password,
            role: "user",
            savedLinks: []
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 5. Đăng nhập (SO SÁNH MẬT KHẨU PLAIN TEXT)
app.post('/api/login', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: "MongoDB chưa sẵn sàng" });
        }

        const { account, password } = req.body;
        const user = await UserModel.findOne({ account, password });

        if (user) {
            res.json({ success: true, role: user.role, account: user.account });
        } else {
            res.json({ success: false, message: "Thông tin đăng nhập không đúng!" });
        }
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 6. Lưu/Bỏ lưu (Toggle Save) - dùng MongoDB
app.post('/api/save-doc', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: "MongoDB chưa sẵn sàng" });
        }

        const { account, docId } = req.body;
        const user = await UserModel.findOne({ account });

        if (!user) {
            return res.status(404).json({ success: false, message: "Cần đăng nhập" });
        }

        const targetId = Number(docId);
        if (!Number.isFinite(targetId)) {
            return res.status(400).json({ success: false, message: "ID tài liệu không hợp lệ" });
        }

        const idx = user.savedLinks.indexOf(targetId);
        if (idx === -1) {
            user.savedLinks.push(targetId);
        } else {
            user.savedLinks.splice(idx, 1);
        }

        await user.save();
        res.json({ success: true, isSaved: user.savedLinks.includes(targetId) });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 7. Lấy danh sách cho Kho Của Tôi (User + SavedLinks trong MongoDB)
app.get('/api/my-saved-docs', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json([]);
        }

        const { account } = req.query;
        const user = await UserModel.findOne({ account }).lean();

        if (!user || !Array.isArray(user.savedLinks) || user.savedLinks.length === 0) {
            return res.json([]);
        }

        const ids = user.savedLinks.map(Number).filter(n => Number.isFinite(n));
        const myDocs = await DocumentModel.find({ id: { $in: ids } }, { _id: 0, __v: 0 }).lean();
        res.json(Array.isArray(myDocs) ? myDocs : []);
    } catch (err) {
        res.status(500).json([]);
    }
});

// Khởi động server + kết nối DB (không block UI nếu DB lỗi)
(async () => {
    await connectMongo();
    await migrateDocumentsFromJsonIfNeeded();
    await migrateUsersFromJsonIfNeeded();

    app.listen(port, () => {
        console.log(`🚀 Hệ thống kĩ tính của bạn đã sẵn sàng tại: http://localhost:${port}`);
    });
})();