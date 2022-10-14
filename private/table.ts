import {getTextRect, GetTextRectOptions, scanLine, State, DEFAULT_TAB_WIDTH} from "./indent.ts";
import {rgb24} from './deps.ts';

// TODO: overflowWrap
// TODO: table min-height
// TODO: colSpan, rowSpan
// TODO: nested tables

export type Cell =
{	text: string;
	options?: CellOptions;
};
export type TextTableOptions =
{	minWidth?: number;
	maxWidth?: number;
	borderStyle?: BorderStyle;
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
};

export const enum BorderStyle
{	None,
	Solid,
	Double,
}

export const enum TextAlign
{	Left,
	Right,
	Center,
}

export const enum VerticalAlign
{	Top,
	Middle,
	Bottom,
}

export function textTable(rows: Cell[][], options?: TextTableOptions, nColumn=0)
{	const borderStyle = options?.borderStyle ?? BorderStyle.Solid;
	const borderColor = options?.borderColor;
	const endl = options?.endl || '\n';
	const tabWidth = Math.max(1, options?.tabWidth || DEFAULT_TAB_WIDTH);
	const tabsToSpaces = options?.tabsToSpaces || false;
	const isTerm = options?.mode == 'term';

	const {rowHeights, columnWidths} = new TableDim(rows, options);

	// 1. Border
	const borderHChar = borderStyle==BorderStyle.Double ? '═': '─';
	const borderVChar = borderStyle==BorderStyle.Double ? '║': '│';

	const borderTopLeftChar = borderStyle==BorderStyle.Double ? '╔': '┌';
	const borderTopMidChar = borderStyle==BorderStyle.Double ? '╦': '┬';
	const borderTopRightChar = borderStyle==BorderStyle.Double ? '╗': '┐';

	const borderBottomLeftChar = borderStyle==BorderStyle.Double ? '╚': '└';
	const borderBottomMidChar = borderStyle==BorderStyle.Double ? '╩': '┴';
	const borderBottomRightChar = borderStyle==BorderStyle.Double ? '╝': '┘';

	const borderMidLeftChar = borderStyle==BorderStyle.Double ? '╠': '├';
	const borderMidMidChar = borderStyle==BorderStyle.Double ? '╬': '┼';
	const borderMidRightChar = borderStyle==BorderStyle.Double ? '╣': '┤';

	let borderSep = ' ';
	let borderTop = '';
	let borderMid = '';
	let borderBottom = '';
	if (borderStyle)
	{	borderSep = borderVChar;
		for (const cw of columnWidths)
		{	const cellWidth = cw.selectedWidth;
			if (borderTop.length > 1)
			{	borderTop += borderTopMidChar;
				borderMid += borderMidMidChar;
				borderBottom += borderBottomMidChar;
			}
			borderTop += borderHChar.repeat(cellWidth);
			borderMid += borderHChar.repeat(cellWidth);
			borderBottom += borderHChar.repeat(cellWidth);
		}
		borderTop = borderTopLeftChar + borderTop + borderTopRightChar;
		borderMid = borderMidLeftChar + borderMid + borderMidRightChar;
		borderBottom = borderBottomLeftChar + borderBottom + borderBottomRightChar;
		if (borderColor != undefined)
		{	borderSep = rgb24(borderSep, borderColor);
			borderTop = rgb24(borderTop, borderColor);
			borderMid = rgb24(borderMid, borderColor);
			borderBottom = rgb24(borderBottom, borderColor);
		}
		borderTop += endl;
		borderMid += endl;
		borderBottom += endl;
	}

	// 2. Result
	let res = '';

	// cells
	for (let i=0, iEnd=rowHeights.length; i<iEnd; i++)
	{	// border line
		if (borderStyle)
		{	res += i==0 ? borderTop : borderMid;
		}

		const rowHeight = rowHeights[i];
		for (let j=0, jEnd=rowHeight; j<jEnd; j++)
		{	let col = nColumn;
			for (let k=0, kEnd=columnWidths.length; k<kEnd; k++)
			{	if (k || borderStyle)
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
				{	const {paddingLeft, textAlign} = cell;
					if (paddingLeft)
					{	res += ' '.repeat(paddingLeft);
					}
					const {line, nextCol} = cell.getLine(tabWidth, tabsToSpaces, isTerm, col+paddingLeft);
					const pad = cellWidth - nextCol + col;
					switch (textAlign)
					{	case TextAlign.Left:
							res += line;
							res += ' '.repeat(pad);
							break;
						case TextAlign.Right:
							res += ' '.repeat(pad);
							res += line;
							break;
						default:
						{	const l = pad >> 1;
							res += ' '.repeat(l);
							res += line;
							res += ' '.repeat(pad - l);
						}
					}
				}
				col += cellWidth;
			}
			if (borderStyle)
			{	res += borderSep;
			}
			res += endl;
		}
	}

	// bottom border line
	if (borderStyle && rowHeights.length>0)
	{	res += borderBottom;
	}

	// 3. Done
	return res;
}

