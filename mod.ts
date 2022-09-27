const C_SPACE = ' '.charCodeAt(0);
const C_TAB = '\t'.charCodeAt(0);
const C_CR = '\r'.charCodeAt(0);
const C_LF = '\n'.charCodeAt(0);

export type IndentAndWrapOptions =
{	indent?: string;
	ignoreFirstIndent?: boolean;
	wrapWidth?: number;
	tabWidth?: number;
	endl?: string;
};

/**	Count number of lines in text string, and determine column number of the last character.
	This function only considers text substring from `from` to `to`.
 **/
export function calcLines(text: string, from=0, to=Number.MAX_SAFE_INTEGER, tabWidth=4)
{	if (to > text.length)
	{	to = text.length;
	}
	let nLine = 1;
	let nColumn = 0;
	for (; from<to; from++)
	{	const c = text.charCodeAt(from);
		if (c == C_LF)
		{	nColumn = 0;
			nLine++;
		}
		else if (c == C_CR)
		{	if (text.charCodeAt(from+1) === C_LF)
			{	from++;
			}
			nColumn = 0;
			nLine++;
		}
		else if (c == C_TAB)
		{	nColumn += tabWidth - nColumn%tabWidth;
		}
		else
		{	nColumn++;
		}
	}
	return {nLine, nColumn: nColumn+1};
}

/**	Scan text string, and find leading space characters, that are common across all lines.
	If `ignoreFirstIndent` is set, then the leading space on the first line is not counted, so the provided text string can be trimmed.
	This function uses fast algorithm that avoids splitting text to lines array.
 **/
export function findCommonIndent(text: string, ignoreFirstIndent=false)
{	const {length} = text;
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
		{	break;
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
		while (i<length && ((c = text.charCodeAt(i))==C_SPACE || c==C_TAB))
		{	i++;
		}
		// if it was not a blank line, update `commonTo`
		if (i<length && (c = text.charCodeAt(i))!=C_CR && c!=C_LF)
		{	commonTo = j;
		}
	}
	// 4. Done
	return text.slice(commonFrom, commonTo);
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
{	let indent = options?.indent;
	const ignoreFirstIndent = options?.ignoreFirstIndent || false;
	const wrapWidth = options?.wrapWidth || 0;
	const tabWidth = Math.max(1, Math.min(8, options?.tabWidth || 4));
	const endl = options?.endl || '\n';
	
	let commonIndent = '';
	if (indent != undefined)
	{	commonIndent = knownCommonIndent ?? findCommonIndent(text, ignoreFirstIndent);
	}
	const commonIndentLen = commonIndent.length;
	let commonIndentCol = 0;
	let wantWidth = 0;
	if (wrapWidth != 0)
	{	commonIndentCol = calcLines(commonIndent, 0, commonIndent.length, tabWidth).nColumn - 1;
		wantWidth = Math.max(1, wrapWidth - (indent==undefined ? 0 : calcLines(indent, 0, indent.length, tabWidth).nColumn - 1) + commonIndentCol);
	}
	const {length} = text;
	let i = 0;
	let skip = commonIndentLen;
	let minusIndent = 0;
	if (ignoreFirstIndent && indent!=undefined)
	{	skip = precedingSpaceLen(text);
		minusIndent = commonIndentCol - (calcLines(text, 0, skip, tabWidth).nColumn - 1);
	}
	if (indent == undefined)
	{	indent = '';
	}
	let res = '';
	while (i < length)
	{	const {n, endlLen, isBlankLine} = scanLine(text, i, wantWidth-minusIndent, tabWidth);
		if (!isBlankLine)
		{	res += indent + text.slice(i+skip, n-endlLen);
		}
		i = n;
		if (endlLen != 0)
		{	skip = commonIndentLen;
			minusIndent = 0;
			res += endl;
		}
		else
		{	skip = 0;
			minusIndent = commonIndentCol;
			if (n < length)
			{	res += endl;
				i = precedingSpaceLen(text, i);
			}
		}
	}
	return res;
}

function precedingSpaceLen(text: string, i=0)
{	const {length} = text;
	let c = 0;
	while (i<length && ((c = text.charCodeAt(i))==C_SPACE || c==C_TAB))
	{	i++;
	}
	return i;
}

/**	Returns position where next line begins, and length of line-break characters at the end of the skipped line.
 **/
function scanLine(text: string, i: number, wrapWidth: number, tabWidth: number)
{	const {length} = text;
	let col = 0;
	let wordEnd = 0;
	let prevIsSpace = true;
	for (; i<length; i++)
	{	const c = text.charCodeAt(i);
		if (c == C_LF)
		{	return {n: i+1, endlLen: 1, isBlankLine: wordEnd==0 && prevIsSpace};
		}
		if (c == C_CR)
		{	i++;
			if (i>=length || text.charCodeAt(i)!=C_LF)
			{	return {n: i, endlLen: 1, isBlankLine: wordEnd==0 && prevIsSpace};
			}
			return {n: i+1, endlLen: 2, isBlankLine: wordEnd==0 && prevIsSpace};
		}
		const isSpace = c==C_SPACE || c==C_TAB;
		if (isSpace && !prevIsSpace)
		{	wordEnd = i;
		}
		if (wrapWidth > 0)
		{	col += c!=C_TAB ? 1 : tabWidth - col%tabWidth;
			if (col > wrapWidth)
			{	return {n: wordEnd || i, endlLen: 0, isBlankLine: wordEnd==0 && prevIsSpace};
			}
		}
		prevIsSpace = isSpace;
	}
	return {n: length, endlLen: 0, isBlankLine: wordEnd==0 && prevIsSpace};
}
