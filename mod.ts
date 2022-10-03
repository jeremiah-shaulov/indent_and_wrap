const IS_TAB = -1;

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

const enum State
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
	- If `options.wrapWidth` is set, it inserts `options.endl`, so there're no lines longer than `options.wrapWidth` columns. Columns are calculated with respect to `options.tabWidth` (default 4).
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
	const wrapWidth = options?.wrapWidth || Number.MAX_SAFE_INTEGER;
	const overflowWrap = options?.overflowWrap || false;
	const tabWidth = Math.max(1, Math.min(16, options?.tabWidth || 4));
	const tabsToSpaces = options?.tabsToSpaces || false;
	const endl = options?.endl || '\n';
	const isTerm = options?.mode == 'term';
	
	let commonIndent = '';
	let indentCol = 0;
	let indentNLines = 1;
	if (indent != undefined)
	{	commonIndent = knownCommonIndent ?? findCommonIndent(text, options);
		const {nColumn, nLine} = calcLines(indent, options, 0, indent.length);
		indentCol = nColumn - 1;
		indentNLines = nLine;
	}
	const commonIndentLen = commonIndent.length;
	let commonIndentCol = 0;
	let wantWidth = Number.MAX_SAFE_INTEGER;
	if (wrapWidth != Number.MAX_SAFE_INTEGER)
	{	commonIndentCol = calcLines(commonIndent, options, 0, commonIndent.length).nColumn - 1;
		wantWidth = Math.max(1, wrapWidth - indentCol + commonIndentCol);
	}
	const {length} = text;
	let i = 0;
	let skip = commonIndentLen;
	let minusIndent = 0;
	if (ignoreFirstIndent && indent!=undefined)
	{	skip = precedingSpaceLen(text, 0, isTerm);
		minusIndent = commonIndentCol - (calcLines(text, options, 0, skip).nColumn - 1);
	}
	if (indent == undefined)
	{	indent = '';
	}
	let res = '';
	const lastChar = text.charCodeAt(text.length-1);
	let nLines = lastChar==C_CR || lastChar==C_LF ? 1 : 0;
	let nColumns = 0;
	let nColumn = 0;
	while (i < length)
	{	const {n, nextN, nextCol, state, tabPos, tabEndPos, tabLen} = scanLine(text, i, nColumn, wantWidth-minusIndent, overflowWrap, tabWidth, tabsToSpaces, commonIndentCol, indentCol, isTerm);
		nColumn = nextCol;
		if (n > i+skip)
		{	if (isRect)
			{	const curNColumns = calcLines(text, options, i+skip, n, 1, indentCol+1).nColumn - 1;
				if (curNColumns > nColumns)
				{	nColumns = curNColumns;
				}
			}
			else if (tabEndPos == -1)
			{	res += indent + text.slice(i+skip, n);
			}
			else
			{	res += indent + text.slice(i+skip, tabPos) + ' '.repeat(tabLen) + text.slice(tabEndPos, n);
			}
		}
		nLines += indentNLines;
		i = nextN;
		if (state == State.ENDL)
		{	skip = commonIndentLen;
			minusIndent = 0;
			if (!isRect)
			{	res += endl;
			}
		}
		else
		{	skip = 0;
			minusIndent = commonIndentCol;
			if (state == State.WANT_ENDL)
			{	if (!isRect)
				{	res += endl;
				}
				i = precedingSpaceLen(text, i, isTerm);
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
{	const tabWidth = Math.max(1, Math.min(8, options?.tabWidth || 4));
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
function scanLine(text: string, i: number, nColumn: number, wrapWidth: number, overflowWrap: boolean, tabWidth: number, tabsToSpaces: boolean, removeIndentCol: number, addIndentCol: number, isTerm: boolean)
{	const {length} = text;
	let wordEnd = 0;
	let prevIsSpace = true;
	let tabPos = tabsToSpaces ? -1 : -2; // -2: no count; -1: no TAB occured yet; >=0: tab occured, but no next nonspace occured
	let tabCol = 0;
	let tabEndPos = -1;
	let tabEndCol = 0;
	let nextCol = 0;
	if (tabsToSpaces && wrapWidth==Number.MAX_SAFE_INTEGER)
	{	wrapWidth--; // columns are not counted when wrapWidth == Number.MAX_SAFE_INTEGER
	}
	for (; i<length; i++)
	{	const c = text.charCodeAt(i);
		switch (c)
		{	case C_LF:
				if (prevIsSpace)
				{	// trimEnd
					return {n: wordEnd, nextN: i+1, nextCol: 0, state: State.ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
				}
				return {n: i, nextN: i+1, nextCol: 0, state: State.ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};

			case C_CR:
				if (i+1>=length || text.charCodeAt(i+1)!=C_LF)
				{	if (prevIsSpace)
					{	// trimEnd
						return {n: wordEnd, nextN: i+1, nextCol: 0, state: State.ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
					}
					return {n: i, nextN: i+1, nextCol: 0, state: State.ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
				}
				if (prevIsSpace)
				{	// trimEnd
					return {n: wordEnd, nextN: i+2, nextCol: 0, state: State.ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
				}
				return {n: i, nextN: i+2, nextCol: 0, state: State.ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};

			case C_TAB:
				if (tabPos == -1)
				{	// TAB occured for the first time
					tabPos = i;
					tabCol = nColumn;
				}
				if (wrapWidth != Number.MAX_SAFE_INTEGER)
				{	nextCol = nColumn;
					nColumn += tabWidth - (nColumn<=removeIndentCol ? nColumn : nColumn-removeIndentCol+addIndentCol)%tabWidth;
					if (nColumn > wrapWidth)
					{	if (!prevIsSpace)
						{	wordEnd = i;
						}
						return {n: wordEnd || i, nextN: i, nextCol: 0, state: State.WANT_ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
					}
				}
				if (!prevIsSpace)
				{	if (tabEndPos != -1)
					{	// current TAB is after spaces containing TAB and nonspaces
						return {n: i, nextN: i, nextCol, state: State.MID_LINE_OR_EOF, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
					}
					wordEnd = i;
					prevIsSpace = true;
				}
				break;

			case C_SPACE:
				nColumn++;
				if (nColumn > wrapWidth)
				{	if (!prevIsSpace)
					{	wordEnd = i;
					}
					return {n: wordEnd || i, nextN: i, nextCol: 0, state: State.WANT_ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
				}
				if (!prevIsSpace)
				{	if (tabEndPos != -1)
					{	// current space is after spaces containing TAB and nonspaces
						return {n: i, nextN: i, nextCol: nColumn-1, state: State.MID_LINE_OR_EOF, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
					}
					wordEnd = i;
					prevIsSpace = true;
				}
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
				nColumn++;
				if (nColumn > wrapWidth)
				{	if (wordEnd || overflowWrap)
					{	const n = wordEnd || i;
						return {n, nextN: n, nextCol: 0, state: State.WANT_ENDL, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
					}
				}
				if (prevIsSpace)
				{	prevIsSpace = false;
					if (tabPos >= 0)
					{	// nonspace occured after spaces containing TAB
						tabEndPos = i;
						tabEndCol = nColumn - 1;
					}
				}
		}
	}
	if (prevIsSpace)
	{	// trimEnd
		return {n: wordEnd, nextN: length, nextCol: 0, state: State.MID_LINE_OR_EOF, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
	}
	return {n: length, nextN: length, nextCol: 0, state: State.MID_LINE_OR_EOF, tabPos, tabEndPos, tabLen: tabEndCol-tabCol};
}
