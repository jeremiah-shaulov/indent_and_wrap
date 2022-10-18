import {indentAndWrap, getTextRect} from '../mod.ts';
import {assertEquals} from "https://deno.land/std@0.157.0/testing/asserts.ts";

Deno.test
(	'getTextRect',
	() =>
	{	assertEquals
		(	getTextRect
			(	''
			),
			{nLines: 0, nColumns: 0}
		);

		assertEquals
		(	getTextRect
			(	' '
			),
			{nLines: 1, nColumns: 0}
		);

		assertEquals
		(	getTextRect
			(	'Line 1'
			),
			{nLines: 1, nColumns: 6}
		);

		assertEquals
		(	getTextRect
			(	'Line 1\n'
			),
			{nLines: 2, nColumns: 6}
		);

		assertEquals
		(	getTextRect
			(	'\nLine 1\nLine 2\n'
			),
			{nLines: 4, nColumns: 6}
		);

		assertEquals
		(	getTextRect
			(	'\n Line 1\nLine 2\n'
			),
			{nLines: 4, nColumns: 7}
		);

		assertEquals
		(	getTextRect
			(	'\n Line 1\n Line 2\n'
			),
			{nLines: 4, nColumns: 7}
		);

		assertEquals
		(	getTextRect
			(	' Line 1\n Line 2\n',
				{indent: ''}
			),
			{nLines: 3, nColumns: 6}
		);

		assertEquals
		(	getTextRect
			(	' Line 1\n Line 2\n',
				{indent: '****'}
			),
			{nLines: 3, nColumns: 10}
		);

		assertEquals
		(	getTextRect
			(	' Line 1\n Line 2\n',
				{indent: '\n\t', wrapWidth: 80, tabWidth: 4}
			),
			{nLines: 5, nColumns: 10}
		);

		assertEquals
		(	indentAndWrap
			(	'\tabcde',
				{tabsToSpaces: true, tabWidth: 4}
			),
			'    abcde'
		);

		assertEquals
		(	indentAndWrap
			(	'a\tbcde',
				{tabsToSpaces: true, tabWidth: 4}
			),
			'a   bcde'
		);

		assertEquals
		(	indentAndWrap
			(	'a\tbcde',
				{tabsToSpaces: false, tabWidth: 4}
			),
			'a\tbcde'
		);

		assertEquals
		(	indentAndWrap
			(	'ab\tcde',
				{tabsToSpaces: true, tabWidth: 4}
			),
			'ab  cde'
		);

		assertEquals
		(	indentAndWrap
			(	'abc\tde',
				{tabsToSpaces: true, tabWidth: 4}
			),
			'abc de'
		);

		assertEquals
		(	indentAndWrap
			(	'abcd\te',
				{tabsToSpaces: true, tabWidth: 4}
			),
			'abcd    e'
		);

		assertEquals
		(	indentAndWrap
			(	'a\tb\tcde',
				{tabsToSpaces: true, tabWidth: 4}
			),
			'a   b   cde'
		);

		assertEquals
		(	indentAndWrap
			(	'a\tb \tcde',
				{tabsToSpaces: true, tabWidth: 4}
			),
			'a   b   cde'
		);

		assertEquals
		(	indentAndWrap
			(	'a\tb \t cde',
				{tabsToSpaces: true, tabWidth: 4}
			),
			'a   b    cde'
		);

		assertEquals
		(	indentAndWrap
			(	'a\tb \t\ncde',
				{tabsToSpaces: true, tabWidth: 4}
			),
			'a   b\ncde'
		);

		assertEquals
		(	indentAndWrap
			(	'a\tb\t \ncde',
				{tabsToSpaces: true, tabWidth: 4}
			),
			'a   b\ncde'
		);

		assertEquals
		(	indentAndWrap
			(	'a\tb\ncd\te\nf',
				{tabsToSpaces: true, tabWidth: 4}
			),
			'a   b\ncd  e\nf'
		);

		assertEquals
		(	indentAndWrap
			(	'a\tb\ncd\te\nf',
				{indent: ' ', tabsToSpaces: true, tabWidth: 4}
			),
			' a  b\n cd e\n f'
		);

		assertEquals
		(	indentAndWrap
			(	'abcde\n \nf'
			),
			'abcde\n\nf'
		);

		assertEquals
		(	indentAndWrap
			(	'abcde\n \t \nf'
			),
			'abcde\n\nf'
		);

		assertEquals
		(	indentAndWrap
			(	'abcde\n \t \nf',
				{tabsToSpaces: true}
			),
			'abcde\n\nf'
		);

		assertEquals
		(	indentAndWrap
			(	'abcde\t',
				{tabsToSpaces: true}
			),
			'abcde'
		);

		assertEquals
		(	indentAndWrap
			(	'abcde\t\n',
				{tabsToSpaces: true}
			),
			'abcde\n'
		);

		assertEquals
		(	indentAndWrap
			(	'abcde\t\r',
				{tabsToSpaces: true}
			),
			'abcde\n'
		);

		assertEquals
		(	indentAndWrap
			(	'abcde\t\r\n',
				{tabsToSpaces: true}
			),
			'abcde\n'
		);

		assertEquals
		(	indentAndWrap
			(	'ab cde\t\n',
				{tabsToSpaces: true}
			),
			'ab cde\n'
		);

		assertEquals
		(	indentAndWrap
			(	'ab cd e \nf',
				{wrapWidth: 8}
			),
			'ab cd e\nf'
		);

		assertEquals
		(	indentAndWrap
			(	'ab cd e  \nf',
				{wrapWidth: 8}
			),
			'ab cd e\nf'
		);

		assertEquals
		(	indentAndWrap
			(	'\tabcde',
				{indent: '', tabsToSpaces: true}
			),
			'abcde'
		);
	}
);
