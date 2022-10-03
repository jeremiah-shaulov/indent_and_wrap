# indent_and_wrap: Text utility for Deno
Finds and replaces common indent, and hard-wraps text. Can work on text that contains terminal escape sequences.

# Example

```ts
import {indentAndWrap} from 'https://deno.land/x/indent_and_wrap@v0.0.9/mod.ts';

console.log
(	indentAndWrap
	(	`	Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
		`,
		{wrapWidth: 40, indent: '\t'}
	)
);
```

Result:

```
        Lorem ipsum dolor sit amet,
        consectetur adipiscing elit, sed do
        eiusmod tempor incididunt ut labore
        et dolore magna aliqua.
```

# Exported functions

- [indentAndWrap()](#indentandwrap) - Indent or unindent and wrap text.
- [getTextRect()](#gettextrect) - Calculate dimensions of text rectangle.
- [findCommonIndent()](#findcommonindent) - Scan text string, and find leading space characters, that are common across all lines.
- [calcLines()](#calclines) - Count number of lines in text string, and determine column number after the last character.

## indentAndWrap()

```ts
function indentAndWrap(text: string, options?: IndentAndWrapOptions, knownCommonIndent?: string): string;

type IndentAndWrapOptions =
{	endl?: string;
	indent?: string;
	ignoreFirstIndent?: boolean;
	wrapWidth?: number;
	overflowWrap?: boolean;
	tabWidth?: number;
	tabsToSpaces?: boolean;
	mode?: 'plain' | 'term';
};
```

This function does:
- Replaces new line characters (`\n`, `\r\n` or `\r`) to `options.endl`, or if it's not set to `\n`.
- Removes white space at the end of each line.
- If `options.indent` is set, it determines common indent characters across all lines, and replaces them with `options.indent` string.
This can lead to indent increase or decrease.
If `options.ignoreFirstIndent` is set, will look for common indent starting at second line, so the text can be trimmed.
If you already know the common indent (e.g. you called `findCommonIndent()`), you can provide it as `knownCommonIndent` to save some calculation time.
If `knownCommonIndent` doesn't match the result of `findCommonIndent()`, the behavior is undefined.
- If `options.wrapWidth` is set, it inserts `options.endl`, so there're no lines longer than `options.wrapWidth` columns. Columns are calculated with respect to `options.tabWidth` (default 4).
If `options.overflowWrap` is set, can break long words, that are wider than `options.overflowWrap`.
- If `options.tabsToSpaces` is set, converts tabs to spaces.

## getTextRect()

```ts
function getTextRect(text: string, options?: GetTextRectOptions, knownCommonIndent?: string): {nLines: number, nColumns: number};

type GetTextRectOptions =
{	indent?: string;
	ignoreFirstIndent?: boolean;
	wrapWidth?: number;
	overflowWrap?: boolean;
	tabWidth?: number;
	mode?: 'plain' | 'term';
};
```

This function works the same as `indentAndWrap()`, but it doesn't return resulting text, but it returns number of lines and columns the result occupies.

It only counts columns on non-blank lines.

## findCommonIndent()

```ts
function findCommonIndent(text: string, options?: FindCommonIndentOptions): string;

type FindCommonIndentOptions =
{	ignoreFirstIndent?: boolean;
	mode?: 'plain' | 'term';
};
```

Scan text string, and find leading space characters, that are common across all lines.

If `ignoreFirstIndent` is set, then the leading space on the first line is not counted, so the provided text string can be trimmed.

If `options.mode` is `term`, then terminal escape sequences (like VT100 color codes) can be part of indent.

This function uses fast algorithm that avoids splitting text to lines array.

## calcLines()

```ts
function calcLines(text: string, options?: CalcLinesOptions, from=0, to=Number.MAX_SAFE_INTEGER): {nLine: number, nColumn: number};

type CalcLinesOptions =
{	tabWidth?: number;
	mode?: 'plain' | 'term';
};
```

Count number of lines in text string, and determine column number **after** the last character.

This function only considers text substring from `from` to `to`.
Lines and columns counter starts from provided values: `nLine` and `nColumn`.

If `options.mode` is `term`, skips terminal escape sequences (like VT100 color codes).
