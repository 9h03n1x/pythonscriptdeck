import streamDeck, { DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent, WillDisappearEvent } from '@elgato/streamdeck';
import { PythonServiceSettings } from './actions/python-service';
import { ChildProcess, spawn } from 'child_process';

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
enum ServiceState {
	running,
	stopped
}


class PythonBackgroundService {

	trackedActions: any[] = [];
	state = ServiceState.stopped;


	registerAction(ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings>) {

		var duplicate = false;
		streamDeck.logger.info("checking if action is already tracked");
		var newtrackedAction = {
			"id": ev.action.id, "ev": ev, "timerId": undefined
		}

		for (let i = 0; i < this.trackedActions.length; i++) {
			if (this.trackedActions[i] == ev.action.id) {
				duplicate = true;
				streamDeck.logger.info("action already tracked - updating action");
				clearInterval(this.trackedActions[i].timerId);
				this.trackedActions[this.trackedActions.indexOf(this.trackedActions[i])] = newtrackedAction;
				break;
			}
		}

		if (duplicate == false) {
			this.trackedActions.push(newtrackedAction)
		}
	}

	unregisterAction(ev: WillDisappearEvent<PythonServiceSettings>) {
		for (let i = 0; i < this.trackedActions.length; i++) {
			if (this.trackedActions[i] == ev.action.id) {
				streamDeck.logger.info(`stopping execution of the action ${ev.action.manifestId}, id: ${ev.action.id}`);
				clearInterval(this.trackedActions[i].timerId);
			}
		}
	}

	start(ev: KeyDownEvent<PythonServiceSettings>) {
		streamDeck.logger.info("starting Background Service")
		for (let i = 0; i < this.trackedActions.length; i++) {
			this.trackedActions[i].timerId = this.createTimer(this.trackedActions[i].ev);
		}
		this.state = ServiceState.running;
		ev.action.setImage("imgs/actions/pyServiceRunning.png");
	}

	stop(ev: KeyDownEvent<PythonServiceSettings>) {
		streamDeck.logger.info("stopping Background Service")
		for (let i = 0; i < this.trackedActions.length; i++) {
			if (this.trackedActions[i].timerId == undefined) {
				continue;
			} else {
				clearInterval(this.trackedActions[i].timerId);
				this.trackedActions[i].timerId = undefined;
			}


		}
		this.state = ServiceState.stopped;
		streamDeck.logger.info(`stopping execution of the action ${ev.action.manifestId}, id: ${ev.action.id}`)
		ev.action.setImage("imgs/actions/pyServiceStopped.png");
	}

	getState = () => {
		return this.state;
	}



	executeAction(ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings> | KeyDownEvent<PythonServiceSettings>) {
		const settings = ev.payload.settings;
		const { path } = settings;
		let pythonProcess: ChildProcess | undefined;
		if (path) {
			streamDeck.logger.debug(`path to script is: ${path}`)
			pythonProcess = this.createChildProcess(settings.useVenv, settings.venvPath, path);

			if (pythonProcess != undefined && pythonProcess.stdout != null) {
				streamDeck.logger.debug(`start reading output`);
				pythonProcess.stdout.on('data', (data: { toString: () => string; }) => {
					streamDeck.logger.info(`stdout: ${data}`);
					if (settings.displayValues) { ev.action.setTitle(data.toString().trim()); }
					if (settings.image1 && (data.toString().trim() == (settings.value1 ?? ""))) {
						ev.action.setImage(settings.image1)
					}
					else if (settings.image2 && (data.toString().trim() == (settings.value2 ?? ""))) {
						ev.action.setImage(settings.image2)

					} else (
						ev.action.setImage("imgs/actions/pyServiceIcon.png")
					)
				});

				pythonProcess.stderr!.on('data', (data: { toString: () => string; }) => {
					const errorString = data.toString().trim().replace(RegExp('/(?:\r\n|\r|\n)/g'), ' ');
					streamDeck.logger.error(`stderr: ${errorString}`);
					ev.action.setImage("imgs/actions/pyServiceIconFail.png");
					let errorTitle = "python\nother\nissue";
					for (const key in pythonErrorMap) {
						if (errorString.search(key) > -1) {
							errorTitle = pythonErrorMap[key];
							break;
						}
					}
					if (errorTitle == "python\nother\nissue") {
						streamDeck.logger.error(errorString);
					}
					ev.action.setTitle(errorTitle);
					ev.action.showAlert();

				});

				pythonProcess.on('close', (code: any) => {
					streamDeck.logger.debug(`child process exited with code ${code}`);
				});
			}
		}

	}
	createChildProcess(useVenv: boolean, venvPath: string | undefined, path: string) {
		let pythonProcess: ChildProcess | undefined;
		if (useVenv && venvPath) {
			streamDeck.logger.debug(`Use Virtual Environment: ${venvPath}`)
			pythonProcess = spawn("cmd.exe", ["/c", `call ${venvPath.substring(0, venvPath.lastIndexOf("/"))}/Scripts/activate.bat && python ${path}`]);

		}
		else {
			streamDeck.logger.info(`Use Python: ${path}`)
			pythonProcess = spawn(`cmd.exe`, [`/c ${path}`]);
			/*
			if (pythonProcess.connected == false) {
				streamDeck.logger.debug("python not found, trying python3")
				pythonProcess = spawn("cmd.exe", ["/c", `python3 ${path}`]);
			}*/
		}
		return pythonProcess;
	}

	getFileNameFromPath(path: string): string {
		var fileName = "";
		fileName = path.substring(path.lastIndexOf("/") + 1);
		return fileName;
	}

	createTimer(ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings> | KeyDownEvent<PythonServiceSettings>) {
		const interval = ev.payload.settings.interval ?? 10
		return setInterval(() => {
			streamDeck.logger.info(`timer triggered after ${ev.payload.settings.interval}s for action ${ev.action.manifestId}, id: ${ev.action.id}`)
			this.executeAction(ev);
		}, interval * 1000)

	}


}

export var pyBGService = new PythonBackgroundService();
