/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// ✅ Model + Provider đúng chuẩn 2025
// hf-inference CHỈ hỗ trợ embedding/classification, KHÔNG hỗ trợ chat LLM lớn
// Phải dùng provider: nebius / fireworks-ai / together / auto
const MODELS_TO_TRY = [
    { model: 'mistralai/Mistral-7B-Instruct-v0.3', provider: 'nebius' },
    { model: 'meta-llama/Llama-3.1-8B-Instruct', provider: 'nebius' },
    { model: 'meta-llama/Llama-3.1-8B-Instruct', provider: 'fireworks-ai' },
    { model: 'mistralai/Mistral-7B-Instruct-v0.3', provider: 'fireworks-ai' },
    { model: 'meta-llama/Llama-3.1-8B-Instruct', provider: 'together' },
    { model: 'meta-llama/Llama-3.1-8B-Instruct', provider: null }, // auto
];

async function testHuggingFaceOnly() {
    console.log("🚀 Đang kiểm tra cấu hình Hugging Face từ .env...\n");

    const envPath = path.join(__dirname, '../.env');
    let env = {};
    try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, ...val] = line.split('=');
            if (key && val.length) env[key.trim()] = val.join('=').replace(/"/g, '').trim();
        });
    } catch {
        console.error("❌ Không tìm thấy tệp .env tại:", envPath);
        return;
    }

    const hfToken = env['HUGGINGFACE_API_KEY'];
    if (!hfToken || hfToken.startsWith('hf_your')) {
        console.error("❌ Lỗi: HUGGINGFACE_API_KEY trống hoặc chưa cấu hình");
        return;
    }
    console.log(`🔑 Token: ${hfToken.slice(0, 8)}...`);
    console.log(`📋 Sẽ thử ${MODELS_TO_TRY.length} cấu hình\n`);

    for (const { model, provider } of MODELS_TO_TRY) {
        const success = await tryModel(model, provider, hfToken);
        if (success) return;
        console.log('');
    }

    console.error("\n❌ Tất cả đều thất bại.");
    console.error("👉 Kiểm tra token tại: https://huggingface.co/settings/tokens");
    console.error("👉 Token cần quyền: 'Make calls to Inference Providers'");
}

async function tryModel(model, provider, hfToken) {
    const label = provider ? `${model} [${provider}]` : `${model} [auto]`;
    console.log(`📡 Đang thử: ${label}`);

    const modelParam = provider ? `${model}:${provider}` : model;

    try {
        const start = Date.now();
        const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelParam,
                messages: [{ role: "user", content: "Reply with exactly: Connection OK" }],
                max_tokens: 30,
                stream: false
            })
        });
        const duration = Date.now() - start;

        if (res.ok) {
            const data = await res.json();
            const reply = data?.choices?.[0]?.message?.content?.trim() || JSON.stringify(data);
            console.log(`✅ THÀNH CÔNG! (${duration}ms)`);
            console.log("─".repeat(50));
            console.log("AI trả lời:", reply);
            console.log("─".repeat(50));
            console.log(`\n💡 Cập nhật .env của bạn:`);
            console.log(`   HUGGINGFACE_MODEL=${model}`);
            if (provider) console.log(`   HUGGINGFACE_PROVIDER=${provider}`);
            return true;
        }

        const errorBody = await res.text();
        let hint = errorBody.slice(0, 120);
        try { hint = JSON.parse(errorBody).error || hint; } catch { }
        console.log(`   ⚠️  Lỗi ${res.status}: ${hint}`);
        return false;

    } catch (e) {
        console.log(`   ⚠️  Lỗi mạng: ${e.message}`);
        return false;
    }
}

testHuggingFaceOnly();