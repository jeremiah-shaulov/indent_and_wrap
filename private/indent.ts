export const DEFAULT_TAB_WIDTH = 8;

const C_SPACE = ' '.charCodeAt(0);
const C_TAB = '\t'.charCodeAt(0);
const C_CR = '\r'.charCodeAt(0);
const C_LF = '\n'.charCodeAt(0);
const C_ESC = 0x1B;
const C_BEL = 7;

// deno-lint-ignore no-control-regex
const RE_TERM_ESCAPE = /\[[\x30-\x3F]*[\x20-\x2F]*[\x40-\x7E]|[PX^_].*?\x1B\\|\][^\a]*(?:\a|\x1B\\)|[\[\]A-Z\\^_@]/y;

export type IndentAndWrapOptions =
{	endl?: string;
	indent?: string;
	ignoreFirstIndent?: boolean;
	wrapWidth?: number;
	overflowWrap?: boolean;
	tabWidth?: number;
	tabsToSpaces?: boolean;
	mode?: 'plain' | 'term';
};

export type GetTextRectOptions =
{	indent?: string;
	ignoreFirstIndent?: boolean;
	wrapWidth?: number;
	overflowWrap?: boolean;
	tabWidth?: number;
	mode?: 'plain' | 'term';
};

export type FindCommonIndentOptions =
{	ignoreFirstIndent?: boolean;
	mode?: 'plain' | 'term';
};

export type CalcLinesOptions =
{	tabWidth?: number;
	mode?: 'plain' | 'term';
};

export const enum State
{	ENDL,
	WANT_ENDL,
	MID_LINE_OR_EOF,
}

/**	This function does:
	- Replaces new line characters (`\n`, `\r\n` or `\r`) to `options.endl`, or if it's not set to `\n`.
	- If `options.indent` is set, it determines common indent characters across all lines, and replaces them with `options.indent` string.
	This can lead to indent increase or decrease.
	If `options.ignoreFirstIndent` is set, will look for common indent starting at second line, so the text can be trimmed.
	If you already know the common indent (e.g. you called `findCommonIndent()`), you can provide it as `knownCommonIndent` to save some calculation time.
	If `knownCommonIndent` doesn't match the result of `findCommonIndent()`, the behavior is undefined.
	- If `options.wrapWidth` is set, it inserts `options.endl`, so there're no lines longer than `options.wrapWidth` columns. Columns are calculated with respect to `options.tabWidth` (default 8).
 **/
export function indentAndWrap(text: string, options?: IndentAndWrapOptions, knownCommonIndent?: string)
{	return doIndentAndWrap(false, text, options, knownCommonIndent).res;
}

/**	This function works the same as `indentAndWrap()`, but it doesn't return resulting text, but it returns number of lines and columns the result occupies.
	It only counts columns on non-blank lines.
 **/
export function getTextRect(text: string, options?: GetTextRectOptions, knownCommonIndent?: string)
{	const {nLines, nColumns} = doIndentAndWrap(true, text, options, knownCommonIndent);
	return {nLines, nColumns};
}

function doIndentAndWrap(isRect: boolean, text: string, options?: IndentAndWrapOptions, knownCommonIndent?: string)
{	let indent = options?.indent;
	const ignoreFirstIndent = options?.ignoreFirstIndent || false;
	const overflowWrap = options?.overflowWrap || false;
	const tabWidth = Math.max(1, options?.tabWidth || DEFAULT_TAB_WIDTH);
	const tabsToSpaces = options?.tabsToSpaces || false;
	const endl = options?.endl || '\n';
	const isTerm = options?.mode == 'term';
	let wrapWidth = Math.max(1, options?.wrapWidth ?? Number.MAX_SAFE_INTEGER);
	if (wrapWidth==Number.MAX_SAFE_INTEGER && isRect || tabsToSpaces)
	{	wrapWidth = Number.MAX_SAFE_INTEGER - 1; // columns are not counted when wrapWidth == Number.MAX_SAFE_INTEGER
	}

	let commonIndent = '';
	let indentCol = 0;
	let indentNLines = 1;
	if (indent != undefined)
	{	commonIndent = knownCommonIndent ?? findCommonIndent(text, options);
		const {nColumn, nLine} = calcLines(indent, options, 0, indent.length);
		indentCol = nColumn - 1;
		if (indentCol >= wrapWidth)
		{	wrapWidth = indentCol + 1;
		}
		indentNLines = nLine;
	}
	const commonIndentLen = commonIndent.length;
	const {length} = text;
	let i = 0;
	let nColumn = 0;
	if (ignoreFirstIndent)
	{	if (indent != undefined)
		{	i = precedingSpaceLen(text, 0, isTerm);
			nColumn = indentCol;
		}
	}
	else
	{	const firstChar = text.charCodeAt(0);
		if (firstChar!=C_CR && firstChar!=C_LF)
		{	i = commonIndentLen;
			nColumn = indentCol;
		}
	}
	if (indent == undefined)
	{	indent = '';
	}
	let res = '';
	const lastChar = text.charCodeAt(text.length-1);
	let nLines = lastChar==C_CR || lastChar==C_LF ? 1 : 0;
	let nColumns = 0;
	while (i < length)
	{	const {n, nextN, nextCol, state, tabPos, tabEndPos, tabLen} = scanLine(text, i, nColumn, wrapWidth, overflowWrap, tabWidth, tabsToSpaces, isTerm);
		if (n > i)
		{	if (isRect)
			{	if (nextCol > nColumns)
				{	nColumns = nextCol;
				}
			}
			else if (tabEndPos == -1)
			{	res += indent + text.slice(i, n);
			}
			else
			{	res += indent + text.slice(i, tabPos) + ' '.repeat(tabLen) + text.slice(tabEndPos, n);
			}
		}
		nLines += indentNLines;
		i = nextN;
		if (state == State.ENDL)
		{	nColumn = 0;
			const c = text.charCodeAt(i);
			if (c!=C_CR && c!=C_LF)
			{	i += commonIndentLen;
				nColumn = indentCol;
			}
			if (!isRect)
			{	res += endl;
			}
		}
		else
		{	nColumn = nextCol;
			if (state == State.WANT_ENDL)
			{	nColumn = indentCol;
				if (!isRect)
				{	res += endl;
				}
			}
		}
	}
	return {res, nLines, nColumns};
}

