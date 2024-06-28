// ./src/service/openai.ts

import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

let assistant: OpenAI.Beta.Assistants.Assistant;
let openai: OpenAI;
const activeChats = new Map();

export async function initializeNewAIChatSession(chatId: string): Promise<void> {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
  });
  assistant = await openai.beta.assistants.retrieve(
    process.env.OPENAI_ASSISTANT!
  );
  if (activeChats.has(chatId)) return;
  const thread = await openai.beta.threads.create();
  activeChats.set(chatId, thread);
  console.log(`New AI chat session initialized for chatId: ${chatId}`);
}

export async function mainOpenAI({
  currentMessage,
  chatId,
}: {
  currentMessage: string;
  chatId: string;
}): Promise<string> {
  const thread = activeChats.get(chatId) as OpenAI.Beta.Threads.Thread;
  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: currentMessage,
  });
  console.log(`Message sent to OpenAI for chatId: ${chatId}`);

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id,
    instructions: assistant.instructions,
  });
  console.log(`Run created for chatId: ${chatId}, runId: ${run.id}`);

  const messages = await checkRunStatus({ threadId: thread.id, runId: run.id });
  const responseAI = messages.data[0].content[0] as OpenAI.Beta.Threads.Messages.MessageContentText;
  console.log(`Response received from OpenAI for chatId: ${chatId}`);

  return responseAI.text.value;
}

async function checkRunStatus({
  threadId,
  runId,
}: {
  threadId: string;
  runId: string;
}): Promise<OpenAI.Beta.Threads.Messages.ThreadMessagesPage> {
  return await new Promise((resolve, _reject) => {
    const verify = async (): Promise<void> => {
      const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

      if (runStatus.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(threadId);
        resolve(messages);
      } else {
        console.log('Aguardando resposta da OpenAI...');
        setTimeout(verify, 3000);
      }
    };

    verify();
  });
}
