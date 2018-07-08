const debugSetup = require('debug');
const debug = debugSetup('generate-branches');

const parser = require('postcss-selector-parser');
const parseSelector = require('./parse-selector');


function getAncestors(node) {
	let ancestors = [];

	let currentNode = node;
	while(currentNode) {
		ancestors.push(currentNode);

		currentNode = currentNode.parent;
	}

	return ancestors;
};


// Each fork is a comma separated piece
function getSelectorForks(selector) {
	let forks = parseSelector(selector, {
			lossless: false
		})
		.map(function(topLevelNode) {
			topLevelNode.nodes.forEach(function(node) {
				node.spaces = { before: '', after: '' };
			});

			return topLevelNode;
		});

	return forks;
};


function getBranchesCopy(branches) {
	return branches.map((branch) => {
		return branch ? Object.assign({}, branch, { selector: branch.selector.clone() }) : branch;
	});
};



// Generate branches
// List of selectors from a given PostCSS node
//
// Returns:
// [
// 	{
// 		source: node.source,
// 		selector: '.foo',
// 		// These are things that can be satisfied anywhere
// 		conditionals: [{
// 			source: node.source,
// 			type: 'atrule',
// 			name: 'media',
// 			params: 'print'
// 		}]
// 	}
// ]
function generateBranches(targetNode) {
	const conditionals = [];
	// Walk over the ancestors top-down
	let branches = getAncestors(targetNode).reverse()
		.reduce((prevBranches, currentNode) => {
			if(currentNode.type === 'rule') {
				// Each fork is a comma separated piece of the selector
				let forks = getSelectorForks(currentNode.selector);

				// Add a new branch for each new fork
				return forks.reduce((newBranches, fork) => {
					let branchesBase = getBranchesCopy(prevBranches);

					// Now add the current level of scope to the each base branch
					return newBranches.concat(branchesBase.map((branch) => {
						if(branch) {
							branch.selector.append(new parser.combinator({
								value: ' '
							}));
							branch.selector.append(fork);

							return branch;
						}

						return {
							source: targetNode.source,
							selector: fork,
							conditionals: []
						};
					}));
				}, []);
			}
			else if(currentNode.type === 'atrule') {
				conditionals.push({
					source: currentNode.source,
					type: currentNode.type,
					name: currentNode.name,
					params: currentNode.params
				});
			}

			return prevBranches;
		}, [
			// Start off with one branch
			null
		]);

	branches.forEach(function(branch) {
		branch.conditionals = conditionals;
	});

	debug('branches', branches.map(function(branch) { return branch.selector.toString(); }));

	return branches;
}

module.exports = generateBranches;
