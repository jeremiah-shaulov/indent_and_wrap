import {getTextRect, GetTextRectOptions, scanLine, State, DEFAULT_TAB_WIDTH} from "./indent.ts";
import {rgb24, bgRgb24} from './deps.ts';

// TODO: overflowWrap
// TODO: table min-height
// TODO: colSpan, rowSpan
// TODO: border-width > 1

const C_SPACE = ' '.charCodeAt(0);

export type Cell =
{	content: string|TextTable;
	options?: CellOptions;
};
export type TextTableOptions =
{	minWidth?: number;
	maxWidth?: number;
	borderStyle?: BorderStyle;
	borderWidth?: number;
	borderColor?: number | {r: number, g: number, b: number};

	endl?: string;
	tabWidth?: number;
	tabsToSpaces?: boolean;
	mode?: 'plain' | 'term';
};
export type CellOptions =
{	textAlign?: TextAlign;
	verticalAlign?: VerticalAlign;
	nowrap?: boolean;
	minWidth?: number;
	maxWidth?: number;
	minHeight?: number;
	paddingTop?: number;
	paddingRight?: number;
	paddingBottom?: number;
	paddingLeft?: number;
	backgroundColor?: number | {r: number, g: number, b: number};
};

export const enum TextAlign
{	Left,
	Right,
	Center,
	Justify,
}

export const enum VerticalAlign
{	Top,
	Middle,
	Bottom,
}

export const enum BorderStyle
{	// Options:

	/**	No border, and columns are conjuncted
	 **/
	NoneNoGap,

	/**	No border, but columns are separated with 1-space gap.
	 **/
	None,

	/**	Single-lined border.
	 **/
	Solid,

	/**	Double-lined border.
	 **/
	Double,

	/**	Single-lined border with round corners.
	 **/
	SolidRound,

	/**	Dashed.
	 **/
	Dashed,
}

const enum Border
{	V, TopH, MidH, BottomH, TopLeft, TopMid, TopRight, MidLeft, MidMid, MidRight, BottomLeft, BottomMid, BottomRight,
}
const BORDERS_THIN =
[	'',              // BorderStyle.NoneNoGap
	'',              // BorderStyle.None
	'│───┌┬┐├┼┤└┴┘', // BorderStyle.Solid
	'║═══╔╦╗╠╬╣╚╩╝', // BorderStyle.Double
	'│───╭┬╮├┼┤╰┴╯', // BorderStyle.SolidRound
	'┊╌╌╌┌┬┐├┼┤└┴┘', // BorderStyle.Dashed
];
const BORDERS_MEDIUM =
[	'',              // BorderStyle.NoneNoGap
	'',              // BorderStyle.None
	'┃━━━┏┳┓┣╋┫┗┻┛', // BorderStyle.Solid
	'┃━━━┏┳┓┣╋┫┗┻┛', // BorderStyle.Double (not supported, same as solid)
	'┃━━━┏┳┓┣╋┫┗┻┛', // BorderStyle.SolidRound (not supported, same as solid)
	'┋╍╍╍┏┳┓┣╋┫┗┻┛', // BorderStyle.Dashed
];
const BORDERS_THICK =
[	'',              // BorderStyle.NoneNoGap
	'',              // BorderStyle.None
	'█▄▄▀▄▄▄███▀▀▀', // BorderStyle.Solid
	'█▄▄▀▄▄▄███▀▀▀', // BorderStyle.Double (not supported, same as solid)
	'█▄▄▀▂▄▂███▔▀▔', // BorderStyle.SolidRound
	'▖▖▖▘▖▖▖▖▖▖▘▘▘', // BorderStyle.Dashed
];

export function textTable(rows: Cell[][], options?: TextTableOptions, nColumn=0)
{	return new TextTable(rows, options).toString(nColumn);
}

export class TextTable
{	#borderStyle: BorderStyle;
	#borderWidth: number;
	#borderColorBegin = '';
	#borderColorEnd = '';
	#minWidth: number;
	#maxWidth: number;
	#endl: string;
	#tabWidth: number;
	#tabsToSpaces: boolean;
	#mode: 'plain'|'term'|undefined;

	#optionsCopied = false;
	#dim: TableDim;
	#dimCalced = false;

	#lastResNColumn = NaN;
	#lastRes = '';