class TableDim
{	columnWidths = new Array<ColumnWidth>();
	rowHeights = new Array<number>();

	private tableHeight = -1;

	constructor(rows: Cell[][], options: TextTableOptions|undefined)
	{	const borderStyle = options?.borderStyle ?? BorderStyle.Solid;
		const minWidth = options?.minWidth || 0;
		let maxWidth = options?.maxWidth ?? Number.MAX_SAFE_INTEGER;
		const tabWidth = Math.max(1, options?.tabWidth || DEFAULT_TAB_WIDTH);
		const mode = options?.mode;

		if (maxWidth < minWidth)
		{	maxWidth = minWidth;
		}
		let isUpdated = false;

		// Populate columnWidths with columns and rows
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
			else
			{	// If available max width doesn't exceed the desired max width
				if (canMaxWidth <= maxWidth)
				{	for (const cw of columnWidths)
					{	cw.selectedWidth = cw.getForWidth(Math.min(cw.maxWidth, maxWidth)).nColumns;
					}
				}
				else
				{	// Select optimal widths for each column
					this.updateTableHeight();
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
L:					while (true)
					{	const {tableHeight} = this;
						for (let a=1; a<=add; a++)
						{	let si = -1;
							let h = tableHeight;
							// find column that becomes lower if adding "a" width
							for (let i=columnWidths.length-1; i>=0; i--)
							{	const cw = columnWidths[i];
								this.updateTableHeightIfAddingColumnWidth(cw, a);
								if (this.tableHeight < h)
								{	si = i;
									h = this.tableHeight;
								}
							}
							// found?
							if (si != -1)
							{	const cw = columnWidths[si];
								cw.selectedWidth += a;
								add -= a;
								if (si != 0)
								{	this.updateTableHeight();
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
		}
		if (!isUpdated)
		{	this.updateTableHeight();
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
		{	this.updateTableHeight();
		}
		cw.selectedWidth -= add;
	}

	updateTableHeight()
	{	const {columnWidths} = this;
		const cw = columnWidths[0];
		if (cw)
		{	const {nLines} = cw.getForWidth(cw.selectedWidth);
			for (let i=0, iEnd=nLines.length; i<iEnd; i++)
			{	this.rowHeights[i] = nLines[i];
			}
			for (let j=1, jEnd=columnWidths.length; j<jEnd; j++)
			{	const cw = columnWidths[j];
				const {nLines} = cw.getForWidth(cw.selectedWidth);
				for (let i=0, iEnd=nLines.length; i<iEnd; i++)
				{	if (nLines[i] > this.rowHeights[i])
					{	this.rowHeights[i] = nLines[i];
					}
				}
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
				let {nColumns, nLines} = getTextRect(row.text, this.getTextRectOptions, '');
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
{	text: string;

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

	private columnWidth = 0;
	private addPaddingTop = 0;
	private i = 0;

	constructor(cell: Cell)
	{	const {text, options} = cell;
		this.text = text;
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
	}

	setCellDim(columnWidth: number, rowHeight: number, cellHeight: number)
	{	this.columnWidth = columnWidth;
		switch (this.verticalAlign)
		{	case VerticalAlign.Top:
				this.addPaddingTop = this.paddingTop;
				break;
			case VerticalAlign.Bottom:
				this.addPaddingTop = this.paddingTop + rowHeight - cellHeight;
				break;
			default:
				this.addPaddingTop = Math.max(this.paddingTop, (rowHeight - cellHeight + this.paddingTop + this.paddingBottom) >> 1);
		}
	}

	getLine(tabWidth: number, tabsToSpaces: boolean, isTerm: boolean, nColumn: number)
	{	if (--this.addPaddingTop >= 0)
		{	return {line: '', nextCol: nColumn};
		}
		let {i, text} = this;
		const {length} = text;
		let line = '';
		while (i < length)
		{	const {n, nextN, nextCol, state, tabPos, tabEndPos, tabLen} = scanLine(text, i, nColumn, nColumn+this.columnWidth, false, tabWidth, tabsToSpaces, isTerm);
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
