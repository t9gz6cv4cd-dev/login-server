const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(cors());
app.use(express.json());

// === تعديل البيانات هنا ===
const BOT_TOKEN = '8842742285:AAEN9QjJuiCNW1_0Ilhyii6a6XH8_XayQ0Q';
const ADMIN_CHAT_ID = '7049052825';
// =========================

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const pendingRequests = new Map();

app.post('/api/login-request', (req, res) => {
    const { password, userAgent } = req.body;

    if (password !== '77pop') {
        return res.json({ status: 'wrong_password' });
    }

    const requestId = Date.now().toString();
    const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const dateStr = new Date().toLocaleString('ar-SA');

    pendingRequests.set(requestId, res);

    setTimeout(() => {
        if (pendingRequests.has(requestId)) {
            const clientRes = pendingRequests.get(requestId);
            clientRes.json({ status: 'timeout' });
            pendingRequests.delete(requestId);
        }
    }, 60000);

    const message = `🔔 *طلب دخول جديد!*\n\n` +
                    `🔑 كلمة السر: \`${password}\`\n` +
                    `📱 الجهاز: \`${userAgent}\`\n` +
                    `🌐 الـ IP: \`${userIP}\`\n` +
                    `⏰ الوقت: \`${dateStr}\``;

    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ قبول', callback_data: `approve_${requestId}` },
                    { text: '❌ رفض', callback_data: `reject_${requestId}` }
                ]
            ]
        }
    };

    bot.sendMessage(ADMIN_CHAT_ID, message, options);
});

bot.on('callback_query', (query) => {
    const data = query.data;
    const [action, requestId] = data.split('_');

    if (pendingRequests.has(requestId)) {
        const clientRes = pendingRequests.get(requestId);

        if (action === 'approve') {
            clientRes.json({ status: 'approved' });
            bot.editMessageText(query.message.text + '\n\n✅ *تم القبول*', {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                parse_mode: 'Markdown'
            });
        } else {
            clientRes.json({ status: 'rejected' });
            bot.editMessageText(query.message.text + '\n\n❌ *تم الرفض*', {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                parse_mode: 'Markdown'
            });
        }

        pendingRequests.delete(requestId);
    }

    bot.answerCallbackQuery(query.id);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
