import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { ChildProcess, spawn } from "child_process";

/**
 * An example action class that displays a count that increments by one each time the button is pressed.
 */
@action({ UUID: "com.niccohagedorn.pythonscriptdeck.service" })
export class PythonService extends SingletonAction<PythonServiceSettings> {
	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
	 * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}. In this example,
	 * we're setting the title to the "count" that is incremented in {@link PythonScript.onKeyDown}.
	 */
	onWillAppear(ev: WillAppearEvent<PythonServiceSettings>): void | Promise<void> {
		const settings = ev.payload.settings;
		if (settings.path){
			if(settings.path.includes(".py")){
				ev.action.setImage("imgs/actions/pyFileCheck.png")
				ev.action.setTitle(this.getFileNameFromPath(settings.path));
			}
		}

	}

	onDidReceiveSettings(ev: DidReceiveSettingsEvent<PythonServiceSettings>): Promise<void> | void {
		const settings = ev.payload.settings;
		if (settings.path){
			if(settings.path.includes(".py")){
				ev.action.setImage("imgs/actions/pyFileCheck.png")
				ev.action.setTitle(this.getFileNameFromPath(settings.path));
			}
		}
	}

	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed. Stream Deck provides various events for tracking interaction
	 * with devices including key down/up, dial rotations, and device connectivity, etc. When triggered, {@link ev} object contains information about the event including any payloads
	 * and action information where applicable. In this example, our action will display a counter that increments by one each press. We track the current count on the action's persisted
	 * settings using `setSettings` and `getSettings`.
	 */
	async onKeyDown(ev: KeyDownEvent<PythonServiceSettings>): Promise<void> {
			// Update the count from the settings.
			const settings = ev.payload.settings;
			const { path } = settings;
			if (path) {
	
				let pythonProcess: ChildProcess = spawn('python', [path]);
	
				while (pythonProcess.exitCode == null) {
					pythonProcess.stdout!.on('data', (data: { toString: () => string; }) => {
	
						streamDeck.logger.debug(`stdout: ${data}`);
						if (settings.displayValues) { ev.action.setTitle(data.toString().trim()); }
						if (settings.image1 && (data.toString().trim() == (settings.value1 ?? ""))) {
							ev.action.setImage(settings.image1)
	
	
						}
						if (settings.image2 && (data.toString().trim() == (settings.value2 ?? ""))) {
							ev.action.setImage(settings.image2)
	
						}
					});
					await new Promise(resolve => setTimeout(resolve, 100));
	
	
					pythonProcess.stderr!.on('data', (data: { toString: () => string; }) => {
						console.error(`stderr: ${data}`);
						ev.action.setTitle(data.toString().trim());
	
					});
	
					pythonProcess.on('close', (code: any) => {
						console.log(`child process exited with code ${code}`);
					});
				}
			}
	
	
		}
	

	getFileNameFromPath(path: string): string{
		var fileName = "";
		fileName = path.substring(path.lastIndexOf("/") + 1);
		return fileName;
	}
}

/**
 * Settings for {@link PythonScript}.
 */
type PythonServiceSettings = {
	path?: string;
	value1? : string;
	image1? : string;
	value2? : string;
	image2? : string;
	displayValues: boolean;

};
