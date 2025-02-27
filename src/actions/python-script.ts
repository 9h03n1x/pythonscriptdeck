import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { ChildProcess, spawn } from "child_process";
import { error } from "console";
import { regex } from "regex";


/**
 * Error mapping for python errors
 */
const pythonErrorMap: { [key: string]: string } = {
	"SyntaxError": "Python\nSyntax\nError",
	"NameError": "Python\nName\nError",
	"TypeError": "Python\nType\nError",
	"ValueError": "Python\nValue\nError",
	"ZeroDivisionError": "Python\nZeroDiv\nError",
	"IndexError": "Python\nIndex\nError",
	"KeyError": "Python\nKey\nError",
	"AttributeError": "Python\nAttribute\nError",
	"ImportError": "Python\nImport\nError",
	"No such file or directory": "Python\nFile\nError",
	"ModuleNotFoundError": "Python\nModule\nError",
	"RuntimeError": "Python\nRuntime\nError",
	"MemoryError": "Python\nMemory\nError",
	"OverflowError": "Python\nOverflow\nError",
	"SystemError": "Python\nSystem\nError",
	"Microsoft Store": "Python\nnot found\nError",
	
};

@action({ UUID: "com.niccohagedorn.pythonscriptdeck.script" })
export class PythonScript extends SingletonAction<PythonScriptSettings> {
	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
	 * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}. In this example,
	 * we're setting the title to the "count" that is incremented in {@link PythonScript.onKeyDown}.
	 */
	onWillAppear(ev: WillAppearEvent<PythonScriptSettings>): void | Promise<void> {
		const settings = ev.payload.settings;
		if (settings.path) {
			if (settings.path.search(".py")) {
				ev.action.setImage("imgs/actions/pyFileCheck.png")
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

	}

	onDidReceiveSettings(ev: DidReceiveSettingsEvent<PythonScriptSettings>): Promise<void> | void {
		const settings = ev.payload.settings;
		if (settings.path) {
			if (settings.path.search(".py")) {
				ev.action.setImage("imgs/actions/pyFileCheck.png")
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
	}

	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed. Stream Deck provides various events for tracking interaction
	 * with devices including key down/up, dial rotations, and device connectivity, etc. When triggered, {@link ev} object contains information about the event including any payloads
	 * and action information where applicable. In this example, our action will display a counter that increments by one each press. We track the current count on the action's persisted
	 * settings using `setSettings` and `getSettings`.
	 */
	async onKeyDown(ev: KeyDownEvent<PythonScriptSettings>): Promise<void> {
		// Update the count from the settings.
		const settings = ev.payload.settings;
		const { path } = settings;
		let pythonProcess: ChildProcess | undefined;
		if (path) {
			streamDeck.logger.info(`path to script is: ${path}`)
			pythonProcess = this.createChildProcess(settings.useVenv, settings.venvPath, path);

			if (pythonProcess != undefined && pythonProcess.stdout != null) {
				streamDeck.logger.info(`start reading output`);
				pythonProcess.stdout.on('data', (data: { toString: () => string; }) => {
					streamDeck.logger.info(`stdout: ${data}`);
					if (settings.displayValues) { ev.action.setTitle(data.toString().trim()); }
					if (settings.image1 && (data.toString().trim() == (settings.value1 ?? ""))) {
						ev.action.setImage(settings.image1)
					}
					if (settings.image2 && (data.toString().trim() == (settings.value2 ?? ""))) {
						ev.action.setImage(settings.image2)

					}else(
						ev.action.setImage("imgs/actions/pyFileCheck.png")
					)
				});

				pythonProcess.stderr!.on('data', (data: { toString: () => string; }) => {
					const errorString = data.toString().trim().replace(RegExp('/(?:\r\n|\r|\n)/g'), ' ');
					streamDeck.logger.error(`stderr: ${errorString}`);
					ev.action.setImage("imgs/actions/pyFilecheckFailed.png");
					let errorTitle = "python\nother\nissue";
					for (const key in pythonErrorMap) {
						if (errorString.search(key) > -1) {
							errorTitle = pythonErrorMap[key];
							break;
						}
					}
					if (errorTitle == "python\nother\nissue"){
						streamDeck.logger.error(errorString);
					}
					ev.action.setTitle(errorTitle);
					ev.action.showAlert();

				});

				pythonProcess.on('close', (code: any) => {
					streamDeck.logger.info(`child process exited with code ${code}`);
				});
			}
		}


	}

	createChildProcess(useVenv: boolean, venvPath: string | undefined, path: string) {
		let pythonProcess: ChildProcess | undefined;
		if (useVenv && venvPath) {
			streamDeck.logger.info(`Use Virtual Environment: ${venvPath}`)
			pythonProcess = spawn("cmd.exe", ["/c", `call ${venvPath.substring(0, venvPath.lastIndexOf("/"))}/Scripts/activate.bat && python ${path}`]);

		}
		else {
			pythonProcess = spawn("python3", [path]);
			if (pythonProcess.connected == false){
				streamDeck.logger.info("python3 not found, trying python")
				pythonProcess = spawn("python", [path]);
			}
		}
		return pythonProcess;
	}

	getFileNameFromPath(path: string): string {
		var fileName = "";
		fileName = path.substring(path.lastIndexOf("/") + 1);
		return fileName;
	}
}

/**
 * Settings for {@link PythonScript}.
 */
type PythonScriptSettings = {
	path?: string;
	value1?: string;
	image1?: string;
	value2?: string;
	image2?: string;
	displayValues: boolean;
	useVenv: boolean;
	venvPath?: string;

};
