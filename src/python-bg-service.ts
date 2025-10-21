import streamDeck, { DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { PythonServiceSettings } from "./actions/python-service";
import { ChildProcess, spawn } from "child_process";
import * as os from "os";
import * as path from "node:path";

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
	"Microsoft Store": "Python\nnot found\nError"
};

export enum ServiceState {
	running,
	stopped
}

type TrackedAction = {
	id: string;
	ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings>;
	timerId?: NodeJS.Timeout;
};

type NormalizedSettings = PythonServiceSettings & {
	interval: number;
	displayValues: boolean;
	useVenv: boolean;
};

class PythonBackgroundService {
	private trackedActions: TrackedAction[] = [];
	private state: ServiceState = ServiceState.stopped;

	registerAction(ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings>) {
		streamDeck.logger.info("checking if action is already tracked");
		const existingIndex = this.trackedActions.findIndex(action => action.id === ev.action.id);
		if (existingIndex >= 0) {
			const existing = this.trackedActions[existingIndex];
			if (existing.timerId) {
				clearInterval(existing.timerId);
			}
			const updatedAction: TrackedAction = { ...existing, ev };
			if (this.state === ServiceState.running) {
				updatedAction.timerId = this.createTimer(ev);
			}
			this.trackedActions[existingIndex] = updatedAction;
			streamDeck.logger.info("action already tracked - settings updated");
			return;
		}

		this.trackedActions.push({ id: ev.action.id, ev });
	}

	unregisterAction(ev: WillDisappearEvent<PythonServiceSettings>) {
		const index = this.trackedActions.findIndex(action => action.id === ev.action.id);
		if (index >= 0) {
			const tracked = this.trackedActions[index];
			if (tracked.timerId) {
				streamDeck.logger.info(`stopping execution of the action ${ev.action.manifestId}, id: ${ev.action.id}`);
				clearInterval(tracked.timerId);
			}
			this.trackedActions.splice(index, 1);
		}
	}

	start(ev: KeyDownEvent<PythonServiceSettings>) {
		streamDeck.logger.info("starting Background Service");
		this.trackedActions.forEach(tracked => {
			if (tracked.timerId) {
				clearInterval(tracked.timerId);
			}
			tracked.timerId = this.createTimer(tracked.ev);
		});
		this.state = ServiceState.running;
		ev.action.setImage("imgs/actions/pyServiceRunning.png");
	}

	stop(ev: KeyDownEvent<PythonServiceSettings>) {
		streamDeck.logger.info("stopping Background Service");
		this.trackedActions.forEach(tracked => {
			if (tracked.timerId) {
				clearInterval(tracked.timerId);
				tracked.timerId = undefined;
			}
		});
		this.state = ServiceState.stopped;
		streamDeck.logger.info(`stopping execution of the action ${ev.action.manifestId}, id: ${ev.action.id}`);
		ev.action.setImage("imgs/actions/pyServiceStopped.png");
	}

	getState = (): ServiceState => {
		return this.state;
	};

	executeAction(ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings> | KeyDownEvent<PythonServiceSettings>) {
		const settings = this.normalizeSettings(ev.payload.settings);
		const scriptPath = settings.path;
		let pythonProcess: ChildProcess | undefined;
		if (scriptPath) {
			streamDeck.logger.debug(`path to script is: ${scriptPath}`);
			pythonProcess = this.createChildProcess(settings.useVenv, settings.venvPath, scriptPath);

			if (pythonProcess && pythonProcess.stdout) {
				streamDeck.logger.debug("start reading output");
				pythonProcess.stdout.on("data", (data: { toString: () => string }) => {
					const output = data.toString().trim();
					streamDeck.logger.info(`stdout: ${output}`);
					if (settings.displayValues) {
						ev.action.setTitle(output);
					}
					if (settings.image1 && output === (settings.value1 ?? "")) {
						ev.action.setImage(settings.image1);
					} else if (settings.image2 && output === (settings.value2 ?? "")) {
						ev.action.setImage(settings.image2);
					} else {
						ev.action.setImage("imgs/actions/pyServiceIcon.png");
					}
				});

				pythonProcess.stderr?.on("data", (data: { toString: () => string }) => {
					const errorString = data.toString().trim().replace(/(?:\r\n|\r|\n)/g, " ");
					streamDeck.logger.error(`stderr: ${errorString}`);
					ev.action.setImage("imgs/actions/pyServiceIconFail.png");
					let errorTitle = "python\nother\nissue";
					for (const key in pythonErrorMap) {
						if (errorString.includes(key)) {
							errorTitle = pythonErrorMap[key];
							break;
						}
					}
					if (errorTitle === "python\nother\nissue") {
						streamDeck.logger.error(errorString);
					}
					ev.action.setTitle(errorTitle);
					ev.action.showAlert();
				});

				pythonProcess.on("close", (code: number | null) => {
					streamDeck.logger.debug(`child process exited with code ${code}`);
				});
			}
		}
	}

	createChildProcess(useVenv: boolean, venvPath: string | undefined, scriptPath: string) {
		let pythonProcess: ChildProcess | undefined;
		const isWindows = os.platform() === "win32";
		const normalizedScriptPath = isWindows ? path.win32.normalize(scriptPath) : scriptPath;

		if (useVenv && venvPath) {
			if (isWindows) {
				const pythonExecutable = path.win32.join(venvPath, "Scripts", "python.exe");
				pythonProcess = spawn(pythonExecutable, [normalizedScriptPath], { windowsHide: true });
			} else {
				const pythonExecutable = path.posix.join(venvPath, "bin", "python3");
				pythonProcess = spawn(pythonExecutable, [normalizedScriptPath]);
			}
		} else {
			if (isWindows) {
				pythonProcess = spawn("python", [normalizedScriptPath], { windowsHide: true });
			} else {
				pythonProcess = spawn("python3", [normalizedScriptPath]);
			}
		}

		pythonProcess?.on("error", (error: Error) => {
			streamDeck.logger.error(`Failed to start python process: ${error.message}`);
		});

		return pythonProcess;
	}

	createTimer(ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings> | KeyDownEvent<PythonServiceSettings>) {
		const settings = this.normalizeSettings(ev.payload.settings);
		const intervalSeconds = settings.interval;
		return setInterval(() => {
			streamDeck.logger.info(`timer triggered after ${intervalSeconds}s for action ${ev.action.manifestId}, id: ${ev.action.id}`);
			this.executeAction(ev);
		}, intervalSeconds * 1000);
	}

	private normalizeSettings(settings: PythonServiceSettings): NormalizedSettings {
		const intervalRaw = typeof settings.interval === "string" ? Number(settings.interval) : settings.interval;
		const interval = Number.isFinite(intervalRaw) && intervalRaw !== undefined && intervalRaw > 0 ? intervalRaw : 10;
		return {
			...settings,
			interval,
			displayValues: Boolean(settings.displayValues),
			useVenv: Boolean(settings.useVenv)
		};
	}
}

export const pyBGService = new PythonBackgroundService();
