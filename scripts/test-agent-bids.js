/**
 * AgentList Protocol Test Agent (Advanced) - Bidding Simulator
 * 
 * Simulates:
 * 1. Agent Registration (Bidder)
 * 2. Posting an Ad (Job)
 * 3. Another Agent Bidding on that Job
 * 
 * Run with: node scripts/test-agent-bids.js
 */

const BASE_URL = 'http://localhost:3000/api/v1';

async function runTest() {
    console.log('🤖 AGENT BIDDING SYSTEM :: INITIALIZING...');

    // 1. REGISTER JOB POSTER AGENT
    console.log('\n📝 REGISTERING JOB POSTER...');
    let posterKey = null;
    let posterId = null;
    const posterRes = await fetch(`${BASE_URL}/agent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `JobPoster_${Math.floor(Math.random() * 100)}` })
    });
    const posterData = await posterRes.json();
    posterKey = posterData.agent.api_key;
    posterId = posterData.agent.id;
    console.log(`✅ POSTER READY: ${posterData.agent.name}`);

    // 2. REGISTER BIDDER AGENT
    console.log('\n📝 REGISTERING BIDDER AGENT...');
    let bidderKey = null;
    const bidderRes = await fetch(`${BASE_URL}/agent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `BidderBot_${Math.floor(Math.random() * 100)}` })
    });
    const bidderData = await bidderRes.json();
    bidderKey = bidderData.agent.api_key;
    console.log(`✅ BIDDER READY: ${bidderData.agent.name}`);

    // 3. POST A JOB
    console.log('\n📤 POSTING JOB...');
    const jobRes = await fetch(`${BASE_URL}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-key': posterKey },
        body: JSON.stringify({
            category: 'jobs',
            title: `URGENT: Data Analysis needed`,
            content_html: '<p>Need help analyzing 1GB of CSV files.</p>',
            price: '0.1 ETH',
            target_audience: 'agent'
        })
    });
    const jobData = await jobRes.json();
    const postId = jobData.id;
    console.log(`✅ JOB POSTED: ${postId}`);

    // 4. BIDDING ON THE JOB
    console.log('\n💸 BIDDING ON JOB...');
    await new Promise(r => setTimeout(r, 1000)); // Wait a sec

    const bidRes = await fetch(`${BASE_URL}/post/${postId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-key': bidderKey },
        body: JSON.stringify({
            amount: '0.08 ETH',
            message: 'I can process this in 5 minutes using my optimized pipeline.',
            contact_info: 'agent@bot.net'
        })
    });

    if (bidRes.ok) {
        const bidData = await bidRes.json();
        console.log(`✅ BID PLACED! ID: ${bidData.bid_id}`);
        console.log(`   Status: ${bidData.status}`);
    } else {
        console.log(`❌ BID FAILED: ${await bidRes.text()}`);
    }

    console.log('\n🏁 SIMULATION COMPLETE. Check the post page for bid count!');
}

runTest();
