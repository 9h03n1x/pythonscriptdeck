import streamDeck, { DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent } from '@elgato/streamdeck';
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


class PythonBackgroundService {

    trackedActions: any[] = [];

    registerAction(ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings>) {
        const interval = ev.payload.settings.interval ?? 10
        var duplicate = false;
        streamDeck.logger.info("checking if action is already tracked");
        var newtrackedAction = {
            "id": ev.action.id, "ev": ev, "timer": setInterval(() => {
                streamDeck.logger.info(`timer triggered after ${ev.payload.settings.interval}s for action ${ev.action.manifestId}`)
                this.executeAction(ev);
                
            }, interval*1000)
        }

        for (let i = 0; i < this.trackedActions.length; i++) {
            const element = this.trackedActions[i];
            if (element.id == ev.action.id) {
                duplicate = true;
                streamDeck.logger.info("action already tracked - updating action");
                clearInterval(element.timer.id);
                this.trackedActions[this.trackedActions.indexOf(element)]= newtrackedAction;
                break;
            }
            }

        if (duplicate == false) {
        this.trackedActions.push(newtrackedAction)}
    }

    unregisterAction(ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings>) { }

    start(){
        streamDeck.logger.info("starting Background Service")
    }

    stop(){
        streamDeck.logger.info("stopping Background Service")
    }

    

    executeAction(ev: WillAppearEvent<PythonServiceSettings> | DidReceiveSettingsEvent<PythonServiceSettings> |KeyDownEvent<PythonServiceSettings>){
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

export var pyBGService = new PythonBackgroundService();
