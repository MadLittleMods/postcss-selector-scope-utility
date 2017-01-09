//import nomo from 'node-monkey';
//nomo.start({port: 50501});

'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports['default'] = generateScopeList;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _postcssSelectorParser = require('postcss-selector-parser');

var _postcssSelectorParser2 = _interopRequireDefault(_postcssSelectorParser);

var selectorParser = (0, _postcssSelectorParser2['default'])(function () {});
var selectorProcessor = function selectorProcessor() {
	for (var _len = arguments.length, processArgs = Array(_len), _key = 0; _key < _len; _key++) {
		processArgs[_key] = arguments[_key];
	}

	return selectorParser.process.apply(selectorParser, Array.prototype.slice.call(processArgs)).res;
};

/* * /
let asdf = selectorProcessor('h1, h2, h3');
console.log(asdf);
/* */

/* * /
let asdf2 = selectorProcessor('h1>>h2 h3');
console.log(asdf2);
/* */

var getAncestors = function getAncestors(node) {
	var ancestors = [];

	var currentNode = node;
	while (currentNode) {
		ancestors.push(currentNode);

		currentNode = currentNode.parent;
	}

	return ancestors;
};

// Wrapper around [`container.split`](https://github.com/postcss/postcss-selector-parser/blob/master/API.md#containersplitcallback)
var splitNode = function splitNode(node) {
	for (var _len2 = arguments.length, splitArgs = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
		splitArgs[_key2 - 1] = arguments[_key2];
	}

	return node.split.apply(node, splitArgs)
	// Remove the combinator piece
	.map(function (group, index, groups) {
		if (index < groups.length - 1) {
			return group.slice(0, -1);
		}
		return group;
	});
};

// Each fork is a comma separated piece
var getSelectorForks = function getSelectorForks(selector) {
	var forks = selectorProcessor(selector).map(function (topLevelNode) {
		// Get all of the descendants
		var groups = splitNode(topLevelNode, function (node) {
			return node.type === 'combinator' && (node.value === ' ' || node.value === '>>');
		});
		//console.log('g', groups);

		// Turn each group back into a string
		return groups.map(function (group) {
			return new _postcssSelectorParser2['default'].selector({
				nodes: group
			}).toString();
		});
	});

	return forks;
};

var getBranchesCopy = function getBranchesCopy(branches) {
	return branches.map(function (branch) {
		return branch.slice(0);
	});
};

// Generate a scope list
// Array of array of selector strings

function generateScopeList(targetNode) {

	// Walk over the ancestors top-down
	var branches = getAncestors(targetNode).reverse().filter(function (currentNode) {
		if (currentNode.type === 'rule') {
			return true;
		}
		return false;
	}).reduce(function (prevBranches, currentNode) {
		// Each fork is a comma separated piece of the selector
		var forks = getSelectorForks(currentNode.selector);

		// Add a new branch for each new fork
		return forks.reduce(function (newBranches, fork) {
			var branchesBase = getBranchesCopy(prevBranches);

			// Now add the current level of scope to the each base branch
			return newBranches.concat(branchesBase.map(function (branch) {
				return branch.concat(fork);
			}));
		}, []);
	}, [
	// Start off with one branch
	[]]);

	//console.log('b', branches);

	return branches;
}

module.exports = exports['default'];