/**	Scan text string, and find leading space characters, that are common across all lines.
	If `ignoreFirstIndent` is set, then the leading space on the first line is not counted, so the provided text string can be trimmed.
	If `options.mode` is `term`, then terminal escape sequences (like VT100 color codes) can be part of indent.
	This function uses fast algorithm that avoids splitting text to lines array.
 **/
export function findCommonIndent(text: string, options?: FindCommonIndentOptions)
{	const ignoreFirstIndent = options?.ignoreFirstIndent || false;
	const isTerm = options?.mode == 'term';

	const {length} = text;
	let i = 0;
	let commonFrom = 0;
	let c = 0;
	// 1. Ignore indent on first line, if wanted
	if (ignoreFirstIndent)
	{	// go to end of line
		while (i<length && (c = text.charCodeAt(i))!=C_CR && c!=C_LF)
		{	i++;
		}
	}
	// 2. Skip empty lines, set `commonFrom` to line start and `commonTo` (and `i`) to first nonspace on that line
	for (; i<length; i++)
	{	c = text.charCodeAt(i);
		if (c==C_CR || c==C_LF)
		{	commonFrom = i + 1;
		}
		else if (c!=C_SPACE && c!=C_TAB)
		{	if (isTerm)
			{	if (c == C_BEL)
				{	continue;
				}
				if (c == C_ESC)
				{	const pos = skipTermEscapeContinuation(text, i+1);
					if (pos)
					{	i = pos - 1; // will i++ on next iteration
						continue;
					}
				}
			}
			break;
		}
	}
	let commonTo = i;
	// 3. Scan all lines, and do `commonTo--` if some line has smaller indent
	while (i<length && commonFrom<commonTo)
	{	// go to next line start
		while (i<length && (c = text.charCodeAt(i))!=C_CR && c!=C_LF)
		{	i++;
		}
		while (i<length && ((c = text.charCodeAt(i))==C_CR || c==C_LF))
		{	i++;
		}
		// skip common indent
		let j = commonFrom;
		while (j<commonTo && i<length && text.charCodeAt(j)==text.charCodeAt(i))
		{	i++;
			j++;
		}
		// skip space after common indent
		i = precedingSpaceLen(text, i, isTerm);
		// if it was not a blank line, update `commonTo`
		if (i<length && (c = text.charCodeAt(i))!=C_CR && c!=C_LF)
		{	commonTo = j;
		}
	}
	// 4. Done
	return text.slice(commonFrom, commonTo);
}

/**	Count number of lines in text string, and determine column number after the last character.
	This function only considers text substring from `from` to `to`.
	Lines and columns counter starts from provided values: `nLine` and `nColumn`.
	If `options.mode` is `term`, skips terminal escape sequences (like VT100 color codes).
 **/
export function calcLines(text: string, options?: CalcLinesOptions, from=0, to=Number.MAX_SAFE_INTEGER, nLine=1, nColumn=1)
{	const tabWidth = Math.max(1, options?.tabWidth || DEFAULT_TAB_WIDTH);
	const isTerm = options?.mode == 'term';

	if (to > text.length)
	{	to = text.length;
	}
	nColumn--; // to 0-based
	for (; from<to; from++)
	{	switch (text.charCodeAt(from))
		{	case C_LF:
				nColumn = 0;
				nLine++;
				break;

			case C_CR:
				if (text.charCodeAt(from+1) === C_LF)
				{	from++;
				}
				nColumn = 0;
				nLine++;
				break;

			case C_TAB:
				nColumn += tabWidth - nColumn%tabWidth;
				break;

			case C_BEL:
				if (!isTerm)
				{	nColumn++;
				}
				break;

			// deno-lint-ignore no-fallthrough
			case C_ESC:
				if (isTerm)
				{	const pos = skipTermEscapeContinuation(text, from+1);
					if (pos)
					{	from = pos - 1; // will from++ on next iteration
						break;
					}
				}

			default:
				nColumn++;
		}
	}
	nColumn++; // to 1-based
	return {nLine, nColumn};
}

