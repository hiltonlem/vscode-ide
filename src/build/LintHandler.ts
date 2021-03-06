import * as path from 'path';
import { DiagnosticSeverity } from 'vscode';
import { Diagnostics } from '../utils';
import { StreamsUtils } from './v5/util';

/**
 * Handles linting of source files
 */
export default class LintHandler {
    private _msgRegex: RegExp;
    private _appRoot: string;

    /**
     * @param appRoot    The application root path
     */
    constructor(appRoot: string) {
        this._appRoot = appRoot;
    }

    /**
     * Parse a build response and lint source file(s)
     * @param response    The build response
     */
    public lint(response: any): void {
        if (!response) {
            return;
        }

        let messages = [];
        if (response.output) {
            this._setV4();
            messages = response.output.map((message: any) => message.message_text);
        } else if (Array.isArray(response)) {
            this._setV5();
            messages = response;
        }

        if (Array.isArray(messages)) {
            const convertedMessages = messages
                .filter((message: string) => message.match(this._msgRegex))
                .map((message: string) => this._parseMessage(message));
            Diagnostics.lintFiles(this._msgRegex, this._appRoot, convertedMessages);
        }
    }

    /**
     * Target Streams API V4
     */
    private _setV4() {
        this._msgRegex = StreamsUtils.SPL_MSG_REGEX;
    }

    /**
     * Target Streams API V5
     */
    private _setV5() {
        this._msgRegex = StreamsUtils.SPL_MSG_REGEX_V5;
    }

    /**
     * Parse build message for relevant information
     * @param message    The build message
     */
    private _parseMessage(message: string): any {
        const parts = message.match(this._msgRegex);
        if (parts && parts.length > 4) {
            const severityCode = parts[4].trim().substr(parts[4].trim().length - 1);
            let severity = DiagnosticSeverity.Information;
            if (severityCode) {
                switch (severityCode) {
                    case 'I':
                        severity = DiagnosticSeverity.Information;
                        break;
                    case 'W':
                        severity = DiagnosticSeverity.Warning;
                        break;
                    case 'E':
                        severity = DiagnosticSeverity.Error;
                        break;
                    default:
                        break;
                }
            }

            let absolutePath = parts[1];
            if (this._appRoot && typeof (this._appRoot) === 'string') {
                absolutePath = `${this._appRoot}${path.sep}${parts[1]}`;
            }

            return {
                severity,
                file: absolutePath,
                line: parseInt(parts[2], 10),
                column: parseInt(parts[3], 10),
                code: parts[4],
                description: parts[5]
            };
        }
    }
}
