import {indentAndWrap} from '../mod.ts';
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

Deno.test
(	'indentAndWrap',
	() =>
	{	assertEquals
		(	indentAndWrap
			(	''
			),
			''
		);

		assertEquals
		(	indentAndWrap
			(	' '
			),
			''
		);

		assertEquals
		(	indentAndWrap
			(	'Line 1'
			),
			'Line 1'
		);

		assertEquals
		(	indentAndWrap
			(	'Line 1\n'
			),
			'Line 1\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\nLine 1\nLine 2\n'
			),
			'\nLine 1\nLine 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n Line 1\nLine 2\n'
			),
			'\n Line 1\nLine 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n Line 1\n Line 2\n'
			),
			'\n Line 1\n Line 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	' Line 1\n Line 2\n',
				{indent: ''}
			),
			'Line 1\nLine 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	' Line 1\n Line 2\n',
				{indent: '****'}
			),
			'****Line 1\n****Line 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	' Line 1\n Line 2\n',
				{indent: '\n\t', wrapWidth: 80}
			),
			'\n\tLine 1\n\n\tLine 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	' Line 1\n Line 2\n',
				{indent: '\r', wrapWidth: 80}
			),
			'\rLine 1\n\rLine 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	' Line 1\n Line 2\n',
				{indent: '\r\n#', wrapWidth: 80}
			),
			'\r\n#Line 1\n\r\n#Line 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n Line 1\n Line 2\n',
				{indent: ''}
			),
			'\nLine 1\nLine 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n Line 1\n Line 2\n',
				{indent: '****'}
			),
			'\n****Line 1\n****Line 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n Line 1\n    \n Line 2\n',
				{indent: '****'}
			),
			'\n****Line 1\n\n****Line 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	'Line 0\n Line 1\n    \n Line 2\n',
				{indent: '****'}
			),
			'****Line 0\n**** Line 1\n\n**** Line 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	'Line 0\n Line 1\n    \n Line 2\n',
				{indent: '****', ignoreFirstIndent: true}
			),
			'****Line 0\n****Line 1\n\n****Line 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	'Line 0\n Line 1\n    \n Line 2\n',
				{indent: ' ', ignoreFirstIndent: true}
			),
			' Line 0\n Line 1\n\n Line 2\n'
		);

		assertEquals
		(	indentAndWrap
			(	'Line 0\n Line 1\n    \n Line 2\n\n\n',
				{indent: ' ', ignoreFirstIndent: true}
			),
			' Line 0\n Line 1\n\n Line 2\n\n\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n Line 1\n    \n Line 2222\n',
				{indent: '****', wrapWidth: 8}
			),
			'\n****Line\n****1\n\n****Line\n****2222\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n L\t1\n    \n Line 2222\n',
				{indent: '****', wrapWidth: 8}
			),
			'\n****L\n****1\n\n****Line\n****2222\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n L\t1\n    \n Line 2222\n',
				{indent: '***', wrapWidth: 8}
			),
			'\n***L\n***1\n\n***Line\n***2222\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n L\t1\n    \n Line 2222\n',
				{indent: '**', wrapWidth: 8, tabWidth: 4}
			),
			'\n**L\t1\n\n**Line\n**2222\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n L\t1\n    \n Line 2222\n',
				{indent: '**', wrapWidth: 8, tabWidth: 7}
			),
			'\n**L\t1\n\n**Line\n**2222\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n L\t1\n    \n Line 2222\n',
				{indent: '**', wrapWidth: 8, tabWidth: 8}
			),
			'\n**L\n**1\n\n**Line\n**2222\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n L\t1\n    \n Line 2222\n',
				{indent: '**', wrapWidth: 8, tabWidth: 9}
			),
			'\n**L\n**1\n\n**Line\n**2222\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n Line line 1\n    \n Line line 2222\n',
				{indent: '****', wrapWidth: 13}
			),
			'\n****Line line\n****1\n\n****Line line\n****2222\n'
		);

		for (let wrapWidth=10; wrapWidth<=12; wrapWidth++)
		{	assertEquals
			(	indentAndWrap
				(	'\n Line line 1\n    \n Line line 2222\n',
					{indent: '****', wrapWidth}
				),
				'\n****Line\n****line 1\n\n****Line\n****line\n****2222\n'
			);
		}

		assertEquals
		(	indentAndWrap
			(	'Line 0\n Line 1\n    \n Line 2\n\n\n',
				{indent: '  ', ignoreFirstIndent: true, wrapWidth: 6}
			),
			'  Line\n  0\n  Line\n  1\n\n  Line\n  2\n\n\n'
		);

		assertEquals
		(	indentAndWrap
			(	'Line 0\r\n Line 1\r\n    \r\n Line 2\r\n\r\n\r\n',
				{indent: '  ', ignoreFirstIndent: true, wrapWidth: 6}
			),
			'  Line\n  0\n  Line\n  1\n\n  Line\n  2\n\n\n'
		);

		assertEquals
		(	indentAndWrap
			(	'Line 0\r\n Line 1\n    \r Line 2\r\r\r\n',
				{indent: '  ', ignoreFirstIndent: true, wrapWidth: 6}
			),
			'  Line\n  0\n  Line\n  1\n\n  Line\n  2\n\n\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n Line 1\n    \n Line 2222\n',
				{indent: '****', wrapWidth: 7}
			),
			'\n****Line\n****1\n\n****Line\n****2222\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\n Line 1\n    \n Line 2222\n',
				{indent: '****', wrapWidth: 7, overflowWrap: true}
			),
			'\n****Lin\n****e 1\n\n****Lin\n****e\n****222\n****2\n'
		);

		assertEquals
		(	indentAndWrap
			(	'abcdefghi',
				{wrapWidth: 3, overflowWrap: true}
			),
			'abc\ndef\nghi'
		);

		assertEquals
		(	indentAndWrap
			(	'abcdefghi\n',
				{wrapWidth: 3, overflowWrap: true}
			),
			'abc\ndef\nghi\n'
		);

		assertEquals
		(	indentAndWrap
			(	'abcdefghi\nab cdef',
				{wrapWidth: 3, overflowWrap: true}
			),
			'abc\ndef\nghi\nab\ncde\nf'
		);

		assertEquals
		(	indentAndWrap
			(	'abcdefghi\n',
				{indent: '  ', wrapWidth: 3, overflowWrap: true}
			),
			'  a\n  b\n  c\n  d\n  e\n  f\n  g\n  h\n  i\n'
		);

		assertEquals
		(	indentAndWrap
			(	'abcdefghi\n',
				{indent: '   ', wrapWidth: 3, overflowWrap: true}
			),
			'   a\n   b\n   c\n   d\n   e\n   f\n   g\n   h\n   i\n'
		);

		assertEquals
		(	indentAndWrap
			(	'ab\tcde',
				{wrapWidth: 3, overflowWrap: true}
			),
			'ab\ncde'
		);

		assertEquals
		(	indentAndWrap
			(	'ab\tcde',
				{indent: '   ', wrapWidth: 3, overflowWrap: true}
			),
			'   a\n   b\n   c\n   d\n   e'
		);

		assertEquals
		(	indentAndWrap
			(	'\nLine\t1\nLin\t2\n',
				{wrapWidth: 8, tabWidth: 4}
			),
			'\nLine\n1\nLin\t2\n'
		);

		assertEquals
		(	indentAndWrap
			(	'\nLine\t1\nLin\t2\n',
				{wrapWidth: 8, endl: '\r', tabWidth: 4}
			),
			'\rLine\r1\rLin\t2\r'
		);

		assertEquals
		(	indentAndWrap
			(	`	Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
				`,
				{wrapWidth: 40, indent: '\t', tabWidth: 4}
			),
			"\tLorem ipsum dolor sit amet,\n\tconsectetur adipiscing elit, sed do\n\teiusmod tempor incididunt ut labore\n\tet dolore magna aliqua.\n"
		);

		assertEquals
		(	indentAndWrap
			(	`	Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
					dolore magna aliqua.
				`,
				{wrapWidth: 40, indent: '\t', ignoreFirstIndent: true, tabWidth: 4}
			),
			"\tLorem ipsum dolor sit amet,\n\tconsectetur adipiscing elit, sed do\n\teiusmod tempor incididunt ut labore\n\tet\n\tdolore magna aliqua.\n"
		);

		assertEquals
		(	indentAndWrap
			(	`	Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
					dolore magna aliqua.
				`,
				{wrapWidth: 20, indent: '', ignoreFirstIndent: true, tabWidth: 4}
			),
			"Lorem ipsum dolor\nsit amet,\nconsectetur\nadipiscing elit, sed\ndo eiusmod tempor\nincididunt ut labore\net\ndolore magna aliqua.\n"
		);

		assertEquals
		(	indentAndWrap
			(	`	Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
					dolore magna aliqua.
				`,
				{wrapWidth: 22, indent: '  ', ignoreFirstIndent: true, tabWidth: 4}
			),
			"  Lorem ipsum dolor\n  sit amet,\n  consectetur\n  adipiscing elit, sed\n  do eiusmod tempor\n  incididunt ut labore\n  et\n  dolore magna aliqua.\n"
		);

		assertEquals
		(	indentAndWrap
			(	`	Lorem ipsum dolor sit amet,
					consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
					dolore magna aliqua.
				`,
				{wrapWidth: 22, indent: '  ', ignoreFirstIndent: true, tabWidth: 4}
			),
			"  Lorem ipsum dolor\n  sit amet,\n  consectetur\n  adipiscing elit, sed\n  do eiusmod tempor\n  incididunt ut labore\n  et\n  dolore magna aliqua.\n"
		);

		assertEquals
		(	indentAndWrap
			(	`	Lorem ipsum dolor sit amet, consectetur
					adipiscing elit, sed do eiusmod tempor incididunt ut labore et
					dolore magna aliqua.
				`,
				{wrapWidth: 100, indent: '  ', ignoreFirstIndent: true, tabWidth: 4}
			),
			"  Lorem ipsum dolor sit amet, consectetur\n  adipiscing elit, sed do eiusmod tempor incididunt ut labore et\n  dolore magna aliqua.\n"
		);

		assertEquals
		(	indentAndWrap
			(	` \tLorem ipsum dolor sit amet, consectetur
				 \tadipiscing elit, sed do eiusmod tempor incididunt ut labore et
				 \tdolore magna aliqua.
				`,
				{wrapWidth: 100, indent: '  ', ignoreFirstIndent: true, tabWidth: 4}
			),
			"  Lorem ipsum dolor sit amet, consectetur\n  adipiscing elit, sed do eiusmod tempor incididunt ut labore et\n  dolore magna aliqua.\n"
		);

		for (let i=0; i<30; i++)
		{	const esc1 = i==0 ? '' : esc();
			const esc2 = i==0 ? '' : esc();
			const esc3 = i==0 ? '' : esc();
			assertEquals
			(	indentAndWrap
				(	` \t  Lorem ipsum dolor sit amet,${esc1} consectetur
					 \t  ${esc2}adipiscing elit, sed do eiusmod tempor incididunt ut labore et
					 \t  dolore magna aliqua.${esc3}
					`,
					{wrapWidth: 100, indent: '  ', ignoreFirstIndent: true, tabWidth: 4}
				),
				`  Lorem ipsum dolor sit amet,${esc1} consectetur\n  ${esc2}adipiscing elit, sed do eiusmod tempor incididunt ut labore et\n  dolore magna aliqua.${esc3}\n`
			);
		}

		for (let i=0; i<30; i++)
		{	const esc1 = i==0 ? '' : esc();
			assertEquals
			(	indentAndWrap
				(	`${esc1} \t  Lorem ipsum dolor sit amet, consectetur
					${esc1} \t  adipiscing elit, sed do eiusmod tempor incididunt ut labore et
					${esc1} \t  dolore magna aliqua.
					`,
					{wrapWidth: 100, indent: '  ', ignoreFirstIndent: true, mode: 'term', tabWidth: 4}
				),
				`  Lorem ipsum dolor sit amet, consectetur\n  adipiscing elit, sed do eiusmod tempor incididunt ut labore et\n  dolore magna aliqua.\n`
			);
		}

		for (let i=0; i<30; i++)
		{	const esc1 = i==0 ? '' : esc();
			assertEquals
			(	indentAndWrap
				(	` \t ${esc1} Lorem ipsum dolor sit amet, consectetur
					 \t ${esc1} adipiscing elit, sed do eiusmod tempor incididunt ut labore et
					 \t ${esc1} dolore magna aliqua.
					`,
					{wrapWidth: 100, indent: '  ', ignoreFirstIndent: true, mode: 'term', tabWidth: 4}
				),
				`  Lorem ipsum dolor sit amet, consectetur\n  adipiscing elit, sed do eiusmod tempor incididunt ut labore et\n  dolore magna aliqua.\n`
			);
		}

		for (let i=0; i<30; i++)
		{	const esc1 = i==0 ? '' : esc();
			assertEquals
			(	indentAndWrap
				(	` \t  ${esc1}Lorem ipsum dolor sit amet, consectetur
					 \t  ${esc1}adipiscing elit, sed do eiusmod tempor incididunt ut labore et
					 \t  ${esc1}dolore magna aliqua.
					`,
					{wrapWidth: 100, indent: '  ', ignoreFirstIndent: true, mode: 'term', tabWidth: 4}
				),
				`  Lorem ipsum dolor sit amet, consectetur\n  adipiscing elit, sed do eiusmod tempor incididunt ut labore et\n  dolore magna aliqua.\n`
			);
		}

		for (let i=0; i<30; i++)
		{	const esc1 = i==0 ? '' : esc();
			assertEquals
			(	indentAndWrap
				(	` \t  L${esc1}orem ipsum dolor sit amet, consectetur
					 \t  adipiscing${esc1} elit, sed do eiusmod tempor incididunt ut labore et
					 \t  dolore magna aliqua.${esc1}
					`,
					{wrapWidth: 100, indent: '  ', ignoreFirstIndent: true, mode: 'term', tabWidth: 4}
				),
				`  L${esc1}orem ipsum dolor sit amet, consectetur\n  adipiscing${esc1} elit, sed do eiusmod tempor incididunt ut labore et\n  dolore magna aliqua.${esc1}\n`
			);
		}
	}
);
