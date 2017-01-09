
//import nomo from 'node-monkey';
//nomo.start({port: 50501});

import test from 'tape';
import deepEqual from 'deep-equal';
import yargs from 'yargs';

import postcss from 'postcss';

import parseSelector from '../src/lib/parse-selector';
//import { generateScopeList } from '../src/index';
import generateBranches from '../src/lib/generate-branches';
import isBranchUnderScope from '../src/lib/is-branch-under-scope';

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

let testGenerateBranches = function(name, input, expected) {
	if(!opts.grep || (opts.grep && grepRe.test(name))) {
		generateBranchesProcessor(input)
			.then((result) => {
				//console.log('result', result);
				test(name, (t) => {
					t.plan(expected.length);

					var hasAllBranches = expected.forEach((branch, index) => {
						return t.equal(result[index].selector.toString(), branch);
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
	'media query',
	'@media print { .foo { } }',
	[
		'.foo .bar'
	]
);


/* * /
testGenerateScopeList(
	'stacked classes',
	'.foo.bar { }',
	[
		[['.foo', '.bar']]
	]
);

testGenerateScopeList(
	'stacked class and descendant',
	'.foo.bar .baz { }',
	[
		[['.foo', '.bar'], '.baz']
	]
);

testGenerateScopeList(
	'multiple descendant pieces stacking',
	'foo[type="checkbox"] .bar.baz { }',
	[
		[['.foo', '[type="checkbox"]'], ['.bar', '.baz']]
	]
);

testGenerateScopeList(
	'Pseudo element',
	'.foo:hover { }',
	[
		[['.foo', ':hover']]
	]
);
/* */








let testIsBranchUnderScope = function(name, needleSelectorString, haystackSelectorString, expected) {
	if(!opts.grep || (opts.grep && grepRe.test(name))) {
		test(name, (t) => {
			t.plan(1);
			let parsedNeedle = parseSelector(needleSelectorString);
			let parsedHaystack = parseSelector(haystackSelectorString);
			let needle = {
				selector: parsedNeedle.nodes[0]
			};
			let haystack = {
				selector: parsedHaystack.nodes[0]
			}
			let result = isBranchUnderScope(needle, haystack);

			return expected ?
				t.ok(result, `\`${needleSelectorString}\` should be under scope of \`${haystackSelectorString}\``) :
				t.notOk(result, `\`${needleSelectorString}\` should NOT be under scope of \`${haystackSelectorString}\``);
		});
	}
};




testIsBranchUnderScope(
	'same selector',
	'.foo',
	'.foo',
	true
);

testIsBranchUnderScope(
	'in group',
	'.bar',
	'.foo.bar',
	true
);

testIsBranchUnderScope(
	'multiple in group',
	'.foo.bar',
	'.foo.bar.baz',
	true
);


testIsBranchUnderScope(
	'multiple in group',
	'.foo.bar',
	'.foo.bar.baz .qux',
	true
);

testIsBranchUnderScope(
	'..',
	'.foo + .bar',
	'.foo + .bar .baz',
	true
);

testIsBranchUnderScope(
	'..',
	'.foo + .bar',
	'.foo ~ .bar .baz',
	true
);


testIsBranchUnderScope(
	'pseudo',
	'.foo:hover',
	'.foo',
	true
);

testIsBranchUnderScope(
	'nested selector',
	'.foo:not(.bar)',
	'.foo:not(.bar:not(.baz))',
	true
);

testIsBranchUnderScope(
	'multiple in group but targeting something else',
	'.foo.bar .foo.qux',
	'.foo.bar',
	false
);

testIsBranchUnderScope(
	'..',
	'.foo + .bar',
	'.foo > .bar',
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
