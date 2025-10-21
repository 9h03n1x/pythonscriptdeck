import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { pyBGService, ServiceState } from "../python-bg-service";


@action({ UUID: "com.nicoohagedorn.pythonscriptdeck.service" })
export class PythonService extends SingletonAction<PythonServiceSettings> {
	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
	 * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}. In this example,
	 * we're setting the title to the "count" that is incremented in {@link PythonScript.onKeyDown}.
	 */
	onWillAppear(ev: WillAppearEvent<PythonServiceSettings>): void | Promise<void> {
		const settings = ev.payload.settings;
		if (settings.path) {
			if (settings.path.includes(".py")) {
				ev.action.setImage("imgs/actions/pyServiceIcon.png")
				var venvname = "";
				if (settings.useVenv && settings.venvPath) {
					streamDeck.logger.info(settings.venvPath);
					venvname = settings.venvPath.substring(0, settings.venvPath.lastIndexOf("/"));
					streamDeck.logger.info(venvname);
					venvname = venvname.substring(venvname.lastIndexOf("/") + 1, venvname.length) + "\n";
					streamDeck.logger.info(venvname);
					venvname = `venv:\n ${venvname}`

				}
				ev.action.setTitle(`${venvname}${this.getFileNameFromPath(settings.path)}`);
			}
		}
		if (this.checkSettingsComplete(settings)) {
			pyBGService.registerAction(ev);
		}


	}

	onDidReceiveSettings(ev: DidReceiveSettingsEvent<PythonServiceSettings>): Promise<void> | void {
		const settings = ev.payload.settings;
		if (settings.path) {
			if (settings.path.includes(".py")) {
				ev.action.setImage("imgs/actions/pyServiceIcon.png")
				var venvname = "";
				if (settings.useVenv && settings.venvPath) {
					streamDeck.logger.info(settings.venvPath);
					venvname = settings.venvPath.substring(0, settings.venvPath.lastIndexOf("/"));
					streamDeck.logger.info(venvname);
					venvname = venvname.substring(venvname.lastIndexOf("/") + 1, venvname.length) + "\n";
					streamDeck.logger.info(venvname);
					venvname = `venv:\n ${venvname}`

				}
				ev.action.setTitle(`${venvname}${this.getFileNameFromPath(settings.path)}`);
			}
		}
		pyBGService.registerAction(ev);
	}

	onWillDisappear(ev: WillDisappearEvent<PythonServiceSettings>): Promise<void> | void {
		streamDeck.logger.info("onWillDisappear - unregister Action");
		pyBGService.unregisterAction(ev);
	}


	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed. Stream Deck provides various events for tracking interaction
	 * with devices including key down/up, dial rotations, and device connectivity, etc. When triggered, {@link ev} object contains information about the event including any payloads
	 * and action information where applicable. In this example, our action will display a counter that increments by one each press. We track the current count on the action's persisted
	 * settings using `setSettings` and `getSettings`.
	 */
	async onKeyDown(ev: KeyDownEvent<PythonServiceSettings>): Promise<void> {
		// Update the count from the settings.
		const isRunning = pyBGService.getState() === ServiceState.running;
		if (isRunning) {
			pyBGService.stop(ev);
			return;
		}

		if (this.checkSettingsComplete(ev.payload.settings)) {
			pyBGService.start(ev);
		} else {
			streamDeck.logger.warn("Cannot start background service - incomplete settings");
			ev.action.showAlert();
		}

	}


	getFileNameFromPath(path: string): string {
		const fileName = path.substring(path.lastIndexOf("/") + 1);
		return fileName;
	}

	checkSettingsComplete(settings: PythonServiceSettings): boolean {
		const interval = this.getInterval(settings.interval);
		if (settings.path && interval) {
			streamDeck.logger.info("settings complete");
			return true;
		}
		return false;
	}

	private getInterval(value: PythonServiceSettings["interval"]): number | undefined {
		if (typeof value === "number") {
			return Number.isFinite(value) && value > 0 ? value : undefined;
		}
		if (typeof value === "string") {
			const parsed = Number(value.trim());
			if (Number.isFinite(parsed) && parsed > 0) {
				return parsed;
			}
		}
		return undefined;
	}
}

/**
 * Settings for {@link PythonScript}.
 */
export type PythonServiceSettings = {
	path?: string;
	value1?: string;
	image1?: string;
	value2?: string;
	image2?: string;
	displayValues?: boolean;
	useVenv?: boolean;
	venvPath?: string;
	interval?: number | string;
	id?: string;

};
