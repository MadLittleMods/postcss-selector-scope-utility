const test = require('tape');
const deepEqual = require('deep-equal');
const yargs = require('yargs');
const pick = require('lodash/pick');

const postcss = require('postcss');

const parseSelector = require('../lib/parse-selector');
const generateBranches = require('../lib/generate-branches');
const isBranchUnderScope = require('../lib/is-branch-under-scope');


var opts = yargs
	.option('grep', {
		alias: 'g',
		description: 'Output'
	})
	.help('help')
	.alias('help', 'h')
	.argv;


const grepRe = new RegExp(opts.grep);

let getDeepestChildRule = function(css) {
	let deepestNode;
	let currentNode = postcss.parse(css);
	while(currentNode) {
		//console.log(currentNode);
		let child = currentNode.first;
		if(child && child.type === 'rule') {
			deepestNode = child;
		}

		currentNode = child;
	}

	return deepestNode;
};


let generateBranchesProcessor = (...processArgs) => {
	return new Promise((resolve, reject) => {
		let testGenereateScopeListPlugin = postcss.plugin('postcss-test-generate-branches', function(/*opts*/) {
			return (css/*, result*/) => {
				/* */
				css.each((rule) => {
					var deepestRule = getDeepestChildRule(rule);
					resolve(generateBranches(deepestRule));
				});
				/* */
			};
		});

		let postcssProcessor = postcss([
			testGenereateScopeListPlugin()
		]);

		postcssProcessor.process(...processArgs)
			.catch((err) => {
				//console.log(err.message);
				//console.log(err);
				reject(err);
			});
	});
};

function testGenerateBranches(name, input, expected) {
	const testName = `testGenerateBranches: ${name}`;
	if(!opts.grep || (opts.grep && grepRe.test(testName))) {
		generateBranchesProcessor(input)
			.then((result) => {
				test(testName, (t) => {
					t.plan(2 * expected.length);

					expected.forEach((expectedBranch, index) => {
						const expectedSelector = typeof expectedBranch === 'object' ? expectedBranch.selector : expectedBranch;
						const expectedConditionals = typeof expectedBranch === 'object' ? expectedBranch.conditionals : [];

						t.equal(result[index].selector.toString(), expectedSelector, `input \`${input}\` should generate branches \`${expected}\``);
						t.deepEqual(
							result[index].conditionals.map(conditional => pick(conditional, ['type', 'name', 'params'])),
							expectedConditionals,
							'should have all conditionals'
						)
					});
				});
			});
	}
};



testGenerateBranches(
	'single class',
	'.foo { }',
	[
		'.foo'
	]
);

testGenerateBranches(
	'descendant combinator (space)',
	'.foo .bar { }',
	[
		'.foo .bar'
	]
);

testGenerateBranches(
	'nested and descendent, complex branching',
	`.bar + .asdf >> .qwer, .baz {
		.qux, .norf {

		}
	}`,
	[
		'.bar+.asdf>>.qwer .qux',
		'.baz .qux',
		'.bar+.asdf>>.qwer .norf' ,
		'.baz .norf'
	]
);

testGenerateBranches(
	'media query at-rule',
	'@media print { .foo { } }',
	[
		{
			selector: '.foo',
			conditionals: [{
				type: 'atrule',
				name: 'media',
				params: 'print'
			}]
		}
	]
);








function testIsBranchUnderScope(name, needle, haystack, expected) {
	const testName = `testIsBranchUnderScope: ${name}`;
	if(!opts.grep || (opts.grep && grepRe.test(testName))) {
		test(testName, (t) => {
			t.plan(1);
			let result = isBranchUnderScope(
				Object.assign({}, needle, {
					selector: parseSelector(needle.selector).nodes[0]
				}),
				Object.assign({}, haystack, {
					selector: parseSelector(haystack.selector).nodes[0]
				})
			);

			return expected ?
				t.ok(result, `\`${needle.selector}\`(define variable) should be under scope of \`${haystack.selector}\`(variable usage)`) :
				t.notOk(result, `\`${needle.selector}\`(define variable) should NOT be under scope of \`${haystack.selector}\`(variable usage)`);
		});
	}
};




testIsBranchUnderScope(
	'same selector',
	{ selector: '.foo' }, // define variable
	{ selector: '.foo' }, // variable usage
	true
);

testIsBranchUnderScope(
	'in group',
	{ selector: '.bar' }, // define variable
	{ selector: '.foo.bar' }, // variable usage
	true
);

