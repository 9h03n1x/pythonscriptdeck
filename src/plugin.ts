import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { PythonScript } from "./actions/python-script";
import { PythonService } from "./actions/python-service";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.INFO);

// Register the increment action.
streamDeck.actions.registerAction(new PythonScript());
//streamDeck.actions.registerAction(new PythonService());

// Finally, connect to the Stream Deck.
streamDeck.connect();
