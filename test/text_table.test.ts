import {textTable, BorderStyle, TextAlign, VerticalAlign} from '../mod.ts';
import {assertEquals} from "https://deno.land/std@0.157.0/testing/asserts.ts";

Deno.test
(	'textTable',
	() =>
	{	assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
						},
						{	content: `dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor\n\tincididunt ut labore et`,
						}
					]
				],
				{borderStyle: BorderStyle.Double, tabWidth: 8}
			),
			`	╔═══════════╦══════════════════════════════════════════════════════════════════╗
				║Lorem ipsum║dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor║
				║           ║\tincididunt ut labore et                                        ║
				╚═══════════╩══════════════════════════════════════════════════════════════════╝
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
						},
						{	content: `dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor\n\tincididunt ut labore et`,
						}
					]
				],
				{borderStyle: BorderStyle.Double, tabWidth: 8, tabsToSpaces: true}
			),
			`	╔═══════════╦══════════════════════════════════════════════════════════════════╗
				║Lorem ipsum║dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor║
				║           ║   incididunt ut labore et                                        ║
				╚═══════════╩══════════════════════════════════════════════════════════════════╝
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {paddingLeft: 2}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					]
				]
			),
			`	┌─────────────┬───────────────────────────┐
				│  Lorem ipsum│dolor sit amet, consectetur│
				└─────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {paddingTop: 2}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					]
				]
			),
			`	┌───────────┬───────────────────────────┐
				│           │                           │
				│           │dolor sit amet, consectetur│
				│Lorem ipsum│                           │
				└───────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {paddingRight: 2}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `a`,
						}
					]
				]
			),
			`	┌─────────────┬───────────────────────────┐
				│Lorem ipsum  │dolor sit amet, consectetur│
				├─────────────┼───────────────────────────┤
				│a            │                           │
				└─────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {paddingBottom: 2}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────────────────────┐
				│Lorem ipsum                           │                           │
				│                                      │dolor sit amet, consectetur│
				│                                      │                           │
				├──────────────────────────────────────┼───────────────────────────┤
				│adipiscing elit, sed do eiusmod tempor│                           │
				└──────────────────────────────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {paddingTop: 1, paddingBottom: 2}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────────────────────┐
				│                                      │                           │
				│Lorem ipsum                           │dolor sit amet, consectetur│
				│                                      │                           │
				│                                      │                           │
				├──────────────────────────────────────┼───────────────────────────┤
				│adipiscing elit, sed do eiusmod tempor│                           │
				└──────────────────────────────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {paddingTop: 3, paddingBottom: 2}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────────────────────┐
				│                                      │                           │
				│                                      │                           │
				│                                      │dolor sit amet, consectetur│
				│Lorem ipsum                           │                           │
				│                                      │                           │
				│                                      │                           │
				├──────────────────────────────────────┼───────────────────────────┤
				│adipiscing elit, sed do eiusmod tempor│                           │
				└──────────────────────────────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
						},
						{	content: `dolor\nsit\namet,\nconsectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────┐
				│                                      │dolor      │
				│Lorem ipsum                           │sit        │
				│                                      │amet,      │
				│                                      │consectetur│
				├──────────────────────────────────────┼───────────┤
				│adipiscing elit, sed do eiusmod tempor│           │
				└──────────────────────────────────────┴───────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {paddingTop: 1}
						},
						{	content: `dolor\nsit\namet,\nconsectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────┐
				│                                      │dolor      │
				│                                      │sit        │
				│Lorem ipsum                           │amet,      │
				│                                      │consectetur│
				├──────────────────────────────────────┼───────────┤
				│adipiscing elit, sed do eiusmod tempor│           │
				└──────────────────────────────────────┴───────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {paddingTop: 1, verticalAlign: VerticalAlign.Top}
						},
						{	content: `dolor\nsit\namet,\nconsectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────┐
				│                                      │dolor      │
				│Lorem ipsum                           │sit        │
				│                                      │amet,      │
				│                                      │consectetur│
				├──────────────────────────────────────┼───────────┤
				│adipiscing elit, sed do eiusmod tempor│           │
				└──────────────────────────────────────┴───────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {paddingTop: 1, verticalAlign: VerticalAlign.Bottom}
						},
						{	content: `dolor\nsit\namet,\nconsectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────┐
				│                                      │dolor      │
				│                                      │sit        │
				│                                      │amet,      │
				│Lorem ipsum                           │consectetur│
				├──────────────────────────────────────┼───────────┤
				│adipiscing elit, sed do eiusmod tempor│           │
				└──────────────────────────────────────┴───────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {paddingBottom: 1, verticalAlign: VerticalAlign.Bottom}
						},
						{	content: `dolor\nsit\namet,\nconsectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────┐
				│                                      │dolor      │
				│                                      │sit        │
				│Lorem ipsum                           │amet,      │
				│                                      │consectetur│
				├──────────────────────────────────────┼───────────┤
				│adipiscing elit, sed do eiusmod tempor│           │
				└──────────────────────────────────────┴───────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {paddingTop: 1, paddingBottom: 1, verticalAlign: VerticalAlign.Bottom}
						},
						{	content: `dolor\nsit\namet,\nconsectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────┐
				│                                      │dolor      │
				│                                      │sit        │
				│Lorem ipsum                           │amet,      │
				│                                      │consectetur│
				├──────────────────────────────────────┼───────────┤
				│adipiscing elit, sed do eiusmod tempor│           │
				└──────────────────────────────────────┴───────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {textAlign: TextAlign.Right}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────────────────────┐
				│                           Lorem ipsum│dolor sit amet, consectetur│
				├──────────────────────────────────────┼───────────────────────────┤
				│adipiscing elit, sed do eiusmod tempor│                           │
				└──────────────────────────────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {textAlign: TextAlign.Right, paddingRight: 1}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────────────────────┐
				│                          Lorem ipsum │dolor sit amet, consectetur│
				├──────────────────────────────────────┼───────────────────────────┤
				│adipiscing elit, sed do eiusmod tempor│                           │
				└──────────────────────────────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {textAlign: TextAlign.Right, paddingRight: 1, paddingLeft: 3}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────────────────────┐
				│                          Lorem ipsum │dolor sit amet, consectetur│
				├──────────────────────────────────────┼───────────────────────────┤
				│adipiscing elit, sed do eiusmod tempor│                           │
				└──────────────────────────────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {textAlign: TextAlign.Center}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────────────────────┐
				│             Lorem ipsum              │dolor sit amet, consectetur│
				├──────────────────────────────────────┼───────────────────────────┤
				│adipiscing elit, sed do eiusmod tempor│                           │
				└──────────────────────────────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {textAlign: TextAlign.Center, paddingLeft: 3, paddingRight: 3}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────────────────────┐
				│             Lorem ipsum              │dolor sit amet, consectetur│
				├──────────────────────────────────────┼───────────────────────────┤
				│adipiscing elit, sed do eiusmod tempor│                           │
				└──────────────────────────────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {textAlign: TextAlign.Center, paddingLeft: 3}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────────────────────┐
				│               Lorem ipsum            │dolor sit amet, consectetur│
				├──────────────────────────────────────┼───────────────────────────┤
				│adipiscing elit, sed do eiusmod tempor│                           │
				└──────────────────────────────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {textAlign: TextAlign.Center, paddingRight: 3}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────────────────────┐
				│            Lorem ipsum               │dolor sit amet, consectetur│
				├──────────────────────────────────────┼───────────────────────────┤
				│adipiscing elit, sed do eiusmod tempor│                           │
				└──────────────────────────────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
							options: {textAlign: TextAlign.Justify}
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────────────────────┐
				│Lorem                            ipsum│dolor sit amet, consectetur│
				├──────────────────────────────────────┼───────────────────────────┤
				│adipiscing elit, sed do eiusmod tempor│                           │
				└──────────────────────────────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum',
						},
						{	content: `dolor sit amet, consectetur`,
						}
					],
					[	{	content: `adipiscing elit, sed do eiusmod tempor`,
							options: {textAlign: TextAlign.Justify}
						}
					]
				]
			),
			`	┌──────────────────────────────────────┬───────────────────────────┐
				│Lorem ipsum                           │dolor sit amet, consectetur│
				├──────────────────────────────────────┼───────────────────────────┤
				│adipiscing elit, sed do eiusmod tempor│                           │
				└──────────────────────────────────────┴───────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);

		assertEquals
		(	textTable
			(	[	[	{	content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
							options: {textAlign: TextAlign.Justify, maxWidth: 30}
						}
					]
				]
			),
			`	┌──────────────────────────────┐
				│Lorem ipsum  dolor  sit  amet,│
				│consectetur  adipiscing  elit,│
				│sed    do    eiusmod    tempor│
				│incididunt ut labore et dolore│
				│magna                  aliqua.│
				└──────────────────────────────┘
			`.trimStart().replace(/\r?\n\s*/g, '\n')
		);
	}
);
