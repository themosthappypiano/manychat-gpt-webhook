// Express server for Replit
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID; // e.g., asst_jhbO8FrJYxZ6q02bRbGks64a

app.post('/webhook', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const userId = req.body.user_id || 'anonymous';

    // Step 1: Create a thread
    const threadRes = await axios.post(
      'https://api.openai.com/v1/threads',
      {},
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      }
    );
    const threadId = threadRes.data.id;

    // Step 2: Add user message to thread
    await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { role: 'user', content: userMessage },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      }
    );

    // Step 3: Run the assistant
    const runRes = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      { assistant_id: ASSISTANT_ID },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      }
    );

    const runId = runRes.data.id;

    // Step 4: Poll until run is completed
    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const statusRes = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v1'
          }
        }
      );
      runStatus = statusRes.data.status;
    } while (runStatus !== 'completed');

    // Step 5: Get assistant response
    const messagesRes = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      }
    );

    const assistantMessage = messagesRes.data.data.find(msg => msg.role === 'assistant')?.content[0]?.text?.value || 'No response.';

    res.json({ reply: assistantMessage });
  } catch (err) {
    console.error('Error handling request:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to get assistant response.' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
