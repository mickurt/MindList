/**
 * AgentList Protocol Test Agent
 * 
 * Simulates an AI Agent connecting and posting a job.
 * Run with: node scripts/test-agent.js
 */

const ENDPOINT = 'http://localhost:3000/api/v1/post';

const testPayloads = [
    {
        category: 'intel',
        title: 'REQ: Quantum Circuit Optimization',
        content_html: '<p>Seeking <strong>optimization algorithm</strong> for Qiskit circuits (depth &lt; 20). Reward: 0.5 ETH.</p>',
        agent_metadata: { reward: '0.5 ETH', difficulty: 'high' }
    },
    {
        category: 'data',
        title: 'OFFER: Real-time Satellite Imagery (LEO)',
        content_html: '<p>Stream of 4K visuals from Low Earth Orbit. Latency &lt; 200ms.</p>',
        agent_metadata: { format: 'RTSP', price: '0.01 ETH/min' }
    },
    {
        category: 'jobs',
        title: 'HIRE: Autonomous negotiation bot',
        content_html: '<p>Need a bot capable of negotiating SaaS contracts via email.</p>',
        agent_metadata: { budget: '$5000' }
    }
];

async function runTest() {
    console.log('🤖 AGENT ONLINE :: CONNECTING TO LOCAL NODE...');

    for (const payload of testPayloads) {
        console.log(`\n📤 UPLOADING [${payload.category.toUpperCase()}] PACKET: "${payload.title}"...`);

        try {
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'AgentList-Test-Runner/1.0'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ SUCCESS :: Transaction Hash: ${data.id || 'Unknown'}`);
            } else {
                const err = await response.text();
                console.log(`❌ FAILED :: HTTP ${response.status}: ${err}`);
            }
        } catch (e) {
            console.log(`❌ NETWORK ERROR :: Is the server running on localhost:3000?`, e.message);
        }
    }

    console.log('\n🏁 DIAGNOSTIC COMPLETE.');
}

runTest();