testIsBranchUnderScope(
	'multiple in group',
	{ selector: '.foo.bar' }, // define variable
	{ selector: '.foo.bar.baz' }, // variable usage
	true
);

testIsBranchUnderScope(
	'always ancestor :root definitions apply to everything',
	{ selector: ':root' }, // define variable
	{ selector: '.foo' }, // variable usage
	true
);

testIsBranchUnderScope(
	'always ancestor :root usage does not pick up some other scope',
	{ selector: '.foo' }, // define variable
	{ selector: ':root' }, // variable usage
	false
);

testIsBranchUnderScope(
	'always ancestor star *',
	{ selector: '*' }, // define variable
	{ selector: '.foo' }, // variable usage
	true
);

testIsBranchUnderScope(
	'always ancestor start * usage does not pick up some other scope',
	{ selector: '.foo' }, // define variable
	{ selector: '*' }, // variable usage
	false
);

testIsBranchUnderScope(
	'always ancestor html tag',
	{ selector: 'html' }, // define variable
	{ selector: '.foo' }, // variable usage
	true
);

testIsBranchUnderScope(
	'always ancestor html usage does not pick up some other scope',
	{ selector: '.foo' }, // define variable
	{ selector: 'html' }, // variable usage
	false
);

testIsBranchUnderScope(
	'always ancestor shadow dom :host',
	{ selector: ':host' }, // define variable
	{ selector: '.foo' }, // variable usage
	true
);

testIsBranchUnderScope(
	'always ancestor :host usage does not pick up some other scope',
	{ selector: '.foo' }, // define variable
	{ selector: ':host' }, // variable usage
	false
);

testIsBranchUnderScope(
	'multiple in group and extra descendant haystack group',
	{ selector: '.foo.bar' }, // define variable
	{ selector: '.foo.bar.baz .qux' }, // variable usage
	true
);

testIsBranchUnderScope(
	'adjacent sibling selector',
	{ selector: '.foo + .bar' }, // define variable
	{ selector: '.foo + .bar .baz' }, // variable usage
	true
);

testIsBranchUnderScope(
	'adjacent sibling selector plus extra haystack class',
	{ selector: '.foo + .bar' }, // define variable
	{ selector: '.foo.qux + .bar' }, // variable usage
	true
);

testIsBranchUnderScope(
	'adjacent sibling is not necessarily a general sibling',
	{ selector: '.foo + .bar' }, // define variable
	{ selector: '.foo ~ .bar .baz' }, // variable usage
	false
);

testIsBranchUnderScope(
	'general sibling declaration used in adjacent sibling',
	{ selector: '.foo ~ .bar' }, // define variable
	{ selector: '.foo + .bar .baz' }, // variable usage
	true
);

testIsBranchUnderScope(
	'pseudo',
	{ selector: '.foo' }, // define variable
	{ selector: '.foo:hover' }, // variable usage
	true
);

testIsBranchUnderScope(
	'variable defined in pseudo should not apply to parent',
	{ selector: '.foo:hover' }, // define variable
	{ selector: '.foo' }, // variable usage
	false
);

testIsBranchUnderScope(
	'nested selector',
	{ selector: '.foo:not(.bar)' }, // define variable
	{ selector: '.foo:not(.bar:not(.baz))' }, // variable usage
	true
);

testIsBranchUnderScope(
	'multiple in group but targeting something else',
	{ selector: '.foo.bar .foo.qux' }, // define variable
	{ selector: '.foo.bar' }, // variable usage
	false
);

testIsBranchUnderScope(
	'adjacent sibling can\'t be a descendant',
	{ selector: '.foo + .bar' }, // define variable
	{ selector: '.foo > .bar' }, // variable usage
	false
);

testIsBranchUnderScope(
	'variable used in media query at-rule conditional',
	{ selector: '.foo' }, // define variable
	// variable usage
	{
		selector: '.foo',
		conditionals: [{
			type: 'atrule',
			name: 'media',
			params: 'print'
		}]
	},
	true
);

testIsBranchUnderScope(
	'variable defined in media query at-rule conditional',
	// define variable
	{
		selector: '.foo',
		conditionals: [{
			type: 'atrule',
			name: 'media',
			params: 'print'
		}]
	},
	{ selector: '.foo' }, // variable usage
	false
);







/* * /
test('beep boop', (t) => {
	t.plan(2);

	t.equal(1 + 1, 2);
	setTimeout(() => {
		t.deepEqual(
			'ABC'.toLowerCase().split(''),
			['a', 'b', 'c']
		);
	});
});

test('asdf', (t) => {
	t.plan(1);
	t.equal(1 + 1, 2);
});

/* */
