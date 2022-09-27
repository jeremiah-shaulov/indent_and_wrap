# indent_and_wrap: Text utility for Deno
Finds and replaces common indent in text, and hard-wraps text.

# Example

```ts
import {indentAndWrap} from 'https://deno.land/x/indent_and_wrap@v0.0.1/mod.ts';
```

# Exported symbols

- [calcLines()](#calclines) - Count number of lines in text string, and determine column number of the last character.
- [findCommonIndent()](#findcommonindent) - Scan text string, and find leading space characters, that are common across all lines.
- [indentAndWrap()](#indentandwrap) - Indent or unindent and wrap text.
- [IndentAndWrapOptions](#indentandwrap)

# calcLines()

```ts
function calcLines(text: string, from=0, to=Number.MAX_SAFE_INTEGER, tabWidth=4)
```

Count number of lines in text string, and determine column number of the last character.

This function only considers text substring from `from` to `to`.

# findCommonIndent()

```ts
function findCommonIndent(text: string, ignoreFirstIndent=false)
```

Scan text string, and find leading space characters, that are common across all lines.

If `ignoreFirstIndent` is set, then the leading space on the first line is not counted, so the provided text string can be trimmed.

This function uses fast algorithm that avoids splitting text to lines array.

# indentAndWrap()

```ts
function indentAndWrap(text: string, options?: IndentAndWrapOptions, knownCommonIndent?: string)

type IndentAndWrapOptions =
{	indent?: string;
	ignoreFirstIndent?: boolean;
	wrapWidth?: number;
	tabWidth?: number;
	endl?: string;
};
```

This function does:
- Replaces new line characters (`\n`, `\r\n` or `\r`) to `options.endl`, or if it's not set to `\n`.
- If `options.indent` is set, it determines common indent characters across all lines, and replaces them with `options.indent` string.
This can lead to indent increase or decrease.
If `options.ignoreFirstIndent` is set, will look for common indent starting at second line, so the text can be trimmed.
If you already know the common indent (e.g. you called `findCommonIndent()`), you can provide it as `knownCommonIndent` to save some calculation time.
If `knownCommonIndent` doesn't match the result of `findCommonIndent()`, the behavior is undefined.
- If `options.wrapWidth` is set, it inserts `options.endl`, so there're no lines longer than `options.wrapWidth` columns. Columns are calculated with respect to `options.tabWidth` (default 4).
