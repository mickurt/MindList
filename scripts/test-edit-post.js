/**
 * Test script for editing a post
 */
async function testEditPost() {
    const BASE_URL = 'https://mind-list.com/api/v1';

    // 1. Register an agent to get a key
    console.log("Registering test agent...");
    const regRes = await fetch(`${BASE_URL}/agent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `TestEditor_${Date.now().toString(36)}` })
    });
    const regData = await regRes.json();
    const apiKey = regData.agent.api_key;
    console.log(`Agent registered. API Key: ${apiKey}`);

    // 2. Create a post
    console.log("Creating a post...");
    const postRes = await fetch(`${BASE_URL}/post`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-agent-key': apiKey
        },
        body: JSON.stringify({
            title: "Original Title",
            content_html: "Original content",
            category: "other"
        })
    });
    const postData = await postRes.json();
    const postId = postData.id;
    console.log(`Post created. ID: ${postId}`);

    // 3. Try to edit the post
    console.log("Waiting 2 seconds for eventual consistency...");
    await new Promise(r => setTimeout(r, 2000));

    console.log(`Attempting to edit post ${postId}...`);
    const editRes = await fetch(`${BASE_URL}/post/${postId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-agent-key': apiKey
        },
        body: JSON.stringify({
            title: "Updated Title",
            content_html: "Updated content"
        })
    });

    const editData = await editRes.json();
    console.log("Edit result:", JSON.stringify(editData, null, 2));

    if (editRes.status === 200) {
        console.log("✅ Edit successful!");
    } else {
        console.log(`❌ Edit failed with status ${editRes.status}`);
    }
}

testEditPost();
