import * as fs from "fs";
import * as path from "path";
import * as uuidV4 from "uuid/v4";

import * as core from "@actions/core";
import * as exe from "@actions/exec";
import * as io from "@actions/io";
import * as toolCache from "@actions/tool-cache";

import { injectable } from "inversify";

import { IBuildAgent, IExecResult } from "../core/interfaces";

@injectable()
class BuildAgent implements IBuildAgent {

    public find(toolName: string, versionSpec: string, arch?: string): string {
        return toolCache.find(toolName, versionSpec, arch);
    }

    public cacheDir(sourceDir: string, tool: string, version: string, arch?: string): Promise<string> {
        return toolCache.cacheDir(sourceDir, tool, version, arch);
    }

    public async createTempDir(): Promise<string> {
        const IS_WINDOWS = process.platform === "win32";

        let tempDirectory: string = process.env.RUNNER_TEMP || "";

        if (!tempDirectory) {
            let baseLocation: string;
            if (IS_WINDOWS) {
                // On Windows use the USERPROFILE env variable
                baseLocation = process.env.USERPROFILE || "C:\\";
            } else {
                if (process.platform === "darwin") {
                    baseLocation = "/Users";
                } else {
                    baseLocation = "/home";
                }
            }
            tempDirectory = path.join(baseLocation, "actions", "temp");
        }
        const dest = path.join(tempDirectory, uuidV4());
        await io.mkdirP(dest);
        return dest;
    }

    public debug(message: string): void {
        core.debug(message);
    }

    public setFailed(message: string, done?: boolean): void {
        core.setFailed(message);
    }

    public setSucceeded(message: string, done?: boolean): void {
        //
    }

    public exportVariable(name: string, val: string): void {
        core.exportVariable(name, val);
    }

    public getVariable(name: string): string {
        return process.env[name];
    }

    public addPath(inputPath: string): void {
        core.addPath(inputPath);
    }

    public which(tool: string, check?: boolean): Promise<string> {
        return io.which(tool, check);
    }

    public async exec(exec: string, args: string[]): Promise<IExecResult> {
        const dotnetPath = await io.which(exec, true);
        let resultCode = 0;
        let stdout = "";
        let stderr = "";
        resultCode = await exe.exec(
            `"${dotnetPath}"`,
            args,
            {
                listeners: {
                    stderr: (data: Buffer) => {
                        stderr += data.toString();
                    },
                    stdout: (data: Buffer) => {
                        stdout += data.toString();
                    },
                },
            });
        return {
            code: resultCode,
            error: null,
            stderr,
            stdout,
        };
    }

    public getSourceDir(): string {
        return this.getVariable("GITHUB_WORKSPACE");
    }

    public setOutput(name: string, value: string): void {
        core.setOutput(name, value);
    }

    public getInput(input: string, required?: boolean): string {
        return core.getInput(input,  { required } as core.InputOptions);
    }

    public getBooleanInput(input: string, required?: boolean): boolean {
        const inputValue = this.getInput(input, required);
        return (inputValue || "false").toLowerCase() === "true";
    }

    public isValidInputFile(input: string, file: string) {
        const pathValue = path.resolve(this.getInput(input) || "");
        const repoRoot = this.getSourceDir();
        return pathValue !== repoRoot;
    }

    public fileExists(file: string) {
        return this._exist(file) && this._stats(file).isFile();
    }

    public directoryExists(file: string) {
        return this._exist(file) && this._stats(file).isDirectory();
    }

    private _exist(file: string): boolean {
        let exist = false;
        try {
            exist = !!(file && fs.statSync(file) != null);
        } catch (err) {
            if (err && err.code === "ENOENT") {
                exist = false;
            } else {
                throw err;
            }
        }
        return exist;
    }

    private _stats(file: string): fs.Stats {
        return fs.statSync(file);
    }
 }

export {
    BuildAgent,
};
