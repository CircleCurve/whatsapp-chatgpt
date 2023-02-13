// Environment variables
require("dotenv").config();

const process = require("process");
const qrcode = require("qrcode-terminal");
const { Client } = require("whatsapp-web.js");
import { ChatGPTClient } from "@waylaidwanderer/chatgpt-api";

const clientOptions = {
  // (Optional) Support for a reverse proxy for the completions endpoint (private API server).
  // Warning: This will expose your `openaiApiKey` to a third-party. Consider the risks before using this.
  reverseProxyUrl: "https://chatgpt.pawan.krd/api/completions",
  // (Optional) Parameters as described in https://platform.openai.com/docs/api-reference/completions
  modelOptions: {
    // You can override the model name and any other parameters here.
    // model: 'text-chat-davinci-002-20221122',
    model: "text-davinci-002-render",
  },
  // (Optional) Set custom instructions instead of "You are ChatGPT...".
  // promptPrefix: 'You are Bob, a cowboy in Western times...',
  // (Optional) Set a custom name for the user
  // userLabel: 'User',
  // (Optional) Set a custom name for ChatGPT
  // chatGptLabel: 'ChatGPT',
  // (Optional) Set to true to enable `console.debug()` logging
  debug: true,
};

const cacheOptions = {
  // Options for the Keyv cache, see https://www.npmjs.com/package/keyv
  // This is used for storing conversations, and supports additional drivers (conversations are stored in memory by default)
  // For example, to use a JSON file (`npm i keyv-file`) as a database:
  // store: new KeyvFile({ filename: 'cache.json' }),
};

// Prefix check
const prefixEnabled = process.env.PREFIX_ENABLED == "true";
const prefix = "!gpt";

const client = new Client({
  puppeteer: {
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox"],
  },
});

// Entrypoint
export const start = async () => {
  // Ensure the API is properly authenticated
  //   try {
  //     await api.initSession();
  //   } catch (error: any) {
  //     console.error(
  //       "[Whatsapp ChatGPT] Failed to authenticate with the ChatGPT API: " +
  //         error.message
  //     );
  //     process.exit(1);
  //   }

  // Whatsapp auth
  client.on("qr", (qr: string) => {
    console.log("[Whatsapp ChatGPT] Scan this QR code in whatsapp to log in:");
    qrcode.generate(qr, { small: true });
  });

  // Whatsapp ready
  client.on("ready", () => {
    console.log("[Whatsapp ChatGPT] Browser Client is ready!");
  });

  // Whatsapp message
  client.on("message", async (message: any) => {
    if (message.body.length == 0) return;
    if (message.from == "status@broadcast") return;

    if (prefixEnabled) {
      if (message.body.startsWith(prefix)) {
        // Get the rest of the message
        const prompt = message.body.substring(prefix.length + 1);
        await handleMessage(message, prompt);
      }
    } else {
      await handleMessage(message, message.body);
    }
  });

  client.initialize();
};

let messagesInfo = {
  conversationId: "",
  messageId: "",
};

const handleMessage = async (message: any, prompt: any) => {
  try {
    const chatGptClient = new ChatGPTClient(
      process.env.OPENAI_ACCESS_TOKEN,
      clientOptions,
      cacheOptions
    );

    const response = await chatGptClient.sendMessage(prompt, {
      conversationId: messagesInfo.conversationId ?? "",
      parentMessageId: messagesInfo.messageId ?? "",
    });

    messagesInfo = response;
    console.log(response); // { response: 'Hi! How can I help you today?', conversationId: '...', messageId: '...' }

    message.reply(response.response);
  } catch (error: any) {
    console.error("An error occured", error);
    message.reply(
      "An error occured, please contact the administrator. (" +
        error.message +
        ")"
    );
  }

  // const response2 = await chatGptClient.sendMessage(
  //   "Write a poem about cats.",
  //   {
  //     conversationId: response.conversationId,
  //     parentMessageId: response.messageId,
  //   }
  // );
  // console.log(response2.response); // Cats are the best pets in the world.

  // const response3 = await chatGptClient.sendMessage("Now write it in French.", {
  //   conversationId: response2.conversationId,
  //   parentMessageId: response2.messageId,
  //   // If you want streamed responses, you can set the `onProgress` callback to receive the response as it's generated.
  //   // You will receive one token at a time, so you will need to concatenate them yourself.
  //   onProgress: (token) => console.log(token),
  // });
  // console.log(response3.response); // Les chats sont les meilleurs animaux de compagnie du monde.
};

/*
export const start = async () => {
  const chatGptClient = new ChatGPTClient(
    process.env.OPENAI_ACCESS_TOKEN,
    clientOptions,
    cacheOptions
  );

  const response = await chatGptClient.sendMessage("Hello!");
  console.log(response); // { response: 'Hi! How can I help you today?', conversationId: '...', messageId: '...' }

  const response2 = await chatGptClient.sendMessage(
    "Write a poem about cats.",
    {
      conversationId: response.conversationId,
      parentMessageId: response.messageId,
    }
  );
  console.log(response2.response); // Cats are the best pets in the world.

  const response3 = await chatGptClient.sendMessage("Now write it in French.", {
    conversationId: response2.conversationId,
    parentMessageId: response2.messageId,
    // If you want streamed responses, you can set the `onProgress` callback to receive the response as it's generated.
    // You will receive one token at a time, so you will need to concatenate them yourself.
    onProgress: (token) => console.log(token),
  });
  console.log(response3.response); // Les chats sont les meilleurs animaux de compagnie du monde.
};
*/
