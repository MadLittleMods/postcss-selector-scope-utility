//import nomo from 'node-monkey';
//nomo.start({port: 50501});

import parser from 'postcss-selector-parser';

let selectorParser = parser(() => {});
let selectorProcessor = (...processArgs) => {
	return selectorParser.process
		.apply(
			selectorParser,
			Array.prototype.slice.call(processArgs)
		)
		.res;
};

/* * /
let asdf = selectorProcessor('h1, h2, h3');
console.log(asdf);
/* */

/* * /
let asdf2 = selectorProcessor('h1>>h2 h3');
console.log(asdf2);
/* */


let getAncestors = function(node) {
	let ancestors = [];

	let currentNode = node;
	while(currentNode) {
		ancestors.push(currentNode);

		currentNode = currentNode.parent;
	}

	return ancestors;
};

// Wrapper around [`container.split`](https://github.com/postcss/postcss-selector-parser/blob/master/API.md#containersplitcallback)
let splitNode = function(node, ...splitArgs) {
	return node.split.apply(node, splitArgs)
		// Remove the combinator piece
		.map((group, index, groups) => {
			if(index < (groups.length - 1)) {
				return group.slice(0, -1);
			}
			return group;
		});
};


// Each fork is a comma separated piece
let getSelectorForks = function(selector) {
	console.log('selector', selector);
	let forks = selectorProcessor(selector).map((topLevelNode) => {
		// Get all of the descendants
		let groups = splitNode(topLevelNode, (node) => {
			return node.type === 'combinator' && (node.value === ' ' || node.value === '>>');
		});
		//console.log('g', groups);

		// Turn each group back into a string
		return groups.map((group) => {
			return new parser.selector({
				nodes: group
			}).toString().trim();
		});
	});

	return forks;
};





let getBranchesCopy = function(branches) {
	return branches.map((branch) => {
		return branch.slice(0);
	});
};



// Generate a scope list
// Array of array of selector strings
export default function generateScopeList(targetNode) {
	// Walk over the ancestors top-down
	let branches = getAncestors(targetNode).reverse()
		.filter((currentNode) => {
			if(currentNode.type === 'rule') {
				return true;
			}
			return false;
		})
		.reduce((prevBranches, currentNode) => {
			// Each fork is a comma separated piece of the selector
			let forks = getSelectorForks(currentNode.selector);
			//console.log('forks', forks);

			// Add a new branch for each new fork
			return forks.reduce((newBranches, fork) => {
				let branchesBase = getBranchesCopy(prevBranches);

				// Now add the current level of scope to the each base branch
				return newBranches.concat(branchesBase.map((branch) => {
					return branch.concat(fork);
				}));
			}, []);
		}, [
			// Start off with one branch
			[]
		]);


	console.log('b', branches);

	return branches;
}
