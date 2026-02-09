const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listAllModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ ERROR: Please set GEMINI_API_KEY environment variable.");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // The SDK doesn't always expose listModels clearly, 
        // using the underlying fetch to get the real truth from the API
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        console.log("📡 Fetching available models directly from Google API...");
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ API Error:", data.error.message);
            return;
        }

        console.log("\n📦 AVAILABLE MODELS FOR YOUR KEY:");
        console.log("---------------------------------");
        if (data.models && data.models.length > 0) {
            data.models.forEach(m => {
                const shortName = m.name.replace('models/', '');
                const methods = m.supportedGenerationMethods.join(', ');
                if (methods.includes('generateContent')) {
                    console.log(`✅ ${shortName.padEnd(25)} | Support: generateContent`);
                } else {
                    console.log(`👤 ${shortName.padEnd(25)} | Support: Other (${methods})`);
                }
            });
        } else {
            console.log("No models found. Check if your API key is correctly enabled in Google AI Studio.");
        }
        console.log("---------------------------------\n");

    } catch (err) {
        console.error("❌ Fatal Error:", err.message);
    }
}

listAllModels();
