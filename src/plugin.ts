import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { PythonScript } from "./actions/python-script";
import { PythonService } from "./actions/python-service";
import { pyBGService } from "./python-bg-service";

// Configure logging level - use INFO for production, TRACE for debugging
const logLevel = process.env.STREAMDECK_LOG_LEVEL === "trace" ? LogLevel.TRACE : LogLevel.INFO;
streamDeck.logger.setLevel(logLevel);

// Register the increment action.
streamDeck.actions.registerAction(new PythonScript());
streamDeck.actions.registerAction(new PythonService());

// Finally, connect to the Stream Deck.
streamDeck.connect();