	#lastTextRectNLines = -1;
	#lastTextRectNColumns = -1;
	#lastTextRectMaxWidth = -1;
	#lastTextRectAddedSpace = -1;

	constructor(rows: Cell[][], options?: TextTableOptions)
	{	const borderColor = options?.borderColor;
		this.#borderWidth = Math.max(0, options?.borderWidth ?? 0.125);
		this.#borderStyle = this.#borderWidth==0 ? BorderStyle.NoneNoGap : options?.borderStyle ?? BorderStyle.Solid;
		this.#minWidth = options?.minWidth || 0;
		this.#maxWidth = options?.maxWidth ?? Number.MAX_SAFE_INTEGER;
		this.#endl = options?.endl || '\n';
		this.#tabWidth = Math.max(1, options?.tabWidth || DEFAULT_TAB_WIDTH);
		this.#tabsToSpaces = options?.tabsToSpaces || false;
		this.#mode = borderColor!=undefined ? 'term' : options?.mode;
		this.#dim = new TableDim(rows, this.#tabWidth, this.#mode);
		if (borderColor != undefined)
		{	const beginEnd = rgb24('*', borderColor).split('*');
			this.#borderColorBegin = beginEnd[0];
			this.#borderColorEnd = beginEnd[1];
		}
	}

	#copyOptionsToChildren()
	{	if (!this.#optionsCopied)
		{	this.#optionsCopied = true;
			for (const cw of this.#dim.columnWidths)
			{	for (const cell of cw.rows)
				{	if (cell.backgroundColorBegin)
					{	this.#mode = 'term';
					}
					if (cell.content instanceof TextTable)
					{	// Copy parent to child
						cell.content.#endl = this.#endl;
						cell.content.#tabWidth = this.#tabWidth;
						cell.content.#tabsToSpaces = this.#tabsToSpaces;
						if (this.#mode === 'term')
						{	cell.content.#mode = 'term';
						}
						// Do children
						cell.content.#copyOptionsToChildren();
						// Copy child to parent
						if (cell.content.#mode === 'term')
						{	this.#mode = 'term';
						}
					}
				}
			}
		}
	}

	#getDim()
	{	if (!this.#dimCalced)
		{	this.#dimCalced = true;
			this.#dim.calc(this.#borderStyle, this.#minWidth, this.#maxWidth);
		}
		return this.#dim;
	}

	toString(nColumn=0)
	{	if (this.#lastResNColumn == nColumn)
		{	return this.#lastRes;
		}

		this.#copyOptionsToChildren();

		const borderStyle = this.#borderStyle;
		const borderWidth = this.#borderWidth;
		const borderColorBegin = this.#borderColorBegin;
		const borderColorEnd = this.#borderColorEnd;
		const endl = this.#endl;
		const tabWidth = this.#tabWidth;
		const tabsToSpaces = this.#tabsToSpaces;
		const mode = this.#mode;
		const isTerm = mode == 'term';

		const {rowHeights, columnWidths} = this.#getDim();

		// 1. Border
		let borderSep = ' ';
		let borderTop = '';
		let borderMid = '';
		let borderBottom = '';
		if (borderStyle > BorderStyle.None)
		{	const selectedBorder = (borderWidth>=2/3 ? BORDERS_THICK : borderWidth>=1/3 ? BORDERS_MEDIUM : BORDERS_THIN)[borderStyle];
			borderSep = selectedBorder[Border.V];
			for (const cw of columnWidths)
			{	const cellWidth = cw.selectedWidth;
				if (borderTop.length > 0)
				{	borderTop += selectedBorder[Border.TopMid];
					borderMid += selectedBorder[Border.MidMid];
					borderBottom += selectedBorder[Border.BottomMid];
				}
				borderTop += selectedBorder[Border.TopH].repeat(cellWidth);
				borderMid += selectedBorder[Border.MidH].repeat(cellWidth);
				borderBottom += selectedBorder[Border.BottomH].repeat(cellWidth);
			}
			borderTop = selectedBorder[Border.TopLeft] + borderTop + selectedBorder[Border.TopRight];
			borderMid = selectedBorder[Border.MidLeft] + borderMid + selectedBorder[Border.MidRight];
			borderBottom = selectedBorder[Border.BottomLeft] + borderBottom + selectedBorder[Border.BottomRight];
			if (borderColorBegin)
			{	borderSep = borderColorBegin + borderSep + borderColorEnd;
				borderTop = borderColorBegin + borderTop + borderColorEnd;
				borderMid = borderColorBegin + borderMid + borderColorEnd;
				borderBottom = borderColorBegin + borderBottom + borderColorEnd;
			}
			borderTop += endl;
			borderMid += endl;
			borderBottom += endl;
		}

		// 2. Result
		let res = '';
		const wordIndex = new Array<number>();

		// cells
		for (let i=0, iEnd=rowHeights.length; i<iEnd; i++)
		{	// border line
			if (borderStyle > BorderStyle.None)
			{	res += i==0 ? borderTop : borderMid;
			}

			const rowHeight = rowHeights[i];
			for (let j=0, jEnd=rowHeight; j<jEnd; j++)
			{	let col = nColumn;
				for (let k=0, kEnd=columnWidths.length; k<kEnd; k++)
				{	if ((k || borderStyle>BorderStyle.None) && borderStyle!=BorderStyle.NoneNoGap)
					{	res += borderSep;
						col++;
					}
					const cw = columnWidths[k];
					const cellWidth = cw.selectedWidth;
					const cell = cw.rows[i];
					if (!cell)
					{	res += ' '.repeat(cellWidth);
					}
					else
					{	const {paddingLeft, paddingRight, textAlign, backgroundColorBegin, backgroundColorEnd} = cell;
						if (paddingLeft)
						{	res += ' '.repeat(paddingLeft);
						}
						res += backgroundColorBegin;
						const {line, nextCol} = cell.getLine(tabWidth, tabsToSpaces || textAlign!=TextAlign.Left, isTerm, col+paddingLeft);
						let pad = cellWidth - nextCol + col;
						switch (textAlign)
						{	case TextAlign.Left:
								res += line;
								res += ' '.repeat(pad);
								break;
							case TextAlign.Right:
								res += ' '.repeat(pad - paddingRight);
								res += line;
								res += ' '.repeat(paddingRight);
								break;
							case TextAlign.Center:
							{	const l = (pad - paddingRight) >> 1;
								res += ' '.repeat(l);
								res += line;
								res += ' '.repeat(pad - l);
								break;
							}
							default: // TextAlign.Justify
								if (pad == 0)
								{	res += line;
								}
								else
								{	const wordIndexLength = wordsOnLine(line, wordIndex);
									const add = pad / wordIndexLength;
									let acc = 0;
									let pos = wordIndex[0];
									res += line.slice(0, pos);
									for (let w=1; w<wordIndexLength; w++)
									{	acc += add;
										if (acc >= 1)
										{	const curAdd = Math.trunc(acc);
											res += ' '.repeat(curAdd);
											acc -= curAdd;
											pad -= curAdd;
										}
										res += line.slice(pos, wordIndex[w]);
										pos = wordIndex[w];
									}
									res += ' '.repeat(pad);
									res += line.slice(pos);
								}
						}
						res += backgroundColorEnd;
					}
					col += cellWidth;
				}
				if (borderStyle > BorderStyle.None)
				{	res += borderSep;
				}
				res += endl;
			}
		}

		// bottom border line
		if (borderStyle>BorderStyle.None && rowHeights.length>0)
		{	res += borderBottom;
		}

		// 3. Done
		this.#lastResNColumn = nColumn;
		this.#lastRes = res;
		return res;
	}

	setMaxWidth(maxWidth: number)
	{	if (maxWidth != this.#minWidth)
		{	this.#minWidth = maxWidth;
			this.#dimCalced = false;
		}
		return this;
	}

	getTextRect()
	{	if (this.#lastTextRectNLines != -1)
		{	if (this.#maxWidth >= this.#lastTextRectMaxWidth-this.#lastTextRectAddedSpace && this.#maxWidth <= this.#lastTextRectMaxWidth)
			{	return {nLines: this.#lastTextRectNLines, nColumns: this.#lastTextRectNColumns};
			}
		}

		this.#copyOptionsToChildren();

		const {tableHeight, tableWidth, rowHeights, columnWidths, addedSpace} = this.#getDim();

		let nLines = tableHeight;
		let nColumns = tableWidth;
		if (this.#borderStyle > BorderStyle.None)
		{	nLines += rowHeights.length + 1;
			nColumns += columnWidths.length + 1;
		}
		else if (this.#borderStyle != BorderStyle.NoneNoGap)
		{	nColumns += columnWidths.length - 1;
		}

		this.#lastTextRectNLines = nLines;
		this.#lastTextRectNColumns = nColumns;
		this.#lastTextRectMaxWidth = this.#maxWidth;
		this.#lastTextRectAddedSpace = addedSpace;

		return {nLines, nColumns};
	}
}

class TableDim
{	/**	ColumnWidth objects for each column, each containing "selectedWidth".
	 **/
	columnWidths = new Array<ColumnWidth>();

	/**	Height of each row (without border)
	 **/
	rowHeights = new Array<number>();

	/**	Without border.
	 **/
	tableHeight = 0;

	/**	Without border.
	 **/
	tableWidth = 0;

	/**	How many spaces were added to columns. For maxWidth less by this value, table will remain the same height.
	 **/
	addedSpace = 0;

	constructor(rows: Cell[][], tabWidth: number, mode: 'plain'|'term'|undefined)
	{	// Populate columnWidths with columns and rows
		const {columnWidths} = this;
		for (const tr of rows)
		{	for (let i=0, iEnd=tr.length; i<iEnd; i++)
			{	let cw = columnWidths[i];
				if (!cw)
				{	cw = new ColumnWidth(tabWidth, mode);
					columnWidths[i] = cw;
				}
				cw.addRow(tr[i]);
			}
		}
	}

	calc(borderStyle: BorderStyle, minWidth: number, maxWidth: number)
	{	const {columnWidths} = this;
		if (maxWidth < minWidth)
		{	maxWidth = minWidth;
		}
		let isUpdated = false;

		// Calc min width
		let canMinWidth = 0;
		for (const cw of columnWidths)
		{	const {nColumns} = cw.getForWidth(cw.minWidth);
			cw.selectedWidth = nColumns;
			canMinWidth += nColumns + 1; // plus border
		}
		canMinWidth += borderStyle==BorderStyle.None ? -1 : +1;
		// If available min width is greater than desired maxWidth, must overflow
		// Else...
		if (canMinWidth < maxWidth)
		{	// Calc max width
			let canMaxWidth = 0;
			for (const cw of columnWidths)
			{	canMaxWidth += cw.getForWidth(Math.min(cw.maxWidth, maxWidth)).nColumns + 1; // plus border
			}
			canMaxWidth += borderStyle==BorderStyle.None ? -1 : +1;
			// If available max width is less than desired minWidth, must distribute free space between columns
			if (canMaxWidth < minWidth)
			{	const add = minWidth - canMaxWidth;
				this.addedSpace = add;
				const add1 = Math.trunc(add / columnWidths.length);
				const rem = add % columnWidths.length;
				for (let i=0, iEnd=columnWidths.length; i<iEnd; i++)
				{	const cw = columnWidths[i];
					let {nColumns} = cw.getForWidth(Math.min(cw.maxWidth, maxWidth));
					if (iEnd-i <= rem)
					{	nColumns++;
					}
					cw.selectedWidth = nColumns + add1;
				}
			}
			// If available max width doesn't exceed the desired max width
			else if (canMaxWidth <= maxWidth)
			{	for (const cw of columnWidths)
				{	cw.selectedWidth = cw.getForWidth(Math.min(cw.maxWidth, maxWidth)).nColumns;
				}
			}
			// Select optimal widths for each column
			else
			{	this.updateWidthHeight();
				// Calc table width if selecting average width of each column
				let baseWidth = 0;
				for (const cw of columnWidths)
				{	const avg = cw.getForWidth(Math.min(cw.maxWidth, maxWidth)).nColumns - cw.getForWidth(cw.minWidth).nColumns;
					cw.selectedWidth = cw.getForWidth(avg).nColumns;
					baseWidth += cw.selectedWidth + 1; // plus border
				}
				baseWidth += borderStyle==BorderStyle.None ? -1 : +1;
				// Start from either average or minimal width of each column
				if (baseWidth > maxWidth)
				{	// minimal
					baseWidth = canMinWidth;
					for (const cw of columnWidths)
					{	cw.selectedWidth = cw.getForWidth(cw.minWidth).nColumns;
					}
				}
				let add = maxWidth - baseWidth;
				this.addedSpace = add;
L:				while (true)
				{	const {tableHeight} = this;
					for (let a=1; a<=add; a++)
					{	let si = -1;
						let h = tableHeight;
						// find column that becomes lower if adding "a" width
						for (let i=columnWidths.length-1; i>=0; i--)
						{	const cw = columnWidths[i];
							this.updateTableHeightIfAddingColumnWidth(cw, a);
							if (tableHeight < h)
							{	si = i;
								h = tableHeight;
							}
						}
						// found?
						if (si != -1)
						{	const cw = columnWidths[si];
							cw.selectedWidth += a;
							add -= a;
							if (si != 0)
							{	this.updateWidthHeight();
							}
							continue L;
						}
					}
					break;
				}
				if (add > 0)
				{	const add1 = Math.trunc(add / columnWidths.length);
					const rem = add % columnWidths.length;
					for (let i=0, iEnd=columnWidths.length; i<iEnd; i++)
					{	let nColumns = columnWidths[i].selectedWidth;
						if (iEnd-i <= rem)
						{	nColumns++;
						}
						columnWidths[i].selectedWidth = nColumns + add1;
					}
				}
				isUpdated = true;
			}
		}
		if (!isUpdated)
		{	this.updateWidthHeight();
		}
		// Set each cell height and vertical margin
		for (const cw of columnWidths)
		{	const {nLines} = cw.getForWidth(cw.selectedWidth);
			for (let i=0, iEnd=nLines.length; i<iEnd; i++)
			{	cw.rows[i].setCellDim(cw.selectedWidth, this.rowHeights[i], nLines[i]);
			}
		}
	}

	updateTableHeightIfAddingColumnWidth(cw: ColumnWidth, add: number)
	{	const {selectedWidth} = cw;
		cw.selectedWidth += add;
		const {nColumns} = cw.getForWidth(cw.selectedWidth);
		if (nColumns != selectedWidth)
		{	this.updateWidthHeight();
		}
		cw.selectedWidth -= add;
	}

	updateWidthHeight()
	{	const {columnWidths} = this;
		const cw = columnWidths[0];
		if (cw)
		{	const {nLines} = cw.getForWidth(cw.selectedWidth);
			for (let i=0, iEnd=nLines.length; i<iEnd; i++)
			{	this.rowHeights[i] = nLines[i];
			}
			this.tableWidth = cw.selectedWidth;
			for (let j=1, jEnd=columnWidths.length; j<jEnd; j++)
			{	const cw = columnWidths[j];
				const {nLines} = cw.getForWidth(cw.selectedWidth);
				for (let i=0, iEnd=nLines.length; i<iEnd; i++)
				{	if (nLines[i] > this.rowHeights[i])
					{	this.rowHeights[i] = nLines[i];
					}
				}
				this.tableWidth += cw.selectedWidth;
			}
			this.tableHeight = 0;
			for (const l of this.rowHeights)
			{	this.tableHeight += l;
			}
		}
	}
}

class ColumnWidth
{	rows = new Array<ColumnCell>();
	minWidth = 1;
	maxWidth = Number.MAX_SAFE_INTEGER;
	selectedWidth = 0;

	private getTextRectOptions: GetTextRectOptions;
	private perWidth = new Map<number, {nColumns: number, nLines: number[]}>();

	constructor(tabWidth: number, mode: 'plain'|'term'|undefined)
	{	this.getTextRectOptions = {mode, tabWidth, wrapWidth: 0};
	}

	addRow(cell: Cell)
	{	const cc = new ColumnCell(cell);
		if (cc.minWidth > this.minWidth)
		{	this.minWidth = cc.minWidth;
		}
		if (cc.maxWidth < this.maxWidth)
		{	this.maxWidth = cc.maxWidth;
		}
		this.rows.push(cc);
	}

	getForWidth(wrapWidth: number)
	{	let rec = this.perWidth.get(wrapWidth);
		if (!rec)
		{	for (const row of this.rows)
			{	this.getTextRectOptions.wrapWidth = row.nowrap ? Number.MAX_SAFE_INTEGER : wrapWidth - row.paddingLeft - row.paddingRight;
				let {nColumns, nLines} = typeof(row.content)=='string' ? getTextRect(row.content, this.getTextRectOptions, '') : row.content.setMaxWidth(this.getTextRectOptions.wrapWidth).getTextRect();
				if (nColumns < row.minWidth)
				{	nColumns = row.minWidth;
				}
				nColumns += row.paddingLeft + row.paddingRight;
				if (nLines < row.minHeight)
				{	nLines = row.minHeight;
				}
				nLines += row.paddingTop + row.paddingBottom;
				if (!rec)
				{	rec = {nColumns, nLines: [nLines]};
				}
				else
				{	if (nColumns > rec.nColumns)
					{	rec.nColumns = nColumns;
					}
					rec.nLines.push(nLines);
				}
			}
			if (!rec)
			{	rec = {nColumns: 0, nLines: []};
			}
			this.perWidth.set(wrapWidth, rec);
		}
		return rec;
	}
}

class ColumnCell
{	content: string|TextTable;

	textAlign: TextAlign;
	verticalAlign: VerticalAlign;
	nowrap: boolean;
	minWidth: number;
	maxWidth: number;
	minHeight: number;
	paddingTop: number;
	paddingRight: number;
	paddingBottom: number;
	paddingLeft: number;
	backgroundColorBegin = '';
	backgroundColorEnd = '';

	private columnWidth = 0;
	private addPaddingTop = 0;
	private i = 0;

	constructor(cell: Cell)
	{	const {content, options} = cell;
		this.content = content;
		this.textAlign = options?.textAlign ?? TextAlign.Left;
		this.verticalAlign = options?.verticalAlign ?? VerticalAlign.Middle;
		this.nowrap = options?.nowrap || false;
		this.minWidth = options?.minWidth || 0;
		this.maxWidth = options?.maxWidth ?? Number.MAX_SAFE_INTEGER;
		this.minHeight = options?.minHeight ?? 0;
		this.paddingTop = options?.paddingTop || 0;
		this.paddingRight = options?.paddingRight || 0;
		this.paddingBottom = options?.paddingBottom || 0;
		this.paddingLeft = options?.paddingLeft || 0;
		const backgroundColor = options?.backgroundColor;
		if (backgroundColor != undefined)
		{	const beginEnd = bgRgb24('*', backgroundColor).split('*');
			this.backgroundColorBegin = beginEnd[0];
			this.backgroundColorEnd = beginEnd[1];
		}
	}

	setCellDim(columnWidth: number, rowHeight: number, cellHeight: number)
	{	this.columnWidth = columnWidth;
		switch (this.verticalAlign)
		{	case VerticalAlign.Top:
				this.addPaddingTop = this.paddingTop;
				break;
			case VerticalAlign.Bottom:
				this.addPaddingTop = rowHeight - (cellHeight - this.paddingTop);
				break;
			default:
				this.addPaddingTop = this.paddingTop + (((rowHeight-this.paddingTop-this.paddingBottom) - (cellHeight-this.paddingTop-this.paddingBottom)) >> 1);
		}
	}

	getLine(tabWidth: number, tabsToSpaces: boolean, isTerm: boolean, nColumn: number)
	{	if (--this.addPaddingTop >= 0)
		{	return {line: '', nextCol: nColumn};
		}
		let {i, content} = this;
		const text = typeof(content)=='string' ? content : content.toString(nColumn);
		const {length} = text;
		let line = '';
		while (i < length)
		{	const {n, nextN, nextCol, state, tabPos, tabEndPos, tabLen} = scanLine(text, i, nColumn, nColumn+this.columnWidth-this.paddingLeft-this.paddingRight, false, tabWidth, tabsToSpaces, isTerm);
			if (n > i)
			{	if (tabEndPos == -1)
				{	line += text.slice(i, n);
				}
				else
				{	line += text.slice(i, tabPos) + ' '.repeat(tabLen) + text.slice(tabEndPos, n);
				}
			}
			i = nextN;
			nColumn = nextCol;
			if (state != State.MID_LINE_OR_EOF)
			{	break;
			}
		}
		this.i = i;
		return {line, nextCol: nColumn};
	}
}

function wordsOnLine(text: string, wordIndex: number[])
{	let wordIndexLength = 0;
	for (let i=0, iEnd=text.length; i<iEnd; i++)
	{	if (text.charCodeAt(i) == C_SPACE)
		{	for (; i<iEnd; i++)
			{	if (text.charCodeAt(i) != C_SPACE)
				{	wordIndex[wordIndexLength++] = i - 1;
					break;
				}
			}
		}
	}
	return wordIndexLength;
}
