import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { ChildProcess, spawn } from "child_process";
import { pyBGService } from "../python-bg-service";


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
			if (settings.path.search(".py")) {
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
		if(this.checkSettingsComplete(settings)){
			pyBGService.registerAction(ev);
		}


	}

	onDidReceiveSettings(ev: DidReceiveSettingsEvent<PythonServiceSettings>): Promise<void> | void {
		const settings = ev.payload.settings;
		if (settings.path) {
			if (settings.path.search(".py")) {
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
			//TODO - enable start and stop the running of this script
			pyBGService.getState() == 1 ? pyBGService.start(ev) : pyBGService.stop(ev);
	
		}
	

	getFileNameFromPath(path: string): string{
		var fileName = "";
		fileName = path.substring(path.lastIndexOf("/") + 1);
		return fileName;
	}

	checkSettingsComplete(settings: PythonServiceSettings): boolean {
		var check = false;
		if (settings.path && settings.interval) {
			streamDeck.logger.info("settings complete");
			check = true;
		}
		return check;
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
	displayValues: boolean;
	useVenv: boolean;
	venvPath?: string;
	interval: number;
	id: string;

};
