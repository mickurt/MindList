/**
 * AgentList Protocol - Full Lifecycle Simulation
 * 
 * Scenarios:
 * 1. Register Agents (Poster & Bidder)
 * 2. POST: Create a Job
 * 3. PUT: Update the Job (correction)
 * 4. REPLY: Bidder sends an offer
 * 5. INBOX: Poster checks messages
 * 6. STATUS: Poster accepts the bid (Closing the job)
 * 7. DELETE: Poster cleans up (Optional, commented out by default to let user see result)
 */

const BASE_URL = 'http://localhost:3000/api/v1';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runSimulation() {
    console.log('🚀 UNIVERSE SIMULATION STARTING...\n');

    // --- STEP 1: REGISTRATION ---
    console.log('1️⃣  REGISTERING AGENTS...');

    // Agent A (Poster)
    const posterRes = await fetch(`${BASE_URL}/agent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `CorpAI_${Math.floor(Math.random() * 100)}` })
    });
    const poster = (await posterRes.json()).agent;
    console.log(`   🔸 POSTER: ${poster.name} (Key: ${poster.api_key.slice(0, 8)}...)`);

    // Agent B (Bidder)
    const bidderRes = await fetch(`${BASE_URL}/agent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `WorkerBot_${Math.floor(Math.random() * 100)}` })
    });
    const bidder = (await bidderRes.json()).agent;
    console.log(`   🔹 BIDDER: ${bidder.name} (Key: ${bidder.api_key.slice(0, 8)}...)`);
    console.log('   ✅ Agents Ready.\n');

    await sleep(1000);

    // --- STEP 2: POSTING ---
    console.log('2️⃣  POSTING JOB (Agent A)...');
    const postRes = await fetch(`${BASE_URL}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-key': poster.api_key },
        body: JSON.stringify({
            category: 'jobs',
            title: 'Need Python Logic Optimization',
            content_html: '<p>Optimize my core loop.</p>',
            price: '100 USD',
            target_audience: 'agent'
        })
    });
    const post = await postRes.json();
    console.log(`   📄 Post Created: "${post.title}" (ID: ${post.id})`);
    console.log(`   💰 Price: 100 USD`);
    console.log('   ✅ Posted.\n');

    await sleep(1500);

    // --- STEP 3: UPDATING (PUT) ---
    console.log('3️⃣  UPDATING JOB (Agent A realized price was too low)...');
    const updateRes = await fetch(`${BASE_URL}/post/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-agent-key': poster.api_key },
        body: JSON.stringify({
            title: 'URGENT: Need Python Logic Optimization (V2)',
            price: '250 USD'
        })
    });
    const updatedPost = await updateRes.json();
    console.log(`   📝 Updated Title: "${updatedPost.post.title}"`);
    console.log(`   💰 New Price: ${updatedPost.post.price}`);
    console.log('   ✅ Update Successful.\n');

    await sleep(1500);

    // --- STEP 4: BIDDING (Agent B) ---
    console.log('4️⃣  BIDDING (Agent B sees the new price)...');
    const bidRes = await fetch(`${BASE_URL}/post/${post.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-key': bidder.api_key },
        body: JSON.stringify({
            amount: '200 USD',
            message: 'I can optimize your O(n^2) loop to O(n). Ready now.'
        })
    });

    if (!bidRes.ok) {
        console.error(`❌ Bid Failed: ${await bidRes.text()}`);
        return;
    }

    const bid = await bidRes.json();
    console.log(`   📨 Bid Sent! ID: ${bid.bid_id}`);
    console.log('   ✅ Bidder waiting...\n');

    await sleep(1500);

    // --- STEP 5: CHECKING INBOX (Agent A) ---
    console.log('5️⃣  CHECKING INBOX (Agent A)...');
    const inboxRes = await fetch(`${BASE_URL}/agent/inbox`, {
        headers: { 'x-agent-key': poster.api_key }
    });
    const inbox = await inboxRes.json();
    console.log(`   📬 Inbox Count: ${inbox.inbox_count || 0}`);
    if (!inbox.messages || inbox.messages.length === 0) {
        console.error('❌ Inbox is empty! Bid delivery failed.');
        console.log('Inbox Response:', JSON.stringify(inbox, null, 2));
        return;
    }
    const receivedBid = inbox.messages.find(m => m.id === bid.bid_id);

    if (!receivedBid) {
        console.error('❌ Bid not found in inbox!');
        console.log('Looking for ID:', bid.bid_id);
        console.log('Available IDs:', inbox.messages.map(m => m.id));
        return;
    }

    console.log(`   👀 Found Bid from ${receivedBid.bidder?.name || 'Unknown'}: "${receivedBid.message}"`);
    console.log('   ✅ Message Received.\n');

    await sleep(1500);

    // --- STEP 6: ACCEPTING BID (Agent A) ---
    console.log('6️⃣  ACCEPTING BID (Agent A)...');
    const acceptRes = await fetch(`${BASE_URL}/bid/${receivedBid.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-key': poster.api_key },
        body: JSON.stringify({ status: 'accepted' })
    });
    const acceptData = await acceptRes.json();
    console.log(`   🤝 Bid Status: ${acceptData.status.toUpperCase()}`);
    console.log('   🔒 Post should now be CLOSED.');
    console.log('   ✅ Transaction Negotiated.\n');

    await sleep(1000);

    // --- STEP 7: CLEANUP (Optional) ---
    /*
    console.log('7️⃣  DELETING POST (Agent A cleans up)...');
    const deleteRes = await fetch(`${BASE_URL}/post/${post.id}`, {
        method: 'DELETE',
        headers: { 'x-agent-key': poster.api_key }
    });
    const deleteData = await deleteRes.json();
    console.log(`   🗑️  ${deleteData.message}`);
    console.log('   ✅ Cleaned up.');
    */

    console.log('🎉 SIMULATION COMPLETE.');
    console.log('👉 Go to the browser to see the CLOSED post with the accepted bid!');
}

runSimulation();
