import {calcLines, CalcLinesOptions} from '../mod.ts';
import {assertEquals} from "https://deno.land/std@0.157.0/testing/asserts.ts";

const ESCAPES =
[	'\x07',
	'\x1B[A',
	'\x1B[100u',
	'\x1B[1~',
	'\x1B[10~',
	'\x1B[93;41m',
	'\x1B[38;2;127;127;255m',
];
let escapeEnum = 0;

function esc()
{	return ESCAPES[escapeEnum++ % ESCAPES.length];
}

function insertTermEscapes(text: string, state: number)
{	if (state == 0)
	{	return text;
	}
	return text.replace(new RegExp(`.{${state}}`, 's'), m => esc() + m);
}

function calcLinesStateToMode(state: number, options?: CalcLinesOptions): CalcLinesOptions
{	if (!options)
	{	options = {};
	}
	if (state != 0)
	{	options.mode = 'term';
	}
	return options;
}

Deno.test
(	'calcLines',
	() =>
	{	for (let state=0; state<1000; state++)
		{	assertEquals
			(	calcLines
				(	insertTermEscapes('', state),
					calcLinesStateToMode(state)
				),
				{nLine: 1, nColumn: 1}
			);

			assertEquals
			(	calcLines
				(	insertTermEscapes(' ', state),
					calcLinesStateToMode(state)
				),
				{nLine: 1, nColumn: 2}
			);

			assertEquals
			(	calcLines
				(	insertTermEscapes('\t', state),
					calcLinesStateToMode(state)
				),
				{nLine: 1, nColumn: 9}
			);

			assertEquals
			(	calcLines
				(	insertTermEscapes('a\t', state),
					calcLinesStateToMode(state)
				),
				{nLine: 1, nColumn: 9}
			);

			assertEquals
			(	calcLines
				(	insertTermEscapes('ab\t', state),
					calcLinesStateToMode(state)
				),
				{nLine: 1, nColumn: 9}
			);

			assertEquals
			(	calcLines
				(	insertTermEscapes('abcdefg\t', state),
					calcLinesStateToMode(state)
				),
				{nLine: 1, nColumn: 9}
			);

			assertEquals
			(	calcLines
				(	insertTermEscapes('abcdefgh\t', state),
					calcLinesStateToMode(state)
				),
				{nLine: 1, nColumn: 17}
			);

			assertEquals
			(	calcLines
				(	insertTermEscapes('abcde\t', state),
					calcLinesStateToMode(state, {tabWidth: 5}),
					0,
					100
				),
				{nLine: 1, nColumn: 11}
			);

			assertEquals
			(	calcLines
				(	insertTermEscapes('abcde\t', state),
					calcLinesStateToMode(state, {tabWidth: 5}),
					1,
					3
				),
				{nLine: 1, nColumn: 3}
			);

			assertEquals
			(	calcLines
				(	insertTermEscapes('abc\nde\rf\r\nxyz\t', state),
					calcLinesStateToMode(state, {tabWidth: 4})
				),
				{nLine: 4, nColumn: 5}
			);
		}

		assertEquals
		(	calcLines('\x07a'),
			{nLine: 1, nColumn: 3}
		);

		assertEquals
		(	calcLines('\n\x1B[A'),
			{nLine: 2, nColumn: 4}
		);

		assertEquals
		(	calcLines('\n\x1B[A', {mode: 'term'}),
			{nLine: 2, nColumn: 1}
		);

		assertEquals
		(	calcLines('\n\x1B[A#', {mode: 'term'}),
			{nLine: 2, nColumn: 2}
		);
	}
);
