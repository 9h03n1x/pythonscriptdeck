import { ChildProcess, spawn } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import streamDeck from '@elgato/streamdeck';

/**
 * Spawns a python process in a cross-platform way.
 * @param useVenv Whether to use a virtual environment.
 * @param venvPath The path to the virtual environment.
 * @param scriptPath The path to the python script to execute.
 * @returns A ChildProcess object.
 */
export function spawnPythonProcess(useVenv: boolean, venvPath: string | undefined, scriptPath: string): ChildProcess {
    const isWindows = os.platform() === 'win32';

    if (useVenv && venvPath) {
        const pythonExecutable = isWindows ? 'python.exe' : 'python';
        const pythonPath = isWindows
            ? path.join(venvPath, 'Scripts', pythonExecutable)
            : path.join(venvPath, 'bin', pythonExecutable);

        streamDeck.logger.info(`Using virtual environment: ${pythonPath}`);
        return spawn(pythonPath, [scriptPath]);

    } else {
        const pythonExecutable = isWindows ? 'python' : 'python3';
        streamDeck.logger.info(`Using global python: ${pythonExecutable}`);
        return spawn(pythonExecutable, [scriptPath]);
    }
}

/**
 * Gets the file name from a path in a cross-platform way.
 * @param filePath The path to the file.
 * @returns The file name.
 */
export function getFileNameFromPath(filePath: string): string {
    return path.basename(filePath);
}
