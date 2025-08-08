import streamDeck, { DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent, WillDisappearEvent } from '@elgato/streamdeck';
import { PythonServiceSettings } from './actions/python-service';
import { ChildProcess } from 'child_process';
import { spawnPythonProcess } from './utils';

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

	trackedActions: { id: string, ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings>, timerId?: NodeJS.Timeout }[] = [];
	state = ServiceState.stopped;


	registerAction(ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings>) {
		const existingAction = this.trackedActions.find(action => action.id === ev.action.id);

		if (existingAction) {
			streamDeck.logger.info("action already tracked - updating action");
			clearInterval(existingAction.timerId);
			existingAction.ev = ev;
		} else {
			streamDeck.logger.info("tracking new action");
			this.trackedActions.push({
				"id": ev.action.id, "ev": ev, "timerId": undefined
			});
		}
	}

	unregisterAction(ev: WillDisappearEvent<PythonServiceSettings>) {
		const actionIndex = this.trackedActions.findIndex(action => action.id === ev.action.id);
		if (actionIndex > -1) {
			const action = this.trackedActions[actionIndex];
			streamDeck.logger.info(`stopping execution of the action ${action.ev.action.manifestId}, id: ${action.id}`);
			clearInterval(action.timerId);
			this.trackedActions.splice(actionIndex, 1);
		}
	}

	start(ev: KeyDownEvent<PythonServiceSettings>) {
		streamDeck.logger.info("starting Background Service")
		for (const action of this.trackedActions) {
			action.timerId = this.createTimer(action.ev);
		}
		this.state = ServiceState.running;
		ev.action.setImage("imgs/actions/pyServiceRunning.png");
	}

	stop(ev: KeyDownEvent<PythonServiceSettings>) {
		streamDeck.logger.info("stopping Background Service")
		for (const action of this.trackedActions) {
			if (action.timerId) {
				clearInterval(action.timerId);
				action.timerId = undefined;
			}
		}
		this.state = ServiceState.stopped;
		streamDeck.logger.info(`stopping execution of the action ${ev.action.manifestId}, id: ${ev.action.id}`)
		ev.action.setImage("imgs/actions/pyServiceStopped.png");
	}

	getState = () => {
		return this.state === ServiceState.running;
	}



	executeAction(ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings> | KeyDownEvent<PythonServiceSettings>) {
		const settings = ev.payload.settings;
		const { path } = settings;
		let pythonProcess: ChildProcess | undefined;
		if (path) {
			streamDeck.logger.debug(`path to script is: ${path}`)
			pythonProcess = spawnPythonProcess(settings.useVenv, settings.venvPath, path);

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

					} else {
						ev.action.setImage("imgs/actions/pyServiceIcon.png")
					}
				});

				pythonProcess.stderr!.on('data', (data: { toString: () => string; }) => {
					const errorString = data.toString().trim().replace(/(?:\r\n|\r|\n)/g, ' ');
					streamDeck.logger.error(`stderr: ${errorString}`);
					ev.action.setImage("imgs/actions/pyServiceIconFail.png");
					let errorTitle = "python\nother\nissue";
					for (const key in pythonErrorMap) {
						if (errorString.includes(key)) {
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

	createTimer(ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings> | KeyDownEvent<PythonServiceSettings>) {
		const interval = ev.payload.settings.interval ?? 10
		return setInterval(() => {
			streamDeck.logger.info(`timer triggered after ${ev.payload.settings.interval}s for action ${ev.action.manifestId}, id: ${ev.action.id}`)
			this.executeAction(ev);
		}, interval * 1000)

	}


}

export var pyBGService = new PythonBackgroundService();
