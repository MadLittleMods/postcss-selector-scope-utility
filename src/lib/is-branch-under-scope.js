import debugSetup from 'debug';
const debug = debugSetup('is-branch-under-scope');

const checkMatchingConditional = function(needleConditional, haystackConditional) {
	if(needleConditional.type !== haystackConditional.type) {
		return false;
	}

	if(needleConditional.type === 'atrule') {
		return needleConditional.name === haystackConditional.name && needleConditional.params === haystackConditional.params;
	}
};

const checkMatchingNode = function(needleNode, haystackNode) {
	if(needleNode.type !== haystackNode.type && needleNode.type !== 'universal' && haystackNode.type !== 'universal') {
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
const checkMatchingGroup = function(needleGroup, haystackGroup) {
	let currentHaystackIndex = 0;
	return needleGroup.every(function(needleNode) {

		const availableHaystack = haystackGroup.slice(currentHaystackIndex);

		return availableHaystack.some(function(haystackNode, haystackIndex) {
			debug('\tneedleNode', needleNode.toString(), needleNode.type);
			debug('\thaystackNode', haystackNode.toString(), haystackNode.type);
			const isMatching = checkMatchingNode(needleNode, haystackNode);

			// Move our starting place in the haystack up to where we found the piece so we don't re-match it
			if(isMatching) {
				currentHaystackIndex = haystackIndex;
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
const isBranchUnderScope = function(needleBranch, haystackBranch) {
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

	return wereConditionalsMet && needleGroups.every(function(needleGroup) {
		return haystackGroups.some(function(haystackGroup) {
			debug('needleGroup', needleGroup.toString());
			debug('haystackGroup', haystackGroup.toString());
			const isMatching = checkMatchingGroup(needleGroup, haystackGroup);

			debug('group isMatching', isMatching);

			return isMatching;
		});
	});
}

export default isBranchUnderScope;