function skipTermEscapeContinuation(text: string, i: number)
{	RE_TERM_ESCAPE.lastIndex = i;
	RE_TERM_ESCAPE.test(text);
	return RE_TERM_ESCAPE.lastIndex;
}

function precedingSpaceLen(text: string, i: number, isTerm: boolean)
{	const {length} = text;
	let c = 0;
	while (i < length)
	{	c = text.charCodeAt(i);
		if (c!=C_SPACE && c!=C_TAB)
		{	if (isTerm)
			{	if (c == C_BEL)
				{	i++;
					continue;
				}
				if (c == C_ESC)
				{	const pos = skipTermEscapeContinuation(text, i+1);
					if (pos)
					{	i = pos;
						continue;
					}
				}
			}
			break;
		}
		i++;
	}
	return i;
}

/**	Returns position where next line begins, and length of line-break characters at the end of the skipped line.
 **/
export function scanLine(text: string, i: number, nColumn: number, wrapWidth: number, overflowWrap: boolean, tabWidth: number, tabsToSpaces: boolean, isTerm: boolean)
{	const {length} = text;
	const start = i;
	let wordStart = i;
	let wordEnd = i;
	let wordEndCol = nColumn;
	let prevIsSpace = true;
	let tabPos = tabsToSpaces ? -1 : -2; // -2: no count; -1: no TAB occured yet; >=0: tab occured, but no next nonspace occured
	let tabCol = 0;
	let tabEndPos = -1;
	let tabEndCol = 0;
	for (; i<length; i++)
	{	const c = text.charCodeAt(i);
		switch (c)
		{	case C_LF:
				if (!prevIsSpace)
				{	wordEnd = i;
					wordEndCol = nColumn;
				}
				return {n: wordEnd, nextN: i+1, nextCol: wordEndCol, state: State.ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};

			case C_CR:
				if (!prevIsSpace)
				{	wordEnd = i;
					wordEndCol = nColumn;
				}
				if (i+1>=length || text.charCodeAt(i+1)!=C_LF)
				{	return {n: wordEnd, nextN: i+1, nextCol: wordEndCol, state: State.ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
				}
				return {n: wordEnd, nextN: i+2, nextCol: wordEndCol, state: State.ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};

			case C_TAB:
				if (tabPos == -1)
				{	// TAB occured for the first time
					tabPos = i;
					tabCol = nColumn;
				}
				if (!prevIsSpace)
				{	wordEnd = i;
					wordEndCol = nColumn;
					if (tabEndPos != -1)
					{	// current TAB is after spaces containing TAB and nonspaces
						return {n: wordEnd, nextN: i, nextCol: wordEndCol, state: State.MID_LINE_OR_EOF, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
					}
					prevIsSpace = true;
				}
				if (wrapWidth != Number.MAX_SAFE_INTEGER)
				{	nColumn += tabWidth - nColumn%tabWidth;
				}
				break;

			case C_SPACE:
				if (!prevIsSpace)
				{	wordEnd = i;
					wordEndCol = nColumn;
					if (tabEndPos != -1)
					{	// current space is after spaces containing TAB and nonspaces
						return {n: wordEnd, nextN: i, nextCol: wordEndCol, state: State.MID_LINE_OR_EOF, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
					}
					prevIsSpace = true;
				}
				nColumn++;
				break;


			case C_BEL:
			case C_ESC:
				if (isTerm)
				{	if (c == C_BEL)
					{	continue;
					}
					const pos = skipTermEscapeContinuation(text, i+1);
					if (pos)
					{	i = pos - 1; // will i++ on next iteration
						continue;
					}
				}
				// fallthrough

			default:
				if (nColumn >= wrapWidth)
				{	if (prevIsSpace)
					{	return {n: wordEnd, nextN: i, nextCol: wordEndCol, state: State.WANT_ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
					}
					if (wordEnd > start)
					{	return {n: wordEnd, nextN: wordStart, nextCol: wordEndCol, state: State.WANT_ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
					}
					if (overflowWrap)
					{	return {n: i, nextN: i, nextCol: nColumn, state: State.WANT_ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
					}
				}
				if (prevIsSpace)
				{	prevIsSpace = false;
					wordStart = i;
					if (tabPos >= 0)
					{	// nonspace occured after spaces containing TAB
						tabEndPos = i;
						tabEndCol = nColumn;
					}
				}
				nColumn++;
		}
	}
	if (!prevIsSpace)
	{	wordEnd = i;
		wordEndCol = nColumn;
	}
	return {n: wordEnd, nextN: i, nextCol: wordEndCol, state: State.MID_LINE_OR_EOF, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
}
