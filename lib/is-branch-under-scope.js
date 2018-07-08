const debugSetup = require('debug');
const debug = debugSetup('is-branch-under-scope');

function checkMatchingConditional(needleConditional, haystackConditional) {
	if(needleConditional.type !== haystackConditional.type) {
		return false;
	}

	if(needleConditional.type === 'atrule') {
		return needleConditional.name === haystackConditional.name && needleConditional.params === haystackConditional.params;
	}
};


function isAlwaysAncestorNode(node) {
	return (node.type === 'pseudo' && node.value === ':root') || // :root
		(node.type === 'pseudo' && node.value === ':host') || // :host
		(node.type === 'universal') || // *
		(node.type === 'tag' && node.value === 'html'); // html
}

function checkMatchingNode(needleNode, haystackNode) {
	if (isAlwaysAncestorNode(needleNode)) {
		return true;
	}
	// Shortcut the below logic if the type does not even match
	else if(needleNode.type !== haystackNode.type) {
		return false;
	}

	if(needleNode.type === 'selector') {
		// TODO: recursive somehow
	}
	else if(needleNode.type === 'universal' || haystackNode.type === 'universal') {
		return true;
	}
	else if(needleNode.type === 'tag') {
		return needleNode.value === haystackNode.value;
	}
	else if(needleNode.type === 'class') {
		return needleNode.value === haystackNode.value;
	}
	else if(needleNode.type === 'id') {
		return needleNode.value === haystackNode.value;
	}
	else if(needleNode.type === 'pseudo') {
		return needleNode.value === haystackNode.value;
	}
	else if(needleNode.type === 'attribute') {
		return needleNode.attribute === haystackNode.attribute &&
			(needleNode.value ? (needleNode.value === haystackNode.value) : true);
	}
	else if(needleNode.type === 'nesting') {
		// TODO: warning (should already be converted to explicit)
		// .foo { & .bar {} } -> .foo .bar
	}
	else if (needleNode.type === 'combinator') {
		const combinatorMatchMap = {
			// descendant selector
			' ': [
				' ',
				'>>',
				'>'
			],
			'>>': [
				' ',
				'>>',
				'>'
			],
			// child selector (direct descendant)
			'>': [
				'>'
			],
			// adjacent sibling selector
			'+': [
				'+'
			],
			// general sibling selector
			'~': [
				'~',
				'+'
			]
		}

		return combinatorMatchMap[needleNode.value].some((combinator) => {
			return combinator === haystackNode.value;
		});
	}
};

// Check whether all of the needle is in the haystack
function checkMatchingGroup(needleGroup, haystackGroup) {
	let currentHaystackIndex = 0;

	return needleGroup.every(function(needleNode) {
		const availableHaystack = haystackGroup.slice(currentHaystackIndex);

		return availableHaystack.some(function(haystackNode, haystackIndex) {
			debug('\tneedleNode', needleNode.toString(), needleNode.type);
			debug('\thaystackNode', haystackNode.toString(), haystackNode.type);
			const isMatching = checkMatchingNode(needleNode, haystackNode);

			// Move our starting place in the haystack up to where we found the piece so we don't re-match it
			if(isMatching) {
				currentHaystackIndex = currentHaystackIndex + haystackIndex + 1;
			}

			debug('\tisMatching node', isMatching);

			return isMatching;
		});
	})
};


// Does the needle fit in the haystack?
//
// For example, the haystack is where the variable is defined
// and the variable usage is in the needle
//
// // needle
// .foo:hover {
// 	--some-color: #f00;
// }
// // haystack
// .foo {
// 	color: var(--some-color);
// }
function isBranchUnderScope(needleBranch, haystackBranch) {
	debug('isBranchUnderScope:', needleBranch.selector.toString(), '|||', haystackBranch.selector.toString());

	let haystackGroups = haystackBranch.selector.split((node) => {
		return node.type === 'combinator';
	});
	let needleGroups = needleBranch.selector.split((node) => {
		return node.type === 'combinator';
	});

	const wereConditionalsMet = (needleBranch.conditionals || []).every((needleConditional) => {
		return (haystackBranch.conditionals || []).some((haystackConditional) => {
			const isMatching = checkMatchingConditional(needleConditional, haystackConditional);
			return isMatching;
		});
	});
	debug('wereConditionalsMet', wereConditionalsMet);

	let currentHaystackGroupIndex = 0;
	const areGroupsMatching = needleGroups.every(function(needleGroup) {
		const availableHaystackGroups = haystackGroups.slice(currentHaystackGroupIndex);

		return availableHaystackGroups.some(function(haystackGroup, haystackGroupIndex) {
			debug('needleGroup', needleGroup.toString());
			debug('haystackGroup', haystackGroup.toString());
			const isMatching = checkMatchingGroup(needleGroup, haystackGroup);

			// Move our starting place in the haystack groups up to where we found the piece so we don't re-match it
			if(isMatching) {
				currentHaystackGroupIndex = currentHaystackGroupIndex + haystackGroupIndex + 1;
			}

			debug(`group isMatching=${isMatching} haystackGroup=${currentHaystackGroupIndex}/${haystackGroups.length}`);

			return isMatching;
		});
	});

	return wereConditionalsMet && (areGroupsMatching && currentHaystackGroupIndex === haystackGroups.length);
}

module.exports = isBranchUnderScope;
