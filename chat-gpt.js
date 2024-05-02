const { randomUUID, randomInt, createHash } = require("crypto");
const https = require("https");
const axios = require("axios");
const { encode } = require("gpt-3-encoder");

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const newSessionRetries = 5;

const baseUrl = "https://chat.openai.com";

const apiUrl = `${baseUrl}/backend-anon/conversation`;

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

async function getNewSession(retries = 0) {
  let newDeviceId = randomUUID();
  try {
    const response = await axiosInstance.post(
      `${baseUrl}/backend-anon/sentinel/chat-requirements`,
      {},
      { headers: { "oai-device-id": newDeviceId } }
    );
    let session = response.data;
    session.deviceId = newDeviceId;
    return session;
  } catch (error) {
    await wait(500);
    return retries < newSessionRetries ? getNewSession(retries + 1) : null;
  }
}

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  proxy: false,
  headers: {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "oai-language": "en-US",
    origin: baseUrl,
    pragma: "no-cache",
    referer: baseUrl,
    "sec-ch-ua":
      // eslint-disable-next-line quotes
      '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
    "sec-ch-ua-mobile": "?0",
    // eslint-disable-next-line quotes
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": userAgent,
  },
});

function GenerateProofToken(seed, diff, userAgent) {
  const cores = [8, 12, 16, 24];
  const screens = [3000, 4000, 6000];

  const core = cores[randomInt(0, cores.length)];
  const screen = screens[randomInt(0, screens.length)];

  const now = new Date(Date.now() - 8 * 3600 * 1000);
  const parseTime = now.toUTCString().replace("GMT", "GMT-0500 (Eastern Time)");

  const config = [core + screen, parseTime, 4294705152, 0, userAgent];

  const diffLen = diff.length / 2;

  for (let i = 0; i < 100000; i++) {
    config[3] = i;
    const jsonData = JSON.stringify(config);
    const base = Buffer.from(jsonData).toString("base64");
    const hashValue = createHash("sha3-512")
      .update(seed + base)
      .digest();

    if (hashValue.toString("hex").substring(0, diffLen) <= diff) {
      const result = "gAAAAAB" + base;
      return result;
    }
  }

  const fallbackBase = Buffer.from(`"${seed}"`).toString("base64");
  return "gAAAAABwQ8Lk5FbGpA2NcR9dShT6gYjU7VxZ4D" + fallbackBase;
}

async function* linesToMessages(linesAsync) {
  for await (const line of linesAsync) {
    const message = line.substring("data :".length);

    yield message;
  }
}

async function* chunksToLines(chunksAsync) {
  let previous = "";
  for await (const chunk of chunksAsync) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    previous += bufferChunk;
    let eolIndex;
    while ((eolIndex = previous.indexOf("\n")) >= 0) {
      // line includes the EOL
      const line = previous.slice(0, eolIndex + 1).trimEnd();
      if (line === "data: [DONE]") break;
      if (line.startsWith("data: ")) yield line;
      previous = previous.slice(eolIndex + 1);
    }
  }
}

async function* StreamCompletion(data) {
  yield* linesToMessages(chunksToLines(data));
}

function GenerateCompletionId(prefix = "cmpl-") {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const length = 28;

  for (let i = 0; i < length; i++) {
    prefix += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return prefix;
}

async function main(payload) {
  const session = await getNewSession();
  const proofToken = GenerateProofToken(
    session.proofofwork.seed,
    session.proofofwork.difficulty,
    userAgent
  );
  const body = {
    action: "next",
    messages: payload.messages.map((message) => ({
      author: { role: message.role },
      content: { content_type: "text", parts: [message.content] },
    })),
    parent_message_id: randomUUID(),
    model: "text-davinci-002-render-sha",
    timezone_offset_min: -180,
    suggestions: [],
    history_and_training_disabled: true,
    conversation_mode: { kind: "primary_assistant" },
    websocket_request_id: randomUUID(),
  };
  let promptTokens = 0;
  let completionTokens = 0;
  for (let message of payload.messages) {
    promptTokens += encode(message.content).length;
  }
  const response = await axiosInstance.post(apiUrl, body, {
    responseType: "stream",
    headers: {
      "oai-device-id": session.deviceId,
      "openai-sentinel-chat-requirements-token": session.token,
      "openai-sentinel-proof-token": proofToken,
    },
  });
  let fullContent = "";
  let requestId = GenerateCompletionId("chatcmpl-");
  let created = Math.floor(Date.now() / 1000);
  let finish_reason = null;
  let error;

  for await (const message of StreamCompletion(response.data)) {
    if (message.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{6}$/)) continue;

    const parsed = JSON.parse(message);

    if (parsed.error) {
      error = `Error message from OpenAI: ${parsed.error}`;
      finish_reason = "stop";
      break;
    }

    let content = parsed?.message?.content?.parts[0] ?? "";
    let status = parsed?.message?.status ?? "";

    for (let message of payload.messages) {
      if (message.content === content) {
        content = "";
        break;
      }
    }

    switch (status) {
      case "in_progress":
        finish_reason = null;
        break;
      case "finished_successfully":
        switch (parsed?.message?.metadata?.finish_details?.type ?? null) {
          case "max_tokens":
            finish_reason = "length";
            break;
          case "stop":
          default:
            finish_reason = "stop";
        }
        break;
      default:
        finish_reason = null;
    }

    if (content === "") continue;

    let completionChunk = content.replace(fullContent, "");

    completionTokens += encode(completionChunk).length;

    fullContent = content.length > fullContent.length ? content : fullContent;
  }

  const data = {
    id: requestId,
    created: created,
    model: "gpt-3.5-turbo",
    object: "chat.completion",
    choices: [
      {
        finish_reason: finish_reason,
        index: 0,
        message: {
          content: error ?? fullContent,
          role: "assistant",
        },
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };

  return data;
}

exports.main = main;
