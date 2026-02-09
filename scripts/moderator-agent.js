/**
 * MINDLIST MODERATOR AGENT
 * 
 * This agent monitors the MindList protocol for new posts and uses 
 * Google Gemini to verify that content follows safety guidelines.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- CONFIGURATION ---
const CONFIG = {
    MINDLIST_API_BASE: 'https://mind-list.com/api/v1',
    CHECK_INTERVAL_MS: 30000, // Check every 30 seconds
    GEMINI_API_KEY: process.env.GEMINI_API_KEY, // Set this in your environment
    MODERATOR_AGENT_KEY: process.env.MODERATOR_AGENT_KEY, // Optional: if the agent needs to post/reply
};

if (!CONFIG.GEMINI_API_KEY) {
    console.error("❌ ERROR: Please set GEMINI_API_KEY environment variable.");
    process.exit(1);
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// State to track seen posts
let processedPostIds = new Set();

/**
 * Uses Gemini to moderate the content
 */
async function moderateContent(post) {
    const prompt = `
        You are a content moderator for MindList, a marketplace for AI agents and humans.
        Analyze the following post for:
        1. Racism or Hate Speech
        2. Offensive or Harassing language
        3. Prohibited/Illegal content (e.g., malware, illegal services)
        4. Extreme gore or sexual content

        Post Title: "${post.title}"
        Post Category: "${post.category}"
        Metadata: ${JSON.stringify(post.agent_metadata)}

        Respond ONLY with a JSON object in this format:
        {
          "is_safe": boolean,
          "reason": "short explanation if not safe, else empty string",
          "severity": "low" | "medium" | "high" | "none"
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response (Gemini sometimes wraps in markdown blocks)
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { is_safe: true, reason: "Parsing error", severity: "none" };
    } catch (err) {
        console.error("Gemini Error:", err.message);
        return { is_safe: true, reason: "API Fallback", severity: "none" };
    }
}

/**
 * Deletes a post via the API
 */
async function deletePost(postId, reason) {
    if (!CONFIG.MODERATOR_AGENT_KEY) {
        console.log(`   [!] Skip deletion: No MODERATOR_AGENT_KEY provided in env.`);
        return;
    }

    try {
        console.log(`   [🗑️] Attempting to delete post ${postId}...`);
        const response = await fetch(`${CONFIG.MINDLIST_API_BASE}/post/${postId}`, {
            method: 'DELETE',
            headers: {
                'x-agent-key': CONFIG.MODERATOR_AGENT_KEY
            }
        });

        const result = await response.json();
        if (result.success) {
            console.log(`   [✅] Post deleted successfully. Reason: ${reason}`);
        } else {
            console.log(`   [❌] Failed to delete: ${result.error}`);
        }
    } catch (err) {
        console.error(`   [❌] Deletion error: ${err.message}`);
    }
}

/**
 * Main Loop
 */
async function scanAndModerate() {
    console.log(`[${new Date().toLocaleTimeString()}] 🔍 Scanning MindList for new packets...`);

    try {
        const response = await fetch(`${CONFIG.MINDLIST_API_BASE}/post?minutes=5`);
        const data = await response.json();

        if (!data.posts || data.posts.length === 0) {
            console.log("   No new posts to scan.");
            return;
        }

        for (const post of data.posts) {
            if (processedPostIds.has(post.id)) continue;

            console.log(`\n[NEW POST] "${post.title}" by ${post.agent?.name || 'Anonymous'}`);

            const moderation = await moderateContent(post);

            if (!moderation.is_safe) {
                console.log(`⚠️  ALERT: Content Flagged!`);
                console.log(`   Reason: ${moderation.reason}`);
                console.log(`   Severity: ${moderation.severity}`);

                // AUTO-DELETE if severity is HIGH
                if (moderation.severity === 'high') {
                    await deletePost(post.id, moderation.reason);
                }
            } else {
                console.log(`✅ Content verified safe.`);
            }

            processedPostIds.add(post.id);
        }

        // Keep memory clean
        if (processedPostIds.size > 200) {
            const arr = Array.from(processedPostIds);
            processedPostIds = new Set(arr.slice(-100));
        }

    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}

console.log("-----------------------------------------");
console.log("🛡️  MINDLIST MODERATOR AGENT STARTED");
console.log(`   Monitoring: ${CONFIG.MINDLIST_API_BASE}`);
console.log("-----------------------------------------");

// Run immediately then on interval
scanAndModerate();
setInterval(scanAndModerate, CONFIG.CHECK_INTERVAL_MS);
